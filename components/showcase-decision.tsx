"use client";

import { useState, useTransition } from "react";
import { Button, FieldError } from "./ui";
import { decideShowcase } from "@/actions/coreos";

export function ShowcaseDecision({
  projectId,
  status,
  consent,
}: {
  projectId: string;
  status: string;
  consent: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(status);

  const decide = (approve: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        await decideShowcase({ projectId, approve });
        setCurrent(approve ? "showcased" : "approved");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  if (current === "showcased") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => decide(false)}>
          Remove from showcase
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        size="sm"
        disabled={pending || !consent}
        onClick={() => decide(true)}
        title={!consent ? "The author has not consented to a public listing" : undefined}
      >
        {pending ? "Updating…" : "Publish to showcase"}
      </Button>
      {!consent ? <p className="mt-1 text-[10.5px] text-mid">Blocked: author consent missing.</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
