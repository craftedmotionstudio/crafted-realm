/* throwaway harness: prove the five per-weapon attack swings are genuinely DISTINCT
   motions (not one swing reskinned) — the variety the Animation Showcase puts on screen.
   Stubs THREE, builds a minimal humanoid rig, and drives the REAL tickSwing math
   (copied verbatim from src/game2_world.js) for slash/stab/crush/bow/cast, then asserts
   each style writes a different channel signature. Not committed to gameplay. */
function V(){ this.x=0;this.y=0;this.z=0; }
V.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this;};
function Obj(){ this.position=new V(); this.rotation=new V(); this.scale=new V(); this.scale.set(1,1,1);
  this.children=[]; this.userData={}; }
Obj.prototype.add=function(c){ this.children.push(c); return this; };
const THREE = { Group:function(){ return new Obj(); } };

function rig(){
  const g=new THREE.Group();
  const parts={};
  for(const k of ['legL','legR','armL','armR','handR','torso','head']){ parts[k]=new THREE.Group(); g.add(parts[k]); }
  g.userData.parts=parts;
  return g;
}

/* ---- tickSwing: copied VERBATIM from src/game2_world.js (keep in sync) ---- */
function tickSwing(g, dt){
  const s=g.userData.swing; if(!s) return false;
  const p=g.userData.parts; if(!p||!p.armR){ g.userData.swing=null; return false; }
  s.t += dt;
  const f = Math.min(1, s.t/s.dur);
  const ease = x => 1-Math.pow(1-x,3);
  const type = s.type||'slash';
  let armX=0, armZ=0, wrist=0, twist=0, lean=0, armLX=null;
  if(type==='stab'){
    if(f<0.30){ const k=f/0.30;            armX=-0.9*k;          wrist=-0.5*k;        lean=-0.10*k; }
    else if(f<0.52){ const e=ease((f-0.30)/0.22); armX=-0.9-0.7*e; wrist=-0.5+0.9*e;  lean=-0.10+0.45*e; }
    else { const k=(f-0.52)/0.48;          armX=-1.6*(1-k);      wrist=0.4*(1-k);     lean=0.35*(1-k); }
  } else if(type==='crush'){
    if(f<0.40){ const e=ease(f/0.40);             armX=-3.2*e;                        lean=-0.12*e; }
    else if(f<0.58){ const e=ease((f-0.40)/0.18); armX=-3.2+3.7*e; wrist=0.5*e;       lean=-0.12+0.42*e; }
    else { const k=(f-0.58)/0.42;          armX=0.5*(1-k);       wrist=0.5*(1-k);     lean=0.30*(1-k); }
  } else if(type==='bow'){
    armX=-1.45; twist=-0.12;
    if(f<0.45){ const e=ease(f/0.45);             armLX=-1.0-1.3*e; }
    else if(f<0.55){                               armLX=-2.3; }
    else { const e=ease((f-0.55)/0.45);           armLX=-2.3+1.3*e; }
  } else if(type==='cast'){
    if(f<0.35){ const e=ease(f/0.35);             armX=-1.7*e;     wrist=-0.3*e;      lean=0.05*e; }
    else if(f<0.55){ const e=ease((f-0.35)/0.20); armX=-1.7+0.5*e; wrist=-0.3+0.8*e;  lean=0.05+0.08*e; }
    else { const k=(f-0.55)/0.45;          armX=-1.2*(1-k);      wrist=0.5*(1-k);     lean=0.13*(1-k); }
  } else {
    if(f<0.35){ const k=f/0.35;            armX=-2.9*k; armZ=-0.4*k;        wrist=0.6*k;     twist=-0.3*k; }
    else if(f<0.6){ const k=(f-0.35)/0.25; armX=-2.9+2.5*k; armZ=-0.4+0.75*k; wrist=0.6-1.4*k; twist=-0.3+0.55*k; }
    else { const k=(f-0.6)/0.4;            armX=-0.4*(1-k); armZ=0.35*(1-k);  wrist=-0.8*(1-k); twist=0.25*(1-k); }
  }
  p.armR.rotation.x=armX; p.armR.rotation.z=armZ;
  if(p.handR) p.handR.rotation.x=wrist;
  if(p.torso){ p.torso.rotation.y=twist; p.torso.rotation.x=lean; }
  if(armLX!==null && p.armL) p.armL.rotation.x=armLX;
  if(f>=1){ g.userData.swing=null; g.userData.swinging=false;
    p.armR.rotation.set(0,0,0); if(p.handR) p.handR.rotation.x=0;
    if(p.torso){ p.torso.rotation.y=0; p.torso.rotation.x=0; }
    if(p.armL) p.armL.rotation.x=0; }
  return true;
}

/* drive one full swing and capture the peak |value| of every channel */
function profile(type){
  const g=rig(); const p=g.userData.parts;
  const DUR={slash:0.45, stab:0.40, crush:0.52, bow:0.55, cast:0.50};
  g.userData.swing={t:0, dur:DUR[type], type}; g.userData.swinging=true;
  const peak={armX:0,armZ:0,wrist:0,twist:0,lean:0,armL:0};
  let alive=true, frames=0;
  while(alive && frames<80){
    alive=tickSwing(g,1/60);
    peak.armX =Math.max(peak.armX, Math.abs(p.armR.rotation.x));
    peak.armZ =Math.max(peak.armZ, Math.abs(p.armR.rotation.z));
    peak.wrist=Math.max(peak.wrist,Math.abs(p.handR.rotation.x));
    peak.twist=Math.max(peak.twist,Math.abs(p.torso.rotation.y));
    peak.lean =Math.max(peak.lean, Math.abs(p.torso.rotation.x));
    peak.armL =Math.max(peak.armL, Math.abs(p.armL.rotation.x));
    frames++;
  }
  // rest check: every channel back to exact 0
  const rest = p.armR.rotation.x===0 && p.armR.rotation.z===0 && p.handR.rotation.x===0 &&
               p.torso.rotation.x===0 && p.torso.rotation.y===0 && p.armL.rotation.x===0;
  return {peak, rest, cleared: g.userData.swing===null};
}

let fails=0; const ok=(c,m)=>{ console.log((c?'  PASS':'  FAIL')+' '+m); if(!c)fails++; };

const styles=['slash','stab','crush','bow','cast'];
const P={};
console.log('[per-weapon swing signatures]');
for(const s of styles){
  P[s]=profile(s);
  console.log('  '+s.padEnd(6)+' armX='+P[s].peak.armX.toFixed(2)+' armZ='+P[s].peak.armZ.toFixed(2)+
    ' twistY='+P[s].peak.twist.toFixed(2)+' leanX='+P[s].peak.lean.toFixed(2)+' offArm='+P[s].peak.armL.toFixed(2));
  ok(P[s].cleared && P[s].rest, s+' clears its state and returns every channel to exact rest');
}

console.log('[distinctness]');
// crush is the biggest overhead arm lift
ok(P.crush.peak.armX > P.slash.peak.armX && P.crush.peak.armX > P.stab.peak.armX &&
   P.crush.peak.armX > P.cast.peak.armX, 'crush has the largest arm lift (overhead slam)');
// only the bow draws the OFF arm; melee/cast never touch it
ok(P.bow.peak.armL > 1.5, 'bow draws the off-arm (string pull)');
ok(P.slash.peak.armL<1e-6 && P.stab.peak.armL<1e-6 && P.crush.peak.armL<1e-6 && P.cast.peak.armL<1e-6,
   'slash/stab/crush/cast never move the off-arm');
// only slash rolls the shoulder (armZ) for a diagonal cut
ok(P.slash.peak.armZ > 0.3, 'slash rolls the shoulder for a diagonal cut (armZ)');
ok(P.stab.peak.armZ<1e-6 && P.crush.peak.armZ<1e-6 && P.bow.peak.armZ<1e-6 && P.cast.peak.armZ<1e-6,
   'stab/crush/bow/cast keep the shoulder square (no armZ)');
// slash & bow twist the torso; stab/crush/cast lean instead — distinct upper-body work
ok(P.slash.peak.twist>0.1 && P.bow.peak.twist>0.1, 'slash/bow twist the torso');
ok(P.stab.peak.lean>0.1 && P.crush.peak.lean>0.1 && P.cast.peak.lean>0.05, 'stab/crush/cast lean into the strike');

// every pair of signatures differs (no two weapons share a motion)
function sig(s){ const p=P[s].peak; return [p.armX,p.armZ,p.twist,p.lean,p.armL]; }
let allDistinct=true;
for(let i=0;i<styles.length;i++) for(let j=i+1;j<styles.length;j++){
  const a=sig(styles[i]), b=sig(styles[j]);
  const d=Math.max(...a.map((v,k)=>Math.abs(v-b[k])));
  if(d<0.2){ allDistinct=false; console.log('  too similar: '+styles[i]+' vs '+styles[j]+' (max ch diff '+d.toFixed(3)+')'); }
}
ok(allDistinct, 'all five swing styles have pairwise-distinct channel signatures');

console.log(fails? ('\nFAILED ('+fails+')') : '\nALL PASS');
process.exit(fails?1:0);
