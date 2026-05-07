import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { repos } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

export const reposRouter = router({
  list: publicProcedure.query(({ ctx }) => ctx.db.select().from(repos).all()),

  add: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      remoteUrl: z.string().url(),
      defaultBranch: z.string().default('main'),
      localPath: z.string().min(1),
    }))
    .mutation(({ ctx, input }) => {
      const [row] = ctx.db.insert(repos).values({
        name: input.name,
        remoteUrl: input.remoteUrl,
        defaultBranch: input.defaultBranch,
        localPath: input.localPath,
      }).returning().all();
      return row!;
    }),

  remove: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.delete(repos).where(eq(repos.id, input.id)).run();
      return { ok: true as const };
    }),
});