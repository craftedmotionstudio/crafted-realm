/* throwaway harness: stub THREE, build each beast, drive the LOCOMOTION (walk) tick, assert.
   Proves each archetype now walks with a DISTINCT gait (was one i%2 cadence for every beast):
   a wolf trots on diagonal leg pairs, a crawler/crab skitters a travelling leg wave, a brute
   lumbers slow on a two-beat with a vertical lurch + counter-swinging arms — and that every
   walk-only channel (torso lurch/roll, brute off-arm) eases back to rest when it stops. */
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
global.performance = { now:()=>0 };

const fs = require('fs'); const path = require('path');
eval(fs.readFileSync(path.join(__dirname,'..','src','proc_beasts.js'),'utf8'));   // beast builders + BEAST_BODIES

/* _deathStyle (classifier) copied verbatim from game2_world.js */
function _deathStyle(p){
  if(!p) return 'topple';
  if(p.claws) return 'crab';
  if(p.maw)   return 'crawler';
  if(p.jaw && p.legs) return 'wolf';
  if(p.armR && p.legs) return 'brute';
  if(p.legL || p.armL) return 'biped';
  return 'topple';
}
/* _gaitHome copied verbatim from game2_world.js */
function _gaitHome(p, ud){
  if(p.torso){
    if(ud._torsoBY!==undefined) p.torso.position.y += (ud._torsoBY - p.torso.position.y)*0.2;
    if(Math.abs(p.torso.rotation.z)>1e-4) p.torso.rotation.z *= 0.8; else p.torso.rotation.z=0;
  }
  if(p.armL && !ud.swinging && !ud.blocking) p.armL.rotation.x *= 0.85;
}
/* beastAnim's locomotion + idle gait branches, copied verbatim. tick* drivers are stubbed
   to no-ops (busy=false, inCombat handled by the flag) so we isolate the gait under test. */
function beastAnim(g, moving, dt){
  const busy=false;                            // no swing/lunge in flight for this test
  const p=g.userData.parts; if(!p||!p.legs) return;
  const ud=g.userData;
  if(ud.idleT===undefined) ud.idleT = ud.walkT || 0;
  ud.idleT += dt;
  if(moving){
    if(ud._gaitStyle===undefined) ud._gaitStyle = _deathStyle(p);
    const gs=ud._gaitStyle, n=p.legs.length;
    const cad = gs==='brute'?6.0 : gs==='crawler'?14.0 : gs==='crab'?13.0 : 10.5;
    const amp = gs==='brute'?0.72 : gs==='crab'?0.30 : gs==='crawler'?0.34 : 0.55;
    ud.walkT += dt*cad;
    const t=ud.walkT;
    p.legs.forEach((l,i)=>{
      let ph;
      if(gs==='brute')        ph = (i%2)?0:Math.PI;
      else if(gs==='crawler'||gs==='crab') ph = -i*(Math.PI/Math.max(1,n/2));
      else                    ph = (i===0||i===3)?0:Math.PI;
      l.rotation.z = Math.sin(t+ph)*amp;
    });
    if(!busy){
      if(p.torso){
        if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
        if(ud._torsoBY===undefined) ud._torsoBY = p.torso.position.y;
        p.torso.scale.y = ud._torsoSY;
        if(gs==='brute'){
          p.torso.position.y = ud._torsoBY + Math.abs(Math.sin(t))*0.06;
          p.torso.rotation.z = Math.sin(t)*0.05;
        } else if(gs==='crab'){
          p.torso.rotation.z = Math.sin(t)*0.10;
          p.torso.position.y = ud._torsoBY + Math.abs(Math.sin(t*2))*0.02;
        } else if(gs==='crawler'){
          p.torso.position.y = ud._torsoBY;
        } else {
          p.torso.position.y = ud._torsoBY + Math.sin(t*2)*0.02;
        }
      }
      if(gs==='brute'){
        if(p.armR && !ud.swinging) p.armR.rotation.x = Math.sin(t+Math.PI)*0.35;
        if(p.armL && !ud.swinging && !ud.blocking) p.armL.rotation.x = Math.sin(t)*0.35;
      } else if(gs==='wolf' && p.head){
        p.head.rotation.z = Math.sin(t*2)*0.05;
      }
    }
  } else {
    p.legs.forEach(l=>l.rotation.z*=0.8);
    if(p.armR && !ud.swinging) p.armR.rotation.x*=0.85;
    _gaitHome(p, ud);
  }
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };
const sgn=x=>x>1e-6?1:x<-1e-6?-1:0;
function walk(g, frames){ for(let i=0;i<frames;i++) beastAnim(g, true, 1/60); }
function rest(g, frames){ for(let i=0;i<frames;i++) beastAnim(g, false, 1/60); }

// ---- classification ----
console.log('[classification]');
ok(_deathStyle(wolfBeast(0,1).userData.parts)==='wolf', 'wolf rig -> wolf gait');
ok(_deathStyle(crawlerBeast(0,1).userData.parts)==='crawler', 'crawler rig -> crawler gait');
ok(_deathStyle(crabBeast(0,1).userData.parts)==='crab', 'crab rig -> crab gait');
ok(_deathStyle(bruteBeast(0,1).userData.parts)==='brute', 'brute rig -> brute gait');

// ---- wolf: diagonal trot (legs 0&3 in phase, 1&2 in opposite phase) ----
console.log('[wolf trot]');
{ const g=wolfBeast(0,1); g.userData.walkT=0.3; walk(g,1); const L=g.userData.parts.legs.map(l=>l.rotation.z);
  ok(sgn(L[0])!==0 && sgn(L[0])===sgn(L[3]), 'diagonal pair legs[0]&legs[3] move together ('+L[0].toFixed(2)+','+L[3].toFixed(2)+')');
  ok(sgn(L[0])===-sgn(L[1]) && sgn(L[1])===sgn(L[2]), 'opposite pair legs[1]&legs[2] anti-phase to 0/3');
  ok(Math.abs(g.userData.parts.head.rotation.z)>1e-4, 'muzzle bobs on the trot'); }

// ---- brute: two-beat plod + vertical lurch + counter-swinging arms ----
console.log('[brute lumber]');
{ const g=bruteBeast(0,1); g.userData.walkT=0.4; walk(g,1); const p=g.userData.parts; const L=p.legs.map(l=>l.rotation.z);
  ok(sgn(L[0])===-sgn(L[1]), 'two-beat: adjacent legs anti-phase');
  ok(p.torso.position.y >= g.userData._torsoBY, 'torso lurches up off its base ('+(p.torso.position.y-g.userData._torsoBY).toFixed(3)+')');
  ok(Math.abs(p.torso.rotation.z)>1e-4, 'shoulders roll (torso.rotation.z='+p.torso.rotation.z.toFixed(3)+')');
  ok(sgn(p.armR.rotation.x)===-sgn(p.armL.rotation.x) && sgn(p.armR.rotation.x)!==0, 'arms counter-swing the stride'); }

// ---- crawler: travelling leg wave (legs do NOT collapse to just two phase values) ----
console.log('[crawler/crab skitter]');
{ const g=crawlerBeast(0,1); g.userData.walkT=0.5; walk(g,1); const L=g.userData.parts.legs.map(l=>+l.rotation.z.toFixed(3));
  const uniq=new Set(L.map(v=>v.toFixed(2)));
  ok(g.userData.parts.legs.length===6, 'crawler has 6 legs');
  ok(uniq.size>2, 'wave gait spreads legs across >2 phase values (got '+uniq.size+': '+[...uniq].join(',')+')'); }
{ const g=crabBeast(0,1); g.userData.walkT=0.5; walk(g,1); const p=g.userData.parts;
  ok(Math.abs(p.torso.rotation.z)>1e-4, 'crab shell side-rocks while scuttling (z='+p.torso.rotation.z.toFixed(3)+')'); }

// ---- distinct cadence: brute accrues less walkT/sec than a skittering crawler ----
console.log('[cadence]');
{ const b=bruteBeast(0,1); b.userData.walkT=0; walk(b,60);
  const c=crawlerBeast(0,1); c.userData.walkT=0; walk(c,60);
  ok(b.userData.walkT < c.userData.walkT, 'brute cadence slower than crawler ('+b.userData.walkT.toFixed(1)+' < '+c.userData.walkT.toFixed(1)+')'); }

// ---- reset: stop walking, walk-only channels ease home ----
console.log('[ease home on stop]');
{ const g=bruteBeast(0,1); g.userData.walkT=0.4; walk(g,5); rest(g,60); const p=g.userData.parts;
  ok(Math.abs(p.torso.position.y-g.userData._torsoBY)<1e-3, 'brute torso lurch returns to base');
  ok(Math.abs(p.torso.rotation.z)<1e-3, 'shoulder roll returns to 0');
  ok(Math.abs(p.armL.rotation.x)<1e-2, 'off-arm counter-swing eases to rest'); }

// ---- distinctness: the four archetypes do not share one cadence+amplitude ----
console.log('[distinctness]');
{ const sigs=new Set();
  for(const [nm,b] of [['wolf',wolfBeast],['crawler',crawlerBeast],['crab',crabBeast],['brute',bruteBeast]]){
    const g=b(0,1); g.userData.walkT=0; walk(g,1);
    const cad=g.userData.walkT.toFixed(3); const amp=Math.max(...g.userData.parts.legs.map(l=>Math.abs(l.rotation.z))).toFixed(2);
    sigs.add(cad+'/'+amp); }
  ok(sigs.size===4, 'four archetypes -> four distinct gait signatures ('+sigs.size+')'); }

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
