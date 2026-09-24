'use strict';
// Bring the design-map silhouette into agreement with the measured Blender plan.
const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'../docs/rebuild/holm-overhaul/plan.json');
const plan=JSON.parse(fs.readFileSync(file,'utf8')),keep=plan.places.find(p=>p.id==='keep');
if(!keep?.architecture?.volumes)throw Error('Keep design missing');
const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const octagon=(cx,cy,a)=>Array.from({length:8},(_,i)=>{const t=Math.PI/8+i*Math.PI/4,r=a/Math.cos(Math.PI/8);return [+(cx+r*Math.cos(t)).toFixed(4),+(-cy-r*Math.sin(t)).toFixed(4)]});
const shapes={'great-hall':rect(-10,-9,-3,6),'north-range':rect(-3,-9,7,-5),'east-wall':rect(7,-4.7,9,4),gatehouse:rect(-1,4,5,10),'west-curtain':rect(-3,3.8,-1,6.2),'east-curtain':rect(5,3.8,9,6.2),'high-watchtower':octagon(-7,12,3),'east-turret':octagon(10,7,3)};
keep.architecture.volumes=keep.architecture.volumes.filter(v=>v.id!=='stair-turret').map(v=>({...v,outline:shapes[v.id]||v.outline}));
keep.architecture.modelStudy='holm-warden-keep-v4; measured footprint, not runtime acceptance';
keep.architecture.character='Unequal projecting towers and connected gray-stone ranges enclose an open court. Internal hall stairs reach the wall walk; stacked switchbacks reach both tower lookouts.';
fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
console.log('[KEEP_FOOTPRINT] updated eight volumes; preserved all other places and directions');
