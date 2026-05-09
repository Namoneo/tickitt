import { Octokit } from '@octokit/rest';
import type { TestResult, TicketDTO, FetchTicketsOptions, FetchTicketsResult, TicketSource } from './ticket-source.js';
import type { CodeHost, RemoteRepoDTO, CreatePullRequestInput, PullRequestRef } from './code-host.js';
import { Keychain } from '../secrets/keychain.js';

export interface GitHubConnectionConfig {
  owner: string;
  token: string;
}

export class GitHubCodeHost implements CodeHost {
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

  async createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef> {
    const { data } = await this.octokit.rest.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
    });

    return {
      number: data.number,
      url: data.url,
      htmlUrl: data.html_url,
    };
  }
}