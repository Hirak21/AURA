# AURA hardening — task tracker

## Phase 1: Security & correctness — DONE (6aa1f14)
- [x] T1 Delete dead `scripts/seed-catalogue.ts`
- [x] T2 Harden `next` redirect (open redirect) — live HTML verified
- [x] T3 `AURA_TRUST_PROXY` opt-in
- [x] T4 Constant-time-ish sign-in for unknown accounts
- [x] T5 Validate invite before hashing password
- [x] T6 Role-relevant admin/mentor mobile tabs

## Phase 2: Correctness gaps — DONE (df3d9a6)
- [x] T7 Fix mentor `/mentor/project/[id]` 404 link
- [x] T8 Filter admin nav by actual roles — browser-verified
- [x] T9 Hide showcase controls from non-admin; event-composer curator mismatch
- [x] T10 Handle empty/unpublished catalogue without 500s
- [x] T11 Validate event dates before `.toISOString()`
- [x] T12 Signup CTA in demo mode; remove 3 dead actions; catch returnItem errors
- [x] CHECKPOINT: 60 tests, build, 17-route audit, nav audit live

## Phase 3: Honest documentation
- [ ] T13 Recompute stale counts/facts (29 tests, 23 tables, six rules, SQLite decision, API routes, script list)
- [ ] T14 Repair or restate QA script claims (aura_uid → real sessions, port 3001)
- [ ] T15 Apply owner's ARCHITECTURE.md markdown (blocked: awaiting paste)

## Phase 4: Accessibility & ops
- [ ] T16 Skip-link targets, sitemap topics, robots `/signup`
- [ ] T17 ACME email, restore drill, delete stale secret file (partly blocked: approval)
- [ ] CHECKPOINT: final live walkthrough, all three roles, both apps healthy
