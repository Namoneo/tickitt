import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tk-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Dashboard</h2>
    <p>Tickets and agent assignment land here in Phase 1+.</p>
  `,
})
export class DashboardPage {}