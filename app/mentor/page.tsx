import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { Card, SectionTitle, StatusBadge, DemoBadge, EmptyState, LinkButton } from "@/components/ui";
import { ReviewForm } from "@/components/review-form";
import { listChallenges, listTopics, getProjectReviews } from "@/lib/services/catalog";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/domain/types";

export const metadata = { title: "Mentor workspace" };

export default async function MentorHome() {
  const mentor = await requireRolePage("mentor", "reviewer", "admin");

  const assignments = db
    .select()
    .from(schema.mentorAssignments)
    .where(and(eq(schema.mentorAssignments.mentorId, mentor.id), eq(schema.mentorAssignments.status, "active")))
    .all();

  const assignedStudentIds = new Set(assignments.map((a) => a.studentId));

  const allProjects = db.select().from(schema.projects).all();
  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));
  const challenges = listChallenges();
  const topics = listTopics();
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const challengeById = new Map(challenges.map((c) => [c.id, c]));

  const queue = allProjects
    .filter((p) => p.status === "submitted")
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));

  const inScope = queue.filter((p) => assignedStudentIds.has(p.authorId) || p.reviewerId === mentor.id);
  const others = queue.filter((p) => !inScope.includes(p));

  return (
    <div className="max-w-[1080px]">
      <p className="eyebrow">Mentor</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">
        {mentor.displayName.split(" ")[0]}, {queue.length} submission{queue.length === 1 ? "" : "s"} awaiting review.
      </h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Feedback is structured: a decision and a specific note the learner can act on. Approvals are what unlock the
        showcase — with the learner&apos;s consent.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <DemoBadge>Reviewer scope: {inScope.length} assigned · {others.length} outside your assignments</DemoBadge>
      </div>

      <div className="mt-8">
        <SectionTitle
          eyebrow="Queue"
          title="Your assigned submissions"
          description="Only learners assigned to you appear here in a production deployment; admin roles see all."
        />
        {inScope.length === 0 ? (
          <EmptyState
            title="Nothing in your queue right now."
            body="When a learner you mentor submits a project, it lands here with their note and evidence link."
            action={<LinkButton href="/mentor/learners" variant="secondary">See your learners</LinkButton>}
          />
        ) : (
          <div className="space-y-4">
            {inScope.map((p) => {
              const author = userById.get(p.authorId);
              const challenge = challengeById.get(p.challengeId);
              const topic = challenge ? topicById.get(challenge.topicId) : undefined;
              return (
                <Card key={p.id} className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={PROJECT_STATUS_LABELS[p.status as ProjectStatus]} tone="outline" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                        {topic?.title} · submitted{" "}
                        {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                    <span className="text-[12px] text-strong">{author?.displayName}</span>
                  </div>
                  <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:p-5">
                    <div>
                      <p className="text-[15px] font-semibold">{p.title}</p>
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-strong">{p.draft}</p>
                      {p.evidenceUrl ? (
                        <p className="mt-3 text-[12px]">
                          <span className="text-mid">Evidence: </span>
                          <span className="break-all font-mono text-[11.5px]">{p.evidenceUrl}</span>
                          <span className="ml-1 font-mono text-[9.5px] uppercase text-mid">(demo link, not fetched)</span>
                        </p>
                      ) : null}
                      <p className="mt-3 text-[11.5px] text-mid">
                        Challenge: {challenge?.title} · showcase consent:{" "}
                        {p.consentToShowcase ? "given" : "not given"}
                      </p>
                    </div>
                    <div>
                      <ReviewForm projectId={p.id} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {others.length > 0 ? (
        <div className="mt-10">
          <SectionTitle
            eyebrow="Visibility"
            title="Outside your assignments"
            description="Shown for demo completeness with an admin account. A production mentor would not see these."
          />
          <Card className="divide-y divide-line">
            {others.map((p) => {
              const author = userById.get(p.authorId);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.title}</span>
                  <span className="text-[11.5px] text-mid">{author?.displayName}</span>
                  <span className="text-[11.5px] text-mid">Not assigned to you</span>
                </div>
              );
            })}
          </Card>
        </div>
      ) : null}

      <div className="mt-10">
        <SectionTitle eyebrow="Assigned learners" title="Who you support" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => {
            const s = userById.get(a.studentId);
            const studentProjects = allProjects.filter((p) => p.authorId === a.studentId);
            return (
              <Card key={a.id} className="p-4">
                <p className="text-[14px] font-semibold">{s?.displayName}</p>
                <p className="mt-1 text-[12px] text-strong">{a.scope}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                  {studentProjects.length} submission{studentProjects.length === 1 ? "" : "s"}
                </p>
              </Card>
            );
          })}
          {assignments.length === 0 ? (
            <p className="text-[12.5px] text-strong">No learner assignments recorded for this mentor.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
