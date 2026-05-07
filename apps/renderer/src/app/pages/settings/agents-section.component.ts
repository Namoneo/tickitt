import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tk-agents-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>Agents</h3>
      <p>No agents configured yet. Claude Code, Codex, and others will be added in Phase 3.</p>
      <button disabled>Add agent</button>
    </section>
  `,
  styles: [`
    section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
    h3 { margin-top: 0; }
  `],
})
export class AgentsSectionComponent {}