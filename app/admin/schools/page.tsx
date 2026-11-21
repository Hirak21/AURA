import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { Card, SectionTitle, StatusBadge, DemoBadge, EmptyState } from "@/components/ui";
import { SchoolRequestCard } from "@/components/school-request-card";
import { listTopics } from "@/lib/services/catalog";

export const metadata = { title: "Admin · School requests" };

export default async function AdminSchoolsPage() {
  await requireRolePage("liaison", "admin", "organizer");
  const requests = db
    .select()
    .from(schema.collaborationRequests)
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));
  const events = db.select().from(schema.events).all();
  const eventById = new Map(events.map((e) => [e.id, e]));
  const topics = listTopics();

  const open = requests.filter((r) => r.status === "new" || r.status === "in_review");
  const progressed = requests.filter((r) => !["new", "in_review"].includes(r.status));

  return (
    <div className="max-w-[1120px]">
      <p className="eyebrow">Core OS</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">School collaboration queue.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Requests move through a fixed lifecycle. Internal notes stay internal; the confirmation a school receives
        contains only the reference and the next-step summary.
      </p>

      <div className="mt-8">
        <SectionTitle eyebrow={`${open.length} open`} title="Needs attention" />
        {open.length === 0 ? (
          <EmptyState
            title="Queue is clear."
            body="New submissions from the public collaboration form will appear here with a reference code."
          />
        ) : (
          <div className="space-y-4">
            {open.map((r) => (
              <SchoolRequestCard
                key={r.id}
                request={{
                  id: r.id,
                  reference: r.reference,
                  schoolName: r.schoolName,
                  location: r.location,
                  contactName: r.contactName,
                  contactEmail: r.contactEmail,
                  activityType: r.activityType,
                  gradeRange: r.gradeRange,
                  expectedParticipants: r.expectedParticipants,
                  preferredDates: r.preferredDates,
                  facilities: r.facilities,
                  message: r.message,
                  status: r.status,
                  internalNotes: r.internalNotes,
                  ownerName: r.ownerId ? userById.get(r.ownerId)?.displayName ?? null : null,
                  linkedEventTitle: r.linkedEventId ? eventById.get(r.linkedEventId)?.title ?? null : null,
                }}
                topics={topics.map((t) => ({ id: t.id, title: t.title }))}
              />
            ))}
          </div>
        )}
      </div>

      {progressed.length > 0 ? (
        <div className="mt-10">
          <SectionTitle eyebrow={`${progressed.length} progressed`} title="History" />
          <div className="space-y-4">
            {progressed.map((r) => (
              <SchoolRequestCard
                key={r.id}
                request={{
                  id: r.id,
                  reference: r.reference,
                  schoolName: r.schoolName,
                  location: r.location,
                  contactName: r.contactName,
                  contactEmail: r.contactEmail,
                  activityType: r.activityType,
                  gradeRange: r.gradeRange,
                  expectedParticipants: r.expectedParticipants,
                  preferredDates: r.preferredDates,
                  facilities: r.facilities,
                  message: r.message,
                  status: r.status,
                  internalNotes: r.internalNotes,
                  ownerName: r.ownerId ? userById.get(r.ownerId)?.displayName ?? null : null,
                  linkedEventTitle: r.linkedEventId ? eventById.get(r.linkedEventId)?.title ?? null : null,
                }}
                topics={topics.map((t) => ({ id: t.id, title: t.title }))}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8"><DemoBadge>All requests in this build are demo records</DemoBadge></div>
    </div>
  );
}
