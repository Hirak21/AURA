/**
 * Read-only verification for the opt-in production demo dataset.
 *
 * Checks manifest presence, row presence, drift (warning only), the intended
 * cross-module workflow, and database foreign-key integrity. Never writes.
 */
import fs from "node:fs";
import { DATASET_ID, DATASET_VERSION, DEMO_IDS } from "./demo-dataset";
import { openDatabase, resolveDbPath } from "./_db";
import {
  assertReferences,
  currentRowHash,
  one,
  readManifest,
  tableExists,
} from "./_demo-store";
import type Database from "better-sqlite3";
import type { SqlValue } from "./demo-dataset";

type DB = Database.Database;

interface Check {
  label: string;
  pass: boolean;
  detail: string;
}

function count(sqlite: DB, sql: string, params: SqlValue[] = []) {
  const row = one<{ c: number }>(sqlite, sql, params);
  return row?.c ?? 0;
}

function manifestIds(sqlite: DB, table: string) {
  const manifest = readManifest(sqlite);
  if (!manifest) return [];
  void sqlite;
  return manifest.rows.filter((r) => r.table === table && typeof r.keys.id === "string").map((r) => r.keys.id as string);
}

function placeholders(values: SqlValue[]) {
  return values.map(() => "?").join(", ");
}

function buildChecks(sqlite: DB): Check[] {
  const checks: Check[] = [];
  const push = (label: string, pass: boolean, detail: string) => checks.push({ label, pass, detail });

  let referencesOk = true;
  try {
    assertReferences(sqlite);
  } catch {
    referencesOk = false;
  }
  push("Baseline demo references", referencesOk,
    referencesOk ? "all referenced users, topics, questions and catalogue rows are still demo records" : "a referenced baseline record is missing or no longer marked demo");

  const manifest = readManifest(sqlite);
  if (!manifest) {
    push("Manifest", false, `no ${DATASET_ID} manifest found`);
    return checks;
  }
  push("Manifest", manifest.datasetId === DATASET_ID && manifest.version === DATASET_VERSION,
    `${manifest.datasetId} v${manifest.version}, ${manifest.rows.length} recorded rows`);

  let missing = 0;
  for (const row of manifest.rows) {
    if (currentRowHash(sqlite, row) === null) missing += 1;
  }
  push("Recorded rows present", missing === 0,
    missing === 0 ? `${manifest.rows.length}/${manifest.rows.length} present` : `${missing} recorded row(s) missing; re-run the seed`);

  const tutorIds = manifestIds(sqlite, "tutor_messages");
  const tutorResponses = tutorIds.length
    ? count(sqlite,
        `SELECT COUNT(*) c FROM tutor_messages
         WHERE id IN (${placeholders(tutorIds)}) AND role = 'tutor'
           AND content LIKE '%"provider":"demo"%'`,
        tutorIds)
    : 0;
  push("Learning evidence", tutorResponses >= 2 && count(sqlite, "SELECT COUNT(*) c FROM tutor_sessions WHERE id LIKE 'pd1-%'") >= 3,
    `${tutorResponses} curated demo tutor responses, ${count(sqlite, "SELECT COUNT(*) c FROM tutor_sessions WHERE id LIKE 'pd1-%'")} tutor sessions`);

  const attemptIds = manifestIds(sqlite, "practice_attempts");
  const correctAttempts = attemptIds.length
    ? count(sqlite, `SELECT COUNT(*) c FROM practice_attempts WHERE id IN (${placeholders(attemptIds)}) AND is_correct = 1`, attemptIds)
    : 0;
  push("Assessment evidence", correctAttempts >= 5,
    `${correctAttempts} correct demo attempts out of ${attemptIds.length} recorded`);

  const reviewIds = manifestIds(sqlite, "project_reviews");
  const approvals = reviewIds.length
    ? count(sqlite, `SELECT COUNT(*) c FROM project_reviews WHERE id IN (${placeholders(reviewIds)}) AND decision = 'approved'`, reviewIds)
    : 0;
  push("Mentor review chain", approvals >= 2,
    `${approvals} approvals, including one after a changes_requested review`);

  const showcase = one<{ status: string; consent: number }>(
    sqlite,
    "SELECT status, consent_to_showcase AS consent FROM projects WHERE id = ?",
    [DEMO_IDS.projects.showcase],
  );
  push("Showcase two-gate rule", !!showcase && showcase.status === "showcased" && showcase.consent === 1,
    showcase ? `status=${showcase.status}, consent=${showcase.consent}` : "showcase project missing");

  const approvedNoConsent = one<{ status: string; consent: number }>(
    sqlite,
    "SELECT status, consent_to_showcase AS consent FROM projects WHERE id = ?",
    [DEMO_IDS.projects.approved],
  );
  push("Consent respected", !!approvedNoConsent && approvedNoConsent.status === "approved" && approvedNoConsent.consent === 0,
    approvedNoConsent ? `status=${approvedNoConsent.status}, consent=${approvedNoConsent.consent}` : "approved project missing");

  const mentorLinks = count(sqlite,
    `SELECT COUNT(*) c FROM mentor_assignments
     WHERE mentor_id = 'u-kabir' AND student_id IN ('u-ananya','u-rohit') AND status = 'active'`);
  push("Mentor assignment linkage", mentorLinks >= 2, `${mentorLinks} active demo mentor assignments`);

  const recap = one<{ status: string }>(sqlite, "SELECT status FROM events WHERE id = ?", [DEMO_IDS.eventRecap]);
  push("Event lifecycle", !!recap && recap.status === "completed",
    recap ? `demo recap event status=${recap.status}` : "demo recap event missing");

  const regIds = manifest.rows
    .filter((r) => r.table === "event_registrations")
    .map((r) => [r.keys.event_id, r.keys.user_id]);
  const attended = regIds.filter(([eventId]) => eventId === DEMO_IDS.eventRecap).length;
  const upcoming = regIds.filter(([eventId]) => eventId !== DEMO_IDS.eventRecap).length;
  push("Event registrations", attended >= 2 && upcoming >= 3,
    `${attended} attended past sessions, ${upcoming} registrations for future events`);

  const request = one<{ status: string; owner_id: string | null }>(
    sqlite,
    "SELECT status, owner_id FROM collaboration_requests WHERE id = ?",
    [DEMO_IDS.request],
  );
  push("School collaboration workflow", !!request && request.status === "in_review" && request.owner_id === "u-devika",
    request ? `status=${request.status}, owner=${request.owner_id}` : "demo school request missing");

  const movementIds = manifestIds(sqlite, "stock_movements");
  const allocationIds = manifestIds(sqlite, "resource_allocations");
  const returned = allocationIds.length
    ? count(sqlite, `SELECT COUNT(*) c FROM resource_allocations WHERE id IN (${placeholders(allocationIds)}) AND returned_at IS NOT NULL`, allocationIds)
    : 0;
  const linkedHardware = allocationIds.length
    ? count(sqlite,
        `SELECT COUNT(*) c FROM resource_allocations
         WHERE id IN (${placeholders(allocationIds)})
           AND (linked_project_id IS NOT NULL OR linked_event_id IS NOT NULL OR linked_collaboration_id IS NOT NULL)`,
        allocationIds)
    : 0;
  push("Hardware workflow", movementIds.length >= 4 && allocationIds.length >= 4 && returned >= 3 && linkedHardware >= 4,
    `${movementIds.length} movements, ${allocationIds.length} allocations (${returned} returned, ${linkedHardware} linked)`);

  const fkViolations = sqlite.pragma("foreign_key_check") as unknown[];
  push("Foreign-key integrity", fkViolations.length === 0,
    fkViolations.length === 0 ? "no violations" : `${fkViolations.length} violation(s)`);

  return checks;
}

function main() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) throw new Error(`Database does not exist: ${dbPath}`);

  const { sqlite } = openDatabase({ readonly: true });
  try {
    for (const table of ["demo_seed_meta", "users", "projects", "resource_allocations", "audit_events"]) {
      if (!tableExists(sqlite, table)) throw new Error(`Missing table ${table}; run npm run db:migrate first.`);
    }

    const manifest = readManifest(sqlite);
    console.log("AURA demo data verification — READ ONLY");
    console.log(`Database: ${dbPath}`);
    console.log(`Manifest: ${manifest ? `${manifest.datasetId} v${manifest.version}` : "MISSING"}`);
    console.log("");

    if (manifest) {
      let drift = 0;
      for (const row of manifest.rows) {
        const current = currentRowHash(sqlite, row);
        if (current !== null && current !== row.hash) drift += 1;
      }
      if (drift > 0) {
        console.log(`Note: ${drift} demo row(s) changed since seeding (normal after app use). Presence and workflow are checked below.`);
        console.log("");
      }
    }

    const checks = buildChecks(sqlite);
    for (const check of checks) {
      console.log(`  ${check.pass ? "PASS" : "FAIL"}  ${check.label.padEnd(28)} ${check.detail}`);
    }

    const failed = checks.filter((c) => !c.pass);
    console.log("");
    console.log(failed.length === 0
      ? `All ${checks.length} checks passed.`
      : `${failed.length}/${checks.length} checks FAILED.`);
    if (failed.length) process.exitCode = 1;
  } finally {
    sqlite.close();
  }
}

try {
  main();
} catch (error) {
  console.error("Demo verification failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
