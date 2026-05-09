import { eq } from 'drizzle-orm';
import { appSettings, type Db } from '@tickitt/db';

type Watcher = (value: unknown) => void;

export class SettingsService {
  private readonly watchers = new Map<string, Set<Watcher>>();

  constructor(private readonly db: Db) {}

  get<T>(key: string, fallback: T): T {
    const [row] = this.db.select().from(appSettings).where(eq(appSettings.key, key)).all();
    if (!row) return fallback;
    return row.value as T;
  }

  set<T>(key: string, value: T): void {
    this.db.insert(appSettings)
      .values({ key, value: value as unknown, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: value as unknown, updatedAt: new Date() } })
      .run();
    const watchers = this.watchers.get(key);
    if (watchers) for (const fn of watchers) fn(value);
  }

  watch<T>(key: string, fn: (value: T) => void): () => void {
    let set = this.watchers.get(key);
    if (!set) {
      set = new Set();
      this.watchers.set(key, set);
    }
    set.add(fn as Watcher);
    return () => { set!.delete(fn as Watcher); };
  }

  /** Snapshot of all settings — used by the renderer's settings UI. */
  all(): Record<string, unknown> {
    const rows = this.db.select().from(appSettings).all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }
}
