import type Database from "better-sqlite3";
import {
  DATASET_ID,
  REQUIRED_REFERENCES,
  rowHash,
  type DemoManifest,
  type DemoRow,
  type ManifestRow,
  type SqlValue,
} from "./demo-dataset";

type DB = Database.Database;

const SAFE_TABLE = /^[a-z_]+$/;
const SAFE_COLUMN = /^[a-z_][a-z0-9_]*$/;

export interface PlanEntry {
  insert: number;
  skip: number;
}

export type SeedPlan = Record<string, PlanEntry>;

function assertIdentifier(name: string, kind: string) {
  const pattern = kind === "table" ? SAFE_TABLE : SAFE_COLUMN;
  if (!pattern.test(name)) throw new Error(`Unsafe SQL ${kind} identifier: ${name}`);
}

export function tableExists(sqlite: DB, name: string) {
  assertIdentifier(name, "table");
  const row = sqlite
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { ok: number } | undefined;
  return !!row;
}

export function one<T extends Record<string, unknown>>(sqlite: DB, sql: string, params: SqlValue[] = []) {
  return sqlite.prepare(sql).get(...params) as T | undefined;
}

export function selectByKeys(sqlite: DB, row: Pick<DemoRow, "table" | "keys">) {
  assertIdentifier(row.table, "table");
  const cols = Object.keys(row.keys);
  if (cols.length === 0) throw new Error(`No keys supplied for ${row.table}`);
  for (const c of cols) assertIdentifier(c, "column");
  const where = cols.map((c) => `${c} = @${c}`).join(" AND ");
  const params = Object.fromEntries(Object.entries(row.keys).map(([k, v]) => [k, v]));
  return sqlite.prepare(`SELECT * FROM ${row.table} WHERE ${where}`).get(params) as
    | Record<string, SqlValue>
    | undefined;
}

export function samePayload(existing: Record<string, SqlValue>, values: Record<string, SqlValue>) {
  return Object.entries(values).every(([col, value]) => existing[col] === value);
}

/** Unique constraints that are not already the row's declared primary key. */
const UNIQUE_CHECKS: Record<string, string[][]> = {
  users: [["email"]],
  collaboration_requests: [["reference"]],
  inventory_items: [["identifier"]],
  event_registrations: [["event_id", "user_id"]],
};

function describe(row: Pick<DemoRow, "table" | "keys">) {
  return `${row.table} ${JSON.stringify(row.keys)}`;
}

/**
 * Check references, duplicate keys and unique constraints. Never mutates.
 * Called both by dry-run and inside the write transaction.
 */
export function preflight(sqlite: DB, rows: DemoRow[]): SeedPlan {
  assertReferences(sqlite);

  const plan: SeedPlan = {};
  for (const row of rows) {
    const entry = (plan[row.table] ??= { insert: 0, skip: 0 });
    const existing = selectByKeys(sqlite, row);

    if (existing) {
      if (!samePayload(existing, row.values)) {
        throw new Error(
          `Conflict at ${describe(row)}: a row already exists with different values. ` +
            "Refusing to overwrite it (including demo rows).",
        );
      }
      entry.skip += 1;
      continue;
    }

    for (const uniqueCols of UNIQUE_CHECKS[row.table] ?? []) {
      if (!uniqueCols.every((c) => c in row.values)) continue;
      for (const c of uniqueCols) assertIdentifier(c, "column");
      const where = uniqueCols.map((c) => `${c} = @${c}`).join(" AND ");
      const params = Object.fromEntries(uniqueCols.map((c) => [c, row.values[c]]));
      const clash = sqlite
        .prepare(`SELECT * FROM ${row.table} WHERE ${where}`)
        .get(params) as Record<string, SqlValue> | undefined;
      if (clash) {
        throw new Error(
          `Unique conflict at ${describe(row)}: ${uniqueCols.join("+")} is already used by ` +
            `row ${JSON.stringify(Object.fromEntries(Object.keys(row.keys).map((k) => [k, clash[k]])))}.`,
        );
      }
    }

    entry.insert += 1;
  }
  return plan;
}

function requireRow(
  sqlite: DB,
  sql: string,
  params: SqlValue[],
  description: string,
  validate?: (row: Record<string, SqlValue>) => boolean,
) {
  const row = one<Record<string, SqlValue>>(sqlite, sql, params);
  if (!row) throw new Error(`Missing baseline demo record: ${description}. Run npm run db:init first.`);
  if (validate && !validate(row)) {
    throw new Error(`Baseline demo record changed unexpectedly: ${description}. Refusing to attach demo data to it.`);
  }
}

/** Only attach demo activity to records already marked as demo catalogue. */
export function assertReferences(sqlite: DB) {
  for (const ref of REQUIRED_REFERENCES.users) {
    requireRow(sqlite, "SELECT id, is_demo FROM users WHERE id = ?", [ref.id], `user ${ref.id} (${ref.label})`,
      (r) => r.is_demo === 1);
  }
  for (const ref of REQUIRED_REFERENCES.topics) {
    requireRow(sqlite, "SELECT id, title FROM topics WHERE id = ?", [ref.id], `topic ${ref.id}`,
      (r) => r.title === ref.title);
  }
  for (const ref of REQUIRED_REFERENCES.questions) {
    requireRow(sqlite, "SELECT id, topic_id FROM practice_questions WHERE id = ?", [ref.id], `question ${ref.id}`,
      (r) => r.topic_id === ref.topicId);
  }
  for (const ref of REQUIRED_REFERENCES.challenges) {
    requireRow(sqlite, "SELECT id, topic_id FROM challenges WHERE id = ?", [ref.id], `challenge ${ref.id}`,
      (r) => r.topic_id === ref.topicId);
  }
  for (const ref of REQUIRED_REFERENCES.events) {
    requireRow(sqlite, "SELECT id, title, is_demo FROM events WHERE id = ?", [ref.id], `event ${ref.id}`,
      (r) => r.title === ref.title && r.is_demo === 1);
  }
  for (const ref of REQUIRED_REFERENCES.resources) {
    requireRow(sqlite, "SELECT id, topic_id, is_demo FROM resources WHERE id = ?", [ref.id], `resource ${ref.id}`,
      (r) => r.topic_id === ref.topicId && r.is_demo === 1);
  }
  for (const id of REQUIRED_REFERENCES.inventoryItems) {
    requireRow(sqlite, "SELECT id FROM inventory_items WHERE id = ?", [id], `inventory item ${id}`);
  }
  for (const id of REQUIRED_REFERENCES.collaborationRequests) {
    requireRow(sqlite, "SELECT id FROM collaboration_requests WHERE id = ?", [id], `collaboration request ${id}`);
  }
  for (const id of REQUIRED_REFERENCES.schools) {
    requireRow(sqlite, "SELECT id FROM schools WHERE id = ?", [id], `school ${id}`);
  }
}

export function insertRow(sqlite: DB, row: DemoRow) {
  assertIdentifier(row.table, "table");
  const cols = Object.keys(row.values);
  for (const c of cols) assertIdentifier(c, "column");
  sqlite
    .prepare(`INSERT INTO ${row.table} (${cols.join(", ")}) VALUES (${cols.map((c) => `@${c}`).join(", ")})`)
    .run(Object.fromEntries(Object.entries(row.values).map(([k, v]) => [k, v])));
}

export function readManifest(sqlite: DB): DemoManifest | null {
  const row = one<{ value: string }>(sqlite, "SELECT value FROM demo_seed_meta WHERE key = ?", [DATASET_ID]);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.value) as DemoManifest;
    if (parsed.datasetId !== DATASET_ID || !Array.isArray(parsed.rows)) {
      throw new Error("unexpected manifest shape");
    }
    return parsed;
  } catch {
    throw new Error(`Stored demo manifest is invalid (${DATASET_ID}). Refusing to guess what to remove.`);
  }
}

export function writeManifest(sqlite: DB, manifest: DemoManifest) {
  sqlite
    .prepare(
      `INSERT INTO demo_seed_meta (key, value, created_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`,
    )
    .run(DATASET_ID, JSON.stringify(manifest), manifest.generatedAt);
}

/** Current hash for a manifest row, for informational drift reporting. */
export function currentRowHash(sqlite: DB, row: ManifestRow) {
  const existing = selectByKeys(sqlite, row);
  if (!existing) return null;
  const values: Record<string, SqlValue> = {};
  for (const col of row.columns) {
    values[col] = existing[col] ?? null;
  }
  return rowHash({ table: row.table, keys: row.keys, values });
}

export function deleteByKeys(sqlite: DB, row: ManifestRow) {
  assertIdentifier(row.table, "table");
  const cols = Object.keys(row.keys);
  if (cols.length === 0) throw new Error(`No keys supplied for ${row.table}`);
  for (const c of cols) assertIdentifier(c, "column");
  const where = cols.map((c) => `${c} = @${c}`).join(" AND ");
  const params = Object.fromEntries(Object.entries(row.keys).map(([k, v]) => [k, v]));
  return sqlite.prepare(`DELETE FROM ${row.table} WHERE ${where}`).run(params).changes;
}
