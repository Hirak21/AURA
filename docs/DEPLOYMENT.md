# Deploying AURA on a VPS

Target: one Linux VPS, one Node.js process, SQLite on local disk, Nginx (or Caddy) terminating TLS, running as the non-root user **`aagomon`**.

> AURA is deliberately a single-instance application. Do **not** run it with PM2 cluster mode, `--instances max`, or two systemd services against the same SQLite file. See [DATABASE.md](DATABASE.md) for why and for the Postgres path.

---

## 1. Server prerequisites

```bash
sudo apt update
sudo apt install -y git nginx curl build-essential python3
# Node 22 LTS or 24 LTS (better-sqlite3 13 requires Node >= 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v22.x or newer
```

Create the service account if it does not exist:

```bash
sudo adduser --disabled-password --gecos "" aagomon
```

`better-sqlite3` ships prebuilt binaries for common platforms. If npm has to compile it, `build-essential` and `python3` above are enough.

---

## 2. Directory layout

Keep releases and mutable state separate so a redeploy never touches data:

```
/home/aagomon/aura/
├── app/                    # git checkout (code + node_modules + .next)
│   └── .env.production     # chmod 600
└── shared/
    ├── data/aura.db        # SQLite database (WAL sidecars appear here)
    └── backups/            # npm run db:backup output
```

```bash
sudo -iu aagomon
mkdir -p ~/aura/shared/data ~/aura/shared/backups
chmod 700 ~/aura/shared
git clone <YOUR_REPO_URL> ~/aura/app
cd ~/aura/app
```

---

## 3. Environment

```bash
cp .env.example .env.production
chmod 600 .env.production
nano .env.production
```

Minimum production values:

```ini
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
AURA_PUBLIC_URL=https://aura.your-domain.example
AURA_DB_PATH=/home/aagomon/aura/shared/data/aura.db
AURA_BACKUP_DIR=/home/aagomon/aura/shared/backups
AURA_BACKUP_KEEP=14
AURA_DEMO_MODE=false
AURA_COOKIE_SECURE=true
AURA_TRUST_PROXY=true
```

`AURA_DEMO_MODE=false` is mandatory on an internet-facing host: it removes the demo identity picker and refuses demo sign-in server-side. `AURA_COOKIE_SECURE=true` requires HTTPS (step 6).

---

## 4. First install and database

```bash
cd ~/aura/app
npm ci
npm run db:migrate          # schema only — no demo rows
npm run user:create -- --email you@gu.ac.in --name "Your Name" --role admin
```

`user:create` prints a generated password once. Save it in a password manager. Add other staff with the appropriate roles (`mentor`, `reviewer`, `curator`, `organizer`, `liaison`, `custodian`, `admin`). Students can also be created this way until an institutional identity provider is connected.

### Invite-only student signup

Students can register themselves at `/signup` with a code issued by an admin. Codes are stored only as SHA-256 digests, are single-use by default, expire after 7 days unless changed, and always create a `student` account — never a staff or admin role.

```bash
npm run invite:create -- --email student@example.edu --days 7 --label "Workshop A"
npm run invite:list                      # metadata only — codes cannot be recovered
```

The plaintext code is printed **once**. Send it to the student over a separate channel. Options: `--uses N` (1–100), `--days N` (1–365), `--email` (restrict to one address), `--label`, `--created-by <admin-email>`. Existing accounts are never overwritten, and a failed redemption does not consume the code. Registration is rate-limited per IP.

Only use `npm run db:init` when you intentionally want the **demo dataset** (fictional accounts, seeded content). It deletes and recreates the database.

Build and smoke-test:

```bash
npm run build
PORT=3100 AURA_DEMO_MODE=false AURA_COOKIE_SECURE=false npm start
curl -fsS http://127.0.0.1:3100/api/health
```

Expected: `{"status":"ok",...}`. Stop the test server with `Ctrl-C`.

---

## 5. systemd service

Create `/etc/systemd/system/aura.service`:

```ini
[Unit]
Description=AURA Learning & Innovation OS
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=aagomon
Group=aagomon
WorkingDirectory=/home/aagomon/aura/app
EnvironmentFile=/home/aagomon/aura/app/.env.production
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGINT
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
UMask=0077

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aura
sudo systemctl status aura
journalctl -u aura -f
```

The service listens on `127.0.0.1:3000`; it is not directly reachable from the internet.

---

## 6. Nginx + HTTPS

`/etc/nginx/sites-available/aura`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name aura.your-domain.example;

    # Let certbot serve the ACME challenge over HTTP.
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aura.your-domain.example;

    ssl_certificate     /etc/letsencrypt/live/aura.your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aura.your-domain.example/privkey.pem;

    client_max_body_size 2m;
    server_tokens off;

    # Overwrite, never append, so the app cannot be fed a spoofed client IP.
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_redirect off;
    }

    location = /api/health {
        proxy_pass http://127.0.0.1:3000/api/health;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/aura /etc/nginx/sites-enabled/aura
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d aura.your-domain.example
```

After DNS and TLS are live, verify:

```bash
curl -I https://aura.your-domain.example        # HSTS + security headers
curl -fsS https://aura.your-domain.example/api/health
```

If you prefer Caddy, the equivalent is two lines (`reverse_proxy 127.0.0.1:3000`) and Caddy handles certificates automatically. Set `AURA_TRUST_PROXY=true` either way; Caddy sets `X-Forwarded-For`.

---

## 7. Backups (do this before launch)

`npm run db:backup` uses SQLite's online backup API, so it is safe while the app is running. It writes `aura-YYYY-MM-DD_HH-MM-SS.db` and keeps the newest `AURA_BACKUP_KEEP` files.

```bash
crontab -e
```

```cron
# Nightly database snapshot at 02:15
15 2 * * * cd /home/aagomon/aura/app && /usr/bin/npm run db:backup >> /home/aagomon/aura/shared/backups/backup.log 2>&1
# Weekly maintenance (expired sessions, WAL checkpoint)
30 3 * * 0 cd /home/aagomon/aura/app && /usr/bin/npm run db:maintain >> /home/aagomon/aura/shared/backups/maintain.log 2>&1
```

Then copy snapshots off the VPS (object storage, `rsync` to another host, or your provider's volume snapshots). A backup that only exists on the same disk is not a backup.

**Test a restore once before launch:**

```bash
sudo systemctl stop aura
cp ~/aura/shared/backups/aura-<timestamp>.db ~/aura/shared/data/aura.db
rm -f ~/aura/shared/data/aura.db-wal ~/aura/shared/data/aura.db-shm
sudo systemctl start aura
curl -fsS http://127.0.0.1:3000/api/health
```

---

## 8. Deploying updates

```bash
sudo -iu aagomon
cd ~/aura/app
git pull --ff-only
npm ci
npm run typecheck && npm test
npm run db:backup                 # snapshot before schema changes
npm run db:migrate                # forward-only, idempotent
npm run build
sudo systemctl restart aura
curl -fsS http://127.0.0.1:3000/api/health
```

Rollback: `git checkout <previous-tag>`, `npm ci`, `npm run build`, restart. Database migrations are forward-only; restore the pre-deploy snapshot if a migration must be undone.

---

## 9. Operations checklist

- [ ] `AURA_DEMO_MODE=false` and `AURA_COOKIE_SECURE=true`
- [ ] `.env.production` is `chmod 600`, owned by `aagomon`, never committed
- [ ] Firewall allows only 22/80/443; Node is bound to `127.0.0.1`
- [ ] HTTPS certificate auto-renews (`systemctl list-timers | grep certbot`)
- [ ] Nightly backups run and a restore has been tested
- [ ] `/api/health` monitored externally (Uptime Kuma, provider check, etc.)
- [ ] `journalctl -u aura` checked after each deploy
- [ ] Admin account created with a unique password; demo accounts absent
- [ ] Disk space alarm configured (SQLite + WAL + backups share the volume)

---

## 10. Known deployment limits

- **Single instance only.** In-process rate limiting and SQLite both assume one Node process.
- **No email delivery.** School-request confirmations are on-screen only; nothing is sent.
- **No live AI provider.** The tutor is deterministic and labelled as such.
- **Institutional SSO is not connected.** Email + password with scrypt hashing and server-side sessions is the current production path.
