/* Headless tests for the tile house planner (src/holm_tile_house.js). Run: node tools/test_holm_tile_house.js */
'use strict';
const assert=require('assert'),H=require('../src/holm_tile_house.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// L-plan: 6x5 hall, a 4x4 study wing to the east sharing a wall, a loft over the hall.
const house={schema:'holm-tile-house-v1',id:'guide',origin:[60,94],floorY:3,storeyH:2.6,
  rooms:[{id:'hall',level:0,x:0,z:0,w:6,d:5},{id:'study',level:0,x:6,z:1,w:4,d:4},{id:'loft',level:1,x:0,z:0,w:6,d:5}],
  openings:[{level:0,x:2,z:4,side:'S',kind:'door'},{level:0,x:5,z:2,side:'E',kind:'arch'},
    {level:0,x:0,z:2,side:'W',kind:'window'},{level:0,x:8,z:4,side:'S',kind:'window'},{level:1,x:3,z:0,side:'N',kind:'window'}],
  stairs:[{id:'ladder',x:0,z:0,fromLevel:0,toX:1,toZ:0}],
  roofs:[{x:0,z:0,w:6,d:5,kind:'gable',ridge:'x',rise:1.6},{x:6,z:1,w:4,d:4,kind:'hip',ridge:'z',rise:1.2}]};
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n);};
const p=H.plan(house);

check('deterministic and immutable',()=>{const before=JSON.stringify(house);assert.strictEqual(JSON.stringify(H.plan(house)),JSON.stringify(p));assert.strictEqual(JSON.stringify(house),before);});
check('tile and wall counts for the L plan',()=>{
  assert.strictEqual(p.stats.tiles,30+16+30);
  // ground perimeter: hall 22 + study 16 - shared 8 (4 shared edges counted once as an interior wall)
  const ground=p.edges.filter(e=>e.level===0);
  assert.strictEqual(ground.filter(e=>e.exterior).length,22+16-8);
  assert.strictEqual(ground.filter(e=>!e.exterior).length,4,'hall/study shared wall');
  assert.strictEqual(p.edges.filter(e=>e.level===1&&e.exterior).length,22);
});
check('shared wall is one edge naming both rooms',()=>{const s=p.edges.filter(e=>e.level===0&&!e.exterior);assert(s.every(e=>e.rooms.length===2));});
check('openings replace walls',()=>{
  assert.strictEqual(p.stats.doors,1);assert.strictEqual(p.stats.windows,3);
  assert(p.edges.some(e=>e.kind==='arch'&&!e.exterior));
});
check('stairs link ground to loft',()=>{assert.deepStrictEqual(p.stairs.map(s=>[s.from,s.to]),[['hall','loft']]);});
check('invalid houses are refused',()=>{
  [h=>h.rooms[1].x=5,                                       // overlap
   h=>h.rooms[2].x=4,                                       // loft overhangs
   h=>h.openings[0].z=2,                                    // door not on a wall (interior tile edge)
   h=>h.openings.push(clone(h.openings[0])),                // duplicate opening
   h=>h.openings[1].kind='window',                          // window on an interior wall
   h=>h.openings.splice(1,1),                               // study sealed off
   h=>h.openings.splice(0,1),                               // no door outside
   h=>h.stairs=[],                                          // loft unreachable
   h=>h.stairs[0].toX=9,                                    // stair lands off the loft
   h=>h.rooms[0].w=0,h=>h.rooms[0].level=2,h=>h.storeyH=9,h=>h.origin=[1.5,2],
   h=>h.roofs[0].kind='dome',h=>h.openings[0].side='X'].forEach((f,i)=>{
    const h=clone(house);f(h);assert.throws(()=>H.plan(h),'case '+i);
  });
});
check('furniture must stay clear of openings and stairs and keep every room reachable',()=>{
  const ok=clone(house);ok.furniture=[{kind:'table',level:0,x:2,z:1,w:2,d:2},{kind:'rug',level:0,x:2,z:4,w:2,d:1}];
  assert.strictEqual(H.plan(ok).furniture.length,2);
  [[{kind:'crate',level:0,x:2,z:4}],                               // in front of the door
   [{kind:'crate',level:0,x:6,z:2}],                               // beside the arch
   [{kind:'crate',level:0,x:0,z:0}],                               // on the ladder
   [{kind:'crate',level:0,x:12,z:0}],                              // outside the house
   [{kind:'table',level:0,x:2,z:1,w:2,d:2},{kind:'chest',level:0,x:3,z:2}],   // overlap
   [{kind:'table',level:1,x:1,z:1,w:1,d:4},{kind:'table',level:1,x:2,z:0,w:1,d:1}]  // walls the landing in
  ].forEach((f,i)=>{const h=clone(house);h.furniture=f;assert.throws(()=>H.plan(h),'furniture case '+i);});
});
check('the real guide house plan validates',()=>{
  const g=H.plan(require('../assets/world/holm_v3/guide_house.tilehouse.json'));
  assert.strictEqual(g.stats.doors,1);assert(g.furniture.some(f=>f.role==='study_route'));assert(g.furniture.some(f=>f.role==='provisions'));
});
console.log('[HOLM_TILE_HOUSE] '+passed+'/'+passed+' checks passed');
