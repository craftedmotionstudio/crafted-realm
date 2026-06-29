/* ================= PLAYER & SYSTEMS ================= */
/* ---------- the Prayer book — levels and drain straight from the classics ---------- */
const PRAYERS = {
  thick_skin:    {name:'Thick Skin',           req:1,  icon:'\u{1F6E1}',  drain:5,  group:'def', boost:{def:1.05}},
  burst_str:     {name:'Burst of Strength',    req:4,  icon:'\u{1F4AA}',  drain:5,  group:'str', boost:{str:1.05}},
  clarity:       {name:'Clarity of Thought',   req:7,  icon:'\u{1F3AF}',  drain:5,  group:'att', boost:{att:1.05}},
  rock_skin:     {name:'Rock Skin',            req:10, icon:'\u{1FAA8}',  drain:10, group:'def', boost:{def:1.10}},
  superhuman:    {name:'Superhuman Strength',  req:13, icon:'\u26A1',     drain:10, group:'str', boost:{str:1.10}},
  reflexes:      {name:'Improved Reflexes',    req:16, icon:'\u{1F441}',  drain:10, group:'att', boost:{att:1.10}},
  protect_magic: {name:'Protect from Magic',   req:37, icon:'\u{1F535}',  drain:20, group:'overhead', protect:'magic',  over:0x3a6ab0},
  protect_range: {name:'Protect from Missiles',req:40, icon:'\u{1F7E2}',  drain:20, group:'overhead', protect:'ranged', over:0x4a9a3a},
  protect_melee: {name:'Protect from Melee',   req:43, icon:'\u{1F534}',  drain:20, group:'overhead', protect:'melee',  over:0xb03a3a},
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

/* ---------- the Spellbook — strike and bolt tiers from the classics ---------- */
const SPELLS = {
  wind_strike: {name:'Wind Strike',  req:1,  max:2,  baseXp:5.5,  icon:'\u{1F32C}',  color:0xc8d8e8, runes:{air_rune:1, mind_rune:1}},
  water_strike:{name:'Water Strike', req:5,  max:4,  baseXp:7.5,  icon:'\u{1F4A7}', color:0x4a8ac8, runes:{water_rune:1, air_rune:1, mind_rune:1}},
  earth_strike:{name:'Earth Strike', req:9,  max:6,  baseXp:9.5,  icon:'\u{1FAA8}', color:0x8a6a3a, runes:{earth_rune:2, air_rune:1, mind_rune:1}},
  fire_strike: {name:'Fire Strike',  req:13, max:8,  baseXp:11.5, icon:'\u{1F525}', color:0xe87a2e, runes:{fire_rune:3, air_rune:2, mind_rune:1}},
  wind_bolt:   {name:'Wind Bolt',    req:17, max:9,  baseXp:13.5, icon:'\u{1F300}', color:0x9ab8d8, runes:{air_rune:2, chaos_rune:1}},
  water_bolt:  {name:'Water Bolt',   req:23, max:10, baseXp:16.5, icon:'\u{1F30A}', color:0x2a6ac8, runes:{water_rune:2, air_rune:2, chaos_rune:1}},
  earth_bolt:  {name:'Earth Bolt',   req:29, max:11, baseXp:19.5, icon:'\u26F0',    color:0x6a4a2a, runes:{earth_rune:3, air_rune:2, chaos_rune:1}},
  fire_bolt:   {name:'Fire Bolt',    req:35, max:12, baseXp:22.5, icon:'\u2604',    color:0xd84a1e, runes:{fire_rune:4, air_rune:3, chaos_rune:1}},
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

const Player = {
  xp:{}, hp:10, maxHp:10,
  inv: new Array(24).fill(null),
  bank: [],
  equip:{head:null, body:null, legs:null, weapon:null, shield:null},
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
  spell:null, alchMode:null, teleCd:0, stunT:0,
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
    if(moving && this.runOn && this.energy>0){
      this.energy = Math.max(0, this.energy - dt*(1.4 + 2.2*(this.weight()/64)));
      if(this.energy<=0){ this.runOn=false; UI.chat("You've run out of energy and slow to a walk.",'plain'); UI.refreshRun(); }
    } else if(this.energy<100){
      this.energy = Math.min(100, this.energy + dt*0.9);
    }
    this.tickPrayers(dt);
    if(this.teleCd>0) this.teleCd=Math.max(0, this.teleCd-dt);
    if(this.stunT>0) this.stunT=Math.max(0, this.stunT-dt);
    // special-attack energy regenerates +10% every 30s (OSRS), i.e. +1% per 3s
    this.specT=(this.specT||0)+dt;
    if(this.specT>=3){ this.specT-=3; if(this.spec<100){ this.spec=Math.min(100,(this.spec||0)+1); if(UI.refreshSpec) UI.refreshSpec(); } }
    // (hitpoint regen lives in Player.regen — already 1 hp/min, OSRS-correct)
  },
  moveSpeed(){ return (this.runOn && this.energy>0) ? 4.2 : 2.4; },
  combatLevel(){
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
    const before = this.lvl(s);
    this.xp[s]+=amt;
    UI.xpDrop(s, amt);
    const after = this.lvl(s);
    if(after>before){
      UI.chat(`Congratulations, you just advanced ${s==='Hitpoints'?'a':'an'} ${s} level. You are now level ${after}.`,'xp');
      if(s==='Hitpoints'){ this.maxHp=after; this.hp=Math.min(this.hp+1,this.maxHp); }
      Sfx.level();
    }
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
  weaponStyle(){
    if(this.spell && SPELLS[this.spell]) return 'magic';   // armed autocast holds the style; the cast itself checks runes
    const w=this.equip.weapon; return w?ITEMS[w].style||'melee':'melee'; },
  attackStyles:{melee:0, ranged:0, magic:0},
  autoRetaliate:true,
  spec:100, specArmed:false, specT:0,
  curStyle(){
    const cls=this.weaponStyle();
    const list=STYLE_DEFS[cls]||STYLE_DEFS.melee;
    return list[Math.min(this.attackStyles[cls]||0, list.length-1)];
  },
  styleBoost(k){ const s=this.curStyle(); return (s.boost&&s.boost[k])||0; },
  weaponSpeed(){            // seconds, derived from OSRS-style tick counts
    let ticks;
    if(this.weaponStyle()==='magic') ticks=5;
    else { const w=this.equip.weapon; ticks=(w?(ITEMS[w].speedTicks||4):4); }
    ticks += this.curStyle().speedDelta||0;
    return Math.max(2,ticks)*TICK; },
  _sumBonus(field){
    let t=0;
    for(const k in this.equip){ const v=this.equip[k];
      if(v && ITEMS[v][field]) t+=ITEMS[v][field]; }
    return t;
  },
  atkBonus(){ return this._sumBonus('aBonus'); },
  strBonus(){ return this._sumBonus('sBonus'); },
  defBonus(){ return this._sumBonus('dBonus'); },
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

/* ---------- OSRS combat math (publicly documented formulas) ----------
   attack roll  = (effective level) * (equipment bonus + 64)
   defence roll = (effective level) * (equipment bonus + 64)
   hit chance   = a > d ? 1 - (d+2)/(2*(a+1)) : a/(2*(d+1))
   max hit      = floor(0.5 + effStr * (strBonus + 64) / 640)          */
function rollAccuracy(attRoll, defRoll){
  return attRoll > defRoll ? 1 - (defRoll+2)/(2*(attRoll+1)) : attRoll/(2*(defRoll+1));
}
function osrsMaxHit(effStr, sBonus){
  return Math.max(1, Math.floor(0.5 + effStr*(sBonus+64)/640));
}

/* ---------- visible gear on the character ---------- */
function refreshPlayerGear(){
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
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.04,8), mat(tierMetal(def)));
      brim.position.y=0.1;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.42,8), mat(tierMetal(def)));
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
      const m=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,0.9,8), mat(tierMetal(def)));
      m.position.y = player.userData.bb ? 0.7 : 0.78;
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
  if(e.amulet){ const m=gearMesh(e.amulet); if(m){ m.position.set(0,1.42,0.13); player.add(m); gear.amulet=m; } }
  if(e.cape){ const m=gearMesh(e.cape); if(m){ player.add(m); gear.cape=m; } }
}

/* ---------- NPCs ---------- */
function spawnNpc(typeId, x, z){
  const t = NPC_TYPES[typeId];
  // never spawn inside a wall — nudge to a free spot
  if(collides(x,z,0.4)){
    for(let i=0;i<14;i++){
      const a=Math.random()*6.28, r=2+Math.random()*5;
      const nx=x+Math.cos(a)*r, nz=z+Math.sin(a)*r;
      if(!collides(nx,nz,0.4) && groundY(nx,nz)!==null){ x=nx; z=nz; break; }
    }
  }
  let mesh;
  if(t.assetModel){                          // pipeline-authored Blockbench model
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
    mesh = humanoid(t.color, {robe:t.robe, hat:t.hat, hatColor:t.robe, skin:t.skin, scale:t.size});
    mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    if(t.weapon){
      const w = t.weapon==='battleaxe' ? axeMesh(METALS.steel)
              : t.weapon==='staff' ? staffMesh(0x9ad0ff) : swordMesh(METALS.iron);
      holdWeapon(mesh.userData.parts.handR, w, {model: t.weapon==='staff'?'staff':'sword'});
    } else if(t.ranged){
      holdWeapon(mesh.userData.parts.handR, staffMesh(0xb48ae0), {model:'staff'});
    }
  } else {
    mesh = beast(t.color, t.size);
  }
  mesh.position.set(x, gy(x,z), z);
  const hpbar = makeHPBar(mesh, (t.humanoid||t.model==='goblin') ? 2.2*t.size : 1.2*t.size+0.6);
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
  WORLD.npcs.forEach(n=>{ if(!n.dead) ents.push({m:n.mesh, r:0.45*(n.t.size||1)+0.15, push:1}); });
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
    age:0, life:180, publicAt:60, owner:'player'};   // OSRS lifecycle: ~60s private → public → ~3min despawn
  scene.add(m); WORLD.clickables.push(m); WORLD.drops.push(m);
}
function removeClickable(obj){
  const i=WORLD.clickables.indexOf(obj); if(i>=0) WORLD.clickables.splice(i,1);
}

/* ---------- projectiles (arrows arc through the air) ---------- */
const PROJECTILES = [];
function fireProjectile(kind, fromObj, npc, dmg, tint){
  let mesh, dur, arc;
  const from = fromObj.position.clone(); from.y += 1.2;
  if(kind==='arrow'){ mesh = arrowMesh(); dur = 0.55; arc = 1.6; }
  else { // magic bolt — tinted by its school
    mesh = new THREE.Group();
    const orb=new THREE.Mesh(new THREE.SphereGeometry(0.13,6,6),
      new THREE.MeshBasicMaterial({color:tint||0x6fd2ff}));
    mesh.add(orb);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,6),
      new THREE.MeshBasicMaterial({color:tint||0x9fe4ff, transparent:true, opacity:0.35}));
    mesh.add(glow);
    dur = 0.5; arc = 0.4;
  }
  mesh.position.copy(from);
  scene.add(mesh);
  PROJECTILES.push({mesh, from, npc, t:0, dur, arc, dmg, kind});
}
function updateProjectiles(dt){
  for(let i=PROJECTILES.length-1;i>=0;i--){
    const p=PROJECTILES[i];
    p.t += dt;
    const f = Math.min(1, p.t/p.dur);
    const to = p.toPlayer ? player.position.clone() : p.npc.mesh.position.clone();
    to.y += p.toPlayer ? 1.1 : 0.7*p.npc.t.size;
    const pos = p.from.clone().lerp(to, f);
    pos.y += Math.sin(f*Math.PI)*p.arc;
    // orient along travel direction
    const ahead = p.from.clone().lerp(to, Math.min(1,f+0.05));
    ahead.y += Math.sin(Math.min(1,f+0.05)*Math.PI)*p.arc;
    p.mesh.position.copy(pos);
    p.mesh.lookAt(ahead);
    if(f>=1){
      scene.remove(p.mesh);
      PROJECTILES.splice(i,1);
      if(p.toPlayer){
        Player.hp -= p.dmg; UI.floatDmg(player, p.dmg);
        if(p.dmg>0){ Player.addXp('Defence', p.dmg*2); Sfx.takeHit(); }
        UI.refreshHud();
        if(Player.autoRetaliate && !Player.target && !Player.moveTo && !Player.action && p.npc && !p.npc.dead && Player.hp>0) Player.target=p.npc;
        if(Player.hp<=0) playerDeath();
      } else {
        if(!p.npc.dead) applyHit(p.npc, p.dmg, p.xpTok || (p.kind==='arrow'?'Ranged':'Magic'));
      }
      if(p.kind==='arrow') Sfx.arrowHit(); else Sfx.magicHit();
    }
  }
}

/* ---------- combat (OSRS-ish ticks: sword 2.4s, bow/magic 3.0s) ---------- */
/* ---------- combat styles (OSRS-style training selector) ----------
   Each weapon class offers styles that decide WHICH skill the damage trains
   and grant small invisible boosts, exactly in the spirit of 2007:
   melee: Accurate(+3 Att lvl) / Aggressive(+3 Str) / Defensive(+3 Def) / Controlled(+1 all, shared xp)
   ranged: Accurate(+3 Rng) / Rapid(-1 tick speed) / Longrange(+2 tiles, trains Def too)
   magic: Standard / Defensive (splits xp with Defence) */
const STYLE_DEFS = {
  melee: [
    {key:'accurate',  name:'Stab',  label:'Accurate',   xp:'Attack',    boost:{att:3}},
    {key:'aggressive',name:'Lunge', label:'Aggressive', xp:'Strength',  boost:{str:3}},
    {key:'controlled',name:'Slash', label:'Controlled', xp:'Shared',    boost:{att:1,str:1,def:1}},
    {key:'defensive', name:'Block', label:'Defensive',  xp:'Defence',   boost:{def:3}},
  ],
  ranged: [
    {key:'accurate',  name:'Accurate',  label:'Accurate',  xp:'Ranged',    boost:{rng:3}},
    {key:'rapid',     name:'Rapid',     label:'Rapid',     xp:'Ranged',    speedDelta:-1},
    {key:'longrange', name:'Longrange', label:'Longrange', xp:'RangedDef', boost:{def:3}, rangeBonus:2},
  ],
  magic: [
    {key:'standard',  name:'Standard',  label:'Standard',  xp:'Magic'},
    {key:'defensive', name:'Defensive', label:'Defensive', xp:'MagicDef', boost:{def:3}},
  ],
};
/* special attacks: armed via the spec orb, consume spec energy, and boost the accuracy &
   damage of that one swing. Keyed by weapon MODEL so a whole class shares a signature spec
   — our own designs (not OSRS's). */
const SPECIALS = {
  sword: {name:'Lunge',        cost:25, acc:1.30, dmg:1.15, msg:'You lunge with deadly precision!'},
  axe:   {name:'Cleave',       cost:50, acc:1.05, dmg:1.45, msg:'You cleave with brutal force!'},
  pick:  {name:'Skull Crack',  cost:50, acc:1.10, dmg:1.35, msg:'You drive the pick home!'},
  bow:   {name:'Rapid Volley', cost:50, acc:1.20, dmg:1.30, msg:'You loose a rapid volley!'},
  staff: {name:'Power Surge',  cost:55, acc:1.15, dmg:1.40, msg:'Your staff surges with raw power!'},
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
          Player.hp-=dmg; UI.floatDmg(player, dmg);
          UI.chat('Korthul slams the ground — the cavern quakes!','combat'); UI.refreshHud();
          if(Player.hp<=0) playerDeath();
        }
      }
    }
  },
};
function applyHit(npc, dmg, xpSkill){
  npc.hp -= dmg; UI.floatDmg(npc.mesh, dmg);
  npc.hpbar.spr.visible = true; npc.hpbar.draw(Math.max(0,npc.hp/npc.t.hp));
  npc.target = 'player';
  if(dmg>0){
    const give=(s,m)=>Player.addXp(s, Math.max(1,Math.ceil(dmg*m)));
    switch(xpSkill){
      case 'Shared':    give('Attack',1.34); give('Strength',1.34); give('Defence',1.34); break;
      case 'RangedDef': give('Ranged',2);    give('Defence',2); break;
      case 'MagicDef':  give('Magic',2);     give('Defence',2); break;
      default:          give(xpSkill,4);
    }
    give('Hitpoints',1.33);
  }
  if(npc.hp<=0) killNpc(npc);
}
function playerAttack(npc, dt){
  Player.attackCd -= dt;
  const dist = player.position.distanceTo(npc.mesh.position);
  const style = Player.weaponStyle();
  const sdef = Player.curStyle();
  const sizeReach = ((npc.t && npc.t.size)||1) * 0.8;   // big targets are struck at their edge
  const range = (style==='melee' ? 1.4 + sizeReach : 9 + sizeReach) + (sdef.rangeBonus||0);
  if(dist > range){
    // chase along a real path; recompute when the quarry strays from the path's end
    const goalMoved = !Player.moveTo ||
      Math.hypot(Player.moveTo.x-npc.mesh.position.x, Player.moveTo.z-npc.mesh.position.z) > 2.0;
    if(goalMoved && typeof orderWalk==='function') orderWalk(npc.mesh.position);
    else if(goalMoved) Player.moveTo = npc.mesh.position.clone();
    return;
  }
  Player.moveTo = null; Player.path = [];
  player.lookAt(npc.mesh.position.x, player.position.y, npc.mesh.position.z);
  if(Player.attackCd > 0) return;
  Player.attackCd = Player.weaponSpeed();
  if(style==='ranged'){
    if(!Player.equip.weapon || ITEMS[Player.equip.weapon].style!=='ranged'){ return; }
    if(Player.count('arrows')<1){ UI.chat('There are no arrows left in your quiver.','plain'); Player.target=null; return; }
    Player.removeItem('arrows',1);
  }
  let spellDef=null;
  if(style==='magic'){
    spellDef = SPELLS[Player.spell];
    if(!spellDef){ Player.castMode=false; Player.target=null; return; }
    if(!Player.hasRunes(spellDef)){
      UI.chat('You do not have enough runes to cast this spell.','plain');
      Player.spell=null; Player.castMode=false; Player.target=null;
      if(UI.refreshSpells) UI.refreshSpells();
      return;
    }
    Player.spendRunes(spellDef);
  }
  // special attack: if armed, the weapon has one, and we have the energy, fire it this swing
  let spec=null;
  const _wm = Player.equip.weapon ? ITEMS[Player.equip.weapon].model : null;
  if(Player.specArmed && _wm && SPECIALS[_wm] && Player.spec>=SPECIALS[_wm].cost){
    spec=SPECIALS[_wm]; Player.spec-=spec.cost; Player.specArmed=false;
    if(UI.refreshSpec) UI.refreshSpec();
    UI.chat(spec.msg,'combat');
  }
  const skillLv = (style==='ranged' ? Player.lvl('Ranged')+Player.styleBoost('rng')
                 : style==='magic'  ? Player.lvl('Magic')
                 : Math.floor(Player.lvl('Attack')*Player.prayerMult('att'))+Player.styleBoost('att'));
  const attRoll = (skillLv+8) * ((style==='magic'?10+Player.magBonus():Player.atkBonus())+64);
  const defRoll = (npc.t.def+9) * (npc.t.dBonus+64);
  let hitChance = rollAccuracy(attRoll, defRoll);
  if(spec) hitChance = Math.min(1, hitChance*spec.acc);
  let maxHit = style==='melee' ? osrsMaxHit(Math.floor(Player.lvl('Strength')*Player.prayerMult('str'))+Player.styleBoost('str')+8, Player.strBonus())
               : style==='ranged' ? osrsMaxHit(Player.lvl('Ranged')+8, Player.strBonus())
               : spellDef.max;   // each spell knows its own ceiling, like the classics
  if(spec) maxHit = Math.ceil(maxHit*spec.dmg);
  const dmg = Math.random()<hitChance ? Math.ceil(Math.random()*maxHit) : 0;
  swing(player);
  if(style==='melee'){
    Sfx.swing(); if(dmg>0) Sfx.hitFlesh();
    applyHit(npc, dmg, sdef.xp);
  } else if(style==='ranged'){
    Sfx.bowShoot();
    fireProjectile('arrow', player, npc, dmg);
    PROJECTILES[PROJECTILES.length-1].xpTok = sdef.xp;
  } else {
    Sfx.magicCast();
    Player.addXp('Magic', spellDef.baseXp);   // the cast itself teaches, hit or miss
    fireProjectile('bolt', player, npc, dmg, spellDef.color);
    const pr=PROJECTILES[PROJECTILES.length-1];
    pr.xpTok = sdef.xp;
  }
}

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
  npc.mesh.visible = false; removeClickable(npc.mesh);
  if(!opt.silent) UI.chat(`You have defeated the ${npc.t.name}.`,'combat');
  dropLoot(npc.mesh.position, npc.t.drops);
  if(Player.target===npc) Player.target=null;
  if(!opt.noQuest){ Quest.onKill(npc.typeId); Tutorial.notify('kill', npc.typeId); }
  if(!opt.silent) Sfx.kill();
}
function fireBoltAtPlayer(npc, dmg){
  const m = new THREE.Group();
  const orb=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6),
    new THREE.MeshBasicMaterial({color:0xc86aff}));
  m.add(orb);
  m.position.copy(npc.mesh.position); m.position.y += 1.4*npc.t.size;
  scene.add(m);
  PROJECTILES.push({mesh:m, from:m.position.clone(), toPlayer:true, t:0, dur:0.5, arc:0.3, dmg, kind:'bolt'});
}
function npcAttack(npc, dt){
  npc.attackCd -= dt;
  const dist = npc.mesh.position.distanceTo(player.position);
  // spellcasters hold range and hurl bolts
  if(npc.t.ranged && dist <= 8 && dist >= 2.2){
    npc.mesh.lookAt(player.position.x, npc.mesh.position.y, player.position.z);
    if(npc.attackCd>0) return;
    npc.attackCd = npc.t.speedTicks*TICK;
    const attRoll = (npc.t.att+8) * (npc.t.aBonus+64);
    const defRoll = (Math.floor(Player.lvl('Defence')*Player.prayerMult('def'))+Player.styleBoost('def')+8) * (Player.defBonus()+64);
    let dmg = Math.random()<rollAccuracy(attRoll,defRoll) ? Math.ceil(Math.random()*npcMaxHit(npc.t)) : 0;
    if(dmg>0 && Player.protectedFrom(npc.t.ranged==='arrow' ? 'ranged' : 'magic')) dmg=0;
    swing(npc.mesh);
    Sfx.magicCast();
    fireBoltAtPlayer(npc, dmg);
    return;
  }
  const meleeReach = 1.1 + ((npc.t.size||1)*0.8);   // big beasts strike from their edge
  if(dist > meleeReach){
    const dir = player.position.clone().sub(npc.mesh.position).setY(0).normalize();
    let nx = npc.mesh.position.x + dir.x*dt*2.6, nz = npc.mesh.position.z + dir.z*dt*2.6;
    let slid = slideMove(npc.mesh.position.x, npc.mesh.position.z, nx, nz, 0.2);
    if(!slid){
      for(const a of [0.9,-0.9]){
        const ca=Math.cos(a), sa=Math.sin(a);
        const sx=dir.x*dt*2.6*ca-dir.z*dt*2.6*sa, sz=dir.x*dt*2.6*sa+dir.z*dt*2.6*ca;
        const t=slideMove(npc.mesh.position.x, npc.mesh.position.z,
          npc.mesh.position.x+sx, npc.mesh.position.z+sz, 0.2);
        if(t){ slid=t; break; }
      }
    }
    if(!slid) return;
    nx=slid[0]; nz=slid[1];
    const y = groundY(nx,nz); if(y===null) return;
    npc.moving = true;
    npc.mesh.position.set(nx,y,nz);
    npc.mesh.lookAt(player.position.x, npc.mesh.position.y, player.position.z);
    return;
  }
  if(npc.attackCd>0) return;
  npc.attackCd = npc.t.speedTicks*TICK;
  const attRoll = (npc.t.att+8) * (npc.t.aBonus+64);
  const defRoll = (Math.floor(Player.lvl('Defence')*Player.prayerMult('def'))+Player.styleBoost('def')+8) * (Player.defBonus()+64);
  const hitChance = rollAccuracy(attRoll, defRoll);
  let dmg = Math.random()<hitChance ? Math.ceil(Math.random()*npcMaxHit(npc.t)) : 0;
  if(dmg>0 && Player.protectedFrom('melee')) dmg=0;   // the overhead turns the blow aside
  Player.hp -= dmg; UI.floatDmg(player, dmg);
  if(dmg>0){ Player.addXp('Defence', dmg*2); Sfx.takeHit(); } else Sfx.block();
  UI.refreshHud();
  // auto-retaliate: if idle when struck, fight back (OSRS behaviour)
  if(Player.autoRetaliate && !Player.target && !Player.moveTo && !Player.action && !npc.dead && Player.hp>0) Player.target=npc;
  if(Player.hp<=0) playerDeath();
}
/* ---------- fight appraisal: odds of winning with CURRENT stats & gear ---------- */
function appraiseFight(t){
  const style = Player.weaponStyle();
  const sdef = Player.curStyle();
  // player offence
  const skillLv = (style==='ranged' ? Player.lvl('Ranged')+Player.styleBoost('rng')
                 : style==='magic'  ? Player.lvl('Magic')
                 : Math.floor(Player.lvl('Attack')*Player.prayerMult('att'))+Player.styleBoost('att'));
  const pAtt = (skillLv+8) * ((style==='magic'?10+Player.magBonus():Player.atkBonus())+64);
  const nDef = (t.def+9) * (t.dBonus+64);
  const pAcc = rollAccuracy(pAtt, nDef);
  const pMax = style==='melee' ? osrsMaxHit(Player.lvl('Strength')+Player.styleBoost('str')+8, Player.strBonus())
             : style==='ranged' ? osrsMaxHit(Player.lvl('Ranged')+8, Player.strBonus())
             : Math.max(2, 2+Math.floor(Player.lvl('Magic')/10));
  const pSpd = Player.weaponSpeed();
  // npc offence
  const nAtt = (t.att+8) * (t.aBonus+64);
  const pDef = (Math.floor(Player.lvl('Defence')*Player.prayerMult('def'))+Player.styleBoost('def')+8) * (Player.defBonus()+64);
  const nAcc = rollAccuracy(nAtt, pDef);
  const nMax = npcMaxHit(t);
  const nSpd = t.speedTicks*TICK;
  // count the food in the pack — a prepared fighter eats through a hard fight
  let foodHeals=[];
  Player.inv.forEach(s=>{ if(s && ITEMS[s.id].heal) for(let q=0;q<s.qty;q++) foodHeals.push(ITEMS[s.id].heal); });
  foodHeals.sort((a,b)=>b-a);
  // simulate
  let wins=0; const TRIALS=240;
  for(let s=0;s<TRIALS;s++){
    let php=Player.maxHp, nhp=t.hp, pt=0, nt=0, food=foodHeals.slice();
    for(let guard=0; guard<600; guard++){
      if(pt<=nt){ if(Math.random()<pAcc) nhp-=Math.ceil(Math.random()*pMax); pt+=pSpd; }
      else      { if(Math.random()<nAcc) php-=Math.ceil(Math.random()*nMax); nt+=nSpd; }
      if(php<=Math.floor(Player.maxHp*0.5) && food.length){   // eat under half, like anyone sane
        php=Math.min(Player.maxHp, php+food.shift());
        pt+=TICK;                                             // eating costs a beat
      }
      if(nhp<=0){ wins++; break; }
      if(php<=0) break;
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
    const n=spawnNpc('duelist', a[0], a[1]-3);
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
  UI.chat('Oh dear, you are dead!','combat');
  Sfx.death();
  // OSRS-release rule: keep your THREE most valuable items; the rest fall where you died
  if(Tutorial.complete){
    const here = player.position.clone();
    const entries=[];
    Player.inv.forEach((s,i)=>{ if(s) entries.push({src:'inv', i, id:s.id, qty:s.qty,
      worth:(ITEMS[s.id].value||0) * (ITEMS[s.id].stack ? s.qty : 1)}); });
    for(const slot in Player.equip){ const e=Player.equip[slot];
      if(e) entries.push({src:'equip', slot, id:e, qty:1, worth:ITEMS[e].value||0}); }
    entries.sort((a,b)=>b.worth-a.worth);
    const kept=entries.slice(0,3), lost=entries.slice(3);
    lost.forEach(en=>{
      if(en.src==='inv') Player.inv[en.i]=null; else Player.equip[en.slot]=null;
      makeDrop(en.id, en.qty, here.x+(Math.random()-0.5)*1.6, here.z+(Math.random()-0.5)*1.6);
    });
    if(lost.length){
      UI.chat(`Your belongings fall where you died — you keep only: ${kept.map(k=>ITEMS[k.id].name).join(', ')||'nothing'}. Hurry back for the rest!`,'combat');
    }
    refreshPlayerGear(); UI.refreshInv(); UI.refreshEquip();
  }
  setTimeout(()=>{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }, 600);
  Player.hp = Player.maxHp;   // respawn with full hitpoints, like OSRS
  Player.energy = Math.min(100, Player.energy+30);
  Player.target=null; Player.action=null; Player.moveTo=null;
  WORLD.npcs.forEach(n=>n.target=null);
  const p = Tutorial.complete ? ZONES.commons.pos : ZONES.holm.pos;
  player.position.set(p[0]+2, gy(p[0]+2,p[1]+2), p[1]+2);
  UI.chat('You wake at the Veyhollow gates.','plain');
  UI.refreshHud();
}
function swing(g){
  const p=g.userData.parts; if(!p||!p.armR) return;
  g.userData.swinging = true;
  g.userData.swing = {t:0, dur:0.45};   // tweened in tickSwing each frame
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
    const ctx=this.ensure();
    try{ this._master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime+1.5); }
    catch(e){ this._master.gain.value=0.5; }
    this._lastSched=-1;
    this.scheduleLoop();
    const b=document.getElementById('music-btn'); if(b) b.textContent='\u266a';
  },
  stop(){
    this.on=false;
    try{ this._master.gain.value=0; }catch(e){}
    clearTimeout(this._timer);
    const b=document.getElementById('music-btn'); if(b) b.textContent='\u2715';
  },
  toggle(){ this.on ? this.stop() : this.start(); },
};

const Quest = {
  tracked:null,
  track(id){
    this.tracked = this.tracked===id ? null : id;
    this.updateMarker();
    const q=QUESTS[id], st=Player.quests[id];
    if(this.tracked){
      const stage = st ? Math.min(st.stage, q.stages.length-1) : 0;
      UI.chat(`Quest tracked: ${q.name} — ${q.stages[stage].replace('%n', st?st.counter:0)} Follow the yellow flag on your minimap.`,'quest');
    } else { UI.chat('Quest tracking cleared.','plain'); }
    UI.refreshQuests();
  },
  updateMarker(){
    WORLD.questMarker = null;
    const id=this.tracked; if(!id) return;
    const q=QUESTS[id]; if(!q.targets) return;
    const st=Player.quests[id];
    if(st && st.stage===99) return;
    const stage = st ? Math.min(st.stage, q.targets.length-1) : 0;
    const t=q.targets[stage]; if(!t) return;
    if(t.npc){
      const f=WORLD.friendlies.find(f=>f.id===t.npc);
      if(f){ WORLD.questMarker={x:f.mesh.position.x, z:f.mesh.position.z}; return; }
    }
    if(t.zone && ZONES[t.zone]) WORLD.questMarker={x:ZONES[t.zone].pos[0], z:ZONES[t.zone].pos[1]};
  },
  state(id){ return Player.quests[id] || null; },
  start(id){ Player.quests[id]={stage:1, counter:0};
    UI.chat(`Quest started: ${QUESTS[id].name}.`,'xp'); UI.refreshQuests(); Sfx.quest(); },
  complete(id){
    setTimeout(()=>{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }, 50);
    const q=QUESTS[id]; Player.quests[id].stage = 99;
    UI.chat(`Congratulations! Quest complete: ${q.name}.`,'xp');
    for(const sk in q.reward.xp) Player.addXp(sk, q.reward.xp[sk]);
    q.reward.items.forEach(it=>Player.addItem(it.id, it.q));
    UI.refreshQuests(); Sfx.level();
  },
  done(id){ const s=Player.quests[id]; return s && s.stage===99; },
  onKill(typeId){
    const gt=Player.quests.grub_trouble;
    if(gt && gt.stage===1 && typeId==='grubkin'){
      gt.counter++;
      UI.chat(`Grubkins slain: ${gt.counter}/3.`,'plain');
      if(gt.counter>=3){ gt.stage=2; UI.chat('Return to Warden Maela.','plain'); }
      UI.refreshQuests();
    }
    const wt=Player.quests.wardens_trial;
    if(wt && wt.stage===1 && typeId==='fenlord'){
      wt.stage=2; UI.chat('The Fenlord falls! Return to Warden Maela.','plain');
      UI.refreshQuests();
    }
  },
};

/* ---------- WebAudio SFX: noise-based, more realistic ---------- */
const Sfx = {
  ctx:null, _noiseBuf:null,
  ensure(){
    if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const len=this.ctx.sampleRate*1;
      this._noiseBuf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);
      const d=this._noiseBuf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
    }
    if(this.ctx.state==='suspended') this.ctx.resume();
    return this.ctx;
  },
  noise(dur, freq, q, vol, type='bandpass', slideTo){
    try{ const ctx=this.ensure();
      const src=ctx.createBufferSource(); src.buffer=this._noiseBuf; src.loop=true;
      const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q||1;
      if(slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime+dur);
      const g=ctx.createGain(); g.gain.value=vol;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
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
      o.connect(g); g.connect(ctx.destination);
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
