/**
 * Schema-only migration. Use this on a production database: it creates or
 * upgrades every table and never inserts demo content.
 *
 *   npm run db:migrate
 *
 * The application also runs the same idempotent migration on boot, so this is
 * mainly useful for CI, pre-deploy checks and explicit operator control.
 */
import { openDatabase } from "./_db";

const { sqlite, dbPath } = openDatabase();
const version = (
  sqlite.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get() as { value: string } | undefined
)?.value;

console.log(`Schema ready at ${dbPath}`);
console.log(`schema_version = ${version ?? "unknown"}`);
sqlite.close();
