/**
 * Structural guard for Next.js "use server" modules.
 *
 * A "use server" file may ONLY export async functions. Exporting a const,
 * schema object, class or helper compiles fine but throws at runtime with
 * "A 'use server' file can only export async functions, found object."
 *
 * This test parses every actions/*.ts file and fails if any export is not an
 * async function. It exists because that bug is invisible to `tsc` and can
 * survive a dev-mode page that happens not to hit the module.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ACTIONS_DIR = path.join(process.cwd(), "actions");

test("every actions/*.ts file declares 'use server'", () => {
  const files = fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length > 0, "expected at least one server action module");
  for (const f of files) {
    const src = fs.readFileSync(path.join(ACTIONS_DIR, f), "utf8");
    assert.ok(src.trimStart().startsWith('"use server"'), `${f} must start with "use server"`);
  }
});

test("server action modules export only async functions", () => {
  const files = fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const src = fs.readFileSync(path.join(ACTIONS_DIR, f), "utf8");
    const exportLines = src.split("\n").filter((l) => /^export\s+/.test(l.trim()));

    for (const line of exportLines) {
      const isAsyncFn = /^export\s+async\s+function\s+/.test(line.trim());
      const isTypeOnly =
        /^export\s+(type|interface)\s+/.test(line.trim()) ||
        /^export\s+type\s+.+=\s+/.test(line.trim());

      assert.ok(
        isAsyncFn || isTypeOnly,
        `${f}: illegal export in a "use server" module → ${line.trim()}\n` +
          `Only unexported consts, exported async functions, and exported types are allowed.`,
      );
    }
  }
});

test("no server action module re-exports a zod schema object", () => {
  const files = fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts"));
  for (const f of files) {
    const src = fs.readFileSync(path.join(ACTIONS_DIR, f), "utf8");
    assert.ok(
      !/^export\s+const\s+\w*[Ss]chema/m.test(src),
      `${f}: move zod schemas to lib/domain/schemas.ts — schemas cannot be exported from "use server" files`,
    );
  }
});
