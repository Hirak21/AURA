/**
 * Remove ONLY the rows recorded in the opt-in demo manifest.
 *
 * Dry-run by default. Production writes require --apply and
 * --production-approved. Real rows are never targeted: deletion is by the
 * exact primary keys stored in demo_seed_meta, in reverse dependency order.
 */
import fs from "node:fs";
import { DATASET_ID, DELETE_ORDER, buildDemoDataset } from "./demo-dataset";
import { assertWriteApproved, openDatabase, resolveDbPath } from "./_db";
import {
  deleteByKeys,
  readManifest,
  selectByKeys,
  tableExists,
} from "./_demo-store";
import type Database from "better-sqlite3";
import type { SqlValue } from "./demo-dataset";

type DB = Database.Database;

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply") && !args.has("--dry-run");

function placeholders(values: SqlValue[]) {
  return values.map(() => "?").join(", ");
}

function assertNoForeignAuditReferences(sqlite: DB) {
  const manifest = readManifest(sqlite);
  if (!manifest) return;
  const anchor = new Date(manifest.generatedAt);
  if (Number.isNaN(anchor.getTime())) throw new Error("Stored manifest has an invalid timestamp.");
  const dataset = buildDemoDataset(anchor);

  const ownAuditIds = new Set(
    dataset.rows.filter((r) => r.table === "audit_events").map((r) => String(r.keys.id)),
  );
  // Only IDs this dataset owns. Baseline IDs such as t-ohm or sr-2 are shared
  // catalogue records and may legitimately appear in unrelated audit history.
  const demoEntityIds = [
    ...new Set(
      dataset.rows.flatMap((r) => {
        const keyId = typeof r.keys.id === "string" && r.keys.id.startsWith("pd2-") ? [r.keys.id] : [];
        const auditEntity =
          r.table === "audit_events" &&
          typeof r.values.entity_id === "string" &&
          r.values.entity_id.startsWith("pd2-")
            ? [r.values.entity_id]
            : [];
        return [...keyId, ...auditEntity];
      }),
    ),
  ];
  if (demoEntityIds.length === 0) return;

  const found = sqlite
    .prepare(`SELECT id, entity_id FROM audit_events WHERE entity_id IN (${placeholders(demoEntityIds)})`)
    .all(...demoEntityIds) as Array<{ id: string; entity_id: string }>;
  const foreign = found.filter((row) => !ownAuditIds.has(row.id));
  if (foreign.length) {
    throw new Error(
      "Refusing removal: audit event(s) outside this dataset still reference demo entities " +
        `(${foreign.map((r) => `${r.id}→${r.entity_id}`).join(", ")}). Review them first.`,
    );
  }
}

function main() {
  const dbPath = resolveDbPath();
  if (apply) assertWriteApproved(dbPath, args);
  if (!fs.existsSync(dbPath)) throw new Error(`Database does not exist: ${dbPath}`);

  const { sqlite } = openDatabase({ readonly: !apply });
  try {
    for (const table of ["demo_seed_meta", "audit_events", ...DELETE_ORDER]) {
      if (!tableExists(sqlite, table)) throw new Error(`Missing table ${table}; run npm run db:migrate first.`);
    }

    const manifest = readManifest(sqlite);
    console.log(`AURA scoped demo removal — ${apply ? "APPLY" : "DRY RUN"}`);
    console.log(`Database: ${dbPath}`);
    if (!manifest) {
      console.log(`No ${DATASET_ID} manifest found. Nothing to remove.`);
      return;
    }

    const order = new Map<string, number>(DELETE_ORDER.map((t, i) => [t, i]));
    const rows = manifest.rows
      .filter((r) => order.has(r.table))
      .sort((a, b) => (order.get(a.table) ?? 0) - (order.get(b.table) ?? 0));

    let present = 0;
    for (const row of rows) if (selectByKeys(sqlite, row)) present += 1;
    console.log(`Manifest: ${manifest.rows.length} recorded rows, ${present} still present.`);
    for (const table of [...new Set(rows.map((r) => r.table))]) {
      const count = rows.filter((r) => r.table === table).length;
      console.log(`  ${table.padEnd(24)} ${String(count).padStart(2)}`);
    }

    if (!apply) {
      console.log("\nNo changes were written. Re-run with --apply to remove exactly these rows.");
      return;
    }

    const transaction = sqlite.transaction(() => {
      assertNoForeignAuditReferences(sqlite);
      let deleted = 0;
      for (const row of rows) deleted += deleteByKeys(sqlite, row);

      const violations = sqlite.pragma("foreign_key_check") as unknown[];
      if (violations.length) {
        throw new Error(`Removal would break foreign-key integrity (${violations.length} violation(s)); rolled back.`);
      }

      sqlite.prepare("DELETE FROM demo_seed_meta WHERE key = ?").run(DATASET_ID);
      return deleted;
    });

    const deleted = transaction.immediate();
    console.log(`\nRemoved ${deleted} demo rows in one transaction. Manifest deleted.`);
    console.log("Verify with: npm run demo:verify (it should report a missing manifest).");
  } finally {
    sqlite.close();
  }
}

try {
  main();
} catch (error) {
  console.error("Demo removal failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
