/* ============ OnlineKit — the Blender Scarlands art kit drawn from a placement list (W2/W3) ============
 * When the server's map names a placement (map.placement, written by tools/scarlands_kit.js; format in
 * docs/rebuild/scarlands/README.md), the online world draws the kit instead of its own ground and walls:
 *   - the ground grid: one kind per tile (grass, dirt, burnt grass, scorched earth, ash, cracked mud, dark rock, bone
 *     dirt), a blended underlay per corner, gouraud light baked from the corner heights, the kit's ground texture of
 *     each kind multiplied in as detail; the carved Ditch tiles drawn with their own lowered corners;
 *   - every piece as one InstancedMesh per mesh primitive (dozens of draw calls for the whole map);
 *   - heights for entities: the corner-height surface, the trench bed in cut tiles, the deck over a crossing.
 * The kit uses server coordinates in a scene with north = -z; OnlineWorld's scene is shifted (x - x1, z2 + 1 - z), so
 * everything here lives in one group placed at (-x1, 0, z2 + 1). Without a placement nothing here runs.
 */
var OnlineKit=(function(){
 'use strict';
 var KIND_TEX={grass:'grass_a',dirt:'dirt',burnt_grass:'burnt_grass',scorched_earth:'scorched_earth',ash:'ash',cracked_mud:'cracked_mud',dark_rock:'dark_rock',bone_dirt:'bone_dirt'};
 var LOOK={light:[.52,.62,.58],ambient:.55,diffuse:.72,min:.55,max:1.32,scale:.76,patch:.13,jitter:.07};
 var TEX='assets/textures/oldschool/';   // overridable per map (map.kitTextures)
 var st={place:null,G:null,cut:null,walk:null,kit:null,group:null,stats:{instancedMeshes:0,instances:0,pieces:0},covered:null};
 function json(u){return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error(u+' '+r.status);return r.json()})}
 function texture(name){return new Promise(function(res,rej){new THREE.TextureLoader().load(TEX+name+'.png',function(t){
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;if(THREE.LinearEncoding!==undefined)t.encoding=THREE.LinearEncoding;res(t)},undefined,rej)})}
 function rnd(x,z,k){var s=Math.sin(x*127.1+z*311.7+k*74.7)*43758.5453;return s-Math.floor(s)}
 function patch(x,z){var fx=x/5,fz=z/5,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,w=fz-iz;u=u*u*(3-2*u);w=w*w*(3-2*w);
  function q(a,b){return rnd(a,b,9)*2-1}return (q(ix,iz)*(1-u)+q(ix+1,iz)*u)*(1-w)+(q(ix,iz+1)*(1-u)+q(ix+1,iz+1)*u)*w}
 function cornerH(cx,cz){var G=st.G;cx=Math.max(0,Math.min(G.width,cx));cz=Math.max(0,Math.min(G.depth,cz));return G.cornerHeights[cz*(G.width+1)+cx]}
 /** uncut ground at a server point (tile units, x east, z north) */
 function groundY(x,z){var G=st.G,lx=x-G.x1,lz=z-G.z1,ix=Math.floor(lx),iz=Math.floor(lz),fx=lx-ix,fz=lz-iz;
  return (cornerH(ix,iz)*(1-fx)+cornerH(ix+1,iz)*fx)*(1-fz)+(cornerH(ix,iz+1)*(1-fx)+cornerH(ix+1,iz+1)*fx)*fz}
 /** where an entity stands: the deck over a crossing, the trench bed in the Ditch, else the ground */
 function standY(x,z){var k=Math.floor(x)+','+Math.floor(z);if(st.walk[k]!=null)return groundY(x,z)+st.walk[k];if(st.cut[k]!=null)return -st.cut[k];return groundY(x,z)}
 function light(cx,cz){var L=LOOK.light,ll=Math.hypot(L[0],L[1],L[2]),dx=(cornerH(cx+1,cz)-cornerH(cx-1,cz))/2,dz=(cornerH(cx,cz+1)-cornerH(cx,cz-1))/2;
  var n=Math.hypot(dx,1,dz),flat=LOOK.ambient+LOOK.diffuse*L[1]/ll,v=(LOOK.ambient+LOOK.diffuse*((-dx*L[0]+L[1]+dz*L[2])/ll/n))/flat;return Math.max(LOOK.min,Math.min(LOOK.max,v))}
 function buildGround(texs,means){
  var G=st.G,W=G.width,D=G.depth,over=G.overlays||[],pos=[],col=[],mixA=[],mixB=[];
  function kindAt(x,z){x=Math.max(0,Math.min(W-1,x));z=Math.max(0,Math.min(D-1,z));return G.kindNames[G.kinds[z*W+x]]}
  var cache={};
  function underlayAt(cx,cz){var key=cx+','+cz;if(cache[key])return cache[key];var c=[0,0,0],w=[0,0,0,0,0,0,0,0],n=0;
   for(var dz=-2;dz<=1;dz++)for(var dx=-2;dx<=1;dx++){var kd=kindAt(cx+dx,cz+dz);if(over.indexOf(kd)>=0)continue;
    var wt=(dx>=-1&&dx<=0&&dz>=-1&&dz<=0)?2:1,b=G.kindColours[kd];c[0]+=b[0]*wt;c[1]+=b[1]*wt;c[2]+=b[2]*wt;w[G.kindNames.indexOf(kd)]+=wt;n+=wt}
   if(!n){var kd2=kindAt(cx,cz),b2=G.kindColours[kd2];c=b2.slice();w[G.kindNames.indexOf(kd2)]=1;n=1}
   return cache[key]={c:[c[0]/n,c[1]/n,c[2]/n],w:w.map(function(v){return v/n})}}
  for(var z=0;z<D;z++)for(var x=0;x<W;x++){
   var tx=G.x1+x,tz=G.z1+z,kind=kindAt(x,z),depth=st.cut[tx+','+tz]||0,isOver=over.indexOf(kind)>=0;
   var k=LOOK.scale*(1+patch(tx,tz)*LOOK.patch+(rnd(tx,tz,1)-.5)*LOOK.jitter)/255;
   var own={c:G.kindColours[kind],w:G.kindNames.map(function(nm){return nm===kind?1:0})};
   var corners=[[x,z],[x+1,z],[x+1,z+1],[x,z+1]].map(function(c){var h=depth?-depth:cornerH(c[0],c[1]),li=depth?0.62:light(c[0],c[1]),u=isOver||depth?own:underlayAt(c[0],c[1]);
    return {p:[G.x1+c[0],h,-(G.z1+c[1])],c:[Math.min(1,u.c[0]*k*li),Math.min(1,u.c[1]*k*li),Math.min(1,u.c[2]*k*li)],w:u.w}});
   var tri=((tx+tz)&1)?[0,1,2,0,2,3]:[0,1,3,1,2,3];
   tri.forEach(function(i){pos.push.apply(pos,corners[i].p);col.push.apply(col,corners[i].c);mixA.push.apply(mixA,corners[i].w.slice(0,4));mixB.push.apply(mixB,corners[i].w.slice(4,8))});
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setAttribute('mixA',new THREE.Float32BufferAttribute(mixA,4));g.setAttribute('mixB',new THREE.Float32BufferAttribute(mixB,4));g.computeVertexNormals();
  var m=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),names=G.kindNames;
  m.onBeforeCompile=function(sh){
   names.forEach(function(n,i){sh.uniforms['gt'+i]={value:texs[n]}});
   sh.vertexShader='attribute vec4 mixA;\nattribute vec4 mixB;\nvarying vec4 vA;\nvarying vec4 vB;\nvarying vec2 vXZ;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvA = mixA; vB = mixB; vXZ = position.xz;');
   var decl='varying vec4 vA;\nvarying vec4 vB;\nvarying vec2 vXZ;\n'+names.map(function(n,i){return 'uniform sampler2D gt'+i+';'}).join('\n')+'\n';
   var sum=names.map(function(n,i){var mu=means[KIND_TEX[n]]||[.5,.5,.5],s=n==='grass'?1.6:1.5;
    return '(texture2D(gt'+i+', vXZ / '+s.toFixed(2)+').rgb / vec3('+mu.map(function(v){return v.toFixed(4)}).join(',')+')) * '+(i<4?'vA.'+'xyzw'[i]:'vB.'+'xyzw'[i-4])}).join(' + ');
   sh.fragmentShader=decl+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), '+sum+', 0.9);');
  };
  m.customProgramCacheKey=function(){return 'online-scarlands-ground-v1'};
  var mesh=new THREE.Mesh(g,m);mesh.name='ground-chunk-kit';mesh.receiveShadow=true;return mesh;
 }
 function instance(gltf,group,rows,yOf){
  var byPiece={};rows.forEach(function(r){(byPiece[r.node]=byPiece[r.node]||[]).push(r)});
  Object.keys(byPiece).forEach(function(node){
   var root=gltf.scene.getObjectByName(node);if(!root){console.warn('[OnlineKit] kit has no '+node);return}
   root.updateMatrixWorld(true);var inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),list=byPiece[node];
   root.traverse(function(o){if(!o.isMesh)return;
    var local=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),im=new THREE.InstancedMesh(o.geometry,o.material,list.length);
    list.forEach(function(r,i){var mm=new THREE.Matrix4().compose(new THREE.Vector3(r.cx,yOf(r),-r.cz),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r.yaw),new THREE.Vector3(1,1,1));im.setMatrixAt(i,mm.multiply(local))});
    im.instanceMatrix.needsUpdate=true;im.name='kit-'+node;im.frustumCulled=false;group.add(im);st.stats.instancedMeshes++;st.stats.instances+=list.length});
  });
 }
 function prepare(root){root.traverse(function(o){if(!o.isMesh)return;[].concat(o.material).forEach(function(m){if(!m)return;
  if(m.map){if(THREE.LinearEncoding!==undefined)m.map.encoding=THREE.LinearEncoding;m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.LinearMipmapLinearFilter;m.map.needsUpdate=true}
  if('roughness' in m){m.roughness=1;m.metalness=0}m.needsUpdate=true})})}
 /** which wall edges the kit's ruin pieces draw ('x,z,N|E|S|W'), so OnlineWorld only draws the rest */
 function coveredEdges(){
  var out={},SIDES=['N','E','S','W'];
  (st.place.pieces||[]).forEach(function(p){if(!/^ruin_wall/.test(p.piece))return;var r=(p.rot|0)%4,s=SIDES[r];
   function mark(x,z,side){out[x+','+z+','+side]=1;var OPP={N:[0,1,'S'],S:[0,-1,'N'],E:[1,0,'W'],W:[-1,0,'E']}[side];out[(x+OPP[0])+','+(z+OPP[1])+','+OPP[2]]=1}
   mark(p.x,p.z,s);if(p.piece==='ruin_wall_corner')mark(p.x,p.z,SIDES[(r+1)%4])});
  return out;
 }
 /** load the placement and the kit; resolves false when the map has none (or it cannot be read) */
 function load(map){
  if(!map||!map.placement)return Promise.resolve(false);
  var manifestUrl=map.kit||'assets/scarlands/kit-v1/manifest.json';
  if(map.kitTextures)TEX=map.kitTextures;   // where the kit's ground textures are served (default: the old-school kit folder)
  return Promise.all([json(map.placement),json(manifestUrl),json(TEX+'kit.json').catch(function(){return {textures:{}}})]).then(function(r){
   st.place=r[0];st.kit=r[1];st.G=st.place.ground;st.cut={};st.walk={};
   (st.G.cut||[]).forEach(function(c){st.cut[c[0]+','+c[1]]=c[2]});(st.G.walk||[]).forEach(function(c){st.walk[c[0]+','+c[1]]=c[2]});
   var means={};Object.keys(r[2].textures||{}).forEach(function(n){means[n]=r[2].textures[n].mean});
   var names=Object.keys(KIND_TEX);
   return Promise.all(names.map(function(k){return texture(KIND_TEX[k])})).then(function(ts){
    var texs={};names.forEach(function(k,i){texs[k]=ts[i]});
    var glb=manifestUrl.replace(/manifest\.json$/,(st.kit.glb&&st.kit.glb.file)||'scarlands_kit.glb');
    return new Promise(function(res,rej){new THREE.GLTFLoader().load(glb,res,undefined,rej)}).then(function(gltf){
     prepare(gltf.scene);
     var b=map.bounds,group=new THREE.Group();group.name='online-scarlands-kit';group.position.set(-b.x1,0,b.z2+1);
     var ground=buildGround(texs,means);group.add(ground);
     instance(gltf,group,st.place.pieces||[],function(r){return r.node.indexOf('scar_ditch')===0?0:groundY(r.cx,r.cz)});
     st.stats.pieces=(st.place.pieces||[]).length;st.group=group;st.covered=coveredEdges();
     return {group:group,ground:ground};
    });
   });
  }).catch(function(e){console.warn('[OnlineKit] placement not used: '+e.message);st.place=null;return false});
 }
 return {load:load,groundY:function(x,z){return st.G?groundY(x,z):null},standY:function(x,z){return st.G?standY(x,z):null},
  active:function(){return !!st.group},covered:function(){return st.covered||{}},water:function(){return (st.place&&st.place.water)||[]},
  cornerH:function(x,z){return st.G?cornerH(x-st.G.x1,z-st.G.z1):null},stats:function(){return st.stats}};
})();
