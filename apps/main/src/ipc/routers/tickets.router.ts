import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { tickets } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

export const ticketsRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(tickets).all();
  }),

  syncNow: publicProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.ticketSync.sync({ connectionId: input.connectionId, force: true });
      return result;
    }),
});