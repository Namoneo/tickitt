import type { LinearClient } from '@linear/sdk';
import type {
  TicketSource,
  TestResult,
  TicketDTO,
  FetchTicketsOptions,
  FetchTicketsResult,
} from '../ticket-source.js';
import { createLinearClient } from './linear.client.js';
import type { LinearConfig } from './linear.types.js';
import { DEFAULT_LINEAR_CONFIG } from './linear.types.js';
import { Keychain } from '../../secrets/keychain.js';

export class LinearTicketSource implements TicketSource {
  private readonly client: LinearClient;
  private readonly config: LinearConfig;

  static async fromConnection(secretRef: string, configJson: unknown): Promise<LinearTicketSource> {
    const apiKey = await Keychain.get(secretRef);
    if (!apiKey) throw new Error('Linear API key not found in keychain');
    const config = { ...DEFAULT_LINEAR_CONFIG, ...(configJson as Partial<LinearConfig> || {}) };
    return new LinearTicketSource(apiKey, config as LinearConfig);
  }

  constructor(apiKey: string, config: LinearConfig) {
    this.client = createLinearClient(apiKey);
    this.config = config;
  }

  async test(): Promise<TestResult> {
    try {
      const me = await this.client.viewer;
      return { ok: true, identity: { displayName: me.name, email: me.email ?? undefined } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async fetchTickets(opts: FetchTicketsOptions): Promise<FetchTicketsResult> {
    const filter: any = {};

    if (this.config.teamKey) {
      const teams = await this.client.teams({ filter: { key: { eq: this.config.teamKey } } });
      const teamId = teams.nodes[0]?.id;
      if (teamId) filter.team = { id: { eq: teamId } };
    }

    if (this.config.onlyAssignedToMe) {
      const me = await this.client.viewer;
      filter.assignee = { id: { eq: me.id } };
    }

    if (this.config.stateTypes?.length) {
      filter.state = { type: { in: this.config.stateTypes } };
    }

    if (opts.updatedSince) {
      filter.updatedAt = { gt: new Date(opts.updatedSince) };
    }

    const pageSize = Math.min(opts.pageSize ?? 50, 100);
    const maxPages = 5;
    const tickets: TicketDTO[] = [];
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const result = await this.client.issues({
        filter,
        first: pageSize,
        ...(cursor ? { after: cursor } : {}),
      });
      for (const issue of result.nodes) {
        tickets.push(this.toDto(issue as any));
      }
      cursor = result.pageInfo.hasNextPage ? (result.pageInfo.endCursor ?? undefined) : undefined;
      pageCount++;
    } while (cursor && pageCount < maxPages);

    return { tickets, newCursor: cursor ?? null };
  }

  async addCommentLinkingPr(issueKey: string, prUrl: string, _ticketTitle: string): Promise<void> {
    const issue = await this.findIssueByKey(issueKey);
    if (!issue) throw new Error(`Issue ${issueKey} not found`);
    await this.client.createComment({ issueId: issue.id, body: `PR opened: ${prUrl}` });
  }

  async transitionByName(issueKey: string, statusName: string): Promise<{ ok: boolean; available?: string[] }> {
    const issue = await this.findIssueByKey(issueKey);
    if (!issue) throw new Error(`Issue ${issueKey} not found`);

    const teamId = (issue as any).team?.id;
    if (!teamId) return { ok: false, available: [] };

    const team = await this.client.team(teamId);
    const states = await (team as any).states();
    const allStates: Array<{ id: string; name: string }> = states.nodes ?? [];

    const target = allStates.find((s) => s.name.toLowerCase() === statusName.toLowerCase());
    if (!target) {
      return { ok: false, available: allStates.map((s) => s.name) };
    }

    await this.client.updateIssue((issue as any).id, { stateId: target.id });
    return { ok: true };
  }

  private async findIssueByKey(key: string) {
    try {
      return await this.client.issue(key);
    } catch {
      return null;
    }
  }

  private toDto(issue: any): TicketDTO {
    return {
      externalId: issue.id,
      key: issue.identifier,
      title: issue.title,
      body: issue.description ?? null,
      status: issue.state?.name ?? 'unknown',
      statusCategory: this.mapStateCategory(issue.state?.type),
      assignee: issue.assignee?.name ?? null,
      url: issue.url,
      externalUpdatedAt: issue.updatedAt ? new Date(issue.updatedAt) : new Date(),
      raw: issue as Record<string, unknown>,
    };
  }

  private mapStateCategory(type?: string): 'todo' | 'in_progress' | 'done' | 'unknown' {
    switch (type) {
      case 'backlog':
      case 'triage':
      case 'unstarted':
        return 'todo';
      case 'started':
        return 'in_progress';
      case 'completed':
        return 'done';
      default:
        return 'unknown';
    }
  }
}
