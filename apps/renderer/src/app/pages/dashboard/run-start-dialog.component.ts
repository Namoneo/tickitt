import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { getTrpc, isTickittIpcUnavailableError } from '../../core/ipc/trpc.client';

@Component({
  selector: 'tk-run-start-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="overlay" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>Start run for {{ ticketKey() }}</h3>
        <label>Repository
          <select [(ngModel)]="selectedRepoId">
            <option [ngValue]="null" disabled>Choose…</option>
            @for (r of repos(); track r.id) {
              <option [ngValue]="r.id">{{ r.name }} ({{ r.defaultBranch }})</option>
            }
          </select>
        </label>
        <label>Agent
          <select [(ngModel)]="selectedAgentId">
            <option [ngValue]="null" disabled>Choose…</option>
            @for (a of agents(); track a.id) {
              <option [ngValue]="a.id">{{ a.name }} ({{ a.kind }})</option>
            }
          </select>
        </label>
        <div class="actions">
          <button (click)="cancel.emit()">Cancel</button>
          <button [disabled]="!selectedRepoId || !selectedAgentId || starting()" (click)="confirm()">
            {{ starting() ? 'Starting…' : 'Start' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 100; }
    .modal { background: var(--bg-elev); padding: 20px; border-radius: 10px; min-width: 320px; display: grid; gap: 12px; }
    label { display: grid; gap: 4px; font-size: 12px; color: var(--fg-dim); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
  `],
})
export class RunStartDialogComponent {
  readonly ticketId = input.required<string>();
  readonly ticketKey = input.required<string>();
  readonly cancel = output<void>();
  readonly started = output<{ runId: string }>();

  protected readonly repos = signal<any[]>([]);
  protected readonly agents = signal<any[]>([]);
  protected readonly starting = signal(false);
  protected selectedRepoId: string | null = null;
  protected selectedAgentId: string | null = null;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const trpc = await getTrpc();
      const [r, a] = await Promise.all([
        trpc.repos.list.query(),
        trpc.agents.list.query(),
      ]);
      this.repos.set(r);
      this.agents.set(a.filter((x: any) => x.enabled));
    } catch (e) {
      if (isTickittIpcUnavailableError(e)) {
        this.repos.set([]);
        this.agents.set([]);
        return;
      }
      console.error(e);
    }
  }

  protected async confirm(): Promise<void> {
    if (!this.selectedRepoId || !this.selectedAgentId) return;
    this.starting.set(true);
    try {
      const { runId } = await (await getTrpc()).runs.start.mutate({
        ticketId: this.ticketId(),
        repoId: this.selectedRepoId,
        agentId: this.selectedAgentId,
      });
      this.started.emit({ runId });
    } finally {
      this.starting.set(false);
    }
  }
}
