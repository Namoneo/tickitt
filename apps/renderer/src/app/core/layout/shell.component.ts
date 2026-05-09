import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RunStreamService } from '../ipc/run-stream.service';

@Component({
  selector: 'tk-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside>
        <h1>Tickitt</h1>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/runs" routerLinkActive="active">
            Runs
            @let s = stats();
            @if (s.active || s.queued || s.awaiting || s.failed) {
              <span class="badge"
                [class.warn]="s.failed > 0"
                [class.ok]="s.failed === 0 && (s.active > 0 || s.awaiting > 0)">
                {{ s.active + s.queued + s.awaiting + s.failed }}
              </span>
            }
          </a>
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
        </nav>
        <div class="stats">
          @let s = stats();
          @if (s.active) { <span class="row"><b>{{ s.active }}</b> active</span> }
          @if (s.queued) { <span class="row"><b>{{ s.queued }}</b> queued</span> }
          @if (s.awaiting) { <span class="row"><b>{{ s.awaiting }}</b> awaiting review</span> }
          @if (s.failed) { <span class="row warn"><b>{{ s.failed }}</b> failed</span> }
        </div>
      </aside>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 220px 1fr; height: 100vh; }
    aside { background: var(--bg-elev); border-right: 1px solid var(--border); padding: 18px 14px; display: flex; flex-direction: column; }
    aside h1 { font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-dim); margin: 0 0 18px; }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav a { color: var(--fg-dim); padding: 8px 10px; border-radius: 6px; text-decoration: none; display: flex; justify-content: space-between; align-items: center; }
    nav a:hover { color: var(--fg); background: rgba(255,255,255,0.03); }
    nav a.active { color: var(--fg); background: rgba(124, 92, 255, 0.12); }
    .badge { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 10px; background: var(--border); color: var(--fg-dim); }
    .badge.ok { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge.warn { background: rgba(239,68,68,0.15); color: #ef4444; }
    .stats { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--fg-dim); }
    .stats .row { display: flex; gap: 6px; }
    .stats b { color: var(--fg); font-weight: 600; }
    .stats .warn b { color: #ef4444; }
    main { overflow: auto; padding: 24px 28px; }
  `],
})
export class ShellComponent {
  private readonly stream = inject(RunStreamService);
  protected readonly stats = this.stream.runStats();
}