import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { LinkButton } from "@/components/ui";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="public-surface flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-public items-center px-5 lg:px-8">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-public flex-1 flex-col justify-center px-5 py-20 lg:px-8">
        <p className="eyebrow accent-text">404</p>
        <h1 className="h-serif mt-3 max-w-[22ch] text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
          This page is not part of the build.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed text-strong">
          The address may have changed, or the record may no longer be published. Nothing was fabricated to fill the
          gap.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/">Back to the landing page</LinkButton>
          <LinkButton href="/learn" variant="secondary">
            Browse learning
          </LinkButton>
        </div>
        <p className="mt-10 text-[12.5px] text-mid">
          Looking for your workspace?{" "}
          <Link href="/app" className="font-medium text-ink underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
