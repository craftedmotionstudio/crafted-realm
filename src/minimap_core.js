/* ============================================================================
   MINIMAP_CORE: the pure half of the 2004-style minimap (holm-minimap-2004, owner 2026-09-29: "Our mini map in the top
   right just isn't the most clear. We want it to look more like old school RuneScape ... the yellow player icons need to be
   more detailed, as far as where the characters are at ... if I could scroll wheel on the minimap to set it to a specific
   distance, that would be nice").
   No DOM, no THREE: the zoom steps and their memory, the world <-> map transform (drawing and click-to-walk share it), the
   wheel and pinch arithmetic, the wall slicer (a building's ground-floor walls cut at knee height give its plan, doorways
   left open), the pixel sprites (dots, flag, the centre marker), the floor and water colours, and which service gets which
   map icon. src/ui_minimap.js draws with it; tools/test_minimap_2004.js proves it headlessly.
   The minimap is 144 base px across (the kit draws it at the 2004 size, UIScale zooms the chrome). 2004 draws 4 px a tile
   (~36 tiles across, ~18 each way around the player): that is the default; the wheel steps between 2 (72 tiles across) and
   8 (18 across). Sprites are our own pixel art (a dark outline, a highlight and a shade), after the function of 2004's dots,
   never its images.
   ============================================================================ */
var MinimapCore=(function(){
 'use strict';
 var W=144,R=71;
 var ZOOMS=[2,2.5,3,3.5,4,5,6,7,8],DEFAULT_PPT=4,STORE_KEY='cr_minimap_ppt';

 /* ---------------------------------------------------------------- zoom */
 function nearestIndex(ppt){var best=0,d=Infinity;for(var i=0;i<ZOOMS.length;i++){var k=Math.abs(ZOOMS[i]-ppt);if(k<d){d=k;best=i}}return best}
 function clampPpt(ppt){ppt=+ppt;return isFinite(ppt)&&ppt>0?ZOOMS[nearestIndex(ppt)]:DEFAULT_PPT}
 // one wheel notch in or out (dir > 0: closer, more pixels a tile)
 function step(ppt,dir){var i=nearestIndex(ppt)+(dir>0?1:dir<0?-1:0);return ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,i))]}
 function loadZoom(storage){try{var v=storage&&storage.getItem(STORE_KEY);return v===null||v===undefined?DEFAULT_PPT:clampPpt(parseFloat(v))}catch(e){return DEFAULT_PPT}}
 function saveZoom(storage,ppt){try{if(storage)storage.setItem(STORE_KEY,String(clampPpt(ppt)));return true}catch(e){return false}}
 // the tiles a zoom shows across the disc (for the tooltip and the QA)
 function tilesAcross(ppt){return Math.round(W/clampPpt(ppt))}
 // Wheel input: a mouse notch is ~100 px of deltaY (deltaMode 0), a line (1) ~33, a page (2) ~one notch; touchpads send many
 // small deltas. They add up and every NOTCH of them is one step; the rest waits (and fades after a pause).
 var NOTCH=90;
 function wheel(acc,deltaY,deltaMode){
  var d=deltaMode===1?deltaY*33:deltaMode===2?deltaY*NOTCH:deltaY;acc=(acc||0)+d;var steps=0;
  // a single mouse notch (|d| >= 50) is always one step, however the browser scales it
  if(Math.abs(d)>=50&&Math.abs(acc)<NOTCH)acc=d>0?NOTCH:-NOTCH;
  while(acc>=NOTCH){steps--;acc-=NOTCH}while(acc<=-NOTCH){steps++;acc+=NOTCH}
  return {acc:acc,steps:steps};   // steps > 0: zoom in (the wheel rolled away from you)
 }
 // Pinch: the zoom follows the ratio of finger spans, snapped to the nearest step
 function pinch(startPpt,d0,d){if(!(d0>0)||!(d>0))return clampPpt(startPpt);return clampPpt(startPpt*d/d0)}

 /* ----------------------------------------------------------- transform */
 // world (x, z) -> minimap base px, the map turned with the camera yaw about the player (px, pz) at the centre
 function toMap(x,z,px,pz,yaw,ppt){var dx=(x-px)*ppt,dz=(z-pz)*ppt,ca=Math.cos(yaw),sa=Math.sin(yaw);return {x:W/2+dx*ca-dz*sa,y:W/2+dx*sa+dz*ca}}
 // minimap base px -> world (x, z): the exact inverse, so a click walks to the tile drawn under the cursor at every zoom
 function toWorld(mx,my,px,pz,yaw,ppt){var sx=(mx-W/2)/ppt,sz=(my-W/2)/ppt,ca=Math.cos(-yaw),sa=Math.sin(-yaw);return {x:px+sx*ca-sz*sa,z:pz+sx*sa+sz*ca}}
 function inDisc(mx,my,margin){var dx=mx-W/2,dy=my-W/2,r=R-(margin||0);return dx*dx+dy*dy<=r*r}

 /* --------------------------------------------------------------- walls */
 // A triangle cut by the plane y = h: the segment [x0, z0, x1, z1] where it crosses, or null
 function sliceTriangle(a,b,c,h){
  var P=[a,b,c],out=[];
  for(var i=0;i<3;i++){var p=P[i],q=P[(i+1)%3],dp=p[1]-h,dq=q[1]-h;if((dp<0&&dq>0)||(dp>0&&dq<0)){var t=dp/(dp-dq);out.push(p[0]+(q[0]-p[0])*t,p[2]+(q[2]-p[2])*t)}}
  return out.length===4?out:null;
 }
 // which scene meshes are walls: the building shells' ground storey (the naming contract <Prefix>_Shell / _GroundShell /
 // _GroundFront, the Guide House's GroundShell / FurnishingWalls), the garden walls and the fences (only their upright faces:
 // a slope cut level is a contour, not a wall). Not upper storeys,
 // glazing, roofs, jetties, friezes or DOORS (door leaves and frames are left out, so a doorway is a gap in the line).
 var WALL_RX=/(^|_)(Ground)?Shell|GroundFront|FurnishingWalls|GardenWall|Landscape_wall|(^|[-_])fence/i;
 // (the ore workings' rock skin is left out too: a cave shows as its floor on black, as 2004's dungeons do)
 var WALL_SKIP=/Upper|Glazing|Door|Roof|Jetty|Frieze|String|Window|Proxy|Collider|Hit|^Cavern_/i;
 var LOW_RX=/fence|GardenWall|Landscape_wall/i;   // low walls and fences are cut lower as well (their rails sit under knee height)
 function isWallMesh(name){name=String(name||'');return WALL_RX.test(name)&&!WALL_SKIP.test(name)}
 function sliceHeights(name){return LOW_RX.test(String(name||''))?[.3,.55]:[.7]}
 // The wall plan on the tile grid, as 2004 keeps it: a wall runs along a tile edge (or, for a wall built down the middle of
 // a tile, along its centre line). Every axis-aligned cut marks the sixteenths of the tile edges it covers (a wall built of
 // many short logs or stones adds up); an edge is a wall when at least half of it is covered, so the two faces of a thick wall make ONE line, the short cuts across a wall's end
 // or a window reveal make none, and a doorway (no cut) stays a gap. Slanted walls (tower facets) keep their cut, with
 // both ends snapped to the half-tile grid, so a facet's two faces meet in one line.
 function lineOf(c){var e=Math.round(c);return Math.abs(c-e)<=.35?e*2:Math.floor(c)*2+1}   // doubled: even = a tile edge, odd = a centre line
 function WallGrid(){this.h=new Map();this.v=new Map();this.slant=new Map();this.cuts=0}
 function span(map,level,e2,a,b){
  for(var t=Math.floor(a);t<b;t++){var lo=Math.max(a,t),hi=Math.min(b,t+1);if(hi<=lo)continue;
   var bits=0;for(var q=0;q<16;q++){var c=t+(q+.5)/16;if(c>=lo&&c<=hi)bits|=1<<q}if(!bits)continue;
   var k=level+'|'+t+'|'+e2;map.set(k,(map.get(k)||0)|bits)}
 }
 WallGrid.prototype.add=function(s,level){
  var x0=s[0],z0=s[1],x1=s[2],z1=s[3],dx=Math.abs(x1-x0),dz=Math.abs(z1-z0);if(dx<.02&&dz<.02)return;this.cuts++;
  if(dz<=.08&&dx>=dz){span(this.h,level,lineOf((z0+z1)/2),Math.min(x0,x1),Math.max(x0,x1));return}
  if(dx<=.08&&dz>dx){span(this.v,level,lineOf((x0+x1)/2),Math.min(z0,z1),Math.max(z0,z1));return}
  if(Math.hypot(x1-x0,z1-z0)<.45)return;   // a sliver of a slanted face (a bevel, a bay's jamb) is not a wall of its own
  var a=[Math.round(x0*2)/2,Math.round(z0*2)/2],b=[Math.round(x1*2)/2,Math.round(z1*2)/2];if(a[0]===b[0]&&a[1]===b[1])return;
  if(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1])){var t=a;a=b;b=t}
  this.slant.set(level+'|'+a.join(',')+'|'+b.join(','),[a[0],a[1],b[0],b[1]]);
 };
 function bitCount(n){var c=0;while(n){c+=n&1;n>>=1}return c}
 // is there a wall along the edge between tile (x, z) and its neighbour (dx, dz) (one of the four)?
 WallGrid.prototype.blocks=function(x,z,dx,dz,level){
  if(dz)return bitCount(this.h.get(level+'|'+x+'|'+(2*(dz>0?z+1:z)))||0)>=8;
  return bitCount(this.v.get(level+'|'+z+'|'+(2*(dx>0?x+1:x)))||0)>=8;
 };
 // the finished plan of one level: {h: [[x, e2]] along x at z = e2 / 2, v: [[z, e2]] along z at x = e2 / 2, slant: [[x0, z0, x1, z1]]}
 WallGrid.prototype.plan=function(level){
  var out={h:[],v:[],slant:[]},pre=level+'|';
  this.h.forEach(function(bits,k){if(k.indexOf(pre)!==0||bitCount(bits)<8)return;var p=k.split('|');out.h.push([+p[1],+p[2]])});
  this.v.forEach(function(bits,k){if(k.indexOf(pre)!==0||bitCount(bits)<8)return;var p=k.split('|');out.v.push([+p[1],+p[2]])});
  this.slant.forEach(function(s,k){if(k.indexOf(pre)===0)out.slant.push(s)});
  return out;
 };
 // Building floors hide their furniture: a tile with no walk node (a counter, a bed, a stack of crates) whose every side
 // meets, within a few tiles, a floor or a wall before any open walkable ground, is floor too (it takes the first floor
 // colour met). floorAt(x, z) -> packed colour or 0; openAt(x, z) -> true where a walkable node that is not a floor stands.
 function fillFurniture(x,z,floorAt,openAt,walls,level,reach){
  reach=reach||6;var found=0,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(var d=0;d<4;d++){var cx=x,cz=z,ok=false;
   for(var k=0;k<reach;k++){if(walls&&walls.blocks(cx,cz,dirs[d][0],dirs[d][1],level)){ok=true;break}
    cx+=dirs[d][0];cz+=dirs[d][1];var f=floorAt(cx,cz);if(f){if(!found)found=f;ok=true;break}if(openAt(cx,cz))break}
   if(!ok)return 0}
  return found;
 }
 // A wall a whole tile thick (a stone ground storey) cuts to two lines a tile apart with only wall between them: 2004 draws
 // one, on the floor's side. Of such a pair, where the strip between holds no walk node (isEmpty) and a floor lies on one
 // side only, the line away from the floor is dropped. isFloor(x, z), isEmpty(x, z) -> boolean.
 function thinDoubleWalls(plan,isFloor,isEmpty){
  var hs=new Set(plan.h.map(function(w){return w[0]+'|'+w[1]})),vs=new Set(plan.v.map(function(w){return w[0]+'|'+w[1]})),dh=new Set(),dv=new Set();
  plan.h.forEach(function(w){var x=w[0],e2=w[1];if(e2&1||!hs.has(x+'|'+(e2+2)))return;var z=e2/2;if(!isEmpty(x,z))return;
   var up=isFloor(x,z-1),down=isFloor(x,z+1);if(down&&!up)dh.add(x+'|'+e2);else if(up&&!down)dh.add(x+'|'+(e2+2))});
  plan.v.forEach(function(w){var z=w[0],e2=w[1];if(e2&1||!vs.has(z+'|'+(e2+2)))return;var x=e2/2;if(!isEmpty(x,z))return;
   var left=isFloor(x-1,z),right=isFloor(x+1,z);if(right&&!left)dv.add(z+'|'+e2);else if(left&&!right)dv.add(z+'|'+(e2+2))});
  return {h:plan.h.filter(function(w){return !dh.has(w[0]+'|'+w[1])}),v:plan.v.filter(function(w){return !dv.has(w[0]+'|'+w[1])}),slant:plan.slant};
 }

 /* -------------------------------------------------------------- colours */
 var WATER=[62,92,138],VOID=[8,8,10],WALL=[246,244,238],ROUTE=[255,255,255];
 // building floors, by the floor mesh the walk graph names (2004: dark planks, grey flag checker, rugs)
 function floorColour(surface,tx,tz){
  var s=String(surface||'');
  if(/Cavern/.test(s))return [96,74,46];
  if(/Rug/i.test(s))return [112,40,30];
  if(/Flags|Tiles|Stone|Vault|Hall|Step|Base/i.test(s))return ((tx+tz)&1)?[98,94,88]:[80,76,72];
  if(/^(deck|dock)$|Deck|Jetty|Pier/i.test(s))return [112,80,46];
  return [92,58,30];   // boards, planks, the Guide House's floor
 }
 // which walk-graph nodes are building floors on the minimap (open ground, upper storeys and stairs are not)
 function isFloorSurface(surface){var s=String(surface||'');return !(s==='land'||s==='upper'||s==='stair'||s==='exterior'||/Terrain$|Upper|Stair|Tread|StepLink|Cellar/i.test(s))}
 // the minimap's tile colour from the island ground's underlay (0..1 rgb): the old-school ground is unlit and baked dark
 // for the 3D light, so it is lifted by gain to read on the small map as the lit ground does in the game
 function mapColour(rgb,gain){return [Math.max(0,Math.min(255,Math.round(rgb[0]*gain*255))),Math.max(0,Math.min(255,Math.round(rgb[1]*gain*255))),Math.max(0,Math.min(255,Math.round(rgb[2]*gain*255)))]}
 // one tile's underlay from its six ground vertices: the baked light divided back out (lightAt), so hills do not stripe the map
 function tileUnderlay(colors,base,lights){var r=0,g=0,b=0;for(var i=0;i<6;i++){var l=lights?lights[i]||1:1;r+=colors[base+i*3]/l;g+=colors[base+i*3+1]/l;b+=colors[base+i*3+2]/l}return [r/6,g/6,b/6]}
 function rgbCss(c){return 'rgb('+c[0]+','+c[1]+','+c[2]+')'}

 /* -------------------------------------------------------------- sprites */
 // Pixel sprites: one character a pixel, '.' clear, O the dark outline; the other letters index the palette.
 // Dots are 5 x 5: a round shaded ball (highlight top-left, shade bottom-right) that centres on its tile.
 var DOT=['.OOO.','OhccO','OccsO','OcssO','.OOO.'];
 var DOT_PAL={
  npc:{O:'#1a1204',h:'#ffffb0',c:'#f2ee00',s:'#a89a00'},       // folk and creatures: yellow
  player:{O:'#101010',h:'#ffffff',c:'#ececec',s:'#9a9a9a'},    // other adventurers (online): white
  friend:{O:'#06200a',h:'#c4ffb8',c:'#30dc24',s:'#14820e'},    // friends: green
  item:{O:'#200404',h:'#ffa890',c:'#e8200e',s:'#8a0c04'}};     // things on the ground: red
 // you: a square, not a ball, so it never reads as anyone else (2004 draws a white square at the centre)
 var YOU=['OOOOO','OwwwO','OwwgO','OwggO','OOOOO'],YOU_PAL={O:'#0c0c0c',w:'#ffffff',g:'#c4c4c4'};
 // the walk flag: a red pennant on a pale pole, planted on the destination tile (anchor: the pole's foot)
 var FLAG=['.OO.......','OpOOOOOO..','OprrrrrrO.','OprrrrrrrO','OprrrrrrO.','OpsssssO..','OpOOOOO...','OpO.......','OpO.......','OpO.......','OOO.......'];
 var FLAG_PAL={O:'#140404',p:'#e6d8b0',r:'#e2261a',s:'#96140c'},FLAG_ANCHOR={x:1.5,y:10.5};
 function spriteRuns(rows,pal){
  // rows -> [{x, y, w, colour}] horizontal runs (fewer fillRects than one per pixel)
  var out=[];for(var y=0;y<rows.length;y++){var row=rows[y],x=0;while(x<row.length){var ch=row[x];if(ch==='.'||!pal[ch]){x++;continue}var x0=x;while(x<row.length&&row[x]===ch)x++;out.push({x:x0,y:y,w:x-x0,c:pal[ch]})}}
  return out;
 }
 var SPRITES={dot:{},you:null,flag:null};
 Object.keys(DOT_PAL).forEach(function(k){SPRITES.dot[k]={w:5,h:5,ax:2.5,ay:2.5,runs:spriteRuns(DOT,DOT_PAL[k])}});
 SPRITES.you={w:5,h:5,ax:2.5,ay:2.5,runs:spriteRuns(YOU,YOU_PAL)};
 SPRITES.flag={w:10,h:11,ax:FLAG_ANCHOR.x,ay:FLAG_ANCHOR.y,runs:spriteRuns(FLAG,FLAG_PAL)};
 // which dot an actor wears (2004's law: folk and creatures yellow, other adventurers white, friends green, items red)
 function dotKind(a){if(!a)return 'npc';if(a.isFriend)return 'friend';if(a.isPlayer)return 'player';return 'npc'}

 /* ----------------------------------------------------------- map icons */
 // Map icons (Blender renders: tools/blender/build_ui_icons_v1.py group 'map' -> assets/icons/ui/v3/map/<id>.png, 17 px).
 // A service is matched by 'building:target:label' (HolmIslandExtras' islandService), a world object by userData.kind, a
 // gathering spot by its resource type. One icon per kind within CLUSTER tiles.
 var ICONS=['bank','furnace','anvil','range','fishing','quest','mining','woodcut','combat','magic','ferry','beacon'];
 var ICON_SIZE=17,CLUSTER=7;
 var SERVICE_ICONS=[[/^bank:(counter|vault):/,'bank'],[/^bakehouse:[^:]*:Cook$/,'range'],[/^lodge:board:/,'quest'],[/^quarry:shaft:/,'mining'],
  [/^mage:(runes|lectern):/,'magic'],[/^haven:boat:/,'ferry'],[/^lastlight:(lever|beacon):/,'beacon']];
 var KIND_ICONS={bank:'bank',furnace:'furnace',anvil:'anvil',range:'range',cooking_range:'range'};
 var RESOURCE_ICONS={tree:'woodcut',rock:'mining',fish:'fishing'};
 function iconForService(key){for(var i=0;i<SERVICE_ICONS.length;i++)if(SERVICE_ICONS[i][0].test(key))return SERVICE_ICONS[i][1];return null}
 function iconForKind(kind){return KIND_ICONS[kind]||null}
 function iconForResource(rtype){return RESOURCE_ICONS[rtype]||null}
 // [{icon, x, z, y}] -> one per icon kind for each group whose members lie within CLUSTER tiles of one another (chained),
 // placed at the group's centre (so the three fishing spots of a pond make one fishing icon, in the middle of the pond)
 function cluster(list,radius){
  radius=radius||CLUSTER;var pts=list.filter(function(p){return p&&p.icon&&isFinite(p.x)&&isFinite(p.z)}),parent=pts.map(function(p,i){return i});
  function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
  for(var i=0;i<pts.length;i++)for(var j=i+1;j<pts.length;j++)if(pts[i].icon===pts[j].icon&&Math.hypot(pts[i].x-pts[j].x,pts[i].z-pts[j].z)<=radius)parent[root(i)]=root(j);
  var groups={},order=[];pts.forEach(function(p,i){var r=root(i),g=groups[r];if(!g){g=groups[r]={icon:p.icon,sx:0,sz:0,sy:0,n:0};order.push(r)}g.n++;g.sx+=p.x;g.sz+=p.z;g.sy+=(p.y||0)});
  return order.map(function(r){var g=groups[r];return {icon:g.icon,x:g.sx/g.n,z:g.sz/g.n,y:g.sy/g.n,n:g.n}});
 }
 // habitat asset -> map scenery sprite (assets/icons/ui/v3/map/<id>.png): leafy trees, pines, rock groups
 function sceneryFor(asset){asset=String(asset||'');if(/pine|fir|spruce/i.test(asset))return 'pine';if(/oak|birch|tree|ash|elm|willow|maple|hazel/i.test(asset))return 'tree';if(/rock-group|boulder/i.test(asset))return 'rock';return null}

 return {W:W,R:R,ZOOMS:ZOOMS,DEFAULT_PPT:DEFAULT_PPT,STORE_KEY:STORE_KEY,nearestIndex:nearestIndex,clampPpt:clampPpt,step:step,
  loadZoom:loadZoom,saveZoom:saveZoom,tilesAcross:tilesAcross,wheel:wheel,pinch:pinch,NOTCH:NOTCH,
  toMap:toMap,toWorld:toWorld,inDisc:inDisc,sliceTriangle:sliceTriangle,isWallMesh:isWallMesh,
  sliceHeights:sliceHeights,WallGrid:WallGrid,lineOf:lineOf,fillFurniture:fillFurniture,WATER:WATER,VOID:VOID,WALL:WALL,ROUTE:ROUTE,floorColour:floorColour,
  isFloorSurface:isFloorSurface,mapColour:mapColour,tileUnderlay:tileUnderlay,rgbCss:rgbCss,SPRITES:SPRITES,spriteRuns:spriteRuns,
  dotKind:dotKind,DOT_PAL:DOT_PAL,ICONS:ICONS,ICON_SIZE:ICON_SIZE,CLUSTER:CLUSTER,iconForService:iconForService,iconForKind:iconForKind,
  iconForResource:iconForResource,cluster:cluster,sceneryFor:sceneryFor,thinDoubleWalls:thinDoubleWalls};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MinimapCore;
