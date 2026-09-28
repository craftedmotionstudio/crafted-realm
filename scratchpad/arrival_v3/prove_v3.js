// Arrival package v2land-v3 combination proof (2026-09-28). Read-only: compares the content-addressed exports only.
//  A = 533ef7f966cc42a2 (v2land-v2, review 4: Guide House v6, statue v4) - the live pin before v3
//  B = 50c49dbf500f9fc8 (v2land-v2, characters rollout: statue v5, Guide House v5)
//  C = the v3 export (argv[2])
// 1. export manifests: C vs A differ only in the statue (.blend, .glb), its landscape measurement and the compiled package;
//    C vs B: the statue .blend, .glb and the landscape measurement are byte-identical.
// 2. the landscape measurement C vs A differs only under assets.statue; C's statue entry equals B's.
// 3. the compiled package C vs A: every differing path is the statue (object / source hash) or a revision string.
// 4. navigation C vs A identical apart from graphRevision / compatibleGraphRevisions (the check in
//    tools/build_holm_oldschool_candidates.js); C vs B reported too.
// 5. the export loads through HolmArrivalExportLoader (hashes, manifest id, package reconstruction).
// Run: node scratchpad/arrival_v3/prove_v3.js <v3 exportId>
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),WS=path.join(ROOT,'.studio-workspaces');
const V2=path.join(WS,'holm-arrival-package-v2land-v2/exports'),V3=path.join(WS,'holm-arrival-package-v2land-v3/exports');
const A_ID='533ef7f966cc42a2',B_ID='50c49dbf500f9fc8',C_ID=process.argv[2];
if(!/^[0-9a-f]{16}$/.test(C_ID||''))throw Error('usage: node prove_v3.js <v3 exportId>');
const dirA=path.join(V2,A_ID),dirB=path.join(V2,B_ID),dirC=path.join(V3,C_ID);
const man=d=>JSON.parse(fs.readFileSync(path.join(d,'manifest.json'),'utf8'));
const file=(d,p)=>JSON.parse(fs.readFileSync(path.join(d,'files',p),'utf8'));
const out={exports:{A:A_ID,B:B_ID,C:C_ID}},fail=[];
const need=(ok,msg)=>{if(!ok)fail.push(msg)};
const STATUE_FILES=['assets/blender/holm_arrival_statue_oldschool_v1.blend','assets/models/holm_arrival_statue_oldschool_v1.glb'];
const MEASURE='assets/world/authoring/holm-arrival.landscape-measure.json',PKG='assets/world/authoring/holm-arrival.package.json';
// 1 manifests
function cmp(x,y){const X={},Y={};x.files.forEach(f=>X[f.path]=f);y.files.forEach(f=>Y[f.path]=f);const r={same:[],differ:[],onlyFirst:[],onlySecond:[]};
 new Set([...Object.keys(X),...Object.keys(Y)]).forEach(p=>{if(!Y[p])r.onlyFirst.push(p);else if(!X[p])r.onlySecond.push(p);else (X[p].hash===Y[p].hash?r.same:r.differ).push(p)});
 Object.values(r).forEach(a=>a.sort());return r}
const mA=man(dirA),mB=man(dirB),mC=man(dirC);
need(mC.workspaceId==='holm-arrival-package-v2land-v3'&&mC.exportId===C_ID,'v3 manifest identity');
const cA=cmp(mC,mA),cB=cmp(mC,mB);
out.v3VsA={files:mC.files.length,same:cA.same.length,differ:cA.differ,onlyV3:cA.onlyFirst,onlyA:cA.onlySecond};
out.v3VsB={files:mC.files.length,same:cB.same.length,differ:cB.differ,onlyV3:cB.onlyFirst,onlyB:cB.onlySecond,statueFilesIdentical:[...STATUE_FILES,MEASURE].every(p=>cB.same.includes(p))};
need(JSON.stringify(cA.differ)===JSON.stringify([...STATUE_FILES,MEASURE,PKG].sort())&&!cA.onlyFirst.length&&!cA.onlySecond.length,'v3 vs A: only the statue, its measurement and the package may differ: '+JSON.stringify(cA));
need(out.v3VsB.statueFilesIdentical,'v3 vs B: statue .blend/.glb/measurement must be identical');
// 2 landscape measurement
function diff(x,y,p,acc){if(JSON.stringify(x)===JSON.stringify(y))return acc;
 if(x&&y&&typeof x==='object'&&typeof y==='object'){new Set([...Object.keys(x),...Object.keys(y)]).forEach(k=>diff(x[k],y[k],p+(Array.isArray(x)?'['+k+']':'.'+k),acc));return acc}
 acc.push(p);return acc}
const lA=file(dirA,MEASURE),lB=file(dirB,MEASURE),lC=file(dirC,MEASURE);
out.measureV3VsA=diff(lA,lC,'measure',[]);
need(out.measureV3VsA.every(p=>p.startsWith('measure.assets.statue.')),'measurement v3 vs A differs outside the statue');
need(JSON.stringify(lB)===JSON.stringify(lC),'measurement v3 vs B must be identical');
// 3 compiled package
const pA=file(dirA,PKG),pB=file(dirB,PKG),pC=file(dirC,PKG);
const dPkg=diff(pA,pC,'pkg',[]);
const statueObj=pC.objects.findIndex(o=>o.asset&&o.asset.id==='statue'),statueObjA=pA.objects.findIndex(o=>o.asset&&o.asset.id==='statue');
const srcIdx=p=>pC.sources.findIndex(s=>s.path===p);
const allowed=[/^pkg\.navigation\.graphRevision$/,/^pkg\.navigation\.compatibleGraphRevisions/,new RegExp('^pkg\\.objects\\['+statueObj+'\\]\\.'),
 ...[...STATUE_FILES,MEASURE].map(p=>new RegExp('^pkg\\.sources\\['+srcIdx(p)+'\\]\\.sha256$'))];
const unexplained=dPkg.filter(p=>!allowed.some(r=>r.test(p)));
out.packageV3VsA={differingPaths:dPkg,unexplained,statueObjectIndex:[statueObjA,statueObj]};
need(statueObj===statueObjA&&statueObj>=0,'statue object index moved');
need(!unexplained.length,'package v3 vs A: unexplained differences '+JSON.stringify(unexplained));
// the statue object of v3 equals B's statue object (same model, authoring, measurement)
const sB=pB.objects.find(o=>o.asset&&o.asset.id==='statue'),sC=pC.objects[statueObj];
out.packageStatueObjectEqualsB=JSON.stringify(sB)===JSON.stringify(sC);need(out.packageStatueObjectEqualsB,'v3 statue object differs from B');
// the Guide House object of v3 equals A's
const gA=pA.objects.find(o=>o.asset&&o.asset.id==='guide'),gC=pC.objects.find(o=>o.asset&&o.asset.id==='guide');
out.packageGuideObjectEqualsA=JSON.stringify(gA)===JSON.stringify(gC);need(out.packageGuideObjectEqualsA,'v3 guide object differs from A');
out.guideModel=gC.asset.model.path;
// 4 navigation apart from revision strings
const strip=n=>JSON.stringify(n,(k,v)=>['graphRevision','compatibleGraphRevisions'].includes(k)?undefined:v);
out.navigationV3VsA=strip(pA.navigation)===strip(pC.navigation)?'identical apart from graphRevision/compatibleGraphRevisions':'DIFFERENT';
out.navigationV3VsB=strip(pB.navigation)===strip(pC.navigation)?'identical apart from revision strings':'different (B carries the Guide House v5 and its v5 envelopes)';
need(out.navigationV3VsA.startsWith('identical'),'navigation v3 vs A differs');
out.nonObjectSectionsV3VsA=Object.fromEntries(['terrain','spawn','lessonBindings','boundary','provider','schema','version'].map(k=>[k,JSON.stringify(pA[k])===JSON.stringify(pC[k])?'identical':'DIFF']));
Object.entries(out.nonObjectSectionsV3VsA).forEach(([k,v])=>need(v==='identical',k+' differs'));
// 5 the browser loader, in node, on the files
(async()=>{
 const Loader=require(path.join(ROOT,'src/holm_arrival_export_loader.js'));
 const base='http://127.0.0.1/.studio-workspaces/holm-arrival-package-v2land-v3/exports/';
 const fetch=async u=>{const rel=decodeURIComponent(u.slice(base.length+C_ID.length+1));const b=fs.readFileSync(path.join(dirC,rel));
  return {ok:true,redirected:false,url:u,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
 try{const r=await Loader.load({baseUrl:base,exportId:C_ID,fetch,subtle:require('crypto').webcrypto.subtle});
  out.loader={ok:true,objects:r.package.objects.length,files:Object.keys(r.files).length,roles:Object.keys(r.documents).sort()}}
 catch(e){out.loader={ok:false,error:e.message};need(false,'loader: '+e.message)}
 out.ok=!fail.length;out.failures=fail;
 console.log(JSON.stringify(out,null,1));
 console.log('[ARRIVAL V3 PROOF] '+(out.ok?'PASS':'FAIL'));process.exit(out.ok?0:1);
})();
