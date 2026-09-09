/* fx_humanoid.js — procedural walk/idle drive for a UniRig-rigged skinned humanoid
 * (the HF-baked player & NPCs). The bipedal analogue of fx_dragon's riggedDragonAnim.
 *
 * UniRig's bone local frames are NOT anatomically aligned, so naive local-axis rotation
 * tangles the limbs. Every joint here is instead rotated about a WORLD axis, relative to
 * its captured rest pose — which gives clean forward/back leg & arm swings.
 *
 * Option B: all character looks share ONE canonical rig (base_m1_rigged.glb's 53-bone
 * topology), so the bone roles are a fixed index map (verified in-engine). Call
 * setupHumanoidRig(root) once after the GLB loads, then riggedHumanoidAnim(root, dt,
 * moving, speed) each frame. */

// role -> bone index for the canonical UniRig humanoid (verified on base_m1_rigged.glb:
// spine 0>1>2>3(chest)>4>5(head); L arm 6>7>8>9(hand); R arm 25>26>27>28; legs 44.. / 48..)
const CANON_RIG = {
  pelvis:0, chest:3, head:5,
  armL:7, armR:26,                    // upper arms (shoulder swing)
  thighL:44, kneeL:45, thighR:48, kneeR:49,
};

function setupHumanoidRig(root){
  if(typeof THREE==='undefined') return null;
  let sm=null; root.traverse(o=>{ if(o.isSkinnedMesh && !sm) sm=o; if(o.isMesh) o.frustumCulled=false; });
  if(!sm || !sm.skeleton) return null;
  const B = sm.skeleton.bones;
  const rest = {};
  for(const k in CANON_RIG){ const b=B[CANON_RIG[k]]; if(b) rest[k]=b.quaternion.clone(); }
  const h = { sm, B, rest, t:0, ease:0 };       // ease: 0 idle .. 1 walking (smoothed)
  root.userData.hrig = h;
  return h;
}

// shared scratch (single-threaded; reused across joints to avoid per-frame allocation)
const _HX = (typeof THREE!=='undefined') ? new THREE.Vector3(1,0,0) : null;
const _hq  = (typeof THREE!=='undefined') ? new THREE.Quaternion() : null;
const _hq2 = (typeof THREE!=='undefined') ? new THREE.Quaternion() : null;
const _ha  = (typeof THREE!=='undefined') ? new THREE.Vector3() : null;

// rotate a canonical bone about a WORLD axis by `ang`, relative to its rest pose
function _humRot(h, role, axis, ang){
  const b = h.B[CANON_RIG[role]]; if(!b || !h.rest[role] || !b.parent) return;
  b.parent.getWorldQuaternion(_hq);                              // parent's world orientation
  _ha.copy(axis).applyQuaternion(_hq.invert()).normalize();     // world axis -> parent-local
  _hq2.setFromAxisAngle(_ha, ang);
  b.quaternion.copy(h.rest[role]).premultiply(_hq2);
}

function riggedHumanoidAnim(root, dt, moving, speed){
  const h = root.userData.hrig; if(!h) return;
  speed = speed || 1;
  // ease between idle and walk so starts/stops read smoothly
  h.ease += ((moving?1:0) - h.ease) * Math.min(1, dt*10);
  h.t   += dt * (1.2 + 7.0*speed*h.ease);
  const p = h.t, e = h.ease;
  const A = 0.62*e, K = 0.95*e, AR = 0.45*e;
  // leg swing (opposite phase) + knee bend on the back-swing
  _humRot(h,'thighL', _HX, Math.sin(p)*A);
  _humRot(h,'thighR', _HX, Math.sin(p+Math.PI)*A);
  _humRot(h,'kneeL',  _HX, Math.max(0,-Math.sin(p))*K);
  _humRot(h,'kneeR',  _HX, Math.max(0,-Math.sin(p+Math.PI))*K);
  // arms counter-swing the legs
  _humRot(h,'armL',   _HX, Math.sin(p+Math.PI)*AR);
  _humRot(h,'armR',   _HX, Math.sin(p)*AR);
  // gentle idle breathing on the chest when (nearly) still
  if(e < 0.5) _humRot(h,'chest', _HX, (1-e)*Math.sin(h.t*1.4)*0.05);
}

/* Swap the live player for the HF-baked canonical rig (toggle / demo). The procedural game
 * systems stay intact; this just replaces the player mesh with the skinned rig in a
 * foot-origin container, so the game loop's position/lookAt + pAnim() drive it. */
function installHFPlayer(onReady){
  if(typeof THREE==='undefined' || typeof player==='undefined') return;
  const loader = new THREE.GLTFLoader();
  loader.load('assets/models/base_m1_rigged.glb?v='+Date.now(), (gltf)=>{
    const rig = gltf.scene;
    let box = new THREE.Box3().setFromObject(rig);
    rig.scale.setScalar(1.85 / ((box.max.y-box.min.y)||1));
    box = new THREE.Box3().setFromObject(rig);
    rig.position.y = -box.min.y;                       // feet at the container origin
    rig.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.frustumCulled=false; } });
    const container = new THREE.Group();
    container.add(rig);
    container.position.copy(player.position);
    container.rotation.y = player.rotation.y;
    container.userData.rigInner = rig;                 // keep a handle for facing tweaks
    setupHumanoidRig(container);                       // -> container.userData.hrig
    container.userData.isHF = true;
    if(typeof makeNameTag==='function'){ const tag=makeNameTag((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer'); tag.position.y=2.1; container.add(tag); }
    if(typeof scene!=='undefined') scene.remove(player);
    player = container;
    if(typeof scene!=='undefined') scene.add(player);
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[HF] You are now the HuggingFace-baked character. WASD to walk.','sys');
    if(onReady) onReady(container);
  }, undefined, (e)=>{ if(typeof UI!=='undefined' && UI.chat) UI.chat('[HF] rig load failed.','sys'); });
}

/* Attach a piece of gear to the canonical rig, parented to the right bone so it rides the
 * animation. Bones inherit the rig's scale (~2.06x), so we compensate; UniRig's bind rotation
 * is cancelled so the piece sits upright while still turning with the character's facing.
 * Returns the mesh (remove it from its parent to unequip).
 * NOTE: per-item offset/scale still want tuning — these defaults are a sane starting point. */
const HF_GEAR_BONES = { head:5, handR:28, handL:9, chest:3, pelvis:0, footL:47, footR:51 };
function equipHFGear(root, role, mesh, opts){
  opts = opts||{};
  const h = root.userData && root.userData.hrig; if(!h || typeof THREE==='undefined') return null;
  const bi = HF_GEAR_BONES[role]; if(bi==null) return null;
  const bone = h.B[bi]; if(!bone) return null;
  const ws = new THREE.Vector3(); bone.getWorldScale(ws);
  mesh.scale.setScalar((1/(ws.x||1)) * (opts.scale||1));
  const o = opts.offset || {};
  mesh.position.set(o.x||0, o.y||0, o.z||0);
  const bq=new THREE.Quaternion(); bone.getWorldQuaternion(bq);
  const pq=new THREE.Quaternion(); root.getWorldQuaternion(pq);
  mesh.quaternion.copy(bq).invert().premultiply(pq);          // upright + carry facing
  bone.add(mesh);
  const slot = (root.userData.hfGear = root.userData.hfGear || {});
  if(slot[role] && slot[role].parent) slot[role].parent.remove(slot[role]);
  slot[role] = mesh;
  return mesh;
}

/* ---- player.glb avatar (v02 adventurer) ---------------------------------------------------
 * Unlike the HF base rig (procedural drive on a 53-bone UniRig), player.glb ships its own
 * skeleton (23 Mixamo-named bones) AND baked idle/walk clips, so we drive it with a real
 * THREE.AnimationMixer, crossfading idle<->walk by movement. setup stores `gmix` on the
 * container; pAnim() routes to playerGLBAnim() when it sees gmix. Toggle with Shift+P. */
function playerGLBAnim(root, dt, moving, speed){
  const g = root.userData && root.userData.gmix; if(!g) return;
  speed = speed || 1;
  g.w += ((moving?1:0) - g.w) * Math.min(1, dt*10);   // smooth idle<->walk blend
  // a one-shot attack/block owns the whole body while it runs
  const busy = (g.attack && g.attack.isRunning()) || (g.block && g.block.isRunning());
  if(g.idle) g.idle.weight = busy ? 0 : (1 - g.w);
  if(g.walk){ g.walk.weight = busy ? 0 : g.w; g.walk.timeScale = Math.max(0.5, speed); }
  g.mixer.update(dt);
  // heavy 2h shoulder carry (owner r8): the arm swings OUT IN FRONT so the
  // greatsword leans back on the shoulder. Post-mixer additive pose, world-axis
  // pitch about the character's right axis; skipped while attack/block owns the body.
  if(!busy && typeof Player!=='undefined' && Player.equip && Player.equip.weapon){
    const wdef = (typeof ITEMS!=='undefined') && ITEMS[Player.equip.weapon];
    if(wdef && wdef.model==='greatsword'){
      const rig = root.userData.rigInner;
      let bone = root.userData._gsArmBone;
      if(bone===undefined && rig){
        bone=null;
        rig.traverse(o=>{ if(!bone && (o.isBone||o.type==='Bone') && o.name.indexOf('RightArm')>=0) bone=o; });
        root.userData._gsArmBone = bone;
      }
      if(bone && bone.parent){
        const qC=new THREE.Quaternion(); root.getWorldQuaternion(qC);
        const axis=new THREE.Vector3(1,0,0).applyQuaternion(qC);
        const dW=new THREE.Quaternion().setFromAxisAngle(axis, 0.55);
        const qP=new THREE.Quaternion(); bone.parent.getWorldQuaternion(qP);
        bone.quaternion.premultiply(qP.clone().invert().multiply(dW).multiply(qP));
      }
    }
  }
}

function installPlayerGLB(onReady, url){
  if(typeof THREE==='undefined' || typeof player==='undefined') return;
  if(player.userData && player.userData.isPlayerGLB) return;     // already swapped
  const loader = new THREE.GLTFLoader();
  loader.load((url||'assets/models/player.glb')+'?v='+Date.now(), (gltf)=>{
    const rig = gltf.scene;
    let box = new THREE.Box3().setFromObject(rig);
    rig.scale.setScalar(1.85 / ((box.max.y-box.min.y)||1));       // normalize to ~1.85m
    box = new THREE.Box3().setFromObject(rig);
    rig.position.y = -box.min.y;                                  // feet at container origin
    rig.rotation.y = 0;                                           // glTF +Z front aligns with container +Z (Object3D.lookAt faces +Z at the target)
    // map region material name (R_SKIN/R_HAIR/...) -> material(s), so colours are swappable live
    const regionMats = {};
    rig.traverse(o=>{ if(o.isMesh){
      o.castShadow=true; o.frustumCulled=false;
      // AI-baked GLBs often export metallicFactor=1 -> pure black with no env map. Force flat lit albedo (OSRS).
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m=>{ if(m){
        if('metalness' in m) m.metalness=0; if('roughness' in m) m.roughness=1; m.needsUpdate=true;
        // Blender dedups repeated imports as "R_TUNIC.048" — strip the suffix or recolors no-op
        if(m.name){ const key=m.name.replace(/^R_/i,'').replace(/[._]\d+$/,'').toLowerCase(); (regionMats[key]=regionMats[key]||[]).push(m); }
      } });
    } });
    const container = new THREE.Group();
    container.userData.regionMats = regionMats;
    container.add(rig);
    container.position.copy(player.position);
    container.rotation.y = player.rotation.y;
    container.userData.rigInner = rig;                            // handle for facing tweaks
    // animation mixer: play idle, keep walk ready at weight 0
    const mixer = new THREE.AnimationMixer(rig);
    const byName = {}; gltf.animations.forEach(c=>{ byName[c.name]=mixer.clipAction(c); });
    const idle = byName.idle, walk = byName.walk;
    const attack = byName.attack, block = byName.block;
    if(idle){ idle.play(); idle.weight=1; }
    if(walk){ walk.play(); walk.weight=0; }
    if(attack){ attack.setLoop(THREE.LoopOnce, 1); attack.weight=1; }
    if(block){ block.setLoop(THREE.LoopOnce, 1); block.weight=1; }
    container.userData.gmix = { mixer, idle, walk, attack, block, w:0 };
    container.userData.isPlayerGLB = true;
    if(typeof makeNameTag==='function'){
      const tag=makeNameTag((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer'); tag.position.y=2.1; container.add(tag);
    }
    if(typeof scene!=='undefined') scene.remove(player);
    player = container;
    if(typeof scene!=='undefined') scene.add(player);
    // re-apply any saved customisation colours (persisted on CharCfg.colors)
    if(typeof CharCfg!=='undefined' && CharCfg.colors) recolorPlayer(CharCfg.colors);
    refreshGLBGear();                                             // show what's already worn
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[GLB] You are now the v02 adventurer (player.glb). Walk around to see idle/walk.','sys');
    if(onReady) onReady(container);
  }, undefined, (e)=>{ if(typeof UI!=='undefined' && UI.chat) UI.chat('[GLB] player.glb load failed.','sys'); });
}

/* The OSRS palette baked into the GLB's region materials (sRGB hex). PLAYER_REGIONS is the
 * customisable slot list; PLAYER_DEFAULT_COLORS is the "factory" look (for a reset button). */
const PLAYER_REGIONS = ['skin','hair','tunic','belt','legs','boots'];
const PLAYER_DEFAULT_COLORS = { skin:'#b18b71', hair:'#6a4a2a', tunic:'#647a4e', belt:'#402a15', legs:'#3b2e1e', boots:'#6e4626' };

/* Live-recolour the player.glb avatar. Pass any subset of regions, e.g.
 *   recolorPlayer({skin:'#caa', hair:'#222', tunic:'#37506e'})
 * Colours persist on CharCfg.colors so they survive a re-equip / reload. Returns true if applied. */
function recolorPlayer(colors){
  const root = (typeof player!=='undefined') ? player : null;
  const map  = root && root.userData && root.userData.regionMats;
  if(!map || !colors) return false;
  if(typeof CharCfg!=='undefined'){ CharCfg.colors = Object.assign({}, CharCfg.colors||{}, colors); }
  for(const region in colors){
    const arr = map[String(region).toLowerCase()];
    if(arr) arr.forEach(m=>{ if(m.color){ m.color.set(colors[region]); m.needsUpdate=true; } });
  }
  return true;
}

/* ---- worn equipment on the GLB avatar --------------------------------------
 * Weapons/shields/helms/amulets/capes are real meshes attached to the skeleton
 * (mixamo bone names survive the glTF trip, ':' stripped). Body & leg armour +
 * robes recolor their clothing REGION — the flat-band OSRS armour read — and
 * revert to the customizer colours on unequip. */
function _glbBone(rig, want){
  let found=null;
  rig.traverse(o=>{ if(!found && (o.isBone||o.type==='Bone') && o.name.indexOf(want)>=0) found=o; });
  return found;
}
function refreshGLBGear(){
  if(typeof player==='undefined' || !player.userData || !player.userData.isPlayerGLB) return;
  const rig=player.userData.rigInner; if(!rig || typeof Player==='undefined') return;
  const gear = player.userData.glbGear || (player.userData.glbGear={});
  for(const k in gear){ const m=gear[k]; if(m && m.parent) m.parent.remove(m); gear[k]=null; }
  // 0) canonical pose: solve every fit against idle frame 0, never the bind pose
  //    (install-time) or a mid-swing frame (re-equip) — same math, same result, every time
  const gm = player.userData.gmix;
  if(gm && gm.idle){
    if(gm.attack) gm.attack.stop(); if(gm.block) gm.block.stop();
    gm.idle.weight=1; if(gm.walk) gm.walk.weight=0; gm.w=0;
    gm.idle.time=0; gm.mixer.update(0);
  }
  player.updateMatrixWorld(true);
  // 1) reset clothing regions to the customizer/base palette
  const maps = player.userData.regionMats||{};
  const base = Object.assign({}, PLAYER_DEFAULT_COLORS, (typeof CharCfg!=='undefined'&&CharCfg.colors)||{});
  const setRegion=(r,c)=>{ (maps[r]||[]).forEach(m=>{ if(m.color){ m.color.set(c); m.needsUpdate=true; } }); };
  PLAYER_REGIONS.forEach(r=>{ if(base[r]) setRegion(r, base[r]); });
  const e=Player.equip;
  // OSRS rule: a helm replaces the hair (no strands clipping through the metal).
  // The region map alone missed the ponytail mesh — also match by material name.
  (maps.hair||[]).forEach(m=>{ m.visible=!e.head; });
  rig.traverse(o=>{
    if(!o.isMesh) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    const hairy=/hair|pony|braid/i.test(o.name||'') ||
                mats.some(m=>m && /hair|pony|braid/i.test(m.name||''));
    if(hairy) o.visible=!e.head;
  });
  const hex=c=>'#'+('00000'+(c>>>0).toString(16)).slice(-6);
  // 2) armour/robes recolor their band (darkened so bronze doesn't read as bare skin)
  const dim=c=>{ const r=(c>>16)&255,g=(c>>8)&255,b=c&255;
    return ((r*0.78)<<16)|((g*0.78)<<8)|(b*0.78); };
  // robes recolor the whole tunic; plate armour does NOT — the plate mesh is the metal
  // read, and keeping the shirt colour on the sleeves gives the OSRS worn-over-clothing layering
  if(e.body && ITEMS[e.body].model==='robe') setRegion('tunic', hex(dim(tierMetal(ITEMS[e.body]))));
  // leg-covering armour tints the leg region; a plateskirt leaves the shins bare
  if(e.legs && ITEMS[e.legs].model!=='plateskirt') setRegion('legs', hex(dim(tierMetal(ITEMS[e.legs]))));
  // 3) GearFit — measured, constraint-based attachment. No hand-tuned angles:
  //    every fit is solved from bounding boxes + desired world directions, so any
  //    item lands correctly on any rig in any pose.
  const qCont=new THREE.Quaternion(); player.getWorldQuaternion(qCont);
  const inChar=v=>v.clone().applyQuaternion(qCont).normalize();        // character frame -> world
  const UP=new THREE.Vector3(0,1,0), FWD=new THREE.Vector3(0,0,1), LEFT=new THREE.Vector3(1,0,0);
  const fitBasis=(bone, xDirW, zDirW)=>{      // quaternion putting mesh +X on xDir, +Z near zDir
    const qBone=new THREE.Quaternion(); bone.getWorldQuaternion(qBone);
    const x=xDirW.clone().normalize();
    const z=zDirW.clone().sub(x.clone().multiplyScalar(zDirW.dot(x))).normalize();
    const y=new THREE.Vector3().crossVectors(z,x);
    const m4=new THREE.Matrix4().makeBasis(x,y,z);
    return qBone.invert().multiply(new THREE.Quaternion().setFromRotationMatrix(m4));
  };
  const bbox=m=>{ m.updateMatrixWorld(true); const b=new THREE.Box3().setFromObject(m);
    return b.getSize(new THREE.Vector3()); };
  const attach=(slot, boneName, m)=>{
    if(!m) return null;
    const bone=_glbBone(rig, boneName); if(!bone) return null;
    const ws=new THREE.Vector3(); bone.getWorldScale(ws);
    m.scale.multiplyScalar(1/(ws.x||1));
    m.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    bone.add(m); gear[slot]=m;
    return {m, bone};
  };
  // measure the avatar once: head band width + top from the skinned mesh (bind pose ~ rest)
  const fit = player.userData.gearFit || (player.userData.gearFit = (()=>{
    let sk=null; rig.traverse(o=>{ if(!sk && o.isSkinnedMesh) sk=o; });
    if(!sk) return null;
    const pos=sk.geometry.attributes.position; let maxY=0;
    for(let i=0;i<pos.count;i++) maxY=Math.max(maxY, pos.getY(i));
    let hw=0, hTop=0;
    for(let i=0;i<pos.count;i++){ const y=pos.getY(i);
      if(y>maxY*0.87){ hw=Math.max(hw, Math.abs(pos.getX(i))); hTop=Math.max(hTop,y); } }
    return {headW:hw*2, headTop:hTop, sk};
  })());
  if(e.weapon){
    const d=ITEMS[e.weapon];
    const wm=gearMesh(e.weapon);
    // measure the blade axis BEFORE attaching (pre-attach, world frame == local frame):
    // longest bbox axis = the blade, whatever axis the builder used (+X swords, +Y daggers, ...)
    let bladeLocal=new THREE.Vector3(1,0,0);
    if(wm){
      const s=new THREE.Box3().setFromObject(wm).getSize(new THREE.Vector3());
      const axes=[[s.x,new THREE.Vector3(1,0,0)],[s.y,new THREE.Vector3(0,1,0)],[s.z,new THREE.Vector3(0,0,1)]];
      axes.sort((p,q)=>q[0]-p[0]);
      bladeLocal=axes[0][1];
    }
    const a=attach('weapon', 'RightHand', wm);
    if(a && window.EquipBuilder && EquipBuilder.specs[d.model]){
      /* EQUIP BUILDER path (owner directive): deterministic axis/roll basis +
       * grip placed IN THE PALM (finger-derived), not at the wrist */
      EquipBuilder.solveHeld(a.bone, a.m, d.model, inChar);
    } else if(a){
      const tilt=(d.model==='bow'||d.model==='longbow')?0.12:d.model==='staff'?0.25:d.model==='pick'?0.18:d.model==='axe'?0.30:0.5;
      const qBone=new THREE.Quaternion(); a.bone.getWorldQuaternion(qBone);
      // tools carry head down-and-forward like the OSRS reference (handle sweeps
      // up-back past the forearm instead of hanging to the ankle — top-100
      // equipped review 2026-07-17); blades stay up-and-forward
      /* OWNER HOLD DOCTRINE (2026-07-17): weapons rest in an at-attention
       * neutral — blades at the side pointed FORWARD and angled UP slightly
       * (never dragging the ground); battleaxes vertical head-up; bows near-
       * vertical with a slight forward lean, gripped at the riser.
       * NOTE the modelled blade family points along LOCAL -Y (bbox picks +Y =
       * pommel side), so the blade tip lands at -dW: pass the pommel direction. */
      const BLADES = {sword:1, longsword:1, sabre:1, dagger:1};
      const dW = (d.model==='axe'||d.model==='pick')
        ? inChar(new THREE.Vector3(0,-0.55,0.84))          // tools keep the low work carry
        : d.model==='battleaxe'
        ? inChar(new THREE.Vector3(0,0.95,0.31))           // vertical, head up
        : BLADES[d.model]
        ? inChar(new THREE.Vector3(0,-0.40,-0.92))         // pommel down-back => blade up-forward
        : inChar(new THREE.Vector3(0,Math.cos(tilt),Math.sin(tilt)));
      if(d.model==='bow'||d.model==='longbow'){
        // bows need a DETERMINISTIC roll too: limbs on dW AND belly (+X local)
        // facing character-forward, or the string ends up toward the camera.
        // slight forward lean = the owner's neutral ready position
        dW.copy(inChar(new THREE.Vector3(0,0.93,0.37)));
        const yW=dW.clone().normalize();
        const fW=inChar(FWD);
        const xW=fW.clone().sub(yW.clone().multiplyScalar(fW.dot(yW))).normalize();
        const zW=new THREE.Vector3().crossVectors(xW,yW);
        a.m.quaternion.copy(qBone.invert().multiply(new THREE.Quaternion()
          .setFromRotationMatrix(new THREE.Matrix4().makeBasis(xW,yW,zW))));
      } else {
        a.m.quaternion.copy(qBone.invert().multiply(new THREE.Quaternion().setFromUnitVectors(bladeLocal, dW)));
      }
      a.m.position.set(0, 0.04, 0.05);
    }
  }
  if(e.shield){
    const sm=gearMesh(e.shield)||shieldMesh();
    // measure BEFORE attaching so the bbox is in the shield's own frame, not bone-rotated
    let nLocal=new THREE.Vector3(0,0,1), upLocal=new THREE.Vector3(0,1,0);
    if(sm){
      const s=new THREE.Box3().setFromObject(sm).getSize(new THREE.Vector3());
      const axes=[[s.x,new THREE.Vector3(1,0,0)],[s.y,new THREE.Vector3(0,1,0)],[s.z,new THREE.Vector3(0,0,1)]];
      axes.sort((p,q)=>p[0]-q[0]);
      nLocal=axes[0][1]; upLocal=axes[2][1];               // thinnest = face normal, longest = height
    }
    const a=attach('shield', 'LeftHand', sm);
    if(a){
      // owner r7: the sq (riot) shield GUARDS THE FRONT — face normal out-forward
      // so the convex face leads and the concave side wraps the body; other
      // shields keep the classic out-back side carry. Solved as ONE full basis.
      const sdef=ITEMS[e.shield];
      const nW=inChar((sdef && sdef.model==='sqshield')
        ? new THREE.Vector3(-0.72,0,0.69)
        : new THREE.Vector3(-0.9,0,-0.45));
      const upRaw=(sdef && sdef.model==='sqshield') ? new THREE.Vector3(0,0.71,0.71) : UP;  // owner r8: full 45deg lean
      const upW=inChar(upRaw).sub(nW.clone().multiplyScalar(inChar(upRaw).dot(nW))).normalize();
      const worldM=new THREE.Matrix4().makeBasis(nW, upW, new THREE.Vector3().crossVectors(nW,upW));
      const zl=new THREE.Vector3().crossVectors(nLocal,upLocal);
      const localM=new THREE.Matrix4().makeBasis(nLocal, upLocal, zl);
      const qBone=new THREE.Quaternion(); a.bone.getWorldQuaternion(qBone);
      a.m.quaternion.copy(qBone.invert().multiply(new THREE.Quaternion().setFromRotationMatrix(
        worldM.multiply(localM.invert()))));
      a.m.position.set(0.12, (sdef && sdef.model==='sqshield') ? -0.05 : 0.03, 0.04);  // off the torso; riot shield rides a touch lower
    }
  }
  /* OSRS-style HEAD REPLACEMENT (owner 2026-07-17): a full helm doesn't sit on
   * the head — it BECOMES the head. Collapse the head bone (face, hair and all
   * ride it), and the helm attached to that bone auto-counter-scales to full
   * size via attach()'s 1/worldScale. Works on any avatar sharing the skeleton
   * (male/female). Restore the bone whenever no helm is worn. */
  const headBone=_glbBone(rig,'Head');
  if(headBone){
    if(player.userData._headScale0===undefined) player.userData._headScale0=headBone.scale.x;
    const fullHelm = e.head && ITEMS[e.head] && ITEMS[e.head].model==='helm';
    headBone.scale.setScalar(fullHelm ? 0.02 : player.userData._headScale0);
    headBone.updateWorldMatrix(true,false);
  }
  if(e.head){
    const hdef=ITEMS[e.head];
    let hm=gearMesh(e.head);
    if(!hm && hdef && hdef.model==='hat'){
      /* cloth hat: gearMesh returns null for hats, and the old helmMesh fallback
         put a bronze helm on wizards (top-100 equipped review 2026-07-17) */
      const HAT_CLOTH={wizard:0x3a5aad, cloth:0x7a86b8, glimmer:0xb48ae0};
      const hc=HAT_CLOTH[hdef.tier]!==undefined ? HAT_CLOTH[hdef.tier] : tierMetal(hdef);
      const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.04,8), mat(hc)); brim.position.y=0.1;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.42,8), mat(hc)); cone.position.y=0.3;
      hm=new THREE.Group(); hm.add(brim); hm.add(cone);
    }
    const a=attach('head', 'Head', hm||helmMesh(METALS.bronze));
    if(a){
      // face-plated / face-open helms must front the character: +Z -> forward
      const qBone=new THREE.Quaternion(); a.bone.getWorldQuaternion(qBone);
      const z=inChar(FWD), yv=inChar(UP).sub(z.clone().multiplyScalar(inChar(UP).dot(z))).normalize();
      const xv=new THREE.Vector3().crossVectors(yv,z);
      a.m.quaternion.copy(qBone.invert().multiply(
        new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xv,yv,z))));
      const hws=new THREE.Vector3(); a.bone.getWorldScale(hws);
      if(hdef && hdef.model==='medhelm'){
        // OPEN-FACE helm: the head stays visible (no bone collapse), the cap
        // seats ON the head; owner r8 — slid DOWN so the eye band sits at the eyes
        a.m.scale.multiplyScalar(0.68);
        a.m.position.set(0, 0.14, 0.02);
      } else {
        a.m.scale.multiplyScalar(0.63);        // world-size lock (attach normalized bone scale)
        // position is bone-local: compensate for the collapsed head bone so the
        // helm stands exactly where the head was
        a.m.position.set(0, 0.155, 0.015).multiplyScalar(1/(hws.x||1));
      }
    }
  }
  if(e.amulet){ const a=attach('amulet', 'Neck', gearMesh(e.amulet)); if(a) a.m.position.set(0,-0.02,0.11); }
  if(e.cape){
    const a=attach('cape', 'Spine2', gearMesh(e.cape));
    if(a){ a.m.rotation.set(0.1,0,0); a.m.position.set(0,-0.25,-0.14); }
  }
  // 4) full armour READS as armour: real plates over the recolored bands.
  // World-anchor helper: reparent a ROOT-space mesh under `bone` and hug the slim
  // GLB torso/hips (scaling about the mesh centre, not the root origin).
  function wrapOnBone(meshRoot, boneName, hug, key){
    const bone=_glbBone(rig, boneName); if(!bone) return;
    const rel=new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(player.matrixWorld);
    const wrap=new THREE.Group();
    rel.decompose(wrap.position, wrap.quaternion, wrap.scale);
    const c=new THREE.Box3().setFromObject(meshRoot).getCenter(new THREE.Vector3());
    const inner=new THREE.Group();
    meshRoot.position.sub(c);
    inner.add(meshRoot); inner.position.copy(c); inner.scale.copy(hug);
    meshRoot.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    wrap.add(inner); bone.add(wrap); gear[key]=wrap;
  }
  if(e.body && ITEMS[e.body].model!=='robe'){
    const bdef=ITEMS[e.body];
    const isChain = bdef.model==='chainbody';
    const bmesh = isChain ? chainBodyMesh(tierMetal(bdef)) : bodyArmorMesh(tierMetal(bdef));
    // the proven fitted hug shrinks both; chainmail's slimmer mesh + this hug reads
    // as a mail shirt rather than a barrel
    wrapOnBone(bmesh, 'Spine1', new THREE.Vector3(0.74,0.82,0.74), 'bodyPlate');
  }
  if(e.legs){
    const ldef=ITEMS[e.legs], col=tierMetal(ldef);
    if(ldef.model==='plateskirt'){
      wrapOnBone(plateSkirtMesh(col), _glbBone(rig,'Hips')?'Hips':'Spine',
                 new THREE.Vector3(0.78,0.92,0.78), 'skirt');
    } else {
      const leather = ldef.model==='chaps';
      ['LeftUpLeg','RightUpLeg'].forEach(bn=>{
        const bone=_glbBone(rig,bn); if(!bone) return;
        const g2 = leather ? chapsCover(col)
                 : new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.085,0.40,6), mat(col));
        g2.position.set(0, leather?0.25:0.21, 0); g2.castShadow=true;  // down the thigh (bone +Y = knee-ward)
        bone.add(g2); gear[bn]=g2;
      });
    }
  }
  // set 3: gloves (hands slot) + boots (feet slot) — per-limb, local to the bone
  if(e.hands && ITEMS[e.hands].model==='gloves'){
    const col=tierMetal(ITEMS[e.hands]);
    ['LeftHand','RightHand'].forEach(bn=>{
      const bone=_glbBone(rig,bn); if(!bone) return;
      const gm=gloveMesh(col); gm.position.set(0,0.04,0); gm.castShadow=true;
      bone.add(gm); gear[bn+'_glove']=gm;
    });
  }
  if(e.feet && ITEMS[e.feet].model==='boots'){
    const col=tierMetal(ITEMS[e.feet]);
    ['LeftFoot','RightFoot'].forEach(bn=>{
      const bone=_glbBone(rig,bn); if(!bone) return;
      const bt=bootMesh(col); bt.position.set(0,0.01,0.02); bt.castShadow=true;
      bone.add(bt); gear[bn+'_boot']=bt;
    });
  }
}

addEventListener('keydown', e=>{
  if((e.key==='P'||e.key==='p') && e.shiftKey &&
     !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault();
    installPlayerGLB();
  }
});
