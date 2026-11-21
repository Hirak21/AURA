import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookMarked, Layers } from "lucide-react";
import { Card, LinkButton, StatusBadge, DemoBadge } from "@/components/ui";
import {
  getTopic,
  getSubject,
  getPrerequisites,
  getResources,
  getQuestions,
  getChallengeForTopic,
  listTopics,
  safeJson,
} from "@/lib/services/catalog";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  return { title: topic ? topic.title : "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic || !topic.published) notFound();

  const subject = getSubject(topic.subjectId);
  const prereqs = getPrerequisites(topic.id);
  const resources = getResources(topic.id);
  const questions = getQuestions(topic.id);
  const challenge = getChallengeForTopic(topic.id);
  const outcomes = safeJson<string[]>(topic.outcomes, []);
  const siblingTopics = listTopics().filter((t) => t.subjectId === topic.subjectId && t.id !== topic.id);

  return (
    <div className="mx-auto max-w-public px-5 py-12 lg:px-8 lg:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.1em] text-mid">
        <Link href="/learn" className="hover:text-ink">Learning</Link>
        <span aria-hidden className="mx-2">/</span>
        <span>{subject?.title}</span>
        <span aria-hidden className="mx-2">/</span>
        <span className="text-ink">{topic.title}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={subject?.title ?? ""} tone="outline" />
            <StatusBadge label={topic.difficulty} tone="neutral" />
          </div>
          <h1 className="h-serif mt-4 text-[34px] font-semibold leading-[1.08] sm:text-[44px]">{topic.title}</h1>
          <p className="mt-4 max-w-[62ch] text-[15.5px] leading-relaxed text-strong">{topic.summary}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={`/app/tutor/${topic.id}`} size="lg">
              Open the tutor <ArrowRight size={16} aria-hidden />
            </LinkButton>
            {challenge ? (
              <LinkButton href={`/app/projects?challenge=${challenge.id}`} size="lg" variant="secondary">
                See the linked build
              </LinkButton>
            ) : null}
          </div>

          <section className="mt-12">
            <h2 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-strong">
              By the end you should be able to
            </h2>
            <ul className="mt-4 space-y-2.5">
              {outcomes.map((o) => (
                <li key={o} className="flex gap-3 text-[14px] leading-relaxed">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          {prereqs.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-strong">
                Prerequisites
              </h2>
              <p className="mt-2 text-[13.5px] text-strong">
                You can start here anyway — the tutor will remind you where these matter, and the adaptive step will
                send you back if your attempts suggest a gap.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {prereqs.map((p) => (
                  <Link
                    key={p.id}
                    href={`/learn/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:border-mid"
                  >
                    <Layers size={12} aria-hidden /> {p.title}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {challenge ? (
            <section className="mt-10">
              <h2 className="text-[15px] font-semibold uppercase tracking-[0.06em] text-strong">Apply it</h2>
              <Card className="mt-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold">{challenge.title}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-strong">{challenge.summary}</p>
                  </div>
                  <DemoBadge>Demo build</DemoBadge>
                </div>
                <LinkButton href={`/app/projects?challenge=${challenge.id}`} variant="secondary" size="sm" className="mt-4">
                  Open mini-project
                </LinkButton>
              </Card>
            </section>
          ) : null}
        </div>

        {/* Rail */}
        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-strong">
              <BookMarked size={14} aria-hidden /> Reviewed resources
            </h2>
            {resources.length === 0 ? (
              <p className="mt-3 text-[13px] text-strong">No reviewed resources yet for this topic.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {resources.map((r) => (
                  <li key={r.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
                    <p className="text-[13.5px] font-medium leading-snug">{r.title}</p>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
                      {r.type} · {r.level} · reviewed
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] leading-relaxed text-mid">
              Source links in this prototype point to demo records, not live external pages.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-strong">Checks available</h2>
            <p className="mt-2 metric text-[26px] font-medium">{questions.length}</p>
            <p className="text-[12.5px] text-strong">
              {questions.filter((q) => q.type === "mcq").length} multiple choice ·{" "}
              {questions.filter((q) => q.type === "numeric").length} numeric ·{" "}
              {questions.filter((q) => q.type === "short").length} short answer
            </p>
          </Card>

          {siblingTopics.length > 0 ? (
            <Card className="p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-strong">In this subject</h2>
              <ul className="mt-3 space-y-2">
                {siblingTopics.map((t) => (
                  <li key={t.id}>
                    <Link href={`/learn/${t.id}`} className="text-[13.5px] text-strong hover:text-ink">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
