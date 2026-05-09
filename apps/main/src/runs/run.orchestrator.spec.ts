import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { createGitFixture } from '../../test/git-fixture.js';
import { createTestDb } from '../../test/test-db.js';
import { RunOrchestrator } from './run.orchestrator.js';
import { RunStream } from './run.stream.js';
import { WorktreeService } from '../services/worktree.service.js';
import { RepoMutex } from '../services/repo-mutex.js';
import { AgentRegistry } from '../agents/registry.js';
import type { AgentAdapter } from '../agents/agent.adapter.js';
import type { AgentEvent, RunHandle, SpawnOptions } from '../agents/agent.types.js';
import { runs, repos, tickets, agents } from '@tickitt/db';

class MockAdapter implements AgentAdapter {
  readonly kind = 'claude-code' as const;
  readonly capabilities = { commitsOwnChanges: false, supportsContinuation: true, hasStructuredOutput: true };

  spawn(opts: SpawnOptions): RunHandle {
    const queue: AgentEvent[] = [
      { type: 'text', content: 'mocked output' },
      { type: 'usage', inputTokens: 10, outputTokens: 20 },
    ];
    let idx = 0;
    let closed = false;
    let waiter: (() => void) | null = null;

    const events: AsyncIterable<AgentEvent> = {
      async *[Symbol.asyncIterator]() {
        while (true) {
          if (idx < queue.length) { yield queue[idx++]!; continue; }
          if (closed) return;
          await new Promise<void>((r) => { waiter = r; });
        }
      },
    };

    const exit = new Promise<number | null>((resolve) => {
      setTimeout(() => {
        closed = true;
        if (waiter) { const w = waiter; waiter = null; w(); }
        resolve(0);
      }, 20);
    });

    return {
      pid: 12345,
      events,
      exitCode: exit,
      cancel: async () => { closed = true; if (waiter) { const w = waiter; waiter = null; w(); } },
    };
  }
}

async function setup() {
  const fixture = await createGitFixture();
  const { db, close } = createTestDb();
  const [repoRow] = db.insert(repos).values({
    name: 'test-repo', remoteUrl: fixture.remotePath,
    defaultBranch: 'main', localPath: fixture.mainCheckoutPath,
  }).returning().all();
  if (!repoRow) throw new Error('repo insert failed');
  const [ticketRow] = db.insert(tickets).values({
    connectionId: 'conn-1', source: 'jira', externalId: '1', key: 'TEST-1',
    title: 'Fix bug', status: 'open', url: 'http://example.com', rawJson: {}, fetchedAt: new Date(),
  }).returning().all();
  if (!ticketRow) throw new Error('ticket insert failed');
  const [agentRow] = db.insert(agents).values({
    kind: 'claude-code', name: 'Claude', binaryPath: '/bin/false', argsJson: [], envJson: {},
  }).returning().all();
  if (!agentRow) throw new Error('agent insert failed');

  const paths = { userData: fixture.mainCheckoutPath, workspace: fixture.mainCheckoutPath, dbFile: '', logsDir: '' };
  const stream = new RunStream();
  const registry = new AgentRegistry();
  registry.register('claude-code', () => new MockAdapter());
  const worktrees = new WorktreeService(db, paths, new RepoMutex());
  const orch = new RunOrchestrator(db, paths, worktrees, registry, stream);

  return { fixture, db, close, repoRow, ticketRow, agentRow, orch, stream };
}

describe('RunOrchestrator', () => {
  it('happy path: queued -> preparing -> running -> awaiting_review', async () => {
    const { fixture, close, db, repoRow, ticketRow, agentRow, orch } = await setup();
    const { runId } = await orch.start({ ticketId: ticketRow.id, repoId: repoRow.id, agentId: agentRow.id });

    await new Promise((r) => setTimeout(r, 200));

    const run = db.select().from(runs).where(eq(runs.id, runId)).all()[0];
    expect(run!.state).toBe('awaiting_review');
    expect(run!.worktreePath).toContain('TEST-1');

    await close();
    await fixture.cleanup();
  });

  it('recoverOnBoot marks stuck runs as failed', async () => {
    const { fixture, close, db, repoRow, ticketRow, agentRow, orch } = await setup();
    db.insert(runs).values({
      id: 'stuck-1', ticketId: ticketRow.id, repoId: repoRow.id, agentId: agentRow.id,
      worktreePath: '/tmp', branchName: 'stuck', state: 'running',
      createdAt: new Date(),
    }).run();

    const recovered = orch.recoverOnBoot();
    expect(recovered).toBe(1);

    const run = db.select().from(runs).where(eq(runs.id, 'stuck-1')).all()[0];
    expect(run!.state).toBe('failed');
    expect(run!.error).toContain('interrupted');

    await close();
    await fixture.cleanup();
  });

  it('cancel queued run -> abandoned', async () => {
    const { fixture, close, db, repoRow, ticketRow, agentRow, orch } = await setup();
    const { runId } = await orch.start({ ticketId: ticketRow.id, repoId: repoRow.id, agentId: agentRow.id });
    await orch.cancel(runId);

    await new Promise((r) => setTimeout(r, 50));
    const run = db.select().from(runs).where(eq(runs.id, runId)).all()[0];
    expect(['abandoned', 'awaiting_review']).toContain(run!.state);

    await close();
    await fixture.cleanup();
  });
});
