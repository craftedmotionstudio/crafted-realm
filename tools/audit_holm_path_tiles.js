/* Tile audit of the grey paths of Tutor's Holm (path tiles pass, 2026-09-29). Owner: "we almost need an agent to go around
 * and map out the exact tiles of the path, because there's a lot of random squares where the path is added that I don't
 * think need to be. They're not the most concise paths."
 * Reads a paths module (default src/holm_island_grey_paths_data.js; any module with tiles "x,z" -> weight) and the ground
 * facts (tools/holm_path_tiles_facts.js), and finds the stray squares:
 *  - isolated: a path tile with no path tile beside it, or a patch of 4 or fewer cut off from every lane;
 *  - offRoute: stubs and blobs that lead nowhere, and duplicate lanes: path tiles on no shortest walk between two named
 *    places along the paths (with the tiles beside that walk, the lane's second tile), outside the courts;
 *  - ragged: single-tile bumps off a lane edge and bare notches bitten into one, and width changes on straight runs
 *    (a cross-section other than the lane's width where the run is long);
 *  - staircase: diagonal stretches (no straight run of 4 through the tile either way);
 *  - clipped: tiles a prop, plant or trunk stands on with path on both opposite sides (the lane runs through it), and
 *    lane tiles narrowed to one tile beside a placed object;
 *  - parallel: two lane strands running side by side 2-4 tiles apart for 4 tiles or more.
 * Writes the audit JSON the map renderer (tools/map_holm_path_tiles.py) draws: the ground picture, the places, the path
 * tiles and every finding. Presentation and measurement only.
 * Run: node tools/audit_holm_path_tiles.js <out.json> [paths module] */
'use strict';
const fs=require('fs'),path=require('path');
const F=require('./holm_path_tiles_facts');
const {W,D,key}=F;
const args=process.argv.slice(2);
const out=args[0]||path.join(F.ROOT,'scratchpad/holm_path_tiles/audit.json');
const modFile=args[1]?path.resolve(args[1]):path.join(F.ROOT,'src/holm_island_grey_paths_data.js');

function audit(P){
 const tiles=P.tiles||{},has=(x,z)=>!!tiles[key(x,z)];
 const list=Object.keys(tiles).filter(k=>tiles[k]>=.99).map(k=>k.split(',').map(Number));
 const courtTile=new Set();(P.courts||[]).forEach(c=>{const r=c.rect;for(let z=r[1];z<=r[3];z++)for(let x=r[0];x<=r[2];x++)courtTile.add(key(x,z))});
 const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=N4.concat([[1,1],[1,-1],[-1,1],[-1,-1]]);
 // an authored layout says how wide each lane is (the widest segment on a tile) and where lanes meet; a generated one is
 // read as 2-wide lanes throughout
 const want={},owner={};
 (P.segments||[]).forEach((sg,i)=>(sg.tiles||P.expand(sg)).forEach(([x,z])=>{const k=key(x,z);want[k]=Math.max(want[k]||0,sg.w||2);(owner[k]=owner[k]||new Set()).add('s'+i)}));
 (P.courts||[]).forEach((c,i)=>{const r=c.rect;for(let z=r[1];z<=r[3];z++)for(let x=r[0];x<=r[2];x++)(owner[key(x,z)]=owner[key(x,z)]||new Set()).add('c'+i)});
 const wantAt=k=>want[k]||2;
 // junction tiles: where two lanes or a lane and a court meet (and the tiles beside them)
 const junction=new Set();if(P.segments)list.forEach(([x,z])=>{const k=key(x,z),o=owner[k]||new Set();
  const meet=o.size>1||N4.some(([dx,dz])=>{const m=owner[key(x+dx,z+dz)];return m&&[...m].some(v=>!o.has(v))});
  if(meet)N8.concat([[0,0]]).forEach(([dx,dz])=>junction.add(key(x+dx,z+dz)))});
 // a lane's end at a bridge, a deck or a door is a junction as well (it meets what it leads to)
 if(P.segments){const ends=new Set();F.PLACES.forEach(p=>p.tiles.forEach(([x,z])=>ends.add(key(x,z))));list.forEach(([x,z])=>{if(N8.some(([dx,dz])=>F.kind(x+dx,z+dz)==='deck'||ends.has(key(x+dx,z+dz))))N8.concat([[0,0]]).forEach(([dx,dz])=>junction.add(key(x+dx,z+dz)))})}
 // runs through each tile: horizontal and vertical
 const run=(x,z,dx,dz)=>{let n=1;for(const s of [-1,1])for(let t=1;t<60&&has(x+s*t*dx,z+s*t*dz);t++)n++;return n};
 const Hr={},Vr={};list.forEach(([x,z])=>{Hr[key(x,z)]=run(x,z,1,0);Vr[key(x,z)]=run(x,z,0,1)});
 // pieces: path tiles joined side by side or corner to corner (a 1-wide lane may step diagonally, as the walker does),
 // bridge and deck tiles joining them
 const conn=(x,z)=>has(x,z)||F.kind(x,z)==='deck';
 const comp={},comps=[];list.forEach(([x,z])=>{const k0=key(x,z);if(comp[k0]!==undefined)return;const id=comps.length,q=[[x,z]],mem=[];comp[k0]=id;
  while(q.length){const [a,b]=q.pop();if(has(a,b))mem.push(key(a,b));N8.forEach(([dx,dz])=>{const m=key(a+dx,b+dz);if(comp[m]===undefined&&conn(a+dx,b+dz)){comp[m]=id;q.push([a+dx,b+dz])}})}comps.push(mem)});
 const findings={isolated:[],offRoute:[],ragged:[],staircase:[],clipped:[],parallel:[]};
 const flag=new Map(),mark=(cat,p)=>{findings[cat].push(p)};
 // isolated: a tile with no path, bridge or deck beside it; a speck of 4 tiles or fewer
 const iso=new Set();list.forEach(([x,z])=>{if(!N8.some(([dx,dz])=>conn(x+dx,z+dz))){iso.add(key(x,z));mark('isolated',[x,z])}});
 comps.forEach(m=>{if(m.length<=4)m.forEach(k=>{if(!iso.has(k)){iso.add(k);mark('isolated',k.split(',').map(Number))}})});
 // the places: served when a path tile lies within its reach; for the walks below each place joins the paths within 3
 const near=(p,r)=>{const out=[];p.tiles.forEach(([tx,tz])=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(conn(tx+dx,tz+dz)&&!out.some(q=>q[0]===tx+dx&&q[1]===tz+dz))out.push([tx+dx,tz+dz])});return out};
 const served=F.PLACES.map(p=>({id:p.id,lesson:p.lesson,served:near(p,p.reach).some(([x,z])=>has(x,z))}));
 // (a place the paths stop short of joins them within 3, so the lane toward it still counts as walked)
 const attach=F.PLACES.map(p=>{const t=near(p,p.reach);return {id:p.id,tiles:t.length?t:near(p,3)}});
 // offRoute: stubs, blobs and spare lanes: path tiles on no shortest walk along the paths between two places (with the
 // lane's full cross-section where the walk runs along it), outside the courts
 const used=new Set();
 const through=new Map();F.THROUGH.forEach(([a,b])=>{const A=attach.find(p=>p.id===a),B=attach.find(p=>p.id===b);if(!A||!B)return;
  A.tiles.forEach(t=>through.set(key(t[0],t[1]),(through.get(key(t[0],t[1]))||[]).concat(B.tiles)));B.tiles.forEach(t=>through.set(key(t[0],t[1]),(through.get(key(t[0],t[1]))||[]).concat(A.tiles)))});
 function bfs(src){const dist=new Map(),prev=new Map(),q=[];src.forEach(([x,z])=>{dist.set(key(x,z),0);q.push([x,z])});
  for(let i=0;i<q.length;i++){const [x,z]=q[i],d=dist.get(key(x,z));
   const next=N8.filter(([dx,dz])=>conn(x+dx,z+dz)&&(!dx||!dz||conn(x+dx,z)||conn(x,z+dz)||wantAt(key(x,z))===1)).map(([dx,dz])=>[x+dx,z+dz]).concat(through.get(key(x,z))||[]);
   next.forEach(([a,b])=>{const m=key(a,b);if(!dist.has(m)){dist.set(m,d+1);prev.set(m,key(x,z));q.push([a,b])}})}
  return {dist,prev}}
 const reached={};
 attach.forEach((A,i)=>{if(!A.tiles.length)return;const r=bfs(A.tiles);reached[A.id]=[];
  attach.forEach((B,j)=>{if(j<=i||!B.tiles.length)return;let best=null;B.tiles.forEach(t=>{const d=r.dist.get(key(t[0],t[1]));if(d!==undefined&&(best===null||d<best[0]))best=[d,key(t[0],t[1])]});
   if(!best)return;reached[A.id].push(B.id);for(let k=best[1];k!==undefined;k=r.prev.get(k)){used.add(k);const [x,z]=k.split(',').map(Number);N4.forEach(([dx,dz])=>{if(has(x+dx,z+dz))used.add(key(x+dx,z+dz))})}})});
 [...used].forEach(k=>{const [x,z]=k.split(',').map(Number);if(!has(x,z))return;if(Vr[k]>=4&&Hr[k]<=3)for(let s=-2;s<=2;s++){if(has(x+s,z))used.add(key(x+s,z))}if(Hr[k]>=4&&Vr[k]<=3)for(let s=-2;s<=2;s++){if(has(x,z+s))used.add(key(x,z+s))}});
 // an authored lane is walked as a whole when a walk runs along it (its bends and ends included)
 const segWalked=(P.segments||[]).map(sg=>{const t=sg.tiles||P.expand(sg);return t.filter(([x,z])=>used.has(key(x,z))).length>=Math.min(3,t.length)});
 (P.segments||[]).forEach((sg,i)=>{if(segWalked[i])(sg.tiles||P.expand(sg)).forEach(([x,z])=>used.add(key(x,z)))});
 list.forEach(([x,z])=>{const k=key(x,z);if(!used.has(k)&&!courtTile.has(k)&&!iso.has(k))mark('offRoute',[x,z])});
 // ragged: bumps (a tile with one path neighbour, off the side of a lane), notches (a free tile with path on 3 sides),
 // and width changes on straight runs (a cross-section other than the lane's width, away from junctions and courts)
 list.forEach(([x,z])=>{const k=key(x,z);if(courtTile.has(k)||junction.has(k))return;const nb=N4.filter(([dx,dz])=>has(x+dx,z+dz));
  if(nb.length===1&&wantAt(k)>1){const [dx,dz]=nb[0],side=dx?Vr[key(x+dx,z)]:Hr[key(x,z+dz)];if(side>=3)mark('ragged',[x,z,'bump'])}
  const along=Math.max(Hr[k],Vr[k]),across=Math.min(Hr[k],Vr[k]);
  // a 1-wide lane doubles where a 2x2 block of it is paved; a wider lane's straight runs keep their cross-section
  if(wantAt(k)===1){if([[0,0],[-1,0],[0,-1],[-1,-1]].some(([ox,oz])=>[[0,0],[1,0],[0,1],[1,1]].every(([dx,dz])=>has(x+ox+dx,z+oz+dz)&&wantAt(key(x+ox+dx,z+oz+dz))===1)))mark('ragged',[x,z,'width2'])}
  else if(along>=5&&across!==wantAt(k)&&!(Hr[k]>=4&&Vr[k]>=4))mark('ragged',[x,z,'width'+across])});
 // (a notch counts only where the bare tile is level with the path round it: a tile across a cliff is not a bite)
 for(let z=1;z<D-1;z++)for(let x=1;x<W-1;x++){if(has(x,z))continue;const n=N4.filter(([dx,dz])=>has(x+dx,z+dz)&&F.smooth(x,z,x+dx,z+dz)).length;if(n>=3&&F.free(x,z))mark('ragged',[x,z,'notch'])}
 // staircase: a diagonal stretch or a jog: no straight run of 4 through the tile either way (away from courts and from
 // where lanes meet each other, a bridge or a door)
 list.forEach(([x,z])=>{const k=key(x,z);if(courtTile.has(k)||junction.has(k)||Hr[k]>=4||Vr[k]>=4)return;mark('staircase',[x,z])});
 // clipped: a placed object or refused tile between two path tiles (the lane runs through it); a 2-wide lane squeezed to
 // one tile beside a placed object
 for(let z=1;z<D-1;z++)for(let x=1;x<W-1;x++){if(has(x,z))continue;const k=key(x,z);const why=F.occupied.get(k)||(!F.markable(x,z)&&F.kind(x,z)==='none'?'unwalkable':null);if(!why)continue;
  if((has(x-1,z)&&has(x+1,z))||(has(x,z-1)&&has(x,z+1)))mark('clipped',[x,z,why])}
 list.forEach(([x,z])=>{const k=key(x,z);if(wantAt(k)<2||Math.min(Hr[k],Vr[k])!==1||Math.max(Hr[k],Vr[k])<3)return;
  const by=N4.map(([dx,dz])=>F.occupied.get(key(x+dx,z+dz))).find(Boolean);if(by)mark('clipped',[x,z,'narrowed by '+by])});
 // parallel strands: two long runs the same way, 2-4 tiles apart with bare ground between, overlapping 4 tiles or more
 const par=new Set();
 list.forEach(([x,z])=>{const k=key(x,z);[[1,0,Hr],[0,1,Vr]].forEach(([dx,dz,R])=>{if(R[k]<4)return;const px=dz,pz=dx;
  for(const s of [-1,1]){let g=0;for(let t=1;t<=5;t++){const a=x+s*t*px,b=z+s*t*pz;if(has(a,b)){if(g>=2&&R[key(a,b)]>=4){let o=0;for(let u=-3;u<=3;u++)if(has(x+u*dx,z+u*dz)&&has(a+u*dx,b+u*dz))o++;if(o>=4)par.add(k)}break}g++}}})});
 par.forEach(k=>mark('parallel',k.split(',').map(Number)));
 const counts={};Object.keys(findings).forEach(c=>counts[c]=findings[c].length);
 const flagged=new Set();['isolated','offRoute','staircase','parallel'].forEach(c=>findings[c].forEach(p=>flagged.add(key(p[0],p[1]))));
 findings.ragged.filter(p=>p[2]==='bump'||/^width/.test(p[2])).forEach(p=>flagged.add(key(p[0],p[1])));
 findings.clipped.filter(p=>/^narrowed/.test(p[2])).forEach(p=>flagged.add(key(p[0],p[1])));
 const widths={};list.forEach(([x,z])=>{const k=key(x,z);if(Math.max(Hr[k],Vr[k])>=5&&!(Hr[k]>=4&&Vr[k]>=4)){const w=Math.min(Hr[k],Vr[k]);widths[w]=(widths[w]||0)+1}});
 return {tiles:list.length,components:comps.length,componentSizes:comps.map(m=>m.length).sort((a,b)=>b-a),crossWidths:widths,counts,strayTiles:flagged.size,findings,
  served,unserved:served.filter(p=>!p.served).map(p=>p.id),reached};
}

function picture(){
 const kinds=[],mats=[],slopes=[];for(let z=0;z<D;z++)for(let x=0;x<W;x++){const g=F.ground(x,z);kinds.push(F.kind(x,z));mats.push(g.mats);slopes.push(g.slope)}
 // cliff edges: neighbouring walkable tiles the walk graph does not join (a step, a cliff, a wall)
 const walkK=k=>k==='open'||k==='deck'||k==='arrival'||k==='floor',cliffs=[];
 for(let z=0;z<D;z++)for(let x=0;x<W;x++){if(!walkK(kinds[z*W+x]))continue;if(x+1<W&&walkK(kinds[z*W+x+1])&&!F.joined(x,z,x+1,z))cliffs.push([x,z,1]);if(z+1<D&&walkK(kinds[(z+1)*W+x])&&!F.joined(x,z,x,z+1))cliffs.push([x,z,0])}
 // corners where a 2-wide lane cell fits (all four tiles free and joined), for design maps
 const cells=[];for(let z=1;z<D;z++)for(let x=1;x<W;x++){const c=[[x-1,z-1],[x,z-1],[x-1,z],[x,z]];if(c.every(([a,b])=>F.free(a,b))&&F.joined(x-1,z-1,x,z-1)&&F.joined(x-1,z,x,z)&&F.joined(x-1,z-1,x-1,z)&&F.joined(x,z-1,x,z))cells.push([x,z,c.some(([a,b])=>F.decorAt.has(a+','+b))?1:0])}
 return {W,D,kinds,mats,slopes,cliffs,cells,occupied:[...F.occupied.entries()].map(([k,v])=>[...k.split(',').map(Number),v]),trunks:F.trunks.map(t=>[+t.x.toFixed(2),+t.z.toFixed(2)]),
  decor:[...F.decorAt.keys()].map(k=>k.split(',').map(Number)),places:F.PLACES,crossings:F.crossings};
}

module.exports={audit,picture};
if(require.main===module){
 const P=require(modFile);const a=audit(P);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify({module:path.relative(F.ROOT,modFile).replace(/\\/g,'/'),schema:P.schema,segments:P.segments||null,courts:P.courts||null,paths:Object.keys(P.tiles).filter(k=>P.tiles[k]>=.99),audit:a,picture:picture()}));
 console.log('[HOLM PATH TILES AUDIT] '+JSON.stringify({module:path.basename(modFile),tiles:a.tiles,components:a.components,sizes:a.componentSizes.slice(0,8),counts:a.counts,strayTiles:a.strayTiles,crossWidths:a.crossWidths,unserved:a.unserved}));
}
