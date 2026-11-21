import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";
import { listSubjects, listTopics, safeJson } from "@/lib/services/catalog";

export const metadata = { title: "Learning Hub" };

const DIFFICULTY_LABEL: Record<string, string> = {
  intro: "Introductory",
  core: "Core",
  stretch: "Stretch",
};

export default async function LearnPage() {
  const subjects = listSubjects();
  const topics = listTopics();

  return (
    <div className="mx-auto max-w-public px-5 py-14 lg:px-8 lg:py-20">
      <p className="eyebrow accent-text">Learning hub</p>
      <h1 className="h-serif mt-3 max-w-[24ch] text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
        Pick the concept that is not clicking.
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-strong">
        Each topic has a curated explanation in four styles, an understanding check with feedback, and — where it
        exists — a linked build. Difficulty is a label on the topic, never a judgement about you.
      </p>

      <div className="mt-12 space-y-14">
        {subjects.map((subject) => {
          const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
          return (
            <section key={subject.id} aria-labelledby={`subject-${subject.id}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
                <h2 id={`subject-${subject.id}`} className="text-[20px] font-semibold tracking-[-0.02em]">
                  {subject.title}
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-mid">
                  {subjectTopics.length} topic{subjectTopics.length === 1 ? "" : "s"}
                </p>
              </div>
              <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-strong">{subject.description}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjectTopics.map((topic) => {
                  const outcomes = safeJson<string[]>(topic.outcomes, []);
                  return (
                    <Link key={topic.id} href={`/learn/${topic.id}`} className="group">
                      <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-mid">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge
                            label={DIFFICULTY_LABEL[topic.difficulty] ?? topic.difficulty}
                            tone="outline"
                          />
                        </div>
                        <h3 className="mt-4 text-[16px] font-semibold leading-snug">{topic.title}</h3>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-strong">{topic.summary}</p>
                        <ul className="mt-4 space-y-1.5">
                          {outcomes.slice(0, 2).map((o) => (
                            <li key={o} className="flex gap-2 text-[12px] leading-snug text-strong">
                              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mid" />
                              {o}
                            </li>
                          ))}
                        </ul>
                        <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                          Open topic <ArrowRight size={13} aria-hidden />
                        </span>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
