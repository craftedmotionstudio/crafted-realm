/* test_holm_gait_options.js -- headless gate for the review-5 walk / run / idle options (owner 2026-09-28):
 *  1. the companion GLB (assets/models/holm_kit_v2_gaits.glb) carries exactly the option clips walk_A..F, run_A..F (round 1
 *     A-C, round 2 D-F), idle_A..C on the kit's 23 bones (same names as the kit), the kit's cycle lengths, and no meshes;
 *  2. every option clip animates the same channels as the kit's own walk / run / idle (a drop-in swap);
 *  3. the kit GLB is untouched: its own idle / walk / run are still the shipped default (no option clips inside);
 *  4. HolmGaitOptions: ?gait parsing (walkA,runB,idleC / one letter / cur / panel), nothing loads without ?gait, and the
 *     swap on a kit gmix (weight / time / time scale carried over, the shipped action restored for "cur", run marked on);
 *  5. index.html loads src/holm_gait_options.js after holm_island_player.js, and the island player drives it;
 *  6. round 2 mesh options: holm_kit_v2_mesh_b / _c.glb carry the kit's parts, bones and clips (drop-in kits), ?kitmesh=b / c
 *     points the player at them, ?kitmesh=a draws the player's own kit flat-shaded, and nothing changes without ?kitmesh.
 * Run: node tools/test_holm_gait_options.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m)}};
function glbJson(p){const d=fs.readFileSync(p);const n=d.readUInt32LE(12);return JSON.parse(d.slice(20,20+n).toString('utf8'))}
function clipLen(j,a){let mx=0;for(const s of a.samplers){const acc=j.accessors[s.input];if(acc.max)mx=Math.max(mx,acc.max[0])}return mx}
function channels(j,a){return a.channels.map(c=>j.nodes[c.target.node].name+'.'+c.target.path).sort().join('|')}

/* ---- 1-3: the GLBs ---- */
const GP=path.join(ROOT,'assets','models','holm_kit_v2_gaits.glb'),KP=path.join(ROOT,'assets','models','holm_kit_v2.glb');
ok(fs.existsSync(GP),'the companion GLB exists');
const g=glbJson(GP),k=glbJson(KP);
const want=['idle_A','idle_B','idle_C','run_A','run_B','run_C','run_D','run_E','run_F','walk_A','walk_B','walk_C','walk_D','walk_E','walk_F'];
ok(JSON.stringify(g.animations.map(a=>a.name).sort())===JSON.stringify(want),'option clips = '+want.join(',')+' (got '+g.animations.map(a=>a.name).sort().join(',')+')');
ok(!g.meshes||!g.meshes.length,'the companion GLB carries no meshes');
const kitBones=k.skins[0].joints.map(i=>k.nodes[i].name).sort();
const gBones=g.nodes.map(n=>n.name).filter(n=>/^mixamorig:/.test(n)).sort();
ok(kitBones.length===23&&JSON.stringify(gBones)===JSON.stringify(kitBones),'the companion rig has the kit\'s 23 bones');
const kitClip=n=>k.animations.find(a=>a.name===n);
for(const a of g.animations){
  const kind=a.name.split('_')[0],ref=kitClip(kind);
  ok(!!ref,'kit has '+kind);if(!ref)continue;
  ok(Math.abs(clipLen(g,a)-clipLen(k,ref))<0.02,a.name+' lasts '+clipLen(g,a).toFixed(3)+' s like the kit '+kind+' ('+clipLen(k,ref).toFixed(3)+')');
  ok(channels(g,a)===channels(k,ref),a.name+' animates the same bone channels as the kit '+kind);
}
ok(!k.animations.some(a=>/^(walk|run|idle)_[A-Z]$/.test(a.name)),'the kit GLB has no option clips (the shipped idle / walk / run stay the default)');
for(const n of ['idle','walk','run'])ok(!!kitClip(n),'the kit still has its own '+n);

/* ---- 4: the runtime module ---- */
const src=fs.readFileSync(path.join(ROOT,'src','holm_gait_options.js'),'utf8');
function load(search){
  let loads=0;const gltfClips={};want.forEach(n=>gltfClips[n]={name:n,duration:n[0]==='w'?0.933:n[0]==='r'?0.667:2});
  const THREE={LoopRepeat:2201,GLTFLoader:function(){this.load=function(url,okf){loads++;okf({animations:Object.values(gltfClips)})}}};
  const box={THREE,console,URLSearchParams,location:{search,pathname:'/',hash:''},history:{replaceState(){}},document:undefined,player:null};
  box.globalThis=box;vm.createContext(box);vm.runInContext(src+'\n;globalThis.__G=HolmGaitOptions;',box,{filename:'holm_gait_options.js'});
  return {G:box.__G,box,loads:()=>loads};
}
let t=load('');
ok(!t.G.active(),'no ?gait: inactive');t.G.update();ok(t.loads()===0,'no ?gait: the companion GLB is never loaded');
t=load('?gait=walkA,runB,idleC');const P=t.G.parse;
ok(t.G.active(),'?gait=walkA,runB,idleC: active');
const s=x=>JSON.stringify(P(x));
ok(s('walkA,runB,idleC')===JSON.stringify({walk:'A',run:'B',idle:'C',panel:false}),'parse walkA,runB,idleC');
ok(s('B')===JSON.stringify({walk:'B',run:'B',idle:'B',panel:false}),'parse one letter = all three');
ok(s('walk=c run:a idlecur,panel')===JSON.stringify({walk:'C',run:'A',idle:null,panel:true}),'parse walk=c run:a idlecur,panel');
ok(s('walkcurrent')===JSON.stringify({walk:null,run:null,idle:null,panel:false}),'walkcurrent = the shipped clip');
// a fake kit gmix: actions with the fields playerGLBAnim / the swap use
function act(name,dur){return {clip:{name,duration:dur},weight:0,timeScale:1,time:0,running:false,getClip(){return this.clip},getEffectiveWeight(){return this.weight},
  reset(){this.time=0;return this},setLoop(){return this},play(){this.running=true;return this},stop(){this.running=false;this.weight=0;return this}}}
const own={idle:act('idle',2),walk:act('walk',.933),run:act('run',.667)};own.walk.weight=.8;own.walk.time=.4665;own.walk.timeScale=1.1;own.idle.weight=.2;
const made={};const mixer={clipAction(c){return made[c.name]||(made[c.name]=act(c.name,c.duration))}};
const root={userData:{gmix:{kit:true,mixer,idle:own.idle,walk:own.walk,run:own.run}}};
t.box.player=root;t.G.update();t.G.update();
const gm=root.userData.gmix;
ok(gm.walk.getClip().name==='walk_A'&&gm.run.getClip().name==='run_B'&&gm.idle.getClip().name==='idle_C','the player plays walk_A / run_B / idle_C');
ok(Math.abs(gm.walk.weight-.8)<1e-9&&Math.abs(gm.walk.timeScale-1.1)<1e-9&&Math.abs(gm.walk.time-.4665)<1e-3,'weight, time scale and cycle phase carry over');
ok(!own.walk.running&&gm.walk.running,'the shipped walk stops, the option plays');
ok(gm.run._on===true,'the run option is marked started (playerGLBAnim does not restart it)');
const st=t.G.status();ok(st.playing&&st.playing.walk==='walk_A'&&st.loaded,'status() reports the playing clips');
t.G.set({walk:null});
ok(gm.walk===own.walk&&gm.walk.running,'walkcur restores the shipped walk action');
ok(gm.run.getClip().name==='run_B','the other choices stay');

/* ---- 5: wiring ---- */
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const ip=html.indexOf('src="src/holm_island_player.js'),go=html.indexOf('src="src/holm_gait_options.js');
ok(ip>0&&go>ip,'index.html loads holm_gait_options.js after holm_island_player.js');
ok(/src="src\/holm_gait_options\.js\?v=h[0-9a-f]{8}"/.test(html),'holm_gait_options.js is cache-busted');
const isl=fs.readFileSync(path.join(ROOT,'src','holm_island_player.js'),'utf8');
ok(/HolmGaitOptions\.active\(\)\)HolmGaitOptions\.update\(\)/.test(isl),'HolmIslandPlayer.update drives HolmGaitOptions');

/* ---- 6: mesh options ---- */
const kitNames=new Set(k.nodes.map(n=>n.name).filter(n=>/^Kit_/.test(n)));
for(const m of ['b','c']){const P=path.join(ROOT,'assets','models','holm_kit_v2_mesh_'+m+'.glb');ok(fs.existsSync(P),'mesh '+m+' kit exists');if(!fs.existsSync(P))continue;
  const j=glbJson(P),names=new Set(j.nodes.map(n=>n.name).filter(n=>/^Kit_/.test(n)));
  ok(names.size===kitNames.size&&[...kitNames].every(n=>names.has(n)),'mesh '+m+' has every kit part ('+names.size+' / '+kitNames.size+')');
  ok(JSON.stringify(j.skins[0].joints.map(i=>j.nodes[i].name).sort())===JSON.stringify(kitBones),'mesh '+m+' has the kit bones');
  ok(JSON.stringify(j.animations.map(a=>a.name).sort())===JSON.stringify(k.animations.map(a=>a.name).sort()),'mesh '+m+' has the kit clips')}
t=load('?kitmesh=b');ok(/holm_kit_v2_mesh_b\.glb\?v=[0-9a-f]{8}$/.test(t.G.kitUrl('assets/models/holm_kit_v2.glb?v=15')),'?kitmesh=b loads the mesh b kit');ok(t.G.active(),'?kitmesh alone activates the module');
t=load('?kitmesh=c&gait=walkD');ok(/mesh_c\.glb/.test(t.G.kitUrl('K')),'?kitmesh=c loads the mesh c kit');
t=load('?kitmesh=a');ok(t.G.kitUrl('K')==='K','?kitmesh=a keeps the shipped kit');
{const mats=[{flatShading:false,needsUpdate:false},{flatShading:false}];const rig={traverse(f){mats.forEach(m=>f({isMesh:true,material:m}))}};
  t.box.player={userData:{gmix:{kit:true},rigInner:rig}};t.G.update();ok(mats.every(m=>m.flatShading===true),'?kitmesh=a draws the player flat-shaded')}
t=load('');ok(t.G.kitUrl('K')==='K'&&!t.G.active(),'no ?kitmesh: the shipped kit, module idle');
console.log('test_holm_gait_options: '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
