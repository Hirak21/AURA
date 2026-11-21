import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSubjects, listTopics, getTopicStates, getExplainedTopicIds } from "@/lib/services/catalog";
import { Card, SectionTitle, StatusBadge } from "@/components/ui";
import { EVIDENCE_LABELS } from "@/lib/domain/types";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "AI Tutor" };

export default async function TutorIndexPage() {
  const user = await requireUser();
  const subjects = listSubjects();
  const topics = listTopics();
  const states = getTopicStates(user.id);
  const explained = new Set(getExplainedTopicIds(user.id));

  return (
    <div className="max-w-[980px]">
      <p className="eyebrow">AI Tutor</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Pick a topic to work on.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        The tutor explains the same idea in four styles at three levels, then hands you a check. Sessions are saved per
        topic so you can resume where you stopped.
      </p>

      <div className="mt-8 space-y-10">
        {subjects.map((subject) => {
          const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
          if (subjectTopics.length === 0) return null;
          return (
            <section key={subject.id}>
              <SectionTitle eyebrow={`${subjectTopics.length} topics`} title={subject.title} />
              <ul className="grid gap-3 sm:grid-cols-2">
                {subjectTopics.map((t) => (
                  <li key={t.id}>
                    <Link href={`/app/tutor/${t.id}`} className="group block h-full">
                      <Card className="flex h-full flex-col p-4 transition-colors group-hover:border-mid">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge label={t.difficulty} tone="outline" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                            {explained.has(t.id) ? "session saved" : EVIDENCE_LABELS[states[t.id] ?? "not_started"]}
                          </span>
                        </div>
                        <p className="mt-2.5 text-[14.5px] font-semibold leading-snug">{t.title}</p>
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-strong">{t.summary}</p>
                        <span className="mt-auto pt-3 inline-flex items-center gap-1 text-[12px] font-medium">
                          Open tutor <ArrowRight size={12} aria-hidden />
                        </span>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
