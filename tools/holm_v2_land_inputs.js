'use strict';
// Node-side assembly of the island navigation inputs on the Holm v2 land (W0b, 2026-09-26): the terrain v2 bundle, the
// arrival house on its v2 foundation and approach, and every Blender building graph re-measured on the v2 terrain
// (docs/rebuild/holm-overhaul/v2land.json lists the graph workspaces). Before a building is re-measured, `proxy: true`
// stands in for it: the old-school graph lifted by its seat's rise, its terrain lane re-sampled from the v2 land (a
// design-loop estimate only, never shipped). Shared by tests and tools, as tools/holm_island_inputs.js is for v1.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const exists=p=>fs.existsSync(path.join(root,p));
const Scenery=require('../src/holm_arrival_scenery'),Provision=require('../src/holm_arrival_provisions'),Dock=require('../src/holm_arrival_dock');
const Terrain=require('../src/holm_overhaul_terrain'),Nav=require('../src/holm_island_nav');
const TERRAIN='.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json';
const REG='docs/rebuild/holm-overhaul/v2land.json';
// id -> old-school graph workspace (the design proxy's source) and the plan place its habitat clearing uses
const BUILDINGS={keep:['holm-keep-oldschool-navigation-v1',null],bakehouse:['holm-kitchen-oldschool-navigation-v1',null],lodge:['holm-quest-lodge-oldschool-navigation-v1',null],
 survival:['holm-survival-oldschool-navigation-v1','survival'],quarry:['holm-quarry-oldschool-navigation-v1','mine'],bank:['holm-bank-oldschool-navigation-v1','bank'],
 mage:['holm-mage-oldschool-navigation-v1','mage'],haven:['holm-haven-oldschool-navigation-v1','ferry'],lastlight:['holm-lastlight-oldschool-navigation-v1','lastlight'],cavern:['holm-cavern-oldschool-navigation-v1',null]};
const SEAT_ID={bakehouse:'bakehouse',lodge:'lodge'};
function registry(){return exists(REG)?read(REG):{buildings:{}}}
// design-loop proxy: floors lifted by the seat's rise; terrain-lane stances re-sampled from the v2 land outside the seat
function proxy(id,terrain,seats){
 const g=read('.studio-workspaces/'+BUILDINGS[id][0]+'/candidates/navigation.json'),o=g.placement||g.origin,q=seats.find(s=>s.id===(SEAT_ID[id]||id));
 const dy=q?q.dy:0,out=JSON.parse(JSON.stringify(g));out.placement={x:o.x,y:+(o.y+dy).toFixed(4),z:o.z};delete out.origin;
 const inSeat=(wx,wz)=>q&&wx>=q.x0&&wx<=q.x0+q.w&&wz>=q.z0&&wz<=q.z0+q.d;
 out.nodes.forEach(n=>{if(!/Terrain$/.test(n.surface))return;const wx=n.x+o.x,wz=n.z+o.z;if(inSeat(wx,wz)||o.x>=144)return;
  const y=Terrain.sample(terrain,wx,wz)-out.placement.y;n.y=+y.toFixed(6);n.capsuleBase=+y.toFixed(6)});
 out.proxy=true;return out;
}
function load(opts){
 opts=opts||{};
 const terrain=read(TERRAIN),design=read('docs/rebuild/holm-overhaul/terrain-v2.design.json'),seats=read('.studio-workspaces/holm-overhaul-terrain-v2/seats.json');
 const layout=read('docs/rebuild/holm-overhaul/arrival-layout.json'),guide=design.seats.find(s=>s.arrival);
 layout.building.world.foundationY=guide.y;layout.approach.waypoints=design.approach.waypoints;layout.approach.clearWidth=design.approach.clearWidth;
 const dock=read('docs/rebuild/holm-overhaul/arrival-dock.json');
 const base={layout,envelopes:read('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'),terrain,
  placement:read('docs/rebuild/holm-overhaul/arrival-landscape.json'),measurement:read('.studio-workspaces/holm-arrival-landscape-measure-v3/candidates/measured.json')};
 const provision=Provision.compile({...base,dock,manifest:read('.studio-workspaces/holm-provision-rack-v1/candidates/manifest.json'),placement:read('docs/rebuild/holm-overhaul/arrival-provisions.json')});
 const scenery=Scenery.compile({...base,layout:provision.layout,envelopes:provision.envelopes});
 const arrival=Dock.create(scenery.layout,scenery.envelopes,terrain,dock);
 const b=scenery.layout.building,w=b.world;
 const blockers=scenery.blockers.map(x=>({id:x.id,x0:x.x0,x1:x.x1,z0:x.z0,z1:x.z1}));
 const reg=registry(),buildings=[],status={};
 Object.keys(BUILDINGS).forEach(id=>{const r=reg.buildings[id];
  if(r&&r.graph&&exists('.studio-workspaces/'+r.graph+'/candidates/navigation.json')){buildings.push({id,graph:read('.studio-workspaces/'+r.graph+'/candidates/navigation.json')});status[id]='measured'}
  else if(opts.proxy!==false){buildings.push({id,graph:proxy(id,terrain,seats)});status[id]='proxy'}});
 const plan=read('docs/rebuild/holm-overhaul/plan.json'),built=new Set();
 buildings.forEach(B=>{const pl=BUILDINGS[B.id][1]&&plan.places.find(q=>q.id===BUILDINGS[B.id][1]);const g=B.graph,o=g.placement||g.origin;
  if(pl)for(let z=Math.floor(pl.z-pl.d/2)-1;z<=Math.ceil(pl.z+pl.d/2)+1;z++)for(let x=Math.floor(pl.x-pl.w/2)-1;x<=Math.ceil(pl.x+pl.w/2)+1;x++)built.add(x+','+z);
  if(pl)g.nodes.forEach(n=>{if(!/Terrain$/.test(n.surface))built.add(Math.floor(n.x+o.x)+','+Math.floor(n.z+o.z))})});
 const habitatPath=reg.habitat||'.studio-workspaces/holm-habitat-v4/working/vegetation.json',hab=read(habitatPath);
 const veg=hab.placements.filter(p=>!built.has(Math.floor(p.x)+','+Math.floor(p.z)));
 veg.forEach(p=>{const r=hab.blockers[p.asset];if(r)blockers.push({id:'habitat:'+p.id,mode:'overlap',x0:p.x-r*p.scale,x1:p.x+r*p.scale,z0:p.z-r*p.scale,z1:p.z+r*p.scale})});
 const L=read('docs/rebuild/holm-overhaul/island-lessons.json');
 L.trees.forEach(t=>{const r=L.treeBlockRadius*(t.scale||1);blockers.push({id:'lesson:'+t.id,mode:'overlap',x0:t.x-r,x1:t.x+r,z0:t.z-r,z1:t.z+r})});
 L.rocks.forEach(k=>{const r=L.rockBlockRadius;blockers.push({id:'lesson:'+k.id,mode:'overlap',x0:k.x-r,x1:k.x+r,z0:k.z-r,z1:k.z+r})});
 // the runtime's bridge data (tools/rebuild_holm_v2land.js measures the design's decks on the v2 land into it)
 const bridges=read('docs/rebuild/holm-overhaul/island-bridges.json').bridges;
 return {terrain,design,seats,layout,arrival,dock,scenery,blockers,buildings,bridges,plan,lessons:L,status,
  ladders:read('docs/rebuild/holm-overhaul/island-ladders.json').ladders,
  arrivalFootprints:[{x0:w.x-b.width/2,x1:w.x+b.width/2,z0:w.z-b.depth/2,z1:w.z+b.depth/2}]};
}
module.exports={load,BUILDINGS,TERRAIN,REG};
