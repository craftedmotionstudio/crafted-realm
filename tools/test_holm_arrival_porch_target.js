'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const Target=require('../src/holm_arrival_porch_target'),Loader=require('../src/holm_arrival_export_loader'),Dock=require('../src/holm_arrival_dock'),Follower=require('../src/holm_arrival_follower');
const id='89e7cf10543d97bf',root=path.resolve(__dirname,'../.studio-workspaces/holm-arrival-package-v3/exports',id),base='http://127.0.0.1:8777/.studio-workspaces/holm-arrival-package-v3/exports/';
(async()=>{
 const loaded=await Loader.load({baseUrl:base,exportId:id,subtle:crypto.webcrypto.subtle,fetch:async url=>{assert(url.startsWith(base+id+'/'));const bytes=fs.readFileSync(path.join(root,url.slice((base+id+'/').length)));return {ok:true,url,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}}});
 assert.equal(Object.keys(loaded.files).length,25);
 const layout=loaded.documents.layout,nav=Dock.create(layout,loaded.documents.envelopes,loaded.documents.terrain,loaded.documents.dock),point={x:67.1514219,y:3,z:105.1140898};
 let cases=0;
 for(const arrival of [false,true])for(const garden of [false,true]){
  const doors={arrival,garden},graph=nav.compile(doors),before=JSON.stringify({layout,graph,point});
  const resolve=p=>Target.resolve({point:p,layout,graph}),target=resolve(point);
  assert.deepEqual(target,{id:'ground:66,105',x:66.5,y:3,z:105.5,surface:'ground'});
  assert(nav.support(target.surface,target.x,target.z,doors));
  for(const surface of ['ground','exterior'])assert.equal(resolve({...point,surface}).id,target.id);
  const rejected=[{x:64.179,y:3,z:105},{x:67.821,y:3,z:105},{x:66,y:3,z:104.174},{x:66,y:3,z:106.401},{x:66,y:3.151,z:105},{x:66,y:2.849,z:105},{x:66,y:5.8,z:105},{x:66,y:3,z:98},{x:61,y:1,z:123},{x:NaN,y:3,z:105},...['upper','stair','dock','water','',null].map(surface=>({...point,surface}))];
  for(const p of rejected)assert.equal(resolve(p),null,JSON.stringify(p));
  assert.equal(JSON.stringify({layout,graph,point}),before,'resolver cannot mutate inputs');
  target.x=999;assert.equal(resolve(point).x,66.5,'returned target is detached');
  const follower=Follower.create({navigation:nav,graphForDoors:d=>nav.compile(d),doors,startNodeId:'ground:66,102',speed:2.2});
  assert.equal(follower.order(resolve(point).id),arrival,'normal routing still refuses crossing the closed arrival door');
  cases+=rejected.length+6;
 }
 const synthetic={nodes:[{id:'z',surface:'ground',x:66.5,y:3,z:105.5},{id:'a',surface:'ground',x:65.5,y:3,z:105.5}]};
 const tie={x:66,y:3,z:105.5};
 assert.equal(Target.resolve({point:tie,layout,graph:synthetic}).id,'a');synthetic.nodes.reverse();assert.equal(Target.resolve({point:tie,layout,graph:synthetic}).id,'a');
 assert.equal(Target.resolve({point:{x:67.8,y:3,z:106.3},layout,graph:{nodes:[{id:'far',surface:'ground',x:65,y:3,z:105}]}}),null);
 for(const invalid of [null,{}, {point,layout,graph:{nodes:[]}}, {point,layout:{},graph:synthetic}])assert.equal(Target.resolve(invalid),null);
 const context={console:{log:()=>{}}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/holm_arrival_porch_target.js'),'utf8'),context);
 assert.equal(context.HolmArrivalPorchTarget.resolve({point,layout,graph:nav.compile({arrival:false,garden:false})}).id,'ground:66,105');
 console.log('[ARRIVAL_PORCH_TARGET] '+cases+' four-door-state cases plus deterministic ties, detached outputs, malformed inputs, distance limit and classic-global parity pass against actual 25-file draft. Numeric apron x64.18..67.82/z104.175..106.4/y3 +/- .15; no visual geometry acceptance claimed.');
})().catch(e=>{console.error(e);process.exitCode=1});
