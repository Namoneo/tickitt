import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { runs, runEvents, repos, tickets } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

export const runsRouter = router({
  list: publicProcedure
    .input(z.object({ states: z.array(z.string()).optional(), ticketId: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      const runRows = ctx.orchestrator.listRuns({
        states: input?.states,
        ticketId: input?.ticketId,
      });
      // Enrich with ticket info for the Runs page
      const ticketIds = [...new Set(runRows.map((r) => r.ticketId).filter(Boolean))];
      const ticketRows = ticketIds.length
        ? ctx.db.select().from(tickets).where(inArray(tickets.id, ticketIds as any)).all()
        : [];
      const ticketMap = new Map(ticketRows.map((t) => [t.id, t]));
      // Compute blockedBy using a separate unfiltered query for active runs
      const activeRuns = ctx.orchestrator.listRuns({ states: ['queued', 'preparing', 'running'] });
      return runRows.map((r) => {
        const blockedBy = r.state === 'queued'
          ? activeRuns.find((a) => a.repoId === r.repoId && a.id !== r.id)?.id ?? null
          : null;
        return {
          ...r,
          ticket: ticketMap.get(r.ticketId) ?? null,
          blockedBy,
        };
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

  fileContent: publicProcedure
    .input(z.object({ id: z.string(), path: z.string() }))
    .query(async ({ ctx, input }) => {
      const [run] = ctx.db.select().from(runs).where(eq(runs.id, input.id)).limit(1).all();
      if (!run) throw new Error('Run not found');
      if (!run.worktreePath) throw new Error('Worktree not ready yet');
      const [repo] = ctx.db.select().from(repos).where(eq(repos.id, run.repoId)).limit(1).all();
      if (!repo) throw new Error('Repo not found');
      const baseRef = run.baseSha ?? `origin/${repo.defaultBranch}`;
      return ctx.diff.fileContent(run.worktreePath, baseRef, input.path);
    }),

  approve: publicProcedure
    .input(z.object({ id: z.string(), commitMessage: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.orchestrator.approve(input.id, { commitMessage: input.commitMessage });
      // Cast to any to include additional fields the orchestrator may not return yet
      return res as { prUrl: string; pushedAt: Date; jiraCommentOk?: boolean; jiraTransitionResult?: { ok: boolean; appliedName?: string; available?: string[] } };
    }),

  discard: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.orchestrator.discard(input.id);
      return { ok: true as const };
    }),

  requestChanges: publicProcedure
    .input(z.object({ id: z.string(), feedback: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.orchestrator.requestChanges(input.id, input.feedback);
      return { ok: true as const };
    }),
});
