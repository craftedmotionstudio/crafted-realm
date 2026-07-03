/* ================= MAGIC SPELLBOOK =================
   Extracted verbatim from game3_systems.js (GOAL.md §15 "split the big three").
   PURE MOVE — no logic change. Holds the SPELLS data table and the utility-cast
   helpers (alchemy / curse / teleport). Loaded AFTER game3_systems.js and BEFORE
   game4_ui.js: every reference to SPELLS / castAlchemy / castCurse / castTeleport
   is at RUNTIME (inside functions), so the cross-file const binding resolves fine.
   Combat casting (playerAttack) still lives in game3_systems.js and reads SPELLS
   by name at runtime — the OSRS-exact rolls are untouched. */

/* ---------- the Spellbook — strike and bolt tiers from the classics ---------- */
const SPELLS = {
  wind_strike: {name:'Wind Strike',  req:1,  max:2,  baseXp:5.5,  icon:'\u{1F32C}',  color:0xc8d8e8, runes:{air_rune:1, mind_rune:1}},
  water_strike:{name:'Water Strike', req:5,  max:4,  baseXp:7.5,  icon:'\u{1F4A7}', color:0x4a8ac8, runes:{water_rune:1, air_rune:1, mind_rune:1}},
  earth_strike:{name:'Earth Strike', req:9,  max:6,  baseXp:9.5,  icon:'\u{1FAA8}', color:0x8a6a3a, runes:{earth_rune:2, air_rune:1, mind_rune:1}},
  fire_strike: {name:'Fire Strike',  req:13, max:8,  baseXp:11.5, icon:'\u{1F525}', color:0xe87a2e, runes:{fire_rune:3, air_rune:2, mind_rune:1}},
  wind_bolt:   {name:'Wind Bolt',    req:17, max:9,  baseXp:13.5, icon:'\u{1F300}', color:0x9ab8d8, runes:{air_rune:2, chaos_rune:1}},
  water_bolt:  {name:'Water Bolt',   req:23, max:10, baseXp:16.5, icon:'\u{1F30A}', color:0x2a6ac8, runes:{water_rune:2, air_rune:2, chaos_rune:1}},
  earth_bolt:  {name:'Earth Bolt',   req:29, max:11, baseXp:19.5, icon:'⛰',    color:0x6a4a2a, runes:{earth_rune:3, air_rune:2, chaos_rune:1}},
  fire_bolt:   {name:'Fire Bolt',    req:35, max:12, baseXp:22.5, icon:'☄',    color:0xd84a1e, runes:{fire_rune:4, air_rune:3, chaos_rune:1}},
  wind_blast:  {name:'Wind Blast',   req:41, max:13, baseXp:25.5, icon:'\u{1F32A}', color:0x8ab0d0, runes:{air_rune:3, spark_rune:1}},
  water_blast: {name:'Water Blast',  req:47, max:14, baseXp:28.5, icon:'\u{1F30A}', color:0x1a5ac0, runes:{water_rune:3, air_rune:3, spark_rune:1}},
  earth_blast: {name:'Earth Blast',  req:53, max:15, baseXp:31.5, icon:'\u{1F5FB}', color:0x5a3e22, runes:{earth_rune:4, air_rune:3, spark_rune:1}},
  confuse:     {name:'Confuse', req:3,  utility:'curse', stat:'att', cut:0.95, baseXp:13, icon:'\u{1F4AB}', color:0x8a8aa8, runes:{body_rune:1, water_rune:3, earth_rune:2}},
  weaken:      {name:'Weaken',  req:11, utility:'curse', stat:'str', cut:0.95, baseXp:21, icon:'\u{1F4C9}', color:0x6a8a6a, runes:{body_rune:1, water_rune:3, earth_rune:2}},
  home_tele:    {name:'Veyhollow Teleport',  req:1,  utility:'teleport', dest:'commons',  cd:60, icon:'\u{1F3E0}', baseXp:0,  runes:{}},
  tele_quarry:  {name:'Stonereach Teleport', req:14, utility:'teleport', dest:'quarry',   cd:4,  icon:'⛏',     baseXp:35, runes:{air_rune:3, earth_rune:1, mind_rune:1}},
  tele_gloomfen:{name:'Gloomfen Teleport',   req:25, utility:'teleport', dest:'gloomfen', cd:4,  icon:'\u{1F311}',  baseXp:46, runes:{air_rune:3, water_rune:1, mind_rune:1}},
  tele_brynholt:{name:'Brynholt Teleport',   req:38, utility:'teleport', dest:'brynholt', cd:4,  icon:'❄',     baseXp:58, runes:{air_rune:5, mind_rune:1}},
  tele_dunes:   {name:'Ashar Teleport',      req:45, utility:'teleport', dest:'dunes',    cd:4,  icon:'\u{1F3DC}',  baseXp:68, runes:{air_rune:5, fire_rune:2, mind_rune:1}},
  low_alch:    {name:'Low Level Alchemy',  req:21, utility:'alch', mult:0.4, baseXp:31, icon:'\u{1FA99}', runes:{nature_rune:1, fire_rune:3}},
  high_alch:   {name:'High Level Alchemy', req:55, utility:'alch', mult:0.6, baseXp:65, icon:'\u{1F4B0}', runes:{nature_rune:1, fire_rune:5}},
};

/* ---------- utility magic: alchemy and the homeward rite ---------- */
function castAlchemy(invIndex){
  const sp=SPELLS[Player.alchMode]; if(!sp) return false;
  const s=Player.inv[invIndex]; if(!s) return false;
  const def=ITEMS[s.id];
  if(s.id==='coins'){ UI.chat('You cannot transmute coins into coins.','plain'); return false; }
  if(!Player.hasRunes(sp)){ UI.chat('You do not have enough runes to cast this spell.','plain'); Player.alchMode=null; if(UI.refreshSpells) UI.refreshSpells(); return false; }
  Player.spendRunes(sp);
  const worth=Math.max(1, Math.floor((def.value||1)*sp.mult));
  if(def.stack && s.qty>1) s.qty--; else Player.inv[invIndex]=null;
  Player.addItem('coins', worth);
  Player.addXp('Magic', sp.baseXp);
  Player.alchMode=null;
  Sfx.coin();
  UI.chat(`You transmute the ${def.name.toLowerCase()} into ${worth} crowns.`,'xp');
  UI.refreshInv(); if(UI.refreshSpells) UI.refreshSpells();
  return true;
}
function castCurse(sp, npc){
  npc.curses = npc.curses||{};
  if(npc.curses[sp.stat]){ UI.chat('That foe is already weakened there.','plain'); return; }
  Player.spendRunes(sp);
  Player.addXp('Magic', sp.baseXp);
  npc.curses[sp.stat]=true;
  if(sp.stat==='att') npc.t = Object.assign({}, npc.t, {att: Math.max(1, Math.floor(npc.t.att*sp.cut))});
  if(sp.stat==='str') npc.t = Object.assign({}, npc.t, {str: Math.max(1, Math.floor(npc.t.str*sp.cut))});
  Sfx.magicCast();
  fireProjectile('bolt', player, npc, 0, sp.color);
  UI.chat(`Your ${sp.name.toLowerCase()} settles over the ${npc.t.name.toLowerCase()}.`,'xp');
  if(UI.refreshSpells) UI.refreshSpells();
}
function castTeleport(sp){
  sp = sp || SPELLS.home_tele;
  if(Player.teleCd>0){ UI.chat(`Teleporting again must wait ${Math.ceil(Player.teleCd)} more seconds.`,'plain'); return; }
  if(Player.action && Player.action.type==='teleport') return;
  if(sp.runes && Object.keys(sp.runes).length && !Player.hasRunes(sp)){
    UI.chat(`You do not have enough runes to cast ${sp.name}.`,'plain'); return; }
  if(sp.runes && Object.keys(sp.runes).length) Player.spendRunes(sp);
  if(sp.baseXp) Player.addXp('Magic', sp.baseXp);
  Player.action={type:'teleport', t:0, dest:sp.dest||'commons', cd:sp.cd||60, label:sp.name};
  Player.moveTo=null; Player.target=null;
  UI.chat(`You begin the ${sp.name} rite...`,'sys');
}
function castHomeTeleport(){ castTeleport(SPELLS.home_tele); }   // kept for any legacy callers
