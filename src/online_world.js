/* ============ OnlineWorld — the server's map drawn as the old-school world (W2 online alpha) ============
 * The authoritative server owns the map (server/data/maps/*.json, served at GET /map): bounds, blocked tiles, water,
 * walls, Wilderness / multi-combat areas, the respawn, and the decor list the client dresses it with. This file:
 *   - OnlineMap: the pure tile model (coordinates, walkability, Wilderness level, multi, area names), node-testable;
 *   - builds the ground from it with the old-school look kit (HolmOverhaulGround lattice + HolmOldschoolLook textures),
 *     the Ditch as a water-filled trench with stone-bridge crossings, the pond, and the Blender props (trees, rocks,
 *     stone walls for every wall edge, the supply chest, campfire, signposts) — our own design and our own models;
 *   - registers the WorldV2 provider 'online-scarlands' the boot builds instead of Tutor's Holm.
 * Coordinates: server tiles (x east, z NORTH) map to world tiles i = x - x1, j = z2 - z (north is -Z on screen, as in
 * the offline game); a tile's centre is (i + .5, j + .5).
 */
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OnlineMap=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function rectHas(r,x,z){return x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3]}
 function inArea(a,x,z){return x>=a.x1&&x<=a.x2&&z>=a.z1&&z<=a.z2}
 /** the pure map model from the server's map JSON */
 function create(map){
  var b=map.bounds,W=b.x2-b.x1+1,D=b.z2-b.z1+1;
  var tiles=new Uint8Array(W*D);     // 1 blocked, 2 water
  var walls=new Uint8Array(W*D);     // bit 1 N, 2 E, 4 S, 8 W (server sides)
  function idx(x,z){return (z-b.z1)*W+(x-b.x1)}
  function inBounds(x,z){return x>=b.x1&&x<=b.x2&&z>=b.z1&&z<=b.z2}
  (map.blocked||[]).forEach(function(r){for(var z=r[1];z<=r[3];z++)for(var x=r[0];x<=r[2];x++)if(inBounds(x,z))tiles[idx(x,z)]=1});
  (map.water||[]).forEach(function(r){for(var z=r[1];z<=r[3];z++)for(var x=r[0];x<=r[2];x++)if(inBounds(x,z))tiles[idx(x,z)]=2});
  var SIDE={N:1,E:2,S:4,W:8};
  (map.walls||[]).forEach(function(w){var r=w.length===3?[w[0],w[1],w[0],w[1]]:[w[0],w[1],w[2],w[3]],s=SIDE[w[w.length-1]]||0;
   for(var z=r[1];z<=r[3];z++)for(var x=r[0];x<=r[2];x++)if(inBounds(x,z))walls[idx(x,z)]|=s});
  var areas=map.areas||{};
  var m={
   map:map,bounds:b,width:W,depth:D,
   /** server tile -> world point at the tile centre (fractional tiles allowed, e.g. rect centres) */
   toWorld:function(x,z){return {x:x-b.x1+.5,z:b.z2-z+.5}},
   /** world point -> the server tile it lies on */
   toTile:function(wx,wz){return {x:Math.floor(wx)+b.x1,z:b.z2-Math.floor(wz)}},
   inBounds:inBounds,
   kind:function(x,z){return inBounds(x,z)?tiles[idx(x,z)]:1},
   isWater:function(x,z){return inBounds(x,z)&&tiles[idx(x,z)]===2},
   isBlocked:function(x,z){return !inBounds(x,z)||tiles[idx(x,z)]===1},
   walkable:function(x,z){return inBounds(x,z)&&tiles[idx(x,z)]===0},
   wallBits:function(x,z){return inBounds(x,z)?walls[idx(x,z)]:0},
   wildernessLevel:function(x,z){var ws=areas.wilderness||[];for(var i=0;i<ws.length;i++)if(inArea(ws[i],x,z))return Math.floor((z-ws[i].z1)/8)+1;return 0},
   isMulti:function(x,z){var ms=areas.multi||[];for(var i=0;i<ms.length;i++)if(inArea(ms[i],x,z))return true;return false},
   areaName:function(x,z){var ns=areas.named||[];for(var i=0;i<ns.length;i++)if(inArea(ns[i],x,z))return ns[i].name;return null},
   /** the nearest walkable tile to (x, z) within r tiles (Chebyshev rings), or null */
   nearestWalkable:function(x,z,r){
    if(m.walkable(x,z))return {x:x,z:z};
    for(var d=1;d<=(r||3);d++){var best=null,bd=1e9;
     for(var dz=-d;dz<=d;dz++)for(var dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==d)continue;
      var tx=x+dx,tz=z+dz;if(!m.walkable(tx,tz))continue;var dd=dx*dx+dz*dz;if(dd<bd){bd=dd;best={x:tx,z:tz}}}
     if(best)return best}
    return null},
   /** is there a wall between two orthogonally/diagonally adjacent tiles (for drawing and tests) */
   rectHas:rectHas
  };
  return m;
 }
 /* ---------------- ground lattice: heights + materials, deterministic from the map ---------------- */
 function hash(x,z,k){var s=Math.sin(x*127.1+z*311.7+(k||0)*74.7)*43758.5453;return s-Math.floor(s)}
 function smooth(x,z,scale,k){var fx=x/scale,fz=z/scale,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,w=fz-iz;u=u*u*(3-2*u);w=w*w*(3-2*w);
  function q(a,c){return hash(a,c,k)*2-1}return (q(ix,iz)*(1-u)+q(ix+1,iz)*u)*(1-w)+(q(ix,iz+1)*(1-u)+q(ix+1,iz+1)*u)*w}
 var WATER_Y=-0.55, BED_Y=-1.45, LIP_Y=-0.62;
 var PAD=8;   // ground drawn past the bounds on every side, so the pocket ends in banks and treeline, not a cliff into the void
 /** lattice of (W+1+2P)*(D+1+2P) corner heights and materials (0 sand, 1 grass, 2 rock, 3 earth, 4 bed); lattice
  *  index (i, j) is world corner (i - P, j - P) */
 function lattice(m,override){
  var W=m.width+2*PAD,D=m.depth+2*PAD,b=m.bounds,h=new Float32Array((W+1)*(D+1)),mat=new Uint8Array((W+1)*(D+1));
  var wild=(m.map.areas&&m.map.areas.wilderness&&m.map.areas.wilderness[0])||null;
  function tileAt(wi,wj){return {x:wi+b.x1,z:b.z2-wj}}
  for(var j=0;j<=D;j++)for(var i=0;i<=W;i++){
   var wi=i-PAD,wj=j-PAD,nW=0,nIn=0;
   for(var dj=-1;dj<=0;dj++)for(var di=-1;di<=0;di++){var t=tileAt(wi+di,wj+dj);if(!m.inBounds(t.x,t.z))continue;nIn++;if(m.kind(t.x,t.z)===2)nW++}
   var s=tileAt(Math.max(0,Math.min(m.width-1,wi)),Math.max(0,Math.min(m.depth-1,wj))),wl=m.wildernessLevel(s.x,s.z);
   // gentle old-school undulation; the Scarlands roll harder and rise towards the north
   var amp=wl>0?0.45+Math.min(0.35,wl*0.04):0.18;
   var y=smooth(i,j,7,3)*amp+smooth(i,j,19,5)*amp*1.2+(wl>0?wl*0.05:0);
   // outside the bounds the land banks up into low hills (never walkable: the server treats it as solid)
   var out=Math.max(0,-wi,wi-m.width,-wj,wj-m.depth);
   if(out>0)y+=Math.min(3.2,out*0.42)+smooth(i,j,4,9)*0.35*Math.min(1,out/2);
   if(nW>0&&nW===nIn)y=BED_Y+smooth(i,j,3,7)*0.12;else if(nW>0)y=LIP_Y+0.08*smooth(i,j,2,8);
   if(override&&wi>=0&&wj>=0&&wi<=m.width&&wj<=m.depth){var ov=override(wi,wj);if(ov!=null)y=ov}
   h[j*(W+1)+i]=y;
   // materials: grass in the Commons, scorched earth and rock in the Scarlands (grass thinning out past the Ditch)
   var sz=s.z,mt=1;
   if(nW>0)mt=nW===nIn?4:3;
   else if(wild&&sz>=wild.z1-2){var into=sz-(wild.z1-2),r=hash(i,j,11),n=smooth(i,j,6,13);
    if(into<5&&r<0.55-into*0.1)mt=1;else mt=n>0.35?2:(n<-0.45?0:3)}
   else if(smooth(i,j,9,17)>0.62)mt=0;
   if(out>2&&smooth(i,j,5,19)>0.3)mt=2;
   mat[j*(W+1)+i]=mt;
  }
  return {W:W,D:D,P:PAD,h:h,m:mat};
 }
 /** worn dirt paths between the respawn, the crossings and the ruins (tile key 'i,j' -> weight 0..1) */
 function paths(m){
  var out={},map=m.map,routes=(map.decor||[]).filter(function(d){return d.kind==='path'});
  routes.forEach(function(r){var pts=r.points||[],wid=r.width||1.2;
   for(var p=0;p<pts.length-1;p++){var a=m.toWorld(pts[p][0],pts[p][1]),c=m.toWorld(pts[p+1][0],pts[p+1][1]);
    var len=Math.hypot(c.x-a.x,c.z-a.z),n=Math.max(1,Math.ceil(len*3));
    for(var s=0;s<=n;s++){var x=a.x+(c.x-a.x)*s/n,z=a.z+(c.z-a.z)*s/n;
     for(var dz=-2;dz<=2;dz++)for(var dx=-2;dx<=2;dx++){var ti=Math.floor(x)+dx,tj=Math.floor(z)+dz,d=Math.hypot(ti+.5-x,tj+.5-z);
      if(d<=wid){var k=(ti+PAD)+','+(tj+PAD),w=d<=wid*0.55?1:0.5;if(!(out[k]>=w))out[k]=w}}}}});
  return out;
 }
 /** bilinear height at a world point (entities stand on this; water tiles report the water surface) */
 function heightAt(L,x,z){
  var i=Math.max(0,Math.min(L.W-1e-6,x+L.P)),j=Math.max(0,Math.min(L.D-1e-6,z+L.P)),i0=Math.floor(i),j0=Math.floor(j),fx=i-i0,fz=j-j0,W1=L.W+1;
  var a=L.h[j0*W1+i0],b=L.h[j0*W1+i0+1],c=L.h[(j0+1)*W1+i0],d=L.h[(j0+1)*W1+i0+1];
  return (a*(1-fx)+b*fx)*(1-fz)+(c*(1-fx)+d*fx)*fz;
 }
 return {create:create,lattice:lattice,paths:paths,heightAt:heightAt,hash:hash,smooth:smooth,WATER_Y:WATER_Y,PAD:PAD};
});

/* ---------------- the 3D world (browser only) ---------------- */
var OnlineWorld=(function(){
 'use strict';
 if(typeof window==='undefined')return null;
 var ID='online-scarlands';
 var st={map:null,model:null,L:null,paths:null,provider:null,groundMat:null,meshes:[],props:[],water:[],packs:{},ready:false,chest:null,
  waterTime:{value:0},stats:{props:0,walls:0,chunks:0,failed:[]}};
 var ARRIVAL='.studio-workspaces/holm-arrival-package-oldschool-v2/exports/5369a48889f7c8bc/files/assets/models/';
 var PACK={
  props1:'assets/holm_island/ws/holm-props1-oldschool-v1/candidates/props.glb',
  props5:'assets/holm_island/ws/holm-props5-oldschool-v1/candidates/props.glb',
  oak:'assets/holm_island/ws/holm-tree-family-oldschool-v1/candidates/oak.glb',
  birch:'assets/holm_island/ws/holm-tree-family-oldschool-v1/candidates/birch.glb',
  pine:'assets/holm_island/ws/holm-tree-family-oldschool-v1/candidates/coastal-pine.glb',
  tuft:'assets/holm_island/ws/holm-tree-family-oldschool-v1/candidates/meadow-tuft.glb',
  reeds:'assets/holm_island/ws/holm-tree-family-oldschool-v1/candidates/creek-reeds.glb',
  bridge:'assets/holm_island/ws/holm-island-bridges-oldschool-v1/candidates/stone_village_bridge.glb',
  wall:ARRIVAL+'holm_arrival_wall_oldschool_v1.glb',
  fieldstones:ARRIVAL+'holm_arrival_fieldstones_oldschool_v1.glb',
  waypost:ARRIVAL+'holm_arrival_waypost_oldschool_v1.glb',
  cargo:ARRIVAL+'holm_arrival_cargo_oldschool_v1.glb',
  deadtree:'assets/models/tree_evil.glb',
  chest:'assets/models/props/cellar_reserve_chest_v1.glb',
  torch:'assets/models/props/cellar_wall_torch_v1.glb'
 };
 function M(){return st.model}
 /* ---------------- GLB packs: load once, clone per placement ---------------- */
 function loadPack(key){
  if(st.packs[key])return st.packs[key];
  var url=PACK[key];
  st.packs[key]=new Promise(function(res){
   try{new THREE.GLTFLoader().load(url,function(g){
     var r=g.scene;if(typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.prepareModel)HolmOldschoolLook.prepareModel(THREE,r);
     r.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;[].concat(o.material).forEach(function(q){if(q&&'metalness' in q){q.metalness=0;q.roughness=1}})}});
     res(r)},undefined,function(e){st.stats.failed.push(key);console.warn('[OnlineWorld] prop pack missing: '+url);res(null)})}
   catch(e){st.stats.failed.push(key);res(null)}
  });
  return st.packs[key];
 }
 /** a clone of a pack (or one named node of it), its base seated at y=0, footprint centred on the origin */
 function cloneOf(rootObj,node){
  var src=node?rootObj.getObjectByName(node):rootObj;if(!src)return null;
  var c=src.clone(true);c.position.set(0,0,0);c.rotation.set(0,0,0);c.updateMatrixWorld(true);
  var box=new THREE.Box3().setFromObject(c),cen=box.getCenter(new THREE.Vector3());
  var g=new THREE.Group();c.position.set(-cen.x,-box.min.y,-cen.z);g.add(c);
  g.userData.size=box.getSize(new THREE.Vector3());return g;
 }
 function place(obj,wx,wz,opts){
  var o=opts||{};if(!obj)return null;
  if(o.scale)obj.scale.multiplyScalar(o.scale);
  if(o.sy)obj.scale.y*=o.sy;
  obj.rotation.y=(o.rot||0)*Math.PI/180;
  obj.position.set(wx,(o.y!=null?o.y:groundAt(wx,wz))+(o.dy||0),wz);
  if(o.tilt){obj.rotation.z=o.tilt;obj.rotation.x=o.tilt*0.5}
  obj.userData.kind='onl_scenery';obj.userData.inspectOnly=true;obj.userData.label=o.label||null;obj.userData.examine=o.examine||null;
  if(o.name)obj.name=o.name;
  scene.add(obj);st.props.push(obj);st.stats.props++;
  if(o.clickable)WORLD.clickables.push(obj);
  return obj;
 }
 function groundAt(wx,wz){
  var m=st.model;
  if(st.kit&&m&&wx>=0&&wz>=0&&wx<m.width&&wz<m.depth){var y=OnlineKit.standY(wx+m.bounds.x1,m.bounds.z2+1-wz);if(y!=null)return y}
  return st.L?OnlineMap.heightAt(st.L,wx,wz):0}

 /* ---------------- terrain ---------------- */
 function buildTerrain(){
  var L=st.L,W=L.W,D=L.D;
  if(typeof HolmOverhaulGround!=='undefined'){HolmOverhaulGround.setTerrain({width:W,depth:D,heights:Array.from(L.h),materials:Array.from(L.m)});HolmOverhaulGround.setPaths(st.paths)}
  var oldschool=typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled();
  st.groundMat=oldschool?HolmOldschoolLook.groundMaterial(THREE):new THREE.MeshLambertMaterial({vertexColors:true});
  for(var cz=0;cz<D/8;cz++)for(var cx=0;cx<W/8;cx++){
   var positions=[],materials=[],indices=[];
   for(var v=0;v<=8;v++)for(var u=0;u<=8;u++){var i=cx*8+u,j=cz*8+v;positions.push(i,L.h[j*(W+1)+i],j);materials.push(L.m[j*(W+1)+i])}
   for(var v2=0;v2<8;v2++)for(var u2=0;u2<8;u2++){var a=v2*9+u2,ti=cx*8+u2-L.P,tj=cz*8+v2-L.P;
    if(st.kit&&ti>=0&&tj>=0&&ti<st.model.width&&tj<st.model.depth)continue;   // the kit draws the pocket itself
    indices.push(a,a+1,a+9,a+9,a+1,a+10)}
   if(!indices.length)continue;
   var surface={positions:positions,materials:materials,indices:indices},geo=new THREE.BufferGeometry();
   if(oldschool){var os=HolmOverhaulGround.chunkOldschool(surface);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(os.positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(os.colors,3));
    geo.setAttribute('groundMix',new THREE.Float32BufferAttribute(os.ground,4))}
   else{var tl=HolmOverhaulGround.chunk(surface);geo.setAttribute('position',new THREE.Float32BufferAttribute(tl.positions,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(tl.colors.map(function(c){return c*.62}),3))}
   geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();
   var mesh=new THREE.Mesh(geo,st.groundMat);mesh.name='ground-chunk-'+cx+','+cz;mesh.receiveShadow=true;mesh.position.set(-L.P,0,-L.P);
   scene.add(mesh);WORLD.clickables.push(mesh);WORLD.grounds.push(mesh);st.meshes.push(mesh);st.stats.chunks++;
  }
 }
 /* the Ditch and the pond: flat water over the trench, the kit's pale scrolling water texture */
 function waterMaterial(){
  var mat=new THREE.MeshBasicMaterial({color:0x7e92ae,transparent:true,opacity:.92,depthWrite:false});
  var tex=typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.waterTexture&&HolmOldschoolLook.waterTexture();
  if(tex){mat.color.setHex(0xffffff);mat.opacity=.97;
   mat.onBeforeCompile=function(shader){shader.uniforms.owTime=st.waterTime;shader.uniforms.owMap={value:tex};
    shader.vertexShader='varying vec3 owPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nowPos = position;');
    shader.fragmentShader='uniform float owTime;\nuniform sampler2D owMap;\nvarying vec3 owPos;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+
     'vec3 owA = texture2D(owMap, owPos.xz / 3.0 + vec2(owTime * 0.020, owTime * 0.008)).rgb;\n'+
     'vec3 owB = texture2D(owMap, owPos.zx / 4.7 + vec2(0.31 - owTime * 0.011, 0.57 + owTime * 0.014)).rgb;\n'+
     'diffuseColor.rgb = mix(owA, owB, 0.4) * 0.92;')};
   mat.customProgramCacheKey=function(){return 'online-water-v1'}}
  return mat;
 }
 function buildWater(){
  var m=M(),mat=waterMaterial();
  var rects=st.kit?OnlineKit.water():(m.map.water||[]);
  rects.forEach(function(r){
   var a=m.toWorld(r[0],r[3]),c=m.toWorld(r[2],r[1]);   // north-west and south-east tile centres
   var x0=a.x-.5,z0=a.z-.5,x1=c.x+.5,z1=c.z+.5,pos=[],idx=[],nx=Math.max(1,Math.round(x1-x0)),nz=Math.max(1,Math.round(z1-z0));
   var wy=st.kit?groundAt((x0+x1)/2,(z0+z1)/2)-0.12:OnlineMap.WATER_Y;
   for(var v=0;v<=nz;v++)for(var u=0;u<=nx;u++)pos.push(x0+u*(x1-x0)/nx,wy,z0+v*(z1-z0)/nz);
   for(var v2=0;v2<nz;v2++)for(var u2=0;u2<nx;u2++){var k=v2*(nx+1)+u2;idx.push(k,k+nx+1,k+1,k+1,k+nx+1,k+nx+2)}
   var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
   var w=new THREE.Mesh(g,mat);w.name='online-water';w.renderOrder=1;scene.add(w);st.water.push(w);
  });
 }
 /* ---------------- walls: one stone-wall segment per wall edge ---------------- */
 function buildWalls(wallPack){
  var m=M(),b=m.bounds;if(!wallPack)return;
  var proto=cloneOf(wallPack,null);if(!proto)return;
  var size=proto.userData.size,long=Math.max(size.x,size.z),alongX=size.x>=size.z;
  var ruin=function(x,z){return m.wildernessLevel(x,z)>0};
  for(var z=b.z1;z<=b.z2;z++)for(var x=b.x1;x<=b.x2;x++){
   var bits=m.wallBits(x,z);if(!bits)continue;
   var c=m.toWorld(x,z);
   [[1,0,-.5,0],[2,.5,0,90],[4,0,.5,0],[8,-.5,0,90]].forEach(function(s){
    if(!(bits&s[0]))return;
    if(st.kit&&OnlineKit.covered()[x+','+z+','+['','N','E','','S','','','','W'][s[0]]])return;
    var seg=cloneOf(wallPack,null);if(!seg)return;
    var ruined=ruin(x,z),hsh=OnlineMap.hash(x,z,s[0]);
    // scale the segment to exactly one tile edge; ruins stand broken and uneven
    var k=1.04/long;seg.scale.set(k,ruined?0.55+hsh*0.6:1.0,k);
    var rot=(alongX?0:90)+s[3];
    place(seg,c.x+s[1],c.z+s[2],{rot:rot,tilt:ruined&&hsh>0.8?(hsh-0.8)*0.4:0,label:null,examine:ruined?'Old stones, split by fire and frost.':'A dry-stone wall.'});
    st.stats.walls++;
   });
  }
 }
 /* ---------------- decor from the map (every blocked rect gets its prop; plus flavour) ---------------- */
 var KIND={
  oak:{pack:'oak',h:5.2},birch:{pack:'birch',h:4.6},pine:{pack:'pine',h:5.6},deadtree:{pack:'deadtree',h:4.2},
  rocks:{pack:'props1',node:'rock-group'},stones:{pack:'props1',node:'stones-small'},shrub:{pack:'props1',node:'shrub-b'},bush:{pack:'props1',node:'shrub-a'},
  log:{pack:'props1',node:'fallen-log'},flowers:{pack:'props1',node:'flower-patch'},signpost:{pack:'waypost'},
  stump:{pack:'props5',node:'tree-stump'},rubble:{pack:'props5',node:'ore-rock-depleted'},campfire:{pack:'props5',node:'campfire'},
  fieldstones:{pack:'fieldstones'},cargo:{pack:'cargo'},tuft:{pack:'tuft'},reeds:{pack:'reeds'},chest:{pack:'chest',h:0.9},torch:{pack:'torch',h:1.6},
  bridge:{pack:'bridge'}
 };
 function decorOne(d){
  var k=KIND[d.kind];if(!k)return Promise.resolve(null);
  return loadPack(k.pack).then(function(pk){
   if(!pk)return null;var o=cloneOf(pk,k.node);if(!o)return null;
   var s=d.scale||1;if(k.h&&o.userData.size.y>0)s*=k.h/o.userData.size.y;
   var w=M().toWorld(d.x,d.z);
   var opts={scale:s,rot:d.rot||0,label:d.label||null,examine:d.examine||null};
   if(d.kind==='bridge'){opts.y=d.y!=null?d.y:0.02}
   var obj=place(o,w.x,w.z,opts);
   if(d.kind==='chest'){obj.userData.kind='onl_chest';obj.userData.inspectOnly=false;obj.userData.label='Open <b>Supply chest</b>';WORLD.clickables.push(obj);st.chest=obj}
   return obj;
  });
 }
 /* a treeline and dead wood outside the bounds frame the playable pocket; the black void swallows the rest */
 function border(){
  var m=M(),b=m.bounds,out=[],W=m.width,D=m.depth,wild=(m.map.areas.wilderness||[])[0];
  function kindAt(wz,r){var sz=b.z2-Math.floor(wz),isWild=wild&&sz>=wild.z1-1;
   return isWild?(r<0.45?'deadtree':r<0.75?'rocks':r<0.9?'stones':'deadtree'):(r<0.4?'oak':r<0.75?'pine':'birch')}
  function add(wx,wz,seed){var r=OnlineMap.hash(Math.floor(wx*3),Math.floor(wz*3),seed);out.push({kind:kindAt(Math.max(0,Math.min(D-1,wz)),r),wx:wx,wz:wz,scale:0.8+r*0.5,rot:Math.floor(r*360)})}
  for(var row=0;row<2;row++){var off=3.5+row*2.6;
   for(var j=-4;j<D+4;j+=3){add(-off-OnlineMap.hash(j,row,2)*1.5,j+.5+row*1.4,5+row);add(W+off+OnlineMap.hash(j,row,3)*1.5,j+.5+row*1.4,7+row)}
   for(var i=-2;i<W+2;i+=3){add(i+.5+row*1.4,-off-OnlineMap.hash(i,row,4)*1.5,9+row);add(i+.5+row*1.4,D+off+OnlineMap.hash(i,row,5)*1.5,11+row)}}
  return out;
 }
 /* ground flavour on open tiles: meadow tufts and flowers in the Commons, stones and dead tufts north of the Ditch */
 function scatter(){
  var m=M(),b=m.bounds,out=[];
  for(var z=b.z1;z<=b.z2;z+=1)for(var x=b.x1;x<=b.x2;x+=1){
   if(!m.walkable(x,z))continue;var r=OnlineMap.hash(x,z,21);if(r>0.035)continue;
   if(st.kit&&m.wildernessLevel(x,z)>0)continue;
   var wl=m.wildernessLevel(x,z),w=m.toWorld(x,z),jx=(OnlineMap.hash(x,z,22)-.5)*.6,jz=(OnlineMap.hash(x,z,23)-.5)*.6;
   out.push({kind:wl>0?(r<0.02?'stones':'tuft'):(r<0.018?'flowers':'tuft'),wx:w.x+jx,wz:w.z+jz,scale:wl>0?0.7:0.9,rot:Math.floor(r*9000)%360,dim:wl>0});
  }
  return out;
 }
 function placeLoose(list){
  return Promise.all(list.map(function(d){var k=KIND[d.kind];if(!k)return null;
   return loadPack(k.pack).then(function(pk){if(!pk)return;var o=cloneOf(pk,k.node);if(!o)return;var s=d.scale||1;if(k.h&&o.userData.size.y>0)s*=k.h/o.userData.size.y;
    var obj=place(o,d.wx,d.wz,{scale:s,rot:d.rot});
    if(d.dim)obj.traverse(function(q){if(q.isMesh&&q.material&&q.material.color){q.material=q.material.clone();q.material.color.multiplyScalar(0.55)}})})}));
 }

 /* ---------------- provider ---------------- */
 function fetchMap(){
  var http=(typeof CROnline!=='undefined'&&CROnline.server?CROnline.server:'ws://127.0.0.1:8200').replace(/^ws/,'http')+'/map';
  return fetch(http,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('map '+r.status);return r.json()})
   .catch(function(){console.warn('[OnlineWorld] the game server did not answer /map; using the bundled test map');
    return fetch('server/data/maps/scarlands_test.json',{cache:'no-store'}).then(function(r){return r.json()})});
 }
 function setup(map){
  st.map=map;st.model=OnlineMap.create(map);
  // monster kinds this client does not know yet come with the map (the server's content can be newer)
  if(map.npcTypes&&typeof NPC_TYPES!=='undefined')Object.keys(map.npcTypes).forEach(function(id){if(!NPC_TYPES[id])NPC_TYPES[id]=map.npcTypes[id]});
  var b=map.bounds,D=st.model.depth;
  st.L=OnlineMap.lattice(st.model,st.kit?function(wi,wj){return OnlineKit.cornerH(b.x1+wi,b.z1+(D-wj))}:null);
  st.paths=st.kit?{}:OnlineMap.paths(st.model);
 }
 function register(){
  var chunks=[];for(var cz=0;cz<16;cz++)for(var cx=0;cx<8;cx++)chunks.push({v:1,id:cx+','+cz,cx:cx,cz:cz,layers:{terrain:{},tileFlags:[],objects:[],interactions:[],mutations:[],spawns:[]}});
  var provider=WorldV2.register({contractVersion:1,id:ID,label:'The Scarlands (online)',worldRevision:1,
   initialRect:{x0:0,z0:0,w:64,h:128},residentRadius:1,renderStrategy:'online-server-map',
   defaultLandmark:'commons',landmarks:{commons:{id:'commons',x:32.5,z:117.5}},chunks:chunks,
   mapMetadata:{revision:1,landmarks:[],riskAreas:[]},
   hooks:{
    prepare:function(){},
    buildTerrain:function(){return buildAll()},
    populate:function(){},
    chartCollision:function(){},
    loadChunk:function(chunk){return {id:chunk.id}},
    unloadChunk:function(){},
    dispose:function(){},
    snapshot:function(){return snapshot()}
   }});
  WorldV2.activate(ID);CRWorldMode.attachProvider(provider);st.provider=provider;
  return provider;
 }
 /** called from the boot's terrain step (a Promise: the boot waits for the map, textures and props) */
 function buildAll(){
  var look=typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.preload?HolmOldschoolLook.preload(THREE).catch(function(){}):Promise.resolve();
  return Promise.all([fetchMap(),look]).then(function(r){
   if(typeof OnlineBestiary!=='undefined')OnlineBestiary.load(r[0]);   // monsters arrive after login; the manifest is small
   return (typeof OnlineKit!=='undefined'?OnlineKit.load(r[0]):Promise.resolve(false)).then(function(kit){r.push(kit);return r});
  }).then(function(r){
   st.kit=r[2]||null;
   setup(r[0]);
   if(st.kit){scene.add(st.kit.group);WORLD.clickables.push(st.kit.ground);WORLD.grounds.push(st.kit.ground)}
   // the landmark follows the real respawn
   var rs=st.model.toWorld(st.map.respawn.x,st.map.respawn.z);st.provider.landmarks.commons.x=rs.x;st.provider.landmarks.commons.z=rs.z;
   if(typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.activate)HolmOldschoolLook.activate(scene);
   buildTerrain();buildWater();
   // with the kit, our own decor keeps to the Commons (the kit dresses the Scarlands and the Ditch crossings)
   var KEEP={chest:1,campfire:1,signpost:1,oak:1,birch:1,pine:1,shrub:1,bush:1,log:1,flowers:1,fieldstones:1,cargo:1,torch:1,stump:1,tuft:1};
   var decor=(st.map.decor||[]).filter(function(d){return d.kind!=='path'&&(!st.kit||(KEEP[d.kind]&&st.model.wildernessLevel(d.x|0,d.z|0)===0))});
   return Promise.all([loadPack('wall').then(buildWalls)].concat(decor.map(decorOne)).concat([placeLoose(border()),placeLoose(scatter())]));
  }).then(function(){st.ready=true;return true});
 }
 function tick(dt){st.waterTime.value+=dt}
 function snapshot(){return {id:ID,ready:st.ready,chunks:st.stats.chunks,props:st.stats.props,walls:st.stats.walls,failed:st.stats.failed.slice(),water:st.water.length,
  bounds:st.map&&st.map.bounds,kit:st.kit?OnlineKit.stats():null}}
 return {ID:ID,register:register,model:M,map:function(){return st.map},heightAt:groundAt,tick:tick,snapshot:snapshot,chest:function(){return st.chest},
  lattice:function(){return st.L},ready:function(){return st.ready}};
})();
