import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ShellComponent } from './core/layout/shell.component';
import { ShortcutsService } from './core/shortcuts/shortcuts.service';

@Component({
  selector: 'tk-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShellComponent],
  template: `\u003ctk-shell /\u003e`,
})
export class AppComponent {
  private readonly router = inject(Router);

  constructor() {
    const shortcuts = inject(ShortcutsService);
    shortcuts.register('mod+1', () => void this.router.navigateByUrl('/dashboard'));
    shortcuts.register('mod+2', () => void this.router.navigateByUrl('/runs'));
    shortcuts.register('mod+3', () => void this.router.navigateByUrl('/settings'));
    shortcuts.register('mod+,', () => void this.router.navigateByUrl('/settings'));
  }
}
