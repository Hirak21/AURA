import { requireUser } from "@/lib/auth";
import { Card, SectionTitle } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ROLE_LABELS } from "@/lib/domain/types";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { DemoBadge } from "@/components/ui";

export const metadata = { title: "Profile & preferences" };

export default async function ProfilePage() {
  const user = await requireUser();
  const row = db.select().from(schema.users).where(eq(schema.users.id, user.id)).all()[0];

  return (
    <div className="max-w-[760px]">
      <p className="eyebrow">Profile</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Preferences that change the tutor.</h1>
      <p className="mt-2 max-w-[66ch] text-[13.5px] leading-relaxed text-strong">
        Your preferred level becomes the default on every tutor session. Your learning goal appears on your overview.
        Nothing here is shared publicly.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <DemoBadge>Demo account</DemoBadge>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mid">
          {user.roles.map((r) => ROLE_LABELS[r]).join(" · ")}
        </p>
      </div>

      <div className="mt-6">
        <ProfileForm
          displayName={row?.displayName ?? user.displayName}
          email={row?.email ?? user.email}
          level={row?.preferredLevel ?? user.preferredLevel}
          goal={row?.learningGoal ?? ""}
        />
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Privacy" title="What this prototype stores" />
        <Card className="p-5 text-[12.5px] leading-relaxed text-strong">
          <p>
            Tutor turns, practice attempts, project drafts and event registrations are stored in a local SQLite file
            for this single demo instance. Nothing leaves the machine, and nothing is sent to a third-party model
            provider — the tutor is deterministic and local.
          </p>
          <p className="mt-2">
            In a real deployment, learner records would be private by default, mentors would see only assigned
            learners, and minors&apos; data would be minimised per institutional policy.
          </p>
        </Card>
      </div>
    </div>
  );
}
