import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import {
  getAttempts,
  getExplainedTopicIds,
  getChallengeForTopic,
  getPrerequisites,
  listTopics,
} from "./catalog";
import { recommendNext } from "../domain/adaptation";
import type { Recommendation } from "../domain/types";

/**
 * The single recommendation a learner sees on their overview.
 *
 * Target selection is deliberately transparent and deterministic:
 *  1. the topic of the most recent action (attempt or tutor session);
 *  2. otherwise the first published topic the learner has never touched;
 *  3. otherwise the first published topic.
 *
 * The adaptation rules then decide what to do with that target and why.
 */
export function getPrimaryRecommendation(userId: string): {
  recommendation: Recommendation;
  topicTitle: string;
} | null {
  const topics = listTopics();
  const attempts = getAttempts(userId);
  const explained = getExplainedTopicIds(userId);
  const titles: Record<string, string> = Object.fromEntries(topics.map((t) => [t.id, t.title]));

  const lastAttempt = [...attempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const lastSession = db
    .select()
    .from(schema.tutorSessions)
    .where(eq(schema.tutorSessions.userId, userId))
    .all()
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))[0];

  const candidates: { topicId: string; at: number }[] = [];
  if (lastAttempt) candidates.push({ topicId: lastAttempt.topicId, at: new Date(lastAttempt.createdAt).getTime() });
  if (lastSession) candidates.push({ topicId: lastSession.topicId, at: new Date(lastSession.lastOpenedAt).getTime() });
  candidates.sort((a, b) => b.at - a.at);

  const touched = new Set<string>([...attempts.map((a) => a.topicId), ...explained]);

  const target =
    (candidates[0] ? topics.find((t) => t.id === candidates[0].topicId) : undefined) ??
    topics.find((t) => !touched.has(t.id)) ??
    topics[0];

  if (!target) return null;

  const prereqs = getPrerequisites(target.id);
  const challenge = getChallengeForTopic(target.id);

  const recommendation = recommendNext({
    topic: {
      topicId: target.id,
      title: target.title,
      prerequisiteTopicIds: prereqs.map((p) => p.id),
    },
    topicTitles: titles,
    attempts,
    explainedTopicIds: explained,
    linkedProjectTopicId: challenge ? target.id : undefined,
    level: "beginner",
  });

  return { recommendation, topicTitle: target.title };
}
