import Link from "next/link";
import { Wordmark } from "./brand";
import { LinkButton } from "./ui";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/learn", label: "Learning" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/collaborate", label: "School Collaboration" },
];

export async function PublicHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/10 backdrop-blur-lg supports-[backdrop-filter]:bg-white/10">
      <div className="mx-auto flex h-16 max-w-public items-center gap-6 px-5 lg:px-8">
        <Wordmark />
        <span aria-hidden className="hidden h-4 w-px bg-line lg:block" />
        <p className="hidden font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-mid lg:block">
          Guwahati University
          <br />
          Automation &amp; Robotics Association
        </p>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] text-strong transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <LinkButton href="/app" size="sm" variant="glass">
              Open workspace
            </LinkButton>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-1.5 text-[13.5px] text-strong hover:text-ink">
                Sign in
              </Link>
              <LinkButton href="/learn" size="sm" className="hidden sm:inline-flex" variant="glass">
                Start learning
              </LinkButton>
            </>
          )}

          <details className="group relative md:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium [&::-webkit-details-marker]:hidden">
              Menu
              <span
                aria-hidden
                className="font-mono text-[11px] text-mid transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-64 rounded-xl border border-line bg-paper p-2 shadow-lift">
              <nav aria-label="Mobile primary" className="grid">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-[13.5px] text-strong hover:bg-mist hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-1 border-t border-line p-2">
                <LinkButton href="/collaborate" size="sm" className="w-full">
                  Request a workshop
                </LinkButton>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-[28ch] text-[13px] leading-relaxed text-strong">
            The learning and innovation workspace of the Automation &amp; Robotics Association, Guwahati University.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Learn</p>
          <ul className="space-y-2 text-[13px] text-strong">
            <li><Link className="hover:text-ink" href="/learn">Learning Hub</Link></li>
            <li><Link className="hover:text-ink" href="/app/tutor">AI Tutor</Link></li>
            <li><Link className="hover:text-ink" href="/app/practice">Practice</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Participate</p>
          <ul className="space-y-2 text-[13px] text-strong">
            <li><Link className="hover:text-ink" href="/events">Events &amp; workshops</Link></li>
            <li><Link className="hover:text-ink" href="/projects">Project showcase</Link></li>
            <li><Link className="hover:text-ink" href="/collaborate">School collaboration</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Status</p>
          <p className="text-[12.5px] leading-relaxed text-strong">
            Learning records, project evidence and workshop operations are real application data. Seeded accounts
            and sample content are labelled as demo. No live AI provider is connected to this deployment.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-public flex-wrap items-center justify-between gap-2 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.1em] text-mid lg:px-8">
          <span>AURA · Automation &amp; Robotics Association</span>
          <span>Guwahati University · Monochrome + scoped gold</span>
        </div>
      </div>
    </footer>
  );
}
