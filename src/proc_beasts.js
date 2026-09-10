/* proc_beasts.js — distinct procedural monster silhouettes.
 *
 * For a long time every non-humanoid, non-modelled NPC fell through to the single
 * `beast()` dog-shape in game2_world.js, recoloured per type — so a mosswolf, a deep
 * crawler, a duneclaw and TWO bosses (Korthul, the Fenlord) all read as the same
 * blob in a different paint. OSRS sells its world on readable, distinct silhouettes;
 * this file gives the beast roster four genuine body archetypes instead of one.
 *
 * All builders honour the existing convention so the animation layer is reused as-is:
 *   - they face +X (head/front toward +X), matching beast() so NPC facing is unchanged
 *   - they take (color, size) and scale every dimension by size, like beast()
 *   - userData.parts.legs[] are pivot Groups → beastAnim swings them on rotation.z
 *   - userData.parts.torso (a mesh) → beastAnim breathes its scale.y at idle
 *   - userData.parts.tail (a pivot) → beastAnim sways it
 *   - brutes also expose parts.armR/armL/handR/torso so swing()+tickSwing animate a
 *     real overhead attack (wired in beastAnim) — bosses now visibly wind up and slam.
 * Uses only the global `mat()` helper + THREE, so it plugs into game + tools identically.
 * Pure read of the static `body` field on NPC_TYPES — no shared state is mutated.
 */

/* shared: a glowing eye pair so every monster reads as "alive and hostile" */
function _beastEyes(g, x, y, zSpread, s, col){
  for(const sz of [-1,1]){
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.05*s,0.05*s,0.05*s),
      new THREE.MeshBasicMaterial({color:col||0xffd24a}));
    eye.position.set(x, y, sz*zSpread*s); g.add(eye);
  }
}
/* shared: a leg pivot at (x,y,z) with a box shin hanging below it */
function _leg(g, parts, x, y, z, w, len, color){
  const piv=new THREE.Group(); piv.position.set(x, y, z);
  const shin=new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat(color));
  shin.position.y=-len/2; shin.castShadow=true; piv.add(shin);
  g.add(piv); parts.legs.push(piv);
  return piv;
}

/* ---------- wolf: lean low predator, long muzzle, shoulder ruff, bushy tail ---------- */
function wolfBeast(color, size){
  const s=size||1;
  const g=new THREE.Group(); const parts={legs:[]};
  // long low slung body
  const torso=new THREE.Mesh(new THREE.BoxGeometry(1.05*s,0.34*s,0.36*s), mat(color));
  torso.position.y=0.55*s; torso.castShadow=true; g.add(torso); parts.torso=torso;
  // raised shoulders + a shaggy ruff so it reads as a hunter, not a dog
  const ruff=new THREE.Mesh(new THREE.BoxGeometry(0.34*s,0.46*s,0.5*s), mat(color));
  ruff.position.set(0.34*s,0.6*s,0); ruff.castShadow=true; g.add(ruff);
  for(let i=0;i<3;i++){
    const tuft=new THREE.Mesh(new THREE.ConeGeometry(0.07*s,0.22*s,4), mat(color));
    tuft.position.set(0.2*s+i*0.12*s,0.86*s,0); tuft.rotation.z=-0.3; g.add(tuft);
  }
  // low forward head + long muzzle — all parented to a neck pivot so the head can
  // nod into a lunge-bite (tickBeastSwing drives parts.head.rotation.z)
  const headPiv=new THREE.Group(); headPiv.position.set(0.5*s,0.6*s,0); g.add(headPiv); parts.head=headPiv;
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.26*s,0.24*s,0.26*s), mat(color));
  head.position.set(0.12*s,-0.02*s,0); head.castShadow=true; headPiv.add(head);
  const muzzle=new THREE.Mesh(new THREE.BoxGeometry(0.26*s,0.13*s,0.15*s), mat(color));
  muzzle.position.set(0.32*s,-0.08*s,0); headPiv.add(muzzle);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(0.06*s,0.06*s,0.08*s), mat(0x14100a));
  nose.position.set(0.46*s,-0.06*s,0); headPiv.add(nose);
  // lower jaw — hinged at the back of the muzzle, front drops open on the bite
  const jaw=new THREE.Group(); jaw.position.set(0.2*s,-0.105*s,0); headPiv.add(jaw); parts.jaw=jaw;
  const jawM=new THREE.Mesh(new THREE.BoxGeometry(0.24*s,0.06*s,0.13*s), mat(0x14100a));
  jawM.position.set(0.12*s,-0.02*s,0); jaw.add(jawM);
  for(const sz of [-1,1]){            // swept-back ears
    const ear=new THREE.Mesh(new THREE.ConeGeometry(0.06*s,0.17*s,4), mat(color));
    ear.position.set(0.04*s,0.16*s,sz*0.1*s); ear.rotation.z=0.5; ear.rotation.x=sz*0.3; headPiv.add(ear);
  }
  _beastEyes(headPiv, 0.24*s, 0.02*s, 0.09, s, 0xffe14a);
  // bushy tail
  const tailPiv=new THREE.Group(); tailPiv.position.set(-0.5*s,0.58*s,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.4*s,0.16*s,0.16*s), mat(color));
  tail.position.x=-0.2*s; tail.rotation.z=0.5; tailPiv.add(tail); g.add(tailPiv); parts.tail=tailPiv;
  // four thin legs
  for(const sx of [-0.34,0.32]) for(const sz of [-0.12,0.12])
    _leg(g, parts, sx*s, 0.4*s, sz*s, 0.08*s, 0.4*s, color);
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}

/* ---------- crawler: low segmented insectoid, mandibles, six splayed legs ---------- */
function crawlerBeast(color, size){
  const s=size||1;
  const g=new THREE.Group(); const parts={legs:[]};
  // chitin segments, low to the ground
  const abdomen=new THREE.Mesh(new THREE.BoxGeometry(0.6*s,0.34*s,0.42*s), mat(color));
  abdomen.position.set(-0.22*s,0.34*s,0); abdomen.castShadow=true; g.add(abdomen);
  const thorax=new THREE.Mesh(new THREE.BoxGeometry(0.42*s,0.32*s,0.4*s), mat(color));
  thorax.position.set(0.18*s,0.36*s,0); thorax.castShadow=true; g.add(thorax); parts.torso=thorax;
  // plated ridge down the back
  for(let i=0;i<3;i++){
    const plate=new THREE.Mesh(new THREE.ConeGeometry(0.08*s,0.16*s,4), mat(color));
    plate.position.set((-0.3+i*0.28)*s,0.56*s,0); g.add(plate);
  }
  // head + snapping mandibles
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.24*s,0.22*s,0.3*s), mat(color));
  head.position.set(0.5*s,0.34*s,0); head.castShadow=true; g.add(head);
  parts.maw=[];                       // mandibles scissor inward on the strike (tickBeastSwing)
  for(const sz of [-1,1]){
    const mand=new THREE.Mesh(new THREE.ConeGeometry(0.05*s,0.2*s,4), mat(0x14100a));
    mand.position.set(0.66*s,0.3*s,sz*0.09*s); mand.rotation.z=-Math.PI/2; mand.rotation.y=sz*0.4; g.add(mand);
    parts.maw.push({m:mand, sign:sz});
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.012*s,0.012*s,0.26*s,4), mat(0x14100a));
    ant.position.set(0.56*s,0.5*s,sz*0.07*s); ant.rotation.z=-0.7; ant.rotation.x=sz*0.3; g.add(ant);
  }
  _beastEyes(g, 0.58*s, 0.4*s, 0.1, s, 0xff5a3a);
  // six legs, splayed wide (skitter when beastAnim alternates them)
  for(const sx of [-0.2,0.1,0.4]) for(const sz of [-0.26,0.26])
    _leg(g, parts, sx*s, 0.3*s, sz*s, 0.05*s, 0.32*s, color).children[0].rotation.z = (sz<0?0.5:-0.5);
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}

/* ---------- crab/shellclaw: wide armoured shell, two big pincers, eye stalks ---------- */
function crabBeast(color, size){
  const s=size||1;
  const g=new THREE.Group(); const parts={legs:[]};
  // domed shell (a flattened low box reads cleaner than a sphere at flat-shaded low poly)
  const shell=new THREE.Mesh(new THREE.BoxGeometry(0.85*s,0.4*s,0.95*s), mat(color));
  shell.position.y=0.48*s; shell.castShadow=true; g.add(shell); parts.torso=shell;
  const dome=new THREE.Mesh(new THREE.BoxGeometry(0.6*s,0.24*s,0.7*s), mat(color));
  dome.position.y=0.68*s; g.add(dome);
  // eye stalks on top, peering forward
  for(const sz of [-1,1]){
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.025*s,0.03*s,0.22*s,5), mat(color));
    stalk.position.set(0.32*s,0.84*s,sz*0.16*s); g.add(stalk);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.06*s,6,6),
      new THREE.MeshBasicMaterial({color:0x101010}));
    eye.position.set(0.32*s,0.96*s,sz*0.16*s); g.add(eye);
  }
  // two big front pincers, raised and open — thrust forward and snap shut on the strike
  parts.claws=[];
  for(const sz of [-1,1]){
    const armP=new THREE.Group(); armP.position.set(0.42*s,0.46*s,sz*0.5*s);
    const upper=new THREE.Mesh(new THREE.BoxGeometry(0.36*s,0.12*s,0.12*s), mat(color));
    upper.position.x=0.16*s; upper.rotation.z=0.2; armP.add(upper);
    const claw1=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.1*s,0.1*s), mat(color));
    claw1.position.set(0.42*s,0.05*s,0); claw1.rotation.z=0.35; armP.add(claw1);
    const claw2=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.1*s,0.1*s), mat(color));
    claw2.position.set(0.42*s,-0.05*s,0); claw2.rotation.z=-0.35; armP.add(claw2);
    armP.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(armP);
    parts.claws.push({arm:armP, claw1, claw2});
  }
  // short stubby walking legs (4 a side packed low)
  for(const sx of [-0.28,0,0.28]) for(const sz of [-0.42,0.42])
    _leg(g, parts, sx*s, 0.34*s, sz*s, 0.06*s, 0.34*s, color).children[0].rotation.z = (sz<0?0.6:-0.6);
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}

/* ---------- brute: heavy hunched biped boss — broad shoulders, long arms, small head.
   Exposes armR/armL/handR + torso so swing()+tickSwing drive an overhead slam. The
   forward hunch lives in part POSITIONS (not torso.rotation) so tickSwing resetting
   torso.rotation to 0 never undoes the posture. ---------- */
function bruteBeast(color, size){
  const s=size||1;
  const g=new THREE.Group(); const parts={legs:[]};
  const dark = (typeof shade==='function') ? shade(color,0.68) : color;
  // barrel torso, leaning forward via geometry offset
  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.7*s,0.8*s,0.6*s), mat(color));
  torso.position.set(0.1*s,1.05*s,0); torso.castShadow=true; g.add(torso); parts.torso=torso;
  // hunched upper back / hump
  const hump=new THREE.Mesh(new THREE.BoxGeometry(0.5*s,0.42*s,0.5*s), mat(dark));
  hump.position.set(-0.16*s,1.42*s,0); hump.castShadow=true; g.add(hump);
  // back ridge spikes
  for(let i=0;i<3;i++){
    const spike=new THREE.Mesh(new THREE.ConeGeometry(0.07*s,0.26*s,4), mat(dark));
    spike.position.set((-0.26+i*0.12)*s,1.62*s-i*0.05*s,0); spike.rotation.z=-0.4; g.add(spike);
  }
  // broad shoulders
  const shoulders=new THREE.Mesh(new THREE.BoxGeometry(0.5*s,0.3*s,1.0*s), mat(color));
  shoulders.position.set(0.16*s,1.5*s,0); shoulders.castShadow=true; g.add(shoulders);
  // small sunken head, jutting forward
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.3*s,0.3*s,0.32*s), mat(color));
  head.position.set(0.5*s,1.46*s,0); head.castShadow=true; g.add(head);
  const jaw=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.12*s,0.26*s), mat(dark));
  jaw.position.set(0.62*s,1.34*s,0); g.add(jaw);
  for(const sz of [-1,1]){            // small horns
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.05*s,0.22*s,4), mat(0xe8e0cc));
    horn.position.set(0.42*s,1.66*s,sz*0.12*s); horn.rotation.z=0.4; horn.rotation.x=-sz*0.3; g.add(horn);
  }
  _beastEyes(g, 0.6*s, 1.5*s, 0.09, s, 0xff3a2a);
  // long heavy arms — pivots at the shoulder, mesh hangs DOWN so rest rotation is 0
  // (tickSwing raises armR.rotation.x for the slam, then snaps it back to 0 cleanly)
  function arm(sz){
    const p=new THREE.Group(); p.position.set(0.16*s,1.5*s,sz*0.52*s);
    const upper=new THREE.Mesh(new THREE.BoxGeometry(0.2*s,0.6*s,0.22*s), mat(color));
    upper.position.y=-0.3*s; upper.castShadow=true; p.add(upper);
    const fore=new THREE.Group(); fore.position.y=-0.58*s;          // hand/forearm anchor
    const lower=new THREE.Mesh(new THREE.BoxGeometry(0.22*s,0.46*s,0.24*s), mat(color));
    lower.position.y=-0.2*s; lower.castShadow=true; fore.add(lower);
    const fist=new THREE.Mesh(new THREE.BoxGeometry(0.28*s,0.26*s,0.3*s), mat(dark));
    fist.position.y=-0.46*s; fist.castShadow=true; fore.add(fist);
    p.add(fore); g.add(p);
    return {p, fore};
  }
  const aR=arm(1), aL=arm(-1);
  parts.armR=aR.p; parts.handR=aR.fore; parts.armL=aL.p;
  // thick short legs
  for(const sz of [-1,1])
    _leg(g, parts, 0.06*s, 0.7*s, sz*0.26*s, 0.24*s, 0.72*s, color);
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}

/* registry the spawner reads off the static `body` field — no NPC_TYPES mutation */
const BEAST_BODIES = { wolf:wolfBeast, crawler:crawlerBeast, crab:crabBeast, brute:bruteBeast };
