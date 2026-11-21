import { Card, LinkButton, InlineAlert } from "@/components/ui";
import { CoreLogo, Wordmark } from "@/components/brand";

export const metadata = { title: "About AURA" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-public px-5 py-14 lg:px-8 lg:py-20">
      <p className="eyebrow accent-text">About</p>
      <h1 className="h-serif mt-3 max-w-[26ch] text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
        One system for understanding, and for building.
      </h1>
      <p className="mt-5 max-w-[62ch] text-[15.5px] leading-relaxed text-strong">
        AURA pairs a learner-facing adaptive tutor with the operating layer a student innovation community needs to
        turn that learning into workshops, projects, mentors and equipment. The learning experience is the product;
        the association tooling exists to make application possible.
      </p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-[16px] font-semibold">AURA Learning</h2>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-strong">
            <li>Explanations at three levels, in four explanation styles</li>
            <li>Understanding checks with deterministic grading and real feedback</li>
            <li>Adaptive next steps that always state the evidence behind them</li>
            <li>Progress measured in attempts and artefacts — never invented percentages</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="text-[16px] font-semibold">AURA Core OS</h2>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-strong">
            <li>Members, mentors and scoped assignments</li>
            <li>Workshops with capacity-safe registration</li>
            <li>Project submission and structured mentor review</li>
            <li>School collaboration intake and a traceable inventory ledger</li>
          </ul>
        </Card>
      </div>

      <section className="mt-14">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">What AURA deliberately does not do</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["It does not measure intelligence", "Adaptation uses attempts and self-rated confidence as evidence signals — never as an ability score."],
            ["It does not certify mastery", "One correct check is progress, not mastery. Formal recognition stays with educators and assessment policy."],
            ["It does not invent citations", "Sources are rendered only from reviewed resource records. The demo tutor has none outside its curated notes."],
            ["It does not fake the AI", "This build has no live model connected. Everything labelled “Demo tutor” is a deterministic, curated response."],
          ].map(([title, body]) => (
            <Card key={title} className="p-5">
              <p className="text-[13.5px] font-semibold">{title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-strong">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Identity, ownership and demo content</h2>
        <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <Card className="p-8">
            <CoreLogo width={170} />
            <p className="mt-5 text-[13px] font-medium leading-relaxed">
              Automation &amp; Robotics Association
              <br />
              Guwahati University
            </p>
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mid">
              Learning &amp; Innovation OS
            </p>
          </Card>
          <div className="space-y-4">
            <InlineAlert tone="info" title="Official brand artwork">
              The AURA logo, symbol and app icons are the supplied brand-kit artwork, used unmodified and in
              black-and-white only. The dotted <span className="font-mono">A.U.R.A.</span> wordmark is never retyped
              with a font.
            </InlineAlert>
            <InlineAlert tone="warn" title="Demo records are labelled">
              Seeded people, schools, projects and events are fictional and marked as demo throughout the app. Real
              accounts created by an administrator carry no demo label. No partner logos, impact statistics or
              testimonials are invented to fill space.
            </InlineAlert>
            <InlineAlert tone="info" title="AI tutor">
              This deployment uses a curated, deterministic tutor with no outbound model calls. When a live provider is
              connected, its outputs will be labelled the same way the demo responses are today.
            </InlineAlert>
          </div>
        </div>
      </section>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
        <Wordmark />
        <div className="flex gap-3">
          <LinkButton href="/learn">Explore learning</LinkButton>
          <LinkButton href="/collaborate" variant="secondary">
            School collaboration
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
