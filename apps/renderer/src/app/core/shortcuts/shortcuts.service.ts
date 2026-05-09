import { DestroyRef, Injectable, inject } from '@angular/core';

type Handler = (e: KeyboardEvent) => void;

interface Binding {
  combo: string; // e.g. "mod+shift+a", "esc"
  handler: Handler;
}

function normalise(combo: string): string {
  return combo
    .toLowerCase()
    .replace(/\s+/g, '')
    .split('+')
    .sort()
    .join('+');
}

function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.toLowerCase();
  if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
    parts.push(key);
  }
  return parts.sort().join('+');
}

@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private readonly bindings: Binding[] = [];

  constructor() {
    const onKeyDown = (e: KeyboardEvent): void => this.dispatch(e);
    document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKeyDown));
  }

  register(combo: string, handler: Handler): () => void {
    const b: Binding = { combo: normalise(combo), handler };
    this.bindings.push(b);
    return () => {
      const i = this.bindings.indexOf(b);
      if (i >= 0) this.bindings.splice(i, 1);
    };
  }

  private dispatch(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    const isTextInput = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    );
    const combo = comboFromEvent(e);
    for (const b of this.bindings) {
      if (b.combo === combo) {
        // Allow Escape inside inputs (close dialogs); block other shortcuts when typing.
        if (isTextInput && combo !== 'esc') continue;
        e.preventDefault();
        b.handler(e);
        return;
      }
    }
  }
}
