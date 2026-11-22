# Production demo dataset — audit, seed, verify, remove

This runbook covers the **opt-in demo activity layer** for a deployed AURA instance. It is intentionally separate from `npm run db:init` / `npm run db:reset`: those commands create or replace the whole database and must never be used against production.

> **Status (23 November 2026): APPLIED to production.** The v2 dataset and its local lifecycle passed on a separate SQLite file. On the live instance at `https://aura-os.duckdns.org/` a pre-change backup was taken, the code was deployed, `db:migrate` ran, and the v1 dry-run correctly refused because production has no baseline demo accounts. The operator approved **locked demo identities**; v2 was applied in one transaction and `npm run demo:verify` reported **16/16 checks passed**. A post-apply dry-run is a no-op (0 inserts, 62 skipped).

---

## 1. What the audit found

The current schema (`lib/db/schema.ts`, mirrored by `lib/db/migrate.ts`) supports these entities:

| Requested workflow | Actual tables used | How this dataset uses them |
|---|---|---|
| Identity | `users`, `user_roles`, `sessions`, `invites` | Creates 6 locked, clearly-labelled demo-only users and 9 role rows. No passwords, sessions or invites are created. No real account is modified. |
| Learning catalogue | `subjects`, `topics`, `topic_prerequisites`, `resources`, `practice_questions` | **Reference only.** Reuses the shipped 7-topic catalogue. |
| Learning activity | `tutor_sessions`, `tutor_messages`, `practice_attempts`, `learning_goals`, `bookmarks` | 3 sessions, 2 schema-valid curated tutor responses, 7 attempts, 2 goals, 3 bookmarks. |
| Project → review → showcase | `challenges`, `projects`, `project_reviews` | 2 projects, 3 mentor reviews, one approved **and** consented showcase project. |
| Mentor linkage | `mentor_assignments` | 2 active assignments between the demo mentor and demo learners. |
| Events | `events`, `event_registrations` | 1 completed demo event + 5 registrations, including 2 attended. |
| School collaboration | `schools`, `collaboration_requests` | 1 new in-review request; existing scheduled request is referenced by an allocation. |
| Hardware | `inventory_items`, `stock_movements`, `resource_allocations` | 4 movements and 4 allocations linked to project/event/collaboration records. |
| Audit trail | `audit_events` | 6 fictional audit rows. |

Why locked demo identities were needed: the live database contains **4 real accounts with no `is_demo` users**. The v1 seed refused to attach fictional learning/review activity to them. The operator approved adding separate, passwordless `pd2-` identities instead. They cannot sign in (`password_hash IS NULL`, no sessions) and are removed by the same manifest as the rest of the dataset.

Names that do **not** exist in this build, and are therefore deliberately not seeded:

- `under_review` — the actual status is `in_review`.
- An "enrolled topics" table — progress is derived from `tutor_sessions`, `practice_attempts`, `bookmarks` and projects.
- Live/agentic AI tutor content — the Demo Tutor is deterministic and curated for the 7 shipped topic IDs only.
- AURA Missions, Open Buildathon, attendance marking, a maintenance workflow, file uploads and email delivery.

No new topics or questions are added, because fabricating Demo Tutor content for them would be dishonest.

---

## 2. Safety design

1. **Additive only.** 62 rows across 16 tables. No `DROP`, no `DELETE` of existing rows, no `UPDATE` of existing rows.
2. **No real identity changes.** Six new `pd2-user-*` accounts have `is_demo = 1`, `@demo.aura.local` emails and **no password hash**. No sessions, invites or permissions for real accounts are created or changed.
3. **Demo-only references.** Referenced events and resources must still have `is_demo = 1`; topics/questions/challenges must match the shipped baseline titles and IDs. Otherwise the script aborts.
4. **Deterministic.** Every row has a fixed ID or fixed composite key. Timestamps come from one anchor (`AURA_DEMO_AS_OF`, or the stored manifest timestamp on reruns).
5. **Idempotent.** Identical rows are skipped. A row with the same key but different values causes a **conflict and rollback** — it is never overwritten.
6. **Transactional.** All inserts plus the manifest write happen in one `BEGIN IMMEDIATE` transaction.
7. **Dry-run by default.** `--apply` is required to write; production targets additionally require `--production-approved`.
8. **Scoped removal.** `demo_seed_meta` records exactly which rows were added. Removal deletes only those primary keys, in reverse dependency order — including the demo identities.
9. **No auth bypass.** Nothing changes cookies, sessions, rate limiting or authorization for existing users.

The marker table is created by the forward-only migration:

```sql
CREATE TABLE IF NOT EXISTS demo_seed_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`schema_meta.schema_version` is `3.2.0`.

---

## 3. Dataset map

| Step | Demo evidence |
|---|---|
| Identity | Six locked `pd2-user-*` accounts with demo labels, roles and two mentor assignments. |
| Learn | Ananya opens Ohm's Law and Series/Parallel; Meera opens Fractions; both ask a question and receive a labelled `provider: "demo"` response. |
| Practise | Ananya gets Ohm's Law wrong then right; Meera simplifies a fraction wrong then right; Rohit answers the resistor-sizing question. |
| Apply | Ananya builds the LED rail indicator (`pd2-project-showcase-led`); Rohit writes the motion explanation (`pd2-project-approved-motion`). |
| Mentor review | Kabir requests a change, then approves Ananya's revision; separately approves Rohit's work. |
| Showcase | Ananya consented and status is `showcased`, so `/projects` can show it. Rohit is `approved` with `consent_to_showcase = 0`, so it stays private. |
| Events | Registrations for the future soldering workshop and school visit; two attended rows for the completed `pd2-event-recap`. |
| Hardware | Resistors/LEDs issued and returned for Ananya's project; jumpers linked to the scheduled school request; a multimeter returned with a worn lead and a matching damage movement. |

All fictional URLs use `https://demo.aura.local/...`; no network request is made to them.

---

## 4. Local lifecycle test (already performed)

Run against a **separate** database, never the production one:

```bash
export AURA_DB_PATH=/tmp/aura-demo-lifecycle/aura.db
export AURA_DEMO_AS_OF=2026-11-23T10:00:00.000Z

npm run db:init
npm run demo:seed              # dry-run
npm run demo:seed -- --apply
npm run demo:verify
npm run demo:seed -- --apply   # rerun: 0 inserts, 62 skipped
npm run demo:remove            # dry-run
npm run demo:remove -- --apply
```

Observed dry-run plan:

```text
audit_events             insert  6
bookmarks                insert  3
collaboration_requests   insert  1
event_registrations      insert  5
events                   insert  1
learning_goals           insert  2
mentor_assignments       insert  2
practice_attempts        insert  7
project_reviews          insert  3
projects                 insert  2
resource_allocations     insert  4
stock_movements          insert  4
tutor_messages           insert  4
tutor_sessions           insert  3
user_roles               insert  9
users                    insert  6
Total: 62 to insert
```

Observed verification: **16/16 checks passed**, including locked identities and zero demo sessions. After removal, baseline counts returned exactly to the `db:init` values (`users=7`, `projects=1`, `events=2`, `collaboration_requests=2`, `inventory_items=8`, `audit_events=3`).

---

## 5. Production runbook

Do this on the VPS as the `aura` service account. The app may stay running; the backup uses SQLite's online backup API and the seed uses a short write transaction.

### Step 1 — set the exact target and confirm it

```bash
cd /home/aura/aura/app
set -a; . ./.env.production; set +a

readlink -f "$AURA_DB_PATH"
curl -fsS http://127.0.0.1:3000/api/health
```

Expected database path: `/home/aura/aura/shared/data/aura.db`. Stop if it differs.

### Step 2 — back up and migrate

```bash
npm run db:backup
npm run db:migrate
```

Record the backup filename and copy it off-box. Never use `db:init` or `db:reset` here.

### Step 3 — dry-run and review

```bash
npm run demo:seed
```

Review the printed database path and the 62-row plan. If it reports conflicts, missing catalogue records or an unexpected path, **stop**. The dry-run writes nothing.

### Step 4 — explicit operator approval

The operator must consciously approve the write:

```bash
npm run demo:seed -- --apply --production-approved
```

`--production-approved` is required because `NODE_ENV=production` in `.env.production`. Omitting it fails before any write.

### Step 5 — verify

```bash
npm run demo:verify
```

Expected: `All 16 checks passed.` A note about row drift is informational: normal app use can change tutor-session timestamps, helpful flags, registrations or project status. Presence and workflow checks are the pass/fail criteria.

### Step 6 — smoke test in the browser

- Sign in with an existing real admin account and confirm the overview and project queue load.
- Confirm the two new mentor reviews are visible in the review queue.
- Open the public `/projects` page and confirm only the consented showcase project appears.
- The `pd2-user-*` personas are intentionally locked: do **not** expect to sign in as them. `AURA_DEMO_MODE` stays `false` in production.

---

## 6. How demo records are identified

1. `demo_seed_meta` key `aura-production-demo-v2` contains the full row manifest (table, primary keys, columns, content hashes).
2. New single-column IDs start with `pd2-`, for example `pd2-project-showcase-led`, `pd2-user-ananya` and `pd2-event-recap`.
3. Composite rows (`tutor_sessions`, `event_registrations`, `bookmarks`, `user_roles`) are identified by their primary-key columns in the manifest.
4. Referenced catalogue records are the existing `is_demo = 1` rows.
5. Human-readable labels contain `(demo)` or `Demo`, and evidence URLs use `demo.aura.local`.

Do **not** identify demo data only by `is_demo`: that flag exists on baseline catalogue tables too and is not present on most activity tables.

---

## 7. Safe removal

Removal is the exact inverse of the manifest — it never scans by title, prefix or `is_demo`.

```bash
export AURA_DB_PATH=/home/aura/aura/shared/data/aura.db

npm run demo:remove                                  # dry-run
npm run demo:remove -- --apply --production-approved # only after separate approval
npm run demo:verify                                  # should report MISSING manifest
```

Because the manifest now owns the demo identities, removal deletes the six demo users last, after all dependent activity. Before deleting, the script checks that no audit event **outside** the manifest still references a demo entity. If one exists, removal aborts so a real user's history is not silently orphaned. Investigate it rather than forcing deletion.

If removal is blocked by a genuine foreign key, the transaction rolls back. Restore from the backup taken in Step 2 if any doubt remains.

---

## 8. Troubleshooting

| Symptom | Meaning | Action |
|---|---|---|
| `Database does not exist` | Wrong `AURA_DB_PATH`, or the app has never initialised. | Set the absolute production path. Do not run `db:init` on production to "fix" it. |
| `Missing baseline catalogue record` | The shipped demo catalogue was removed or changed. | Stop. Restore/verify the baseline on a staging copy; do not point demo activity at real records. |
| `Conflict ... different values` | A manifest row was changed in the app or by another script. | Inspect that row. The seed refuses to overwrite it. Revert it deliberately if a reset is wanted. |
| `Unique conflict` | An email, identifier or registration key is already used by another row. | Stop. Choose a new dataset version with new identifiers; never delete the conflicting row. |
| `Refusing to write to a production database` | `--production-approved` was omitted. | Re-read this runbook, confirm the dry-run, then pass the flag explicitly. |
| `demo_seed_meta missing` | The migration has not run on that database. | Run `npm run db:migrate`, then retry. |
| Verify reports drift | Demo rows changed through normal app use. | Informational only. Re-running the seed will not overwrite them. |
| Cannot sign in as a demo persona | Expected: the accounts are deliberately locked. | Use a real admin account for inspection. Do not add a password just for a walkthrough. |

---

## 9. Honest boundaries

- The live instance was reached with deployment credentials already present in this workspace; no credentials are stored in the repository or seed files.
- Backups on the VPS: pre-change `/home/aura/aura/shared/backups/aura-2026-11-22_19-25-24.db`; pre-apply `/home/aura/aura/shared/backups/aura-2026-11-22_19-38-13.db`.
- Applied with anchor `2026-11-23T10:00:00.000Z`. Post-apply counts: 4 real users, 6 demo users, 27 sessions, 0 demo sessions, 1 manifest, 0 foreign-key violations.
- No real account, session, role, topic, question, challenge or inventory record was changed. Public `/projects` shows only the consented showcase project.
- This dataset does not add live AI, institutional SSO, new topics, new content, new permissions for real users, or new application features.
- SQLite remains single-instance; run one Node process and keep the scheduled backups described in [DATABASE.md](DATABASE.md).
