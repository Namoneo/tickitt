import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tk-repos-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Repositories</h3>
      <p>No repositories added yet. Add repos in Phase 1.</p>
      <button disabled>Add repository</button>
    </section>
  `,
  styles: [`
    section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    h3 { margin-top: 0; }
  `],
})
export class ReposSectionComponent {}