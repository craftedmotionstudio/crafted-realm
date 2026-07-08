/* fx_mole.js — procedural bone driver for the Giant Mole (named rig: root/body/head/arm_L/arm_R).
 * Same pattern as fx_dragon's named-rig path: stash rest quats once, re-pose every frame with
 * rotateOnWorldAxis about axes taken from the model root, cadence locked to real ground speed. */

function _moleRoot(n){
  let r = null;
  n.mesh.traverse ? n.mesh.traverse(c => { if(!r && c.userData && c.userData.bones) r = c; }) : null;
  return n.mesh.children[0] || n.mesh;
}

function _setupMoleRig(n){
  const bones = n.mesh.userData.bones; if(!bones || !bones.length) return null;
  const by = {}; bones.forEach(b => by[b.name] = b);
  if(!(by.body && by.arm_L && by.arm_R)) return null;
  bones.forEach(b => { b.userData._rest = b.quaternion.clone(); });
  // Authored facing -Y in Blender -> +Z after the y-up export, but the engine's lookAt aims the
  // group's -Z at its heading; yaw the GLB root so the snout leads instead of the rump.
  const root = _moleRoot(n);
  if(root && !root.userData._yawed){ root.rotation.y = Math.PI; root.userData._yawed = true; }
  return { by, fwd: new THREE.Vector3(0,0,1), up: new THREE.Vector3(0,1,0), lat: new THREE.Vector3(1,0,0),
           t: Math.random()*5 };
}

function riggedMoleAnim(n, dt, moving){
  if(!n.mesh.userData.bones) return;                    // GLB still loading
  let rig = n.mesh.userData._moleRig;
  if(rig === undefined){ rig = _setupMoleRig(n); n.mesh.userData._moleRig = rig || false; }
  if(!rig) return;
  rig.t += dt;
  // real ground speed -> gait cadence (feet/arms track the ground, no moonwalking)
  const pos = n.mesh.position;
  if(rig._lp){ const spd = Math.hypot(pos.x - rig._lp.x, pos.z - rig._lp.z) / Math.max(dt, 1e-3);
    rig._spd = rig._spd === undefined ? spd : rig._spd * 0.7 + spd * 0.3; }
  rig._lp = { x: pos.x, z: pos.z };
  const spd = rig._spd || 0, walking = spd > 0.15;
  rig._gait = (rig._gait || 0) + Math.min(11, spd * 3.4) * dt;
  // periodic sniff: every ~5s the snout shakes side to side for ~0.6s
  rig._sniff = (rig._sniff === undefined ? -2 : rig._sniff) - dt;
  if(rig._sniff <= -5) rig._sniff = 0.6;
  const sniffing = rig._sniff > 0;
  const mq   = (n.mesh.children[0] || n.mesh).getWorldQuaternion(new THREE.Quaternion());
  const fwdW = rig.fwd.clone().applyQuaternion(mq).normalize();   // waddle roll axis
  const latW = rig.lat.clone().applyQuaternion(mq).normalize();   // arm swing / head nod axis
  const upW  = rig.up.clone().applyQuaternion(mq).normalize();    // sniff shake axis
  const rest = b => { if(b){ b.quaternion.copy(b.userData._rest); } return b; };
  const inCombat = !!n.mesh.userData.inCombat;
  // BODY: side-to-side waddle synced to the gait; slow breathing sway at rest
  if(rest(rig.by.body)) rig.by.body.rotateOnWorldAxis(fwdW,
    walking ? Math.sin(rig._gait) * 0.12 : Math.sin(rig.t * 1.3) * 0.03);
  // ARMS: alternate digging-paddle swing while walking; raised claw menace in combat; idle fidget
  const armAmp = walking ? Math.min(0.55, 0.25 + spd * 0.12) : (inCombat ? 0.35 : 0.05);
  const armFreq = walking ? rig._gait : rig.t * (inCombat ? 6 : 1.4);
  if(rest(rig.by.arm_L)) rig.by.arm_L.rotateOnWorldAxis(latW, Math.sin(armFreq) * armAmp - (inCombat ? 0.45 : 0));
  if(rest(rig.by.arm_R)) rig.by.arm_R.rotateOnWorldAxis(latW, Math.sin(armFreq + Math.PI) * armAmp - (inCombat ? 0.45 : 0));
  // HEAD: gait bob while walking, slow look-around at rest, quick shake while sniffing
  if(rest(rig.by.head)){
    rig.by.head.rotateOnWorldAxis(latW, walking ? Math.sin(rig._gait * 2) * 0.07 : Math.sin(rig.t * 0.9) * 0.06);
    if(sniffing) rig.by.head.rotateOnWorldAxis(upW, Math.sin(rig.t * 26) * 0.10);
  }
}
