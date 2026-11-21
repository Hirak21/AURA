"use client";

import { useState, useTransition } from "react";
import { Button, Textarea, Label, FieldError, InlineAlert } from "./ui";
import { reviewProject } from "@/actions/coreos";

export function ReviewForm({ projectId }: { projectId: string }) {
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<"approved" | "changes_requested" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (d: "approved" | "changes_requested") => {
    setError(null);
    setDone(null);
    if (feedback.trim().length < 15) {
      setError("Write at least one specific sentence (15+ characters) the learner can act on.");
      return;
    }
    setDecision(d);
    startTransition(async () => {
      try {
        await reviewProject({ projectId, decision: d, feedback: feedback.trim() });
        setDone(d === "approved" ? "Approved. The learner can now opt in to the showcase." : "Changes requested. The learner can edit and resubmit.");
        setFeedback("");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setDecision(null);
      }
    });
  };

  return (
    <div className="rounded-lg border border-line p-4">
      <Label htmlFor={`fb-${projectId}`} required>Structured feedback</Label>
      <Textarea
        id={`fb-${projectId}`}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={5}
        placeholder="What works, what is missing, and the single most useful next step. Reference the numbers they used."
      />
      <FieldError>{error}</FieldError>
      {done ? <InlineAlert tone="success">{done}</InlineAlert> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => submit("approved")}>
          {pending && decision === "approved" ? "Approving…" : "Approve"}
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => submit("changes_requested")}>
          {pending && decision === "changes_requested" ? "Sending…" : "Request changes"}
        </Button>
      </div>
    </div>
  );
}
