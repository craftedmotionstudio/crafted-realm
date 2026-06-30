/* throwaway harness: stub THREE, build each beast, drive the attack tick, assert.
   Proves parts attach + the lunge math peaks then resets. Not committed. */
function V(){ this.x=0;this.y=0;this.z=0; }
V.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this;};
function Obj(){ this.position=new V(); this.rotation=new V(); this.scale=new V(); this.scale.set(1,1,1);
  this.children=[]; this.userData={}; this.isMesh=false; }
Obj.prototype.add=function(c){ this.children.push(c); return this; };
Obj.prototype.traverse=function(fn){ fn(this); this.children.forEach(c=>c.traverse?c.traverse(fn):fn(c)); };
const THREE = {
  Group:function(){ const o=new Obj(); return o; },
  Mesh:function(){ const o=new Obj(); o.isMesh=true; return o; },
  BoxGeometry:function(){ return {attributes:{position:{count:0}}}; },
  ConeGeometry:function(){return{};}, CylinderGeometry:function(){return{};}, SphereGeometry:function(){return{};},
  TorusGeometry:function(){return{};},
  MeshBasicMaterial:function(){return{};}, MeshLambertMaterial:function(){return{};},
};
global.THREE = THREE;
global.mat = ()=>({}); global.shade = (c)=>c;

// load the real builders
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'..','src','proc_beasts.js'),'utf8');
eval(src);   // defines wolfBeast/crawlerBeast/crabBeast/bruteBeast + BEAST_BODIES in this scope

// real tickBeastSwing logic, copied verbatim from game2_world.js
function tickBeastSwing(g, dt){
  const ud=g.userData, bs=ud&&ud.beastSwing, p=ud&&ud.parts;
  if(!bs||!p) return false;
  bs.t += dt;
  const f = Math.min(1, bs.t/bs.dur);
  const snap = f<0.30 ? -(f/0.30)*0.25
             : f<0.50 ? -0.25 + (f-0.30)/0.20*1.25
             : 1.0*(1-(f-0.50)/0.50);
  const strike = Math.max(0, snap), wind = Math.max(0, -snap);
  if(p.head){ p.head.rotation.z = -0.55*strike + 0.18*wind; }
  if(p.jaw){ p.jaw.rotation.z = -0.5*strike; }
  if(p.maw){ for(const md of p.maw) md.m.rotation.y = md.sign*0.4*(1-1.6*strike); }
  if(p.claws){ for(const c of p.claws){
    c.arm.rotation.z = -0.5*strike + 0.1*wind;
    const clamp=0.32*strike; c.claw1.rotation.z = 0.35-clamp; c.claw2.rotation.z = -0.35+clamp;
  }}
  if(f>=1){ ud.beastSwing=null;
    if(p.head) p.head.rotation.z=0;
    if(p.jaw) p.jaw.rotation.z=0;
    if(p.maw) for(const md of p.maw) md.m.rotation.y=md.sign*0.4;
    if(p.claws) for(const c of p.claws){ c.arm.rotation.z=0; c.claw1.rotation.z=0.35; c.claw2.rotation.z=-0.35; }
    return false; }
  return true;
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };

function run(name, builder, partCheck, peakCheck){
  console.log('['+name+']');
  const g = builder(0x888888, 1);
  const p = g.userData.parts;
  partCheck(p);
  // arm the attack like swing() does, then drive ~0.42s in 60fps steps
  g.userData.beastSwing = {t:0, dur:0.42};
  let peakVals=[]; let alive=true; let frames=0;
  while(alive && frames<60){ alive = tickBeastSwing(g, 1/60);
    peakVals.push(peakCheck(p)); frames++; }
  const peak = Math.max(...peakVals.map(Math.abs));
  ok(peak>0.15, name+' drives a visible strike (peak abs='+peak.toFixed(3)+')');
  ok(g.userData.beastSwing===null, name+' clears its state when done');
}

run('wolf', wolfBeast,
  p=>{ ok(p.head&&p.jaw, 'wolf has parts.head + parts.jaw'); },
  p=>p.head.rotation.z);
run('crawler', crawlerBeast,
  p=>{ ok(Array.isArray(p.maw)&&p.maw.length===2, 'crawler has 2 mandibles in parts.maw'); },
  p=>p.maw[0].m.rotation.y - p.maw[0].sign*0.4);   // deviation from rest = scissor amount
run('crab', crabBeast,
  p=>{ ok(Array.isArray(p.claws)&&p.claws.length===2, 'crab has 2 pincers in parts.claws'); },
  p=>p.claws[0].arm.rotation.z);

// rest-state check: after completion, wolf head/jaw back to 0
const w = wolfBeast(0x888888,1); w.userData.beastSwing={t:0,dur:0.42};
for(let i=0;i<40;i++) tickBeastSwing(w,1/60);
ok(w.userData.parts.head.rotation.z===0 && w.userData.parts.jaw.rotation.z===0, 'wolf returns exactly to rest pose');

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
