/**
 * Password verification must still take real scrypt time for unknown or
 * malformed accounts, otherwise login response timing reveals which emails
 * are registered. These tests check both correctness and that property.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/security/password";

test("a valid password verifies and a wrong one does not", () => {
  const hash = hashPassword("correct horse battery staple");
  assert.equal(verifyPassword("correct horse battery staple", hash), true);
  assert.equal(verifyPassword("wrong password entirely", hash), false);
});

test("missing and malformed hashes never authenticate", () => {
  const password = "correct horse battery staple";
  for (const stored of [null, undefined, "", "not-a-hash", "scrypt$1$2$3$bad$bad", "scrypt$99999999$8$1$c2FsdA$aGFzaA"]) {
    assert.equal(verifyPassword(password, stored), false, `expected rejection for ${JSON.stringify(stored)}`);
  }
});

test("unknown-account verification costs roughly the same as a real hash", () => {
  const password = "correct horse battery staple";
  const realHash = hashPassword(password);
  const samples = 5;

  const time = (stored: string | null) => {
    const start = performance.now();
    for (let i = 0; i < samples; i += 1) verifyPassword(password, stored);
    return performance.now() - start;
  };
  const real = time(realHash);
  const unknown = time(null);

  // Allow generous slack for CI jitter; the point is to catch the old
  // early-return (near-zero ms), not to assert exact equality.
  assert.ok(
    unknown > real * 0.25,
    `unknown-account verification was too fast: ${unknown.toFixed(1)}ms vs ${real.toFixed(1)}ms`,
  );
});
