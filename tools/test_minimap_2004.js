/* Headless locks for the 2004-style minimap (holm-minimap-2004, owner 2026-09-29; src/minimap_core.js, src/ui_minimap.js):
 *  1 zoom: 4 px a tile by default (2004's ~36 tiles across), steps 2..8, clamped, remembered in localStorage (a bad or
 *    blocked store falls back to the default); a mouse notch is one step, a touchpad's small deltas add up, a pinch follows
 *    the finger span;
 *  2 the transform: the map point of a world point and the world point of a map point are exact inverses at every zoom and
 *    camera turn (a click walks to the tile drawn under it); the player is the centre; a tile centre lands in its tile;
 *  3 walls: a triangle is cut at a height; a thick wall's two faces make one tile-edge line, a doorway stays a gap, the
 *    short cuts across a wall end make nothing, a wall down a tile's middle runs on its centre line, tower facets are one
 *    line; blocks() answers the flood; which meshes count as walls (shells yes; doors, glazing, upper storeys no);
 *  4 floors: flagstones checker, planks brown; furniture closed in by floor and walls is floor, a tree by a wall is not;
 *  5 sprites: 5 x 5 outlined balls centred on their tile (yellow folk, white adventurers, green friends, red items), a
 *    square for you, the flag planted by its pole's foot;
 *  6 map icons: services, stations and gathering spots map to icons, one per kind nearby; every icon and scenery sprite is
 *    a Blender render on disk at its size and listed in the icon manifest;
 *  7 wiring: script order and cache-busting, the old renderer is gone from ui_map.js, the wheel listener cannot reach the
 *    camera, the paint rate, the island's read-only map data.
 * Run: node tools/test_minimap_2004.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const C=require(path.join(root,'src/minimap_core.js'));
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name)};
function store(init){const m=Object.assign({},init||{});return {getItem:k=>m.hasOwnProperty(k)?m[k]:null,setItem:(k,v)=>{m[k]=String(v)},_m:m}}
const near=(a,b,e)=>Math.abs(a-b)<=(e||1e-9);

/* ------------------------------------------------------------------ 1 zoom */
check('zoom: 4 px a tile by default (2004: ~36 tiles across), steps 2..8',()=>{
 assert.strictEqual(C.DEFAULT_PPT,4);assert.strictEqual(C.tilesAcross(4),36);
 assert.deepStrictEqual([C.ZOOMS[0],C.ZOOMS[C.ZOOMS.length-1]],[2,8]);assert.strictEqual(C.tilesAcross(2),72);assert.strictEqual(C.tilesAcross(8),18);
 for(let i=1;i<C.ZOOMS.length;i++)assert(C.ZOOMS[i]>C.ZOOMS[i-1],'steps ascend');
});
check('zoom: steps in and out stop at the ends; odd values clamp to a step',()=>{
 assert.strictEqual(C.step(4,1),5);assert.strictEqual(C.step(4,-1),3.5);assert.strictEqual(C.step(8,1),8);assert.strictEqual(C.step(2,-1),2);
 assert.strictEqual(C.clampPpt(100),8);assert.strictEqual(C.clampPpt(.1),2);assert.strictEqual(C.clampPpt(4.2),4);assert.strictEqual(C.clampPpt('x'),4);assert.strictEqual(C.clampPpt(-3),4);
 let p=4;for(let i=0;i<20;i++)p=C.step(p,1);assert.strictEqual(p,8);for(let i=0;i<20;i++)p=C.step(p,-1);assert.strictEqual(p,2);
});
check('zoom: remembered for the browser; a bad or blocked store falls back to 4',()=>{
 const s=store();assert.strictEqual(C.loadZoom(s),4);assert(C.saveZoom(s,6));assert.strictEqual(s._m[C.STORE_KEY],'6');assert.strictEqual(C.loadZoom(s),6);
 assert.strictEqual(C.loadZoom(store({[C.STORE_KEY]:'banana'})),4);assert.strictEqual(C.loadZoom(store({[C.STORE_KEY]:'99'})),8);
 const blocked={getItem(){throw Error('private')},setItem(){throw Error('private')}};assert.strictEqual(C.loadZoom(blocked),4);assert.strictEqual(C.saveZoom(blocked,5),false);
 assert.strictEqual(C.loadZoom(null),4);
});
check('wheel: one mouse notch is one step (away = in), a touchpad adds up, lines and pages count',()=>{
 let r=C.wheel(0,100,0);assert.strictEqual(r.steps,-1);r=C.wheel(0,-100,0);assert.strictEqual(r.steps,1);
 r=C.wheel(0,53,0);assert.strictEqual(r.steps,-1,'a small notch (some browsers scale it) is still a step');
 let acc=0,steps=0;for(let i=0;i<9;i++){r=C.wheel(acc,10,0);acc=r.acc;steps+=r.steps}assert.strictEqual(steps,-1,'nine 10 px nudges = one step');
 acc=0;steps=0;for(let i=0;i<4;i++){r=C.wheel(acc,-10,0);acc=r.acc;steps+=r.steps}assert.strictEqual(steps,0,'a light brush does nothing yet');
 assert.strictEqual(C.wheel(0,3,1).steps,-1,'3 lines');assert.strictEqual(C.wheel(0,-1,2).steps,1,'a page');
 r=C.wheel(0,-300,0);assert.strictEqual(r.steps,3,'a fast spin is several steps');
});
check('pinch: the zoom follows the finger span, snapped to a step',()=>{
 assert.strictEqual(C.pinch(4,100,200),8);assert.strictEqual(C.pinch(4,100,50),2);assert.strictEqual(C.pinch(4,100,125),5);assert.strictEqual(C.pinch(4,100,100),4);assert.strictEqual(C.pinch(4,0,50),4);
});

/* ------------------------------------------------------------- 2 transform */
check('transform: map <-> world are exact inverses at every zoom and camera turn',()=>{
 for(const ppt of C.ZOOMS)for(const yaw of [0,.7,Math.PI/2,Math.PI,-2.3,5.9])for(const [x,z] of [[10.5,20.5],[61.5,118.5],[0,0],[143.2,1.7]]){
  const px=62.25,pz=110.75,q=C.toMap(x,z,px,pz,yaw,ppt),w=C.toWorld(q.x,q.y,px,pz,yaw,ppt);
  assert(near(w.x,x,1e-9)&&near(w.z,z,1e-9),'round trip '+[ppt,yaw,x,z]);}
});
check('transform: the player is the centre; one tile is ppt px; a tile centre lands inside its own tile',()=>{
 const c=C.toMap(50.3,70.9,50.3,70.9,1.1,5);assert(near(c.x,72)&&near(c.y,72));
 for(const ppt of C.ZOOMS){const a=C.toMap(11,20,10,20,0,ppt);assert(near(a.x-72,ppt),'east one tile');const b=C.toMap(10,21,10,20,0,ppt);assert(near(b.y-72,ppt),'south one tile')}
 // a map click anywhere inside a tile's square walks to that tile
 const ppt=4,px=30.5,pz=40.5;for(const [tx,tz] of [[28,41],[33,37],[30,40]]){const q=C.toMap(tx+.5,tz+.5,px,pz,.9,ppt);
  for(const [ox,oy] of [[0,0],[1.4,-1.1],[-1.6,1.2]]){const w=C.toWorld(q.x+ox,q.y+oy,px,pz,.9,ppt);assert.deepStrictEqual([Math.floor(w.x),Math.floor(w.z)],[tx,tz])}}
 assert(C.inDisc(72,72)&&!C.inDisc(0,0)&&C.inDisc(72,2)&&!C.inDisc(72,0.5,1));
});

/* ------------------------------------------------------------------ 3 walls */
check('walls: a triangle is cut where it crosses the height, and not above or below it',()=>{
 const s=C.sliceTriangle([0,0,0],[4,0,0],[0,3,0],1);assert(s&&near(s[0],0)&&near(s[2],8/3,1e-9)||s&&near(s[2],0)&&near(s[0],8/3,1e-9),JSON.stringify(s));
 assert.strictEqual(C.sliceTriangle([0,0,0],[4,0,0],[0,3,0],5),null);assert.strictEqual(C.sliceTriangle([0,0,0],[4,0,0],[0,3,0],-1),null);
});
check('walls: a thick wall is one line on the tile edge, a doorway a gap, a wall end nothing',()=>{
 const g=new C.WallGrid();
 // a .4-thick wall along z = 10 from x = 2 to 7 (faces at 9.8 and 10.2), a doorway from x = 4 to 5, cuts across its ends
 [[2,9.8,4,9.8],[5,9.8,7,9.8],[2,10.2,4,10.2],[5,10.2,7,10.2],[4,9.8,4,10.2],[5,9.8,5,10.2],[7,9.8,7,10.2]].forEach(s=>g.add(s,'s'));
 const p=g.plan('s');assert.deepStrictEqual(p.h.map(e=>e[0]).sort((a,b)=>a-b),[2,3,5,6]);assert(p.h.every(e=>e[1]===20),'all on z = 10');assert.strictEqual(p.v.length,0,'no rungs');
 assert(g.blocks(2,9,0,1,'s')&&g.blocks(2,10,0,-1,'s'),'the wall blocks both ways');assert(!g.blocks(4,9,0,1,'s'),'the doorway is open');
 assert(!g.blocks(2,9,1,0,'s'),'no wall between neighbours along it');assert.strictEqual(g.plan('u').h.length,0,'levels are apart');
});
check('walls: a wall down a tile middle runs on its centre line; a half-covered edge counts, a sliver does not',()=>{
 const g=new C.WallGrid();g.add([12.4,3,12.4,6],'s');g.add([12.6,3,12.6,6],'s');const p=g.plan('s');
 assert.deepStrictEqual(p.v.map(e=>e[1]),[25,25,25]);assert.strictEqual(C.lineOf(12.4),25);assert.strictEqual(C.lineOf(12.2),24);assert.strictEqual(C.lineOf(11.7),24);
 const h=new C.WallGrid();h.add([0,5,.6,5],'s');h.add([2,5,2.2,5],'s');const q=h.plan('s');assert.deepStrictEqual(q.h.map(e=>e[0]),[0]);
});
check('walls: a wall built of short logs or stones adds up to its line',()=>{
 const g=new C.WallGrid();for(let x=30;x<34;x+=.12)g.add([x,80.05,x+.1,80.05],'s');const p=g.plan('s');assert.deepStrictEqual(p.h.map(e=>e[0]).sort((a,b)=>a-b),[30,31,32,33]);
});
check('walls: a tower facet\'s two faces make one slanted line',()=>{
 const g=new C.WallGrid();g.add([10.1,10.1,12.1,12.1],'s');g.add([10.2,9.95,12.2,11.95],'s');g.add([10,10,10.1,10.1],'s');
 const p=g.plan('s');assert.strictEqual(p.slant.length,1);assert.deepStrictEqual(p.slant[0],[10,10,12,12]);
});
check('walls: shells are walls; doors, glazing, roofs, upper storeys and cave rock are not; fences and garden walls are cut low',()=>{
 ['Kitchen_Shell_Walls','GroundShellSouth_3','Keep_Shell_2_6','Keep_GroundFront_2_36','Lodge_GroundShell_Warm_oak','Survival_ShellStoreNorth_2','Mill_Shell','Bank_ShellExterior',
  'GroundFurnishingWalls_1','LandingGardenWall_Landing_fieldstone_0','fence-rail_Section','island-props-fence-run-fence-run_Part_1@'].forEach(n=>assert(C.isWallMesh(n),n));
 ['Bank_ShellDoor','Kitchen_Shell_DoorFrame','Kitchen_Shell_StoreDoor','Lastlight_ShellTowerDoorway','Keep_Upper_Shell_1','Kitchen_UpperShell_Glazing','Keep_Roof_1','Bank_ShellJetty','Bank_ShellFrieze',
  'Bank_ShellWindows','island-service-hit-Climb-down trapdoor','ground-chunk-7,14','Kitchen_Floor_Flags','Cavern_ShellRock',''].forEach(n=>assert(!C.isWallMesh(n),n));
 assert.deepStrictEqual(C.sliceHeights('Kitchen_Shell_Walls'),[.7]);assert.deepStrictEqual(C.sliceHeights('fence-rail_Section'),[.3,.55]);
});

/* ----------------------------------------------------------------- 4 floors */
check('floors: flagstones checker, planks brown, rugs red; open ground and upper storeys are not floors',()=>{
 const a=C.floorColour('b:keep:0:Keep_Floor_Flags',4,4),b=C.floorColour('b:keep:0:Keep_Floor_Flags',5,4);assert.notDeepStrictEqual(a,b);
 assert.deepStrictEqual(C.floorColour('b:keep:0:Keep_Floor_Flags',6,4),a);
 const wood=C.floorColour('b:lodge:0:Lodge_GroundFloor_Boards',1,1);assert(wood[0]>wood[2]+30,'brown');assert.deepStrictEqual(C.floorColour('ground',3,3),wood);
 assert(C.floorColour('b:bank:0:Bank_FloorRug',1,1)[0]>100);
 ['land','upper','stair','exterior','b:keep:0:StagedTerrain','b:lodge:0:IslandTerrain','b:keep:0:Keep_Upper_Floor_Boards','b:bank:0:Bank_StairTreads','b:survival:0:Survival_StepLink']
  .forEach(s=>assert(!C.isFloorSurface(s),s));
 ['ground','deck','dock','b:keep:1:Keep_Floor_Flags','b:bank:0:Bank_FloorHall','b:cavern:0:Cavern_Floor','b:survival:0:Survival_FloorYard'].forEach(s=>assert(C.isFloorSurface(s),s));
});
check('floors: furniture closed in by floor and walls is floor; a tree outside a wall is not',()=>{
 // a 5 x 3 room (x 0..4, z 0..2) walled round, a counter at (0, 1) against the west wall; outside, open ground; a tree at (6, 1)
 const g=new C.WallGrid();g.add([0,0,5,0],'s');g.add([0,3,5,3],'s');g.add([0,0,0,3],'s');g.add([5,0,5,3],'s');
 const floor=(x,z)=>x>=0&&x<=4&&z>=0&&z<=2&&!(x===0&&z===1)?123:0,open=(x,z)=>!(x>=0&&x<=4&&z>=0&&z<=2)&&!(x===6&&z===1);
 assert.strictEqual(C.fillFurniture(0,1,floor,open,g,'s'),123);
 assert.strictEqual(C.fillFurniture(6,1,floor,open,g,'s'),0);
 assert.strictEqual(C.fillFurniture(0,1,floor,open,null,'s'),0,'without the wall it leaks outside');
});
check('walls: a wall a whole tile thick is one line, on the side of the floor',()=>{
 // a stone wing wall: outer face near x = 80, inner face near x = 81, floor from x = 81; the strip x = 80 has no walk node
 const g=new C.WallGrid();for(const x of [79.95,80.95])g.add([x,53,x,56],'s');const p=g.plan('s');assert.strictEqual(p.v.length,6);
 const t2=C.thinDoubleWalls(p,(x,z)=>x>=81&&x<=86,(x,z)=>x===80);assert.deepStrictEqual(t2.v.map(e=>e[1]/2),[81,81,81]);
 const keep=C.thinDoubleWalls(p,(x,z)=>x>=81,(x,z)=>false);assert.strictEqual(keep.v.length,6,'a walkable strip between two walls keeps both (a corridor)');
});
check('colours: the ground underlay lifts to the map; water and walls are fixed',()=>{
 assert.deepStrictEqual(C.mapColour([.1,.2,.05],1.4),[36,71,18]);assert.deepStrictEqual(C.mapColour([1,1,1],2),[255,255,255]);
 const cols=[.2,.4,.1, .2,.4,.1, .2,.4,.1, .2,.4,.1, .2,.4,.1, .2,.4,.1];const u=C.tileUnderlay(cols,0,[2,2,2,2,2,2]);assert(near(u[0],.1)&&near(u[1],.2));
 assert(C.WATER[2]>C.WATER[0]&&C.WALL.every(v=>v>230));
});

/* ---------------------------------------------------------------- 5 sprites */
function pix(sp){const w=sp.w,h=sp.h,g=Array.from({length:h},()=>Array(w).fill(null));sp.runs.forEach(r=>{for(let i=0;i<r.w;i++)g[r.y][r.x+i]=r.c});return g}
check('sprites: 5 x 5 balls with a dark rim, centred on the tile, one colour family each',()=>{
 const kinds={npc:[240,230,0],player:[236,236,236],friend:[48,220,36],item:[232,32,14]};
 for(const k in kinds){const sp=C.SPRITES.dot[k],g=pix(sp);assert.strictEqual(sp.w,5);assert.strictEqual(sp.h,5);assert.strictEqual(sp.ax,2.5);assert.strictEqual(sp.ay,2.5);
  assert(!g[0][0]&&!g[0][4]&&!g[4][0]&&!g[4][4],'round corners');const rim=C.DOT_PAL[k].O;[g[0][2],g[2][0],g[4][2],g[2][4]].forEach(c=>assert.strictEqual(c,rim,'outline'));
  const core=C.DOT_PAL[k].c,n=parseInt(core.slice(1),16),rgb=[n>>16&255,n>>8&255,n&255];kinds[k].forEach((v,i)=>assert(Math.abs(v-rgb[i])<40,k+' core '+core));
  assert.notStrictEqual(g[1][1],g[3][3],'a highlight and a shade')}
 assert.strictEqual(C.dotKind({isPlayer:true}),'player');assert.strictEqual(C.dotKind({isPlayer:true,isFriend:true}),'friend');assert.strictEqual(C.dotKind({t:{name:'Cook Hettie'}}),'npc');
});
check('sprites: you are a square at the centre; the flag stands on its pole\'s foot',()=>{
 const y=pix(C.SPRITES.you);assert(y[0][0]&&y[4][4]&&y[0][4],'square corners');assert.strictEqual(C.SPRITES.you.ax,2.5);
 const f=C.SPRITES.flag,g=pix(f);assert(Math.floor(f.ax)===1&&f.ay>=f.h-1,'anchor at the foot');assert(g[f.h-1][1],'the foot is drawn');assert(g[3].some(c=>c==='#e2261a'),'a red pennant');
});

/* ------------------------------------------------------------------ 6 icons */
check('icons: services, stations and gathering spots map to icons; one per kind nearby',()=>{
 assert.strictEqual(C.iconForService('bank:counter:Use bank counter'),'bank');assert.strictEqual(C.iconForService('bakehouse::Cook'),'range');
 assert.strictEqual(C.iconForService('lodge:board:Study quest board'),'quest');assert.strictEqual(C.iconForService('quarry:shaft:Climb-down mine shaft'),'mining');
 assert.strictEqual(C.iconForService('haven:boat:Ferry'),'ferry');assert.strictEqual(C.iconForService('lastlight:lever:Pull beacon lever'),'beacon');assert.strictEqual(C.iconForService('mage:runes:Rune table'),'magic');
 assert.strictEqual(C.iconForService('bakehouse::Take bucket'),null);assert.strictEqual(C.iconForKind('furnace'),'furnace');assert.strictEqual(C.iconForKind('anvil'),'anvil');assert.strictEqual(C.iconForKind('prop'),null);
 assert.strictEqual(C.iconForResource('fish'),'fishing');assert.strictEqual(C.iconForResource('tree'),'woodcut');assert.strictEqual(C.iconForResource('rock'),'mining');
 const g=C.cluster([{icon:'fishing',x:22,z:96},{icon:'fishing',x:30,z:99},{icon:'fishing',x:27,z:93},{icon:'woodcut',x:38,z:96},{icon:'fishing',x:80,z:10}]);
 assert.strictEqual(g.length,3);const f=g.find(q=>q.icon==='fishing'&&q.n===3);assert(f&&near(f.x,79/3,1e-9)&&near(f.z,96,1e-9));
 assert.strictEqual(C.sceneryFor('oak'),'tree');assert.strictEqual(C.sceneryFor('coastal-pine'),'pine');assert.strictEqual(C.sceneryFor('rock-group'),'rock');assert.strictEqual(C.sceneryFor('flower-patch'),null);
});
function pngSize(file){const b=fs.readFileSync(file);assert.strictEqual(b.toString('ascii',1,4),'PNG');return [b.readUInt32BE(16),b.readUInt32BE(20)]}
check('icons: every map icon and scenery sprite is a Blender render on disk, listed in the icon manifest',()=>{
 const man=JSON.parse(fs.readFileSync(path.join(root,'assets/icons/ui/v3/manifest.json'),'utf8'));
 assert(man.source.some(s=>/blender/.test(s)),'the manifest names the Blender source');
 C.ICONS.forEach(id=>{const f='map/'+id+'.png';assert.deepStrictEqual(pngSize(path.join(root,'assets/icons/ui/v3',f)),[C.ICON_SIZE,C.ICON_SIZE],f);
  assert(man.files.some(e=>e.file===f&&e.icon==='map_'+id),f+' in the manifest')});
 [['tree',9],['pine',9],['rock',8]].forEach(([id,s])=>{const f='map/'+id+'.png';assert.deepStrictEqual(pngSize(path.join(root,'assets/icons/ui/v3',f)),[s,s]);assert(man.files.some(e=>e.file===f&&e.finish==='mapscene'),f)});
 const py=fs.readFileSync(path.join(root,'tools/blender/build_ui_icons_v1.py'),'utf8');assert(/MAP_ICONS = /.test(py)&&/'map_' \+ nm/.test(py),'the icons are authored in the Blender pipeline');
 C.ICONS.forEach(id=>assert(py.indexOf("('"+id+"',")>=0,id+' in MAP_ICONS'));
});

/* ------------------------------------------------------------------ 7 wiring */
check('wiring: scripts in order and cache-busted; the old renderer is gone; the island hands the map its data',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const a=html.indexOf('src/minimap_core.js?v=h'),b=html.indexOf('src/ui_minimap.js?v=h'),c=html.indexOf('src/ui_map.js?v=h'),d=html.indexOf('src/game5_main.js?v=');
 assert(a>0&&b>a&&c>b&&d>c,'minimap_core, ui_minimap, ui_map, game5_main in order');
 const map=fs.readFileSync(path.join(root,'src/ui_map.js'),'utf8');assert(!/var CRMinimap|function drawMinimap/.test(map),'ui_map.js keeps only the world map');assert(/function drawWorldMap/.test(map));
 const ui=fs.readFileSync(path.join(root,'src/ui_minimap.js'),'utf8');
 assert(/window\.CRMinimap=CRMinimap/.test(ui)&&/function drawMinimap\(\)\{CRMinimap\.draw\(\)\}/.test(ui));
 assert(/addEventListener\('wheel',onWheel,\{passive:false\}\)/.test(ui)&&/function onWheel\(e\)\{\s*e\.preventDefault\(\);e\.stopPropagation\(\)/.test(ui),'the wheel is the minimap\'s alone');
 assert(/C\.toWorld\(x,y,origin\.x,origin\.z,yaw,st\.ppt\)/.test(ui),'click-to-walk uses the drawn zoom');assert(/layerVersion:2/.test(ui),'the smoke\'s three-layer contract');
 const main=fs.readFileSync(path.join(root,'src/game5_main.js'),'utf8');assert(/now-_minimapPaintAt>=33/.test(main),'30 paints a second');
 const qa=fs.readFileSync(path.join(root,'src/holm_arrival_qa.js'),'utf8');assert(/mapData:function\(\)\{if\(!active\(\)\|\|!island\|\|!loaded\)return null;return \{terrain:loaded\.documents\.terrain,habitat:/.test(qa));
 const g4=fs.readFileSync(path.join(root,'src/game4_ui.js'),'utf8');assert(/canvasEl\.addEventListener\('wheel'/.test(g4),'the camera wheel stays on the game canvas (not an ancestor of the minimap)');
});
console.log(passed+' checks passed');
