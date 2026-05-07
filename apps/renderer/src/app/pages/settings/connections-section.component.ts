import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Connection } from '@tickitt/db';
import { getTrpc } from '../../core/ipc/trpc.client';

@Component({
  selector: 'tk-connections-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Connections</h3>
      <button (click)="showAdd.set(true)">Add connection</button>

      @if (showAdd()) {
        <div class="form">
          <select #kind>
            <option value="jira">Jira Cloud</option>
            <option value="github">GitHub</option>
          </select>
          <input #label placeholder="Label" />
          <input #baseUrl placeholder="Base URL (Jira) or Owner (GitHub)" />
          <input #email placeholder="Email (Jira only)" />
          <input #token placeholder="API Token / PAT" type="password" />
          <button (click)="add(kind.value, label.value, baseUrl.value, email.value, token.value)">Save</button>
          <button (click)="showAdd.set(false)">Cancel</button>
        </div>
      }

      @for (c of list(); track c.id) {
        <div class="item">
          <strong>{{ c.label }}</strong> ({{ c.kind }}) — {{ c.status }}
          <button (click)="test(c.id)">Test</button>
          <button (click)="remove(c.id)">Delete</button>
        </div>
      } @empty {
        <p>No connections configured.</p>
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
export class ConnectionsSectionComponent {
  protected readonly list = signal<Connection[]>([]);
  protected readonly showAdd = signal(false);

  constructor() {
    this.load();
  }

  protected async load(): Promise<void> {
    this.list.set(await (await getTrpc()).connections.list.query());
  }

  protected async add(kind: string, label: string, baseUrl: string, email: string, token: string): Promise<void> {
    const config = kind === 'jira' ? { baseUrl, email } : { owner: baseUrl };
    await (await getTrpc()).connections.create.mutate({ kind: kind as 'jira' | 'github', label, config, secret: token });
    this.showAdd.set(false);
    await this.load();
  }

  protected async test(id: string): Promise<void> {
    const result = await (await getTrpc()).connections.test.mutate({ id });
    alert(result.ok ? `OK: ${result.identity?.displayName ?? ''}` : `FAIL: ${result.error}`);
  }

  protected async remove(id: string): Promise<void> {
    await (await getTrpc()).connections.delete.mutate({ id });
    await this.load();
  }
}