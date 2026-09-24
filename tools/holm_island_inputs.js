'use strict';
// Node-side assembly of the island navigation inputs from the actual Sept 13 candidates (shared by tests/tools).
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const Scenery=require('../src/holm_arrival_scenery'),Provision=require('../src/holm_arrival_provisions'),Dock=require('../src/holm_arrival_dock');
const Terrain=require('../src/holm_overhaul_terrain');
const TERRAIN='.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json';
const TREE_TRUNK={oak:.45,birch:.3,'coastal-pine':.35};
const bridgeFrom=(t,b)=>require('../src/holm_island_nav').bridgeFrom(t,b);
function load(){
 const terrain=read(TERRAIN),dock=read('docs/rebuild/holm-overhaul/arrival-dock.json');
 const base={layout:read('docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes:read('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'),terrain,
  placement:read('docs/rebuild/holm-overhaul/arrival-landscape.json'),measurement:read('.studio-workspaces/holm-arrival-landscape-measure-v2/candidates/measured.json')};
 const provision=Provision.compile({...base,dock,manifest:read('.studio-workspaces/holm-provision-rack-v1/candidates/manifest.json'),placement:read('docs/rebuild/holm-overhaul/arrival-provisions.json')});
 const scenery=Scenery.compile({...base,layout:provision.layout,envelopes:provision.envelopes});
 const arrival=Dock.create(scenery.layout,scenery.envelopes,terrain,dock);
 const b=scenery.layout.building,w=b.world;
 const blockers=scenery.blockers.map(x=>({id:x.id,x0:x.x0,x1:x.x1,z0:x.z0,z1:x.z1}));
 const veg=read('.studio-workspaces/holm-habitat-v1/working/vegetation.json').placements;
 veg.forEach(p=>{const r=TREE_TRUNK[p.asset];if(r)blockers.push({id:'habitat:'+p.id,mode:'overlap',x0:p.x-r*p.scale,x1:p.x+r*p.scale,z0:p.z-r*p.scale,z1:p.z+r*p.scale})});
 const buildings=[
  {id:'keep',graph:read('.studio-workspaces/holm-keep-navigation-v4/candidates/navigation.json')},
  {id:'bakehouse',graph:read('.studio-workspaces/holm-kitchen-navigation-v3/candidates/navigation.json')},
  {id:'lodge',graph:read('.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/navigation.json')}];
 const plan=read('docs/rebuild/holm-overhaul/plan.json');
 const bridges=plan.bridges.map(x=>bridgeFrom(terrain,x));
 return {terrain,arrival,dock,scenery,blockers,buildings,bridges,plan,
  arrivalFootprints:[{x0:w.x-b.width/2,x1:w.x+b.width/2,z0:w.z-b.depth/2,z1:w.z+b.depth/2}]};
}
module.exports={load,bridgeFrom,TREE_TRUNK};
