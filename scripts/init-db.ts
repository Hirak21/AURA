import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { migrate } from "../lib/db/migrate";
import { buildSeed } from "../lib/db/seed";
import { insertRows } from "./_insert";

const DB_DIR = process.env.AURA_DB_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.AURA_DB_PATH ?? path.join(DB_DIR, "aura.db");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
for (const f of [DB_PATH, DB_PATH + "-wal", DB_PATH + "-shm"]) if (fs.existsSync(f)) fs.rmSync(f);

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
migrate(sqlite);

const seed = buildSeed();
sqlite.pragma("foreign_keys = OFF");
for (const { table, rows } of seed) insertRows(sqlite, table, rows);
sqlite.pragma("foreign_keys = ON");

const counts = seed
  .map(
    ({ table }) =>
      `${table}=${(sqlite.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c}`,
  )
  .join("  ");
console.log("Database initialised at", DB_PATH);
console.log(counts);
sqlite.close();
