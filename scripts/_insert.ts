import type { Database } from "better-sqlite3";

const toSnake = (s: string) => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());

/** Insert seed rows, mapping camelCase object keys → snake_case columns. */
export function insertRows(sqlite: Database, table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]).map(toSnake);
  const stmt = sqlite.prepare(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")})`,
  );
  const tx = sqlite.transaction((all: Record<string, unknown>[]) => {
    for (const r of all) {
      const mapped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        mapped[toSnake(k)] = typeof v === "boolean" ? (v ? 1 : 0) : v;
      }
      stmt.run(mapped);
    }
  });
  tx(rows);
}
