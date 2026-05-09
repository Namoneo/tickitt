import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { connections } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';
import { Keychain } from '../../secrets/keychain.js';
import { ConnectionService } from '../../services/connection-service.js';
import type { TicketSource } from '../../connectors/ticket-source.js';

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

  updateGithub: publicProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(1).max(100).optional(),
      config: z.record(z.unknown()).optional(),
      pat: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
      if (!row || row.kind !== 'github') throw new Error('GitHub connection not found');
      const patch: Partial<typeof row> = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.config !== undefined) patch.configJson = input.config;
      if (Object.keys(patch).length > 0) {
        ctx.db.update(connections).set(patch).where(eq(connections.id, input.id)).run();
      }
      if (input.pat) {
        await Keychain.set(row.secretRef, input.pat);
      }
      ctx.connectionService.invalidate(row.id);
      return { ok: true as const };
    }),

  updateJira: publicProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(1).max(100).optional(),
      config: z.record(z.unknown()).optional(),
      apiToken: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
      if (!row || row.kind !== 'jira') throw new Error('Jira connection not found');
      const patch: Partial<typeof row> = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.config !== undefined) patch.configJson = input.config;
      if (Object.keys(patch).length > 0) {
        ctx.db.update(connections).set(patch).where(eq(connections.id, input.id)).run();
      }
      if (input.apiToken) {
        await Keychain.set(row.secretRef, input.apiToken);
      }
      ctx.connectionService.invalidate(row.id);
      return { ok: true as const };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
      if (!row) return { ok: false as const };
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
      const adapter = await ctx.connectionService.getAdapter(row) as TicketSource;
      return adapter.test();
    }),
});