#!/usr/bin/env node
/* Leaded, tinted glazing on the island's buildings (owner review 4, 2026-09-27: "leaded, slightly tinted glazing on every
 * building's windows"). One command per building spec in docs/rebuild/holm-overhaul/review4/glazing/<id>.json:
 *  1. the Blender recipe (tools/blender/glaze_holm_windows.py) on the building's textured .blend -> a NEW workspace;
 *  2. the superset proof (tools/compare_glb_superset.js): every node of the model the island loads is kept with its
 *     parent, extras, rest transform, triangles and animation keys; the only new nodes are the glazing's own;
 *  3. the building's graph measured again on the new bytes with its own measuring tool, into a NEW workspace
 *     holm-<id>-review4-navigation-v1 (the general extractor on a copy of its v2-land spec; the bakehouse's own extractor
 *     through tools/blender/relock_with_swapped_paths.py), and proved identical to the graph the island uses now
 *     (nodes, links, profiles, targets, climbs, start) apart from the model hash;
 *  4. the registry (docs/rebuild/holm-overhaul/v2land.json) repointed to the new model and graph.
 * Stops on the first failed proof. One Blender at a time. Run: node tools/glaze_holm_buildings_review4.js [id ...] */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),abs=p=>path.join(ROOT,p),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const DIR='docs/rebuild/holm-overhaul/review4/glazing',REG='docs/rebuild/holm-overhaul/v2land.json';
const BLENDER=v=>'C:/Program Files/Blender Foundation/Blender '+v+'/blender.exe';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const LOG=abs('scratchpad/holm_review4/glazing');fs.mkdirSync(LOG,{recursive:true});
function run(cmd,args,log){const r=cp.spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',maxBuffer:256*1024*1024,windowsHide:true});
 if(log)fs.writeFileSync(log,(r.stdout||'')+'\n'+(r.stderr||''));
 if(r.status!==0)throw Error(path.basename(cmd)+' '+args.slice(0,5).join(' ')+' failed ('+r.status+')'+(log?' see '+log:'\n'+(r.stdout||'').slice(-3000)+(r.stderr||'').slice(-3000)));return r.stdout}
const same=(a,b)=>['nodes','links','profiles','targets','climbs','startId'].every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
const want=process.argv.slice(2),ids=fs.readdirSync(abs(DIR)).filter(f=>/^[a-z]+\.json$/.test(f)).map(f=>f.slice(0,-5)).filter(id=>!want.length||want.includes(id));
const results={};
for(const id of ids){
 const spec=read(DIR+'/'+id+'.json'),reg=read(REG),entry=(reg.buildings||reg)[id];
 if(entry.model!==spec.reference)throw Error(id+': the island loads '+entry.model+', not the spec reference '+spec.reference);
 // 1. glaze
 const out=run(BLENDER(spec.blender),['-b',spec.source,'--python-exit-code','1','--python','tools/blender/glaze_holm_windows.py','--',DIR+'/'+id+'.json'],path.join(LOG,id+'.glaze.log'));
 const line=out.split(/\r?\n/).find(l=>l.startsWith('[GLAZE] {'));if(!line)throw Error(id+': no glazing result');
 const g=JSON.parse(line.slice(8));
 (spec.copy||[]).forEach(([x,y])=>{fs.mkdirSync(path.dirname(abs(y)),{recursive:true});fs.copyFileSync(abs(x),abs(y))});   // side files a measuring tool expects beside the model
 // 2. superset proof
 const proof=JSON.parse(run(process.execPath,['tools/compare_glb_superset.js',spec.reference,spec.outGlb,spec.added]));
 // 3. graph on the new bytes
 const ws='holm-'+(id==='bakehouse'?'kitchen':id)+'-review4-navigation-v'+(spec.graphVersion||1),outDir='.studio-workspaces/'+ws+'/candidates';
 if(spec.relock){const a={script:spec.relock.script,replace:spec.relock.replace.concat([[spec.relock.outFrom,ws+'/candidates']])};
  const f=DIR+'/'+id+'.relock.json';fs.writeFileSync(abs(f),JSON.stringify(a,null,1)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/relock_with_swapped_paths.py','--',f],path.join(LOG,id+'.nav.log'))}
 else{const s=read('docs/rebuild/holm-overhaul/buildings/'+id+'-v2land.nav.json');s.model=spec.outGlb;s.out=outDir;
  s.note=(s.note||'')+' | owner review 4 (2026-09-27): measured again on the glazed model';const f=DIR+'/'+id+'.nav.json';fs.writeFileSync(abs(f),JSON.stringify(s)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/extract_holm_building_navigation.py','--',f],path.join(LOG,id+'.nav.log'))}
 const before=read('.studio-workspaces/'+entry.graph+'/candidates/navigation.json'),after=read(outDir+'/navigation.json');
 if(after.modelSha256!==sha(spec.outGlb))throw Error(id+': the new graph does not lock the glazed model');
 if(!same(before,after))throw Error(id+': the graph measured on the glazed model differs from '+entry.graph);
 // 4. registry
 const r2=read(REG),e=(r2.buildings||r2)[id];
 Object.assign(e,{graph:ws,model:spec.outGlb,nodes:after.nodes.length,modelSha256:after.modelSha256,measuredAt:new Date().toISOString(),
  glazing:'owner review 4 (2026-09-27): leaded, tinted glazing ('+DIR+'/'+id+'.json); graph identical to '+entry.graph+' apart from the model hash'});
 fs.writeFileSync(abs(REG),JSON.stringify(r2,null,1)+'\n');
 results[id]={panes:g.panes,recess:g.recess,openings:g.openings,added:proof.added,glb:g.glb,graph:ws,nodes:after.nodes.length,identicalGraph:true};
 console.log('[GLAZE_BUILDING] '+id+' '+JSON.stringify(results[id]));
}
fs.writeFileSync(path.join(LOG,'results.json'),JSON.stringify(results,null,1)+'\n');
console.log('[GLAZE_BUILDINGS] '+Object.keys(results).length+' ok');
