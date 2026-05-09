import type { TestResult } from './ticket-source.js';

export interface RemoteRepoDTO {
  remoteUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  private: boolean;
}

export interface CreatePullRequestInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;        // branch name
  base: string;        // default branch
}

export interface PullRequestRef {
  number: number;
  url: string;
  htmlUrl: string;
}

export interface CodeHost {
  test(): Promise<TestResult>;
  listRemoteRepos(): Promise<RemoteRepoDTO[]>;
  cloneUrl(owner: string, name: string): Promise<string>;
  createPullRequest(input: CreatePullRequestInput): Promise<PullRequestRef>;
}