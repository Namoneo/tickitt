import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { getTrpc } from '../../core/ipc/trpc.client';
import type { Ticket } from '@tickitt/db';

@Component({
  selector: 'tk-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Dashboard</h2>
    <p>Synced tickets appear here.</p>

    @if (tickets().length > 0) {
      <div class="tickets">
        @for (t of tickets(); track t.id) {
          <div class="ticket">
            <strong>{{ t.key }}</strong> — {{ t.title }}
            <span class="status">{{ t.status }}</span>
          </div>
        }
      </div>
    } @else {
      <p>No tickets synced yet. Add a Jira connection in Settings and click Test.</p>
    }
  `,
  styles: [`
    .tickets { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .ticket { padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-elev); display: flex; gap: 8px; align-items: center; }
    .status { margin-left: auto; font-size: 12px; color: var(--fg-dim); }
  `],
})
export class DashboardPage {
  protected readonly tickets = signal<Ticket[]>([]);

  constructor() {
    this.load();
  }

  protected async load(): Promise<void> {
    try {
      const trpc = await getTrpc();
      this.tickets.set(await trpc.tickets.list.query());
    } catch {
      /* silent: tRPC may not be ready on first render */
    }
  }
}