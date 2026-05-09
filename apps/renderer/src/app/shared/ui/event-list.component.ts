import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface EventItem { id: number; payload: any }

@Component({
  selector: 'tk-event-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <ul>
      @for (e of events(); track e.id) {
        <li class="evt evt-{{ e.payload.type }}">
          <span class="kind">{{ e.payload.type }}</span>
          @switch (e.payload.type) {
            @case ('text')        { <pre>{{ e.payload.content }}</pre> }
            @case ('tool_use')    { <span>{{ e.payload.tool }}: <code>{{ summary(e.payload.input) }}</code></span> }
            @case ('tool_result') { <span class="dim">{{ e.payload.tool }} → {{ summary(e.payload.output) }}</span> }
            @case ('error')       { <span class="err">{{ e.payload.message }}</span> }
            @case ('usage')       {
              <span class="dim">in: {{ e.payload.inputTokens }} · out: {{ e.payload.outputTokens }}
                @if (e.payload.costUsd) { · \${{ e.payload.costUsd | number:'1.4-4' }} }
              </span>
            }
            @default              { <span class="dim">{{ summary(e.payload) }}</span> }
          }
        </li>
      } @empty {
        <li class="dim">No events yet.</li>
      }
    </ul>
  `,
  styles: [`
    ul { list-style: none; padding: 0; font-family: monospace; font-size: 12px; }
    li { padding: 6px 0; border-bottom: 1px solid var(--border); display: grid; gap: 8px; }
    .kind { color: var(--fg-dim); text-transform: uppercase; font-size: 10px; }
    pre { margin: 0; white-space: pre-wrap; }
    .evt-error { background: rgba(255, 107, 107, 0.05); }
    .err { color: var(--danger); }
    .dim { color: var(--fg-dim); }
    code { background: rgba(255,255,255,0.04); padding: 1px 4px; border-radius: 3px; }
  `],
})
export class EventListComponent {
  readonly events = input.required<EventItem[]>();

  protected summary(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
    try {
      const s = JSON.stringify(v);
      return s.length > 200 ? s.slice(0, 200) + '…' : s;
    } catch { return String(v); }
  }
}
