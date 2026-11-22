/**
 * Safe post-authentication redirect target.
 *
 * A leading slash is not enough: browsers normalise `//evil.com` and
 * `/\evil.com` into a different origin. Parse against a fixed same-origin
 * base, compare origins, and return only the local path/query/fragment.
 *
 * Lives outside actions/ because a "use server" module may only export async
 * functions, and both the login page and the sign-in actions need it.
 */
export function safeNext(value: string | null | undefined, fallback = "/app"): string {
  if (!value || !value.startsWith("/")) return fallback;
  // URL parsing strips control characters, which could silently change the
  // destination. Backslashes are the scheme-relative redirect trick above.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  try {
    const base = "https://aura.local";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
