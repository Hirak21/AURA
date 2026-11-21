import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";

/**
 * Liveness + readiness probe for the reverse proxy and uptime monitor.
 * Returns 503 when the database cannot answer a trivial query, so a broken
 * deployment is removed from rotation instead of serving 500s.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    db.select({ id: schema.users.id }).from(schema.users).limit(1).all();
    return NextResponse.json(
      {
        status: "ok",
        service: "aura",
        database: "ok",
        latencyMs: Date.now() - startedAt,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "error", service: "aura", database: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
