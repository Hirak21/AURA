import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "./db/client";
import { eq } from "drizzle-orm";
import type { Role } from "./domain/types";
import { ROLES } from "./domain/types";
import { hashClientHint, hashSessionToken, newSessionToken } from "./security/password";
import { userAgent } from "./request";

export const SESSION_COOKIE = "aura_session";
export const SESSION_TTL_DAYS = 14;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const LAST_SEEN_WRITE_MS = 60 * 60 * 1000;

/**
 * Demo mode is an explicit, opt-in affordance for the competition/demo build.
 * Production deployments must set AURA_DEMO_MODE=false and create real users
 * with `npm run user:create`. The default is "on in development, off in
 * production" so a deployed server never silently accepts a demo identity.
 */
export const DEMO_MODE =
  process.env.AURA_DEMO_MODE === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.AURA_DEMO_MODE !== "false");

export const DEMO_USERS = [
  { id: "u-ananya", name: "Ananya Baruah", roleLabel: "Student", roles: ["student"] },
  { id: "u-kabir", name: "Kabir Ahmed", roleLabel: "Mentor", roles: ["mentor", "reviewer"] },
  { id: "u-jyoti", name: "Jyoti Nath", roleLabel: "Admin", roles: ["admin", "curator"] },
  { id: "u-devika", name: "Devika Sharma", roleLabel: "School Liaison", roles: ["liaison", "organizer"] },
  { id: "u-ishaan", name: "Ishaan Gogoi", roleLabel: "Custodian", roles: ["custodian"] },
] as const;

export interface SessionUser {
  id: string;
  displayName: string;
  email: string;
  preferredLevel: "beginner" | "intermediate" | "advanced";
  learningGoal: string | null;
  roles: Role[];
}

function cookieSecure() {
  if (process.env.AURA_COOKIE_SECURE === "true") return true;
  if (process.env.AURA_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** Create a server-side session and set the opaque cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  const id = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const requestHeaders = await headers();

  db.insert(schema.sessions)
    .values({
      id,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastSeenAt: now.toISOString(),
      userAgent: userAgent(requestHeaders),
      ipHash: hashClientHint(requestHeaders.get("x-forwarded-for") ?? "local"),
    })
    .run();

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/** Revoke the current session (row + cookie). Safe to call when signed out. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, hashSessionToken(token))).run();
  }
  store.delete(SESSION_COOKIE);
}

/** Revoke every session for a user (password change, suspension, incident). */
export function revokeAllSessions(userId: string): void {
  db.delete(schema.sessions).where(eq(schema.sessions.userId, userId)).run();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashSessionToken(token);
  const session = db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).all()[0];
  if (!session) return null;

  const now = new Date();
  if (new Date(session.expiresAt).getTime() <= now.getTime()) {
    db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
    return null;
  }

  const found = db.select().from(schema.users).where(eq(schema.users.id, session.userId)).all()[0];
  if (!found || found.status !== "active") {
    db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
    return null;
  }

  // Touch at most once an hour: avoids a write on every page render.
  if (now.getTime() - new Date(session.lastSeenAt).getTime() > LAST_SEEN_WRITE_MS) {
    db.update(schema.sessions)
      .set({ lastSeenAt: now.toISOString() })
      .where(eq(schema.sessions.id, id))
      .run();
  }

  const roles = db
    .select()
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, found.id))
    .all()
    .map((r) => r.role)
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));

  return {
    id: found.id,
    displayName: found.displayName,
    email: found.email,
    preferredLevel: found.preferredLevel,
    learningGoal: found.learningGoal,
    roles,
  };
}

export function hasRole(user: SessionUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
}

export function canAccessWorkspace(user: SessionUser | null): boolean {
  return hasRole(user, "mentor", "reviewer", "admin", "curator", "liaison", "organizer", "custodian");
}

/** Thrown by server actions when the actor lacks permission. */
export class PermissionError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new PermissionError("Sign in required.");
  return u;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!hasRole(u, ...roles)) throw new PermissionError();
  return u;
}

/**
 * Page-level guard: unlike requireRole() (used in server actions, where an
 * error message should reach the caller), a page must never 500 on a
 * permission mismatch — it redirects to a route the user can actually use.
 */
export async function requireRolePage(...roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, ...roles)) redirect("/app?denied=1");
  return user;
}
