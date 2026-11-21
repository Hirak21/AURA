import { db, schema } from "../db/client";
import { eq, and, isNull } from "drizzle-orm";
import { availableFor } from "@/lib/services/inventory";

/**
 * Admin metrics are computed from the same tables the modules write to.
 * Nothing here is decorative or hard-coded.
 */
export function getAdminMetrics() {
  const events = db.select().from(schema.events).all();
  const now = new Date();
  const upcoming = events.filter((e) => e.status === "published" && new Date(e.startsAt) > now);

  const projects = db.select().from(schema.projects).all();
  const pendingReviews = projects.filter((p) => p.status === "submitted").length;
  const approved = projects.filter((p) => p.status === "approved").length;
  const showcased = projects.filter((p) => p.status === "showcased").length;

  const requests = db.select().from(schema.collaborationRequests).all();
  const openRequests = requests.filter((r) => r.status === "new" || r.status === "in_review").length;
  const scheduledRequests = requests.filter((r) => r.status === "scheduled").length;

  const allocations = db.select().from(schema.resourceAllocations).all();
  const activeAllocations = allocations.filter((a) => !a.returnedAt);
  const overdue = activeAllocations.filter((a) => new Date(a.expectedReturnAt) < now).length;

  const items = db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.archived, false)).all();
  const lowStock = items.filter((i) => i.quantityOnHand <= i.lowStockThreshold).length;
  const availableUnits = items.reduce((sum, i) => sum + Math.max(availableFor(i.id), 0), 0);

  const learners = db
    .select()
    .from(schema.userRoles)
    .where(eq(schema.userRoles.role, "student"))
    .all();
  const activeLearners = new Set(learners.map((l) => l.userId));

  const attempts = db.select().from(schema.practiceAttempts).all();
  const recentAttempts = attempts.filter(
    (a) => now.getTime() - new Date(a.createdAt).getTime() < 7 * 86_400_000,
  );
  const learnersWithActivity7d = new Set(recentAttempts.map((a) => a.userId)).size;

  const registrations = db
    .select()
    .from(schema.eventRegistrations)
    .where(and(eq(schema.eventRegistrations.status, "registered")))
    .all();

  return {
    upcomingEvents: upcoming.length,
    nextEvent: upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null,
    pendingReviews,
    approved,
    showcased,
    openRequests,
    scheduledRequests,
    activeAllocations: activeAllocations.length,
    overdueAllocations: overdue,
    lowStock,
    availableUnits,
    studentAccounts: activeLearners.size,
    learnersWithActivity7d,
    totalAttempts: attempts.length,
    attempts7d: recentAttempts.length,
    registeredSeats: registrations.length,
    totalItems: items.length,
    totalProjects: projects.length,
    totalRequests: requests.length,
  };
}

export function getRecentAudit(limit = 10) {
  const rows = db.select().from(schema.auditEvents).all();
  return rows
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getReturnableAllocations() {
  const rows = db
    .select()
    .from(schema.resourceAllocations)
    .where(isNull(schema.resourceAllocations.returnedAt))
    .all();
  const items = db.select().from(schema.inventoryItems).all();
  const itemById = new Map(items.map((i) => [i.id, i]));
  return rows.map((r) => ({ ...r, item: itemById.get(r.itemId) }));
}
