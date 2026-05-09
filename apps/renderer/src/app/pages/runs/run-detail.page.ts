import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { getTrpc, isTickittIpcUnavailableError } from '../../core/ipc/trpc.client';
import { RunStreamService } from '../../core/ipc/run-stream.service';
import { RunStateBadgeComponent } from '../../shared/ui/run-state-badge.component';
import { EventListComponent } from '../../shared/ui/event-list.component';
import { DiffViewerComponent } from './diff-viewer.component';
import { RequestChangesDialogComponent } from './request-changes-dialog.component';

interface RunDetail {
  id: string;
  state: string;
  branchName: string;
  prUrl: string | null;
  iterationCount: number;
  worktreePath: string;
  repoId: string;
  ticketId: string;
  agentId: string;
  baseSha: string | null;
  sessionId: string | null;
  error: string | null;
}

@Component({
  selector: 'tk-run-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RunStateBadgeComponent, EventListComponent, DiffViewerComponent, RequestChangesDialogComponent],
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
          @if (showApproveDiscard()) {
            <button class="primary" (click)="approve()" [disabled]="acting()">Approve</button>
            <button (click)="requestChanges()" [disabled]="acting()">Request Changes</button>
            <button class="danger" (click)="discard()" [disabled]="acting()">Discard</button>
          }
        </div>
      </header>
      @if (liveState()?.error; as err) {
        <p class="err">Error: {{ err }}</p>
      }
      @if (prUrl(); as url) {
        <p class="success"><a [href]="url" target="_blank">View PR →</a></p>
      }
      @if (jiraWarning()) {
        <p class="warn">{{ jiraWarning() }}</p>
      }
      @if (awaitingReview() && diff(); as d) {
        <section class="diff">
          <h3>Changes ({{ d.files.length }} file(s) — +{{ d.totalAdditions }} / −{{ d.totalDeletions }})</h3>
          <tk-diff-viewer [runId]="id()" [files]="diffFiles()" />
        </section>
      }
      <section class="events">
        <h3>Activity</h3>
        <tk-event-list [events]="events()" />
      </section>
    } @else {
      <p class="dim">Loading…</p>
    }

    @if (showRequestDialog()) {
      <tk-request-changes-dialog
        [runId]="id()"
        [iterationCount]="run()?.iterationCount ?? 0"
        [onClose]="closeRequestDialogFn"
        [onSent]="closeRequestDialogFn"
      />
    }
  `,
  styles: [`
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; align-items: center; }
    .mono { font-family: monospace; }
    .dim { color: var(--fg-dim); font-size: 12px; }
    .err { color: var(--danger); }
    .success { color: var(--accent); }
    .warn { color: #ffaa00; }
    .diff { margin-top: 24px; }
    section { margin-top: 24px; }
    button { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); cursor: pointer; }
    button.primary { background: var(--accent); color: #0b0b0e; border-color: var(--accent); }
    button.danger { background: #ff6b6b; color: #0b0b0e; border-color: #ff6b6b; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    a { color: var(--accent); }
  `],
})
export class RunDetailPage {
  private readonly trpc = getTrpc;
  private readonly stream = inject(RunStreamService);
  readonly id = input.required<string>();

  protected readonly run = signal<RunDetail | null>(null);
  protected readonly events = computed(() => this.streamEvents().events());
  protected readonly liveState = computed(() => this.streamEvents().state());
  protected readonly cancelling = signal(false);
  protected readonly acting = signal(false);
  protected readonly diff = signal<any | null>(null);
  protected readonly prUrl = signal<string | null>(null);
  protected readonly jiraWarning = signal<string | null>(null);
  protected readonly showRequestDialog = signal(false);

  private streamEvents = computed(() => this.stream.forRun(this.id()));

  protected readonly awaitingReview = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'awaiting_review';
  });

  protected readonly terminalState = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'awaiting_review' || s === 'failed' || s === 'completed' || s === 'abandoned';
  });

  protected readonly canCancel = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'queued' || s === 'preparing' || s === 'running';
  });

  protected readonly showApproveDiscard = computed(() => {
    const s = this.liveState()?.state ?? this.run()?.state;
    return s === 'awaiting_review' || s === 'failed';
  });

  protected readonly diffFiles = computed(() => {
    const d = this.diff();
    if (!d) return [];
    return d.files.map((f: any) => ({ path: f.path, status: f.status, isBinary: f.isBinary }));
  });

  protected readonly closeRequestDialogFn = () => this.closeRequestDialog();

  constructor() {
    effect(() => {
      const runId = this.id();
      void (async () => {
        const detail = await (await this.trpc()).runs.get.query({ id: runId });
        this.run.set(detail.run);
        this.stream.seed(runId, detail.events);
        if (detail.run?.prUrl) this.prUrl.set(detail.run.prUrl);
      })().catch((err) => {
        if (isTickittIpcUnavailableError(err)) return;
        console.error('Failed to load run:', err);
      });
    });

    effect(() => {
      if (this.awaitingReview() && !this.diff()) {
        void (async () => {
          try {
            const d = await (await this.trpc()).runs.diffSummary.query({ id: this.id() });
            this.diff.set(d);
          } catch (e) {
            if (!isTickittIpcUnavailableError(e)) console.error(e);
            this.diff.set(null);
          }
        })();
      }
    });
  }

  protected async cancel(): Promise<void> {
    this.cancelling.set(true);
    try { await (await this.trpc()).runs.cancel.mutate({ id: this.id() }); }
    finally { this.cancelling.set(false); }
  }

  protected async approve(): Promise<void> {
    this.acting.set(true);
    this.jiraWarning.set(null);
    try {
      const res = await (await this.trpc()).runs.approve.mutate({ id: this.id() });
      this.prUrl.set(res.prUrl);
      if (!res.jiraCommentOk) {
        this.jiraWarning.set('PR created but Jira comment failed.');
      } else if (res.jiraTransitionResult?.ok === false) {
        this.jiraWarning.set(`Jira transition failed. Available: ${res.jiraTransitionResult.available?.join(', ') ?? 'unknown'}`);
      }
    } catch (e: any) {
      this.jiraWarning.set(e?.message ?? 'Approve failed');
    } finally { this.acting.set(false); }
  }

  protected async discard(): Promise<void> {
    this.acting.set(true);
    try {
      await (await this.trpc()).runs.discard.mutate({ id: this.id() });
    } finally { this.acting.set(false); }
  }

  protected requestChanges(): void {
    this.showRequestDialog.set(true);
  }

  protected closeRequestDialog(): void {
    this.showRequestDialog.set(false);
  }
}
