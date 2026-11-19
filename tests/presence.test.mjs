import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequestGet, onRequestPost } from '../functions/api/presence.js';

// Exercises the real SQL against in-memory SQLite (D1-compatible SQL).
const sqlite = new DatabaseSync(':memory:');
const db = {
  prepare(sql) {
    let values = [];
    const statement = {
      bind(...next) { values = next; return statement; },
      run() { return sqlite.prepare(sql).run(...values); },
      all() { return {results: sqlite.prepare(sql).all(...values)}; },
      first() { return sqlite.prepare(sql).get(...values); }
    };
    return statement;
  }
};
const env = { PRESENCE_DB: db };
const id1 = '21b6ee3e-ceab-4c78-8ef6-f9a36e57de10';
const id2 = 'e2b4e0e0-0a8f-4d32-a514-1c2bf237e455';
const request = (id, origin='https://livelongerthan.com') => new Request('https://livelongerthan.com/api/presence', {
  method:'POST', headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify({id})
});

test('Cloudflare Pages D1 anonymous five-minute presence', async () => {
  let result = await onRequestGet({env:{}});
  assert.equal(result.status,503);
  result = await onRequestPost({env,request:request('not-a-uuid')});
  assert.equal(result.status,400);
  result = await onRequestPost({env,request:request(id1,'https://attacker.example')});
  assert.equal(result.status,403);
  result = await onRequestGet({env});
  assert.equal((await result.json()).count,0);
  result = await onRequestPost({env,request:request(id1)});
  let body = await result.json();
  assert.equal(result.status,200);
  assert.equal(body.count,1);
  assert.ok(body.visitors[0].expiresAt-body.serverTime<=300000);
  result = await onRequestPost({env,request:request(id1)});
  assert.equal((await result.json()).count,1,'refreshing a tab should not add visitors');
  result = await onRequestPost({env,request:request(id2)});
  assert.equal((await result.json()).count,2);
  // Simulate expiry; the next read will delete expired rows.
  sqlite.prepare('UPDATE garden_visitors SET expires_at = 1 WHERE id = ?').run(id1);
  result = await onRequestGet({env});
  assert.equal((await result.json()).count,1);
  assert.equal(result.headers.get('Cache-Control'),'no-store, max-age=0');
});