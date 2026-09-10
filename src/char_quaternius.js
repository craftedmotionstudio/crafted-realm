/* char_quaternius.js — load a Quaternius CC0 character ("Modular Character Outfits: Fantasy")
 * as the player. The asset ships rigged + PBR-textured but WITHOUT baked clips (its idle/walk live
 * in Quaternius's separate Universal Animation Library), so we drive it with the same world-axis
 * procedural walk/idle that fx_humanoid uses — mapped to its 65-joint Unreal-style bone names
 * (root, pelvis, spine_03, Head, upperarm_l/r, thigh_l/r, calf_l/r). CC0 = free commercial (logged).
 *
 * Self-contained + reversible: installQuaterniusPlayer() swaps the player mesh; the game loop drives
 * it via player.userData.qrig (a pAnim branch in game5_main). No combat math / shared data touched. */

const QUAT_ROLES = {
  pelvis:'pelvis', chest:'spine_03', head:'Head',
  armL:'upperarm_l', armR:'upperarm_r',
  thighL:'thigh_l',  thighR:'thigh_r',
  kneeL:'calf_l',    kneeR:'calf_r',
};

const _QX  = (typeof THREE!=='undefined') ? new THREE.Vector3(1,0,0) : null;
const _qq  = (typeof THREE!=='undefined') ? new THREE.Quaternion() : null;
const _qq2 = (typeof THREE!=='undefined') ? new THREE.Quaternion() : null;
const _qa  = (typeof THREE!=='undefined') ? new THREE.Vector3() : null;

// rotate a named bone about a WORLD axis by `ang`, relative to its captured rest pose
function _quatRot(h, role, axis, ang){
  const b = h.bones[role]; if(!b || !h.rest[role] || !b.parent) return;
  b.parent.getWorldQuaternion(_qq);
  _qa.copy(axis).applyQuaternion(_qq.invert()).normalize();
  _qq2.setFromAxisAngle(_qa, ang);
  b.quaternion.copy(h.rest[role]).premultiply(_qq2);
}

function quaterniusAnim(root, dt, moving, speed){
  const h = root.userData && root.userData.qrig; if(!h) return;
  speed = speed || 1;
  h.ease += ((moving?1:0) - h.ease) * Math.min(1, dt*10);
  h.t    += dt * (1.2 + 7.0*speed*h.ease);
  const p=h.t, e=h.ease;
  const A=0.60*e, K=0.95*e, AR=0.42*e;
  _quatRot(h,'thighL', _QX, Math.sin(p)*A);
  _quatRot(h,'thighR', _QX, Math.sin(p+Math.PI)*A);
  _quatRot(h,'kneeL',  _QX, Math.max(0,-Math.sin(p))*K);
  _quatRot(h,'kneeR',  _QX, Math.max(0,-Math.sin(p+Math.PI))*K);
  _quatRot(h,'armL',   _QX, Math.sin(p+Math.PI)*AR);
  _quatRot(h,'armR',   _QX, Math.sin(p)*AR);
  if(e < 0.5) _quatRot(h,'chest', _QX, (1-e)*Math.sin(h.t*1.4)*0.05);
}

function installQuaterniusPlayer(url, onReady){
  if(typeof THREE==='undefined' || typeof player==='undefined') return;
  url = url || 'assets/vendor/quaternius/Female_Ranger.gltf';
  const loader = new THREE.GLTFLoader();
  loader.load(url+'?v='+Date.now(), (gltf)=>{
    const rig = gltf.scene;
    let box = new THREE.Box3().setFromObject(rig);
    rig.scale.setScalar(1.5 / ((box.max.y-box.min.y)||1));      // ~1.5 tiles: OSRS-scale, fits doorways & sits small under the raised buildings (user 2026-07-03)
    box = new THREE.Box3().setFromObject(rig);
    rig.position.y = -box.min.y;                                 // feet at origin
    rig.rotation.y = Math.PI;                                    // face the movement direction (tune if moonwalking)
    let sm = null;
    rig.traverse(o=>{ if(o.isMesh){
      o.castShadow=true; o.frustumCulled=false;
      if(o.isSkinnedMesh && !sm) sm=o;
      // no env map in-scene -> PBR metalness renders black; flatten to lit albedo (OSRS look)
      const mats = Array.isArray(o.material)?o.material:[o.material];
      mats.forEach(m=>{ if(m){ if('metalness' in m) m.metalness=0; m.needsUpdate=true; } });
    } });
    const container = new THREE.Group();
    container.add(rig);
    container.position.copy(player.position);
    container.rotation.y = player.rotation.y;
    container.userData.rigInner = rig;
    // name-based procedural rig
    if(sm && sm.skeleton){
      container.updateMatrixWorld(true);                         // valid bone world matrices for the offset below
      const byName={}; sm.skeleton.bones.forEach(b=>byName[b.name]=b);
      const bones={}, rest={};
      for(const role in QUAT_ROLES){ const b=byName[QUAT_ROLES[role]]; if(b){ bones[role]=b; rest[role]=b.quaternion.clone(); } }
      // Quaternius ships a T-pose bind; drop the upper arms to a natural idle (rotate down about world Z)
      const zAx=new THREE.Vector3(0,0,1), pq=new THREE.Quaternion(), la=new THREE.Vector3(), q=new THREE.Quaternion();
      const dropArm=(role,ang)=>{ const b=bones[role]; if(!b||!b.parent||!rest[role]) return;
        b.parent.getWorldQuaternion(pq); la.copy(zAx).applyQuaternion(pq.invert()).normalize();
        q.setFromAxisAngle(la,ang); rest[role]=rest[role].clone().premultiply(q); b.quaternion.copy(rest[role]); };
      dropArm('armL', 1.35); dropArm('armR', -1.35);
      container.userData.qrig = { bones, rest, t:0, ease:0 };
    }
    container.userData.isQuaternius = true;
    if(typeof makeNameTag==='function'){ const tag=makeNameTag((typeof CharCfg!=='undefined'&&CharCfg.name)||'Adventurer'); tag.position.y=2.1; container.add(tag); }
    if(typeof scene!=='undefined') scene.remove(player);
    player = container;
    if(typeof scene!=='undefined') scene.add(player);
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[Quaternius] You are now the Female Ranger (CC0). Walk around to see idle/walk.','sys');
    if(onReady) onReady(container);
  }, undefined, (e)=>{ if(typeof UI!=='undefined' && UI.chat) UI.chat('[Quaternius] character load failed.','sys'); });
}

addEventListener('keydown', e=>{
  if((e.key==='U'||e.key==='u') && e.shiftKey &&
     !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault(); installQuaterniusPlayer();
  }
});
