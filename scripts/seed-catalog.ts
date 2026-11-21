/**
 * Seed the learning catalogue into an existing production database.
 *
 * `npm run db:init` is destructive: it deletes the database and recreates it
 * with fictional demo people. This script is the non-destructive counterpart —
 * it inserts only catalogue rows and re-points the seed's fictional user IDs at
 * real accounts, so admins, invites, sessions and passwords are preserved.
 *
 * Safe to re-run: exits unchanged when topics already exist (use --force to
 * insert a second copy of the catalogue, which is almost never what you want).
 */
import Database from "better-sqlite3";
import path from "node:path";
import { buildSeed, IDS } from "../lib/db/seed";
import { insertRows } from "./_insert";

const DB_PATH =
  process.env.AURA_DB_PATH ??
  path.join(process.env.AURA_DB_DIR ?? path.join(process.cwd(), "data"), "aura.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

function count(table: string): number {
  return (sqlite.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c;
}

function userIdFor(email: string | undefined, role: string, label: string, fallback?: string): string {
  let id: string | undefined;
  if (email) {
    id = (sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined)?.id;
  }
  if (!id) {
    id = (
      sqlite
        .prepare(
          "SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role = ? ORDER BY u.created_at LIMIT 1",
        )
        .get(role) as { id: string } | undefined
    )?.id;
  }
  if (!id) id = fallback;
  if (!id) throw new Error(`No ${label} account found. Create one with npm run user:create first.`);
  return id;
}

const adminId = userIdFor(process.env.AURA_SEED_ADMIN_EMAIL, "admin", "admin");
const studentId = userIdFor(process.env.AURA_SEED_STUDENT_EMAIL, "student", "student", adminId);
const mentorId = userIdFor(process.env.AURA_SEED_MENTOR_EMAIL, "mentor", "mentor", adminId);

if (count("topics") > 0 && !process.argv.includes("--force")) {
  console.log(`Catalogue already present (${count("topics")} topics). Nothing to do.`);
  sqlite.close();
  process.exit(0);
}

const userMap: Record<string, string> = {};
for (const id of Object.values(IDS.users)) userMap[id] = adminId;
for (const key of ["ananya", "rohit", "meera", "jyoti"] as const) userMap[IDS.users[key]] = studentId;
for (const key of ["kabir", "devika"] as const) userMap[IDS.users[key]] = mentorId;

/** Re-point every fictional user ID in a seed row at a real account. */
function remapUsers(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const [key, value] of Object.entries(next)) {
      if (typeof value === "string" && userMap[value]) next[key] = userMap[value];
    }
    return next;
  });
}

// Tables with no user columns can be copied verbatim.
const CATALOGUE = new Set([
  "subjects",
  "topics",
  "topic_prerequisites",
  "resources",
  "practice_questions",
  "challenges",
  "events",
  "schools",
  "inventory_items",
]);

// User-owned rows are kept for the walkthrough but attributed to real accounts.
const OWNED = new Set([
  "practice_attempts",
  "projects",
  "event_registrations",
  "collaboration_requests",
  "stock_movements",
  "resource_allocations",
  "mentor_assignments",
  "audit_events",
]);

const beforeUsers = count("users");
sqlite.pragma("foreign_keys = OFF");
try {
  for (const { table, rows } of buildSeed()) {
    if (CATALOGUE.has(table)) insertRows(sqlite, table, rows);
    else if (OWNED.has(table)) insertRows(sqlite, table, remapUsers(rows));
  }
} finally {
  sqlite.pragma("foreign_keys = ON");
}

const tables = [...CATALOGUE, ...OWNED].sort();
console.log("Catalogue seeded into", DB_PATH);
for (const table of tables) console.log(`  ${table.padEnd(22)} ${count(table)}`);
console.log(`Users preserved: ${beforeUsers} -> ${count("users")}`);
sqlite.close();
