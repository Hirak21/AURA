/**
 * Routine database maintenance. Safe to run while the app is online.
 *
 *   npm run db:maintain
 *
 * - deletes expired sessions (lazy cleanup also happens on read)
 * - checkpoints the WAL so the .db file stays self-contained for backups
 * - reports table sizes so growth is visible over time
 */
import { openDatabase } from "./_db";

const { sqlite, dbPath } = openDatabase();
const now = new Date().toISOString();

const expired = sqlite.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
sqlite.pragma("wal_checkpoint(TRUNCATE)");
sqlite.pragma("optimize");

const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all() as { name: string }[];

console.log(`Maintained ${dbPath}`);
console.log(`Expired sessions removed: ${expired.changes}`);
for (const { name } of tables) {
  const count = (sqlite.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get() as { c: number }).c;
  if (count > 0) console.log(`  ${name}: ${count}`);
}
sqlite.close();
