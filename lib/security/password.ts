import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the production credentials fallback.
 *
 * Format: scrypt$N$r$p$salt$hash (base64url). Node's built-in scrypt is used
 * deliberately: no native dependency, no external service, and the parameters
 * below are the OWASP-recommended baseline (N=2^14, r=8, p=1).
 *
 * This module is server-only in practice (it imports node:crypto), but it has
 * no Next.js imports so scripts/ and tests/ can use it too.
 */

const N = 16_384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export function hashPassword(password: string): string {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // Refuse absurd parameters rather than allocating unbounded memory.
  if (n > 1_048_576 || r > 32 || p > 16) return false;

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    const actual = scryptSync(password.normalize("NFKC"), salt, expected.length, { N: n, r, p });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** A 256-bit opaque session token. Only its SHA-256 digest is stored. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Stable, non-reversible client identifier for the session audit row. */
export function hashClientHint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
