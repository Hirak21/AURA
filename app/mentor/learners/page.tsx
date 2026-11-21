import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, SectionTitle, EmptyState, StatusBadge } from "@/components/ui";
import { listTopics } from "@/lib/services/catalog";
import { getAttempts } from "@/lib/services/catalog";

export const metadata = { title: "Learners" };

export default async function MentorLearnersPage() {
  const mentor = await requireRolePage("mentor", "reviewer", "admin");
  const assignments = db
    .select()
    .from(schema.mentorAssignments)
    .where(and(eq(schema.mentorAssignments.mentorId, mentor.id), eq(schema.mentorAssignments.status, "active")))
    .all();

  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));
  const topics = listTopics();
  const topicById = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="max-w-[980px]">
      <p className="eyebrow">Mentor</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Assigned learners.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Only learners assigned to you are listed. Practice evidence is summarised as counts and recent attempts — not
        as a performance judgement.
      </p>

      <div className="mt-8">
        <SectionTitle eyebrow={`${assignments.length} active assignments`} title="Support scope" />
        {assignments.length === 0 ? (
          <EmptyState
            title="No learners assigned."
            body="An admin can create a mentor assignment from the members screen."
          />
        ) : (
          <div className="space-y-4">
            {assignments.map((a) => {
              const learner = userById.get(a.studentId);
              const attempts = learner ? getAttempts(learner.id) : [];
              const recent = [...attempts].reverse().slice(0, 4);
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[15px] font-semibold">{learner?.displayName}</p>
                      <p className="text-[12px] text-strong">{a.scope}</p>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                      since {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                    <div>
                      <p className="eyebrow mb-2">Practice summary</p>
                      <p className="text-[12.5px] text-strong">
                        {attempts.length} attempt{attempts.length === 1 ? "" : "s"} recorded ·{" "}
                        {attempts.filter((x) => x.isCorrect).length} correct
                      </p>
                      <ul className="mt-2 space-y-1">
                        {recent.map((r, i) => (
                          <li key={i} className="flex items-center gap-2 text-[11.5px]">
                            <StatusBadge label={r.isCorrect ? "✓" : "×"} tone={r.isCorrect ? "solid" : "outline"} />
                            <span className="text-strong">{topicById.get(r.topicId)?.title}</span>
                          </li>
                        ))}
                        {recent.length === 0 ? <li className="text-[11.5px] text-mid">No attempts yet.</li> : null}
                      </ul>
                    </div>
                    <div>
                      <p className="eyebrow mb-2">How to help</p>
                      <p className="text-[12px] leading-relaxed text-strong">
                        {attempts.length === 0
                          ? "Start by pointing them at a single topic and a 10-minute practice check."
                          : attempts.slice(-1)[0]?.isCorrect
                            ? "Their latest check was correct — a good moment to suggest the linked mini-project."
                            : "Their latest check was missed — ask which step felt unclear, then suggest the hint path rather than the answer."}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
