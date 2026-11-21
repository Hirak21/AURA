import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { Card, SectionTitle, StatusBadge, DataTable, Th, Td, DemoBadge } from "@/components/ui";
import { ShowcaseDecision } from "@/components/showcase-decision";
import { listChallenges, listTopics } from "@/lib/services/catalog";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/domain/types";

export const metadata = { title: "Admin · Projects" };

export default async function AdminProjectsPage() {
  await requireRolePage("admin", "curator", "mentor", "reviewer");
  const projects = db.select().from(schema.projects).all();
  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));
  const challenges = listChallenges();
  const topics = listTopics();
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const challengeById = new Map(challenges.map((c) => [c.id, c]));

  const showcaseCandidates = projects.filter((p) => p.status === "approved" || p.status === "showcased");

  return (
    <div className="max-w-[1120px]">
      <p className="eyebrow">Core OS</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Projects & reviews.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Reviewing happens in the mentor workspace. This screen tracks status and controls the public showcase, which
        requires both mentor approval and author consent.
      </p>

      <div className="mt-8">
        <SectionTitle eyebrow={`${projects.length} records`} title="All project records" />
        <DataTable caption="All project records">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Author</Th>
              <Th>Topic</Th>
              <Th>Status</Th>
              <Th>Consent</Th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr><Td>No project records.</Td><Td /><Td /><Td /><Td /></tr>
            ) : (
              projects.map((p) => {
                const challenge = challengeById.get(p.challengeId);
                return (
                  <tr key={p.id}>
                    <Td className="font-medium">{p.title}</Td>
                    <Td className="text-[12.5px]">{userById.get(p.authorId)?.displayName ?? p.authorId}</Td>
                    <Td className="text-[12.5px]">{challenge ? topicById.get(challenge.topicId)?.title : "—"}</Td>
                    <Td><StatusBadge label={PROJECT_STATUS_LABELS[p.status as ProjectStatus]} tone="outline" /></Td>
                    <Td className="text-[12px] text-strong">{p.consentToShowcase ? "given" : "not given"}</Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </div>

      <div className="mt-10">
        <SectionTitle
          eyebrow="Public listing"
          title="Showcase decisions"
          description="Approved projects become public only when the author has consented and an admin confirms."
        />
        {showcaseCandidates.length === 0 ? (
          <Card className="p-5 text-[13px] text-strong">
            No approved projects yet. Approve a submission in the mentor queue first.
          </Card>
        ) : (
          <div className="space-y-3">
            {showcaseCandidates.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">{p.title}</p>
                  <p className="text-[11.5px] text-strong">
                    {userById.get(p.authorId)?.displayName} · consent: {p.consentToShowcase ? "given" : "not given"}
                  </p>
                </div>
                <DemoBadge>Demo</DemoBadge>
                <ShowcaseDecision projectId={p.id} status={p.status} consent={p.consentToShowcase} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
