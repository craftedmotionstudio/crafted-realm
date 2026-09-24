'use strict';
const fs=require('fs'),assert=require('assert'),Approach=require('../src/holm_arrival_approach');
const read=p=>JSON.parse(fs.readFileSync(p)),clone=x=>JSON.parse(JSON.stringify(x));
const layout=read('docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes=read('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json');
const bundle=read('.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json');
const before=JSON.stringify([layout,envelopes,bundle]),doors={arrival:true,garden:true};
const nav=Approach.create(layout,envelopes,bundle),graph=nav.compile(doors),byId=Object.fromEntries(graph.nodes.map(p=>[p.id,p]));
assert.deepStrictEqual(graph,nav.compile(doors));assert.strictEqual(JSON.stringify([layout,envelopes,bundle]),before);
const landing='exterior:61,118',chart='ground:65,97',study='upper:65,96';
for(const [start,end] of [[landing,chart],[chart,study],[study,landing]]){
 const route=nav.route(graph,start,end);assert(route,`${start} -> ${end}`);
 for(let i=1;i<route.length;i++){
  const p=byId[route[i-1]],q=byId[route[i]];
  assert.strictEqual(Math.abs(p.x-q.x)+Math.abs(p.z-q.z),1);
  assert(nav.edge(p,q,doors));assert(nav.edge(q,p,doors));
 }
}
assert.strictEqual(nav.route(nav.compile({arrival:false,garden:true}),landing,chart),null);
for(const p of graph.nodes.filter(p=>p.surface==='exterior')){
 assert(p.z>=106);assert.strictEqual(p.y,require('../src/holm_overhaul_terrain').sample(bundle,p.x,p.z));
 assert.strictEqual(bundle.water[Math.floor(p.z)*bundle.width+Math.floor(p.x)],0);
}
assert.strictEqual(nav.support('exterior',66.5,104.5,doors),null,'no exterior wall bypass');
assert.strictEqual(nav.support('exterior',67.5,106.5,doors),null,'porch post/corridor exclusion');
assert.strictEqual(nav.support('exterior',65.5,106.5,doors),null,'fully open south leaf excludes west lane');
assert.strictEqual(nav.support('exterior',66.6,110,doors),null,'radius must remain inside authored corridor');
assert.strictEqual(nav.edge(byId[landing],{surface:'exterior',x:62.5,z:117.5},doors),null);
const wet=clone(bundle);wet.water[118*144+61]=1;
assert.strictEqual(Approach.create(layout,envelopes,wet).support('exterior',61.5,118.5,doors),null);
const jump=clone(bundle);for(let z=105;z<=107;z++)for(let x=65;x<=67;x++)jump.heights[z*145+x]-=.2;
const broken=Approach.create(layout,envelopes,jump);assert.strictEqual(broken.route(broken.compile(doors),landing,chart),null,'height seam must fail closed');
const steep=clone(bundle);for(let x=60;x<=62;x++)steep.heights[117*145+x]+=2;
const cliff=Approach.create(layout,envelopes,steep);assert.strictEqual(cliff.route(cliff.compile(doors),landing,chart),null,'steep edge must fail closed');
for(const mutate of [l=>l.approach.maxSlope=NaN,l=>l.approach.clearWidth=.5,l=>l.approach.waypoints[1][0]+=1]){
 const bad=clone(layout);mutate(bad);assert.throws(()=>Approach.create(bad,envelopes,bundle));
}
const bad=clone(bundle);bad.water[0]=8;assert.throws(()=>Approach.create(layout,envelopes,bad));
const vm=require('vm'),context={console};vm.createContext(context);
for(const file of ['src/holm_arrival_navigation.js','src/holm_overhaul_terrain.js','src/holm_arrival_approach.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
assert.strictEqual(JSON.stringify(context.HolmArrivalApproach.create(layout,envelopes,bundle).compile(doors)),JSON.stringify(graph),'classic global scripts must match CommonJS');
console.log(`[HOLM_ARRIVAL_APPROACH] ${graph.nodes.length} nodes; deterministic immutable landing/chart/study/return; cardinal, closed-door, footprint-water, seam and slope rejection passed. Source envelopes only; no live acceptance.`);
