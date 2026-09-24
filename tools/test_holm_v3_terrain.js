/* Headless contract tests for the v3 terrain compiler (src/holm_v3_terrain.js).
 * Run: node tools/test_holm_v3_terrain.js */
'use strict';
const assert=require('assert'),T=require('../src/holm_v3_terrain.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// A square island, a north-south creek down x=40, a bridge across it, two anchors either side.
const source={schema:'holm-terrain-source-v3',version:1,width:144,depth:128,spacing:1,
  coast:[[4,4],[140,4],[140,124],[4,124]],hills:[],
  pads:[{id:'west',x:20,z:60,w:8,d:8,height:3,blend:3},{id:'east',x:70,z:60,w:8,d:8,height:3,blend:3}],
  creek:{points:[[40,0,2.6],[40,128,2.4]],halfWidth:1.2,bankWidth:2.5,depth:.8},
  crossings:[{id:'bridge',x:37,z:60,w:7,d:2,deckY:3}],
  paths:[{material:'dirt',width:2,points:[[20,60],[36,60]]},{material:'cobble',width:1,points:[[44,60],[70,60],[70,64]]}],
  anchors:{west:[20,60],east:[70,60],sea:[1,1]},
  routes:[['west','east']]};
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name);};
const b=T.compile(source);

check('deterministic, immutable source, full tile arrays',()=>{
  const before=JSON.stringify(source);
  assert.strictEqual(JSON.stringify(T.compile(source)),JSON.stringify(b));
  assert.strictEqual(JSON.stringify(source),before);
  assert.strictEqual(b.tileY.length,144*128);assert.strictEqual(b.overlay.length,144*128);
});
check('creek tiles have no walk height; the bridge deck does',()=>{
  assert.strictEqual(T.walkHeight(b,40.5,30.5),null,'open creek is water');
  assert.strictEqual(T.walkHeight(b,40.5,60.5),3,'deck height over the creek');
  assert.strictEqual(T.walkHeight(b,2,2),null,'sea');
  assert.strictEqual(T.walkHeight(b,-1,5),null,'off map');
});
check('the route across the bridge is reachable in cardinal steps',()=>{
  assert.deepStrictEqual(b.routes.map(r=>r.reachable),[true]);
  assert(b.routes[0].steps>=50,'at least the Manhattan distance');
  assert.strictEqual(b.stats.routesReachable,1);
});
check('without the bridge the creek splits the island',()=>{
  const s=clone(source);s.crossings=[];s.paths=[s.paths[0]];
  assert.deepStrictEqual(T.compile(s).routes.map(r=>r.reachable),[false]);
});
check('route to the sea is unreachable',()=>{
  const r=T.route(b,source.anchors.west,source.anchors.sea);assert.strictEqual(r.reachable,false);
});
check('path overlays mark their tiles, width grows sideways',()=>{
  assert.strictEqual(T.overlayAt(b,25,60),'dirt');assert.strictEqual(T.overlayAt(b,25,61),'dirt');
  assert.strictEqual(T.overlayAt(b,25,62),'none');assert.strictEqual(T.overlayAt(b,70,63),'cobble');
});
check('a step higher than MAX_STEP is refused, a small one allowed',()=>{
  const flat=clone(b);const i=60*144+25;flat.tileY[i]=flat.tileY[i-1]+T.MAX_STEP+.01;
  assert.strictEqual(T.canStep(flat,24,60,1,0),false);flat.tileY[i]=flat.tileY[i-1]+T.MAX_STEP-.01;
  assert.strictEqual(T.canStep(flat,24,60,1,0),true);
});
check('malformed sources are rejected',()=>{
  [s=>s.schema='holm-overhaul-terrain-source-v1',
   s=>s.paths[0].points=[[20,60],[36,61]],              // diagonal
   s=>s.paths[0].points=[[20,60],[20,60]],              // empty segment
   s=>s.paths[0].material='lava',
   s=>s.paths[0].width=9,
   s=>s.paths.push({material:'dirt',width:1,points:[[30,40],[50,40]]}),   // crosses the creek with no deck
   s=>s.crossings[0].deckY=NaN,
   s=>s.crossings[0].x=60,                              // spans no creek
   s=>s.crossings[0].deckY=2.7,                         // barely above water
   s=>s.crossings[0].deckY=9,                           // ends cannot be stepped onto
   s=>s.crossings.push(clone(s.crossings[0])),          // duplicate id
   s=>{s.crossings.push({...clone(s.crossings[0]),id:'b2'});}, // overlap
   s=>s.crossings[0].w=2,s=>s.crossings[0].d=5,         // stops mid-creek / too wide
   s=>s.routes.push(['west','nowhere']),
   s=>s.anchors.west=[20.5,60]].forEach((change,n)=>{
    const s=clone(source);change(s);assert.throws(()=>T.compile(s),'case '+n);
  });
});
check('plazas pave a round area of dry tiles; dips press hollows without touching pads or reaching the sea',()=>{
  const s=clone(source);s.plazas=[{material:'cobble',x:70.5,z:70.5,r:2.5}];s.dips=[{x:100,z:40,r:10,depth:3},{x:20,z:60,r:6,depth:5}];
  const d=T.compile(s);
  assert.strictEqual(T.overlayAt(d,70,70),'cobble');assert.strictEqual(T.overlayAt(d,72,70),'cobble');assert.strictEqual(T.overlayAt(d,74,70),'none');
  const h0=T.walkHeight(b,100.5,40.5),h1=T.walkHeight(d,100.5,40.5);
  assert(h1<h0-1.2&&h1>=.4-1e-9,'the hollow deepens the ground but stops 0.4 above the sea ('+h0+' -> '+h1+')');
  assert.strictEqual(T.walkHeight(d,20.5,60.5),3,'a dip over a building pad leaves the pad level');
  assert(d.base.heights.every(h=>h>=-2),'nothing below the sea floor');
  [x=>x.plazas=[{material:'lava',x:1,z:1,r:2}],x=>x.plazas=[{material:'cobble',x:1,z:1,r:40}],
   x=>x.dips=[{x:1,z:1,r:1,depth:2}],x=>x.dips=[{x:1,z:1,r:5,depth:20}],x=>x.dips=[{x:NaN,z:1,r:5,depth:2}]].forEach((f,i)=>{
    const t=clone(source);f(t);assert.throws(()=>T.compile(t),'bad plaza/dip case '+i);});
});
check('the real island: ~2004 size, every route reachable, and the creek splits it without the bridge',()=>{
  const real=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'..','assets','world','holm_v3','holm-v3.terrain.source.json'),'utf8'));
  const rb=T.compile(real);assert(rb.routes.every(r=>r.reachable),'every authored route is walkable');
  let minx=999,maxx=0,minz=999,maxz=0;
  for(let z=0;z<rb.depth;z++)for(let x=0;x<rb.width;x++)if(rb.tileY[z*rb.width+x]!==null){minx=Math.min(minx,x);maxx=Math.max(maxx,x);minz=Math.min(minz,z);maxz=Math.max(maxz,z);}
  assert(maxx-minx+1<=115&&maxz-minz+1<=85,'compact 2004-size island (owner, 2026-09-24)');
  const nb=clone(real);nb.crossings=[];nb.paths=nb.paths.filter(p=>!p.points.some(q=>q[0]===33));
  assert.strictEqual(T.route(T.compile(nb),real.anchors.guide,real.anchors.kitchen).reachable,false,'bridge is the only surface crossing');
});
console.log('[HOLM_V3_TERRAIN] '+passed+'/'+passed+' checks passed');
