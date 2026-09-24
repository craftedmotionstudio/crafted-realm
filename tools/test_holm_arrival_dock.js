'use strict';
const assert=require('assert'),Dock=require('../src/holm_arrival_dock');
const layout=require('../docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes=require('../docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json');
const terrain=require('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'),dock=require('../docs/rebuild/holm-overhaul/arrival-dock.json');
const doors={arrival:true,garden:true},nav=Dock.create(layout,envelopes,terrain,dock),graph=nav.compile(doors),nodes=Object.fromEntries(graph.nodes.map(p=>[p.id,p]));
for(const target of ['exterior:61,118','ground:65,97','upper:65,96']){
 for(const [a,b] of [[dock.destination,target],[target,dock.destination]]){
  const route=nav.route(graph,a,b);assert(route&&route.length>1,a+' -> '+b);
  for(let i=1;i<route.length;i++)assert(nav.edge(nodes[route[i-1]],nodes[route[i]],doors));
 }
}
assert(!nav.support('dock',59.9,124,doors),'edge fall');
assert(!nav.support('dock',61.5,127.2,doors),'far rail');
assert(!nav.support('dock',61.5,118.4,doors),'deck cannot replace shore');
assert(!nav.support('exterior',61.5,125,doors),'water remains blocked without deck');
assert(!nav.edge(nodes['dock:60,124'],nodes['dock:61,125'],doors),'no diagonal');
const raised=JSON.parse(JSON.stringify(dock));raised.world.y+=.2;
const bad=Dock.create(layout,envelopes,terrain,raised),badGraph=bad.compile(doors);
assert(!bad.route(badGraph,'exterior:61,118',dock.destination),'mismatched seam cannot invent ramp');
assert.deepStrictEqual(nav.compile(doors),graph,'deterministic graph');
const Checkpoint=require('../src/holm_arrival_checkpoint');
assert.deepStrictEqual(Checkpoint.restore(graph,Checkpoint.encode(graph,dock.destination,'dock-v1'),'dock-v1'),nodes[dock.destination],'dock checkpoint roundtrip');
console.log('[HOLM_ARRIVAL_DOCK] '+graph.nodes.length+' nodes; shore/chart/study return routes, wet terrain isolation, railing footprint, diagonal and bad seam rejection passed. Preview only.');
