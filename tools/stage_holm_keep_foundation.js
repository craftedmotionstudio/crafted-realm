'use strict';
// Candidate only. Install into the registered working tree using Studio Safe Publish stage.
const fs=require('fs'),path=require('path'),assert=require('assert');
const Terrain=require('../src/holm_overhaul_terrain.js');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring');
const source=JSON.parse(fs.readFileSync(path.join(base,'holm-overhaul.terrain.json'),'utf8'));
const before=Terrain.compile(source);
const pads=[
 {id:'keep-watch-foundation',x:80,z:23,w:8,d:8,height:8,blend:3},
 {id:'keep-east-foundation',x:96.65,z:28,w:7.5,d:7.5,height:8,blend:3},
 {id:'keep-gate-approach',x:89,z:45.5,w:6,d:4,height:8,blend:3}
];
source.pads=source.pads.filter(p=>!pads.some(n=>n.id===p.id)).concat(pads);
const after=Terrain.compile(source);
function height(b,x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,w=145;
 const [a,c,d,e]=[b.heights[iz*w+ix],b.heights[iz*w+ix+1],b.heights[(iz+1)*w+ix],b.heights[(iz+1)*w+ix+1]];
 return fx+fz<=1?a+fx*(c-a)+fz*(d-a):e+(1-fx)*(d-e)+(1-fz)*(c-e);}
const supports=[{id:'hall',bounds:[77,26,84,41]},{id:'stores',bounds:[84,26,94,30]},
 {id:'watch-tower',bounds:[77,20,83,26]},{id:'east-tower',bounds:[94,25.35,99.3,30.65]},
 {id:'gate',bounds:[86,39,92,45]},{id:'gate-approach',bounds:[88,45,90,47]}];
let samples=0;const measured=supports.map(s=>{let min=Infinity,max=-Infinity,oldMin=Infinity,oldMax=-Infinity;
 const [x0,z0,x1,z1]=s.bounds;for(let x=x0;x<=x1+.00001;x+=.25)for(let z=z0;z<=z1+.00001;z+=.25){
 const y=height(after,x,z),old=height(before,x,z);min=Math.min(min,y);max=Math.max(max,y);oldMin=Math.min(oldMin,old);oldMax=Math.max(oldMax,old);samples++;assert(Math.abs(y-8)<1e-8,s.id+' floor support');}
 return {...s,before:[oldMin,oldMax],after:[min,max]};});
let changed=0;after.heights.forEach((h,i)=>{if(h!==before.heights[i]){changed++;const x=i%145,z=Math.floor(i/145);
 assert(x>=73&&x<=104&&z>=15&&z<=51,'unrelated terrain changed');}});
assert.deepStrictEqual(after.creek,before.creek);assert.deepStrictEqual(after.water,before.water);
const out=path.join(root,'.studio-workspaces/holm-keep-foundation-v1/candidates');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'holm-overhaul.terrain.json'),JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(path.join(out,'holm-overhaul.terrain.bundle.json'),JSON.stringify(after)+'\n');
const report={schema:'holm-keep-foundation-study-v1',status:'Studio candidate; no gameplay acceptance',placement:{x:87,y:8.025,z:35,yaw:0},pads,samples,changedVertices:changed,supports:measured,scope:'Quarter-tile rendered-triangle samples of conservative support rectangles; no avatar or retaining-wall proof'};
fs.writeFileSync(path.join(out,'foundation-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('[KEEP_FOUNDATION] PASS',JSON.stringify(report));
