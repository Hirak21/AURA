import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./security/password";

/**
 * Invite-only registration.
 *
 * Security properties:
 * - The database stores only SHA-256(code); a leaked DB cannot be replayed.
 * - Codes are compared by digest through an indexed lookup (no string timing
 *   loop needed here: the value is high-entropy and never echoed back).
 * - Redemption is claimed with one conditional UPDATE inside a transaction,
 *   so two simultaneous requests cannot both spend a single-use code.
 * - New accounts always receive the `student` role. An invite can never grant
 *   admin/staff privileges; promotion is a separate, audited admin action.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const INVALID_CODE =
  "This invite is invalid, expired, already used, or restricted to another email address.";

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashInviteCode(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
}

export function formatInviteCode(raw: string): string {
  const n = normalizeInviteCode(raw);
  return n.length === 12 ? `${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8)}` : n;
}

/** 12 characters from a 32-symbol alphabet (~60 bits of entropy). */
export function generateInviteCode(): string {
  let out = "";
  for (const byte of randomBytes(12)) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return formatInviteCode(out);
}

export interface SignupInput {
  code: string;
  name: string;
  email: string;
  password: string;
  confirm: string;
}

export function validateSignupInput(input: SignupInput): string | null {
  const code = normalizeInviteCode(input.code ?? "");
  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  const password = input.password ?? "";

  if (code.length < 8 || code.length > 64) return "Enter a valid invite code.";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  if (name.length < 2 || name.length > 80) return "Enter your name (2–80 characters).";
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (password !== input.confirm) return "Passwords do not match.";
  return null;
}

interface InviteRow {
  id: string;
  email: string | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked_at: string | null;
}

export type RedeemResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Validate and redeem an invite, creating a student account and a session-ready
 * user. Caller is responsible for rate limiting and for calling createSession().
 */
export function redeemInvite(sqlite: Database, input: SignupInput): RedeemResult {
  const validationError = validateSignupInput(input);
  if (validationError) return { ok: false, error: validationError };

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().replace(/\s+/g, " ");
  const codeHash = hashInviteCode(normalizeInviteCode(input.code));
  const now = new Date().toISOString();

  // Cheap validation first: scrypt is expensive and synchronous, so never run
  // it for a junk invite code. The authoritative claim still happens inside
  // the transaction below, so this pre-check cannot be raced into a bypass.
  const invite = sqlite
    .prepare(
      "SELECT id, email, max_uses, uses, expires_at, revoked_at FROM invites WHERE code_hash = ?",
    )
    .get(codeHash) as InviteRow | undefined;

  if (!invite || invite.revoked_at || invite.expires_at <= now || invite.uses >= invite.max_uses) {
    return { ok: false, error: INVALID_CODE };
  }
  if (invite.email && invite.email.toLowerCase() !== email) {
    return { ok: false, error: INVALID_CODE };
  }
  const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return { ok: false, error: "An account with this email already exists. Please sign in instead." };
  }

  const tx = sqlite.transaction((): RedeemResult => {
    const current = sqlite
      .prepare(
        "SELECT id, email, max_uses, uses, expires_at, revoked_at FROM invites WHERE code_hash = ?",
      )
      .get(codeHash) as InviteRow | undefined;

    if (!current || current.revoked_at || current.expires_at <= now || current.uses >= current.max_uses) {
      return { ok: false, error: INVALID_CODE };
    }
    if (current.email && current.email.toLowerCase() !== email) {
      return { ok: false, error: INVALID_CODE };
    }
    if (sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      return { ok: false, error: "An account with this email already exists. Please sign in instead." };
    }

    // scrypt runs only for a valid-looking invite, and inside the transaction
    // to keep the write atomic. SQLite is single-writer so this cannot race.
    const passwordHash = hashPassword(input.password);
    if (existing) {
      return { ok: false, error: "An account with this email already exists. Please sign in instead." };
    }

    // Atomic claim: the WHERE clause makes this a compare-and-swap.
    const claim = sqlite
      .prepare(
        "UPDATE invites SET uses = uses + 1 WHERE id = ? AND uses < max_uses AND revoked_at IS NULL AND expires_at > ?",
      )
      .run(current.id, now);
    if (claim.changes !== 1) return { ok: false, error: INVALID_CODE };

    const userId = `u-${randomUUID()}`;
    sqlite
      .prepare(
        "INSERT INTO users (id, display_name, email, status, preferred_level, learning_goal, is_demo, password_hash, password_updated_at, created_at) VALUES (?, ?, ?, 'active', 'beginner', NULL, 0, ?, ?, ?)",
      )
      .run(userId, name, email, passwordHash, now, now);
    sqlite.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, 'student')").run(userId);
    sqlite
      .prepare(
        "INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, 'user.registered_with_invite', 'user', ?, ?, ?)",
      )
      .run(randomUUID(), userId, userId, JSON.stringify({ inviteId: current.id }), now);

    return { ok: true, userId };
  });

  return tx();
}
