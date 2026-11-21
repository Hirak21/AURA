/**
 * Create an invite code for self-service student registration.
 *
 * Usage:
 *   npm run invite:create -- --label "GU robotics club"
 *   npm run invite:create -- --email student@example.com --days 14
 *   npm run invite:create -- --uses 5 --label "Workshop attendees"
 *
 * The plaintext code is printed once and is never stored. Only its SHA-256
 * digest is written to the database. Invites always create `student` accounts;
 * privileged roles must be granted separately with `npm run user:create`.
 */
import { randomUUID } from "node:crypto";
import { openDatabase } from "./_db";
import {
  formatInviteCode,
  generateInviteCode,
  hashInviteCode,
  normalizeInviteCode,
} from "../lib/invites";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

const email = (arg("email") ?? "").trim().toLowerCase();
const label = (arg("label") ?? "").trim().slice(0, 120);
const createdByEmail = (arg("created-by") ?? "").trim().toLowerCase();
const uses = Number(arg("uses") ?? "1");
const days = Number(arg("days") ?? "7");

if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("--email must be a valid address.");
  process.exit(1);
}
if (!Number.isInteger(uses) || uses < 1 || uses > 100) {
  console.error("--uses must be an integer between 1 and 100.");
  process.exit(1);
}
if (!Number.isFinite(days) || days < 1 || days > 365) {
  console.error("--days must be a number between 1 and 365.");
  process.exit(1);
}

const { sqlite, dbPath } = openDatabase();
const creator = createdByEmail
  ? (sqlite.prepare("SELECT id FROM users WHERE email = ?").get(createdByEmail) as { id: string } | undefined)
  : undefined;
if (createdByEmail && !creator) {
  console.error(`No user found with email ${createdByEmail}.`);
  sqlite.close();
  process.exit(1);
}

const rawCode = generateInviteCode();
const now = new Date();
const id = randomUUID();
sqlite
  .prepare(
    "INSERT INTO invites (id, code_hash, label, email, max_uses, uses, expires_at, revoked_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)",
  )
  .run(
    id,
    hashInviteCode(normalizeInviteCode(rawCode)),
    label,
    email || null,
    uses,
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
    creator?.id ?? null,
    now.toISOString(),
  );
sqlite.close();

console.log("Invite created");
console.log(`  code:      ${formatInviteCode(rawCode)}  (shown once — store it now)`);
console.log(`  id:        ${id}`);
console.log(`  email:     ${email || "any"}`);
console.log(`  uses:      0 / ${uses}`);
console.log(`  expires:   ${new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()}`);
console.log(`  label:     ${label || "(none)"}`);
console.log(`  signup:    /signup`);
console.log(`  db:        ${dbPath}`);
