/* ================= PLAYER & SYSTEMS ================= */
/* ---------- the Prayer book ----------
   Names, order and pictures for the interface. The RULES (level, group, percent, the 2004 drain effect) live in
   shared/combat.js PRAYERS and are applied by the combat engine (src/combat_engine.js); req/drain/boost here mirror
   them for display only. Protect Item (2004, level 25) keeps one more item on death. */
const PRAYERS = {
  thick_skin:    {name:'Thick Skin',           req:1,  icon:'\u{1F6E1}',  drain:3,  group:'def', boost:{def:1.05}},
  burst_str:     {name:'Burst of Strength',    req:4,  icon:'\u{1F4AA}',  drain:3,  group:'str', boost:{str:1.05}},
  clarity:       {name:'Clarity of Thought',   req:7,  icon:'\u{1F3AF}',  drain:3,  group:'att', boost:{att:1.05}},
  sharp_eye:     {name:'Sharp Eye',            req:8,  icon:'\u{1F3F9}',  drain:3,  group:'rng', boost:{rng:1.05}},
  mystic_will:   {name:'Mystic Will',          req:9,  icon:'\u{1F52E}',  drain:3,  group:'mag', boost:{mag:1.05}},
  rock_skin:     {name:'Rock Skin',            req:10, icon:'\u{1FAA8}',  drain:6,  group:'def', boost:{def:1.10}},
  superhuman:    {name:'Superhuman Strength',  req:13, icon:'\u26A1',     drain:6,  group:'str', boost:{str:1.10}},
  reflexes:      {name:'Improved Reflexes',    req:16, icon:'\u{1F441}',  drain:6,  group:'att', boost:{att:1.10}},
  protect_item:  {name:'Protect Item',         req:25, icon:'\u{1F512}',  drain:2,  group:null},
  hawk_eye:      {name:'Hawk Eye',             req:26, icon:'\u{1F985}',  drain:6,  group:'rng', boost:{rng:1.10}},
  mystic_lore:   {name:'Mystic Lore',          req:27, icon:'\u2728',     drain:6,  group:'mag', boost:{mag:1.10}},
  steel_skin:    {name:'Steel Skin',           req:28, icon:'\u{1F9F1}',  drain:12, group:'def', boost:{def:1.15}},
  ultimate_str:  {name:'Ultimate Strength',    req:31, icon:'\u{1F4A5}',  drain:12, group:'str', boost:{str:1.15}},
  incredible_ref:{name:'Incredible Reflexes',  req:34, icon:'\u{1F3AF}',  drain:12, group:'att', boost:{att:1.15}},
  protect_magic: {name:'Protect from Magic',   req:37, icon:'\u{1F535}',  drain:12, group:'overhead', protect:'magic',  over:0x3a6ab0},
  protect_range: {name:'Protect from Missiles',req:40, icon:'\u{1F7E2}',  drain:12, group:'overhead', protect:'ranged', over:0x4a9a3a},
  protect_melee: {name:'Protect from Melee',   req:43, icon:'\u{1F534}',  drain:12, group:'overhead', protect:'melee',  over:0xb03a3a},
};

/* ---------- Smithing, Fletching, Thieving — the 2006 trades, our way ---------- */
const SMELTS = {
  bronze_bar: {name:'Bronze bar', req:1,  xp:8,  needs:{copper_ore:1, tin_ore:1}},
  iron_bar:   {name:'Iron bar',   req:15, xp:16, needs:{iron_ore:1}},
  steel_bar:  {name:'Steel bar',  req:30, xp:24, needs:{iron_ore:1, coal:2}},
};
const SMITHABLES = {
  bronze_bar: [
    {id:'bronze_sword', name:'Bronze sword', req:1,  bars:1},
    {id:'bronze_helm',  name:'Bronze helm',  req:3,  bars:1},
    {id:'bronze_tips',  name:'Bronze arrowtips (x12)', req:5, bars:1, qty:12},
    {id:'bronze_legs',  name:'Bronze platelegs', req:8, bars:2},
    {id:'bronze_kiteshield', name:'Bronze kiteshield', req:11, bars:2},
    {id:'bronze_plate', name:'Bronze platebody', req:14, bars:3},
  ],
  iron_bar: [
    {id:'iron_sword', name:'Iron sword', req:15, bars:1},
    {id:'iron_helm',  name:'Iron helm',  req:17, bars:1},
    {id:'iron_tips',  name:'Iron arrowtips (x12)', req:20, bars:1, qty:12},
    {id:'iron_platelegs', name:'Iron platelegs', req:22, bars:2},
    {id:'iron_kiteshield', name:'Iron kiteshield', req:25, bars:2},
    {id:'iron_platebody', name:'Iron platebody', req:28, bars:3},
  ],
  steel_bar: [
    {id:'steel_sword', name:'Steel sword', req:30, bars:1},
    {id:'steel_helm',  name:'Steel helm',  req:32, bars:1},
    {id:'steel_platelegs', name:'Steel platelegs', req:37, bars:2},
    {id:'steel_kiteshield', name:'Steel kiteshield', req:40, bars:2},
    {id:'steel_platebody', name:'Steel platebody', req:43, bars:3},
  ],
};
const SMITH_XP = {bronze_bar:13, iron_bar:25, steel_bar:37};   // per bar worked
const FLETCHABLES = [
  {id:'arrow_shafts', name:'Arrow shafts (x15)', req:1,  xp:5,  qty:15},
  {id:'worn_bow',     name:'Worn shortbow',      req:5,  xp:10, qty:1},
  {id:'ash_bow',      name:'Ash shortbow',       req:20, xp:25, qty:1},
];
const PICKPOCKETS = {
  wanderer: {req:1,  xp:8,  coins:[1,5],   fail:0.25, stun:3, name:'townsfolk'},
  monk:     {req:8,  xp:15, coins:[4,9],   fail:0.3,  stun:3, name:'monk'},
  wizard:   {req:20, xp:26, coins:[8,18],  fail:0.35, stun:4, name:'wizard'},
  hold_knight:{req:35, xp:48, coins:[20,50], fail:0.4, stun:5, name:'knight'},
};
const STALL_KINDS = {
  baker:  {req:5,  xp:16, loot:[['bread',1]], respawn:9,  label:'Baker\u2019s stall'},
  silver: {req:20, xp:34, loot:[['silver_trinket',1]], respawn:16, label:'Silversmith\u2019s stall'},
  spice:  {req:30, xp:48, loot:[['coins',24]], respawn:22, label:'Spice stall'},
};

/* ---------- the Spellbook (SPELLS) + utility-cast helpers live in src/magic_spells.js ---------- */

const Player = {
  xp:{}, hp:10, maxHp:10,
  inv: new Array(28).fill(null),   // 2004 backpack: 28 slots (saves from the 24-slot pack are padded on load)
  bank: [],
  equip:{head:null, body:null, legs:null, weapon:null, shield:null, amulet:null, cape:null, hands:null, feet:null},
  quests:{},
  action:null, target:null, moveTo:null, speed:4.2, attackCd:0,
  castMode:false,
  init(){
    SKILLS.forEach(s=>this.xp[s]=0);
    this.xp.Hitpoints = XP_TABLE[10];
    this.maxHp = 10; this.hp = 10;
    // new adventurers start empty-handed — Guide Bram provides the tutorial kit
    this.addItem('coins',5);
  },
  lvl(s){ return levelFromXp(this.xp[s]); },
  energy:100, runOn:true, _regenT:0,
  prayerPts:1, activePrayers:new Set(),
  spell:null, alchMode:null, teleCd:0, stunT:0, caffeinated:0,
  hasSpace(){ return this.inv.some(s=>!s); },
  staffProvides(){ const w=this.equip.weapon; return (w && ITEMS[w].provides) || null; },
  hasRunes(spell){
    for(const r in spell.runes){
      if(this.staffProvides()===r) continue;
      if(this.count(r) < spell.runes[r]) return false;
    }
    return true;
  },
  spendRunes(spell){
    for(const r in spell.runes){
      if(this.staffProvides()===r) continue;
      this.removeItem(r, spell.runes[r]);
    }
  },
  selectSpell(id){
    const sp=SPELLS[id]; if(!sp) return false;
    if(this.lvl('Magic')<sp.req){ UI.chat(`You need a Magic level of ${sp.req} to cast ${sp.name}.`,'plain'); return false; }
    // combat spells: autocast with a staff, else armed for one cast on the next foe clicked (2004); src/combat_engine.js
    if(!sp.utility && sp.max!=null && typeof LocalCombat!=='undefined' && LocalCombat.ready()){
      const r=LocalCombat.selectSpell(id);
      if(UI.refreshSpells) UI.refreshSpells(); UI.refreshEquip(); if(UI.refreshCombat) UI.refreshCombat();
      return r;
    }
    if(sp.utility==='teleport'){ castTeleport(sp); return true; }
    if(sp.utility==='curse'){
      if(!this.target || this.target.dead){ UI.chat('Choose a foe first, then cast the curse.','plain'); return false; }
      if(!this.hasRunes(sp)){ UI.chat('You do not have enough runes to cast this spell.','plain'); return false; }
      castCurse(sp, this.target);
      return true;
    }
    if(sp.utility==='alch'){
      if(!this.hasRunes(sp)){ UI.chat('You do not have enough runes to cast this spell.','plain'); return false; }
      this.alchMode = this.alchMode===id ? null : id;
      UI.chat(this.alchMode ? `You ready ${sp.name} — choose an item in your pack to transmute.` : 'You lower your hand.','sys');
      if(UI.refreshSpells) UI.refreshSpells(); UI.refreshInv();
      return true;
    }
    // combat spell: toggle autocast
    this.spell = this.spell===id ? null : id;
    this.castMode = !!this.spell;
    UI.chat(this.spell ? `Autocast set: ${sp.name}.` : 'Autocast cleared.','sys');
    if(UI.refreshSpells) UI.refreshSpells(); UI.refreshEquip();
    return true;
  },
  maxPrayer(){ return Math.max(1, this.lvl('Prayer')); },
  prayerMult(k){
    let m=1;
    this.activePrayers.forEach(id=>{ const p=PRAYERS[id]; if(p.boost && p.boost[k]) m*=p.boost[k]; });
    return m;
  },
  protectedFrom(style){
    for(const id of this.activePrayers){ const p=PRAYERS[id]; if(p.protect===style) return true; }
    return false;
  },
  togglePrayer(id){
    if(typeof LocalCombat!=='undefined' && LocalCombat.ready()) return LocalCombat.togglePrayer(id);   // 2004 rules (shared/combat.js)
    const p=PRAYERS[id]; if(!p) return false;
    if(this.lvl('Prayer')<p.req){ UI.chat(`You need a Prayer level of ${p.req} to use ${p.name}.`,'plain'); return false; }
    if(this.activePrayers.has(id)) this.activePrayers.delete(id);
    else {
      if(this.prayerPts<=0){ UI.chat('You have run out of prayer points; you must recharge at an altar.','plain'); return false; }
      // prayers of the same kind replace one another, like the classics
      for(const other of [...this.activePrayers]) if(PRAYERS[other].group===p.group) this.activePrayers.delete(other);
      this.activePrayers.add(id);
    }
    if(typeof refreshOverhead==='function') refreshOverhead();
    UI.refreshHud(); if(UI.refreshPrayers) UI.refreshPrayers();
    return true;
  },
  prayBonus(){
    let b=0;
    Object.values(this.equip).forEach(e=>{ if(e && ITEMS[e].prayB) b+=ITEMS[e].prayB; });
    return b;
  },
  tickPrayers(dt){
    if(typeof LocalCombat!=='undefined' && LocalCombat.ready()) return;   // the engine drains by the 2004 counter every 5 ticks
    if(!this.activePrayers.size) return;
    let drain=0; this.activePrayers.forEach(id=>drain+=PRAYERS[id].drain);
    drain *= 60/(60 + 2*this.prayBonus());   // worn devotion stretches every point, like the classics
    this.prayerPts = Math.max(0, this.prayerPts - drain*dt/60);
    if(this.prayerPts<=0){
      this.activePrayers.clear();
      if(typeof refreshOverhead==='function') refreshOverhead();
      UI.chat('You have run out of prayer points; you must recharge at an altar.','combat');
      UI.refreshHud(); if(UI.refreshPrayers) UI.refreshPrayers();
    }
  },
  weight(){
    let w=0;
    this.inv.forEach(s=>{ if(s) w += (ITEMS[s.id].weight||0) * (ITEMS[s.id].stack?1:s.qty); });
    Object.values(this.equip).forEach(e=>{ if(e) w += ITEMS[e].weight||0; });
    return Math.min(64, Math.max(0, w));
  },
  tickVitals(dt, moving){
    // run energy: drains while running, scaled by weight; walking is free (OSRS)
    // Tutor's Holm pacing (play review 2026-09-10): the 543-tile required route emptied the bar by the bank
    // and the switchback was walked at 2.4 tiles/s. The island is a teaching route, not an endurance test,
    // so the Holm drains at a quarter rate and regenerates three times faster. Mainland rules are untouched.
    const holmPace = (typeof CRWorldMode!=='undefined' && CRWorldMode.providerId==='tutors-holm-v2');
    // coffee (shared/drinks.js): while caffeinated, running drains 25% slower
    const caf = (this.caffeinated>0 && typeof CRShared!=='undefined' && CRShared.drinks) ? CRShared.drinks.DRINKS.coffee.drainMult : 1;
    if(moving && this.runOn && this.energy>0){
      this.energy = Math.max(0, this.energy - dt*caf*(1.4 + 2.2*(this.weight()/64))*(holmPace?0.25:1));
      if(this.energy<=0){ this.runOn=false; UI.chat("You've run out of energy and slow to a walk.",'plain'); UI.refreshRun(); }
    } else if(this.energy<100){
      this.energy = Math.min(100, this.energy + dt*0.9*(holmPace?3:1));
    }
    this.tickPrayers(dt);
    if(this.teleCd>0) this.teleCd=Math.max(0, this.teleCd-dt);
    if(this.stunT>0) this.stunT=Math.max(0, this.stunT-dt);
    if(this.caffeinated>0){ this.caffeinated=Math.max(0, this.caffeinated-dt); if(this.caffeinated===0) UI.chat('The coffee wears off.','plain'); }
    // special-attack energy regenerates +10% every 30s (OSRS), i.e. +1% per 3s
    this.specT=(this.specT||0)+dt;
    if(this.specT>=3){ this.specT-=3; if(this.spec<100){ this.spec=Math.min(100,(this.spec||0)+1); if(UI.refreshSpec) UI.refreshSpec(); } }
    // (hitpoint regen lives in Player.regen — already 1 hp/min, OSRS-correct)
  },
  moveSpeed(){ return (this.runOn && this.energy>0) ? 4.2 : 2.4; },
  combatLevel(){
    if(typeof CRShared!=='undefined' && CRShared.combat)   // the 2004 integer form (shared/combat.js)
      return CRShared.combat.combatLevel({attack:this.lvl('Attack'),strength:this.lvl('Strength'),defence:this.lvl('Defence'),
        hitpoints:this.lvl('Hitpoints'),prayer:this.lvl('Prayer'),ranged:this.lvl('Ranged'),magic:this.lvl('Magic')});
    const base = 0.25*(this.lvl('Defence')+this.lvl('Hitpoints')+Math.floor(this.lvl('Prayer')/2));
    const melee = 0.325*(this.lvl('Attack')+this.lvl('Strength'));
    const rng = 0.325*Math.floor(this.lvl('Ranged')*1.5);
    const mag = 0.325*Math.floor(this.lvl('Magic')*1.5);
    return Math.max(3, Math.floor(base + Math.max(melee,rng,mag)));
  },
  regenT:0,
  regen(dt){          // OSRS-style passive regen: 1 hp per minute
    this.regenT += dt;
    if(this.regenT >= 60){ this.regenT = 0;
      if(this.hp < this.maxHp){ this.hp++; UI.refreshHud(); } }
  },
  addXp(s, amt){
    // data-driven progression knobs (double-XP events, per-skill rates, fatigue)
    if(typeof GameConfig!=='undefined'){ amt*=GameConfig.xpMult(s); GameConfig.onXp(amt); }
    if(amt<=0) return;
    const before = this.lvl(s);
    this.xp[s]+=amt;
    UI.xpDrop(s, amt);
    const after = this.lvl(s);
    if(after>before){
      UI.chat(`Congratulations, you just advanced ${/^[aeiou]/i.test(s)?'an':'a'} ${s} level. You are now level ${after}.`,'xp');
      if(s==='Hitpoints'){ this.maxHp=after; this.hp=Math.min(this.hp+1,this.maxHp); }
      Sfx.level();
      if(typeof Events!=='undefined') Events.emit('levelUp', {skill:s, level:after});
    }
    if(typeof Events!=='undefined') Events.emit('xp', {skill:s, amt});
    UI.refreshSkills(); UI.refreshHud();
  },
  addItem(id, qty=1){
    const def=ITEMS[id];
    if(!def){ console.error('addItem: unknown item id "'+id+'"'); return false; }
    if(def.stack){
      const slot=this.inv.find(s=>s&&s.id===id);
      if(slot){ slot.qty+=qty; UI.refreshInv(); return true; }
      const i=this.inv.findIndex(s=>s===null);
      if(i===-1){ UI.chat('Your pack is full.','plain'); return false; }
      this.inv[i]={id,qty}; UI.refreshInv(); return true;
    }
    for(let n=0;n<qty;n++){
      const i=this.inv.findIndex(s=>s===null);
      if(i===-1){ UI.chat('Your pack is full.','plain'); return false; }
      this.inv[i] = {id, qty:1};
    }
    UI.refreshInv(); return true;
  },
  removeItem(id, qty=1){
    for(let i=0;i<this.inv.length && qty>0;i++){
      const s=this.inv[i]; if(!s||s.id!==id) continue;
      if(s.qty>qty){ s.qty-=qty; qty=0; }
      else { qty-=s.qty; this.inv[i]=null; }
    }
    UI.refreshInv();
    return qty===0;
  },
  count(id){ return this.inv.reduce((a,s)=>a+(s&&s.id===id?s.qty:0),0); },
  hasTool(t){ return this.inv.some(s=>s&&ITEMS[s.id].tool===t) ||
                     Object.values(this.equip).some(e=>e&&ITEMS[e].tool===t); },
  // the family the wielded setup fights with: 'magic' while a staff autocasts (2004: autocast needs a staff)
  weaponStyle(){
    if(typeof LocalCombat!=='undefined' && LocalCombat.ready() && LocalCombat.autocastSpell()) return 'magic';
    const w=this.equip.weapon; return w?ITEMS[w].style||'melee':'melee'; },
  // one combat-style index for every weapon, clamped to the wielded category's buttons (2004 com_mode);
  // the buttons per category are shared/combat.js CATEGORY_STYLES
  styleIndex:0, autocast:null, castSpell:null,
  autoRetaliate:true,
  spec:100, specArmed:false, specT:0,
  curStyle(){ return (typeof LocalCombat!=='undefined' && LocalCombat.ready()) ? LocalCombat.style() : {label:'Punch', style:'accurate', type:'crush'}; },
  weaponSpeed(){            // seconds: the 2004 attack delay in ticks (rapid -1, magic 5) times the tick
    const ticks=(typeof LocalCombat!=='undefined' && LocalCombat.ready()) ? LocalCombat.attackDelay() : 4;
    return ticks*TICK; },
  _sumBonus(field){
    let t=0;
    for(const k in this.equip){ const v=this.equip[k];
      if(v && ITEMS[v][field]) t+=ITEMS[v][field]; }
    return t;
  },
  // stab/slash/crush split: gear may carry per-type bonuses (aStab/aSlash/aCrush,
  // dStab/dSlash/dCrush). When a piece has none, we fall back to the flat aBonus/dBonus,
  // so any gear without the split is numerically identical to before. `type` is null for ranged/magic.
  _sumTyped(prefix, flat, type){
    const key = type ? prefix + type[0].toUpperCase() + type.slice(1) : null;
    let t=0;
    for(const k in this.equip){ const v=this.equip[k]; if(!v) continue; const it=ITEMS[v];
      const per = key ? it[key] : undefined;
      t += (per!==undefined && per!==null) ? per : (it[flat]||0); }
    return t;
  },
  atkBonus(type){ return this._sumTyped('a','aBonus', type); },
  strBonus(){ return this._sumBonus('sBonus'); },
  defBonus(type){ return this._sumTyped('d','dBonus', type); },
  magBonus(){ return this._sumBonus('mBonus') + (this.equip.weapon && ITEMS[this.equip.weapon].style==='magic' ? ITEMS[this.equip.weapon].aBonus||0 : 0); },
  bestToolPower(t){
    let p=0;
    const scan=id=>{ const d=ITEMS[id]; if(d.tool===t && d.power>p) p=d.power; };
    this.inv.forEach(s=>{ if(s) scan(s.id); });
    Object.values(this.equip).forEach(e=>{ if(e) scan(e); });
    return p;   // 0 = no tool
  },
  wieldedToolPower(t){   // tool must be in the weapon slot (Lost City oploc-style gate)
    const w=this.equip.weapon;
    return (w && ITEMS[w].tool===t) ? ITEMS[w].power : 0;
  },
  usingItem:null,        // selected pack item awaiting a "use on" target
};

/* ---------- combat formulas: shared/combat.js (the 2004 rules, test-locked by tools/test_combat.js) ---------- */

/* ---------- visible gear on the character ---------- */
function refreshPlayerGear(){
  if(player.userData && player.userData.isPlayerGLB){    // GLB avatar: bone-attach + region recolor path
    if(typeof refreshGLBGear==='function') refreshGLBGear();
    return;
  }
  const parts = player.userData.parts;
  const gear = player.userData.gear || (player.userData.gear = {});
  for(const k in gear){
    const m=gear[k]; if(!m) continue;
    if(m.userData && m.userData.covers) m.userData.covers.forEach(c=>c.parent&&c.parent.remove(c));
    if(m.parent) m.parent.remove(m);
    gear[k]=null;
  }
  for(const side of ['L','R'])
    if(parts['legMesh'+side] && !parts['legMesh'+side].userData.robeHidden)
      parts['legMesh'+side].visible = true;
  const e = Player.equip;
  if(e.weapon){
    const m = gearMesh(e.weapon);
    if(m) gear.weapon = holdWeapon(parts.handR, m, ITEMS[e.weapon]);
  }
  if(e.shield){ const m=gearMesh(e.shield)||shieldMesh(); m.rotation.y=Math.PI/2; parts.handL.add(m); gear.shield=m; }
  if(e.head){
    const def=ITEMS[e.head];
    if(def.model==='hat'){
      /* cloth hats are dyed cloth, not metal — the wizard hat was rendering as a
         tan metal-fallback brim hat (top-100 equipped review 2026-07-17) */
      const HAT_CLOTH={wizard:0x3a5aad, cloth:0x7a86b8, glimmer:0xb48ae0};
      const hc=HAT_CLOTH[def.tier]!==undefined ? HAT_CLOTH[def.tier] : tierMetal(def);
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.04,8), mat(hc));
      brim.position.y=0.1;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.42,8), mat(hc));
      cone.position.y=0.3;
      const grp=new THREE.Group(); grp.add(brim); grp.add(cone);
      parts.headTop.add(grp); gear.head=grp;
    } else {
      const m=gearMesh(e.head)||helmMesh(METALS.bronze); m.position.y=0.13;
      parts.headTop.add(m); gear.head=m;
    }
  }
  if(e.body){
    const def=ITEMS[e.body];
    if(def.model==='robe'){
      /* a robe TOP covers the torso only — the old 0.9-tall cylinder from the
         waist down read as a tent over the legs (top-100 equipped review) */
      const m=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.3,0.58,8), mat(tierMetal(def)));
      m.position.y = player.userData.bb ? 0.98 : 1.06;
      player.add(m); gear.body=m;
    } else {
      const m=gearMesh(e.body)||bodyArmorMesh(tierMetal(def));
      if(player.userData.bb) m.position.y -= 0.1;
      player.add(m); gear.body=m;
    }
  }
  if(e.legs){
    const m=legArmorMesh(tierMetal(ITEMS[e.legs]), parts);
    player.add(m); gear.legs=m;
  }
  if(e.amulet){ const m=gearMesh(e.amulet); if(m){
    m.scale.setScalar(1.5); m.position.set(0,1.4,0.18);   // readable at gameplay camera (top-100 review)
    player.add(m); gear.amulet=m; } }
  if(e.cape){ const m=gearMesh(e.cape); if(m){ player.add(m); gear.cape=m; } }
}

/* ---------- NPCs ---------- */
function spawnNpc(typeId, x, z){
  // buildout mode: world population suspended; only forced (gameplay/tool) spawns pass
  if(typeof GameConfig!=='undefined' && !GameConfig.worldNpcSpawns && !spawnNpc.force) return null;
  const t = NPC_TYPES[typeId];
  if(!t){ console.warn('[spawnNpc] unknown type:', typeId); return null; }
  // never spawn inside a wall — nudge to a free spot
  if(collides(x,z,0.4)){
    for(let i=0;i<14;i++){
      const a=Math.random()*6.28, r=2+Math.random()*5;
      const nx=x+Math.cos(a)*r, nz=z+Math.sin(a)*r;
      if(!collides(nx,nz,0.4) && groundY(nx,nz)!==null){ x=nx; z=nz; break; }
    }
  }
  let mesh;
  if(t.kitFoe && typeof HolmProvingGround!=='undefined'){   // a character-kit humanoid foe (bow / staff clips)
    mesh = HolmProvingGround.kitModel(t);
  }
  else if(t.glbChar && typeof charNpcModel==='function'){   // hero-pipeline character (baked idle/walk clips)
    mesh = charNpcModel(t);
  }
  else if(t.glb){                            // pipeline image-to-3D model (Gemini sprite -> SF3D/Pixal3D GLB)
    mesh = makeGlbModel(t.glb, {height: t.glbHeight || 1.8*(t.size||1), color: t.color, skinned: t.skinnedRig});
  }
  else if(t.assetModel){                     // pipeline-authored Blockbench model
    mesh = CR_buildAsset(t.assetModel, t.assetColors||{});
    if(!mesh) mesh = beast(t.color, t.size);
    else { if(t.size) mesh.scale.multiplyScalar(t.size);
           mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); }
  }
  else if(t.model==='bogling'){            // procedural smooth low-poly goblin (Path A)
    mesh = goblinModel({scale:t.size});
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  }
  else if(t.model==='skeleton'){           // bone-textured undead
    mesh = skeletonModel({scale:t.size});
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  }
  else if(t.model==='chicken') mesh = chicken(t.size);
  else if(t.model==='cow') mesh = cow(t.size);
  else if(t.model==='rat') mesh = rat(t.size, t.color);
  else if(t.model==='goblin'){
    mesh = humanoid(t.color, {skin:0x7a9a4a, hair:0x3a4a22, legs:0x4a3a26, scale:t.size});
    const p=mesh.userData.parts;
    for(const s of [-1,1]){           // pointed ears
      const ear=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.18,4), mat(0x7a9a4a));
      ear.position.set(s*0.17,1.74,0); ear.rotation.z=s*Math.PI/2.4; mesh.add(ear);
    }
    const club=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.025,0.55,5), mat(0x6b4426));
    club.position.y=0.18;
    holdWeapon(p.handR, club, {model:'sword'});
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  }
  else if(t.humanoid){
    const _metal = k => (k==null) ? undefined : (METALS[k]!==undefined ? METALS[k] : METALS.iron);
    mesh = humanoid(t.color, {robe:t.robe, hat:t.hat, hatColor:t.robe, skin:t.skin, scale:t.size,
      helm:_metal(t.helm), armour:_metal(t.armour), legArmour:_metal(t.legArmour), shield:!!t.shield});
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    if(t.weapon){
      const w = t.weapon==='battleaxe' ? axeMesh(METALS.steel)
              : t.weapon==='staff' ? staffMesh(0x9ad0ff) : swordMesh(METALS.iron);
      holdWeapon(mesh.userData.parts.handR, w, {model: t.weapon==='staff'?'staff':'sword'});
    } else if(t.ranged){
      holdWeapon(mesh.userData.parts.handR, staffMesh(0xb48ae0), {model:'staff'});
    }
  } else if(t.body && typeof BEAST_BODIES!=='undefined' && BEAST_BODIES[t.body]){
    mesh = BEAST_BODIES[t.body](t.color, t.size);   // distinct silhouette (wolf/crawler/crab/brute)
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  } else {
    mesh = beast(t.color, t.size);
  }
  mesh.position.set(x, gy(x,z), z);
  const hpbar = makeHPBar(mesh, t.barH || ((t.humanoid||t.model==='goblin') ? 2.2*t.size : 1.2*t.size+0.6));
  const npc = {typeId, t, mesh, hp:t.hp, home:new THREE.Vector3(x,0,z),
    wanderT:Math.random()*4, attackCd:0, dead:false, hpbar, target:null, moving:false};
  Object.assign(mesh.userData, {kind:'npc', npc, label:`Attack <b>${t.name}</b> (level ${t.level})`});
  scene.add(mesh); WORLD.clickables.push(mesh); WORLD.npcs.push(npc);
  return npc;
}
WORLD.friendlies = [];
let _overheadMesh=null;
function refreshOverhead(){
  let active=null;
  for(const id of Player.activePrayers){ if(PRAYERS[id].protect) active=PRAYERS[id]; }
  if(!active){ if(_overheadMesh) _overheadMesh.visible=false; return; }
  if(!_overheadMesh){
    _overheadMesh=new THREE.Mesh(new THREE.OctahedronGeometry(0.17,0),
      new THREE.MeshBasicMaterial({color:0xffffff}));
    _overheadMesh.position.y=2.55;
    player.add(_overheadMesh);
  }
  _overheadMesh.material.color.setHex(active.over);
  _overheadMesh.visible=true;
}
function spawnFriendly(id, name, x, z, color, face, opts){
  if(typeof GameConfig!=='undefined' && !GameConfig.worldNpcSpawns && !spawnNpc.force) return null;
  const mesh = humanoid(color, opts||{});
  mesh.position.set(x, gy(x,z), z);
  mesh.rotation.y = Math.random()*6;
  Object.assign(mesh.userData, {kind:'friendly', id, label:`Talk to <b>${name}</b>`, name, face:face||'🧔'});
  mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  scene.add(mesh); WORLD.clickables.push(mesh);
  WORLD.friendlies.push({id, mesh});
  return mesh;
}

/* ---------- ground drops (OSRS-style item models) ---------- */
/* soft separation so NPCs, bots and the player never overlap */
function separateEntities(){
  const ents=[];
  WORLD.npcs.forEach(n=>{ if(!n.dead) ents.push({m:n.mesh, r:0.45*(n.t.size||1)+0.15, push:n._lc?0:1}); });   // engine NPCs stand on tiles
  if(typeof Bots!=='undefined') Bots.list.forEach(b=>ents.push({m:b.mesh, r:0.4, push:1}));
  if(player) ents.push({m:player, r:0.4, push:0});   // the player doesn't get shoved
  for(let i=0;i<ents.length;i++) for(let j=i+1;j<ents.length;j++){
    const a=ents[i], b=ents[j];
    let dx=b.m.position.x-a.m.position.x, dz=b.m.position.z-a.m.position.z;
    let d2=dx*dx+dz*dz; const rs=a.r+b.r;
    if(d2>rs*rs) continue;
    if(d2<1e-6){ const ang=(i*2.39+j)*1.7; dx=Math.cos(ang)*0.01; dz=Math.sin(ang)*0.01; d2=1e-4; }
    const d=Math.sqrt(d2), overlap=(rs-d);
    const ux=dx/d, uz=dz/d;
    const tot=a.push+b.push||1;
    const moveB=overlap*(b.push/tot), moveA=overlap*(a.push/tot);
    if(b.push){ const nx=b.m.position.x+ux*moveB, nz=b.m.position.z+uz*moveB;
      const rB=(b.m===player)?0.3:0.15;
      if(!collides(nx,nz,rB)){ const y=groundY(nx,nz); if(y!==null&&y>-1) b.m.position.set(nx,y,nz); } }
    if(a.push){ const nx=a.m.position.x-ux*moveA, nz=a.m.position.z-uz*moveA;
      const rA=(a.m===player)?0.3:0.15;
      if(!collides(nx,nz,rA)){ const y=groundY(nx,nz); if(y!==null&&y>-1) a.m.position.set(nx,y,nz); } }
  }
}
function dropLoot(pos, table){
  let off=0;
  table.forEach(d=>{
    if(Math.random()<d.p){
      const q = Array.isArray(d.q) ? d.q[0]+Math.floor(Math.random()*(d.q[1]-d.q[0]+1)) : d.q;
      makeDrop(d.id, q, pos.x+(off%3)*0.55-0.5, pos.z+Math.floor(off/3)*0.55-0.3);
      off++;
    }
  });
}
function makeDrop(id, qty, x, z){
  const def=ITEMS[id];
  const m = itemGroundMesh(id);
  m.position.set(x, gy(x,z)+0.02, z);
  m.rotation.y = Math.random()*6;
  m.userData = {kind:'drop', id, qty, label:`Take <b>${def.name}</b>${qty>1?' ('+qty+')':''}`,
    age:0, life:200*TICK, publicAt:100*TICK, owner:'player'};   // 2004 lifecycle: private 100 ticks, gone 200 ticks after the drop
  scene.add(m); WORLD.clickables.push(m); WORLD.drops.push(m);
  if(typeof Events!=='undefined') Events.emit('lootSpawned', {id, qty, x, z});
}
/* one ground stack per item and tile (arrows that fall under a target pile up instead of spawning a mesh each) */
function addGroundStack(id, qty, x, z){
  const tx=Math.floor(x), tz=Math.floor(z);
  const m=(WORLD.drops||[]).find(d=>d.userData&&d.userData.id===id&&ITEMS[id]&&ITEMS[id].stack&&Math.floor(d.position.x)===tx&&Math.floor(d.position.z)===tz&&d.userData.age<d.userData.life-1);
  if(m){ const u=m.userData; u.qty+=qty; u.age=0; u.label=`Take <b>${ITEMS[id].name}</b>${u.qty>1?' ('+u.qty+')':''}`; return m; }
  makeDrop(id, qty, tx+0.5+(Math.random()-0.5)*0.4, tz+0.5+(Math.random()-0.5)*0.4);
  return WORLD.drops[WORLD.drops.length-1];
}
function removeClickable(obj){
  const i=WORLD.clickables.indexOf(obj); if(i>=0) WORLD.clickables.splice(i,1);
}

/* ---------- line of sight + a projectile with no hit (curses) ----------
   Every combat projectile is launched by the combat engine through CombatHooks (src/combat_hooks.js) and lands on
   the tick its hit applies. PROJECTILES / updateProjectiles stay as empty compatibility shims. */
const PROJECTILES = [];
/* Line-of-sight gate for ranged/magic combat. Delegates to the flag grid (collision_grid.js);
   returns true ("no obstruction known") whenever the grid is absent/disabled/unbaked. */
function hasCombatLoS(from, to){
  if(typeof CollisionGrid==='undefined') return true;
  return CollisionGrid.hasLoS(from.x, from.z, to.x, to.z);
}
function fireProjectile(kind, fromObj, npc, dmg, tint, fx){
  // a no-damage visual (curses); the flight is the 2004 spell delay for the distance
  if(typeof CombatHooks==='undefined' || !npc || !npc.mesh) return null;
  const d=Math.max(1, Math.round(Math.max(Math.abs(fromObj.position.x-npc.mesh.position.x), Math.abs(fromObj.position.z-npc.mesh.position.z))));
  const ticks=(typeof CRShared!=='undefined') ? CRShared.combat.magicHitDelay(d) : 2;
  return CombatHooks.projectile(fromObj, npc.mesh, kind==='arrow'?'arrow':'spell', ticks, {dmg:0, tint, splash:false});
}
function updateProjectiles(dt){ /* the combat engine schedules every hit; nothing lands here any more */ }

/* ---------- combat ----------
   The rules (accuracy, max hits, delays, styles per weapon category, XP) are shared/combat.js, run by the combat
   engine (src/combat_engine.js) on the 600 ms tick. What stays here: the special attacks, boss scripts, deaths and
   the presentation helpers (swing). */
/* special attacks: armed via the spec orb, consume spec energy, and boost the accuracy &
   damage of that one swing. Keyed by weapon MODEL so a whole class shares a signature spec
   — our own designs (2004 had none; shared/combat.js applySpecial applies them on the server too). */
const SPECIALS = {
  sword:     {name:'Lunge',        cost:25, acc:1.30, dmg:1.15, msg:'You lunge with deadly precision!'},
  sabre:     {name:'Riposte',      cost:25, acc:1.25, dmg:1.20, msg:'You turn the blade and cut back hard!'},
  longsword: {name:'Long Reach',   cost:35, acc:1.20, dmg:1.25, msg:'You drive the long blade through their guard!'},
  greatsword:{name:'Sweeping Arc', cost:60, acc:1.10, dmg:1.50, msg:'You heave the greatsword round in a sweeping arc!'},
  axe:       {name:'Cleave',       cost:50, acc:1.05, dmg:1.45, msg:'You cleave with brutal force!'},
  battleaxe: {name:'Rampage',      cost:60, acc:1.00, dmg:1.55, msg:'You wade in with a roaring swing!'},
  pick:      {name:'Skull Crack',  cost:50, acc:1.10, dmg:1.35, msg:'You drive the pick home!'},
  mace:      {name:'Bell Ringer',  cost:30, acc:1.25, dmg:1.25, msg:'You ring their helm like a bell!'},
  warhammer: {name:'Stonebreaker', cost:50, acc:1.15, dmg:1.40, msg:'Your hammer comes down like falling stone!'},
  bow:       {name:'Rapid Volley', cost:50, acc:1.20, dmg:1.30, msg:'You loose a rapid volley!'},
  longbow:   {name:'Hawk Shot',    cost:55, acc:1.35, dmg:1.25, msg:'You draw long and loose a hawk shot!'},
  staff:     {name:'Power Surge',  cost:55, acc:1.15, dmg:1.40, msg:'Your staff surges with raw power!'},
};
/* boss combat scripts: a lightweight per-NPC hook (set NPC_TYPES[x].script) run each frame while
   the boss lives, giving phases/specials/heals beyond the generic AI. Our own designs. */
const BOSS_SCRIPTS = {
  fenlord(n, dt){
    n._sT=(n._sT||0)+dt;
    if(n._sT>=9){ n._sT=0;
      if(n.target==='player' && n.hp < n.t.hp*0.55){
        n.hp=Math.min(n.t.hp, n.hp + Math.ceil(n.t.hp*0.08));
        if(n.hpbar){ n.hpbar.spr.visible=true; n.hpbar.draw(Math.max(0,n.hp/n.t.hp)); }
        UI.chat('The Fenlord draws strength from the drowned mire.','combat');
      }
    }
  },
  ashwyrm(n, dt){
    n._sT=(n._sT||0)+dt;
    if(!n._enraged && n.hp < n.t.hp*0.45){ n._enraged=true;
      UI.chat('The Ash Wyrm rears, wings ablaze — the very air begins to burn!','combat'); }
    // breath state machine: a "huff" wind-up, then the fire gout. The visuals (rear-back, smoke
    // wisps, flame particles) are driven by glbCreatureAnim/spawnDragonfire in fx_dragon.js.
    if(n._breath){
      const b=n._breath; b.t+=dt;
      if(b.phase==='windup' && b.t>=b.windup){
        b.phase='fire'; b.t=0;
        if(typeof spawnDragonfire==='function') spawnDragonfire(n);
        if(n.target==='player'){
          const d=player.position.distanceTo(n.mesh.position);
          if(d<12){
            const warded = Player.protectedFrom('magic');   // our antifire stand-in
            let dmg = Math.ceil((n._enraged?14:9)+Math.random()*12);
            if(warded) dmg = Math.ceil(dmg*0.35);
            if(typeof LocalCombat!=='undefined') LocalCombat.damagePlayer(dmg, n, {kind:'generic'});
            UI.chat(warded ? 'You raise a prayer against the dragonfire.' : 'The Ash Wyrm breathes a torrent of fire!','combat');
          }
        }
      } else if(b.phase==='fire' && b.t>=b.fire){ n._breath=null; }
      return;
    }
    const every = n._enraged ? 6 : 10;          // breathe on a cooldown; faster when enraged
    if(n._sT>=every){ n._sT=0;
      if(n.target==='player' && player.position.distanceTo(n.mesh.position)<11){
        n._breath={phase:'windup', t:0, windup:1.0, fire:0.7};
        UI.chat('The Ash Wyrm draws a deep, smoking breath…','combat');
      }
    }
  },
  korthul(n, dt){
    n._sT=(n._sT||0)+dt;
    if(!n._enraged && n.hp < n.t.hp*0.5){ n._enraged=true;
      UI.chat('Korthul shudders and quakes with mountainous fury!','combat'); }
    const every = n._enraged ? 7 : 12;
    if(n._sT>=every){ n._sT=0;
      if(n.target==='player'){
        const d=player.position.distanceTo(n.mesh.position);
        if(d<6 && !Player.protectedFrom('melee')){
          const dmg=Math.ceil((n._enraged?7:4)+Math.random()*8);
          if(typeof LocalCombat!=='undefined') LocalCombat.damagePlayer(dmg, n, {kind:'generic'});
          UI.chat('Korthul slams the ground — the cavern quakes!','combat');
        }
      }
    }
  },
};
function applyHit(npc, dmg, xpSkill){
  // legacy entry point (sparring bots, scripted hits): the damage goes through the engine; no XP is granted here
  if(typeof LocalCombat!=='undefined' && LocalCombat.ready()){ LocalCombat.npcDamage(npc, dmg, {kind:'generic', style:null}); return; }
  npc.hp -= dmg; UI.floatDmg(npc.mesh, dmg);
  if(npc.hp<=0) killNpc(npc,{});
}
function playerAttack(npc){ /* the combat engine runs the player's attacks each tick (src/combat_engine.js) */ }

/* ---------- the trades: furnace, anvil, tinderbox, knife, light fingers ---------- */
function openSmelting(obj){
  const opts=[];
  for(const id in SMELTS){
    const s=SMELTS[id];
    const have = Object.keys(s.needs).every(n=>Player.count(n)>=s.needs[n]);
    if(Player.lvl('Smithing')>=s.req && have)
      opts.push({label:`Smelt a ${s.name}.`, fn:()=>{ Player.action={type:'smelt', obj, bar:id, t:0}; orderWalk(obj.position); }});
  }
  if(!opts.length){
    UI.chat('You have no ore you can smelt. Bronze takes copper and tin; iron takes iron ore; steel takes iron and two coal.','plain');
    return;
  }
  opts.push({label:'Never mind.', fn:null});
  UI.dialogue('Furnace','The heat rolls over you in waves.', opts, '🔥');
}
function openSmithing(obj){
  if(Player.count('hammer')<1){ UI.chat('You need a hammer to work the metal.','plain'); return; }
  // work the finest bar you carry
  let barId=null;
  for(const id of ['steel_bar','iron_bar','bronze_bar']) if(Player.count(id)>0){ barId=id; break; }
  if(!barId){ UI.chat('You need metal bars to smith. The furnace turns ore into bars.','plain'); return; }
  const opts=[];
  for(const it of SMITHABLES[barId]){
    if(Player.lvl('Smithing')>=it.req && Player.count(barId)>=it.bars)
      opts.push({label:`${it.name} (${it.bars} bar${it.bars>1?'s':''})`, fn:()=>{
        Player.action={type:'smith', obj, bar:barId, make:it, t:0}; orderWalk(obj.position); }});
  }
  if(!opts.length){ UI.chat('Nothing you can smith from those bars yet — your Smithing must grow.','plain'); return; }
  opts.push({label:'Never mind.', fn:null});
  UI.dialogue('Anvil', ITEMS[barId].name+'s ring true on the iron face.', opts, '⚒');
}
function startFiremaking(slot){
  if(Player.count('tinderbox')<1){ UI.chat('You need a tinderbox to light a fire.','plain'); return false; }
  if(Player.action && Player.action.type==='lightfire') return false;
  Player.action={type:'lightfire', t:0, slot};
  Player.moveTo=null; Player.target=null; Player.path=[];
  return true;
}
function openFletching(slot){
  if(Player.count('knife')<1) return false;
  const opts=[];
  for(const f of FLETCHABLES){
    if(Player.lvl('Fletching')>=f.req)
      opts.push({label:f.name, fn:()=>{ Player.action={type:'fletch', make:f, slot, t:0};
        Player.moveTo=null; Player.target=null; }});
  }
  if(!opts.length) return false;
  opts.push({label:'Never mind.', fn:null});
  UI.dialogue('Fletching','What will you carve from the emberwood?', opts, '🔪');
  return true;
}
function fletchArrows(slot){
  // shafts + feathers + tips -> arrows, twelve at a time
  const tip = Player.count('iron_tips')>=12 ? 'iron_tips' : 'bronze_tips';
  if(Player.count('arrow_shafts')<12 || Player.count('feathers')<12 || Player.count(tip)<12){
    UI.chat('Fletching arrows takes 12 shafts, 12 feathers and 12 arrowtips.','plain');
    return false;
  }
  Player.removeItem('arrow_shafts',12); Player.removeItem('feathers',12); Player.removeItem(tip,12);
  Player.addItem('arrows',12);
  Player.addXp('Fletching', tip==='iron_tips'?38:15);
  UI.chat('You fix the heads and fletch a dozen arrows.','xp');
  Sfx.click(); UI.refreshInv();
  return true;
}
function tryPickpocket(npc){
  const data=PICKPOCKETS[npc.typeId]; if(!data) return;
  if(Player.stunT>0) return;
  if(Player.lvl('Thieving')<data.req){
    UI.chat(`You need a Thieving level of ${data.req} to pick the ${data.name}'s pocket.`,'plain'); return;
  }
  Player.action={type:'pickpocket', npc, t:0};
  orderWalk(npc.mesh.position);
}
function tryStealStall(obj){
  const data=STALL_KINDS[obj.userData.stall]; if(!data) return;
  if(Player.lvl('Thieving')<data.req){
    UI.chat(`You need a Thieving level of ${data.req} to steal from the ${data.label.toLowerCase()}.`,'plain'); return;
  }
  Player.action={type:'stealstall', obj, t:0};
  orderWalk(obj.position);
}

/* ---------- utility magic (castAlchemy/castCurse/castTeleport) moved to src/magic_spells.js ---------- */
function killNpc(npc, opt){
  opt=opt||{};
  if(Duel.active && npc===Duel.npc){
    npc.dead=true; npc.mesh.visible=false; removeClickable(npc.mesh);
    const i=WORLD.npcs.indexOf(npc); if(i>=0) WORLD.npcs.splice(i,1);
    if(Player.target===npc) Player.target=null;
    Duel.npc=null;   // already removed; cleanup won't double-handle
    Duel.win();
    return;
  }
  npc.dead = true; npc.respawnT = npc.t.respawn;
  npc.lastKilledStyle = opt.attackStyle||null;
  removeClickable(npc.mesh);
  if(npc.hpbar) npc.hpbar.spr.visible = false;
  // tip the corpse over instead of popping it out of existence; the update loop hides it when the topple ends.
  // GLB / skinned-rig bodies (the dragon boss) keep the instant hide — a sideways tip reads wrong on a winged quadruped.
  const toppleable = typeof startDeath==='function' && !npc.t.glb && !npc.t.skinnedRig;
  if(toppleable){ npc.dying = true; startDeath(npc.mesh); }
  else npc.mesh.visible = false;
  if(!opt.silent) UI.chat(`You have defeated the ${npc.t.name}.`,'combat');
  if(typeof Events!=='undefined') Events.emit('npcKilled', {npc,attackStyle:opt.attackStyle||null});
  const _drops0 = WORLD.drops ? WORLD.drops.length : 0;
  if(opt.dropList){   // rolled by the engine from the weighted table (shared/drops.js), piled on the NPC's tile
    const at=opt.at||npc.mesh.position;
    opt.dropList.forEach((d,i)=>makeDrop(d.id, d.qty, at.x+(i%3)*0.35-0.35, at.z+Math.floor(i/3)*0.35-0.2));
  } else dropLoot(npc.mesh.position, npc.t.drops);
  // combat feel: the fall waits for the killing splat, the body lies a moment and sinks, then the drop shows
  if(typeof CombatFX!=='undefined') CombatFX.onKill(npc, WORLD.drops ? WORLD.drops.slice(_drops0) : [], !!opt.silent);
  if(Player.target===npc) Player.target=null;
  if(!opt.noQuest){ Quest.onKill(npc.typeId); Tutorial.notify('kill', npc.typeId); }
  if(!opt.silent && typeof CombatFX==='undefined') Sfx.kill();
}

function npcAttack(npc){ /* the combat engine runs NPC attacks each tick (src/combat_engine.js) */ }
/* ---------- fight appraisal: odds of winning with CURRENT stats & gear ---------- */
function appraiseFight(t){
  // exact per-swing odds (shared/combat.js hitChance) for the current setup, then a quick duel simulation in ticks
  const a=(typeof LocalCombat!=='undefined') ? LocalCombat.appraise(t) : null;
  if(!a) return 0.5;
  let foodHeals=[];
  Player.inv.forEach(s=>{ if(s && ITEMS[s.id].heal) for(let q=0;q<s.qty;q++) foodHeals.push(ITEMS[s.id].heal); });
  foodHeals.sort((x,y)=>y-x);
  let wins=0; const TRIALS=300, R=(n)=>Math.floor(Math.random()*(n+1));
  for(let k=0;k<TRIALS;k++){
    let php=Player.hp>0?Player.hp:Player.maxHp, nhp=t.hp, pt=0, nt=0, food=foodHeals.slice();
    for(let tick=0; tick<3000; tick++){
      if(tick>=pt){ if(Math.random()<a.acc) nhp-=R(a.max); pt=tick+a.speed; }
      if(nhp<=0){ wins++; break; }
      if(tick>=nt){ if(Math.random()<a.nAcc) php-=R(a.nMax); nt=tick+a.nSpeed; }
      if(php<=0) break;
      if(php<=Math.floor(Player.maxHp*0.5) && food.length){ php=Math.min(Player.maxHp, php+food.shift()); pt+=3; }   // a bite costs 3 ticks
    }
  }
  return wins/TRIALS;
}
function appraiseVerdict(p){
  if(p>=0.85) return ['Strong odds', '#5edb5e'];
  if(p>=0.55) return ['Fair odds', '#d6d65e'];
  if(p>=0.25) return ['Risky', '#e8a04a'];
  return ['Deadly', '#ff5e5e'];
}
/* ---------- The Proving Grounds: staked duels ---------- */
const Duel = {
  active:false, stake:0, npc:null,
  start(stake){
    if(this.active) return;
    if(stake>0 && Player.count('coins')<stake){
      UI.chat('You do not have enough crowns to cover that stake.','plain'); return;
    }
    if(stake>0) Player.removeItem('coins', stake);
    this.stake=stake; this.active=true;
    const a=ZONES.arena.pos;
    // scale the duelist to the player's combat level
    const cl=Math.max(3, Player.combatLevel ? Player.combatLevel() : 5);
    spawnNpc.force=true;                    // player-initiated: bypasses the buildout gate
    const n=spawnNpc('duelist', a[0], a[1]-3);
    spawnNpc.force=false;
    n.t = Object.assign({}, n.t, {
      level:cl, hp:10+cl*2, att:Math.max(1,cl), str:Math.max(1,cl), def:Math.max(1,Math.floor(cl*0.8)),
    });
    n.hp=n.t.hp;
    this.npc=n;
    n.target='player';
    Player.target=n;
    UI.chat(stake>0 ? `Duel started — ${stake} crowns on the line!` : 'Friendly duel started!','combat');
    Sfx.quest();
  },
  win(){
    if(!this.active) return;
    const payout=this.stake*2;
    if(payout>0){ Player.addItem('coins', payout);
      UI.chat(`You win the duel! The pit master pays out ${payout} crowns.`,'quest'); }
    else UI.chat('You win the duel!','quest');
    this.cleanup();
  },
  lose(){
    if(!this.active) return;
    UI.chat(this.stake>0 ? `You are defeated — your ${this.stake} crown stake is lost.` : 'You are defeated, but it was only a friendly bout.','combat');
    Player.hp = Math.max(5, Math.floor(Player.maxHp/3));
    const a=ZONES.arena.pos;
    player.position.set(a[0]-9, gy(a[0]-9, a[1]+8), a[1]+8);   // dumped outside the ring
    Player.target=null; Player.moveTo=null;
    UI.refreshHud();
    this.cleanup();
  },
  cleanup(){
    if(this.npc && !this.npc.dead){
      this.npc.dead=true; this.npc.mesh.visible=false; removeClickable(this.npc.mesh);
      const i=WORLD.npcs.indexOf(this.npc); if(i>=0) WORLD.npcs.splice(i,1);
    }
    this.active=false; this.npc=null; this.stake=0;
  },
};
function playerDeath(){
  if(Duel.active){ Duel.lose(); return; }
  WORLD.deathCount = (WORLD.deathCount||0)+1;
  Sfx.death();
  const protect=Player.activePrayers && Player.activePrayers.has('protect_item');
  // Tutor's Holm (tutorial not complete): nothing is lost, like 2004's tutorial
  if(Tutorial.complete && typeof CRShared!=='undefined'){
    const here = player.position.clone();
    const inv=Player.inv.map(s=>s?{id:s.id,qty:s.qty}:null);
    const r=CRShared.pvp.keptOnDeath(inv, Object.assign({}, Player.equip), {skulled:false, protectItem:protect,
      valueOf:id=>(ITEMS[id]&&ITEMS[id].value)||0, destroyOnDeath:id=>!!(ITEMS[id]&&ITEMS[id].destroyOnDeath), stackable:id=>!!(ITEMS[id]&&ITEMS[id].stack)});
    const dropped=[];
    r.lostInv.forEach(s=>{ if(s&&s.qty>0) dropped.push([s.id,s.qty]); });
    for(const slot in r.lostEquip) dropped.push([r.lostEquip[slot],1]);
    Player.inv=new Array(28).fill(null); for(const k in Player.equip) Player.equip[k]=null;
    r.kept.forEach(k=>Player.addItem(k.id,k.qty));
    dropped.forEach(([id,qty],i)=>makeDrop(id, qty, here.x+((i%4)-1.5)*0.4, here.z+(Math.floor(i/4)-1)*0.4));
    UI.chat(`You keep ${r.kept.length?r.kept.map(k=>ITEMS[k.id].name).join(', '):'nothing'}${protect?' (Protect Item kept one more)':''}.`+
      (dropped.length?' Everything else lies where you fell. Hurry back for it!':''),'combat');
    refreshPlayerGear(); UI.refreshInv(); UI.refreshEquip();
  } else if(!Tutorial.complete) UI.chat('On Tutor\'s Holm nothing is lost when you fall.','combat');
  setTimeout(()=>{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }, 600);
  Player.hp = Player.maxHp;   // respawn with full hitpoints and prayer, prayers off (2004)
  Player.prayerPts = Player.maxPrayer(); Player.activePrayers.clear();
  if(typeof refreshOverhead==='function') refreshOverhead();
  Player.energy = 100; Player.caffeinated = 0;
  Player.target=null; Player.action=null; Player.moveTo=null;
  WORLD.npcs.forEach(n=>{ if(n.target==='player') n.target=null; });
  if(!Tutorial.complete&&typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive()&&HolmArrivalQA.respawnIsland&&HolmArrivalQA.respawnIsland()){
    UI.chat('You wake on the Guide House porch. Guide Bram shakes his head kindly.','plain');refreshPlayerGear();UI.refreshHud();return;
  }
  const p = Tutorial.complete ? ZONES.commons.pos : ZONES.holm.pos;
  // WEST of the plaza fountain — never inside its basin (user, 2026-07-03)
  player.position.set(p[0]-8, gy(p[0]-8,p[1]), p[1]);
  UI.chat('You wake in Veyhollow square.','plain');
  refreshPlayerGear();      // death drops gear — the avatar must stop showing it (GLB regions reset too)
  UI.refreshHud();
}
/* trigger an attack animation. `type` picks the motion archetype so a thrust, an
   overhead crush, a bow draw and a cast each read distinctly — defaults to a slash.
   Armless beasts have no armR, so this safely no-ops on them. */
function swing(g, type){
  const gm=g.userData&&g.userData.gmix;                 // GLB character: play the baked attack clip
  if(gm && gm.clips && gm.kitNpc){                      // a kit humanoid foe: the clip for this blow
    const name={stab:'attack_stab',slash:'attack_slash',crush:'attack_crush',bow:'bow',cast:'cast',block:'block',hit:'hit',death:'death'}[type||'slash']||'attack_slash';
    const act=gm.clips[name]||gm.clips.attack; if(act){ act.reset(); act.setLoop(THREE.LoopOnce,1); act.clampWhenFinished=name==='death'; act.weight=1; act.play(); gm.attack=act; } return;
  }
  if(gm && gm.attack){ gm.attack.reset(); gm.attack.play(); return; }
  const p=g.userData&&g.userData.parts; if(!p) return;
  if(!p.armR){                                 // armless beast → a lunge/snap, not an arm swing
    if(p.head||p.maw||p.claws) g.userData.beastSwing = {t:0, dur:0.42};   // tweened in tickBeastSwing
    return;                                    // (truly static bodies have none of these — stay still as before)
  }
  type = type||'slash';
  const DUR = {slash:0.45, stab:0.40, crush:0.52, bow:0.55, cast:0.50,
    mine:0.72, smith:0.48, smelt:0.90};
  g.userData.swinging = true;
  g.userData.swing = {t:0, dur:DUR[type]||0.45, type};   // tweened in tickSwing each frame
}

/* ---------- quests ---------- */
/* ---------- Music: original tracks, unlocked by exploring ----------
   Every melody here is an original composition for Crafted Realm — written in
   the SPIRIT of 2007-era region themes (jaunty shanties, dusty desert lines,
   grim dirges) but none copies an existing tune. */
const TRACKS = {
  white_keep: {name:'The White Keep', zone:'whitmoor', beat:0.66, lead:'triangle',
    prog:[['C3','E3','G3'],['G2','B2','D3'],['A2','C3','E3'],['F2','A2','C3'],
          ['C3','E3','G3'],['F2','A2','C3'],['G2','B2','D3'],['C3','E3','G3']],
    mel:['G4','E4','C4','E4','G4',null,'D5','B4','A4','G4','A4',null,'E4','G4','A4',null,
         'C5','G4','E4','G4','F4','A4','C5',null,'B4','G4','D4','G4','C4',null,'C4',null]},
  undercrag: {name:'The Undercrag', zone:'undercrag', beat:0.92, lead:'sawtooth', drums:true,
    prog:[['D2','F2','A2'],['D2','F2','A2'],['Bb1','D2','F2'],['C2','Eb2','G2'],
          ['D2','F2','A2'],['Bb1','D2','F2'],['A1','C2','E2'],['D2','F2','A2']],
    mel:['D3',null,'F3','D3',null,'A2',null,null,'Bb2','D3',null,'C3',null,null,'A2',null,
         'D3','F3','G3',null,'F3','D3',null,null,'C3',null,'Bb2',null,'A2',null,'D3',null]},
  hollow_square: {name:'Hollow Square', zone:'commons', beat:0.62, lead:'triangle',
    prog:[['D3','F3','A3'],['F3','A3','C4'],['G3','B3','D4'],['D3','F3','A3'],
          ['A2','E3','A3'],['F3','A3','C4'],['G3','B3','D4'],['D3','F3','A3']],
    mel:['D4','F4','E4','D4','A4','G4','F4','E4','F4','G4','A4','C5','B4','A4','G4','F4',
         'E4','C4','D4','F4','E4','D4','C4','D4','A3','C4','D4','E4','F4','E4','D4','D4']},
  tutors_tide: {name:"Tutor's Tide", zone:'holm', beat:0.7, lead:'sine',
    prog:[['G3','B3','D4'],['C3','E3','G3'],['D3','F#3','A3'],['G3','B3','D4'],
          ['E3','G3','B3'],['C3','E3','G3'],['D3','F#3','A3'],['G3','B3','D4']],
    mel:['B4','A4','G4',null,'D4','E4','G4',null,'A4','B4','A4','G4','E4',null,'D4',null,
         'G4','A4','B4','D5','B4','A4','G4','E4','D4','E4','G4','A4','G4',null,'G4',null]},
  sea_breeze: {name:'Sea Breeze', zone:'pond', beat:0.4, lead:'square',
    prog:[['C3','E3','G3'],['C3','E3','G3'],['F3','A3','C4'],['G3','B3','D4'],
          ['C3','E3','G3'],['A2','C3','E3'],['F3','A3','C4'],['G3','B3','D4']],
    mel:['G4','E4','C4','E4','G4','C5','G4','E4','A4','F4','C4','F4','A4','C5','B4','G4',
         'C5','G4','E4','G4','A4','F4','D4','F4','E4','C4','D4','E4','F4','D4','C4',null]},
  brynholt_drums: {name:'Brynholt Drums', zone:'brynholt', beat:0.55, lead:'sawtooth', drums:true,
    prog:[['A2','E3','A3'],['A2','E3','A3'],['F2','C3','F3'],['G2','D3','G3'],
          ['A2','E3','A3'],['C3','G3','C4'],['G2','D3','G3'],['A2','E3','A3']],
    mel:['A3','A3','C4','A3','E4','D4','C4','A3','F3','A3','C4','D4','C4','A3','G3',null,
         'A3','C4','E4','E4','D4','C4','D4','C4','A3','G3','A3','C4','A3',null,'A3',null]},
  sun_scoured: {name:'Sun-Scoured', zone:'dunes', beat:0.62, lead:'triangle',
    prog:[['E3','G3','B3'],['F3','A3','C4'],['E3','G3','B3'],['D3','F3','A3'],
          ['E3','G3','B3'],['C3','E3','G3'],['F3','A3','C4'],['E3','G3','B3']],
    mel:['E4','F4','G#4','F4','E4',null,'B4','A4','G#4','F4','E4','F4','E4','D4','E4',null,
         'G4','A4','B4','C5','B4','A4','G#4','F4','E4','F4','G#4','F4','E4',null,'E4',null]},
  scar_dirge: {name:'Scar Dirge', zone:'scarlands', beat:0.85, lead:'sine',
    prog:[['D3','A3','D4'],['D3','A3','D4'],['Bb2','F3','Bb3'],['A2','E3','A3'],
          ['D3','A3','D4'],['F3','C4','F4'],['Bb2','F3','Bb3'],['A2','E3','A3']],
    mel:['D4',null,'F4',null,'E4','D4',null,null,'Bb3',null,'D4',null,'C#4',null,'A3',null,
         'D4','E4','F4',null,'G4','F4','E4',null,'D4',null,'C#4',null,'D4',null,null,null]},
};
const Music = {
  on:false, _master:null, _timer:null, _lastSched:-1,
  current:'hollow_square', mode:'auto',
  unlocked:['hollow_square','tutors_tide'],
  N(name){
    const m={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
    let st=m[name[0]], i=1;
    if(name[1]==='#'){ st+=1; i=2; } else if(name[1]==='b'){ st-=1; i=2; }
    const oct=+name.slice(i);
    return 440*Math.pow(2,(st-9)/12+(oct-4));
  },
  ensure(){
    const ctx=Sfx.ensure();
    if(!this._master){ this._master=ctx.createGain(); this._master.gain.value=0;
      this._master.connect(ctx.destination); }
    return ctx;
  },
  tone(freq, t0, dur, vol, type){
    const ctx=this.ensure();
    try{
      const o=ctx.createOscillator(); o.type=type||'triangle'; o.frequency.value=freq;
      const g=ctx.createGain();
      g.gain.value=0;
      g.gain.exponentialRampToValueAtTime(vol, t0+0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
      o.connect(g); g.connect(this._master);
      o.start(t0); o.stop(t0+dur+0.05);
    }catch(e){}
  },
  drum(t0, low){
    const ctx=this.ensure();
    try{
      const o=ctx.createOscillator(); o.type='sine';
      o.frequency.value=low?70:160;
      o.frequency.exponentialRampToValueAtTime(low?40:90, t0+0.12);
      const g=ctx.createGain(); g.gain.value=0;
      g.gain.exponentialRampToValueAtTime(low?0.22:0.1, t0+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0+0.16);
      o.connect(g); g.connect(this._master);
      o.start(t0); o.stop(t0+0.2);
    }catch(e){}
  },
  scheduleLoop(){
    const ctx=this.ensure();
    if(ctx.currentTime===this._lastSched) return;   // headless: clock frozen, stop
    this._lastSched=ctx.currentTime;
    const tr=TRACKS[this.current]||TRACKS.hollow_square;
    const t0=ctx.currentTime+0.1, beat=tr.beat;
    tr.prog.forEach((ch,i)=>{
      const ct=t0+i*4*beat;
      ch.forEach(n=>this.tone(this.N(n), ct, 4*beat*0.98, 0.05, 'sine'));
      ch.forEach((n,k)=>this.tone(this.N(n)*2, ct+k*0.09, 0.5, 0.03, 'triangle'));
      if(tr.drums){ this.drum(ct,true); this.drum(ct+2*beat,false); this.drum(ct+3*beat,true); }
    });
    tr.mel.forEach((n,i)=>{ if(n) this.tone(this.N(n), t0+i*beat, beat*0.92, 0.082, tr.lead); });
    const loopLen=tr.mel.length*beat;
    clearTimeout(this._timer);
    this._timer=setTimeout(()=>{ if(this.on) this.scheduleLoop(); }, (loopLen-0.4)*1000);
  },
  play(id){
    if(!TRACKS[id] || this.unlocked.indexOf(id)<0) return;
    this.current=id;
    if(this.on){ clearTimeout(this._timer); this._lastSched=-1; this.scheduleLoop(); }
    if(typeof UI!=='undefined') UI.chat(`🎵 Now playing: ${TRACKS[id].name}`,'sys');
  },
  unlock(id, silent){
    if(!TRACKS[id] || this.unlocked.indexOf(id)>=0) return false;
    this.unlocked.push(id);
    if(!silent){ UI.chat(`🎵 Music unlocked: <b>${TRACKS[id].name}</b>!`,'quest'); Sfx.quest(); }
    return true;
  },
  onZone(zone){
    for(const id in TRACKS) if(TRACKS[id].zone===zone) this.unlock(id);
    if(this.mode==='auto'){
      let pick='hollow_square';
      for(const id in TRACKS) if(TRACKS[id].zone===zone && this.unlocked.indexOf(id)>=0) pick=id;
      if(pick!==this.current) this.play(pick);
    }
  },
  start(){
    if(this.on) return;
    this.on=true;
    try{ localStorage.setItem('cr_music_on','1'); }catch(e){}   // remember the opt-in
    const ctx=this.ensure();
    try{ this._master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime+1.5); }
    catch(e){ this._master.gain.value=0.5; }
    this._lastSched=-1;
    this.scheduleLoop();
    const b=document.getElementById('music-btn'); if(b) b.textContent='\u266a';
  },
  stop(){
    this.on=false;
    try{ localStorage.setItem('cr_music_on','0'); }catch(e){}
    try{ this._master.gain.value=0; }catch(e){}
    clearTimeout(this._timer);
    const b=document.getElementById('music-btn'); if(b) b.textContent='\u2715';
  },
  toggle(){ this.on ? this.stop() : this.start(); },
};

/* Quest engine v2 — fully data-driven off the QUESTS stage objects (OSRS-emulator style
 * progress-state machine: varp-like integer stage per quest, generic objective hooks). */
const Quest = {
  tracked:null,
  stageOf(id){ const st=Player.quests[id]; return st ? st.stage : 0; },
  curStage(id){                       // the active stage object, or null
    const st=Player.quests[id]; if(!st || st.stage===99) return null;
    return QUESTS[id].stages[Math.min(st.stage, QUESTS[id].stages.length-1)] || null;
  },
  stageText(id){
    const q=QUESTS[id], st=Player.quests[id];
    const s=q.stages[st ? Math.min(st.stage,q.stages.length-1) : 0];
    return s ? s.text.replace('%n', st?st.counter:0) : '';
  },
  qp(){ let n=0; for(const id in QUESTS) if(this.done(id)) n+=(QUESTS[id].qp||1); return n; },
  qpMax(){ let n=0; for(const id in QUESTS) n+=(QUESTS[id].qp||1); return n; },
  canStart(id){
    const req=(QUESTS[id]||{}).requires; if(!req) return true;
    if(req.quests) for(const r of req.quests) if(!this.done(r)) return false;
    if(req.qp && this.qp()<req.qp) return false;
    return true;
  },
  reqText(id){
    const req=(QUESTS[id]||{}).requires; if(!req || !req.quests) return '';
    return req.quests.filter(r=>!this.done(r)).map(r=>QUESTS[r].name).join(', ');
  },
  track(id){
    this.tracked = this.tracked===id ? null : id;
    this.updateMarker();
    if(this.tracked){
      UI.chat(`Quest tracked: ${QUESTS[id].name} — ${this.stageText(id)} Follow the yellow flag on your minimap.`,'quest');
    } else { UI.chat('Quest tracking cleared.','plain'); }
    UI.refreshQuests();
  },
  updateMarker(){
    WORLD.questMarker = null;
    const id=this.tracked; if(!id) return;
    const st=Player.quests[id];
    if(st && st.stage===99) return;
    const s = st ? this.curStage(id) : QUESTS[id].stages[0];
    if(!s) return;
    if(s.at){ WORLD.questMarker={x:s.at[0], z:s.at[1]}; return; }
    if(s.npc){
      const f=WORLD.friendlies.find(f=>f.id===s.npc);
      if(f){ WORLD.questMarker={x:f.mesh.position.x, z:f.mesh.position.z}; return; }
    }
    if(s.zone && ZONES[s.zone]) WORLD.questMarker={x:ZONES[s.zone].pos[0], z:ZONES[s.zone].pos[1]};
  },
  state(id){ return Player.quests[id] || null; },
  start(id){
    Player.quests[id]={stage:1, counter:0};
    UI.chat(`Quest started: ${QUESTS[id].name}.`,'xp');
    UI.chat(this.stageText(id),'quest');
    UI.refreshQuests(); Sfx.quest();
  },
  advance(id){
    const st=Player.quests[id]; if(!st || st.stage===99) return;
    st.stage++; st.counter=0;
    if(st.stage >= QUESTS[id].stages.length){ this.complete(id); return; }
    UI.chat(this.stageText(id),'quest');
    this.updateMarker(); UI.refreshQuests(); Sfx.quest();
  },
  /* 'bring' turn-in helper: true if the player carries every required item */
  hasBring(id){
    const s=this.curStage(id); if(!s || s.type!=='bring') return false;
    return s.items.every(it=>Player.count(it.id)>=it.q);
  },
  takeBring(id){
    const s=this.curStage(id); if(!s || s.type!=='bring') return;
    s.items.forEach(it=>Player.removeItem(it.id, it.q));
    this.advance(id);
  },
  complete(id){
    setTimeout(()=>{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }, 50);
    const q=QUESTS[id]; Player.quests[id].stage = 99;
    for(const sk in q.reward.xp) Player.addXp(sk, q.reward.xp[sk]);
    q.reward.items.forEach(it=>Player.addItem(it.id, it.q));
    if(this.tracked===id){ this.tracked=null; this.updateMarker(); }
    if(typeof UI.questComplete==='function') UI.questComplete(id);
    else UI.chat(`Congratulations! Quest complete: ${q.name}.`,'xp');
    UI.refreshQuests(); Sfx.level();
  },
  done(id){ const s=Player.quests[id]; return s && s.stage===99; },
  onKill(typeId){
    for(const id in QUESTS){
      const s=this.curStage(id);
      if(!s || s.type!=='kill' || s.target!==typeId) continue;
      const st=Player.quests[id];
      st.counter++;
      if(st.counter >= (s.count||1)){
        this.advance(id);
      } else {
        UI.chat(s.text.replace('%n', st.counter),'plain');
        UI.refreshQuests();
      }
    }
  },
  onZone(zone){
    for(const id in QUESTS){
      const s=this.curStage(id);
      if(s && s.type==='goto' && s.zone===zone) this.advance(id);
    }
  },
};

/* ---------- WebAudio SFX: noise-based, more realistic ---------- */
const Sfx = {
  ctx:null, _noiseBuf:null, _master:null,
  vol:(function(){ try{ var v=localStorage.getItem('cr_vol_sfx'); return v!=null?+v:1; }catch(e){ return 1; } })(),
  ensure(){
    if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const len=this.ctx.sampleRate*1;
      this._noiseBuf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d=this._noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this._master=this.ctx.createGain(); this._master.gain.value=this.vol; this._master.connect(this.ctx.destination);
    }
    if(this.ctx.state==='suspended') this.ctx.resume();
    return this.ctx;
  },
  setVolume(v){ this.vol=Math.max(0,Math.min(1,v)); try{ localStorage.setItem('cr_vol_sfx',this.vol); }catch(e){} if(this._master) this._master.gain.value=this.vol; },
  noise(dur, freq, q, vol, type='bandpass', slideTo){
    try{ const ctx=this.ensure();
      const src=ctx.createBufferSource(); src.buffer=this._noiseBuf; src.loop=true;
      const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q||1;
      if(slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime+dur);
      const g=ctx.createGain(); g.gain.value=vol;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
      src.connect(f); f.connect(g); g.connect(this._master||ctx.destination);
      src.start(); src.stop(ctx.currentTime+dur);
    }catch(e){}
  },
  tone(freq, dur, type, vol, slideTo){
    try{ const ctx=this.ensure();
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=type||'sine'; o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime+dur);
      g.gain.value=vol||0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
      o.connect(g); g.connect(this._master||ctx.destination);
      o.start(); o.stop(ctx.currentTime+dur);
    }catch(e){}
  },
  click(){ this.tone(700,0.04,'square',0.015); },
  swing(){ this.noise(0.22, 900, 1.2, 0.10, 'bandpass', 220); },                 // whoosh
  hitFlesh(){ this.tone(110,0.13,'sine',0.12,55); this.noise(0.08, 350, 1, 0.10, 'lowpass'); },
  takeHit(){ this.tone(90,0.15,'sine',0.12,50); this.noise(0.1, 300, 1, 0.08, 'lowpass'); },
  block(){ this.noise(0.06, 2400, 3, 0.04); },
  bowShoot(){ this.tone(520,0.07,'triangle',0.09,180); this.noise(0.06, 3000, 2, 0.05, 'highpass'); }, // string pluck
  arrowHit(){ this.noise(0.07, 1400, 2, 0.10, 'bandpass', 300); this.tone(140,0.08,'sine',0.08,70); }, // thwack
  magicCast(){ this.tone(280,0.3,'sine',0.06,1100); this.noise(0.25, 4000, 4, 0.02, 'highpass'); },
  magicHit(){ this.tone(900,0.18,'sine',0.07,200); this.noise(0.12, 2200, 2, 0.05); },
  chop(){ this.noise(0.07, 700, 2, 0.12, 'bandpass', 200); this.tone(160,0.06,'triangle',0.08,90); },
  mine(){ this.tone(2300,0.05,'square',0.035,1400); this.noise(0.05, 4500, 4, 0.05, 'highpass'); },   // clink
  smith(){ this.tone(1850,0.07,'square',0.05,980); this.noise(0.08,3200,3,.045,'highpass'); },
  smelt(){ this.noise(.34,620,.8,.055,'lowpass',260); this.tone(170,.28,'triangle',.035,105); },
  splash(){ this.noise(0.35, 900, 0.8, 0.08, 'lowpass', 250); },
  eat(){ this.noise(0.09, 500, 1, 0.07, 'lowpass'); this.tone(220,0.06,'triangle',0.04); },
  coin(){ this.tone(1180,0.06,'sine',0.06); this.tone(1560,0.08,'sine',0.05); },
  treeFall(){ this.noise(0.5, 300, 0.8, 0.10, 'lowpass', 80); },
  kill(){ this.tone(150,0.35,'sawtooth',0.06,55); },
  death(){ this.tone(300,0.5,'sawtooth',0.08,60); },
  quest(){ this.tone(392,0.14,'square',0.05); setTimeout(()=>this.tone(523,0.2,'square',0.05),140); },
  level(){ this.tone(440,0.12,'square',0.05); setTimeout(()=>this.tone(554,0.12,'square',0.05),120);
           setTimeout(()=>this.tone(659,0.22,'square',0.05),240); },
};
