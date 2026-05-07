import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { agents } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

const AgentKind = z.enum(['claude-code', 'codex', 'gemini', 'opencode', 'cursor']);

export const agentsRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.db.select().from(agents).all()),

  create: publicProcedure
    .input(z.object({
      kind: AgentKind,
      name: z.string().min(1).max(80),
      binaryPath: z.string().min(1),
      args: z.array(z.string()).default([]),
      env: z.record(z.string()).default({}),
    }))
    .mutation(({ ctx, input }) => {
      const [row] = ctx.db.insert(agents).values({
        kind: input.kind,
        name: input.name,
        binaryPath: input.binaryPath,
        argsJson: input.args,
        envJson: input.env,
        enabled: true,
      }).returning().all();
      return row!;
    }),

  setEnabled: publicProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      ctx.db.update(agents).set({ enabled: input.enabled }).where(eq(agents.id, input.id)).run();
      return { ok: true as const };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(agents).where(eq(agents.id, input.id)).run();
      return { ok: true as const };
    }),
});