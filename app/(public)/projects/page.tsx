import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, DemoBadge, EmptyState, LinkButton } from "@/components/ui";
import { UserRound } from "lucide-react";

export const metadata = { title: "Project Showcase" };

export default async function ProjectsShowcasePage() {
  const showcased = db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.status, "showcased"), eq(schema.projects.consentToShowcase, true)))
    .all();

  const approved = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.status, "approved"))
    .all().length;

  return (
    <div className="mx-auto max-w-public px-5 py-14 lg:px-8 lg:py-20">
      <p className="eyebrow accent-text">Showcase</p>
      <h1 className="h-serif mt-3 max-w-[24ch] text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
        Work that earned its place here.
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-strong">
        A project appears publicly only with two things: mentor approval and the author&apos;s explicit consent. In
        this demo, {approved} approved project{approved === 1 ? "" : "s"} exist but {approved === 0 ? "have" : "has"}{" "}
        not been opted in — which is exactly why this page may be empty.
      </p>

      <div className="mt-12">
        {showcased.length === 0 ? (
          <EmptyState
            title="Nothing public yet — and nothing faked to fill the gap."
            body="The showcase is consent-gated. Students can opt in from their project page, and an admin approves the public listing. Try it end-to-end in the demo: submit a project as Ananya, review it as Kabir, opt in, then approve it as Jyoti."
            action={<LinkButton href="/login?next=/app/projects">Try the flow</LinkButton>}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {showcased.map((p) => (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex justify-end"><DemoBadge>Demo project</DemoBadge></div>
                <h2 className="mt-2 text-[16px] font-semibold leading-snug">{p.title}</h2>
                <p className="mt-2 line-clamp-5 flex-1 text-[13px] leading-relaxed text-strong">{p.draft}</p>
                <p className="mt-4 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
                  <UserRound size={11} aria-hidden /> Author consented · mentor approved
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
