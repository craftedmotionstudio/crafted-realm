/* Headless locks for the Proving Ground's site search (src/holm_proving_ground.js findSites), on synthetic island graphs:
 *  1 an open land (no trees): the full 11x11 meadow (radius 5) and the original layout, six foes on six tiles;
 *  2 a land whose meadows carry tree clumps every 10 tiles (no 11x11 patch anywhere, as on the Holm v2 land): the
 *    roomiest patch left (9x9, radius 4) is chosen and the layout is scaled into it, every foe on an open tile inside it;
 *  3 a perfect 11x11 meadow that cannot be walked to from the keep court (a moat of rock) is passed over;
 *  4 the scaled layouts keep six distinct tiles and the pack on the far side from the humanoids at every radius.
 * Run: node tools/test_holm_proving_ground.js */
'use strict';
const assert=require('assert');
const PG=require('../src/holm_proving_ground.js');
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
// a composed-graph stand-in: land nodes on a W x D grid minus the holes, 8-direction links under the 2004 rule
// (a diagonal only when both straight neighbours are open)
function graph(W,D,hole){
 const g={nodes:[],byTile:{},byId:{},links:{}},has=(x,z)=>x>=0&&z>=0&&x<W&&z<D&&!hole(x,z);
 for(let z=0;z<D;z++)for(let x=0;x<W;x++){if(!has(x,z))continue;const n={id:'land:'+x+','+z,tx:x,tz:z,x:x+.5,y:1,z:z+.5,owner:'land'};g.nodes.push(n);g.byTile[x+','+z]=[n];g.byId[n.id]=n}
 g.nodes.forEach(n=>{const l=[];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.tx+dx,z=n.tz+dz;if(!has(x,z))continue;
  if(dx&&dz&&!(has(n.tx+dx,n.tz)&&has(n.tx,n.tz+dz)))continue;l.push('land:'+x+','+z)}g.links[n.id]=l});
 return g;
}
const api=g=>({navGraph:()=>g,qaStance:(b,t)=>b==='keep'?(t==='gate'?{id:'land:40,10',x:40.5,y:1,z:10.5}:t==='court'?{id:'land:40,4',x:40.5,y:1,z:4.5}:null):null});
const openAt=(g,x,z)=>{const n=g.byTile[x+','+z];return !!n&&g.links[n[0].id].length>=6};
check('1 open land: the full 11x11 meadow and the original layout',()=>{
 const g=graph(80,80,()=>false),s=PG.findSites(api(g));assert(s,'no site');assert.strictEqual(s.radius,5);
 assert.deepStrictEqual(PG.layout(5).map(q=>q.slice(1)),[[-3,-3],[3,-3],[0,2],[-4,5],[-2,5],[-3,4]]);
 assert.strictEqual(s.spots.length,6);assert.strictEqual(new Set(s.spots.map(q=>q[1].id)).size,6);
});
check('2 tree clumps every 10 tiles (no 11x11 patch): the 9x9 patch, the layout scaled into it',()=>{
 const g=graph(80,80,(x,z)=>x%10===0&&z%10===0),s=PG.findSites(api(g));assert(s,'no site');assert.strictEqual(s.radius,4);
 assert.strictEqual(s.spots.length,6);assert.strictEqual(new Set(s.spots.map(q=>q[1].id)).size,6);
 const c=s.centre;s.spots.forEach(([type,n])=>{assert(Math.abs(n.tx-c.tx)<=4&&Math.abs(n.tz-c.tz)<=4,type+' outside the patch');assert(openAt(g,n.tx,n.tz),type+' not open')});
 const d=Math.max(Math.abs(c.tx-40),Math.abs(c.tz-10));assert(d>=8&&d<=36,'beyond the keep: '+d);
});
check('3 a perfect meadow behind a moat (not reachable from the court) is passed over',()=>{
 // lattice clumps everywhere except inside a moated square (tiles 26..40 x 20..34), whose rim of rock cuts it off
 const moat=(x,z)=>(x===25||x===41)&&z>=19&&z<=35||(z===19||z===35)&&x>=25&&x<=41;
 const inside=(x,z)=>x>25&&x<41&&z>19&&z<35;
 const g=graph(80,80,(x,z)=>moat(x,z)||(!inside(x,z)&&x%10===0&&z%10===0)),s=PG.findSites(api(g));assert(s,'no site');
 assert.strictEqual(s.radius,4,'the moated 11x11 meadow must not win');assert(!inside(s.centre.tx,s.centre.tz),'centre inside the moat');
 // the same land with a gap in the moat: now the 11x11 meadow is reachable and wins
 const g2=graph(80,80,(x,z)=>(moat(x,z)&&!(x===33&&z===19))||(!inside(x,z)&&x%10===0&&z%10===0)),s2=PG.findSites(api(g2));
 assert.strictEqual(s2.radius,5);assert(inside(s2.centre.tx,s2.centre.tz));
});
check('4 scaled layouts: six distinct tiles, the pack on the far side, at radius 5, 4 and 3',()=>{
 for(const r of [5,4,3]){const L=PG.layout(r);assert.strictEqual(new Set(L.map(q=>q[1]+','+q[2])).size,6,'radius '+r);
  L.forEach(q=>assert(Math.abs(q[1])<=r&&Math.abs(q[2])<=r,'radius '+r+' '+q));
  const pack=L.filter(q=>q[0]==='pg_large_rat'),men=L.filter(q=>q[0]==='pg_poacher'||q[0]==='pg_warlock');
  assert(pack.every(p=>men.every(m=>p[2]>m[2])),'radius '+r+': the pack is not on the far side')}
});
console.log('[PROVING GROUND] '+passed+'/4 PASS');
