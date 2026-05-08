/**
 * Per-key serialisation of async work. Each call queues behind the previous
 * call for the same key; failures do not block the queue.
 */
export class RepoMutex {
  private readonly chains = new Map<string, Promise<unknown>>();

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);                          // swallow prior errors
    this.chains.set(key, next.catch(() => undefined));       // never let chain reject
    try {
      return await next;
    } finally {
      // If we're still the tail, drop the entry to avoid leaking memory.
      if (this.chains.get(key) === next.catch(() => undefined)) {
        this.chains.delete(key);
      }
    }
  }
}
