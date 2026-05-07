import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '@tickitt/ipc-contract';

export type Trpc = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

let _client: Trpc | null = null;

function waitForGlobal(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (typeof window !== 'undefined' && (window as any).electronTRPC) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('electronTRPC global not found — preload may not have run'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

export async function getTrpc(): Promise<Trpc> {
  if (!_client) {
    await waitForGlobal();
    _client = createTRPCProxyClient<AppRouter>({
      links: [ipcLink()],
    });
  }
  return _client;
}