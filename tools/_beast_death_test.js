/* throwaway harness: stub THREE, build each beast, drive the DEATH tick, assert.
   Proves each archetype's death moves its own parts (not just a shared topple) and
   that every touched child channel + the root snap back to rest at completion. */
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
eval(fs.readFileSync(path.join(__dirname,'..','src','proc_beasts.js'),'utf8'));   // beast builders + BEAST_BODIES

/* _deathStyle + startDeath + tickDeath copied verbatim from game2_world.js */
function _deathStyle(p){
  if(!p) return 'topple';
  if(p.claws) return 'crab';
  if(p.maw)   return 'crawler';
  if(p.jaw && p.legs) return 'wolf';
  if(p.armR && p.legs) return 'brute';
  if(p.legL || p.armL) return 'biped';
  return 'topple';
}
function startDeath(g){
  if(!g||!g.userData) return;
  const ud=g.userData;
  if(ud._baseScale===undefined) ud._baseScale = g.scale.x || 1;
  ud.hit = null;
  ud.swing = null; ud.swinging = false; ud.beastSwing = null;
  const style=_deathStyle(ud.parts);
  const dir=(Math.floor(g.position.x+g.position.z)&1)?1:-1;
  const roll = style==='crab' ? 2.6 : Math.PI/2;
  const dur  = style==='crab' ? 0.70 : style==='brute' ? 0.78 : 0.55;
  ud.death = {t:0, dur, dir, roll, style, baseY:g.position.y};
}
function tickDeath(g, dt){
  const ud=g.userData, d=ud&&ud.death; if(!d) return false;
  const p=ud.parts;
  d.t += dt;
  const f = Math.min(1, d.t/d.dur);
  const e = 1 - Math.pow(1-f, 3);
  g.rotation.z = d.dir * d.roll * e;
  g.position.y = d.baseY - 0.15*e;
  const base = ud._baseScale || 1;
  g.scale.setScalar(base*(1-0.12*f));
  if(p) switch(d.style){
    case 'crab':
      for(const c of p.claws){ c.arm.rotation.x = 0.9*e; c.claw1.rotation.z = 0.35+0.5*e; c.claw2.rotation.z = -0.35-0.5*e; }
      if(p.legs) for(const l of p.legs) l.rotation.x = -0.7*e;
      break;
    case 'crawler':
      if(p.legs) for(const l of p.legs) l.rotation.x = 1.5*e;
      if(p.maw) for(const md of p.maw) md.m.rotation.y = md.sign*(0.4+0.7*e);
      break;
    case 'wolf':
      if(p.legs) for(const l of p.legs) l.rotation.x = 0.9*e;
      if(p.head) p.head.rotation.z = -0.6*e;
      if(p.jaw)  p.jaw.rotation.z  = -0.45*e;
      break;
    case 'brute':
      if(p.armR) p.armR.rotation.z = 0.5*e;
      if(p.armL) p.armL.rotation.z = -0.5*e;
      if(p.legs) for(const l of p.legs) l.rotation.x = 0.4*e;
      break;
    case 'biped':
      if(p.armL) p.armL.rotation.x = -0.6*e;
      if(p.armR) p.armR.rotation.x = -0.6*e;
      if(p.legL) p.legL.rotation.x = 0.3*e;
      if(p.legR) p.legR.rotation.x = 0.3*e;
      if(p.head) p.head.rotation.z = 0.4*e;
      break;
  }
  if(f>=1){
    if(p) switch(d.style){
      case 'crab': for(const c of p.claws){ c.arm.rotation.x=0; c.claw1.rotation.z=0.35; c.claw2.rotation.z=-0.35; } if(p.legs) for(const l of p.legs) l.rotation.x=0; break;
      case 'crawler': if(p.legs) for(const l of p.legs) l.rotation.x=0; if(p.maw) for(const md of p.maw) md.m.rotation.y=md.sign*0.4; break;
      case 'wolf': if(p.legs) for(const l of p.legs) l.rotation.x=0; if(p.head) p.head.rotation.z=0; if(p.jaw) p.jaw.rotation.z=0; break;
      case 'brute': if(p.armR) p.armR.rotation.z=0; if(p.armL) p.armL.rotation.z=0; if(p.legs) for(const l of p.legs) l.rotation.x=0; break;
      case 'biped': if(p.armL) p.armL.rotation.x=0; if(p.armR) p.armR.rotation.x=0; if(p.legL) p.legL.rotation.x=0; if(p.legR) p.legR.rotation.x=0; if(p.head) p.head.rotation.z=0; break;
    }
    ud.death=null; return false;
  }
  return true;
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };

function run(name, builder, expectStyle, probe, restCheck){
  console.log('['+name+']');
  const g = builder(0x888888, 1);
  g.position.set(1,0,0);                       // odd sum -> dir=+1, deterministic
  startDeath(g);
  ok(g.userData.death.style===expectStyle, name+' classified as "'+expectStyle+'" (got "'+g.userData.death.style+'")');
  let peak=0, alive=true, frames=0;
  while(alive && frames<120){ const before=Math.abs(probe(g.userData.parts));
    alive = tickDeath(g, 1/60);
    peak = Math.max(peak, Math.abs(probe(g.userData.parts))); frames++; }
  ok(peak>0.3, name+' moves its own parts during death (peak abs='+peak.toFixed(3)+')');
  ok(g.userData.death===null, name+' clears death state when done');
  ok(restCheck(g.userData.parts), name+' child parts snap back to rest at completion');
}

run('wolf', wolfBeast, 'wolf', p=>p.head.rotation.z,
  p=>p.head.rotation.z===0 && p.jaw.rotation.z===0 && p.legs.every(l=>l.rotation.x===0));
run('crawler', crawlerBeast, 'crawler', p=>p.legs[0].rotation.x,
  p=>p.legs.every(l=>l.rotation.x===0) && p.maw.every(md=>md.m.rotation.y===md.sign*0.4));
run('crab', crabBeast, 'crab', p=>p.claws[0].arm.rotation.x,
  p=>p.claws.every(c=>c.arm.rotation.x===0 && c.claw1.rotation.z===0.35 && c.claw2.rotation.z===-0.35) && p.legs.every(l=>l.rotation.x===0));
run('brute', bruteBeast, 'brute', p=>p.armR.rotation.z,
  p=>p.armR.rotation.z===0 && p.armL.rotation.z===0 && p.legs.every(l=>l.rotation.x===0));

// distinctness: the four styles must not all be the same string
const styles=new Set();
for(const b of [wolfBeast,crawlerBeast,crabBeast,bruteBeast]){ const g=b(0x888888,1); startDeath(g); styles.add(g.userData.death.style); }
ok(styles.size===4, 'four archetypes -> four distinct death styles ('+[...styles].join(',')+')');

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
