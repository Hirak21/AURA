/**
 * The learner overview must render an honest empty state on a fresh install,
 * not a 500. getPrimaryRecommendation() used to throw when no topics existed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const service = fs.readFileSync(path.join(root, "lib/services/recommendations.ts"), "utf8");
const overview = fs.readFileSync(path.join(root, "app/app/page.tsx"), "utf8");
const practice = fs.readFileSync(path.join(root, "app/app/practice/page.tsx"), "utf8");

test("recommendation service returns null instead of throwing on an empty catalogue", () => {
  assert.match(service, /\} \| null/, "return type must admit an empty catalogue");
  assert.doesNotMatch(service, /throw new Error\("No published topics/, "the 500 must be gone");
  assert.match(service, /if \(!target\) return null;/);
});

test("both callers guard against a missing recommendation", () => {
  assert.match(overview, /primary\?\.recommendation/);
  assert.match(overview, /No learning content published yet/);
  assert.doesNotMatch(overview, /recTopic\.id/, "overview must use the guarded recTopicId");
  assert.match(practice, /primary\?\.recommendation/);
  assert.match(practice, /recommendation\?\.topicId/);
  assert.doesNotMatch(practice, /const \{ recommendation \}/);
  assert.match(practice, /\{recommendation \? \(/);
});
