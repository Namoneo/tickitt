import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '@tickitt/ipc-contract';

export type Trpc = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

let _client: Trpc | null = null;

export function getTrpc(): Trpc {
  if (!_client) {
    _client = createTRPCProxyClient<AppRouter>({
      links: [ipcLink()],
    });
  }
  return _client;
}