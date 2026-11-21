"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOrThrow } from "@/lib/domain/schemas";
import { db, schema } from "@/lib/db/client";
import { requireUser, requireRole, PermissionError } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { PROJECT_TRANSITIONS, type ProjectStatus } from "@/lib/domain/types";
import { projectDraftSchema } from "@/lib/domain/schemas";

/* ---------------- Project submission (learner) ---------------- */

const saveProjectSchema = projectDraftSchema;

export async function saveProject(input: z.infer<typeof saveProjectSchema>) {
  const user = await requireUser();
  const data = parseOrThrow(saveProjectSchema, input);
  const now = new Date().toISOString();

  if (data.projectId) {
    const existing = db.select().from(schema.projects).where(eq(schema.projects.id, data.projectId)).all()[0];
    if (!existing) throw new Error("Project not found.");
    if (existing.authorId !== user.id) throw new PermissionError("This project belongs to another learner.");

    db.update(schema.projects)
      .set({
        title: data.title,
        draft: data.draft,
        evidenceUrl: data.evidenceUrl ?? "",
        consentToShowcase: data.consentToShowcase,
        updatedAt: now,
        ...(data.submit ? { status: "submitted" as const, submittedAt: now } : {}),
      })
      .where(eq(schema.projects.id, data.projectId))
      .run();
    revalidatePath("/app/projects");
    return { ok: true as const, projectId: data.projectId };
  }

  const id = randomUUID();
  db.insert(schema.projects)
    .values({
      id,
      challengeId: data.challengeId,
      authorId: user.id,
      title: data.title,
      draft: data.draft,
      evidenceUrl: data.evidenceUrl ?? "",
      status: data.submit ? "submitted" : "draft",
      consentToShowcase: data.consentToShowcase,
      createdAt: now,
      updatedAt: now,
      submittedAt: data.submit ? now : null,
    })
    .run();
  revalidatePath("/app/projects");
  return { ok: true as const, projectId: id };
}

/* ---------------- Mentor review ---------------- */

const reviewSchema = z.object({
  projectId: z.string().min(1),
  decision: z.enum(["changes_requested", "approved"]),
  feedback: z.string().min(15, "Give at least one sentence of specific feedback.").max(3000),
});

export async function reviewProject(input: z.infer<typeof reviewSchema>) {
  const reviewer = await requireRole("mentor", "reviewer", "admin");
  const { projectId, decision, feedback } = parseOrThrow(reviewSchema, input);

  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).all()[0];
  if (!project) throw new Error("Project not found.");
  if (project.status !== "submitted") {
    throw new Error("Only submitted projects can be reviewed.");
  }
  if (!PROJECT_TRANSITIONS[project.status as ProjectStatus].includes(decision)) {
    throw new Error("That transition is not allowed.");
  }

  const now = new Date().toISOString();
  db.insert(schema.projectReviews)
    .values({ id: randomUUID(), projectId, reviewerId: reviewer.id, decision, feedback, createdAt: now })
    .run();
  db.update(schema.projects)
    .set({ status: decision, reviewerId: reviewer.id, updatedAt: now })
    .where(eq(schema.projects.id, projectId))
    .run();

  db.insert(schema.auditEvents)
    .values({
      id: randomUUID(),
      actorId: reviewer.id,
      action: `project.${decision}`,
      entityType: "project",
      entityId: projectId,
      metadataJson: JSON.stringify({ feedbackLength: feedback.length }),
      createdAt: now,
    })
    .run();

  revalidatePath("/mentor");
  revalidatePath("/admin/projects");
  revalidatePath("/app/projects");
  return { ok: true as const };
}

async function assignReviewer(projectId: string, reviewerId: string) {
  await requireRole("admin", "mentor", "reviewer");
  db.update(schema.projects).set({ reviewerId }).where(eq(schema.projects.id, projectId)).run();
  revalidatePath("/admin/projects");
  return { ok: true as const };
}

const assignSchema = z.object({ projectId: z.string().min(1), reviewerId: z.string().min(1) });
export async function assignProjectReviewer(input: z.infer<typeof assignSchema>) {
  const { projectId, reviewerId } = parseOrThrow(assignSchema, input);
  return assignReviewer(projectId, reviewerId);
}

/* ---------------- Showcase consent ---------------- */

const showcaseSchema = z.object({ projectId: z.string().min(1), consent: z.boolean() });

export async function setShowcaseConsent(input: z.infer<typeof showcaseSchema>) {
  const user = await requireUser();
  const { projectId, consent } = parseOrThrow(showcaseSchema, input);
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).all()[0];
  if (!project) throw new Error("Project not found.");
  if (project.authorId !== user.id) throw new PermissionError();
  db.update(schema.projects)
    .set({ consentToShowcase: consent })
    .where(eq(schema.projects.id, projectId))
    .run();
  revalidatePath("/app/projects");
  return { ok: true as const };
}

const showcaseApproveSchema = z.object({
  projectId: z.string().min(1),
  approve: z.boolean(),
});

export async function decideShowcase(input: z.infer<typeof showcaseApproveSchema>) {
  await requireRole("admin");
  const { projectId, approve } = parseOrThrow(showcaseApproveSchema, input);
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).all()[0];
  if (!project) throw new Error("Project not found.");
  if (approve) {
    if (project.status !== "approved") throw new Error("Only approved projects can be showcased.");
    if (!project.consentToShowcase) throw new Error("The author has not consented to public showcase.");
    db.update(schema.projects).set({ status: "showcased" }).where(eq(schema.projects.id, projectId)).run();
  } else {
    if (project.status !== "showcased") throw new Error("This project is not showcased.");
    db.update(schema.projects).set({ status: "approved" }).where(eq(schema.projects.id, projectId)).run();
  }
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  return { ok: true as const };
}

/* ---------------- Events ---------------- */

const eventSchema = z.object({
  title: z.string().min(3).max(140),
  summary: z.string().min(10).max(800),
  type: z.enum(["workshop", "talk", "hackathon", "school_visit"]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  venue: z.string().min(2).max(140),
  mode: z.enum(["in_person", "online", "hybrid"]),
  capacity: z.number().int().min(1).max(500),
  registrationClosesAt: z.string().min(1),
  topicId: z.string().optional(),
});

export async function createEvent(input: z.infer<typeof eventSchema>) {
  const organizer = await requireRole("organizer", "admin");
  const data = parseOrThrow(eventSchema, input);
  if (new Date(data.endsAt) <= new Date(data.startsAt)) throw new Error("End time must be after start time.");
  if (new Date(data.registrationClosesAt) > new Date(data.startsAt)) {
    throw new Error("Registration must close before the event starts.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.events)
    .values({
      id,
      title: data.title,
      summary: data.summary,
      type: data.type,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      venue: data.venue,
      mode: data.mode,
      capacity: data.capacity,
      registrationOpensAt: now,
      registrationClosesAt: data.registrationClosesAt,
      topicId: data.topicId || null,
      status: "published",
      isDemo: true,
    })
    .run();

  db.insert(schema.auditEvents)
    .values({ id: randomUUID(), actorId: organizer.id, action: "event.created", entityType: "event", entityId: id, metadataJson: "{}", createdAt: now })
    .run();

  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { ok: true as const, eventId: id };
}

const registerSchema = z.object({ eventId: z.string().min(1) });

/** Registration: duplicate + capacity enforced in the data layer, not the UI. */
export async function registerForEvent(input: z.infer<typeof registerSchema>) {
  const user = await requireUser();
  const { eventId } = parseOrThrow(registerSchema, input);

  const event = db.select().from(schema.events).where(eq(schema.events.id, eventId)).all()[0];
  if (!event) throw new Error("Event not found.");
  if (event.status !== "published") throw new Error("Registration is not open for this event.");

  const now = new Date();
  if (now < new Date(event.registrationOpensAt)) throw new Error("Registration has not opened yet.");
  if (now > new Date(event.registrationClosesAt)) throw new Error("Registration has closed.");

  const existing = db
    .select()
    .from(schema.eventRegistrations)
    .where(and(eq(schema.eventRegistrations.eventId, eventId), eq(schema.eventRegistrations.userId, user.id)))
    .all()[0];

  if (existing && existing.status === "registered") throw new Error("You are already registered for this event.");

  const activeCount = db
    .select()
    .from(schema.eventRegistrations)
    .where(and(eq(schema.eventRegistrations.eventId, eventId), eq(schema.eventRegistrations.status, "registered")))
    .all().length;

  if (!existing && activeCount >= event.capacity) throw new Error("This event is full.");

  if (existing) {
    db.update(schema.eventRegistrations)
      .set({ status: "registered", createdAt: now.toISOString() })
      .where(and(eq(schema.eventRegistrations.eventId, eventId), eq(schema.eventRegistrations.userId, user.id)))
      .run();
  } else {
    db.insert(schema.eventRegistrations)
      .values({ id: randomUUID(), eventId, userId: user.id, status: "registered", createdAt: now.toISOString() })
      .run();
  }

  revalidatePath("/events");
  revalidatePath("/app/events");
  return { ok: true as const };
}

export async function cancelRegistration(input: z.infer<typeof registerSchema>) {
  const user = await requireUser();
  const { eventId } = parseOrThrow(registerSchema, input);
  db.update(schema.eventRegistrations)
    .set({ status: "cancelled" })
    .where(and(eq(schema.eventRegistrations.eventId, eventId), eq(schema.eventRegistrations.userId, user.id)))
    .run();
  revalidatePath("/events");
  revalidatePath("/app/events");
  return { ok: true as const };
}
