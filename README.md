# AURA — Learning & Innovation OS

**An adaptive learning workspace where a learner moves from "I don't get this" to "I built something with it."**

AURA is one product with two connected layers:

- **AURA Learning** *(primary)* — explain a concept at the learner's level and in their preferred style → check understanding with real feedback → recommend the next step **with the evidence behind it** → connect it to a project a mentor reviews.
- **AURA Core OS** *(enabling)* — the people, workshops, projects, school partnerships and equipment that make applying that learning possible.

Built for the **education** problem statement: *students struggle to understand complex topics and to find resources that match their level.* It is the learning and innovation workspace of the **Automation & Robotics Association, Guwahati University**.

> **Data notice.** Seeded people, schools, events and inventory are fictional and labelled as demo data throughout the app. There is **no live AI model connected** — the tutor is a deterministic, curated Demo Tutor and says so on every response. Authentication is real (scrypt password hashing + server-side sessions); the demo identity picker is opt-in via `AURA_DEMO_MODE` and is off by default in production.

---

## Quick start

```bash
npm install
npm run db:init       # create + seed the demo database
npm run dev           # http://localhost:3000
```

Then open `/login` and sign in with a demo account. The seeded demo password is `aura-demo-2026` (change `AURA_SEED_PASSWORD` before running `db:init` if the instance is public).

```bash
npm test              # 29 tests: grading, adaptation, integrity, structural guards
npm run typecheck
npm run build && npm start
npm run db:reset      # wipe + reseed (do this before a demo; seed dates are relative to now)
npm run user:create -- --email you@gu.ac.in --name "Your Name" --role admin
npm run db:backup     # consistent online snapshot
```

**Requirements:** Node 22+ (better-sqlite3 13), npm. No external services, no API keys, no network calls at runtime.

For a production deployment see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** and the database guidance in **[docs/DATABASE.md](docs/DATABASE.md)**.

---

## Demo accounts

All demo accounts share the seeded password (`aura-demo-2026` by default). They are fictional and are only available when `AURA_DEMO_MODE` is enabled.

| Account | Role | Use it to |
|---|---|---|
**Ananya Baruah** | Student | Take the whole learning journey from zero |
**Kabir Ahmed** | Mentor / Reviewer | Review submitted projects, see assigned learners |
**Jyoti Nath** | Admin / Curator | Overview metrics, showcase decisions, content view, members |
**Devika Sharma** | School Liaison / Organiser | Process school requests, create events, convert a request to a workshop |
**Ishaan Gogoi** | Inventory Custodian | Issue, return and adjust equipment |

---

## The journey the product is built around

```
Discover → Understand → Practice → Reflect → Apply → Demonstrate → Improve
```

1. **Discover** a topic in the Learning Hub (`/learn`).
2. **Understand** it in the tutor (`/app/tutor/...`) at Beginner/Intermediate/Advanced, in Simple / Step-by-step / Example-first / Hints mode.
3. **Practice** with MCQ, numeric and short-answer checks that explain *why* (`/app/practice`).
4. **Reflect** — confidence is optional and only ever used to serve the learner.
5. **Adapt** — a deterministic recommendation states its own evidence on `/app`.
6. **Apply** in a linked mini-project; a mentor reviews and gives structured feedback.
7. **Demonstrate** — with mentor approval **and** the author's explicit consent, work appears in the public showcase.

---

## What is actually implemented

### AURA Learning
- Topic discovery across 3 subjects / 7 topics, with prerequisites as a real relation
- Tutor with level + four explanation modes; mode changes the **structure** of the response
- Typed, schema-validated tutor response rendered as blocks (steps, formula, example, question, warning)
- Persisted sessions and follow-ups; helpful / not-helpful feedback
- Three question types, deterministic grading, hint-before-answer, confidence capture
- Six-rule adaptive recommendation with visible evidence, and learner override
- Evidence states (`explored → practised → built → applied`) instead of a mastery percentage
- Mini-project draft → submit → mentor review → consent → showcase

### AURA Core OS
- Admin overview with eight **computed** indicators, each linking to its records
- Event publishing, capacity-safe and duplicate-safe registration
- Project review queue with scoping, plus two-gate showcase control
- School collaboration intake with reference codes, a fixed lifecycle, owner assignment, and **internal notes visibly separated** from requester-facing fields
- Approved request → workshop conversion (single-use, audited)
- Inventory with **derived** availability, transactional issue/return, damaged write-off, and an append-only movement ledger
- Mentor assignments with scope, learner attempt summaries, and audit history

---

## Architecture (one page)

| Layer | Location | Rule |
|---|---|---|
Routing & server components | `app/**` | composition only |
Presentation | `components/**` | UI state only, no DB access |
Mutations | `actions/**` | `"use server"` — auth → validate → transaction → revalidate |
Read queries | `lib/services/**` | no mutations |
Pure rules | `lib/domain/**` | no imports from db/actions/components |
Persistence | `lib/db/**` | Drizzle + SQLite |
Tutor content | `lib/tutor/demo-tutor.ts` | deterministic, curated, no network |

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind · SQLite via `better-sqlite3` + Drizzle · Zod · lucide-react · Inter & JetBrains Mono (self-hosted).

Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Documentation

| File | Contents |
|---|---|
[`docs/PRD.md`](docs/PRD.md) | Product requirements v3.0 — scope, decisions, acceptance criteria, honest boundaries |
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | **VPS deployment** — `aagomon` service account, systemd, Nginx, TLS, backups, updates |
[`docs/DATABASE.md`](docs/DATABASE.md) | **SQLite in production** — operating rules, backups, capacity, Postgres migration path |
[`agent.md`](agent.md) | **Implementation contract** — layering law, 7 traps already hit, definition of done |
[`design.md`](design.md) | Design system — monochrome + scoped gold, components, screen guidance, writing style |
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, data model, transactions, security posture, deployment |
[`docs/ADAPTATION-RULES.md`](docs/ADAPTATION-RULES.md) | The recommendation rules, verbatim, with worked examples |
[`docs/QA.md`](docs/QA.md) | Verification matrix — what passed, what was **not** tested, known limitations |
[`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) | Click-by-click 4-minute judge demo, plus Q&A handling |
[`docs/SEED-DATA.md`](docs/SEED-DATA.md) | Every seeded record and why it exists |
[`docs/DECISIONS.md`](docs/DECISIONS.md) | Decision log with rejected alternatives |

---

## Project structure

```
app/
  (public)/            landing, learn, events, projects, about
  api/health/          liveness + database readiness probe
  collaborate/          public school request form
  login/                password sign-in (demo picker only when enabled)
  app/                  student workspace (overview, tutor, practice, projects, events, profile)
  mentor/               assigned reviews and learners
  admin/                overview, learning, events, projects, schools, inventory, members
actions/                server actions (learning, coreos, schools, inventory, session)
components/             UI primitives, feature components, official brand artwork
lib/domain/             types, grading, adaptation, schemas  ← pure, tested
lib/services/           read queries and derived metrics
lib/db/                 schema, migration, seed, client
lib/security/           scrypt password + session-token hashing
lib/tutor/              Demo Tutor provider
tests/                  unit, integration and structural tests
docs/                   the documentation set above
scripts/                init/migrate/reset/backup/maintain/create-user
public/brand/           supplied SVG logos and social image (unmodified)
data/aura.db            the database (generated; not source)
```

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
`NODE_ENV` | — | `production` on a deployed server |
`HOST` / `PORT` | `127.0.0.1` / `3000` | Listen address behind the reverse proxy |
`AURA_PUBLIC_URL` | `http://localhost:3000` | Canonical origin for metadata and OG images |
`AURA_DB_PATH` | `./data/aura.db` | Absolute database path (keep outside the release dir) |
`AURA_DB_DIR` | `./data` | Database directory when `AURA_DB_PATH` is unset |
`AURA_BACKUP_DIR` | `<db dir>/backups` | Snapshot destination |
`AURA_BACKUP_KEEP` | `14` | Number of snapshots retained |
`AURA_DEMO_MODE` | dev: on, prod: off | Enables the fictional demo identity picker |
`AURA_COOKIE_SECURE` | prod: on | `Secure` flag on the session cookie |
`AURA_TRUST_PROXY` | `true` | Trust `X-Forwarded-For` from the reverse proxy |
`AURA_SEED_PASSWORD` | `aura-demo-2026` | Password for demo accounts created by `db:init` |
`AURA_NEW_USER_PASSWORD` | — | Optional password for `user:create` |

Copy [`.env.example`](.env.example) to `.env.production` and `chmod 600` it. No third-party API keys are required.

---

## Limitations

1. **No live AI.** The tutor is deterministic and curated for 7 topics; other topics are refused honestly rather than improvised.
2. **No institutional SSO yet.** Email + password with scrypt hashing and server-side sessions is the production path; an IdP can be added without changing authorization rules.
3. **SQLite, single instance.** Production-safe on one VPS with WAL and backups, but not for multiple app servers — see `docs/DATABASE.md`.
4. **Content authoring is read-only** in the UI — edit `lib/db/seed.ts` and run `npm run db:reset`.
5. **Mentor assignments are seeded**, not editable in the UI.
6. **No file uploads** — evidence is a validated URL, shown but never fetched.
7. **No email is sent**; confirmations are on-screen only.
8. **No CSV export, attendance marking, or maintenance workflow** (P1).
9. **No charts anywhere** — a deliberate product decision, not an omission.
10. **Chromium-only testing.** No Safari/Firefox or screen-reader verification was performed.
11. **Brand artwork is fixed.** The supplied dotted `A.U.R.A.` wordmark, symbol and app icons are used unmodified; they are never retyped with a font.

---

## Next three highest-value steps

1. **Curator authoring** — topic/question CRUD with draft→reviewed status, gated by the `curator` role, with the Demo Tutor content generated from the database so the two cannot drift.
2. **Spaced revision** — a deterministic scheduler over `practice_attempts`, surfaced as "due for revision" with the same evidence-transparency the rest of the system has.
3. **Institutional SSO** — connect the university identity provider behind the existing session layer, then run a small pilot to establish baseline measures (see `docs/PRD.md §11`).

---

## Credits

Product, design and implementation for AURA. Brand artwork: supplied AURA Authentic Brand Kit v1.1 (Automation & Robotics Association, Guwahati University), used unmodified. Typefaces: Inter, JetBrains Mono (SIL Open Font License). Icons: Lucide (ISC).
# AURA
# AURA
