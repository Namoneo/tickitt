import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'tk-run-state-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge {{ tone() }}">{{ state() }}</span>`,
  styles: [`
    .badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; }
    .badge.neutral { background: rgba(255,255,255,0.05); color: var(--fg-dim); }
    .badge.active  { background: rgba(124, 92, 255, 0.15); color: var(--accent); }
    .badge.review  { background: rgba(62, 207, 142, 0.15); color: var(--ok); }
    .badge.danger  { background: rgba(255, 107, 107, 0.15); color: var(--danger); }
  `],
})
export class RunStateBadgeComponent {
  readonly state = input.required<string>();
  protected readonly tone = computed(() => {
    const s = this.state();
    if (s === 'running' || s === 'preparing' || s === 'queued' || s === 'pushing') return 'active';
    if (s === 'awaiting_review' || s === 'completed') return 'review';
    if (s === 'failed' || s === 'abandoned') return 'danger';
    return 'neutral';
  });
}
