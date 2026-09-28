/* HolmCutawayParts (owner review 4, 2026-09-27: "walls disappear but there's still floating beams and pictures"): the rule
 * that decides which pieces of a building are clipped with its walls. Pure; no browser.
 * Run: node tools/test_holm_cutaway_parts.js */
'use strict';
const assert=require('assert'),C=require('../src/holm_cutaway_parts.js');
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const box=(x0,y0,z0,x1,y1,z1,base)=>({min:[x0,y0,z0],max:[x1,y1,z1],base:base||null});
check('a table on the floor keeps its shape, and so does what stands on it',()=>{
 const l=[box(-3,-.2,-3,3,0,3,'keep'),box(0,0,0,.1,.72,.1),box(0,.72,0,1,.76,.6),box(.3,.76,.2,.45,1.0,.35)];
 assert.deepStrictEqual(C.classify(l,[0]).slice(1),['keep','keep','keep']);
});
check('a picture on the wall and a beam under the ceiling are cut; so is what sits on a wall shelf',()=>{
 const l=[box(-3,-.2,-3,3,0,3,'keep'),box(-3,1.3,-2.95,-2.2,1.9,-2.9),box(-3,2.9,0,3,3.1,.2),box(1,1.2,-2.95,2,1.24,-2.6),box(1.2,1.24,-2.9,1.35,1.5,-2.7)];
 assert.deepStrictEqual(C.classify(l,[0,3.3]).slice(1),['cut','cut','cut','cut']);
});
check('a tall thin timber standing in a wall line (a post, a door leaf) is cut, and a beam resting on it with it',()=>{
 const l=[box(-3,-.2,-3,3,0,3,'keep'),box(2.9,0,-1,3.05,2.6,-.9),box(2.9,2.6,-2,3.05,2.8,1),box(0,0,0,.9,2.2,.06)];
 assert.deepStrictEqual(C.classify(l,[0]).slice(1),['cut','cut','cut']);
});
check('a candle on a window sill of the clipped shell is cut with it; a barrel on the island ground outside is kept',()=>{
 const l=[box(-3,.9,-3,-2,1,-2.6,'cut'),box(-2.6,1,-2.9,-2.5,1.2,-2.8),box(5,-1.2,5,5.6,-.3,5.6)];
 assert.deepStrictEqual(C.classify(l,[0],p=>p.min[1]<-1).slice(1),['cut','keep']);
});
check('pieces: vertices welded by position join faces into one piece; separate boxes stay apart',()=>{
 const pos={count:6,getX:i=>[0,1,0,0,1,0][i]+(i>2?5:0),getY:()=>0,getZ:i=>[0,0,1,0,0,1][i]};
 assert.strictEqual(C.pieces(pos,null,2).count,2);
 const shared={count:6,getX:i=>[0,1,0,1,1,0][i],getY:()=>0,getZ:i=>[0,0,1,0,1,1][i]};
 assert.strictEqual(C.pieces(shared,null,2).count,1,'two triangles sharing an edge by position');
});
console.log('[HOLM_CUTAWAY_PARTS] '+passed+'/5 checks passed');if(passed!==5)process.exit(1);
