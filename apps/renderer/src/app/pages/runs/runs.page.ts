import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tk-runs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Runs</h2>
    <p>Active and completed runs land here in Phase 3+.</p>
  `,
})
export class RunsPage {}