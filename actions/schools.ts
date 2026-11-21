"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOrThrow } from "@/lib/domain/schemas";
import { db, schema } from "@/lib/db/client";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { REQUEST_TRANSITIONS, type RequestStatus } from "@/lib/domain/types";
import { publicRequestSchema, type PublicRequestInput } from "@/lib/domain/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

/** Public form — no auth required, but every field is validated. */
function makeReference() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `AURA-SR-${n}${Date.now().toString().slice(-3)}`;
}

export type CollaborationFormState = {
  status: "idle" | "success" | "error";
  reference?: string;
  errors?: Record<string, string>;
  message?: string;
};

async function createRequest(data: PublicRequestInput) {
  // Public, unauthenticated endpoint: rate-limit before doing any work.
  const requestHeaders = await headers();
  const limit = rateLimit(`collaborate:${clientIp(requestHeaders)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    throw new Error("Too many requests from this connection. Please try again later.");
  }

  const now = new Date().toISOString();
  const reference = makeReference();

  db.insert(schema.collaborationRequests)
    .values({
      id: randomUUID(),
      reference,
      schoolName: data.schoolName,
      location: data.location,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      activityType: data.activityType,
      gradeRange: data.gradeRange,
      expectedParticipants: data.expectedParticipants,
      preferredDates: data.preferredDates,
      facilities: data.facilities,
      message: data.message,
      status: "new",
      ownerId: null,
      internalNotes: "",
      linkedEventId: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  revalidatePath("/admin/schools");
  return { ok: true as const, reference };
}

export async function submitCollaborationRequest(input: PublicRequestInput) {
  const data = parseOrThrow(publicRequestSchema, input);
  return createRequest(data);
}

/**
 * Progressive-enhancement wrapper used by the public form. It works with and
 * without client JavaScript: React serialises the action into the form, and
 * validation/errors are returned as state rather than thrown.
 */
export async function submitCollaborationRequestForm(
  _prev: CollaborationFormState,
  formData: FormData,
): Promise<CollaborationFormState> {
  const parsed = publicRequestSchema.safeParse({
    schoolName: String(formData.get("schoolName") ?? ""),
    location: String(formData.get("location") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    activityType: String(formData.get("activityType") ?? ""),
    gradeRange: String(formData.get("gradeRange") ?? ""),
    expectedParticipants: Number(formData.get("expectedParticipants") ?? 0),
    preferredDates: String(formData.get("preferredDates") ?? ""),
    facilities: String(formData.get("facilities") ?? ""),
    message: String(formData.get("message") ?? ""),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { status: "error", errors };
  }

  try {
    const result = await createRequest(parsed.data);
    return { status: "success", reference: result.reference };
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }
}

const updateSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["new", "in_review", "approved", "scheduled", "completed", "declined"]).optional(),
  internalNotes: z.string().max(3000).optional(),
  assignToMe: z.boolean().optional(),
});

export async function updateCollaborationRequest(input: z.infer<typeof updateSchema>) {
  const liaison = await requireRole("liaison", "admin", "organizer");
  const data = parseOrThrow(updateSchema, input);

  const request = db
    .select()
    .from(schema.collaborationRequests)
    .where(eq(schema.collaborationRequests.id, data.requestId))
    .all()[0];
  if (!request) throw new Error("Request not found.");

  const now = new Date().toISOString();
  const updates: Partial<typeof schema.collaborationRequests.$inferInsert> = { updatedAt: now };

  if (data.status && data.status !== request.status) {
    const allowed = REQUEST_TRANSITIONS[request.status as RequestStatus] ?? [];
    if (!allowed.includes(data.status)) {
      throw new Error(`Cannot move a request from “${request.status}” to “${data.status}”.`);
    }
    updates.status = data.status;
    if (data.status === "in_review" && !request.ownerId) updates.ownerId = liaison.id;

    db.insert(schema.auditEvents)
      .values({
        id: randomUUID(),
        actorId: liaison.id,
        action: "school_request.status_changed",
        entityType: "collaboration_request",
        entityId: request.id,
        metadataJson: JSON.stringify({ from: request.status, to: data.status }),
        createdAt: now,
      })
      .run();
  }

  if (data.assignToMe) updates.ownerId = liaison.id;
  if (typeof data.internalNotes === "string") updates.internalNotes = data.internalNotes;

  db.update(schema.collaborationRequests).set(updates).where(eq(schema.collaborationRequests.id, request.id)).run();

  revalidatePath("/admin/schools");
  revalidatePath("/admin");
  return { ok: true as const };
}

const convertSchema = z.object({
  requestId: z.string().min(1),
  eventTitle: z.string().min(3).max(140),
  startsAt: z.string().min(1),
  venue: z.string().min(2).max(140),
});

/** Approved request → scheduled workshop event. One-way, audited. */
export async function convertRequestToEvent(input: z.infer<typeof convertSchema>) {
  const actor = await requireRole("liaison", "admin", "organizer");
  const data = parseOrThrow(convertSchema, input);

  const request = db
    .select()
    .from(schema.collaborationRequests)
    .where(eq(schema.collaborationRequests.id, data.requestId))
    .all()[0];
  if (!request) throw new Error("Request not found.");
  if (request.status !== "approved" && request.status !== "scheduled") {
    throw new Error("Approve the request before converting it into an event.");
  }
  if (request.linkedEventId) throw new Error("This request already has a linked event.");

  const now = new Date().toISOString();
  const eventId = randomUUID();
  const start = new Date(data.startsAt);
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  db.transaction((tx) => {
    tx.insert(schema.events)
      .values({
        id: eventId,
        title: data.eventTitle,
        summary: `Workshop for ${request.schoolName}: ${request.activityType} (${request.gradeRange}). Converted from ${request.reference}.`,
        type: "school_visit",
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        venue: data.venue,
        mode: "in_person",
        capacity: Math.max(request.expectedParticipants, 10),
        registrationOpensAt: now,
        registrationClosesAt: new Date(start.getTime() - 86_400_000).toISOString(),
        topicId: null,
        status: "published",
        isDemo: true,
      })
      .run();

    tx.update(schema.collaborationRequests)
      .set({ linkedEventId: eventId, status: "scheduled", updatedAt: now })
      .where(eq(schema.collaborationRequests.id, request.id))
      .run();

    tx.insert(schema.auditEvents)
      .values({
        id: randomUUID(),
        actorId: actor.id,
        action: "school_request.converted",
        entityType: "collaboration_request",
        entityId: request.id,
        metadataJson: JSON.stringify({ eventId }),
        createdAt: now,
      })
      .run();
  });

  revalidatePath("/admin/schools");
  revalidatePath("/events");
  revalidatePath("/admin");
  return { ok: true as const, eventId };
}
