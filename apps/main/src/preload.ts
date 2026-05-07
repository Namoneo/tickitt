import { exposeElectronTRPC } from 'electron-trpc/main';

// Expose immediately, not in process.once('loaded'),
// so window.electronTRPC is ready before any renderer code runs.
exposeElectronTRPC();