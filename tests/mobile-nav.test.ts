/**
 * Regression guard for the mobile "More" popover.
 *
 * The popover is absolutely positioned above the fixed bottom bar. Adding an
 * overflow utility to that nav makes the browser compute `overflow-y: auto`
 * as well, which clips the popover so it can never be clicked — it passes
 * checkVisibility() but elementFromPoint() returns null. This guard fails in
 * CI instead of on a phone. It exists because this exact bug regressed twice.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(process.cwd(), "components/nav.tsx"), "utf8");

test("fixed workspace nav is never a scroll container", () => {
  const nav = source.match(/<nav\s+aria-label="Workspace"\s+className="([^"]+)"/);
  assert.ok(nav, "expected the fixed Workspace nav element in components/nav.tsx");
  const classes = nav![1] ?? "";
  assert.doesNotMatch(
    classes,
    /\boverflow-(?:x|y|auto|hidden|scroll)\b/,
    "an overflow utility on the nav clips the bottom-full More popover",
  );
});

test("mobile tabs follow the active workspace", () => {
  assert.match(source, /pathname\.startsWith\("\/admin"\)/, "admin context must be detected");
  assert.match(source, /pathname\.startsWith\("\/mentor"\)/, "mentor context must be detected");
  assert.match(
    source,
    /\[\.\.\.context, \.\.\.STUDENT_NAV, \.\.\.other\]/,
    "the active workspace's links must be ordered first",
  );
});

test("More is an accessible stateful disclosure", () => {
  assert.match(source, /type="button"/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=/);
  assert.match(source, /Escape/);
});
