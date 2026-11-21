import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { Card, StatusBadge, DemoBadge, LinkButton, EmptyState } from "@/components/ui";
import { EventRegisterButton } from "@/components/event-register";
import { CalendarDays, MapPin } from "lucide-react";

export const metadata = { title: "My Events" };

export default async function StudentEventsPage() {
  const user = await requireUser();
  const regs = db.select().from(schema.eventRegistrations).where(eq(schema.eventRegistrations.userId, user.id)).all();
  const events = db.select().from(schema.events).all();
  const byId = new Map(events.map((e) => [e.id, e]));

  const mine = regs
    .filter((r) => r.status === "registered")
    .map((r) => ({ reg: r, event: byId.get(r.eventId) }))
    .filter((x): x is { reg: typeof regs[number]; event: NonNullable<ReturnType<typeof byId.get>> } => !!x.event);

  const open = events
    .filter((e) => e.status === "published" && !mine.some((m) => m.event.id === e.id))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="max-w-[1000px]">
      <p className="eyebrow">Events</p>
      <h1 className="h-serif mt-2 text-[28px] font-semibold tracking-[-0.03em]">Your workshops.</h1>
      <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-strong">
        Registration is checked for duplicates and capacity in the data layer — so what this page says is what the
        system recorded.
      </p>

      <div className="mt-8">
        <h2 className="text-[16px] font-semibold">Registered</h2>
        <div className="mt-3">
          {mine.length === 0 ? (
            <EmptyState
              title="No registrations yet."
              body="Pick an upcoming workshop below. Seats are limited and enforced — when an event is full the button says so instead of pretending."
              action={<LinkButton href="/events" variant="secondary">Browse public events</LinkButton>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map(({ reg, event }) => (
                <Card key={reg.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge label="registered" tone="solid" />
                    <DemoBadge />
                  </div>
                  <p className="mt-2.5 text-[14px] font-semibold leading-snug">{event.title}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mid">
                    <CalendarDays size={11} aria-hidden />
                    {new Date(event.startsAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-strong">
                    <MapPin size={11} aria-hidden /> {event.venue}
                  </p>
                  <div className="mt-3">
                    <EventRegisterButton eventId={event.id} registered full={false} closed={false} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {open.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-[16px] font-semibold">Open for registration</h2>
          <Card className="mt-3 divide-y divide-line">
            {open.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">{e.title}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-mid">
                    {new Date(e.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {e.venue}
                  </p>
                </div>
                <LinkButton href="/events" size="sm" variant="secondary">
                  Details
                </LinkButton>
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
