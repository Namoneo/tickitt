# Session: 2026-05-07 20:20:21 UTC

- **Session Key**: agent:main:telegram:direct:1028030
- **Session ID**: 0e813949-728d-4d19-b449-1e3d731797e8
- **Source**: telegram

## Conversation Summary

user: A new session was started via /new or /reset. If runtime-provided startup context is included for this first turn, use it before responding to the user. Then greet the user in your configured persona, if one is provided. Be yourself - use your defined voice, mannerisms, and mood. Keep it to 1-3 sentences and ask what they want to do. If the runtime model differs from default_model in the system prompt, mention the default model. Do not mention internal steps, files, tools, or reasoning.
Current time: Thursday, May 7th, 2026 - 10:15 PM (Europe/Amsterdam) / 2026-05-07 20:15 UTC
assistant: Hey. I just came online. Who am I? Who are you?

What do you want to do tonight?
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "4546",
  "sender_id": "1028030",
  "sender": "Sh.S",
  "timestamp": "Thu 2026-05-07 22:18 GMT+2"
}
```

Sender (untrusted metadata):
```json
{
  "label": "Sh.S (1028030)",
  "id": "1028030",
  "name": "Sh.S",
  "username": "uzbekmaster"
}
```

Now I want to start new project and you are experienced software engineer/developer
assistant: I'm Zyph — software engineer, problem-solver, occasional chaos gremlin. 🦊

Good to meet you, Sh.S. What kind of project are we building?
user: Conversation info (untrusted metadata):
```json
{
  "message_id": "4548",
  "sender_id": "1028030",
  "sender": "Sh.S",
  "timestamp": "Thu 2026-05-07 22:19 GMT+2"
}
```

Sender (untrusted metadata):
```json
{
  "label": "Sh.S (1028030)",
  "id": "1028030",
  "name": "Sh.S",
  "username": "uzbekmaster"
}
```

If I send you md file, can you read it and follow
assistant: Yes, absolutely. Send the .md file and I'll read it, understand the requirements, and follow whatever instructions or specs it contains.

Drop it here whenever you're ready.
user: [media attached: /Users/sherzodsanakulov/.openclaw/media/inbound/tickitt-phase-0-spec---3a83d9db-cb7a-4584-bbc2-61f422c2775e.md (text/markdown) | /Users/sherzodsanakulov/.openclaw/media/inbound/tickitt-phase-0-spec---3a83d9db-cb7a-4584-bbc2-61f422c2775e.md]
To send an image back, prefer the message tool (media/path/filePath). If you must inline, use MEDIA:https://example.com/image.jpg (spaces ok, quote if needed) or a safe relative path like MEDIA:./image.jpg. Avoid absolute paths (MEDIA:/...) and ~ paths - they are blocked for security. Keep caption in the text body.
Conversation info (untrusted metadata):
```json
{
  "message_id": "4550",
  "sender_id": "1028030",
  "sender": "Sh.S",
  "timestamp": "Thu 2026-05-07 22:20 GMT+2"
}
```

Sender (untrusted metadata):
```json
{
  "label": "Sh.S (1028030)",
  "id": "1028030",
  "name": "Sh.S",
  "username": "uzbekmaster"
}
```

[Telegram Sh.S (@uzbekmaster) id:1028030 +1m Thu 2026-05-07 22:20 GMT+2] <media:document>

<file name="tickitt-phase-0-spec---3a83d9db-cb7a-4584-bbc2-61f422c2775e.md" mime="text/markdown">

<<<EXTERNAL_UNTRUSTED_CONTENT id="2ea81b3873e26db7">>>
Source: External
---
# Tickitt — Phase 0 Spec

**Goal:** a working Electron + Angular 19 skeleton with typed IPC, SQLite via drizzle, keychain secrets, and a packaged macOS build. No external integrations yet — that's Phase 1.

**Audience:** Claw. Execute phase-gated. Do not skip steps. Do not introduce dependencies not listed here without flagging first.

---

## 0. Decisions (locked)

| Decision | Value |
|---|---|
| App name | Tickitt |
| Bundle ID | `com.sherzod.tickitt` |
| Keychain service | `com.sherzod.tickitt` |
| Workspace path | `~/Library/Application Support/Tickitt/workspace` |
| Shell | Electron (TypeScript end-to-end) |
| Renderer | Angular 19, standalone, signals-only, OnPush, no RxJS |
| Main process | Plain Node + manual DI (no NestJS) |
| DB | SQLite via `better-sqlite3` + `drizzle-orm` |
| IPC | `electron-trpc` (tRPC over `ipcMain`) |
| Secrets | `keytar` → macOS Keychain |
| Package manager | pnpm |
| Node version | 22 (LTS) |
| First ticket source | Jira Cloud |
| First agent | Claude Code (Phase 3) |
| Concurrency | parallel runs, `maxConcurrentRuns` configurable, default 3 |
| Approval flow | diff review in-app → Approve / Request Changes / Discard |
| Commit policy | preserve agent commits |
| Re-run with feedback | same branch (continuation) |

---

## 1. Repo layout

```
tickitt/
├── .editorconfig
├── .gitignore
├── .npmrc
├── .nvmrc
├── electron-builder.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
├── apps/
│ ├── main/
│ │ ├── package.json
│ │ ├── tsconfig.json
│ │ ├── tsup.config.ts
│ │ └── src/
│ │ ├── index.ts
│ │ ├── preload.ts
│ │ ├── env.ts
│ │ ├── paths.ts
│ │ ├── windows/
│ │ │ └── main-window.ts
│ │ ├── db/
│ │ │ ├── client.ts
│ │ │ └── migrate.ts
│ │ ├── secrets/
│ │ │ └── keychain.ts
│ │ └── ipc/
│ │ ├── context.ts
│ │ ├── trpc.ts
│ │ ├── router.ts
│ │ └── routers/
│ │ ├── system.router.ts
│ │ ├── connections.router.ts
│ │ ├── agents.router.ts
│ │ └── repos.router.ts
│ └── renderer/
│ ├── angular.json
│ ├── package.json
│ ├── tsconfig.json
│ ├── tsconfig.app.json
│ └── src/
│ ├── index.html
│ ├── main.ts
│ ├── styles.css
│ └── app/
│ ├── app.component.ts
│ ├── app.config.ts
│ ├── app.routes.ts
│ ├── core/
│ │ ├── ipc/
│ │ │ ├── trpc.client.ts
│ │ │ └── trpc.token.ts
│ │ └── layout/
│ │ └── shell.component.ts
│ ├── pages/
│ │ ├── dashboard/
│ │ │ └── dashboard.page.ts
│ │ ├── runs/
│ │ │ └── runs.page.ts
│ │ └── settings/
│ │ ├── settings.page.ts
│ │ ├── connections-section.component.ts
│ │ ├── agents-section.component.ts
│ │ ├── repos-section.component.ts
│ │ └── diagnostics-section.component.ts
│ └── shared/
│ └── ui/
│ └── (placeholder)
├── packages/
│ ├── db/
│ │ ├── package.json
│ │ ├── tsconfig.json
│ │ ├── drizzle.config.ts
│ │ └── src/
│ │ ├── index.ts
│ │ ├── schema.ts
│ │ └── migrations/ (generated by drizzle-kit)
│ ├── ipc-contract/
│ │ ├── package.json
│ │ ├── tsconfig.json
│ │ └── src/
│ │ └── index.ts
│ └── shared-types/
│ ├── package.json
│ ├── tsconfig.json
│ └── src/
│ └── index.ts
└── tools/
 └── scripts/
 └── (empty for now)
```

---

## 2. Root configs

### `package.json`

```json
{
 "name": "tickitt",
 "version": "0.0.1",
 "private": true,
 "packageManager": "pnpm@9.12.0",
 "engines": {
 "node": ">=22.0.0"
 },
 "scripts": {
 "dev": "concurrently -n renderer,main -c blue,green \"pnpm -F @tickitt/renderer dev\" \"pnpm -F @tickitt/main dev\"",
 "build": "pnpm -r --filter \"./packages/**\" build && pnpm -F @tickitt/renderer build && pnpm -F @tickitt/main build",
 "package": "pnpm build && electron-builder --mac",
 "package:dir": "pnpm build && electron-builder --mac --dir",
 "db:generate": "pnpm -F @tickitt/db generate",
 "db:migrate": "pnpm -F @tickitt/db migrate",
 "lint": "pnpm -r lint",
 "typecheck": "pnpm -r typecheck",
 "clean": "pnpm -r exec rm -rf dist .angular node_modules/.cache && rm -rf node_modules"
 },
 "devDependencies": {
 "concurrently": "^9.0.1",
 "electron": "^33.0.0",
 "electron-builder": "^25.1.8",
 "typescript": "~5.6.2"
 }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
 - "apps/*"
 - "packages/*"
```

### `.npmrc`

```
shamefully-hoist=false
strict-peer-dependencies=false
node-linker=isolated
public-hoist-pattern[]=*types*
```

### `.nvmrc`

```
22
```

### `tsconfig.base.json`

```json
{
 "compilerOptions": {
 "target": "ES2022",
 "module": "ESNext",
 "moduleResolution": "Bundler",
 "lib": ["ES2022", "DOM"],
 "strict": true,
 "noUncheckedIndexedAccess": true,
 "noImplicitOverride": true,
 "noFallthroughCasesInSwitch": true,
 "exactOptionalPropertyTypes": true,
 "esModuleInterop": true,
 "skipLibCheck": true,
 "resolveJsonModule": true,
 "isolatedModules": true,
 "forceConsistentCasingInFileNames": true,
 "experimentalDecorators": true,
 "useDefineForClassFields": false,
 "paths": {
 "@tickitt/db": ["./packages/db/src/index.ts"],
 "@tickitt/db/*": ["./packages/db/src/*"],
 "@tickitt/ipc-contract": ["./packages/ipc-contract/src/index.ts"],
 "@tickitt/shared-types": ["./packages/shared-types/src/index.ts"]
 }
 }
}
```

### `.gitignore`

```
node_modules/
dist/
.angular/
out/
release/
*.log
.DS_Store
.env
.env.local
.env.*.local
*.tsbuildinfo
coverage/
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
tickitt.db
tickitt.db-journal
tickitt.db-wal
tickitt.db-shm
```

### `electron-builder.yml`

```yaml
appId: com.sherzod.tickitt
productName: Tickitt
directories:
 output: release
 buildResources: build
files:
 - apps/main/dist/**/*
 - apps/renderer/dist/**/*
 - packages/db/src/migrations/**/*
 - package.json
 - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
 - "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
 - "!**/*.{md,markdown}"
asarUnpack:
 - "**/node_modules/better-sqlite3/**/*"
 - "**/node_modules/keytar/**/*"
 - "**/node_modules/node-pty/**/*"
mac:
 category: public.app-category.developer-tools
 target:
 - target: dmg
 arch: [arm64, x64]
 hardenedRuntime: true
 gatekeeperAssess: false
 entitlements: build/entitlements.mac.plist
 entitlementsInherit: build/entitlements.mac.plist
 notarize: false # enable when Apple Developer creds wired up
dmg:
 sign: false
```

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
 <key>com.apple.security.cs.allow-jit</key>
 <true/>
 <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
 <true/>
 <key>com.apple.security.cs.disable-library-validation</key>
 <true/>
 <key>com.apple.security.cs.allow-dyld-environment-variables</key>
 <true/>
</dict>
</plist>
```

---

## 3. `packages/db`

The schema and migration tooling live here so they can be imported by the main process and operated on by `drizzle-kit` independently.

### `packages/db/package.json`

```json
{
 "name": "@tickitt/db",
 "version": "0.0.1",
 "private": true,
 "type": "module",
 "main": "./src/index.ts",
 "types": "./src/index.ts",
 "scripts": {
 "generate": "drizzle-kit generate",
 "migrate": "tsx ./src/migrate.ts",
 "studio": "drizzle-kit studio",
 "typecheck": "tsc --noEmit"
 },
 "dependencies": {
 "@paralleldrive/cuid2": "^2.2.2",
 "better-sqlite3": "^11.3.0",
 "drizzle-orm": "^0.36.0"
 },
 "devDependencies": {
 "@types/better-sqlite3": "^7.6.11",
 "@types/node": "^22.7.5",
 "drizzle-kit": "^0.28.0",
 "tsx": "^4.19.1",
 "typescript": "~5.6.2"
 }
}
```

### `packages/db/tsconfig.json`

```json
{
 "extends": "../../tsconfig.base.json",
 "compilerOptions": {
 "outDir": "dist",
 "rootDir": "src",
 "declaration": true
 },
 "include": ["src/**/*"]
}
```

### `packages/db/drizzle.config.ts`

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
 schema: './src/schema.ts',
 out: './src/migrations',
 dialect: 'sqlite',
 // dbCredentials are not used at generate time; we only run migrations programmatically.
 verbose: true,
 strict: true,
});
```

### `packages/db/src/schema.ts`

```ts
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
 kind: text('kind', { enum: ['text', 'tool_use', 'tool_result', 'error', 'state_change', 'system'] }).notNull(),
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
```

### `packages/db/src/index.ts`

```ts
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export * from './schema.js';
export type Db = BetterSQLite3Database<typeof schema>;

export interface CreateDbOptions {
 /** Absolute path to the sqlite file. */
 path: string;
}

export function createDb(opts: CreateDbOptions): { db: Db; close: () => void } {
 const sqlite = new Database(opts.path);
 sqlite.pragma('journal_mode = WAL');
 sqlite.pragma('foreign_keys = ON');
 const db = drizzle(sqlite, { schema });
 return {
 db,
 close: () => sqlite.close(),
 };
}

export function migrationsDir(): string {
 // Resolve relative to this file. In dev: src/migrations. In packaged app: same relative path.
 const here = path.dirname(fileURLToPath(import.meta.url));
 return path.join(here, 'migrations');
}

export async function runMigrations(db: Db): Promise<void> {
 drizzleMigrate(db, { migrationsFolder: migrationsDir() });
}
```

### `packages/db/src/migrate.ts`

```ts
import { createDb, runMigrations } from './index.js';
import path from 'node:path';

const target = process.env['TICKITT_DB_PATH'] ?? path.resolve(process.cwd(), 'tickitt.db');
const { db, close } = createDb({ path: target });
await runMigrations(db);
close();
console.log(`Migrated database at ${target}`);
```

After scaffolding, run `pnpm -F @tickitt/db generate` once to produce the initial migration files.

---

## 4. `packages/shared-types`

Cross-package domain types not tied to drizzle (UI-friendly DTOs, run events, etc.).

### `packages/shared-types/package.json`

```json
{
 "name": "@tickitt/shared-types",
 "version": "0.0.1",
 "private": true,
 "type": "module",
 "main": "./src/index.ts",
 "types": "./src/index.ts",
 "scripts": {
 "typecheck": "tsc --noEmit"
 },
 "devDependencies": {
 "typescript": "~5.6.2"
 }
}
```

### `packages/shared-types/src/index.ts`

```ts
export interface AppInfo {
 name: 'Tickitt';
 version: string;
 electron: string;
 node: string;
 chrome: string;
 platform: NodeJS.Platform;
 arch: string;
 userDataPath: string;
 workspacePath: string;
 dbPath: string;
}

export interface KeychainProbeResult {
 ok: boolean;
 error?: string;
}
```

---

## 5. `packages/ipc-contract`

Re-exports the tRPC router type for the renderer to consume. Importantly: only types — no runtime.

### `packages/ipc-contract/package.json`

```json
{
 "name": "@tickitt/ipc-contract",
 "version": "0.0.1",
 "private": true,
 "type": "module",
 "main": "./src/index.ts",
 "types": "./src/index.ts",
 "scripts": {
 "typecheck": "tsc --noEmit"
 },
 "dependencies": {
 "@trpc/server": "^11.0.0-rc.553"
 },
 "devDependencies": {
 "typescript": "~5.6.2"
 }
}
```

### `packages/ipc-contract/src/index.ts`

```ts
// Re-exported from main process. The main process must export `AppRouter` from
// `apps/main/src/ipc/router.ts`. We import via a path-mapped reference at
// type-check time only; at runtime the renderer never imports from main.

// NOTE: the actual `export type { AppRouter }` line is added once the main
// process router is wired (Section 6). Until then this file is intentionally
// empty so renderer typecheck passes.

export type Placeholder = unknown;
```

After Section 6 is in place, replace the body with:

```ts
export type { AppRouter } from '../../../apps/main/src/ipc/router.js';
```

Add to `packages/ipc-contract/tsconfig.json`:

```json
{
 "extends": "../../tsconfig.base.json",
 "compilerOptions": {
 "outDir": "dist",
 "rootDir": "src",
 "declaration": true,
 "composite": true
 },
 "include": ["src/**/*"]
}
```

---

## 6. `apps/main`

### `apps/main/package.json`

```json
{
 "name": "@tickitt/main",
 "version": "0.0.1",
 "private": true,
 "type": "module",
 "main": "./dist/index.cjs",
 "scripts": {
 "dev": "tsup --watch --onSuccess \"electron ./dist/index.cjs\"",
 "build": "tsup",
 "typecheck": "tsc --noEmit",
 "lint": "echo 'add eslint later'"
 },
 "dependencies": {
 "@tickitt/db": "workspace:*",
 "@tickitt/shared-types": "workspace:*",
 "@trpc/server": "^11.0.0-rc.553",
 "electron-trpc": "^0.7.0",
 "keytar": "^7.9.0",
 "superjson": "^2.2.1",
 "zod": "^3.23.8"
 },
 "devDependencies": {
 "@types/node": "^22.7.5",
 "electron": "^33.0.0",
 "tsup": "^8.3.0",
 "typescript": "~5.6.2"
 }
}
```

### `apps/main/tsconfig.json`

```json
{
 "extends": "../../tsconfig.base.json",
 "compilerOptions": {
 "outDir": "dist",
 "rootDir": "src",
 "module": "ESNext",
 "moduleResolution": "Bundler",
 "types": ["node"]
 },
 "include": ["src/**/*"]
}
```

### `apps/main/tsup.config.ts`

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
 entry: {
 index: 'src/index.ts',
 preload: 'src/preload.ts',
 },
 outDir: 'dist',
 format: ['cjs'], // electron loads CJS reliably
 target: 'node20',
 platform: 'node',
 splitting: false,
 sourcemap: true,
 clean: true,
 minify: false,
 external: ['electron', 'better-sqlite3', 'keytar', 'node-pty'],
 noExternal: [/^@tickitt\//, 'drizzle-orm', '@trpc/server', 'electron-trpc', 'superjson', 'zod'],
});
```

### `apps/main/src/paths.ts`

```ts
import { app } from 'electron';
import path from 'node:path';

export interface AppPaths {
 userData: string;
 workspace: string;
 dbFile: string;
 logsDir: string;
}

export function resolveAppPaths(): AppPaths {
 const userData = app.getPath('userData');
 return {
 userData,
 workspace: path.join(userData, 'workspace'),
 dbFile: path.join(userData, 'tickitt.db'),
 logsDir: path.join(userData, 'logs'),
 };
}
```

### `apps/main/src/env.ts`

```ts
export const isDev = !!process.env['ELECTRON_RENDERER_URL'] || process.env['NODE_ENV'] === 'development';
export const rendererUrl = process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:4200';
```

### `apps/main/src/secrets/keychain.ts`

```ts
import keytar from 'keytar';

const SERVICE = 'com.sherzod.tickitt';

export const Keychain = {
 async set(account: string, secret: string): Promise<void> {
 await keytar.setPassword(SERVICE, account, secret);
 },
 async get(account: string): Promise<string | null> {
 return keytar.getPassword(SERVICE, account);
 },
 async delete(account: string): Promise<boolean> {
 return keytar.deletePassword(SERVICE, account);
 },
 async probe(): Promise<{ ok: boolean; error?: string }> {
 const probeAccount = '__tickitt_probe__';
 const probeValue = `probe-${Date.now()}`;
 try {
 await keytar.setPassword(SERVICE, probeAccount, probeValue);
 const got = await keytar.getPassword(SERVICE, probeAccount);
 await keytar.deletePassword(SERVICE, probeAccount);
 return { ok: got === probeValue };
 } catch (err) {
 return { ok: false, error: err instanceof Error ? err.message : String(err) };
 }
 },
};
```

### `apps/main/src/db/client.ts`

```ts
import fs from 'node:fs';
import path from 'node:path';
import { createDb, runMigrations, type Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';

let dbHandle: { db: Db; close: () => void } | null = null;

export async function initDatabase(paths: AppPaths): Promise<Db> {
 fs.mkdirSync(path.dirname(paths.dbFile), { recursive: true });
 fs.mkdirSync(paths.workspace, { recursive: true });
 fs.mkdirSync(paths.logsDir, { recursive: true });
 dbHandle = createDb({ path: paths.dbFile });
 await runMigrations(dbHandle.db);
 return dbHandle.db;
}

export function getDb(): Db {
 if (!dbHandle) throw new Error('DB not initialised');
 return dbHandle.db;
}

export function closeDatabase(): void {
 dbHandle?.close();
 dbHandle = null;
}
```

### `apps/main/src/ipc/context.ts`

```ts
import type { Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';

export interface IpcContext {
 db: Db;
 paths: AppPaths;
}

export type CreateContext = () => IpcContext;
```

### `apps/main/src/ipc/trpc.ts`

```ts
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { IpcContext } from './context.js';

const t = initTRPC.context<IpcContext>().create({
 transformer: superjson,
 errorFormatter: ({ shape }) => shape,
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

### `apps/main/src/ipc/routers/system.router.ts`

```ts
import { app } from 'electron';
import os from 'node:os';
import { router, publicProcedure } from '../trpc.js';
import { Keychain } from '../../secrets/keychain.js';
import type { AppInfo, KeychainProbeResult } from '@tickitt/shared-types';

export const systemRouter = router({
 ping: publicProcedure.query(() => 'pong' as const),

 appInfo: publicProcedure.query(({ ctx }): AppInfo => ({
 name: 'Tickitt',
 version: app.getVersion(),
 electron: process.versions['electron'] ?? 'unknown',
 node: process.versions.node,
 chrome: process.versions['chrome'] ?? 'unknown',
 platform: process.platform,
 arch: os.arch(),
 userDataPath: ctx.paths.userData,
 workspacePath: ctx.paths.workspace,
 dbPath: ctx.paths.dbFile,
 })),

 keychainProbe: publicProcedure.mutation(async (): Promise<KeychainProbeResult> => {
 return Keychain.probe();
 }),
});
```

### `apps/main/src/ipc/routers/connections.router.ts`

Phase 0: list/create/delete only. No external API calls — `test` returns `{ ok: false, error: 'not implemented' }` for now.

```ts
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { connections } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';
import { Keychain } from '../../secrets/keychain.js';

const CreateConnectionInput = z.object({
 kind: z.enum(['jira', 'github']),
 label: z.string().min(1).max(100),
 config: z.record(z.unknown()),
 secret: z.string().min(1),
});

export const connectionsRouter = router({
 list: publicProcedure.query(({ ctx }) => {
 return ctx.db.select().from(connections).all();
 }),

 create: publicProcedure
 .input(CreateConnectionInput)
 .mutation(async ({ ctx, input }) => {
 const [row] = ctx.db
 .insert(connections)
 .values({
 kind: input.kind,
 label: input.label,
 configJson: input.config,
 secretRef: `connection:${crypto.randomUUID()}`,
 status: 'active',
 })
 .returning()
 .all();
 if (!row) throw new Error('Insert failed');
 await Keychain.set(row.secretRef, input.secret);
 return row;
 }),

 delete: publicProcedure
 .input(z.object({ id: z.string() }))
 .mutation(async ({ ctx, input }) => {
 const [row] = ctx.db.select().from(connections).where(eq(connections.id, input.id)).all();
 if (!row) return { ok: false as const };
 await Keychain.delete(row.secretRef);
 ctx.db.delete(connections).where(eq(connections.id, input.id)).run();
 return { ok: true as const };
 }),

 test: publicProcedure
 .input(z.object({ id: z.string() }))
 .mutation(() => {
 // wired in Phase 1
 return { ok: false as const, error: 'not implemented (Phase 1)' };
 }),
});
```

### `apps/main/src/ipc/routers/agents.router.ts`

```ts
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { agents } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

const AgentKind = z.enum(['claude-code', 'codex', 'gemini', 'opencode', 'cursor']);

export const agentsRouter = router({
 list: publicProcedure.query(({ ctx }) => ctx.db.select().from(agents).all()),

 create: publicProcedure
 .input(z.object({
 kind: AgentKind,
 name: z.string().min(1).max(80),
 binaryPath: z.string().min(1),
 args: z.array(z.string()).default([]),
 env: z.record(z.string()).default({}),
 }))
 .mutation(({ ctx, input }) => {
 const [row] = ctx.db.insert(agents).values({
 kind: input.kind,
 name: input.name,
 binaryPath: input.binaryPath,
 argsJson: input.args,
 envJson: input.env,
 enabled: true,
 }).returning().all();
 return row!;
 }),

 setEnabled: publicProcedure
 .input(z.object({ id: z.string(), enabled: z.boolean() }))
 .mutation(({ ctx, input }) => {
 ctx.db.update(agents).set({ enabled: input.enabled }).where(eq(agents.id, input.id)).run();
 return { ok: true as const };
 }),

 delete: publicProcedure
 .input(z.object({ id: z.string() }))
 .mutation(({ ctx, input }) => {
 ctx.db.delete(agents).where(eq(agents.id, input.id)).run();
 return { ok: true as const };
 }),
});
```

### `apps/main/src/ipc/routers/repos.router.ts`

```ts
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { repos } from '@tickitt/db';
import { router, publicProcedure } from '../trpc.js';

export const reposRouter = router({
 list: publicProcedure.query(({ ctx }) => ctx.db.select().from(repos).all()),

 add: publicProcedure
 .input(z.object({
 name: z.string().min(1),
 remoteUrl: z.string().url(),
 defaultBranch: z.string().default('main'),
 localPath: z.string().min(1),
 }))
 .mutation(({ ctx, input }) => {
 const [row] = ctx.db.insert(repos).values({
 name: input.name,
 remoteUrl: input.remoteUrl,
 defaultBranch: input.defaultBranch,
 localPath: input.localPath,
 }).returning().all();
 return row!;
 }),

 remove: publicProcedure
 .input(z.object({ id: z.string() }))
 .mutation(({ ctx, input }) => {
 ctx.db.delete(repos).where(eq(repos.id, input.id)).run();
 return { ok: true as const };
 }),
});
```

### `apps/main/src/ipc/router.ts`

```ts
import { router } from './trpc.js';
import { systemRouter } from './routers/system.router.js';
import { connectionsRouter } from './routers/connections.router.js';
import { agentsRouter } from './routers/agents.router.js';
import { reposRouter } from './routers/repos.router.js';

export const appRouter = router({
 System (untrusted): systemRouter,
 connections: connectionsRouter,
 agents: agentsRouter,
 repos: reposRouter,
});

export type AppRouter = typeof appRouter;
```

### `apps/main/src/preload.ts`

```ts
import { exposeElectronTRPC } from 'electron-trpc/main';

process.once('loaded', () => {
 exposeElectronTRPC();
});
```

### `apps/main/src/windows/main-window.ts`

```ts
import { BrowserWindow } from 'electron';
import path from 'node:path';
import { isDev, rendererUrl } from '../env.js';

export function createMainWindow(): BrowserWindow {
 const win = new BrowserWindow({
 width: 1280,
 height: 820,
 minWidth: 980,
 minHeight: 640,
 titleBarStyle: 'hiddenInset',
 backgroundColor: '#0b0b0e',
 webPreferences: {
 preload: path.join(__dirname, 'preload.cjs'),
 contextIsolation: true,
 nodeIntegration: false,
 sandbox: false, // electron-trpc needs preload access; sandbox=false is the documented config
 },
 });

 if (isDev) {
 void win.loadURL(rendererUrl);
 win.webContents.openDevTools({ mode: 'detach' });
 } else {
 void win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'dist', 'browser', 'index.html'));
 }

 return win;
}
```

### `apps/main/src/index.ts`

```ts
import { app, BrowserWindow } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import { resolveAppPaths } from './paths.js';
import { initDatabase, closeDatabase } from './db/client.js';
import { appRouter } from './ipc/router.js';
import { createMainWindow } from './windows/main-window.js';

app.setName('Tickitt');

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
 const paths = resolveAppPaths();
 const db = await initDatabase(paths);

 await app.whenReady();

 mainWindow = createMainWindow();

 createIPCHandler({
 router: appRouter,
 windows: [mainWindow],
 createContext: async () => ({ db, paths }),
 });

 app.on('activate', () => {
 if (BrowserWindow.getAllWindows().length === 0) {
 mainWindow = createMainWindow();
 }
 });
}

app.on('window-all-closed', () => {
 if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
 closeDatabase();
});

bootstrap().catch((err) => {
 console.error('Bootstrap failed:', err);
 app.exit(1);
});
```

---

## 7. `apps/renderer`

Standard Angular 19 app, served by `ng serve` on port 4200 in dev. Builds to `dist/browser/` and is loaded by Electron from a file URL in production.

### `apps/renderer/package.json`

```json
{
 "name": "@tickitt/renderer",
 "version": "0.0.1",
 "private": true,
 "type": "module",
 "scripts": {
 "dev": "ng serve --port 4200 --host 127.0.0.1",
 "build": "ng build --configuration production",
 "typecheck": "tsc --noEmit -p tsconfig.app.json",
 "lint": "echo 'add eslint later'"
 },
 "dependencies": {
 "@angular/common": "^19.0.0",
 "@angular/compiler": "^19.0.0",
 "@angular/core": "^19.0.0",
 "@angular/forms": "^19.0.0",
 "@angular/platform-browser": "^19.0.0",
 "@angular/router": "^19.0.0",
 "@tickitt/ipc-contract": "workspace:*",
 "@tickitt/shared-types": "workspace:*",
 "@trpc/client": "^11.0.0-rc.553",
 "electron-trpc": "^0.7.0",
 "rxjs": "^7.8.1",
 "superjson": "^2.2.1",
 "tslib": "^2.7.0",
 "zone.js": "~0.15.0"
 },
 "devDependencies": {
 "@angular-devkit/build-angular": "^19.0.0",
 "@angular/cli": "^19.0.0",
 "@angular/compiler-cli": "^19.0.0",
 "typescript": "~5.6.2"
 }
}
```

> Note: `rxjs` and `zone.js` are required by Angular 19 even though we won't use them in app code. App code stays signal-based. zoneless Angular is opt-in; we'll enable it via `provideExperimentalZonelessChangeDetection()` in `app.config.ts`.

### `apps/renderer/angular.json`

```json
{
 "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
 "version": 1,
 "newProjectRoot": "projects",
 "projects": {
 "renderer": {
 "projectType": "application",
 "root": "",
 "sourceRoot": "src",
 "prefix": "tk",
 "architect": {
 "build": {
 "builder": "@angular-devkit/build-angular:application",
 "options": {
 "outputPath": "dist",
 "index": "src/index.html",
 "browser": "src/main.ts",
 "tsConfig": "tsconfig.app.json",
 "polyfills": [],
 "assets": [],
 "styles": ["src/styles.css"],
 "scripts": []
 },
 "configurations": {
 "production": {
 "budgets": [
 { "type": "initial", "maximumWarning": "1mb", "maximumError": "2mb" }
 ],
 "outputHashing": "all"
 },
 "development": {
 "optimization": false,
 "sourceMap": true,
 "extractLicenses": false
 }
 },
 "defaultConfiguration": "production"
 },
 "serve": {
 "builder": "@angular-devkit/build-angular:dev-server",
 "options": { "buildTarget": "renderer:build:development" }
 }
 }
 }
 }
}
```

### `apps/renderer/tsconfig.json`

```json
{
 "extends": "../../tsconfig.base.json",
 "compileOnSave": false,
 "compilerOptions": {
 "useDefineForClassFields": false,
 "experimentalDecorators": true,
 "emitDecoratorMetadata": true,
 "target": "ES2022",
 "module": "ES2022",
 "moduleResolution": "bundler",
 "lib": ["ES2022", "DOM"]
 },
 "angularCompilerOptions": {
 "enableI18nLegacyMessageIdFormat": false,
 "strictInjectionParameters": true,
 "strictInputAccessModifiers": true,
 "strictTemplates": true
 }
}
```

### `apps/renderer/tsconfig.app.json`

```json
{
 "extends": "./tsconfig.json",
 "compilerOptions": {
 "outDir": "./out-tsc/app",
 "types": []
 },
 "files": ["src/main.ts"],
 "include": ["src/**/*.d.ts", "src/**/*.ts"]
}
```

### `apps/renderer/src/index.html`

```html
<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <title>Tickitt</title>
 <base href="./">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <meta http-equiv="Content-Security-Policy"
 content="default-src 'self' 'unsafe-inline' data:; script-src 'self'; connect-src 'self' ws: http://localhost:4200">
</head>
<body>
 <tk-root></tk-root>
</body>
</html>
```

### `apps/renderer/src/main.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
```

### `apps/renderer/src/styles.css`

```css
:root {
 --bg: #0b0b0e;
 --bg-elev: #14141a;
 --fg: #e7e7ea;
 --fg-dim: #9a9aa3;
 --accent: #7c5cff;
 --border: #23232b;
 --danger: #ff6b6b;
 --ok: #3ecf8e;
 font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
 font-size: 14px;
 color-scheme: dark;
}

html, body, tk-root {
 margin: 0;
 padding: 0;
 height: 100%;
 background: var(--bg);
 color: var(--fg);
}

button {
 font: inherit;
 background: var(--bg-elev);
 color: var(--fg);
 border: 1px solid var(--border);
 padding: 6px 12px;
 border-radius: 6px;
 cursor: pointer;
}
button:hover { border-color: var(--accent); }
input, textarea {
 font: inherit;
 background: var(--bg-elev);
 color: var(--fg);
 border: 1px solid var(--border);
 padding: 6px 8px;
 border-radius: 6px;
}
```

### `apps/renderer/src/app/core/ipc/trpc.client.ts`

```ts
import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import superjson from 'superjson';
import type { AppRouter } from '@tickitt/ipc-contract';

export type Trpc = ReturnType<typeof createTrpc>;

export function createTrpc() {
 return createTRPCProxyClient<AppRouter>({
 transformer: superjson,
 links: [ipcLink()],
 });
}
```

### `apps/renderer/src/app/core/ipc/trpc.token.ts`

```ts
import { InjectionToken } from '@angular/core';
import type { Trpc } from './trpc.client';

export const TRPC = new InjectionToken<Trpc>('TRPC');
```

### `apps/renderer/src/app/app.config.ts`

```ts
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { appRoutes } from './app.routes';
import { TRPC } from './core/ipc/trpc.token';
import { createTrpc } from './core/ipc/trpc.client';

export const appConfig: ApplicationConfig = {
 providers: [
 provideExperimentalZonelessChangeDetection(),
 provideRouter(appRoutes, withComponentInputBinding()),
 { provide: TRPC, useFactory: () => createTrpc() },
 ],
};
```

### `apps/renderer/src/app/app.routes.ts`

```ts
import { Routes } from '@angular/router';

export const appRoutes: Routes = [
 { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
 {
 path: 'dashboard',
 loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
 },
 {
 path: 'runs',
 loadComponent: () => import('./pages/runs/runs.page').then((m) => m.RunsPage),
 },
 {
 path: 'settings',
 loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
 },
 { path: '**', redirectTo: 'dashboard' },
];
```

### `apps/renderer/src/app/app.component.ts`

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShellComponent } from './core/layout/shell.component';

@Component({
 selector: 'tk-root',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 imports: [ShellComponent],
 template: `<tk-shell />`,
})
export class AppComponent {}
```

### `apps/renderer/src/app/core/layout/shell.component.ts`

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
 selector: 'tk-shell',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 imports: [RouterOutlet, RouterLink, RouterLinkActive],
 template: `
 <div class="layout">
 <aside>
 <h1>Tickitt</h1>
 <nav>
 <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
 <a routerLink="/runs" routerLinkActive="active">Runs</a>
 <a routerLink="/settings" routerLinkActive="active">Settings</a>
 </nav>
 </aside>
 <main>
 <router-outlet />
 </main>
 </div>
 `,
 styles: [`
 .layout { display: grid; grid-template-columns: 220px 1fr; height: 100vh; }
 aside { background: var(--bg-elev); border-right: 1px solid var(--border); padding: 18px 14px; }
 aside h1 { font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-dim); margin: 0 0 18px; }
 nav { display: flex; flex-direction: column; gap: 4px; }
 nav a { color: var(--fg-dim); padding: 8px 10px; border-radius: 6px; text-decoration: none; }
 nav a:hover { color: var(--fg); background: rgba(255,255,255,0.03); }
 nav a.active { color: var(--fg); background: rgba(124, 92, 255, 0.12); }
 main { overflow: auto; padding: 24px 28px; }
 `],
})
export class ShellComponent {}
```

### `apps/renderer/src/app/pages/dashboard/dashboard.page.ts`

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
 selector: 'tk-dashboard',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <h2>Dashboard</h2>
 <p>Tickets and agent assignment land here in Phase 1+.</p>
 `,
})
export class DashboardPage {}
```

### `apps/renderer/src/app/pages/runs/runs.page.ts`

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
 selector: 'tk-runs',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <h2>Runs</h2>
 <p>Active and completed runs land here in Phase 3+.</p>
 `,
})
export class RunsPage {}
```

### `apps/renderer/src/app/pages/settings/settings.page.ts`

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ConnectionsSectionComponent } from './connections-section.component';
import { AgentsSectionComponent } from './agents-section.component';
import { ReposSectionComponent } from './repos-section.component';
import { DiagnosticsSectionComponent } from './diagnostics-section.component';

@Component({
 selector: 'tk-settings',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 imports: [
 ConnectionsSectionComponent,
 AgentsSectionComponent,
 ReposSectionComponent,
 DiagnosticsSectionComponent,
 ],
 template: `
 <h2>Settings</h2>
 <tk-diagnostics-section />
 <tk-connections-section />
 <tk-agents-section />
 <tk-repos-section />
 `,
 styles: [`
 :host { display: block; max-width: 920px; }
 h2 { margin-top: 0; }
 `],
})
export class SettingsPage {}
```

### `apps/renderer/src/app/pages/settings/diagnostics-section.component.ts`

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { AppInfo, KeychainProbeResult } from '@tickitt/shared-types';
import { TRPC } from '../../core/ipc/trpc.token';

@Component({
 selector: 'tk-diagnostics-section',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <section>
 <h3>Diagnostics</h3>
 <button (click)="loadInfo()">Load app info</button>
 <button (click)="probeKeychain()">Probe keychain</button>
 @if (info(); as i) {
 <pre>{{ formatted() }}</pre>
 }
 @if (keychain(); as k) {
 <p>Keychain: {{ k.ok ? 'OK' : 'FAIL — ' + (k.error ?? '') }}</p>
 }
 </section>
 `,
 styles: [`
 section { margin: 16px 0 32px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
 h3 { margin-top: 0; }
 button { margin-right: 8px; }
 pre { font-size: 12px; color: var(--fg-dim); white-space: pre-wrap; word-break: break-all; }
 `],
})
export class DiagnosticsSectionComponent {
 private readonly trpc = inject(TRPC);
 protected readonly info = signal<AppInfo | null>(null);
 protected readonly keychain = signal<KeychainProbeResult | null>(null);
 protected readonly formatted = computed(() => JSON.stringify(this.info(), null, 2));

 protected async loadInfo(): Promise<void> {
 this.info.set(await this.trpc.system.appInfo.query());
 }

 protected async probeKeychain(): Promise<void> {
 this.keychain.set(await this.trpc.system.keychainProbe.mutate());
 }
}
```

### Other settings sections (placeholders, real CRUD wired in Phase 1)

`connections-section.component.ts`, `agents-section.component.ts`, `repos-section.component.ts` — each renders a heading, an empty-state line, and a disabled "Add" button. Same component shape as Diagnostics, no IPC calls yet. Keep the file present so Phase 1 only adds, never restructures.

Example (`connections-section.component.ts`):

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
 selector: 'tk-connections-section',
 standalone: true,
 changeDetection: ChangeDetectionStrategy.OnPush,
 template: `
 <section>
 <h3>Connections</h3>
 <p>No connections yet. Jira and GitHub will be added in Phase 1.</p>
 <button disabled>Add connection</button>
 </section>
 `,
 styles: [`
 section { margin: 16px 0; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); }
 h3 { margin-top: 0; }
 `],
})
export class ConnectionsSectionComponent {}
```

Mirror for agents and repos.

---

## 8. Phase 0 — execution order

Claw must follow this sequence. Do not parallelize across steps; each step is verified before the next.

1. Init repo: `git init`, drop in root configs (Section 2), create `.gitignore`, `.nvmrc`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `package.json`, `electron-builder.yml`, `build/entitlements.mac.plist`.
2. Scaffold `packages/db` (Section 3). Write the schema. Run `pnpm install` at root, then `pnpm -F @tickitt/db generate` to produce `src/migrations/0000_*.sql`. Commit migration files.
3. Scaffold `packages/shared-types` (Section 4) and `packages/ipc-contract` (Section 5) — leave the AppRouter re-export as the placeholder until Step 5.
4. Scaffold `apps/main` (Section 6). All routers, db client, keychain wrapper, window, bootstrap.
5. Replace the placeholder in `packages/ipc-contract/src/index.ts` with `export type { AppRouter } from '../../../apps/main/src/ipc/router.js';`.
6. Scaffold `apps/renderer` (Section 7). Use `pnpm dlx @angular/cli@19 new renderer` only as a reference — do not actually generate, hand-write the files since we need the exact `tk-` prefix and pruned config.
7. From the repo root: `pnpm install`. Then `pnpm dev`. The Angular dev server comes up on 4200, then Electron loads it. Verify navigation between Dashboard / Runs / Settings.
8. On the Settings page, click **Load app info** — JSON appears with version, paths, db path. Click **Probe keychain** — shows OK.
9. `pnpm build` — produces `apps/main/dist`, `apps/renderer/dist/browser`, `packages/db/src/migrations`.
10. `pnpm package:dir` — produces an unsigned `.app` in `release/mac-arm64/Tickitt.app`. Open it. Same diagnostics work (keychain prompt may appear once).

Stop here. Do not begin Phase 1 work. Open a PR titled `phase-0: skeleton` for review.

---

## 9. Phase 0 — acceptance criteria

A reviewer (me) will check the following against the running app:

1. `pnpm install` from a clean clone succeeds in under 90 seconds on a warm cache.
2. `pnpm dev` opens an Electron window in under 8 seconds; HMR works for renderer changes; main-process changes restart Electron via `tsup --onSuccess`.
3. SQLite file is created at `~/Library/Application Support/Tickitt/tickitt.db`. Drizzle migrations run successfully on first boot. Re-running the app does not re-apply migrations.
4. `system.ping` returns `'pong'`. `system.appInfo` returns valid metadata. `system.keychainProbe` returns `{ ok: true }`.
5. All Angular components are standalone, OnPush, signal-only. No `@Input()` / `@Output()` decorators, no `ngOnInit`-based async loads, no `*ngIf` / `*ngFor`. No RxJS imports anywhere in `apps/renderer/src/app/`.
6. `pnpm typecheck` passes with zero errors across all workspace packages.
7. `pnpm package:dir` produces a runnable `.app` bundle on macOS (arm64). The packaged app reaches the Settings → Diagnostics page and loads app info successfully.
8. CSP in `index.html` is enforced — no `'unsafe-eval'`. Renderer cannot import Node modules (`contextIsolation: true`, `nodeIntegration: false`).
9. Unit tests are not required in Phase 0. Lint config is not required. Both arrive in Phase 1.

---

## 10. What's deliberately out of scope

- Jira API client, GitHub API client, ticket sync.
- node-pty, agent adapter, run orchestrator.
- Worktree management.
- Monaco diff viewer.
- Transloco / i18n (added when first user-facing English text count >50 strings).
- Code signing + notarization (wire when Apple Developer account is in hand).
- Auto-update.
- ESLint + Prettier configs (Phase 1, with consistent rules across all workspaces).

---

## 11. Phase 1 preview (for context only — do not start)

Phase 1 wires real connections:

1. Real `connections.test` for Jira (verify `/myself` endpoint with API token).
2. Real `connections.test` for GitHub (verify `/user` with PAT).
3. Tickets router + sync service: JQL config per-connection, on-demand and timer-driven sync, dedup on `(connectionId, externalId)`.
4. Repos: clone-on-add into `<workspace>/repos/<slug>` as a regular working clone we'll `git worktree add` from in Phase 2.
5. Settings UI: forms for connection create/edit/test/delete, repo add/remove, agent add/edit (binary path picker, test invocation).

End of Phase 0 spec.
<<<END_EXTERNAL_UNTRUSTED_CONTENT id="2ea81b3873e26db7">>>
</file>
