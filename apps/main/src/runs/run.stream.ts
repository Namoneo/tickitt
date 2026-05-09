import type { BrowserWindow } from 'electron';
import type { RunEventPayload } from './run.types.js';

export class RunStream {
  private windows: BrowserWindow[] = [];

  attach(windows: BrowserWindow[]): void {
    this.windows = windows;
  }

  publish(payload: RunEventPayload): void {
    for (const w of this.windows) {
      if (!w.isDestroyed() && w.webContents && !w.webContents.isDestroyed()) {
        w.webContents.send('runs:event', payload);
      }
    }
  }
}
