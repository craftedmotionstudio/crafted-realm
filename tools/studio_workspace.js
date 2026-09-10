#!/usr/bin/env node
/* Crafted Realm Studio Safe Publish -- original, dependency-free transaction layer. */
'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

const SCHEMA='crafted-realm-studio-workspace-v1';
const EXPORT_SCHEMA='crafted-realm-studio-export-v1';
const RECEIPT_SCHEMA='crafted-realm-studio-receipt-v1';
const JOURNAL_SCHEMA='crafted-realm-studio-publish-journal-v1';

function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==='object'){
    const out={};Object.keys(value).sort().forEach(k=>{out[k]=stable(value[k]);});return out;
  }
  return value;
}
function stableJson(value,pretty=false){return JSON.stringify(stable(value),null,pretty?2:0)+(pretty?'\n':'');}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function readBytes(file){return fs.readFileSync(file);}
function hashFile(file){return fs.existsSync(file)?sha256(readBytes(file)):null;}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJson(file,value){ensureDir(path.dirname(file));fs.writeFileSync(file,stableJson(value,true));}
function writeJsonAtomic(file,value){
  ensureDir(path.dirname(file));const temp=file+'.tmp-'+process.pid,bytes=stableJson(value,true);let fd;
  try{fd=fs.openSync(temp,'w');fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);}
  finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function syncFile(file){const fd=fs.openSync(file,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function timestamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
function cleanId(value){
  const id=String(value||'').trim();
  if(!/^[a-z0-9][a-z0-9_-]{1,63}$/i.test(id)) throw new Error('workspace id must be 2-64 letters, numbers, underscores, or hyphens');
  return id;
}
function normalizeRelative(value){
  const rel=String(value||'').replace(/\\/g,'/').replace(/^\.\//,'');
  if(!rel||path.isAbsolute(rel)||rel.split('/').some(p=>p===''||p==='.'||p==='..')) throw new Error('unsafe target path: '+value);
  return rel;
}
function inside(root,rel){
  const base=path.resolve(root),full=path.resolve(base,...normalizeRelative(rel).split('/'));
  if(full!==base&&!full.startsWith(base+path.sep)) throw new Error('target escapes root: '+rel);
  return full;
}
function workspaceRoot(repoRoot,id){return path.join(path.resolve(repoRoot),'.studio-workspaces',cleanId(id));}
function manifestPath(workspace){return path.join(workspace,'studio-workspace.json');}
function journalPath(workspace){return path.join(workspace,'publish-journal.json');}
function loadManifest(workspace){
  const file=manifestPath(workspace);if(!fs.existsSync(file))throw new Error('workspace manifest not found: '+file);
  const m=readJson(file);if(m.schema!==SCHEMA||m.version!==1)throw new Error('unsupported workspace manifest');
  if(!Array.isArray(m.targets)||!m.targets.length)throw new Error('workspace has no targets');
  m.targets.forEach(t=>normalizeRelative(t.path));return m;
}
function validateAuthoring(value){
  const errors=[];
  const need=(ok,msg)=>{if(!ok)errors.push(msg);};
  need(value&&typeof value==='object'&&!Array.isArray(value),'document must be an object');
  if(!value)return errors;
  need(value.schema==='crafted-realm-world-v2-authoring-v1','unexpected authoring schema');
  need(value.version===1,'authoring version must be 1');
  need(value.chunkSize===8,'chunkSize must be 8');
  need(value.provider&&typeof value.provider.id==='string'&&value.provider.id.length>0,'provider.id is required');
  need(value.provider&&Number.isInteger(value.provider.worldRevision)&&value.provider.worldRevision>0,'provider.worldRevision must be positive');
  need(Array.isArray(value.placements),'placements must be an array');
  const ids=new Set();
  (Array.isArray(value.placements)?value.placements:[]).forEach((row,i)=>{
    const p='placement['+i+'] ';
    need(row&&typeof row==='object',p+'must be an object');if(!row)return;
    need(typeof row.id==='string'&&row.id.length>0,p+'id is required');
    need(!ids.has(row.id),p+'id must be unique');ids.add(row.id);
    need(typeof row.definitionId==='string'&&row.definitionId.length>0,p+'definitionId is required');
    need(Number.isInteger(row.definitionRevision)&&row.definitionRevision>0,p+'definitionRevision must be positive');
    need(typeof row.asset==='string'&&row.asset.length>0,p+'asset is required');
    ['x','z','rot','yOffset'].forEach(k=>need(Number.isFinite(row[k]),p+k+' must be finite'));
  });
  return errors;
}
function validateBundle(value){
  const errors=[];const need=(ok,msg)=>{if(!ok)errors.push(msg);};
  need(value&&typeof value==='object'&&!Array.isArray(value),'bundle must be an object');if(!value)return errors;
  need(value.schema==='crafted-realm-world-v2-building-bundle-v1','unexpected building bundle schema');
  need(value.version===1&&value.chunkSize===8,'building bundle version/chunkSize must be 1/8');
  need(value.source&&typeof value.source.path==='string'&&value.source.path.length>0,'bundle source.path is required');
  need(value.provider&&typeof value.provider.id==='string'&&Number.isInteger(value.provider.worldRevision),'bundle provider metadata is required');
  need(Array.isArray(value.chunks)&&Array.isArray(value.buildingContracts),'bundle chunks and buildingContracts are required');
  return errors;
}
function validateDistrictAuthoring(value){
  const errors=[];const need=(ok,msg)=>{if(!ok)errors.push(msg);};
  need(value&&typeof value==='object'&&!Array.isArray(value),'district document must be an object');if(!value)return errors;
  need(value.schema==='crafted-realm-world-v2-district-authoring-v1','unexpected district authoring schema');
  need(value.version===1&&value.chunkSize===8,'district authoring version/chunkSize must be 1/8');
  need(typeof value.sourcePath==='string'&&value.sourcePath.length>0,'district sourcePath is required');
  need(value.provider&&typeof value.provider.id==='string'&&Number.isInteger(value.provider.worldRevision),'district provider metadata is required');
  need(value.landscape&&typeof value.landscape.planId==='string'&&Number.isInteger(value.landscape.revision),'district landscape metadata is required');
  need(value.district&&typeof value.district.id==='string'&&Array.isArray(value.district.padIds),'district identity/padIds are required');
  need(value.building&&typeof value.building.sourcePath==='string'&&typeof value.building.bundlePath==='string'&&typeof value.building.definitionId==='string','district building pair is required');
  return errors;
}
function validateDistrictBundle(value){
  const errors=[];const need=(ok,msg)=>{if(!ok)errors.push(msg);};
  need(value&&typeof value==='object'&&!Array.isArray(value),'district bundle must be an object');if(!value)return errors;
  need(value.schema==='crafted-realm-world-v2-district-bundle-v1','unexpected district bundle schema');
  need(value.version===1&&value.chunkSize===8,'district bundle version/chunkSize must be 1/8');
  need(value.source&&typeof value.source.path==='string','district bundle source.path is required');
  need(value.provider&&typeof value.provider.id==='string'&&Number.isInteger(value.provider.worldRevision),'district bundle provider metadata is required');
  need(value.landscape&&value.landscape.district&&Array.isArray(value.landscape.pads)&&Array.isArray(value.landscape.routes),'district landscape features are required');
  need(value.building&&typeof value.building.sourcePath==='string'&&typeof value.building.bundlePath==='string','district building references are required');
  need(Array.isArray(value.chunks)&&value.chunks.length>0,'district chunks are required');
  need(value.navigation&&Array.isArray(value.navigation.walkSurfaces)&&Array.isArray(value.navigation.collisionRows),'district navigation rows are required');
  return errors;
}
function validateBytes(rel,bytes){
  if(!rel.toLowerCase().endsWith('.json'))return [];
  let value;try{value=JSON.parse(bytes.toString('utf8'));}catch(e){return ['invalid JSON: '+e.message];}
  if(value&&/^crafted-realm-world-v2-terrain-district-(authoring|bundle)-v1$/.test(value.schema))return require('./studio_terrain_validation.js').validate(value);
  if(value&&value.schema==='crafted-realm-world-v2-authoring-v1')return validateAuthoring(value);
  if(value&&value.schema==='crafted-realm-world-v2-building-bundle-v1')return validateBundle(value);
  if(value&&value.schema==='crafted-realm-world-v2-district-authoring-v1')return validateDistrictAuthoring(value);
  if(value&&value.schema==='crafted-realm-world-v2-district-bundle-v1')return validateDistrictBundle(value);
  return [];
}
function validateWorkspaceSet(workspace,m){
  const json={};m.targets.filter(t=>t.path.toLowerCase().endsWith('.json')).forEach(t=>{
    const file=inside(path.join(workspace,'working'),t.path);if(fs.existsSync(file))json[t.path]=readJson(file);
  });
  Object.entries(json).forEach(([rel,value])=>{
    if(!value||!/^crafted-realm-world-v2-terrain-district-(authoring|bundle)-v1$/.test(value.schema))return;
    const isSource=value.schema.endsWith('authoring-v1');
    const sourcePath=normalizeRelative(isSource?value.sourcePath:value.source.path);
    const source=json[sourcePath];
    const pairs=Object.entries(json).filter(([,b])=>b&&b.schema==='crafted-realm-world-v2-terrain-district-bundle-v1'&&b.source&&b.source.path===sourcePath);
    if(!source||source.schema!=='crafted-realm-world-v2-terrain-district-authoring-v1'||pairs.length!==1)
      throw new Error(rel+': terrain district source and exactly one bundle must be registered together');
    if(isSource&&sourcePath!==rel)throw new Error(rel+': terrain district source path drifted');
    const errors=require('./studio_terrain_validation.js').validate(pairs[0][1],source);
    if(errors.length)throw new Error(rel+': '+errors.join('; '));
  });
  Object.entries(json).forEach(([bundlePath,bundle])=>{
    if(!bundle||bundle.schema!=='crafted-realm-world-v2-building-bundle-v1')return;
    const sourcePath=normalizeRelative(bundle.source.path),source=json[sourcePath];
    if(!m.targets.some(t=>t.path===sourcePath))throw new Error(bundlePath+': source is not registered in this workspace: '+sourcePath);
    if(!source||source.schema!=='crafted-realm-world-v2-authoring-v1')throw new Error(bundlePath+': source authoring document is missing or invalid');
    if(source.provider.id!==bundle.provider.id||source.provider.worldRevision!==bundle.provider.worldRevision)throw new Error(bundlePath+': provider metadata drifted from '+sourcePath);
    const objects={};(bundle.chunks||[]).forEach(ch=>(ch.layers&&ch.layers.objects||[]).forEach(o=>{objects[o.id]=o;}));
    if(source.placements.length!==Object.keys(objects).length)throw new Error(bundlePath+': placement count drifted from '+sourcePath);
    source.placements.forEach(p=>{
      const o=objects[p.id];
      if(!o||o.asset!==p.asset||o.buildingDef!==p.definitionId||o.x!==p.x||o.z!==p.z||o.rot!==p.rot||o.yOffset!==p.yOffset)
        throw new Error(bundlePath+': placement '+p.id+' drifted from '+sourcePath);
    });
  });
  Object.entries(json).forEach(([bundlePath,bundle])=>{
    if(!bundle||bundle.schema!=='crafted-realm-world-v2-district-bundle-v1')return;
    const sourcePath=normalizeRelative(bundle.source.path),source=json[sourcePath];
    if(!m.targets.some(t=>t.path===sourcePath))throw new Error(bundlePath+': district source is not registered: '+sourcePath);
    if(!source||source.schema!=='crafted-realm-world-v2-district-authoring-v1')throw new Error(bundlePath+': district source is missing or invalid');
    if(source.provider.id!==bundle.provider.id||source.provider.worldRevision!==bundle.provider.worldRevision)throw new Error(bundlePath+': district provider metadata drifted');
    if(source.district.id!==bundle.landscape.district.id)throw new Error(bundlePath+': district identity drifted');
    const buildingSource=normalizeRelative(source.building.sourcePath),buildingBundle=normalizeRelative(source.building.bundlePath);
    if(!m.targets.some(t=>t.path===buildingSource)||!m.targets.some(t=>t.path===buildingBundle))throw new Error(bundlePath+': referenced building pair is not fully registered');
    if(!json[buildingSource]||!json[buildingBundle])throw new Error(bundlePath+': referenced building pair is missing');
    if(bundle.building.sourcePath!==buildingSource||bundle.building.bundlePath!==buildingBundle)throw new Error(bundlePath+': building pair references drifted');
    const placement=json[buildingSource].placements&&json[buildingSource].placements.find(p=>p.definitionId===source.building.definitionId);
    if(!placement||placement.x!==bundle.building.placement.x||placement.z!==bundle.building.placement.z||placement.rot!==bundle.building.placement.rot||placement.yOffset!==bundle.building.placement.yOffset)
      throw new Error(bundlePath+': district building placement drifted from '+buildingSource);
  });
}
function init(repoRoot,id,targets){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id);
  if(fs.existsSync(manifestPath(workspace)))throw new Error('workspace already exists: '+id);
  const rows=[...new Set(targets.map(normalizeRelative))].sort().map(rel=>{
    const live=inside(root,rel),exists=fs.existsSync(live),bytes=exists?readBytes(live):null;
    if(exists){
      const errors=validateBytes(rel,bytes);if(errors.length)throw new Error(rel+': '+errors.join('; '));
      const source=inside(path.join(workspace,'source'),rel),working=inside(path.join(workspace,'working'),rel);
      ensureDir(path.dirname(source));ensureDir(path.dirname(working));fs.copyFileSync(live,source);fs.copyFileSync(live,working);
    }
    return {path:rel,existed:exists,baseHash:bytes?sha256(bytes):null};
  });
  const manifest={schema:SCHEMA,version:1,id:cleanId(id),repoRoot:root,createdAt:new Date().toISOString(),targets:rows};
  writeJson(manifestPath(workspace),manifest);ensureDir(path.join(workspace,'exports'));ensureDir(path.join(workspace,'backups'));ensureDir(path.join(workspace,'receipts'));ensureDir(path.join(workspace,'journals'));
  return {workspace,manifest};
}
function targetRow(m,rel){
  const safe=normalizeRelative(rel),row=m.targets.find(t=>t.path===safe);if(!row)throw new Error('target is not registered in workspace: '+safe);return row;
}
function stage(repoRoot,id,target,inputFile){
  const workspace=workspaceRoot(repoRoot,id),m=loadManifest(workspace),row=targetRow(m,target),bytes=readBytes(path.resolve(inputFile));
  const errors=validateBytes(row.path,bytes);if(errors.length)throw new Error(row.path+': '+errors.join('; '));
  const out=inside(path.join(workspace,'working'),row.path);ensureDir(path.dirname(out));fs.writeFileSync(out,bytes);
  return {workspace,target:row.path,hash:sha256(bytes),bytes:bytes.length};
}
function collect(workspace,m){
  const files=m.targets.map(row=>{
    const working=inside(path.join(workspace,'working'),row.path);
    if(!fs.existsSync(working))throw new Error('working target is missing (deletion is deliberately unsupported): '+row.path);
    const bytes=readBytes(working),errors=validateBytes(row.path,bytes);
    if(errors.length)throw new Error(row.path+': '+errors.join('; '));
    return {path:row.path,baseHash:row.baseHash,hash:sha256(bytes),bytes:bytes.length,changed:sha256(bytes)!==row.baseHash};
  });validateWorkspaceSet(workspace,m);return files;
}
function exportWorkspace(repoRoot,id){
  const workspace=workspaceRoot(repoRoot,id),m=loadManifest(workspace),files=collect(workspace,m),changed=files.filter(f=>f.changed);
  if(!changed.length)return {workspace,noChanges:true,files};
  const identity={schema:EXPORT_SCHEMA,version:1,workspaceId:m.id,files:changed.map(f=>({path:f.path,baseHash:f.baseHash,hash:f.hash,bytes:f.bytes}))};
  const exportId=sha256(Buffer.from(stableJson(identity))).slice(0,16),dir=path.join(workspace,'exports',exportId);
  if(!fs.existsSync(dir)){
    changed.forEach(f=>{const out=inside(path.join(dir,'files'),f.path);ensureDir(path.dirname(out));fs.copyFileSync(inside(path.join(workspace,'working'),f.path),out);});
    writeJson(path.join(dir,'manifest.json'),Object.assign({},identity,{exportId}));
  }
  return {workspace,exportId,dir,files:changed,noChanges:false};
}
function plan(repoRoot,id,exportId){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id),m=loadManifest(workspace);
  const exp=exportId||exportWorkspace(root,id).exportId;if(!exp)return {ok:true,noChanges:true,files:[]};
  const manifest=readJson(path.join(workspace,'exports',exp,'manifest.json'));
  if(manifest.schema!==EXPORT_SCHEMA||manifest.workspaceId!==m.id)throw new Error('export does not belong to this workspace');
  const files=manifest.files.map(f=>{
    targetRow(m,f.path);
    const packed=inside(path.join(workspace,'exports',exp,'files'),f.path),packedHash=hashFile(packed),live=inside(root,f.path),liveHash=hashFile(live);
    const errors=packedHash===f.hash?[]:['packed file hash does not match manifest'];
    if(liveHash!==f.baseHash)errors.push('live file changed since workspace snapshot');
    return Object.assign({},f,{liveHash,ok:errors.length===0,errors});
  });
  return {ok:files.every(f=>f.ok),noChanges:false,workspace,exportId:exp,files};
}
function withLock(repoRoot,fn){
  const lock=path.join(path.resolve(repoRoot),'.studio-publish.lock');let fd;
  try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));return fn();}
  finally{if(fd!==undefined)fs.closeSync(fd);if(fd!==undefined&&fs.existsSync(lock))fs.unlinkSync(lock);}
}
function loadJournal(workspace){
  const file=journalPath(workspace);if(!fs.existsSync(file))return null;
  const journal=readJson(file);
  if(journal.schema!==JOURNAL_SCHEMA||journal.version!==1||!Array.isArray(journal.files))throw new Error('unsupported or corrupt publish journal');
  return journal;
}
function assertNoPendingJournal(workspace){
  const journal=loadJournal(workspace);
  if(journal)throw new Error('unfinished publish '+journal.id+' requires recovery; run the recover command before publishing again');
}
function restoreJournalFiles(root,workspace,journal){
  journal.files.forEach(f=>{
    const live=inside(root,f.path),liveHash=hashFile(live);
    if(liveHash!==f.beforeHash&&liveHash!==f.installedHash)throw new Error('recovery refused; live file diverged during interrupted publish: '+f.path);
  });
  journal.files.forEach(f=>{
    const live=inside(root,f.path),liveHash=hashFile(live);if(liveHash===f.beforeHash)return;
    if(f.beforeExisted){
      const backup=inside(path.join(workspace,'backups',journal.id),f.path);
      if(hashFile(backup)!==f.beforeHash)throw new Error('recovery backup failed verification: '+f.path);
      ensureDir(path.dirname(live));fs.copyFileSync(backup,live);syncFile(live);
    }else if(fs.existsSync(live))fs.unlinkSync(live);
    if(hashFile(live)!==f.beforeHash)throw new Error('post-recovery verification failed: '+f.path);
  });
}
function apply(repoRoot,id,exportId){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id);
  return withLock(root,()=>{
    assertNoPendingJournal(workspace);
    const preview=plan(root,id,exportId);if(preview.noChanges)return preview;if(!preview.ok)throw new Error('publish refused: '+preview.files.filter(f=>!f.ok).map(f=>f.path+' ('+f.errors.join(', ')+')').join('; '));
    const receiptId='apply-'+timestamp()+'-'+preview.exportId,backupRoot=path.join(workspace,'backups',receiptId),receiptFiles=[];
    preview.files.forEach(f=>{
      const live=inside(root,f.path),existed=fs.existsSync(live);
      if(existed){const backup=inside(backupRoot,f.path);ensureDir(path.dirname(backup));fs.copyFileSync(live,backup);if(hashFile(backup)!==f.liveHash)throw new Error('pre-publish backup verification failed: '+f.path);}
      receiptFiles.push({path:f.path,beforeExisted:existed,beforeHash:f.liveHash,installedHash:f.hash});
    });
    const journal={schema:JOURNAL_SCHEMA,version:1,id:receiptId,workspaceId:id,exportId:preview.exportId,createdAt:new Date().toISOString(),phase:'prepared',files:receiptFiles};
    writeJsonAtomic(journalPath(workspace),journal);
    const installed=[];
    try{
      journal.phase='installing';writeJsonAtomic(journalPath(workspace),journal);
      preview.files.forEach(f=>{
        const live=inside(root,f.path),packed=inside(path.join(workspace,'exports',preview.exportId,'files'),f.path);
        ensureDir(path.dirname(live));fs.copyFileSync(packed,live);syncFile(live);installed.push(f.path);
        if(hashFile(live)!==f.hash)throw new Error('post-publish verification failed: '+f.path);
      });
      journal.phase='installed';journal.installedAt=new Date().toISOString();writeJsonAtomic(journalPath(workspace),journal);
    }catch(error){
      installed.reverse().forEach(rel=>{
        const row=receiptFiles.find(f=>f.path===rel),live=inside(root,rel);
        if(row.beforeExisted){fs.copyFileSync(inside(backupRoot,rel),live);syncFile(live);}else if(fs.existsSync(live))fs.unlinkSync(live);
      });
      if(receiptFiles.every(f=>hashFile(inside(root,f.path))===f.beforeHash)&&fs.existsSync(journalPath(workspace)))fs.unlinkSync(journalPath(workspace));
      throw new Error(error.message+'; installed files were restored from verified backups');
    }
    const receipt={schema:RECEIPT_SCHEMA,version:1,type:'apply',id:receiptId,workspaceId:id,exportId:preview.exportId,createdAt:new Date().toISOString(),files:receiptFiles,rolledBack:false};
    writeJsonAtomic(path.join(workspace,'receipts',receiptId+'.json'),receipt);
    rebase(root,workspace,receiptFiles.map(f=>f.path));
    journal.phase='committed';journal.committedAt=new Date().toISOString();writeJsonAtomic(journalPath(workspace),journal);
    fs.unlinkSync(journalPath(workspace));
    return {ok:true,receiptId,files:receiptFiles};
  });
}
function recover(repoRoot,id){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id);
  return withLock(root,()=>{
    const journal=loadJournal(workspace);if(!journal)return {ok:true,noRecoveryNeeded:true,files:[]};
    if(journal.workspaceId!==id)throw new Error('publish journal belongs to a different workspace');
    if(journal.phase==='committed'){
      journal.files.forEach(f=>{if(hashFile(inside(root,f.path))!==f.installedHash)throw new Error('committed publish cleanup refused; live file diverged: '+f.path);});
      const archive=path.join(workspace,'journals',journal.id+'-committed.json');writeJsonAtomic(archive,journal);fs.unlinkSync(journalPath(workspace));
      return {ok:true,recovered:false,committedCleanup:true,journalId:journal.id,files:journal.files.map(f=>f.path),archive};
    }
    restoreJournalFiles(root,workspace,journal);
    const manifest=loadManifest(workspace);
    journal.files.forEach(f=>{
      const row=targetRow(manifest,f.path),live=inside(root,f.path),source=inside(path.join(workspace,'source'),f.path);
      row.existed=f.beforeExisted;row.baseHash=f.beforeHash;
      if(f.beforeExisted){ensureDir(path.dirname(source));fs.copyFileSync(live,source);}else if(fs.existsSync(source))fs.unlinkSync(source);
    });
    writeJsonAtomic(manifestPath(workspace),manifest);
    const receiptFile=path.join(workspace,'receipts',journal.id+'.json');
    if(fs.existsSync(receiptFile)){
      const receipt=readJson(receiptFile);receipt.rolledBack=true;receipt.rolledBackAt=new Date().toISOString();receipt.recoveredAfterCrash=true;writeJsonAtomic(receiptFile,receipt);
    }
    const recoveredAt=new Date().toISOString(),archive=path.join(workspace,'journals',journal.id+'-recovered.json');
    writeJsonAtomic(archive,Object.assign({},journal,{phase:'recovered',recoveredAt}));
    fs.unlinkSync(journalPath(workspace));
    return {ok:true,recovered:true,journalId:journal.id,files:journal.files.map(f=>f.path),archive};
  });
}
function rebase(repoRoot,workspace,paths){
  const m=loadManifest(workspace);
  paths.forEach(rel=>{
    const row=targetRow(m,rel),live=inside(repoRoot,rel),source=inside(path.join(workspace,'source'),rel),working=inside(path.join(workspace,'working'),rel);
    row.existed=fs.existsSync(live);row.baseHash=hashFile(live);
    [source,working].forEach(dest=>{if(row.existed){ensureDir(path.dirname(dest));fs.copyFileSync(live,dest);}else if(fs.existsSync(dest))fs.unlinkSync(dest);});
  });
  writeJsonAtomic(manifestPath(workspace),m);
}
function latestApply(workspace){
  const dir=path.join(workspace,'receipts');if(!fs.existsSync(dir))return null;
  return fs.readdirSync(dir).filter(n=>n.endsWith('.json')).map(n=>({n,r:readJson(path.join(dir,n))}))
    .filter(x=>x.r.type==='apply'&&!x.r.rolledBack).sort((a,b)=>b.r.createdAt.localeCompare(a.r.createdAt))[0]||null;
}
function rollback(repoRoot,id){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id);
  return withLock(root,()=>{
    assertNoPendingJournal(workspace);
    const hit=latestApply(workspace);if(!hit)throw new Error('no applied publish is available to roll back');const receipt=hit.r;
    receipt.files.forEach(f=>{if(hashFile(inside(root,f.path))!==f.installedHash)throw new Error('rollback refused; live file changed after publish: '+f.path);});
    const rollbackId='rollback-'+timestamp(),safety=path.join(workspace,'backups',rollbackId);
    receipt.files.forEach(f=>{
      const live=inside(root,f.path),safetyFile=inside(safety,f.path);ensureDir(path.dirname(safetyFile));fs.copyFileSync(live,safetyFile);
      if(hashFile(safetyFile)!==f.installedHash)throw new Error('rollback safety backup failed verification: '+f.path);
    });
    const restored=[];
    try{
      receipt.files.forEach(f=>{
        const live=inside(root,f.path);
        if(f.beforeExisted){const old=inside(path.join(workspace,'backups',receipt.id),f.path);if(hashFile(old)!==f.beforeHash)throw new Error('rollback backup failed verification: '+f.path);ensureDir(path.dirname(live));fs.copyFileSync(old,live);}
        else if(fs.existsSync(live))fs.unlinkSync(live);
        restored.push(f.path);if(hashFile(live)!==f.beforeHash)throw new Error('post-rollback verification failed: '+f.path);
      });
    }catch(error){
      restored.reverse().forEach(rel=>fs.copyFileSync(inside(safety,rel),inside(root,rel)));
      throw new Error(error.message+'; installed state was restored from rollback safety backups');
    }
    receipt.rolledBack=true;receipt.rolledBackAt=new Date().toISOString();writeJson(path.join(workspace,'receipts',hit.n),receipt);
    writeJson(path.join(workspace,'receipts',rollbackId+'.json'),{schema:RECEIPT_SCHEMA,version:1,type:'rollback',id:rollbackId,workspaceId:id,applyReceiptId:receipt.id,createdAt:new Date().toISOString(),files:receipt.files});
    rebase(root,workspace,receipt.files.map(f=>f.path));return {ok:true,rollbackId,applyReceiptId:receipt.id,files:receipt.files};
  });
}
function status(repoRoot,id){
  const root=path.resolve(repoRoot),workspace=workspaceRoot(root,id),m=loadManifest(workspace),files=collect(workspace,m).map(f=>{
    const liveHash=hashFile(inside(root,f.path));return Object.assign({},f,{liveHash,liveMatchesBase:liveHash===f.baseHash});
  }),journal=loadJournal(workspace);return {workspace,id:m.id,files,clean:!journal&&files.every(f=>!f.changed&&f.liveMatchesBase),pendingRecovery:journal?{id:journal.id,phase:journal.phase,createdAt:journal.createdAt,files:journal.files.map(f=>f.path)}:null};
}

module.exports={SCHEMA,EXPORT_SCHEMA,RECEIPT_SCHEMA,JOURNAL_SCHEMA,stableJson,sha256,normalizeRelative,inside,validateAuthoring,validateBundle,validateDistrictAuthoring,validateDistrictBundle,init,stage,status,exportWorkspace,plan,apply,recover,rollback};
