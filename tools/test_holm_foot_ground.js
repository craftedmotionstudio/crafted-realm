/* test_holm_foot_ground.js -- the kit player's feet stand on the ground under THEM on a slope (owner review 9, 2026-09-30:
 * "the feet sink into the ground" by Wenna's camp fire). src/holm_foot_ground.js lifts the kit rig (never lowers it) by what the
 * lowest planted sole needs; flat ground and a foot in the air ask for nothing; the lift is capped and eased; the island
 * player calls it after the animation step and index.html loads it.
 * Run: node tools/test_holm_foot_ground.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m)}};
const src=fs.readFileSync(path.join(ROOT,'src','holm_foot_ground.js'),'utf8');
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
// a rig whose four foot bones sit at given world points (+ the rig's own y offset, as the real bones would)
function makeRig(pts,scale,baseY=0){
  const rig={scale:{x:scale},position:{y:baseY},bones:{}};
  for(const [n,p] of Object.entries(pts))rig.bones[n]={isBone:true,name:'mixamorig:'+n,getWorldPosition(v){return v.set(p[0],p[1]+rig.position.y-baseY,p[2])}};
  rig.traverse=f=>Object.values(rig.bones).forEach(f);
  return rig;
}
function load(ground,elev){
  let now=0;const box={THREE:{Vector3:V3},groundY:ground,performance:{now:()=>now},console};if(elev)box.pElev=elev;
  box.globalThis=box;vm.createContext(box);vm.runInContext(src+'\n;globalThis.__F=HolmFootGround;',box,{filename:'holm_foot_ground.js'});
  return {F:box.__F,tick:ms=>{now+=ms}};
}
const S=0.83;   // the kit's world scale (1.5 / 1.813)
// standing feet: ankle 12 cm and ball 3 cm above the floor (kit metres x S); left foot at x +.1, right at x -.1
const stand={LeftFoot:[.1,.12*S,0],LeftToeBase:[.1,.03*S,-.15],RightFoot:[-.1,.12*S,0],RightToeBase:[-.1,.03*S,-.15]};
const root={position:{y:0}};
{ // flat ground: no lift
  const {F,tick}=load(()=>0);const rig=makeRig(stand,S);F.update(root,rig,0);tick(16);F.update(root,rig,0);
  ok(F.status().lift===0&&rig.position.y===0,'flat ground: the rig is not lifted ('+F.status().lift+')');
}
{ // a slope rising to the left: the left (uphill) sole would be 6 cm inside the hill
  const {F,tick}=load((x)=>x>0?.06:0);const rig=makeRig(stand,S,.01);
  F.update(root,rig,.01);ok(Math.abs(F.status().target-.06)<1e-6,'slope: the target lift is what the uphill sole needs ('+F.status().target+')');
  ok(Math.abs(rig.position.y-(.01+.06))<1e-6,'the first frame stands the rig straight on it (baseY + lift)');
  for(let i=0;i<30;i++){tick(16);F.update(root,rig,.01)}
  ok(Math.abs(F.status().lift-.06)<1e-3,'the lift holds while the foot stays on the slope');
}
{ // the uphill foot in the air (a stride): it asks for nothing; the planted downhill foot stands on the lower ground
  const {F}=load((x)=>x>0?.06:0);
  const air=Object.assign({},stand,{LeftFoot:[.1,.12*S+.20,.1],LeftToeBase:[.1,.03*S+.18,-.05]});
  const rig=makeRig(air,S);F.update(root,rig,0);
  ok(F.status().target===0,'a foot swinging high over the slope needs no lift ('+F.status().target+')');
}
{ // never lowers: the ground falls away under both feet
  const {F}=load(()=>-.05);const rig=makeRig(stand,S,.02);F.update(root,rig,.02);
  ok(F.status().lift===0&&rig.position.y===.02,'ground below the feet: the rig is never lowered');
}
{ // capped: a cliff edge under one foot is not a slope
  const {F}=load((x)=>x>0?2.0:0);const rig=makeRig(stand,S);F.update(root,rig,0);
  ok(F.status().target<=.45*S+1e-9&&F.status().target>0,'the lift is capped ('+F.status().target+')');
}
{ // eased on the way down: stepping off the slope does not drop in one frame
  let g=.06;const {F,tick}=load((x)=>x>0?g:0);const rig=makeRig(stand,S);F.update(root,rig,0);
  g=0;tick(16);F.update(root,rig,0);const l=F.status().lift;
  ok(l>0&&l<.06,'stepping back onto flat ground eases the lift down ('+l.toFixed(4)+')');
  for(let i=0;i<60;i++){tick(16);F.update(root,rig,0)}
  ok(F.status().lift===0,'and settles to exactly 0');
}
{ // no groundY (a page without the world): nothing happens
  const {F}=load(undefined);const rig=makeRig(stand,S);rig.position.y=.3;F.update(root,rig,0);
  ok(rig.position.y===.3,'without groundY the rig is left alone');
}
{ // upstairs / in a cellar the player stands on its plane's floor (pElev): the feet use that floor, not the terrain outside
  const {F}=load(()=>3.0,()=>0);const rig=makeRig(stand,S);F.update(root,rig,0);
  ok(F.status().target===0,'on a floor the feet read the same floor as the player (pElev), not the ground outside');
}
// wiring
const isl=fs.readFileSync(path.join(ROOT,'src','holm_island_player.js'),'utf8');
ok(/HolmFootGround\.update\(player,st\.rig,st\.baseY\)/.test(isl),'HolmIslandPlayer.update grounds the feet after the animation step');
ok(/st\.baseY=rig\.position\.y/.test(isl),'the rig\'s resting offset is kept at install');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const ip=html.indexOf('src="src/holm_island_player.js'),fg=html.indexOf('src="src/holm_foot_ground.js');
ok(ip>0&&fg>ip,'index.html loads holm_foot_ground.js after holm_island_player.js');
ok(/src="src\/holm_foot_ground\.js\?v=h[0-9a-f]{8}"/.test(html),'holm_foot_ground.js is cache-busted');
console.log('test_holm_foot_ground: '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
