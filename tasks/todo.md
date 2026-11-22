# AURA hardening — task tracker

## Phase 1: Security & correctness — DONE (commit 6aa1f14)
- [x] T1 Delete dead `scripts/seed-catalogue.ts`
- [x] T2 Harden `next` redirect (open redirect) — live HTML verified
- [x] T3 `AURA_TRUST_PROXY` opt-in — prod already true, no behaviour change
- [x] T4 Constant-time-ish sign-in for unknown accounts
- [x] T5 Validate invite before hashing password
- [x] T6 Role-relevant admin/mentor mobile tabs — browser-verified 390/320
- [x] CHECKPOINT: 57 tests, build, deploy, health, browser verification

## Phase 2: Correctness gaps from route audit
- [ ] T7 Fix mentor `/mentor/project/[id]` 404 link → `/admin/projects`
- [ ] T8 Filter admin nav by actual roles (staff see forbidden links)
- [ ] T9 Hide showcase controls from non-admin roles; fix event-composer curator mismatch
- [ ] T10 Handle empty/unpublished catalogue without 500s
- [ ] T11 Validate event dates before `.toISOString()` (uncaught RangeError)
- [ ] T12 Show signup CTA in demo mode; wire/remove dead actions; catch returnItem errors
- [ ] CHECKPOINT: tests + build + route audit

## Phase 3: Honest documentation
- [ ] T13 Recompute stale counts/facts (29 tests, 23 tables, six rules, SQLite decision, API routes, scripts)
- [ ] T14 Repair or restate QA script claims (aura_uid → real sessions, port 3001)
- [ ] T15 Apply owner's ARCHITECTURE.md markdown (blocked: awaiting paste)

## Phase 4: Accessibility & ops
- [ ] T16 Skip-link targets, sitemap topics, robots `/signup`
- [ ] T17 ACME email, restore drill, delete stale secret file (partly blocked: approval)
- [ ] CHECKPOINT: final live walkthrough, all three roles, both apps healthy
