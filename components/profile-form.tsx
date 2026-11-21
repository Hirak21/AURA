"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Label, Select, FieldError, InlineAlert, Helper } from "./ui";
import { setLearningGoal, setPreferredLevel } from "@/actions/learning";
import { EXPLANATION_LEVELS, LEVEL_LABELS, type ExplanationLevel } from "@/lib/domain/types";

export function ProfileForm({
  displayName,
  email,
  level,
  goal,
}: {
  displayName: string;
  email: string;
  level: ExplanationLevel;
  goal: string;
}) {
  const [levelValue, setLevelValue] = useState<ExplanationLevel>(level);
  const [goalValue, setGoalValue] = useState(goal);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(null);
    if (goalValue.trim().length > 0 && goalValue.trim().length < 3) {
      setError("Give the goal at least 3 characters, or clear it.");
      return;
    }
    startTransition(async () => {
      try {
        await setPreferredLevel({ level: levelValue });
        if (goalValue.trim().length > 0) await setLearningGoal({ goal: goalValue.trim() });
        setSaved("Preferences saved.");
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={displayName} readOnly disabled />
          <Helper>Fixed in the demo seed. Account editing is intentionally disabled.</Helper>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly disabled />
          <Helper>Never shown to other learners.</Helper>
        </div>
        <div>
          <Label htmlFor="pl">Preferred explanation level</Label>
          <Select
            id="pl"
            value={levelValue}
            onChange={(e) => setLevelValue(e.target.value as ExplanationLevel)}
          >
            {EXPLANATION_LEVELS.map((l) => (
              <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="goal">Learning goal</Label>
          <Input
            id="goal"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            placeholder="e.g. Build a working sensor project"
            maxLength={140}
          />
        </div>
      </div>

      <FieldError>{error}</FieldError>
      {saved ? <InlineAlert tone="success">{saved}</InlineAlert> : null}

      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
        <span className="text-[11px] text-mid">Applies to your next tutor session.</span>
      </div>
    </Card>
  );
}
