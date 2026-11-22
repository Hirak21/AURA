/**
 * Request metadata used for rate limiting and session audit rows.
 *
 * Forwarded headers are only trustworthy when a reverse proxy overwrites
 * them. nginx is configured to set X-Forwarded-For to $remote_addr, so
 * production opts in with AURA_TRUST_PROXY=true. Direct exposure must leave
 * it unset: otherwise a client could rotate the header to bypass every
 * per-IP rate limit.
 */

export function clientIp(headers: Headers): string {
  const trustProxy = process.env.AURA_TRUST_PROXY === "true";
  if (trustProxy) {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    const real = headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "local";
}

export function userAgent(headers: Headers): string {
  return (headers.get("user-agent") ?? "").slice(0, 300);
}
