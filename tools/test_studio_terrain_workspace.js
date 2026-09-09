#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),vm=require('vm'),assert=require('assert');
const W=require('./studio_workspace.js');
const context={console:{log(){}}};vm.createContext(context);
['holm_landscape_data.js','world_v2_terrain_district.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src',file),'utf8'),context,{filename:file}));
const T=context.WorldV2TerrainDistrict,source=T.source(),bundle=T.compile(source);
const sourcePath=source.sourcePath,bundlePath=sourcePath.replace(/\.json$/,'.bundle.json');
const bytes=value=>JSON.stringify(value,null,2)+'\n',copy=value=>JSON.parse(JSON.stringify(value));
const tempRoot=fs.realpathSync(os.tmpdir());
const root=fs.mkdtempSync(path.join(tempRoot,'cr-studio-terrain-test-'));
let locks=0;
function test(name,fn){fn();locks++;console.log('  ok '+name);}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);return file;}
function absolute(repo,rel){return path.join(repo,...rel.split('/'));}
function fixture(name,targets){const repo=path.join(root,name);fs.mkdirSync(repo);const created=W.init(repo,'terrain',targets);return {repo,workspace:created.workspace};}
function stage(f,rel,value){W.stage(f.repo,'terrain',rel,write(path.join(f.repo,'candidate.json'),bytes(value)));}
try{
  test('unpaired terrain source refuses export',()=>{const f=fixture('source-only',[sourcePath]);stage(f,sourcePath,source);assert.throws(()=>W.exportWorkspace(f.repo,'terrain'),/registered together/);});
  test('unpaired terrain bundle refuses export',()=>{const f=fixture('bundle-only',[bundlePath]);stage(f,bundlePath,bundle);assert.throws(()=>W.exportWorkspace(f.repo,'terrain'),/registered together/);});
  test('registered pair with unstaged missing bundle refuses export',()=>{const f=fixture('missing-bundle',[sourcePath,bundlePath]);stage(f,sourcePath,source);assert.throws(()=>W.exportWorkspace(f.repo,'terrain'),/working target is missing/);});
  test('registered pair with unstaged missing source refuses export',()=>{const f=fixture('missing-source',[sourcePath,bundlePath]);stage(f,bundlePath,bundle);assert.throws(()=>W.exportWorkspace(f.repo,'terrain'),/working target is missing/);});
  test('canonical source filed under a wrong path refuses export',()=>{const wrong='assets/world/authoring/wrong-source.json',f=fixture('wrong-path',[wrong,bundlePath]);stage(f,wrong,source);stage(f,bundlePath,bundle);assert.throws(()=>W.exportWorkspace(f.repo,'terrain'),/registered together|source path drifted/);});
  test('bundle source path drift cannot be staged',()=>{const f=fixture('wrong-reference',[sourcePath,bundlePath]),bad=copy(bundle);bad.source.path='assets/world/authoring/wrong.json';assert.throws(()=>stage(f,bundlePath,bad),/canonical compiled/);});
  test('malformed and modified navigation cannot stage or overwrite valid draft',()=>{
    const f=fixture('bad-navigation',[sourcePath,bundlePath]);stage(f,sourcePath,source);stage(f,bundlePath,bundle);
    const working=absolute(path.join(f.workspace,'working'),bundlePath),original=fs.readFileSync(working,'utf8');
    for(const mutate of [b=>delete b.navigation,b=>b.navigation=null,b=>b.navigation.blockMask=0,b=>b.navigation.movement='diagonal',b=>b.navigation.walkSurfaces.push({id:'unauthorized'}),b=>b.chunks[0].tileFlags.push({x:0,z:0,mask:1})]){
      const bad=copy(bundle);mutate(bad);assert.throws(()=>stage(f,bundlePath,bad),/canonical compiled/);assert.strictEqual(fs.readFileSync(working,'utf8'),original);
    }
  });
  test('valid new pair exports deterministically, plans green and applies exact bytes cleanly',()=>{
    const f=fixture('publish-new',[sourcePath,bundlePath]);stage(f,sourcePath,source);stage(f,bundlePath,bundle);
    assert(!fs.existsSync(absolute(f.repo,sourcePath))&&!fs.existsSync(absolute(f.repo,bundlePath)));
    const exp=W.exportWorkspace(f.repo,'terrain');assert.strictEqual(exp.files.length,2);assert.strictEqual(W.exportWorkspace(f.repo,'terrain').exportId,exp.exportId);
    const plan=W.plan(f.repo,'terrain',exp.exportId);assert(plan.ok);assert.strictEqual(plan.files.length,2);
    const applied=W.apply(f.repo,'terrain',exp.exportId);assert(applied.receiptId);
    assert.strictEqual(fs.readFileSync(absolute(f.repo,sourcePath),'utf8'),bytes(source));assert.strictEqual(fs.readFileSync(absolute(f.repo,bundlePath),'utf8'),bytes(bundle));
    assert(W.status(f.repo,'terrain').clean);assert(W.exportWorkspace(f.repo,'terrain').noChanges);
    const rolled=W.rollback(f.repo,'terrain');assert(rolled.ok);
    assert(!fs.existsSync(absolute(f.repo,sourcePath))&&!fs.existsSync(absolute(f.repo,bundlePath)));
  });
  test('existing pair rollback restores original bytes exactly',()=>{
    const repo=path.join(root,'publish-existing');fs.mkdirSync(repo);
    const beforeSource=JSON.stringify(source),beforeBundle=JSON.stringify(bundle);
    write(absolute(repo,sourcePath),beforeSource);write(absolute(repo,bundlePath),beforeBundle);
    const created=W.init(repo,'terrain',[sourcePath,bundlePath]),f={repo,workspace:created.workspace};stage(f,sourcePath,source);stage(f,bundlePath,bundle);
    const exp=W.exportWorkspace(repo,'terrain');assert(W.plan(repo,'terrain',exp.exportId).ok);W.apply(repo,'terrain',exp.exportId);assert(W.status(repo,'terrain').clean);
    assert(W.rollback(repo,'terrain').ok);assert.strictEqual(fs.readFileSync(absolute(repo,sourcePath),'utf8'),beforeSource);assert.strictEqual(fs.readFileSync(absolute(repo,bundlePath),'utf8'),beforeBundle);
  });
  console.log('[studio-terrain-workspace] '+locks+'/'+locks+' locks passed');
}finally{
  // Only remove the exact mkdtemp-created directory after resolving containment.
  const resolved=fs.realpathSync(root),relative=path.relative(tempRoot,resolved);
  assert(relative&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));
  assert(path.dirname(resolved)===tempRoot&&path.basename(resolved).startsWith('cr-studio-terrain-test-'));
  fs.rmSync(resolved,{recursive:true,force:true});
}
