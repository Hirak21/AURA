# QA & Verification Matrix

**As of build v3.0 · 21 November 2026**

Everything in this file was executed against this repository. Where something was **not** verified, it says so — that is the point of the document.

> **Verification status (22 November 2026):** the automated-test, type-check, build, HTTP-route
> and authorization rows below were re-verified against the current build. The Playwright browser
> flows, responsive sweep and server-action mutation results in §§3–5 are **historical manual
> results** from build v3.0: the committed scripts in `scripts/qa/` used an obsolete `aura_uid`
> cookie and port 3001, so they cannot currently reproduce those numbers unattended. The current
> live build was instead verified with headless Chromium driving real `aura_session` cookies —
> role routing, mobile nav at 390/320 px, open-redirect rejection and the 17-route role matrix
> all passed. See `tasks/todo.md` for the current increment.

---

## 1. Summary

| Gate | Result |
|---|---|
Type check (`tsc --noEmit`) | **pass**, 0 errors |
Production build (`next build`) | **pass**, 26 routes |
Automated tests (`npm test`) | **63 / 63 pass** |
Browser flows (Playwright, Chromium) | **16 / 16 pass** |
Responsive sweep (13 routes × 5 widths) | **65 / 65 clean** — no overflow, no console errors, no page errors |
Server-action mutations exercised | **23 / 23 behaved correctly**, including 8 negative cases |
Routes returning 200 after auth | **17 / 17** |
Authorization (should-redirect) | **6 / 6 correct** |

---

## 2. Automated tests (63)

### `tests/grading.test.ts` (13)
- mcq: correct id accepted; wrong id rejected **and** correct label shown; empty response safe
- numeric: exact and decimal-equivalent accepted; unit suffix (`2 ohms`, `2Ω`) tolerated; wrong value rejected; tolerance boundary respected both ways
- short: case/punctuation normalised (`"The Current!"` ≡ `"current"`); trailing period does not break matching; unrelated answer rejected
- `parseNumeric`: decimal commas, leading `+`, junk → `null`

### `tests/adaptation.test.ts` (9)
- R8 fresh topic → `start`
- R1 prerequisite streak → `drill_prereq`, reason names the prerequisite
- R2 two misses → `more_practice` with streak evidence
- R5 correct + linked project → advance to the mini-project
- R4 correct but confidence 1 → **does not** advance
- R7 explained, never attempted → check-understanding prompt
- determinism: identical input ⇒ deeply equal output
- evidence-state ladder monotonic across all five states

### `tests/integrity.test.ts` (9, real schema + real seed, in-memory DB)
- seed availability subtracts open allocations (`i-4`: 12 on hand − 4 allocated = 8)
- issuing more than available fails **and leaves availability unchanged**
- issuing exactly the available quantity succeeds (availability → 0)
- return restores availability
- repeated issues never drive availability negative (`i-7`: 2 succeed, 3rd fails)
- duplicate registration blocked by the composite key
- capacity overflow blocked (`count ≥ capacity`)
- cancel → re-register works when capacity allows

### `tests/server-actions.test.ts` (3, structural)
- every `actions/*.ts` begins with `"use server"`
- **only async functions (and types) are exported** from `"use server"` modules
- no zod schema object is exported from an action module

> These three exist because the first constraint was violated during development: a schema exported from `actions/schools.ts` compiled and type-checked fine but threw at runtime with *"A 'use server' file can only export async functions"*. The test makes that class of bug impossible to reintroduce.

---

## 3. Browser flows (Playwright, production build)

| # | Flow | Result |
|---|---|---|
1 | Tutor returns a response labelled `Demo tutor · curated response` | pass |
2 | Example-first mode leads with the worked example block | pass |
3 | Check-your-understanding module appears after the explanation | pass |
4 | Follow-up question persists and renders in the thread | pass |
5 | Overview shows an explainable recommendation | pass |
6 | Overview exposes the evidence behind it | pass |
7 | Practice grades an MCQ with explanatory feedback | pass |
8 | Wrong MCQ answer reveals the hint **and** the expected answer | pass |
9 | Attempt persistence acknowledged in the UI | pass |
10 | "Show a hint" reveals progressively before answering | pass |
11 | Event registration changes state visibly | pass |
12 | Project draft saves with a visible confirmation | pass |
13 | Sign out returns to the public site | pass |
14 | All four MCQ options render and are selectable | pass |
15 | No page errors across any flow | pass |
16 | Zero console errors | pass |

---

## 4. Server-action mutation tests (23)

Exercised by mounting the real actions behind a temporary route handler, then deleting the route. Session identity supplied via the real cookie.

**Positive paths (15)**
public school request → reference returned · registration · tutor ask → validated response · attempt submit · project save+submit · mentor approve · author consent · admin showcase · inventory issue · inventory return · school `new→in_review` with internal note · `in_review→approved` · convert request→event · event appears publicly · public showcase lists the project after both gates

**Negative paths (8) — all rejected with a specific message**

| Attempt | Result |
|---|---|
Student reviews a project | `You do not have permission to perform this action.` |
Student issues inventory | `You do not have permission to perform this action.` |
Duplicate event registration | `You are already registered for this event.` |
Oversubscribe: issue 99 when 4 available | `Only 4 available. Cannot issue 99.` |
Double return | `This allocation was already returned.` |
Illegal lifecycle jump `new → scheduled` | `Cannot move a request from "new" to "scheduled".` |
Convert an already-converted request | `This request already has a linked event.` |
Invalid email on the public form | `contactEmail: Enter a valid email address.` (humanised, not raw JSON) |

**Discovered and fixed during this testing**
1. `availableFor` (a sync query) was exported from a `"use server"` module → moved to `lib/services/inventory.ts`.
2. Raw zod JSON was reaching the UI → `parseOrThrow` now produces `field: message` sentences.
3. Page-level permission failures threw 500s instead of redirecting → `requireRolePage` added; 6/6 authorization checks now return 307 with a correct destination.
4. Lucide icon components were passed from a server component into a client component → crashed every authenticated route; icons now resolve inside the client module.
5. Horizontal overflow on the admin overview at 360px → `minmax(0,1fr)` grid tracks + a global `min-width:0` safety net.

---

## 5. Responsive sweep

Routes: `/`, `/learn`, `/learn/t-ohm`, `/app`, `/app/tutor/t-ohm`, `/app/practice`, `/app/projects`, `/mentor`, `/admin`, `/admin/inventory`, `/admin/schools`, `/events`, `/collaborate`.
Widths: **360, 390, 768, 1024, 1440**.

Checked programmatically on every combination:
- document horizontal overflow ≤ 2px
- no element extends past the viewport (excluding intentional scroll containers)
- exactly one `h1`
- zero console errors, zero page errors, HTTP 200

**Result: 65/65 clean.**

---

## 6. Accessibility — verified vs. not verified

**Verified**
- One `h1` per page (automated).
- Visible `:focus-visible` outline on all interactive elements (style rule, spot-checked).
- Skip-to-content link present.
- All inputs programmatically labelled; errors use `role="alert"` + `aria-invalid`.
- Status conveyed by text; no colour-only signalling anywhere.
- Tables have captions; wide tables scroll inside `.table-wrap`.
- `prefers-reduced-motion` zeroes all animation/transition durations.
- Keyboard operation of the tutor, practice and forms (spot-checked manually).
- Contrast: ink/paper and strong/paper exceed AA; `mid` reserved for ≥12px metadata.

**Not verified — do not claim these**
- Automated axe/Lighthouse audit (not run in this environment).
- Screen-reader walkthrough (NVDA/VoiceOver).
- Cross-browser: **Chromium only**; Safari/Firefox untested.
- Zoom to 200% reflow (partially covered by the 360px sweep).
- Colour-blind simulation (mitigated by design: no colour-coded status).

---

## 7. Known limitations (truthful list)

1. **Demo Tutor only.** No live model, by decision. Curated content covers 7 topics; any other topic is refused honestly.
2. **Institutional SSO is not connected.** Production uses email + password (scrypt) with server-side sessions; `AURA_DEMO_MODE` is off by default in production.
3. **SQLite, single instance.** Production-safe on one VPS with WAL, `busy_timeout` and scheduled snapshots; not for multiple app servers. See `DATABASE.md`.
4. **Content authoring is read-only.** Edit `lib/db/seed.ts` and `npm run db:reset`.
5. **Mentor assignments and teams are read-only in the UI** (seeded). The assignment table and scoping logic are real.
6. **No file uploads.** Evidence is a validated URL, displayed but never fetched.
7. **No email.** Confirmations are on-screen only; nothing is dispatched.
8. **No CSV export, attendance marking, or maintenance workflow** (P1).
9. **No charts** — a deliberate product decision, not a missing feature.
10. **Demo data is small by design** (3 subjects, 7 topics, 10 questions, 2 events, 8 inventory items).
11. **Brand artwork is fixed.** The supplied dotted `A.U.R.A.` wordmark, symbol and app icons are used unmodified, never retyped.
12. **Rate limiting is in-process.** It protects a single Node instance; a multi-instance deployment needs a shared store.

---

## 8. Reset and re-verify (run this before any demo)

```bash
npm run db:reset        # wipe + reseed; timestamps are relative to now
npm test                # expect 63/63
npm run typecheck
npm run build           # expect success
npm start               # port 3000
```

Then walk the 12 acceptance criteria in `PRD.md §9` once. The seeded demo narrative expects:

- As **Ananya** (student): first visit — nothing studied, recommendation = start Ohm's Law.
- As **Kabir** (mentor): one submission already in the queue (Rohit's LED project).
- As **Jyoti** (admin): one pending review, one open school request, one scheduled request, one allocation out, zero showcase entries.
- The showcase page is **empty** until you complete the consent + approval flow. That is intentional and is the demo's best honesty moment.

### Production smoke test

```bash
npm run db:migrate
npm run user:create -- --email admin@example.edu --name "Admin" --role admin
npm run build
PORT=3100 AURA_DEMO_MODE=false AURA_COOKIE_SECURE=false npm start
curl -fsS http://127.0.0.1:3100/api/health          # {"status":"ok",...}
curl -sI http://127.0.0.1:3100/ | grep -i content-security-policy
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://127.0.0.1:3100/app   # 307 → /login?next=/app
```

Verify: demo sign-in is absent from `/login`, wrong passwords are rejected without setting a cookie, a student is redirected away from `/admin`, and the public form returns validation errors for bad input and a reference code for good input. Full runbook: `docs/DEPLOYMENT.md`.
