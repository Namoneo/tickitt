import { contextBridge, ipcRenderer } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/main';

// Expose immediately, not in process.once('loaded'),
// so window.electronTRPC is ready before any renderer code runs.
exposeElectronTRPC();

// Dedicated channel for run event streaming (bypasses tRPC for real-time push)
contextBridge.exposeInMainWorld('runEvents', {
  onEvent: (cb: (payload: unknown) => void) => {
    const handler = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on('runs:event', handler);
    return () => ipcRenderer.removeListener('runs:event', handler);
  },
});
