'use strict';
const assert=require('assert'),fs=require('fs'),T=require('../src/holm_overhaul_terrain');
const source=JSON.parse(fs.readFileSync('.studio-workspaces/holm-overhaul-terrain-v1/candidates/holm-overhaul.terrain.json','utf8'));
const layout=require('../docs/rebuild/holm-overhaul/arrival-layout.json');
const b=T.compile(source),points=layout.approach.waypoints;
let maxError=0,maxStep=0;
for(let i=1;i<points.length;i++){
  const a=points[i-1],c=points[i],length=Math.abs(c[0]-a[0])+Math.abs(c[2]-a[2]);let previous;
  for(let j=0;j<=length;j++){
    const t=j/length,x=a[0]+(c[0]-a[0])*t,z=a[2]+(c[2]-a[2])*t,y=a[1]+(c[1]-a[1])*t,h=T.sample(b,x,z);
    maxError=Math.max(maxError,Math.abs(y-h));if(previous!==undefined)maxStep=Math.max(maxStep,Math.abs(h-previous));previous=h;
    assert.strictEqual(b.water[Math.floor(z)*144+Math.floor(x)],0,'arrival route must remain dry');
  }
}
assert(maxError<1e-8,'compiled path follows specified grade');assert(maxStep<=.4);
const bad=JSON.parse(JSON.stringify(source));bad.grades[0].points[1][0]+=.5;assert.throws(()=>T.compile(bad),/cardinal/);
for(const x of [66.08,66.5,66.92])for(const z of [105.5,106,106.4,106.92])assert(Math.abs(T.sample(b,x,z)-3)<1e-8,'terrain must meet the porch across the actor footprint');
console.log('[HOLM_ARRIVAL_GRADE] dry route, exact grade, porch footprint seam and invalid diagonal checks passed; max step '+maxStep);
