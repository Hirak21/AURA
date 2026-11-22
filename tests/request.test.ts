/**
 * Regression guard: proxy-supplied IP headers must be opt-in.
 *
 * The production nginx config overwrites X-Forwarded-For with $remote_addr,
 * so deployment sets AURA_TRUST_PROXY=true. With the flag unset (direct
 * exposure, local dev, previews) a client-controlled header must be ignored
 * or every per-IP rate limit is trivially bypassable.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/request";

const spoofed = new Headers({
  "x-forwarded-for": "1.2.3.4, 5.6.7.8",
  "x-real-ip": "9.10.11.12",
});

test("spoofed forwarded headers are ignored when proxy trust is not opted in", () => {
  const prior = process.env.AURA_TRUST_PROXY;
  try {
    delete process.env.AURA_TRUST_PROXY;
    assert.equal(clientIp(spoofed), "local");
    process.env.AURA_TRUST_PROXY = "false";
    assert.equal(clientIp(spoofed), "local");
  } finally {
    if (prior === undefined) delete process.env.AURA_TRUST_PROXY;
    else process.env.AURA_TRUST_PROXY = prior;
  }
});

test("forwarded headers are used when proxy trust is explicitly enabled", () => {
  const prior = process.env.AURA_TRUST_PROXY;
  try {
    process.env.AURA_TRUST_PROXY = "true";
    assert.equal(clientIp(spoofed), "1.2.3.4");
    assert.equal(clientIp(new Headers({ "x-real-ip": "9.10.11.12" })), "9.10.11.12");
  } finally {
    if (prior === undefined) delete process.env.AURA_TRUST_PROXY;
    else process.env.AURA_TRUST_PROXY = prior;
  }
});

test("no headers yields local regardless of trust setting", () => {
  const prior = process.env.AURA_TRUST_PROXY;
  try {
    process.env.AURA_TRUST_PROXY = "true";
    assert.equal(clientIp(new Headers()), "local");
  } finally {
    if (prior === undefined) delete process.env.AURA_TRUST_PROXY;
    else process.env.AURA_TRUST_PROXY = prior;
  }
});
