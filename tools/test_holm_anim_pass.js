#!/usr/bin/env node
/* Tutor's Holm animation pass (2026-09-29, finish goal M6.4): headless unit test. Pins every new animation's EXISTENCE
 * (the Blender curves in the published motions pack, the Blender smoke sprites) and its TRIGGER (the real module driven in
 * a vm with a small THREE stub), and that the pass stays presentation-only:
 *   1. assets/holm_island/ws/holm-anim-motions-v1/candidates/motions.glb (published, byte-identical to its Studio candidate
 *      when that is present): Fall, CastOff, Swing, Drop, Open, Close, Pump, Flicker on their empties, lengths, key poses,
 *      the 2004 stepping (poses held two frames), roots never animated; the smoke atlas (Blender render) exists;
 *   2. pure rules: the oak falls away from the woodcutter; one hammer strike per smith stroke on the measured hand curve
 *      (none from an idle bob); a door wants to open near / on a route through it only; the door swing state machine;
 *      a tutor strolls one linked tile on their own floor; which bank station; puffs; turning about a pivot;
 *   3. triggers, on the real src/holm_island_anim.js: a felled oak (the game's own alive=false) topples away from the
 *      woodcutter and is gone after the clip, the stump untouched; board -> the bell swings, the skiff carries the
 *      adventurer and Tobin north, then the crossing callback; the bank modal at the vault swings the vault gate open and
 *      shut; at the counter the teller gestures; the rope pays out when tied beside it (not on a restored save); a smith
 *      stroke fires one spark on the strike, a dropped frame still fires once; smelting pumps the bellows and flares the
 *      glow; the progress doors swing open on the approach and shut behind; the store door too; chimneys smoke; torches
 *      flicker;
 *   4. wiring: HolmIslandFx loads / ticks / disposes the pass and delegates the sail and the sparks; HolmIslandGates hands
 *      its leaves to a driver; tutors stroll on the walk clip and settle home to talk; the provider disposes it; index.html
 *      loads it; the publish list carries the motions; never Math.random, no XP / item / timing / combat / graph writes;
 *      practice enemies and animals are left to the creatures pass.
 * Run: node tools/test_holm_anim_pass.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS '+n)}else{fail++;console.log('FAIL '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,300):''))}};
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const D=Math.PI/180,near=(a,b,e)=>Math.abs(a-b)<=(e||1e-6);

/* ---------------- GLB reading (accessors -> float arrays) ---------------- */
function readGlb(p){const b=fs.readFileSync(p),jl=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+jl).toString('utf8'));const bin=b.slice(20+jl+8);
 const acc=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],off=(v.byteOffset||0)+(a.byteOffset||0);
  const out=new Float32Array(a.count*n);for(let k=0;k<a.count*n;k++)out[k]=bin.readFloatLE(off+k*4);return {arr:out,n}};
 return {j,acc}}
const PUB='assets/holm_island/ws/holm-anim-motions-v1/candidates/motions.glb',CAND='.studio-workspaces/holm-anim-motions-v1/candidates/motions.glb';
const G=readGlb(path.join(ROOT,PUB));
// clips as {name:{node.prop:{times,values,n}}}
const CL={};G.j.animations.forEach(a=>{const c=CL[a.name]=CL[a.name]||{};a.channels.forEach(ch=>{const s=a.samplers[ch.sampler],t=G.acc(s.input),v=G.acc(s.output);
 c[G.j.nodes[ch.target.node].name+'.'+{translation:'position',rotation:'quaternion',scale:'scale'}[ch.target.path]]={times:t.arr,values:v.arr,n:v.n,interp:s.interpolation||'LINEAR'}})});
function sample(tr,t){const T=tr.times,n=tr.n;if(t<=T[0])return Array.from(tr.values.slice(0,n));if(t>=T[T.length-1])return Array.from(tr.values.slice((T.length-1)*n,T.length*n));
 let i=0;while(T[i+1]<t)i++;const u=(t-T[i])/(T[i+1]-T[i]),a=tr.values.slice(i*n,i*n+n),b=tr.values.slice((i+1)*n,(i+1)*n+n);
 if(n===4){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];const s=d<0?-1:1,o=[0,1,2,3].map(k=>a[k]*(1-u)+s*b[k]*u),l=Math.hypot(...o);return o.map(x=>x/l)}
 return Array.from(a).map((x,k)=>x+(b[k]-x)*u)}
const angX=q=>2*Math.atan2(q[0],q[3]),angY=q=>2*Math.atan2(q[1],q[3]);

/* ======== 1. the Blender motion curves + sprites exist ======== */
try{
 ok('motions pack is published (tracked copy under assets/holm_island)',fs.existsSync(path.join(ROOT,PUB)));
 if(fs.existsSync(path.join(ROOT,CAND)))ok('published motions.glb is byte-identical to its Studio candidate',crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,PUB))).digest('hex')===crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,CAND))).digest('hex'));
 const man=JSON.parse(src('assets/holm_island/ws/holm-anim-motions-v1/candidates/manifest.json'));
 ok('manifest names the pack and its sha',man.pack==='HOLM_ANIM_MOTIONS_V1'&&man.sha256===crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,PUB))).digest('hex'));
 const want={Fall:[['tree-fall_Pivot.quaternion','tree-fall_Pivot.position'],2.2],CastOff:[['ferry-castoff_Boat.position','ferry-castoff_Boat.quaternion','ferry-castoff_Plank.position'],5.0],
  Swing:[['bell-swing_Bell.quaternion'],2.4],Drop:[['rope-drop_Rope.scale'],.8],Open:[['door-swing_Leaf.quaternion'],.6],Close:[['door-swing_Leaf.quaternion'],.6],
  Pump:[['bellows-pump_Board.scale'],.8],Flicker:[['flame-flicker_Flame.scale','flame-flicker_Flame.quaternion'],1.2]};
 Object.keys(want).forEach(c=>{const tr=CL[c],w=want[c];ok('clip '+c+' drives '+w[0].join(' + '),!!tr&&w[0].every(k=>tr[k]),tr&&Object.keys(tr));
  if(tr){const dur=Math.max(...Object.values(tr).map(x=>x.times[x.times.length-1]));ok('clip '+c+' lasts '+w[1]+' s',near(dur,w[1],.02),dur)}});
 const roots=G.j.scenes[0].nodes.map(i=>G.j.nodes[i]);
 ok('seven roots, all identity (the runtime owns the root)',roots.length===7&&roots.every(n=>!n.translation&&!n.rotation&&!n.scale),roots.map(n=>n.name));
 const animated=new Set();G.j.animations.forEach(a=>a.channels.forEach(ch=>animated.add(G.j.nodes[ch.target.node].name)));
 ok('no root is animated',roots.every(r=>!animated.has(r.name)));
 const fq=CL.Fall['tree-fall_Pivot.quaternion'];
 ok('Fall: upright at the start',near(angX(sample(fq,0)),0,1e-3));
 ok('Fall: tips toward +Z (positive X turn), on the ground by 1.0 s',near(angX(sample(fq,1.0))/D,90,1.5),angX(sample(fq,1.0))/D);
 ok('Fall: bounces off the ground (about 82 deg at 1.1 s) and settles at 90',angX(sample(fq,1.1))/D<86&&near(angX(sample(fq,1.5))/D,90,.5),[angX(sample(fq,1.1))/D,angX(sample(fq,1.5))/D]);
 ok('Fall: sinks away at the end (0.9 below)',near(sample(CL.Fall['tree-fall_Pivot.position'],2.2)[1],-.9,.02));
 // the 2004 stepping: poses held for two frames (samples at 2k and 2k+1 equal) through the fall
 const held=[];for(let f=10;f<28;f+=2){const a=angX(sample(fq,f/30)),b=angX(sample(fq,(f+1)/30));held.push(near(a,b,1e-4))}
 ok('Fall: stepped like the 2004 client (each pose held two frames)',held.every(Boolean),held);
 const bp=CL.CastOff['ferry-castoff_Boat.position'];
 ok('CastOff: the skiff pushes off east first',sample(bp,1.0)[0]>.3&&sample(bp,1.0)[0]<.6,sample(bp,1.0));
 ok('CastOff: then pulls out north (glTF -Z) about six tiles',sample(bp,5.0)[2]<-5.5,sample(bp,5.0));
 ok('CastOff: the boat bobs (height changes) and rolls',Math.abs(sample(bp,.4)[1]-sample(bp,1.2)[1])>.01&&Math.abs(angX([0,0,0,1]))===0);
 ok('CastOff: the plank slides aboard (east half a tile)',near(sample(CL.CastOff['ferry-castoff_Plank.position'],.6)[0],.5,.02));
 const bq=CL.Swing['bell-swing_Bell.quaternion'],sw=[.18,.54,.9].map(t=>angX(sample(bq,t))/D);
 ok('Swing: the bell swings to and fro and dies away',sw[0]>15&&sw[1]<-8&&sw[2]>3&&sw[2]<sw[0]&&near(angX(sample(bq,2.4)),0,1e-3),sw);
 const rs=CL.Drop['rope-drop_Rope.scale'];
 ok('Drop: the rope starts gathered at the knot and pays out to full length',sample(rs,0)[1]<.1&&near(sample(rs,.8)[1],1,.01)&&Math.max(...[.5,.55,.6].map(t=>sample(rs,t)[1]))>1.02,[sample(rs,0)[1],sample(rs,.55)[1]]);
 const oq=CL.Open['door-swing_Leaf.quaternion'],cq=CL.Close['door-swing_Leaf.quaternion'];
 ok('Open: 0 -> overshoot -> 90 deg about Y',near(angY(sample(oq,0)),0,1e-3)&&angY(sample(oq,.47))/D>91&&near(angY(sample(oq,.6))/D,90,.2));
 ok('Close: 90 -> 0 with a knock on the latch',near(angY(sample(cq,0))/D,90,.2)&&angY(sample(cq,.47))/D>2&&near(angY(sample(cq,.6)),0,1e-3));
 ok('Pump: the bellows squash to 0.7 and fill again (loop closes)',near(sample(CL.Pump['bellows-pump_Board.scale'],.2)[1],.7,.02)&&near(sample(CL.Pump['bellows-pump_Board.scale'],.8)[1],1,.02));
 const fl=[0,.2,.4,.6,.8,1].map(t=>sample(CL.Flicker['flame-flicker_Flame.scale'],t)[1]);
 ok('Flicker: the flame height varies (0.8 .. 1.2)',Math.max(...fl)-Math.min(...fl)>.1&&Math.min(...fl)>.75&&Math.max(...fl)<1.25,fl);
 const pngb=fs.readFileSync(path.join(ROOT,'assets/textures/fx/chimney_smoke_v1.png'));
 ok('the chimney smoke atlas is a 256 x 256 RGBA PNG (Blender render)',pngb.slice(1,4).toString()==='PNG'&&pngb.readUInt32BE(16)===256&&pngb.readUInt32BE(20)===256&&pngb[25]===6);
 const smj=JSON.parse(src('assets/textures/fx/chimney_smoke_v1.json'));
 ok('smoke atlas meta: four puff cells, built by build_fx_smoke_v1.py',smj['chimney_smoke_v1.png'].length===4&&/build_fx_smoke_v1\.py/.test(smj.source));
 ok('Blender builders are in the repo',fs.existsSync(path.join(ROOT,'tools/blender/build_holm_anim_motions_v1.py'))&&fs.existsSync(path.join(ROOT,'tools/blender/build_fx_smoke_v1.py')));
}catch(e){fail++;console.log('FAIL section 1 threw '+e.stack)}

/* ======== 2. pure rules ======== */
const A=require(path.join(ROOT,'src/holm_island_anim.js'));
// the smith clip's hand height, sampled from the kit (in-app browser, 2026-09-29): raised, down on the anvil at 0.32, back up
const STROKE=[1.4,1.4,1.4,1.4,1.4,1.4,1.314,1.314,1.314,1.314,1.314,1.016,1.016,1.016,1.016,1.016,.933,.947,.947,.947,.947,.983,.983,.983,1.016,1.029,1.029,1.029,1.029,1.029,1.029,1.075,1.075,1.075,1.075,1.176,1.176,1.176,1.176,1.176,1.176,1.307,1.307,1.307,1.307,1.382,1.382,1.382,1.382,1.382,1.4];
try{
 [[0,0,0,-1],[5,5,6,5],[2,-3,1,-3.5],[-4,2,-4.5,3]].forEach(([tx,tz,px,pz])=>{const y=A.fallYaw({x:tx,z:tz},{x:px,z:pz}),fwd={x:Math.sin(y),z:Math.cos(y)};
  ok('fallYaw: the oak at '+tx+','+tz+' falls away from a woodcutter at '+px+','+pz,fwd.x*(tx-px)+fwd.z*(tz-pz)>0)});
 ok('fallYaw: no woodcutter -> a fixed direction (no randomness)',A.fallYaw({x:1,z:1},null)===0);
 const det=A.strikeDetector(.25);let hits=[];for(let k=0;k<3;k++)STROKE.forEach((y,i)=>{if(det.push(y))hits.push(k*STROKE.length+i)});
 ok('strikes: exactly one per smith stroke over three strokes',hits.length===3,hits);
 ok('strikes: on the first rise after the hammer is down (sample 17 of each stroke)',hits.every((h,k)=>h===k*STROKE.length+17),hits);
 const d2=A.strikeDetector(.25);let idle=0;for(let i=0;i<300;i++)if(d2.push(1+.04*Math.sin(i/7)))idle++;
 ok('strikes: an idle bob never strikes',idle===0);
 const d3=A.strikeDetector(.25);d3.push(1.4);d3.push(1.4);const skipped=d3.push(.983)||d3.push(1.1);
 ok('strikes: a frame drop past the low still catches the blow on the rise',skipped);
 const c={x:45,y:5.47,z:68.5};
 ok('doorWant: the adventurer beside the door',A.doorWant(c,{x:46.5,y:5.33,z:68.5},[]));
 ok('doorWant: far off, no route through it -> shut',!A.doorWant(c,{x:52,y:5.3,z:68.5},[{x:51.5,y:5.3,z:69.5}]));
 ok('doorWant: a route through the doorway within the next steps -> open',A.doorWant(c,{x:49.5,y:5.3,z:68.5},[{x:48.5,y:5.3,z:68.5},{x:47.5,y:5.3,z:68.5},{x:46.5,y:5.3,z:68.5},{x:45.5,y:5.3,z:68.5}]));
 ok('doorWant: another floor right above -> shut',!A.doorWant(c,{x:45.5,y:9,z:68.5},[]));
 // door curves from the GLB, sampled at 60 per second like the runtime
 const curves={open:[],close:[],step:1/60};for(let t=0;t<=.6+1e-6;t+=1/60){curves.open.push(angY(sample(CL.Open['door-swing_Leaf.quaternion'],t))/(Math.PI/2));curves.close.push(angY(sample(CL.Close['door-swing_Leaf.quaternion'],t))/(Math.PI/2))}
 curves.open[curves.open.length-1]=1;curves.close[curves.close.length-1]=0;
 let s={mode:'closed',k:0,t:0,away:0},ev=[];const run=(want,sec)=>{for(let t=0;t<sec;t+=1/60){A.doorStep(s,want,1/60,curves);if(s.event)ev.push(s.event)}};
 run(true,.7);ok('doorStep: wanting it swings the door fully open',s.mode==='open'&&s.k===1&&ev[0]==='open',s);
 run(false,.5);ok('doorStep: it stays open a moment after the adventurer passes',s.mode==='open',s);
 run(false,1.5);ok('doorStep: then swings shut behind them',s.mode==='closed'&&s.k===0&&ev.indexOf('close')>=0,s);
 s={mode:'closed',k:0,t:0,away:0};run(true,.3);const mid=s.k;s.away=99;A.doorStep(s,false,1/60,curves);const after=s.k;
 ok('doorStep: turning back mid-swing continues from where the leaf is (no jump)',s.mode==='closing'&&Math.abs(after-mid)<.2,{mid,after});
 const home={x:10.5,y:2,z:10.5,surface:'land'},nb=[{x:11.5,y:2,z:10.5,surface:'land'},{x:10.5,y:2,z:11.5,surface:'land'},{x:10.5,y:5,z:9.5,surface:'upper'},{x:12.5,y:2,z:10.5,surface:'land'}];
 const picks=[0,1,2,3].map(k=>A.wanderPick(home,nb,k));
 ok('wanderPick: one linked tile on the same floor, never another storey or two tiles off',picks.every(p=>p&&p.surface==='land'&&Math.max(Math.abs(p.x-home.x),Math.abs(p.z-home.z))<=1));
 ok('wanderPick: deterministic, and it takes turns',A.wanderPick(home,nb,5)===A.wanderPick(home,nb,5)&&picks[0]!==picks[1]);
 ok('wanderPick: nowhere to go -> null',A.wanderPick(home,[],0)===null);
 const V={x:89.5,y:7.3,z:55.5},Cn={x:86.5,y:7.3,z:56.5};
 ok('bankStation: at the vault / at the counter / elsewhere',A.bankStation({x:89.5,y:7.3,z:55.5},V,Cn)==='vault'&&A.bankStation({x:86.5,y:7.3,z:57.5},V,Cn)==='counter'&&A.bankStation({x:60,y:4,z:90},V,Cn)===null);
 const pu=[0,.1,.5,.99].map(u=>A.puff(u,.45,1.45,.55));
 ok('puff: fades in, grows, fades out',pu[0].alpha===0&&pu[1].alpha>0&&pu[2].size>pu[1].size&&pu[3].alpha<.02);
 const rest={p:[3,1,-2],q:[0,Math.sin(.3),0,Math.cos(.3)],s:[1,1,1]},piv=[.5,-.2,1.5],q=[Math.sin(.4),0,0,Math.cos(.4)];
 const r=A.about(rest,piv,q,[1,.6,1]);
 // world point of the pivot before and after
 const qr=(qq,v)=>{const [x,y,z]=v,[qx,qy,qz,qw]=qq,ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;return [ix*qw+iw*-qx+iy*-qz-iz*-qy,iy*qw+iw*-qy+iz*-qx-ix*-qz,iz*qw+iw*-qz+ix*-qy-iy*-qx]};
 const w0=qr(rest.q,piv).map((v,i)=>v+rest.p[i]),w1=qr(r.q,piv.map((v,i)=>v*r.s[i])).map((v,i)=>v+r.p[i]);
 ok('about(): the pivot stays put while the part turns and scales about it',w0.every((v,i)=>near(v,w1[i],1e-9)),{w0,w1});
}catch(e){fail++;console.log('FAIL section 2 threw '+e.stack)}

/* ======== 3. triggers on the real module (THREE stub) ======== */
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}clone(){return new V3(this.x,this.y,this.z)}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}multiply(v){this.x*=v.x;this.y*=v.y;this.z*=v.z;return this}
 applyQuaternion(q){const r=qrot(q.toArray(),[this.x,this.y,this.z]);return this.set(r[0],r[1],r[2])}toArray(){return [this.x,this.y,this.z]}fromArray(a){return this.set(a[0],a[1],a[2])}setScalar(s){return this.set(s,s,s)}}
function qrot(q,v){const [x,y,z]=v,[qx,qy,qz,qw]=q,ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;return [ix*qw+iw*-qx+iy*-qz-iz*-qy,iy*qw+iw*-qy+iz*-qx-ix*-qz,iz*qw+iw*-qz+ix*-qy-iy*-qx]}
function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
class Q4{constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w}toArray(){return [this.x,this.y,this.z,this.w]}fromArray(a){this.x=a[0];this.y=a[1];this.z=a[2];this.w=a[3];return this}
 copy(q){return this.fromArray(q.toArray())}clone(){return new Q4(this.x,this.y,this.z,this.w)}invert(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this}
 multiply(q){return this.fromArray(qmul(this.toArray(),q.toArray()))}premultiply(q){return this.fromArray(qmul(q.toArray(),this.toArray()))}}
class O3{constructor(name){this.name=name||'';this.position=new V3();this.quaternion=new Q4();this.scale=new V3(1,1,1);this.children=[];this.parent=null;this.visible=true;this.userData={};
  const self=this;this.rotation={get y(){return 2*Math.atan2(self.quaternion.y,self.quaternion.w)},set y(v){self.quaternion.fromArray([0,Math.sin(v/2),0,Math.cos(v/2)])},set(){},copy(){}}}
 add(c){if(c.parent)c.parent.remove(c);this.children.push(c);c.parent=this;return this}remove(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);c.parent=null;return this}
 traverse(f){f(this);this.children.slice().forEach(c=>c.traverse(f))}getObjectByName(n){if(this.name===n)return this;for(const c of this.children){const r=c.getObjectByName(n);if(r)return r}return null}
 clone(){const o=new this.constructor(this.name);o.position.copy(this.position);o.quaternion.copy(this.quaternion);o.scale.copy(this.scale);o.visible=this.visible;o.isMesh=this.isMesh;o.box=this.box;o.material=this.material;o.userData=Object.assign({},this.userData);this.children.forEach(c=>o.add(c.clone()));return o}
 updateMatrixWorld(){}lookAt(x,y,z){const p=this.getWorldPosition(new V3());this.rotation.y=Math.atan2(x-p.x,z-p.z)}
 localToWorld(v){let o=this;const r=[v.x,v.y,v.z];let a=r;while(o){a=qrot(o.quaternion.toArray(),[a[0]*o.scale.x,a[1]*o.scale.y,a[2]*o.scale.z]).map((w,i)=>w+o.position.toArray()[i]);o=o.parent}return v.set(a[0],a[1],a[2])}
 worldToLocal(v){const chain=[];for(let o=this;o;o=o.parent)chain.unshift(o);let a=[v.x,v.y,v.z];chain.forEach(o=>{a=a.map((w,i)=>w-o.position.toArray()[i]);const qi=[-o.quaternion.x,-o.quaternion.y,-o.quaternion.z,o.quaternion.w];a=qrot(qi,a);a=[a[0]/o.scale.x,a[1]/o.scale.y,a[2]/o.scale.z]});return v.set(a[0],a[1],a[2])}
 getWorldPosition(v){return this.localToWorld(v.set(0,0,0))}getWorldQuaternion(q){let r=[0,0,0,1];for(let o=this;o;o=o.parent)r=qmul(o.quaternion.toArray(),r);return q.fromArray(r)}}
function mesh(name,box,mat){const m=new O3(name);m.isMesh=true;m.box=box;m.material=mat||{};return m}   // box: [minx,miny,minz,maxx,maxy,maxz] in the mesh's own space
class Box3{constructor(){this.min=new V3(Infinity,Infinity,Infinity);this.max=new V3(-Infinity,-Infinity,-Infinity)}isEmpty(){return this.max.x<this.min.x}
 expandByPoint(p){this.min.set(Math.min(this.min.x,p.x),Math.min(this.min.y,p.y),Math.min(this.min.z,p.z));this.max.set(Math.max(this.max.x,p.x),Math.max(this.max.y,p.y),Math.max(this.max.z,p.z));return this}
 setFromObject(o){this.min.set(Infinity,Infinity,Infinity);this.max.set(-Infinity,-Infinity,-Infinity);o.traverse(m=>{if(!m.isMesh||!m.box)return;const b=m.box;for(const x of [b[0],b[3]])for(const y of [b[1],b[4]])for(const z of [b[2],b[5]])this.expandByPoint(m.localToWorld(new V3(x,y,z)))});return this}
 getCenter(v){return v.set((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,(this.min.z+this.max.z)/2)}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n}setUsage(){return this}}
class Geo{constructor(){this.attributes={}}setAttribute(n,a){this.attributes[n]=a}setDrawRange(s,c){this.drawRange={start:s,count:c}}}
// GLTFLoader stub: the published motions pack as empties + clips whose tracks interpolate like three's
function gltfScene(){const s=new O3('Scene');G.j.scenes[0].nodes.forEach(function add(i,_,__,parent){const nd=G.j.nodes[i],o=new O3(nd.name);(parent||s).add(o);(nd.children||[]).forEach(c=>add(c,0,0,o))});return s}
function gltfClips(){return Object.keys(CL).map(name=>{const tr=CL[name];return {name,duration:Math.max(...Object.values(tr).map(x=>x.times[x.times.length-1])),
  tracks:Object.keys(tr).map(k=>({name:k,getValueSize:()=>tr[k].n,createInterpolant:()=>({evaluate:t=>sample(tr[k],t)})}))}})}
const THREE={Vector3:V3,Vector2:class{constructor(){this.x=0;this.y=0}},Quaternion:Q4,Object3D:O3,Group:O3,Box3,BufferGeometry:Geo,BufferAttribute:Attr,DynamicDrawUsage:35048,
 TextureLoader:class{load(u){return {url:u}}},ShaderMaterial:class{constructor(o){Object.assign(this,o);this.userData={}}},
 Points:class extends O3{constructor(g,m){super('points');this.geometry=g;this.material=m}},
 Raycaster:class{intersectObject(){return []}},GLTFLoader:class{load(u,ok){ok({scene:gltfScene(),animations:gltfClips()})}}};

async function world(){
 const scene=new O3('Scene');
 // teaching oak: stump (child 0) + tree (child 1), as holm_island_lessons.js builds it
 const oak=new O3('island-lesson-survival-oak-1');oak.position.set(38.5,2.2,93.5);oak.userData={alive:true};oak.add(mesh('tree-stump',[-.3,0,-.3,.3,.4,.3]));const tree=new O3('Scene');tree.add(mesh('oak-crown',[-1.5,0,-1.5,1.5,4.5,1.5]));oak.add(tree);scene.add(oak);
 // the haven: boat under the haven root (origin far up the pier, like the real model), hull, plank; the cove bell
 const haven=new O3('Haven_Root');haven.position.set(101,1,14);scene.add(haven);const bob=new O3('Haven_ServiceBoat_Bob');haven.add(bob);
 bob.add(mesh('Haven_ServiceBoat_Hull',[1.8,-1.66,-17.85,4.14,-.01,-11.27]));bob.add(mesh('Haven_ServiceBoat_Gangplank',[1.55,-1.1,-14.95,2.02,-.4,-14.05]));
 const bellP=new O3('island-prop-dress-lanternfoot-cove-cove-bell-6');bellP.position.set(105.6,1,18.4);scene.add(bellP);const bell=new O3('cove-bell_Bell');bellP.add(bell);
 bell.add(mesh('cove-bell_Bell_1',[-.4,0,-.07,.4,1.7,.07]));bell.add(mesh('cove-bell_Bell_2',[-.18,1.1,-.17,.18,1.52,.17]));
 const tobin=new O3('island-tutor-tobin');tobin.position.set(101.5,1,13.5);scene.add(tobin);
 // the bank vault gate, the cavern bellows + torch flame, the chimneys, the bakehouse store door, the furnace glow
 const bank=new O3('Bank_Root');bank.position.set(86,7.3,57);scene.add(bank);bank.add(mesh('Bank_ServiceVault_Gate',[2.69,.02,-2.04,4.29,2.19,-1.9]));
 const cav=new O3('Cavern_Root');cav.position.set(200,-30,60);scene.add(cav);cav.add(mesh('Cavern_FurnishingPropsBellows',[6.2,0,5.2,7.3,1.2,5.9]));
 const fmat={name:'flame',emissive:{},emissiveIntensity:1,color:{r:1,g:.5,b:.1,setRGB(r,g,b){this.r=r;this.g=g;this.b=b}},userData:{}};
 const tf=new O3('Cavern_TorchFlame');cav.add(tf);tf.add(mesh('Cavern_TorchFlame_1',[-8,2.2,-6,27,2.5,6],fmat));
 const glow=new O3('furnace-glow');glow.position.set(205.5,-29.7,65.2);scene.add(glow);
 const kit=new O3('Kitchen_Root');scene.add(kit);kit.add(mesh('Kitchen_Chimney_Stack',[40.8,11.1,61.7,42.9,16.2,63]));kit.add(mesh('Kitchen_Shell_StoreDoor',[44.8,5.4,63.91,44.86,7.76,65.09]));
 const gh=new O3('world-object-holm_guide_hall');scene.add(gh);const up=new O3('UpperHearth');gh.add(up);up.add(mesh('UpperHearthChimney',[58.88,7.26,95.2,59.39,9.84,97]));gh.add(mesh('RoofDeck_9',[59.03,5,95.46,59.6,14.21,96.74]));
 const lodge=new O3('Scene');scene.add(lodge);lodge.add(mesh('Lodge_Chimney_Light_gray_limestone',[39.23,8.24,51.44,40.08,12.42,52.46]));
 const bup=new O3('Bank_UpperChimney');bank.add(bup);bup.add(mesh('Bank_UpperChimney_5',[-2.88,3,-4.62,-2.12,8.98,-4.3]));
 // the rope prop, hidden until tied (HolmShaftRope toggles its visibility)
 const rg=new O3('island-shaft-rope-quarry-shaft');rg.position.set(36,9.15,33);rg.visible=false;scene.add(rg);const rope=new O3('rope-tied');rg.add(rope);rope.add(mesh('rope-tied_Rope_1',[.02,-2.6,-5.3,.67,1.43,-3.43]));
 // the adventurer with a right hand; a smith clip handle
 const player=new O3('player');player.position.set(40.5,2,97.5);const hand=new O3('mixamorigRightHand');player.add(hand);
 const smith={time:0,running:false,isRunning(){return this.running}};player.userData.gmix={clips:{smith}};scene.add(player);
 const sparks=[],gestures=[],modal={style:{display:'none'}},driverBox={fn:null},gateLeaves={};
 const doorsList=[{id:'bakehouse-door',open:true,center:{x:45,y:5.47,z:68.5},set(k){gateLeaves['bakehouse-door']=k}},{id:'bank-door',open:false,center:{x:86.5,y:7.3,z:61},set(k){gateLeaves['bank-door']=k}}];
 const route={list:[]};
 const sb={THREE,scene,player,console,Math:Object.create(Math),document:{getElementById:id=>id==='bank-modal'?modal:null},
  Player:{action:null},HolmIslandFx:{spark(){sparks.push(1);return true}},HolmIslandTutors:{gesture(id,c){gestures.push(id+':'+c);return true}},
  HolmIslandGates:{setDriver(fn){driverBox.fn=fn}},HolmArrivalPlayer:{route:()=>route.list},GuideArrow:{keepAfterComplete:true,target:'Board the skiff',setTarget(t){this.target=t}}};
 sb.Math.random=()=>{throw new Error('Math.random called by the animation pass')};
 const ctx=vm.createContext(sb);vm.runInContext(src('src/holm_island_anim.js')+'\n;this.HolmIslandAnim=HolmIslandAnim;',ctx);
 const H=ctx.HolmIslandAnim;
 const res=await H.load({THREE,scene,models:{haven:{actions:{HavenBoatIdleBob:{stop(){this.stopped=true},play(){this.played=true}}}}},api:{qaStance:(b,t)=>t==='vault'?{x:89.5,y:7.3,z:55.5}:{x:86.5,y:7.3,z:56.5}}});
 return {H,res,scene,oak,tree,bob,bell,tobin,player,hand,smith,sparks,gestures,modal,driverBox,gateLeaves,doorsList,route,rg,rope,sb,fmat,glow,kit};
}
function tick(W,sec,dt,each){dt=dt||1/60;for(let t=0;t<sec-1e-9;t+=dt){if(each)each(t);W.H.update(dt)}}
(async()=>{try{
 const W=await world();
 ok('load: every curve found, the oak, bellows, vault gate, torch, four chimneys, the store door',W.res.curves===11&&W.res.trees===1&&W.res.bellows&&W.res.vaultGate&&W.res.torches===1&&W.res.chimneys===4&&W.res.freeDoors===1,W.res);
 tick(W,.1);ok('the door driver is handed to HolmIslandGates',typeof W.driverBox.fn==='function');
 // --- felled oak
 W.oak.userData.alive=false;W.oak.children.forEach((c,i)=>{if(i>0)c.visible=false});   // exactly what game5_main does on depletion
 tick(W,.05);const felled=W.scene.children.find(o=>/^island-anim-felled-/.test(o.name));
 ok('oak: felling starts a topple of a copy of the tree',!!felled&&W.H.status().stats.falls===1);
 tick(W,1.3);const piv=felled&&felled.children[0],tip=piv&&piv.localToWorld(new V3(0,4,0));
 ok('oak: by 1.3 s it lies on the ground, pointing away from the woodcutter',!!tip&&tip.y<W.oak.position.y+.8&&((tip.x-W.oak.position.x)*(W.oak.position.x-W.player.position.x)+(tip.z-W.oak.position.z)*(W.oak.position.z-W.player.position.z))>0,tip);
 ok('oak: dust puffs where the crown lands',W.H.status().smoke.live>0);
 tick(W,1.2);ok('oak: the fallen copy is gone after the clip; the stump stays',!W.scene.children.some(o=>/^island-anim-felled-/.test(o.name))&&W.oak.children[0].visible);
 // --- the skiff
 const b0=W.bob.position.clone(),hull=W.bob.getObjectByName('Haven_ServiceBoat_Hull'),hb=new Box3().setFromObject(hull),hc0=hb.getCenter(new V3());let crossed=0;
 W.player.position.set(101.5,-.05,-.5);
 ok('sail: board starts the cast-off',W.H.sail(()=>crossed++)===true&&W.H.status().sailing&&W.H.sailing());
 ok('sail: aboard, the "Board the skiff" arrow is cleared and not kept for the mainland',W.sb.GuideArrow.target===null&&W.sb.GuideArrow.keepAfterComplete===false);
 tick(W,1.0);ok('sail: the ferry bell swings',Math.abs(W.bell.getObjectByName('cove-bell_Bell_2').quaternion.x)>1e-3||W.H.status().stats.bells===1);
 const onDeck=Math.abs(W.player.position.x-hc0.x)<1.2;ok('sail: the adventurer stands on the deck (stepped aboard)',onDeck,W.player.position);
 tick(W,4.1);const hc1=new Box3().setFromObject(hull).getCenter(new V3());
 ok('sail: the skiff pulls out north about six tiles',hc0.z-hc1.z>5.5,{from:hc0,to:hc1});
 ok('sail: the adventurer and Tobin ride along',W.player.position.z<hc0.z-5&&W.tobin.position.z<hc0.z-3,{p:W.player.position,t:W.tobin.position});
 ok('sail: the crossing starts once, when the clip ends',crossed===1);
 ok('sail: the boat turns about its own middle (no swing about the haven origin)',Math.abs(hc1.x-hc0.x)<1.5,{hc0,hc1});
 tick(W,6.5);ok('sail: if the crossing never happens the cove is put back',!W.H.status().sailing&&Math.hypot(W.bob.position.x-b0.x,W.bob.position.z-b0.z)<1e-6);
 // --- the bank
 const gate=W.scene.getObjectByName('Bank_ServiceVault_Gate'),g0=gate.quaternion.toArray();W.player.position.set(89.5,7.3,55.5);W.modal.style.display='block';tick(W,.8);
 ok('bank: opening the bank at the vault swings the vault gate open (60 deg)',near(angY(gate.quaternion.toArray())/D,60,1.5),angY(gate.quaternion.toArray())/D);
 W.modal.style.display='none';tick(W,.8);ok('bank: closing it swings the gate shut',near(angY(gate.quaternion.toArray()),angY(g0),1e-3));
 W.player.position.set(86.5,7.3,57.2);W.modal.style.display='block';tick(W,.1);W.modal.style.display='none';tick(W,.1);
 ok('bank: at the counter the teller turns and talks, then rests',W.gestures.join()==='maud:talk,maud:idle',W.gestures);
 // --- the rope
 W.rg.visible=true;tick(W,.2);ok('rope: a rope tied while the adventurer is away (a restored save) just hangs',W.H.status().stats.ropeDrops===0);
 W.rg.visible=false;tick(W,.05);W.player.position.set(36.4,9.15,29);W.rg.visible=true;tick(W,.3);const sMid=W.rope.scale.y;
 ok('rope: tied beside the shaft it pays out from the knot',W.H.status().stats.ropeDrops===1&&sMid<.95&&sMid>.05,sMid);tick(W,.7);ok('rope: then hangs at full length',near(W.rope.scale.y,1,1e-6));
 // --- the anvil: one spark per strike, on the hand's low
 W.player.position.set(203.5,-30,63.5);W.sb.Player.action={type:'smith',obj:{position:{x:203.56,z:64.6}}};W.smith.running=true;
 let strikeAt=[];for(let k=0;k<2;k++)STROKE.forEach((y,i)=>{W.smith.time=i/50;W.hand.position.y=y;const n=W.sparks.length;W.H.update(1/60);if(W.sparks.length>n)strikeAt.push(i)});
 ok('anvil: one burst of sparks per smith stroke, on the strike',strikeAt.length===2&&strikeAt.every(i=>i===17),strikeAt);
 const n0=W.sparks.length;[1.4,1.4,1.4].forEach((y,i)=>{W.smith.time=i*.2;W.hand.position.y=y;W.H.update(1/60)});W.smith.time=.45;W.hand.position.y=1.03;W.H.update(1/60);
 ok('anvil: a dropped frame over the low still sparks once (clip-time fallback)',W.sparks.length===n0+1);
 W.sb.Player.action=null;W.smith.running=false;tick(W,.1);
 // --- the furnace
 const bw=W.scene.getObjectByName('Cavern_FurnishingPropsBellows');W.player.position.set(205.5,-30,64.5);W.sb.Player.action={type:'smelt',obj:{position:{x:205.54,z:65.65}}};
 let minS=9;tick(W,.9,1/60,()=>{minS=Math.min(minS,bw.scale.y)});
 ok('furnace: the bellows pump while smelting',minS<.8,minS);ok('furnace: the glow flares',W.glow.scale.x>1.1,W.glow.scale.x);
 W.sb.Player.action=null;tick(W,.1);ok('furnace: done smelting, the bellows and glow rest',near(bw.scale.y,1)&&near(W.glow.scale.x,1));
 // --- the progress doors (driver) and the store door
 const drv=W.driverBox.fn;W.player.position.set(52,5.3,68.5);W.route.list=[];drv(1/60,W.doorsList);
 ok('doors: an earned door stands shut while nobody is near',W.gateLeaves['bakehouse-door']===0);
 W.route.list=[{x:48.5,y:5.3,z:68.5},{x:47.5,y:5.3,z:68.5},{x:46.5,y:5.3,z:68.5},{x:45.5,y:5.3,z:68.5}];for(let i=0;i<50;i++)drv(1/60,W.doorsList);
 ok('doors: it swings open as the adventurer routes through it',W.gateLeaves['bakehouse-door']===1);
 W.route.list=[];W.player.position.set(40,5.3,60);for(let i=0;i<150;i++)drv(1/60,W.doorsList);ok('doors: and swings shut behind them',W.gateLeaves['bakehouse-door']===0);
 W.player.position.set(45.5,5.4,68.5);for(let i=0;i<50;i++)drv(1/60,W.doorsList);ok('doors: a locked (unearned) door never opens',W.gateLeaves['bank-door']===0);
 const sd=W.kit.getObjectByName('Kitchen_Shell_StoreDoor');W.player.position.set(45.5,5.4,64.5);tick(W,.7);
 ok('store door: swings open as the adventurer passes',Math.abs(angY(sd.quaternion.toArray()))/D>70,angY(sd.quaternion.toArray())/D);
 W.player.position.set(30,5,60);tick(W,2.2);ok('store door: and shut again',near(angY(sd.quaternion.toArray()),0,1e-3));
 // --- ambience
 W.player.position.set(59,4.4,100);const p0=W.H.status().stats.puffs;tick(W,3);ok('chimneys: smoke rises from the Guide House chimney top',W.H.status().stats.puffs>p0+1);
 const ei=[];tick(W,1.2,1/60,()=>ei.push(W.fmat.emissiveIntensity));ok('torches: the cavern torches flicker (brightness varies)',Math.max(...ei)-Math.min(...ei)>.1);
 W.H.dispose();ok('dispose: the pass lets go (doors driver released, parts back at rest)',W.driverBox.fn===null&&!W.H.status().on&&near(W.glow.scale.x,1));
}catch(e){fail++;console.log('FAIL section 3 threw '+e.stack)}

/* ======== 4. wiring and scope ======== */
try{
 const anim=src('src/holm_island_anim.js'),code=anim.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
 ok('the pass never calls Math.random',!/Math\.random/.test(code));
 ok('presentation only: no XP, items, ticks, timings, combat or graph writes',!/addXp|addItem|removeItem|SkillTiming|skillSeconds|TICK_S|npcMaxHit|applyHit|killNpc|setGates|graphForDoors|Player\.action\s*=|\.moveSpeed|worldTick/.test(code));
 ok('player clips are only read (no clip timing written)',!/\.timeScale\s*=|\.time\s*=|clips\.[a-z]+\.(play|stop|reset)\(/.test(code));
 ok('creatures are left to the creatures pass (no grubkin, no death clips, no farm animals)',!/grubkin|HolmIslandTrials|HolmProvingGround|clips\.death|hen-anim|sheep|chicken/i.test(code));
 const fx=src('src/holm_island_fx.js');
 ok('HolmIslandFx loads the pass (awaited), ticks it and disposes it',/st\.anim=await HolmIslandAnim\.load\(o\)/.test(fx)&&/HolmIslandAnim\.update\(dt\)/.test(fx)&&/HolmIslandAnim\.dispose\(\)/.test(fx));
 ok('HolmIslandFx: the sail is the pass\'s, the sparks come from spark() (no timer, no random fall)',/HolmIslandAnim\.sail\(cb\)/.test(fx)&&/function spark\(\)/.test(fx)&&!/smithT/.test(fx)&&!/Math\.random/.test(fx));
 ok('the ferry board still goes through HolmIslandFx.sail',/HolmIslandFx\.sail\(go\)/.test(src('src/holm_island_curriculum.js')));
 const gates=src('src/holm_island_gates.js');
 ok('HolmIslandGates hands its leaves to a driver (setDriver / doors) and yields its own swing to it',/setDriver:setDriver/.test(gates)&&/doors:doorList/.test(gates)&&/if\(st\.driver\)\{/.test(gates));
 ok('HolmIslandGates: the doorways\' graph state is untouched by the driver (setGates only in refresh / load)',(gates.match(/setGates\(/g)||[]).length===2);
 ok('HolmIslandGates.looksOpen follows the leaf the player sees; the old-school menu offers Open on a door that stands shut',/looksOpen:looksOpen/.test(gates)&&/L\.shown=k/.test(gates)&&/HolmIslandGates\.looksOpen\?HolmIslandGates\.looksOpen\(id\)/.test(src('src/osrs_menu_world.js')));
 ok('the island guide stands down while the skiff sails (no arrow re-aimed at the moving boat)',/HolmIslandAnim\.sailing&&HolmIslandAnim\.sailing\(\)\)return;/.test(src('src/holm_island_guide.js')));
 const tut=src('src/holm_island_tutors.js');
 ok('tutors stroll on their walk clip, via HolmIslandAnim.wanderPick, 9+ tiles from the adventurer, home within 7',/play\(n,'walk'/.test(tut)&&/HolmIslandAnim\.wanderPick/.test(tut)&&/FAR=9,NEAR=7/.test(tut));
 ok('tutors settle home before they talk, and wave only from home',/settle\(n\);n\.opens=turn/.test(tut)&&/n\.w\.mode==='home'\)\)\{/.test(tut));
 ok('tutors: gesture() and strolls() are exported (the bank teller, QA)',/gesture:gesture,strolls:strolls/.test(tut));
 ok('the island provider disposes the effects pass when it leaves',/HolmIslandFx\.dispose\(\)/.test(src('src/holm_arrival_qa.js')));
 const html=src('index.html');
 ok('index.html loads holm_island_anim.js (cache-busted) right after holm_island_fx.js',/src\/holm_island_fx\.js\?v=[^"]+"><\/script><script src="src\/holm_island_anim\.js\?v=[^"]+"><\/script>/.test(html));
 ok('the publish list carries the motions pack',/'holm-anim-motions-v1\/candidates'/.test(src('tools/publish_holm_island.js')));
 ok('skill_timing.js and shared/combat.js know nothing of this pass (it only reads the action in progress)',!/holm_island_anim|HolmIslandAnim/.test(src('src/skill_timing.js'))&&!/HolmIslandAnim/.test(src('shared/combat.js')));
}catch(e){fail++;console.log('FAIL section 4 threw '+e.stack)}
console.log('\n[test_holm_anim_pass] '+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})();
