# Adaptation Rules — Specification

**File of record:** `lib/domain/adaptation.ts` · **Tests:** `tests/adaptation.test.ts`
Every rule below is deterministic, requires no model, and produces a human-readable reason plus an evidence list.

---

## 1. What this system is — and is not

**Is:** a small rule set that chooses the next learning action from recorded evidence, and explains itself.

**Is not:** a mastery model, an ability estimate, a diagnostic, or a ranking. No score is computed. No learner is labelled. Nothing is inferred about intelligence, disability, or aptitude. The word "mastery" must not appear in the UI.

**Why rules instead of a model:** a learner (and a teacher) can be told exactly why a suggestion appeared, and can argue with it. A model cannot offer that. `PRD.md §5.4/FR-ADP-09` keeps a validated richer model as P2, and requires educational validation before it exists.

---

## 2. Inputs

```ts
interface AdaptationInput {
  topic: { topicId; title; prerequisiteTopicIds[] };   // the topic in focus
  topicTitles: Record<topicId, title>;                 // display only
  attempts: AttemptRecord[];                            // all attempts, oldest first
  explainedTopicIds: string[];                          // tutor sessions opened
  linkedProjectTopicId?: string;                        // topic that has a published challenge
  level: "beginner" | "intermediate" | "advanced";       // copy tone only
}
```

`AttemptRecord = { questionId, topicId, isCorrect, confidence (1–5|null), createdAt }`

**Target selection** (`lib/services/recommendations.ts`), also deterministic:
1. the topic of the most recent action (attempt or tutor session);
2. else the first published topic never touched;
3. else the first published topic.

---

## 3. Rules, in evaluation order

The first matching rule wins. Each returns `{action, topicId, label, reason, evidence[]}`.

| # | Condition | Action | Reason pattern (verbatim) |
|---|---|---|---|
**R1** | A prerequisite of the focus topic has ≥2 misses in the recent window, **or** has attempts but no success | `drill_prereq` | "Your recent attempts show N misses in “{prereq}”, which “{topic}” builds on." |
**R2** | ≥2 consecutive misses at the end of the focus topic's attempt list | `more_practice` | "The last N checks on “{topic}” were not correct. One more guided question — with hints — is the fastest way forward." |
**R3** | Exactly 1 consecutive miss and fewer than 3 attempts on the topic | `more_practice` | "Your last check on “{topic}” was missed. A second attempt with the hint available is better evidence than moving on." |
**R4** | Last attempt correct **and** self-rated confidence ≤ 2 | `more_practice` | "You answered correctly but rated your confidence low (C/5). Another example usually settles it." |
**R5** | Last attempt correct **and** a published linked challenge exists | `advance` | "You have answered checks correctly on “{topic}” N times. A short applied activity turns that into evidence you can show." |
**R6** | Last attempt correct, no linked challenge | `advance` | "The most recent check on “{topic}” was correct. Continue when you feel ready — one correct check is progress, not mastery." |
**R7** | Topic explained (tutor opened) but zero attempts | `more_practice` | "You opened the tutor for “{topic}” but have not attempted a check yet. One attempt creates your first piece of evidence." |
**R8** | Default | `start` | "No attempts yet." + prerequisite count if any |

**Deliberate ordering consequences**
- R1 outranks R2: a systemic prerequisite gap is more useful to fix than grinding the same topic.
- R4 outranks R5/R6: a *correct but unconfident* answer should not push the learner forward. Confidence is the only self-reported signal in the system and it is used **only** in this narrow, learner-serving way.
- R7 means "reading is not evidence" — the product's central claim, encoded as a rule.

---

## 4. Evidence strings

Every recommendation ships `evidence: string[]` (1–4 items) rendered as chips on the learner's overview. Examples:

- `Prerequisite: Fractions & Ratios`
- `Attempts on prerequisite: 2`
- `Missed: 2`
- `Recent miss streak: 3`
- `Last attempt: correct`
- `Self-rated confidence: 2/5`
- `Correct attempts: 4`
- `Linked mini-project available`
- `Tutor session opened`
- `No attempts recorded`

**Rule:** if a recommendation cannot state its evidence, it must not be shown.

---

## 5. Evidence state (progress, not mastery)

```
not_started → exploring → practicing → building → applied
```

| State | Trigger |
|---|---|
`exploring` | a `tutor_sessions` row exists for the user+topic |
`practicing` | at least one `practice_attempts` row exists |
`building` | the linked project status is `submitted`, `changes_requested`, `approved` or `showcased` |
`applied` | the linked project is `approved` or `showcased` |

Rendered as a 4-segment meter **plus literal text** (`"3 of 4 — explored → practised → built → applied"`). No percentage is ever computed.

---

## 6. Worked examples

**E1 — prerequisite trap.** Learner has two misses on *Fractions & Ratios*, opens *Linear Equations*.
→ **R1** `drill_prereq` → Fractions. Evidence: `Prerequisite: Fractions & Ratios`, `Attempts on prerequisite: 2`, `Missed: 2`.

**E2 — hint before shortcut.** Two misses on *Ohm's Law*, no prerequisite issues.
→ **R2** `more_practice`, label "Try another guided question on this topic". Evidence: `Recent miss streak: 2`.

**E3 — unconfident winner.** One correct attempt on *Ohm's Law* with confidence 1.
→ **R4** `more_practice`, "See one more worked example before moving on". The learner is *not* advanced despite being correct.

**E4 — the bridge to application.** One correct attempt, confidence 4, linked challenge exists.
→ **R5** `advance`, "Apply it: open the linked mini-project".

**E5 — reading is not learning.** Tutor opened on *Newton's Second Law*, no attempts.
→ **R7** `more_practice`, "Check your understanding with a short question".

**E6 — fresh start.** Nothing recorded.
→ **R8** `start`.

---

## 7. Learner control

- The recommendation is always accompanied by links to the tutor, the practice page and the topic page. A learner can ignore it entirely.
- There is no lock, no gate, and no penalty for choosing another topic.
- On the practice screen the recommended topic is marked `suggested`, not selected-and-locked.
- Confidence ratings are optional and can be left blank.

---

## 8. Extending the rules

1. Add the rule to `recommendNext` **in priority position**, returning the same `Recommendation` shape with ≥1 evidence string.
2. Add a test to `tests/adaptation.test.ts` covering the new condition **and** one showing what it now outranks.
3. Update this document's table and §6 with a worked example.
4. Update `docs/PRD.md §5.4` so the spec and the code cannot drift.
5. Run `npm test` — the determinism test must still pass (identical input ⇒ identical output).

**Never** introduce randomness, wall-clock dependence beyond `createdAt` ordering, or any external call into this module.
