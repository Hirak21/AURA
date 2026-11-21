/**
 * List invite metadata. Codes are one-way hashed and cannot be recovered here.
 *   npm run invite:list
 */
import { openDatabase } from "./_db";

interface InviteRow {
  id: string;
  label: string;
  email: string | null;
  max_uses: number;
  uses: number;
  expires_at: string;
  revoked_at: string | null;
}

const { sqlite } = openDatabase();
const rows = sqlite
  .prepare(
    "SELECT id, label, email, max_uses, uses, expires_at, revoked_at FROM invites ORDER BY created_at DESC",
  )
  .all() as InviteRow[];

if (rows.length === 0) {
  console.log("No invites. Create one with: npm run invite:create -- --label \"...\"");
} else {
  console.log("id                                   label              email                 uses     expires                  status");
  for (const r of rows) {
    const status = r.revoked_at
      ? "revoked"
      : r.expires_at <= new Date().toISOString()
        ? "expired"
        : r.uses >= r.max_uses
          ? "used"
          : "active";
    console.log(
      [
        r.id.slice(0, 36).padEnd(36),
        r.label.slice(0, 18).padEnd(18),
        (r.email ?? "any").slice(0, 20).padEnd(20),
        `${r.uses}/${r.max_uses}`.padEnd(8),
        r.expires_at.padEnd(24),
        status,
      ].join(" "),
    );
  }
}
sqlite.close();
