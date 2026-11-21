"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Textarea, Label, FieldError, Helper, InlineAlert, StatusBadge } from "./ui";
import { saveProject, setShowcaseConsent } from "@/actions/coreos";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/domain/types";
import { Check } from "lucide-react";

export function ProjectEditor({
  challengeId,
  challengeTitle,
  existing,
}: {
  challengeId: string;
  challengeTitle: string;
  existing: {
    id: string;
    title: string;
    draft: string;
    evidenceUrl: string;
    status: string;
    consentToShowcase: boolean;
  } | null;
}) {
  const [title, setTitle] = useState(existing?.title ?? challengeTitle);
  const [draft, setDraft] = useState(existing?.draft ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(existing?.evidenceUrl ?? "");
  const [consent, setConsent] = useState(existing?.consentToShowcase ?? false);
  const [errors, setErrors] = useState<{ title?: string; draft?: string; evidenceUrl?: string }>({});
  const [status, setStatus] = useState<string>(existing?.status ?? "draft");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = status === "draft" || status === "changes_requested";

  const submitForm = (submit: boolean) => {
    setErrors({});
    setNotice(null);
    const next: typeof errors = {};
    if (title.trim().length < 3) next.title = "Give the project a title of at least 3 characters.";
    if (draft.trim().length < 20) next.draft = "Write at least one real sentence (20+ characters) about your design.";
    if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) next.evidenceUrl = "Evidence must be a full http(s) URL or blank.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    startTransition(async () => {
      try {
        await saveProject({
          projectId: existing?.id,
          challengeId,
          title: title.trim(),
          draft: draft.trim(),
          evidenceUrl: evidenceUrl.trim(),
          submit,
          consentToShowcase: consent,
        });
        setStatus(submit ? "submitted" : "draft");
        setNotice(submit ? "Submitted for review. A mentor will see it in their queue." : "Draft saved.");
      } catch (e) {
        setErrors({ draft: (e as Error).message });
      }
    });
  };

  const toggleConsent = (value: boolean) => {
    setConsent(value);
    if (!existing?.id) return;
    startTransition(async () => {
      try {
        await setShowcaseConsent({ projectId: existing.id, consent: value });
      } catch (e) {
        setNotice((e as Error).message);
      }
    });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-mist px-4 py-2.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-strong">Your submission</p>
        <StatusBadge
          label={PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status}
          tone={status === "approved" || status === "showcased" ? "solid" : "outline"}
        />
      </div>

      <div className="p-4 sm:p-5">
        {!editable ? (
          <InlineAlert tone="info" title="Locked while in review">
            This submission is {PROJECT_STATUS_LABELS[status as ProjectStatus]?.toLowerCase()}. You can still edit your
            showcase consent below; content edits reopen only if a mentor requests changes.
          </InlineAlert>
        ) : null}

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="p-title" required>Project title</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} />
            <FieldError>{errors.title}</FieldError>
          </div>
          <div>
            <Label htmlFor="p-draft" required>Design note</Label>
            <Textarea
              id="p-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!editable}
              rows={8}
              placeholder={"State your target values, the calculation, the component you chose, and how you would verify it.\n\nExample: Target current 20 mA. Supply 5 V, LED drops 2 V → resistor takes 3 V. R = 3 ÷ 0.02 = 150 Ω. I would measure the voltage across the resistor with a multimeter."}
            />
            <Helper>Concrete numbers and a verification step make the review useful.</Helper>
            <FieldError>{errors.draft}</FieldError>
          </div>
          <div>
            <Label htmlFor="p-evidence">Evidence link</Label>
            <Input
              id="p-evidence"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              disabled={!editable}
              placeholder="https://… (photo, notebook scan, repo)"
            />
            <FieldError>{errors.evidenceUrl}</FieldError>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border border-line p-3.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => toggleConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-black"
            />
            <span className="text-[12.5px] leading-relaxed text-strong">
              <span className="font-medium text-ink">I consent to public showcase</span> if a mentor approves this
              project. Without consent it stays private even when approved.
            </span>
          </label>

          {Object.keys(errors).length > 0 ? (
            <InlineAlert tone="error" title="Check the form">
              {Object.values(errors).filter(Boolean)[0]}
            </InlineAlert>
          ) : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

          {editable ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button type="button" variant="secondary" onClick={() => submitForm(false)} disabled={pending}>
                {pending ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" onClick={() => submitForm(true)} disabled={pending}>
                <Check size={14} aria-hidden /> Submit for review
              </Button>
              <span className="text-[11px] text-mid">Submitting locks content edits until a decision.</span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
