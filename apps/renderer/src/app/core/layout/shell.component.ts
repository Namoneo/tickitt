import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
          <a routerLink="/runs" routerLinkActive="active">Runs</a>
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
        </nav>
      </aside>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 220px 1fr; height: 100vh; }
    aside { background: var(--bg-elev); border-right: 1px solid var(--border); padding: 18px 14px; }
    aside h1 { font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-dim); margin: 0 0 18px; }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav a { color: var(--fg-dim); padding: 8px 10px; border-radius: 6px; text-decoration: none; }
    nav a:hover { color: var(--fg); background: rgba(255,255,255,0.03); }
    nav a.active { color: var(--fg); background: rgba(124, 92, 255, 0.12); }
    main { overflow: auto; padding: 24px 28px; }
  `],
})
export class ShellComponent {}