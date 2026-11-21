import type {
  AttemptRecord,
  Recommendation,
  TopicEvidenceState,
} from "./types";

export interface TopicRuleInput {
  topicId: string;
  title: string;
  prerequisiteTopicIds: string[];
}

export interface AdaptationInput {
  /** The topic the learner is currently working in. */
  topic: TopicRuleInput;
  /** Title lookup for prerequisites (display only). */
  topicTitles: Record<string, string>;
  /** All attempts across topics, oldest first. */
  attempts: AttemptRecord[];
  /** Topics the learner has opened the tutor for (explained). */
  explainedTopicIds: string[];
  /** Topic that has a linked application activity the learner has not started. */
  linkedProjectTopicId?: string;
  /** Learner's preferred level (does not change rules, only copy tone). */
  level: "beginner" | "intermediate" | "advanced";
}

const MAX = {
  recentWindow: 8,
  prereqMissesForRefresher: 2,
  maxAttemptsBeforeBackoff: 3,
};

function attemptsFor(topicId: string, attempts: AttemptRecord[]): AttemptRecord[] {
  return attempts.filter((a) => a.topicId === topicId);
}

function missesSinceCorrect(topicId: string, attempts: AttemptRecord[]): number {
  const forTopic = attemptsFor(topicId, attempts);
  let misses = 0;
  for (let i = forTopic.length - 1; i >= 0; i--) {
    if (forTopic[i].isCorrect) break;
    misses++;
  }
  return misses;
}

/**
 * Deterministic adaptive recommendation.
 *
 * Rules (in priority order), each producing a human-readable reason:
 *  R1 Unmet prerequisite with misses  → drill the prerequisite first
 *  R2 Recent wrong answers (>=2)      → more practice at same level
 *  R3 Correct answer                  → advance to next topic / apply
 *  R4 Low confidence on correct       → offer another example
 *  R5 Topic explained but no attempt  → practice next
 *  R6 No activity                     → start the topic
 *
 * The rules never infer ability, never label the learner, and every
 * recommendation carries the evidence used to produce it.
 */
export function recommendNext(input: AdaptationInput): Recommendation {
  const { topic, topicTitles, attempts, explainedTopicIds, linkedProjectTopicId } = input;
  const recent = attempts.slice(-MAX.recentWindow);
  const topicAttempts = attemptsFor(topic.topicId, attempts);
  const correctCount = topicAttempts.filter((a) => a.isCorrect).length;
  const missStreak = missesSinceCorrect(topic.topicId, attempts);

  // R1 — prerequisite gap based on actual misses on the prerequisite itself
  for (const prereqId of topic.prerequisiteTopicIds) {
    const prereqAttempts = attemptsFor(prereqId, recent);
    const prereqMisses = prereqAttempts.filter((a) => !a.isCorrect).length;
    const prereqHasNoSuccess = prereqAttempts.length > 0 && prereqAttempts.every((a) => !a.isCorrect);
    if (prereqMisses >= MAX.prereqMissesForRefresher || prereqHasNoSuccess) {
      const title = topicTitles[prereqId] ?? "the prerequisite topic";
      return {
        action: "drill_prereq",
        topicId: prereqId,
        relatedTopicId: topic.topicId,
        label: `Revisit “${title}” before continuing`,
        reason: `Your recent attempts show ${prereqMisses || prereqAttempts.length} miss${
          (prereqMisses || prereqAttempts.length) === 1 ? "" : "es"
        } in “${title}”, which “${topic.title}” builds on.`,
        evidence: [
          `Prerequisite: ${title}`,
          `Attempts on prerequisite: ${prereqAttempts.length}`,
          `Missed: ${prereqMisses}`,
        ],
      };
    }
  }

  // R2 — repeated misses in current topic
  if (missStreak >= 2) {
    return {
      action: "more_practice",
      topicId: topic.topicId,
      label: "Try another guided question on this topic",
      reason: `The last ${missStreak} checks on “${topic.title}” were not correct. One more guided question — with hints — is the fastest way forward.`,
      evidence: [`Recent miss streak: ${missStreak}`, `Topic: ${topic.title}`],
    };
  }

  if (missStreak === 1 && topicAttempts.length < MAX.maxAttemptsBeforeBackoff) {
    return {
      action: "more_practice",
      topicId: topic.topicId,
      label: "Retry the check with a hint",
      reason: `Your last check on “${topic.title}” was missed. A second attempt with the hint available is better evidence than moving on.`,
      evidence: ["Last attempt: missed", `Attempts on topic: ${topicAttempts.length}`],
    };
  }

  // R3 — correct answer: advance
  if (topicAttempts.length > 0 && topicAttempts[topicAttempts.length - 1].isCorrect) {
    const lastAttempt = topicAttempts[topicAttempts.length - 1];
    const lowConfidence =
      typeof lastAttempt.confidence === "number" && lastAttempt.confidence <= 2;

    // R4 — low confidence even after a correct answer
    if (lowConfidence) {
      return {
        action: "more_practice",
        topicId: topic.topicId,
        label: "See one more worked example before moving on",
        reason: `You answered correctly but rated your confidence low (${lastAttempt.confidence}/5). Another example usually settles it.`,
        evidence: ["Last attempt: correct", `Self-rated confidence: ${lastAttempt.confidence}/5`],
      };
    }

    if (linkedProjectTopicId === topic.topicId) {
      return {
        action: "advance",
        topicId: topic.topicId,
        label: "Apply it: open the linked mini-project",
        reason: `You have answered checks correctly on “${topic.title}” ${correctCount} time${
          correctCount === 1 ? "" : "s"
        }. A short applied activity turns that into evidence you can show.`,
        evidence: [
          "Last attempt: correct",
          `Correct attempts: ${correctCount}`,
          "Linked mini-project available",
        ],
      };
    }

    return {
      action: "advance",
      topicId: topic.topicId,
      label: "Move to the next topic",
      reason: `The most recent check on “${topic.title}” was correct. Continue when you feel ready — one correct check is progress, not mastery.`,
      evidence: ["Last attempt: correct", `Correct attempts: ${correctCount}`],
    };
  }

  // R5 — explained but never practised
  if (explainedTopicIds.includes(topic.topicId) && topicAttempts.length === 0) {
    return {
      action: "more_practice",
      topicId: topic.topicId,
      label: "Check your understanding with a short question",
      reason: `You opened the tutor for “${topic.title}” but have not attempted a check yet. One attempt creates your first piece of evidence.`,
      evidence: ["Tutor session opened", "No attempts recorded"],
    };
  }

  // R6 — fresh topic
  return {
    action: "start",
    topicId: topic.topicId,
    label: `Start “${topic.title}” with the tutor`,
    reason:
      topic.prerequisiteTopicIds.length > 0
        ? `No attempts yet. This topic lists ${topic.prerequisiteTopicIds.length} prerequisite${
            topic.prerequisiteTopicIds.length === 1 ? "" : "s"
          } — the tutor will remind you where needed.`
        : "No attempts yet. Begin with a short explanation at your chosen level.",
    evidence: ["No attempts recorded"],
  };
}

/**
 * Derive a topic's evidence state from actual recorded actions.
 * This is never an arbitrary percentage.
 */
export function deriveTopicState(args: {
  hasExplained: boolean;
  attemptCount: number;
  correctCount: number;
  hasSubmittedProject: boolean;
  hasApprovedProject: boolean;
}): TopicEvidenceState {
  if (args.hasApprovedProject) return "applied";
  if (args.hasSubmittedProject) return "building";
  if (args.attemptCount > 0) return args.correctCount > 0 ? "practicing" : "practicing";
  if (args.hasExplained) return "exploring";
  return "not_started";
}
