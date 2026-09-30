/* Stage the grey paths of Tutor's Holm (path tiles pass, 2026-09-29). The paths are no longer generated: the layout is
 * authored tile by tile in src/holm_island_grey_paths_data.js (named segments, courts, junctions; owner 2026-09-29: "map
 * out the exact tiles of the path"). This tool keeps the ground dressing in step with it, visual only:
 *  1. ground decor (the no-block 'dress-decor' grass clumps, pebbles, daisies of docs/rebuild/holm-overhaul/
 *     island-props.json) lying on a path tile is taken up, as review 5 did;
 *  2. the 17 pieces the review-5 generator took up (REVIEW5_TAKEN_UP, their placements and positions in the set as they
 *     were at 03cfe79b~1) are put back where no path runs any more, so a stray square that is grass again gets its tuft
 *     back;
 *  3. writes scratchpad/holm_path_tiles/report.json (tiles, segments, courts, the audit counts, decor, the walk graph).
 * Decor never blocks: the composed walk graph is unchanged (tools/test_holm_grey_paths.js recomposes it). The island
 * bundle carries a byte copy of island-props.json: publish after a change (node tools/publish_holm_island.js apply).
 * Run: node tools/stage_holm_grey_paths.js [--check]   (--check: report only, write nothing) */
'use strict';
const fs=require('fs'),path=require('path');
const F=require('./holm_path_tiles_facts'),{audit}=require('./audit_holm_path_tiles');
const Paths=require('../src/holm_island_grey_paths_data.js');
const {key}=F;
const REVIEW5_TAKEN_UP=[   // [index in the dress-decor set before review 5, placement]
 [251,{pack:'clutter',prop:'mushrooms',x:116.66,z:31.72,yaw:4.2,scale:0.91,noBlock:true}],
 [520,{pack:'clutter',prop:'grass-clump',x:87.58,z:48.8,yaw:4.96,scale:0.92,noBlock:true}],
 [627,{pack:'clutter',prop:'daisies',x:54.37,z:56.77,yaw:1.91,scale:1,noBlock:true}],
 [628,{pack:'clutter',prop:'grass-clump',x:56.67,z:56.77,yaw:5.99,scale:1.04,noBlock:true}],
 [651,{pack:'clutter',prop:'grass-clump',x:47.79,z:58.26,yaw:0.92,scale:1.04,noBlock:true}],
 [671,{pack:'clutter',prop:'daisies',x:46.39,z:60.52,yaw:6.27,scale:1.1,noBlock:true}],
 [695,{pack:'clutter',prop:'daisies',x:73.38,z:62.27,yaw:2.59,scale:1.14,noBlock:true}],
 [726,{pack:'clutter',prop:'grass-clump',x:114.47,z:64.43,yaw:0.15,scale:1.13,noBlock:true}],
 [737,{pack:'clutter',prop:'grass-clump',x:86.56,z:65.71,yaw:5.08,scale:0.94,noBlock:true}],
 [771,{pack:'clutter',prop:'fern',x:78.34,z:67.71,yaw:5.15,scale:0.94,noBlock:true}],
 [775,{pack:'clutter',prop:'grass-clump',x:112.55,z:67.56,yaw:0.12,scale:1.03,noBlock:true}],
 [785,{pack:'clutter',prop:'grass-clump',x:96.27,z:68.44,yaw:4.98,scale:0.83,noBlock:true}],
 [851,{pack:'clutter',prop:'grass-clump',x:44.62,z:72.68,yaw:3.48,scale:0.97,noBlock:true}],
 [1215,{pack:'clutter',prop:'bracken',x:68.62,z:90.21,yaw:2.07,scale:1.17,noBlock:true}],
 [1283,{pack:'clutter',prop:'grass-clump',x:41.57,z:94.73,yaw:3.82,scale:0.88,noBlock:true}],
 [1296,{pack:'clutter',prop:'grass-clump',x:118.67,z:94.23,yaw:2.66,scale:1.21,noBlock:true}],
 [1321,{pack:'clutter',prop:'grass-clump',x:117.77,z:95.77,yaw:3.17,scale:0.91,noBlock:true}]];
const tileOf=p=>key(Math.floor(p.x),Math.floor(p.z)),sig=p=>p.prop+'@'+p.x+','+p.z;
function stage(){
 const pf=path.join(F.ROOT,F.PROPS_FILE),raw=fs.readFileSync(pf,'utf8'),nl=raw.indexOf('\r\n')>=0?'\r\n':'\n',pd=JSON.parse(raw);
 const set=pd.sets.find(q=>q.id===F.DECOR_SET),paved=new Set(Object.keys(Paths.tiles));
 const takenUp=set.placements.filter(p=>paved.has(tileOf(p))).map(sig);
 let placements=set.placements.filter(p=>!paved.has(tileOf(p)));
 const have=new Set(placements.map(sig)),restored=[];
 REVIEW5_TAKEN_UP.forEach(([i,p])=>{if(have.has(sig(p))||paved.has(tileOf(p)))return;placements.splice(Math.min(i,placements.length),0,Object.assign({},p));restored.push(sig(p))});
 set.placements=placements;
 return {pf,nl,pd,takenUp,restored,changed:takenUp.length>0||restored.length>0};
}
module.exports={stage,REVIEW5_TAKEN_UP};
if(require.main===module){
 const check=process.argv.includes('--check'),r=stage();
 if(!check&&r.changed)fs.writeFileSync(r.pf,(JSON.stringify(r.pd,null,1)+'\n').replace(/\n/g,r.nl));
 const a=audit(Paths);
 const report={layout:Paths.layout,tiles:Object.keys(Paths.tiles).length,segments:Paths.segments.map(s=>({id:s.id,name:s.name,from:s.from,to:s.to,w:s.w,tiles:s.tiles.length})),
  courts:Paths.courts.map(c=>({id:c.id,name:c.name,rect:c.rect,tiles:c.tiles.length})),junctions:Paths.junctions,
  audit:{components:a.components,componentSizes:a.componentSizes,counts:a.counts,strayTiles:a.strayTiles,crossWidths:a.crossWidths,unserved:a.unserved,findings:a.findings},
  decor:{takenUp:r.takenUp,restored:r.restored,written:!check&&r.changed},graph:F.graphSummary(F.graph)};
 if(!check){fs.mkdirSync(path.join(F.ROOT,'scratchpad/holm_path_tiles'),{recursive:true});fs.writeFileSync(path.join(F.ROOT,'scratchpad/holm_path_tiles/report.json'),JSON.stringify(report,null,1)+'\n')}
 console.log('[HOLM GREY PATHS] '+JSON.stringify({tiles:report.tiles,segments:report.segments.length,courts:report.courts.length,counts:a.counts,unserved:a.unserved,
  decorTakenUp:r.takenUp.length,decorRestored:r.restored.length,written:report.decor.written,graph:report.graph}));
}
