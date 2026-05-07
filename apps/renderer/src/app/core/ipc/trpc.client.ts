import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import superjson from 'superjson';
import type { AppRouter } from '@tickitt/ipc-contract';

export type Trpc = ReturnType<typeof createTrpc>;

export function createTrpc() {
  return createTRPCProxyClient<AppRouter>({
    links: [ipcLink()],
  });
}