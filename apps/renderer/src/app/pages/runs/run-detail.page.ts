import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { getTrpc } from '../../core/ipc/trpc.client';
import { RunStreamService } from '../../core/ipc/run-stream.service';
import { RunStateBadgeComponent } from '../../shared/ui/run-state-badge.component';
import { EventListComponent } from '../../shared/ui/event-list.component';

@Component({
  selector: 'tk-run-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RunStateBadgeComponent, EventListComponent],
  template: `
    @if (run(); as r) {
      <header>
        <div>
          <h2>Run <span class="mono">{{ r.id.slice(0, 12) }}</span></h2>
          <p class="dim">Branch: <span class="mono">{{ r.branchName }}</span></p>
        </div>
        <div class="actions">
          <tk-run-state-badge [state]="liveState()?.state ?? r.state" />
          @if (canCancel()) {
            <button (click)="cancel()" [disabled]="cancelling()">{{ cancelling() ? 'Cancelling…' : 'Cancel' }}</button>
          }
        </div>
      </header>
      @if (liveState()?.error; as err) {
        <p class="err">Error: {{ err }}</p>
      }
      @if (terminalState() && diff(); as d) {
        <section class="diff">
          <h3>Changes ({{ d.files.length }} file(s) — +{{ d.totalAdditions }} / −{{ d.totalDeletions }})</h3>
          <ul>
            @for (f of d.files; track f.path) {
              <li>
                <span class="status">{{ f.status }}</span>
                <span class="mono">{{ f.path }}</span>
                <span class="dim">+{{ f.additions }} −{{ f.deletions }}</span>
              </li>
            }
          </ul>
          <p class="dim">Phase 4 will render an inline diff viewer with Approve / Discard.</p>
        </section>
      }
      <section class="events">
        <h3>Activity</h3>
        <tk-event-list [events]="events()" />
      </section>
    } @else {
      <p class="dim">Loading…</p>
    }
  `,
  styles: [`
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; align-items: center; }
    .mono { font-family: monospace; }
    .dim { color: var(--fg-dim); font-size: 12px; }
    .err { color: var(--danger); }
    .diff ul { list-style: none; padding: 0; }
    .diff li { display: grid; grid-template-columns: 90px 1fr 120px; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border); }
    .status { font-size: 11px; text-transform: uppercase; color: var(--accent); }
    section { margin-top: 24px; }
  `],
})
export class RunDetailPage {
  private readonly trpc = getTrpc;
  private readonly stream = inject(RunStreamService);
  readonly id = input.required<string>();

  protected readonly run = signal<any | null>(null);
  protected readonly events = computed(() => this.streamEvents().events());
  protected readonly liveState = computed(() => this.streamEvents().state());
  protected readonly cancelling = signal(false);
  protected readonly diff = signal<any | null>(null);

  private streamEvents = computed(() => this.stream.forRun(this.id()));

  protected readonly terminalState = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'awaiting_review' || s === 'failed' || s === 'completed' || s === 'abandoned';
  });

  protected readonly canCancel = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'queued' || s === 'preparing' || s === 'running';
  });

  constructor() {
    effect(async () => {
      const runId = this.id();
      const detail = await (await this.trpc()).runs.get.query({ id: runId });
      this.run.set(detail.run);
      this.stream.seed(runId, detail.events);
    });

    effect(async () => {
      if (this.terminalState() && !this.diff()) {
        try {
          const d = await (await this.trpc()).runs.diffSummary.query({ id: this.id() });
          this.diff.set(d);
        } catch {
          this.diff.set(null);
        }
      }
    });
  }

  protected async cancel(): Promise<void> {
    this.cancelling.set(true);
    try { await (await this.trpc()).runs.cancel.mutate({ id: this.id() }); }
    finally { this.cancelling.set(false); }
  }
}
