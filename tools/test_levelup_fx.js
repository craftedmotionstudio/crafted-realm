#!/usr/bin/env node
/* Level-up fireworks + falling oak leaves (owner request 2026-09-29): headless unit test.
 * Loads the real modules in a vm with small THREE / DOM / WebAudio stubs and a Math.random that throws, then pins:
 *   1. a levelUp shows NO full-screen flash layer and no emoji: only the small banner ("<Skill> level <n>");
 *      the chat line is our own wording; the idle alert keeps its own flash; quest completion keeps its old cue;
 *   2. the fireworks spawn around the adventurer on levelUp (Points in the scene, sparks near the body, following them
 *      if they walk), and despawn completely after ~3 s; bounded under repeated level-ups; reduced motion also clears;
 *      never takes a click (no raycast); the Blender spark sheet exists;
 *   3. the level-up sound is the picked recipe (sound pass 2026-09-29: a lute arpeggio rising with the rockets and blooming
 *      on the burst; one buffer source and one gain; quiet, short, on the audio clock), not the firework noise or the old
 *      square-wave triad;
 *   4. the falling leaves use the Blender oak-leaf texture, fall only from oaks, are rare (never more than 8 at once,
 *      far fewer than the old 36 squares), land and fade; fx_atmosphere no longer builds the square planes.
 * Run: node tools/test_levelup_fx.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS '+n)}else{fail++;console.log('FAIL '+n+(d!==undefined?'  '+JSON.stringify(d):''))}};
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const NO_RANDOM='Math.random=function(){throw new Error("Math.random called by a presentation layer")};';

/* ---------------- tiny THREE ---------------- */
class V3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this}
 applyQuaternion(q){const x=this.x,y=this.y,z=this.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w;const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;
  this.x=ix*qw+iw*-qx+iy*-qz-iz*-qy;this.y=iy*qw+iw*-qy+iz*-qx-ix*-qz;this.z=iz*qw+iw*-qz+ix*-qy-iy*-qx;return this}}
class Quat{constructor(){this.x=0;this.y=0;this.z=0;this.w=1}
 setFromEuler(e){const c1=Math.cos(e.x/2),c2=Math.cos(e.y/2),c3=Math.cos(e.z/2),s1=Math.sin(e.x/2),s2=Math.sin(e.y/2),s3=Math.sin(e.z/2);   // 'YXZ'
  this.x=s1*c2*c3+c1*s2*s3;this.y=c1*s2*c3-s1*c2*s3;this.z=c1*c2*s3-s1*s2*c3;this.w=c1*c2*c3+s1*s2*s3;return this}}
class Euler{constructor(x=0,y=0,z=0,o='XYZ'){this.set(x,y,z,o)}set(x,y,z,o){this.x=x;this.y=y;this.z=z;this.order=o||this.order;return this}}
class O3{constructor(){this.position=new V3();this.children=[];this.parent=null;this.visible=true;this.userData={};this.name='';this.type='Object3D';this.scale={x:1}}
 add(c){if(c.parent)c.parent.remove(c);this.children.push(c);c.parent=this;return this}remove(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);c.parent=null;return this}
 getWorldPosition(o){return o.copy(this.position)}}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.needsUpdate=false}setUsage(){return this}}
class Geo{constructor(){this.attributes={};this.drawRange={start:0,count:Infinity}}setAttribute(n,a){this.attributes[n]=a;return this}setIndex(i){this.index=i}setDrawRange(s,c){this.drawRange={start:s,count:c}}}
const loads=[];
const THREE={Vector3:V3,Vector2:class{constructor(){this.x=0;this.y=0}},Quaternion:Quat,Euler,Object3D:O3,Group:O3,BufferGeometry:Geo,BufferAttribute:Attr,DynamicDrawUsage:35048,DoubleSide:2,
 TextureLoader:class{load(u){const t={url:u,image:{width:256,height:256}};loads.push(u);return t}},
 ShaderMaterial:class{constructor(o){Object.assign(this,o);this.userData={}}},
 MeshLambertMaterial:class{constructor(o){Object.assign(this,o);this.userData={}}},
 Points:class extends O3{constructor(g,m){super();this.geometry=g;this.material=m;this.isPoints=true;this.raycast=()=>{throw new Error('stub Points.raycast should be replaced')}}},
 Mesh:class extends O3{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;this.raycast=()=>{throw new Error('stub Mesh.raycast should be replaced')}}},
 Box3:class{setFromObject(o){const b=o.userData.box||{min:[o.position.x-.3,o.position.y,o.position.z-.3],max:[o.position.x+.3,o.position.y+1.55,o.position.z+.3]};
  this.min={x:b.min[0],y:b.min[1],z:b.min[2]};this.max={x:b.max[0],y:b.max[1],z:b.max[2]};return this}}};
function scene0(){const s=new O3();s.type='Scene';return s}

/* ---------------- tiny DOM ---------------- */
function dom(){
 const byId={};const el=tag=>({tagName:tag,style:{},children:[],textContent:'',_html:'',set innerHTML(v){this._html=v;this.textContent=String(v).replace(/<[^>]*>/g,'')},get innerHTML(){return this._html},
  set id(v){this._id=v;byId[v]=this},get id(){return this._id},appendChild(c){this.children.push(c);return c},classList:{add(){},contains(){return false}}});
 const document={createElement:el,getElementById:id=>byId[id]||null,body:el('body'),readyState:'complete'};
 return {document,byId};
}
function png(file){const b=fs.readFileSync(path.join(ROOT,file));return {sig:b.slice(1,4).toString(),w:b.readUInt32BE(16),h:b.readUInt32BE(20),bits:b[24],type:b[25],bytes:b.length}}

try{
 /* ======== 1. the level-up notice: no flash, no emoji ======== */
 {
  const {document,byId}=dom();const raf=[];const defs=[];
  const sb={document,console,Overlays:{register(d){defs.push(d)}},addEventListener(){},removeEventListener(){},requestAnimationFrame(f){raf.push(f)},
   setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},UI:{chat(){}},Player:{hp:10,maxHp:10}};
  const ctx=vm.createContext(sb);
  vm.runInContext(src('src/events.js')+'\n;this.Events=Events;',ctx);
  vm.runInContext(src('src/overlays_world.js')+'\n;this.Notifier=Notifier;',ctx);
  const nd=defs.find(d=>d.id==='notifications');ok('the notifications overlay registers',!!nd);
  nd.start();ctx.Events.emit('levelUp',{skill:'Woodcutting',level:5});raf.forEach(f=>f());
  ok('levelUp: no full-screen flash layer is created',!byId['notif-flash'],Object.keys(byId));
  const b=byId['notif-banner'];
  ok('levelUp: the small banner reads "Woodcutting level 5"',!!b&&b.textContent==='Woodcutting level 5',b&&b.textContent);
  ok('levelUp: the banner has no emoji or symbols',!!b&&/^[A-Za-z0-9 ]+$/.test(b.textContent),b&&b.textContent);
  ok('the notifications description no longer mentions a level-up flash',!/flash/i.test(nd.desc),nd.desc);
  const nsrc=src('src/overlays_world.js'),lv=nsrc.slice(nsrc.indexOf("Events.on('levelUp'"),nsrc.indexOf("Events.on('levelUp'")+260);
  ok('source: the levelUp handler never calls _flash',lv.length>20&&!/_flash\(/.test(lv.slice(0,lv.indexOf('}));'))),lv.slice(0,200));
  ok('source: the idle alert keeps its own flash',/idleWarned=true;\s*\n?\s*this\._flash\(/.test(nsrc));
  const g3=src('src/game3_systems.js');
  ok('chat line: our own wording (no "Congratulations, you just advanced")',!/just advanced/.test(g3)&&/Your \$\{s\} has grown to level \$\{after\}/.test(g3));
  // sound pass 2026-09-29: the owner kept the fireworks but not their noise; the level-up is the picked recipe
  ok('Sfx.level() plays the picked level-up recipe (SfxLib.LEVEL_PICK)',/level\(\)\{ this\.play\(\(typeof SfxLib!=='undefined'&&SfxLib\.LEVEL_PICK\)\|\|'level_up_a'\); \}/.test(g3));
  ok('quest completion keeps its own cue (Sfx.questDone -> quest_done), never the level-up',/Sfx\.questDone\(\)/.test(g3)&&/questDone\(\)\{ this\.play\('quest_done'\); \}/.test(g3)&&!/UI\.refreshQuests\(\); Sfx\.level\(\)/.test(g3));
  ok('server level message: our own wording',!/Congratulations/.test(src('server/engine/Player.js')));
 }

 /* ======== 2. fireworks: spawn round the adventurer, despawn ======== */
 const clock={t:0};
 const scene=scene0(),player=new O3();player.name='player';player.position.set(10,2,20);scene.add(player);
 const fxCtx=vm.createContext({THREE,scene,player,console,performance:{now:()=>clock.t*1000},localStorage:{getItem:()=>null},window:{matchMedia:()=>({matches:false})}});
 vm.runInContext(NO_RANDOM,fxCtx);
 vm.runInContext(src('src/events.js')+'\n;this.Events=Events;',fxCtx);
 vm.runInContext(src('src/fx_levelup.js')+'\n;this.LevelUpFX=LevelUpFX;',fxCtx);
 const FX=fxCtx.LevelUpFX;
 const step=(s,dt=1/60)=>{for(let t=0;t<s-1e-9;t+=dt){clock.t+=dt;FX.update(dt)}};
 const pts=()=>scene.children.find(c=>c.name==='fx-levelup-fireworks');
 ok('nothing is built before a level-up',!pts()&&FX.stats().particles===0);
 fxCtx.Events.emit('levelUp',{skill:'Mining',level:3});
 const P=pts();
 ok('levelUp: a Points object joins the scene',!!P&&P.isPoints,FX.stats());
 ok('it uses the Blender spark sheet',loads.includes('assets/textures/fx/levelup_sparks_v1.png')&&P.material.uniforms.uMap.value.url==='assets/textures/fx/levelup_sparks_v1.png');
 ok('never takes a click: raycast is a no-op',(()=>{const hits=[];try{P.raycast({},hits)}catch(e){return false}return hits.length===0})());
 ok('transparent, no depth write, not frustum-culled',P.material.transparent===true&&P.material.depthWrite===false&&P.frustumCulled===false);
 step(.25);const s1=FX.stats();ok('rockets rise with trails at 0.25 s',s1.particles>=4&&P.visible,s1);
 // every drawn spark stays round the adventurer: within ~1.6 tiles across, from the feet to a little over the head
 let maxR=0,minY=1e9,maxY=-1e9,maxShown=0,peak=0;
 const scan=()=>{const a=P.geometry.attributes.position.array,n=P.geometry.drawRange.count;maxShown=Math.max(maxShown,n);
  for(let i=0;i<n;i++){const dx=a[i*3]-player.position.x,dz=a[i*3+2]-player.position.z;maxR=Math.max(maxR,Math.hypot(dx,dz));minY=Math.min(minY,a[i*3+1]-player.position.y);maxY=Math.max(maxY,a[i*3+1]-player.position.y)}};
 for(let i=0;i<60;i++){step(1/30);scan();peak=Math.max(peak,FX.stats().particles)}
 ok('bursts pop: many sparks by ~2.2 s',peak>=40,{peak});
 ok('the sparks stay round the adventurer (within 1.7 tiles across)',maxR<1.7,{maxR});
 ok('from about the feet to just over the head (body height, not the sky)',minY>-.3&&maxY<1.55+.9,{minY,maxY});
 const sizes=P.geometry.attributes.aSize.array;let smax=0;for(let i=0;i<P.geometry.drawRange.count;i++)smax=Math.max(smax,sizes[i]);
 ok('sparks are small (world size under 0.4 tile)',smax<.4,{smax});
 // they follow the adventurer
 const before=P.geometry.attributes.position.array[0];player.position.x+=3;step(1/60);
 ok('the burst follows the adventurer when they walk',Math.abs(P.geometry.attributes.position.array[0]-before-3)<.2,{before,after:P.geometry.attributes.position.array[0]});
 player.position.x-=3;
 step(1.6);const s2=FX.stats();
 ok('all gone after ~3 s: no sparks, no bursts, Points hidden',s2.particles===0&&s2.bursts===0&&P.visible===false&&P.geometry.drawRange.count===0,s2);
 // repeated level-ups (a quest reward): bounded
 for(let i=0;i<6;i++)fxCtx.Events.emit('levelUp',{skill:'Attack',level:4+i});
 ok('six level-ups at once make at most two bursts',FX.stats().bursts<=2,FX.stats());
 step(4);ok('...and clear',FX.stats().particles===0&&FX.stats().bursts===0,FX.stats());
 ok('the particle pool stays bounded',FX.stats().pool<=320,FX.stats());
 const rb=FX.burst(player,{reduced:true});step(.6);const rs=FX.stats();
 ok('reduced motion: stars only, no rising rockets (no trails)',!!rb&&rs.particles>0&&rs.particles<=5*8+5*4,rs);
 step(3);ok('reduced motion also clears',FX.stats().particles===0,FX.stats());
 const sp=png('assets/textures/fx/levelup_sparks_v1.png');
 ok('spark sheet: a 256 x 256 RGBA PNG (Blender render)',sp.sig==='PNG'&&sp.w===256&&sp.h===256&&sp.type===6,sp);

 /* ======== 3. the sound (sound pass 2026-09-29: the picked recipe, a lute arpeggio; three candidates on the sound board) ======== */
 {
  vm.runInContext(src('src/sfx_lib.js')+'\n'+src('src/sfx_recipes.js')+'\n;this.SfxLib=SfxLib;',fxCtx);
  const Lib=fxCtx.SfxLib;
  const nodes=[],conn=[];const dest={kind:'dest'};
  const param=()=>({value:0,ev:[],setValueAtTime(v,t){this.ev.push(['set',v,t])},linearRampToValueAtTime(v,t){this.ev.push(['lin',v,t])},exponentialRampToValueAtTime(v,t){this.ev.push(['exp',v,t])}});
  const node=kind=>{const n={kind,connect(o){conn.push([n,o]);return o},start(t){n.t0=t},stop(t){n.t1=t}};nodes.push(n);return n};
  const ctx={currentTime:5,sampleRate:8000,destination:dest,createBuffer(c,l,sr){return {length:l,sampleRate:sr,duration:l/sr,getChannelData:()=>new Float32Array(l)}},
   createBufferSource(){const n=node('source');n.playbackRate=param();return n},createBiquadFilter(){const n=node('filter');n.frequency=param();n.Q=param();return n},
   createGain(){const n=node('gain');n.gain=param();return n},createOscillator(){const n=node('osc');n.frequency=param();return n}};
  const out=FX.sound(ctx,dest);
  const osc=nodes.filter(n=>n.kind==='osc'),src0=nodes.filter(n=>n.kind==='source'),gains=nodes.filter(n=>n.kind==='gain');
  ok('sound: the picked recipe (level_up_a, the lute arpeggio), not the firework noise',!!out&&out.id==='level_up_a'&&Lib.LEVEL_PICK==='level_up_a'&&/lute arpeggio/.test(Lib.DEFS.level_up_a.made),out);
  ok('sound: one buffer source and one gain on the given output (no oscillators, no square waves)',src0.length===1&&gains.length===1&&osc.length===0&&conn.some(([a,b])=>a===gains[0]&&b===dest),{src:src0.length,gains:gains.length,osc:osc.length});
  ok('sound: scheduled on the audio clock',src0[0].t0>=5,src0[0].t0);
  const b=Lib.render('level_up_a',22050,0),m=Lib.measure(b,22050),loud=Lib.loudness(b,22050);
  ok('sound: quiet beside the music (its loudest 50 ms at or under the music level, peak under 0.3)',loud<=Lib.REF&&m.peak<=.3,{loud,peak:m.peak});
  ok('sound: short (heard for under 1.5 s)',m.audible<1.5,m);
  // the arpeggio rises with the rockets (0 .. 0.2 s) and blooms as they burst (~0.46 s), after a lull
  const w=Math.round(.04*22050),rms=[];for(let i=0;i+w<=b.length;i+=w){let s=0;for(let j=i;j<i+w;j++)s+=b[j]*b[j];rms.push(Math.sqrt(s/w))}
  ok('sound: notes at the rockets, a lull, then the bloom on the burst',rms[0]>.01&&rms[9]<rms[0]*.35&&rms[11]>rms[9]*3,rms.slice(0,14).map(x=>+x.toFixed(4)));
  ok('sound: reports itself in stats (for the in-browser audio check)',!!FX.stats().lastSound&&FX.stats().lastSound.nodes===2&&FX.stats().lastSound.id==='level_up_a');
  ok('sound: three candidates exist for the owner (A picked, B music box, C horn call)',['level_up_a','level_up_b','level_up_c'].every(id=>!!Lib.DEFS[id]));
 }

 /* ======== 4. the falling oak leaves ======== */
 {
  const clock2={t:0};const sc=scene0();const pl=new O3();pl.position.set(0,0,0);sc.add(pl);
  const tree=(x,z,label,extra)=>{const g=new O3();g.position.set(x,1,z);g.userData=Object.assign({kind:'resource',rtype:'tree',label,alive:true,box:{min:[x-2,1,z-2],max:[x+2,6,z+2]}},extra||{});sc.add(g);return g};
  const oaks=[tree(3,0,'Chop down Oak'),tree(0,4,'Chop down <b>Oak</b> tree'),tree(-3,-2,'Chop down Oak')];
  const willow=tree(5,5,'Chop down <b>Willow</b> tree'),plain=tree(-5,5,'Chop down Tree');
  const WORLD={resources:[...oaks,willow,plain]};
  const lctx=vm.createContext({THREE,scene:sc,player:pl,WORLD,console,groundY:(x,z)=>1,performance:{now:()=>clock2.t*1000}});
  vm.runInContext(NO_RANDOM,lctx);
  vm.runInContext(src('src/fx_leaves.js')+'\n;this.LeafFall=LeafFall;',lctx);
  const LF=lctx.LeafFall;LF.start();
  const mesh=sc.children.find(c=>c.name==='fx-falling-oak-leaves');
  ok('leaves: one mesh in the scene',!!mesh&&mesh.isMesh);
  ok('leaves: the material uses the Blender oak-leaf texture',!!mesh&&!!mesh.material.map&&mesh.material.map.url==='assets/textures/fx/oak_leaves_v1.png'&&mesh.material.transparent===true);
  ok('leaves: per-leaf fade through vertex alpha (RGBA colour)',mesh.geometry.attributes.color.itemSize===4&&mesh.material.vertexColors===true);
  ok('leaves: never take a click',(()=>{try{mesh.raycast({},[]);return true}catch(e){return false}})());
  const s0=LF.stats();ok('leaves: only the oaks are hosts (not the willow or the plain tree)',s0.hosts===3,s0);
  const lstep=(s,dt=1/30)=>{let mx=0,sum=0,n=0;for(let t=0;t<s-1e-9;t+=dt){clock2.t+=dt;LF.update(dt);const q=LF.stats(),c=q.falling+q.resting+q.fading;mx=Math.max(mx,c);sum+=c;n++}return {max:mx,avg:sum/Math.max(1,n)}};
  ok('leaves: a leaf can be let go on demand (QA)',typeof LF.qaDrop(0)==='number'&&LF.stats().falling===1);
  let landed=false,a0=null;for(let i=0;i<300&&!landed;i++){lstep(1/30);landed=LF.stats().landed>0}
  ok('leaves: a leaf lands on the ground within ~10 s',landed,LF.stats());
  const run=lstep(240);const s=LF.stats();
  ok('leaves: rare: never more than 8 out at once',run.max<=8,run);
  ok('leaves: occasional, not a snowfall (average under 5 out, the squares were 36)',run.avg<5&&run.avg>0,run);
  ok('leaves: three oaks let go roughly one leaf every 2-5 s (not a stream)',s.spawned>=240/14*3*0.6&&s.spawned<=240/6*3+4,s);
  ok('leaves: they rest and fade (faded count follows spawned)',s.faded>=s.spawned-8,s);
  oaks[0].userData.alive=false;oaks[1].userData.alive=false;oaks[2].userData.alive=false;const before2=LF.stats().spawned;lstep(60);
  ok('leaves: felled oaks drop nothing',LF.stats().spawned===before2,{before:before2,after:LF.stats().spawned});
  oaks.forEach(o=>o.userData.alive=true);pl.position.set(200,0,200);const before3=LF.stats().spawned;lstep(60);
  ok('leaves: nothing falls far from the adventurer',LF.stats().spawned===before3);
  lstep(20);ok('leaves: the mesh hides when no leaf is out',mesh.visible===false,LF.stats());
  LF.stop();ok('leaves: stop takes the mesh out of the scene',!sc.children.includes(mesh));
  const lp=png('assets/textures/fx/oak_leaves_v1.png');
  ok('leaf sheet: a 256 x 256 RGBA PNG (Blender render)',lp.sig==='PNG'&&lp.w===256&&lp.h===256&&lp.type===6,lp);
  const atm=src('src/fx_atmosphere.js');
  ok('fx_atmosphere: the square leaf planes are gone and LeafFall runs with the layer',!/PlaneGeometry\(0\.22/.test(atm)&&/LeafFall\.start\(\)/.test(atm)&&/LeafFall\.stop\(\)/.test(atm));
  const html=src('index.html');
  ok('index.html loads fx_levelup.js and fx_leaves.js (leaves before the atmosphere layer)',/src\/fx_levelup\.js\?v=/.test(html)&&html.indexOf('src/fx_leaves.js')>0&&html.indexOf('src/fx_leaves.js')<html.indexOf('src/fx_atmosphere.js'));
  const g5=src('src/game5_main.js');
  ok('animate() steps both every frame',/LevelUpFX\.update\(dt\)/.test(g5)&&/LeafFall\.update\(dt\)/.test(g5));
  const blend=src('tools/blender/build_fx_sprites_v1.py');
  ok('both sheets come from the Blender build script',/levelup_sparks_v1\.png/.test(blend)&&/oak_leaves_v1\.png/.test(blend)&&/import bpy/.test(blend));
 }
}catch(e){fail++;console.log('FAIL exception '+(e&&e.stack||e))}
console.log('\n'+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
