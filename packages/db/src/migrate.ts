import { createDb, runMigrations } from './index.js';
import path from 'node:path';

const target = process.env['TICKITT_DB_PATH'] ?? path.resolve(process.cwd(), 'tickitt.db');
const { db, close } = createDb({ path: target });
await runMigrations(db);
close();
console.log(`Migrated database at ${target}`);