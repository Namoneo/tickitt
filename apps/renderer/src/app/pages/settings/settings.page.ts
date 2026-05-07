import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConnectionsSectionComponent } from './connections-section.component';
import { AgentsSectionComponent } from './agents-section.component';
import { ReposSectionComponent } from './repos-section.component';
import { DiagnosticsSectionComponent } from './diagnostics-section.component';

@Component({
  selector: 'tk-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConnectionsSectionComponent,
    AgentsSectionComponent,
    ReposSectionComponent,
    DiagnosticsSectionComponent,
  ],
  template: `
    <h2>Settings</h2>
    <tk-diagnostics-section />
    <tk-connections-section />
    <tk-agents-section />
    <tk-repos-section />
  `,
  styles: [`
    :host { display: block; max-width: 920px; }
    h2 { margin-top: 0; }
  `],
})
export class SettingsPage {}