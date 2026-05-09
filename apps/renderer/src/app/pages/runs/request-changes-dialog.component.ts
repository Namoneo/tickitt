import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRPC } from '../../core/ipc/trpc.token';

@Component({
  selector: 'tk-request-changes-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header>
          <h3>Request Changes</h3>
          <button class="close" (click)="close()">×</button>
        </header>

        <div class="body">
          @if (iterationCount() >= 3) {
            <p class="warning">
              Iteration cap reached (3). You can only Approve or Discard this run.
            </p>
          } @else {
            <label for="feedback">Feedback for the agent</label>
            <textarea
              id="feedback"
              [(ngModel)]="feedback"
              placeholder="Describe what needs to be changed..."
              rows="6"
            ></textarea>
          }
        </div>

        <footer>
          <button class="secondary" (click)="close()">Cancel</button>
          <button
            class="primary"
            [disabled]="iterationCount() >= 3 || !feedback().trim() || sending()"
            (click)="send()"
          >
            @if (sending()) { Sending… } @else { Send }
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 100; }
    .modal { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; width: min(560px, 92vw); max-height: 80vh; display: flex; flex-direction: column; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); }
    h3 { margin: 0; font-size: 16px; }
    .close { background: transparent; border: none; color: var(--fg-dim); font-size: 20px; cursor: pointer; }
    .body { padding: 16px; }
    label { display: block; margin-bottom: 8px; font-weight: 500; }
    textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--fg); padding: 10px; resize: vertical; }
    .warning { color: #ff6b6b; }
    footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 16px; border-top: 1px solid var(--border); }
    button { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); color: var(--fg); cursor: pointer; }
    button.primary { background: var(--accent); color: #0b0b0e; border-color: var(--accent); }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class RequestChangesDialogComponent {
  private readonly trpc = inject(TRPC);
  readonly runId = input.required<string>();
  readonly iterationCount = input.required<number>();
  readonly onClose = input.required<() => void>();
  readonly onSent = input.required<() => void>();

  protected readonly feedback = signal('');
  protected readonly sending = signal(false);

  close(): void {
    this.onClose()();
  }

  async send(): Promise<void> {
    const text = this.feedback().trim();
    if (!text) return;
    this.sending.set(true);
    try {
      await this.trpc.runs.requestChanges.mutate({ id: this.runId(), feedback: text });
      this.onSent()();
    } finally {
      this.sending.set(false);
    }
  }
}
