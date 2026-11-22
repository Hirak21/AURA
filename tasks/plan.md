# Implementation Plan: AURA hackathon hardening

## Overview
Make AURA stand up to technical review: eliminate correctness/security defects,
remove dead and misleading artefacts, and make the documented claims match the
running system. Work proceeds in thin, independently verified increments.

## Decisions
- Correctness and security before visual polish (per owner priority).
- Keep the production topology: single Node process, SQLite, nginx TLS.
- Every increment: typecheck + full test suite + build, then deploy and verify live.
- No force-push, no history rewrite, no Aagomon changes, no committed secrets.

## Task List

### Phase 1 — Security & correctness (must-fix)
- [ ] Task 1: Delete dead, unrunnable `scripts/seed-catalogue.ts`.
- [ ] Task 2: Harden post-login `next` redirect against `/\evil.com`-style open redirects.
- [ ] Task 3: Make `AURA_TRUST_PROXY` opt-in (default false) so direct exposure cannot be rate-limit-bypassed.
- [ ] Task 4: Equalise sign-in timing for unknown accounts using a fixed dummy scrypt hash.
- [ ] Task 5: Validate the invite before hashing the password (remove unauthenticated CPU-exhaustion path).
- [ ] Task 6: Make admin mobile tabs role-relevant instead of four student links.

### Checkpoint: Phase 1
- [ ] Suite green, build green, live auth flows re-verified in browser, Aagomon untouched.

### Phase 2 — Honest documentation
- [ ] Task 7: Recompute QA/test counts and stale facts (23 tables, six rules, SQLite decision, API-route claim, script list).
- [ ] Task 8: Replace invalid QA scripts' obsolete `aura_uid` auth with real session auth, or restate their claims honestly.
- [ ] Task 9: Apply owner-authored `docs/ARCHITECTURE.md` markdown when supplied.

### Checkpoint: Phase 2
- [ ] No doc contradicts code; QA claims reproducible.

### Phase 3 — Accessibility & ops polish
- [ ] Task 10: Add `id="main"` to standalone pages so the skip link works; sitemap topic URLs; disallow `/signup`.
- [ ] Task 11: Fix ACME contact email; complete backup-restore drill; delete stale plaintext secret file.

### Checkpoint: Complete
- [ ] Full suite, clean build, live walkthrough, all three roles, both apps healthy.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Rate-limit change locks out production | High | nginx overwrites XFF; `AURA_TRUST_PROXY=true` already set, so behaviour unchanged live |
| Moving scrypt breaks invite tests | Medium | Add regression tests before changing; preserve atomic claim |
| Doc edits drift from code | Low | Derive counts from source, not memory |

## Open Questions
- Exact `docs/ARCHITECTURE.md` markdown (owner to paste).
- Approval to delete stale plaintext secret file `Projects/dev/jwt and ssh key ffor vps.md`.
