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
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.join(here, 'migrations');
  } catch {
    return path.join(__dirname, 'migrations');
  }
}

export async function runMigrations(db: Db): Promise<void> {
  drizzleMigrate(db, { migrationsFolder: migrationsDir() });
}