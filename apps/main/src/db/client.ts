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