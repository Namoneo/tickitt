import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Repo } from '@tickitt/db';
import { getTrpc, isTickittIpcUnavailableError } from '../../core/ipc/trpc.client';

@Component({
  selector: 'tk-repos-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <section>
      <div class="row">
        <h3>Repositories</h3>
        <input [(ngModel)]="search" placeholder="Search repos..." class="search" />
        <button (click)="openCreate()">Add repository</button>
      </div>

      @if (editing()) {
        <div class="form">
          <input [(ngModel)]="form.name" placeholder="Name" />
          <input [(ngModel)]="form.remoteUrl" placeholder="Remote URL" [disabled]="editing() !== 'new'" />
          <input [(ngModel)]="form.localPath" placeholder="Local path" [disabled]="editing() !== 'new'" />
          <input [(ngModel)]="form.defaultBranch" placeholder="Default branch" />
          @if (editing() === 'new') {
            <label><input type="checkbox" [(ngModel)]="form.cloneNow" /> Clone now</label>
          }
          <div class="actions">
            <button (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
            <button (click)="cancel()">Cancel</button>
          </div>
        </div>
      }

      @for (r of filtered(); track r.id) {
        <div class="item">
          <div class="info">
            <strong>{{ r.name }}</strong>
            <span class="dim">{{ r.remoteUrl }}</span>
            <span class="badge">{{ r.defaultBranch }}</span>
          </div>
          <div class="actions">
            <button (click)="openEdit(r)">Edit</button>
            <button (click)="remove(r.id)">Delete</button>
          </div>
        </div>
      } @empty {
        <div class="empty">
          @if (search()) {
            <p>No repos match "{{ search() }}"</p>
            <button (click)="search.set('')">Clear search</button>
          } @else {
            <p>No repositories added yet.</p>
            <button (click)="openCreate()">Add your first repo</button>
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
    .form input { padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); }
    .item { padding: 10px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
    .info { display: flex; gap: 10px; align-items: center; }
    .badge { font-size: 11px; background: var(--border); padding: 2px 8px; border-radius: 10px; }
    .dim { color: var(--fg-dim); font-size: 12px; }
    .actions { display: flex; gap: 6px; }
    button { padding: 5px 12px; border-radius: 6px; border: none; background: var(--accent); color: #fff; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .empty { text-align: center; padding: 32px; color: var(--fg-dim); }
    .empty button { margin-top: 8px; }
  `],
})
export class ReposSectionComponent {
  protected readonly list = signal<Repo[]>([]);
  protected readonly search = signal('');
  protected readonly editing = signal<'new' | string | null>(null);
  protected readonly saving = signal(false);
  protected readonly form = {
    name: '', remoteUrl: '', localPath: '', defaultBranch: 'main', cloneNow: false,
  };

  constructor() {
    void this.load();
  }

  protected readonly filtered = computed(() => {
    const s = this.search().toLowerCase();
    return s ? this.list().filter((r) => r.name.toLowerCase().includes(s) || r.remoteUrl.toLowerCase().includes(s)) : this.list();
  });

  protected openCreate(): void {
    this.editing.set('new');
    this.form.name = '';
    this.form.remoteUrl = '';
    this.form.localPath = '';
    this.form.defaultBranch = 'main';
    this.form.cloneNow = false;
  }

  protected openEdit(r: Repo): void {
    this.editing.set(r.id);
    this.form.name = r.name;
    this.form.remoteUrl = r.remoteUrl;
    this.form.localPath = r.localPath;
    this.form.defaultBranch = r.defaultBranch;
    this.form.cloneNow = false;
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected async save(): Promise<void> {
    this.saving.set(true);
    try {
      const id = this.editing();
      if (id === 'new') {
        await (await getTrpc()).repos.add.mutate({
          name: this.form.name,
          remoteUrl: this.form.remoteUrl,
          localPath: this.form.localPath,
          defaultBranch: this.form.defaultBranch,
          cloneNow: this.form.cloneNow,
        });
      } else if (id) {
        await (await getTrpc()).repos.update.mutate({
          id,
          defaultBranch: this.form.defaultBranch,
        });
      }
      this.editing.set(null);
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('Delete this repository?')) return;
    await (await getTrpc()).repos.remove.mutate({ id });
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.list.set(await (await getTrpc()).repos.list.query());
    } catch (e) {
      if (isTickittIpcUnavailableError(e)) {
        this.list.set([]);
        return;
      }
      console.error(e);
    }
  }
}
