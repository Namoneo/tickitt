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