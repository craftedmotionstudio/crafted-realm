'use strict';
/* ============ input — client intents, validated and applied in the client-input phase ============
 * The client never changes game state itself; it sends intents (docs/rebuild/NET_PROTOCOL.md) and
 * the world applies them here, during World.processClientsIn, the same place the 2004 engine decodes
 * packets (Lost City, MIT: src/network/game/client/handler/*). Like the engine:
 *   - move clicks and ops set a path / an interaction that the player phase then carries out;
 *   - item ops (eat, wield) run immediately and clear the pending interaction (OpHeldHandler:
 *     clearPendingAction), so eating mid-fight stops your attack until you click again or are hit;
 *   - nothing is accepted from a player who is delayed or dead.
 * Every field is type- and range-checked; a malformed message is dropped and counted.
 */
const C = require('../../shared/combat.js');
const PVP = require('../../shared/pvp.js');
const Player = require('./Player');

const isInt = (v) => Number.isInteger(v);
const CHAT_MAX = 80;
const TELEPORT_DELAY = 2;   // player_teleport_normal: p_delay(2) before the jump

function handle(w, p, msg) {
  const h = HANDLERS[msg.t];
  if (!h) return false;
  return h(w, p, msg) !== false;
}

function canAct(p) { return p.active && !p.dead && !p.delayed; }
function visibleNpc(p, nid) { const n = p.view.npcs.get(nid); return n && n.active && !n.dying ? n : null; }
function visiblePlayer(p, pid) { const t = p.view.players.get(pid); return t && t.active ? t : null; }

const HANDLERS = {
  walk(w, p, m) {
    if (!isInt(m.x) || !isInt(m.z) || !canAct(p)) return false;
    if (!w.collision.inBounds(m.x, m.z)) return false;
    p.clearInteraction();
    p.walkTo(m.x, m.z);
  },
  run(w, p, m) {
    p.runEnabled = !!m.on && p.runEnergy > 0;
    p.out.settingsDirty = true;
  },
  op_npc(w, p, m) {
    if (!isInt(m.nid) || !canAct(p)) return false;
    const npc = visibleNpc(p, m.nid);
    if (!npc || m.op !== 'attack') return false;
    p.setInteraction(npc, 'attack');
    p.pathToPathingTarget();
  },
  op_player(w, p, m) {
    if (!isInt(m.pid) || !canAct(p)) return false;
    const t = visiblePlayer(p, m.pid);
    if (!t || t === p) return false;
    if (m.op === 'attack') p.setInteraction(t, 'attack');
    else if (m.op === 'follow') p.setInteraction(t, 'follow');
    else return false;
    p.pathToPathingTarget();
  },
  cast_npc(w, p, m) {
    if (!isInt(m.nid) || typeof m.spell !== 'string' || !canAct(p)) return false;
    const npc = visibleNpc(p, m.nid);
    if (!npc || !w.content.SPELLS[m.spell]) return false;
    p.setInteraction(npc, 'cast', m.spell);
    p.pathToPathingTarget();
  },
  cast_player(w, p, m) {
    if (!isInt(m.pid) || typeof m.spell !== 'string' || !canAct(p)) return false;
    const t = visiblePlayer(p, m.pid);
    if (!t || t === p || !w.content.SPELLS[m.spell]) return false;
    p.setInteraction(t, 'cast', m.spell);
    p.pathToPathingTarget();
  },
  op_obj(w, p, m) {
    if (!isInt(m.uid) || !canAct(p)) return false;
    const o = p.view.objs.get(m.uid);
    if (!o || w.objs.get(o.uid) !== o || m.op !== 'take') return false;
    p.setInteraction(o, 'take');
    p.pathToPathingTarget();
  },
  eat(w, p, m) {
    if (!isInt(m.slot) || m.slot < 0 || m.slot >= Player.INV_SIZE || !canAct(p)) return false;
    const s = p.inv[m.slot]; const def = s && p.itemDef(s.id);
    if (!def || !(def.heal > 0)) return false;
    p.clearInteraction();
    if (!C.canEat(p.eatDelay, w.tick)) return;
    const t = C.applyEat({ actionDelay: p.actionDelay }, w.tick);
    p.eatDelay = t.eatDelay; p.actionDelay = t.actionDelay;
    p.invSlotRemove(m.slot, 1);
    const before = p.hp;
    p.setLevel('Hitpoints', Math.min(p.maxHp, p.hp + def.heal));
    p.setAnim('eat');
    p.message(`You eat the ${def.name.toLowerCase()}.` + (p.hp > before ? ' It heals some health.' : ''));
  },
  equip(w, p, m) {
    if (!isInt(m.slot) || m.slot < 0 || m.slot >= Player.INV_SIZE || !canAct(p)) return false;
    const s = p.inv[m.slot]; const def = s && p.itemDef(s.id);
    if (!def || !def.equip || Player.EQUIP_SLOTS.indexOf(def.equip) < 0) return false;
    if (def.reqSkill && def.reqLvl && p.base(def.reqSkill) < def.reqLvl) {
      p.message(`You need a ${def.reqSkill} level of ${def.reqLvl} to wear that.`); return;
    }
    p.clearInteraction();
    const slot = def.equip;
    const old = p.equip[slot];
    p.inv[m.slot] = old ? { id: old, qty: 1 } : null;   // swap with whatever was worn
    p.equip[slot] = s.id;
    // an autocast spell only works with a staff in hand
    if (slot === 'weapon' && (!def.style || def.style !== 'magic') && p.autocast) { p.autocast = null; p.out.settingsDirty = true; }
    p.out.invDirty = true; p.out.equipDirty = true; p.appearanceVersion++; p.infoChanged = true; p.invalidate();
  },
  unequip(w, p, m) {
    if (typeof m.slot !== 'string' || Player.EQUIP_SLOTS.indexOf(m.slot) < 0 || !canAct(p)) return false;
    const id = p.equip[m.slot]; if (!id) return false;
    if (!p.invAdd(id, 1)) { p.message('You do not have enough inventory space.'); return; }
    p.equip[m.slot] = null;
    if (m.slot === 'weapon' && p.autocast) { p.autocast = null; p.out.settingsDirty = true; }
    p.out.invDirty = true; p.out.equipDirty = true; p.appearanceVersion++; p.infoChanged = true; p.invalidate();
  },
  drop(w, p, m) {
    if (!isInt(m.slot) || m.slot < 0 || m.slot >= Player.INV_SIZE || !canAct(p)) return false;
    const s = p.inv[m.slot]; if (!s) return false;
    p.clearInteraction();
    p.inv[m.slot] = null; p.out.invDirty = true; p.invalidate();
    w.addObj(s.id, s.qty, p.x, p.z, p.level, p.key);
  },
  style(w, p, m) {
    if (!isInt(m.index) || m.index < 0 || m.index > 3) return false;
    p.styleIndex = m.index; p.out.settingsDirty = true; p.invalidate();
  },
  auto_retaliate(w, p, m) { p.autoRetaliate = !!m.on; p.out.settingsDirty = true; },
  autocast(w, p, m) {
    if (m.spell === null || m.spell === undefined) { p.autocast = null; p.out.settingsDirty = true; return; }
    const sp = typeof m.spell === 'string' && w.content.SPELLS[m.spell];
    if (!sp || sp.max == null || sp.utility) return false;
    const wpn = p.weapon();
    if (!wpn || wpn.style !== 'magic') { p.message('You need a staff to set up autocasting.'); return; }
    if (p.base('Magic') < sp.req) { p.message(`You need a Magic level of ${sp.req} to cast this spell.`); return; }
    p.autocast = m.spell; p.out.settingsDirty = true;
  },
  prayer(w, p, m) {
    const d = typeof m.id === 'string' && C.PRAYERS[m.id];
    if (!d || !canAct(p)) return false;
    if (!m.on) {
      if (p.prayers.delete(m.id)) { if (!p.prayers.size) p.clearTimer('prayer_drain'); p.out.prayersDirty = true; p.infoChanged = true; p.invalidate(); }
      return;
    }
    if (p.prayers.has(m.id)) return;
    if (p.cur('Prayer') < 1) { p.message('You need to recharge your prayer at an altar.'); return; }
    if (p.base('Prayer') < d.level) { p.message(`You need a Prayer level of ${d.level} to use that prayer.`); return; }
    for (const other of C.prayerConflicts(m.id)) p.prayers.delete(other);
    p.prayers.add(m.id);
    if (!p.timers.has('prayer_drain')) p.setTimer('prayer_drain', C.PRAYER_DRAIN_INTERVAL, () => w.prayerDrain(p));
    p.out.prayersDirty = true; p.infoChanged = true; p.invalidate();
  },
  spec(w, p, m) { p.specArmed = !!m.on; p.out.settingsDirty = true; },
  chat(w, p, m) {
    if (typeof m.text !== 'string') return false;
    const text = m.text.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, CHAT_MAX);
    if (!text) return false;
    if (p.lastChatTick === w.tick) return false;   // one line per tick
    p.lastChatTick = w.tick;
    p.chat = text; p.infoChanged = true;
    w.log('chat', { key: p.key, text });
  },
  teleport(w, p, m) {
    if (!canAct(p)) return false;
    const sp = typeof m.spell === 'string' && w.content.SPELLS[m.spell];
    if (!sp || sp.utility !== 'teleport') return false;
    if (p.base('Magic') < sp.req) { p.message(`You need a Magic level of ${sp.req} to cast this spell.`); return; }
    if (!PVP.canTeleport(p.wildLevel())) { p.message('A dark force pulls at you: teleports fail this deep in the Scarlands.'); return; }
    for (const r in sp.runes || {}) if (p.invCount(r) < sp.runes[r]) { p.message('You do not have enough runes to cast this spell.'); return; }
    for (const r in sp.runes || {}) p.invRemove(r, sp.runes[r]);
    p.clearInteraction(); p.clearWaypoints();
    p.setAnim('teleport');
    p.delayed = true; p.delayedUntil = w.tick + TELEPORT_DELAY;
    w.schedule(TELEPORT_DELAY, () => {
      if (!p.active || p.dead) return;
      const r = w.teleportDestination(sp.dest);
      p.teleport(r.x, r.z, r.level);
    });
  },
  logout(w, p) { p.requestLogout = true; },
  ping() { /* keeps lastResponse fresh */ },
};

module.exports = { handle, HANDLERS };
