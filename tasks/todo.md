# AURA hardening — task tracker

## Phase 1: Security & correctness
- [ ] T1 Delete dead `scripts/seed-catalogue.ts`
- [ ] T2 Harden `next` redirect (open redirect)
- [ ] T3 `AURA_TRUST_PROXY` opt-in
- [ ] T4 Constant-time-ish sign-in for unknown accounts
- [ ] T5 Validate invite before hashing password
- [ ] T6 Role-relevant admin mobile tabs
- [ ] CHECKPOINT: tests + build + live verification

## Phase 2: Honest documentation
- [ ] T7 Recompute stale counts/facts
- [ ] T8 Repair or restate QA script claims
- [ ] T9 Apply owner's ARCHITECTURE.md markdown (blocked: awaiting paste)
- [ ] CHECKPOINT: docs match code

## Phase 3: Accessibility & ops
- [ ] T10 Skip-link targets, sitemap topics, robots
- [ ] T11 ACME email, restore drill, delete stale secret file (partly blocked: approval)
- [ ] CHECKPOINT: final live walkthrough
