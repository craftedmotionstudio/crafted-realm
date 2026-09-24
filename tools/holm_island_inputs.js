'use strict';
// Node-side assembly of the island navigation inputs from the actual Sept 13 candidates (shared by tests/tools).
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const Scenery=require('../src/holm_arrival_scenery'),Provision=require('../src/holm_arrival_provisions'),Dock=require('../src/holm_arrival_dock');
const Terrain=require('../src/holm_overhaul_terrain');
const TERRAIN='.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json';
const TREE_TRUNK={oak:.45,birch:.3,'coastal-pine':.35};
// bridge deck tiles: scan from the plan's crossing point along its axis over every wet tile to dry land both sides
function bridgeFrom(terrain,b){
 const W=terrain.width,wet=(x,z)=>terrain.water[z*W+x]!==0,dx=b.orientation==='EW'?1:0,dz=dx?0:1;
 // the plan marks concept crossings; snap along the bridge's own axis to the nearest creek tile (within 4)
 let x=b.x,z=b.z;
 if(!wet(x,z)){const hit=[1,-1,2,-2,3,-3,4,-4].map(o=>[b.x+dx*o,b.z+dz*o]).find(p=>wet(p[0],p[1]));
  if(!hit)throw Error('bridge '+b.label+' has no creek within 4 tiles along its axis');x=hit[0];z=hit[1]}
 const tiles=[[x,z]];
 for(const s of [-1,1]){let cx=x+dx*s,cz=z+dz*s;while(wet(cx,cz)){tiles.push([cx,cz]);cx+=dx*s;cz+=dz*s}}
 tiles.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
 const a=tiles[0],c=tiles[tiles.length-1],ends=[[a[0]-dx,a[1]-dz],[c[0]+dx,c[1]+dz]];
 const deckY=Math.max(...ends.map(e=>Terrain.sample(terrain,e[0]+.5,e[1]+.5)));
 return {id:b.label.replace(/\W+/g,'_').toLowerCase(),label:b.label,orientation:b.orientation,tiles,ends,deckY:+deckY.toFixed(3)};
}
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
