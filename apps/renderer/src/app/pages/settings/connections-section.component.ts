import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Connection } from '@tickitt/db';
import { getTrpc } from '../../core/ipc/trpc.client';

const LINEAR_STATE_TYPES = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'] as const;

type FormState = {
  kind: 'jira' | 'github' | 'linear';
  label: string;
  baseUrl: string;
  email: string;
  secret: string;
  teamKey: string;
  stateTypes: string[];
  onlyAssignedToMe: boolean;
  transitionOnPrOpen: string;
};

@Component({
  selector: 'tk-connections-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section>
      <div class="row">
        <h3>Connections</h3>
        <input [(ngModel)]="search" placeholder="Search connections..." class="search" />
        <button (click)="openCreate()">Add connection</button>
      </div>

      @if (editing()) {
        <div class="form">
          <select [(ngModel)]="form.kind" [disabled]="editing() !== 'new'">
            <option value="jira">Jira Cloud</option>
            <option value="github">GitHub</option>
            <option value="linear">Linear</option>
          </select>
          <input [(ngModel)]="form.label" placeholder="Label" />

          @if (form.kind === 'jira') {
            <input [(ngModel)]="form.baseUrl" placeholder="Base URL" />
            <input [(ngModel)]="form.email" placeholder="Email" />
          }
          @if (form.kind === 'github') {
            <input [(ngModel)]="form.baseUrl" placeholder="Owner" />
          }
          @if (form.kind === 'linear') {
            <input [(ngModel)]="form.teamKey" placeholder="Team key (optional)" />
            <div class="row-inline">
              <label>State types:</label>
              @for (st of LINEAR_STATE_TYPES; track st) {
                <label class="chip">
                  <input type="checkbox" [checked]="form.stateTypes.includes(st)" (change)="toggleStateType(st, $event)" />
                  {{ st }}
                </label>
              }
            </div>
            <label class="row-inline">
              <input type="checkbox" [(ngModel)]="form.onlyAssignedToMe" />
              Only assigned to me
            </label>
            <input [(ngModel)]="form.transitionOnPrOpen" placeholder="Transition on PR open (optional state name)" />
          }

          <input [(ngModel)]="form.secret" [placeholder]="editing() === 'new' ? 'API Token / PAT / API Key' : 'New token (leave blank to keep existing)'" type="password" />
          <div class="actions">
            <button (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button (click)="cancel()">Cancel</button>
          </div>
        </div>
      }

      @for (c of filtered(); track c.id) {
        <div class="item">
          <div class="info">
            <strong>{{ c.label }}</strong>
            <span class="badge">{{ c.kind }}</span>
            <span [class.ok]="c.status === 'active'" [class.warn]="c.status !== 'active'">{{ c.status }}</span>
          </div>
          <div class="actions">
            <button (click)="test(c.id)">Test</button>
            <button (click)="openEdit(c)">Edit</button>
            <button (click)="remove(c.id)">Delete</button>
          </div>
        </div>
      } @empty {
        <div class="empty">
          @if (search()) {
            <p>No connections match "{{ search() }}"</p>
            <button (click)="search.set('')">Clear search</button>
          } @else {
            <p>No connections configured yet.</p>
            <button (click)="openCreate()">Add your first connection</button>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    .row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    h3 { margin: 0; flex: 1; }
    .search { padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); width: 220px; }
    .form { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; padding: 12px; border: 1px solid var(--border); border-radius: 6px; }
    .form input, .form select { padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); }
    .row-inline { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .chip { font-size: 12px; background: var(--bg); padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border); display: flex; align-items: center; gap: 4px; cursor: pointer; }
    .chip input { margin: 0; }
    .item { padding: 10px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .info { display: flex; gap: 10px; align-items: center; }
    .badge { font-size: 11px; background: var(--border); padding: 2px 8px; border-radius: 10px; }
    .ok { color: #22c55e; }
    .warn { color: #f59e0b; }
    .actions { display: flex; gap: 6px; }
    button { padding: 5px 12px; border-radius: 6px; border: none; background: var(--accent); color: #fff; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .empty { text-align: center; padding: 32px; color: var(--fg-dim); }
    .empty button { margin-top: 8px; }
  `],
})
export class ConnectionsSectionComponent {
  protected readonly list = signal<Connection[]>([]);
  protected readonly search = signal('');
  protected readonly editing = signal<'new' | string | null>(null);
  protected readonly saving = signal(false);
  protected readonly LINEAR_STATE_TYPES = LINEAR_STATE_TYPES;
  protected readonly form: FormState = {
    kind: 'jira',
    label: '',
    baseUrl: '',
    email: '',
    secret: '',
    teamKey: '',
    stateTypes: ['unstarted', 'started'],
    onlyAssignedToMe: true,
    transitionOnPrOpen: '',
  };

  constructor() { this.load(); }

  protected get filtered() {
    return () => {
      const s = this.search().toLowerCase();
      return s ? this.list().filter((c) => c.label.toLowerCase().includes(s) || c.kind.includes(s)) : this.list();
    };
  }

  protected openCreate(): void {
    this.editing.set('new');
    this.form.kind = 'jira';
    this.form.label = '';
    this.form.baseUrl = '';
    this.form.email = '';
    this.form.secret = '';
    this.form.teamKey = '';
    this.form.stateTypes = ['unstarted', 'started'];
    this.form.onlyAssignedToMe = true;
    this.form.transitionOnPrOpen = '';
  }

  protected openEdit(c: Connection): void {
    this.editing.set(c.id);
    this.form.kind = c.kind as 'jira' | 'github' | 'linear';
    this.form.label = c.label;
    this.form.secret = '';
    const cfg = (c.configJson ?? {}) as Record<string, unknown>;
    if (this.form.kind === 'linear') {
      this.form.teamKey = (cfg.teamKey as string) ?? '';
      this.form.stateTypes = Array.isArray(cfg.stateTypes) ? cfg.stateTypes as string[] : ['unstarted', 'started'];
      this.form.onlyAssignedToMe = (cfg.onlyAssignedToMe as boolean) ?? true;
      this.form.transitionOnPrOpen = (cfg.transitionOnPrOpen as string) ?? '';
      this.form.baseUrl = '';
      this.form.email = '';
    } else {
      this.form.baseUrl = (cfg.baseUrl as string) ?? (cfg.owner as string) ?? '';
      this.form.email = (cfg.email as string) ?? '';
      this.form.teamKey = '';
      this.form.stateTypes = ['unstarted', 'started'];
      this.form.onlyAssignedToMe = true;
      this.form.transitionOnPrOpen = '';
    }
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      const id = this.editing();
      if (id === 'new') {
        const config = this.buildConfig();
        await (await getTrpc()).connections.create.mutate({
          kind: this.form.kind, label: this.form.label, config, secret: this.form.secret,
        });
      } else if (id) {
        const config = this.buildConfig();
        if (this.form.kind === 'github') {
          await (await getTrpc()).connections.updateGithub.mutate({
            id, label: this.form.label, config, pat: this.form.secret || undefined,
          });
        } else if (this.form.kind === 'linear') {
          await (await getTrpc()).connections.updateLinear.mutate({
            id, label: this.form.label, config, apiKey: this.form.secret || undefined,
          });
        } else {
          await (await getTrpc()).connections.updateJira.mutate({
            id, label: this.form.label, config, apiToken: this.form.secret || undefined,
          });
        }
      }
      this.editing.set(null);
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }

  private buildConfig(): Record<string, unknown> {
    if (this.form.kind === 'jira') {
      return { baseUrl: this.form.baseUrl, email: this.form.email };
    }
    if (this.form.kind === 'github') {
      return { owner: this.form.baseUrl };
    }
    return {
      teamKey: this.form.teamKey || undefined,
      stateTypes: this.form.stateTypes,
      onlyAssignedToMe: this.form.onlyAssignedToMe,
      transitionOnPrOpen: this.form.transitionOnPrOpen || undefined,
    };
  }

  protected toggleStateType(st: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const set = new Set(this.form.stateTypes);
    if (checked) set.add(st); else set.delete(st);
    this.form.stateTypes = Array.from(set);
  }

  protected async test(id: string): Promise<void> {
    const result = await (await getTrpc()).connections.test.mutate({ id });
    alert(result.ok ? `OK: ${(result as any).identity?.displayName ?? ''}` : `FAIL: ${(result as any).error}`);
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('Delete this connection?')) return;
    await (await getTrpc()).connections.delete.mutate({ id });
    await this.load();
  }

  private async load(): Promise<void> {
    this.list.set(await (await getTrpc()).connections.list.query());
  }
}
