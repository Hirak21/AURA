import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { Card, SectionTitle, StatusBadge, DemoBadge, EmptyState, LinkButton } from "@/components/ui";
import { ProjectEditor } from "@/components/project-editor";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/domain/types";
import { getProjectReviews, listChallenges, listTopics, safeJson, getTopicStates } from "@/lib/services/catalog";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Projects" };

export default async function StudentProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const user = await requireUser();
  const { challenge: challengeParam } = await searchParams;
  const challenges = listChallenges();
  const topics = listTopics();
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const states = getTopicStates(user.id);

  const myProjects = db.select().from(schema.projects).where(eq(schema.projects.authorId, user.id)).all();

  const selectedChallenge =
    challenges.find((c) => c.id === challengeParam) ??
    challenges.find((c) => myProjects.some((p) => p.challengeId === c.id && p.status === "draft")) ??
    challenges[0];

  const existingForSelected = myProjects.find((p) => p.challengeId === selectedChallenge?.id);
  const reviews = existingForSelected ? getProjectReviews(existingForSelected.id) : [];

  return (
    <div className="max-w-[1080px]">
      <p className="eyebrow">Apply</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Turn understanding into an artefact.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        A mini-project is a short written design note with optional evidence. Submit it, and a mentor reviews it with
        structured feedback. No hardware verification is claimed by this prototype.
      </p>

      {challenges.length === 0 ? (
        <EmptyState title="No challenges published yet." body="A curator can publish a challenge from the admin workspace." />
      ) : (
        <>
          <div className="mt-8">
            <SectionTitle eyebrow="Challenges" title="Choose an application activity" />
            <div className="grid gap-3 sm:grid-cols-2">
              {challenges.map((c) => {
                const t = topicById.get(c.topicId);
                const active = c.id === selectedChallenge?.id;
                const mine = myProjects.find((p) => p.challengeId === c.id);
                return (
                  <Link
                    key={c.id}
                    href={`/app/projects?challenge=${c.id}`}
                    className={`block rounded-card border p-4 transition-colors ${
                      active ? "border-ink bg-mist" : "border-line hover:border-mid"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge label={t?.title ?? "Topic"} tone="outline" />
                      {mine ? (
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mid">
                          {mine.status.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mid">new</span>
                      )}
                    </div>
                    <p className="mt-2.5 text-[14px] font-semibold leading-snug">{c.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-strong">{c.summary}</p>
                    <p className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-medium">
                      Open <ArrowRight size={11} aria-hidden />
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {selectedChallenge ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[17px] font-semibold">{selectedChallenge.title}</h2>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-strong">{selectedChallenge.objective}</p>
                    </div>
                    <DemoBadge>Demo challenge</DemoBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                    {safeJson<string[]>(selectedChallenge.requiredConceptsJson, []).map((c) => (
                      <span key={c} className="rounded-full bg-mist px-2.5 py-0.5 text-[11px] text-strong">{c}</span>
                    ))}
                    <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase text-mid">
                      ~{selectedChallenge.estimatedHours}h
                    </span>
                  </div>
                </Card>

                <div className="mt-5">
                  <ProjectEditor
                    key={selectedChallenge.id}
                    challengeId={selectedChallenge.id}
                    challengeTitle={selectedChallenge.title}
                    existing={
                      existingForSelected
                        ? {
                            id: existingForSelected.id,
                            title: existingForSelected.title,
                            draft: existingForSelected.draft,
                            evidenceUrl: existingForSelected.evidenceUrl,
                            status: existingForSelected.status,
                            consentToShowcase: existingForSelected.consentToShowcase,
                          }
                        : null
                    }
                  />
                </div>

                {existingForSelected && reviews.length > 0 ? (
                  <div className="mt-5">
                    <Card className="p-5">
                      <p className="eyebrow">Mentor feedback</p>
                      <ul className="mt-3 space-y-3">
                        {reviews.map((r) => (
                          <li key={r.id} className="border-l-2 border-ink pl-3">
                            <p className="flex items-center gap-2 text-[11px] text-mid">
                              <CheckCircle2 size={12} aria-hidden />
                              {r.decision === "approved" ? "Approved" : "Changes requested"} ·{" "}
                              {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed">{r.feedback}</p>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                ) : null}
              </div>

              <aside className="space-y-4">
                <Card className="p-4">
                  <p className="eyebrow">Readiness</p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-strong">
                    Topic state:{" "}
                    <span className="font-medium text-ink">
                      {states[selectedChallenge.topicId] ?? "not_started"}
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-mid">
                    Submitting without a practice attempt is allowed — the review may just ask for it. AURA does not
                    block you from applying, and does not pretend you have mastered the topic either.
                  </p>
                </Card>

                {myProjects.length > 0 ? (
                  <Card className="p-4">
                    <p className="eyebrow">All your submissions</p>
                    <ul className="mt-2 space-y-2">
                      {myProjects.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-medium">{p.title}</span>
                          <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mid">
                            {PROJECT_STATUS_LABELS[p.status as ProjectStatus].split(" —")[0]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}

                <Card className="p-4">
                  <p className="eyebrow">The review rules</p>
                  <ul className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-strong">
                    <li>Only mentors, reviewers or admins can leave feedback.</li>
                    <li>Drafts are private; submissions are visible to assigned reviewers.</li>
                    <li>Showcase requires approval <em className="not-italic">and</em> your consent.</li>
                  </ul>
                </Card>
              </aside>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
