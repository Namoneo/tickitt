import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';

const KEY = z.string().min(1).max(100);

export const settingsStoreRouter = router({
  all: publicProcedure.query(({ ctx }) => ctx.settings.all()),
  get: publicProcedure
    .input(z.object({ key: KEY }))
    .query(({ ctx, input }) => ctx.settings.get(input.key, null)),
  set: publicProcedure
    .input(z.object({
      key: KEY,
      value: z.unknown(),
    }))
    .mutation(({ ctx, input }) => {
      switch (input.key) {
        case 'runs.maxConcurrent': {
          const v = z.number().int().min(1).max(20).parse(input.value);
          ctx.settings.set('runs.maxConcurrent', v);
          break;
        }
        default:
          throw new Error(`Unknown setting key: ${input.key}`);
      }
      return { ok: true as const };
    }),
});
