import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

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
  // In dev (tsup bundle): __dirname is apps/main/dist/
  // Need to go up 3 levels to reach repo root, then into packages/db/src/migrations
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'packages', 'db', 'src', 'migrations'),
    path.resolve(__dirname, '..', '..', 'packages', 'db', 'src', 'migrations'),
    path.resolve(__dirname, '..', 'packages', 'db', 'src', 'migrations'),
    path.resolve(__dirname, 'migrations'),
    path.resolve(process.cwd(), 'packages', 'db', 'src', 'migrations'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'meta', '_journal.json'))) {
      return candidate;
    }
  }
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