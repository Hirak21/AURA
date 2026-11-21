# AURA — System Architecture

**Version 3.0 · modular monolith, single deployable**
Refines `03-system-architecture.md` against the stack actually chosen and built.

---

## 1. Decision

A **modular monolith**: one Next.js application serving three surfaces (public, student workspace, staff workspace) over one SQLite database, with domain rules in pure TypeScript modules.

**Why not microservices:** the prototype has one team, one deploy target, and a data model whose value comes from joins (topic → attempt → project → event → allocation). Splitting it would add operational cost and remove the transactional integrity that §7 depends on.

**Why SQLite for this deployment:** zero-configuration, file-based, and genuinely transactional — the inventory and capacity guarantees are real `BEGIN…COMMIT` semantics, not simulation. On a single VPS with one Node process, WAL mode and scheduled snapshots, it is a production database for this workload. Postgres is the path when AURA needs multiple app servers or managed HA; see `docs/DATABASE.md`.

---

## 2. Runtime topology

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router)                    node runtime     │
│                                                              │
│  Server Components ──► lib/services ──► Drizzle ──► SQLite    │
│         │                                    (WAL, FK=ON)    │
│         │                    ▲                               │
│  Client Components ──► Server Actions ──┘                    │
│         (RSC payload)      (auth → validate → tx)            │
│                                                              │
│  lib/domain  (pure: grading, adaptation, transitions)        │
│  lib/tutor/demo-tutor.ts  (deterministic content provider)   │
└──────────────────────────────────────────────────────────────┘
```

- No API route handlers are required for the product; server actions are the mutation boundary. (A `/api` layer would be a thin wrapper and is deliberately absent to avoid two sources of truth.)
- No background jobs, no queue, no cache layer, no third-party calls. The build makes **zero outbound network requests at runtime**.

---

## 3. Module map

| Module | Files | Owns | Must not |
|---|---|---|---|
Identity & session | `lib/auth.ts`, `lib/security/password.ts`, `actions/session.ts` | server-side sessions, scrypt passwords, role resolution, `requireUser`/`requireRole`/`requireRolePage` | contain business rules |
Domain | `lib/domain/{types,grading,adaptation,schemas}.ts` | enums, transition tables, grading, recommendation rules, zod schemas | import db, services, React |
Catalogue | `lib/services/catalog.ts` | subjects, topics, prerequisites, resources, questions, attempts, topic states | mutate |
Recommendation | `lib/services/recommendations.ts` | target selection + rule invocation | mutate |
Inventory service | `lib/services/inventory.ts` | derived availability | mutate |
Admin metrics | `lib/services/admin-metrics.ts` | computed indicators, audit read, open allocations | mutate |
Persistence | `lib/db/{schema,migrate,client,seed}.ts` | Drizzle models, DDL, connection, demo data | contain product logic |
Learning actions | `actions/learning.ts` | tutor ask, attempt submit, level/goal/bookmark | — |
Core OS actions | `actions/coreos.ts` | project save/submit/review/consent/showcase, events, registration | — |
Schools actions | `actions/schools.ts` | public request, lifecycle, conversion | — |
Inventory actions | `actions/inventory.ts` | issue, return, adjust (transactional) | — |
Tutor provider | `lib/tutor/demo-tutor.ts` | curated content → `TutorResponse` | read the database |

---

## 4. Data model

23 tables. Executable DDL: `lib/db/migrate.ts`. Drizzle mirror: `lib/db/schema.ts`.

### Identity
```sql
users(id PK, display_name, email UNIQUE, status, preferred_level, learning_goal, is_demo, created_at)
user_roles(user_id FK, role, PK(user_id, role))        -- many roles per person
```

### Learning catalogue
```sql
subjects(id PK, title, description, sort_order, published)
topics(id PK, subject_id FK, title, summary, difficulty, outcomes JSON, published, sort_order)
topic_prerequisites(topic_id FK, prerequisite_topic_id FK, PK(topic_id, prerequisite_topic_id))
resources(id PK, topic_id FK, title, type, author, url, level, review_status, is_demo, reviewed_at)
practice_questions(id PK, topic_id FK, type, prompt, options_json, answer,
                   accepted_answers_json, explanation, hint, difficulty, review_status)
```

### Learning activity
```sql
tutor_sessions(user_id FK, topic_id FK, first_opened_at, last_opened_at, PK(user_id, topic_id))
tutor_messages(id PK, user_id FK, topic_id FK, role, level, mode, content JSON, helpful, created_at)
practice_attempts(id PK, user_id FK, question_id FK, topic_id FK, response,
                  is_correct, feedback, confidence, created_at)
learning_goals(id PK, user_id FK, text, created_at)
bookmarks(user_id FK, topic_id FK, created_at, PK(user_id, topic_id))
```

### Application
```sql
challenges(id PK, topic_id FK, title, summary, objective, required_concepts_json,
           estimated_hours, published)
projects(id PK, challenge_id FK, author_id FK, title, draft, evidence_url, status,
         reviewer_id FK, consent_to_showcase, created_at, updated_at, submitted_at)
project_reviews(id PK, project_id FK, reviewer_id FK, decision, feedback, created_at)
```

### Core OS
```sql
events(id PK, title, summary, type, starts_at, ends_at, venue, mode, capacity,
       registration_opens_at, registration_closes_at, topic_id FK, status, is_demo)
event_registrations(id, event_id FK, user_id FK, status, created_at, attended_at,
                    PK(event_id, user_id))            -- duplicate impossible
schools(id PK, name, location)
collaboration_requests(id PK, reference UNIQUE, school_name, location, contact_name,
                       contact_email, activity_type, grade_range, expected_participants,
                       preferred_dates, facilities, message, status, owner_id FK,
                       internal_notes, linked_event_id FK, created_at, updated_at)
inventory_items(id PK, name, category, identifier UNIQUE, unit, quantity_on_hand,
                condition, location, low_stock_threshold, archived, notes)
stock_movements(id PK, item_id FK, kind, quantity_delta, actor_id FK, reason, created_at)
resource_allocations(id PK, item_id FK, quantity, recipient_id FK, recipient_label,
                     linked_event_id FK, linked_collaboration_id FK, linked_project_id FK,
                     issued_at, expected_return_at, returned_at, condition_on_issue,
                     condition_on_return, issued_by_id FK, returned_by_id FK, notes)
mentor_assignments(id PK, mentor_id FK, student_id FK, scope, status, created_at)
audit_events(id PK, actor_id, action, entity_type, entity_id, metadata_json, created_at)
```

### Indexes
`practice_questions(topic_id)`, `practice_attempts(user_id, topic_id)`, `tutor_messages(user_id, topic_id)`, `projects(author_id)`, `stock_movements(item_id)`, `resource_allocations(item_id)`, `audit_events(created_at)`.

---

## 5. Request lifecycle (a mutation)

```
Client component
  └─ onClick → server action (RSC boundary)
       1. requireRole(...)            → throws PermissionError (never redirects)
       2. parseOrThrow(schema, input) → human-readable error
       3. domain invariants           → capacity / availability / transition / ownership
       4. db.transaction(...)         → all writes + audit event, atomically
       5. revalidatePath(...)         → server components re-render
       6. return a plain serialisable result
  └─ UI: optimistic local state, then the revalidated server state
```

Errors surface as plain strings the UI renders inside `FieldError`/`InlineAlert`. No stack traces, no Zod JSON.

---

## 6. AI boundary

**This build contains no model call.** The boundary exists so one can be added without touching the UI.

```
TutorPanel (client)
   └─ askTutor({topicId, level, mode, question})          [actions/learning.ts]
        1. requireUser()
        2. load topic + prerequisites + reviewed resources  [lib/services/catalog]
        3. buildDemoTutorResponse({...})                     [lib/tutor/demo-tutor]
             └─ returns tutorResponseSchema.parse(...)  ← validated here
        4. persist user turn + tutor turn, upsert session
        5. revalidatePath
   └─ renders typed blocks (text|steps|formula|example|warning|question)
```

Why the contract matters: the UI never parses prose, never string-splits, and a live provider becomes a drop-in behind the same interface (see `../agent.md §8`).

**Data minimisation (already enforced):** the provider receives only topic id/title/summary, prerequisite titles, resources explicitly marked `reviewed`, the learner's chosen level/mode, and the question text. It never sees email, profile, other learners, projects, or school requests.

---

## 7. Transactional integrity

### Inventory
`availability = quantity_on_hand − Σ(quantity of allocations where returned_at IS NULL)`

`issueItem` runs a transaction that **re-reads** the item and open allocations inside the transaction, then compares. Two concurrent requests cannot both pass, because SQLite serialises writers. `adjustStock` additionally refuses an on-hand value below the allocated quantity. Damaged returns decrement on-hand and write a `damaged` movement — they are not silently restored.

### Event capacity
`registerForEvent` re-reads the registered count inside the same write path, validates the registration window, and relies on the composite primary key for duplicate prevention. Both paths are covered by `tests/integrity.test.ts` against an in-memory database.

### Project and request state machines
`PROJECT_TRANSITIONS` and `REQUEST_TRANSITIONS` in `lib/domain/types.ts` are the only source of legal transitions. Actions reject anything else with the attempted transition named in the message.

---

## 8. Security & privacy posture (honest version)

**What is real:** server-side authorization on every mutation; ownership and assignment checks; validated inputs; scrypt password hashing (OWASP baseline parameters); opaque 256-bit session tokens stored only as SHA-256 digests; httpOnly, `sameSite=lax`, `Secure` cookies in production; session expiry, revocation on password change, and last-seen touch throttling; per-IP and per-account login rate limits; per-IP rate limit on the public collaboration form; CSP and security headers; no secrets in the bundle; no third-party data flows; audit trail for privileged actions; learner records never publicly exposed without two independent gates (approval + consent).

**Demo-only and opt-in:** `AURA_DEMO_MODE` enables fictional identity switching. It is off by default in production and the action refuses to mint a session when disabled. Seeded records remain labelled as demo.

**Remaining production work:**
1. Institutional SSO (OIDC) behind the existing session layer — no authorization rule changes.
2. CAPTCHA or equivalent on the public form if abuse is observed.
3. Data-retention and minors'-data policy reviewed with the institution.
4. External uptime monitoring and a tested backup/restore drill (`docs/DEPLOYMENT.md`).

---

## 9. Testing strategy

| Layer | What | How |
|---|---|---|
Domain units | grading (mcq/numeric/short, tolerance, normalisation), adaptation rules R1–R7, evidence-state derivation | `tests/grading.test.ts`, `tests/adaptation.test.ts` |
Data integrity | duplicate registration, capacity, availability arithmetic, non-negative stock, return semantics | `tests/integrity.test.ts` (in-memory SQLite, real schema + real seed) |
Structural | `"use server"` export legality, schema-in-actions ban | `tests/server-actions.test.ts` |
Action/browser | tutor → check → recommendation → project → review → consent → showcase; school lifecycle; inventory issue/return | Playwright flows, plus server actions driven directly |
Responsive/a11y | 13 routes × 5 widths; overflow, h1 count, console errors | Playwright audit script |

**Not covered (known gaps):** automated contrast testing, screen-reader walkthrough, load testing, and cross-browser (Chromium only).

---

## 10. Deployment

**Production (as built):** one systemd service, one Node process, SQLite on local disk behind Nginx/Caddy with TLS.

```bash
npm ci
npm run db:migrate                 # schema only, no demo rows
npm run user:create -- --email you@gu.ac.in --name "Your Name" --role admin
npm run build
npm start                          # 127.0.0.1:3000 behind the proxy
```

`AURA_DB_PATH` should point outside the release directory; `AURA_DB_DIR` defaults to `./data`. The full runbook — service account `aagomon`, systemd unit, Nginx/TLS, backups, update and rollback — is in [`DEPLOYMENT.md`](DEPLOYMENT.md). SQLite operating rules and the Postgres path are in [`DATABASE.md`](DATABASE.md).

**Preview hosting:** set `HOST=0.0.0.0` and `AURA_PUBLIC_URL` to the preview origin. The app serves relative URLs only, so it works behind a proxy without origin configuration. No `localhost` calls exist in browser code.

**Scale path:** multiple app instances require Postgres (and a shared rate-limit/session store); object storage for evidence files; the AI provider behind a server-only key; observability on action errors. Because all mutations go through `actions/*`, adding tracing is a single middleware point.
