import { requireRolePage } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, SectionTitle, StatusBadge, DemoBadge, DataTable, Th, Td } from "@/components/ui";
import { EventComposer } from "@/components/event-composer";
import { listTopics } from "@/lib/services/catalog";

export const metadata = { title: "Admin · Events" };

export default async function AdminEventsPage() {
  await requireRolePage("organizer", "admin", "curator");
  const events = db.select().from(schema.events).all().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const topics = listTopics();
  const users = db.select().from(schema.users).all();
  const userById = new Map(users.map((u) => [u.id, u]));

  const regs = db.select().from(schema.eventRegistrations).all();

  return (
    <div className="max-w-[1120px]">
      <p className="eyebrow">Core OS</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Events & registrations.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Publishing an event opens registration immediately. Capacity and duplicate checks live in the server action —
        the UI only reflects them.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle eyebrow={`${events.length} events`} title="Schedule" />
          <DataTable caption="Event schedule">
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Starts</Th>
                <Th>Seats</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const count = regs.filter((r) => r.eventId === e.id && r.status === "registered").length;
                return (
                  <tr key={e.id}>
                    <Td>
                      <p className="font-medium">{e.title}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-mid">
                        {e.type.replace("_", " ")} · {e.venue}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[11.5px]">
                      {new Date(e.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </Td>
                    <Td className="metric whitespace-nowrap">
                      {count}/{e.capacity}
                      {count >= e.capacity ? <span className="ml-1 text-[10px] uppercase text-mid">full</span> : null}
                    </Td>
                    <Td><StatusBadge label={e.status} tone="outline" /></Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>

          <div className="mt-8">
            <SectionTitle eyebrow="Registrations" title="Who is attending" />
            <DataTable caption="Registrations">
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Participant</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {regs.length === 0 ? (
                  <tr><Td>No registrations yet.</Td><Td /><Td /></tr>
                ) : (
                  regs.map((r) => {
                    const e = events.find((x) => x.id === r.eventId);
                    return (
                      <tr key={r.id}>
                        <Td className="text-[12.5px]">{e?.title ?? r.eventId}</Td>
                        <Td className="text-[12.5px]">{userById.get(r.userId)?.displayName ?? r.userId}</Td>
                        <Td><StatusBadge label={r.status} tone="outline" /></Td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </DataTable>
          </div>
        </div>

        <div>
          <SectionTitle eyebrow="Publish" title="Create an event" />
          <EventComposer topics={topics.map((t) => ({ id: t.id, title: t.title }))} />
          <div className="mt-3"><DemoBadge>New events are demo records</DemoBadge></div>
        </div>
      </div>
    </div>
  );
}
