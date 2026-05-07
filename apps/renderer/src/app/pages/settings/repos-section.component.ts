import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { Repo } from '@tickitt/db';
import { getTrpc } from '../../core/ipc/trpc.client';

@Component({
  selector: 'tk-repos-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Repositories</h3>
      <button (click)="showAdd.set(true)">Add repository</button>

      @if (showAdd()) {
        <div class="form">
          <input #name placeholder="Name" />
          <input #url placeholder="Remote URL" />
          <input #path placeholder="Local path" />
          <label>
            <input #cloneNow type="checkbox" /> Clone now
          </label>
          <button (click)="add(name.value, url.value, path.value, cloneNow.checked)">Save</button>
          <button (click)="showAdd.set(false)">Cancel</button>
        </div>
      }

      @for (r of list(); track r.id) {
        <div class="item">
          <strong>{{ r.name }}</strong> — {{ r.remoteUrl }}
          <button (click)="remove(r.id)">Delete</button>
        </div>
      } @empty {
        <p>No repositories added.</p>
      }
    </section>
  `,
  styles: [`
    section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    h3 { margin-top: 0; }
    .form { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
    .form input { padding: 6px 8px; }
    .item { padding: 8px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; align-items: center; }
    button { margin-right: 4px; }
  `],
})
export class ReposSectionComponent {
  protected readonly list = signal<Repo[]>([]);
  protected readonly showAdd = signal(false);

  constructor() {
    this.load();
  }

  protected async load(): Promise<void> {
    this.list.set(await (await getTrpc()).repos.list.query());
  }

  protected async add(name: string, url: string, path: string, cloneNow: boolean): Promise<void> {
    await (await getTrpc()).repos.add.mutate({ name, remoteUrl: url, localPath: path, cloneNow });
    this.showAdd.set(false);
    await this.load();
  }

  protected async remove(id: string): Promise<void> {
    await (await getTrpc()).repos.remove.mutate({ id });
    await this.load();
  }
}