# AURA — Product Requirements Document

**Version 3.0 · 21 November 2026 · Refined from v2.0 (`02-revised-prd.md`)**
**Status:** Build specification. This document describes *what the product must do* and *how we know it works*. `../design.md` covers how it looks, `../agent.md` covers how it is built, `ARCHITECTURE.md` covers implementation boundaries.

---

## 0. What changed from v2.0 (and why)

v2.0 was a strong product document with three internal conflicts that would have derailed implementation. This version resolves them explicitly rather than silently.

| # | Conflict in v2.0 | Resolution in v3.0 | Consequence |
|---|---|---|---|
| 1 | `04-design-system.md` mandates **strict monochrome**, but the supplied brand kit is a black/white drone mark used in a dark, gold-accented presentation surface | **Hybrid, scoped gold.** Workspace and product UI are strictly monochrome. A single gold accent is permitted **only** inside `.public-surface` (marketing pages). Gold never encodes meaning or state. | Removes the ambiguity that produces "sometimes gold" chaos. Rule is enforceable in code (§3.4). |
| 2 | v2.0 says "use existing auth if available, otherwise demo sign-in", and separately says permissions must be enforced in a trusted layer — without saying which layer wins when there is no backend | **Explicit demo-session contract.** Role switching is a demonstration affordance; **every** mutation still passes through server-side role/ownership checks in `actions/*`. Swapping the session source must not change a single rule. | Judges can switch roles freely; the security model is still demonstrated honestly. |
| 3 | "Adaptive learning" is described as an outcome, not a mechanism, while also claiming no mastery model | **Deterministic rule set R1–R6**, each producing a human-readable reason and an evidence list. No score, no label, no percentage. | The adaptive claim is testable in unit tests (`tests/adaptation.test.ts`). |

Additionally: the AI tutor decision was made explicit — **this build ships a curated Demo Tutor only**. No live model is connected, and the UI says so wherever a response appears. v2.0 allowed either; leaving it optional produced "maybe live AI" UI ambiguity.

---

## 1. Problem statement (unchanged, and binding)

> Students often struggle to understand complex academic topics and find learning resources that match their understanding levels. Develop an interactive learning platform that helps students simplify difficult concepts, improve their understanding and make their learning experience more effective through AI-powered assistance.

**Interpretation the build must satisfy.** Three failures in current tools:

1. **Level mismatch** — an explanation assumes prior knowledge the learner does not have.
2. **False comfort** — reading an answer feels like learning but produces no evidence.
3. **A cliff after understanding** — knowing a concept leads nowhere without a way to apply it.

AURA must visibly address all three. If a demo only shows "chatbot answers a physics question", the problem statement is not met.

---

## 2. Product definition

One product, two connected layers, one identity, one database.

| Layer | Users | Job |
|---|---|---|
| **AURA Learning** (primary) | Students, independent learners | Explain at a chosen level and style → prove understanding through checks → adapt the next step from evidence → apply in a project |
| **AURA Core OS** (enabling) | Mentors, reviewers, curators, organisers, liaisons, custodians, admins | Run the people, programmes, workshops, projects, school partnerships and equipment that make application possible |

**The connective tissue is what makes AURA distinct, and it must be demonstrable:**

```
Topic ──▶ Practice attempt ──▶ Recommendation ──▶ Mini-project ──▶ Mentor review
  │                                                                      │
  └────────────── Event / workshop ◀──── Resource allocation ◀──────────┘
                 (kit list comes from the project's required concepts)
```

A judge must be able to trace one continuous thread: *Ohm's Law → a wrong check → a "revisit prerequisites/practise more" recommendation with the evidence shown → the LED circuit mini-project → mentor approval → consent → showcase → the workshop that teaches it → the breadboards issued from inventory.*

---

## 3. Locked decisions

These are settled. Implementation must not re-open them.

### 3.1 Learning-graph scope
3 subjects (Physics, Mathematics, Computer Science), 7 topics, prerequisites as a real relation (not a label). No prebuilt curriculum marketplace.

### 3.2 Tutor response contract
Every tutor turn returns a **typed, validated object**, never free text parsed by the UI:

```
summary, blocks[], prerequisiteNote?, checkQuestionId?, nextStep{label, reason},
sources[], uncertaintyNote?, provider: "demo", level, mode, generatedAt
```

`blocks[]` kinds: `text | steps | formula | example | warning | question`.
The renderer handles each kind explicitly; unknown kinds degrade gracefully.

### 3.3 Grading is deterministic and local
`mcq` (option id), `numeric` (tolerance-aware, unit-tolerant), `short` (normalised variants). **No model is ever in the grading path.** Rationale: a model that grades cannot be audited, and the PRD forbids implying measurement of ability.

### 3.4 Colour law
- Workspace, product, and admin surfaces: monochrome only (`#111 #000 #FFF #F7F7F7 #EFEFEF #E3E3E3 #777 #555 #A3A3A3`).
- `.public-surface` may use one gold scale (`#C9A24B` → `#7A5716`) for accent rules, eyebrows and emphasis **only**.
- **Status is never colour-coded.** Status uses icon + text + neutral badge. This is an accessibility decision and a brand-discipline decision.

### 3.5 Honesty is a feature, not a footnote
Every surface that shows generated or sample content labels it: `Demo tutor · curated response`, `Demo event`, `Demo data`, `Fictional members`. A page that has no real content says so (`"Nothing public yet — and nothing faked to fill the gap."`).

### 3.6 No dead controls
Every visible primary button performs a real, persisted state change, or is visibly and explainably disabled. `href="#"` is forbidden. Where a capability is deliberately out of scope (content authoring UI), the screen says what to do instead.

---

## 4. Roles and permissions

A user may hold multiple roles. **Permissions are enforced server-side in `actions/*` before any write.** UI hiding is cosmetic.

| Role | Can do | Cannot do |
|---|---|---|
`student` | Learn, ask tutor, attempt checks, save bookmarks/goals, draft & submit projects, register for events, set showcase consent | Review projects, see others' learner records, touch inventory |
`mentor` | See assigned learners and submissions, leave structured review, approve / request changes | Publish to showcase, administer members, issue equipment |
`reviewer` | Same review powers as mentor, scoped to assignments | — |
`curator` | View and (in this build) read the learning content catalogue, view admin overview | Edit content (read-only by design in v3.0, see §10) |
`organizer` | Create and publish events, view registrations | Review projects, process school requests |
`liaison` | Triage school requests, assign owner, move lifecycle, convert approved request → workshop | Administer inventory |
`custodian` | Manage inventory ledger, issue/return equipment, adjust stock | Review projects, publish events |
`admin` | All of the above + showcase decisions + member directory | — |

**Boundary rules that are tested:**
- A learner cannot review their own project (`PermissionError`).
- A learner cannot issue inventory (`PermissionError`).
- A mentor hitting `/admin/members` is redirected, not shown an error page.
- A school liaison cannot reach inventory.

---

## 5. Functional requirements

Priorities: **P0** = competition-critical and shipped. **P1** = next increment. **P2** = later.

### 5.1 Identity & session
- **FR-ID-01 (P0)** Demo sign-in selects one of five fictional accounts. Session is an httpOnly cookie. Login page states plainly that this is not secure authentication.
- **FR-ID-02 (P0)** Learner can set a **preferred explanation level** (default on every tutor session) and a **learning goal** (shown on overview).
- **FR-ID-03 (P0)** Navigation is role-aware; a student sees Learn only, staff additionally see Operate.
- **FR-ID-04 (P0)** Every protected mutation validates role **and** ownership/assignment server-side.
- **FR-ID-05 (P1)** Invitations, suspension, data correction.
- **FR-ID-06 (P1)** Multiple roles per user — already modelled (`user_roles` many-to-many).

### 5.2 Learning home & discovery
- **FR-LRN-01 (P0)** Overview leads with **one** next action, with its reason and evidence visible.
- **FR-LRN-02 (P0)** Browse 3 subjects → topics with summary, difficulty, outcomes, prerequisites.
- **FR-LRN-03 (P0)** Topic page shows reviewed resources, available checks count, linked build, siblings.
- **FR-LRN-04 (P0)** Every recommendation displays *why* — naming the topic, the attempt counts and the miss streak used.
- **FR-LRN-05 (P1)** Bookmarks (schema present), learning goals (shipped).
- **FR-LRN-06 (P1)** Curated multi-topic learning paths with completion criteria.

### 5.3 AI learning companion (Demo Tutor)
- **FR-AI-01 (P0)** Ask about the selected topic, or request a general explanation of it.
- **FR-AI-02 (P0)** Explicit level selector: Beginner / Intermediate / Advanced, with plain-language descriptions. Changing level never silently alters itself.
- **FR-AI-03 (P0)** Four modes: Simple, Step-by-step, Example-first, Hints/Socratic. Mode changes the **block composition**, not just the tone — Example-first literally leads with the worked example; Socratic omits the answer and asks questions.
- **FR-AI-04 (P0)** Responses include, as appropriate: plain summary, key idea, prerequisite reminder (only when prerequisites exist), analogy, formula, worked example, check question, next step.
- **FR-AI-05 (P0)** Follow-up questions are persisted in the topic's session and rendered in the thread.
- **FR-AI-06 (P0)** If the learner's message indicates being stuck ("hint", "confused", "don't get"), the tutor switches to Socratic behaviour and says so.
- **FR-AI-07 (P0)** Answers are presented as assistance. Sources render **only** from reviewed resource records; with none, nothing is shown. No invented citations.
- **FR-AI-08 (P0)** Status is always labelled `Demo tutor · curated response`; the footer states no live model is connected.
- **FR-AI-09 (P0)** A topic with no curated content **admits it** (`warning` block) rather than improvising.
- **FR-AI-10 (P0)** Helpful / not-helpful feedback is stored per tutor message.
- **FR-AI-11 (P1)** Diagrams, formula rendering beyond monospace, code blocks.

### 5.4 Practice & adaptation
- **FR-ADP-01 (P0)** Checks of three types: `mcq`, `numeric` (tolerance + unit handling), `short` (normalised variants).
- **FR-ADP-02 (P0)** Feedback explains *why*, reveals the expected answer after a miss, and never only shows red/green.
- **FR-ADP-03 (P0)** Attempts persist: response, correctness, feedback text, optional 1–5 confidence, timestamp.
- **FR-ADP-04 (P0)** A miss triggers a hint-first path: the practice runner offers a hint before submission; the tutor offers a Socratic route.
- **FR-ADP-05 (P0)** Deterministic rules, in priority order:
  - **R1** unmet prerequisite (≥2 misses or no success on the prerequisite) → `drill_prereq`
  - **R2** ≥2-miss streak in the current topic → `more_practice`
  - **R3** single recent miss → `more_practice` with hint framing
  - **R4** correct but self-rated confidence ≤2 → `more_practice` (another example), *not* advance
  - **R5** correct and a linked build exists → `advance` to the mini-project
  - **R6** explained but never attempted → `more_practice` ("check your understanding")
  - **R7** untouched topic → `start`
- **FR-ADP-06 (P0)** Every recommendation carries `evidence[]` (strings such as `"Recent miss streak: 2"`, `"Self-rated confidence: 2/5"`), rendered as chips on the overview.
- **FR-ADP-07 (P0)** Learner can always ignore the recommendation and choose another topic.
- **FR-ADP-08 (P1)** Spaced revision scheduling.
- **FR-ADP-09 (P2)** Validated richer mastery model — explicitly out of scope; the current rule set must never be described as one.

### 5.5 Progress & evidence
- **FR-PRG-01 (P0)** A topic has an **evidence state**, derived only from records:
  `not_started → exploring (tutor session) → practising (attempt exists) → building (project submitted) → applied (project approved/showcased)`
- **FR-PRG-02 (P0)** **No percentage mastery is displayed anywhere.** Where a count is shown ("3 of 4 evidence steps"), what each step means is stated.
- **FR-PRG-03 (P0)** Recent evidence lists topic, question, correctness, relative time.
- **FR-PRG-04 (P1)** Resource-level started/completed tracking; richer learning paths.
- **FR-PRG-05 (P2)** Curator authoring UI (see §10 for the honest interim).

### 5.6 Application
- **FR-APP-01 (P0)** Topics link to published challenges (Ohm's Law → *Design a safe LED circuit*).
- **FR-APP-02 (P0)** Learner can draft (autosaved explicitly), then submit; content locks while in review.
- **FR-APP-03 (P0)** Evidence link accepted (validated as URL) and displayed to reviewers as a demo link, explicitly *not* fetched.
- **FR-APP-04 (P0)** Mentor/reviewer gives a decision + specific written feedback (≥15 chars), stored and shown to the learner.
- **FR-APP-05 (P0)** Status machine: `draft → submitted → (changes_requested → submitted) | approved → showcased`. Illegal transitions are rejected server-side.
- **FR-APP-06 (P0)** Showcase requires **both** author consent and admin approval. Removing it returns the project to `approved`.
- **FR-APP-07 (P1)** Teams, milestones, per-project activity log.

### 5.7 Events
- **FR-EVT-01 (P0)** Public listing of published events with time, venue, mode, seats used/capacity.
- **FR-EVT-02 (P0)** Organiser creates and publishes an event; validation rejects end ≤ start and registration closing after the start.
- **FR-EVT-03 (P0)** Register / cancel; state reflected immediately.
- **FR-EVT-04 (P0)** **Duplicate registration is impossible** (composite primary key) and **capacity overflow is impossible** (count checked inside the write path). Both are covered by tests.
- **FR-EVT-05 (P1)** Attendance recording, CSV export, follow-up.
- **FR-EVT-06 (P0)** Events link to topics; inventory allocations link to events.

### 5.8 Members, mentors, teams
- **FR-MEM-01 (P0)** Admin directory with roles and a per-member activity count.
- **FR-MEM-02 (P0)** Mentor assignments define scope; mentor workspace shows assigned learners with attempt summaries and a concrete "how to help" line.
- **FR-MEM-03 (P0)** Mentor queue distinguishes *in scope* from *outside assignments*, and says so.
- **FR-MEM-04 (P1)** Team invitations and roles.
- **FR-MEM-05 (P1)** Learner-initiated mentor discovery with consent.

### 5.9 School collaboration
- **FR-SCH-01 (P0)** Public request form, no account needed, fully validated with inline errors.
- **FR-SCH-02 (P0)** Captures school, location, contact, activity, grade range, expected participants, preferred dates, facilities, message.
- **FR-SCH-03 (P0)** Returns a **reference code** (`AURA-SR-…`) shown on confirmation and stored uniquely.
- **FR-SCH-04 (P0)** Liaison queue: assign owner, **internal notes visibly separated and labelled "never shown to the requester"**, and a fixed lifecycle
  `new → in_review → approved → scheduled → completed` with `declined` reachable from the first three.
- **FR-SCH-05 (P0)** Illegal lifecycle jumps are rejected server-side with the attempted transition named.
- **FR-SCH-06 (P0)** An approved request converts into a published workshop event (title, start, venue), links both ways, and cannot be converted twice.
- **FR-SCH-07 (P1)** Requester-facing status lookup.

### 5.10 Inventory
- **FR-INV-01 (P0)** Item register: name, category, identifier (unique), unit, on-hand, condition, location, low-stock threshold.
- **FR-INV-02 (P0)** **Availability is derived**, never stored: `on_hand − Σ open allocations`.
- **FR-INV-03 (P0)** Issue: custodian-only, quantity validated **inside the transaction** against freshly-read availability. Rejection states the real number (`"Only 4 available. Cannot issue 99."`).
- **FR-INV-04 (P0)** Return: records condition; **damaged/retired returns are written off the ledger**, not silently restored to sellable stock.
- **FR-INV-05 (P0)** Double-return is rejected.
- **FR-INV-06 (P0)** Stock adjustments require a reason, cannot go negative, and cannot take on-hand below the allocated quantity; every movement is appended to an immutable ledger.
- **FR-INV-07 (P1)** Maintenance workflow, QR scanning, procurement requests.

### 5.11 Admin overview & audit
- **FR-ADM-01 (P0)** Eight live indicators (active learners 7d, attempts 7d, reviews pending, upcoming events, open school requests, equipment out, low stock, registered seats, project records).
- **FR-ADM-02 (P0)** **Every number is computed from the same tables the modules write to**, and every tile links to its underlying list.
- **FR-ADM-03 (P0)** Recent privileged actions list from `audit_events` (issuance, status changes, creation).
- **FR-ADM-04 (P1)** CSV export.
- **FR-ADM-05 (P0)** No decorative KPI, no invented trend arrow.

---

## 6. Core journeys (acceptance-shaped)

### Journey A — Understand a difficult topic *(primary demo)*
1. Learner opens a topic → tutor screen with level and style controls.
2. Chooses Beginner + Example-first → presses Explain.
3. Receives a structured, clearly-labelled demo response led by a worked example, with a prerequisite reminder and a next step.
4. Asks a follow-up → answer persists in the thread.
5. Answers the check **incorrectly** → sees the hint and the expected answer with reasoning.
6. Answers a second check correctly → overview recommendation changes and states the evidence.
7. Progress shows the actual attempts, not a score.

### Journey B — Apply it
1. Overview surfaces the linked mini-project.
2. Learner opens it, sees objective and required concepts, writes a design note, saves draft, submits.
3. Content locks. Mentor sees it in queue, writes structured feedback, approves.
4. Learner consents to showcase. Admin publishes. It appears at `/projects`.

### Journey C — AURA runs a workshop
1. School submits a request → receives a reference.
2. Liaison moves it `new → in_review`, assigns self, writes an internal note.
3. `in_review → approved`, then converts it into a published workshop with date and venue.
4. Custodian issues kits against that event.
5. Registration is capacity-safe; return is recorded; availability recovers.

### Journey D — Admin maintains quality
Curator reviews topics, outcomes, prerequisites, resource review state, and per-question attempt counts from the admin learning screen. Authoring is read-only in v3.0 (see §10).

---

## 7. Data model

28 tables. Full DDL in `ARCHITECTURE.md §4` and `lib/db/migrate.ts`. Conceptual shape:

```
users ─*─ user_roles                       (many roles per person)
users 1─* tutor_sessions ─* tutor_messages
users 1─* practice_attempts *─1 practice_questions *─1 topics
subjects 1─* topics *─* topics             (topic_prerequisites)
topics 1─* resources | practice_questions | challenges
challenges 1─* projects 1─* project_reviews
projects │ events │ collaboration_requests ─0..*─ resource_allocations *─1 inventory_items
inventory_items 1─* stock_movements
users *─* users                            (mentor_assignments)
events 1─* event_registrations *─1 users   (PK: event+user)
*─* audit_events
```

**Invariants the database itself enforces:**
- `event_registrations` primary key `(event_id, user_id)` → no duplicates possible.
- `inventory_items.identifier` unique.
- `collaboration_requests.reference` unique.
- Foreign keys on everywhere; `PRAGMA foreign_keys = ON`.

**Invariants the application layer enforces (and tests):**
- capacity check inside the registration write
- availability check inside the issue transaction
- status transitions via explicit transition tables
- ownership/role on every mutation

---

## 8. Non-functional requirements

**Accessibility**
- Keyboard reachable; visible focus ring (2px, offset 2, `:focus-visible`).
- One `h1` per page; semantic `main`, `nav[aria-label]`, `table` with `caption` (screen-reader only where visual duplication would be noise).
- Labelled inputs; errors announced with `role="alert"`; `aria-invalid` on failure.
- `prefers-reduced-motion` disables transitions/animations.
- Status conveyed by text, never colour alone.
- Touch targets ≥ 32px on mobile controls; primary actions 40px.

**Responsive** — verified at **360, 390, 768, 1024, 1440**. 13 routes × 5 widths automated with zero horizontal overflow and zero console errors.

**Performance** — First-load JS ≈ 103 kB shared; no animation beyond a 180 ms fade; data tables scroll rather than break layout.

**Honesty** — demo data labelled; no fabricated partners, testimonials, metrics, or citations; missing content admitted.

**Maintainability**
- Domain rules are pure functions in `lib/domain/*` with unit tests.
- Validation schemas live outside `"use server"` modules (enforced by a structural test).
- Data access in `lib/services/*`; mutations in `actions/*`; presentation in `app/*` + `components/*`.
- Types are strict; `any` is absent from application code.

---

## 9. Acceptance criteria

A judge can complete all of the following with no dead buttons and no unexplained errors:

| # | Criterion | Verified by |
|---|---|---|
1 | Enter as a student and open a topic | Playwright flow |
2 | Change level and style; receive a structured, labelled response | Playwright flow + unit test |
3 | Answer a check incorrectly and get a hint plus the expected answer | Playwright flow |
4 | Answer correctly and see the next recommendation with its reason | Playwright + unit tests |
5 | See the attempt reflected in progress/overview | Playwright flow |
6 | Open the linked mini-project, save a draft, submit | Playwright flow |
7 | Switch to mentor, review, approve | Server-action test |
8 | Learner consent is required before showcase | Unit test + server-action test |
9 | Register for a workshop; duplicate is impossible | Integration test (in-memory DB) |
10 | Submit a school request, receive a reference, process the lifecycle | Server-action test |
11 | Convert approved request into a workshop | Server-action test |
12 | Issue inventory, be blocked from oversubscribing, return | Integration test + server-action test |
13 | Admin overview reflects the above changes | Manual + metric computation from shared tables |

**Current status: 63 automated tests pass; 16 browser flows pass; 65 viewport checks clean; production build succeeds.**

---

## 10. Deliberate scope boundaries (what is *not* built, and what the product says instead)

| Not built | Why | What the UI does instead |
|---|---|---|
Live LLM tutor | Product decision: demo-only for the competition build; a deterministic, auditable tutor demonstrates the *interaction model* honestly | Labels every response `Demo tutor · curated response`; states in the composer footer that no model is connected; a missing topic is admitted |
Curator content authoring UI | Building a half-working editor is worse than none | Admin learning screen is read-only and states: edit `lib/db/seed.ts`, then `npm run db:reset` |
Team management UI | P1 | Mentor assignments are seeded; screen is read-only and says so |
Real file uploads | P1 | Evidence link field, validated as a URL, shown to reviewers as a demo link explicitly not fetched |
Real authentication | Out of scope for a demo build | Demo accounts; login page and README state limitations plainly |
Certificates, grades, mastery scores | Forbidden by product principles | Explicitly absent; progress is evidence states with defined meanings |
Native mobile apps, robotics telemetry, billing, ERP, social network | Out of scope per PRD §4 | — |

---

## 11. Success measures (for a real pilot, not this build)

- Share of learners who complete a check after opening a tutor session.
- Improvement between comparable attempts (same topic, later attempt).
- Recommendation acceptance vs. override rate, by rule (R1–R7) — tells us which rules help.
- Usefulness rating of tutor responses; count of reported inaccuracies.
- Time from "I don't understand" to a recorded attempt.
- Share of topics with a linked application activity.
- Projects submitted with evidence **and** mentor feedback.
- School request response time and fulfilment rate.
- Inventory issue/return accuracy (ledger discrepancies).

**No numeric targets are set before a baseline exists.** Stating a target without a baseline is how vanity metrics get invented.

---

## 12. Assumptions still to validate with AURA

1. Which learner levels and subjects are the actual first cohort?
2. Who is authorised to curate content, and what review workflow applies to tutor notes?
3. Does AURA have a real mentor-assignment process, and who owns it?
4. What learner data may be collected, where may it live, and who may access it?
5. Which inventory fields and approval steps reflect real practice?
6. Is the drone mark the approved institutional symbol, and is the wordmark-only version available for UI use?

Until answered, workflows stay configurable and all data stays labelled demo.
