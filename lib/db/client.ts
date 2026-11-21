import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { migrate } from "./migrate";
import path from "node:path";
import fs from "node:fs";

/**
 * SQLite connection.
 *
 * Production posture (single VPS, one Node process):
 * - absolute path so systemd/cwd changes cannot create a second database
 * - WAL for concurrent readers + one writer
 * - busy_timeout so a checkpoint never surfaces as SQLITE_BUSY
 * - synchronous=NORMAL is the correct durability/speed trade-off under WAL
 * - schema migration runs on boot, so a restored/older database still works
 *
 * The process is single-instance by design. See docs/DATABASE.md for the
 * Postgres migration path if AURA ever needs multiple app servers.
 */
const configuredPath = process.env.AURA_DB_PATH;
const configuredDir = process.env.AURA_DB_DIR;
const defaultDir = path.resolve(configuredDir ?? path.join(process.cwd(), "data"));
export const dbPath = path.resolve(configuredPath ?? path.join(defaultDir, "aura.db"));
const DB_DIR_RESOLVED = path.dirname(dbPath);

function ensureDir() {
  if (!fs.existsSync(DB_DIR_RESOLVED)) fs.mkdirSync(DB_DIR_RESOLVED, { recursive: true });
}

declare global {
  // eslint-disable-next-line no-var
  var __auraDb__: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  ensureDir();
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("wal_autocheckpoint = 1000");
  sqlite.pragma("temp_store = MEMORY");
  // Idempotent: creates missing tables/columns and records schema_version.
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

export const db = global.__auraDb__ ?? (global.__auraDb__ = createDb());
export { schema };
export type DB = ReturnType<typeof createDb>;
