import Link from "next/link";
import { Info } from "lucide-react";
import { Card, LinkButton } from "@/components/ui";
import { Wordmark } from "@/components/brand";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-8 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <Wordmark />
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-mid sm:block">
          Guwahati University · Student innovation
        </p>
      </header>

      <div className="mt-12 grid flex-1 items-start gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="eyebrow accent-text">Invite-only registration</p>
          <h1 className="h-serif mt-3 max-w-[18ch] text-[38px] font-semibold leading-[1.05] sm:text-[52px]">
            Join the workspace.
          </h1>
          <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-strong">
            AURA brings your explanations, practice, project evidence and mentor feedback into one place. Ask your
            coordinator for an invite code to create a student account.
          </p>
          <div className="mt-7 flex items-start gap-2.5 rounded-lg border border-line bg-mist p-4 text-[12.5px] leading-relaxed text-strong">
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              Codes are single-use by default, expire, and are stored only as hashes. Registration can never grant staff
              or admin privileges — those are assigned separately by an administrator.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/login" variant="secondary">
              I already have an account
            </LinkButton>
            <LinkButton href="/" variant="tertiary">
              Back to site
            </LinkButton>
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">New account</p>
            <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.02em]">Create your account</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-strong">
              Enter the invite code you received, then choose a password.
            </p>
            <div className="mt-6">
              <SignupForm />
            </div>
          </Card>

          <p className="px-1 text-[12px] leading-relaxed text-mid">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
