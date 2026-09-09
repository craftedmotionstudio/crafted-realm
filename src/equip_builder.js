/* ================= EQUIP BUILDER v1 (owner directive 2026-07-17) =================
 * ONE canonical system for putting items on characters. Every held item follows
 * the same methodology on ANY avatar:
 *   1. FIND THE HAND: locate the hand bone AND its finger children on the rig,
 *      and derive the PALM POINT (the fingers wrap here — items gripped at the
 *      bone origin sit at the WRIST, which is why hands kept "holding the blade").
 *   2. DECLARE THE ITEM: every model class has a spec — which local axis is the
 *      business direction (signed — no bounding-box guessing), where the GRIP is
 *      in the mesh (family contract: grip at local origin), the roll reference
 *      (which face points forward), and the owner's NEUTRAL resting pose.
 *   3. SOLVE: full deterministic basis (axis -> neutral pose, roll -> forward),
 *      then place the item so its grip midpoint sits exactly in the palm.
 *   4. AUDIT: EquipBuilder.audit() measures grip-to-palm distance and neutral
 *      angles on the live avatar so harnesses can FAIL instead of eyeballing.
 * Neutral poses = owner hold doctrine: blades at attention (forward, angled up
 * slightly); battleaxe vertical head-up; bows lean forward, hand at the riser;
 * tools carry head down-forward for work readiness.
 * Worn (non-held) slots keep their fits in fx_humanoid; helms/shields can join
 * the spec table as the system grows. */
(function(){
  'use strict';

  /* axis/roll are ITEM-LOCAL (glTF space, family contract); neutral/rollAim are
   * CHARACTER-frame directions (x=right, y=up, z=forward). grip: mesh-local
   * grip midpoint (contract: authored at the origin). palmAlong: metres from
   * the wrist toward the fingers where the fist actually closes. */
  var EQUIP_SPECS = {
    /* grip points (mesh-local, glTF space) tuned per owner review 2026-07-17-r3:
     * blades: nudged toward the pommel (+Y) so the fist covers the brown grip
     * and ONLY the pommel shows below the hand; battleaxe: held at the BOTTOM
     * of the haft; bows: gripped at the curved WOOD riser (+X belly), never the
     * string line at x=0. */
    sword:     {axis:[0,-1,0], roll:[1,0,0],  neutral:[0,0.35,0.94],  rollAim:[1,0,0],  grip:[0,0.025,0], palmAlong:0.085},
    longsword: {axis:[0,-1,0], roll:[1,0,0],  neutral:[0,0.35,0.94],  rollAim:[1,0,0],  grip:[0,0.025,0], palmAlong:0.085},
    sabre:     {axis:[0,-1,0], roll:[1,0,0],  neutral:[0,0.35,0.94],  rollAim:[1,0,0],  grip:[0,0.028,0], palmAlong:0.085},
    dagger:    {axis:[0,-1,0], roll:[1,0,0],  neutral:[0,0.35,0.94],  rollAim:[1,0,0],  grip:[0,0.02,0],  palmAlong:0.075},
    battleaxe: {axis:[0,1,0],  roll:[0,0,1],  neutral:[0,0.67,0.74],  rollAim:[1,0,0],  grip:[0,-0.14,0], palmAlong:0.085},  // owner r6: ~48deg from vertical (+17deg over r5)
    /* set 2 — authored head/blade +Y, spec-driven (no bbox guessing); one-hand
     * crush weapons rest at attention like blades; 2h same but heavier */
    mace:      {axis:[0,1,0],  roll:[1,0,0],  neutral:[0,0.42,0.91],  rollAim:[1,0,0],  grip:[0,0,0],     palmAlong:0.085},
    // owner r7: block rotated 90deg about the haft — long axis into the lean plane
    warhammer: {axis:[0,1,0],  roll:[1,0,0],  neutral:[0,0.42,0.91],  rollAim:[0,0,1],  grip:[0,0,0],     palmAlong:0.085},
    // owner r8: shoulder carry with the ARM POSED FORWARD (playerGLBAnim adds +0.55
    // pitch) — this pre-pose neutral lands the blade up-back on the shoulder AFTER
    // the arm lift rotates the hand
    greatsword:{axis:[0,1,0],  roll:[1,0,0],  neutral:[-0.16,0.56,-0.81], rollAim:[0,0,1], grip:[0,0,0],  palmAlong:0.09},
    axe:       {axis:[0,1,0],  roll:[0,0,1],  neutral:[0,-0.55,0.84], rollAim:[1,0,0],  grip:[0,-0.10,0], palmAlong:0.085},
    pick:      {axis:[0,1,0],  roll:[0,0,1],  neutral:[0,-0.55,0.84], rollAim:[1,0,0],  grip:[0,-0.10,0], palmAlong:0.085},
    bow:       {axis:[0,1,0],  roll:[1,0,0],  neutral:[0,0.86,0.51],  rollAim:[0,0,1],  grip:[0.13,-0.10,0],  palmAlong:0.08},
    longbow:   {axis:[0,1,0],  roll:[1,0,0],  neutral:[0,0.86,0.51],  rollAim:[0,0,1],  grip:[0.185,-0.11,0], palmAlong:0.08},
    staff:     {axis:[0,1,0],  roll:[1,0,0],  neutral:[0,0.95,0.31],  rollAim:[0,0,1],  grip:[0,0,0], palmAlong:0.085},
  };

  var V3 = function(a){ return new THREE.Vector3(a[0], a[1], a[2]); };

  /* palm point in HAND-BONE LOCAL space: average the immediate finger children
   * (their .position is already bone-local), walk palmAlong metres that way.
   * Falls back to a mixamo-typical guess when a rig has no finger bones. */
  function palmLocal(bone, palmAlong){
    var dir = new THREE.Vector3();
    var n = 0;
    for(var i=0;i<bone.children.length;i++){
      var c = bone.children[i];
      if((c.isBone || c.type==='Bone') && c.position.lengthSq() > 1e-8){
        dir.add(c.position.clone().normalize()); n++;
      }
    }
    if(n===0) dir.set(0,1,0); else dir.multiplyScalar(1/n).normalize();
    var ws = new THREE.Vector3(); bone.getWorldScale(ws);
    return dir.multiplyScalar(palmAlong / (ws.x || 1));
  }

  /* deterministic orientation: item local (roll,axis) basis -> world
   * (rollAim,neutral) basis, expressed in bone space. No bbox guessing. */
  function solveQuaternion(bone, spec, inChar){
    var yW = inChar(V3(spec.neutral)).normalize();
    var xAim = inChar(V3(spec.rollAim));
    var xW = xAim.sub(yW.clone().multiplyScalar(xAim.dot(yW))).normalize();
    var zW = new THREE.Vector3().crossVectors(xW, yW);
    var world = new THREE.Matrix4().makeBasis(xW, yW, zW);

    var yl = V3(spec.axis).normalize();
    var xl0 = V3(spec.roll);
    var xl = xl0.sub(yl.clone().multiplyScalar(xl0.dot(yl))).normalize();
    var zl = new THREE.Vector3().crossVectors(xl, yl);
    var local = new THREE.Matrix4().makeBasis(xl, yl, zl);

    var qWorld = new THREE.Quaternion().setFromRotationMatrix(
      world.multiply(new THREE.Matrix4().copy(local).invert()));
    var qBone = new THREE.Quaternion(); bone.getWorldQuaternion(qBone);
    return qBone.invert().multiply(qWorld);
  }

  /* main entry: orient + place `mesh` (already attached to `bone`) so its grip
   * midpoint sits in the palm. Returns the solve details for auditing. */
  function solveHeld(bone, mesh, model, inChar){
    var spec = EQUIP_SPECS[model];
    if(!spec) return null;
    var q = solveQuaternion(bone, spec, inChar);
    mesh.quaternion.copy(q);
    var palm = palmLocal(bone, spec.palmAlong);
    var grip = V3(spec.grip).applyQuaternion(q).multiply(mesh.scale);
    mesh.position.copy(palm).sub(grip);
    return {palm: palm, spec: spec};
  }

  /* QA: measure the live player's held item — grip-to-palm distance (world) and
   * the actual business-axis angle vs the declared neutral. Harnesses assert on
   * numbers instead of screenshots. */
  function audit(){
    if(typeof player==='undefined' || !player.userData) return {ok:false, reason:'no player'};
    var gear = player.userData.glbGear || {};
    var m = gear.weapon;
    if(!m || !m.parent) return {ok:false, reason:'no held weapon'};
    var def = (typeof ITEMS!=='undefined' && typeof Player!=='undefined') ? ITEMS[Player.equip.weapon] : null;
    var spec = def && EQUIP_SPECS[def.model];
    if(!spec) return {ok:false, reason:'no spec for '+(def&&def.model)};
    player.updateMatrixWorld(true);
    var bone = m.parent;
    var palmW = bone.localToWorld(palmLocal(bone, spec.palmAlong).clone());
    var gripW = m.localToWorld(V3(spec.grip).clone());
    var axisW = m.localToWorld(V3(spec.axis).clone()).sub(m.localToWorld(new THREE.Vector3(0,0,0))).normalize();
    var qC = new THREE.Quaternion(); player.getWorldQuaternion(qC);
    var neutralW = V3(spec.neutral).applyQuaternion(qC).normalize();
    return {
      ok: true, model: def.model, item: Player.equip.weapon,
      gripToPalm: +palmW.distanceTo(gripW).toFixed(3),
      neutralAngleDeg: +(Math.acos(Math.max(-1,Math.min(1,axisW.dot(neutralW))))*180/Math.PI).toFixed(1),
    };
  }

  window.EquipBuilder = {specs: EQUIP_SPECS, solveHeld: solveHeld, audit: audit};
})();
