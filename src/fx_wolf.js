/* fx_wolf.js — procedural bone driver for quadruped beasts (named rig: root/body/head/tail +
 * legFL/legFR/legBL/legBR from tools/mixar_pipeline.py rig_quadruped). Diagonal trot synced to
 * real ground speed; head scan + tail sway at rest. Same pattern as fx_mole/fx_dragon: stash rest
 * quats, re-pose each frame about root-derived world axes. Used by any NPC with animDriver:'wolf'. */

function _setupWolfRig(n){
  const bones = n.mesh.userData.bones; if(!bones || !bones.length) return null;
  const by = {}; bones.forEach(b => by[b.name] = b);
  if(!(by.legFL && by.legFR && by.legBL && by.legBR)) return null;
  bones.forEach(b => { b.userData._rest = b.quaternion.clone(); });
  // mosswolf GLB: body along X, head at +X. Engine lookAt aims -Z at the heading, and yaw +PI/2
  // maps +X -> -Z, so the nose leads. lat (leg-swing axis) is the body axis rotated with the root.
  const root = n.mesh.children[0];
  if(root && !root.userData._yawed){ root.rotation.y = Math.PI/2; root.userData._yawed = true; }
  return { by, lat: new THREE.Vector3(0,0,1), up: new THREE.Vector3(0,1,0), t: Math.random()*5 };
}

function riggedWolfAnim(n, dt, moving){
  if(!n.mesh.userData.bones) return;
  let rig = n.mesh.userData._wolfRig;
  if(rig === undefined){ rig = _setupWolfRig(n); n.mesh.userData._wolfRig = rig || false; }
  if(!rig) return;
  rig.t += dt;
  const pos = n.mesh.position;
  if(rig._lp){ const spd = Math.hypot(pos.x-rig._lp.x, pos.z-rig._lp.z)/Math.max(dt,1e-3);
    rig._spd = rig._spd===undefined ? spd : rig._spd*0.7 + spd*0.3; }
  rig._lp = { x: pos.x, z: pos.z };
  const spd = rig._spd || 0, walking = spd > 0.15;
  rig._gait = (rig._gait||0) + Math.min(13, spd*4.2)*dt;
  const mq   = (n.mesh.children[0]||n.mesh).getWorldQuaternion(new THREE.Quaternion());
  const latW = rig.lat.clone().applyQuaternion(mq).normalize();  // legs swing about this
  const upW  = rig.up.clone().applyQuaternion(mq).normalize();   // head/tail sway about this
  const rest = b => { if(b){ b.quaternion.copy(b.userData._rest); } return b; };
  // diagonal trot: FL+BR in phase, FR+BL opposite; tiny weight-shift when idle
  const amp = walking ? Math.min(0.55, 0.22 + spd*0.12) : 0.03;
  [['legFL',0],['legBR',0],['legFR',Math.PI],['legBL',Math.PI]].forEach(([nm,ph])=>{
    const b = rest(rig.by[nm]); if(!b) return;
    b.rotateOnWorldAxis(latW, Math.sin(walking ? rig._gait+ph : rig.t*1.2+ph) * amp);
  });
  // body: slight bound with the gait; breathing at rest
  if(rest(rig.by.body)) rig.by.body.rotateOnWorldAxis(latW,
    walking ? Math.sin(rig._gait*2)*0.05 : Math.sin(rig.t*1.4)*0.02);
  // head: hunting scan at rest, steady nose-down focus when moving; snarl-bob in combat
  if(rest(rig.by.head)){
    const inCombat = !!n.mesh.userData.inCombat;
    rig.by.head.rotateOnWorldAxis(upW, walking ? 0 : Math.sin(rig.t*0.8)*0.18);
    rig.by.head.rotateOnWorldAxis(latW, inCombat ? Math.sin(rig.t*7)*0.06 - 0.1 : (walking ? 0.08 : 0));
  }
  // tail: lazy sway, faster when moving
  if(rest(rig.by.tail)) rig.by.tail.rotateOnWorldAxis(upW, Math.sin(rig.t*(walking?5:1.6))*0.22);
}
