"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { Button, Card, InlineAlert, FieldError, Select } from "./ui";
import { askTutor } from "@/actions/learning";
import { gradeResponse } from "@/lib/domain/grading";
import { submitAttempt } from "@/actions/learning";
import {
  EXPLANATION_LEVELS,
  LEVEL_LABELS,
  MODE_LABELS,
  TUTOR_MODES,
  type ExplanationLevel,
  type QuestionForGrading,
  type TutorMode,
  type TutorResponse,
} from "@/lib/domain/types";
import { ArrowUp, CircleHelp, Info, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { rateTutorMessage } from "@/actions/learning";

export interface PersistedTurn {
  id: string;
  role: "user" | "tutor";
  content: string;
  level: string;
  mode: string;
  createdAt: string;
  helpful: boolean | null;
}

type UiTurn =
  | { kind: "user"; id: string; question: string }
  | { kind: "tutor"; id: string; response: TutorResponse | null; helpful: boolean | null };

const LEVEL_HINT: Record<ExplanationLevel, string> = {
  beginner: "Everyday words, minimal assumed knowledge",
  intermediate: "Assumes you have met the basics",
  advanced: "Formal framing and edge cases",
};

const MODE_HINT: Record<TutorMode, string> = {
  simple: "One clear summary and a picture",
  "step-by-step": "Numbered procedure, then a worked example",
  "example-first": "Starts from a concrete case",
  socratic: "Questions first, answers revealed gradually",
};

function TutorBlocks({ response }: { response: TutorResponse }) {
  return (
    <div className="space-y-3.5">
      <p className="text-[14.5px] leading-[1.7] text-ink">{response.summary}</p>
      {response.prerequisiteNote ? (
        <div className="flex gap-2.5 rounded-lg border border-line bg-mist px-3.5 py-2.5">
          <Info size={14} className="mt-0.5 shrink-0 text-strong" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-strong">
            <span className="font-medium text-ink">Prerequisite reminder. </span>
            {response.prerequisiteNote}
          </p>
        </div>
      ) : null}

      {response.blocks.map((block, i) => {
        if (block.kind === "formula") {
          return (
            <div key={i} className="rounded-lg border border-ink bg-paper px-4 py-3.5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-strong">{block.heading}</p>
              <p className="mt-1.5 overflow-x-auto font-mono text-[14px] leading-relaxed text-ink">{block.body}</p>
            </div>
          );
        }
        if (block.kind === "steps") {
          return (
            <div key={i}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-strong">{block.heading}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-strong">{block.body}</p>
              <ol className="mt-2.5 space-y-2">
                {(block.items ?? []).map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-[13.5px] leading-relaxed">
                    <span className="metric mt-0.5 shrink-0 font-mono text-[11px] text-mid">{String(idx + 1).padStart(2, "0")}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          );
        }
        if (block.kind === "question") {
          return (
            <div key={i} className="rounded-lg border border-dashed border-mid bg-mist px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-strong">
                <CircleHelp size={13} aria-hidden /> {block.heading}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-strong">{block.body}</p>
              <ul className="mt-2 space-y-1.5">
                {(block.items ?? []).map((item, idx) => (
                  <li key={idx} className="text-[13.5px] leading-relaxed">— {item}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (block.kind === "example") {
          return (
            <div key={i} className="rounded-lg bg-mist px-4 py-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-strong">{block.heading}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed">{block.body}</p>
            </div>
          );
        }
        if (block.kind === "warning") {
          return (
            <div key={i} className="rounded-lg border border-ink px-4 py-3.5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em]">{block.heading}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-strong">{block.body}</p>
            </div>
          );
        }
        return (
          <div key={i}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-strong">{block.heading}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed">{block.body}</p>
          </div>
        );
      })}

      {response.uncertaintyNote ? (
        <p className="border-l-2 border-line pl-3 text-[12px] leading-relaxed text-mid">
          <span className="font-medium text-strong">Uncertainty. </span>
          {response.uncertaintyNote}
        </p>
      ) : null}

      {response.sources.length > 0 ? (
        <div className="border-t border-line pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mid">Reviewed sources</p>
          <ul className="mt-1.5 space-y-1">
            {response.sources.map((s) => (
              <li key={s.resourceId} className="text-[12px] leading-relaxed text-strong">
                {s.title} <span className="text-mid">· {s.author}</span>
                {s.isDemo ? <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mid">demo</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function CheckCard({
  question,
  onGraded,
  onRetry,
}: {
  question: QuestionForGrading;
  onGraded: (correct: boolean) => void;
  onRetry: () => void;
}) {
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!response.trim()) {
      setError("Choose or type an answer first.");
      return;
    }
    // Instant local feedback, then persist the attempt server-side.
    const graded = gradeResponse(question, response);
    startTransition(async () => {
      try {
        const res = await submitAttempt({
          questionId: question.id,
          response,
          confidence: confidence ?? undefined,
        });
        setResult({ isCorrect: res.graded.isCorrect, feedback: res.graded.feedback });
        onGraded(res.graded.isCorrect);
      } catch (err) {
        setError((err as Error).message);
        void graded;
      }
    });
  };

  return (
    <Card className="mt-4 overflow-hidden p-0" >
      <div className="flex items-center justify-between border-b border-line bg-mist px-4 py-2.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-strong">Check your understanding</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">{question.type}</span>
      </div>
      <form onSubmit={submit} className="p-4 sm:p-5">
        <p className="text-[14px] font-medium leading-relaxed">{question.prompt}</p>

        {question.type === "mcq" ? (
          <fieldset className="mt-3.5 space-y-2" disabled={!!result}>
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((opt) => (
              <label
                key={opt.id}
                className={clsx(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13.5px] leading-snug transition-colors",
                  response === opt.id ? "border-ink bg-mist" : "border-line hover:border-mid",
                )}
              >
                <input
                  type="radio"
                  name="answer"
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
          <div className="mt-3.5">
            <label htmlFor="check-answer" className="sr-only">Your answer</label>
            <input
              id="check-answer"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={!!result}
              placeholder={question.type === "numeric" ? "Enter a number" : "Type a short answer"}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              autoComplete="off"
            />
          </div>
        )}

        {!result ? (
          <>
            <fieldset className="mt-3.5">
              <legend className="text-[11.5px] text-mid">How confident are you? (optional, stored as evidence)</legend>
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
            <div className="mt-4 flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Checking…" : "Submit answer"}
              </Button>
              <span className="text-[11.5px] text-mid">Graded locally · feedback is deterministic</span>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <div className={clsx("rounded-lg px-3.5 py-3 text-[13px] leading-relaxed", result.isCorrect ? "bg-ink text-paper" : "bg-mist text-ink")}>
              <p className="font-medium">{result.isCorrect ? "Correct." : "Not quite yet."}</p>
              <p className="mt-1">{result.feedback}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                <RotateCcw size={13} aria-hidden /> Try another check
              </Button>
              <p className="text-[11.5px] text-mid">Saved to your progress · affects your next recommendation</p>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}

export function TutorPanel({
  topicId,
  topicTitle,
  initialLevel,
  initialTurns,
  questions,
  hasChallenge,
}: {
  topicId: string;
  topicTitle: string;
  initialLevel: ExplanationLevel;
  initialTurns: PersistedTurn[];
  questions: QuestionForGrading[];
  hasChallenge: boolean;
}) {
  const [level, setLevel] = useState<ExplanationLevel>(initialLevel);
  const [mode, setMode] = useState<TutorMode>("simple");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<PersistedTurn[]>(initialTurns);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkQuestion, setCheckQuestion] = useState<QuestionForGrading | null>(null);
  const [lastGraded, setLastGraded] = useState<boolean | null>(null);
  const [helpfulState, setHelpfulState] = useState<Record<string, boolean>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const ask = (overrideText?: string) => {
    const text = (overrideText ?? question).trim();
    setError(null);
    if (!text && !overrideText) {
      askInternal("");
      return;
    }
    askInternal(text);
  };

  const askInternal = (text: string) => {
    startTransition(async () => {
      try {
        if (text) {
          setTurns((prev) => [
            ...prev,
            {
              id: `local-${Date.now()}`,
              role: "user",
              content: JSON.stringify({ question: text }),
              level,
              mode,
              createdAt: new Date().toISOString(),
              helpful: null,
            },
          ]);
        }
        const res = await askTutor({ topicId, level, mode, question: text || undefined });
        setTurns((prev) => [
          ...prev,
          {
            id: `local-r-${Date.now()}`,
            role: "tutor",
            content: JSON.stringify(res.response),
            level,
            mode,
            createdAt: res.response.generatedAt,
            helpful: null,
          },
        ]);
        setQuestion("");
        setCheckQuestion(questions[0] ?? null);
        requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const parsedTurns = useMemo<UiTurn[]>(
    () =>
      turns.map((t): UiTurn => {
        if (t.role === "user") {
          let q = "";
          try {
            q = JSON.parse(t.content).question ?? "";
          } catch {
            q = t.content;
          }
          return { kind: "user", id: t.id, question: q };
        }
        let parsed: TutorResponse | null = null;
        try {
          parsed = JSON.parse(t.content) as TutorResponse;
        } catch {
          parsed = null;
        }
        return { kind: "tutor", id: t.id, response: parsed, helpful: t.helpful };
      }),
    [turns],
  );

  const rate = (messageId: string, helpful: boolean) => {
    if (messageId.startsWith("local-")) return;
    setHelpfulState((s) => ({ ...s, [messageId]: helpful }));
    startTransition(async () => {
      try {
        await rateTutorMessage({ messageId, helpful });
      } catch {
        /* non-blocking */
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        {/* Controls */}
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="level" className="mb-1.5 block text-[12px] font-medium">Explanation level</label>
              <Select id="level" value={level} onChange={(e) => setLevel(e.target.value as ExplanationLevel)}>
                {EXPLANATION_LEVELS.map((l) => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-mid">{LEVEL_HINT[level]}</p>
            </div>
            <div>
              <label htmlFor="mode" className="mb-1.5 block text-[12px] font-medium">Explanation style</label>
              <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as TutorMode)}>
                {TUTOR_MODES.map((m) => (
                  <option key={m} value={m}>{MODE_LABELS[m]}</option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-mid">{MODE_HINT[mode]}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Button size="sm" onClick={() => askInternal("")} disabled={pending}>
              {pending ? "Preparing…" : `Explain “${topicTitle}”`}
            </Button>
            <span className="text-[11.5px] text-mid">Or ask a specific question below.</span>
          </div>
        </Card>

        {/* Conversation */}
        <div className="mt-4 space-y-4">
          {parsedTurns.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <p className="text-[15px] font-medium">Nothing asked yet.</p>
              <p className="mx-auto mt-1.5 max-w-[42ch] text-[13px] leading-relaxed text-strong">
                Choose a level and style above, then press Explain — or ask exactly what is confusing you. The demo
                tutor answers from curated notes for this topic.
              </p>
            </Card>
          ) : null}

          {parsedTurns.map((t) => {
            if (t.kind === "user") {
              return (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[13.5px] leading-relaxed text-paper">
                    {t.question || "(requested an explanation)"}
                  </div>
                </div>
              );
            }
            if (!t.response) return null;
            return (
              <Card key={t.id} className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-strong">
                    Demo tutor · curated response
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                    {LEVEL_LABELS[t.response.level]} · {MODE_LABELS[t.response.mode]}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <TutorBlocks response={t.response} />
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="mr-auto text-[11px] text-mid">Was this useful?</span>
                    <button
                      type="button"
                      aria-label="Mark as helpful"
                      onClick={() => rate(t.id, true)}
                      className={clsx(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px]",
                        helpfulState[t.id] === true || t.helpful === true ? "border-ink bg-ink text-paper" : "border-line text-strong hover:border-mid",
                      )}
                    >
                      <ThumbsUp size={11} aria-hidden /> Helpful
                    </button>
                    <button
                      type="button"
                      aria-label="Mark as not helpful"
                      onClick={() => rate(t.id, false)}
                      className={clsx(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px]",
                        helpfulState[t.id] === false || t.helpful === false ? "border-ink bg-ink text-paper" : "border-line text-strong hover:border-mid",
                      )}
                    >
                      <ThumbsDown size={11} aria-hidden /> Not helpful
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {pending ? (
            <Card className="flex items-center gap-2.5 p-4">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden />
              <p className="text-[12.5px] text-strong">Building the curated explanation…</p>
            </Card>
          ) : null}

          {error ? <InlineAlert tone="error" title="Tutor error">{error}</InlineAlert> : null}

          {checkQuestion ? (
            <CheckCard
              key={checkQuestion.id}
              question={checkQuestion}
              onGraded={(correct) => setLastGraded(correct)}
              onRetry={() => {
                const others = questions.filter((q) => q.id !== checkQuestion.id);
                const next = others[Math.floor(Math.random() * Math.max(others.length, 1))] ?? questions[0];
                setCheckQuestion(next);
                setLastGraded(null);
              }}
            />
          ) : null}

          {lastGraded !== null ? (
            <InlineAlert tone="success" title="Recorded">
              Your attempt is saved. Open your overview or practice page to see the adaptive next step and the
              evidence behind it.
            </InlineAlert>
          ) : null}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 mt-4 bg-paper pb-2 pt-2">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-paper p-2 pl-4 shadow-lift focus-within:border-ink">
            <label htmlFor="composer" className="sr-only">Ask a follow-up question</label>
            <textarea
              id="composer"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              rows={1}
              placeholder="Ask a follow-up — e.g. “what if resistance doubles?”"
              className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-snug focus:outline-none"
            />
            <button
              type="button"
              onClick={() => ask()}
              disabled={pending}
              aria-label="Send question"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-40"
            >
              <ArrowUp size={15} aria-hidden />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-mid">
            Demo tutor: deterministic responses from curated seed content. No live model is connected, and no answer
            is presented as an authoritative source.
          </p>
        </div>
      </div>

      {/* Context rail */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card className="p-4">
          <p className="eyebrow">Session context</p>
          <p className="mt-2 text-[14px] font-semibold">{topicTitle}</p>
          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-[12px] text-strong">
            <div className="flex justify-between gap-2">
              <dt>Level</dt><dd className="text-ink">{LEVEL_LABELS[level]}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Style</dt><dd className="text-ink">{MODE_LABELS[mode]}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Provider</dt><dd className="text-ink">Demo (curated)</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Checks</dt><dd className="text-ink">{questions.length} available</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-4">
          <p className="eyebrow">How to get value here</p>
          <ol className="mt-2 space-y-2 text-[12px] leading-relaxed text-strong">
            <li><span className="font-medium text-ink">1. Ask what is actually confusing.</span> “I don&apos;t get why current drops” beats “explain ”.</li>
            <li><span className="font-medium text-ink">2. Try the check.</span> A wrong answer is more useful than no answer.</li>
            <li><span className="font-medium text-ink">3. Use the recommendation.</span> It names the evidence behind it.</li>
            {hasChallenge ? <li><span className="font-medium text-ink">4. Apply it.</span> The linked mini-project turns this into a real artefact.</li> : null}
          </ol>
        </Card>

        <Card className="p-4">
          <p className="eyebrow">Honesty note</p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-strong">
            The tutor does not fabricate citations or answers outside its curated topics. If a topic is missing from
            the demo content set, it says so instead of improvising.
          </p>
        </Card>
      </aside>
    </div>
  );
}
