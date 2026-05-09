/**
 * Linear connection config. Stored on connections.configJson.
 *
 * The filter is intentionally narrow — three knobs that cover ~all real workflows
 * without exposing the full GraphQL filter object to users.
 */
export interface LinearConfig {
  /** Optional team key (e.g. "ENG", "DESIGN"). When set, only issues from this team are synced. */
  teamKey?: string;
  /** State types to include. Default is ['unstarted', 'started']. */
  stateTypes: LinearStateType[];
  /** If true, only issues assigned to the API key's owner are synced. Default true. */
  onlyAssignedToMe: boolean;
  /** Optional state name (case-insensitive) to transition to when a PR opens. */
  transitionOnPrOpen?: string;
}

export type LinearStateType = 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';

export const LINEAR_STATE_TYPES: LinearStateType[] = [
  'triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled',
];

export const DEFAULT_LINEAR_CONFIG: LinearConfig = {
  stateTypes: ['unstarted', 'started'],
  onlyAssignedToMe: true,
};
