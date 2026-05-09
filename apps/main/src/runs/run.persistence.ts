import { eq, asc, desc, and, inArray } from 'drizzle-orm';
import type { Db, Run, RunEvent } from '@tickitt/db';
import { runs, runEvents } from '@tickitt/db';
import type { AgentEvent } from '../agents/agent.types.js';

export function createRunPersistence(db: Db) {
  return {
    insertRun(values: Omit<Run, 'createdAt'>): Run {
      const [row] = db.insert(runs).values({
        ...values,
        createdAt: new Date(),
      }).returning().all();
      if (!row) throw new Error('Failed to insert run');
      return row;
    },

    updateState(runId: string, state: Run['state'], error?: string | null): void {
      const update: Partial<Run> = { state };
      if (state === 'completed' || state === 'failed' || state === 'abandoned' || state === 'awaiting_review') {
        update.finishedAt = new Date();
      }
      if (error !== undefined) update.error = error ?? null;
      db.update(runs).set(update).where(eq(runs.id, runId)).run();
    },

    appendEvent(runId: string, event: AgentEvent): number {
      const [row] = db.insert(runEvents).values({
        runId,
        kind: event.type,
        payloadJson: event as Record<string, unknown>,
      }).returning().all();
      if (!row) throw new Error('Failed to insert event');
      return row.id;
    },

    getRun(runId: string): Run | null {
      const rows = db.select().from(runs).where(eq(runs.id, runId)).all();
      return rows[0] ?? null;
    },

    listRuns(opts?: { states?: string[] | undefined; ticketId?: string | undefined }): Run[] {
      let q = db.select().from(runs);
      const conditions = [];
      if (opts?.states?.length) conditions.push(inArray(runs.state, opts.states as any));
      if (opts?.ticketId) conditions.push(eq(runs.ticketId, opts.ticketId));
      if (conditions.length) {
        q = q.where(and(...conditions)) as typeof q;
      }
      return q.orderBy(desc(runs.createdAt)).all();
    },

    getEvents(runId: string, limit = 500): RunEvent[] {
      return db.select().from(runEvents)
        .where(eq(runEvents.runId, runId))
        .orderBy(asc(runEvents.ts))
        .limit(limit)
        .all();
    },

    recoverOnBoot(): number {
      const affected = db.update(runs)
        .set({ state: 'failed', error: 'interrupted by app restart', finishedAt: new Date() })
        .where(inArray(runs.state, ['queued', 'preparing', 'running'] as any))
        .run();
      return (affected as any).changes ?? 0;
    },
  };
}

export type RunPersistence = ReturnType<typeof createRunPersistence>;
