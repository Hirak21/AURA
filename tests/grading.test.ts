import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeResponse, normalizeAnswer, parseNumeric } from "../lib/domain/grading";

const mcq = {
  id: "q1",
  topicId: "t1",
  type: "mcq" as const,
  answer: "b",
  acceptedAnswers: [],
  difficulty: "core" as const,
  prompt: "Which formula relates voltage, current and resistance?",
  explanation: "Ohm's Law: V = IR.",
  hint: "Think about which quantity is measured in ohms.",
  options: [
    { id: "a", label: "P = IV" },
    { id: "b", label: "V = IR" },
    { id: "c", label: "E = mc²" },
  ],
};

const numeric = {
  id: "q2",
  topicId: "t1",
  type: "numeric" as const,
  answer: "2",
  acceptedAnswers: ["2", "2.0"],
  difficulty: "core" as const,
  prompt: "A 6 V source drives 3 A. Resistance in ohms?",
  explanation: "R = V/I = 6/3 = 2 Ω.",
  hint: "R = V / I.",
  options: [],
};

const short = {
  id: "q3",
  topicId: "t1",
  type: "short" as const,
  answer: "current",
  acceptedAnswers: ["the current", "amperes", "amps"],
  difficulty: "intro" as const,
  prompt: "What does an ammeter measure?",
  explanation: "An ammeter measures current.",
  hint: "It is measured in amperes.",
  options: [],
};

test("mcq: correct option id passes", () => {
  assert.equal(gradeResponse(mcq, "b").isCorrect, true);
});

test("mcq: wrong option fails and shows correct label", () => {
  const r = gradeResponse(mcq, "a");
  assert.equal(r.isCorrect, false);
  assert.equal(r.correctAnswerDisplay, "V = IR");
  assert.ok(r.feedback.includes("Hint"));
});

test("mcq: empty response is a safe failure with no crash", () => {
  const r = gradeResponse(mcq, "   ");
  assert.equal(r.isCorrect, false);
  assert.ok(r.feedback.length > 0);
});

test("numeric: exact and decimal-equivalent answers pass", () => {
  assert.equal(gradeResponse(numeric, "2").isCorrect, true);
  assert.equal(gradeResponse(numeric, "2.0").isCorrect, true);
});

test("numeric: unit suffix is tolerated", () => {
  assert.equal(gradeResponse(numeric, "2 ohms").isCorrect, true);
  assert.equal(gradeResponse(numeric, "2Ω").isCorrect, true);
});

test("numeric: wrong value fails", () => {
  assert.equal(gradeResponse(numeric, "0.5").isCorrect, false);
});

test("numeric: out-of-tolerance value fails", () => {
  assert.equal(gradeResponse({ ...numeric, answer: "3.333" }, "3.3").isCorrect, false);
  assert.equal(
    gradeResponse({ ...numeric, answer: "3.333" }, "3.3", { tolerance: 0.05 }).isCorrect,
    true,
  );
});

test("short: normalisation handles case and punctuation", () => {
  assert.equal(normalizeAnswer("  The Current! "), "the current");
  assert.equal(gradeResponse(short, "Current").isCorrect, true);
  assert.equal(gradeResponse(short, "the current.").isCorrect, true);
});

test("short: unrelated answer fails", () => {
  assert.equal(gradeResponse(short, "voltage").isCorrect, false);
});

test("parseNumeric: handles commas, plus signs and junk", () => {
  assert.equal(parseNumeric("1,5"), 1.5);
  assert.equal(parseNumeric("+4 V"), 4);
  assert.equal(parseNumeric("abc"), null);
});
