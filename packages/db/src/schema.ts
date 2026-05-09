import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

const id = () => text('id').primaryKey().$defaultFn(() => createId());
const ts = (name: string) =>
  integer(name, { mode: 'timestamp_ms' });
const tsRequired = (name: string) =>
  integer(name, { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date());

export const repos = sqliteTable('repos', {
  id: id(),
  name: text('name').notNull(),
  remoteUrl: text('remote_url').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  localPath: text('local_path').notNull(),
  lastSyncedAt: ts('last_synced_at'),
  githubConnectionId: text('github_connection_id').references(() => connections.id, { onDelete: 'set null' }),
  createdAt: tsRequired('created_at'),
});

export const connections = sqliteTable('connections', {
  id: id(),
  kind: text('kind', { enum: ['jira', 'github'] }).notNull(),
  label: text('label').notNull(),
  configJson: text('config_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  secretRef: text('secret_ref').notNull(),
  status: text('status', { enum: ['active', 'error', 'disabled'] }).notNull().default('active'),
  lastError: text('last_error'),
  lastSyncedAt: ts('last_synced_at'),
  lastSyncCursor: text('last_sync_cursor'),
  syncIntervalMs: integer('sync_interval_ms').notNull().default(300_000),
  createdAt: tsRequired('created_at'),
});

export const tickets = sqliteTable(
  'tickets',
  {
    id: id(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    source: text('source', { enum: ['jira', 'linear'] }).notNull(),
    externalId: text('external_id').notNull(),
    key: text('key').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    status: text('status').notNull(),
    assignee: text('assignee'),
    url: text('url').notNull(),
    rawJson: text('raw_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
    fetchedAt: tsRequired('fetched_at'),
    externalUpdatedAt: ts('external_updated_at'),
  },
  (t) => ({
    uniqExternal: uniqueIndex('tickets_conn_external_uniq').on(t.connectionId, t.externalId),
    keyIdx: index('tickets_key_idx').on(t.key),
  }),
);

export const agents = sqliteTable('agents', {
  id: id(),
  kind: text('kind', { enum: ['claude-code', 'codex', 'gemini', 'opencode', 'cursor'] }).notNull(),
  name: text('name').notNull(),
  binaryPath: text('binary_path').notNull(),
  argsJson: text('args_json', { mode: 'json' }).notNull().default(sql`'[]'`).$type<string[]>(),
  envJson: text('env_json', { mode: 'json' }).notNull().default(sql`'{}'`).$type<Record<string, string>>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: tsRequired('created_at'),
});

export const runStates = [
  'queued',
  'preparing',
  'running',
  'awaiting_review',
  'pushing',
  'completed',
  'failed',
  'abandoned',
] as const;
export type RunState = (typeof runStates)[number];

export const runs = sqliteTable(
  'runs',
  {
    id: id(),
    ticketId: text('ticket_id').notNull().references(() => tickets.id, { onDelete: 'restrict' }),
    repoId: text('repo_id').notNull().references(() => repos.id, { onDelete: 'restrict' }),
    agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'restrict' }),
    worktreePath: text('worktree_path').notNull(),
    branchName: text('branch_name').notNull(),
    state: text('state', { enum: runStates }).notNull(),
    startedAt: ts('started_at'),
    finishedAt: ts('finished_at'),
    error: text('error'),
    prUrl: text('pr_url'),
    tokenCost: integer('token_cost'),
    approvalDecision: text('approval_decision', { enum: ['approved', 'changes_requested', 'discarded'] }),
    baseSha: text('base_sha'),
    sessionId: text('session_id'),
    iterationCount: integer('iteration_count').notNull().default(0),
    pushedAt: integer('pushed_at', { mode: 'timestamp_ms' }),
    createdAt: tsRequired('created_at'),
  },
  (t) => ({
    stateIdx: index('runs_state_idx').on(t.state),
    ticketIdx: index('runs_ticket_idx').on(t.ticketId),
  }),
);

export const runEvents = sqliteTable(
  'run_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
    ts: integer('ts', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    kind: text('kind', { enum: ['text', 'tool_use', 'tool_result', 'error', 'state_change', 'system', 'usage'] }).notNull(),
    payloadJson: text('payload_json', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
  },
  (t) => ({
    runIdx: index('run_events_run_idx').on(t.runId, t.ts),
  }),
);

export type Repo = typeof repos.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type RunEvent = typeof runEvents.$inferSelect;