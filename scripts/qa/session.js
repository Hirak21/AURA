/**
 * Shared QA browser setup.
 *
 * The app authenticates with an opaque `aura_session` cookie whose value is a
 * random token (only its SHA-256 hash is stored in the DB). Older QA scripts
 * injected `aura_uid=<demo-user-id>`, which the app has not accepted since
 * hashed sessions were introduced — authenticated pages silently redirected
 * to /login while the scripts still saw HTTP 200 and claimed success.
 *
 * Supply a real token via AURA_QA_SESSION (mint one with `npm run user:create`
 * then sign in, or insert a session row as in docs/QA.md). Never commit one.
 */
const BASE = process.env.AURA_QA_BASE || 'http://localhost:3000';

function sessionCookies() {
  const token = process.env.AURA_QA_SESSION;
  if (!token) {
    throw new Error('Set AURA_QA_SESSION to a valid aura_session token before running QA scripts.');
  }
  return [{ name: 'aura_session', value: token, url: BASE, httpOnly: true }];
}

module.exports = { BASE, sessionCookies };
