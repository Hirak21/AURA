// Seed only catalogue data (subjects, topics, prerequisites, resources) without touching user accounts
import Database from "better-sqlite3";
import path from "node:path";
import { buildSeed, IDS } from "../lib/db/seed";

const DB_DIR = process.env.AURA_DB_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.AURA_DB_PATH ?? path.join(DB_DIR, "aura.db");

if (!process.env.AURA_DB_PATH) {
  console.error("AURA_DB_PATH not set – using default location", DB_PATH);
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");

const seed = buildSeed();
// Filter only tables we want to insert (skip users and user_roles)
const catalogueTables = seed.filter(({ table }) =>
  ["subjects", "topics", "topic_prerequisites", "resources", "events", "event_registrations", "inventory_items", "stock_movements", "resource_allocations", "mentor_assignments", "practice_questions"].includes(table)
);

for (const { table, rows } of catalogueTables) {
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length === 0) continue;
  const placeholders = cols.map(() => "?").join(", ");
  const stmt = sqlite.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`);
  const insert = sqlite.transaction((rows: any[]) => {
    for (const row of rows) stmt.run(Object.values(row));
  });
  insert(rows);
  console.log(`Inserted ${rows.length} rows into ${table}`);
}

sqlite.close();
console.log("Catalogue seed complete.");
