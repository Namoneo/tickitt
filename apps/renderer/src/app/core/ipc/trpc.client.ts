import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '@tickitt/ipc-contract';
import superjson from 'superjson';

export type Trpc = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

declare global {
  interface Window {
    electronTRPC?: { sendMessage: (msg: unknown) => void; onMessage: (cb: (msg: unknown) => void) => void };
  }
}

/** True when the Electron preload has exposed `window.electronTRPC` (not a plain browser tab). */
export function isTickittElectronShell(): boolean {
  return typeof window !== 'undefined' && !!window.electronTRPC;
}

/** Shown in the shell banner and when IPC is missing (e.g. opening :4200 in a normal browser). */
export const ELECTRON_TRPC_UNAVAILABLE =
  'Run `pnpm dev` and use the Tickitt window that opens with Electron — a browser tab alone has no preload, so settings and data cannot load.';

/** Thrown when IPC is unavailable (browser tab, or preload never attached). */
export class TickittIpcUnavailableError extends Error {
  override readonly name = 'TickittIpcUnavailableError';
  constructor(message: string = ELECTRON_TRPC_UNAVAILABLE) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isTickittIpcUnavailableError(e: unknown): e is TickittIpcUnavailableError {
  return e instanceof TickittIpcUnavailableError;
}

/** True when this document is almost certainly the Electron renderer (vs a normal browser tab). */
export function isLikelyElectronRenderer(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron/')) return true;
  const w = window as Window & { process?: { type?: string } };
  return w.process?.type === 'renderer';
}

let _client: Trpc | null = null;
let _ready: Promise<Trpc> | null = null;

function superjsonIpcLink(): ReturnType<typeof ipcLink<AppRouter>> {
  const link = ipcLink<AppRouter>();
  return (runtime) => link({ ...runtime, transformer: superjson } as any);
}

function waitForElectronBridge(timeoutMs: number): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new TickittIpcUnavailableError());
  }
  if (isTickittElectronShell()) {
    return Promise.resolve();
  }
  // Plain browser: never wait — avoids long setTimeout chains and uncaught spam.
  if (!isLikelyElectronRenderer()) {
    return Promise.reject(new TickittIpcUnavailableError());
  }
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (isTickittElectronShell()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new TickittIpcUnavailableError());
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

/** Single shared init so parallel callers do not each wait the full timeout. */
export async function getTrpc(): Promise<Trpc> {
  if (_client) return _client;
  if (!_ready) {
    _ready = (async () => {
      await waitForElectronBridge(20_000);
      _client = createTRPCProxyClient<AppRouter>({
        links: [superjsonIpcLink()],
      });
      return _client;
    })();
  }
  return _ready;
}
