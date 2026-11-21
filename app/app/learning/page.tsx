import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  listSubjects,
  listTopics,
  getTopicStates,
  getAttempts,
  getExplainedTopicIds,
  getLearnerProjects,
  listChallenges,
} from "@/lib/services/catalog";
import { Card, EvidenceMeter, LinkButton, SectionTitle, StatusBadge, EmptyState } from "@/components/ui";
import { EVIDENCE_LABELS, type TopicEvidenceState } from "@/lib/domain/types";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "My Learning" };

const filledFor = (s: TopicEvidenceState | undefined) =>
  s === "applied" ? 4 : s === "building" ? 3 : s === "practicing" ? 2 : s === "exploring" ? 1 : 0;

export default async function MyLearningPage() {
  const user = await requireUser();
  const subjects = listSubjects();
  const topics = listTopics();
  const states = getTopicStates(user.id);
  const explained = new Set(getExplainedTopicIds(user.id));
  const attempts = getAttempts(user.id);
  const projects = getLearnerProjects(user.id);
  const challenges = listChallenges();
  const challengeById = new Map(challenges.map((c) => [c.id, c]));

  const studied = topics.filter((t) => (states[t.id] ?? "not_started") !== "not_started");

  return (
    <div className="max-w-[1080px]">
      <p className="eyebrow">My learning</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Evidence, topic by topic.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        There is no mastery percentage here on purpose. A topic advances through four observable states — explored,
        practised, built, applied — and each state is backed by a record you can open.
      </p>

      <div className="mt-8">
        <SectionTitle
          eyebrow={`${studied.length} of ${topics.length} topics touched`}
          title="Your topics"
          description="States derive from tutor sessions, graded attempts, and project submissions."
        />
        {studied.length === 0 ? (
          <EmptyState
            title="Nothing studied yet."
            body="Open a topic and ask the tutor one question — that alone moves it to “explored”."
            action={<LinkButton href="/app/tutor">Open the tutor</LinkButton>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {studied.map((t) => {
              const state = states[t.id] ?? "not_started";
              const subject = subjects.find((s) => s.id === t.subjectId);
              const topicAttempts = attempts.filter((a) => a.topicId === t.id);
              return (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge label={subject?.title ?? ""} tone="outline" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                      {attempts.length ? `${topicAttempts.length} attempts` : explained.has(t.id) ? "tutor only" : ""}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[14.5px] font-semibold">{t.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-strong">{EVIDENCE_LABELS[state]}</p>
                  <div className="mt-3">
                    <EvidenceMeter filled={filledFor(state)} total={4} label="evidence steps" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <LinkButton href={`/app/tutor/${t.id}`} size="sm" variant="secondary">
                      Tutor <ArrowRight size={12} aria-hidden />
                    </LinkButton>
                    <LinkButton href={`/app/practice?topic=${t.id}`} size="sm" variant="tertiary">
                      Practice
                    </LinkButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="mt-10">
          <SectionTitle eyebrow="Applications" title="Your project evidence" />
          <Card className="divide-y divide-line">
            {projects.map((p) => {
              const challenge = challengeById.get(p.challengeId);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{p.title}</p>
                    <p className="text-[11.5px] text-strong">{challenge?.title}</p>
                  </div>
                  <StatusBadge label={p.status.replace("_", " ")} tone={p.status === "approved" || p.status === "showcased" ? "solid" : "outline"} />
                  <LinkButton href="/app/projects" size="sm" variant="tertiary">
                    Open
                  </LinkButton>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      <div className="mt-10">
        <SectionTitle eyebrow="Remaining" title="Not started yet" />
        <div className="flex flex-wrap gap-2">
          {topics
            .filter((t) => (states[t.id] ?? "not_started") === "not_started")
            .map((t) => (
              <Link
                key={t.id}
                href={`/app/tutor/${t.id}`}
                className="rounded-full border border-line px-3 py-1.5 text-[12.5px] text-strong hover:border-mid hover:text-ink"
              >
                {t.title}
              </Link>
            ))}
          {topics.every((t) => (states[t.id] ?? "not_started") !== "not_started") ? (
            <p className="text-[12.5px] text-strong">Every seeded topic has been touched. Keep building evidence.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
