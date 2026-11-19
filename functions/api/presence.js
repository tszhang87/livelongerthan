// Cloudflare Pages Function. Bind a D1 database under the variable PRESENCE_DB.
// No personal details, IP addresses, dates of birth, cookies or location are stored.
const TTL_MS = 300000;
const MAX_ACTIVE = 300;
const MAX_VISIBLE = 60;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let initialized = false;
let lastCleanup = 0;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
  });
}
async function database(env) {
  if (!env || !env.PRESENCE_DB) return null;
  const db = env.PRESENCE_DB;
  if (!initialized) {
    await db.prepare('CREATE TABLE IF NOT EXISTS garden_visitors (id TEXT PRIMARY KEY, joined_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_garden_expires ON garden_visitors(expires_at)').run();
    initialized = true;
  }
  return db;
}
async function cleanup(db, now, force = false) {
  if (force || now - lastCleanup > 60000) {
    await db.prepare('DELETE FROM garden_visitors WHERE expires_at <= ?').bind(now).run();
    lastCleanup = now;
  }
}
async function snapshot(db, now) {
  const [rows, count] = await Promise.all([
    db.prepare('SELECT id, expires_at FROM garden_visitors WHERE expires_at > ? ORDER BY joined_at DESC LIMIT ?').bind(now, MAX_VISIBLE).all(),
    db.prepare('SELECT COUNT(*) AS count FROM garden_visitors WHERE expires_at > ?').bind(now).first()
  ]);
  return {
    ready: true,
    serverTime: now,
    count: Number(count?.count ?? 0),
    visitors: (rows.results || []).map(v => ({ id: v.id, expiresAt: Number(v.expires_at) }))
  };
}
export async function onRequestGet({env}) {
  try {
    const db = await database(env);
    if (!db) return json({ready: false, reason: 'database_not_bound', visitors: []}, 503);
    const now = Date.now();
    await cleanup(db, now);
    return json(await snapshot(db, now));
  } catch (err) {
    console.error('Presence GET failed:', err?.message || String(err));
    return json({ready: false, reason: 'temporarily_unavailable', visitors: []}, 503);
  }
}
export async function onRequestPost({request, env}) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({error: 'origin_not_allowed'}, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error: 'expected_json'}, 415);
  if (Number(request.headers.get('Content-Length') || 0) > 200) return json({error: 'too_large'}, 413);
  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 200) return json({error: 'too_large'}, 413);
    payload = JSON.parse(raw);
  } catch (_) { return json({error: 'invalid_json'}, 400); }
  if (typeof payload?.id !== 'string' || !UUID_V4.test(payload.id)) return json({error: 'invalid_id'}, 400);
  try {
    const db = await database(env);
    if (!db) return json({ready: false, reason: 'database_not_bound', visitors: []}, 503);
    const now = Date.now();
    await cleanup(db, now, true);
    // Atomic cap prevents a single mistaken client from flooding the public display.
    await db.prepare('INSERT OR IGNORE INTO garden_visitors(id, joined_at, expires_at) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM garden_visitors) < ?')
      .bind(payload.id, now, now + TTL_MS, MAX_ACTIVE).run();
    return json(await snapshot(db, now));
  } catch (err) {
    console.error('Presence POST failed:', err?.message || String(err));
    return json({ready: false, reason: 'temporarily_unavailable', visitors: []}, 503);
  }
}