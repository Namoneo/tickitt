import { eq, sql } from 'drizzle-orm';
import { agents, repos, tickets, runs, type Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';
import type { WorktreeService } from '../services/worktree.service.js';
import type { AgentRegistry } from '../agents/registry.js';
import type { RunHandle, AgentEvent } from '../agents/agent.types.js';
import { RunQueue } from './run.queue.js';
import { RunStream } from './run.stream.js';
import { createRunPersistence, type RunPersistence } from './run.persistence.js';
import { buildPrompt } from './prompt.js';
import type { PromptContext } from './run.types.js';

export class RunOrchestrator {
  private readonly queue = new RunQueue();
  private readonly persistence: RunPersistence;
  private readonly handles = new Map<string, RunHandle>();

  constructor(
    private readonly db: Db,
    private readonly paths: AppPaths,
    private readonly worktrees: WorktreeService,
    private readonly registry: AgentRegistry,
    private readonly stream: RunStream,
  ) {
    this.persistence = createRunPersistence(db);
    this.queue.onChange((stats) => {
      this.stream.publish({ kind: 'queue', runId: '', active: stats.active, waiting: stats.waiting });
    });
  }

  recoverOnBoot(): number {
    return this.persistence.recoverOnBoot();
  }

  async start(opts: { ticketId: string; repoId: string; agentId: string }): Promise<{ runId: string }> {
    const [ticket] = this.db.select().from(tickets).where(eq(tickets.id, opts.ticketId)).limit(1).all();
    if (!ticket) throw new Error(`Ticket not found: ${opts.ticketId}`);
    const [repo] = this.db.select().from(repos).where(eq(repos.id, opts.repoId)).limit(1).all();
    if (!repo) throw new Error(`Repo not found: ${opts.repoId}`);
    const [agent] = this.db.select().from(agents).where(eq(agents.id, opts.agentId)).limit(1).all();
    if (!agent) throw new Error(`Agent not found: ${opts.agentId}`);

    const runId = crypto.randomUUID();
    const branchName = `${ticket.key}-${runId.slice(0, 8)}`;

    this.persistence.insertRun({
      id: runId,
      ticketId: opts.ticketId,
      repoId: opts.repoId,
      agentId: opts.agentId,
      worktreePath: '',
      branchName,
      state: 'queued',
      startedAt: null,
      finishedAt: null,
      error: null,
      prUrl: null,
      tokenCost: null,
      approvalDecision: null,
    });

    this.queue.submit({
      runId,
      fn: () => this.execute(runId, ticket, repo, agent),
    });

    return { runId };
  }

  async cancel(runId: string): Promise<void> {
    const run = this.persistence.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    if (run.state === 'queued') {
      this.persistence.updateState(runId, 'abandoned');
      this.stream.publish({ kind: 'state', runId, state: 'abandoned' });
      return;
    }

    const handle = this.handles.get(runId);
    if (handle) {
      await handle.cancel();
    }
  }

  private async execute(
    runId: string,
    ticket: { key: string; title: string; body: string | null },
    repo: { id: string; name: string; defaultBranch: string },
    agent: { kind: string; binaryPath: string; argsJson: string[]; envJson: Record<string, string> },
  ): Promise<void> {
    try {
      this.persistence.updateState(runId, 'preparing');
      this.stream.publish({ kind: 'state', runId, state: 'preparing' });

      const wt = await this.worktrees.create({
        repoId: repo.id,
        subdir: runId,
        branchName: `${ticket.key}-${runId.slice(0, 8)}`,
        base: repo.defaultBranch,
      });

      // Update worktree path
      this.db.update(runs).set({ worktreePath: wt.path }).where(eq(runs.id, runId)).run();

      this.persistence.updateState(runId, 'running');
      this.stream.publish({ kind: 'state', runId, state: 'running' });

      const adapter = this.registry.get(agent.kind as any);
      const promptCtx: PromptContext = {
        ticketKey: ticket.key,
        ticketTitle: ticket.title,
        ticketBody: ticket.body,
        repoName: repo.name,
      };

      const handle = adapter.spawn({
        cwd: wt.path,
        prompt: buildPrompt(promptCtx),
        binaryPath: agent.binaryPath,
        extraArgs: agent.argsJson ?? [],
        env: agent.envJson ?? {},
      });

      this.handles.set(runId, handle);

      for await (const ev of handle.events) {
        const dbId = this.persistence.appendEvent(runId, ev);
        this.stream.publish({
          kind: 'event',
          runId,
          event: { type: ev.type, payload: ev },
          eventDbId: dbId,
        });
      }

      const code = await handle.exitCode;
      this.handles.delete(runId);

      if (code !== 0 && code !== null) {
        this.persistence.updateState(runId, 'failed', `Agent exited with code ${code}`);
        this.stream.publish({ kind: 'state', runId, state: 'failed', error: `Agent exited with code ${code}` });
      } else {
        this.persistence.updateState(runId, 'awaiting_review');
        this.stream.publish({ kind: 'state', runId, state: 'awaiting_review' });
      }
    } catch (err) {
      this.handles.delete(runId);
      const msg = err instanceof Error ? err.message : String(err);
      this.persistence.updateState(runId, 'failed', msg);
      this.stream.publish({ kind: 'state', runId, state: 'failed', error: msg });
    }
  }
}
