'use strict';
const assert=require('assert'),fs=require('fs'),Nav=require('../src/holm_keep_navigation');
const data=JSON.parse(fs.readFileSync('.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/navigation.json','utf8'));
for(const target of data.targets){assert.strictEqual(target.reachable,true);const node=data.nodes.find(n=>n.id===target.nodeId);assert(node);const [x,y,z]=target.requestedLocal;assert(Math.abs(node.x-x)<1e-5&&Math.abs(node.z-z)<1e-5&&Math.abs(node.y-y)<.01,'wrong target floor or tile');}
const original=JSON.stringify(data),nav=Nav.create(data);let samples=0;
for(const [id,neighbors] of Object.entries(data.links))for(const to of neighbors){const a=nav.nodes.get(id),b=nav.nodes.get(to);
 for(let i=0;i<=20;i++){const p=nav.point(id,to,i/20);assert(p&&['x','y','z'].every(k=>Number.isFinite(p[k])));assert(Math.abs(p.x-(a.x+(b.x-a.x)*i/20))<1e-5);assert(Math.abs(p.z-(a.z+(b.z-a.z)*i/20))<1e-5);samples++;}}
assert.strictEqual(nav.route('absent',data.startId),null);assert.strictEqual(nav.point('absent',data.startId,.5),null);
const reached=data.targets.map(t=>({id:t.id,reachable:!!nav.route(data.startId,t.nodeId)}));
assert.strictEqual(JSON.stringify(data),original,'input mutated');
const bad=JSON.parse(original),first=Object.keys(bad.links).find(k=>bad.links[k].length);if(first){const other=bad.links[first][0];bad.links[other]=bad.links[other].filter(k=>k!==first);assert.throws(()=>Nav.create(bad),/asymmetric/)}
console.log('[QUEST_TERRAIN_NAVIGATION_TEST] immutable graph, cardinal interpolation, unreachable and malformed edges pass; '+samples+' interpolation samples');
console.log(JSON.stringify(reached));
if(reached.some(t=>!t.reachable)){console.error('[QUEST_TERRAIN_NAVIGATION_TEST] required destinations disconnected');process.exitCode=1;}

const route=data.report.outsideLaneRoute;assert(Array.isArray(route)&&route.length>2);assert.equal(route[0],data.startId);assert.equal(route.at(-1),data.targets.find(t=>t.id==='north-lane').nodeId);for(let i=0;i<route.length;i++){const n=nav.nodes.get(route[i]);assert(n.surface.includes('Terrain'));assert.equal((n.x+data.origin.x)%1,.5);assert.equal((n.z+data.origin.z)%1,.5);if(i)assert(data.links[route[i-1]].includes(route[i]));}console.log('[QUEST_TERRAIN_LANE] '+route.length+' exterior-only nodes on world tile centers');

const plan=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/plan.json','utf8')).paths[0].points;const start=nav.nodes.get(route[0]),end=nav.nodes.get(route.at(-1));const same=(p,n)=>p[0]===n.x+data.origin.x&&p[1]===n.z+data.origin.z;const i0=plan.findIndex(p=>same(p,start)),i1=plan.findIndex(p=>same(p,end));assert(i0>=0&&i1>i0);const expanded=[plan[i0]];for(let i=i0+1;i<=i1;i++){const a=plan[i-1],b=plan[i],len=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);assert(a[0]===b[0]||a[1]===b[1]);for(let k=1;k<=len;k++)expanded.push([a[0]+(b[0]-a[0])*k/len,a[1]+(b[1]-a[1])*k/len]);}assert.deepEqual(expanded,route.map(id=>{const n=nav.nodes.get(id);return[n.x+data.origin.x,n.z+data.origin.z]}));console.log('[QUEST_TERRAIN_PLAN] revised concept lane matches every measured exterior tile');

assert(nav.route(data.startId,data.targets.find(t=>t.id==='north-lane').nodeId).every(id=>nav.nodes.get(id).surface==='IslandTerrain'));console.log('[QUEST_TERRAIN_UI_ROUTE] actual shared router bypasses lodge interior');
