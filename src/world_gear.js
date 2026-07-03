/* ================= WORLD GEAR MESHES =================
 * 3D weapon / armour / ground-item mesh builders, split verbatim out of
 * game2_world.js (GOAL.md §15: split the big three into content modules).
 * Pure geometry builders: take a metal/colour + THREE, return a mesh. They
 * touch no game2 module-local state — only the global mat() (game2), ITEMS
 * (game1_data) and THREE. Loaded right after game2_world.js in index.html;
 * every caller (game3/game4/fx_humanoid/anim_showcase) invokes them at
 * runtime, so load order only requires this file to be present before boot. */

/* ---------- 3D weapon / armour models (worn + ground) ---------- */
function swordMesh(metal){
  const g=new THREE.Group();
  const blade=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.66,0.13),mat(metal));
  blade.position.y=0.45; g.add(blade);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.6,0.02),mat(metal));
  ridge.position.y=0.43; g.add(ridge);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.14,4),mat(metal));
  tip.position.y=0.84; tip.rotation.y=Math.PI/4; g.add(tip);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.05,0.09),mat(0x6b5a2a));
  guard.position.y=0.1; g.add(guard);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.2,6),mat(0x3e2a17));
  g.add(grip);
  const pommel=new THREE.Mesh(new THREE.SphereGeometry(0.045,5,5),mat(0x6b5a2a));
  pommel.position.y=-0.11; g.add(pommel);
  return g;
}
function bowMesh(){
  const g=new THREE.Group();
  const limb=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.035,5,12,Math.PI*1.15),mat(0x6b4426));
  limb.rotation.z=Math.PI*0.93; g.add(limb);
  const str=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.85,4),
    new THREE.MeshBasicMaterial({color:0xd8ccb4}));
  str.position.x=0.11; g.add(str);
  return g;
}
function arrowMesh(){
  const g=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.66,4),mat(0x8a6a3e));
  g.add(shaft);
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.11,4),mat(0x9aa0a8));
  head.position.y=0.38; g.add(head);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.13,4),mat(0xb24444));
  fl.position.y=-0.34; fl.rotation.x=Math.PI; g.add(fl);
  g.rotation.x=Math.PI/2;
  const wrap=new THREE.Group(); wrap.add(g);
  return wrap;
}
function axeMesh(metal){
  const g=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.035,0.6,5),mat(0x6b4426));
  g.add(handle);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.16,0.045),mat(metal));
  head.position.set(0.1,0.24,0); g.add(head);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.2,0.05),mat(metal));
  edge.position.set(0.2,0.24,0); g.add(edge);
  return g;
}
function pickMesh(metal){
  const g=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.035,0.6,5),mat(0x6b4426));
  g.add(handle);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.06,0.06),mat(metal));
  head.position.y=0.27; g.add(head);
  for(const s of [-1,1]){
    const spike=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.12,4),mat(metal));
    spike.position.set(s*0.23,0.27,0); spike.rotation.z=s*-Math.PI/2; g.add(spike);
  }
  return g;
}
function shieldMesh(){
  const g=new THREE.Group();
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.06,10),mat(0x8a5e34));
  disc.rotation.z=Math.PI/2; g.add(disc);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.025,5,12),mat(0x6b4426));
  rim.rotation.y=Math.PI/2; g.add(rim);
  const boss=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),mat(0x9aa0a8));
  boss.position.x=0.05; g.add(boss);
  return g;
}
function helmMesh(metal){
  const g=new THREE.Group();
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.21,8,6,0,Math.PI*2,0,Math.PI/2),mat(metal));
  g.add(dome);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.215,0.215,0.07,8),mat(metal));
  rim.position.y=-0.01; g.add(rim);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.12,0.3),mat(metal));
  ridge.position.y=0.15; g.add(ridge);
  return g;
}
function staffMesh(orb){
  const g=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.035,1.1,6),mat(0x6b4426));
  shaft.position.y=0.25; g.add(shaft);
  const head=new THREE.Mesh(new THREE.OctahedronGeometry(0.09),
    new THREE.MeshBasicMaterial({color:orb}));
  head.position.y=0.86; g.add(head);
  return g;
}
function amuletMesh(gem){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.012,4,10),mat(0xcaa36a));
  g.add(ring);
  const stone=new THREE.Mesh(new THREE.OctahedronGeometry(0.045),mat(gem));
  stone.position.y=-0.1; g.add(stone);
  return g;
}
function capeMesh(color){
  const c=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,0.95,8,1,true,Math.PI*0.6,Math.PI*0.8),
    new THREE.MeshLambertMaterial({color, side:THREE.DoubleSide}));   // flatShading unsupported on Lambert (r128)
  c.position.set(0,0.95,-0.16);
  return c;
}
const METALS = {copper:0xc6794a, bronze:0x8a6437, iron:0x9aa0a8, steel:0xd0d4dc, whitsteel:0xe8ecf2,
  aurel:0xd4a83e, veyrite:0x3ec6b4, undercrag:0x6a5a7a, leather:0x8a5e34, cloth:0x7a86b8, glimmer:0xb48ae0};
function tierMetal(def){ return METALS[def.tier] !== undefined ? METALS[def.tier] : 0x8a6437; }
/* one mesh router for any equipable item — used worn AND on the ground */
function gearMesh(id){
  const def=ITEMS[id]; if(!def||!def.model) return null;
  const m=tierMetal(def);
  switch(def.model){
    case 'sword':  return swordMesh(m);
    case 'axe':    return axeMesh(m);
    case 'pick':   return pickMesh(m);
    case 'bow':    return bowMesh();
    case 'staff':  return staffMesh(def.tier==='glimmer'?0xb48ae0: id==='storm_staff'?0x7ad0ff: id==='ember_staff'?0xff8c4a:0x9ad0ff);
    case 'helm':   return helmMesh(m);
    case 'plate':  return bodyArmorMesh(m);
    case 'legs':   return null; // handled via legArmorMesh on the wearer
    case 'shield': return shieldMesh();
    case 'robe':   return null; // recolors the torso
    case 'hat':    return null; // built as headTop hat
    case 'amulet': return amuletMesh(def.sBonus?0xc84a4a:def.aBonus?0x4a9ac8:0x4ac86a);
    case 'cape':   return capeMesh(def.capeColor||0xa83232);
  }
  return null;
}

/* fitted armour overlays for the angular humanoid */
function bodyArmorMesh(metal){
  const g=new THREE.Group();
  const chest=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.2,0.54,4,1,false,Math.PI/4),mat(metal));
  chest.position.y=1.26; chest.scale.z=0.62; chest.castShadow=true; g.add(chest);
  for(const s of [-1,1]){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.15,0.15,4,1,false,Math.PI/4),mat(metal));
    pad.position.set(s*0.28,1.47,0); g.add(pad);
  }
  const trim=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.06,0.3),mat(0x6b5a2a));
  trim.position.y=1.0; g.add(trim);
  return g;
}
function legArmorMesh(metal, parts){
  const g=new THREE.Group(); g.userData={covers:[]};
  for(const side of ['L','R']){
    if(parts['legMesh'+side]) parts['legMesh'+side].visible=false;   // flare would clip the plate
    const cover=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.09,0.76,4,1,false,Math.PI/4),mat(metal));
    cover.position.y=-0.38;
    parts['leg'+side].add(cover);
    g.userData.covers.push(cover);
  }
  return g;
}

/* ground model for any item id */
function itemGroundMesh(id){
  const g=new THREE.Group();
  const def=ITEMS[id];
  if(def && def.model && !['robe','hat','legs'].includes(def.model)){
    const m=gearMesh(id);
    if(m){
      if(def.model==='sword'||def.model==='axe'||def.model==='pick'||def.model==='staff'){ m.rotation.set(Math.PI/2,0,0.6); m.position.y=0.08; }
      else if(def.model==='bow'){ m.rotation.x=-Math.PI/2; m.position.y=0.06; }
      else if(def.model==='shield'){ m.rotation.z=Math.PI/2; m.position.y=0.06; }
      else if(def.model==='helm'){ m.position.y=0.1; }
      else if(def.model==='plate'){ m.scale.setScalar(0.6); m.position.y=-0.5; }
      else if(def.model==='amulet'){ m.rotation.x=-Math.PI/2; m.position.y=0.05; }
      else if(def.model==='cape'){ m.scale.setScalar(0.45); m.position.set(0,-0.18,0.1); m.rotation.x=0.5; }
      g.add(m);
      return g;
    }
  }
  if(def && def.model==='legs'){
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.45,0.2),mat(tierMetal(def)));
    l.position.y=0.22; g.add(l); return g;
  }
  if(def && (def.model==='robe'||def.model==='hat')){
    const r=new THREE.Mesh(new THREE.ConeGeometry(def.model==='hat'?0.16:0.24, def.model==='hat'?0.3:0.4, 7),
      mat(def.tier==='glimmer'?0xb48ae0:0x7a86b8));
    r.position.y=0.18; g.add(r); return g;
  }
  switch(id){
    case 'coins': {
      for(let i=0;i<4;i++){ const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.03,8),mat(0xe8c45a));
        coin.position.set((Math.random()-.5)*0.25, 0.03+i*0.028, (Math.random()-.5)*0.25); g.add(coin);} break; }
    case 'bones': {
      const b=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.5,5),mat(0xefe8d8));
      b.rotation.z=Math.PI/2; b.position.y=0.06; g.add(b);
      for(const e of [-0.25,0.25]){ const k=new THREE.Mesh(new THREE.SphereGeometry(0.07,5,5),mat(0xefe8d8));
        k.position.set(e,0.06,0); g.add(k);} break; }
    case 'logs': {
      const l=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.7,6),mat(0x7a512f));
      l.rotation.z=Math.PI/2; l.position.y=0.1; g.add(l);
      const l2=l.clone(); l2.position.set(0.05,0.26,0.1); l2.rotation.y=0.3; g.add(l2); break; }
    case 'copper_ore': {
      const o=new THREE.Mesh(new THREE.IcosahedronGeometry(0.2,0),mat(0x7d7568));
      o.position.y=0.16; g.add(o);
      const v=new THREE.Mesh(new THREE.IcosahedronGeometry(0.07,0),mat(0xc77b4a));
      v.position.set(0.1,0.24,0.06); g.add(v); break; }
    case 'raw_perch': case 'cooked_perch': {
      const f=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,5),mat(id==='raw_perch'?0x9fb6c4:0xc98a4b));
      f.scale.set(1.5,0.5,0.7); f.position.y=0.1; g.add(f);
      const t=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.16,4),mat(id==='raw_perch'?0x7e98a8:0xa86b35));
      t.rotation.z=Math.PI/2; t.position.set(-0.32,0.1,0); g.add(t); break; }
    case 'bronze_sword': { const s=swordMesh(METALS.bronze); s.rotation.set(Math.PI/2,0,0.6); s.position.y=0.08; g.add(s); break; }
    case 'iron_sword':   { const s=swordMesh(METALS.iron);   s.rotation.set(Math.PI/2,0,0.6); s.position.y=0.08; g.add(s); break; }
    case 'worn_bow': { const b=bowMesh(); b.rotation.x=-Math.PI/2; b.position.y=0.06; g.add(b); break; }
    case 'arrows': { for(let i=0;i<3;i++){ const a=arrowMesh();
        a.rotation.y=i*0.4; a.rotation.x=-Math.PI/2*0.96; a.position.y=0.05; g.add(a);} break; }
    case 'air_rune': case 'water_rune': case 'earth_rune': case 'fire_rune':
    case 'mind_rune': case 'chaos_rune': case 'nature_rune':
    case 'spark_rune': { const r=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.07,0.22),mat(0xb9b2a4));
      r.position.y=0.05; g.add(r);
      const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.06),new THREE.MeshBasicMaterial({color:0x3ec6ff}));
      s.position.y=0.13; g.add(s); break; }
    case 'wood_shield': { const s=shieldMesh(); s.rotation.z=Math.PI/2; s.position.y=0.06; g.add(s); break; }
    case 'bronze_helm': { const h=helmMesh(METALS.bronze); h.position.y=0.1; g.add(h); break; }
    case 'bronze_plate': { const p=bodyArmorMesh(METALS.bronze); p.scale.setScalar(0.6); p.position.y=-0.5; g.add(p); break; }
    case 'leather_body': { const p=bodyArmorMesh(METALS.leather); p.scale.setScalar(0.6); p.position.y=-0.5; g.add(p); break; }
    case 'bronze_legs': { const l=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.45,0.2),mat(METALS.bronze));
      l.position.y=0.22; g.add(l); break; }
    case 'hatchet': { const h=axeMesh(METALS.bronze); h.rotation.z=Math.PI/2*0.9; h.position.y=0.07; g.add(h); break; }
    case 'iron_hatchet': { const h=axeMesh(METALS.iron); h.rotation.z=Math.PI/2*0.9; h.position.y=0.07; g.add(h); break; }
    case 'pickaxe': { const h=pickMesh(METALS.bronze); h.rotation.z=Math.PI/2*0.9; h.position.y=0.09; g.add(h); break; }
    case 'iron_pickaxe': { const h=pickMesh(METALS.iron); h.rotation.z=Math.PI/2*0.9; h.position.y=0.09; g.add(h); break; }
    case 'fishing_net': { const n=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.03,5,10),mat(0x8a6a3e));
      n.rotation.x=-Math.PI/2; n.position.y=0.04; g.add(n); break; }
    case 'fen_charm': { const c=new THREE.Mesh(new THREE.OctahedronGeometry(0.14),mat(0x7a3da8));
      c.position.y=0.12; g.add(c); break; }
    case 'beast_hide': { const h=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.04,7),mat(0x9a8468));
      h.position.y=0.04; h.scale.x=1.3; g.add(h); break; }
    case 'hollow_ale': { const mug=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.08,0.2,7),mat(0xc8a45a));
      mug.position.y=0.1; g.add(mug);
      const foam=new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.085,0.04,7),mat(0xf0e6c8));
      foam.position.y=0.21; g.add(foam); break; }
    default: { const b=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.12,0.2),mat(0xc9a23e));
      b.position.y=0.07; g.add(b); }
  }
  return g;
}
