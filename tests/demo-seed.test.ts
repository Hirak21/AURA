import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tutorResponseSchema } from "../lib/domain/types";
import { IDS } from "../lib/db/seed";
import {
  DATASET_ID,
  DELETE_ORDER,
  REQUIRED_REFERENCES,
  buildDemoDataset,
} from "../scripts/demo-dataset";

const AS_OF = new Date("2026-11-23T10:00:00.000Z");
const dataset = buildDemoDataset(AS_OF);

test("demo dataset is deterministic for a fixed anchor", () => {
  const again = buildDemoDataset(AS_OF);
  assert.deepEqual(again.rows, dataset.rows);
  assert.deepEqual(again.manifest, dataset.manifest);
});

test("demo dataset never uses random identifiers", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "scripts/demo-dataset.ts"), "utf8");
  assert.doesNotMatch(source, /randomUUID|Math\.random/);
});

test("row keys are unique within each table", () => {
  const seen = new Map<string, Set<string>>();
  for (const row of dataset.rows) {
    const set = seen.get(row.table) ?? new Set<string>();
    const key = JSON.stringify(row.keys);
    assert.equal(set.has(key), false, `duplicate key in ${row.table}: ${key}`);
    set.add(key);
    seen.set(row.table, set);
  }
});

test("dataset only writes to tables created by the migration", () => {
  const migration = fs.readFileSync(path.join(process.cwd(), "lib/db/migrate.ts"), "utf8");
  for (const table of new Set(dataset.rows.map((r) => r.table))) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
  }
  for (const table of DELETE_ORDER) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(`));
  }
});

test("dataset does not create users or store credentials", () => {
  assert.equal(dataset.rows.some((r) => r.table === "users"), false);
  assert.equal(dataset.rows.some((r) => r.table === "user_roles"), false);
  for (const row of dataset.rows) {
    for (const key of Object.keys(row.values)) {
      assert.doesNotMatch(key, /password|secret|token/i);
    }
  }
});

test("tutor content is schema-valid and labelled as demo", () => {
  const tutorRows = dataset.rows.filter((r) => r.table === "tutor_messages" && r.values.role === "tutor");
  assert.ok(tutorRows.length >= 2);
  for (const row of tutorRows) {
    const parsed = tutorResponseSchema.parse(JSON.parse(String(row.values.content)));
    assert.equal(parsed.provider, "demo");
    assert.equal(parsed.sources.every((s) => s.isDemo), true);
  }
});

test("referenced catalogue ids match the shipped baseline seed", () => {
  assert.deepEqual(
    REQUIRED_REFERENCES.topics.map((t) => t.id),
    [IDS.topics.ohm, IDS.topics.series, IDS.topics.fractions, IDS.topics.newton, IDS.topics.algebra],
  );
  assert.equal(REQUIRED_REFERENCES.challenges[0].id, IDS.challenge);
  assert.deepEqual(REQUIRED_REFERENCES.events.map((e) => e.id), [IDS.events.soldering, IDS.events.schoolVisit]);
});

test("manifest records every row with a hash", () => {
  assert.equal(dataset.manifest.datasetId, DATASET_ID);
  assert.equal(dataset.manifest.rows.length, dataset.rows.length);
  for (const row of dataset.manifest.rows) {
    assert.match(row.hash, /^[a-f0-9]{64}$/);
    assert.ok(row.columns.length > 0);
  }
});
