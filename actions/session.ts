"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  DEMO_MODE,
  DEMO_USERS,
  createSession,
  destroySession,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type AuthState = { error?: string };

const ALLOWED_DEMO = new Set(DEMO_USERS.map((u) => u.id as string));

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

/**
 * Demo identity switch. Only available when AURA_DEMO_MODE is on; a production
 * deployment leaves it off so a cookie cannot be minted from a public page.
 */
export async function signInAs(formData: FormData) {
  if (!DEMO_MODE) throw new Error("Demo sign-in is disabled on this deployment.");
  const userId = String(formData.get("userId") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/app"));
  if (!ALLOWED_DEMO.has(userId)) throw new Error("Unknown demo account.");

  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).all()[0];
  if (!user || user.status !== "active") throw new Error("This account is not available.");

  await createSession(userId);
  redirect(next);
}

/** Email + password sign-in. The production path. */
export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/app"));

  if (!email || !password) return { error: "Enter your email address and password." };
  if (password.length > 200) return { error: "Email or password is incorrect." };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  const accountLimit = rateLimit(`login:account:${email}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok || !accountLimit.ok) {
    return { error: "Too many sign-in attempts. Wait a few minutes and try again." };
  }

  const user = db.select().from(schema.users).where(eq(schema.users.email, email)).all()[0];

  // Always run a verification, even for unknown emails, so response timing
  // does not reveal whether an account exists.
  const stored = user?.passwordHash ?? null;
  const valid = verifyPassword(password, stored);

  if (!user || user.status !== "active" || !valid) {
    return { error: "Email or password is incorrect." };
  }

  await createSession(user.id);
  redirect(next);
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
