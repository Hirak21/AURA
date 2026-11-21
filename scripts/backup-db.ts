/**
 * Online SQLite backup.
 *
 * Uses better-sqlite3's backup API, which takes a consistent snapshot even
 * while the app is running (it is not a file copy — copying a live WAL
 * database can capture a torn state).
 *
 * Usage:
 *   npm run db:backup
 *   AURA_BACKUP_DIR=/var/backups/aura AURA_BACKUP_KEEP=30 npm run db:backup
 *
 * Schedule this from cron/systemd-timer, then copy the directory off-box.
 */
import path from "node:path";
import fs from "node:fs";
import { openDatabase } from "./_db";

const keep = Number(process.env.AURA_BACKUP_KEEP ?? 14);
const backupDir = path.resolve(
  process.env.AURA_BACKUP_DIR ?? path.join(path.dirname(process.env.AURA_DB_PATH ?? path.join(process.cwd(), "data", "aura.db")), "backups"),
);

async function main() {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const target = path.join(backupDir, `aura-${stamp}.db`);

  const { sqlite, dbPath } = openDatabase();
  try {
    await sqlite.backup(target);
  } finally {
    sqlite.close();
  }

  const size = fs.statSync(target).size;
  console.log(`Backup written: ${target} (${(size / 1024).toFixed(0)} KiB)`);
  console.log(`Source database: ${dbPath}`);

  // Keep the most recent N snapshots; never delete anything outside our prefix.
  const snapshots = fs
    .readdirSync(backupDir)
    .filter((f) => /^aura-.*\.db$/.test(f))
    .sort()
    .reverse();
  for (const old of snapshots.slice(Math.max(1, keep))) {
    fs.rmSync(path.join(backupDir, old), { force: true });
    console.log(`Pruned: ${old}`);
  }
}

main().catch((error) => {
  console.error("Backup failed:", error);
  process.exit(1);
});
