import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { migrate } from "../lib/db/migrate";

/**
 * Shared database opener for operator scripts. Resolves the same path as the
 * application, applies the same pragmas, and runs the idempotent migration.
 *
 * `readonly` is used by dry-run/verification commands: it never creates a
 * database file, never migrates, and sets query_only before reading.
 */
export function resolveDbPath() {
  const configuredPath = process.env.AURA_DB_PATH;
  const configuredDir = process.env.AURA_DB_DIR;
  const defaultDir = path.resolve(configuredDir ?? path.join(process.cwd(), "data"));
  return path.resolve(configuredPath ?? path.join(defaultDir, "aura.db"));
}

export function openDatabase(options?: { readonly?: boolean }) {
  const dbPath = resolveDbPath();

  if (!fs.existsSync(path.dirname(dbPath))) {
    if (options?.readonly) {
      throw new Error(`Database directory does not exist: ${path.dirname(dbPath)}`);
    }
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  if (options?.readonly && !fs.existsSync(dbPath)) {
    throw new Error(`Database does not exist: ${dbPath}`);
  }

  const sqlite = new Database(
    dbPath,
    options?.readonly ? { readonly: true, fileMustExist: true } : undefined,
  );

  if (options?.readonly) {
    sqlite.pragma("query_only = ON");
  } else {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.pragma("foreign_keys = ON");
    // Idempotent: creates missing tables/columns and records schema_version.
    migrate(sqlite);
  }

  return { sqlite, dbPath };
}

/** True when the target is a deployed production database. */
export function isProductionDatabase(dbPath: string) {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.AURA_ENV === "production" ||
    dbPath.includes("/home/aagomon/") ||
    dbPath.includes("/var/lib/aura/")
  );
}

/** Shared guard: production writes require an explicit operator flag. */
export function assertWriteApproved(dbPath: string, args: Set<string>) {
  if (isProductionDatabase(dbPath) && !args.has("--production-approved")) {
    throw new Error(
      "Refusing to write to a production database without --production-approved. " +
        "Take a backup, review the dry-run, and only then pass the flag explicitly.",
    );
  }
}
