import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { IpcContext } from './context.js';

const t = initTRPC.context<IpcContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape }) => shape,
});

export const router = t.router;
export const publicProcedure = t.procedure;