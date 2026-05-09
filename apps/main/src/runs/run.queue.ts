import type { RunJob } from './run.types.js';

const MAX_ACTIVE = 3;

export class RunQueue {
  private active = 0;
  private readonly pending: RunJob[] = [];
  private readonly listeners = new Set<(stats: { active: number; waiting: number }) => void>();

  get stats(): { active: number; waiting: number } {
    return { active: this.active, waiting: this.pending.length };
  }

  onChange(cb: (stats: { active: number; waiting: number }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  submit(job: RunJob): void {
    this.pending.push(job);
    this.emit();
    this.pump();
  }

  private pump(): void {
    if (this.active >= MAX_ACTIVE || this.pending.length === 0) return;
    const job = this.pending.shift()!;
    this.active++;
    this.emit();
    job.fn()
      .catch(() => undefined) // errors handled inside fn
      .finally(() => {
        this.active--;
        this.emit();
        this.pump();
      });
  }

  private emit(): void {
    const s = this.stats;
    for (const cb of this.listeners) cb(s);
  }
}
