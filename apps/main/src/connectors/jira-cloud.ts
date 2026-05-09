import type { TestResult, TicketDTO, FetchTicketsOptions, FetchTicketsResult, TicketSource } from '../connectors/ticket-source.js';
import { Keychain } from '../secrets/keychain.js';
import { adfPrComment } from './jira/adf.js';

export interface JiraConnectionConfig {
  baseUrl: string;
  email: string;
  /** Encrypted API token. */
  token: string;
  transitionOnPrOpen?: string;
}

function toBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

export class JiraCloudTicketSource implements TicketSource {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly token: string;

  constructor(config: JiraConnectionConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.email = config.email;
    this.token = config.token;
  }

  static async fromConnection(secretRef: string, configJson: Record<string, unknown>): Promise<JiraCloudTicketSource> {
    const token = await Keychain.get(secretRef);
    if (!token) throw new Error('Jira API token not found in keychain');
    return new JiraCloudTicketSource({
      baseUrl: String(configJson.baseUrl ?? ''),
      email: String(configJson.email ?? ''),
      token,
    });
  }

  private authHeader(): string {
    return 'Basic ' + toBase64(`${this.email}:${this.token}`);
  }

  private async api(path: string, opts: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}/rest/api/3${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: this.authHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira API ${path} failed (${res.status}): ${body.slice(0, 500)}`);
    }
    return res.json();
  }

  async test(): Promise<TestResult> {
    try {
      const data = await this.api('/myself') as { displayName: string; emailAddress?: string };
      return { ok: true, identity: { displayName: data.displayName, ...(data.emailAddress ? { email: data.emailAddress } : {}) } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTickets(opts: FetchTicketsOptions): Promise<FetchTicketsResult> {
    const jql = opts.updatedSince
      ? `${opts.jql} AND updated >= "${opts.updatedSince}"`
      : opts.jql;

    const body = await this.api('/search/jql', {
      method: 'POST',
      body: JSON.stringify({
        jql,
        fields: ['summary', 'description', 'status', 'assignee', 'updated', 'issuetype'],
        maxResults: opts.pageSize ?? 100,
      }),
    }) as {
      issues: Array<{
        id: string;
        key: string;
        fields: {
          summary: string;
          description?: unknown;
          status?: { name: string; statusCategory?: { key: string } };
          assignee?: { displayName: string } | null;
          updated: string;
        };
        self: string;
      }>;
      nextPageToken?: string;
    };

    let newCursor: string | null = null;
    const tickets: TicketDTO[] = body.issues.map((issue) => {
      const updated = new Date(issue.fields.updated);
      if (!newCursor || updated > new Date(newCursor)) {
        newCursor = issue.fields.updated;
      }
      return {
        externalId: issue.id,
        key: issue.key,
        title: issue.fields.summary,
        body: issue.fields.description ? JSON.stringify(issue.fields.description) : null,
        status: issue.fields.status?.name ?? 'Unknown',
        statusCategory: mapStatusCategory(issue.fields.status?.statusCategory?.key),
        assignee: issue.fields.assignee?.displayName ?? null,
        url: `${this.baseUrl}/browse/${issue.key}`,
        externalUpdatedAt: updated,
        raw: issue as unknown as Record<string, unknown>,
      };
    });

    return { tickets, newCursor };
  }

  async addCommentLinkingPr(issueKey: string, prUrl: string, ticketTitle: string): Promise<void> {
    await this.api(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body: adfPrComment(prUrl, ticketTitle) }),
    });
  }

  async transitionByName(issueKey: string, statusName: string): Promise<{ ok: boolean; available?: string[] }> {
    const data = await this.api(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`) as {
      transitions: Array<{ id: string; name: string }>;
    };
    const target = data.transitions.find((t) => t.name.toLowerCase() === statusName.toLowerCase());
    if (!target) {
      return { ok: false, available: data.transitions.map((t) => t.name) };
    }
    await this.api(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: target.id } }),
    });
    return { ok: true };
  }
}

function mapStatusCategory(key?: string): 'todo' | 'in_progress' | 'done' | 'unknown' {
  if (!key) return 'unknown';
  if (key === 'new' || key === 'indeterminate') return 'todo';
  if (key === 'done') return 'done';
  if (key === 'in_progress') return 'in_progress';
  return 'unknown';
}
