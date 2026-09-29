/* The grey paths of Tutor's Holm, authored tile by tile (path tiles pass, 2026-09-29; owner: "we almost need an agent to
 * go around and map out the exact tiles of the path... They're not the most concise paths"). Pins the layout in
 * src/holm_island_grey_paths_data.js:
 *  1. the data: the same API the ground and the minimap read (tiles "x,z" -> 1, grey, the graph), every tile belongs to a
 *     named segment or court, each segment a readable line of straight and 45-degree runs at one width (2, or 1);
 *  2. no isolated tile: every path tile has path (or a bridge deck) beside it, no speck of 4 tiles or fewer, and the
 *     network is one piece (joined through the Guide House, the Mage tower and the Keeper's Stair);
 *  3. no stub: every segment is at least MIN_TILES long and both its ends touch what they name (a door's outside tile,
 *     a station, a bridge deck, a court, a junction two lanes share); no tile lies on no walk between two places;
 *  4. one width: every straight run of every segment is exactly its width across; nowhere a bump, a notch, a parallel
 *     lane; the only kinks the tile audit finds are the four authored ones (KNOWN);
 *  5. never under anything: no path tile on water, a creek bank, a floor, a deck, a placed object, a plant, a tree trunk
 *     or ground decor (tools/stage_holm_grey_paths.js takes decor up), and no lane across a cliff;
 *  6. every lesson door and station is served by a path, and all of them are reachable along the paths;
 *  7. visual only: the composed walk graph now is the graph the paths were laid on (10468 nodes, 27691 links, hash
 *     d41278dc47dbc168, the review-5 graph), and no walk graph input reads the paths;
 *  8. the island draws them grey; the online world keeps its dirt.
 * Run: node tools/test_holm_grey_paths.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8');
const BASE_GRAPH={nodes:10468,edges:27691,hash:'d41278dc47dbc168'};   // measured on bc65fe4b before review 5 (same hash rule)
const REVIEW5_TILES=875,MIN_TILES=4;
// the four kinks the layout keeps on purpose (the tile audit flags them): the village lane's one-row step past the rocks at
// x 48, the one-tile ramp's jog up the quarry mesa, the keep ledge's diagonal step past the shrub at 84,49, and the rock
// column between Lastlight's west wall strip and the stair lane
const KNOWN={ragged:['47,55','47,56','47,57'],staircase:['28,47','83,50'],clipped:['112,26','112,27','112,28']};
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const P=require('../src/holm_island_grey_paths_data.js');
const F=require('./holm_path_tiles_facts'),{audit}=require('./audit_holm_path_tiles');
const {key}=F,tiles=P.tiles,keys=Object.keys(tiles),has=(x,z)=>!!tiles[key(x,z)];
const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=N4.concat([[1,1],[1,-1],[-1,1],[-1,-1]]);
const deck=(x,z)=>F.kind(x,z)==='deck',conn=(x,z)=>has(x,z)||deck(x,z);
const place=id=>F.PLACES.find(p=>p.id===id);
const A=audit(P);
check('1 the data: the ground\'s API, every tile in a named segment or court, readable lines at one width',()=>{
 assert.strictEqual(P.schema,'holm-island-paths-v2-grey');assert.strictEqual(P.style,'grey');assert.strictEqual(P.layout,'holm-path-tiles-authored-v1');
 assert(keys.every(k=>tiles[k]===1&&/^-?\d+,-?\d+$/.test(k)),'tiles "x,z" -> 1 (crisp)');
 const union=new Set();P.segments.forEach(s=>P.expand(s).forEach(t=>union.add(t.join(','))));P.courts.forEach(c=>P.courtTiles(c).forEach(t=>union.add(t.join(','))));
 assert.deepStrictEqual([...union].sort(),keys.slice().sort(),'tiles are exactly the segments and courts');
 const ids=new Set();P.segments.concat(P.courts).forEach(s=>{assert(!ids.has(s.id),'unique id '+s.id);ids.add(s.id);assert(typeof s.name==='string'&&s.name.length>3,s.id+' has a name')});
 P.segments.forEach(s=>{assert([1,2].includes(s.w),s.id+' width 1 or 2');assert(s.line.length>=2,s.id+' has a line');
  s.line.forEach(p=>{const off=s.w===2?0:.5;assert(Number.isInteger(p[0]-off)&&Number.isInteger(p[1]-off),s.id+' point '+p+' on '+(s.w===2?'tile corners':'tile centres'))});
  for(let i=1;i<s.line.length;i++){const dx=Math.abs(s.line[i][0]-s.line[i-1][0]),dz=Math.abs(s.line[i][1]-s.line[i-1][1]);assert((dx===0)!==(dz===0)||(dx===dz&&dx>0),s.id+' run '+i+' along x, along z or at 45 degrees')}
  assert.deepStrictEqual(s.tiles,P.expand(s))});
 P.courts.forEach(c=>{const r=c.rect;assert(r[0]<=r[2]&&r[1]<=r[3]&&(r[2]-r[0]+1)*(r[3]-r[1]+1)<=40,c.id+' a small court')});
 // the rule in the file header, by its own examples
 assert.deepStrictEqual(P.expand({w:2,line:[[86,62],[86,66]]}).map(t=>t.join(',')).sort(),['85,62','86,62','85,63','86,63','85,64','86,64','85,65','86,65'].sort());
 assert.deepStrictEqual(P.expand({w:1,line:[[40.5,88.5],[40.5,92.5]]}).map(t=>t.join(',')),['40,88','40,89','40,90','40,91','40,92']);
 assert(keys.length<REVIEW5_TILES&&keys.length>500,keys.length+' tiles (review 5: '+REVIEW5_TILES+')');
});
check('2 no isolated tile: every path tile has path or a deck beside it, no specks, one network through the three buildings walked through',()=>{
 keys.forEach(k=>{const [x,z]=k.split(',').map(Number);assert(N8.some(([dx,dz])=>conn(x+dx,z+dz)),'isolated '+k)});
 assert.strictEqual(A.counts.isolated,0,'isolated / specks: '+JSON.stringify(A.findings.isolated));
 assert(A.componentSizes.every(n=>n>4),'no piece of 4 tiles or fewer: '+A.componentSizes);
 // the pieces join through the Guide House (front and back doors), the Mage tower (door and practice yard) and the stair
 const piece={};let n=0;keys.forEach(k=>{if(piece[k]!==undefined)return;const q=[k];piece[k]=n;while(q.length){const [x,z]=q.pop().split(',').map(Number);
  N8.forEach(([dx,dz])=>{const m=key(x+dx,z+dz);if(piece[m]===undefined&&conn(x+dx,z+dz)){piece[m]=n;q.push(m)}})}n++});
 const pieceOf=id=>{const p=place(id);for(let r=0;r<=p.reach;r++)for(const [tx,tz] of p.tiles)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=key(tx+dx,tz+dz);if(has(tx+dx,tz+dz))return piece[k]}return null};
 const parent=[...Array(n).keys()],find=a=>parent[a]===a?a:(parent[a]=find(parent[a]));
 F.THROUGH.forEach(([a,b])=>{const pa=pieceOf(a),pb=pieceOf(b);assert(pa!==null&&pb!==null,a+' / '+b+' served');parent[find(pa)]=find(pb)});
 assert.strictEqual(new Set(parent.map((v,i)=>find(i))).size,1,'one network: '+n+' pieces before the buildings join them');
});
check('3 no stub: every segment is '+MIN_TILES+'+ tiles and both its ends touch what they name; no tile off every walk',()=>{
 const J=new Map(P.junctions.map(j=>[j.id,j]));
 const touches=(sg,endPt,name)=>{   // does the segment's end (its tiles within 2 of the end point) meet `name`?
  const off=sg.w===2?0:.5,ex=endPt[0]-off,ez=endPt[1]-off,end=sg.tiles.filter(([x,z])=>Math.max(Math.abs(x+.5-endPt[0]),Math.abs(z+.5-endPt[1]))<=2.01);
  assert(end.length,sg.id+' has tiles at its end '+endPt);
  const [kind,id]=name.indexOf(':')>0&&/^(junction|court|crossing)$/.test(name.split(':')[0])?[name.split(':')[0],name.slice(name.indexOf(':')+1)]:['place',name];
  if(kind==='place'){const p=place(id);assert(p,sg.id+': unknown place '+id);return end.some(([x,z])=>p.tiles.some(([tx,tz])=>Math.max(Math.abs(x-tx),Math.abs(z-tz))<=p.reach&&(Math.abs(x-tx)+Math.abs(z-tz)<=p.reach||x===tx||z===tz)))}
  if(kind==='crossing'){const c=F.crossings.find(q=>q.id===id);assert(c,sg.id+': unknown crossing '+id);return end.some(([x,z])=>c.ends.some(([tx,tz])=>Math.abs(x-tx)+Math.abs(z-tz)===1))}
  if(kind==='court'){const c=P.courts.find(q=>q.id===id);assert(c,sg.id+': unknown court '+id);return end.some(([x,z])=>c.tiles.some(([tx,tz])=>Math.abs(x-tx)+Math.abs(z-tz)<=1))}
  const j=J.get(id);assert(j,sg.id+': unknown junction '+id);
  return end.some(([x,z])=>Math.max(Math.abs(x-j.at[0]),Math.abs(z-j.at[1]))<=2)&&P.segments.concat(P.courts).some(o=>o!==sg&&o.tiles.some(([x,z])=>Math.max(Math.abs(x-j.at[0]),Math.abs(z-j.at[1]))<=1)&&o.tiles.some(([a,b])=>end.some(([x,z])=>Math.abs(x-a)+Math.abs(z-b)<=1)));
 };
 P.segments.forEach(sg=>{assert(sg.tiles.length>=MIN_TILES,sg.id+' is a stub: '+sg.tiles.length+' tiles');
  assert(touches(sg,sg.line[0],sg.from),sg.id+' start does not meet '+sg.from);assert(touches(sg,sg.line[sg.line.length-1],sg.to),sg.id+' end does not meet '+sg.to)});
 P.courts.forEach(c=>{const p=place(c.from);assert(p&&p.tiles.some(([tx,tz])=>c.tiles.some(([x,z])=>Math.abs(x-tx)+Math.abs(z-tz)<=1)),c.id+' lies at '+c.from)});
 P.junctions.forEach(j=>{const members=P.segments.concat(P.courts).filter(o=>o.tiles.some(([x,z])=>Math.max(Math.abs(x-j.at[0]),Math.abs(z-j.at[1]))<=1));
  assert(members.length>=2,'junction '+j.id+' joins '+members.length);assert(P.segments.some(s=>s.from==='junction:'+j.id||s.to==='junction:'+j.id),'junction '+j.id+' is named')});
 assert.strictEqual(A.counts.offRoute,0,'tiles on no walk between two places (stubs, blobs, spare lanes): '+JSON.stringify(A.findings.offRoute.slice(0,8)));
});
check('4 one width: every straight run is exactly its segment\'s width; no bump, notch or parallel lane; only the known kinks',()=>{
 P.segments.forEach(sg=>{const own=new Set(sg.tiles.map(t=>t.join(','))),w=sg.w,h=w/2;
  for(let i=1;i<sg.line.length;i++){const a=sg.line[i-1],b=sg.line[i],dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]);if(dx&&dz)continue;
   const len=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);
   for(let t=1;t<len-1;t++){   // the run's inner cells (a bend's fill may widen its first and last)
    const cx=a[0]+dx*(t+.5),cz=a[1]+dz*(t+.5),across=[];
    for(let o=-3;o<=3;o++){const x=Math.floor(dx?cx:a[0]+o+(w===2?-.5:0)+.5*(w===2)),z=Math.floor(dz?cz:a[1]+o+(w===2?-.5:0)+.5*(w===2));if(own.has(key(x,z)))across.push(o)}
    assert.strictEqual(across.length,w,sg.id+' run '+i+' is '+across.length+' wide at '+[cx,cz])}}});
 assert.strictEqual(A.counts.parallel,0,'parallel lanes '+JSON.stringify(A.findings.parallel));
 const bad=[];['ragged','staircase','clipped'].forEach(c=>A.findings[c].forEach(p=>{if(!(KNOWN[c]||[]).includes(p[0]+','+p[1]))bad.push(c+' '+p.join(','))}));
 assert.deepStrictEqual(bad,[],'kinks beyond the known four');
 assert(!A.findings.ragged.some(p=>p[2]==='bump'||p[2]==='notch'),'no bump or notch');
});
check('5 never under anything: open dry ground only (the dock trail excepted), no decor left, no lane across a cliff',()=>{
 const trail=new Set(P.segments.find(s=>s.id==='dock-guide-house').tiles.map(t=>t.join(',')));
 keys.forEach(k=>{const [x,z]=k.split(',').map(Number);
  if(trail.has(k)&&F.kind(x,z)==='arrival')return;   // under the arrival ribbon, grey like it
  assert(F.markable(x,z),'not open dry land ('+F.kind(x,z)+'): '+k);assert(!F.occupied.has(k),'under '+F.occupied.get(k)+': '+k);
  assert(!F.decorAt.has(k),'ground decor on '+k+' (node tools/stage_holm_grey_paths.js)')});
 const cliffs=[];keys.forEach(k=>{const [x,z]=k.split(',').map(Number);if(F.kind(x,z)==='arrival')return;
  [[1,0],[0,1]].forEach(([dx,dz])=>{if(has(x+dx,z+dz)&&F.kind(x+dx,z+dz)!=='arrival'&&!F.smooth(x,z,x+dx,z+dz))cliffs.push(k+'>'+(x+dx)+','+(z+dz))})});
 assert.deepStrictEqual(cliffs,[],'lanes across a cliff');
 // the trunks keep their tiles bare
 F.trunks.forEach(t=>assert(!has(Math.floor(t.x),Math.floor(t.z)),'paved under a trunk '+t.asset));
});
check('6 every lesson door and station is served, and all of them are reachable along the paths',()=>{
 assert.deepStrictEqual(A.unserved,[],'unserved places');
 const lesson=F.PLACES.filter(p=>p.lesson).map(p=>p.id);
 const reach=A.reached;const linked=new Set([lesson[0]]);let grew=true;
 while(grew){grew=false;Object.keys(reach).forEach(a=>reach[a].forEach(b=>{if(linked.has(a)!==linked.has(b)){linked.add(a);linked.add(b);grew=true}}))}
 lesson.forEach(id=>assert(linked.has(id),id+' not reachable along the paths from '+lesson[0]));
});
check('7 visual only: the walk graph now is the graph the paths were laid on and the graph before review 5',()=>{
 const now=F.graphSummary(F.graph);
 assert.deepStrictEqual(now,P.graph,'recorded in the data');assert.deepStrictEqual(now,BASE_GRAPH,'bc65fe4b');
 const inputs=fs.readFileSync(path.join(__dirname,'holm_v2_land_inputs.js'),'utf8'),nav=src('holm_island_nav.js');
 assert(!/paths_data|GreyPaths|HolmIslandPaths/.test(inputs+nav),'no walk graph input reads the paths');
});
check('8 the island draws them grey; the online world keeps its dirt',()=>{
 const q=src('holm_arrival_qa.js');assert(/HolmIslandGreyPaths/.test(q)&&/setPaths\(islandPaths\.tiles,\{style:islandPaths\.style\}\)/.test(q));
 assert(/greypaths'\)!=='0'/.test(q),'?greypaths=0 still shows the phase-5 dirt');
 assert(/holm_island_grey_paths_data\.js\?v=/.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')));
 const Ground=require('../src/holm_overhaul_ground.js');Ground.setLookVersion(3);
 const lattice={width:2,depth:2,heights:Array(9).fill(1),materials:Array(9).fill(1)};Ground.setTerrain(lattice);
 const surface={positions:[],materials:Array(81).fill(1),indices:[0,9,1,1,9,10]};for(let z=0;z<9;z++)for(let x=0;x<9;x++)surface.positions.push(x,1,z);
 Ground.setPaths({'0,0':1},{style:'grey'});assert.strictEqual(Ground.pathStyle(),'grey');const grey=Ground.chunkOldschool(surface);
 Ground.setPaths({'0,0':1});assert.strictEqual(Ground.pathStyle(),'dirt');const dirt=Ground.chunkOldschool(surface);
 Ground.setPaths(null);const grass=Ground.chunkOldschool(surface);
 const c=r=>r.colors.slice(0,3);const sat=v=>Math.max(...v)-Math.min(...v);
 assert(sat(c(grey))<.02,'grey reads grey: '+c(grey));assert(sat(c(dirt))>.03,'dirt stays warm: '+c(dirt));assert(c(grass)[1]>c(grass)[0],'grass is green');
 assert.strictEqual(grey.ground[3],1,'a path tile carries the path texture weight, whole tile');
 const kit=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/textures/oldschool/kit.json'),'utf8')).textures.path_grey;assert(kit&&kit.size===64);
 const L=require('../src/holm_oldschool_look.js');assert.strictEqual(L.GREY_PATHS.texture,'path_grey');kit.mean.forEach((m,i)=>assert(Math.abs(m-L.MEAN.path_grey[i])<.02));
});
console.log('[HOLM GREY PATHS] '+passed+'/8 checks passed ('+keys.length+' tiles, '+P.segments.length+' segments, '+P.courts.length+' courts)');
if(passed!==8)process.exit(1);
