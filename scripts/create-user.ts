/**
 * Create or update a real AURA account.
 *
 * Usage:
 *   npm run user:create -- --email head@gu.ac.in --name "Dr A. Example" --role admin
 *   npm run user:create -- --email student@gu.ac.in --name "Student Name" --role student --password '...'
 *
 * If --password is omitted, AURA_NEW_USER_PASSWORD is used; if that is also
 * absent, a random password is generated and printed once.
 *
 * Existing accounts are updated in place (name, password, roles, status) and
 * all their sessions are revoked.
 */
import { randomUUID, randomBytes } from "node:crypto";
import { openDatabase } from "./_db";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../lib/security/password";
import { ROLES, type Role } from "../lib/domain/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

const email = (arg("email") ?? "").trim().toLowerCase();
const name = (arg("name") ?? "").trim();
const roleArgs = (arg("role") ?? "student")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const status = arg("status") === "suspended" ? "suspended" : "active";
const generated = !arg("password") && !process.env.AURA_NEW_USER_PASSWORD;
const password = arg("password") ?? process.env.AURA_NEW_USER_PASSWORD ?? randomBytes(12).toString("base64url");

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Provide a valid --email address.");
  process.exit(1);
}
if (!name || name.length < 2) {
  console.error("Provide --name (at least 2 characters).");
  process.exit(1);
}
if (password.length < PASSWORD_MIN_LENGTH) {
  console.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  process.exit(1);
}
const roles = roleArgs.filter((r): r is Role => (ROLES as readonly string[]).includes(r));
if (roles.length !== roleArgs.length || roles.length === 0) {
  console.error(`--role must be one or more of: ${ROLES.join(", ")}`);
  process.exit(1);
}

const { sqlite, dbPath } = openDatabase();
const now = new Date().toISOString();
const passwordHash = hashPassword(password);

const existing = sqlite.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
const userId = existing?.id ?? `u-${randomUUID()}`;

const tx = sqlite.transaction(() => {
  if (existing) {
    sqlite
      .prepare(
        "UPDATE users SET display_name = ?, status = ?, password_hash = ?, password_updated_at = ?, is_demo = 0 WHERE id = ?",
      )
      .run(name, status, passwordHash, now, userId);
    sqlite.prepare("DELETE FROM user_roles WHERE user_id = ?").run(userId);
    sqlite.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  } else {
    sqlite
      .prepare(
        "INSERT INTO users (id, display_name, email, status, preferred_level, learning_goal, is_demo, password_hash, password_updated_at, created_at) VALUES (?, ?, ?, ?, 'beginner', NULL, 0, ?, ?, ?)",
      )
      .run(userId, name, email, status, passwordHash, now, now);
  }

  const insertRole = sqlite.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?)");
  for (const role of roles) insertRole.run(userId, role);

  sqlite
    .prepare(
      "INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, metadata_json, created_at) VALUES (?, ?, ?, 'user', ?, ?, ?)",
    )
    .run(
      randomUUID(),
      userId,
      existing ? "user.updated_by_cli" : "user.created_by_cli",
      userId,
      JSON.stringify({ roles, status }),
      now,
    );
});

tx();
sqlite.close();

console.log(existing ? "Updated account" : "Created account");
console.log(`  id:      ${userId}`);
console.log(`  email:   ${email}`);
console.log(`  name:    ${name}`);
console.log(`  roles:   ${roles.join(", ")}`);
console.log(`  status:  ${status}`);
console.log(`  db:      ${dbPath}`);
if (generated) console.log(`  password: ${password}  (shown once — store it now)`);
