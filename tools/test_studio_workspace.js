#!/usr/bin/env node
'use strict';
const fs=require('fs');const os=require('os');const path=require('path');
const W=require('./studio_workspace.js');
let fails=0;function check(label,ok){if(ok)console.log('  ok  '+label);else{fails++;console.error('  FAIL '+label);}}
function authoring(x){return {schema:'crafted-realm-world-v2-authoring-v1',version:1,chunkSize:8,provider:{id:'test-provider',worldRevision:1},placements:[{id:'hall',definitionId:'hall-v1',definitionRevision:1,asset:'hall-glb',x,z:2,rot:0,yOffset:0}]};}
function bundle(x,sourcePath='assets/world/authoring/source.json'){return {schema:'crafted-realm-world-v2-building-bundle-v1',version:1,chunkSize:8,source:{path:sourcePath},provider:{id:'test-provider',worldRevision:1},landscape:{planId:'test-landscape',revision:1},chunks:[{v:1,id:Math.floor(x/8)+',0',cx:Math.floor(x/8),cz:0,layers:{terrain:{},tileFlags:[],objects:[{id:'hall',asset:'hall-glb',buildingDef:'hall-v1',x,z:2,rot:0,yOffset:0}],interactions:[],mutations:[],spawns:[]}}],buildingContracts:[{placementId:'hall',definitionId:'hall-v1',definitionRevision:1,padId:'hall',roomIds:[],doorIds:[],semanticPartIds:[],colliderCount:0,resources:{}}]};}
function districtSource(){return {schema:'crafted-realm-world-v2-district-authoring-v1',version:1,chunkSize:8,sourcePath:'assets/world/authoring/district.json',provider:{id:'district-provider',worldRevision:4},landscape:{planId:'test-landscape',revision:2},district:{id:'survival',padIds:['hall']},building:{sourcePath:'assets/world/authoring/source.json',bundlePath:'assets/world/authoring/source.bundle.json',definitionId:'hall-v1',runtimePlacementId:'runtime-hall'}};}
function districtBundle(x){return {schema:'crafted-realm-world-v2-district-bundle-v1',version:1,chunkSize:8,source:{path:'assets/world/authoring/district.json'},provider:{id:'district-provider',worldRevision:4},landscape:{district:{id:'survival'},pads:[],routes:[]},building:{sourcePath:'assets/world/authoring/source.json',bundlePath:'assets/world/authoring/source.bundle.json',definitionId:'hall-v1',placement:{x,z:2,rot:0,yOffset:0}},chunks:[{id:'0,0',cx:0,cz:0,terrain:{roles:[]},tileFlags:[]}],navigation:{walkSurfaces:[],collisionRows:[]}};}
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cr-studio-workspace-')),target='assets/world/authoring/test.json',live=path.join(root,...target.split('/'));
try{
  fs.mkdirSync(path.dirname(live),{recursive:true});fs.writeFileSync(live,JSON.stringify(authoring(1),null,2));
  const created=W.init(root,'test-workspace',[target]);
  check('init creates isolated source and working snapshots',fs.existsSync(path.join(created.workspace,'source',...target.split('/')))&&fs.existsSync(path.join(created.workspace,'working',...target.split('/'))));
  const original=fs.readFileSync(live,'utf8'),candidate=path.join(root,'candidate.json');fs.writeFileSync(candidate,JSON.stringify(authoring(9),null,2));
  W.stage(root,'test-workspace',target,candidate);
  check('staging never changes the live target',fs.readFileSync(live,'utf8')===original);
  const exp1=W.exportWorkspace(root,'test-workspace'),exp2=W.exportWorkspace(root,'test-workspace');
  check('exports are content-addressed and deterministic',exp1.exportId===exp2.exportId&&fs.existsSync(path.join(exp1.dir,'manifest.json')));
  const preview=W.plan(root,'test-workspace',exp1.exportId);
  check('dry-run accepts an unchanged base and verifies packed hashes',preview.ok&&preview.files.length===1&&preview.files[0].hash.length===64);
  const applied=W.apply(root,'test-workspace',exp1.exportId);
  check('apply installs exact candidate bytes and writes a receipt',JSON.parse(fs.readFileSync(live,'utf8')).placements[0].x===9&&fs.existsSync(path.join(created.workspace,'receipts',applied.receiptId+'.json')));
  check('successful apply rebases the workspace cleanly',W.status(root,'test-workspace').clean);
  const installed=fs.readFileSync(live,'utf8');fs.writeFileSync(live,JSON.stringify(authoring(10),null,2));let rollbackRefused=false;
  try{W.rollback(root,'test-workspace');}catch(e){rollbackRefused=e.message.includes('changed after publish');}
  check('rollback refuses to overwrite edits made after publish',rollbackRefused&&JSON.parse(fs.readFileSync(live,'utf8')).placements[0].x===10);
  fs.writeFileSync(live,installed);
  const rolled=W.rollback(root,'test-workspace');
  check('rollback restores exact original bytes',rolled.ok&&fs.readFileSync(live,'utf8')===original);
  fs.writeFileSync(candidate,JSON.stringify(authoring(7),null,2));W.stage(root,'test-workspace',target,candidate);const exp3=W.exportWorkspace(root,'test-workspace');
  fs.writeFileSync(live,JSON.stringify(authoring(3),null,2));const conflict=W.plan(root,'test-workspace',exp3.exportId);
  check('dry-run refuses a live target changed after snapshot',!conflict.ok&&conflict.files[0].errors.some(e=>e.includes('changed since')));
  let refused=false;try{W.apply(root,'test-workspace',exp3.exportId);}catch(e){refused=e.message.includes('publish refused');}
  check('apply fails closed on conflicts',refused&&JSON.parse(fs.readFileSync(live,'utf8')).placements[0].x===3);
  let escaped=false;try{W.init(root,'bad-workspace',['../outside.json']);}catch(e){escaped=e.message.includes('unsafe target');}
  check('path traversal is rejected',escaped);
  fs.writeFileSync(candidate,'{"schema":"crafted-realm-world-v2-authoring-v1"}');let invalid=false;
  try{W.stage(root,'test-workspace',target,candidate);}catch(e){invalid=e.message.includes('provider.id');}
  check('invalid authoring documents cannot be staged',invalid);
  const bundleRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cr-studio-bundle-')),sourceRel='assets/world/authoring/source.json',bundleRel='assets/world/authoring/source.bundle.json';
  const sourceLive=path.join(bundleRoot,...sourceRel.split('/')),bundleLive=path.join(bundleRoot,...bundleRel.split('/'));fs.mkdirSync(path.dirname(sourceLive),{recursive:true});
  fs.writeFileSync(sourceLive,JSON.stringify(authoring(1),null,2));fs.writeFileSync(bundleLive,JSON.stringify(bundle(1),null,2));W.init(bundleRoot,'bundle-workspace',[sourceRel,bundleRel]);
  const nextSource=path.join(bundleRoot,'next-source.json'),nextBundle=path.join(bundleRoot,'next-bundle.json');fs.writeFileSync(nextSource,JSON.stringify(authoring(9),null,2));fs.writeFileSync(nextBundle,JSON.stringify(bundle(9),null,2));
  W.stage(bundleRoot,'bundle-workspace',sourceRel,nextSource);let pairRefused=false;try{W.exportWorkspace(bundleRoot,'bundle-workspace');}catch(e){pairRefused=e.message.includes('placement hall drifted');}
  check('multi-file export refuses a placement/bundle pair that drifted',pairRefused);
  W.stage(bundleRoot,'bundle-workspace',bundleRel,nextBundle);const pairExport=W.exportWorkspace(bundleRoot,'bundle-workspace');
  check('multi-file export accepts a matching placement/bundle pair',!pairExport.noChanges&&pairExport.files.length===2);
  fs.rmSync(bundleRoot,{recursive:true,force:true});
  const districtRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cr-studio-district-'));
  const districtFiles={'assets/world/authoring/source.json':authoring(1),'assets/world/authoring/source.bundle.json':bundle(1),'assets/world/authoring/district.json':districtSource(),'assets/world/authoring/district.bundle.json':districtBundle(1)};
  Object.entries(districtFiles).forEach(([rel,value])=>{const file=path.join(districtRoot,...rel.split('/'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2));});
  W.init(districtRoot,'district-workspace',Object.keys(districtFiles));
  check('four-file district transaction validates landscape, navigation, and its building pair',W.exportWorkspace(districtRoot,'district-workspace').noChanges);
  const badDistrict=path.join(districtRoot,'bad-district.json');fs.writeFileSync(badDistrict,JSON.stringify(districtBundle(9),null,2));
  W.stage(districtRoot,'district-workspace','assets/world/authoring/district.bundle.json',badDistrict);let districtRefused=false;
  try{W.exportWorkspace(districtRoot,'district-workspace');}catch(e){districtRefused=e.message.includes('district building placement drifted');}
  check('district transaction fails closed when the building transform drifts',districtRefused);
  fs.rmSync(districtRoot,{recursive:true,force:true});
  const crashRoot=fs.mkdtempSync(path.join(os.tmpdir(),'cr-studio-crash-')),crashRel='assets/world/authoring/crash.json',crashLive=path.join(crashRoot,...crashRel.split('/'));
  fs.mkdirSync(path.dirname(crashLive),{recursive:true});const crashOriginal=JSON.stringify(authoring(1),null,2);fs.writeFileSync(crashLive,crashOriginal);
  const crashCreated=W.init(crashRoot,'crash-workspace',[crashRel]),crashCandidate=path.join(crashRoot,'crash-candidate.json');fs.writeFileSync(crashCandidate,JSON.stringify(authoring(8),null,2));
  W.stage(crashRoot,'crash-workspace',crashRel,crashCandidate);const crashExport=W.exportWorkspace(crashRoot,'crash-workspace'),crashPlan=W.plan(crashRoot,'crash-workspace',crashExport.exportId),crashId='apply-simulated-crash';
  const crashBackup=path.join(crashCreated.workspace,'backups',crashId,...crashRel.split('/'));fs.mkdirSync(path.dirname(crashBackup),{recursive:true});fs.copyFileSync(crashLive,crashBackup);
  const crashJournal={schema:W.JOURNAL_SCHEMA,version:1,id:crashId,workspaceId:'crash-workspace',exportId:crashExport.exportId,createdAt:new Date().toISOString(),phase:'installing',files:crashPlan.files.map(f=>({path:f.path,beforeExisted:true,beforeHash:f.liveHash,installedHash:f.hash}))};
  fs.writeFileSync(path.join(crashCreated.workspace,'publish-journal.json'),JSON.stringify(crashJournal,null,2));fs.copyFileSync(path.join(crashExport.dir,'files',...crashRel.split('/')),crashLive);
  const interruptedStatus=W.status(crashRoot,'crash-workspace');
  check('status exposes an interrupted publish and is not clean',!interruptedStatus.clean&&interruptedStatus.pendingRecovery&&interruptedStatus.pendingRecovery.id===crashId);
  let publishBlocked=false;try{W.apply(crashRoot,'crash-workspace',crashExport.exportId);}catch(e){publishBlocked=e.message.includes('requires recovery');}
  check('new publishes are blocked while a recovery journal exists',publishBlocked);
  const interruptedReceipt=Object.assign({schema:W.RECEIPT_SCHEMA,version:1,type:'apply',id:crashId,workspaceId:'crash-workspace',exportId:crashExport.exportId,createdAt:new Date().toISOString(),rolledBack:false},{files:crashJournal.files});
  fs.writeFileSync(path.join(crashCreated.workspace,'receipts',crashId+'.json'),JSON.stringify(interruptedReceipt,null,2));
  const recovered=W.recover(crashRoot,'crash-workspace'),recoveredStatus=W.status(crashRoot,'crash-workspace');
  check('recover restores exact pre-publish bytes and preserves the staged draft',recovered.ok&&fs.readFileSync(crashLive,'utf8')===crashOriginal&&!recoveredStatus.pendingRecovery&&recoveredStatus.files[0].changed&&recoveredStatus.files[0].liveMatchesBase);
  check('recovery retires a receipt written by an interrupted commit',JSON.parse(fs.readFileSync(path.join(crashCreated.workspace,'receipts',crashId+'.json'),'utf8')).recoveredAfterCrash===true);
  check('recover archives durable evidence and becomes idempotent',fs.existsSync(recovered.archive)&&W.recover(crashRoot,'crash-workspace').noRecoveryNeeded);
  fs.copyFileSync(crashBackup,crashLive);fs.writeFileSync(path.join(crashCreated.workspace,'publish-journal.json'),JSON.stringify(crashJournal,null,2));fs.writeFileSync(crashLive,JSON.stringify(authoring(11),null,2));let divergentRecoveryRefused=false;
  try{W.recover(crashRoot,'crash-workspace');}catch(e){divergentRecoveryRefused=e.message.includes('live file diverged');}
  check('recovery refuses to overwrite bytes outside the journal contract',divergentRecoveryRefused&&fs.existsSync(path.join(crashCreated.workspace,'publish-journal.json'))&&JSON.parse(fs.readFileSync(crashLive,'utf8')).placements[0].x===11);
  fs.unlinkSync(path.join(crashCreated.workspace,'publish-journal.json'));fs.writeFileSync(crashLive,crashOriginal);
  const completedApply=W.apply(crashRoot,'crash-workspace',crashExport.exportId),completedReceipt=JSON.parse(fs.readFileSync(path.join(crashCreated.workspace,'receipts',completedApply.receiptId+'.json'),'utf8'));
  const committedJournal={schema:W.JOURNAL_SCHEMA,version:1,id:completedApply.receiptId,workspaceId:'crash-workspace',exportId:crashExport.exportId,createdAt:new Date().toISOString(),phase:'committed',files:completedReceipt.files};
  fs.writeFileSync(path.join(crashCreated.workspace,'publish-journal.json'),JSON.stringify(committedJournal,null,2));const committedCleanup=W.recover(crashRoot,'crash-workspace');
  check('recovery finalizes a committed publish without rolling it back',committedCleanup.committedCleanup&&JSON.parse(fs.readFileSync(crashLive,'utf8')).placements[0].x===8&&W.status(crashRoot,'crash-workspace').clean);
  fs.rmSync(crashRoot,{recursive:true,force:true});
}finally{fs.rmSync(root,{recursive:true,force:true});}
if(fails){console.error('\n'+fails+' Studio workspace test(s) failed');process.exit(1);}console.log('\nStudio workspace gate PASS');
