#!/usr/bin/env node
'use strict';
// Read-only terrain/plan diagnostics. Does not claim gameplay accessibility.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const Terrain=require('../src/holm_overhaul_terrain.js');
const root=path.resolve(__dirname,'..');
const round=n=>Math.round(n*10000)/10000;
function audit(bundle,plan){
  if(!Array.isArray(plan.paths)||!Array.isArray(plan.places)||!Array.isArray(plan.bridges))throw new Error('Plan paths/places/bridges required');
  if(!Array.isArray(bundle.water)||bundle.water.length!==bundle.width*bundle.depth||!bundle.water.every(n=>[0,1,2].includes(n)))throw new Error('Invalid water grid');
  Terrain.sample(bundle,0,0);
  const findings=[],routes=[];
  function bridgeInfo(x,z){
    return plan.bridges.filter(b=>Math.hypot(b.x-x,b.z-z)<=3).map(b=>({label:b.label||'bridge',x:b.x,z:b.z,orientation:b.orientation,
      coverage:'unverified: metadata has no deck extent/elevation',distance:round(Math.hypot(b.x-x,b.z-z))}));
  }
  plan.paths.forEach((route,ri)=>{
    const stats={id:route.id||'path-'+(ri+1),kind:route.kind,edges:0,length:0,maxJumpPerTile:0,steepEdges:0,wetEdges:0};
    if(!Array.isArray(route.points)||route.points.length<2)throw new Error('Invalid route '+stats.id);
    for(let si=1;si<route.points.length;si++){
      const a=route.points[si-1],b=route.points[si];
      if(!Array.isArray(a)||!Array.isArray(b)||a.length!==2||b.length!==2||![...a,...b].every(Number.isFinite))throw new Error('Invalid route coordinates');
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.abs(dx)+Math.abs(dz);
      if(dx&&dz){findings.push({severity:'high',type:'noncardinal-segment',route:stats.id,segment:si,from:a,to:b});continue;}
      if(!length)continue;
      for(let d=0;d<length;d++){
        const end=Math.min(length,d+1),p=[a[0]+Math.sign(dx)*d,a[1]+Math.sign(dz)*d],q=[a[0]+Math.sign(dx)*end,a[1]+Math.sign(dz)*end];
        const hp=Terrain.sample(bundle,...p),hq=Terrain.sample(bundle,...q),jump=Math.abs(hq-hp)/(end-d),mx=(p[0]+q[0])/2,mz=(p[1]+q[1])/2;
        const ix=Math.min(bundle.width-1,Math.floor(mx)),iz=Math.min(bundle.depth-1,Math.floor(mz)),wet=bundle.water[iz*bundle.width+ix];
        stats.edges++;stats.length+=end-d;stats.maxJumpPerTile=Math.max(stats.maxJumpPerTile,jump);
        const detail={route:stats.id,segment:si,from:p,to:q,heights:[round(hp),round(hq)]};
        if(jump>.5+1e-9){stats.steepEdges++;findings.push({...detail,severity:jump>1.05?'high':'medium',type:'steep-edge',jumpPerTile:round(jump)});}
        if(wet){stats.wetEdges++;const nearby=bridgeInfo(mx,mz);findings.push({...detail,severity:'high',type:wet===1?'sea-intersection':'creek-intersection',tile:[ix,iz],nearbyBridges:nearby,
          coverage:nearby.length?'near planned bridge; deck coverage unproven':'no bridge metadata within 3 tiles'});}
      }
    }
    stats.maxJumpPerTile=round(stats.maxJumpPerTile);routes.push(stats);
  });
  const pads=plan.places.map(p=>{
    if(![p.x,p.z,p.w,p.d,p.height].every(Number.isFinite)||p.w<=0||p.d<=0)throw new Error('Invalid place '+p.id);
    const xs=[p.x-p.w/2],zs=[p.z-p.d/2];
    for(let x=Math.ceil(xs[0]);x<p.x+p.w/2;x++)if(x!==xs[0])xs.push(x);xs.push(p.x+p.w/2);
    for(let z=Math.ceil(zs[0]);z<p.z+p.d/2;z++)if(z!==zs[0])zs.push(z);zs.push(p.z+p.d/2);
    let min=Infinity,max=-Infinity;
    zs.forEach(z=>xs.forEach(x=>{const h=Terrain.sample(bundle,x,z);min=Math.min(min,h);max=Math.max(max,h);}));
    const row={id:p.id,center:[p.x,p.z],expectedHeight:p.height,minHeight:round(min),maxHeight:round(max),spread:round(max-min)};
    if(max-min>.05||Math.max(Math.abs(min-p.height),Math.abs(max-p.height))>.05)findings.push({severity:'high',type:'pad-height-mismatch',...row});
    return row;
  });
  return {schema:'holm-overhaul-route-audit-v1',scope:'Terrain sample diagnostics only; no collision, bridges, buildings, or gameplay accessibility validated.',
    conventions:{steepThreshold:.5,highSteepThreshold:1.05,wetSample:'midpoint containing tile',bridgeProximityRadius:3,bridgeCoverage:'All existing bridge metadata lacks deck extents/elevation; proximity never proves coverage.'},
    summary:{routes:routes.length,edges:routes.reduce((n,r)=>n+r.edges,0),steepEdges:routes.reduce((n,r)=>n+r.steepEdges,0),wetEdges:routes.reduce((n,r)=>n+r.wetEdges,0),padMismatches:findings.filter(f=>f.type==='pad-height-mismatch').length},routes,pads,findings};
}
function selfTest(){
  const bundle={schema:'holm-overhaul-terrain-bundle-v1',version:1,width:144,depth:128,spacing:1,heights:Array(145*129).fill(2),water:Array(144*128).fill(0)};
  bundle.heights[10*145+11]=4;bundle.water[10*144+10]=2;
  const plan={paths:[{kind:'fixture',points:[[10,10],[12,10]]}],places:[{id:'flat',x:20,z:20,w:2,d:2,height:2}],bridges:[{x:10,z:10,label:'fixture bridge',orientation:'EW'}]};
  const original=JSON.stringify([bundle,plan]),a=audit(bundle,plan);
  assert.strictEqual(a.summary.steepEdges,2);assert.strictEqual(a.summary.wetEdges,1);assert.strictEqual(a.summary.padMismatches,0);
  assert(a.findings.find(f=>f.type==='creek-intersection').coverage.includes('unproven'));
  assert.strictEqual(JSON.stringify(a),JSON.stringify(audit(bundle,plan)));assert.strictEqual(JSON.stringify([bundle,plan]),original);
  return {passed:5,total:5};
}
if(require.main===module){
  try{
    const tests=selfTest();console.error('[HOLM_OVERHAUL_ROUTE_AUDIT] fixture '+tests.passed+'/'+tests.total+' passed');
    const bundlePath=path.resolve(process.argv[2]||path.join(root,'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'));
    const planPath=path.resolve(process.argv[3]||path.join(root,'docs/rebuild/holm-overhaul/plan.json'));
    const bytes=fs.readFileSync(bundlePath),planBytes=fs.readFileSync(planPath),report=audit(JSON.parse(bytes),JSON.parse(planBytes));
    report.inputs={bundle:bundlePath,plan:planPath,bundleSha256:crypto.createHash('sha256').update(bytes).digest('hex'),planSha256:crypto.createHash('sha256').update(planBytes).digest('hex')};
    console.log(JSON.stringify(report,null,2));
  }catch(e){console.error('[HOLM_OVERHAUL_ROUTE_AUDIT] '+e.message);process.exitCode=1;}
}
module.exports={audit,selfTest};
