import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getTrpc } from '../../core/ipc/trpc.client';
import { RunStreamService } from '../../core/ipc/run-stream.service';
import { subscribeRunEvents } from '../../core/ipc/run-events.bridge';
import { RunStateBadgeComponent } from '../../shared/ui/run-state-badge.component';

interface EnrichedRun {
  id: string;
  state: string;
  branchName: string;
  ticketId: string;
  repoId: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  ticket: { key: string; title: string } | null;
  blockedBy: string | null;
}

@Component({
  selector: 'tk-runs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, RunStateBadgeComponent],
  template: `
    <div class="header">
      <h2>Runs</h2>
    </div>

    <!-- Active / Queued / Awaiting Review -->
    @for (group of topGroups(); track group.label) {
      @if (group.runs.length) {
        <div class="group" [class.highlight]="group.highlight">
          <h3>{{ group.label }} <span class="count">({{ group.runs.length }})</span></h3>
          <ul class="rows">
            @for (r of group.runs; track r.id) {
              <li>
                <a [routerLink]="['/runs', r.id]" class="id">{{ r.id.slice(0,8) }}</a>
                <tk-run-state-badge [state]="liveState(r.id) ?? r.state" />
                <span class="ticket">{{ r.ticket?.key ?? '—' }} · {{ r.ticket?.title ?? '' }}</span>
                <span class="branch">{{ r.branchName || '—' }}</span>
                <span class="dim">{{ r.startedAt ? (r.startedAt | date:'short') : 'queued' }}</span>
                @if (r.blockedBy) {
                  <span class="blocked">Blocked by {{ r.blockedBy.slice(0,8) }}</span>
                }
              </li>
            }
          </ul>
        </div>
      }
    }

    <!-- Completed / Failed-or-Abandoned collapsible -->
    <details class="group history">
      <summary>
        Completed / Failed
        <span class="count">({{ history().length }})</span>
      </summary>
      <ul class="rows">
        @for (r of history(); track r.id) {
          <li>
            <a [routerLink]="['/runs', r.id]" class="id">{{ r.id.slice(0,8) }}</a>
            <tk-run-state-badge [state]="liveState(r.id) ?? r.state" />
            <span class="ticket">{{ r.ticket?.key ?? '—' }} · {{ r.ticket?.title ?? '' }}</span>
            <span class="branch">{{ r.branchName || '—' }}</span>
            <span class="dim">{{ r.finishedAt ? (r.finishedAt | date:'short') : '' }}</span>
          </li>
        }
      </ul>
    </details>

    @if (!all().length) {
      <p class="dim empty">No runs yet. Start one from the Dashboard.</p>
    }

    <!-- Toast -->
    @if (toast()) {
      <div class="toast" (click)="dismissToast()">
        {{ toast() }}
      </div>
    }
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .group { margin-bottom: 20px; }
    .group h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-dim); margin: 0 0 8px; }
    .group.highlight h3 { color: #c084fc; }
    .count { font-weight: 400; opacity: 0.6; }
    .rows { list-style: none; padding: 0; }
    .rows li { display: grid; grid-template-columns: 90px 130px 1.5fr 1fr 160px auto; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); align-items: center; }
    .id { font-family: monospace; color: var(--accent); text-decoration: none; }
    .ticket { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .branch { font-family: monospace; font-size: 12px; }
    .dim { color: var(--fg-dim); font-size: 12px; }
    .blocked { font-size: 11px; color: #f59e0b; background: rgba(245,158,11,0.1); padding: 2px 8px; border-radius: 10px; }
    .history summary { cursor: pointer; font-size: 13px; color: var(--fg-dim); padding: 8px 0; }
    .empty { margin-top: 40px; text-align: center; }
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--bg-elev); border: 1px solid var(--border); padding: 12px 18px; border-radius: 8px; cursor: pointer; font-size: 13px; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
})
export class RunsPage implements OnInit {
  private readonly stream = inject(RunStreamService);
  protected readonly all = signal<EnrichedRun[]>([]);
  protected readonly toast = signal<string | null>(null);

  // Per-run live state patches
  private readonly liveStates = signal<Map<string, string>>(new Map());
  protected liveState(runId: string): string | undefined {
    return this.liveStates().get(runId);
  }

  protected readonly topGroups = computed(() => {
    const rows = this.all();
    const active = rows.filter((r) => ['preparing', 'running', 'pushing'].includes(r.state));
    const queued = rows.filter((r) => r.state === 'queued');
    const awaiting = rows.filter((r) => r.state === 'awaiting_review');
    return [
      { label: 'Active', runs: active, highlight: false },
      { label: 'Queued', runs: queued, highlight: false },
      { label: 'Awaiting Review', runs: awaiting, highlight: true },
    ];
  });

  protected readonly history = computed(() => {
    return this.all().filter((r) => ['completed', 'failed', 'abandoned'].includes(r.state));
  });

  constructor() {
    subscribeRunEvents((payload) => {
      if (payload.kind === 'state' && payload.state) {
        const known = this.all().some((r) => r.id === payload.runId);
        if (known) {
          this.liveStates.update((m) => new Map(m).set(payload.runId, payload.state!));
          // Toast on awaiting_review transition
          if (payload.state === 'awaiting_review') {
            this.toast.set(`Run ${payload.runId.slice(0, 8)} is ready for review`);
            setTimeout(() => this.toast.set(null), 6000);
          }
        } else {
          void this.refresh();
        }
      } else if (payload.kind === 'stats') {
        void this.refresh();
      }
    });
  }

  ngOnInit(): void {
    void this.refresh();
  }

  dismissToast(): void {
    this.toast.set(null);
  }

  private async refresh(): Promise<void> {
    const list = await (await getTrpc()).runs.list.query({});
    this.all.set(list.map((r: any) => ({
      id: r.id,
      state: r.state,
      branchName: r.branchName,
      ticketId: r.ticketId,
      repoId: r.repoId,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      ticket: r.ticket ? { key: r.ticket.key, title: r.ticket.title } : null,
      blockedBy: r.blockedBy ?? null,
    })));
  }
}
