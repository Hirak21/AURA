import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, DemoBadge, StatusBadge, LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { EventRegisterButton } from "@/components/event-register";
import { CalendarDays, MapPin, Users } from "lucide-react";

export const metadata = { title: "Events & Workshops" };

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventsPage() {
  const user = await getCurrentUser();

  const events = db
    .select()
    .from(schema.events)
    .where(eq(schema.events.status, "published"))
    .all()
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const registrations = user
    ? db.select().from(schema.eventRegistrations).where(eq(schema.eventRegistrations.userId, user.id)).all()
    : [];

  const counts = new Map<string, number>();
  for (const e of events) {
    const c = db
      .select()
      .from(schema.eventRegistrations)
      .where(and(eq(schema.eventRegistrations.eventId, e.id), eq(schema.eventRegistrations.status, "registered")))
      .all().length;
    counts.set(e.id, c);
  }

  return (
    <div className="mx-auto max-w-public px-5 py-14 lg:px-8 lg:py-20">
      <p className="eyebrow accent-text">Events &amp; workshops</p>
      <h1 className="h-serif mt-3 max-w-[24ch] text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
        Where learning becomes hands-on.
      </h1>
      <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-strong">
        Workshops pair a topic with a build. Registration is capacity-checked and duplicate-safe in the data layer,
        so the button never lies about your status.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {events.map((e) => {
          const registered = registrations.find((r) => r.eventId === e.id && r.status === "registered");
          const used = counts.get(e.id) ?? 0;
          const full = used >= e.capacity;
          const now = new Date();
          const closesAt = new Date(e.registrationClosesAt);
          const closed = now > closesAt;
          return (
            <Card key={e.id} className="flex flex-col p-6">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge label={e.type.replace("_", " ")} tone="outline" />
                <DemoBadge>Demo event</DemoBadge>
              </div>
              <h2 className="mt-4 text-[18px] font-semibold leading-snug">{e.title}</h2>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-strong">{e.summary}</p>

              <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[12.5px] text-strong">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} aria-hidden />
                  <dt className="sr-only">When</dt>
                  <dd>{fmt(e.startsAt)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} aria-hidden />
                  <dt className="sr-only">Where</dt>
                  <dd>{e.venue} · {e.mode.replace("_", " ")}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={13} aria-hidden />
                  <dt className="sr-only">Capacity</dt>
                  <dd>
                    <span className="metric">{used}</span> / {e.capacity} registered
                    {full ? " · full" : ""}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                {!user ? (
                  <LinkButton href={`/login?next=/events`} variant="secondary" size="sm">
                    Sign in to register
                  </LinkButton>
                ) : (
                  <EventRegisterButton
                    eventId={e.id}
                    registered={!!registered}
                    full={full}
                    closed={closed}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
