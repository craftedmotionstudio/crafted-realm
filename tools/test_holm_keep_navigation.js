'use strict';
const assert=require('assert'),fs=require('fs'),Nav=require('../src/holm_keep_navigation');
const data=JSON.parse(fs.readFileSync('.studio-workspaces/holm-keep-navigation-v4/candidates/navigation.json','utf8'));
const original=JSON.stringify(data),nav=Nav.create(data);let samples=0;
for(const [id,neighbors] of Object.entries(data.links))for(const to of neighbors){const a=nav.nodes.get(id),b=nav.nodes.get(to);
 for(let i=0;i<=20;i++){const p=nav.point(id,to,i/20);assert(p&&['x','y','z'].every(k=>Number.isFinite(p[k])));assert(Math.abs(p.x-(a.x+(b.x-a.x)*i/20))<1e-5);assert(Math.abs(p.z-(a.z+(b.z-a.z)*i/20))<1e-5);samples++;}}
assert.strictEqual(nav.route('absent',data.startId),null);assert.strictEqual(nav.point('absent',data.startId,.5),null);
const reached=data.targets.map(t=>({id:t.id,reachable:!!nav.route(data.startId,t.nodeId)}));
assert.strictEqual(JSON.stringify(data),original,'input mutated');
const bad=JSON.parse(original),first=Object.keys(bad.links).find(k=>bad.links[k].length);if(first){const other=bad.links[first][0];bad.links[other]=bad.links[other].filter(k=>k!==first);assert.throws(()=>Nav.create(bad),/asymmetric/)}
console.log('[KEEP_NAVIGATION_TEST] immutable graph, cardinal interpolation, unreachable and malformed edges pass; '+samples+' interpolation samples');
console.log(JSON.stringify(reached));
if(reached.some(t=>!t.reachable)){console.error('[KEEP_NAVIGATION_TEST] required destinations disconnected');process.exitCode=1;}
