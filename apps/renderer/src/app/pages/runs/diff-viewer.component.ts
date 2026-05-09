import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, input, OnDestroy, signal, viewChild } from '@angular/core';
import { TRPC } from '../../core/ipc/trpc.token';
import { monaco } from '../../core/monaco/monaco-setup';

interface FileEntry {
  path: string;
  status: string;
  isBinary: boolean;
}

@Component({
  selector: 'tk-diff-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <aside>
        <ul>
          @for (f of files(); track f.path) {
            <li
              [class.active]="selected() === f.path"
              [class.binary]="f.isBinary"
              (click)="select(f.path)"
            >
              <span class="status">{{ f.status }}</span>
              <span class="path">{{ f.path }}</span>
            </li>
          } @empty {
            <li class="dim">No changed files.</li>
          }
        </ul>
      </aside>
      <main>
        @if (loading()) {
          <p class="dim">Loading…</p>
        } @else if (currentFileBinary()) {
          <p class="dim">Binary file — preview unavailable.</p>
        } @else if (currentFileTruncated()) {
          <p class="dim">File too large to render inline.</p>
        }
        <div #host class="editor-host"></div>
      </main>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 280px 1fr; height: 70vh; gap: 12px; }
    aside { border: 1px solid var(--border); border-radius: 6px; overflow: auto; padding: 8px; }
    aside ul { list-style: none; padding: 0; margin: 0; }
    aside li { padding: 6px 10px; cursor: pointer; display: flex; gap: 8px; font-size: 13px; }
    aside li:hover { background: rgba(255,255,255,0.04); }
    aside li.active { background: rgba(124,92,255,0.15); }
    aside li.binary { color: var(--fg-dim); }
    .status { color: var(--accent); font-size: 10px; text-transform: uppercase; min-width: 40px; }
    main { position: relative; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .editor-host { position: absolute; inset: 0; }
    .dim { color: var(--fg-dim); padding: 12px; }
  `],
})
export class DiffViewerComponent implements OnDestroy {
  private readonly trpc = inject(TRPC);
  readonly runId = input.required<string>();
  readonly files = input.required<FileEntry[]>();

  protected readonly selected = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly currentFileBinary = signal(false);
  protected readonly currentFileTruncated = signal(false);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private editor: ReturnType<typeof monaco.editor.createDiffEditor> | null = null;

  constructor() {
    effect(() => {
      const list = this.files();
      if (list.length > 0 && this.selected() === null) {
        this.select(list.find((f) => !f.isBinary)?.path ?? list[0]!.path);
      }
    });
  }

  ngOnDestroy(): void {
    this.disposeEditor();
  }

  protected async select(path: string): Promise<void> {
    this.selected.set(path);
    this.loading.set(true);
    this.currentFileBinary.set(false);
    this.currentFileTruncated.set(false);
    try {
      const content = await this.trpc.runs.fileContent.query({ id: this.runId(), path });
      this.currentFileBinary.set(content.isBinary);
      this.currentFileTruncated.set(content.truncated);
      if (content.isBinary || content.truncated) {
        this.disposeEditor();
        return;
      }
      this.renderDiff(content.original ?? '', content.modified ?? '', content.language);
    } finally {
      this.loading.set(false);
    }
  }

  private renderDiff(original: string, modified: string, language: string): void {
    if (!this.editor) {
      this.editor = monaco.editor.createDiffEditor(this.host().nativeElement, {
        readOnly: true,
        renderSideBySide: true,
        automaticLayout: true,
        theme: 'tickitt-dark',
        renderOverviewRuler: false,
        scrollBeyondLastLine: false,
      });
    }
    const originalModel = monaco.editor.createModel(original, language);
    const modifiedModel = monaco.editor.createModel(modified, language);
    const prev = this.editor.getModel();
    if (prev) {
      prev.original.dispose();
      prev.modified.dispose();
    }
    try {
      this.editor.setModel({ original: originalModel, modified: modifiedModel });
    } catch (err) {
      originalModel.dispose();
      modifiedModel.dispose();
      throw err;
    }
  }

  private disposeEditor(): void {
    if (this.editor) {
      const m = this.editor.getModel();
      if (m) {
        m.original.dispose();
        m.modified.dispose();
      }
      this.editor.dispose();
      this.editor = null;
    }
  }
}
