/* throwaway harness: drive walkAnim/beastAnim idle with ud.inCombat on vs off and prove the
   COMBAT-READY STANCE. Asserts: (1) an idle fighter holds a distinct, readable guard pose
   (bladed legs, weapon arm up, forward lean) that peaceful idle does NOT; (2) the swing gate
   (ud.swinging) and block gate (ud.blocking) are respected so the stance never stomps a strike
   or a parry; (3) on combat exit the peaceful branch eases every channel back toward rest;
   (4) a corpse (ud.death) never adopts a stance; (5) brutes hoist their fists in combat and
   relax them when it ends. walkAnim/beastAnim are copied VERBATIM from game2_world.js. */
function V(){ this.x=0;this.y=0;this.z=0; }
V.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this;};
V.prototype.setScalar=function(s){this.x=s;this.y=s;this.z=s;return this;};
function Obj(){ this.position=new V(); this.rotation=new V(); this.scale=new V(); this.scale.set(1,1,1);
  this.children=[]; this.userData={}; }
Obj.prototype.add=function(c){ this.children.push(c); return this; };

// idle-path stubs: in this harness nothing is mid-strike/flinch/parry/death by default
function tickHit(){ return false; }
function tickSwing(){ return false; }
function tickBlock(g){ return false; }
function tickBeastSwing(){ return false; }

/* ---- walkAnim + beastAnim copied verbatim from src/game2_world.js ---- */
function walkAnim(g, moving, dt, speedMul){
  const p=g.userData.parts; if(!p) return;
  const ud=g.userData;
  tickHit(g, dt);
  const swung = tickSwing(g, dt);
  tickBlock(g, dt);
  speedMul = speedMul || 1;
  if(ud.idleT===undefined) ud.idleT = ud.walkT || 0;
  ud.idleT += dt;
  const run = moving && speedMul>1.25;
  if(moving){
    ud.walkT += dt*9*speedMul;
    const s=Math.sin(ud.walkT)*(run?0.8:0.55);
    p.legL.rotation.x=s; p.legR.rotation.x=-s;
    if(!ud.swinging){ if(!ud.blocking) p.armL.rotation.x=-s*0.7; p.armR.rotation.x=s*0.7; }
    if(p.torso && !swung){
      if(ud._torsoSY!==undefined) p.torso.scale.y = ud._torsoSY;
      p.torso.rotation.z = -Math.sin(ud.walkT)*(run?0.09:0.05);
      p.torso.rotation.x = run?0.13:0.05;
    }
    const hb = Math.sin(ud.walkT)*0.04;
    if(p.head)    p.head.rotation.z = hb;
    if(p.headTop) p.headTop.rotation.z = hb;
  } else if(ud.inCombat && !ud.death){
    const cb = Math.sin(ud.idleT*3.2);
    p.legL.rotation.x =  0.16;  p.legR.rotation.x = -0.16;
    if(!ud.swinging){
      p.armR.rotation.x = -0.55 + cb*0.05;
      if(!ud.blocking) p.armL.rotation.x = -0.32 + cb*0.04;
    }
    if(p.torso && !swung){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*2.6)*0.016);
      p.torso.rotation.z = cb*0.05;
      p.torso.rotation.x = 0.13;
    }
    const hc = cb*0.03;
    if(p.head)    p.head.rotation.z = hc;
    if(p.headTop) p.headTop.rotation.z = hc;
  } else {
    for(const k of ['legL','legR']) p[k].rotation.x*=0.8;
    if(!ud.swinging){ if(!ud.blocking) p.armL.rotation.x*=0.8; p.armR.rotation.x*=0.8; }
    if(p.torso && !swung){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*1.6)*0.022);
      p.torso.rotation.z = Math.sin(ud.idleT*0.8)*0.018;
      p.torso.rotation.x *= 0.85;
    }
    const hn = Math.sin(ud.idleT*0.8+0.4)*0.02;
    if(p.head)    p.head.rotation.z = hn;
    if(p.headTop) p.headTop.rotation.z = hn;
  }
}
function beastAnim(g, moving, dt){
  tickHit(g, dt);
  const swung = tickSwing(g, dt);
  const lunged = tickBeastSwing(g, dt);
  tickBlock(g, dt);
  const busy = swung || lunged;
  const p=g.userData.parts; if(!p||!p.legs) return;
  const ud=g.userData;
  if(ud.idleT===undefined) ud.idleT = ud.walkT || 0;
  ud.idleT += dt;
  if(moving){
    ud.walkT += dt*10;
    const s=Math.sin(ud.walkT)*0.5;
    p.legs.forEach((l,i)=>l.rotation.z = (i%2?s:-s));
    if(p.torso && ud._torsoSY!==undefined) p.torso.scale.y = ud._torsoSY;
  } else if(ud.inCombat && !ud.death && !busy){
    if(p.torso){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*3.4)*0.05);
    }
    p.legs.forEach((l,i)=> l.rotation.z = Math.sin(ud.idleT*3.4 + i*0.9)*0.07);
    if(p.armR && !ud.swinging) p.armR.rotation.x = -0.45 + Math.sin(ud.idleT*3.4)*0.05;
  } else {
    p.legs.forEach(l=>l.rotation.z*=0.8);
    if(p.armR && !ud.swinging) p.armR.rotation.x*=0.85;
    if(p.torso && !busy){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*2.0)*0.03);
    }
  }
  if(p.tail) p.tail.rotation.y = 0;
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };

function humanoid(){ const g=new Obj();
  g.userData.parts={ legL:new Obj(), legR:new Obj(), armL:new Obj(), armR:new Obj(),
    torso:new Obj(), head:new Obj(), headTop:new Obj() }; return g; }
function brute(){ const g=new Obj();
  g.userData.parts={ legs:[new Obj(),new Obj()], armR:new Obj(), torso:new Obj() }; return g; }
const drive=(g,fn,frames)=>{ for(let i=0;i<frames;i++) fn(g, false, 1/60); };

console.log('[humanoid: peaceful idle vs combat stance]');
const peace=humanoid(); drive(peace, walkAnim, 90);
const fight=humanoid(); fight.userData.inCombat=true; drive(fight, walkAnim, 90);
ok(Math.abs(peace.userData.parts.armR.rotation.x)<0.05, 'peaceful idle: weapon arm hangs at rest ('+peace.userData.parts.armR.rotation.x.toFixed(3)+')');
ok(fight.userData.parts.armR.rotation.x < -0.45, 'combat stance: weapon arm raised on guard ('+fight.userData.parts.armR.rotation.x.toFixed(3)+')');
ok(fight.userData.parts.armL.rotation.x < -0.25, 'combat stance: off-hand raised as a guard ('+fight.userData.parts.armL.rotation.x.toFixed(3)+')');
ok(fight.userData.parts.legL.rotation.x>0.1 && fight.userData.parts.legR.rotation.x<-0.1, 'combat stance: bladed footing (one foot fwd, one back)');
ok(fight.userData.parts.torso.rotation.x>0.1, 'combat stance: weight pitched forward ('+fight.userData.parts.torso.rotation.x.toFixed(3)+')');
ok(Math.abs(peace.userData.parts.legL.rotation.x)<0.05 && Math.abs(peace.userData.parts.torso.rotation.x)<0.05, 'peaceful idle: feet square, no forward lean');

console.log('[humanoid: swing + block gates respected]');
const sw=humanoid(); sw.userData.inCombat=true; sw.userData.swinging=true;
sw.userData.parts.armR.rotation.x=-2.0;  // pretend a strike owns the arm this frame
drive(sw, walkAnim, 1);
ok(sw.userData.parts.armR.rotation.x===-2.0, 'combat idle does NOT touch armR while ud.swinging');
const bl=humanoid(); bl.userData.inCombat=true; bl.userData.blocking=true;
bl.userData.parts.armL.rotation.x=-1.4;  // a parry owns the off-arm this frame
drive(bl, walkAnim, 1);
ok(bl.userData.parts.armL.rotation.x===-1.4, 'combat idle does NOT touch armL while ud.blocking');

console.log('[humanoid: stance eases out when the fight ends]');
const ex=humanoid(); ex.userData.inCombat=true; drive(ex, walkAnim, 90);
const armUp=ex.userData.parts.armR.rotation.x;
ex.userData.inCombat=false; drive(ex, walkAnim, 60);   // combat over -> peaceful decays
ok(Math.abs(ex.userData.parts.armR.rotation.x) < Math.abs(armUp)*0.2, 'weapon arm eases back down after combat ('+armUp.toFixed(2)+' -> '+ex.userData.parts.armR.rotation.x.toFixed(3)+')');

console.log('[humanoid: a corpse never takes a stance]');
const dead=humanoid(); dead.userData.inCombat=true; dead.userData.death={t:0,dur:0.5};
drive(dead, walkAnim, 30);
ok(Math.abs(dead.userData.parts.armR.rotation.x)<0.05 && Math.abs(dead.userData.parts.torso.rotation.x)<0.05, 'ud.death suppresses the combat stance (corpse stays limp)');

console.log('[brute: fists up in combat, relax after]');
const bp=brute(); drive(bp, beastAnim, 60);
const bf=brute(); bf.userData.inCombat=true; drive(bf, beastAnim, 60);
ok(Math.abs(bp.userData.parts.armR.rotation.x)<0.05, 'peaceful brute: arms hang ('+bp.userData.parts.armR.rotation.x.toFixed(3)+')');
ok(bf.userData.parts.armR.rotation.x < -0.35, 'combat brute: fists hoisted ('+bf.userData.parts.armR.rotation.x.toFixed(3)+')');
bf.userData.inCombat=false; drive(bf, beastAnim, 60);
ok(Math.abs(bf.userData.parts.armR.rotation.x)<0.05, 'combat brute: fists relax when the fight ends ('+bf.userData.parts.armR.rotation.x.toFixed(3)+')');
const bsw=brute(); bsw.userData.inCombat=true; bsw.userData.swinging=true; bsw.userData.parts.armR.rotation.x=-2.5;
drive(bsw, beastAnim, 1);
ok(bsw.userData.parts.armR.rotation.x===-2.5, 'brute combat idle does NOT touch armR while ud.swinging');

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
