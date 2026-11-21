"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseOrThrow } from "@/lib/domain/schemas";
import { db, schema } from "@/lib/db/client";
import { requireUser } from "@/lib/auth";
import { getQuestion, getResources, getTopic, getPrerequisites } from "@/lib/services/catalog";
import { gradeResponse } from "@/lib/domain/grading";
import { buildDemoTutorResponse } from "@/lib/tutor/demo-tutor";
import { and, eq } from "drizzle-orm";
import { EXPLANATION_LEVELS, TUTOR_MODES, type TutorSource } from "@/lib/domain/types";

const askSchema = z.object({
  topicId: z.string().min(1),
  level: z.enum(EXPLANATION_LEVELS),
  mode: z.enum(TUTOR_MODES),
  question: z.string().max(500).optional(),
});

/** Ask the demo tutor. Persists the turn, records the session, validates the response. */
export async function askTutor(input: z.infer<typeof askSchema>) {
  const user = await requireUser();
  const { topicId, level, mode, question } = parseOrThrow(askSchema, input);

  const topic = getTopic(topicId);
  if (!topic) throw new Error("Topic not found.");

  const prereqs = getPrerequisites(topicId);
  const sources: TutorSource[] = getResources(topicId).map((r) => ({
    resourceId: r.id,
    title: r.title,
    author: r.author,
    url: r.url,
    isDemo: r.isDemo,
  }));

  const response = buildDemoTutorResponse({
    topic: {
      topicId: topic.id,
      title: topic.title,
      summary: topic.summary,
      prerequisites: prereqs.map((p) => ({ id: p.id, title: p.title })),
      sources,
    },
    level,
    mode,
    question,
  });

  const now = new Date().toISOString();

  if (question && question.trim().length > 0) {
    db.insert(schema.tutorMessages)
      .values({
        id: randomUUID(),
        userId: user.id,
        topicId,
        role: "user",
        level,
        mode,
        content: JSON.stringify({ question: question.trim() }),
        createdAt: now,
      })
      .run();
  }

  db.insert(schema.tutorMessages)
    .values({
      id: randomUUID(),
      userId: user.id,
      topicId,
      role: "tutor",
      level,
      mode,
      content: JSON.stringify(response),
      createdAt: new Date(Date.now() + 1).toISOString(),
    })
    .run();

  const existing = db
    .select()
    .from(schema.tutorSessions)
    .where(and(eq(schema.tutorSessions.userId, user.id), eq(schema.tutorSessions.topicId, topicId)))
    .all()[0];

  if (existing) {
    db.update(schema.tutorSessions)
      .set({ lastOpenedAt: now })
      .where(and(eq(schema.tutorSessions.userId, user.id), eq(schema.tutorSessions.topicId, topicId)))
      .run();
  } else {
    db.insert(schema.tutorSessions)
      .values({ id: randomUUID(), userId: user.id, topicId, firstOpenedAt: now, lastOpenedAt: now })
      .run();
  }

  revalidatePath(`/app/tutor/${topicId}`);
  return { ok: true as const, response };
}

export type AskTutorResult = Awaited<ReturnType<typeof askTutor>>;

const attemptSchema = z.object({
  questionId: z.string().min(1),
  response: z.string().max(1000),
  confidence: z.number().int().min(1).max(5).optional(),
});

/** Grade + persist an attempt. Feedback is deterministic, never model-generated. */
export async function submitAttempt(input: z.infer<typeof attemptSchema>) {
  const user = await requireUser();
  const { questionId, response, confidence } = parseOrThrow(attemptSchema, input);

  const question = getQuestion(questionId);
  if (!question) throw new Error("Question not found.");

  const graded = gradeResponse(question, response);

  db.insert(schema.practiceAttempts)
    .values({
      id: randomUUID(),
      userId: user.id,
      questionId,
      topicId: question.topicId,
      response,
      isCorrect: graded.isCorrect,
      feedback: graded.feedback,
      confidence: confidence ?? null,
      createdAt: new Date().toISOString(),
    })
    .run();

  revalidatePath("/app");
  revalidatePath("/app/practice");
  revalidatePath(`/app/tutor/${question.topicId}`);
  return { ok: true as const, graded };
}

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  helpful: z.boolean(),
});

export async function rateTutorMessage(input: z.infer<typeof feedbackSchema>) {
  const user = await requireUser();
  const { messageId, helpful } = parseOrThrow(feedbackSchema, input);
  db.update(schema.tutorMessages)
    .set({ helpful })
    .where(and(eq(schema.tutorMessages.id, messageId), eq(schema.tutorMessages.userId, user.id)))
    .run();
  return { ok: true as const };
}

const levelSchema = z.object({ level: z.enum(EXPLANATION_LEVELS) });

export async function setPreferredLevel(input: z.infer<typeof levelSchema>) {
  const user = await requireUser();
  const { level } = parseOrThrow(levelSchema, input);
  db.update(schema.users).set({ preferredLevel: level }).where(eq(schema.users.id, user.id)).run();
  revalidatePath("/app/profile");
  return { ok: true as const };
}

const goalSchema = z.object({ goal: z.string().min(3).max(140), userId: z.string().optional() });

export async function setLearningGoal(input: z.infer<typeof goalSchema>) {
  const user = await requireUser();
  const { goal } = parseOrThrow(goalSchema, input);
  db.update(schema.users).set({ learningGoal: goal }).where(eq(schema.users.id, user.id)).run();
  revalidatePath("/app");
  revalidatePath("/app/profile");
  return { ok: true as const };
}

const bookmarkSchema = z.object({ topicId: z.string().min(1) });

export async function toggleBookmark(input: z.infer<typeof bookmarkSchema>) {
  const user = await requireUser();
  const { topicId } = parseOrThrow(bookmarkSchema, input);
  const existing = db
    .select()
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.topicId, topicId)))
    .all()[0];

  if (existing) {
    db.delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, user.id), eq(schema.bookmarks.topicId, topicId)))
      .run();
  } else {
    db.insert(schema.bookmarks).values({ userId: user.id, topicId, createdAt: new Date().toISOString() }).run();
  }
  revalidatePath("/app/learning");
  return { ok: true as const, bookmarked: !existing };
}
