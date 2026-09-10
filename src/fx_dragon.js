/* fx_dragon.js — Phase-1 dragon life: idle breathing, a fire-breath "huff" wind-up, and a
   dragonfire particle gout. No rig needed — this animates the whole GLB body and spawns VFX.
   Per-leg walk + wing flaps arrive in Phase 2 once the mesh is rigged (UniRig). Kept in its
   own file per the project's file-size convention; all helpers are global (classic <script>). */

const DRAGON_FX = [];   // live fire/smoke particles: {mesh, v, t, life, grow, drag, op, colEnd}

// the GLB body inside an npc group (skip the HP-bar sprite)
function _glbRoot(n){ return n.mesh.children.find(c => c && !c.isSprite) || null; }

// a point out in front of the dragon at head height (the body faces the player via lookAt)
function _muzzle(n){
  const dp = player.position.clone().sub(n.mesh.position); dp.y = 0;
  const dir = dp.lengthSq() > 1e-4 ? dp.normalize() : new THREE.Vector3(0, 0, 1);
  const pos = n.mesh.position.clone().addScaledVector(dir, (n.t.size || 2) * 0.75);
  pos.y += (n.t.glbHeight || 3) * 0.62;
  return { pos, dir };
}

// idle breathing + sway, plus the fire wind-up lean. Driven each frame from the NPC loop.
function glbCreatureAnim(n, dt){
  const root = _glbRoot(n); if(!root) return;
  if(root.userData._baseScale === undefined){ root.userData._baseScale = root.scale.x || 1; root.userData._t = Math.random() * 6; }
  root.userData._t += dt;
  const t = root.userData._t, base = root.userData._baseScale;
  const breathe = Math.sin(t * 1.7) * 0.018;              // slow chest rise/fall
  let sx = 1, sy = 1, leanX = 0, leanZ = Math.sin(t * 0.8) * 0.012;   // gentle idle sway
  const b = n._breath;
  if(b){
    if(b.phase === 'windup'){ const k = Math.min(1, b.t / b.windup);
      leanX = -0.24 * k;                                  // rear the head/chest back
      sy = 1 + 0.13 * k; sx = 1 + 0.05 * k;               // swell as it inhales
      leanZ += Math.sin(t * 34) * 0.022 * k;              // quiver
      if(Math.random() < dt * 14) _emitSmoke(n);          // huff: smoke wisps from the muzzle
    } else if(b.phase === 'fire'){ const k = Math.min(1, b.t / b.fire);
      leanX = 0.16 * (1 - k);                             // lunge forward as it exhales
      sy = 1 - 0.05 * Math.sin(k * Math.PI);
    }
  }
  root.scale.set(base * (1 + breathe) * sx, base * (1 + breathe) * sy, base * (1 + breathe) * sx);
  root.rotation.x = leanX;
  root.rotation.z = leanZ;
}

function _emitSmoke(n){
  const { pos } = _muzzle(n);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0x6a6a6a, transparent: true, opacity: 0.5 }));
  mesh.position.copy(pos);
  scene.add(mesh);
  DRAGON_FX.push({ mesh, v: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.5) * 0.6),
    t: 0, life: 0.9 + Math.random() * 0.5, grow: 1.6, drag: 0.96, op: 0.5, colEnd: null });
}

// a cone-shaped gout of dragonfire toward the player: yellow core at the muzzle -> red at the tips,
// widening with distance. Particles are pre-spread along the stream so it reads as fire immediately.
function spawnDragonfire(n){
  const { pos, dir } = _muzzle(n);
  const reach = Math.max(3, Math.min(11, player.position.distanceTo(n.mesh.position)));
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  for(let i = 0; i < 26; i++){
    const along = Math.pow(Math.random(), 0.7);              // bias toward the far end of the gout
    const lateral = (Math.random() - 0.5) * along * 1.3;     // cone widens with distance
    const vert = (Math.random() - 0.5) * along * 0.9;
    const p = pos.clone().addScaledVector(dir, along * reach).addScaledVector(right, lateral);
    p.y += vert;
    const size = 0.1 + along * 0.4 + Math.random() * 0.08;   // grows along the stream
    const col = [0xfff0a0, 0xffb347, 0xff5a2a][Math.min(2, Math.floor(along * 3))];
    // additive blending => overlapping flames glow and edges read translucent, like real fire
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.62,
        blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.copy(p);
    const v = dir.clone().multiplyScalar(5 + Math.random() * 4).addScaledVector(right, lateral * 2);
    v.y += vert * 1.5;
    scene.add(mesh);
    DRAGON_FX.push({ mesh, v, t: 0, life: 0.4 + Math.random() * 0.35, grow: 1.4 + Math.random(),
      drag: 0.92, op: 0.62, colEnd: null });
  }
  if(typeof Sfx !== 'undefined'){ const sfn = Sfx.dragonfire || Sfx.magicCast; if(sfn) try{ sfn.call(Sfx); }catch(e){} }
}

/* ---- Phase 2b: procedural skeletal drive for UniRig-rigged creatures ----
   The bones are generically named (bone_0..N), so we classify them by bind-pose position:
   legs = chains that descend to low Y; wing = high + lateral; tail/neck = the long horizontal chains.
   We then rotate the relevant bones each frame (gait when moving, idle sway otherwise). */
function _setupRig(n){
  const bones = n.mesh.userData.bones; if(!bones || !bones.length) return false;
  n.mesh.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(n.mesh.matrixWorld).invert();
  const lpos = b => { const w = new THREE.Vector3(); b.getWorldPosition(w); return w.applyMatrix4(inv); };
  const P = new Map(); bones.forEach(b => P.set(b, lpos(b)));
  bones.forEach(b => { b.userData._rest = b.quaternion.clone(); });
  const ps = [...P.values()];
  const ys = ps.map(p => p.y), ymin = Math.min(...ys), ymax = Math.max(...ys), span = (ymax - ymin) || 1;
  const xs = ps.map(p => p.x), zs = ps.map(p => p.z);
  const useX = (Math.max(...xs) - Math.min(...xs)) >= (Math.max(...zs) - Math.min(...zs));
  const fwd = p => useX ? p.x : p.z;      // position along the body (head .. tail)
  const side = p => useX ? p.z : p.x;     // position across the body (left .. right)
  const lateral = useX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);   // swing legs about this
  const flapV   = useX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);   // beat wings about this
  const leafOf = b => { let c = b; while(true){ const ch = c.children.find(x => x.isBone); if(!ch) return c; c = ch; } };
  // classify whole limbs by where their chain ENDS: low tip => leg, high+lateral tip => wing, high+forward => neck
  const legs = [], wings = [], neck = [], tail = [];
  bones.forEach(b => {
    const par = b.parent;
    // a limb is a CHAIN hanging off a spine branch-point: parent branches (>=2 bone kids), this one doesn't
    const isLimbRoot = par && par.isBone && par.children.filter(c => c.isBone).length >= 2
                       && b.children.filter(c => c.isBone).length <= 1;
    if(!isLimbRoot) return;
    const lf = leafOf(b), lp = P.get(b), lfp = P.get(lf);
    const tipY = (lfp.y - ymin) / span, farLat = Math.abs(side(lfp)) > span * 0.45;
    if(tipY < 0.45)                 legs.push({ bone: b, phase: (fwd(lp) > 0 ? 0 : Math.PI) + (side(lp) > 0 ? 0 : Math.PI) });
    else if(fwd(lfp) > span * 0.3)  neck.push({ bone: b });   // tip reaches forward => head/neck (before wing)
    else if(tipY > 0.55 && farLat)  wings.push({ bone: b, up: side(lfp) > 0 ? 1 : -1 });
    else                            tail.push({ bone: b });
  });
  n.mesh.userData._rig = { legs, wings, neck, tail, lateral, flapV, t: Math.random() * 5 };
  return true;
}
/* The hand-built rig (build_rig.py) ships named bones — drive those directly (robust, both wings).
   Model local axes after the GLB y-up export: forward=+X, up=+Y, lateral=+Z. */
function _setupNamedRig(n){
  const bones = n.mesh.userData.bones; if(!bones || !bones.length) return null;
  const by = {}; bones.forEach(b => by[b.name] = b);
  if(!(by['wing_L'] && by['wing_R'])) return null;            // not the named rig -> caller falls back
  bones.forEach(b => { b.userData._rest = b.quaternion.clone(); });
  // This GLB was authored with the head along model +X, but the engine faces NPCs with
  // mesh.lookAt() which aims the group's -Z at the target. Yaw the model -90deg so its head
  // lines up with the heading (else it "moonwalks"). The rig reads its axes from this root,
  // so the wing/leg axes rotate with the correction automatically.
  const root = _glbRoot(n); if(root){ root.rotation.y = -Math.PI/2; root.userData._yaw0 = -Math.PI/2; }
  return { by, fwd: new THREE.Vector3(1,0,0), up: new THREE.Vector3(0,1,0), lat: new THREE.Vector3(0,0,1),
           legs: [['legFL',0],['legBR',0],['legFR',Math.PI],['legBL',Math.PI]], t: Math.random()*5 };
}
function riggedDragonAnim(n, dt, moving){
  if(!n.mesh.userData.bones) return;                 // GLB still loading
  let rig = n.mesh.userData._namedRig;
  if(rig === undefined){ rig = _setupNamedRig(n); n.mesh.userData._namedRig = rig || false; }
  if(!rig){                                          // legacy positional fallback (generic UniRig rigs)
    if(!n.mesh.userData._rig && !_setupRig(n)) return;
    return _riggedAnimPositional(n, dt, moving);
  }
  rig.t += dt;
  // detect REAL translation so legs gait even when the AI's wander doesn't flag n.moving
  const pos = n.mesh.position;
  if(rig._lp){ const spd = Math.hypot(pos.x - rig._lp.x, pos.z - rig._lp.z) / Math.max(dt, 1e-3);
    rig._spd = rig._spd === undefined ? spd : rig._spd * 0.7 + spd * 0.3; }
  rig._lp = { x: pos.x, z: pos.z };
  const spd = rig._spd || 0;
  const walking = spd > 0.15;
  // gait phase whose CADENCE tracks ground speed -> constant stride length (~2 tiles), feet plant
  // instead of moonwalking (the old fixed freq whirred the legs while the body barely moved)
  rig._gait = (rig._gait || 0) + Math.min(12, spd * 3.2) * dt;
  // periodic showpiece "display": every ~7s it spreads its wings wide and huffs smoke
  rig._disp = (rig._disp === undefined ? -2 : rig._disp) - dt;
  if(rig._disp <= -7) rig._disp = 1.3;                          // re-arm a 1.3s display
  const disp = Math.max(0, rig._disp);
  if(disp > 0 && typeof _emitSmoke === 'function' && Math.random() < dt * 7) _emitSmoke(n);
  const mq   = (_glbRoot(n) || n.mesh).getWorldQuaternion(new THREE.Quaternion());  // root carries the -90deg facing yaw
  const fwdW = rig.fwd.clone().applyQuaternion(mq).normalize();   // wings beat about this
  const latW = rig.lat.clone().applyQuaternion(mq).normalize();   // legs swing / head pitch about this
  const upW  = rig.up.clone().applyQuaternion(mq).normalize();    // tail sways about this
  const breathing = !!n._breath, winding = n._breath && n._breath.phase === 'windup';
  const rest = b => { if(b){ b.quaternion.copy(b.userData._rest); } return b; };
  // WINGS: like a grounded OSRS dragon, held with a gentle flutter; they spread wide only for the
  // periodic display or while breathing fire (constant hard flapping on the ground looked wrong)
  const beat = 0.10 + Math.sin(rig.t * 2.2) * 0.09 + disp * 0.6 + (breathing ? 0.4 : 0);
  if(rest(rig.by.wing_L)) rig.by.wing_L.rotateOnWorldAxis(fwdW,  beat);
  if(rest(rig.by.wing_R)) rig.by.wing_R.rotateOnWorldAxis(fwdW, -beat);
  // LEGS: speed-synced diagonal trot so the feet track the ground; a tiny weight-shift when standing
  const legAmp = walking ? Math.min(0.5, 0.18 + spd * 0.13) : 0;
  rig.legs.forEach(([nm, ph]) => { const b = rest(rig.by[nm]); if(!b) return;
    b.rotateOnWorldAxis(latW, walking ? Math.sin(rig._gait + ph) * legAmp : Math.sin(rig.t * 1.1 + ph) * 0.025); });
  // NECK + HEAD: rear back to inhale before the fire; otherwise a clear slow nod + side scan
  ['neck','head'].forEach((nm, i) => { const b = rest(rig.by[nm]); if(b) b.rotateOnWorldAxis(latW, winding ? -0.34 : Math.sin(rig.t * 1.1 + i * 0.5) * 0.11); });
  if(rig.by.head) rig.by.head.rotateOnWorldAxis(upW, Math.sin(rig.t * 0.7) * 0.14);   // head sweeps to scan
  // TAIL: lazy but clearly-visible sway
  ['tail1','tail2'].forEach((nm, k) => { const b = rest(rig.by[nm]); if(b) b.rotateOnWorldAxis(upW, Math.sin(rig.t * 1.4 + k * 0.9) * 0.17); });
}
function _riggedAnimPositional(n, dt, moving){
  const rig = n.mesh.userData._rig; rig.t += dt;
  const mq = n.mesh.getWorldQuaternion(new THREE.Quaternion());
  const swing = rig.lateral.clone().applyQuaternion(mq).normalize();
  const flap  = rig.flapV.clone().applyQuaternion(mq).normalize();
  const up    = new THREE.Vector3(0, 1, 0);
  const winding = n._breath && n._breath.phase === 'windup';
  const amp = moving ? 0.42 : 0.05, freq = 8;
  rig.legs.forEach(L => { L.bone.quaternion.copy(L.bone.userData._rest); L.bone.rotateOnWorldAxis(swing, Math.sin(rig.t * freq + L.phase) * amp); });
  rig.wings.forEach(W => { W.bone.quaternion.copy(W.bone.userData._rest); W.bone.rotateOnWorldAxis(flap, (Math.sin(rig.t * 2.4) * 0.13 + (n._breath ? 0.25 : 0)) * W.up); });
  rig.neck.forEach(H => { H.bone.quaternion.copy(H.bone.userData._rest); H.bone.rotateOnWorldAxis(swing, winding ? -0.4 : Math.sin(rig.t * 1.3) * 0.03); });
  rig.tail.forEach((T, k) => { T.bone.quaternion.copy(T.bone.userData._rest); T.bone.rotateOnWorldAxis(up, Math.sin(rig.t * 1.6 + k) * 0.06); });
}

function updateDragonFX(dt){
  for(let i = DRAGON_FX.length - 1; i >= 0; i--){
    const p = DRAGON_FX[i]; p.t += dt;
    p.mesh.position.addScaledVector(p.v, dt);
    p.v.multiplyScalar(p.drag);
    const k = Math.min(1, p.t / p.life);
    p.mesh.scale.setScalar(1 + k * p.grow);
    p.mesh.material.opacity = (1 - k) * p.op;
    if(p.colEnd && k > 0.5) p.mesh.material.color.lerp(p.colEnd, 0.08);
    if(p.t >= p.life){ scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); DRAGON_FX.splice(i, 1); }
  }
}
