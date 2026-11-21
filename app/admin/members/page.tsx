import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { Card, SectionTitle, StatusBadge, DataTable, Th, Td, DemoBadge } from "@/components/ui";
import { ROLE_LABELS, type Role } from "@/lib/domain/types";

export const metadata = { title: "Admin · Members" };

export default async function AdminMembersPage() {
  await requireRolePage("admin");
  const users = db.select().from(schema.users).all();
  const roles = db.select().from(schema.userRoles).all();
  const assignments = db.select().from(schema.mentorAssignments).all();
  const attempts = db.select().from(schema.practiceAttempts).all();
  const projects = db.select().from(schema.projects).all();

  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="max-w-[1120px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Core OS</p>
          <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Members, mentors & scopes.</h1>
          <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
            Roles are many-to-many. Every permission check on the server reads these roles — hiding a button in the UI
            is never the security boundary.
          </p>
        </div>
        <DemoBadge>Fictional members</DemoBadge>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow={`${users.length} accounts`} title="Directory" />
        <DataTable caption="Member directory">
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Email</Th>
              <Th>Roles</Th>
              <Th>Activity</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const userRoleList = roles.filter((r) => r.userId === u.id).map((r) => r.role as Role);
              const userAttempts = attempts.filter((a) => a.userId === u.id).length;
              const userProjects = projects.filter((p) => p.authorId === u.id).length;
              return (
                <tr key={u.id}>
                  <Td>
                    <p className="font-medium">{u.displayName}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-mid">{u.id}</p>
                  </Td>
                  <Td className="font-mono text-[11.5px]">{u.email}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {userRoleList.map((r) => (
                        <StatusBadge key={r} label={ROLE_LABELS[r]} tone="outline" />
                      ))}
                    </div>
                  </Td>
                  <Td className="text-[11.5px] text-strong">
                    {userAttempts} attempts · {userProjects} projects
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>

      <div className="mt-10">
        <SectionTitle
          eyebrow={`${assignments.filter((a) => a.status === "active").length} active`}
          title="Mentor assignments"
          description="Assignments define exactly whose submissions a mentor sees in their queue."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {assignments.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium">
                  {userById.get(a.mentorId)?.displayName} <span className="text-mid">mentors</span>{" "}
                  {userById.get(a.studentId)?.displayName}
                </p>
                <StatusBadge label={a.status} tone={a.status === "active" ? "solid" : "outline"} />
              </div>
              <p className="mt-1 text-[12px] text-strong">{a.scope}</p>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-mid">
          Creating and editing assignments is intentionally read-only here. New assignments are seeded in{" "}
          <code className="font-mono">lib/db/seed.ts</code> for reproducible demos.
        </p>
      </div>
    </div>
  );
}
