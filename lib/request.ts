/**
 * Request metadata used for rate limiting and session audit rows.
 *
 * Trusting x-forwarded-for is only safe behind a proxy that overwrites it.
 * docs/DEPLOYMENT.md configures Caddy/Nginx to do exactly that. Set
 * AURA_TRUST_PROXY=false if the app is exposed directly.
 */

export function clientIp(headers: Headers): string {
  const trustProxy = process.env.AURA_TRUST_PROXY !== "false";
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
