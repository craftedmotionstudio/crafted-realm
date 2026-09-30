/* ================= PLAYER & SYSTEMS ================= */
/* ---------- the Prayer book ----------
   Names, order and pictures for the interface. The RULES (level, group, percent, the 2004 drain effect) live in
   shared/combat.js PRAYERS and are applied by the combat engine (src/combat_engine.js); req/drain/boost here mirror
   them for display only. Display names follow docs/rebuild/NAMING_BIBLE.md (ids stay). protect_item (Keepsake Ward; 2004 Protect Item, level 25)
   keeps one more item on death. */
const PRAYERS = {
  thick_skin:    {name:'Oak Hide',             req:1,  icon:'\u{1F6E1}',  drain:3,  group:'def', boost:{def:1.05}},
  burst_str:     {name:'Boar\'s Heart',        req:4,  icon:'\u{1F4AA}',  drain:3,  group:'str', boost:{str:1.05}},
  clarity:       {name:'Steady Hand',          req:7,  icon:'\u{1F3AF}',  drain:3,  group:'att', boost:{att:1.05}},
  sharp_eye:     {name:'Kestrel\'s Sight',     req:8,  icon:'\u{1F3F9}',  drain:3,  group:'rng', boost:{rng:1.05}},
  mystic_will:   {name:'Candle Will',          req:9,  icon:'\u{1F52E}',  drain:3,  group:'mag', boost:{mag:1.05}},
  rock_skin:     {name:'Stone Hide',           req:10, icon:'\u{1FAA8}',  drain:6,  group:'def', boost:{def:1.10}},
  superhuman:    {name:'Bear\'s Heart',        req:13, icon:'\u26A1',     drain:6,  group:'str', boost:{str:1.10}},
  reflexes:      {name:'Sure Hand',            req:16, icon:'\u{1F441}',  drain:6,  group:'att', boost:{att:1.10}},
  protect_item:  {name:'Keepsake Ward',        req:25, icon:'\u{1F512}',  drain:2,  group:null},
  hawk_eye:      {name:'Falcon\'s Sight',      req:26, icon:'\u{1F985}',  drain:6,  group:'rng', boost:{rng:1.10}},
  mystic_lore:   {name:'Lantern Lore',         req:27, icon:'\u2728',     drain:6,  group:'mag', boost:{mag:1.10}},
  steel_skin:    {name:'Iron Hide',            req:28, icon:'\u{1F9F1}',  drain:12, group:'def', boost:{def:1.15}},
  ultimate_str:  {name:'Lion\'s Heart',        req:31, icon:'\u{1F4A5}',  drain:12, group:'str', boost:{str:1.15}},
  incredible_ref:{name:'True Hand',            req:34, icon:'\u{1F3AF}',  drain:12, group:'att', boost:{att:1.15}},
  protect_magic: {name:'Ward against Spells',  req:37, icon:'\u{1F535}',  drain:12, group:'overhead', protect:'magic',  over:0x3a6ab0},
  protect_range: {name:'Ward against Arrows',  req:40, icon:'\u{1F7E2}',  drain:12, group:'overhead', protect:'ranged', over:0x4a9a3a},
  protect_melee: {name:'Ward against Blades',  req:43, icon:'\u{1F534}',  drain:12, group:'overhead', protect:'melee',  over:0xb03a3a},
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
/* fish on a fire or a range, perch first (Minnow Hollow adds the reedpike, a touch harder to cook); no Cooking level
   gates them, the level only lowers the burn chance (game5_main.js 'cook'). Read by the skill guide too. */
const COOK_FISH = [
  {raw:'raw_perch',    done:'cooked_perch',    burnt:'burnt_perch',    xp:32, name:'a mirrorperch', hard:0},
  {raw:'raw_reedpike', done:'cooked_reedpike', burnt:'burnt_reedpike', xp:45, name:'a reedpike',    hard:.08},
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
  energy:100, runOn:false, _regenT:0,   // 2004: a new adventurer walks; the run orb turns running on (owner review 2026-09-27). Saves keep their own setting.
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
  // 2004 pace (REF2004_FEEL_REPORT.md item 2): one tile per 600 ms tick walking, two running (1.67 / 3.33 tiles/s),
  // the online server's rule too (server/engine/PathingEntity.js processMovement). Diagonal steps take a tick as well.
  moveSpeed(){ return ((this.runOn && this.energy>0) ? 2 : 1)/TICK; },
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
      UI.chat(`Well done! Your ${s} has grown to level ${after}.`,'xp');
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
  sword:     {name:'Lunge',          cost:25, acc:1.30, dmg:1.15, msg:'You lunge with deadly precision!'},
  sabre:     {name:'Riposte',        cost:25, acc:1.25, dmg:1.20, msg:'You turn the blade and cut back hard!'},
  longsword: {name:'Long Reach',     cost:35, acc:1.20, dmg:1.25, msg:'You drive the long blade through their guard!'},
  greatsword:{name:'Sweeping Arc',   cost:60, acc:1.10, dmg:1.50, msg:'You heave the greatsword round in a sweeping arc!'},
  axe:       {name:'Cleave',         cost:50, acc:1.05, dmg:1.45, msg:'You cleave with brutal force!'},
  battleaxe: {name:'Roaring Swing',  cost:60, acc:1.00, dmg:1.55, msg:'You wade in with a roaring swing!'},
  pick:      {name:'Skull Crack',    cost:50, acc:1.10, dmg:1.35, msg:'You drive the pick home!'},
  mace:      {name:'Bell Ringer',    cost:30, acc:1.25, dmg:1.25, msg:'You ring their helm like a bell!'},
  warhammer: {name:'Stonebreaker',   cost:50, acc:1.15, dmg:1.40, msg:'Your hammer comes down like falling stone!'},
  bow:       {name:'Rapid Volley',   cost:50, acc:1.20, dmg:1.30, msg:'You loose a rapid volley!'},
  longbow:   {name:'Hawk Shot',      cost:55, acc:1.35, dmg:1.25, msg:'You draw long and loose a hawk shot!'},
  staff:     {name:'Power Surge',    cost:55, acc:1.15, dmg:1.40, msg:'Your staff surges with raw power!'},
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
  // Tutor's Holm island: open ground only, one fire to a tile (HolmArrivalQA.fireBlocked; owner review 2026-09-27)
  if(typeof HolmArrivalQA!=='undefined' && HolmArrivalQA.fireBlocked){ const no=HolmArrivalQA.fireBlocked(); if(no){ UI.chat(no,'plain'); return false; } }
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
    UI.chat(`You keep ${r.kept.length?r.kept.map(k=>ITEMS[k.id].name).join(', '):'nothing'}${protect?' (Keepsake Ward kept one more)':''}.`+
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
  UI.chat('You wake in Hearthmere Square.','plain');
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
/* ---------- Music ----------
   The game plays the 2004 General MIDI set (src/audio_music2004.js, docs/rebuild/MUSIC_2004.md): its Director fills
   TRACKS and replaces every Music method at load. This stub keeps only the shape the Director, the bridge and older
   saves expect (the retired oscillator tracks were removed at the owner's request, 2026-09-29). */
const TRACKS = {};
const Music = {
  on:false, _master:null, _timer:null, current:null, mode:'auto', unlocked:[],
  ensure(){
    const ctx=Sfx.ensure();
    if(!this._master){ this._master=ctx.createGain(); this._master.gain.value=0;
      this._master.connect(ctx.destination); }
    return ctx;
  },
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
    UI.refreshQuests(); Sfx.questDone();
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

/* ---------- Sound effects (sound pass, owner review 2026-09-29; docs/rebuild/HOLM_SOUND_INVENTORY.md) ----------
 * Every effect is a recipe in src/sfx_recipes.js, synthesized by src/sfx_lib.js (noise bursts, resonant filters, pitch
 * envelopes, modal rings, plucked strings, small formant voices; never a square or saw wave) and played here as one
 * buffer source and one gain node on the SFX bus: _master (the Sound effects slider, saved as cr_vol_sfx) -> a gentle
 * high shelf (-3 dB over 7 kHz) -> a soft peak catcher -> the speakers. The music has its own bus (src/audio_music2004.js).
 * Nothing sounds before the player's first click or key (the browser's autoplay rule: no queued burst on the first
 * gesture), nothing is built at volume 0 (mute), and every play is nudged a little in pitch and level (SfxLib.play).
 * The named methods below are the call sites' vocabulary; a sound with a world position (at:{x,z}) fades with distance. */
const Sfx = {
  ctx:null, _noiseBuf:null, _master:null, _tame:null, _limit:null, unlocked:false, _warmed:false, _deathAt:-1e9,
  vol:(function(){ try{ var v=localStorage.getItem('cr_vol_sfx'); return v!=null?+v:1; }catch(e){ return 1; } })(),
  ensure(){
    if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const len=this.ctx.sampleRate*1;
      this._noiseBuf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d=this._noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
      this._master=this.ctx.createGain(); this._master.gain.value=this.vol; this._master.__sfxName='sfx-bus';
      try{
        this._tame=this.ctx.createBiquadFilter(); this._tame.type='highshelf'; this._tame.frequency.value=7000; this._tame.gain.value=-3;
        this._limit=this.ctx.createDynamicsCompressor(); this._limit.threshold.value=-14; this._limit.knee.value=10; this._limit.ratio.value=4;
        this._limit.attack.value=.003; this._limit.release.value=.2;
        this._master.connect(this._tame); this._tame.connect(this._limit); this._limit.connect(this.ctx.destination);
      }catch(e){ this._master.connect(this.ctx.destination); }
    }
    if(this.ctx.state==='suspended' && this.gesture()) this.ctx.resume();
    return this.ctx;
  },
  // the browser's autoplay rule: true once the player has clicked, tapped or pressed a key on the page
  gesture(){
    if(this.unlocked) return true;
    try{ if(typeof navigator!=='undefined' && navigator.userActivation && navigator.userActivation.hasBeenActive) this.unlocked=true; }catch(e){}
    return this.unlocked;
  },
  ready(){ return this.vol>0 && this.gesture() && typeof SfxLib!=='undefined'; },
  setVolume(v){ this.vol=Math.max(0,Math.min(1,v)); try{ localStorage.setItem('cr_vol_sfx',this.vol); }catch(e){} if(this._master) this._master.gain.value=this.vol; },
  // how loud a sound at world point p is where the adventurer stands: full within 2.5 tiles, gone by `range`
  falloff(p,range){
    if(!p || typeof player==='undefined' || !player) return 1;
    const d=Math.hypot(player.position.x-p.x, player.position.z-p.z), r=range||16;
    if(d<=2.5) return 1; if(d>=r) return 0; const k=1-(d-2.5)/(r-2.5); return k*k;
  },
  // play a recipe: o {gain, rate, delay, at:{x,z}, range}
  play(id,o){
    if(!this.ready()) return null;
    try{ o=o||{}; let g=o.gain==null?1:o.gain; if(o.at){ g*=this.falloff(o.at,o.range); if(g<.01) return null; }
      const ctx=this.ensure(); this.warm();
      return SfxLib.play(ctx, this._master, id, {gain:g, rate:o.rate, delay:o.delay, variant:o.variant});
    }catch(e){ return null; }
  },
  // a looping bed (a fire's crackle, water, the furnace): {setGain(g), stop()}; null until sound may play
  loop(id){
    if(!this.ready()) return null;
    try{ const ctx=this.ensure(), h=SfxLib.play(ctx, this._master, id, {gain:0, loop:true}); if(!h) return null;
      return {id, h, g:0, setGain(g){ g=Math.max(0,g); if(Math.abs(g-this.g)<1e-4) return; this.g=g; try{ h.gain.gain.setTargetAtTime(g, ctx.currentTime, .25); }catch(e){ h.gain.gain.value=g; } },
        stop(){ try{ h.gain.gain.setTargetAtTime(0, ctx.currentTime, .1); h.src.stop(ctx.currentTime+.6); }catch(e){} } };
    }catch(e){ return null; }
  },
  // the common sounds render ahead, a few per idle moment, after the first gesture (a first play never renders on the spot)
  warm(){
    if(this._warmed || typeof SfxLib==='undefined' || !SfxLib.WARM) return; this._warmed=true;
    const ctx=this.ctx, ids=SfxLib.WARM.slice(), step=()=>{ const t0=performance.now(); try{ while(ids.length && performance.now()-t0<6) SfxLib.warm(ctx,[ids.shift()]); }catch(e){ ids.length=0; } if(ids.length) later(step); };
    const later=f=>{ if(typeof requestIdleCallback==='function') requestIdleCallback(f,{timeout:500}); else setTimeout(f,60); };
    later(step);
  },
  // the old primitives, kept for any caller outside this pass: gated like everything else, and never square or saw
  noise(dur, freq, q, vol, type='bandpass', slideTo){
    if(!this.ready()) return;
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
    if(!this.ready()) return;
    try{ const ctx=this.ensure();
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=(type==='square'||type==='sawtooth')?'triangle':(type||'sine'); o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime+dur);
      g.gain.value=vol||0.05;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
      o.connect(g); g.connect(this._master||ctx.destination);
      o.start(); o.stop(ctx.currentTime+dur);
    }catch(e){}
  },
  // ---- UI
  click(){ this.play('ui_click'); },
  tab(){ this.play('ui_tab'); },
  windowOpen(){ this.play('ui_window_open'); },
  windowClose(){ this.play('ui_window_close'); },
  mapOpen(){ this.play('ui_map_open'); },
  mapClose(){ this.play('ui_map_close'); },
  dialogue(){ this.play('ui_dialogue'); },
  quest(){ this.play('quest_step'); },
  questDone(){ this.play('quest_done'); },
  // level-up (owner 2026-09-29): the fireworks stay; the sound is the picked candidate (SfxLib.LEVEL_PICK, a lute arpeggio)
  level(){ this.play((typeof SfxLib!=='undefined'&&SfxLib.LEVEL_PICK)||'level_up_a'); },
  coin(){ this.play('coins'); },
  // ---- items
  material(id){
    const it=(typeof ITEMS!=='undefined'&&ITEMS[id])||{}, m=it.model||'', n=((it.name||'')+' '+id).toLowerCase(), t=it.tier||'';
    if(it.equip==='ammo'||/arrow|bolt/.test(n)) return 'ammo';
    if(m==='axe'||m==='pick'||typeof it.tool==='string'||/hatchet|pickaxe/.test(n)) return 'tool';
    if(/^(bow|shortbow|longbow|staff|wand)$/.test(m)||/\b(bow|shortbow|longbow|staff|wand)\b/.test(n)||/wood_shield|wooden/.test(n)) return 'wood';
    if(/leather|hide/.test(t+' '+n)||/chaps|vambrace|coif/.test(m+' '+n)) return 'leather';
    if(/cloth|wool|starweave/.test(t)||/^(robe|hat|cape|hood|apron|amulet|ring)$/.test(m)||/robe|cape|hat|hood|apron|shirt|trousers|cloak|amulet|ring/.test(n)) return 'cloth';
    return it.equip?'metal':'cloth';
  },
  equip(id){ this.play('equip_'+this.material(id)); },
  unequip(id){ const k=this.material(id); this.play('unequip_'+(k==='ammo'?'wood':k)); },
  pickup(){ this.play('pickup'); },
  drop(){ this.play('drop'); },
  // the strongbox; at the island's vault the iron gate sounds instead (HolmIslandAnim, as it swings)
  bankOpen(){ try{ if(typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.atVault&&HolmIslandAnim.atVault()) return; }catch(e){} this.play('bank_open'); },
  bankDeposit(){ this.play('bank_deposit'); },
  bankWithdraw(){ this.play('bank_withdraw'); },
  // eating: a drinkable (the menu's "Drink" rule, osrs_menu_items.js) gulps instead of crunching
  eat(id){ const d=id&&typeof ITEMS!=='undefined'&&ITEMS[id]; this.play(id&&((d&&d.drink)||/(^|_)(ale|potion|brew|wine|beer|tea|milk|juice|mead|cider)(_|$)/.test(id))?'drink':'eat'); },
  drink(){ this.play('drink'); },
  // ---- doors (at: the door's world point, so a door across the yard is quieter)
  doorOpen(at){ this.play('door_open',{at,range:12}); },
  doorClose(at){ this.play('door_close',{at,range:12}); },
  doorLocked(at){ this.play('door_locked',{at,range:12}); },
  gateOpen(at){ this.play('gate_open',{at,range:12}); },
  gateClose(at){ this.play('gate_close',{at,range:12}); },
  stairs(){ this.play('stairs'); },
  // ---- skills. A stroke sound (chop, the pickaxe) follows the stroke itself: while the island's sound director
  // (HolmSound) watches the adventurer's clip it plays the blow at the axe's or pick's lowest point, and the tick's call
  // here stands down; anywhere else the tick plays it.
  stroke(kind){ try{ return typeof HolmSound!=='undefined' && !!HolmSound.syncs && HolmSound.syncs(kind); }catch(e){ return false; } },
  chop(){ if(!this.stroke('chop')) this.play('chop'); },
  mine(){ if(!this.stroke('mine')) this.play('mine'); },
  logLand(){ this.play('log_land',{delay:.12}); },
  // the tree starts to fall: the creak now; the landing comes from the island's fall animation (HolmIslandAnim), or ~1 s on
  treeFall(at){ this.play('tree_creak',{at,range:20}); if(!(typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.active&&HolmIslandAnim.active())) this.play('tree_fall',{at,range:24,delay:.95}); },
  treeLand(at){ this.play('tree_fall',{at,range:24}); },
  oreBreak(){ this.play('ore_break',{delay:.08}); },
  rockEmpty(at){ this.play('rock_empty',{at,delay:.25}); },
  prospect(){ this.play('prospect'); },
  netCast(){ this.play('fish_cast'); },
  splash(){ this.play('fish_splash'); },
  fishCatch(){ this.play('fish_catch'); },
  tinderStrike(){ this.play('fire_strike'); },
  fireCatch(){ this.play('fire_catch'); },
  sizzle(){ this.play('cook_sizzle'); },
  cookDone(){ this.play('cook_done'); },
  burn(){ this.play('cook_burn'); },
  bakeIn(){ this.play('bake_in'); },
  bakeDone(){ this.play('bake_done'); },
  furnace(){ this.play('smelt_roar'); },
  smelt(){ this.play('smelt_bar'); },
  anvil(){ this.play('anvil'); },
  // the item comes off the anvil; without the island's hammer-strike watcher (the mainland) the last blow rings here too
  smith(){ if(!(typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.active&&HolmIslandAnim.active())) this.play('anvil'); this.play('smith_done',{delay:.15}); },
  bucketTake(){ this.play('bucket_take'); },
  bucketFill(kind){ this.play(kind==='flour'?'bucket_flour':'bucket_water'); },
  dough(){ this.play('dough'); },
  ropeTie(){ this.play('rope_tie'); },
  ropeClimb(){ this.play('rope_climb'); },
  ladder(dir){ this.play(dir==='down'?'ladder_down':'ladder_up'); },
  // ---- combat (the island's blows and voices come through CombatFX, src/combat_fx.js)
  swing(type){ this.play('swing_'+(type==='stab'||type==='crush'?type:'slash')); },
  hitFlesh(type,big){ this.play('hit_'+(type==='stab'||type==='crush'?type:'slash'),{rate:big?.9:1}); },
  takeHit(big){ this.play('hurt',{rate:big?.9:1}); },
  block(){ this.play('block'); },
  miss(){ this.play('miss'); },
  bowShoot(){ this.play('bow'); },
  arrowHit(ok){ this.play(ok===false?'arrow_miss':'arrow_hit'); },
  spellCharge(){ this.play('spell_charge'); },
  magicCast(){ this.play('spell_cast'); },
  magicHit(){ this.play('spell_hit'); },
  spellSplash(){ this.play('spell_splash'); },
  bodyFall(at){ this.play('body_fall',{at}); },
  kill(){ this.play('body_fall'); },
  // the adventurer falls (combat_engine startPlayerDeath); the respawn's call a few ticks later stands down
  death(){ const n=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); if(n-this._deathAt<8000) return; this._deathAt=n; this.play('player_death'); },
  // a creature's voice: kind 'idle' | 'attack' | 'hurt' | 'death' for the rat, goblin, chicken and cow; false if it has none
  species(npc){ const t=npc&&npc.t||{}, m=String(t.model||'').toLowerCase(), id=String(npc&&npc.typeId||'').toLowerCase();
    if(/^(cinder_)?rat$/.test(m)||/(^|_)rat(_|$)/.test(id)) return 'rat';
    if(m==='goblin'||/(^|_)(gob|goblin|gnarlgob)(_|$)/.test(id)) return 'goblin';
    if(m==='chicken'||/(^|_)(chicken|hen|pasturehen)(_|$)/.test(id)) return 'chicken';
    if(m==='cow'||/(^|_)(cow|calf|moorcalf)(_|$)/.test(id)) return 'cow';
    return null; },
  creature(npc,kind){ const s=this.species(npc); if(!s || typeof SfxLib==='undefined' || !SfxLib.DEFS[s+'_'+kind]) return false;
    const m=npc.mesh&&npc.mesh.position; this.play(s+'_'+kind,{at:m?{x:m.x,z:m.z}:null,range:kind==='idle'?11:18}); return true; },
  // ---- world
  bell(gain,at){ this.play('bell',{gain:gain==null?1:gain,at,range:30}); },
  skiffPush(){ this.play('skiff_push'); },
  oar(){ this.play('oar'); },
  step(surface){ this.play(surface==='wood'?'step_wood':surface==='stone'?'step_stone':'step_grass'); },
};
// the autoplay rule: the first click, tap or key on the page unlocks sound (and wakes a context made before it)
if(typeof document!=='undefined'){
  const unlock=()=>{ Sfx.unlocked=true; try{ if(Sfx.ctx && Sfx.ctx.state==='suspended') Sfx.ctx.resume(); }catch(e){}
    ['pointerdown','mousedown','keydown','touchstart'].forEach(ev=>document.removeEventListener(ev,unlock,true)); };
  ['pointerdown','mousedown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,unlock,{capture:true,passive:true}));
}
