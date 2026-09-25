#!/usr/bin/env node
/* One command for the old-school textured candidates (world look pass 2026-09-25): rebuild the texture kit, run the
 * Blender texturing recipe for every spec in docs/rebuild/holm-overhaul/oldschool/*.textures.json, prove each GLB kept
 * its source's structure and geometry (tools/compare_glb_structure.js), re-lock what hashes the model bytes:
 *  - buildings with a measured stance graph: re-measure it on the new GLB (extract_holm_building_navigation.py) and
 *    prove the graph is node-identical to the reference apart from modelSha256;
 *  - the Guide House: re-stage the arrival package (tools/stage_holm_arrival_package_oldschool.js, Safe Publish
 *    export) and prove its navigation is identical to v9's apart from the source-hash revision strings;
 * then write the new arrival export id into src/holm_oldschool_look.js. Stops on the first failed proof.
 * Run: node tools/build_holm_oldschool_candidates.js [spec-name ...]   (default: every spec) */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'docs/rebuild/holm-overhaul/oldschool');
const BLENDER=v=>'C:/Program Files/Blender Foundation/Blender '+v+'/blender.exe';
function run(cmd,args,opts){const r=cp.spawnSync(cmd,args,Object.assign({cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true},opts||{}));
 if(r.status!==0){console.error(r.stdout&&r.stdout.slice(-3000),r.stderr&&r.stderr.slice(-3000));throw Error(path.basename(cmd)+' '+args.slice(0,3).join(' ')+' failed ('+r.status+')')}return r.stdout}
const json=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
const only=process.argv.slice(2),specs=fs.readdirSync(DIR).filter(f=>f.endsWith('.textures.json')&&(!only.length||only.some(o=>f.startsWith(o))));
run(process.execPath,['tools/build_oldschool_textures.js']);console.log('kit rebuilt');
const results={};
for(const f of specs){
 const rel='docs/rebuild/holm-overhaul/oldschool/'+f,spec=json(rel),blend=BLENDER(spec.blender||'4.5');
 const out=run(blend,['-b',spec.source,'--python','tools/blender/apply_oldschool_textures.py','--',rel]);
 const line=out.split(/\r?\n/).find(l=>l.startsWith('[OLDSCHOOL TEXTURES]'));if(!line)throw Error('no recipe result for '+f);
 const cmp=JSON.parse(run(process.execPath,['tools/compare_glb_structure.js',spec.reference,spec.outGlb]));
 if(!cmp.identicalStructureAndGeometry)throw Error(f+': structure/geometry changed '+JSON.stringify(cmp.issues));
 const r=results[f]={glb:JSON.parse(line.slice(21)).glb,textured:cmp.b.texturedMaterials,primitivesWithUV:cmp.b.primsWithUV};
 if(spec.navigation){
  run(blend,['-b','--python','tools/blender/extract_holm_building_navigation.py','--',spec.navigation.spec]);
  const navSpec=json(spec.navigation.spec),a=json(spec.navigation.reference),b=json(navSpec.out+'/navigation.json');
  const strip=n=>JSON.stringify(n,(k,v)=>k==='modelSha256'?undefined:v);
  if(strip(a)!==strip(b))throw Error(f+': re-measured graph is not node-identical to '+spec.navigation.reference);
  if(b.modelSha256!==r.glb.sha256)throw Error(f+': graph hash does not lock the new model');
  r.navigation={out:navSpec.out,nodes:b.nodes.length,modelSha256:b.modelSha256,nodeIdentical:true};
 }
 if(spec.arrivalPackage){
  const st=run(process.execPath,[spec.arrivalPackage.stage]),m=/"exportId":\s*"([0-9a-f]+)"/.exec(st);if(!m)throw Error('no arrival export id');
  const a=json(spec.arrivalPackage.reference).navigation,b=json(spec.arrivalPackage.candidate).navigation;
  const strip=n=>JSON.stringify(n,(k,v)=>k==='graphRevision'||k==='compatibleGraphRevisions'?undefined:v);
  if(strip(a)!==strip(b))throw Error(f+': arrival navigation differs from the reference package');
  const look=path.join(ROOT,'src/holm_oldschool_look.js');let src=fs.readFileSync(look,'utf8');
  src=src.replace(/(arrival:\{baseUrl:'\/\.studio-workspaces\/holm-arrival-package-oldschool-v1\/exports\/',exportId:')[0-9a-f]*(')/,'$1'+m[1]+'$2');fs.writeFileSync(look,src);
  r.arrivalPackage={exportId:m[1],navigationIdentical:true};
 }
 console.log(f,JSON.stringify(r));
}
console.log('[OLDSCHOOL CANDIDATES] '+JSON.stringify({specs:Object.keys(results).length,ok:true}));
