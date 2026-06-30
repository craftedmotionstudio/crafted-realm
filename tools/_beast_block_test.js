/* throwaway harness: stub THREE, build each beast (+ a synthetic humanoid), fire a
   block/parry and drive the tickBlock envelope. Proves a parried hit (0 hitsplat) raises
   a guard on each archetype's own free channels, sets/clears ud.blocking, and snaps every
   touched channel back to EXACT rest at completion — and that a corpse never parries. */
function V(){ this.x=0;this.y=0;this.z=0; }
V.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this;};
V.prototype.setScalar=function(s){this.x=s;this.y=s;this.z=s;return this;};
function Obj(){ this.position=new V(); this.rotation=new V(); this.scale=new V(); this.scale.set(1,1,1);
  this.children=[]; this.userData={}; this.isMesh=false; }
Obj.prototype.add=function(c){ this.children.push(c); return this; };
Obj.prototype.traverse=function(fn){ fn(this); this.children.forEach(c=>c.traverse?c.traverse(fn):fn(c)); };
const THREE = {
  Group:function(){ return new Obj(); },
  Mesh:function(){ const o=new Obj(); o.isMesh=true; return o; },
  BoxGeometry:function(){ return {attributes:{position:{count:0}}}; },
  ConeGeometry:function(){return{};}, CylinderGeometry:function(){return{};}, SphereGeometry:function(){return{};},
  TorusGeometry:function(){return{};},
  MeshBasicMaterial:function(){return{};}, MeshLambertMaterial:function(){return{};},
};
global.THREE = THREE;
global.mat = ()=>({}); global.shade = (c)=>c;

const fs = require('fs'); const path = require('path');
eval(fs.readFileSync(path.join(__dirname,'..','src','proc_beasts.js'),'utf8'));   // beast builders

/* blockReact + tickBlock copied verbatim from game2_world.js */
function blockReact(g){
  if(!g||!g.userData) return;
  const ud=g.userData;
  if(ud.death) return;                       // a corpse doesn't parry
  ud.block = {t:0, dur:0.34};
}
function tickBlock(g, dt){
  const ud=g.userData, b=ud&&ud.block, p=ud&&ud.parts;
  if(!b||!p){ if(ud) ud.blocking=false; return false; }
  b.t += dt;
  const f = Math.min(1, b.t/b.dur);
  const amp = Math.sin(Math.PI*f);
  ud.blocking = true;
  if(p.armL){
    p.armL.rotation.x = -1.4*amp;
    p.armL.rotation.z =  0.7*amp;
    if(p.handL) p.handL.rotation.x = -0.5*amp;
    if(p.head)  p.head.rotation.x =  0.16*amp;
  } else if(p.head){
    p.head.rotation.x = -0.32*amp;
  } else if(p.maw){
    for(const md of p.maw) md.m.rotation.y = md.sign*(0.4+0.6*amp);
  } else if(p.claws){
    for(const c of p.claws) c.arm.rotation.x = -0.5*amp;
  }
  if(f>=1){
    if(p.armL){ p.armL.rotation.x=0; p.armL.rotation.z=0; if(p.handL) p.handL.rotation.x=0; if(p.head) p.head.rotation.x=0; }
    else if(p.head){ p.head.rotation.x=0; }
    else if(p.maw){ for(const md of p.maw) md.m.rotation.y=md.sign*0.4; }
    else if(p.claws){ for(const c of p.claws) c.arm.rotation.x=0; }
    ud.block=null; ud.blocking=false; return false;
  }
  return true;
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };

function run(name, builder, probe, restCheck){
  console.log('['+name+']');
  const g = builder(0x888888, 1);
  blockReact(g);
  ok(!!g.userData.block, name+' arms a block on a fully-absorbed hit');
  let peak=0, sawBlocking=false, alive=true, frames=0;
  while(alive && frames<60){
    alive = tickBlock(g, 1/60);
    if(g.userData.blocking) sawBlocking=true;
    peak = Math.max(peak, Math.abs(probe(g.userData.parts))); frames++;
  }
  ok(peak>0.25, name+' raises a readable guard (peak abs='+peak.toFixed(3)+' rad)');
  ok(sawBlocking, name+' flags ud.blocking while the guard is up');
  ok(g.userData.block===null, name+' clears the block when done');
  ok(g.userData.blocking===false, name+' clears ud.blocking when done');
  ok(restCheck(g.userData.parts), name+' guard channels snap back to exact rest');
}

run('brute (armL guard)', bruteBeast, p=>p.armL.rotation.z,
  p=>p.armL.rotation.x===0 && p.armL.rotation.z===0);
run('wolf (head recoil)', wolfBeast, p=>p.head.rotation.x,
  p=>p.head.rotation.x===0);
run('crawler (mandible flare)', crawlerBeast, p=>p.maw[0].m.rotation.y,
  p=>p.maw.every(md=>md.m.rotation.y===md.sign*0.4));
run('crab (pincer shield)', crabBeast, p=>p.claws[0].arm.rotation.x,
  p=>p.claws.every(c=>c.arm.rotation.x===0));

/* synthetic humanoid rig (armL + handL + head) exercises the full guard branch */
console.log('[humanoid (off-arm guard)]');
const h = new Obj();
h.userData.parts = { armL:new Obj(), handL:new Obj(), head:new Obj() };
blockReact(h);
let hPeakArm=0, hPeakHand=0, hPeakHead=0, alive=true, fr=0;
while(alive && fr<60){ alive=tickBlock(h,1/60);
  const p=h.userData.parts;
  hPeakArm=Math.max(hPeakArm,Math.abs(p.armL.rotation.x));
  hPeakHand=Math.max(hPeakHand,Math.abs(p.handL.rotation.x));
  hPeakHead=Math.max(hPeakHead,Math.abs(p.head.rotation.x)); fr++; }
ok(hPeakArm>0.9 && hPeakHand>0.3 && hPeakHead>0.1, 'humanoid drives off-arm + hand + chin-tuck (arm='+hPeakArm.toFixed(2)+' hand='+hPeakHand.toFixed(2)+' head='+hPeakHead.toFixed(2)+')');
const hp=h.userData.parts;
ok(hp.armL.rotation.x===0 && hp.armL.rotation.z===0 && hp.handL.rotation.x===0 && hp.head.rotation.x===0, 'humanoid guard snaps back to exact rest');

/* a corpse must not parry */
console.log('[corpse guard]');
const dead = wolfBeast(0x888888,1); dead.userData.death={t:0,dur:0.5};
blockReact(dead);
ok(!dead.userData.block, 'blockReact is a no-op while ud.death is set');

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
