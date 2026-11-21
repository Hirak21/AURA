import { db, schema } from "../db/client";
import { and, asc, eq, inArray } from "drizzle-orm";
import type {
  AttemptRecord,
  QuestionForGrading,
  TopicEvidenceState,
} from "../domain/types";
import { deriveTopicState } from "../domain/adaptation";

export function listSubjects() {
  return db.select().from(schema.subjects).where(eq(schema.subjects.published, true)).orderBy(asc(schema.subjects.sortOrder)).all();
}

export function listTopics() {
  return db.select().from(schema.topics).where(eq(schema.topics.published, true)).orderBy(asc(schema.topics.sortOrder)).all();
}

export function getSubject(id: string) {
  return db.select().from(schema.subjects).where(eq(schema.subjects.id, id)).all()[0] ?? null;
}

export function getTopic(id: string) {
  return db.select().from(schema.topics).where(eq(schema.topics.id, id)).all()[0] ?? null;
}

export function getPrerequisites(topicId: string) {
  const rows = db
    .select()
    .from(schema.topicPrerequisites)
    .where(eq(schema.topicPrerequisites.topicId, topicId))
    .all();
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.prerequisiteTopicId);
  return db.select().from(schema.topics).where(inArray(schema.topics.id, ids)).all();
}

export function getResources(topicId: string) {
  return db
    .select()
    .from(schema.resources)
    .where(and(eq(schema.resources.topicId, topicId), eq(schema.resources.reviewStatus, "reviewed")))
    .all();
}

export function getQuestions(topicId: string): QuestionForGrading[] {
  return db
    .select()
    .from(schema.practiceQuestions)
    .where(eq(schema.practiceQuestions.topicId, topicId))
    .all()
    .map((q) => ({
      id: q.id,
      topicId: q.topicId,
      type: q.type,
      answer: q.answer,
      acceptedAnswers: safeJson<string[]>(q.acceptedAnswersJson, []),
      difficulty: q.difficulty,
      prompt: q.prompt,
      explanation: q.explanation,
      hint: q.hint,
      options: safeJson<{ id: string; label: string }[]>(q.optionsJson, []),
    }));
}

export function getQuestion(id: string): QuestionForGrading | null {
  const q = db.select().from(schema.practiceQuestions).where(eq(schema.practiceQuestions.id, id)).all()[0];
  if (!q) return null;
  return {
    id: q.id,
    topicId: q.topicId,
    type: q.type,
    answer: q.answer,
    acceptedAnswers: safeJson<string[]>(q.acceptedAnswersJson, []),
    difficulty: q.difficulty,
    prompt: q.prompt,
    explanation: q.explanation,
    hint: q.hint,
    options: safeJson<{ id: string; label: string }[]>(q.optionsJson, []),
  };
}

export function getChallengeForTopic(topicId: string) {
  return db
    .select()
    .from(schema.challenges)
    .where(and(eq(schema.challenges.topicId, topicId), eq(schema.challenges.published, true)))
    .all()[0] ?? null;
}

export function listChallenges() {
  return db.select().from(schema.challenges).where(eq(schema.challenges.published, true)).all();
}

/* ---------- learner evidence ---------- */

export function getAttempts(userId: string, topicId?: string): AttemptRecord[] {
  const rows = topicId
    ? db
        .select()
        .from(schema.practiceAttempts)
        .where(and(eq(schema.practiceAttempts.userId, userId), eq(schema.practiceAttempts.topicId, topicId)))
        .orderBy(asc(schema.practiceAttempts.createdAt))
        .all()
    : db
        .select()
        .from(schema.practiceAttempts)
        .where(eq(schema.practiceAttempts.userId, userId))
        .orderBy(asc(schema.practiceAttempts.createdAt))
        .all();

  return rows.map((r) => ({
    questionId: r.questionId,
    topicId: r.topicId,
    isCorrect: r.isCorrect,
    confidence: r.confidence,
    createdAt: r.createdAt,
  }));
}

export function getExplainedTopicIds(userId: string): string[] {
  return db
    .select()
    .from(schema.tutorSessions)
    .where(eq(schema.tutorSessions.userId, userId))
    .all()
    .map((r) => r.topicId);
}

export function getTutorMessages(userId: string, topicId: string) {
  return db
    .select()
    .from(schema.tutorMessages)
    .where(and(eq(schema.tutorMessages.userId, userId), eq(schema.tutorMessages.topicId, topicId)))
    .orderBy(asc(schema.tutorMessages.createdAt))
    .all();
}

export function getLearnerProjects(userId: string) {
  return db.select().from(schema.projects).where(eq(schema.projects.authorId, userId)).all();
}

export function getProjectById(id: string) {
  return db.select().from(schema.projects).where(eq(schema.projects.id, id)).all()[0] ?? null;
}

export function getProjectReviews(projectId: string) {
  return db
    .select()
    .from(schema.projectReviews)
    .where(eq(schema.projectReviews.projectId, projectId))
    .orderBy(asc(schema.projectReviews.createdAt))
    .all();
}

/** Topic states for a learner, derived from real evidence only. */
export function getTopicStates(userId: string): Record<string, TopicEvidenceState> {
  const explained = getExplainedTopicIds(userId);
  const attempts = getAttempts(userId);
  const projects = getLearnerProjects(userId);
  const challenges = listChallenges();
  const challengeByTopic = new Map(challenges.map((c) => [c.id, c.topicId]));

  const out: Record<string, TopicEvidenceState> = {};
  for (const t of listTopics()) {
    const topicAttempts = attempts.filter((a) => a.topicId === t.id);
    const correct = topicAttempts.filter((a) => a.isCorrect).length;
    const linkedProject = projects.find((p) => challengeByTopic.get(p.challengeId) === t.id);
    out[t.id] = deriveTopicState({
      hasExplained: explained.includes(t.id),
      attemptCount: topicAttempts.length,
      correctCount: correct,
      hasSubmittedProject: !!linkedProject && linkedProject.status !== "draft",
      hasApprovedProject: !!linkedProject && (linkedProject.status === "approved" || linkedProject.status === "showcased"),
    });
  }
  return out;
}

export function getRecentActivity(userId: string, limit = 8) {
  const attempts = db
    .select()
    .from(schema.practiceAttempts)
    .where(eq(schema.practiceAttempts.userId, userId))
    .orderBy(asc(schema.practiceAttempts.createdAt))
    .all()
    .slice(-limit)
    .reverse();
  return attempts;
}

export function safeJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}
