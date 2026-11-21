"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, Button, Input, Textarea, Label, FieldError, Helper, InlineAlert } from "./ui";
import { submitCollaborationRequestForm, type CollaborationFormState } from "@/actions/schools";
import { CheckCircle2 } from "lucide-react";

const INITIAL: CollaborationFormState = { status: "idle" };

export function CollaborationForm() {
  const [state, formAction, pending] = useActionState(submitCollaborationRequestForm, INITIAL);
  const errors = state.errors ?? {};

  if (state.status === "success" && state.reference) {
    return (
      <Card className="h-fit p-8">
        <CheckCircle2 size={28} strokeWidth={1.5} aria-hidden />
        <h2 className="mt-4 text-[20px] font-semibold">Request received.</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-strong">
          Your reference code is{" "}
          <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-[13px] font-medium text-ink">{state.reference}</span>
          . Keep it for follow-up. A liaison will review the request and move it through the queue.
        </p>
        <InlineAlert tone="info" title="What happens next">
          Nothing is emailed automatically. A liaison reviews the request and contacts the address you provided before
          confirming a date.
        </InlineAlert>
        <div className="mt-6">
          <Link
            href="/collaborate"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ink bg-paper px-4 text-sm font-medium hover:bg-mist"
          >
            Submit another request
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-fit p-6 sm:p-8">
      <form action={formAction} method="post" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="schoolName" required>School name</Label>
            <Input id="schoolName" name="schoolName" placeholder="e.g. Sunrise Public School" aria-invalid={!!errors.schoolName} />
            <FieldError>{errors.schoolName}</FieldError>
          </div>
          <div>
            <Label htmlFor="location" required>City / district</Label>
            <Input id="location" name="location" placeholder="Guwahati, Assam" aria-invalid={!!errors.location} />
            <FieldError>{errors.location}</FieldError>
          </div>
          <div>
            <Label htmlFor="gradeRange" required>Grade / class range</Label>
            <Input id="gradeRange" name="gradeRange" placeholder="Class 9–10" aria-invalid={!!errors.gradeRange} />
            <FieldError>{errors.gradeRange}</FieldError>
          </div>
          <div>
            <Label htmlFor="contactName" required>Contact person</Label>
            <Input id="contactName" name="contactName" placeholder="Teacher or coordinator" aria-invalid={!!errors.contactName} />
            <FieldError>{errors.contactName}</FieldError>
          </div>
          <div>
            <Label htmlFor="contactEmail" required>Contact email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" placeholder="you@school.edu" aria-invalid={!!errors.contactEmail} />
            <FieldError>{errors.contactEmail}</FieldError>
          </div>
          <div>
            <Label htmlFor="activityType" required>Activity requested</Label>
            <Input id="activityType" name="activityType" placeholder="Circuit basics workshop" aria-invalid={!!errors.activityType} />
            <FieldError>{errors.activityType}</FieldError>
          </div>
          <div>
            <Label htmlFor="expectedParticipants" required>Expected participants</Label>
            <Input
              id="expectedParticipants"
              name="expectedParticipants"
              type="number"
              min={1}
              max={500}
              placeholder="35"
              aria-invalid={!!errors.expectedParticipants}
            />
            <FieldError>{errors.expectedParticipants}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="preferredDates" required>Preferred dates</Label>
            <Input id="preferredDates" name="preferredDates" placeholder="Any Saturday in the next 6 weeks" aria-invalid={!!errors.preferredDates} />
            <FieldError>{errors.preferredDates}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="facilities">Facilities available</Label>
            <Input id="facilities" name="facilities" placeholder="Projector, tables, power sockets" />
            <Helper>Helps the liaison plan equipment.</Helper>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="message">Anything else</Label>
            <Textarea id="message" name="message" placeholder="What would you like students to take away from the session?" />
            <FieldError>{errors.message}</FieldError>
          </div>
        </div>

        {state.status === "error" && state.message ? (
          <div className="mt-5">
            <InlineAlert tone="error" title="Submission failed">{state.message}</InlineAlert>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-mid">Fields marked * are required.</p>
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
