# Using the AURA database in production

Short answer: **yes — SQLite is a legitimate production database for AURA as deployed here**, provided AURA runs as **one Node process on one VPS** with the database on local disk, WAL enabled, and scheduled backups. It stops being the right choice the moment you need multiple app servers, high write concurrency, or managed point-in-time recovery.

---

## 1. Why it is safe for this workload

AURA is a single-tenant, read-heavy application:

- Students read topics, questions and recommendations far more than they write.
- Writes are small and human-paced: one practice attempt, one tutor message, one session touch, a project submission, an inventory movement.
- Integrity matters more than raw throughput: event capacity and equipment availability rely on real transactions. SQLite gives genuine `BEGIN…COMMIT` semantics, foreign keys and uniqueness constraints.
- The whole dataset is small. A few thousand learners with a hundred attempts each is still tens of megabytes, not gigabytes.

The connection in `lib/db/client.ts` already sets the production posture:

| Pragma | Value | Why |
|---|---|---|
| `journal_mode` | `WAL` | readers never block the writer; one writer at a time |
| `synchronous` | `NORMAL` | correct durability/speed trade-off under WAL |
| `busy_timeout` | `5000` | waits instead of failing with `SQLITE_BUSY` during checkpoints |
| `foreign_keys` | `ON` | referential integrity is enforced by the database |
| `wal_autocheckpoint` | `1000` | keeps the WAL from growing without bound |
| `temp_store` | `MEMORY` | avoids temp files for small sorts |

The path is absolute (`AURA_DB_PATH`), so a systemd working-directory change cannot silently create a second empty database.

---

## 2. The operating rules

1. **One process.** Run a single `next start` behind Nginx/Caddy. Do not use PM2 cluster mode or two systemd units against the same file. The in-process rate limiter and SQLite write model both assume one instance.
2. **Local disk.** Do not put the database on NFS, SMB, or a network filesystem. SQLite locking is not reliable there.
3. **Writable state outside the release directory.** Use `AURA_DB_PATH=/home/aagomon/aura/shared/data/aura.db` so `git pull` / `npm ci` / rebuilds never touch it.
4. **Back up with the backup API, not `cp`.** Copying a live WAL database can capture a torn state. `npm run db:backup` takes a consistent snapshot while the app runs.
5. **Migrate forward only.** `migrate()` is idempotent and runs on boot; `schema_meta.schema_version` records the current version. Take a snapshot before each deploy.
6. **Restrict permissions.** The database directory should be `700` and owned by `aagomon`; `.env.production` should be `600`.

---

## 3. Backup and restore

```bash
npm run db:backup          # online snapshot into AURA_BACKUP_DIR
npm run db:maintain        # prune expired sessions + checkpoint WAL
```

Schedule both (see [DEPLOYMENT.md §7](DEPLOYMENT.md#7-backups-do-this-before-launch)) and copy snapshots off the VPS. Retention is controlled by `AURA_BACKUP_KEEP` (default 14).

Restore:

```bash
sudo systemctl stop aura
cp /path/to/aura-<timestamp>.db /home/aagomon/aura/shared/data/aura.db
rm -f /home/aagomon/aura/shared/data/aura.db-wal /home/aagomon/aura/shared/data/aura.db-shm
sudo systemctl start aura
curl -fsS http://127.0.0.1:3000/api/health
```

Test the restore once before launch. An untested backup is a hypothesis, not a recovery plan.

---

## 4. Capacity guidance

| Signal | Reading |
|---|---|
| Dataset < 1 GB, single VPS | SQLite is comfortable |
| Sustained writes above roughly 50–100/second | SQLite becomes the bottleneck; move to Postgres |
| Need for two or more app servers | Move to Postgres (or a shared managed database) |
| Need for managed PITR, read replicas, HA failover | Move to Postgres |
| Long analytical queries alongside live traffic | Move to Postgres (or a read replica) |

For a university association pilot — hundreds to a few thousand users, workshop-scale concurrency — the first four signals are unlikely to appear.

---

## 5. If and when to move to Postgres

The code is already structured for it: Drizzle owns the schema, services read through Drizzle, and domain logic is pure. The migration is an infrastructure change, not a rewrite.

1. Provision Postgres (managed is preferable) and create a separate database and role for AURA.
2. Add `drizzle-orm/node-postgres` + `pg`; create `lib/db/client.pg.ts` with the same exported `db`/`schema` surface.
3. Translate the DDL in `lib/db/migrate.ts` to Postgres types (`TEXT` → `text`, `INTEGER` booleans → `boolean`, `REAL` → `double precision`), or adopt `drizzle-kit` migrations.
4. Move the session/rate-limit store to a shared backend (Redis) when running more than one instance.
5. Export/import existing rows (`sqlite3 .mode insert` or a small script), then verify counts and foreign keys.
6. Run both stacks against a staging copy, compare the 63 tests and the main journeys, then cut over during a maintenance window with a final snapshot.

Until then, SQLite is not a placeholder in this project: it is the production database, with the operational rules above.
