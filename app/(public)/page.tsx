import Link from "next/link";
import { ArrowRight, Check, Compass, Lightbulb, Wrench } from "lucide-react";
import { LinkButton, Card, DemoBadge, StatusBadge } from "@/components/ui";
import { CoreLogo } from "@/components/brand";
import { listSubjects, listTopics, listChallenges } from "@/lib/services/catalog";
import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { safeJson } from "@/lib/services/catalog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function LandingPage() {
  const subjects = listSubjects();
  const topics = listTopics();
  const challenges = listChallenges();
  const events = db
    .select()
    .from(schema.events)
    .where(eq(schema.events.status, "published"))
    .all()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 2);
  const showcased = db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.status, "showcased")))
    .all();

  const featured = topics.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden border-b border-line">
          <img src="/brand/aura-hero-ai-human.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" />
        <div aria-hidden className="hairline-grid absolute inset-0" />
        <div className="relative mx-auto max-w-public px-5 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.4fr)] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="accent-rule inline-block h-px w-8" />
                <p className="eyebrow accent-text">Guwahati University · Automation &amp; Robotics Association</p>
              </div>
              <h1 className="h-serif mt-5 max-w-[18ch] text-[40px] font-semibold leading-[1.04] sm:text-[56px] lg:text-[68px]">
                Build skills.
                <br />
                Create what matters.
              </h1>
              <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-strong sm:text-[17px]">
                AURA explains a hard concept at your level, checks whether you actually understood it, and then gives
                you a next step that says <em className="not-italic text-ink">why</em> — before connecting you to a
                practical build, a mentor and the equipment to make it real.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <LinkButton href="/learn" size="lg">
                  Explore learning <ArrowRight size={16} aria-hidden />
                </LinkButton>
                <LinkButton href="/about" size="lg" variant="secondary">
                  How AURA works
                </LinkButton>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
              <div className="relative overflow-hidden rounded-card border border-line bg-night">
                {/* Supplied project image. Treated as decorative; the identity is the official logo below. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/aura-hero-ai-human.jpg"
                  alt=""
                  aria-hidden
                  className="h-[280px] w-full object-cover object-center sm:h-[340px] lg:h-[440px]"
                  draggable={false}
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
                <span aria-hidden className="accent-rule absolute inset-x-0 top-0 h-px" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <CoreLogo width={150} inverse />
                  <p className="mt-5 text-[13px] font-medium leading-relaxed text-white">
                    Automation &amp; Robotics Association
                    <br />
                    Guwahati University
                  </p>
                  <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/60">
                    Learning &amp; Innovation OS
                  </p>
                </div>
              </div>
            </div>
          </div>

          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-6 sm:grid-cols-4">
            {[
              ["3", "subjects seeded"],
              ["7", "topics with checks"],
              ["1", "linked build path"],
              ["0", "fabricated claims"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="metric text-[22px] font-medium">{value}</dt>
                <dd className="mt-0.5 text-[12.5px] leading-snug text-strong">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- LOOP ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-public px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <div>
              <p className="eyebrow">The learning loop</p>
              <h2 className="h-serif mt-3 text-[28px] font-semibold leading-tight sm:text-[34px]">
                Three steps that turn confusion into evidence.
              </h2>
              <p className="mt-4 max-w-[42ch] text-[14.5px] leading-relaxed text-strong">
                Reading an explanation is not the same as understanding it. Each loop step records something real —
                an attempt, a hint you used, a project you submitted.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Compass,
                  step: "01",
                  title: "Understand",
                  body: "Pick a level and a style. The tutor explains the same idea as a plain summary, a worked example, or guiding questions.",
                },
                {
                  icon: Lightbulb,
                  step: "02",
                  title: "Practice",
                  body: "Short checks with real feedback. A wrong answer gets a hint and a simpler route, not a red X.",
                },
                {
                  icon: Wrench,
                  step: "03",
                  title: "Apply",
                  body: "Connect the topic to a mini-project. Submit a short design note, get mentor feedback, build the evidence.",
                },
              ].map(({ icon: Icon, step, title, body }) => (
                <li key={step}>
                  <Card className="h-full p-5">
                    <div className="flex items-center justify-between">
                      <Icon size={18} strokeWidth={1.6} aria-hidden />
                      <span className="metric text-[11px] text-mid">{step}</span>
                    </div>
                    <h3 className="mt-6 text-[15px] font-semibold">{title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-strong">{body}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- FEATURED TOPICS ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-public px-5 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Learning hub</p>
              <h2 className="h-serif mt-3 text-[28px] font-semibold sm:text-[34px]">Start with a real topic.</h2>
            </div>
            <Link href="/learn" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium hover:underline">
              Browse all topics <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((topic) => {
              const subject = subjects.find((s) => s.id === topic.subjectId);
              return (
                <Link key={topic.id} href={`/learn/${topic.id}`} className="group">
                  <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-mid">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={subject?.title ?? "Subject"} tone="outline" />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
                        {topic.difficulty}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold leading-snug">{topic.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-strong">{topic.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium">
                      Open topic <ArrowRight size={13} aria-hidden />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- APPLY ---------------- */}
      <section className="border-b border-line bg-mist">
        <div className="mx-auto max-w-public px-5 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">From topic to build</p>
              <h2 className="h-serif mt-3 text-[28px] font-semibold leading-tight sm:text-[34px]">
                Ohm&apos;s Law is not a quiz answer. It is a resistor you choose.
              </h2>
              <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-strong">
                Every AURA topic can end in an application activity. After studying basic electronics, learners open{" "}
                <span className="font-medium text-ink">Design a safe LED circuit</span>, write a design note, and get
                mentor feedback — the same records that power the workshop kit list.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Linked concepts shown before you start",
                  "Draft and submit with evidence link",
                  "Structured mentor review, not anonymous likes",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[13.5px] text-strong">
                    <Check size={15} className="mt-0.5 shrink-0 text-ink" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <LinkButton href={`/app/projects`} variant="secondary">
                  View the mini-projects
                </LinkButton>
              </div>
            </div>
            <Card className="self-start p-0">
              <div className="border-b border-line px-5 py-4">
                <p className="eyebrow">Linked challenge</p>
                <p className="mt-1 text-[15px] font-semibold">{challenges[0]?.title ?? "Design a safe LED circuit"}</p>
              </div>
              <div className="px-5 py-4 text-[13px] leading-relaxed text-strong">
                <p className="font-medium text-ink">Objective</p>
                <p className="mt-1">{challenges[0]?.objective ?? ""}</p>
                <p className="mt-4 font-medium text-ink">Required concepts</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {safeJson<string[]>(challenges[0]?.requiredConceptsJson ?? "[]", []).map((c) => (
                    <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-line px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-mid">
                <span>~{challenges[0]?.estimatedHours ?? 2} hours</span>
                <DemoBadge>Demo challenge</DemoBadge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ---------------- EVENTS + SHOWCASE ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-public gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="eyebrow">Workshops</p>
                <h2 className="h-serif mt-2 text-[24px] font-semibold">Learn with others</h2>
              </div>
              <Link href="/events" className="text-[13px] font-medium hover:underline">
                All events
              </Link>
            </div>
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href="/events" className="group block">
                    <Card className="p-4 transition-colors group-hover:border-mid">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-mid">
                          {formatDate(e.startsAt)} · {e.venue}
                        </p>
                        <DemoBadge />
                      </div>
                      <p className="mt-2 text-[14.5px] font-medium leading-snug">{e.title}</p>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-strong">{e.summary}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="eyebrow">Showcase</p>
                <h2 className="h-serif mt-2 text-[24px] font-semibold">Built by learners</h2>
              </div>
              <Link href="/projects" className="text-[13px] font-medium hover:underline">
                Showcase
              </Link>
            </div>
            {showcased.length > 0 ? (
              <ul className="space-y-3">
                {showcased.map((p) => (
                  <li key={p.id}>
                    <Card className="p-4">
                      <p className="text-[14.5px] font-medium">{p.title}</p>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-strong">{p.draft}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="border-dashed p-6">
                <p className="text-[14px] font-medium">No public projects yet.</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-strong">
                  Projects appear here only after mentor approval <em className="not-italic">and</em> the author&apos;s
                  explicit consent. That is why this space is empty in a fresh demo — nothing is faked to fill it.
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- SCHOOL CTA ---------------- */}
      <section>
        <div className="mx-auto max-w-public px-5 py-16 lg:px-8 lg:py-20">
          <Card className="relative overflow-hidden p-8 sm:p-12">
            <div aria-hidden className="accent-rule absolute inset-x-0 top-0 h-[2px]" />
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <p className="eyebrow">For schools</p>
                <h2 className="h-serif mt-3 max-w-[26ch] text-[26px] font-semibold leading-tight sm:text-[32px]">
                  Bring a circuits or robotics session to your students.
                </h2>
                <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-strong">
                  Submit a request with your school, grade range and preferred dates. AURA&apos;s liaison team reviews
                  it, and approved requests become workshops with mentors and equipment assigned.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <LinkButton href="/collaborate" size="lg">
                  Request a workshop <ArrowRight size={16} aria-hidden />
                </LinkButton>
                <p className="text-[12px] text-mid">Takes about two minutes · No account required</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
