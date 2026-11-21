/**
 * Catalogue seeding: must fill the learning tables without touching accounts.
 * Regression guard for the production 500 caused by a schema-only database.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

let dir: string;
let dbPath: string;

function run(script: string, args: string[] = []): string {
  const result = spawnSync("npm", ["run", script, "--", ...args], {
    cwd: process.cwd(),
    env: { ...process.env, AURA_DB_PATH: dbPath },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "aura-catalog-"));
  dbPath = path.join(dir, "aura.db");
  run("db:migrate");
  run("user:create", ["--email", "admin@test.local", "--name", "Admin", "--role", "admin", "--password", "TestAdmin2026!"]);
  run("user:create", ["--email", "student@test.local", "--name", "Student", "--role", "student", "--password", "TestStudent2026!"]);
  run("user:create", ["--email", "mentor@test.local", "--name", "Mentor", "--role", "mentor", "--password", "TestMentor2026!"]);
});

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

test("seeds the catalogue while preserving real accounts", () => {
  const output = run("db:seed-catalog");
  assert.match(output, /Catalogue seeded/);

  const db = new Database(dbPath, { readonly: true });
  const count = (table: string) => (db.prepare(`SELECT COUNT(*) c FROM ${table}`).get() as { c: number }).c;

  assert.ok(count("subjects") > 0);
  assert.ok(count("topics") > 0);
  assert.ok(count("resources") > 0);
  assert.ok(count("practice_questions") > 0);
  assert.equal(count("users"), 3);
  assert.equal(count("user_roles"), 3);
  assert.equal(count("users WHERE email LIKE '%demo.aura.local%'"), 0);
  assert.equal(
    (db.prepare("SELECT COUNT(*) c FROM projects WHERE author_id IN ('u-ananya','u-rohit','u-kabir')").get() as { c: number }).c,
    0,
  );
  db.close();
});

test("re-running the seed is a no-op", () => {
  const output = run("db:seed-catalog");
  assert.match(output, /Nothing to do/);
  const db = new Database(dbPath, { readonly: true });
  assert.ok((db.prepare("SELECT COUNT(*) c FROM topics").get() as { c: number }).c > 0);
  db.close();
});
