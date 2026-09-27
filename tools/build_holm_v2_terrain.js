/* Tutor's Holm v2 land (W0b, 2026-09-26): build the terrain v2 source from its design
 * (docs/rebuild/holm-overhaul/terrain-v2.design.json), compile it with src/holm_overhaul_terrain.js and write the
 * candidate + working copies to .studio-workspaces/holm-overhaul-terrain-v2/. Draft only: Safe Publish owns staging.
 *
 * Seats: every building keeps the ground it was measured on. The builder reads each building's measured navigation
 * graph (Sept 13 terrain), takes the footprint of its floors/stairs/decks (not its terrain lane) plus a margin, and
 * imprints the Sept 13 lattice there relative to the old foundation, lifted to the design's new foundation height. The
 * new land blends into each seat over `seatBlend` tiles. So a Blender building and its plinths, steps and retaining
 * walls fit the new land exactly, and re-measuring its graph on the v2 terrain gives the same floors, lifted.
 *
 * Run: node tools/build_holm_v2_terrain.js [--check]      (prints the measured numbers; --check fails on a stale bundle)
 * Also writes scratchpad/holm_v2_land/terrain/_holm_v2_grid.json for tools/plot (holm_plot.py). */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const T=require(path.join(root,'src/holm_overhaul_terrain.js'));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const V1DIR='.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/';
const OUTWS='.studio-workspaces/holm-overhaul-terrain-v2';
const design=read('docs/rebuild/holm-overhaul/terrain-v2.design.json');
const v1src=read(V1DIR+'holm-overhaul.terrain.json'),v1=read(V1DIR+'holm-overhaul.terrain.bundle.json');
const layout=read('docs/rebuild/holm-overhaul/arrival-layout.json');
const S=v1.width+1;

// ---- seats: measured footprint, Sept 13 lattice relative to the old foundation ----
function footprint(seat){
 if(seat.arrival){const b=layout.building,w=b.world;return {x0:w.x-b.width/2,x1:w.x+b.width/2-1,z0:w.z-b.depth/2,z1:w.z+b.depth/2-1,oldY:w.foundationY}}
 const g=read('.studio-workspaces/'+seat.nav+'/candidates/navigation.json'),o=g.placement||g.origin,ex=seat.exclude?new RegExp(seat.exclude):null;
 let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
 g.nodes.forEach(n=>{if(/Terrain$/.test(n.surface)||(ex&&ex.test(n.surface)))return;const wx=Math.floor(n.x+o.x),wz=Math.floor(n.z+o.z);x0=Math.min(x0,wx);x1=Math.max(x1,wx);z0=Math.min(z0,wz);z1=Math.max(z1,wz)});
 return {x0,x1,z0,z1,oldY:o.y};
}
function seatOf(seat){
 const f=footprint(seat),m=seat.margin||0;
 // an explicit lattice rect [x0,z0,x1,z1] (the arrival yard) or the measured footprint plus a margin
 const [x0,z0,x1,z1]=seat.rect||[Math.max(0,f.x0-m),Math.max(0,f.z0-m),Math.min(v1.width,f.x1+1+m),Math.min(v1.depth,f.z1+1+m)],w=x1-x0,d=z1-z0,rel=[];
 for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)rel.push(+(v1.heights[z*S+x]-f.oldY).toFixed(4));
 return {id:seat.id,x0,z0,w,d,y:seat.y,blend:design.seatBlend,rel,oldY:f.oldY};
}
const seats=design.seats.map(seatOf);
const source={schema:T.SOURCE_V2,version:2,width:144,depth:128,spacing:1,coast:v1src.coast,base:design.base,shore:design.shore,swell:design.swell,rock:design.rock,
 plateaus:design.plateaus,dimples:design.dimples,basins:design.basins,pads:design.pads,
 grades:[{id:'landing-to-guide',halfWidth:design.approach.clearWidth/2,blend:2.5,points:design.approach.waypoints.map(([x,y,z])=>[x,z,y])}].concat(design.grades),
 cuts:design.cuts||[],creek:design.creek,seats:seats.map(({oldY,...q})=>q)};
const bundle=T.compile(source);
const text={src:JSON.stringify(source,null,1)+'\n',bundle:JSON.stringify(bundle)+'\n'};
const outs=[path.join(root,OUTWS,'candidates'),path.join(root,OUTWS,'working/assets/world/authoring')];
if(process.argv.includes('--check')){
 const cur=fs.readFileSync(path.join(outs[1],'holm-overhaul.terrain.bundle.json'),'utf8');
 if(cur!==text.bundle){console.error('[HOLM V2 TERRAIN] stale bundle: re-run tools/build_holm_v2_terrain.js');process.exit(1)}
 console.log('[HOLM V2 TERRAIN] bundle up to date');process.exit(0);
}
outs.forEach(d=>{fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'holm-overhaul.terrain.json'),text.src);fs.writeFileSync(path.join(d,'holm-overhaul.terrain.bundle.json'),text.bundle)});
fs.writeFileSync(path.join(root,OUTWS,'seats.json'),JSON.stringify(seats.map(q=>({id:q.id,x0:q.x0,z0:q.z0,w:q.w,d:q.d,oldY:q.oldY,y:q.y,dy:+(q.y-q.oldY).toFixed(4)})),null,1)+'\n');

// ---- measure: the same numbers as the 2004 study (WORLD_LAYOUT_GUIDE §2 gap table) ----
const W=144,D=128,H=[],WT=[];
for(let z=0;z<D;z++){H.push([]);WT.push([]);for(let x=0;x<W;x++){H[z].push(+T.sample(bundle,x+.5,z+.5).toFixed(3));WT[z].push(bundle.water[z*W+x])}}
const dry=(x,z)=>x>=0&&z>=0&&x<W&&z<D&&WT[z][x]===0,P=console.log;
const pct=(a,qs)=>{const s=a.slice().sort((p,q)=>p-q),o={};qs.forEach(q=>{o[q]=+s[Math.min(s.length-1,Math.floor(q/100*(s.length-1)+.5))].toFixed(2)});return o};
const hs=[],sl=[];
for(let z=0;z<D;z++)for(let x=0;x<W;x++){if(!dry(x,z))continue;hs.push(H[z][x]);let m=0;if(dry(x+1,z))m=Math.max(m,Math.abs(H[z][x+1]-H[z][x]));if(dry(x,z+1))m=Math.max(m,Math.abs(H[z+1][x]-H[z][x]));sl.push(m)}
const band=(lo,hi)=>+(sl.filter(s=>s>=lo&&s<hi).length/sl.length).toFixed(3);
const hp=pct(hs,[0,5,25,50,75,95,100]);
P('== HOLM v2 LAND (compiled terrain v2)');
P('dry tiles',hs.length,'pond tiles',bundle.stats.pondTiles,'creek tiles',bundle.stats.creekTiles,'sea tiles',bundle.stats.seaTiles);
P('heights pct',JSON.stringify(hp),' relief p5-p95',(hp[95]-hp[5]).toFixed(2),'tiles =',((hp[95]-hp[5])/1.85).toFixed(2),'player heights');
P('land <= 3 tiles',(hs.filter(h=>h<=3).length/hs.length).toFixed(3),' >= 7 tiles',(hs.filter(h=>h>=7).length/hs.length).toFixed(3));
P('slope bands: flat',band(0,1/16),'gentle',band(1/16,.25),'moderate',band(.25,.5),'steep',band(.5,1),'cliff>1',band(1,99),' above the .9 land step',band(.9+1e-9,99),' above 1.05',band(1.05+1e-9,99));
const rel=[];for(let bx=0;bx<W;bx+=32)for(let bz=0;bz<D;bz+=32){const v=[];for(let x=bx;x<bx+32;x++)for(let z=bz;z<bz+32;z++)if(dry(x,z))v.push(H[z][x]);if(v.length>300){const p=pct(v,[2,98]);rel.push(+(p[98]-p[2]).toFixed(1))}}
P('relief per 32x32 block',rel.join(' '),' median',pct(rel,[50])[50]);
const pw=[];for(let z=0;z<D;z++)for(let x=0;x<W;x++)if(WT[z][x]===3)pw.push([x,z]);
if(pw.length){const xs=pw.map(p=>p[0]),zs=pw.map(p=>p[1]),rim={N:[],W:[],S:[],E:[]};
 for(let z=0;z<D;z++)for(let x=0;x<W;x++)if(dry(x,z)){let dd=1e9,near=null;pw.forEach(p=>{const k=Math.hypot(p[0]-x,p[1]-z);if(k<dd){dd=k;near=p}});if(dd>=4&&dd<=6){const dx=x-near[0],dz=z-near[1];rim[Math.abs(dx)>Math.abs(dz)?(dx<0?'W':'E'):(dz<0?'N':'S')].push(H[z][x])}}
 P('pond tiles',pw.length,'bbox x',Math.min(...xs),Math.max(...xs),'z',Math.min(...zs),Math.max(...zs),'level',bundle.ponds.map(p=>p.level).join('/'),'rim 4-6 tiles out, median by side',JSON.stringify(Object.fromEntries(Object.entries(rim).map(([k,v])=>[k,v.length?pct(v,[50])[50]:null]))))}
const at=(x,z)=>+T.sample(bundle,x,z).toFixed(2);
const sites={landing:[61,118],guide:[66,99],survival:[31,84],'fire beach':[32.5,101],'pond centre':[27.5,96.5],bakehouse:[45,66],'garden terrace':[51.5,61.5],mill:[62.5,64],'tailrace (58.4,62.2)':[58.4,62.2],lodge:[35,50],quarry:[36,33],keep:[87,35],'ravine (66.5,37.5)':[66.5,37.5],bank:[86,57],mage:[114,58],lastlight:[121,26],'beacon cove':[104,16],'old haven':[124,103],farm:[110,95],'carriage bend':[80,81]};
P('site heights',JSON.stringify(Object.fromEntries(Object.entries(sites).map(([k,[x,z]])=>[k,at(x,z)]))));
P('seats',seats.map(q=>q.id+' dy '+(q.y-q.oldY).toFixed(2)+' rect '+q.x0+','+q.z0+' '+q.w+'x'+q.d).join('; '));
const grid={h:H,water:WT.map(r=>r.map(v=>v===3?2:v)),pond:pw,marks:[{x:27.5,z:96.5,label:'Minnow Hollow (pond)',color:'#003399'},{x:58.4,z:61.8,label:'weir + wheel',color:'#003399',marker:'s'},{x:51.5,z:61.5,label:"Hettie's garden",color:'#1b5e20',marker:'^'},{x:80,z:81,label:'broken carriage',color:'#4e342e',marker:'x'}],
 places:seats.map(q=>({id:q.id,x:q.x0+q.w/2,z:q.z0+q.d/2,w:q.w,d:q.d})).concat(design.pads.map(p=>({id:p.id,x:p.x,z:p.z,w:p.w,d:p.d}))),
 paths:source.grades.map(g=>({kind:'primary',points:g.points.map(p=>[p[0],p[1]])}))};
fs.mkdirSync(path.join(root,'scratchpad/holm_v2_land/terrain'),{recursive:true});
fs.writeFileSync(path.join(root,'scratchpad/holm_v2_land/terrain/_holm_v2_grid.json'),JSON.stringify(grid));
P('[HOLM V2 TERRAIN] wrote',OUTWS,'bundle stats',JSON.stringify(bundle.stats));
