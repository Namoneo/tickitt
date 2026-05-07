import type { Connection } from '@tickitt/db';
import { JiraCloudTicketSource } from '../connectors/jira-cloud.js';
import { GitHubCodeHost } from '../connectors/github.js';
import type { TicketSource } from '../connectors/ticket-source.js';
import type { CodeHost } from '../connectors/code-host.js';

type Adapter = TicketSource | (TicketSource & CodeHost);

export class ConnectionService {
  private readonly cache = new Map<string, Adapter>();

  async getAdapter(conn: Connection): Promise<Adapter> {
    const cached = this.cache.get(conn.id);
    if (cached) return cached;

    const adapter = await this.buildAdapter(conn);
    this.cache.set(conn.id, adapter);
    return adapter;
  }

  evict(connectionId: string): void {
    this.cache.delete(connectionId);
  }

  private async buildAdapter(conn: Connection): Promise<Adapter> {
    if (conn.kind === 'jira') {
      return JiraCloudTicketSource.fromConnection(conn.secretRef, conn.configJson);
    }
    if (conn.kind === 'github') {
      return GitHubCodeHost.fromConnection(conn.secretRef, conn.configJson);
    }
    throw new Error(`Unknown connection kind: ${conn.kind}`);
  }
}