# agent.md — Implementation Contract

**Read this before writing any code in this repository.** It is the operating manual for a coding agent (or a human) extending AURA. It encodes the non-obvious constraints that this codebase depends on, the traps that have already caused real bugs here, and the definition of done.

Companion documents: `PRD.md` (what/why), `design.md` (how it looks), `ARCHITECTURE.md` (system boundaries), `ADAPTATION-RULES.md` (the adaptation spec), `QA.md` (the test matrix), `DEMO-SCRIPT.md` (the 4-minute pitch).

---

## 1. Current state — do not re-derive this

| Item | Value |
|---|---|
| Framework | Next.js **15.5** App Router, React 19, TypeScript strict |
| Styling | Tailwind 3.4 + a small global layer (`app/globals.css`) |
| Data | SQLite via `better-sqlite3` + Drizzle ORM (`lib/db/*`) |
| Validation | Zod, with schemas in `lib/domain/schemas.ts` |
| Icons | `lucide-react` |
| Auth | Email + password (scrypt) with server-side sessions (`lib/auth.ts`, `lib/security/password.ts`); opt-in demo picker (`AURA_DEMO_MODE`) |
| Tests | `node:test` via `tsx` — **29 tests, all passing** |
| Build | `npx next build` succeeds; 27 routes incl. `/api/health` |
| AI | **Demo Tutor only.** Deterministic, curated. No model, no key, no network call |
| Live preview | `npm run dev` → port 3000, binds `0.0.0.0` |

**Commands**

```bash
npm install          # once (Node 22+)
npm run db:init      # create + seed the demo database
npm run db:migrate   # schema only, no demo rows (production)
npm run db:reset     # wipe all tables and re-seed (use before every demo)
npm run db:backup    # consistent online snapshot
npm run db:maintain  # prune expired sessions + checkpoint WAL
npm run user:create -- --email you@gu.ac.in --name "Name" --role admin
npm run dev          # http://localhost:3000
npm run build        # production build
npm test             # 29 domain/integrity/structural tests
npm run typecheck    # tsc --noEmit
```

---

## 2. Layering law

```
app/**            Routing + server components. Composition only. No business rules.
components/**     Presentation. May hold UI state. Must not touch the database.
actions/**        Server mutations. "use server". Auth + validation + persistence + revalidate.
lib/domain/**     Pure functions and types. No imports from db/, actions/ or components/.
lib/services/**   Read queries. Composes db + domain. No mutations.
lib/db/**         Schema, client, migration, seed.
tests/**          Unit + integration + structural guards.
```

**Import direction is one-way:**

```
app → components, actions, services, domain
components → actions (client wrappers), domain
actions → services, domain, db
services → domain, db
domain → (nothing but zod)
```

Violating this (e.g. importing `db` into a component) breaks the build or, worse, silently ships database code to the browser. `lib/db/client.ts` is server-only by construction — never import it from a `"use client"` file.

---

## 3. The seven traps that have already bitten this codebase

These are real bugs that were found and fixed here. Do not reintroduce them.

### Trap 1 — `"use server"` files may export **only** async functions
Exporting a `const`, a zod schema, or a helper from an `actions/*.ts` file compiles and type-checks fine, then throws at **runtime**:
`A "use server" file can only export async functions, found object.`

- Schemas → `lib/domain/schemas.ts`
- Sync helpers → `lib/services/*` or `lib/domain/*`
- Constants/enums → `lib/domain/types.ts`

`tests/server-actions.test.ts` enforces this statically. Keep it passing.

### Trap 2 — Never pass a component (or any function) from a server component into a client component
This crashed every authenticated page:

```tsx
// ❌ Runtime: "Functions cannot be passed directly to Client Components"
const NAV = [{ icon: LayoutDashboard, ... }];       // server file
<SidebarNav items={NAV} />                           // client component
```

```tsx
// ✅ Resolve icons inside the client module; pass only serialisable props
<SidebarNav isStaff={isStaff} isAdmin={isAdmin} />
```

Rule: props crossing the server→client boundary must be JSON-serialisable (strings, numbers, booleans, plain objects/arrays, `null`).

### Trap 3 — `"use server"` modules can't use `redirect()` inside a try/catch
`redirect()` throws a special control-flow error. Catching it swallows the redirect. Call it at the top level of a server component or at the end of an action.

### Trap 4 — Page guards must redirect, action guards must throw
- In **server components** use `requireRolePage(...)` → redirects to `/login` or `/app?denied=1`.
- In **server actions** use `requireRole(...)` / `requireUser()` → throws `PermissionError`, so the client can display the message.

Using the throwing variant in a page produces a 500 for an honest permission denial. Using the redirecting variant in an action silently swallows failures.

### Trap 5 — Grid children default to `min-width: auto`
A long unbroken string (title, id, URL) in a `grid-cols-[1fr_...]` track pushes the page wider than the viewport. Every multi-column layout must use `minmax(0, 1fr)` tracks. `app/globals.css` also applies a global `main :where(div,section,…){ min-width: 0 }` safety net. The responsive audit at 360px catches regressions.

### Trap 6 — Raw Zod errors leaking to the UI
`schema.parse(x)` throws a JSON blob. Always use `parseOrThrow(schema, input)` from `lib/domain/schemas.ts`, which produces `field: message` sentences.

### Trap 7 — `.next` cache poisoning
Running `next build` while `next dev` holds the same `.next` directory produces `Cannot find module './NNN.js'` at runtime. If you see that: stop all servers, `rm -rf .next`, rebuild. Do not debug it as an application bug.

---

## 4. Adding a feature — the required sequence

1. **Domain first.** If the feature has a rule (grading, adaptation, availability, capacity, a state machine), write it as a pure function in `lib/domain/` **and a test in `tests/`**. Do not put rules in components or in prompt text.
2. **Types.** Add/extend enums and transition tables in `lib/domain/types.ts`.
3. **Persistence.** Extend `lib/db/schema.ts` **and** `lib/db/migrate.ts` (keep both in sync — the migrate file is the executable truth). Add seed rows in `lib/db/seed.ts` if the feature needs demo data.
4. **Read layer.** Add a query in `lib/services/`. Never query the DB from a component.
5. **Mutation.** Add an action in `actions/`:
   - `requireUser()` / `requireRole(...)` **first**
   - `parseOrThrow(schema, input)` **second**
   - business checks **third** (availability, capacity, transitions, ownership)
   - write inside a `db.transaction` when multiple rows/ledgers are involved
   - append to `auditEvents` for anything privileged
   - `revalidatePath(...)` for affected routes
6. **UI.** Server component for data, client component for interaction. Every async action needs loading, error, empty and success states.
7. **Honesty pass.** Does anything on this screen look live when it is demo data? Label it.
8. **Verify.** `npm test && npm run typecheck && npm run build`, then exercise the flow in a browser at 390px and 1440px.

---

## 5. Non-negotiable invariants

Any change that breaks one of these is wrong, even if it "works".

| Invariant | Where enforced | Test |
|---|---|---|
Duplicate event registration impossible | composite PK `(event_id, user_id)` | `tests/integrity.test.ts` |
Capacity overflow impossible | count inside the registration write | `tests/integrity.test.ts` |
Issue quantity ≤ availability | re-check inside the transaction | `tests/integrity.test.ts` + action |
Availability is derived, never stored | `lib/services/inventory.ts` | same |
Stock never negative; adjustment can't go below allocated | transaction in `actions/inventory.ts` | `tests/integrity.test.ts` |
Project status transitions legal only | `PROJECT_TRANSITIONS` | action |
School request lifecycle legal only | `REQUEST_TRANSITIONS` | action |
Showcase needs approval **and** consent | `decideShowcase` action | unit + action |
Only the owner edits a project | `saveProject` ownership check | action |
Grading is deterministic, never model-based | `lib/domain/grading.ts` | `tests/grading.test.ts` |
Recommendations are deterministic and carry evidence | `lib/domain/adaptation.ts` | `tests/adaptation.test.ts` |
No mastery percentage anywhere in the UI | code review + design rule | — |
AI status always labelled | `TutorPanel` header + composer footer | browser flow |

---

## 6. Content rules (these are product rules, not preferences)

1. **Never fabricate** a citation, source title, author, partner school, testimonial, impact number, or member. If data does not exist, say so.
2. **Demo data is always labelled** with `DemoBadge` on the surface where it appears.
3. **The tutor only answers from curated content.** If a topic has no entry in the Demo Tutor's `CONTENT` map, it returns a `warning` block admitting the gap. Do not "helpfully" invent an explanation.
4. **Never claim hardware verification.** The LED project is a written design note. The evidence link is displayed, never fetched, and labelled as such.
5. **No mastery language.** Forbidden: "Mastered", "Expert level", "Score", "Rank", "Ability". Allowed: "Correct — recorded", "Practising", "Building evidence", "Applied in a project".
6. **Fictional names only.** Current demo people use Assamese names and `@demo.aura.local` addresses. Never use a real student's name.

---

## 7. UI implementation rules

- **Design tokens only.** Use the Tailwind tokens (`ink`, `paper`, `mist`, `cloud`, `line`, `mid`, `strong`) — never raw hex in components, except inside the gold scale which must only appear under `.public-surface`.
- **Gold never leaves `.public-surface`.** If you need emphasis in the workspace, use weight, size, ink, or a border. Not colour.
- **Status is never coloured.** Use `<StatusBadge>` with a text label.
- **Buttons describe outcomes** and must implement all six states.
- **Every form** has: visible labels, inline errors with `role="alert"`, a disabled state while pending, and a visible success confirmation.
- **Every list** has an empty state that explains why it is empty.
- **Line length ≤ 68ch** for prose, especially tutor explanations.
- **Use the existing primitives** in `components/ui.tsx` (`Button`, `Input`, `Select`, `Textarea`, `Card`, `StatusBadge`, `DemoBadge`, `EvidenceMeter`, `EmptyState`, `InlineAlert`, `DataTable`). Do not invent parallel components.

---

## 8. Adding a live AI provider (the sanctioned upgrade path)

The architecture is ready for this; do not restructure the app to add it.

1. Create `lib/tutor/provider.ts` declaring `TutorProvider`:

```ts
interface TutorProvider {
  id: "demo" | "live";
  explain(req: DemoRequest): Promise<TutorResponse>;
}
```

2. `buildDemoTutorResponse` already satisfies the contract. Implement `liveProvider.explain()` to return the **same** `TutorResponse` shape and validate with `tutorResponseSchema.parse()` before returning.
3. Select the provider **server-side only**: `const provider = process.env.AURA_TUTOR_PROVIDER === "live" ? live : demo;`
4. Read the key from a server-only env var. **Never** reference it in a client component or a `NEXT_PUBLIC_*` variable.
5. Set `provider: "live"` in the response and change the UI label from `Demo tutor · curated response` to the provider name. The label must reflect reality.
6. Send the minimum context: topic title/summary, outcomes, prerequisites, level, mode, and the current question. **Never** send profile, email, project records, school request data, or other learners' data.
7. Keep all UI unchanged — that is the point of the typed contract.

---

## 9. Definition of done

A change is complete only when **all** of the following are true:

- [ ] `npm test` → all pass (add tests for any new rule).
- [ ] `npm run typecheck` → clean.
- [ ] `npm run build` → succeeds.
- [ ] The affected journey works end-to-end in a browser (not just a 200 status).
- [ ] No horizontal overflow at 360, 390, 768, 1024, 1440.
- [ ] No console errors or page errors.
- [ ] Keyboard-only path works; focus is visible.
- [ ] No new dependencies unless the existing stack cannot do the job.
- [ ] Any demo/sample content is labelled.
- [ ] No dead buttons, no `href="#"`, no "coming soon" in a P0 path.
- [ ] `docs/` updated if behaviour, scope or rules changed.

---

## 10. Where to extend next (highest value, in order)

1. **Curator content authoring** (P1): topic/question CRUD with draft→reviewed status, gated by `curator`. Schema already supports it; keep the Demo Tutor's content map in sync or generate it from the DB.
2. **Spaced revision** (P1): a deterministic scheduler over `practice_attempts`, exposing "due for revision" on the overview. Domain function + test first.
3. **Attendance + CSV export** (P1): `attendedAt` already exists on registrations; add an organiser action and a streaming CSV route.
4. **Live AI provider** per §8.
5. **Team management** (P1): `Team`/`TeamMember` tables plus lead-scoped invitations.
