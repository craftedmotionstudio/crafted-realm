/* ============================================================================
   GLB CHARACTER NPCs — puts the v03-v20 hero-pipeline characters into the world
   as real, attackable NPCs with their baked skeletal idle/walk clips.
   - NPC_TYPES entries added here (glbChar field routes spawnNpc to charNpcModel)
   - charNpcModel(): fresh GLB load per spawn (r128 clone breaks skins), mixer
     with idle/walk actions stored as mesh.userData.gmix
   - charNpcAnim(): drives the mixer from n.moving each frame (walk speed scales
     with the NPC's tick speed; run = fast walk). Hit-react (root squash) and
     death (root topple) come free from the existing rig-agnostic systems.
   ============================================================================ */

const CHAR_NPC_TYPES = {
  cn_guard:     {glbChar:'v07', name:'Town Guard',      level:12, hp:26, att:12, str:10, def:12, aBonus:6,  sBonus:5,  dBonus:8,  speedTicks:5, respawn:35, color:0x8a8f96,
                 examine:'Whitmoor steel on Veyhollow wages.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[4,22],p:0.8}]},
  cn_soldier:   {glbChar:'v18', name:'Hold Soldier',    level:15, hp:30, att:15, str:13, def:14, aBonus:8,  sBonus:6,  dBonus:9,  speedTicks:5, respawn:35, color:0x7a7f88,
                 examine:'Drills even in his sleep.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[6,28],p:0.8}]},
  cn_mage:      {glbChar:'v03', name:'Hollow Mage',     level:11, hp:22, att:11, str:9,  def:9,  aBonus:5,  sBonus:4,  dBonus:5,  speedTicks:5, respawn:35, color:0x6a6f9a, ranged:true,
                 examine:'Smells faintly of ozone.', drops:[{id:'bones',q:1,p:1},{id:'mind_rune',q:[2,8],p:0.7},{id:'coins',q:[4,18],p:0.6}]},
  cn_wizard:    {glbChar:'v09', name:'Grey Wizard',     level:20, hp:35, att:18, str:14, def:15, aBonus:9,  sBonus:7,  dBonus:8,  speedTicks:5, respawn:40, color:0x555a66, ranged:true,
                 examine:'His beard has seen things.', drops:[{id:'bones',q:1,p:1},{id:'fire_rune',q:[2,6],p:0.6},{id:'coins',q:[8,35],p:0.7}]},
  cn_barbarian: {glbChar:'v04', name:'Bryn Barbarian',  level:17, hp:38, att:16, str:17, def:11, aBonus:7,  sBonus:10, dBonus:5,  speedTicks:5, respawn:35, color:0x9a7a5a, aggro:true,
                 examine:'Shirtless in the northern wind.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[8,30],p:0.8},{id:'hollow_ale',q:1,p:0.25}]},
  cn_berserker: {glbChar:'v20', name:'Bryn Berserker',  level:24, hp:48, att:22, str:24, def:13, aBonus:10, sBonus:14, dBonus:6,  speedTicks:4, respawn:45, color:0x8a5a4a, aggro:true,
                 examine:'Two axes. No plan.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[12,45],p:0.85},{id:'steel_battleaxe',q:1,p:0.05}]},
  cn_dwarf:     {glbChar:'v13', name:'Quarry Dwarf',    level:14, hp:32, att:13, str:14, def:14, aBonus:6,  sBonus:8,  dBonus:9,  speedTicks:6, respawn:40, color:0x8a7a6a, glbHeight:1.5,
                 examine:'Half the height, twice the grudge.', drops:[{id:'bones',q:1,p:1},{id:'iron_ore',q:[1,3],p:0.6},{id:'coins',q:[6,25],p:0.7}]},
  cn_rogue:     {glbChar:'v05', name:'Road Rogue',      level:13, hp:24, att:14, str:11, def:10, aBonus:8,  sBonus:5,  dBonus:5,  speedTicks:4, respawn:35, color:0x5a604a, aggro:true,
                 examine:'Your coin purse feels nervous.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[10,40],p:0.9}]},
  cn_monk:      {glbChar:'v08', name:'Dawn Monk',       level:8,  hp:20, att:8,  str:8,  def:8,  aBonus:3,  sBonus:3,  dBonus:4,  speedTicks:6, respawn:35, color:0x8a6a4a,
                 examine:'At peace. Mostly.', drops:[{id:'bones',q:1,p:1},{id:'bread',q:1,p:0.5}]},
  cn_priest:    {glbChar:'v19', name:'Dawn Priest',     level:10, hp:22, att:9,  str:8,  def:10, aBonus:4,  sBonus:3,  dBonus:6,  speedTicks:6, respawn:35, color:0xd8d4c8,
                 examine:'Gold thread and quiet prayers.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[4,15],p:0.5}]},
  cn_pirate:    {glbChar:'v14', name:'Pond Corsair',    level:16, hp:30, att:16, str:13, def:11, aBonus:8,  sBonus:6,  dBonus:5,  speedTicks:4, respawn:40, color:0x5a4a3a, aggro:true,
                 examine:'A long way from any sea.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[15,50],p:0.9}]},
  cn_archer:    {glbChar:'v10', name:'Wood Archer',     level:14, hp:26, att:13, str:11, def:10, aBonus:7,  sBonus:5,  dBonus:5,  speedTicks:4, respawn:35, color:0x6a7a4a, ranged:true,
                 examine:'One eye always on the treeline.', drops:[{id:'bones',q:1,p:1},{id:'arrows',q:[3,12],p:0.8},{id:'coins',q:[5,20],p:0.6}]},
  cn_ranger:    {glbChar:'v17', name:'Emberwood Ranger',level:18, hp:32, att:16, str:13, def:13, aBonus:9,  sBonus:6,  dBonus:7,  speedTicks:4, respawn:40, color:0x5a6a3a, ranged:true,
                 examine:'The forest keeps his secrets.', drops:[{id:'bones',q:1,p:1},{id:'arrows',q:[4,14],p:0.8},{id:'coins',q:[8,28],p:0.6}]},
  cn_farmer:    {glbChar:'v11', name:'Mill Hand',       level:6,  hp:16, att:6,  str:7,  def:6,  aBonus:2,  sBonus:3,  dBonus:2,  speedTicks:6, respawn:30, color:0x8a8a5a,
                 examine:'Knows one end of a pitchfork from the other.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[2,10],p:0.6}]},
  cn_halberdier:{glbChar:'v12', name:'Gate Halberdier', level:19, hp:36, att:18, str:15, def:17, aBonus:9,  sBonus:7,  dBonus:11, speedTicks:6, respawn:40, color:0x8a8f96,
                 examine:'Nobody passes without a nod.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[8,32],p:0.8}]},
  cn_goldknight:{glbChar:'v06', name:'Aurel Knight',    level:28, hp:52, att:24, str:20, def:24, aBonus:12, sBonus:9,  dBonus:16, speedTicks:5, respawn:50, color:0xd4a83e,
                 examine:'Armour worth more than the town.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[20,70],p:0.9},{id:'aurel_sword',q:1,p:0.02}]},
  cn_blackknight:{glbChar:'v16', name:'Scarland Knight', level:32, hp:60, att:28, str:24, def:26, aBonus:14, sBonus:11, dBonus:18, speedTicks:5, respawn:60, color:0x2a2a30, aggro:true,
                 examine:'Whatever oath he kept, it was not a kind one.', drops:[{id:'bones',q:1,p:1},{id:'coins',q:[25,90],p:0.9},{id:'steel_sabre',q:1,p:0.05}]},
  cn_druid:     {glbChar:'v15', name:'Ring Druid',      level:16, hp:30, att:14, str:12, def:13, aBonus:7,  sBonus:5,  dBonus:8,  speedTicks:5, respawn:40, color:0x5a7a4a, ranged:true,
                 examine:'The antlers are not a hat.', drops:[{id:'bones',q:1,p:1},{id:'earth_rune',q:[2,6],p:0.6},{id:'coins',q:[6,24],p:0.6}]},
};
for(const k in CHAR_NPC_TYPES){
  const t=CHAR_NPC_TYPES[k];
  t.size = t.size||1;
  t.npcMaxHit = Math.max(1, Math.floor(0.5 + (t.str+9)*(t.sBonus+64)/640));   // same derivation the base data uses
  NPC_TYPES[k]=t;
}

/* fresh skinned load per spawn + AnimationMixer with the baked idle/walk clips */
function charNpcModel(t){
  const g=new THREE.Group();
  const url='assets/models/'+t.glbChar+'.glb';
  const loader=new THREE.GLTFLoader();
  loader.load(url, (gltf)=>{
    const root=gltf.scene;
    root.traverse(c=>{ if(c.isMesh||c.isSkinnedMesh){
      const ms=Array.isArray(c.material)?c.material:[c.material];
      ms.forEach(m=>{ if(m){ if('metalness'in m)m.metalness=0; if('roughness'in m)m.roughness=1; m.needsUpdate=true; } });
      c.castShadow=true; c.frustumCulled=false;
    }});
    root.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(root);
    root.scale.setScalar((t.glbHeight||1.85)/((box.max.y-box.min.y)||1));
    root.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(root);
    const ctr=box.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, -box.min.y, -ctr.z);
    g.add(root);
    const mixer=new THREE.AnimationMixer(root);
    const byName={}; gltf.animations.forEach(c=>{ byName[c.name]=mixer.clipAction(c); });
    const idle=byName.idle, walk=byName.walk, attack=byName.attack, block=byName.block;
    if(idle){ idle.play(); idle.weight=1; }
    if(walk){ walk.play(); walk.weight=0; }
    if(attack){ attack.setLoop(THREE.LoopOnce,1); attack.weight=1; }
    if(block){ block.setLoop(THREE.LoopOnce,1); block.weight=1; }
    g.userData.gmix={mixer, idle, walk, attack, block, w:0};
  }, undefined, e=>console.warn('[charNpc] load failed', url));
  return g;
}

/* per-frame drive — same crossfade as the player GLB, speed-aware, freezes on death */
function charNpcAnim(n, dt){
  const g=n.mesh.userData.gmix; if(!g) return;
  if(n.dead){ if(g.idle) g.idle.weight=0; if(g.walk) g.walk.weight=0; return; }
  const speed = n.t.speedTicks ? (5/n.t.speedTicks) : 1;    // faster NPCs stride faster
  g.w += ((n.moving?1:0)-g.w)*Math.min(1,dt*10);
  const busy = (g.attack && g.attack.isRunning()) || (g.block && g.block.isRunning());
  if(g.idle) g.idle.weight = busy ? 0 : 1-g.w;
  if(g.walk){ g.walk.weight = busy ? 0 : g.w; g.walk.timeScale = Math.max(0.6, speed*(n.chasing?1.5:1)); }
  g.mixer.update(dt);
}

/* world placements — one of each character, spread by region flavor */
const CHAR_NPC_SPAWNS = [
  ['cn_guard',       8,   2],
  ['cn_soldier',    -7,  -9],
  ['cn_mage',      -13,  17],
  ['cn_monk',       19,   7],
  ['cn_priest',     21,  10],
  ['cn_rogue',       2,  46],
  ['cn_druid',     -33,  47],
  ['cn_farmer',    -37, -25],
  ['cn_archer',    -58, -33],
  ['cn_ranger',    -66, -42],
  ['cn_wizard',    -16,  20],
  ['cn_dwarf',      66, -32],
  ['cn_pirate',     52,  52],
  ['cn_halberdier', 47, -58],
  ['cn_goldknight', 53, -65],
  ['cn_barbarian', -18, -90],
  ['cn_berserker', -24, -97],
  ['cn_blackknight', 4, 104],
];
(function waitWorld(){
  if(typeof WORLD!=='undefined' && WORLD.npcs && WORLD.npcs.length>3 && typeof spawnNpc==='function'){
    CHAR_NPC_SPAWNS.forEach(([id,x,z])=>{ try{ spawnNpc(id,x,z); }catch(e){ console.warn('charNpc spawn',id,e); } });
    console.log('[npc_chars] spawned', CHAR_NPC_SPAWNS.length, 'GLB character NPCs');
  } else setTimeout(waitWorld, 800);
})();
