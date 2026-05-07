import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TRPC } from '../../core/ipc/trpc.token';
import type { Agent } from '@tickitt/db';

@Component({
  selector: 'tk-agents-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Agents</h3>
      <button (click)="showAdd.set(true)">Add agent</button>

      @if (showAdd()) {
        <div class="form">
          <select #kind>
            <option value="claude-code">Claude Code</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini</option>
            <option value="opencode">OpenCode</option>
            <option value="cursor">Cursor</option>
          </select>
          <input #name placeholder="Name" />
          <input #binary placeholder="Binary path" />
          <button (click)="add(kind.value, name.value, binary.value)">Save</button>
          <button (click)="showAdd.set(false)">Cancel</button>
        </div>
      }

      @for (a of list(); track a.id) {
        <div class="item">
          <strong>{{ a.name }}</strong> ({{ a.kind }}) — {{ a.enabled ? 'enabled' : 'disabled' }}
          <button (click)="toggle(a)">{{ a.enabled ? 'Disable' : 'Enable' }}</button>
          <button (click)="remove(a.id)">Delete</button>
        </div>
      } @empty {
        <p>No agents configured.</p>
      }
    </section>
  `,
  styles: [`
    section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    h3 { margin-top: 0; }
    .form { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
    .form input, .form select { padding: 6px 8px; }
    .item { padding: 8px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; }
    button { margin-right: 4px; }
  `],
})
export class AgentsSectionComponent {
  private readonly trpc = inject(TRPC);
  protected readonly list = signal<Agent[]>([]);
  protected readonly showAdd = signal(false);

  constructor() {
    this.load();
  }

  protected async load(): Promise<void> {
    this.list.set(await this.trpc.agents.list.query());
  }

  protected async add(kind: string, name: string, binary: string): Promise<void> {
    await this.trpc.agents.create.mutate({ kind: kind as any, name, binaryPath: binary });
    this.showAdd.set(false);
    await this.load();
  }

  protected async toggle(a: Agent): Promise<void> {
    await this.trpc.agents.setEnabled.mutate({ id: a.id, enabled: !a.enabled });
    await this.load();
  }

  protected async remove(id: string): Promise<void> {
    await this.trpc.agents.delete.mutate({ id });
    await this.load();
  }
}