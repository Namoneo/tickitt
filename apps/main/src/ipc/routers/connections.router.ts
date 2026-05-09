import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { connections } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';
import { Keychain } from '../../secrets/keychain.js';
import { ConnectionService } from '../../services/connection-service.js';

const CreateConnectionInput = z.object({
  kind: z.enum(['jira', 'github']),
  label: z.string().min(1).max(100),
  config: z.record(z.unknown()),
  secret: z.string().min(1),
});

export const connectionsRouter = router({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(connections).all();
  }),

  create: publicProcedure
    .input(CreateConnectionInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db
        .insert(connections)
        .values({
          kind: input.kind,
          label: input.label,
          configJson: input.config,
          secretRef: `connection:${crypto.randomUUID()}`,
          status: 'active',
        })
        .returning()
        .all();
      if (!row) throw new Error('Insert failed');
      await Keychain.set(row.secretRef, input.secret);
      return row;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
      if (!row) return { ok: false as const };
      // Delete from DB first so the row is gone even if keychain removal fails.
      ctx.db.delete(connections).where(eq(connections.id, input.id)).run();
      ctx.connectionService.evict(row.id);
      await Keychain.delete(row.secretRef);
      return { ok: true as const };
    }),

  test: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
      if (!row) return { ok: false as const, error: 'Connection not found' };
      const adapter = await ctx.connectionService.getAdapter(row);
      return adapter.test();
    }),
});