import { eq } from 'drizzle-orm';
import { agents, repos, tickets, runs, type Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';
import type { WorktreeService } from '../services/worktree.service.js';
import type { AgentRegistry } from '../agents/registry.js';
import type { RunHandle, AgentEvent } from '../agents/agent.types.js';
import { RunQueue } from './run.queue.js';
import { RunStream } from './run.stream.js';
import { createRunPersistence, type RunPersistence } from './run.persistence.js';
import { buildPrompt, buildContinuationPrompt } from './prompt.js';
import type { PromptContext } from './run.types.js';
import type { PushService } from '../services/push.service.js';
import type { SettingsService } from '../services/settings.service.js';

export class RunOrchestrator {
  private readonly queue: RunQueue;
  private readonly persistence: RunPersistence;
  private readonly handles = new Map<string, RunHandle>();
  private readonly cancelledRuns = new Set<string>();

  constructor(
    private readonly db: Db,
    private readonly paths: AppPaths,
    private readonly worktrees: WorktreeService,
    private readonly registry: AgentRegistry,
    private readonly stream: RunStream,
    private readonly push?: PushService,
    settings?: SettingsService,
  ) {
    this.persistence = createRunPersistence(db);
    const initialMax = settings?.get<number>('runs.maxConcurrent', 3) ?? 3;
    this.queue = new RunQueue(initialMax);
    this.queue.onChange((stats) => {
      this.stream.publish({ kind: 'queue', runId: '', active: stats.active, waiting: stats.waiting });
    });
    settings?.watch<number>('runs.maxConcurrent', (n) => {
      this.queue.setMaxActive(n);
    });
  }

  recoverOnBoot(): number {
    return this.persistence.recoverOnBoot();
  }

  listRuns(opts?: { states?: string[] | undefined; ticketId?: string | undefined }) {
    return this.persistence.listRuns(opts);
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
      baseSha: null,
      sessionId: null,
      iterationCount: 0,
      pushedAt: null,
    });

    this.queue.submit({
      runId,
      fn: () => this.execute(runId, branchName, ticket, repo, agent),
    });

    return { runId };
  }

  async cancel(runId: string): Promise<void> {
    this.cancelledRuns.add(runId);
    const run = this.persistence.getRun(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);

    if (run.state === 'queued') {
      this.persistence.updateState(runId, 'abandoned');
      this.stream.publish({ kind: 'state', runId, state: 'abandoned' });
      this.cancelledRuns.delete(runId);
      return;
    }

    const handle = this.handles.get(runId);
    if (handle) {
      await handle.cancel();
    }
  }

  async approve(runId: string, opts?: { commitMessage?: string | undefined }): Promise<{ prUrl: string; pushedAt: Date }> {
    if (!this.push) throw new Error('PushService not configured');
    const run = this.persistence.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.state !== 'awaiting_review') {
      throw new Error(`Approve allowed only from awaiting_review (was ${run.state})`);
    }
    return this.push.approve({ runId, commitMessage: opts?.commitMessage });
  }

  async discard(runId: string): Promise<void> {
    const run = this.persistence.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (!['awaiting_review', 'failed'].includes(run.state)) {
      throw new Error(`Discard allowed only from awaiting_review or failed (was ${run.state})`);
    }
    // Best-effort filesystem cleanup
    try {
      await this.worktrees.remove({
        repoId: run.repoId,
        worktreePath: run.worktreePath,
        deleteBranch: true,
      });
    } catch {
      // ignore
    }
    this.persistence.updateState(runId, 'abandoned');
    this.stream.publish({ kind: 'state', runId, state: 'abandoned' });
  }

  async requestChanges(runId: string, feedback: string): Promise<void> {
    const run = this.persistence.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.state !== 'awaiting_review') {
      throw new Error(`Request Changes allowed only from awaiting_review (was ${run.state})`);
    }
    if (run.iterationCount >= 3) {
      throw new Error('Iteration cap reached (3). Approve or discard instead.');
    }
    if (!run.sessionId) {
      throw new Error('No agent session id captured; cannot resume. Discard and start fresh.');
    }
    this.persistence.incrementIteration(runId);
    this.persistence.updateState(runId, 'queued');
    this.stream.publish({ kind: 'state', runId, state: 'queued' });
    this.queue.submit({
      runId,
      fn: () => this.executeContinuation(runId, feedback),
    });
  }

  private async execute(
    runId: string,
    branchName: string,
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
        branchName,
        base: repo.defaultBranch,
      });

      // Persist baseSha and worktreePath
      this.db.update(runs).set({ worktreePath: wt.path, baseSha: wt.baseSha }).where(eq(runs.id, runId)).run();

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

      // Capture sessionId for continuation
      const sid = await handle.sessionId;
      if (sid) {
        this.db.update(runs).set({ sessionId: sid }).where(eq(runs.id, runId)).run();
      }

      const code = await handle.exitCode;
      this.handles.delete(runId);

      const wasCancelled = this.cancelledRuns.delete(runId);
      let next: 'abandoned' | 'failed' | 'awaiting_review';
      let errorMsg: string | undefined;

      if (wasCancelled) {
        next = 'abandoned';
      } else if (code !== 0 && code !== null) {
        next = 'failed';
        errorMsg = `Agent exited with code ${code}`;
      } else {
        next = 'awaiting_review';
      }

      if (next === 'failed') {
        this.persistence.updateState(runId, 'failed', errorMsg ?? null);
        this.stream.publish({ kind: 'state', runId, state: 'failed', error: errorMsg ?? null });
      } else if (next === 'abandoned') {
        this.persistence.updateState(runId, 'abandoned');
        this.stream.publish({ kind: 'state', runId, state: 'abandoned' });
      } else {
        this.persistence.updateState(runId, 'awaiting_review');
        this.stream.publish({ kind: 'state', runId, state: 'awaiting_review' });
      }
    } catch (err) {
      this.handles.delete(runId);
      const msg = err instanceof Error ? err.message : String(err);
      this.persistence.updateState(runId, 'failed', msg);
      this.stream.publish({ kind: 'state', runId, state: 'failed', error: msg });
    } finally {
      this.publishStats();
    }
  }

  private async executeContinuation(runId: string, feedback: string): Promise<void> {
    const run = this.persistence.getRun(runId);
    if (!run) return;

    const [ticket] = this.db.select().from(tickets).where(eq(tickets.id, run.ticketId)).limit(1).all();
    const [agentRow] = this.db.select().from(agents).where(eq(agents.id, run.agentId)).limit(1).all();
    if (!ticket || !agentRow) return;

    this.persistence.updateState(runId, 'running');
    this.stream.publish({ kind: 'state', runId, state: 'running' });

    const adapter = this.registry.get(agentRow.kind as any);
    let handle: RunHandle;
    try {
      handle = adapter.spawn({
        cwd: run.worktreePath,
        prompt: buildContinuationPrompt(feedback, {
          path: run.worktreePath,
          branchName: run.branchName,
          baseBranch: '',
          baseSha: run.baseSha ?? '',
          repoId: run.repoId,
        }, run.iterationCount ?? 0),
        env: agentRow.envJson ?? {},
        binaryPath: agentRow.binaryPath,
        extraArgs: agentRow.argsJson ?? [],
        resumeSessionId: run.sessionId ?? undefined,
      });
      this.handles.set(runId, handle);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.persistence.updateState(runId, 'failed', msg);
      this.stream.publish({ kind: 'state', runId, state: 'failed', error: msg });
      return;
    }

    let sawError = false;
    try {
      for await (const event of handle.events) {
        if (event.type === 'error') sawError = true;
        const dbId = this.persistence.appendEvent(runId, event);
        this.stream.publish({ kind: 'event', runId, event: { type: event.type, payload: event }, eventDbId: dbId });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.persistence.updateState(runId, 'failed', msg);
      this.stream.publish({ kind: 'state', runId, state: 'failed', error: msg });
      return;
    } finally {
      this.handles.delete(runId);
    }

    const exitCode = await handle.exitCode;
    const wasCancelled = this.cancelledRuns.delete(runId);
    let next: 'abandoned' | 'failed' | 'awaiting_review';
    let errorMsg: string | undefined;

    if (wasCancelled) {
      next = 'abandoned';
    } else if (exitCode !== 0 || sawError) {
      next = 'failed';
      errorMsg = exitCode === 0 ? 'agent reported error' : `exit code ${exitCode}`;
    } else {
      next = 'awaiting_review';
    }

    if (next === 'failed') {
      this.persistence.updateState(runId, 'failed', errorMsg ?? null);
      this.stream.publish({ kind: 'state', runId, state: 'failed', error: errorMsg ?? null });
    } else if (next === 'abandoned') {
      this.persistence.updateState(runId, 'abandoned');
      this.stream.publish({ kind: 'state', runId, state: 'abandoned' });
    } else {
      this.persistence.updateState(runId, 'awaiting_review');
      this.stream.publish({ kind: 'state', runId, state: 'awaiting_review' });
    }
    this.publishStats();
  }

  private publishStats(): void {
    const all = this.persistence.listRuns({ states: ['queued', 'preparing', 'running', 'pushing', 'awaiting_review', 'failed'] });
    let active = 0, queued = 0, awaiting = 0, failed = 0;
    for (const r of all) {
      if (r.state === 'preparing' || r.state === 'running' || r.state === 'pushing') active++;
      else if (r.state === 'queued') queued++;
      else if (r.state === 'awaiting_review') awaiting++;
      else if (r.state === 'failed') failed++;
    }
    this.stream.publish({ kind: 'stats', runId: '', active, queued, awaiting, failed });
  }
}
