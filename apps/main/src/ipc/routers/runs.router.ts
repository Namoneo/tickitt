import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { runs, runEvents, repos } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

export const runsRouter = router({
  list: publicProcedure
    .input(z.object({ states: z.array(z.string()).optional(), ticketId: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      return ctx.orchestrator.listRuns({
        states: input?.states,
        ticketId: input?.ticketId,
      });
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const [run] = ctx.db.select().from(runs).where(eq(runs.id, input.id)).limit(1).all();
      const events = ctx.db.select().from(runEvents).where(eq(runEvents.runId, input.id)).orderBy(runEvents.ts).all();
      return { run: run ?? null, events };
    }),

  start: publicProcedure
    .input(z.object({ ticketId: z.string(), repoId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.orchestrator.start(input);
    }),

  cancel: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.orchestrator.cancel(input.id);
      return { ok: true };
    }),

  diffSummary: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [run] = ctx.db.select().from(runs).where(eq(runs.id, input.id)).limit(1).all();
      if (!run) throw new Error('Run not found');
      if (!run.worktreePath) throw new Error('Worktree not ready yet');
      const [repo] = ctx.db.select().from(repos).where(eq(repos.id, run.repoId)).limit(1).all();
      if (!repo) throw new Error('Repo not found');
      return ctx.diff.summary(run.worktreePath, `origin/${repo.defaultBranch}`);
    }),
});
