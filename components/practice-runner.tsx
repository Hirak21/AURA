"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Button, Card, InlineAlert, FieldError } from "./ui";
import { submitAttempt } from "@/actions/learning";
import { gradeResponse } from "@/lib/domain/grading";
import type { QuestionForGrading } from "@/lib/domain/types";
import { Lightbulb, RotateCcw } from "lucide-react";

interface Result {
  isCorrect: boolean;
  feedback: string;
  correctAnswerDisplay: string;
}

export function PracticeRunner({
  topicTitle,
  questions,
  previous,
}: {
  topicId: string;
  topicTitle: string;
  questions: QuestionForGrading[];
  previous: Record<string, boolean[]>;
}) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [history, setHistory] = useState<Record<string, boolean[]>>(previous);

  const q = questions[index];
  if (!q) {
    return (
      <Card className="p-6">
        <p className="text-[13.5px] text-strong">No questions seeded for this topic.</p>
      </Card>
    );
  }
  const past = history[q.id] ?? [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!response.trim()) {
      setError(q.type === "mcq" ? "Choose an option first." : "Type an answer first.");
      return;
    }
    const graded = gradeResponse(q, response);
    startTransition(async () => {
      try {
        const res = await submitAttempt({
          questionId: q.id,
          response,
          confidence: confidence ?? undefined,
        });
        setResult(res.graded);
        setHistory((h) => ({ ...h, [q.id]: [...(h[q.id] ?? []), res.graded.isCorrect] }));
      } catch (err) {
        setError((err as Error).message);
        void graded;
      }
    });
  };

  const next = () => {
    setResult(null);
    setResponse("");
    setConfidence(null);
    setHintShown(false);
    setError(null);
    setIndex((i) => (i + 1) % questions.length);
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line bg-mist px-4 py-2.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-strong">{topicTitle}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
          Question {index + 1} / {questions.length} · {q.difficulty}
        </p>
      </div>

      <form onSubmit={submit} className="p-5 sm:p-6">
        <p className="text-[15.5px] font-medium leading-relaxed">{q.prompt}</p>

        {q.type === "mcq" ? (
          <fieldset className="mt-4 space-y-2" disabled={!!result}>
            <legend className="sr-only">Choose one answer</legend>
            {q.options.map((opt) => (
              <label
                key={opt.id}
                className={clsx(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13.5px] leading-snug transition-colors",
                  response === opt.id ? "border-ink bg-mist" : "border-line hover:border-mid",
                )}
              >
                <input
                  type="radio"
                  name="practice-answer"
                  value={opt.id}
                  checked={response === opt.id}
                  onChange={() => setResponse(opt.id)}
                  className="mt-0.5 h-4 w-4 accent-black"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="mt-4">
            <label htmlFor="practice-input" className="sr-only">Your answer</label>
            <input
              id="practice-input"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={!!result}
              placeholder={q.type === "numeric" ? "Enter a number (units optional)" : "Type a short answer"}
              className="w-full rounded-lg border border-line px-3.5 py-2.5 text-[14px] focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              autoComplete="off"
            />
          </div>
        )}

        {!result ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setHintShown(true)}
                disabled={hintShown}
              >
                <Lightbulb size={13} aria-hidden /> {hintShown ? "Hint shown" : "Show a hint"}
              </Button>
              <span className="text-[11px] text-mid">Hints come before answers — by design.</span>
            </div>

            {hintShown ? (
              <p className="mt-2.5 rounded-lg border border-dashed border-mid bg-mist px-3.5 py-2.5 text-[12.5px] leading-relaxed">
                <span className="font-medium">Hint. </span>
                {q.hint}
              </p>
            ) : null}

            <fieldset className="mt-4">
              <legend className="text-[11.5px] text-mid">Confidence (optional evidence, 1–5)</legend>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={confidence === n}
                    onClick={() => setConfidence(confidence === n ? null : n)}
                    className={clsx(
                      "h-8 w-8 rounded-full border font-mono text-[11.5px] transition-colors",
                      confidence === n ? "border-ink bg-ink text-paper" : "border-line text-strong hover:border-mid",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            <FieldError>{error}</FieldError>
            <div className="mt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Checking…" : "Submit answer"}
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <div
              className={clsx(
                "rounded-lg px-4 py-3.5 text-[13px] leading-relaxed",
                result.isCorrect ? "bg-ink text-paper" : "bg-mist text-ink",
              )}
            >
              <p className="font-medium">
                {result.isCorrect ? "Correct — recorded." : "Not correct — and that is fine."}
              </p>
              <p className="mt-1">{result.feedback}</p>
              {!result.isCorrect ? (
                <p className="mt-1.5 text-[12px] opacity-80">
                  Expected: {result.correctAnswerDisplay}. A missed check makes your next recommendation more useful.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={next}>
                <RotateCcw size={13} aria-hidden /> Next question
              </Button>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
                Your record: {[...past].map((c) => (c ? "✓" : "×")).join(" ") || "—"}
              </span>
            </div>
            <InlineAlert tone="info">
              Open your overview to see how this attempt changed the recommended next step.
            </InlineAlert>
          </div>
        )}
      </form>
    </Card>
  );
}
