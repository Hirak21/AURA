/**
 * Regression guard for post-authentication redirects.
 *
 * A leading slash is not sufficient to make a redirect local: browsers
 * normalise `//evil.com` and `/\evil.com` into an off-origin URL. Both the
 * login page and the sign-in actions must funnel `next` through safeNext().
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../lib/navigation";
import fs from "node:fs";
import path from "node:path";

test("safeNext accepts local paths with query and fragment", () => {
  assert.equal(safeNext("/app"), "/app");
  assert.equal(safeNext("/admin?tab=events#list"), "/admin?tab=events#list");
  assert.equal(safeNext("/"), "/");
  // Percent-encoded separators stay encoded in URL.pathname; browsers cannot
  // turn them into a scheme-relative redirect, so they are same-origin.
  assert.equal(safeNext("/%5Cevil.com"), "/%5Cevil.com");
});

test("safeNext rejects cross-origin and obfuscated targets", () => {
  for (const bad of [
    "//evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/app\nX-Evil: 1",
    "/app\tbad",
    "/app\x00bad",
    "",
  ]) {
    assert.equal(safeNext(bad), "/app", `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test("safeNext honours a custom fallback", () => {
  assert.equal(safeNext("//evil.com", "/mentor"), "/mentor");
});

test("login page and sign-in actions do not use raw next checks", () => {
  for (const file of ["app/login/page.tsx", "actions/session.ts"]) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.match(source, /safeNext\(/, `${file} must call safeNext()`);
    assert.doesNotMatch(
      source,
      /startsWith\("\/\/"\)/,
      `${file} still has the bypassable leading-slash-only check`,
    );
  }
});
