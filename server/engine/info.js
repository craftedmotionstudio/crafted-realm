'use strict';
/* ============ info — what each client learns this tick ============
 * The per-tick delta each player receives (World.processInfo): their own state, and the players,
 * NPCs and ground items within 15 tiles, as add / update / delete lists — the job the 2004 player-
 * and npc-info packets do (Lost City engine, MIT: src/engine/World.ts processInfo; view distance 15,
 * at most 255 players). Ground items respect ownership (private loot is only sent to its owner).
 * The message shape is specified in docs/rebuild/NET_PROTOCOL.md ("tick").
 */
const VIEW = 15;
const MAX_PLAYERS_VISIBLE = 255;
const MAX_NPCS_VISIBLE = 255;

function within(p, e) { return e.level === p.level && Math.abs(e.x - p.x) <= VIEW && Math.abs(e.z - p.z) <= VIEW; }
function hpPair(e) { return [e.hp, e.maxHp]; }
function faceRef(e) { const t = e.target; if (!t || t.uid != null) return null; return t.nid != null ? ['n', t.nid] : ['p', t.pid]; }
function appearanceKey(q, tick) { return q.appearanceVersion + '|' + (q.skullUntil > tick ? 1 : 0) + '|' + (q.overhead() || '') + '|' + q.combatLevel(); }

function playerSnapshot(q, tick) {
  const s = { i: q.pid, nm: q.name, x: q.x, z: q.z, cb: q.combatLevel(), eq: q.appearance(), sk: q.skullUntil > tick ? 1 : 0, oh: q.overhead(), hp: hpPair(q), f: faceRef(q) };
  if (q.look) s.lk = q.look;                // W2: character-kit look
  if (q.dead) s.dd = 1;                     // W2: lying dead right now (a late viewer draws the body, not a live player)
  return thisTick(q, s);
}
/** W2: an entity that comes into view in the middle of a swing (or a hit) carries this tick's animation and hits */
function thisTick(e, s) { if (e.anim) s.a = e.anim; if (e.hits.length) s.h = e.hits.map((h) => [h.amount, h.type]); return s; }
function npcSnapshot(n) { const s = { i: n.nid, ty: n.typeId, x: n.x, z: n.z, hp: hpPair(n), f: faceRef(n) }; if (n.size > 1) s.sz = n.size; return thisTick(n, s); }

/** movement + masks shared by player and npc updates; returns null when nothing changed */
function commonUpdate(e, id) {
  const u = { i: id };
  let any = false;
  if (e.steps.length || e.tele) { u.x = e.x; u.z = e.z; any = true; if (e.tele) u.tele = 1; else u.mv = e.steps.slice(); }
  if (e.anim) { u.a = e.anim; any = true; }
  if (e.hits.length) { u.h = e.hits.map((h) => [h.amount, h.type]); u.hp = hpPair(e); any = true; }
  if (e.chat) { u.c = e.chat; any = true; }
  if (e.faceChanged) { u.f = faceRef(e); any = true; }
  return any ? u : null;
}

function buildTick(w, p) {
  const tick = w.tick;
  const msg = { t: 'tick', n: tick };

  // ---- self ----
  const me = { x: p.x, z: p.z };
  if (p.tele) me.tele = 1; else if (p.steps.length) me.mv = p.steps.slice();
  if (p.anim) me.a = p.anim;
  if (p.hits.length) me.h = p.hits.map((h) => [h.amount, h.type]);
  if (p.chat) me.c = p.chat;
  if (p.faceChanged) me.f = faceRef(p);    // W2: who you now face/attack (auto-retaliate, follow)
  // status block: sent whenever any value in it changes (energy in whole percents)
  const wl = p.wildLevel(), multi = p.inMulti() ? 1 : 0, skull = Math.max(0, p.skullUntil - tick), cb = p.combatLevel();
  const pp = [p.cur('Prayer'), p.base('Prayer')];
  const caf = Math.max(0, (p.caffeinatedUntil || 0) - tick);
  const sig = [p.hp, p.maxHp, pp[0], pp[1], Math.floor(p.runEnergy / 100), wl, multi, skull > 0 ? 1 : 0, cb, caf > 0 ? 1 : 0].join('|');
  if (p.out.selfDirty || sig !== p.lastSeen.sig) {
    me.hp = hpPair(p); me.pp = pp; me.en = p.runEnergy; me.wl = wl; me.multi = multi; me.skull = skull; me.cb = cb; me.caf = caf;
    p.lastSeen.sig = sig;
    p.out.selfDirty = false;
  }
  msg.me = me;

  // ---- players ----
  const seenP = [];
  for (const zone of w.zones.zonesAround(p.level, p.x, p.z, VIEW)) {
    for (const q of zone.players) if (q !== p && q.active && within(p, q)) seenP.push(q);
  }
  seenP.sort((a, b) => a.pid - b.pid);
  if (seenP.length > MAX_PLAYERS_VISIBLE) seenP.length = MAX_PLAYERS_VISIBLE;
  const pl = { add: [], upd: [], del: [] };
  const nowP = new Set(seenP);
  for (const [pid, rec] of p.view.players) if (!nowP.has(rec)) { pl.del.push(pid); p.view.players.delete(pid); p.view.pver.delete(pid); }
  for (const q of seenP) {
    const ak = appearanceKey(q, tick);
    if (!p.view.players.has(q.pid)) {
      pl.add.push(playerSnapshot(q, tick));
      p.view.players.set(q.pid, q); p.view.pver.set(q.pid, ak);
      continue;
    }
    let u = commonUpdate(q, q.pid);
    if (p.view.pver.get(q.pid) !== ak) {
      u = u || { i: q.pid };
      u.eq = q.appearance(); u.sk = q.skullUntil > tick ? 1 : 0; u.oh = q.overhead(); u.cb = q.combatLevel();
      if (q.look) u.lk = q.look;
      p.view.pver.set(q.pid, ak);
    }
    if (u) pl.upd.push(u);
  }
  if (pl.add.length || pl.upd.length || pl.del.length) msg.pl = pl;

  // ---- npcs ----
  const seenN = [];
  for (const zone of w.zones.zonesAround(p.level, p.x, p.z, VIEW)) {
    for (const n of zone.npcs) if (n.active && within(p, n)) seenN.push(n);
  }
  seenN.sort((a, b) => a.nid - b.nid);
  if (seenN.length > MAX_NPCS_VISIBLE) seenN.length = MAX_NPCS_VISIBLE;
  const np = { add: [], upd: [], del: [] };
  const nowN = new Set(seenN);
  for (const [nid, n] of p.view.npcs) if (!nowN.has(n)) { np.del.push(nid); p.view.npcs.delete(nid); }
  for (const n of seenN) {
    if (!p.view.npcs.has(n.nid)) { np.add.push(npcSnapshot(n)); p.view.npcs.set(n.nid, n); continue; }
    const u = commonUpdate(n, n.nid);
    if (u) np.upd.push(u);
  }
  if (np.add.length || np.upd.length || np.del.length) msg.np = np;

  // ---- ground items ----
  const ob = { add: [], del: [] };
  const nowO = new Map();
  for (const zone of w.zones.zonesAround(p.level, p.x, p.z, VIEW)) {
    for (const o of zone.objs) if (within(p, o) && o.visibleTo(p.key, tick)) nowO.set(o.uid, o);
  }
  for (const [uid] of p.view.objs) if (!nowO.has(uid)) { ob.del.push(uid); p.view.objs.delete(uid); }
  for (const [uid, o] of nowO) {
    const prev = p.view.objs.get(uid);
    if (!prev || prev.q !== o.qty) {
      const a = { i: uid, id: o.id, q: o.qty, x: o.x, z: o.z };
      if (o.owner === p.key && !o.isPublic(tick)) { a.own = 1; a.pub = o.revealTick - tick; }   // W2: yours alone for pub more ticks
      ob.add.push(a); p.view.objs.set(uid, { o, q: o.qty });
    }
  }
  if (ob.add.length || ob.del.length) msg.ob = ob;

  // ---- own panels ----
  if (p.out.fx.length) { msg.fx = p.out.fx; p.out.fx = []; }
  if (p.out.invDirty) { msg.inv = p.inv.map((s) => (s ? [s.id, s.qty] : null)); p.out.invDirty = false; }
  if (p.out.equipDirty) { msg.eq = p.appearance(); p.out.equipDirty = false; }
  if (p.out.stats.size) {
    msg.st = {};
    for (const sk of p.out.stats) msg.st[sk] = [p.xp10[sk], p.base(sk), p.cur(sk)];
    p.out.stats.clear();
  }
  if (p.out.prayersDirty) { msg.pr = Array.from(p.prayers); p.out.prayersDirty = false; }
  if (p.out.settingsDirty) {
    msg.set = { run: p.runEnabled ? 1 : 0, style: p.styleIndex, ar: p.autoRetaliate ? 1 : 0, ac: p.autocast, spec: p.specEnergy, specOn: p.specArmed ? 1 : 0 };
    p.out.settingsDirty = false;
  }
  if (p.out.msgs.length) { msg.msg = p.out.msgs; p.out.msgs = []; }
  if (p.out.death) { msg.death = p.out.death; p.out.death = null; }   // W2: what you kept and who beat you
  return msg;
}

module.exports = { buildTick, VIEW, faceRef };
