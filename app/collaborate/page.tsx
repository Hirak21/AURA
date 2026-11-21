import { Wordmark } from "@/components/brand";
import { CollaborationForm } from "@/components/collaboration-form";
import Link from "next/link";

export const metadata = { title: "School Collaboration" };

export default function CollaboratePage() {
  return (
    <div className="public-surface min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-public items-center justify-between px-5 lg:px-8">
          <Wordmark />
          <Link href="/" className="text-[13.5px] text-strong hover:text-ink">
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-public gap-12 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:px-8 lg:py-20">
        <div>
          <p className="eyebrow accent-text">School collaboration</p>
          <h1 className="h-serif mt-3 text-[32px] font-semibold leading-[1.08] sm:text-[40px]">
            Request a workshop.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-strong">
            Tell us about your students and what you would like to run. Every submission receives a reference code.
            A liaison reviews it, and if approved it becomes a scheduled workshop with a mentor team and equipment
            allocation attached.
          </p>
          <div className="mt-8 border-t border-line pt-6">
            <p className="eyebrow mb-2">What happens next</p>
            <ol className="space-y-3 text-[13px] leading-relaxed text-strong">
              {[
                "Your request is recorded with a reference code (keep it).",
                "A liaison assigns an owner and moves it to review.",
                "On approval, a workshop date and venue are confirmed with you.",
                "Mentors and equipment are allocated from association resources.",
              ].map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span className="metric text-mid">{String(i + 1).padStart(2, "0")}</span>
                  {line}
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-8 text-[11.5px] leading-relaxed text-mid">
            Submissions are stored in AURA for review. Please share a staff contact address, not student personal data.
          </p>
        </div>

        <CollaborationForm />
      </main>
    </div>
  );
}
