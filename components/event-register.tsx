"use client";

import { useState, useTransition } from "react";
import { Button, FieldError } from "./ui";
import { registerForEvent, cancelRegistration } from "@/actions/coreos";

export function EventRegisterButton({
  eventId,
  registered,
  full,
  closed,
}: {
  eventId: string;
  registered: boolean;
  full: boolean;
  closed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: true }>) => {
    setError(null);
    setDone(null);
    startTransition(async () => {
      try {
        await fn();
        setDone(registered ? "Registration cancelled." : "You are registered.");
        // Revalidation from the server action refreshes the card data.
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  if (registered) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => cancelRegistration({ eventId }))}>
            {pending ? "Cancelling…" : "Cancel registration"}
          </Button>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mid">Registered</span>
        </div>
        {done ? <p className="mt-2 text-[12.5px] text-strong">{done}</p> : null}
        <FieldError>{error}</FieldError>
      </div>
    );
  }

  if (closed) {
    return <p className="text-[12.5px] text-strong">Registration has closed for this event.</p>;
  }

  return (
    <div>
      <Button
        size="sm"
        disabled={pending || full}
        onClick={() => run(() => registerForEvent({ eventId }))}
        title={full ? "This event is at capacity" : undefined}
      >
        {full ? "Event full" : pending ? "Registering…" : "Register"}
      </Button>
      {done ? <p className="mt-2 text-[12.5px] text-strong">{done}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
