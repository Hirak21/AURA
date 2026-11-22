# Seed Data Reference

**File:** `lib/db/seed.ts` · **Reset:** `npm run db:reset`
Everything here is fictional and labelled as demo in the UI. Dates are generated relative to seed time so a demo never looks stale.

> **Production note.** This file documents the baseline database created by `db:init` / `db:reset`. For the separate, additive demo activity layer used on a deployed instance, see [PRODUCTION_DEMO_SEED.md](PRODUCTION_DEMO_SEED.md). That workflow never resets the database and is dry-run by default.

---

## People (7)

| ID | Name | Roles | Purpose in the demo |
|---|---|---|---|
`u-ananya` | Ananya Baruah | student | **Primary demo learner.** Starts at zero so the recommendation is visibly `start`. Goal: "Build a working sensor project on breadboard". |
`u-rohit` | Rohit Das | student, member | Has prior evidence: one correct Ohm's Law attempt and a **submitted** LED project, so the mentor queue is non-empty on first load. |
`u-meera` | Meera Kalita | student | Maths learner, assigned to Devika. Used to test practice in isolation. |
`u-kabir` | Kabir Ahmed | mentor, reviewer | Assigned to Ananya and Rohit. Demo reviewer. |
`u-devika` | Devika Sharma | liaison, organizer | Processes school requests, creates events, owns the scheduled request. |
`u-ishaan` | Ishaan Gogoi | custodian | Issues/returns equipment; actor on all opening stock movements. |
`u-jyoti` | Jyoti Nath | admin, curator | Full access; demo operator. |

All emails use `@demo.aura.local`. All rows have `is_demo = 1`.

---

## Subjects (3)

| ID | Title | Rationale |
|---|---|---|
`s-physics` | Physics | Home of the flagship Ohm's Law → LED circuit thread |
`s-maths` | Mathematics | Supplies the prerequisite gap that exercises rule R1 |
`s-cs` | Computer Science | Proves the catalogue is not single-domain |

---

## Topics (7) and prerequisites (5)

| ID | Topic | Subject | Difficulty | Prereq | Why it exists |
|---|---|---|---|---|---|
`t-ohm` | Ohm's Law | Physics | core | `t-series` | **Flagship topic.** Full tutor content, 3 checks (intro/core/stretch), linked LED challenge, used in the workshop. |
`t-series` | Series & Parallel Circuits | Physics | core | `t-ohm` | Its own curated content; also Ohm's prerequisite (a deliberate cycle that demonstrates the system does not loop — rules only look at attempts). |
`t-newton` | Newton's Second Law | Physics | core | `t-fractions` | Demonstrates **R1**: a physics topic gated on a maths prerequisite. |
`t-fractions` | Fractions & Ratios | Mathematics | intro | — | The prerequisite that makes R1 fire. |
`t-algebra` | Linear Equations | Mathematics | core | `t-fractions` | Second consumer of the fractions prerequisite. |
`t-arrays` | Arrays & Lists | Computer Science | intro | — | Proves a non-physics subject works end to end. |
`t-complexity` | Big-O Basics | Computer Science | stretch | `t-arrays` | Demonstrates the "stretch" difficulty and a CS prerequisite chain. |

Every topic has 2–3 learning outcomes stored as JSON and rendered on both the public topic page and the tutor header.

---

## Resources (5, all `review_status = reviewed`)

Demo-authored notes and one diagram, all with `is_demo = 1` and URLs under `demo.aura.local` (never fetched).

- Ohm's Law: "three lines" note (beginner), labelled LED circuit diagram, resistor-sizing worked example (intermediate)
- Newton: `F = ma` with everyday examples (beginner)
- Fractions: the four fraction operations (beginner)

**Why:** they populate the tutor's "Reviewed sources" panel, proving sources render only from real records — and they are honestly marked demo rather than presented as a bibliography.

---

## Practice questions (10)

| ID | Topic | Type | Difficulty | Answer | Purpose |
|---|---|---|---|---|---|
`q-ohm-1` | Ohm's Law | mcq | intro | `b` | Relational understanding, not formula recall |
`q-ohm-2` | Ohm's Law | numeric | core | `2` | Tests unit tolerance (`2 ohms`, `2Ω`) |
`q-ohm-3` | Ohm's Law | numeric | stretch | `150` | The **real LED resistor calculation** — same numbers as the mini-project |
`q-newton-1` | Newton | mcq | intro | `c` | Conceptual inverse relationship |
`q-newton-2` | Newton | numeric | core | `12` | `F = ma` direct |
`q-frac-1` | Fractions | numeric | intro | `0.83` | Decimal tolerance |
`q-frac-2` | Fractions | short | intro | `3/4` | Normalisation test (`three quarters` accepted) |
`q-algebra-1` | Algebra | numeric | core | `5` | Two-step equation |
`q-arrays-1` | Arrays | mcq | intro | `a` | Zero-indexing |
`q-complexity-1` | Big-O | mcq | stretch | `c` | Growth-rate ordering |

Each has a `hint` and an `explanation`. **Hints are always a route, never the answer** — the copy is written to that rule.

---

## Challenges (2)

| ID | Title | Topic | Purpose |
|---|---|---|---|
`c-led-circuit` | **Design a safe LED circuit** | Ohm's Law | The flagship application. Its required concepts (Ohm's Law, voltage-divider logic, standard resistor values, LED forward voltage) mirror the inventory kit that gets issued for the workshop. |
`c-projectile` | Model a falling object | Newton's Second Law | Proves the challenge system is not hardcoded to one topic. |

---

## Projects (1)

`p-seed-1` — Rohit Das, "LED indicator for a breadboard power rail", status **submitted**, showcase consent **given**, reviewer Kabir.
Contains a realistic design note with numbers and a verification step, so the mentor has something meaningful to review on first load.

**Why only one:** an empty mentor queue makes the product look broken; a full showcase makes the consent gate invisible. One submitted project is exactly the right amount of demo state.

---

## Events (2, both `published`, `is_demo = 1`)

| ID | Title | Type | When | Capacity | Purpose |
|---|---|---|---|---|---|
`e-solder` | Intro to Soldering & Breadboards | workshop | +9 days | 20 | Linked to Ohm's Law. Rohit is registered — so "registered" state and seat counts are visible immediately. |
`e-school` | School Robotics Outreach — Circuit Basics | school_visit | +21 days | 40 | The result of the pre-scheduled school request. Demonstrates the request→event link. |

---

## Schools & collaboration requests (2 + 2)

| ID | Reference | School | Status | Purpose |
|---|---|---|---|---|
`sr-1` | `AURA-SR-1001` | Sunrise Public School | **new** | Unassigned, no notes — the clean triage case a judge processes live |
`sr-2` | `AURA-SR-1002` | Riverside Academy | **scheduled** | Already has an owner (Devika), internal notes, and a linked event — shows a completed thread |

Both use `(demo)` in the school name and fictional contacts.

---

## Inventory (8 items)

| ID | Item | On hand | Allocated | Available | Why |
|---|---|---|---|---|---|
`i-1` | Arduino Uno R3 | 6 | 0 | 6 | Plausible electronics stock |
`i-2` | Solder wire (60/40) | 3 | 0 | 3 | Consumable; near its threshold |
`i-3` | Jumper wires (set of 40) | 9 | 0 | 9 | Workshop kit |
`i-4` | **Breadboard (830 tie-point)** | 12 | **4** | **8** | The seeded allocation — proves availability is derived, not stored |
`i-5` | Resistor assortment kit | 4 | 0 | 4 | Contains the 150 Ω used in the LED challenge |
`i-6` | LED assortment (5 mm) | 7 | 0 | 7 | Pairs with the challenge |
`i-7` | Digital multimeter | 2 | 0 | 2 | Condition `fair`, worn probe lead — exercises the condition field |
`i-8` | Soldering iron (25 W) | 5 | 0 | 5 | Workshop tool |

**Stock movements:** 8 `received` entries (one per item, "Opening demo stock").
**Allocations:** `ra-1` — 4 breadboards to Devika, linked to the school event and the scheduled request, issued 2 days ago, expected back in ~3 weeks.

---

## Mentor assignments (3)

`kabir → ananya` · `kabir → rohit` (electronics builds) · `devika → meera` (maths foundations).
**Why:** without these, the mentor queue cannot be both non-empty *and* scoped. They also let the mentor screen show a learner summary with a concrete "how to help" line driven by the latest attempt.

---

## Audit events (3, seeded)

`inventory.item_created` · `inventory.issued` · `school_request.status_changed`
**Why:** the admin audit strip should not be empty on first load, and these correspond to real seeded records so the log is truthful, not decorative.

---

## Learner activity (seeded deliberately sparse)

- **1 attempt:** Rohit, `q-ohm-1`, correct, confidence 4, two days ago.
- **0 tutor messages, 0 sessions, 0 goals, 0 bookmarks** for everyone else.

**Why so little:** Ananya must start at `not_started` so the first recommendation is `start` and the whole evidence ladder can be demonstrated live. Seeding her progress would destroy the demo's opening state.

---

## Reset semantics

`npm run db:reset` drops all 28 tables, re-runs the DDL, and reseeds with **fresh relative timestamps**. That means:

- events are always in the future,
- registrations always appear recent,
- expected returns are never stale.

Run it immediately before any demo or screenshot session.
