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

/**
 * Fixed valid hash used as a decoy when an account or stored hash is missing.
 * Computing a real scrypt against it keeps unknown-account and malformed-hash
 * responses close in timing to real verification, preventing account
 * enumeration by measuring the login response.
 */
const DUMMY_HASH = hashPassword("aura-dummy-password-never-used");

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
  const parts = stored?.split("$");
  const usable =
    parts?.length === 6 &&
    parts[0] === "scrypt" &&
    [parts[1], parts[2], parts[3]].every((v) => Number.isInteger(Number(v)));

  // Always compute a real scrypt. Unknown accounts, missing hashes and
  // malformed hashes use the fixed decoy, so response timing does not reveal
  // whether the email exists. Even a decoy collision can never authenticate.
  const parsed = usable && parts ? parts : DUMMY_HASH.split("$");
  const params = parsed.slice(1, 4).map(Number);
  const [n, r, p] = params;
  const sane =
    n! > 0 && n! <= 1_048_576 && r! > 0 && r! <= 32 && p! > 0 && p! <= 16;
  const source = sane ? parsed : DUMMY_HASH.split("$");
  const [sn, sr, sp] = source.slice(1, 4).map(Number);

  try {
    const salt = Buffer.from(source[4]!, "base64url");
    const expected = Buffer.from(source[5]!, "base64url");
    const actual = scryptSync(password.normalize("NFKC"), salt, expected.length, { N: sn!, r: sr!, p: sp! });
    const matched = expected.length === actual.length && timingSafeEqual(expected, actual);
    return usable && matched;
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
