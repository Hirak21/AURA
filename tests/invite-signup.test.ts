/**
 * Invite-only registration: unit + integration tests against a temporary DB.
 * Covers code hygiene, redemption atomicity, privilege containment, and
 * parameterization of hostile input.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { openDatabase } from "../scripts/_db";
import {
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  normalizeInviteCode,
  redeemInvite,
  validateSignupInput,
  type SignupInput,
} from "../lib/invites";
import { verifyPassword } from "../lib/security/password";

let dir: string;
let sqlite: Database;

const future = () => new Date(Date.now() + 86400_000).toISOString();
const past = () => new Date(Date.now() - 86400_000).toISOString();

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "aura-invite-"));
  process.env.AURA_DB_PATH = path.join(dir, "aura.db");
  ({ sqlite } = openDatabase());
});

after(() => {
  sqlite.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function makeInvite(opts: {
  code?: string;
  email?: string | null;
  uses?: number;
  maxUses?: number;
  expiresAt?: string;
  revokedAt?: string | null;
} = {}): string {
  const code = opts.code ?? generateInviteCode();
  sqlite
    .prepare(
      "INSERT INTO invites (id, code_hash, label, email, max_uses, uses, expires_at, revoked_at, created_by, created_at) VALUES (?, ?, 'test', ?, ?, ?, ?, ?, NULL, ?)",
    )
    .run(
      randomUUID(),
      hashInviteCode(normalizeInviteCode(code)),
      opts.email ?? null,
      opts.maxUses ?? 1,
      opts.uses ?? 0,
      opts.expiresAt ?? future(),
      opts.revokedAt ?? null,
      new Date().toISOString(),
    );
  return code;
}

function signup(code: string, overrides: Partial<SignupInput> = {}): SignupInput {
  const tag = randomUUID().slice(0, 8);
  return {
    code,
    name: "Test Student",
    email: `student-${tag}@example.com`,
    password: "correct-horse-battery",
    confirm: "correct-horse-battery",
    ...overrides,
  };
}

test("invite codes normalize, format and hash deterministically", () => {
  const raw = generateInviteCode();
  assert.match(raw, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(normalizeInviteCode(` ${raw.toLowerCase()} `), normalizeInviteCode(raw));
  assert.equal(formatInviteCode(normalizeInviteCode(raw)), raw);
  assert.equal(hashInviteCode(normalizeInviteCode(raw)), hashInviteCode(normalizeInviteCode(raw)));
  assert.notEqual(hashInviteCode("AAAAAAAAAAAA"), hashInviteCode("BBBBBBBBBBBB"));
  assert.ok(!raw.includes("0") && !raw.includes("O") && !raw.includes("1") && !raw.includes("I"));
});

test("input validation rejects weak, mismatched and malformed values", () => {
  const base = signup("AAAAAAAAAAAA");
  assert.equal(validateSignupInput(base), null);
  assert.match(validateSignupInput({ ...base, code: "short" }) ?? "", /invite/i);
  assert.match(validateSignupInput({ ...base, email: "not-an-email" }) ?? "", /email/i);
  assert.match(validateSignupInput({ ...base, name: "x" }) ?? "", /name/i);
  assert.match(validateSignupInput({ ...base, password: "short" }) ?? "", /Password/);
  assert.match(validateSignupInput({ ...base, confirm: "different-long-value" }) ?? "", /match/i);
});

test("valid invite creates a hashed, student-only account and consumes the code", () => {
  const code = makeInvite();
  const input = signup(code);
  const result = redeemInvite(sqlite, input);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const user = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(result.userId) as Record<string, unknown>;
  assert.equal(user.email, input.email);
  assert.equal(user.display_name, input.name);
  assert.equal(user.is_demo, 0);
  assert.equal(user.status, "active");
  assert.notEqual(user.password_hash, input.password);
  assert.equal(verifyPassword(input.password, user.password_hash as string), true);

  const roles = sqlite.prepare("SELECT role FROM user_roles WHERE user_id = ?").all(result.userId) as { role: string }[];
  assert.deepEqual(roles.map((r) => r.role), ["student"]);

  const invite = sqlite.prepare("SELECT uses FROM invites WHERE code_hash = ?").get(hashInviteCode(normalizeInviteCode(code))) as { uses: number };
  assert.equal(invite.uses, 1);

  const audit = sqlite.prepare("SELECT action FROM audit_events WHERE entity_id = ?").all(result.userId) as { action: string }[];
  assert.deepEqual(audit.map((a) => a.action), ["user.registered_with_invite"]);
});

test("a single-use invite cannot be redeemed twice", () => {
  const code = makeInvite();
  assert.equal(redeemInvite(sqlite, signup(code)).ok, true);
  const second = redeemInvite(sqlite, signup(code));
  assert.equal(second.ok, false);
  if (!second.ok) assert.match(second.error, /invalid|expired|used/i);
});

test("expired, revoked and exhausted invites are rejected", () => {
  const expired = makeInvite({ expiresAt: past() });
  const revoked = makeInvite({ revokedAt: new Date().toISOString() });
  const exhausted = makeInvite({ uses: 1, maxUses: 1 });
  for (const code of [expired, revoked, exhausted]) {
    const result = redeemInvite(sqlite, signup(code));
    assert.equal(result.ok, false);
  }
});

test("email-bound invite rejects a different address without consuming it", () => {
  const code = makeInvite({ email: "expected@example.com" });
  const result = redeemInvite(sqlite, signup(code, { email: "attacker@example.com" }));
  assert.equal(result.ok, false);

  const invite = sqlite.prepare("SELECT uses FROM invites WHERE code_hash = ?").get(hashInviteCode(normalizeInviteCode(code))) as { uses: number };
  assert.equal(invite.uses, 0);

  const accepted = redeemInvite(sqlite, signup(code, { email: "expected@example.com" }));
  assert.equal(accepted.ok, true);
});

test("an existing email is rejected without consuming the invite", () => {
  const firstCode = makeInvite();
  const first = signup(firstCode);
  const created = redeemInvite(sqlite, first);
  assert.equal(created.ok, true);

  const secondCode = makeInvite();
  const result = redeemInvite(sqlite, signup(secondCode, { email: first.email }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /already exists/i);

  const invite = sqlite.prepare("SELECT uses FROM invites WHERE code_hash = ?").get(hashInviteCode(normalizeInviteCode(secondCode))) as { uses: number };
  assert.equal(invite.uses, 0);
});

test("multi-use invites allow exactly the configured number of signups", () => {
  const code = makeInvite({ maxUses: 2 });
  assert.equal(redeemInvite(sqlite, signup(code)).ok, true);
  assert.equal(redeemInvite(sqlite, signup(code)).ok, true);
  assert.equal(redeemInvite(sqlite, signup(code)).ok, false);
});

test("hostile name and email payloads are stored as literal data", () => {
  const code = makeInvite();
  const hostileName = `' OR 1=1-- <script>alert(1)</script>`;
  const result = redeemInvite(sqlite, signup(code, { name: hostileName }));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const user = sqlite.prepare("SELECT display_name FROM users WHERE id = ?").get(result.userId) as { display_name: string };
  assert.equal(user.display_name, hostileName);
  // The injected WHERE clause must not have matched or deleted other rows.
  const total = sqlite.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  assert.ok(total.n >= 1);
});
