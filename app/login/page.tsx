import Link from "next/link";
import { DEMO_MODE, DEMO_USERS } from "@/lib/auth";
import { signInAs } from "@/actions/session";
import { Card, Button, LinkButton, DemoBadge } from "@/components/ui";
import { FullLockup, Wordmark } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { safeNext } from "@/lib/navigation";
import { ArrowRight, Info } from "lucide-react";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Omit `next` unless explicitly requested so the action can choose the
  // role-appropriate dashboard (admin → /admin, staff → /mentor, else /app).
  // safeNext() rejects cross-origin, control-character and backslash targets,
  // returning /app for anything unsafe. Never forward a raw `next` value.
  const destination = next ? safeNext(next) : undefined;

  return (
    <div id="main" className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <Wordmark />
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mid sm:block">
          Guwahati University · Student innovation
        </p>
      </header>

      <div className="mt-12 grid flex-1 items-start gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <FullLockup width={300} className="hidden sm:block" />
          <p className="eyebrow accent-text mt-8">AURA Learning &amp; Innovation OS</p>
          <h1 className="h-serif mt-3 max-w-[18ch] text-[38px] font-semibold leading-[1.05] sm:text-[52px]">
            Sign in to keep building.
          </h1>
          <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-strong">
            Your explanations, practice attempts, project evidence and mentor feedback live in one workspace. Sign in
            with the account issued by your AURA coordinator.
          </p>
          <div className="mt-7 flex items-start gap-2.5 rounded-lg border border-line bg-mist p-4 text-[12.5px] leading-relaxed text-strong">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              Sessions are server-side, httpOnly cookies. Passwords are hashed with scrypt. Authorization is enforced
              in every server action — hiding a button is never the only protection.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/" variant="secondary">
              Back to site
            </LinkButton>
            <LinkButton href="/collaborate" variant="tertiary">
              Request a school workshop
            </LinkButton>
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Account sign-in</p>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Welcome back</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-strong">
              Enter your email address and password.
            </p>
            <div className="mt-6">
              <LoginForm next={destination} />
            </div>
          </Card>

          {DEMO_MODE ? (
            <Card className="overflow-hidden p-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[13px] font-medium hover:bg-mist">
                  <span className="flex items-center gap-2">
                    Demo access
                    <DemoBadge>Fictional accounts</DemoBadge>
                  </span>
                  <span aria-hidden className="font-mono text-[11px] text-mid transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="border-t border-line px-5 pb-5 pt-3">
                  <p className="text-[12px] leading-relaxed text-strong">
                    This deployment has demo mode enabled. These accounts exist only for evaluation and share the
                    password set by the operator. They are not real members.
                  </p>
                  <ul className="mt-3 divide-y divide-line">
                    {DEMO_USERS.map((u) => (
                      <li key={u.id} className="flex items-center gap-3 py-2.5">
                        <span
                          aria-hidden
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[10.5px] text-paper"
                        >
                          {u.name.split(" ").map((p) => p[0]).join("")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{u.name}</p>
                          <p className="text-[11.5px] text-strong">{u.roleLabel}</p>
                        </div>
                        <form action={signInAs}>
                          <input type="hidden" name="userId" value={u.id} />
                          {destination ? <input type="hidden" name="next" value={destination} /> : null}
                          <Button size="sm" variant="secondary" type="submit">
                            Enter <ArrowRight size={13} aria-hidden />
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </Card>
          ) : null}

          <p className="px-1 text-[12px] leading-relaxed text-mid">
            Have an invite code?{" "}
            <Link href="/signup" className="font-medium text-ink underline underline-offset-4">
              Create your account
            </Link>
            . Otherwise ask your AURA coordinator for an invite.
          </p>
        </div>
      </div>
    </div>
  );
}
