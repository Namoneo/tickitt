import { router } from './trpc.js';
import { systemRouter } from './routers/system.router.js';
import { connectionsRouter } from './routers/connections.router.js';
import { agentsRouter } from './routers/agents.router.js';
import { reposRouter } from './routers/repos.router.js';

export const appRouter = router({
  system: systemRouter,
  connections: connectionsRouter,
  agents: agentsRouter,
  repos: reposRouter,
});

export type AppRouter = typeof appRouter;