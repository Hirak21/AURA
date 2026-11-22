# QA scripts

These drive the **real app in a browser**. They are kept out of `npm test` because they need a running server and Chromium.

## Setup (once)

```bash
npm i -D playwright && npx playwright install chromium
```

## Running

```bash
npm run build && npm start                               # serves on :3000 by default
export AURA_QA_SESSION='<a valid aura_session token>'   # never commit this
node scripts/qa/responsive-audit.js                      # 13 routes × 5 widths
node scripts/qa/flows.js                                 # tutor → check → recommendation → project
node scripts/qa/flows-practice.js                        # wrong answer, hints, event registration
node scripts/qa/overflow-probe.js                        # names the element causing overflow
```

`AURA_QA_BASE` overrides the default `http://localhost:3000`.

> **Authentication:** the app uses an opaque `aura_session` cookie (only its hash is stored).
> Older versions of these scripts injected `aura_uid=<user-id>`, which the app no longer accepts —
> authenticated pages silently redirected to `/login` while the scripts still saw HTTP 200 and
> reported false passes. All four scripts now require `AURA_QA_SESSION`, and the responsive audit
> explicitly fails if an authenticated route lands on `/login`.

Results of the last run are recorded in `docs/QA.md`; §§3–5 there are historical manual results,
not reproducible from these scripts without a fresh session token.
