import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getTrpc } from '../../core/ipc/trpc.client';
import { RunStreamService } from '../../core/ipc/run-stream.service';
import { subscribeRunEvents } from '../../core/ipc/run-events.bridge';
import { RunStateBadgeComponent } from '../../shared/ui/run-state-badge.component';

type RunRow = {
  id: string;
  state: string;
  branchName: string;
  ticketId: string;
  startedAt: Date | null;
  finishedAt: Date | null;
};

@Component({
  selector: 'tk-runs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, RunStateBadgeComponent],
  template: `
    <div class="header">
      <h2>Runs</h2>
      <p class="dim">Active: {{ q().active }} · Queued: {{ q().waiting }}</p>
    </div>
    <ul class="rows">
      @for (r of all(); track r.id) {
        <li>
          <a [routerLink]="['/runs', r.id]" class="id">{{ r.id.slice(0,8) }}</a>
          <tk-run-state-badge [state]="liveState(r.id) ?? r.state" />
          <span class="branch">{{ r.branchName || '—' }}</span>
          <span class="dim">{{ r.startedAt ? (r.startedAt | date:'short') : 'queued' }}</span>
        </li>
      } @empty {
        <li class="dim">No runs yet. Start one from the Dashboard.</li>
      }
    </ul>
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .rows { list-style: none; padding: 0; }
    .rows li { display: grid; grid-template-columns: 90px 130px 1fr 160px; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); align-items: center; }
    .id { font-family: monospace; color: var(--accent); text-decoration: none; }
    .branch { font-family: monospace; font-size: 12px; }
    .dim { color: var(--fg-dim); font-size: 12px; }
  `],
})
export class RunsPage implements OnInit {
  private readonly stream = inject(RunStreamService);
  protected readonly all = signal<RunRow[]>([]);
  protected readonly q = this.stream.queueStats();

  // Per-run live state patches (state events only — no full re-fetch needed).
  private readonly liveStates = signal<Map<string, string>>(new Map());
  protected liveState(runId: string): string | undefined {
    return this.liveStates().get(runId);
  }

  constructor() {
    // Update states in-place as stream events arrive; re-fetch if we see an unknown run.
    subscribeRunEvents((payload) => {
      if (payload.kind === 'state' && payload.state) {
        const known = this.all().some((r) => r.id === payload.runId);
        if (known) {
          this.liveStates.update((m) => new Map(m).set(payload.runId, payload.state!));
        } else {
          void this.refresh();
        }
      }
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    const list = await (await getTrpc()).runs.list.query({});
    this.all.set(list.map((r: any) => ({
      id: r.id, state: r.state, branchName: r.branchName, ticketId: r.ticketId,
      startedAt: r.startedAt, finishedAt: r.finishedAt,
    })));
  }
}
