# Decision Log

Every entry records a decision that constrains the build, the alternatives that were rejected, and what would change our mind. Written so a future contributor does not re-litigate settled questions without new information.

Format: **D-nn · Decision** — Context → Options → Chosen → Consequences → Revisit if.

---

## D-01 · Two connected layers, one product
**Context.** The brief covers both a student learning tool and an association operating system. Treating them as two products splits the identity, the data model, and the demo narrative.
**Options.** (a) Learning-only; (b) Core OS-only; (c) two separate apps; (d) one product, two layers, shared records.
**Chosen: (d).**
**Consequences.** Every Core OS screen must justify itself by enabling learning. The demo must show the *link* (topic → project → workshop → kit), not just adjacent screens. Admin metrics must be computed from learning records.
**Revisit if.** The pilot shows learners never touch Core OS surfaces.

---

## D-02 · Monochrome product, gold only on public surfaces
**Context.** The design doc demanded strict monochrome; the supplied brand material is black/white used on a dark, gold-accented surface. Both are true of the brand.
**Options.** (a) Strict monochrome everywhere; (b) gold everywhere as the identity; (c) monochrome product + scoped gold marketing.
**Chosen: (c).** Gold lives behind a `.public-surface` class applied by exactly two layouts.
**Consequences.** Gold can never encode state, never appears in a chart, never appears in a workspace. Enforceable by grep for `gold-` outside `.public-surface`. Marketing keeps brand warmth; the workspace stays instrument-like.
**Revisit if.** Brand stewardship supplies an approved gold usage extending to product surfaces.

---

## D-03 · Demo Tutor only — no live model
**Context.** v2.0 allowed either. Shipping "maybe live AI" produces dishonest UI and unstable demos.
**Options.** (a) Live provider + fallback; (b) demo-only; (c) no tutor at all.
**Chosen: (b).**
**Consequences.** The tutor is deterministic, offline, auditable, and instant. Every response is labelled. The typed `TutorResponse` contract is the real deliverable — it is what makes a live provider a drop-in later. We sacrifice the "powered by a model" headline and gain the ability to claim nothing false.
**Revisit if.** A key is available *and* the provider returns the validated schema *and* the UI label can be switched truthfully.

---

## D-04 · Deterministic grading, never model grading
**Context.** The PRD forbids implying measurement of ability.
**Chosen.** mcq / numeric / short graded by pure functions with tolerance and normalisation. No model is ever in the grading path.
**Consequences.** Grading is testable (13 tests), instant, free, explainable, and cannot drift. We give up subjective answer evaluation for free text — accepted, because the product claims evidence, not assessment.
**Revisit if.** A validated, human-reviewed rubric-based grader is designed with educators.

---

## D-05 · Evidence states instead of a mastery percentage
**Context.** Progress bars are the default ed-tech idiom and are also the most dishonest element in it.
**Options.** (a) Percentage; (b) score; (c) four named evidence states; (d) no progress display.
**Chosen: (c).**
**Consequences.** Progress is `explored → practised → built → applied`, each backed by a record, rendered as four segments **plus literal text**. No percentage exists anywhere in the codebase. The word "mastered" is banned in UI copy.
**Revisit if.** Never for the prototype. A validated model is explicitly P2 and requires educational validation first.

---

## D-06 · Six ordered adaptation rules, each self-explaining
**Context.** "Adaptive" must be a mechanism, not a claim.
**Chosen.** R1–R8 in priority order (`docs/ADAPTATION-RULES.md`), each returning a label, a reason in plain language, and 1–4 evidence strings.
**Consequences.** Every recommendation is inspectable and arguable. Determinism is unit-tested. Any new rule needs a test *and* a worked example in the docs.
**Revisit if.** Pilot data shows which rules actually change behaviour; rules that do not help should be deleted, not tuned.

---

## D-07 · Server actions as the only mutation boundary
**Context.** Next.js allows route handlers, server actions, and direct DB calls from components.
**Chosen.** All mutations in `actions/*` with a fixed sequence: auth → validate → domain invariant → transaction → audit → revalidate.
**Consequences.** One grep proves where writes happen. Authorization cannot be forgotten in a new screen because there is no other place to write. The cost is boilerplate per action — accepted for auditability.
**Revisit if.** A public, third-party-facing API is required; then handlers wrap the same service functions.

---

## D-08 · SQLite for the demo, Postgres for production
**Context.** The architecture doc suggested Postgres but allowed existing stores.
**Chosen.** SQLite via `better-sqlite3` with WAL and `foreign_keys = ON`. Drizzle keeps the schema portable.
**Consequences.** Zero-setup, genuinely transactional (the inventory and capacity guarantees are real), single-file reset. Not multi-instance. Service code is dialect-neutral; only the client factory changes for Postgres.
**Revisit if.** Concurrency or multi-tenancy enters scope.

---

## D-09 · Derived availability, immutable movement ledger
**Context.** The naive inventory model stores `available` as an editable number, which silently drifts.
**Chosen.** `available = on_hand − Σ(open allocations)`, computed on read; all changes append to `stock_movements`; issues and returns are rows in `resource_allocations` with timestamps and conditions.
**Consequences.** Drift is impossible. Negative stock is impossible. Damaged returns are written off rather than restored. Every test asserts arithmetic, not intention.
**Revisit if.** Allocation volume makes the read expensive — then maintain a transactionally-updated projection *while keeping the ledger authoritative*.

---

## D-10 · Two gates for public showcase
**Context.** Making learner work public has consent and quality dimensions.
**Chosen.** Requires (1) mentor/reviewer approval and (2) the author's explicit consent, then (3) an admin publish action. Removing it returns the project to `approved`.
**Consequences.** The showcase is empty on a fresh database, and says so. The empty state is treated as a feature. Any change to this weakens the strongest privacy story in the product.
**Revisit if.** Never without an institutional data-protection review.

---

## D-11 · Real password sessions, opt-in demo identity
**Context.** The original prototype used a cookie that simply named the user. That is not acceptable for an internet-facing deployment.
**Chosen.** Production uses email + password (scrypt), opaque 256-bit session tokens stored as SHA-256 digests, server-side expiry/revocation and login rate limits. `AURA_DEMO_MODE` remains an explicit opt-in for evaluation and refuses server-side when disabled; **every** mutation still checks role, ownership and assignment.
**Consequences.** Real accounts are created with `npm run user:create`. Demo accounts exist only where demo mode is deliberately enabled. Swapping to an institutional IdP changes the session source only — not one rule.
**Revisit if.** The university IdP becomes available, or AURA runs as more than one instance (shared session store needed).

---

## D-12 · Honesty as a UI requirement
**Context.** Demo products drift into implying real partnerships, real AI, real metrics.
**Chosen.** `DemoBadge` on every sample record; provider labels on every tutor response; the showcase empty state explicitly refuses to fake content; the tutor refuses topics it has no curated content for; admin tiles state that numbers are computed from live tables.
**Consequences.** The product looks *less* impressive at a glance and is far more defensible under questioning. This is treated as a competitive advantage, not a cost.
**Revisit if.** Never. Honesty is a product principle, not a phase.

---

## D-13 · No charts, no streaks, no gamification
**Context.** Every learning product has progress bars and streaks; both imply measurement we refuse to do.
**Chosen.** No charts, no XP, no badges, no confetti. Counts with stated meanings, and four evidence steps.
**Consequences.** Some judges will ask "where are the analytics?" — the answer is that a progress chart in a product that does not measure ability is a lie drawn in pixels. Admin metrics remain (they describe operations, not learners).
**Revisit if.** A validated instrument with published reliability exists.

---

## D-14 · Constraints enforced in the database, not the UI
**Context.** Hiding a button is not a control.
**Chosen.** Composite primary key for registrations; transaction-scoped re-checks for capacity and stock; explicit transition tables; ownership checks in actions.
**Consequences.** The UI can be bypassed entirely and the invariants still hold — which is exactly what `tests/integrity.test.ts` demonstrates against a real schema.
**Revisit if.** A read replica is introduced that could serve stale counts to a client-side check; even then the write path remains authoritative.

---

## D-15 · Structural tests for framework traps
**Context.** Two framework bugs in this build compiled and type-checked cleanly but failed at runtime (a non-async export from `"use server"`; a component passed across the RSC boundary).
**Chosen.** Encode the rules as tests (`tests/server-actions.test.ts`) and as a documented trap list (`../agent.md §3`).
**Consequences.** The class of bug cannot silently return. Cost: three extra tests and a page of documentation.
**Revisit if.** The framework adds compile-time enforcement.

---

## D-16 · Official brand artwork, used unmodified
**Context.** The brand guidelines forbid recreating the dotted `A.U.R.A.` artwork with a font. The AURA Authentic Brand Kit v1.1 supplies the original SVG outlines, symbol and app icons.
**Chosen.** Ship the supplied files under `public/brand/` and render them with plain `<img>` elements (`Wordmark`, `CoreLogo`, `Symbol`, `FullLockup`). Black/white variants only; the descriptor is “Automation & Robotics Association”.
**Consequences.** The identity is exact, scalable and guideline-compliant. No font is ever substituted for the wordmark.
**Revisit if.** A newer brand-kit release supersedes v1.1.
