/* The shared garden uses only a random, per-tab ID. Birthdates never leave the browser. */
(() => {
  'use strict';
  const TTL = 300000, INTERVAL = 20000, KEY = 'llt-presence-v1';
  const garden = document.getElementById('presence-garden');
  const status = document.getElementById('presence-status-text');
  const heading = document.getElementById('presence-heading');
  const intro = document.getElementById('presence-description');
  const footnote = document.getElementById('presence-footnote');
  if (!garden || !status) return;
  const visitors = new Map();
  let shared = false, joined = false, syncing = false, seenTotal = 0;
  const isEnglish = () => document.documentElement.lang.toLowerCase().startsWith('en');
  const phrases = {
    en: { title: 'A little company, along the way.', intro: 'Every visitor leaves a little traveler here for five minutes, then waves goodbye.', here: n => `${n} little ${n === 1 ? 'traveler' : 'travelers'} passing through in the last five minutes`, local: 'Your little traveler is here · shared view awaiting setup', note: 'No names, birthdays or locations are shared.' },
    zh: { title: '在这段旅程中，有人与你同行。', intro: '每位访客都会在这里留下一个小小身影，五分钟后挥手道别。', here: n => `过去五分钟，有 ${n} 位小小旅人经过这里`, local: '你的小旅人已经出现 · 共享模式尚待启用', note: '不会共享任何姓名、生日或位置信息。' }
  };
  const language = () => phrases[isEnglish() ? 'en' : 'zh'];
  function label() {
    const t = language();
    heading.textContent = t.title;
    intro.textContent = t.intro;
    footnote.textContent = t.note;
    status.textContent = shared ? t.here(seenTotal) : t.local;
  }
  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  function getSession() {
    let previous;
    try { previous = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) { /* disabled storage */ }
    if (previous && /^[0-9a-f-]{36}$/i.test(previous.id) && Number.isFinite(previous.startedAt) && previous.startedAt <= Date.now() && previous.startedAt + TTL > Date.now()) return previous;
    const next = { id: randomId(), startedAt: Date.now() };
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch (_) { /* still works this visit */ }
    return next;
  }
  const me = getSession();
  const activeMe = () => Date.now() < me.startedAt + TTL;
  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function person(id, until) {
    const h = hash(id), poses = ['walk', 'stand', 'sit'], shirts = ['#81a5a0','#b88e77','#8c9b71','#a69ac4','#c69a6e','#7c9fb0'], skins = ['#f1ccaa','#d8a782','#b97f63','#edb998'], hairs = ['#443c38','#716250','#303c3c','#886d54'];
    const node = document.createElement('div');
    node.className = `little-visitor ${poses[h % poses.length]}`;
    node.setAttribute('aria-hidden', 'true');
    node.style.setProperty('--left', `${7 + ((h >>> 3) % 87)}%`);
    node.style.setProperty('--bottom', `${10 + ((h >>> 11) % 17)}px`);
    node.style.setProperty('--delay', `${((h >>> 14) % 21) / -5}s`);
    node.style.setProperty('--shirt', shirts[(h >>> 5) % shirts.length]);
    node.style.setProperty('--skin', skins[(h >>> 7) % skins.length]);
    node.style.setProperty('--hair', hairs[(h >>> 8) % hairs.length]);
    node.style.setProperty('--pants', ['#687b81','#657267','#85756e'][(h >>> 9) % 3]);
    node.innerHTML = '<span class="shadow"></span><span class="figure"><span class="hair"></span><span class="head"></span><span class="body"></span><span class="arm left"></span><span class="arm right"></span><span class="leg left"></span><span class="leg right"></span></span>';
    garden.appendChild(node);
    visitors.set(id, {node, until, leaving: false});
  }
  function leave(id) {
    const entry = visitors.get(id);
    if (!entry || entry.leaving) return;
    entry.leaving = true;
    entry.node.classList.add('leaving');
    setTimeout(() => {
      if (visitors.get(id) === entry) {
        entry.node.remove();
        visitors.delete(id);
      }
    }, 1900);
  }
  function show(people, total, isShared) {
    shared = isShared;
    seenTotal = total;
    const ids = new Set();
    for (const visitor of people) {
      if (!visitor || !/^[0-9a-f-]{36}$/i.test(visitor.id)) continue;
      if (!(visitor.until > Date.now())) continue;
      ids.add(visitor.id);
      const old = visitors.get(visitor.id);
      if (!old) person(visitor.id, visitor.until);
      else if (!old.leaving) old.until = visitor.until;
    }
    for (const id of visitors.keys()) if (!ids.has(id)) leave(id);
    label();
  }
  function localOnly() {
    const people = activeMe() ? [{id: me.id, until: me.startedAt + TTL}] : [];
    show(people, people.length, false);
  }
  async function fetchPresence(method) {
    const response = await fetch('/api/presence', {
      method,
      cache: 'no-store',
      headers: method === 'POST' ? {'Content-Type':'application/json'} : {},
      body: method === 'POST' ? JSON.stringify({id:me.id}) : undefined
    });
    if (!response.ok) throw new Error(`Presence API: ${response.status}`);
    const result = await response.json();
    if (!result.ready || !Array.isArray(result.visitors) || !Number.isFinite(result.serverTime)) throw new Error('Presence not configured');
    return result;
  }
  function applyServer(result) {
    const received = Date.now();
    const people = result.visitors.map(v => ({id:v.id, until:received + Math.max(0, v.expiresAt - result.serverTime)}));
    show(people, Math.max(0, Number(result.count) || 0), true);
  }
  async function sync() {
    if (syncing || document.hidden) return;
    syncing = true;
    try {
      // One arrival per tab; refreshing during the first five minutes retains the same person.
      const method = activeMe() && !joined ? 'POST' : 'GET';
      const result = await fetchPresence(method);
      if (method === 'POST') joined = true;
      applyServer(result);
    } catch (_) { localOnly(); }
    finally { syncing = false; }
  }
  // Smooth exit begins shortly before the five-minute expiry, even between polls.
  setInterval(() => { for (const [id, item] of visitors) if (!item.leaving && Date.now() >= item.until - 1900) leave(id); }, 800);
  setInterval(sync, INTERVAL);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  document.getElementById('lang')?.addEventListener('click', label);
  localOnly();
  sync();
})();