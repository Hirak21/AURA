"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/brand";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the message server-side; the digest is the correlation key.
    console.error("AURA render error", error.digest ?? "");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-public items-center px-5 lg:px-8">
          <Wordmark />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-public flex-1 flex-col justify-center px-5 py-20 lg:px-8">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="h-serif mt-3 max-w-[24ch] text-[32px] font-semibold leading-[1.1] sm:text-[40px]">
          The page could not be rendered.
        </h1>
        <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-strong">
          Your saved work is unaffected. Try again; if the problem persists, the server log has the correlation
          digest{error.digest ? ` (${error.digest})` : ""}.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full border border-ink bg-paper px-4 text-sm font-medium hover:bg-mist"
          >
            Back to the landing page
          </a>
        </div>
      </main>
    </div>
  );
}
