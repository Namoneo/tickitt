import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { repos } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';
import { RepoCloneService } from '../../services/repo-clone-service.js';

const cloneService = new RepoCloneService();

export const reposRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.db.select().from(repos).all()),

  add: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      remoteUrl: z.string().url(),
      defaultBranch: z.string().default('main'),
      localPath: z.string().min(1),
      /** If true, clone immediately into localPath. */
      cloneNow: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.cloneNow) {
        await cloneService.clone({ remoteUrl: input.remoteUrl, localPath: input.localPath });
      }
      const branch = input.cloneNow
        ? await cloneService.getDefaultBranch(input.localPath)
        : input.defaultBranch;
      const [row] = ctx.db.insert(repos).values({
        name: input.name,
        remoteUrl: input.remoteUrl,
        defaultBranch: branch,
        localPath: input.localPath,
      }).returning().all();
      return row!;
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      defaultBranch: z.string().min(1).optional(),
      githubConnectionId: z.string().nullable().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const patch: Record<string, unknown> = {};
      if (input.defaultBranch !== undefined) patch.defaultBranch = input.defaultBranch;
      if (input.githubConnectionId !== undefined) patch.githubConnectionId = input.githubConnectionId;
      if (Object.keys(patch).length === 0) return { ok: true as const };
      ctx.db.update(repos).set(patch).where(eq(repos.id, input.id)).run();
      return { ok: true as const };
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(repos).where(eq(repos.id, input.id)).run();
      return { ok: true as const };
    }),
});