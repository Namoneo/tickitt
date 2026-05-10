import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Agent } from '@tickitt/db';
import { getTrpc, isTickittIpcUnavailableError } from '../../core/ipc/trpc.client';

/** Sensible defaults when adding an agent (CLI names assume they are on your PATH). */
const NEW_AGENT_PRESETS = {
  'claude-code': { name: 'Claude Code', binaryPath: 'claude', args: '' },
  codex: { name: 'Codex', binaryPath: 'codex', args: '' },
  gemini: { name: 'Gemini', binaryPath: 'gemini', args: '' },
  opencode: { name: 'OpenCode', binaryPath: 'opencode', args: '' },
  cursor: { name: 'Cursor', binaryPath: 'cursor', args: '' },
} as const;

type NewAgentPresetKind = keyof typeof NEW_AGENT_PRESETS;

@Component({
  selector: 'tk-agents-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section>
      <div class="row">
        <h3>Agents</h3>
        <input [(ngModel)]="search" placeholder="Search agents..." class="search" />
        <button (click)="openCreate()">Add agent</button>
      </div>

      @if (editing()) {
        <div class="form">
          <select
            [(ngModel)]="form.kind"
            (ngModelChange)="onNewAgentKindChange($event)"
            [disabled]="editing() !== 'new'"
          >
            <option value="claude-code">Claude Code</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini</option>
            <option value="opencode">OpenCode</option>
            <option value="cursor">Cursor</option>
          </select>
          <input [(ngModel)]="form.name" placeholder="Name" />
          <input [(ngModel)]="form.binaryPath" placeholder="Binary path" />
          <input [(ngModel)]="form.args" placeholder="Args (space-separated, optional)" />
          <div class="actions">
            <button (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button (click)="cancel()">Cancel</button>
          </div>
        </div>
      }

      @for (a of filtered(); track a.id) {
        <div class="item">
          <div class="info">
            <strong>{{ a.name }}</strong>
            <span class="badge">{{ a.kind }}</span>
            <span [class.ok]="a.enabled" [class.dim]="!a.enabled">{{ a.enabled ? 'enabled' : 'disabled' }}</span>
          </div>
          <div class="actions">
            <button (click)="toggle(a)">{{ a.enabled ? 'Disable' : 'Enable' }}</button>
            <button (click)="openEdit(a)">Edit</button>
            <button (click)="remove(a.id)">Delete</button>
          </div>
        </div>
      } @empty {
        <div class="empty">
          @if (search()) {
            <p>No agents match "{{ search() }}"</p>
            <button (click)="search.set('')">Clear search</button>
          } @else {
            <p>No agents configured yet.</p>
            <button (click)="openCreate()">Add your first agent</button>
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
    .item { padding: 10px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .info { display: flex; gap: 10px; align-items: center; }
    .badge { font-size: 11px; background: var(--border); padding: 2px 8px; border-radius: 10px; }
    .ok { color: #22c55e; }
    .dim { color: var(--fg-dim); }
    .actions { display: flex; gap: 6px; }
    button { padding: 5px 12px; border-radius: 6px; border: none; background: var(--accent); color: #fff; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .empty { text-align: center; padding: 32px; color: var(--fg-dim); }
    .empty button { margin-top: 8px; }
  `],
})
export class AgentsSectionComponent {
  protected readonly list = signal<Agent[]>([]);
  protected readonly search = signal('');
  protected readonly editing = signal<'new' | string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = { kind: 'claude-code' as string, name: '', binaryPath: '', args: '' };

  constructor() {
    void this.load();
  }

  protected readonly filtered = computed(() => {
    const s = this.search().toLowerCase();
    return s ? this.list().filter((a) => a.name.toLowerCase().includes(s) || a.kind.includes(s)) : this.list();
  });

  protected openCreate(): void {
    this.editing.set('new');
    this.applyNewAgentPreset('claude-code');
  }

  /** When creating an agent, refills name / binary / args from the selected kind. */
  protected onNewAgentKindChange(kind: string): void {
    if (this.editing() !== 'new') return;
    this.applyNewAgentPreset(kind);
  }

  private applyNewAgentPreset(kind: string): void {
    const key = (kind in NEW_AGENT_PRESETS ? kind : 'claude-code') as NewAgentPresetKind;
    const preset = NEW_AGENT_PRESETS[key];
    this.form.kind = key;
    this.form.name = preset.name;
    this.form.binaryPath = preset.binaryPath;
    this.form.args = preset.args;
  }

  protected openEdit(a: Agent): void {
    this.editing.set(a.id);
    this.form.kind = a.kind;
    this.form.name = a.name;
    this.form.binaryPath = a.binaryPath;
    this.form.args = (a.argsJson ?? []).join(' ');
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      const id = this.editing();
      const args = this.form.args.split(' ').filter(Boolean);
      if (id === 'new') {
        await (await getTrpc()).agents.create.mutate({
          kind: this.form.kind as any, name: this.form.name, binaryPath: this.form.binaryPath, args,
        });
      } else if (id) {
        await (await getTrpc()).agents.update.mutate({
          id, name: this.form.name, binaryPath: this.form.binaryPath, args,
        });
      }
      this.editing.set(null);
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggle(a: Agent): Promise<void> {
    await (await getTrpc()).agents.setEnabled.mutate({ id: a.id, enabled: !a.enabled });
    await this.load();
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('Delete this agent?')) return;
    await (await getTrpc()).agents.delete.mutate({ id });
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.list.set(await (await getTrpc()).agents.list.query());
    } catch (e) {
      if (isTickittIpcUnavailableError(e)) {
        this.list.set([]);
        return;
      }
      console.error(e);
    }
  }
}
