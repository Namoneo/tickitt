import { Octokit } from '@octokit/rest';
import type { TestResult, TicketDTO, FetchTicketsOptions, FetchTicketsResult, TicketSource } from './ticket-source.js';
import type { CodeHost, RemoteRepoDTO } from './code-host.js';
import { Keychain } from '../secrets/keychain.js';

export interface GitHubConnectionConfig {
  owner: string;
  token: string;
}

export class GitHubCodeHost implements CodeHost, TicketSource {
  private readonly octokit: Octokit;
  private readonly owner: string;

  constructor(config: GitHubConnectionConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
  }

  static async fromConnection(secretRef: string, configJson: Record<string, unknown>): Promise<GitHubCodeHost> {
    const token = await Keychain.get(secretRef);
    if (!token) throw new Error('GitHub token not found in keychain');
    return new GitHubCodeHost({
      owner: String(configJson.owner ?? ''),
      token,
    });
  }

  async test(): Promise<TestResult> {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return { ok: true, identity: { displayName: data.login, ...(data.email ? { email: data.email } : {}) } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async listRemoteRepos(): Promise<RemoteRepoDTO[]> {
    const repos = await this.octokit.paginate(this.octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
    });
    return repos.map((r) => ({
      remoteUrl: r.clone_url ?? `https://github.com/${r.full_name}.git`,
      owner: r.owner.login,
      name: r.name,
      defaultBranch: r.default_branch ?? 'main',
      description: r.description,
      private: r.private ?? false,
    }));
  }

  async cloneUrl(owner: string, name: string): Promise<string> {
    return `https://github.com/${owner}/${name}.git`;
  }

  async fetchTickets(opts: FetchTicketsOptions): Promise<FetchTicketsResult> {
    const q = opts.jql;
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: `repo:${this.owner}/${q} is:issue`,
      per_page: opts.pageSize ?? 100,
    });

    let newCursor: string | null = null;
    const tickets: TicketDTO[] = data.items.map((issue) => {
      const updated = issue.updated_at ? new Date(issue.updated_at) : new Date();
      const updatedIso = issue.updated_at ?? new Date().toISOString();
      if (!newCursor || updated > new Date(newCursor)) {
        newCursor = updatedIso;
      }
      return {
        externalId: String(issue.id),
        key: `${issue.number}`,
        title: issue.title,
        body: issue.body ?? null,
        status: issue.state,
        statusCategory: issue.state === 'open' ? 'todo' : 'done',
        assignee: issue.assignee?.login ?? null,
        url: issue.html_url,
        externalUpdatedAt: updated,
        raw: issue as unknown as Record<string, unknown>,
      };
    });

    return { tickets, newCursor };
  }
}