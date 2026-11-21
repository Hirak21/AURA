/**
 * Reset = drop every demo table, re-migrate and re-seed.
 * Safe alternative to deleting data/aura.db by hand.
 */
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { migrate } from "../lib/db/migrate";
import { buildSeed } from "../lib/db/seed";
import { insertRows } from "./_insert";

const DB_DIR = process.env.AURA_DB_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.AURA_DB_PATH ?? path.join(DB_DIR, "aura.db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const tables = (
  sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[]
).map((r) => r.name);

sqlite.pragma("foreign_keys = OFF");
for (const t of tables) sqlite.exec(`DROP TABLE IF EXISTS "${t}"`);
migrate(sqlite);

const seed = buildSeed();
for (const { table, rows } of seed) insertRows(sqlite, table, rows);
sqlite.pragma("foreign_keys = ON");

console.log("Demo data reset at", DB_PATH, "·", new Date().toISOString());
sqlite.close();
