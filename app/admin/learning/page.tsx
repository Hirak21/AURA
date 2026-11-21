import Link from "next/link";
import { requireRolePage } from "@/lib/auth";
import {
  listSubjects,
  listTopics,
  getQuestions,
  getResources,
  getPrerequisites,
  safeJson,
  getAttempts,
} from "@/lib/services/catalog";
import { db, schema } from "@/lib/db/client";
import { Card, SectionTitle, StatusBadge, DataTable, Th, Td, DemoBadge } from "@/components/ui";

export const metadata = { title: "Admin · Learning content" };

export default async function AdminLearningPage() {
  await requireRolePage("curator", "admin", "mentor");
  const subjects = listSubjects();
  const topics = listTopics();
  const attempts = db.select().from(schema.practiceAttempts).all();
  const sessions = db.select().from(schema.tutorSessions).all();

  return (
    <div className="max-w-[1120px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Core OS</p>
          <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Learning content.</h1>
          <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
            Topics, prerequisites, reviewed resources and practice questions. Content editing is read-only in this
            prototype; the seed set is the curated source the demo tutor answers from.
          </p>
        </div>
        <DemoBadge>Seeded content · read-only here</DemoBadge>
      </div>

      <div className="mt-8 space-y-8">
        {subjects.map((s) => {
          const subjectTopics = topics.filter((t) => t.subjectId === s.id);
          return (
            <section key={s.id}>
              <SectionTitle eyebrow={`${subjectTopics.length} topics`} title={s.title} description={s.description} />
              <div className="space-y-3">
                {subjectTopics.map((t) => {
                  const questions = getQuestions(t.id);
                  const resources = getResources(t.id);
                  const prereqs = getPrerequisites(t.id);
                  const topicAttempts = attempts.filter((a) => a.topicId === t.id);
                  const topicSessions = sessions.filter((x) => x.topicId === t.id);
                  const outcomes = safeJson<string[]>(t.outcomes, []);
                  return (
                    <Card key={t.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[14.5px] font-semibold">{t.title}</p>
                          <StatusBadge label={t.difficulty} tone="outline" />
                          <StatusBadge label={t.published ? "published" : "draft"} tone="neutral" />
                        </div>
                        <div className="flex gap-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mid">
                          <span>{questions.length} checks</span>
                          <span>{resources.length} resources</span>
                          <span>{topicSessions.length} tutor sessions</span>
                          <span>{topicAttempts.length} attempts</span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-strong">{t.summary}</p>

                      <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
                        <div>
                          <p className="eyebrow mb-1">Outcomes</p>
                          <ul className="space-y-1 text-[11.5px] leading-snug text-strong">
                            {outcomes.map((o) => <li key={o}>• {o}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="eyebrow mb-1">Prerequisites</p>
                          {prereqs.length === 0 ? (
                            <p className="text-[11.5px] text-mid">None</p>
                          ) : (
                            <ul className="space-y-1 text-[11.5px] leading-snug text-strong">
                              {prereqs.map((p) => (
                                <li key={p.id}>• {p.title}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="eyebrow mb-1">Reviewed resources</p>
                          {resources.length === 0 ? (
                            <p className="text-[11.5px] text-mid">None yet</p>
                          ) : (
                            <ul className="space-y-1 text-[11.5px] leading-snug text-strong">
                              {resources.map((r) => (
                                <li key={r.id}>• {r.title}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10">
        <SectionTitle
          eyebrow="Quality"
          title="Practice question bank"
          description="Answers stay server-side and are only used by the deterministic grader."
        />
        <DataTable caption="Practice question bank">
          <thead>
            <tr>
              <Th>Question</Th>
              <Th>Topic</Th>
              <Th>Type</Th>
              <Th>Difficulty</Th>
              <Th>Attempts</Th>
            </tr>
          </thead>
          <tbody>
            {topics.flatMap((t) =>
              getQuestions(t.id).map((q) => {
                const count = attempts.filter((a) => a.questionId === q.id).length;
                return (
                  <tr key={q.id}>
                    <Td className="max-w-[380px] text-[12.5px]"><span className="line-clamp-2">{q.prompt}</span></Td>
                    <Td className="text-[12px]">{t.title}</Td>
                    <Td className="text-[12px]">{q.type}</Td>
                    <Td className="text-[12px]">{q.difficulty}</Td>
                    <Td className="metric text-[12px]">{count}</Td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </DataTable>
        <p className="mt-2 text-[11px] text-mid">
          To change content, edit <code className="font-mono">lib/db/seed.ts</code> and run{" "}
          <code className="font-mono">npm run db:reset</code>. A curator authoring UI is a P1 item, deliberately not
          faked here.
        </p>
      </div>
    </div>
  );
}
