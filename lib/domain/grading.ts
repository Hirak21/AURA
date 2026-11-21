import type { GradeResult, QuestionForGrading } from "./types";

/** Normalise a free-text answer for comparison. */
export function normalizeAnswer(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[’']/g, "")
      // keep a dot only when it sits between two digits (decimals);
      // otherwise treat it as punctuation ("the current." → "the current")
      .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
      .replace(/[^a-z0-9.+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Parse a user-typed number, tolerating "1,5", "0.5a", " 4 V ". */
export function parseNumeric(input: string): number | null {
  const cleaned = input
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^0-9.+-]/g, " ")
    .trim()
    .split(/\s+/)[0];
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function displayAnswer(q: QuestionForGrading): string {
  if (q.type === "mcq") {
    const opt = q.options.find((o) => o.id === q.answer);
    return opt ? opt.label : q.answer;
  }
  return q.answer;
}

/**
 * Grade a response for the supported question types.
 * - mcq: exact option id
 * - numeric: compare within tolerance (default ±0.01 of expected)
 * - short: normalised match against accepted variants
 *
 * Grading is deterministic and local; it never depends on a model.
 */
export function gradeResponse(
  q: QuestionForGrading,
  rawResponse: string,
  opts: { tolerance?: number } = {},
): GradeResult {
  const tolerance = opts.tolerance ?? 0.01;
  const response = rawResponse.trim();

  if (!response) {
    return {
      isCorrect: false,
      feedback: "No answer was submitted. Give it a try — an attempt is useful evidence either way.",
      correctAnswerDisplay: displayAnswer(q),
    };
  }

  let isCorrect = false;

  if (q.type === "mcq") {
    isCorrect = response === q.answer;
  } else if (q.type === "numeric") {
    const expected = parseNumeric(q.answer);
    const given = parseNumeric(response);
    isCorrect = expected !== null && given !== null && Math.abs(given - expected) <= tolerance;
  } else {
    const given = normalizeAnswer(response);
    const variants = [q.answer, ...q.acceptedAnswers].map(normalizeAnswer);
    isCorrect = variants.some((v) => v.length > 0 && given === v);
  }

  const feedback = isCorrect
    ? `Correct. ${q.explanation}`
    : `Not quite yet. ${q.hint ? `Hint: ${q.hint} ` : ""}The expected answer is “${displayAnswer(q)}”. ${q.explanation}`;

  return { isCorrect, feedback, correctAnswerDisplay: displayAnswer(q) };
}
