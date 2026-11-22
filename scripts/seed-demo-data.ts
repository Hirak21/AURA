/**
 * Add the opt-in production demo dataset.
 *
 * Dry-run by default. Writes require --apply, and a production-looking target
 * additionally requires --production-approved. Existing rows are never
 * overwritten: identical rows are skipped, differing rows abort the run.
 */
import fs from "node:fs";
import { DATASET_ID, DATASET_VERSION, buildDemoDataset } from "./demo-dataset";
import {
  assertWriteApproved,
  openDatabase,
  resolveDbPath,
} from "./_db";
import {
  insertRow,
  preflight,
  readManifest,
  selectByKeys,
  tableExists,
  writeManifest,
  type SeedPlan,
} from "./_demo-store";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply") && !args.has("--dry-run");

function parseAsOf() {
  const raw = process.env.AURA_DEMO_AS_OF;
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid AURA_DEMO_AS_OF: ${raw}`);
  return parsed;
}

function printPlan(plan: SeedPlan, dbPath: string, asOf: string, apply: boolean) {
  const inserted = Object.values(plan).reduce((n, e) => n + e.insert, 0);
  const skipped = Object.values(plan).reduce((n, e) => n + e.skip, 0);

  console.log(`AURA production demo seed — ${apply ? "APPLY" : "DRY RUN"}`);
  console.log(`Dataset: ${DATASET_ID} v${DATASET_VERSION}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Anchor: ${asOf}`);
  console.log("");
  for (const table of Object.keys(plan).sort()) {
    const { insert, skip } = plan[table];
    console.log(`  ${table.padEnd(24)} insert ${String(insert).padStart(2)}  skip ${String(skip).padStart(2)}`);
  }
  console.log("");
  console.log(`Total: ${inserted} to insert, ${skipped} already present and identical.`);
  if (!apply) console.log("No changes were written. Re-run with --apply to commit this exact plan.");
}

function main() {
  const dbPath = resolveDbPath();
  if (apply) assertWriteApproved(dbPath, args);
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database does not exist: ${dbPath}. Run npm run db:init first.`);
  }

  const { sqlite } = openDatabase({ readonly: !apply });
  try {
    if (!tableExists(sqlite, "demo_seed_meta")) {
      throw new Error("Missing table demo_seed_meta. Run npm run db:migrate first.");
    }
    const storedManifest = readManifest(sqlite);

    // Once a dataset is applied, reuse its stored anchor. Otherwise a rerun
    // with a fresh timestamp would look like a content conflict rather than a
    // no-op, which would break idempotence for ordinary operators.
    const sameDataset =
      storedManifest?.datasetId === DATASET_ID && storedManifest.version === DATASET_VERSION;
    const asOfDate = sameDataset ? new Date(storedManifest.generatedAt) : parseAsOf();
    if (Number.isNaN(asOfDate.getTime())) throw new Error("Stored demo manifest has an invalid timestamp.");
    const dataset = buildDemoDataset(asOfDate);

    const requiredTables = [...new Set(dataset.rows.map((r) => r.table)), "demo_seed_meta"];
    const missing = requiredTables.filter((t) => !tableExists(sqlite, t));
    if (missing.length) {
      throw new Error(`Missing tables: ${missing.join(", ")}. Run npm run db:migrate first.`);
    }

    if (!apply) {
      const plan = preflight(sqlite, dataset.rows);
      printPlan(plan, dbPath, dataset.asOf, false);
      if (storedManifest?.datasetId === DATASET_ID && storedManifest.version === DATASET_VERSION) {
        console.log("Manifest: already present; --apply will refresh the manifest timestamp only if rows are missing.");
      } else {
        console.log("Manifest: not present or different version; --apply will record one.");
      }
      console.log("\nWorkflow preview: learning → assessment → project → mentor review → showcase → event/hardware.");
      return;
    }

    const transaction = sqlite.transaction(() => {
      const plan = preflight(sqlite, dataset.rows);
      for (const row of dataset.rows) {
        if (!selectByKeys(sqlite, row)) insertRow(sqlite, row);
      }

      const allSkipped = Object.values(plan).every((e) => e.insert === 0);
      const manifest =
        allSkipped &&
        storedManifest?.datasetId === DATASET_ID &&
        storedManifest.version === DATASET_VERSION
          ? storedManifest
          : dataset.manifest;
      writeManifest(sqlite, manifest);
      return plan;
    });

    const plan = transaction.immediate();
    printPlan(plan, dbPath, dataset.asOf, true);
    console.log("\nCommitted in one transaction. Verify with: npm run demo:verify");
  } finally {
    sqlite.close();
  }
}

try {
  main();
} catch (error) {
  console.error("Demo seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
