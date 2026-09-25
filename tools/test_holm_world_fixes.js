/* Headless locks for the 2026-09-25 owner play-test world fixes on Tutor's Holm:
 *  1 bridges: every deck clears the drawn creek by >= .25 and meets land at both ends (the player walks ON the deck);
 *  2 creek: the water fills its carved channel to the drawn bank (no open gap under the water's edge), and no walkable
 *    tile stands under the water line;
 *  3 boat: the moored skiff's closed sole stays over the sea plane through its whole bob;
 *  4 fishing: the ripple lies on the drawn creek, straight off the open end of the fishing stage, no rail in between;
 *  5 path: the arrival trail never dips under the ground the game draws, and no green tile shows on a worn path.
 * Run: node tools/test_holm_world_fixes.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const Nav=require('../src/holm_island_nav'),Water=require('../src/holm_arrival_water'),Trail=require('../src/holm_arrival_trail');
const Chunks=require('../src/holm_overhaul_chunks'),Ground=require('../src/holm_overhaul_ground'),Paths=require('../src/holm_island_paths_data');
const I=require('./holm_island_inputs').load(),T=I.terrain,C=T.creek,bank=Nav.creekBank||(()=>false);
let passed=0;const failed=[];   // HOLM_FIX_CONTINUE=1 reports every failing check instead of stopping at the first
const check=(name,f)=>{try{f();passed++;console.log('PASS '+name)}catch(e){if(!process.env.HOLM_FIX_CONTINUE)throw e;failed.push(name);console.log('FAIL '+name+' :: '+e.message)}};
// ---- the ground exactly as the game draws it: HolmOverhaulChunks.surface -> HolmOverhaulGround.chunk triangles ----
const drawnTris=Object.create(null);
Chunks.compile(T).chunks.forEach(ch=>{const g=Ground.chunk(Chunks.surface(ch,[])),P=g.positions;
 for(let i=0;i<P.length;i+=9){const t=[[P[i],P[i+1],P[i+2]],[P[i+3],P[i+4],P[i+5]],[P[i+6],P[i+7],P[i+8]]];const k=Math.floor(Math.min(t[0][0],t[1][0],t[2][0]))+','+Math.floor(Math.min(t[0][2],t[1][2],t[2][2]));(drawnTris[k]=drawnTris[k]||[]).push(t)}});
function bary(t,x,z){const [A,B,Cc]=t,d=(B[2]-Cc[2])*(A[0]-Cc[0])+(Cc[0]-B[0])*(A[2]-Cc[2]);if(Math.abs(d)<1e-12)return null;
 const u=((B[2]-Cc[2])*(x-Cc[0])+(Cc[0]-B[0])*(z-Cc[2]))/d,v=((Cc[2]-A[2])*(x-Cc[0])+(A[0]-Cc[0])*(z-Cc[2]))/d,w=1-u-v;return u<-1e-9||v<-1e-9||w<-1e-9?null:u*A[1]+v*B[1]+w*Cc[1]}
function drawn(x,z){for(const t of drawnTris[Math.floor(x)+','+Math.floor(z)]||[]){const y=bary(t,x,z);if(y!==null)return y}return null}
// ---- the drawn creek surface ----
const S=Water.surface?Water.surface(C,T):Water.ribbon(C),SP=S.positions,SI=S.indices,sCell=Object.create(null),sTris=[];
for(let i=0;i<SI.length;i+=3){const t=[SI[i],SI[i+1],SI[i+2]].map(k=>[SP[k*3],SP[k*3+1],SP[k*3+2]]);sTris.push(t);const xs=t.map(p=>p[0]),zs=t.map(p=>p[2]);
 for(let z=Math.floor(Math.min(...zs));z<=Math.floor(Math.max(...zs));z++)for(let x=Math.floor(Math.min(...xs));x<=Math.floor(Math.max(...xs));x++)(sCell[x+','+z]=sCell[x+','+z]||[]).push(t)}
function water(x,z){let best=null;for(const t of sCell[Math.floor(x)+','+Math.floor(z)]||[]){const y=bary(t,x,z);if(y!==null&&(best===null||y>best))best=y}return best}
function creek(x,z){let best={d:Infinity};for(let i=1;i<C.points.length;i++){const a=C.points[i-1],b=C.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),d=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);if(d<best.d)best={d,level:a[2]+(b[2]-a[2])*t}}return best}
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.bridges,arrivalFootprints:I.arrivalFootprints}),open={arrival:true,garden:false},g=nav.compile(open);

check('1a runtime bridge data is the measured crossing (island-bridges.json == bridgeFrom(plan))',()=>{
 const data=read('docs/rebuild/holm-overhaul/island-bridges.json').bridges;assert.strictEqual(data.length,I.bridges.length);
 I.bridges.forEach((b,i)=>['id','tiles','ends','endY','deckY'].forEach(k=>assert.deepStrictEqual(data[i][k],b[k],b.id+'.'+k)));
});
check('1b every bridge deck stands clear of the drawn creek (>= .25) wherever water runs under it, and no water tile of the crossing is left undecked',()=>{
 I.bridges.forEach(b=>{let wetTiles=0;b.tiles.forEach(([x,z])=>{if(T.water[z*T.width+x]!==0||bank(T,x,z))wetTiles++;
  for(const [dx,dz] of [[.1,.5],[.5,.5],[.9,.5]]){const w=water(x+dx,z+dz);if(w!==null)assert(b.deckY-w>=.25,b.id+' deck '+b.deckY+' vs water '+w.toFixed(3))}});
  assert(wetTiles>=2,b.id+' crosses water');
  b.ends.forEach(([x,z])=>assert(!(T.water[z*T.width+x]!==0||bank(T,x,z)),b.id+' lands in the water at '+x+','+z))});
});
check('1c the player walks ON the deck: a route from bank to bank crosses every deck tile at deckY, and both ends seam to land',()=>{
 I.bridges.forEach(b=>{const deck=b.tiles.map(([x,z])=>g.byTile[x+','+z].find(n=>n.surface==='deck'));assert(deck.every(Boolean),b.id+' deck nodes');
  deck.forEach(n=>assert(Math.abs(n.y-b.deckY)<1e-9));
  const end=e=>(g.byTile[e[0]+','+e[1]]||[]).find(n=>g.links[n.id].some(id=>deck.some(d=>d.id===id)));
  const a=end(b.ends[0]),c=end(b.ends[1]);assert(a&&c,b.id+' both ends join the deck');
  const r=nav.route(g,a.id,c.id);assert(r,b.id+' crossable');deck.forEach(d=>assert(r.includes(d.id),b.id+' route skips '+d.id));
  [a,c].forEach(n=>assert(Math.abs(n.y-b.deckY)<=Nav.SEAM_STEP+1e-9))});
});
check('1d each bridge is a real crossing: neither landing is a dead end, and the dock -> survival camp route takes the timber bridge',()=>{
 const deckIds=new Set(g.nodes.filter(n=>n.surface==='deck').map(n=>n.id));
 I.bridges.forEach(b=>b.ends.forEach(e=>{const start=(g.byTile[e[0]+','+e[1]]||[]).find(n=>g.links[n.id].some(id=>deckIds.has(id)));assert(start,b.id+' landing '+e);
  const seen=new Set([start.id]),q=[start.id];while(q.length&&seen.size<400){for(const t of g.links[q.pop()])if(!deckIds.has(t)&&!seen.has(t)){seen.add(t);q.push(t)}}
  assert(seen.size>=400,b.id+' landing '+e+' is a dead end ('+seen.size+' nodes without the deck)')}));
 const spawn=g.nodes.find(n=>n.surface==='dock'),camp=g.byId['b:survival:'+I.buildings.find(x=>x.id==='survival').graph.targets.find(t=>t.id==='fire').nodeId];
 const r=nav.route(g,spawn.id,camp.id);assert(r,'survival camp reachable');const timber=I.bridges.find(b=>/timber/.test(b.id));
 assert(timber.tiles.every(([x,z])=>r.includes('deck:'+x+','+z)),'the dock -> camp route crosses the timber bridge');
});
check('2a no walkable open ground stands under the creek water line (land, building terrain)',()=>{
 let n=0;for(const q of g.nodes){if(!(q.surface==='land'||/:(IslandTerrain|StagedTerrain)$/.test(q.surface)))continue;n++;
  assert(!bank(T,q.tx,q.tz),'wading node '+q.id);const w=water(q.tx+.5,q.tz+.5),d=drawn(q.tx+.5,q.tz+.5);
  if(w!==null)assert(d>=w-.03||q.y>=w-.03,'node '+q.id+' ground '+d.toFixed(3)+' under water '+w.toFixed(3))}
 assert(n>7000);
});
check('2b the creek water reaches its drawn bank: no open gap under the water edge (where the ground drops under the sea, the sea covers it)',()=>{
 const step=.05,lip=C.halfWidth+C.bankWidth/2+.6;let gap=0,worst=0,fish=0;
 for(let z=20;z<=122;z+=step)for(let x=28;x<=76;x+=step){const c=creek(x,z);if(c.d>lip||c.level+.025<=.03)continue;const d=drawn(x,z);if(d===null||d>=c.level+.025-.01||d<-.03)continue;   // under -0.03 the sea plane covers it
  if(water(x,z)!==null)continue;if(![[.1,0],[-.1,0],[0,.1],[0,-.1]].some(([a,b])=>water(x+a,z+b)!==null))continue;
  gap++;worst=Math.max(worst,c.level+.025-d);if(Math.abs(x-43.5)<4&&Math.abs(z-91)<4)fish++}
 assert(gap*step*step<.5,'open gap area '+(gap*step*step).toFixed(2));assert(worst<.15,'deepest gap '+worst.toFixed(3));assert.strictEqual(fish,0,'gap by the fishing stage');
});
check('2c the fitted surface is deterministic and the legacy ribbon() is unchanged',()=>{
 assert.deepStrictEqual(Water.surface(C,T),S);
 const r=Water.ribbon({halfWidth:2,points:[[0,0,4],[0,5,3],[4,8,2]]});assert.strictEqual(r.positions.length,18);assert.deepStrictEqual(r.indices,[0,2,1,1,2,3,2,4,3,3,4,5]);
 assert.throws(()=>Water.surface({halfWidth:1,bankWidth:1,points:[[0,0,0]]},T));assert.throws(()=>Water.surface(C,{width:2,depth:2,heights:[]}));
});
check('3 the moored boat: package v9 carries dock v4, whose closed sole rides over the sea plane through the whole bob',()=>{
 const ws='.studio-workspaces/holm-arrival-dock-v4/candidates/',m=read(ws+'dock.manifest.json');
 assert.strictEqual(m.schema,'holm-arrival-dock-candidate-v4');assert(m.boat.soleClearanceOverSea>=.03,'sole clearance '+m.boat.soleClearanceOverSea);
 const b=fs.readFileSync(path.join(root,ws+'dock.glb')),gl=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 const boat=gl.nodes.find(n=>n.name==='DockBoat');assert(Math.abs(boat.translation[1]-(-1.03+m.boat.raise))<1e-6);
 const pkg=read('.studio-workspaces/holm-arrival-package-v9/candidates/holm-arrival.package.json');
 const dock=pkg.sources&&JSON.stringify(pkg).includes('holm_arrival_dock_overhaul_v4.glb');assert(dock,'package v9 names dock v4');
});
check('4 fishing: the ripple floats on the drawn creek, straight off the open end of the stage; the only stance is the stage end and no rail stands between',()=>{
 const L=read('docs/rebuild/holm-overhaul/island-lessons.json'),f=L.fishing.find(q=>q.id==='survival-perch'),w=water(f.x,f.z);
 assert(w!==null&&Math.abs(f.y-w-.017)<.03,'ripple y '+f.y+' vs creek '+w);
 const st=g.nodes.filter(n=>{const h=Math.hypot(n.x-f.x,n.z-f.z);return h>=.5&&h<=1.7&&Math.abs(n.y-f.y)<=2.2});
 assert.deepStrictEqual(st.map(n=>n.id),['b:survival:12:6:0']);
 // the survival GLB's jetty frame (rails, posts): no triangle crosses the line of sight from the stance to the ripple
 const B=I.buildings.find(x=>x.id==='survival'),spec=read('docs/rebuild/holm-overhaul/buildings/survival.nav.json'),o=B.graph.placement;
 const buf=fs.readFileSync(path.join(root,spec.model)),n=buf.readUInt32LE(12),G=JSON.parse(buf.subarray(20,20+n).toString('utf8')),bin=buf.subarray(20+n+8);
 function mat(q){const t=q.translation||[0,0,0],r=q.rotation||[0,0,0,1],s=q.scale||[1,1,1],[x,y,z,ww]=r;return [(1-2*(y*y+z*z))*s[0],(2*(x*y+z*ww))*s[0],(2*(x*z-y*ww))*s[0],0,(2*(x*y-z*ww))*s[1],(1-2*(x*x+z*z))*s[1],(2*(y*z+x*ww))*s[1],0,(2*(x*z+y*ww))*s[2],(2*(y*z-x*ww))*s[2],(1-2*(x*x+y*y))*s[2],0,t[0],t[1],t[2],1]}
 function mul(a,b){const r=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)r[j*4+i]+=a[k*4+i]*b[j*4+k];return r}
 const tris=[];function walk(i,M,on){const q=G.nodes[i],W=mul(M,mat(q)),hit=on||/^Survival_(JettyFrame|Deck)/.test(q.name||'');
  if(hit&&q.mesh!==undefined)G.meshes[q.mesh].primitives.forEach(p=>{const pa=G.accessors[p.attributes.POSITION],pv=G.bufferViews[pa.bufferView],ia=G.accessors[p.indices],iv=G.bufferViews[ia.bufferView];
   const po=(pv.byteOffset||0)+(pa.byteOffset||0),io=(iv.byteOffset||0)+(ia.byteOffset||0),P=new Float32Array(Uint8Array.from(bin.subarray(po,po+pa.count*12)).buffer);
   const Ix=ia.componentType===5125?new Uint32Array(Uint8Array.from(bin.subarray(io,io+ia.count*4)).buffer):new Uint16Array(Uint8Array.from(bin.subarray(io,io+ia.count*2)).buffer);
   const v=k=>[0,1,2].map(c=>W[c]*P[k*3]+W[4+c]*P[k*3+1]+W[8+c]*P[k*3+2]+W[12+c]+[o.x,o.y,o.z][c]);for(let k=0;k<Ix.length;k+=3)tris.push([v(Ix[k]),v(Ix[k+1]),v(Ix[k+2])])});
  (q.children||[]).forEach(c=>walk(c,W,hit))}
 G.scenes[0].nodes.forEach(r=>walk(r,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],false));assert(tris.length>100,'jetty triangles '+tris.length);
 function hits(a,b){const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];return tris.some(([p,q,r])=>{const e1=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],e2=[r[0]-p[0],r[1]-p[1],r[2]-p[2]],h=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]],det=e1[0]*h[0]+e1[1]*h[1]+e1[2]*h[2];if(Math.abs(det)<1e-12)return false;
  const s=[a[0]-p[0],a[1]-p[1],a[2]-p[2]],u=(s[0]*h[0]+s[1]*h[1]+s[2]*h[2])/det;if(u<0||u>1)return false;const qq=[s[1]*e1[2]-s[2]*e1[1],s[2]*e1[0]-s[0]*e1[2],s[0]*e1[1]-s[1]*e1[0]],v=(d[0]*qq[0]+d[1]*qq[1]+d[2]*qq[2])/det;if(v<0||u+v>1)return false;const t=(e2[0]*qq[0]+e2[1]*qq[1]+e2[2]*qq[2])/det;return t>1e-6&&t<1-1e-6})}
 const s=st[0],sight=to=>[.35,.6,.85].some(hh=>hits([s.x,s.y+hh,s.z],[to.x,to.y+.1,to.z]));
 assert(!sight(f),'a rail stands between the stance and the ripple');
 assert(sight({x:43.5,y:1.62,z:91.5}),'control: the old spot behind the south rail is blocked');
});
check('5a the arrival trail never dips under the ground the game draws (dense check inside every trail triangle)',()=>{
 const layout=read('docs/rebuild/holm-overhaul/arrival-layout.json'),geo=Trail.geometry(layout,Trail.terrainSampler(T)),P=geo.positions,Ix=geo.indices;let worst=-1;
 for(let i=0;i<Ix.length;i+=3){const v=[Ix[i],Ix[i+1],Ix[i+2]].map(k=>[P[k*3],P[k*3+1],P[k*3+2]]);
  for(let a=0;a<=4;a++)for(let b=0;a+b<=4;b++){const u=a/4,w=b/4,c=1-u-w,x=u*v[0][0]+w*v[1][0]+c*v[2][0],y=u*v[0][1]+w*v[1][1]+c*v[2][1],z=u*v[0][2]+w*v[1][2]+c*v[2][2];
   const d=drawn(Math.min(143.999,x),Math.min(127.999,z));worst=Math.max(worst,d-y)}}
 assert(worst<=-.02,'drawn ground reaches '+(worst+.025).toFixed(4)+' over the trail surface');
 const odd={width:144,depth:128,heights:Array(145*129).fill(0)};odd.heights[147]=4;const s=Trail.terrainSampler(odd);   // saddle in odd tile (1,0)
 assert.strictEqual(s(1.75,.25),1);assert.strictEqual(s(1.25,.75),1);assert.strictEqual(s(1.5,.5),2);   // the old fixed diagonal gave 0,0,0
});
check('5b no green tile on a worn path: every tile wholly under the trail is worn, and no untinted dry tile splits a worn path (bar model-covered tiles)',()=>{
 ['65,112','61,114','66,108','60,117'].forEach(k=>assert.strictEqual(Paths.tiles[k],1,k));
 const allowed=new Set(['114,26']);   // under the Lastlight porch step (a Blender floor covers it)
 for(let z=1;z<T.depth-1;z++)for(let x=1;x<T.width-1;x++){const k=x+','+z;if(Paths.tiles[k]||T.water[z*T.width+x]||bank(T,x,z)||allowed.has(k))continue;
  const w=(a,b)=>Paths.tiles[a+','+b]===1;assert(!((w(x-1,z)&&w(x+1,z))||(w(x,z-1)&&w(x,z+1))),'untinted tile '+k+' splits a worn path')}
});
console.log('[HOLM_WORLD_FIXES] '+passed+'/'+(passed+failed.length)+' checks passed');if(failed.length)process.exit(1);
