#!/usr/bin/env node
/* One command for the old-school textured candidates (world look pass 2026-09-25, island rollout 2026-09-26).
 * 1. rebuilds the texture kit (tools/build_oldschool_textures.js);
 * 2. for every spec in docs/rebuild/holm-overhaul/oldschool/*.textures.json: runs the Blender recipe
 *    (tools/blender/apply_oldschool_textures.py) on the source .blend (or imports the source GLB), proves the new GLB
 *    kept the reference's nodes, hierarchy, extras, animation keys and every triangle (tools/compare_glb_structure.js),
 *    copies side files, refreshes copied manifests' hashes, and re-locks whatever hashes the model bytes:
 *     - "navigation": the general building extractor on a copied spec; the graph must be node-identical;
 *     - "extractor": the building's own extractor (bakehouse / lodge) re-run with its folders swapped
 *       (tools/blender/relock_with_swapped_paths.py); the graph must equal the reference apart from "ignore" keys;
 *     - "rehash": when the source .blend no longer matches its exported GLB (the keep), the GLB itself is textured
 *       (spec "import") and the reference graph is carried over with only modelSha256 changed; this is sound because
 *       the structure proof above shows every triangle of the model is unchanged, so every measured stance is too;
 * 3. arrival step (when any "arrival" spec ran, or with the argument "arrival"): re-measures the arrival landscape
 *    models (measure_holm_arrival_landscape_v4.py with the folders swapped; bounds, clips and triangles must equal v4),
 *    stages the arrival package (tools/stage_holm_arrival_package_oldschool.js, Safe Publish export), proves its
 *    navigation equals v9's apart from the source-hash revision strings, and writes the export id into
 *    src/holm_oldschool_look.js.
 * Stops on the first failed proof. Writes scratchpad/holm_look_v1/rollout_build.json.
 * Run: node tools/build_holm_oldschool_candidates.js [spec-name-prefix ...] [arrival] */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),DIR=path.join(ROOT,'docs/rebuild/holm-overhaul/oldschool');
const BLENDER=v=>'C:/Program Files/Blender Foundation/Blender '+v+'/blender.exe';
const TMP=path.join(ROOT,'scratchpad/holm_look_v1');fs.mkdirSync(TMP,{recursive:true});
function run(cmd,args){const r=cp.spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',maxBuffer:256*1024*1024,windowsHide:true});
 if(r.status!==0){console.error((r.stdout||'').slice(-4000),(r.stderr||'').slice(-4000));throw Error(path.basename(cmd)+' '+args.slice(0,4).join(' ')+' failed ('+r.status+')')}return r.stdout}
const abs=f=>path.join(ROOT,f),json=f=>JSON.parse(fs.readFileSync(abs(f),'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(abs(f))).digest('hex');
const strip=(n,keys)=>JSON.stringify(n,(k,v)=>keys.includes(k)?undefined:v);
const args=process.argv.slice(2),wantArrival=args.includes('arrival'),only=args.filter(a=>a!=='arrival');
const specs=fs.readdirSync(DIR).filter(f=>f.endsWith('.textures.json')&&(!only.length||only.some(o=>f.startsWith(o)))).sort();
run(process.execPath,['tools/build_oldschool_textures.js']);console.log('kit rebuilt');
const results={},manifests=new Set();let arrivalTouched=wantArrival;
function relock(blender,script,replace){const a=path.join(TMP,'relock-args.json');fs.writeFileSync(a,JSON.stringify({script,replace}));
 return run(BLENDER(blender),['-b','--python-exit-code','1','--python','tools/blender/relock_with_swapped_paths.py','--',a])}
function refreshManifest(m,glb,blend){
 const j=manifests.has(m.to)?json(m.to):json(m.from),g=path.basename(glb),gs=sha(glb),bs=blend&&fs.existsSync(abs(blend))?sha(blend):null;
 (function walk(o){if(!o||typeof o!=='object')return;if(o.file===g||o.modelFile===g){['sha256','sha256_glb','modelSha256'].forEach(k=>{if(k in o)o[k]=gs});if('sha256_blend' in o&&bs)o.sha256_blend=bs}
  Object.values(o).forEach(walk)})(j);
 if(!Array.isArray(j))j.oldschool={texturedFrom:m.from,recipe:'tools/blender/apply_oldschool_textures.py'};
 fs.mkdirSync(path.dirname(abs(m.to)),{recursive:true});fs.writeFileSync(abs(m.to),JSON.stringify(j,null,2)+'\n');manifests.add(m.to);
}
for(const f of specs){
 const rel='docs/rebuild/holm-overhaul/oldschool/'+f,spec=json(rel),v=spec.blender||'4.5';
 const out=run(BLENDER(v),(spec.import?['-b','--python-exit-code','1']:['-b',spec.source,'--python-exit-code','1']).concat(['--python','tools/blender/apply_oldschool_textures.py','--',rel]));
 const line=out.split(/\r?\n/).find(l=>l.startsWith('[OLDSCHOOL TEXTURES] {'));if(!line)throw Error('no recipe result for '+f+'\n'+out.slice(-2000));
 const cmpRun=cp.spawnSync(process.execPath,['tools/compare_glb_structure.js',spec.reference,spec.outGlb],{cwd:ROOT,encoding:'utf8'});const cmp=JSON.parse(cmpRun.stdout);
 if(!cmp.identicalStructureAndGeometry)throw Error(f+': structure/geometry changed '+JSON.stringify(cmp.issues));
 const r=results[f]={glb:JSON.parse(line.slice(21)).glb,textured:cmp.b.texturedMaterials,primitives:[cmp.a.primitives,cmp.b.primitives]};
 (spec.copy||[]).forEach(([a,b])=>{fs.mkdirSync(path.dirname(abs(b)),{recursive:true});fs.copyFileSync(abs(a),abs(b))});
 if(spec.manifest)refreshManifest(spec.manifest,spec.outGlb,spec.outBlend);
 if(spec.navigation){
  run(BLENDER(v),['-b','--python-exit-code','1','--python','tools/blender/extract_holm_building_navigation.py','--',spec.navigation.spec]);
  const navSpec=json(spec.navigation.spec),a=json(spec.navigation.reference),b=json(navSpec.out+'/navigation.json');
  if(strip(a,['modelSha256'])!==strip(b,['modelSha256']))throw Error(f+': re-measured graph is not node-identical to '+spec.navigation.reference);
  if(b.modelSha256!==r.glb.sha256)throw Error(f+': graph hash does not lock the new model');
  r.navigation={out:navSpec.out,nodes:b.nodes.length,modelSha256:b.modelSha256,nodeIdentical:true};
 }
 if(spec.extractor){const x=spec.extractor;
  relock(v,x.script,x.replace);
  const a=json(x.reference),b=json(x.out+'/navigation.json'),ign=x.ignore||['modelSha256'];
  if(strip(a,ign)!==strip(b,ign))throw Error(f+': re-extracted graph differs from '+x.reference+' outside '+ign.join(','));
  if(b.modelSha256!==r.glb.sha256)throw Error(f+': graph hash does not lock the new model');
  r.navigation={out:x.out,nodes:b.nodes.length,modelSha256:b.modelSha256,identicalApartFrom:ign};
 }
 if(spec.rehash){const x=spec.rehash;fs.mkdirSync(abs(x.out),{recursive:true});
  x.files.forEach(n=>{let t=fs.readFileSync(path.join(abs(x.referenceDir),n),'utf8');
   if(n==='navigation.json'){const g=JSON.parse(t);g.modelSha256=r.glb.sha256;t=JSON.stringify(g)}
   fs.writeFileSync(path.join(abs(x.out),n),t)});
  const a=json(x.referenceDir+'/navigation.json'),b=json(x.out+'/navigation.json');
  if(strip(a,['modelSha256'])!==strip(b,['modelSha256']))throw Error(f+': rehash changed the graph');
  r.navigation={out:x.out,nodes:b.nodes.length,modelSha256:b.modelSha256,rehashedOnIdenticalGeometry:true};
 }
 if(spec.arrival)arrivalTouched=true;
 console.log(f,JSON.stringify(r));
}
if(arrivalTouched){
 // landscape models: the v4 measure, folders swapped; everything but file names and hashes must be equal
 relock('4.5','tools/blender/measure_holm_arrival_landscape_v4.py',[
  ['holm-arrival-garden-v1/candidates','holm-arrival-garden-oldschool-v1/candidates'],['holm-landing-props-v1/candidates','holm-landing-props-oldschool-v1/candidates'],
  ['holm-tree-family-v3/candidates/arrival_oak_v3.glb','holm-tree-family-oldschool-v1/candidates/arrival_oak_v3.glb'],
  ['holm-arrival-landscape-measure-v4/candidates','holm-arrival-landscape-measure-oldschool-v1/candidates']]);
 const m4=json('.studio-workspaces/holm-arrival-landscape-measure-v4/candidates/measured.json'),mo=json('.studio-workspaces/holm-arrival-landscape-measure-oldschool-v1/candidates/measured.json');
 // equal apart from file names, hashes and vertex counts (UV seams split render vertices; triangles must match exactly),
 // numbers within 1e-5 (animation key times round-trip through float32)
 const near=(x,y,p)=>{if(typeof x==='number'&&typeof y==='number'){if(Math.abs(x-y)>1e-5)throw Error('arrival landscape measurement differs at '+p+': '+x+' vs '+y);return}
  if(x&&y&&typeof x==='object'&&typeof y==='object'){const ks=new Set([...Object.keys(x),...Object.keys(y)]);ks.forEach(k=>{if(!['file','sha256','vertices'].includes(k))near(x[k],y[k],p+'.'+k)});return}
  if(x!==y)throw Error('arrival landscape measurement differs at '+p)};
 near(m4,mo,'measured');
 const st=run(process.execPath,['tools/stage_holm_arrival_package_oldschool.js']),m=/"exportId":\s*"([0-9a-f]+)"/.exec(st);if(!m)throw Error('no arrival export id');
 const a=json('.studio-workspaces/holm-arrival-package-v9/candidates/holm-arrival.package.json').navigation,b=json('.studio-workspaces/holm-arrival-package-oldschool-v2/candidates/holm-arrival.package.json').navigation;
 if(strip(a,['graphRevision','compatibleGraphRevisions'])!==strip(b,['graphRevision','compatibleGraphRevisions']))throw Error('arrival navigation differs from v9');
 const look=abs('src/holm_oldschool_look.js');let src=fs.readFileSync(look,'utf8');
 src=src.replace(/(arrival:\{baseUrl:'\/\.studio-workspaces\/)holm-arrival-package-oldschool-v\d+(\/exports\/',exportId:')[0-9a-f]*(')/,'$1holm-arrival-package-oldschool-v2$2'+m[1]+'$3');fs.writeFileSync(look,src);
 results.arrival={exportId:m[1],package:'holm-arrival-package-oldschool-v2',landscapeMeasure:'holm-arrival-landscape-measure-oldschool-v1',navigationIdentical:true};
 console.log('arrival',JSON.stringify(results.arrival));
}
// merged with earlier runs, so a partial rebuild keeps the other assets' results
const summary=path.join(TMP,'rollout_build.json'),prev=fs.existsSync(summary)?JSON.parse(fs.readFileSync(summary,'utf8')):{};
fs.writeFileSync(summary,JSON.stringify(Object.assign(prev,results),null,1)+'\n');
console.log('[OLDSCHOOL CANDIDATES] '+JSON.stringify({specs:specs.length,arrival:!!results.arrival,ok:true}));
