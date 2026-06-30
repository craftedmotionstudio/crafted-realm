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
