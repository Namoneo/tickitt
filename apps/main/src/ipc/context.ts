import type { Db } from '@tickitt/db';
import type { AppPaths } from '../paths.js';
import type { ConnectionService } from '../services/connection-service.js';
import type { TicketSyncService } from '../services/ticket-sync-service.js';

export interface IpcContext {
  db: Db;
  paths: AppPaths;
  connectionService: ConnectionService;
  ticketSync: TicketSyncService;
}

export type CreateContext = () => IpcContext;