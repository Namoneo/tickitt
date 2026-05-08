import { describe, it, expect } from 'vitest';
import { RepoMutex } from './repo-mutex.js';

describe('RepoMutex', () => {
  it('serialises calls for the same key', async () => {
    const m = new RepoMutex();
    const order: number[] = [];

    const p1 = m.run('a', async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 30));
      order.push(2);
    });

    const p2 = m.run('a', async () => {
      order.push(3);
      await new Promise((r) => setTimeout(r, 10));
      order.push(4);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('runs different keys concurrently', async () => {
    const m = new RepoMutex();
    const start = Date.now();

    const p1 = m.run('a', async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    const p2 = m.run('b', async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    await Promise.all([p1, p2]);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(55); // 30+overhead, not 60
  });
});
