import { requireUser } from "@/lib/auth";
import {
  getAttempts,
  getQuestions,
  listTopics,
  getTopicStates,
  getPrerequisites,
} from "@/lib/services/catalog";
import { getPrimaryRecommendation } from "@/lib/services/recommendations";
import { PracticeRunner } from "@/components/practice-runner";
import { Card, SectionTitle, StatusBadge, EvidenceMeter } from "@/components/ui";
import { EVIDENCE_LABELS } from "@/lib/domain/types";
import Link from "next/link";

export const metadata = { title: "Practice" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const user = await requireUser();
  const { topic: topicParam } = await searchParams;
  const topics = listTopics();
  const attempts = getAttempts(user.id);
  const states = getTopicStates(user.id);
  const { recommendation } = getPrimaryRecommendation(user.id);

  const topicWithQuestions = topics.filter((t) => getQuestions(t.id).length > 0);
  const selected =
    topicWithQuestions.find((t) => t.id === topicParam) ??
    topicWithQuestions.find((t) => t.id === recommendation.topicId) ??
    topicWithQuestions[0];

  const questions = selected ? getQuestions(selected.id) : [];
  const prereqs = selected ? getPrerequisites(selected.id) : [];
  const attemptsByQuestion = new Map<string, boolean[]>();
  for (const a of attempts) {
    const prev = attemptsByQuestion.get(a.questionId) ?? [];
    attemptsByQuestion.set(a.questionId, [...prev, a.isCorrect]);
  }

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;

  return (
    <div className="max-w-[1080px]">
      <p className="eyebrow">Practice</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Check what you actually know.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Every attempt is graded deterministically and saved. Feedback tells you why an answer is right or wrong — and
        a missed answer becomes evidence the adaptive step can use.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="eyebrow">Attempts recorded</p>
          <p className="metric mt-1.5 text-[26px] font-medium">{totalAttempts}</p>
        </Card>
        <Card className="p-4">
          <p className="eyebrow">Correct (of all attempts)</p>
          <p className="metric mt-1.5 text-[26px] font-medium">
            {correctAttempts}<span className="text-[14px] text-mid"> / {totalAttempts}</span>
          </p>
          <p className="mt-1 text-[11px] text-mid">Not a score — a record. Retries count too.</p>
        </Card>
        <Card className="p-4">
          <p className="eyebrow">Topics with checks</p>
          <p className="metric mt-1.5 text-[26px] font-medium">{topicWithQuestions.length}</p>
        </Card>
      </div>

      {/* Topic picker */}
      <div className="mt-8">
        <SectionTitle
          eyebrow="Choose a topic"
          title="Guided practice"
          description="The recommendation picks a sensible default; you can always choose another topic."
        />
        <div className="flex flex-wrap gap-2">
          {topicWithQuestions.map((t) => {
            const active = selected?.id === t.id;
            return (
              <Link
                key={t.id}
                href={`/app/practice?topic=${t.id}`}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                  active ? "border-ink bg-ink text-paper" : "border-line text-strong hover:border-mid"
                }`}
              >
                {t.title}
                {t.id === recommendation.topicId ? (
                  <span className={`ml-1.5 font-mono text-[9.5px] uppercase ${active ? "text-paper/70" : "text-mid"}`}>
                    suggested
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <PracticeRunner
            key={selected.id}
            topicId={selected.id}
            topicTitle={selected.title}
            questions={questions}
            previous={Object.fromEntries(attemptsByQuestion)}
          />

          <aside className="space-y-4">
            <Card className="p-4">
              <p className="eyebrow">Why this topic</p>
              <p className="mt-2 text-[13px] leading-relaxed text-strong">{recommendation.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recommendation.evidence.map((e) => (
                  <span key={e} className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-strong">
                    {e}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="eyebrow">Evidence state</p>
              <p className="mt-1.5 text-[13px] font-medium">{EVIDENCE_LABELS[states[selected.id] ?? "not_started"]}</p>
              <div className="mt-2.5">
                <EvidenceMeter
                  filled={
                    states[selected.id] === "applied" ? 4 :
                    states[selected.id] === "building" ? 3 :
                    states[selected.id] === "practicing" ? 2 :
                    states[selected.id] === "exploring" ? 1 : 0
                  }
                  total={4}
                  label="explored → practised → built → applied"
                />
              </div>
            </Card>

            {prereqs.length > 0 ? (
              <Card className="p-4">
                <p className="eyebrow">Prerequisites</p>
                <ul className="mt-2 space-y-1.5">
                  {prereqs.map((p) => (
                    <li key={p.id}>
                      <Link href={`/app/practice?topic=${p.id}`} className="text-[12.5px] text-strong hover:text-ink">
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] leading-relaxed text-mid">
                  Missed prerequisite checks trigger a “revisit first” recommendation with the evidence named.
                </p>
              </Card>
            ) : null}

            <Card className="p-4">
              <p className="eyebrow">Your history here</p>
              <ul className="mt-2 space-y-1.5">
                {questions.map((q) => {
                  const history = attemptsByQuestion.get(q.id) ?? [];
                  return (
                    <li key={q.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate text-strong">{q.prompt.slice(0, 44)}…</span>
                      <span className="shrink-0 font-mono text-[10.5px] text-mid">
                        {history.length === 0 ? "new" : history.map((c) => (c ? "✓" : "×")).join("")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </aside>
        </div>
      ) : (
        <Card className="mt-8 p-8 text-center">
          <p className="text-[14px]">No topics with checks are seeded yet.</p>
        </Card>
      )}

      <div className="mt-8">
        <SectionTitle eyebrow="Recent attempts" title="What you have tried" />
        <Card className="divide-y divide-line">
          {attempts.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-strong">Attempts will appear here as you practise.</p>
          ) : (
            [...attempts]
              .reverse()
              .slice(0, 10)
              .map((a, i) => {
                const t = topics.find((x) => x.id === a.topicId);
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <StatusBadge label={a.isCorrect ? "correct" : "missed"} tone={a.isCorrect ? "solid" : "outline"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium">{t?.title}</p>
                      <p className="truncate text-[11.5px] text-strong">{a.questionId}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })
          )}
        </Card>
      </div>
    </div>
  );
}
