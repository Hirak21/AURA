/**
 * Small in-process fixed-window rate limiter.
 *
 * This is intentionally dependency-free. It protects a single Node instance
 * (the deployment target in docs/DEPLOYMENT.md). If AURA is ever run as more
 * than one instance, replace the Map with Redis or another shared store —
 * the call sites do not need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // If a hostile client filled the map with live buckets, drop the oldest.
  if (buckets.size >= MAX_BUCKETS) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: Math.max(0, limit - current.count), retryAfterSeconds: 0 };
}

/** Test-only: clear all buckets so tests are deterministic. */
export function resetRateLimits() {
  buckets.clear();
}
