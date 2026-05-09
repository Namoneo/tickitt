import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RunQueue } from './run.queue.js';

describe('RunQueue', () => {
  it('respects maxActive = 3', async () => {
    const q = new RunQueue();
    let active = 0;
    let maxConcurrent = 0;
    const completed: string[] = [];

    const makeJob = (id: string, delay = 20) => () => new Promise<void>((resolve) => {
      active++;
      maxConcurrent = Math.max(maxConcurrent, active);
      setTimeout(() => { active--; completed.push(id); resolve(); }, delay);
    });

    q.submit({ runId: 'a', fn: makeJob('a') });
    q.submit({ runId: 'b', fn: makeJob('b') });
    q.submit({ runId: 'c', fn: makeJob('c') });
    q.submit({ runId: 'd', fn: makeJob('d') });
    q.submit({ runId: 'e', fn: makeJob('e') });

    await new Promise((r) => setTimeout(r, 150));
    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(completed.length).toBe(5);
  });

  it('runs pending jobs after slots free', async () => {
    const q = new RunQueue();
    const order: string[] = [];

    q.submit({ runId: 'a', fn: async () => { await new Promise((r) => setTimeout(r, 10)); order.push('a'); } });
    q.submit({ runId: 'b', fn: async () => { order.push('b'); } });

    await new Promise((r) => setTimeout(r, 50));
    expect(order).toEqual(['a', 'b']);
  });

  it('errors do not block the queue', async () => {
    const q = new RunQueue();
    const order: string[] = [];

    q.submit({ runId: 'a', fn: async () => { throw new Error('boom'); } });
    q.submit({ runId: 'b', fn: async () => { order.push('b'); } });

    await new Promise((r) => setTimeout(r, 50));
    expect(order).toContain('b');
  });

  it('emits queue stats on change', async () => {
    const q = new RunQueue();
    const stats: Array<{ active: number; waiting: number }> = [];
    q.onChange((s) => stats.push(s));

    q.submit({ runId: 'a', fn: async () => { await new Promise((r) => setTimeout(r, 20)); } });
    q.submit({ runId: 'b', fn: async () => { } });

    await new Promise((r) => setTimeout(r, 50));
    expect(stats.length).toBeGreaterThanOrEqual(2);
  });
});
