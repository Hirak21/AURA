/** Role-appropriate post-sign-in destinations. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultLanding } from "../lib/auth";

test("admin roles land in Core OS", () => {
  for (const role of ["admin", "curator", "liaison", "organizer", "custodian"]) {
    assert.equal(defaultLanding([role]), "/admin", role);
  }
});

test("mentor and reviewer land in the mentor workspace", () => {
  assert.equal(defaultLanding(["mentor"]), "/mentor");
  assert.equal(defaultLanding(["reviewer"]), "/mentor");
});

test("students land in the learner workspace", () => {
  assert.equal(defaultLanding(["student"]), "/app");
  assert.equal(defaultLanding([]), "/app");
});

test("admin wins when a user holds several roles", () => {
  assert.equal(defaultLanding(["student", "mentor", "admin"]), "/admin");
});
