'use strict';
const fs=require('fs'),assert=require('assert'),Nav=require('../src/holm_arrival_navigation');
const layout=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/arrival-layout.json'));
const envelopes=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'));
const before=JSON.stringify([layout,envelopes]),nav=Nav.create(layout,envelopes),doors={arrival:true,garden:true};
const graph=nav.compile(doors),byId=Object.fromEntries(graph.nodes.map(n=>[n.id,n]));
assert.deepStrictEqual(graph,nav.compile(doors));assert.strictEqual(JSON.stringify([layout,envelopes]),before);
const porch='ground:66,105',chart='ground:65,97',study='upper:65,96';
for(const [a,b] of [[porch,chart],[chart,study],[study,porch]]){
 const route=nav.route(graph,a,b);assert(route,`No route ${a} to ${b}`);
 if(a===chart&&b===study)assert(route.some(id=>id.startsWith('stair:')));
 for(let i=1;i<route.length;i++){
  const from=byId[route[i-1]],to=byId[route[i]];
  assert.strictEqual(Math.abs(from.x-to.x)+Math.abs(from.z-to.z),1);
  assert(nav.edge(from,to,doors));assert(nav.edge(to,from,doors));
 }
}
assert.strictEqual(nav.support('ground',66.5,99.5,doors).y,3);
assert.strictEqual(nav.support('upper',66.5,99.5,doors).y,5.8);
assert.strictEqual(nav.support('upper',70.5,99.5,doors),null);
assert.strictEqual(nav.support('ground',70.5,99.5,doors),null);
assert(nav.support('stair',70.5,99.5,doors));
assert.strictEqual(nav.edge({surface:'upper',x:69.5,z:99.5},{surface:'stair',x:70.5,z:99.5},doors),null);
assert.strictEqual(nav.edge({surface:'ground',x:66.5,z:99.5},{surface:'ground',x:67.5,z:100.5},doors),null);
assert.strictEqual(nav.route(nav.compile({arrival:false,garden:true}),porch,chart),null);
const blocked=JSON.parse(JSON.stringify(envelopes));blocked.blockers.push({id:'blocked-landing',surface:'upper',x0:3.5,x1:5,z0:-3,z1:-1.6});
const blockedNav=Nav.create(layout,blocked);assert.strictEqual(blockedNav.route(blockedNav.compile(doors),porch,study),null);
const tight=JSON.parse(JSON.stringify(layout));tight.stairs.startZ=3;tight.stairs.endZ=-1.8;const tightNav=Nav.create(tight,envelopes);assert.strictEqual(tightNav.route(tightNav.compile(doors),porch,study),null,'Handrail overhang must block the too-tight lower turn');
for(const change of [x=>x.stairs.riserHeight=NaN,x=>x.stairs.axis='x',x=>x.stairs.endY=9]){const bad=JSON.parse(JSON.stringify(layout));change(bad);assert.throws(()=>Nav.create(bad,envelopes));}
assert.throws(()=>Nav.create(layout,{blockers:[{surface:'upper',x0:1,x1:0,z0:0,z1:1}]}));
console.log(`[HOLM_ARRIVAL_NAVIGATION] ${graph.nodes.length} stance nodes; cardinal porch/chart/study/return, explicit storeys, tread edges, closed-door and blocked-landing rejection passed. Source envelopes only; no live acceptance.`);
