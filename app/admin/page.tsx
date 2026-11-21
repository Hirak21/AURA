import Link from "next/link";
import { requireRolePage } from "@/lib/auth";
import { getAdminMetrics, getRecentAudit } from "@/lib/services/admin-metrics";
import { Card, SectionTitle, DemoBadge, StatusBadge, LinkButton } from "@/components/ui";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Admin overview" };

function Metric({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full p-4 transition-colors group-hover:border-mid">
        <p className="eyebrow">{label}</p>
        <p className="metric mt-1.5 text-[26px] font-medium leading-none">{value}</p>
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-strong">{sub}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-mid group-hover:text-ink">
          Open <ArrowRight size={10} aria-hidden />
        </span>
      </Card>
    </Link>
  );
}

export default async function AdminOverview() {
  await requireRolePage("admin", "curator", "liaison", "organizer", "custodian");
  const m = getAdminMetrics();
  const audit = getRecentAudit(8);

  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));

  const schoolQueue = db
    .select()
    .from(schema.collaborationRequests)
    .all()
    .filter((r) => r.status === "new" || r.status === "in_review")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const reviewQueue = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.status, "submitted"))
    .all()
    .slice(0, 4);

  return (
    <div className="max-w-[1180px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Core OS</p>
          <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Operations overview.</h1>
          <p className="mt-1.5 text-[13px] text-strong">
            Every number below is computed from the same tables the modules write to. Nothing is decorative.
          </p>
        </div>
        <DemoBadge>Demo dataset · reset with npm run db:reset</DemoBadge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Active learners (7d)"
          value={m.learnersWithActivity7d}
          sub={`${m.attempts7d} attempts in 7 days · ${m.studentAccounts} student accounts`}
          href="/admin/learning"
        />
        <Metric
          label="Reviews pending"
          value={m.pendingReviews}
          sub={`${m.approved} approved · ${m.showcased} showcased`}
          href="/admin/projects"
        />
        <Metric
          label="Upcoming events"
          value={m.upcomingEvents}
          sub={
            m.nextEvent
              ? `Next: ${m.nextEvent.title.replace(/\s*\(demo\)/i, "").replace(/\s*\(demo workshop\)/i, "")}${
                  m.nextEvent.title.length > 40 ? "…" : ""
                }`
              : "No published events ahead"
          }
          href="/admin/events"
        />
        <Metric
          label="School requests open"
          value={m.openRequests}
          sub={`${m.scheduledRequests} scheduled · ${m.totalRequests} total`}
          href="/admin/schools"
        />
        <Metric
          label="Equipment out"
          value={m.activeAllocations}
          sub={`${m.overdueAllocations} overdue returns`}
          href="/admin/inventory"
        />
        <Metric
          label="Low stock items"
          value={m.lowStock}
          sub={`${m.availableUnits} units available across ${m.totalItems} items`}
          href="/admin/inventory"
        />
        <Metric
          label="Registered seats"
          value={m.registeredSeats}
          sub="Across published events"
          href="/admin/events"
        />
        <Metric
          label="Project records"
          value={m.totalProjects}
          sub={`${m.showcased} publicly consented`}
          href="/admin/projects"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle
            eyebrow="Queue"
            title="Submissions to review"
            action={<LinkButton href="/admin/projects" size="sm" variant="tertiary">All projects</LinkButton>}
          />
          <Card className="divide-y divide-line">
            {reviewQueue.length === 0 ? (
              <p className="p-5 text-[13px] text-strong">No submissions waiting. The queue is genuinely empty.</p>
            ) : (
              reviewQueue.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.title}</p>
                    <p className="text-[11.5px] text-strong">{userById.get(p.authorId)?.displayName}</p>
                  </div>
                  <StatusBadge label="submitted" tone="outline" />
                </div>
              ))
            )}
          </Card>
        </div>

        <div>
          <SectionTitle
            eyebrow="Queue"
            title="School requests"
            action={<LinkButton href="/admin/schools" size="sm" variant="tertiary">All requests</LinkButton>}
          />
          <Card className="divide-y divide-line">
            {schoolQueue.length === 0 ? (
              <p className="p-5 text-[13px] text-strong">No open school requests.</p>
            ) : (
              schoolQueue.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{r.schoolName}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-mid">
                      {r.reference} · {r.activityType}
                    </p>
                  </div>
                  <StatusBadge label={r.status.replace("_", " ")} tone="outline" />
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle eyebrow="Audit" title="Recent privileged actions" />
        <Card className="divide-y divide-line">
          {audit.length === 0 ? (
            <p className="p-5 text-[13px] text-strong">No audit events recorded yet.</p>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">
                  {new Date(a.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="text-[12.5px] font-medium">{a.action}</span>
                <span className="text-[11.5px] text-strong">
                  {userById.get(a.actorId)?.displayName ?? a.actorId} → {a.entityType}
                </span>
                <span className="ml-auto font-mono text-[10px] text-mid">{a.entityId.slice(0, 8)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
