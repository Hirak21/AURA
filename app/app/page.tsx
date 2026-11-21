import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  getRecentActivity,
  getTopicStates,
  getLearnerProjects,
  getQuestions,
  listTopics,
  listChallenges,
  safeJson,
} from "@/lib/services/catalog";
import { getPrimaryRecommendation } from "@/lib/services/recommendations";
import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, LinkButton, StatusBadge, EvidenceMeter, DemoBadge } from "@/components/ui";
import { EVIDENCE_LABELS, type TopicEvidenceState } from "@/lib/domain/types";
import { ArrowRight, ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";

export const metadata = { title: "Overview" };

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export default async function StudentOverview() {
  const user = await requireUser();
  const topics = listTopics();
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const questions = topics.flatMap((t) => getQuestions(t.id));
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const { recommendation } = getPrimaryRecommendation(user.id);
  const states = getTopicStates(user.id);
  const recent = getRecentActivity(user.id, 5);
  const projects = getLearnerProjects(user.id);
  const challenges = listChallenges();
  const challengeByTopic = new Map(challenges.map((c) => [c.topicId, c]));

  const recTopic = topicById.get(recommendation.topicId) ?? topics[0];
  const linkedChallenge = challengeByTopic.get(recTopic.id);

  const upcoming = db
    .select()
    .from(schema.events)
    .where(eq(schema.events.status, "published"))
    .all()
    .filter((e) => new Date(e.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const registeredUpcoming = upcoming
    ? db
        .select()
        .from(schema.eventRegistrations)
        .where(
          and(
            eq(schema.eventRegistrations.eventId, upcoming.id),
            eq(schema.eventRegistrations.userId, user.id),
            eq(schema.eventRegistrations.status, "registered"),
          ),
        )
        .all()[0]
    : undefined;

  const activeProject = projects.find((p) => p.status !== "showcased");
  const exploredCount = Object.values(states).filter((s) => s !== "not_started").length;

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">
            {user.displayName.split(" ")[0]}, here is your next step.
          </h1>
          <p className="mt-1.5 text-[13.5px] text-strong">
            Goal: <span className="text-ink">{user.learningGoal ?? "not set yet — add one in your profile"}</span>
          </p>
        </div>
        <LinkButton href={`/app/tutor/${recTopic.id}`}>
          Continue learning <ArrowRight size={15} aria-hidden />
        </LinkButton>
      </div>

      {/* Recommendation card — the heart of the overview */}
      <Card className="mt-7 overflow-hidden p-0">
        <div className="border-b border-line bg-mist px-5 py-3">
          <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-strong">
            <Sparkles size={12} aria-hidden /> Recommended next · explainable
          </p>
        </div>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[18px] font-semibold leading-snug">{recommendation.label}</h2>
            <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-strong">{recommendation.reason}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {recommendation.evidence.map((e) => (
                <span key={e} className="rounded-full border border-line bg-paper px-2.5 py-0.5 font-mono text-[10.5px] text-strong">
                  {e}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href={`/app/tutor/${recommendation.topicId}`} size="sm">
                Open tutor
              </LinkButton>
              <LinkButton href="/app/practice" size="sm" variant="secondary">
                Go to practice
              </LinkButton>
              <LinkButton href={`/learn/${recommendation.topicId}`} size="sm" variant="tertiary">
                Read the topic page
              </LinkButton>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="eyebrow">Evidence used</p>
            <ul className="mt-2 space-y-2 text-[12.5px] leading-snug text-strong">
              <li>Attempts on this topic: <span className="metric text-ink">{recent.filter((a) => a.topicId === recTopic.id).length}</span></li>
              <li>Topics explored: <span className="metric text-ink">{exploredCount}</span> of {topics.length}</li>
              <li>Evidence state: <span className="text-ink">{EVIDENCE_LABELS[states[recTopic.id] ?? "not_started"]}</span></li>
            </ul>
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-mid">
              Rules run locally on recorded attempts. No ability score is computed or stored.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Recent evidence */}
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-[16px] font-semibold">Recent evidence</h2>
            <Link href="/app/practice" className="text-[12.5px] font-medium hover:underline">
              Practice tasks
            </Link>
          </div>
          <Card className="divide-y divide-line">
            {recent.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[14px] font-medium">No attempts yet.</p>
                <p className="mx-auto mt-1 max-w-[36ch] text-[12.5px] leading-relaxed text-strong">
                  Answer one check and this panel will show it — with the question, your response and whether it was
                  correct.
                </p>
                <LinkButton href="/app/practice" size="sm" className="mt-4">
                  Make a first attempt
                </LinkButton>
              </div>
            ) : (
              recent.map((a) => {
                const q = questionById.get(a.questionId);
                const t = topicById.get(a.topicId);
                return (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                        a.isCorrect ? "bg-ink text-paper" : "border border-ink text-ink"
                      }`}
                    >
                      {a.isCorrect ? "✓" : "×"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{t?.title ?? "Topic"}</p>
                      <p className="truncate text-[12px] text-strong">{q?.prompt ?? "Question"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">{relative(a.createdAt)}</p>
                      <p className="text-[11.5px] text-strong">{a.isCorrect ? "correct" : "missed"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Action rail */}
        <div className="space-y-6">
          {linkedChallenge ? (
            <Card className="p-5">
              <p className="eyebrow">Apply it</p>
              <p className="mt-2 text-[14px] font-semibold leading-snug">{linkedChallenge.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-strong">{linkedChallenge.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {safeJson<string[]>(linkedChallenge.requiredConceptsJson, []).slice(0, 3).map((c) => (
                  <span key={c} className="rounded-full bg-mist px-2 py-0.5 text-[10.5px] text-strong">{c}</span>
                ))}
              </div>
              <LinkButton
                href={`/app/projects?challenge=${linkedChallenge.id}`}
                variant="secondary"
                size="sm"
                className="mt-4"
              >
                {activeProject ? "Continue project" : "Start mini-project"}
              </LinkButton>
            </Card>
          ) : null}

          {upcoming ? (
            <Card className="p-5">
              <p className="eyebrow flex items-center gap-1.5">
                <CalendarDays size={11} aria-hidden /> Upcoming
              </p>
              <p className="mt-2 text-[14px] font-semibold leading-snug">{upcoming.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-mid">
                {new Date(upcoming.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                {upcoming.venue}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {registeredUpcoming ? (
                  <StatusBadge label="Registered" tone="solid" />
                ) : (
                  <LinkButton href="/app/events" size="sm" variant="secondary">
                    View &amp; register
                  </LinkButton>
                )}
                <DemoBadge />
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="eyebrow">Topic progress</p>
            <div className="mt-3 space-y-3">
              {topics.slice(0, 4).map((t) => {
                const state = states[t.id] ?? "not_started";
                const filled =
                  state === "applied" ? 4 : state === "building" ? 3 : state === "practicing" ? 2 : state === "exploring" ? 1 : 0;
                return (
                  <div key={t.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Link href={`/app/tutor/${t.id}`} className="truncate text-[12.5px] font-medium hover:underline">
                        {t.title}
                      </Link>
                      <span className="shrink-0 text-[10.5px] text-mid">{EVIDENCE_LABELS[state as TopicEvidenceState]}</span>
                    </div>
                    <EvidenceMeter filled={filled} total={4} label="evidence steps" />
                  </div>
                );
              })}
            </div>
            <Link
              href="/app/learning"
              className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline"
            >
              All learning <ArrowUpRight size={12} aria-hidden />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
