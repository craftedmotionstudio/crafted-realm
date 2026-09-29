/* ============================================================================
   UI_MINIMAP: the 2004-style minimap (holm-minimap-2004, owner 2026-09-29: "Our mini map in the top right just isn't the
   most clear. We want it to look more like old school RuneScape, and have the exact player icons. The yellow player icons
   need to be more detailed, as far as where the characters are at. And if I could scroll wheel on the minimap to set it to
   a specific distance, that would be nice.")
   (This file used to hold an early CSS re-skin of the minimap bezel, retired by the kit long ago; the drawing moved here
   from src/ui_map.js, which keeps the world map.)

   What it draws, all of it from the game's own data:
     terrain   every island tile in the colour the ground renders it (HolmOverhaulGround's underlay for the tile, so the
               grey paths, sand, rock and grass are whatever the path and terrain data say), water from the terrain's water
               mask, building floors from the walk graph (planks brown, flagstones in a grey checker), bridge decks as wood;
     walls     thin white lines: each building's ground-storey wall meshes cut at knee height (MinimapCore.isWallMesh), so a
               doorway (its leaf and frame are not walls) is a gap; fences and garden walls the same way;
     scenery   the habitat's trees and rock groups as small map-scenery sprites (Blender renders, turning with the map);
     icons     map function icons (Blender renders: bank, furnace, anvil, range, fishing, quest, mining, woodcutting,
               combat, magic, ferry, beacon) found from the island's services, stations and gathering spots, upright;
     dots      our own 5 x 5 pixel balls with an outline: folk yellow, other adventurers white, friends green, items red,
               centred on each actor's live position (a standing actor sits on its tile's centre, a walking one glides);
     you       a white square at the centre; the walk flag on the destination tile; the route line the walker follows.
   Crisp: the canvas backing store is the minimap's real size in device pixels (the UI zoom and the screen's pixel ratio),
   tiles land on whole pixels, sprites are drawn at a whole-number pixel scale and the map turns with nearest sampling.
   Zoom: the wheel over the minimap (or a pinch on a touch screen) steps between 2 and 8 pixels a tile (72 to 18 tiles
   across; 4 = 2004's ~36 by default), remembered for this browser (localStorage); the wheel never reaches the camera.
   Layers (the smoke's three-layer contract): static (terrain, floors, walls; per 8-tile chunk and zoom), markers (map
   scenery; per chunk or when a resource's alive state changes), dynamic (icons, dots, route, flag, you; every paint).
   ============================================================================ */
var CRMinimap=(function(){
 'use strict';
 var C=MinimapCore,W=C.W,R=C.R;
 var ICON_BASE='assets/icons/ui/v3/map/',ICON_V='?v=1';
 function storage(){try{return window.localStorage}catch(e){return null}}
 var st={ppt:C.loadZoom(storage()),k:1,u:1,size:0,sizedAt:0,wheelAcc:0,wheelAt:0,pinch:null,pinchEndAt:0,tipSet:''};
 var staticCanvas=document.createElement('canvas'),markerCanvas=document.createElement('canvas');
 var cache={key:'',cx:0,cz:0,x0:0,z0:0,T:1,E:0,size:0,level:'s',markerSignature:'',markerCheckedAt:0};
 var telemetry={layerVersion:2,staticBuilds:0,markerBuilds:0,dynamicFrames:0,staticCacheHits:0,markerCacheHits:0,cacheKey:'',
  lastStaticMs:0,maxStaticMs:0,lastMarkerMs:0,maxMarkerMs:0,lastPaintMs:0,maxPaintMs:0,dynamicMarkers:0,maxDynamicMarkers:0,
  dynamicLimit:128,clicks:0,lastClickWorld:null,routeTiles:0,compassYaw:null,ppt:st.ppt,tilesAcross:C.tilesAcross(st.ppt),
  backing:0,pixel:1,walls:{meshes:0,segments:0,done:false},ground:{chunks:0,total:0},icons:0,dots:0,zoomChanges:0};
 var lastDots=[];
 function elapsed(t){return +(performance.now()-t).toFixed(3)}
 function provider(){return (typeof CRWorldMode!=='undefined'&&CRWorldMode.provider)||null}
 function island(){try{return typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive()}catch(e){return false}}
 function oldschool(){return typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled&&HolmOldschoolLook.enabled()}
 function underground(){return typeof player!=='undefined'&&player&&player.position.y<-5}

 /* ------------------------------------------------------------- images */
 // fetched at the first paint (after Play), so the boot's welcome screen never waits on them
 var IMG={},imagesAsked=false;
 function askImages(){if(imagesAsked)return;imagesAsked=true;C.ICONS.concat(['tree','pine','rock']).forEach(function(id){var im=new Image();im.decoding='async';im.src=ICON_BASE+id+'.png'+ICON_V;IMG[id]=im})}
 function ready(id){var im=IMG[id];return !!(im&&im.complete&&im.naturalWidth)}
 function imagesReady(){var n=0;for(var k in IMG)if(ready(k))n++;return n}

 /* ------------------------------------------------ backing store size */
 // the canvas's drawn size in device pixels (CSS size x the UI zoom x the pixel ratio): drawn 1:1, nothing is blurred
 function measure(c,force){
  var now=performance.now();if(!force&&st.size&&now-st.sizedAt<1000)return;st.sizedAt=now;
  var r=c.getBoundingClientRect(),dpr=window.devicePixelRatio||1;if(!(r.width>0))return;
  var px=Math.max(48,Math.round(r.width*dpr));
  if(px!==st.size){st.size=px;c.width=c.height=px}
  st.k=px/W;st.u=Math.max(1,Math.round(st.k),Math.round(dpr*.9));
  telemetry.backing=px;telemetry.pixel=st.u;
 }
 if(typeof addEventListener==='function')addEventListener('resize',function(){st.sizedAt=0});

 /* ------------------------------------------------------ island ground */
 // one colour a tile (the ground's own underlay), computed chunk by chunk as needed and a few more each paint
 var ground={key:'',terrain:null,W:0,D:0,rgb:null,done:null,todo:null,count:0,gain:1};
 function groundKey(){
  var p=provider(),G=typeof HolmOverhaulGround!=='undefined'?HolmOverhaulGround:null,L=G&&G.LOOK;
  return (p?p.id+':'+p.worldRevision:'-')+':'+(oldschool()?'os':'flat')+':'+(L?L.scale+':'+L.palette.join('|'):'')+':'+(G&&G.pathStyle?G.pathStyle():'');
 }
 function ensureGround(){
  if(!island()||typeof HolmOverhaulGround==='undefined'||typeof HolmOverhaulChunks==='undefined')return null;
  var md=HolmArrivalQA.mapData&&HolmArrivalQA.mapData();if(!md||!md.terrain)return null;
  var key=groundKey();
  if(ground.key!==key||ground.terrain!==md.terrain){
   var t=md.terrain,cw=Math.ceil(t.width/8),cd=Math.ceil(t.depth/8);
   ground={serial:(ground.serial||0)+1,key:key,terrain:t,W:t.width,D:t.depth,rgb:new Uint8ClampedArray(t.width*t.depth*3),done:new Uint8Array(cw*cd),todo:null,count:0,cw:cw,cd:cd,
    gain:oldschool()?.73/(HolmOverhaulGround.LOOK.scale||.52):.72};
   telemetry.ground={chunks:0,total:cw*cd};
  }
  return ground;
 }
 function computeChunk(g,ccx,ccz){
  var i=ccz*g.cw+ccx;if(g.done[i])return;g.done[i]=1;g.count++;telemetry.ground.chunks=g.count;
  var p=provider(),ch=p&&p.getChunk&&p.getChunk(ccx,ccz);if(!ch||!ch.layers||!ch.layers.terrain)return;
  var s;try{s=HolmOverhaulChunks.surface(ch,[])}catch(e){return}
  var os=oldschool(),G=HolmOverhaulGround,mesh=os?G.chunkOldschool(s):G.chunk(s),P=mesh.positions,Cc=mesh.colors,n=P.length/18,lights=[0,0,0,0,0,0];
  for(var t=0;t<n;t++){
   var b=t*18,mx=Infinity,mz=Infinity;
   for(var v=0;v<6;v++){var vx=P[b+v*3],vz=P[b+v*3+2];if(vx<mx)mx=vx;if(vz<mz)mz=vz;lights[v]=os?G.lightAt(vx,vz):1}
   var tx=Math.round(mx),tz=Math.round(mz);if(tx<0||tz<0||tx>=g.W||tz>=g.D)continue;
   var rgb=C.mapColour(C.tileUnderlay(Cc,b,lights),g.gain),o=(tz*g.W+tx)*3;g.rgb[o]=rgb[0];g.rgb[o+1]=rgb[1];g.rgb[o+2]=rgb[2];
  }
 }
 // background work: the chunks nearest the player first, a few a paint, until the island is done
 function groundIdle(budget){
  var g=ensureGround();if(!g||g.count>=g.cw*g.cd)return;
  if(!g.todo){var px=player.position.x/8,pz=player.position.z/8,list=[];for(var z=0;z<g.cd;z++)for(var x=0;x<g.cw;x++)list.push([x,z,(x+.5-px)*(x+.5-px)+(z+.5-pz)*(z+.5-pz)]);
   list.sort(function(a,b){return a[2]-b[2]});g.todo=list}
  var t0=performance.now();while(g.todo.length&&performance.now()-t0<budget){var c=g.todo.shift();computeChunk(g,c[0],c[1])}
 }
 function pack(c){return ((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0}
 var WATER_PX=pack(C.WATER);
 function groundAt(g,x,z){   // the packed colour of an island tile (0: off the island)
  if(x<0||z<0||x>=g.W||z>=g.D)return 0;
  if(g.terrain.water&&g.terrain.water[z*g.W+x]>0)return WATER_PX;
  var ci=(z>>3)*g.cw+(x>>3);if(!g.done[ci])computeChunk(g,x>>3,z>>3);
  var o=(z*g.W+x)*3;return ((255<<24)|(g.rgb[o+2]<<16)|(g.rgb[o+1]<<8)|g.rgb[o])>>>0;
 }

 /* ------------------------------------------------------ island floors */
 // building floors, decks and docks from the composed walk graph: the lowest floor at a tile (the ground storey), as a
 // packed colour a tile on the island grid (+ the level: 1 surface, 2 underground) and a small map for tiles off it (the
 // ore workings lie offshore). Once the wall plan is in, the tiles the furniture stands on take the floor as well.
 var floors={graph:null,walls:-1,grid:null,lvl:null,W:0,D:0,off:null,version:0,filled:0};
 function floorMap(){
  if(!island())return null;var g=null;try{g=HolmArrivalQA.navGraph()}catch(e){}if(!g)return null;
  if(floors.graph===g&&floors.walls===walls.version)return floors;
  var ft=performance.now();
  var md=HolmArrivalQA.mapData&&HolmArrivalQA.mapData(),t=md&&md.terrain,Wd=t?t.width:0,Dd=t?t.depth:0,best=Object.create(null);
  var open=new Uint8Array(Wd*Dd);   // 1 surface / 2 underground: a walkable tile that is not a floor (open ground)
  for(var i=0;i<g.nodes.length;i++){var n=g.nodes[i],x=Math.floor(n.x),z=Math.floor(n.z),inGrid=x>=0&&z>=0&&x<Wd&&z<Dd;
   if(!C.isFloorSurface(n.surface)||/cellar/i.test(n.owner||'')){if(inGrid&&!/upper|Upper|stair|Stair/.test(n.surface))open[z*Wd+x]|=n.y<-5?2:1;continue}
   var k=x+','+z,cur=best[k];if(!cur||n.y<cur.y)best[k]={x:x,z:z,y:n.y,s:n.surface}}
  var grid=new Uint32Array(Wd*Dd),lvl=new Uint8Array(Wd*Dd),off=Object.create(null);
  for(var key in best){var b=best[key],c=pack(C.floorColour(b.s,b.x,b.z)),l=b.y<-5?2:1;
   if(b.x>=0&&b.z>=0&&b.x<Wd&&b.z<Dd){grid[b.z*Wd+b.x]=c;lvl[b.z*Wd+b.x]=l}else off[key]={c:c,l:l}}
  var filled=0,bare=new Uint8Array(Wd*Dd);for(var bi=0;bi<Wd*Dd;bi++)bare[bi]=!grid[bi]&&!open[bi]?1:0;   // no walk node at all (before furniture)
  if(walls.done&&walls.grid&&Wd){   // furniture: blocked tiles closed in by floor and walls
   var add=[],floorAt=function(a,b2){return a>=0&&b2>=0&&a<Wd&&b2<Dd&&lvl[b2*Wd+a]===1?grid[b2*Wd+a]:0},openAt=function(a,b2){return a<0||b2<0||a>=Wd||b2>=Dd||!!(open[b2*Wd+a]&1)};
   for(var pass=0;pass<3;pass++){add.length=0;   // a few passes: a big table's middle fills once its edge has
   for(var z2=0;z2<Dd;z2++)for(var x2=0;x2<Wd;x2++){var ii=z2*Wd+x2;if(grid[ii]||open[ii])continue;
    var near=(x2>0&&lvl[ii-1]===1)||(x2<Wd-1&&lvl[ii+1]===1)||(z2>0&&lvl[ii-Wd]===1)||(z2<Dd-1&&lvl[ii+Wd]===1);if(!near)continue;
    var fc=C.fillFurniture(x2,z2,floorAt,openAt,walls.grid,'s',6);if(fc)add.push(ii,fc)}
   for(var q=0;q<add.length;q+=2){grid[add[q]]=add[q+1];lvl[add[q]]=1;filled++}if(!add.length)break}
  }
  // a wall a whole tile thick draws as one line, on the floor's side (MinimapCore.thinDoubleWalls)
  if(walls.plans&&Wd){var inG=function(a,b2){return a>=0&&b2>=0&&a<Wd&&b2<Dd};
   walls.draw={s:C.thinDoubleWalls(walls.plans.s,function(a,b2){return inG(a,b2)&&lvl[b2*Wd+a]===1&&!!grid[b2*Wd+a]},function(a,b2){return inG(a,b2)&&!!bare[b2*Wd+a]}),u:walls.plans.u};
   telemetry.walls.drawn=walls.draw.s.h.length+walls.draw.s.v.length}
  floors.graph=g;floors.walls=walls.version;floors.grid=grid;floors.lvl=lvl;floors.W=Wd;floors.D=Dd;floors.off=off;floors.filled=filled;floors.version++;
  telemetry.floorFill=filled;telemetry.floorMs=elapsed(ft);return floors;
 }

 /* -------------------------------------------------------------- walls */
 // The wall meshes are cut at knee height a little at a time (a few ms a paint) once the island is built, into the tile
 // plan (MinimapCore.WallGrid): one paint collects the meshes, the next the floor heights they stand on, then the cutting.
 var walls={sig:'',phase:0,meshes:null,i:0,grid:null,next:null,plans:null,done:false,checkedAt:0,ref:null,version:0};
 function refHeights(){
  // a tile's floor base: the higher of its ground and its lowest building floor (the walls stand on that); off the island
  // grid (the offshore ore workings) the lowest walk node
  var md=HolmArrivalQA.mapData(),t=md&&md.terrain,Wd=t?t.width:0,Dd=t?t.depth:0,grid=new Float32Array(Wd*Dd),off=Object.create(null);
  if(t){var S=Wd+1,h=t.heights;for(var z=0;z<Dd;z++)for(var x=0;x<Wd;x++)grid[z*Wd+x]=(h[z*S+x]+h[z*S+x+1]+h[(z+1)*S+x]+h[(z+1)*S+x+1])/4}
  var g=HolmArrivalQA.navGraph();if(g)for(var i=0;i<g.nodes.length;i++){var n=g.nodes[i];if(/upper|Upper|Stair|stair/.test(n.surface)||/cellar/i.test(n.owner||''))continue;
   var tx=Math.floor(n.x),tz=Math.floor(n.z);
   if(tx>=0&&tz>=0&&tx<Wd&&tz<Dd){var gi=tz*Wd+tx,gy=grid[gi];if(n.y>gy-2.5&&n.y<gy+4&&C.isFloorSurface(n.surface))grid[gi]=Math.max(gy,n.y)}
   else{var k=tx+','+tz;if(off[k]===undefined||n.y<off[k])off[k]=n.y}}
  return {W:Wd,D:Dd,grid:grid,off:off};
 }
 // rescanned only when the island's buildings or prop sets change (not for every fire, drop or effect added to the scene)
 function wallSignature(){var p=provider(),n=0;if(typeof scene!=='undefined'&&scene)for(var i=0;i<scene.children.length;i++)if(/^(island-building-|world-object-|island-props)/.test(scene.children[i].name||''))n++;return (p?p.id+':'+p.worldRevision:'-')+':'+n}
 function wallsIdle(budget){
  if(!island()||typeof scene==='undefined'||!scene)return;
  var now=performance.now();
  if(walls.done&&!walls.phase){if(now-walls.checkedAt<5000)return;walls.checkedAt=now;if(wallSignature()===walls.sig)return;walls.phase=1}
  if(!walls.phase)walls.phase=1;
  if(walls.phase===1){   // one paint: find the wall meshes
   var list=[];scene.traverse(function(o){if(!o.isMesh||!C.isWallMesh(o.name))return;var m=o.material;if(m&&(m.visible===false||(m.transparent&&m.opacity===0)))return;list.push(o)});
   walls.meshes=list;walls.i=0;walls.next=new C.WallGrid();walls.sig=wallSignature();walls.phase=2;
   telemetry.walls=Object.assign({},telemetry.walls,{meshes:list.length,scanning:true});return}
  if(walls.phase===2){walls.ref=refHeights();walls.phase=3;return}   // the next: the floor heights
  var t0=performance.now();   // then the cutting, a few ms a paint
  while(walls.i<walls.meshes.length&&performance.now()-t0<budget){var t1=performance.now();sliceMesh(walls.meshes[walls.i++]);telemetry.walls.maxMeshMs=Math.max(telemetry.walls.maxMeshMs||0,elapsed(t1))}
  if(walls.i>=walls.meshes.length){
   walls.grid=walls.next;walls.next=null;walls.plans={s:walls.grid.plan('s'),u:walls.grid.plan('u')};walls.done=true;walls.phase=0;walls.checkedAt=now;walls.version++;
   walls.meshes=null;walls.ref=null;
   telemetry.walls={meshes:telemetry.walls.meshes,cuts:walls.grid.cuts,edges:walls.plans.s.h.length+walls.plans.s.v.length+walls.plans.u.h.length+walls.plans.u.v.length,
    slanted:walls.plans.s.slant.length+walls.plans.u.slant.length,done:true,maxMeshMs:telemetry.walls.maxMeshMs||0};
  }
 }
 // the floor base under a point: the highest of the four tiles around it (a wall on the edge of a raised floor stands on the
 // floor, not on the ground outside it)
 function refAt(x,z){var R0=walls.ref,best,xs=[Math.floor(x-.5),Math.floor(x+.5)],zs=[Math.floor(z-.5),Math.floor(z+.5)];
  for(var i=0;i<2;i++)for(var j=0;j<2;j++){var a=xs[i],b=zs[j],v=(a>=0&&b>=0&&a<R0.W&&b<R0.D)?R0.grid[b*R0.W+a]:R0.off[a+','+b];if(v!==undefined&&(best===undefined||v>best))best=v}return best}
 var _m4=null;
 function sliceMesh(o){
  var geo=o.geometry,pos=geo&&geo.attributes&&geo.attributes.position;if(!pos)return;
  o.updateWorldMatrix(true,false);
  var heights=C.sliceHeights(o.name),idx=geo.index,nv=pos.count,count=o.isInstancedMesh?o.count:1;
  var world=new Float32Array(nv*3),e,A=[0,0,0],B=[0,0,0],Cv=[0,0,0];
  for(var inst=0;inst<count;inst++){
   if(o.isInstancedMesh){_m4=_m4||new THREE.Matrix4();o.getMatrixAt(inst,_m4);_m4.premultiply(o.matrixWorld);e=_m4.elements}else e=o.matrixWorld.elements;
   for(var v=0;v<nv;v++){var x=pos.getX(v),y=pos.getY(v),z=pos.getZ(v);world[v*3]=e[0]*x+e[4]*y+e[8]*z+e[12];world[v*3+1]=e[1]*x+e[5]*y+e[9]*z+e[13];world[v*3+2]=e[2]*x+e[6]*y+e[10]*z+e[14]}
   var nt=idx?idx.count:nv;
   for(var i=0;i+2<nt;i+=3){
    var a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
    A[0]=world[a*3];A[1]=world[a*3+1];A[2]=world[a*3+2];B[0]=world[b*3];B[1]=world[b*3+1];B[2]=world[b*3+2];Cv[0]=world[c*3];Cv[1]=world[c*3+1];Cv[2]=world[c*3+2];
    var lo=Math.min(A[1],B[1],Cv[1]),hi=Math.max(A[1],B[1],Cv[1]);if(hi-lo<.05)continue;   // flat faces (tops, sills) never cut
    var ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],vx=Cv[0]-A[0],vy=Cv[1]-A[1],vz=Cv[2]-A[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    if(Math.abs(ny)>.4*Math.sqrt(nx*nx+ny*ny+nz*nz))continue;   // only upright faces: a slope (a ramp, a roof skirt, rock) cut level is a contour, not a wall
    var base=refAt((A[0]+B[0]+Cv[0])/3,(A[2]+B[2]+Cv[2])/3);if(base===undefined)base=lo;
    for(var hI=0;hI<heights.length;hI++){var h=base+heights[hI];if(h<=lo||h>=hi)continue;var s=C.sliceTriangle(A,B,Cv,h);if(s)walls.next.add(s,base<-5?'u':'s')}
   }
  }
 }

 /* ------------------------------------------------------ cache geometry */
 function levelNow(){return underground()?'u':'s'}
 function updateCacheKey(){
  var p=provider(),tx=player.position.x,tz=player.position.z,ccx=Math.floor(tx/8),ccz=Math.floor(tz/8);
  var plane=(typeof Player!=='undefined'&&Player.plane)||0,lvl=levelNow(),g=island()?ensureGround():null;
  var key=(p?p.id:'legacy')+':'+(p?p.worldRevision:0)+':p'+plane+':'+lvl+':'+ccx+','+ccz+':z'+st.ppt+':b'+st.size+
   (g?':g'+g.serial:'')+(island()?':f'+(floorMap(),floors.version)+':w'+walls.version:'');
  if(key===cache.key){telemetry.staticCacheHits++;return false}
  var T=st.ppt*st.k,E=Math.ceil(R/st.ppt+7);
  cache.key=key;cache.cx=ccx*8+4;cache.cz=ccz*8+4;cache.T=T;cache.E=E;cache.x0=cache.cx-E;cache.z0=cache.cz-E;cache.level=lvl;
  cache.size=Math.ceil(2*E*T);cache.markerSignature='';telemetry.cacheKey=key;return true;
 }
 function toCache(x,z){return {x:(x-cache.x0)*cache.T,y:(z-cache.z0)*cache.T}}
 // a crisp line of s x s squares (walls, roads, the route)
 function pixLine(ctx,x0,y0,x1,y1,s){var dx=x1-x0,dy=y1-y0,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(s*.5))),h=s/2;
  for(var i=0;i<=n;i++){var t=i/n;ctx.fillRect(Math.round(x0+dx*t-h),Math.round(y0+dy*t-h),s,s)}}

 /* --------------------------------------------------------- static layer */
 var BCOL={water:'#2c4a66',grass:'#4d6b35',autumn:'#a06a28',swamp:'#453655',desert:'#c2a862',snow:'#dbe0de',scar:'#54453a',rock:'#8a8276'};
 var hexCache={};
 function hexRgb(h){var c=hexCache[h];if(c)return c;var n=parseInt(h.slice(1),16);return hexCache[h]=[n>>16&255,n>>8&255,n&255]}
 function terrainColor(x,z){   // the legacy and online worlds: height + biome, as before
  var y=(typeof groundY==='function')?groundY(x,z):0;
  if(y===null)return C.WATER;
  if(typeof DITCH!=='undefined'&&y<-1.15&&Math.abs(z-DITCH.z)<DITCH.half+2)return hexRgb('#2e261e');
  if(y<-1.15)return C.WATER;if(y<-.75)return hexRgb('#c9b98a');
  var b=(typeof gridBiome==='function')?gridBiome(x,z):'grass';return hexRgb(BCOL[b]||'#4d6b35');
 }
 function buildLastlightFloorMap(ctx){   // the mainland lighthouse's storeys (legacy world), redrawn on the new geometry
  if(island()||typeof HolmLastlightData==='undefined'||typeof Player==='undefined')return false;
  var c=HolmLastlightData.contract,p=Player.plane||0,level=c.levels.filter(function(l){return l.plane===p})[0],T=cache.T,S=cache.size,cp=toCache(c.center.x,c.center.z);
  function sq(pos,color){if(!pos)return;var q=toCache(pos.x,pos.z),r=Math.max(2,Math.round(T*.6));ctx.fillStyle='#1a1208';ctx.fillRect(Math.round(q.x)-r-1,Math.round(q.y)-r-1,2*r+2,2*r+2);ctx.fillStyle=color;ctx.fillRect(Math.round(q.x)-r,Math.round(q.y)-r,2*r,2*r)}
  if(level){ctx.fillStyle='#1b2831';ctx.fillRect(0,0,S,S);ctx.fillStyle='#76512d';ctx.strokeStyle='#e0d8bd';ctx.lineWidth=Math.max(2,st.u);ctx.beginPath();ctx.arc(cp.x,cp.y,8.9*T,0,Math.PI*2);ctx.fill();ctx.stroke();
   sq(level.down,'#f0d36b');sq(level.up,'#f0d36b');if(p===c.trapdoor.plane)sq(c.trapdoor,'#c87632');if(p===c.beacon.plane)sq(c.beacon.lever,'#dc4037');return true}
  if(p===c.dungeon.plane){ctx.fillStyle='#18242a';ctx.fillRect(0,0,S,S);var d=c.dungeon,pts=[[-18.5,-9],[-14.8,-13.8],[-7.5,-15],[1,-14.4],[9.8,-13],[16.8,-9.2],[19,-2],[18.2,6.2],[13,12.8],[5.8,14.8],[-2.8,14.2],[-11.2,12],[-17.2,6],[-19,-1.5]];
   ctx.fillStyle='#5f655f';ctx.strokeStyle='#c5c9bb';ctx.lineWidth=Math.max(2,st.u);ctx.beginPath();pts.forEach(function(v,i){var q=toCache(d.center.x+v[0],d.center.z+v[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fill();ctx.stroke();
   sq(d.ladder,'#f0d36b');return true}
  return false;
 }
 function buildStatic(){
  var t=performance.now(),S=cache.size;
  if(staticCanvas.width!==S||staticCanvas.height!==S){staticCanvas.width=staticCanvas.height=S}
  var ctx=staticCanvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  var bg=cache.level==='u'?C.VOID:C.WATER;ctx.fillStyle=C.rgbCss(bg);ctx.fillRect(0,0,S,S);
  if(buildLastlightFloorMap(ctx)){var lm=elapsed(t);telemetry.staticBuilds++;telemetry.lastStaticMs=lm;telemetry.maxStaticMs=Math.max(telemetry.maxStaticMs,lm);return}
  // one pixel buffer (no read back from the canvas): tiles, floors and walls are written into it, then put once
  var img=ctx.createImageData(S,S),buf=new Uint32Array(img.data.buffer),E=cache.E,x0=cache.x0,z0=cache.z0,T=cache.T;buf.fill(pack(bg));
  var isl=island(),g=isl?ensureGround():null,fm=isl?floorMap():null,lvl=cache.level,want=lvl==='u'?2:1;
  var edge=new Int32Array(2*E+1);for(var e=0;e<=2*E;e++)edge[e]=Math.max(0,Math.min(S,Math.round(e*T)));
  for(var zi=0;zi<2*E;zi++){var Y0=edge[zi],Y1=edge[zi+1];if(Y1<=Y0)continue;var z=z0+zi;
   for(var xi=0;xi<2*E;xi++){var X0=edge[xi],X1=edge[xi+1];if(X1<=X0)continue;var x=x0+xi,px=0;
    if(lvl==='s'){if(g)px=groundAt(g,x,z);else if(!isl)px=pack(terrainColor(x+.5,z+.5))}
    if(fm){if(x>=0&&z>=0&&x<fm.W&&z<fm.D){var fi=z*fm.W+x;if(fm.lvl[fi]===want)px=fm.grid[fi]}else{var fo=fm.off[x+','+z];if(fo&&fo.l===want)px=fo.c}}
    if(!px)continue;for(var y=Y0;y<Y1;y++){var row=y*S;for(var xx=X0;xx<X1;xx++)buf[row+xx]=px}}}
  // walls: thin white lines (one art pixel; thinner zoomed out), rasterised straight into the buffer
  var ws=Math.max(1,Math.round(st.u*Math.min(1,st.ppt/4)));
  if(isl&&walls.plans){var wpx=pack(C.WALL),hw=Math.floor(ws/2),plan=(walls.draw||walls.plans)[lvl],xe=x0+2*E,ze=z0+2*E;
   var rect=function(X0,Y0,X1,Y1){X0=Math.max(0,X0);Y0=Math.max(0,Y0);X1=Math.min(S,X1);Y1=Math.min(S,Y1);for(var y=Y0;y<Y1;y++){var r0=y*S;for(var xk=X0;xk<X1;xk++)buf[r0+xk]=wpx}};
   plan.h.forEach(function(w){var x=w[0],z=w[1]/2;if(x<x0-1||x>xe||z<z0-1||z>ze)return;var Y=Math.round((z-z0)*T)-hw;rect(Math.round((x-x0)*T)-hw,Y,Math.round((x+1-x0)*T)-hw+ws,Y+ws)});
   plan.v.forEach(function(w){var z=w[0],x=w[1]/2;if(x<x0-1||x>xe||z<z0-1||z>ze)return;var X=Math.round((x-x0)*T)-hw;rect(X,Math.round((z-z0)*T)-hw,X+ws,Math.round((z+1-z0)*T)-hw+ws)});
   plan.slant.forEach(function(sg){if(Math.max(sg[0],sg[2])<x0-1||Math.min(sg[0],sg[2])>xe||Math.max(sg[1],sg[3])<z0-1||Math.min(sg[1],sg[3])>ze)return;
    var ax=(sg[0]-x0)*T,ay=(sg[1]-z0)*T,dx=(sg[2]-sg[0])*T,dy=(sg[3]-sg[1])*T,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
    for(var i=0;i<=n;i++){var X=Math.round(ax+dx*i/n)-hw,Y=Math.round(ay+dy*i/n)-hw;rect(X,Y,X+ws,Y+ws)}})}
  ctx.putImageData(img,0,0);
  if(!isl&&lvl==='s'&&typeof PATHS!=='undefined'){   // legacy roads, drawn crisp
   ctx.fillStyle='rgb(196,182,146)';var rs=Math.max(ws,Math.round(1.6*st.ppt*st.k/4));
   for(var si=0;si<PATHS.length;si++){var seg=PATHS[si];for(var pi=1;pi<seg.length;pi++){var a=toCache(seg[pi-1][0],seg[pi-1][1]),b=toCache(seg[pi][0],seg[pi][1]);pixLine(ctx,a.x,a.y,b.x,b.y,rs)}}
  }
  var p=provider(),meta=p&&p.mapMetadata;
  if(meta&&Array.isArray(meta.riskAreas))meta.riskAreas.forEach(function(risk){var rr=Number(risk.r||risk.radius||5)*cache.T,q=toCache(Number(risk.x),Number(risk.z));ctx.fillStyle='rgba(120,31,28,.52)';ctx.beginPath();ctx.arc(q.x,q.y,rr,0,7);ctx.fill()});
  var ms=elapsed(t);telemetry.staticBuilds++;telemetry.lastStaticMs=ms;telemetry.maxStaticMs=Math.max(telemetry.maxStaticMs,ms);
 }

 /* --------------------------------------------------------- marker layer */
 function sceneryList(){   // [{id, x, z}] the map scenery near the cache: habitat trees and rock groups, lesson trees and rocks
  var out=[],half=cache.E+2,md=island()&&HolmArrivalQA.mapData&&HolmArrivalQA.mapData();
  function near(x,z){return Math.abs(x-cache.cx)<=half&&Math.abs(z-cache.cz)<=half}
  if(md&&md.habitat&&cache.level==='s')for(var i=0;i<md.habitat.length;i++){var h=md.habitat[i],id=C.sceneryFor(h.asset);if(id&&near(h.x,h.z))out.push({id:id,x:h.x,z:h.z})}
  if(island()&&cache.level==='s'&&typeof scene!=='undefined'&&scene)for(var j=0;j<scene.children.length;j++){var o=scene.children[j],m=/^world-object-Landscape_(oak|hazel|birch|pine)/.exec(o.name||'');if(m&&near(o.position.x,o.position.z))out.push({id:C.sceneryFor(m[1]),x:o.position.x,z:o.position.z})}
  if(typeof WORLD!=='undefined'&&WORLD.resources)for(var k=0;k<WORLD.resources.length;k++){var r=WORLD.resources[k],u=r.userData||{};if(!u.alive||!near(r.position.x,r.position.z))continue;
   if((r.position.y<-5)!==(cache.level==='u'))continue;
   var sid=u.rtype==='tree'?'tree':u.rtype==='rock'?'rock':null;if(sid)out.push({id:sid,x:r.position.x,z:r.position.z})}
  return out;
 }
 function markerSignature(){
  var s=[imagesReady()];if(typeof WORLD==='undefined'||!WORLD.resources)return s.join('|');var half=cache.E+2;
  for(var i=0;i<WORLD.resources.length;i++){var r=WORLD.resources[i];if(!r.userData||!r.userData.alive||Math.abs(r.position.x-cache.cx)>half||Math.abs(r.position.z-cache.cz)>half)continue;
   s.push((r.userData.rtype||'r')+':'+Math.round(r.position.x*2)+','+Math.round(r.position.z*2))}
  var md=island()&&HolmArrivalQA.mapData&&HolmArrivalQA.mapData();s.push(md&&md.habitat?md.habitat.length:0);
  return s.join('|');
 }
 function buildMarkers(signature){
  var t=performance.now(),S=cache.size;if(markerCanvas.width!==S||markerCanvas.height!==S){markerCanvas.width=markerCanvas.height=S}
  var ctx=markerCanvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,S,S);
  var su=Math.max(1,Math.round(st.u*Math.min(1,st.ppt/4)));
  sceneryList().forEach(function(m){var im=IMG[m.id],q=toCache(m.x,m.z);
   if(ready(m.id)){var w=im.naturalWidth*su,h=im.naturalHeight*su;ctx.drawImage(im,Math.round(q.x-w/2),Math.round(q.y-h/2),w,h)}
   else{ctx.fillStyle=m.id==='rock'?'#8a8276':'#1f5414';ctx.fillRect(Math.round(q.x)-2*su,Math.round(q.y)-2*su,4*su,4*su)}});
  cache.markerSignature=signature;var ms=elapsed(t);telemetry.markerBuilds++;telemetry.lastMarkerMs=ms;telemetry.maxMarkerMs=Math.max(telemetry.maxMarkerMs,ms);
 }

 /* ----------------------------------------------------------- map icons */
 var icons={list:[],sig:'',checkedAt:0,boxes:new WeakMap()};
 function centreOf(o){var c=icons.boxes.get(o);if(c)return c;var b=new THREE.Box3().setFromObject(o),v=b.getCenter(new THREE.Vector3());c={x:v.x,y:b.min.y,z:v.z};icons.boxes.set(o,c);return c}
 function refreshIcons(){
  var now=performance.now();if(now-icons.checkedAt<2000)return;icons.checkedAt=now;
  if(typeof WORLD==='undefined')return;
  var trials=0;try{trials=typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs?HolmIslandTrials.npcs().length:0}catch(e){}
  var sig=(provider()?provider().id:'')+':'+WORLD.clickables.length+':'+(WORLD.resources?WORLD.resources.length:0)+':'+trials;
  if(sig===icons.sig)return;icons.sig=sig;
  var raw=[];
  try{
   for(var i=0;i<WORLD.clickables.length;i++){var o=WORLD.clickables[i],u=o&&o.userData||{},id=null;
    if(u.islandService){var s=u.islandService;id=C.iconForService(s.building+':'+(s.target||'')+':'+s.label)}
    else if(u.kind)id=C.iconForKind(u.kind);
    if(id&&typeof THREE!=='undefined'){var c=centreOf(o);raw.push({icon:id,x:c.x,z:c.z,y:c.y})}}
   if(WORLD.resources)for(var j=0;j<WORLD.resources.length;j++){var r=WORLD.resources[j],ri=C.iconForResource(r.userData&&r.userData.rtype);if(ri)raw.push({icon:ri,x:r.position.x,z:r.position.z,y:r.position.y})}
   if(typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs)HolmIslandTrials.npcs().forEach(function(m){if(m&&m.mesh)raw.push({icon:'combat',x:m.mesh.position.x,z:m.mesh.position.z,y:m.mesh.position.y})});
  }catch(e){console.warn('[minimap] icons',e)}
  icons.list=C.cluster(raw);telemetry.icons=icons.list.length;
 }

 /* ---------------------------------------------------------- dynamic */
 // a pixel sprite at a whole-number scale, pre-drawn once per scale, placed on whole pixels
 var spriteCache=new Map();
 function spriteAt(sp,s){var key=sp,m=spriteCache.get(key);if(!m){m={};spriteCache.set(key,m)}var cv=m[s];if(cv)return cv;
  cv=document.createElement('canvas');cv.width=sp.w*s;cv.height=sp.h*s;var x=cv.getContext('2d');for(var i=0;i<sp.runs.length;i++){var r=sp.runs[i];x.fillStyle=r.c;x.fillRect(r.x*s,r.y*s,r.w*s,s)}return m[s]=cv}
 function drawSprite(ctx,sp,X,Y,s){ctx.drawImage(spriteAt(sp,s),Math.round(X-sp.ax*s),Math.round(Y-sp.ay*s))}
 function routePoints(){
  try{if(typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active()&&HolmArrivalPlayer.route)return HolmArrivalPlayer.route()}catch(e){}
  return (typeof Player!=='undefined'&&Player.path)||[];
 }
 function friendOf(n){try{return !!(n.isFriend||(typeof CRFriends!=='undefined'&&CRFriends.has&&n.t&&CRFriends.has(n.t.name)))}catch(e){return false}}
 function drawDynamic(ctx,yaw,px,pz){
  var k=st.k,u=st.u,S=st.size,count=0,lvlU=underground(),dots=[];
  function at(x,z){var q=C.toMap(x,z,px,pz,yaw,st.ppt);return {x:q.x*k,y:q.y*k,bx:q.x,by:q.y}}
  function sameLevel(y){return !isFinite(y)||(y<-5)===lvlU}
  // the route the walker follows (white on a dark edge, crisp)
  var pts=routePoints(),end=null;
  if(pts&&pts.length){var n=Math.min(pts.length,400),path=[at(px,pz)];for(var i=0;i<n;i++)path.push(at(pts[i].x,pts[i].z));
   ctx.fillStyle='rgba(0,0,0,.85)';for(var a=1;a<path.length;a++)pixLine(ctx,path[a-1].x,path[a-1].y,path[a].x,path[a].y,u+2);
   ctx.fillStyle=C.rgbCss(C.ROUTE);for(var b=1;b<path.length;b++)pixLine(ctx,path[b-1].x,path[b-1].y,path[b].x,path[b].y,u);
   telemetry.routeTiles=pts.length;end=pts[pts.length-1]}else telemetry.routeTiles=0;
  // map icons, upright
  for(var ii=0;ii<icons.list.length;ii++){var ic=icons.list[ii];if(!sameLevel(ic.y)||!ready(ic.icon))continue;var q=at(ic.x,ic.z);if(!C.inDisc(q.bx,q.by,-6))continue;
   var im=IMG[ic.icon],w=im.naturalWidth*u,h=im.naturalHeight*u;ctx.drawImage(im,Math.round(q.x-w/2),Math.round(q.y-h/2),w,h)}
  // dots: items under folk under adventurers (2004's order)
  function dot(kind,x,z,y,ref){if(count>=telemetry.dynamicLimit||!sameLevel(y))return;var q=at(x,z);if(!C.inDisc(q.bx,q.by,1))return;dots.push({kind:kind,x:x,z:z,X:q.x,Y:q.y,ref:ref});count++}
  var seen=new Set();
  if(typeof WORLD!=='undefined'){
   for(var d=0;d<WORLD.drops.length;d++){var dr=WORLD.drops[d];dot('item',dr.position.x,dr.position.z,dr.position.y)}
   for(var j=0;j<WORLD.npcs.length;j++){var nn=WORLD.npcs[j];if(nn.dead||!nn.mesh)continue;seen.add(nn.mesh);
    dot(nn.isPlayer?(friendOf(nn)?'friend':'player'):'npc',nn.mesh.position.x,nn.mesh.position.z,nn.mesh.position.y,nn.t&&nn.t.name)}
   for(var c2=0;c2<WORLD.clickables.length;c2++){var o=WORLD.clickables[c2];if(o.userData&&o.userData.kind==='friendly'&&!seen.has(o)){seen.add(o);dot('npc',o.position.x,o.position.z,o.position.y)}}
   try{if(typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors){var tl=HolmIslandTutors.tutors();for(var ti=0;ti<tl.length;ti++)dot('npc',tl[ti].x,tl[ti].z,tl[ti].y,tl[ti].id||tl[ti].name)}
    if(typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs){var tn=HolmIslandTrials.npcs();for(var tj=0;tj<tn.length;tj++){var m=tn[tj];if(!m.dead&&m.mesh&&!seen.has(m.mesh)){seen.add(m.mesh);dot('npc',m.mesh.position.x,m.mesh.position.z,m.mesh.position.y)}}}}catch(e){}
  }
  var order={item:0,npc:1,friend:2,player:3};dots.sort(function(a,b){return order[a.kind]-order[b.kind]});
  for(var di=0;di<dots.length;di++){var dd=dots[di];drawSprite(ctx,C.SPRITES.dot[dd.kind],dd.X,dd.Y,u)}
  lastDots=dots;telemetry.dots=dots.length;
  // the walk flag, planted on the destination tile (pinned to the rim, pointing the way, when it is off the map)
  var dest=end||((Player.path&&Player.path.length)?Player.path[Player.path.length-1]:Player.moveTo);
  if(dest){var fq=at(dest.x,dest.z),fx=fq.x,fy=fq.y,dd2=Math.hypot(fq.bx-W/2,fq.by-W/2);
   if(dd2>R-8){fx=S/2+(fq.x-S/2)*(R-8)/dd2;fy=S/2+(fq.y-S/2)*(R-8)/dd2}
   drawSprite(ctx,C.SPRITES.flag,fx,fy,u)}
  // you: the white square at the centre
  drawSprite(ctx,C.SPRITES.you,S/2,S/2,u);
  telemetry.dynamicMarkers=count;telemetry.maxDynamicMarkers=Math.max(telemetry.maxDynamicMarkers,count);
 }

 /* --------------------------------------------------------------- paint */
 function draw(){
  if(typeof player==='undefined'||!player)return;
  var c=document.getElementById('minimap');if(!c)return;
  var t=performance.now();askImages();measure(c);if(!st.size)measure(c,true);if(!st.size)return;
  if(island()){wallsIdle(3);groundIdle(1.5)}
  var changed=updateCacheKey();
  if(changed||telemetry.staticBuilds===0)buildStatic();
  var now=performance.now(),signature=cache.markerSignature;
  if(changed||now-cache.markerCheckedAt>=500){signature=markerSignature();cache.markerCheckedAt=now}
  if(changed||telemetry.markerBuilds===0||signature!==cache.markerSignature)buildMarkers(signature);else telemetry.markerCacheHits++;
  refreshIcons();
  var ctx=c.getContext('2d'),S=st.size,yaw=(typeof camCtl!=='undefined'&&camCtl)?camCtl.yaw:0,px=player.position.x,pz=player.position.z;
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,S,S);
  ctx.save();ctx.beginPath();ctx.arc(S/2,S/2,R*st.k,0,Math.PI*2);ctx.clip();
  ctx.fillStyle=C.rgbCss(cache.level==='u'?C.VOID:C.WATER);ctx.fillRect(0,0,S,S);
  ctx.save();ctx.translate(S/2,S/2);ctx.rotate(yaw);
  var ox=(cache.x0-px)*cache.T,oy=(cache.z0-pz)*cache.T;
  ctx.drawImage(staticCanvas,ox,oy);ctx.drawImage(markerCanvas,ox,oy);ctx.restore();
  drawDynamic(ctx,yaw,px,pz);
  ctx.restore();
  if(typeof window.CRCompassSet==='function'&&Math.abs(yaw-(telemetry.compassYaw||1e9))>0.004){telemetry.compassYaw=yaw;window.CRCompassSet(yaw)}
  var tip='Click the map to walk there. Scroll to zoom ('+C.tilesAcross(st.ppt)+' tiles across).';
  if(st.tipSet!==tip&&c.getAttribute('data-tip')!==null){c.setAttribute('data-tip',tip);c.setAttribute('aria-label',tip);st.tipSet=tip}
  telemetry.dynamicFrames++;var ms=elapsed(t);telemetry.lastPaintMs=ms;telemetry.maxPaintMs=Math.max(telemetry.maxPaintMs,ms);
 }

 /* --------------------------------------------------------------- zoom */
 function setZoom(ppt){
  var next=C.clampPpt(ppt);if(next===st.ppt)return false;
  st.ppt=next;C.saveZoom(storage(),next);telemetry.ppt=next;telemetry.tilesAcross=C.tilesAcross(next);telemetry.zoomChanges++;
  cache.key='';try{draw()}catch(e){console.warn('[minimap] zoom paint',e)}return true;
 }
 function zoomBy(steps){var p=st.ppt;for(var i=0;i<Math.abs(steps);i++)p=C.step(p,steps>0?1:-1);return setZoom(p)}
 function onWheel(e){
  e.preventDefault();e.stopPropagation();
  var now=performance.now();if(now-st.wheelAt>400)st.wheelAcc=0;st.wheelAt=now;
  var r=C.wheel(st.wheelAcc,e.deltaY,e.deltaMode);st.wheelAcc=r.acc;if(r.steps)zoomBy(r.steps);
 }
 function span(ts){var a=ts[0],b=ts[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
 function onTouchStart(e){if(e.touches.length===2){st.pinch={d0:span(e.touches),ppt0:st.ppt};e.preventDefault();e.stopPropagation()}}
 function onTouchMove(e){if(st.pinch&&e.touches.length===2){e.preventDefault();e.stopPropagation();setZoom(C.pinch(st.pinch.ppt0,st.pinch.d0,span(e.touches)))}}
 function onTouchEnd(e){if(st.pinch&&e.touches.length<2){st.pinch=null;st.pinchEndAt=performance.now()}}
 // a lifted pinch is not a walk order
 function onClickCapture(e){if(performance.now()-st.pinchEndAt<450){e.stopPropagation();e.preventDefault()}}
 function bindInput(){
  var f=document.getElementById('minimap-frame')||document.getElementById('minimap');if(!f||f.__mmZoom)return;f.__mmZoom=true;
  f.addEventListener('wheel',onWheel,{passive:false});
  f.addEventListener('touchstart',onTouchStart,{passive:false});f.addEventListener('touchmove',onTouchMove,{passive:false});
  f.addEventListener('touchend',onTouchEnd);f.addEventListener('touchcancel',onTouchEnd);f.addEventListener('click',onClickCapture,true);
  var c=document.getElementById('minimap');if(c){c.style.touchAction='none';c.style.imageRendering='pixelated'}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindInput);else bindInput();

 /* ------------------------------------------------------------ helpers */
 function screenToWorld(x,y,origin,yaw){
  var out=C.toWorld(x,y,origin.x,origin.z,yaw,st.ppt);
  telemetry.clicks++;telemetry.lastClickWorld={x:+out.x.toFixed(3),z:+out.z.toFixed(3)};return out;
 }
 // where a world point lands on the minimap now, in viewport px (QA and the tooltip-free tests use it)
 function worldToClient(x,z){
  var c=document.getElementById('minimap');if(!c||typeof player==='undefined')return null;var r=c.getBoundingClientRect(),yaw=(typeof camCtl!=='undefined'&&camCtl)?camCtl.yaw:0;
  var q=C.toMap(x,z,player.position.x,player.position.z,yaw,st.ppt);return {x:r.left+q.x*r.width/W,y:r.top+q.y*r.height/W,inDisc:C.inDisc(q.x,q.y,2)};
 }
 function snapshot(){return Object.assign({},telemetry,{walls:Object.assign({},telemetry.walls),ground:Object.assign({},telemetry.ground)})}
 function dots(){return lastDots.map(function(d){return {kind:d.kind,x:+d.x.toFixed(3),z:+d.z.toFixed(3),X:+d.X.toFixed(2),Y:+d.Y.toFixed(2),name:d.ref||null}})}
 function zoom(){return {ppt:st.ppt,tilesAcross:C.tilesAcross(st.ppt),steps:C.ZOOMS.slice(),index:C.nearestIndex(st.ppt),pixel:st.u,backing:st.size}}
 return {draw:draw,screenToWorld:screenToWorld,worldToClient:worldToClient,snapshot:snapshot,dots:dots,zoom:zoom,setZoom:setZoom,zoomBy:zoomBy,
  icons:function(){return icons.list.slice()},
  // read-only (QA): the wall plan's edges inside a box of tiles, {h: [[x, z]], v: [[z, x]], slant}, z / x the line's position
  walls:function(x0,z0,x1,z1,level){var p=walls.plans&&walls.plans[level||'s'];if(!p)return null;
   return {h:p.h.filter(function(w){return w[0]>=x0&&w[0]<=x1&&w[1]/2>=z0&&w[1]/2<=z1}).map(function(w){return [w[0],w[1]/2]}),v:p.v.filter(function(w){return w[0]>=z0&&w[0]<=z1&&w[1]/2>=x0&&w[1]/2<=x1}).map(function(w){return [w[0],w[1]/2]}),
    slant:p.slant.filter(function(w){return w[0]>=x0-1&&w[0]<=x1+1&&w[1]>=z0-1&&w[1]<=z1+1})}}};
})();
window.CRMinimap=CRMinimap;
function drawMinimap(){CRMinimap.draw()}
