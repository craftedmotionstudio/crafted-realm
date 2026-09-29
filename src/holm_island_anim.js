/* Tutor's Holm animation pass (2026-09-29; finish goal M6.4 and the owner's acceptance line "everything that could have an
 * animation has one"). docs/rebuild/HOLM_ANIMATION_INVENTORY.md lists every animatable thing on the island and how it moves.
 * This module adds what was missing or weak, the 2004 way (simple, readable, stepped where the old client stepped):
 *  - a felled teaching oak creaks, tips AWAY from the woodcutter, hits the ground with a bounce and a puff of dust, lies a
 *    moment and sinks away; the stump stays for the respawn timer (the game keeps it; 2004's stump rule);
 *  - Tobin's skiff: the ferry bell swings and rings, the adventurer and Tobin step aboard, the plank slides in, the boat
 *    pushes off the pier and pulls out to the open sea (north), then the crossing loads;
 *  - the anvil throws its sparks on each hammer STRIKE (the hand's lowest point in the smith clip), with a small clink;
 *    the furnace glow flares and the bellows pump while the adventurer smelts;
 *  - the island's building doors (the progress gates) swing open as the adventurer comes to them or routes through them,
 *    and swing shut behind them (a locked door stays shut, as before);
 *  - banking: the vault gate swings open while the bank is open at the vault; at the counter Teller Maud turns and talks;
 *  - the tied rope pays out down the mine shaft;
 *  - smoke rises from the lit hearths' chimneys; the cavern's wall torches flicker.
 * (Practice enemies and the farm's animals are owned by the creatures pass, 2026-09-29: nothing here animates a creature.)
 * Motion sources: Blender only where a model moves. Motion curves authored in Blender (tools/blender/
 * build_holm_anim_motions_v1.py: animated empties) drive parts that cannot carry a clip of their own (the building models
 * are hash-bound to their measured walk graphs, so their bytes never change); smoke and dust are Blender-rendered sprites
 * (build_fx_smoke_v1.py). The adventurer's clips are only READ (the hand's height and the smith clip's time, for the anvil).
 * Presentation only: nothing here reads a roll, grants XP or items, changes a tick, a timing, a combat number or the walk
 * graph (a door's leaf only turns; its doorway's graph state is HolmIslandGates' as before). Never Math.random.
 * Pure rules are exported for tools/test_holm_anim_pass.js. Island only (loaded by HolmIslandFx). */
var HolmIslandAnim=(function(){
 'use strict';
 function asset(u){return typeof HolmIsland!=='undefined'?HolmIsland.asset(u):u}
 var MOTIONS='/.studio-workspaces/holm-anim-motions-v1/candidates/motions.glb';
 var SMOKE_TEX='assets/textures/fx/chimney_smoke_v1.png?v=1';
 var TICK=.6,EPS=1e-4,STRIKE_LATE=.42;   // (clip seconds) the smith clip's hammer is down by here: the fallback for a missed low
 var seed=0x5a17e;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}   // never Math.random

 /* ================================================================ pure rules (unit-tested) */
 // the yaw that turns a model's local +Z from the woodcutter toward (and past) the tree: it falls away from them
 function fallYaw(tree,from){if(!from)return 0;var dx=tree.x-from.x,dz=tree.z-from.z;if(Math.hypot(dx,dz)<1e-6)return 0;return Math.atan2(dx,dz)}
 // hammer strikes from the hand's height: a strike is the first rise after a drop of at least `drop` from the last high
 function strikeDetector(drop){drop=drop||.25;var s={prev:null,max:0,lo:0,strikes:0};
  return {push:function(y){if(!Number.isFinite(y))return false;if(s.prev===null){s.prev=s.max=s.lo=y;return false}
    var d=y-s.prev,hit=false;s.prev=y;
    if(d<-EPS)s.lo=Math.min(s.lo,y);
    else if(d>EPS){if(s.max-s.lo>=drop){hit=true;s.strikes++;s.max=y}else s.max=Math.max(s.max,y);s.lo=y}
    return hit},
   reset:function(){s.prev=null},state:function(){return {max:s.max,lo:s.lo,strikes:s.strikes}}}}
 // a door wants to stand open while the adventurer is close to it on its own level, or is walking a route through it
 var DOOR_NEAR=2.2,DOOR_ROUTE=1.1,DOOR_AHEAD=4,DOOR_SHUT_AFTER=1.2;
 function doorWant(c,p,route){if(!c||!p)return false;
  if(Math.abs(p.y-c.y)<2.2&&Math.hypot(p.x-c.x,p.z-c.z)<=DOOR_NEAR)return true;
  for(var i=0;route&&i<route.length&&i<DOOR_AHEAD;i++){var r=route[i];if(Math.abs(r.y-c.y)<2.2&&Math.hypot(r.x-c.x,r.z-c.z)<=DOOR_ROUTE)return true}
  return false}
 // one door's swing, frame by frame: {mode:'closed'|'opening'|'open'|'closing', k (0 shut .. 1 open), t, away}. curves:
 // {open:[k...], close:[k...], step:seconds} sampled from the Blender Open / Close clips. Returns the state (mutated).
 function doorStep(s,want,dt,curves){
  var at=function(arr,t){var i=Math.min(arr.length-1,Math.max(0,Math.round(t/curves.step)));return arr[i]},dur=function(arr){return (arr.length-1)*curves.step};
  var from=function(arr,k,up){for(var i=0;i<arr.length;i++)if(up?arr[i]>=k-1e-6:arr[i]<=k+1e-6)return i*curves.step;return 0};
  s.event=null;
  if(want){s.away=0;if(s.mode==='closed'||s.mode==='closing'){s.mode='opening';s.t=from(curves.open,s.k,true);s.event='open'}}
  else if(s.mode==='open'||s.mode==='opening'){s.away=(s.away||0)+dt;if(s.away>=DOOR_SHUT_AFTER){s.mode='closing';s.t=from(curves.close,s.k,false);s.event='close'}}
  if(s.mode==='opening'){s.t+=dt;s.k=at(curves.open,s.t);if(s.t>=dur(curves.open)){s.mode='open';s.k=1}}
  else if(s.mode==='closing'){s.t+=dt;s.k=at(curves.close,s.t);if(s.t>=dur(curves.close)){s.mode='closed';s.k=0}}
  return s}
 // a tutor's one-tile stroll: a linked neighbour of their home node on the same floor, chosen in turn (k)
 function wanderPick(home,linked,k){var c=(linked||[]).filter(function(n){return n&&n.surface===home.surface&&Math.abs(n.y-home.y)<.3&&Math.max(Math.abs(n.x-home.x),Math.abs(n.z-home.z))<=1.01&&Math.hypot(n.x-home.x,n.z-home.z)>.5});
  if(!c.length)return null;c.sort(function(a,b){return (a.x-b.x)||(a.z-b.z)});return c[(k>>>0)%c.length]}
 // which bank station the adventurer is using when the bank opens
 function bankStation(p,vault,counter){if(!p)return null;if(vault&&Math.hypot(p.x-vault.x,p.z-vault.z)<=1.6&&Math.abs(p.y-vault.y)<1.5)return 'vault';
  if(counter&&Math.hypot(p.x-counter.x,p.z-counter.z)<=2.6&&Math.abs(p.y-counter.y)<1.5)return 'counter';return null}
 // a chimney puff over its life (u = age / life): size and opacity (sizes in tiles)
 function puff(u,s0,s1,a0){u=Math.max(0,Math.min(1,u));return {size:s0+(s1-s0)*Math.sqrt(u),alpha:a0*Math.min(1,u/.08)*(1-u)*(1-u*.4)}}
 // a node's transform with a turn q (x,y,z,w) and a scale m ([x,y,z]) about a pivot in its own space; rest = its rest
 // {p:[x,y,z], q:[x,y,z,w], s:[x,y,z]} in its parent's space. The pivot stays where it was.
 function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
 function qrot(q,v){var x=v[0],y=v[1],z=v[2],qx=q[0],qy=q[1],qz=q[2],qw=q[3],ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;
  return [ix*qw+iw*-qx+iy*-qz-iz*-qy,iy*qw+iw*-qy+iz*-qx-ix*-qz,iz*qw+iw*-qz+ix*-qy-iy*-qx]}
 function about(rest,pivot,q,m){m=m||[1,1,1];q=q||[0,0,0,1];
  var sp=[pivot[0]*rest.s[0],pivot[1]*rest.s[1],pivot[2]*rest.s[2]],a=qrot(rest.q,sp),q2=qmul(rest.q,q),s2=[rest.s[0]*m[0],rest.s[1]*m[1],rest.s[2]*m[2]];
  var b=qrot(q2,[pivot[0]*s2[0],pivot[1]*s2[1],pivot[2]*s2[2]]);
  return {p:[rest.p[0]+a[0]-b[0],rest.p[1]+a[1]-b[1],rest.p[2]+a[2]-b[2]],q:q2,s:s2}}

 /* ================================================================ runtime */
 var st={on:false,T:0,free:[],smPrev:0,struck:false,THREE:null,scene:null,models:{},api:null,gltf:null,curves:{},falls:[],trees:[],sail:null,rope:null,doors:{},driverSet:false,
  anvil:null,det:null,hand:null,handOf:null,furnace:null,bellows:null,bank:null,smoke:null,torches:[],made:[],
  stats:{falls:0,strikes:0,sparks:0,sails:0,bells:0,ropeDrops:0,doorOpens:0,doorCloses:0,bankVault:0,bankCounter:0,puffs:0,flarings:0}};
 var V=null,V2=null,Q=null;
 function T3(){return st.THREE}
 function parse(url){var T=T3();return new Promise(function(ok,no){new T.GLTFLoader().load(url,ok,undefined,no)})}
 // a Blender curve: one track of one clip, evaluated at time t (clamped, or wrapped for a loop)
 function curve(clip,node,prop,loop){var g=st.gltf;if(!g)return null;var c=g.animations.filter(function(a){return a.name===clip})[0];if(!c)return null;
  var tr=c.tracks.filter(function(t){return t.name===node+'.'+prop})[0];if(!tr)return null;var ip=tr.createInterpolant(),dur=c.duration;
  var f=function(t){t=loop?((t%dur)+dur)%dur:Math.max(0,Math.min(dur,t));return ip.evaluate(t)};f.duration=dur;f.size=tr.getValueSize();return f}
 function yawOf(q){return 2*Math.atan2(q[1],q[3])}
 function restOf(o){return {p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray()}}
 function put(o,r){o.position.fromArray(r.p);o.quaternion.fromArray(r.q);o.scale.fromArray(r.s)}
 function playerPos(){return typeof player!=='undefined'&&player?player.position:null}
 function near(o,d){var p=playerPos();return !!(p&&o&&Math.hypot(p.x-o.x,p.z-o.z)<=d)}
 function sfx(fn){try{if(typeof Sfx!=='undefined'&&Sfx.ctx)fn(Sfx)}catch(e){}}
 function sfxF(name,a){try{if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings[name])SfxFurnishings[name](a)}catch(e){}}

 /* ---------------- smoke + dust: one Points (one draw call), Blender-rendered puffs ---------------- */
 var VS=['attribute vec3 aColor;','attribute float aAlpha;','attribute float aSize;','attribute float aFrame;','attribute float aRot;',
  'uniform float uScale;','varying vec3 vColor;','varying float vAlpha;','varying float vFrame;','varying float vRot;',
  'void main(){','  vColor=aColor;vAlpha=aAlpha;vFrame=aFrame;vRot=aRot;',
  '  vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;',
  '  gl_PointSize=aSize*uScale/max(0.05,-mv.z);','}'].join('\n');
 var FS=['uniform sampler2D uMap;','varying vec3 vColor;','varying float vAlpha;','varying float vFrame;','varying float vRot;',
  'void main(){',
  '  vec2 p=gl_PointCoord-0.5;float c=cos(vRot),s=sin(vRot);p=vec2(c*p.x-s*p.y,s*p.x+c*p.y)+0.5;',
  '  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0)discard;',
  '  float col=mod(vFrame,2.0),row=floor(vFrame*0.5+0.01);',
  '  vec2 uv=vec2((col+clamp(p.x,0.01,0.99))*0.5,1.0-(row+clamp(p.y,0.01,0.99))*0.5);',
  '  vec4 t=texture2D(uMap,uv);float a=t.a*vAlpha;if(a<0.02)discard;',
  '  gl_FragColor=vec4(t.rgb*vColor,a);','}'].join('\n');
 var SMAX=160;
 function smokeInit(){var T=T3(),s={parts:[],emit:[],A:null};
  var geo=new T.BufferGeometry(),A={pos:new Float32Array(SMAX*3),col:new Float32Array(SMAX*3),alpha:new Float32Array(SMAX),size:new Float32Array(SMAX),frame:new Float32Array(SMAX),rot:new Float32Array(SMAX)};
  function attr(n,a,k){var b=new T.BufferAttribute(a,k);if(b.setUsage&&T.DynamicDrawUsage)b.setUsage(T.DynamicDrawUsage);geo.setAttribute(n,b)}
  attr('position',A.pos,3);attr('aColor',A.col,3);attr('aAlpha',A.alpha,1);attr('aSize',A.size,1);attr('aFrame',A.frame,1);attr('aRot',A.rot,1);geo.setDrawRange(0,0);
  var tex=null;try{tex=new T.TextureLoader().load(SMOKE_TEX)}catch(e){}
  var uni={uMap:{value:tex},uScale:{value:400}};
  var mat=new T.ShaderMaterial({uniforms:uni,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:true});mat.name='holm-anim-smoke';mat.userData.lookV4='fx';
  var obj=new T.Points(geo,mat);obj.name='holm-anim-smoke';obj.frustumCulled=false;obj.renderOrder=5;obj.raycast=function(){};
  var sz=new T.Vector2();obj.onBeforeRender=function(r,sc,cam){var rt=r.getRenderTarget&&r.getRenderTarget(),h=rt?rt.height:(r.getDrawingBufferSize?r.getDrawingBufferSize(sz).y:720);
   var e=cam&&cam.projectionMatrix&&cam.projectionMatrix.elements;uni.uScale.value=h*.5*(e?e[5]:2.9)};
  st.scene.add(obj);st.made.push(obj);s.obj=obj;s.geo=geo;s.A=A;return s}
 function spawnPuff(x,y,z,o){var s=st.smoke;if(!s)return;var p=null;for(var i=0;i<s.parts.length;i++)if(!s.parts[i].on){p=s.parts[i];break}
  if(!p){if(s.parts.length>=SMAX)return;p={};s.parts.push(p)}
  p.on=true;p.x=x;p.y=y;p.z=z;p.age=0;p.life=o.life;p.vx=o.vx||0;p.vy=o.vy||0;p.vz=o.vz||0;p.s0=o.s0;p.s1=o.s1;p.a0=o.a0;p.c=o.c;p.c1=o.c1||o.c;p.frame=o.frame;p.rot=rnd()*6.283;p.spin=(rnd()-.5)*.6;p.wisp=o.wisp!==false;st.stats.puffs++}
 function smokeUpdate(dt){var s=st.smoke;if(!s)return;var A=s.A,n=0;
  s.emit.forEach(function(e){if(!near(e,48))return;e.t-=dt;if(e.t>0)return;e.t=.75+rnd()*.4;
   spawnPuff(e.x+(rnd()-.5)*.12,e.y,e.z+(rnd()-.5)*.12,{life:4.2+rnd()*.8,vx:.1+rnd()*.05,vy:.5+rnd()*.12,vz:(rnd()-.5)*.06,s0:.45,s1:1.45,a0:.55,c:[.74,.72,.68],c1:[.9,.89,.87],frame:Math.floor(rnd()*3)})});
  for(var i=0;i<s.parts.length&&n<SMAX;i++){var p=s.parts[i];if(!p.on)continue;p.age+=dt;var u=p.age/p.life;if(u>=1){p.on=false;continue}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy*=Math.max(0,1-dt*.25);p.rot+=p.spin*dt;var f=puff(u,p.s0,p.s1,p.a0);
   A.pos[n*3]=p.x;A.pos[n*3+1]=p.y;A.pos[n*3+2]=p.z;for(var k=0;k<3;k++)A.col[n*3+k]=p.c[k]+(p.c1[k]-p.c[k])*u;
   A.alpha[n]=f.alpha;A.size[n]=f.size;A.frame[n]=p.wisp&&u>.7?3:p.frame;A.rot[n]=p.rot;n++}
  s.geo.setDrawRange(0,n);['position','aColor','aAlpha','aSize','aFrame','aRot'].forEach(function(k){s.geo.attributes[k].needsUpdate=true});s.obj.visible=n>0}
 // the top of a chimney: the highest small piece of its building standing over the hearth's flue (the Guide House's stack
 // is a roof part above its upper hearth's chimney breast)
 function chimneyTop(anchor){var T=T3(),root=anchor;while(root.parent&&root.parent!==st.scene)root=root.parent;root.updateMatrixWorld(true);
  var a=new T.Box3().setFromObject(anchor);if(a.isEmpty())return null;var best=null;
  root.traverse(function(m){if(!m.isMesh)return;var b=new T.Box3().setFromObject(m);if(b.isEmpty()||b.max.x-b.min.x>3||b.max.z-b.min.z>3)return;
   var cx=(b.min.x+b.max.x)/2,cz=(b.min.z+b.max.z)/2;if(cx<a.min.x-.2||cx>a.max.x+.2||cz<a.min.z-.2||cz>a.max.z+.2)return;if(!best||b.max.y>best.y)best={x:cx,y:b.max.y,z:cz}});
  return best}
 function dust(x,y,z,count,c){for(var i=0;i<count;i++){var a=i/count*6.283+rnd()*.6,r=.35+rnd()*.3;
  spawnPuff(x+Math.cos(a)*r*.4,y+.1,z+Math.sin(a)*r*.4,{life:1.1+rnd()*.4,vx:Math.cos(a)*r*.9,vy:.25+rnd()*.2,vz:Math.sin(a)*r*.9,s0:.35,s1:.95,a0:.6,c:c||[.62,.55,.42],c1:[.72,.66,.54],frame:2+Math.floor(rnd()*2),wisp:false})}}

 /* ---------------- felled oaks ---------------- */
 function fell(host){var T=T3(),src=host.children[1];if(!src||!st.curves.fallQ)return;var tree=src.clone(true);tree.visible=true;
  var g=new T.Group();g.name='island-anim-felled-'+host.name;g.position.copy(host.position);g.scale.copy(host.scale);
  var p=playerPos();g.rotation.y=fallYaw({x:host.position.x,z:host.position.z},p?{x:p.x,z:p.z}:null);
  var piv=new T.Group();piv.name='island-anim-fall-pivot';g.add(piv);piv.add(tree);st.scene.add(g);
  var bb=new T.Box3().setFromObject(tree);st.falls.push({g:g,piv:piv,t:0,landed:false,reach:Math.max(1,(bb.max.y-bb.min.y)*.6)});st.stats.falls++}
 function fallsUpdate(dt){var C=st.curves;st.falls=st.falls.filter(function(f){f.t+=dt;var q=C.fallQ(f.t);f.piv.quaternion.fromArray(q);if(C.fallP){var tp=C.fallP(f.t);f.piv.position.fromArray(tp)}
   if(!f.landed&&f.t>=1.0){f.landed=true;f.g.updateMatrixWorld(true);V.set(0,0,f.reach/Math.max(.01,f.g.scale.x));f.g.localToWorld(V);dust(V.x,f.g.position.y,V.z,7);
    if(near(f.g.position,14))sfx(function(S){S.noise(.3,240,.8,.08,'lowpass',70);S.tone(70,.22,'sine',.05,45)})}
   if(f.t>C.fallQ.duration+.05){st.scene.remove(f.g);return false}return true})}

 /* ---------------- Tobin's skiff casts off ---------------- */
 function findBoat(){var sc=st.scene,b=sc.getObjectByName('Haven_ServiceBoat_Bob');if(b)return b;sc.traverse(function(n){if(!b&&/^Haven_ServiceBoat_/.test(n.name||''))b=n});
  if(b)while(b.parent&&/^Haven_ServiceBoat_/.test(b.parent.name||''))b=b.parent;return b||null}
 function deckPoint(boat,x,z,fallbackY){var T=T3(),rc=new T.Raycaster(new T.Vector3(x,fallbackY+6,z),new T.Vector3(0,-1,0),0,12),hits=rc.intersectObject(boat,true);
  for(var i=0;i<hits.length;i++)if(hits[i].object.isMesh&&!/Rig|Mast|Sail/i.test(hits[i].object.name||''))return new T.Vector3(x,hits[i].point.y,z);return new T.Vector3(x,fallbackY,z)}
 function bellParts(){var bell=st.scene.getObjectByName('cove-bell_Bell');if(!bell)return null;var T=T3(),parts=[],top=-Infinity,cx=0,cz=0,n=0;bell.updateMatrixWorld(true);
  bell.children.forEach(function(m){if(!m.isMesh)return;var b=new T.Box3().setFromObject(m);if(b.max.y-b.min.y>.7)return;parts.push(m);if(b.max.y>top)top=b.max.y;var c=b.getCenter(new T.Vector3());cx+=c.x;cz+=c.z;n++});
  if(!parts.length)return null;var hang=new T.Vector3(cx/n,top+.02,cz/n);
  return {parts:parts.map(function(m){var piv=m.worldToLocal(hang.clone());return {m:m,rest:restOf(m),pivot:piv.toArray()}})}}
 function sail(cb){
  var T=T3(),C=st.curves;if(!st.on||!C.boatP||!C.boatQ||st.sail){return false}
  var boat=findBoat();if(!boat)return false;
  boat.updateMatrixWorld(true);var hull=st.scene.getObjectByName('Haven_ServiceBoat_Hull')||boat,hb=new T.Box3().setFromObject(hull),hc=hb.getCenter(new T.Vector3());
  var hm=st.models.haven&&st.models.haven.actions,idle=hm&&(hm.HavenBoatIdleBob||null);if(idle)idle.stop();
  var pq=boat.parent?boat.parent.getWorldQuaternion(new T.Quaternion()):new T.Quaternion(),pqi=pq.clone().invert();
  var deck=deckPoint(boat,hc.x,hc.z+(hb.max.z-hb.min.z)*.12,hb.min.y+(hb.max.y-hb.min.y)*.55),stern=deckPoint(boat,hc.x,hb.max.z-.9,deck.y);
  var s={t:0,cb:cb,boat:boat,rest:restOf(boat),pq:pq,pqi:pqi,deck:boat.worldToLocal(deck.clone()),stern:boat.worldToLocal(stern.clone()),idle:idle,rung:0,done:false,after:0,
   pivot:boat.worldToLocal(new T.Vector3(hc.x,hb.min.y,hc.z)).toArray()};   // the keel's middle: the boat node's own origin is the haven's, far up the pier
  var plank=st.scene.getObjectByName('Haven_ServiceBoat_Gangplank');if(plank){s.plank=plank;s.plankRest=restOf(plank)}
  var tob=st.scene.getObjectByName('island-tutor-tobin');if(tob){s.tobin=tob;s.tobinRest=restOf(tob)}
  s.bell=bellParts();st.sail=s;st.stats.sails++;if(s.bell)st.stats.bells++;
  return true}
 function sailUpdate(dt){var s=st.sail;if(!s)return;var C=st.curves,T=T3();s.t+=dt;var t=Math.min(s.t,C.boatP.duration);
  var off=C.boatP(t),q=C.boatQ(t);V.fromArray(off).applyQuaternion(s.pqi);Q.fromArray(q).premultiply(s.pqi).multiply(s.pq);
  var r=about(s.rest,s.pivot,Q.toArray());put(s.boat,r);s.boat.position.add(V);s.boat.updateMatrixWorld(true);
  if(s.plank&&C.plankP){var po=C.plankP(t);s.plank.position.fromArray(s.plankRest.p);s.plank.position.x+=po[0];s.plank.position.y+=po[1];s.plank.position.z+=po[2]}
  var p=playerPos();if(p&&!s.done){V2.copy(s.deck);s.boat.localToWorld(V2);p.copy(V2);if(typeof player!=='undefined')player.lookAt(V2.x,V2.y,V2.z-1)}
  if(s.tobin){V2.copy(s.stern);s.boat.localToWorld(V2);s.tobin.position.copy(V2);s.tobin.lookAt(V2.x,V2.y,V2.z-1)}
  if(s.bell&&C.bellQ){var bq=C.bellQ(Math.min(s.t,C.bellQ.duration));s.bell.parts.forEach(function(b){put(b.m,dictAbout(b.rest,b.pivot,bq))});
   var dings=[.18,.54,.9];while(s.rung<dings.length&&s.t>=dings[s.rung]){var v=[.05,.035,.022][s.rung];s.rung++;sfx(function(S){S.tone(988,1.1,'sine',v);S.tone(1976,.5,'sine',v*.35);S.tone(1318,.8,'triangle',v*.25)})}}
  if(!s.done&&s.t>=C.boatP.duration){s.done=true;var cb=s.cb;try{cb&&cb()}catch(e){console.error('[HolmIslandAnim] crossing',e)}}
  if(s.done){s.after+=dt;if(s.after>6&&st.on)restoreSail()}}   // the crossing did not happen (the island is still here): put the cove back
 function restoreSail(){var s=st.sail;if(!s)return;put(s.boat,s.rest);if(s.plank)put(s.plank,s.plankRest);if(s.tobin)put(s.tobin,s.tobinRest);if(s.bell)s.bell.parts.forEach(function(b){put(b.m,b.rest)});
  if(s.idle)s.idle.play();st.sail=null}
 function dictAbout(rest,pivot,q,m){return about(rest,pivot,[q[0],q[1],q[2],q[3]],m)}

 /* ---------------- the rope pays out down the shaft ---------------- */
 function ropeUpdate(dt){var r=st.rope;if(!r){var g=st.scene.getObjectByName('island-shaft-rope-quarry-shaft');if(!g)return;var T=T3(),node=g.children[0];if(!node)return;
   g.updateMatrixWorld(true);var bb=new T.Box3().setFromObject(node),top=new T.Vector3((bb.min.x+bb.max.x)/2,bb.max.y,(bb.min.z+bb.max.z)/2);
   st.rope={g:g,node:node,rest:restOf(node),pivot:node.worldToLocal(top.clone()).toArray(),top:{x:top.x,y:top.y,z:top.z},was:g.visible,t:-1};return}   // the knot: the rope hangs from it
  var vis=r.g.visible;if(vis&&!r.was&&st.curves.ropeS&&near(r.top,6)){r.t=0;st.stats.ropeDrops++}r.was=vis;   // tied by the adventurer standing there (a restored save's rope just hangs)
  if(r.t>=0){r.t+=dt;var s=st.curves.ropeS(r.t);put(r.node,about(r.rest,r.pivot,null,[1,s[1],1]));if(r.t>=st.curves.ropeS.duration){put(r.node,r.rest);r.t=-1}}}

 /* ---------------- building doors swing as the adventurer passes (driver for HolmIslandGates) ---------------- */
 function doorCurves(){var C=st.curves;if(!C.doorOpen||!C.doorClose)return null;if(st.doorC)return st.doorC;var step=1/60,o=[],c=[];
  for(var t=0;t<=C.doorOpen.duration+1e-6;t+=step)o.push(yawOf(C.doorOpen(t))/(Math.PI/2));for(t=0;t<=C.doorClose.duration+1e-6;t+=step)c.push(yawOf(C.doorClose(t))/(Math.PI/2));
  o[o.length-1]=1;c[c.length-1]=0;return (st.doorC={open:o,close:c,step:step})}
 function doorDriver(dt,list){var curves=doorCurves(),p=playerPos();if(!curves)return;var route=typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.route?HolmArrivalPlayer.route():[];
  list.forEach(function(d){var s=st.doors[d.id];var want=!!d.open&&doorWant(d.center,p,route);
   if(!s){s=st.doors[d.id]={mode:want?'open':'closed',k:want?1:0,t:0,away:0};d.set(s.k);return}
   doorStep(s,want,dt,curves);d.set(s.k);
   if(s.event==='open'){st.stats.doorOpens++;if(near(d.center,8))sfxF('chestOpen',.6)}else if(s.event==='close'){st.stats.doorCloses++;if(near(d.center,8))sfxF('chestClose',.6)}})}

 // building doors that are not progress gates but stand across a walkable doorway: the bakehouse store door (hinged at its
 // north end, it swings east into the store room)
 var FREE_DOORS=[{node:'Kitchen_Shell_StoreDoor',hinge:'minZ',max:Math.PI*.44}];
 function freeDoorsLoad(){var T=T3();FREE_DOORS.forEach(function(f){var n=st.scene.getObjectByName(f.node);if(!n)return;n.updateMatrixWorld(true);var b=new T.Box3().setFromObject(n);if(b.isEmpty())return;
  var along=(b.max.z-b.min.z)>=(b.max.x-b.min.x)?'z':'x',h=new T.Vector3(along==='x'?(f.hinge==='maxX'?b.max.x:b.min.x):(b.min.x+b.max.x)/2,b.min.y,along==='z'?(f.hinge==='maxZ'?b.max.z:b.min.z):(b.min.z+b.max.z)/2);
  st.free.push({id:f.node,node:n,rest:restOf(n),pivot:n.worldToLocal(h.clone()).toArray(),max:f.max,center:{x:(b.min.x+b.max.x)/2,y:b.min.y,z:(b.min.z+b.max.z)/2},s:{mode:'closed',k:0,t:0,away:0}})})}
 function freeDoorsUpdate(dt){if(!st.free.length)return;var curves=doorCurves(),p=playerPos();if(!curves)return;var route=typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.route?HolmArrivalPlayer.route():[];
  st.free.forEach(function(d){doorStep(d.s,doorWant(d.center,p,route),dt,curves);var a=d.s.k*d.max;put(d.node,about(d.rest,d.pivot,[0,Math.sin(a/2),0,Math.cos(a/2)]));
   if(d.s.event==='open'){st.stats.doorOpens++;sfxF('chestOpen',.5)}else if(d.s.event==='close'){st.stats.doorCloses++;sfxF('chestClose',.5)}})}

 /* ---------------- smithing, smelting ---------------- */
 function handOf(){var p=typeof player!=='undefined'?player:null;if(!p)return null;if(st.handOf===p&&st.hand)return st.hand;st.handOf=p;st.hand=null;p.traverse(function(o){if(!st.hand&&/RightHand$/.test(o.name||''))st.hand=o});return st.hand}
 function forgeUpdate(dt){var a=typeof Player!=='undefined'&&Player.action,p=playerPos();
  // anvil: a strike is the hand's lowest point in the smith stroke (read live, so a retimed clip stays in step)
  var gm=typeof player!=='undefined'&&player&&player.userData&&player.userData.gmix,sm=gm&&gm.clips&&gm.clips.smith;
  if(a&&a.type==='smith'&&a.obj&&p&&Math.hypot(p.x-a.obj.position.x,p.z-a.obj.position.z)<3.2&&sm&&sm.isRunning()){var h=handOf(),ct=sm.time;
    if(ct<st.smPrev-1e-3)st.struck=false;                                        // a new stroke
    var hit=!!(h&&(h.getWorldPosition(V),st.det.push(V.y-p.y)));
    if(!hit&&!st.struck&&st.smPrev<STRIKE_LATE&&ct>=STRIKE_LATE)hit=true;          // a dropped frame never loses the blow
    if(hit&&!st.struck){st.struck=true;st.stats.strikes++;var ok=typeof HolmIslandFx!=='undefined'&&HolmIslandFx.spark&&HolmIslandFx.spark();if(ok)st.stats.sparks++;
     sfx(function(S){S.tone(2350,.05,'square',.02,1500);S.noise(.05,3600,3,.02,'highpass')})}
    st.smPrev=ct}
  else{st.det.reset();st.smPrev=0;st.struck=false}
  // furnace: the glow flares (stepped) and the bellows pump while the adventurer smelts
  var f=st.furnace,smelting=!!(a&&a.type==='smelt'&&a.obj&&p&&Math.hypot(p.x-a.obj.position.x,p.z-a.obj.position.z)<3.5);
  if(smelting&&!st.wasSmelting)st.stats.flarings++;st.wasSmelting=smelting;
  if(f&&f.glow){var k=smelting?1.18+.1*(Math.floor(st.T*7.5)%2):1;f.glow.scale.setScalar(k)}
  var b=st.bellows;if(b&&st.curves.pumpS){if(smelting){b.t+=dt;var sc=st.curves.pumpS(b.t);put(b.node,about(b.rest,b.pivot,null,[sc[0],sc[1],sc[2]]));b.moved=true}else if(b.moved){put(b.node,b.rest);b.moved=false;b.t=0}}}

 /* ---------------- banking ---------------- */
 function bankUpdate(dt){var bk=st.bank;if(!bk)return;var el=bk.el||(bk.el=typeof document!=='undefined'?document.getElementById('bank-modal'):null);var open=!!(el&&el.style.display==='block');
  if(open&&!bk.open){bk.station=bankStation(playerPos(),bk.vault,bk.counter);
   if(bk.station==='vault'&&bk.gate){bk.mode='opening';bk.t=0;st.stats.bankVault++;sfxF('chestOpen',.6)}
   else if(bk.station==='counter'){st.stats.bankCounter++;if(typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.gesture)HolmIslandTutors.gesture('maud','talk');sfx(function(S){S.coin()})}}
  if(!open&&bk.open){if(bk.station==='vault'&&bk.gate){bk.mode='closing';bk.t=0;sfxF('chestClose',.6)}else if(bk.station==='counter'&&typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.gesture)HolmIslandTutors.gesture('maud','idle');bk.station=open?bk.station:null}
  bk.open=open;var c=doorCurves();if(bk.gate&&c&&bk.mode){bk.t+=dt;var arr=bk.mode==='opening'?c.open:c.close,i=Math.min(arr.length-1,Math.round(bk.t/c.step)),k=arr[i];
   put(bk.gate.node,about(bk.gate.rest,bk.gate.pivot,[0,Math.sin(k*bk.gate.max/2),0,Math.cos(k*bk.gate.max/2)]));if(i>=arr.length-1)bk.mode=null}}

 /* ---------------- (removed 2026-09-29: death clips and the farm's animals belong to the creatures pass) ---------------- */

 /* ---------------- torches ---------------- */
 function torchesUpdate(){if(!st.torches.length||!st.curves.flameS)return;var s=st.curves.flameS(st.T)[1];
  st.torches.forEach(function(m){if(m.emissive&&m.userData.holmBaseEI!==undefined)m.emissiveIntensity=m.userData.holmBaseEI*s;if(m.color&&m.userData.holmBaseC)m.color.setRGB(m.userData.holmBaseC[0]*(.85+.15*s),m.userData.holmBaseC[1]*(.85+.15*s),m.userData.holmBaseC[2]*(.85+.15*s))})}

 /* ================================================================ load / update / dispose */
 async function load(o){
  var T=o.THREE;st.THREE=T;st.scene=o.scene;st.models=o.models||{};st.api=o.api||null;V=new T.Vector3();V2=new T.Vector3();Q=new T.Quaternion();st.det=strikeDetector(.25);
  st.gltf=await parse(asset(MOTIONS));
  var C=st.curves;
  C.fallQ=curve('Fall','tree-fall_Pivot','quaternion');C.fallP=curve('Fall','tree-fall_Pivot','position');
  C.boatP=curve('CastOff','ferry-castoff_Boat','position');C.boatQ=curve('CastOff','ferry-castoff_Boat','quaternion');C.plankP=curve('CastOff','ferry-castoff_Plank','position');
  C.bellQ=curve('Swing','bell-swing_Bell','quaternion');C.ropeS=curve('Drop','rope-drop_Rope','scale');
  C.doorOpen=curve('Open','door-swing_Leaf','quaternion');C.doorClose=curve('Close','door-swing_Leaf','quaternion');
  C.pumpS=curve('Pump','bellows-pump_Board','scale',true);C.flameS=curve('Flicker','flame-flicker_Flame','scale',true);
  // the teaching oaks (the game hides the tree and keeps the stump when one is felled)
  st.scene.traverse(function(n){if(/^island-lesson-survival-oak-/.test(n.name||''))st.trees.push({host:n,alive:n.userData.alive!==false})});
  // furnace glow (holm-props-v4, placed by HolmIslandFx) and the bellows beside it
  st.furnace={glow:st.scene.getObjectByName('furnace-glow')};
  var bw=st.scene.getObjectByName('Cavern_FurnishingPropsBellows');if(bw){bw.updateMatrixWorld(true);var bb=new T.Box3().setFromObject(bw),base=new T.Vector3((bb.min.x+bb.max.x)/2,bb.min.y,(bb.min.z+bb.max.z)/2);
   st.bellows={node:bw,rest:restOf(bw),pivot:bw.worldToLocal(base.clone()).toArray(),t:0,moved:false}}
  // the bank: the vault gate turns about its west end (60 degrees, clear of the chests); the stations' stances
  var gate=st.scene.getObjectByName('Bank_ServiceVault_Gate'),bank={open:false,station:null,mode:null,t:0,gate:null};
  if(st.api&&st.api.qaStance){bank.vault=st.api.qaStance('bank','vault');bank.counter=st.api.qaStance('bank','counter')}
  if(gate){gate.updateMatrixWorld(true);var gb=new T.Box3().setFromObject(gate),hinge=new T.Vector3(gb.min.x,(gb.min.y+gb.max.y)/2,(gb.min.z+gb.max.z)/2);
   bank.gate={node:gate,rest:restOf(gate),pivot:gate.worldToLocal(hinge.clone()).toArray(),max:Math.PI/3}}
  st.bank=bank;
  // cavern wall torches (one merged mesh for all three flames: they flicker by brightness, the Blender curve's height)
  var tf=st.scene.getObjectByName('Cavern_TorchFlame');if(tf)tf.traverse(function(m){if(!m.isMesh)return;[].concat(m.material).forEach(function(q){if(!q||st.torches.indexOf(q)>=0)return;
   if(q.emissive)q.userData.holmBaseEI=q.emissiveIntensity;if(q.color)q.userData.holmBaseC=[q.color.r,q.color.g,q.color.b];st.torches.push(q)})});
  // chimney smoke over the lit hearths (Guide House, bakehouse, Quest Lodge, bank)
  st.smoke=smokeInit();
  ['UpperHearthChimney','Kitchen_Chimney_Stack','Lodge_Chimney_Light_gray_limestone','Bank_UpperChimney'].forEach(function(nm,i){var c=st.scene.getObjectByName(nm);if(!c)return;var top=chimneyTop(c);
   if(top)st.smoke.emit.push({name:nm,x:top.x,y:top.y+.08,z:top.z,t:i*.3})});
  freeDoorsLoad();
  st.on=true;
  return {curves:Object.keys(C).filter(function(k){return !!C[k]}).length,trees:st.trees.length,bellows:!!st.bellows,vaultGate:!!st.bank.gate,torches:st.torches.length,chimneys:st.smoke.emit.length,freeDoors:st.free.length};
 }
 function update(dt){if(!st.on||!(dt>0))return;dt=Math.min(dt,.1);st.T+=dt;
  // doors: hand the gates' leaves to this driver once the gates exist
  if(!st.driverSet&&typeof HolmIslandGates!=='undefined'&&HolmIslandGates.setDriver&&doorCurves()){HolmIslandGates.setDriver(doorDriver);st.driverSet=true}
  st.trees.forEach(function(tr){var alive=tr.host.userData.alive!==false;if(tr.alive&&!alive)fell(tr.host);tr.alive=alive});
  fallsUpdate(dt);sailUpdate(dt);ropeUpdate(dt);freeDoorsUpdate(dt);forgeUpdate(dt);bankUpdate(dt);torchesUpdate();smokeUpdate(dt);
 }
 function dispose(){if(st.sail)restoreSail();if(typeof HolmIslandGates!=='undefined'&&HolmIslandGates.setDriver&&st.driverSet)HolmIslandGates.setDriver(null);
  st.falls.forEach(function(f){if(f.g.parent)f.g.parent.remove(f.g)});st.falls=[];
  var W=typeof WORLD!=='undefined'?WORLD:null;
  st.made.forEach(function(o){if(o.parent)o.parent.remove(o);if(W)o.traverse(function(m){var k=W.clickables.indexOf(m);if(k>=0)W.clickables.splice(k,1)})});st.made=[];
  if(st.rope&&st.rope.node)put(st.rope.node,st.rope.rest);if(st.bellows)put(st.bellows.node,st.bellows.rest);if(st.bank&&st.bank.gate)put(st.bank.gate.node,st.bank.gate.rest);st.free.forEach(function(d){put(d.node,d.rest)});st.free=[];
  st.torches.forEach(function(m){if(m.userData.holmBaseEI!==undefined)m.emissiveIntensity=m.userData.holmBaseEI;if(m.userData.holmBaseC)m.color.setRGB(m.userData.holmBaseC[0],m.userData.holmBaseC[1],m.userData.holmBaseC[2])});
  st.trees=[];st.torches=[];st.doors={};st.driverSet=false;st.rope=null;st.smoke=null;st.on=false}
 function status(){return {on:st.on,stats:Object.assign({},st.stats),falls:st.falls.length,sailing:!!st.sail,doors:Object.keys(st.doors).reduce(function(o,k){o[k]={mode:st.doors[k].mode,k:+st.doors[k].k.toFixed(3)};return o},st.free.reduce(function(o,d){o[d.id]={mode:d.s.mode,k:+d.s.k.toFixed(3)};return o},{})),
  smoke:st.smoke?{emitters:st.smoke.emit.length,live:st.smoke.parts.filter(function(p){return p.on}).length}:null,
  bank:st.bank?{open:st.bank.open,station:st.bank.station,gate:!!st.bank.gate}:null,rope:st.rope?{t:st.rope.t}:null}}
 return {load:load,update:update,dispose:dispose,sail:sail,status:status,
  // pure rules (tools/test_holm_anim_pass.js)
  fallYaw:fallYaw,strikeDetector:strikeDetector,doorWant:doorWant,doorStep:doorStep,wanderPick:wanderPick,bankStation:bankStation,puff:puff,about:about,
  DOOR:{near:DOOR_NEAR,route:DOOR_ROUTE,ahead:DOOR_AHEAD,shutAfter:DOOR_SHUT_AFTER},URLS:{motions:MOTIONS,smoke:SMOKE_TEX}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandAnim;
