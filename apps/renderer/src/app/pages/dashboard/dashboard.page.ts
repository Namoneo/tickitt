import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { getTrpc } from '../../core/ipc/trpc.client';
import type { Ticket } from '@tickitt/db';
import { RunStartDialogComponent } from './run-start-dialog.component';

@Component({
  selector: 'tk-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RunStartDialogComponent],
  template: `
    <h2>Dashboard</h2>
    <p>Synced tickets appear here.</p>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    } @else if (tickets().length > 0) {
      <div class="tickets">
        @for (t of tickets(); track t.id) {
          <div class="ticket">
            <strong>{{ t.key }}</strong> — {{ t.title }}
            <span class="status">{{ t.status }}</span>
            <button (click)="openDialog(t)">Run</button>
          </div>
        }
      </div>
    } @else {
      <p>No tickets synced yet. Add a Jira connection in Settings and click Test.</p>
    }

    @if (dialogTicket(); as dt) {
      <tk-run-start-dialog
        [ticketId]="dt.id"
        [ticketKey]="dt.key"
        (cancel)="dialogTicket.set(null)"
        (started)="onStarted($event)"
      />
    }
  `,
  styles: [`
    .tickets { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .ticket { padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); display: flex; gap: 8px; align-items: center; }
    .status { margin-left: auto; font-size: 12px; color: var(--fg-dim); }
    .error { color: var(--fg-error, #f87171); }
  `],
})
export class DashboardPage implements OnInit {
  private readonly router = inject(Router);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly dialogTicket = signal<Ticket | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected openDialog(t: Ticket): void {
    this.dialogTicket.set(t);
  }

  protected onStarted(e: { runId: string }): void {
    this.dialogTicket.set(null);
    void this.router.navigateByUrl(`/runs/${e.runId}`);
  }

  protected async load(): Promise<void> {
    try {
      const trpc = await getTrpc();
      this.tickets.set(await trpc.tickets.list.query());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load tickets');
    }
  }
}
