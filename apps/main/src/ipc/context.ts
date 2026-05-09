import type { Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';
import type { ConnectionService } from '../services/connection-service.js';
import type { TicketSyncService } from '../services/ticket-sync-service.js';
import type { WorktreeService } from '../services/worktree.service.js';
import type { DiffService } from '../services/diff.service.js';
import type { RunOrchestrator } from '../runs/run.orchestrator.js';
import type { SettingsService } from '../services/settings.service.js';

export interface IpcContext {
  db: Db;
  paths: AppPaths;
  connectionService: ConnectionService;
  ticketSync: TicketSyncService;
  worktrees: WorktreeService;
  diff: DiffService;
  orchestrator: RunOrchestrator;
  settings: SettingsService;
}

export type CreateContext = () => Promise<IpcContext>;