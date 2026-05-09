import type { Connection, Db } from '@tickitt/db';
import { eq } from 'drizzle-orm';
import { connections } from '@tickitt/db';
import { JiraCloudTicketSource } from '../connectors/jira-cloud.js';
import { GitHubCodeHost } from '../connectors/github.js';
import { LinearTicketSource } from '../connectors/linear/linear.adapter.js';
import type { TicketSource } from '../connectors/ticket-source.js';
import type { CodeHost } from '../connectors/code-host.js';

export class ConnectionService {
  private readonly cache = new Map<string, TicketSource | CodeHost>();

  constructor(private readonly db: Db) {}

  async getAdapter(conn: Connection): Promise<TicketSource | CodeHost> {
    const cached = this.cache.get(conn.id);
    if (cached) return cached;

    const adapter = await this.buildAdapter(conn);
    this.cache.set(conn.id, adapter);
    return adapter;
  }

  /** Get a CodeHost adapter (for GitHub connections). */
  async getCodeHost(connId: string): Promise<CodeHost> {
    const conn = this.requireConnection(connId);
    const adapter = await this.getAdapter(conn);
    if (!('createPullRequest' in adapter)) {
      throw new Error(`Connection ${connId} is not a valid CodeHost`);
    }
    return adapter as CodeHost;
  }

  /** Get a TicketSource adapter (for Jira connections). */
  async getTicketSource(connId: string): Promise<TicketSource> {
    const conn = this.requireConnection(connId);
    const adapter = await this.getAdapter(conn);
    if (!('addCommentLinkingPr' in adapter)) {
      throw new Error(`Connection ${connId} is not a valid TicketSource`);
    }
    return adapter as TicketSource;
  }

  evict(connectionId: string): void {
    this.cache.delete(connectionId);
  }

  invalidate(connectionId: string): void {
    this.cache.delete(connectionId);
  }

  private requireConnection(id: string): Connection {
    const [row] = this.db.select().from(connections).where(eq(connections.id, id)).all();
    if (!row) throw new Error(`Connection ${id} not found`);
    return row;
  }

  private async buildAdapter(conn: Connection): Promise<TicketSource | CodeHost> {
    if (conn.kind === 'jira') {
      return JiraCloudTicketSource.fromConnection(conn.secretRef, conn.configJson);
    }
    if (conn.kind === 'github') {
      return GitHubCodeHost.fromConnection(conn.secretRef, conn.configJson);
    }
    if (conn.kind === 'linear') {
      return LinearTicketSource.fromConnection(conn.secretRef, conn.configJson);
    }
    throw new Error(`Unknown connection kind: ${conn.kind}`);
  }
}
