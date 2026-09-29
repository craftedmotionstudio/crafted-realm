/* ================= FALLING OAK LEAVES — owner request 2026-09-29 =================
 * Owner: "All the oak trees are dropping squares. If you could turn those squares into the occasional oak tree leaf,
 * something small, that would be pretty cool." The squares were src/fx_atmosphere.js's 36 flat orange planes cycling
 * down round the first trees it found (on Tutor's Holm: the three teaching oaks, twelve squares each, all the time).
 * Now, the odd oak leaf:
 *   - hosts: oaks only (the island's teaching oaks "Chop down Oak", the mainland's oak hardwoods) plus the Emberwood's
 *     autumn trees, which kept their falling leaves (the same oak-shaped tree model; they drop only the amber and russet
 *     leaves). Willows, yews, maples, dead and other trees drop nothing, as before. A felled tree drops nothing;
 *   - rare: each tree lets a leaf go every 6-14 s, only within 30 tiles of the adventurer, at most 8 leaves at once;
 *   - a leaf leaves from the crown (measured from the tree's own model), rocks side to side like a falling leaf (some
 *     turn right over), drifts with a slow wind, lands flat on the ground, rests ~2-3 s and fades out;
 *   - art: assets/textures/fx/oak_leaves_v1.png, four low-poly oak leaves modelled and rendered in Blender
 *     (tools/blender/build_fx_sprites_v1.py): autumn green, olive gold, amber, russet;
 *   - one mesh for every leaf (one draw call while any leaf is out, none otherwise; the old squares were 36 meshes all
 *     the time), lit like the scenery, never picked by a click (no raycast), never Math.random (a private LCG).
 * Started and stopped with the Atmosphere layer (its overlay toggle); animate() -> update(dt). */
var LeafFall=(function(){
 'use strict';
 var TEX_URL='assets/textures/fx/oak_leaves_v1.png';
 var MAX=8,NEAR=30,GAP=[6,14],REFRESH=4;
 var OAK_FRAMES=[0,0,0,1,1,1,2,2,3],AUTUMN_FRAMES=[2,2,2,3,3,1];   // 0 autumn green, 1 olive gold, 2 amber, 3 russet
 var seed=0x1eaf05;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}   // never Math.random
 var st={on:false,t:0,refreshT:0,hosts:[],byObj:null,leaves:[],mesh:null,geo:null,tex:null,spawned:0,landed:0,faded:0,skippedFull:0};
 var Q=null,E=null,C=null,N=null;

 function label(u){return String(u&&u.label||'').replace(/<[^>]+>/g,'')}
 function isOak(g){var u=g.userData||{};return u.species==='oak'||/\boak\b/i.test(label(u))}
 function autumn(g){try{return typeof zoneAt==='function'&&zoneAt(g.position.x,g.position.z)==='emberwood'}catch(e){return false}}
 function refreshHosts(){
  var res=(typeof WORLD!=='undefined'&&WORLD.resources)||[],keep=[],seen=st.byObj||new Map(),next=new Map();
  for(var i=0;i<res.length;i++){var g=res[i];if(!g||!g.userData||g.userData.rtype!=='tree')continue;
   var oak=isOak(g),aut=!oak&&autumn(g);if(!oak&&!aut)continue;
   var h=seen.get(g)||{g:g,frames:oak?OAK_FRAMES:AUTUMN_FRAMES,next:1+rnd()*GAP[1],crown:null};next.set(g,h);keep.push(h)}
  st.byObj=next;st.hosts=keep;
 }
 function crownOf(h){
  if(h.crown)return h.crown;var g=h.g,c={x:g.position.x,z:g.position.z,r:.8,y0:g.position.y+2,y1:g.position.y+3,base:g.position.y};
  try{var b=new THREE.Box3().setFromObject(g),hgt=b.max.y-b.min.y;
   if(Number.isFinite(hgt)&&hgt>.5){c.x=(b.min.x+b.max.x)/2;c.z=(b.min.z+b.max.z)/2;c.r=Math.max(.4,Math.min(b.max.x-b.min.x,b.max.z-b.min.z)*.32);
    c.base=b.min.y;c.y0=b.min.y+hgt*.55;c.y1=b.min.y+hgt*.85}}catch(e){}
  return (h.crown=c);
 }
 function ground(x,z,fallback){try{if(typeof groundY==='function'){var y=groundY(x,z);if(y!==null&&Number.isFinite(y))return y}}catch(e){}return fallback}

 /* ---------------- the one mesh ---------------- */
 function ensure(){
  if(st.mesh)return true;if(typeof THREE==='undefined'||typeof scene==='undefined'||!scene)return false;
  Q=new THREE.Quaternion();E=new THREE.Euler(0,0,0,'YXZ');C=new THREE.Vector3();N=new THREE.Vector3();
  var geo=new THREE.BufferGeometry(),pos=new Float32Array(MAX*12),nrm=new Float32Array(MAX*12),uv=new Float32Array(MAX*8),col=new Float32Array(MAX*16),idx=[];
  for(var i=0;i<MAX;i++){var o=i*4;idx.push(o,o+1,o+2,o,o+2,o+3)}
  function dyn(a,n){var b=new THREE.BufferAttribute(a,n);if(b.setUsage&&THREE.DynamicDrawUsage)b.setUsage(THREE.DynamicDrawUsage);return b}
  geo.setIndex(idx);geo.setAttribute('position',dyn(pos,3));geo.setAttribute('normal',dyn(nrm,3));geo.setAttribute('uv',dyn(uv,2));geo.setAttribute('color',dyn(col,4));
  try{st.tex=new THREE.TextureLoader().load(TEX_URL)}catch(e){st.tex=null}
  var m=new THREE.MeshLambertMaterial({map:st.tex,vertexColors:true,transparent:true,alphaTest:.05,side:THREE.DoubleSide,depthWrite:false,
   polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  m.name='fx-falling-foliage';
  var mesh=new THREE.Mesh(geo,m);mesh.name='fx-falling-oak-leaves';mesh.frustumCulled=false;mesh.renderOrder=3;mesh.visible=false;
  mesh.raycast=function(){};                                  // never takes a click
  scene.add(mesh);st.mesh=mesh;st.geo=geo;
  for(var j=0;j<MAX;j++)st.leaves.push({on:false,slot:j});
  return true;
 }

 /* ---------------- one leaf ---------------- */
 function drop(h){
  if(!ensure())return null;var lf=null;for(var i=0;i<st.leaves.length;i++)if(!st.leaves[i].on){lf=st.leaves[i];break}
  if(!lf){st.skippedFull++;return null}
  var c=crownOf(h),a=rnd()*6.283,r=c.r*Math.sqrt(rnd());
  lf.on=true;lf.phase='fall';lf.t=0;lf.x0=c.x+Math.cos(a)*r;lf.z0=c.z+Math.sin(a)*r;lf.y=c.y0+(c.y1-c.y0)*rnd();lf.base=c.base;
  lf.x=lf.x0;lf.z=lf.z0;lf.dx=0;lf.dz=0;
  lf.vy=.75+rnd()*.25;lf.swayA=.3+rnd()*.25;lf.swayW=1.9+rnd()*.9;lf.ph=rnd()*6.283;lf.dir=rnd()*6.283;
  lf.yaw0=rnd()*6.283;lf.spinY=(rnd()-.5)*1.4;lf.rock=.7+rnd()*.35;lf.flip=rnd()<.3?(rnd()<.5?-1:1)*(2.5+rnd()*2):0;
  lf.size=.2+rnd()*.07;lf.frame=h.frames[Math.floor(rnd()*h.frames.length)];lf.bright=.92+rnd()*.12;
  lf.rest=2+rnd()*1.2;lf.fadeT=1.2;lf.alpha=0;lf.dirty=true;st.spawned++;return lf;
 }
 function stepLeaf(lf,dt,wx,wz){
  lf.t+=dt;
  if(lf.phase==='fall'){
   lf.y-=lf.vy*dt;lf.dx+=wx*dt;lf.dz+=wz*dt;
   var s=Math.sin(lf.swayW*lf.t+lf.ph)*lf.swayA;
   lf.x=lf.x0+lf.dx+Math.cos(lf.dir)*s;lf.z=lf.z0+lf.dz+Math.sin(lf.dir)*s;
   lf.alpha=Math.min(1,lf.t/.35);
   // rocking about the leaf's own cross axis with the sway (a tumbler turns right over instead), a slow turn about the
   // vertical and a small wiggle in its own plane
   lf.pitch=-Math.PI/2+(lf.flip?lf.flip*lf.t:Math.cos(lf.swayW*lf.t+lf.ph)*lf.rock);lf.yawNow=lf.yaw0+lf.spinY*lf.t;lf.roll=Math.sin(lf.t*1.3+lf.ph)*.35;
   var gy=ground(lf.x,lf.z,lf.base);
   if(lf.y<=gy+.04){lf.y=gy+.04;lf.phase='rest';lf.t=0;lf.pitch=-Math.PI/2+(rnd()-.5)*.12;lf.roll=0;st.landed++}
   else if(lf.t>20){lf.phase='fade';lf.t=0}                    // never falls for ever (a hole in the ground)
  }else if(lf.phase==='rest'){lf.alpha=1;if(lf.t>=lf.rest){lf.phase='fade';lf.t=0}}
  else{lf.alpha=Math.max(0,1-lf.t/lf.fadeT);if(lf.t>=lf.fadeT){lf.on=false;st.faded++}}
 }
 function write(lf){
  var g=st.geo,P=g.attributes.position.array,Nm=g.attributes.normal.array,U=g.attributes.uv.array,Cl=g.attributes.color.array,o=lf.slot*4,k;
  if(!lf.on){for(k=0;k<4;k++){P[(o+k)*3]=P[(o+k)*3+1]=P[(o+k)*3+2]=0;Cl[(o+k)*4+3]=0}return}
  E.set(lf.pitch,lf.yawNow,lf.roll,'YXZ');Q.setFromEuler(E);N.set(0,0,1).applyQuaternion(Q);
  var hs=lf.size/2,cs=[[-hs,-hs],[hs,-hs],[hs,hs],[-hs,hs]];
  var u0=(lf.frame%2)*.5,v0=.5-Math.floor(lf.frame/2)*.5,uvs=[[u0,v0],[u0+.5,v0],[u0+.5,v0+.5],[u0,v0+.5]];
  for(k=0;k<4;k++){C.set(cs[k][0],cs[k][1],0).applyQuaternion(Q);var i=o+k;
   P[i*3]=lf.x+C.x;P[i*3+1]=lf.y+C.y;P[i*3+2]=lf.z+C.z;Nm[i*3]=N.x;Nm[i*3+1]=N.y;Nm[i*3+2]=N.z;
   U[i*2]=uvs[k][0];U[i*2+1]=uvs[k][1];Cl[i*4]=Cl[i*4+1]=Cl[i*4+2]=lf.bright;Cl[i*4+3]=lf.alpha}
 }

 /* ---------------- frame hook ---------------- */
 function update(dt){
  if(!st.on)return;dt=Math.min(.1,Math.max(0,dt||0));st.t+=dt;
  st.refreshT-=dt;if(st.refreshT<=0){st.refreshT=REFRESH;refreshHosts()}
  var p=typeof player!=='undefined'&&player?player.position:null,i;
  for(i=0;i<st.hosts.length;i++){var h=st.hosts[i],g=h.g;h.next-=dt;if(h.next>0)continue;h.next=GAP[0]+rnd()*(GAP[1]-GAP[0]);
   if(!g.parent||g.visible===false||(g.userData&&g.userData.alive===false))continue;
   if(p&&Math.hypot(g.position.x-p.x,g.position.z-p.z)>NEAR)continue;
   drop(h)}
  if(!st.mesh)return;
  var wa=.6+.5*Math.sin(st.t*.07),ws=.14+.06*Math.sin(st.t*.23),wx=Math.cos(wa)*ws,wz=Math.sin(wa)*ws,any=false;
  for(i=0;i<st.leaves.length;i++){var lf=st.leaves[i];if(lf.on){stepLeaf(lf,dt,wx,wz);any=true;write(lf);lf.dirty=true}else if(lf.dirty){write(lf);lf.dirty=false}}
  st.mesh.visible=any;
  if(any){var a=st.geo.attributes;a.position.needsUpdate=a.normal.needsUpdate=a.uv.needsUpdate=a.color.needsUpdate=true}
 }
 function start(){if(st.on)return;st.on=true;st.refreshT=0;refreshHosts();ensure()}
 function stop(){st.on=false;for(var i=0;i<st.leaves.length;i++)st.leaves[i].on=false;if(st.mesh){st.mesh.visible=false;if(st.mesh.parent)st.mesh.parent.remove(st.mesh)}
  st.mesh=null;st.geo=null;st.leaves=[]}
 // QA: let one leaf go from the n-th host now (read-only otherwise)
 function qaDrop(n){if(!st.on)return null;if(!st.hosts.length)refreshHosts();var h=st.hosts[n||0],lf=h?drop(h):null;return lf?lf.slot:null}
 function stats(){var f=0,r=0,d=0;for(var i=0;i<st.leaves.length;i++){var l=st.leaves[i];if(!l.on)continue;if(l.phase==='fall')f++;else if(l.phase==='rest')r++;else d++}
  return {on:st.on,hosts:st.hosts.length,hostLabels:st.hosts.map(function(h){return label(h.g.userData)||h.g.name}).slice(0,6),max:MAX,falling:f,resting:r,fading:d,
   spawned:st.spawned,landed:st.landed,faded:st.faded,skippedFull:st.skippedFull,meshVisible:!!(st.mesh&&st.mesh.visible),inScene:!!(st.mesh&&st.mesh.parent),
   texture:TEX_URL,textureLoaded:!!(st.tex&&st.tex.image),map:!!(st.mesh&&st.mesh.material.map)}}
 // QA read-out: where the leaves are (never used by the game)
 function qaLeaves(){return st.leaves.filter(function(l){return l.on}).map(function(l){return {slot:l.slot,x:+l.x.toFixed(2),y:+l.y.toFixed(2),z:+l.z.toFixed(2),phase:l.phase,frame:l.frame,alpha:+l.alpha.toFixed(2)}})}
 return {start:start,stop:stop,update:update,stats:stats,qaDrop:qaDrop,qaLeaves:qaLeaves,TEX_URL:TEX_URL,MAX:MAX,GAP:GAP};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LeafFall;
