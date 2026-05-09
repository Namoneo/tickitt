import type { AgentEvent } from '../agents/agent.types.js';

export type RunId = string;

export interface RunJob {
  runId: RunId;
  fn: () => Promise<void>;
}

export interface RunEventPayload {
  kind: 'event' | 'state' | 'queue';
  runId: string;
  event?: {
    type: string;
    payload: unknown;
  };
  eventDbId?: number;
  state?: string;
  error?: string | null | undefined;
  active?: number;
  waiting?: number;
}

export interface QueueStats {
  active: number;
  waiting: number;
}

export type PromptContext = {
  ticketKey: string;
  ticketTitle: string;
  ticketBody: string | null;
  repoName: string;
};

export interface WorktreeInfo {
  path: string;
  branchName: string;
  baseBranch: string;
  baseSha: string;
  repoId: string;
}
