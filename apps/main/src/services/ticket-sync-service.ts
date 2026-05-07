import { eq, and } from 'drizzle-orm';
import type { Db, Connection, Ticket } from '@tickitt/db';
import { connections, tickets } from '@tickitt/db';
import type { ConnectionService } from './connection-service.js';

export interface SyncJob {
  connectionId: string;
  force?: boolean;
}

export class TicketSyncService {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly db: Db,
    private readonly connectionService: ConnectionService,
  ) {}

  startAll(): void {
    const conns = this.db.select().from(connections).all();
    for (const conn of conns) {
      if (conn.status === 'active') {
        this.start(conn);
      }
    }
  }

  start(conn: Connection): void {
    this.stop(conn.id);
    const interval = conn.syncIntervalMs ?? 300_000;
    const timer = setInterval(() => this.sync({ connectionId: conn.id }), interval);
    this.timers.set(conn.id, timer);
  }

  stop(connectionId: string): void {
    const timer = this.timers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(connectionId);
    }
  }

  async sync(job: SyncJob): Promise<{ inserted: number; updated: number }> {
    const [conn] = this.db.select().from(connections).where(eq(connections.id, job.connectionId)).all();
    if (!conn || conn.status !== 'active') return { inserted: 0, updated: 0 };

    const adapter = await this.connectionService.getAdapter(conn);
    const jql = conn.kind === 'jira'
      ? String(conn.configJson.jql ?? 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC')
      : String(conn.configJson.repo ?? '');

    const fetchOpts = { jql, pageSize: 100 };
    if (!job.force && conn.lastSyncCursor) {
      (fetchOpts as any).updatedSince = conn.lastSyncCursor;
    }
    const result = await adapter.fetchTickets(fetchOpts);

    let inserted = 0;
    let updated = 0;

    for (const t of result.tickets) {
      const existing = this.db
        .select()
        .from(tickets)
        .where(and(eq(tickets.connectionId, conn.id), eq(tickets.externalId, t.externalId)))
        .all();

      if (existing.length > 0) {
        this.db
          .update(tickets)
          .set({
            title: t.title,
            body: t.body,
            status: t.status,
            assignee: t.assignee,
            url: t.url,
            rawJson: t.raw,
            externalUpdatedAt: t.externalUpdatedAt,
            fetchedAt: new Date(),
          })
          .where(eq(tickets.id, existing[0]!.id))
          .run();
        updated++;
      } else {
        this.db.insert(tickets).values({
          connectionId: conn.id,
          source: conn.kind === 'jira' ? 'jira' : 'jira',
          externalId: t.externalId,
          key: t.key,
          title: t.title,
          body: t.body,
          status: t.status,
          assignee: t.assignee,
          url: t.url,
          rawJson: t.raw,
          fetchedAt: new Date(),
          externalUpdatedAt: t.externalUpdatedAt,
        }).run();
        inserted++;
      }
    }

    this.db
      .update(connections)
      .set({
        lastSyncedAt: new Date(),
        lastSyncCursor: result.newCursor ?? conn.lastSyncCursor,
        status: 'active',
        lastError: null,
      })
      .where(eq(connections.id, conn.id))
      .run();

    return { inserted, updated };
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}