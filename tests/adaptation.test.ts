import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendNext, deriveTopicState } from "../lib/domain/adaptation";
import type { AttemptRecord } from "../lib/domain/types";

const titles = { ohm: "Ohm's Law", resist: "Resistance & Resistors", newton2: "Newton's Second Law" };

function attempt(topicId: string, isCorrect: boolean, confidence?: number, day = 1): AttemptRecord {
  return {
    questionId: `q-${topicId}-${Math.random().toString(36).slice(2, 6)}`,
    topicId,
    isCorrect,
    confidence,
    createdAt: new Date(2026, 0, day).toISOString(),
  };
}

const base = {
  topicTitles: titles,
  explainedTopicIds: [] as string[],
  level: "beginner" as const,
};

test("R6: fresh topic → start", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] },
    attempts: [],
  });
  assert.equal(r.action, "start");
  assert.ok(r.evidence.length >= 1);
});

test("R1: prerequisite miss streak → drill prereq with reason naming it", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: ["resist"] },
    attempts: [attempt("resist", false), attempt("resist", false)],
  });
  assert.equal(r.action, "drill_prereq");
  assert.equal(r.topicId, "resist");
  assert.ok(r.reason.includes("Resistance & Resistors"));
});

test("R2: two misses in current topic → more practice", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] },
    attempts: [attempt("ohm", true), attempt("ohm", false), attempt("ohm", false)],
  });
  assert.equal(r.action, "more_practice");
  assert.ok(r.evidence.some((e) => e.includes("streak")));
});

test("R3: correct answer with a linked project → advance to apply", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] },
    attempts: [attempt("ohm", true, 4)],
    linkedProjectTopicId: "ohm",
  });
  assert.equal(r.action, "advance");
  assert.ok(r.label.toLowerCase().includes("mini-project"));
});

test("R4: correct but low confidence → another example, not advance", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] },
    attempts: [attempt("ohm", true, 1)],
    linkedProjectTopicId: "ohm",
  });
  assert.equal(r.action, "more_practice");
  assert.ok(r.reason.includes("confidence"));
});

test("R5: explained but never attempted → check understanding", () => {
  const r = recommendNext({
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] },
    attempts: [],
    explainedTopicIds: ["ohm"],
  });
  assert.equal(r.action, "more_practice");
  assert.ok(r.label.toLowerCase().includes("check"));
});

test("recommendations are deterministic for identical input", () => {
  const args = {
    ...base,
    topic: { topicId: "ohm", title: "Ohm's Law", prerequisiteTopicIds: [] as string[] },
    attempts: [attempt("ohm", true, 4)],
  };
  const a = recommendNext(args);
  const b = recommendNext(args);
  assert.deepEqual(a, b);
});

test("deriveTopicState: evidence ladder is monotonic", () => {
  assert.equal(
    deriveTopicState({ hasExplained: false, attemptCount: 0, correctCount: 0, hasSubmittedProject: false, hasApprovedProject: false }),
    "not_started",
  );
  assert.equal(
    deriveTopicState({ hasExplained: true, attemptCount: 0, correctCount: 0, hasSubmittedProject: false, hasApprovedProject: false }),
    "exploring",
  );
  assert.equal(
    deriveTopicState({ hasExplained: true, attemptCount: 1, correctCount: 0, hasSubmittedProject: false, hasApprovedProject: false }),
    "practicing",
  );
  assert.equal(
    deriveTopicState({ hasExplained: true, attemptCount: 1, correctCount: 1, hasSubmittedProject: true, hasApprovedProject: false }),
    "building",
  );
  assert.equal(
    deriveTopicState({ hasExplained: true, attemptCount: 1, correctCount: 1, hasSubmittedProject: true, hasApprovedProject: true }),
    "applied",
  );
});
