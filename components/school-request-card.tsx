"use client";

import { useState, useTransition } from "react";
import { Button, Card, Textarea, Input, Label, Select, FieldError, InlineAlert, StatusBadge } from "./ui";
import { updateCollaborationRequest, convertRequestToEvent } from "@/actions/schools";
import { REQUEST_STATUS_LABELS, REQUEST_TRANSITIONS, type RequestStatus } from "@/lib/domain/types";
import { Lock } from "lucide-react";

interface RequestView {
  id: string;
  reference: string;
  schoolName: string;
  location: string;
  contactName: string;
  contactEmail: string;
  activityType: string;
  gradeRange: string;
  expectedParticipants: number;
  preferredDates: string;
  facilities: string;
  message: string;
  status: string;
  internalNotes: string;
  ownerName: string | null;
  linkedEventTitle: string | null;
}

export function SchoolRequestCard({
  request,
  topics,
}: {
  request: RequestView;
  topics: { id: string; title: string }[];
}) {
  const [notes, setNotes] = useState(request.internalNotes);
  const [status, setStatus] = useState(request.status);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [linkedEvent, setLinkedEvent] = useState(request.linkedEventTitle);

  // convert form
  const [convTitle, setConvTitle] = useState(`${request.activityType} — ${request.schoolName}`);
  const [convStart, setConvStart] = useState("");
  const [convVenue, setConvVenue] = useState("");
  const [showConvert, setShowConvert] = useState(false);

  const allowed = REQUEST_TRANSITIONS[status as RequestStatus] ?? [];

  const move = (next: RequestStatus) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await updateCollaborationRequest({ requestId: request.id, status: next, assignToMe: true });
        setStatus(next);
        setNotice(`Moved to “${REQUEST_STATUS_LABELS[next]}”.`);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const saveNotes = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await updateCollaborationRequest({ requestId: request.id, internalNotes: notes });
        setNotice("Internal notes saved. Not visible to the school.");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  const convert = () => {
    setError(null);
    setNotice(null);
    if (!convStart || !convVenue.trim() || convTitle.trim().length < 3) {
      setError("Title, start date and venue are required to create the workshop.");
      return;
    }
    startTransition(async () => {
      try {
        await convertRequestToEvent({
          requestId: request.id,
          eventTitle: convTitle.trim(),
          startsAt: new Date(convStart).toISOString(),
          venue: convVenue.trim(),
        });
        setStatus("scheduled");
        setLinkedEvent(convTitle.trim());
        setShowConvert(false);
        setNotice("Workshop created and published. The request is now scheduled.");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StatusBadge label={REQUEST_STATUS_LABELS[status as RequestStatus]} tone={status === "scheduled" || status === "completed" ? "solid" : "outline"} />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mid">{request.reference}</span>
        </div>
        <span className="text-[11.5px] text-strong">
          {request.ownerName ? `Owner: ${request.ownerName}` : "Unassigned"}
        </span>
      </div>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[15px] font-semibold">{request.schoolName}</p>
          <p className="text-[12.5px] text-strong">{request.location} · {request.gradeRange} · {request.expectedParticipants} expected</p>

          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12.5px]">
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Activity</dt><dd>{request.activityType}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Contact</dt><dd>{request.contactName} · {request.contactEmail}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Dates</dt><dd>{request.preferredDates}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Facilities</dt><dd>{request.facilities || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Message</dt><dd>{request.message || "—"}</dd></div>
            {linkedEvent ? (
              <div className="flex gap-2"><dt className="w-28 shrink-0 text-mid">Workshop</dt><dd className="font-medium">{linkedEvent}</dd></div>
            ) : null}
          </dl>

          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-strong">
              <Lock size={11} aria-hidden /> Internal notes · never shown to the requester
            </p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Liaison working notes, call outcomes, resource constraints…" />
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={saveNotes} disabled={pending}>
                Save notes
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-line p-4">
          <p className="eyebrow mb-2">Lifecycle</p>
          <p className="text-[11.5px] leading-relaxed text-strong">
            Allowed next steps from <span className="font-medium text-ink">{REQUEST_STATUS_LABELS[status as RequestStatus]}</span>:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allowed.length === 0 ? (
              <span className="text-[11.5px] text-mid">Terminal state — no further transitions.</span>
            ) : (
              allowed.map((a) => (
                <Button key={a} size="sm" variant={a === "declined" ? "destructive" : "secondary"} disabled={pending} onClick={() => move(a)}>
                  {REQUEST_STATUS_LABELS[a]}
                </Button>
              ))
            )}
          </div>

          {status === "approved" && !linkedEvent ? (
            <div className="mt-4 border-t border-line pt-3">
              {!showConvert ? (
                <Button size="sm" onClick={() => setShowConvert(true)}>
                  Convert to workshop
                </Button>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <Label htmlFor={`ct-${request.id}`} required>Workshop title</Label>
                    <Input id={`ct-${request.id}`} value={convTitle} onChange={(e) => setConvTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`cs-${request.id}`} required>Starts</Label>
                    <Input id={`cs-${request.id}`} type="datetime-local" value={convStart} onChange={(e) => setConvStart(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`cv-${request.id}`} required>Venue</Label>
                    <Input id={`cv-${request.id}`} value={convVenue} onChange={(e) => setConvVenue(e.target.value)} placeholder="School hall (demo)" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={convert} disabled={pending}>Create event</Button>
                    <Button size="sm" variant="tertiary" onClick={() => setShowConvert(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {linkedEvent ? (
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-strong">
              Linked workshop exists. Equipment can be allocated from the inventory screen against this event.
            </p>
          ) : null}

          <FieldError>{error}</FieldError>
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}
        </div>
      </div>
    </Card>
  );
}
