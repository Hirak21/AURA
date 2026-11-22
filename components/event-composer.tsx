"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Textarea, Label, Select, FieldError, InlineAlert } from "./ui";
import { createEvent } from "@/actions/coreos";

export function EventComposer({ topics }: { topics: { id: string; title: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDone(null);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    const title = String(fd.get("title") ?? "");
    const summary = String(fd.get("summary") ?? "");
    const startRaw = String(fd.get("startsAt") ?? "");
    const endRaw = String(fd.get("endsAt") ?? "");
    const closesRaw = String(fd.get("registrationClosesAt") ?? "");

    // Validate before calling toISOString(): an empty datetime-local field
    // produces Invalid Date and throws a RangeError outside the try/catch.
    const startMs = Date.parse(startRaw);
    const endMs = Date.parse(endRaw);
    const closesMs = Date.parse(closesRaw);
    if (!title || !summary || [startMs, endMs, closesMs].some((ms) => Number.isNaN(ms))) {
      setError("Title, a short summary and valid start, end and registration-close times are required.");
      return;
    }

    const payload = {
      title,
      summary,
      type: String(fd.get("type") ?? "workshop") as "workshop",
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      venue: String(fd.get("venue") ?? ""),
      mode: String(fd.get("mode") ?? "in_person") as "in_person",
      capacity: Number(fd.get("capacity") ?? 0),
      registrationClosesAt: new Date(closesMs).toISOString(),
      topicId: String(fd.get("topicId") ?? "") || undefined,
    };
    startTransition(async () => {
      try {
        await createEvent(payload);
        setDone(`Published “${payload.title}”. It is now visible on the public events page.`);
        form.reset();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <Label htmlFor="ev-title" required>Title</Label>
          <Input id="ev-title" name="title" placeholder="Sensor calibration clinic" />
        </div>
        <div>
          <Label htmlFor="ev-summary" required>Summary</Label>
          <Textarea id="ev-summary" name="summary" rows={3} placeholder="What happens, who it is for, what to bring." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ev-type" required>Type</Label>
            <Select id="ev-type" name="type" defaultValue="workshop">
              <option value="workshop">Workshop</option>
              <option value="talk">Talk</option>
              <option value="hackathon">Hackathon</option>
              <option value="school_visit">School visit</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-mode" required>Mode</Label>
            <Select id="ev-mode" name="mode" defaultValue="in_person">
              <option value="in_person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-start" required>Starts</Label>
            <Input id="ev-start" name="startsAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="ev-end" required>Ends</Label>
            <Input id="ev-end" name="endsAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="ev-reg" required>Registration closes</Label>
            <Input id="ev-reg" name="registrationClosesAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="ev-cap" required>Capacity</Label>
            <Input id="ev-cap" name="capacity" type="number" min={1} max={500} defaultValue={20} />
          </div>
        </div>
        <div>
          <Label htmlFor="ev-venue" required>Venue</Label>
          <Input id="ev-venue" name="venue" placeholder="Engineering Lab 2 (demo)" />
        </div>
        <div>
          <Label htmlFor="ev-topic">Linked topic</Label>
          <Select id="ev-topic" name="topicId" defaultValue="">
            <option value="">No topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </Select>
        </div>

        <FieldError>{error}</FieldError>
        {done ? <InlineAlert tone="success">{done}</InlineAlert> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Publishing…" : "Publish event"}
        </Button>
      </form>
    </Card>
  );
}
