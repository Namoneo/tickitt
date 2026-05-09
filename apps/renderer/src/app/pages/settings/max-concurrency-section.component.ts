import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getTrpc } from '../../core/ipc/trpc.client';

@Component({
  selector: 'tk-max-concurrency-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section class="card">
      <h3>Parallel Runs</h3>
      <label>
        Max concurrent runs
        <input type="number" [(ngModel)]="value" min="1" max="20" />
      </label>
      <p class="hint">Current: {{ current() }}</p>
      <button (click)="save()" [disabled]="saving()">Save</button>
    </section>
  `,
  styles: [`
    .card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: 8px; padding: 18px; margin-bottom: 16px; }
    h3 { margin: 0 0 12px; font-size: 14px; }
    label { display: flex; align-items: center; gap: 12px; font-size: 13px; }
    input { width: 60px; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); }
    .hint { font-size: 12px; color: var(--fg-dim); margin: 8px 0 12px; }
    button { padding: 6px 14px; border-radius: 6px; border: none; background: var(--accent); color: #fff; cursor: pointer; }
    button:disabled { opacity: 0.5; }
  `],
})
export class MaxConcurrencySection implements OnInit {
  protected readonly current = signal<number>(3);
  protected value = 3;
  protected saving = signal(false);

  async ngOnInit(): Promise<void> {
    const all = await (await getTrpc()).settings.all.query();
    const v = (all?.['runs.maxConcurrent'] as number | undefined) ?? 3;
    this.current.set(v);
    this.value = v;
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await (await getTrpc()).settings.set.mutate({ key: 'runs.maxConcurrent', value: Number(this.value) });
      this.current.set(Number(this.value));
    } finally {
      this.saving.set(false);
    }
  }
}
