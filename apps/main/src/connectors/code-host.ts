import type { TestResult } from './ticket-source.js';

export interface RemoteRepoDTO {
  remoteUrl: string;
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  private: boolean;
}

export interface CodeHost {
  test(): Promise<TestResult>;
  listRemoteRepos(): Promise<RemoteRepoDTO[]>;
  cloneUrl(owner: string, name: string): Promise<string>;
}