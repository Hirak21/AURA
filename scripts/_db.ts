import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { migrate } from "../lib/db/migrate";

/**
 * Shared database opener for operator scripts. Resolves the same path as the
 * application, applies the same pragmas, and runs the idempotent migration.
 */
export function openDatabase() {
  const configuredPath = process.env.AURA_DB_PATH;
  const configuredDir = process.env.AURA_DB_DIR;
  const defaultDir = path.resolve(configuredDir ?? path.join(process.cwd(), "data"));
  const dbPath = path.resolve(configuredPath ?? path.join(defaultDir, "aura.db"));

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);

  return { sqlite, dbPath };
}
