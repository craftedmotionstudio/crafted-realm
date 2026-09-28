#!/usr/bin/env node
/* Props pass (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every building
 * reviewed in Blender"): one building per command, from its spec docs/rebuild/holm-overhaul/props-pass/<id>.json.
 *  1. build: the building's script (tools/blender/build_holm_<id>_props_pass.py) on the .blend of the model the island
 *     loads (proved to re-export that model node for node): the plain-box props taken away, every object designed
 *     again in its old footprint -> an untextured .blend in the NEW workspace's working/ folder;
 *  2. texture: the old-school recipe (tools/blender/apply_oldschool_textures.py) textures the new faces only (their
 *     own vertex-colour material 'Holm props colour', each face's kit texture declared by its author through the
 *     'holm_tex' face attribute) -> <workspace>/candidates/<model>.glb + .blend;
 *  3. proof: tools/compare_glb_props_pass.js - every node the spec does not name is kept exactly (parent, extras,
 *     transform, triangles, animations); only the named props change, only the named parts are new;
 *  4. graph: measured again on the new bytes with the building's own measuring tool (the general extractor on a copy of
 *     its v2-land spec, or its own extractor through relock_with_swapped_paths.py) into a NEW workspace, and proved
 *     identical to the graph the island uses now (nodes, links, profiles, targets, climbs, start) apart from the hash;
 *  5. cutaway: tools/check_holm_cutaway_props.js runs the game's own cutaway rule on the new model: no piece of a new
 *     part may be clipped with the walls while the adventurer is inside (a helm floating over a clipped post);
 *  6. coplanar: tools/blender/check_holm_coplanar.py in the game's views on the old and the new model; no pair of parts
 *     may fight more than it did before (the new pieces fight nothing);
 *  7. registry: docs/rebuild/holm-overhaul/v2land.json repointed to the new model and graph.
 * Stops on the first failed proof. One Blender at a time.
 * Run: node tools/rebuild_holm_props_pass.js <id> [--from step] [--to step] [--no-registry]
 *      steps: build texture proof graph cutaway coplanar registry */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..'),abs=p=>path.join(ROOT,p),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const REG='docs/rebuild/holm-overhaul/v2land.json',BLENDER=v=>'C:/Program Files/Blender Foundation/Blender '+v+'/blender.exe';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const STEPS=['build','texture','proof','graph','cutaway','coplanar','registry'];
const args=process.argv.slice(2),id=args[0];if(!id)throw Error('usage: <id> [--from step] [--to step] [--no-registry]');
const opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null};
const from=STEPS.indexOf(opt('--from')||'build'),to=STEPS.indexOf(opt('--to')||'registry'),noReg=args.includes('--no-registry');
const SPEC='docs/rebuild/holm-overhaul/props-pass/'+id+'.json',spec=read(SPEC);
const LOG=abs('scratchpad/holm_props_pass/'+id);fs.mkdirSync(LOG,{recursive:true});
function run(cmd,a,log){const r=cp.spawnSync(cmd,a,{cwd:ROOT,encoding:'utf8',maxBuffer:256*1024*1024,windowsHide:true});
 if(log)fs.writeFileSync(log,(r.stdout||'')+'\n'+(r.stderr||''));
 if(r.status!==0)throw Error(path.basename(cmd)+' '+a.slice(0,6).join(' ')+' failed ('+r.status+')'+(log?' see '+log:'\n'+(r.stdout||'').slice(-3000)+(r.stderr||'').slice(-3000)));return r.stdout}
const same=(a,b)=>['nodes','links','profiles','targets','climbs','startId'].every(k=>JSON.stringify(a[k])===JSON.stringify(b[k]));
const diff=(a,b)=>['nodes','links','profiles','targets','climbs','startId'].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
const on=s=>STEPS.indexOf(s)>=from&&STEPS.indexOf(s)<=to&&!(s==='registry'&&noReg);
const reg0=read(REG),entry0=(reg0.buildings||reg0)[id];
const result=fs.existsSync(path.join(LOG,'result.json'))?JSON.parse(fs.readFileSync(path.join(LOG,'result.json'),'utf8')):{};
const save=()=>fs.writeFileSync(path.join(LOG,'result.json'),JSON.stringify(result,null,1)+'\n');
// the graph the reference model was measured with (a re-run finds the registry already on the new model)
const refGraph=spec.referenceGraph||entry0.graph,loads=entry0.model.replace(/^\//,'');
if(on('build')&&loads!==spec.reference&&loads!==spec.outGlb)throw Error(id+': the island loads '+entry0.model+', not the spec reference '+spec.reference);
const graphDir='.studio-workspaces/'+spec.graph+'/candidates';
// 0. --baseline (run once per building, before designing): the same measuring setup on the model the island loads now
// must reproduce the graph it uses (nodes, links, profiles, targets, climbs, start); proves the setup, not the props.
// A relock spec names its baseline swaps in relock.baselineReplace.
if(args.includes('--baseline')){const bdir='.studio-workspaces/'+spec.graph+'-baseline/candidates',before=read('.studio-workspaces/'+refGraph+'/candidates/navigation.json');
 if(spec.relock){const f='scratchpad/holm_props_pass/'+id+'/baseline.relock.json';fs.writeFileSync(abs(f),JSON.stringify({script:spec.relock.script,replace:spec.relock.baselineReplace},null,1)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/relock_with_swapped_paths.py','--',f],path.join(LOG,'baseline.log'))}
 else{const s=read(spec.navSpec||'docs/rebuild/holm-overhaul/buildings/'+id+'-v2land.nav.json');s.model=spec.reference;s.out=bdir;const f='scratchpad/holm_props_pass/'+id+'/baseline.nav.json';fs.writeFileSync(abs(f),JSON.stringify(s)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/extract_holm_building_navigation.py','--',f],path.join(LOG,'baseline.log'))}
 const b=read(bdir+'/navigation.json');result.baseline={identical:same(before,b),differs:diff(before,b),refGraph};save();
 console.log('[PROPS_PASS] '+id+' baseline: the measuring setup on '+spec.reference+(result.baseline.identical?' reproduces ':' DOES NOT reproduce ')+refGraph+(result.baseline.identical?'':' ('+result.baseline.differs.join(',')+')'));
 if(!result.baseline.identical)process.exit(1);if(args.includes('--only-baseline'))process.exit(0)}
// 1. build
if(on('build')){const out=run(BLENDER(spec.blender),['-b',spec.source,'--python-exit-code','1','--python',spec.script,'--',SPEC],path.join(LOG,'build.log'));
 const line=out.split(/\r?\n/).find(l=>l.startsWith('[PROPS_PASS_BUILD] {'));if(!line)throw Error(id+': no build result');result.build=JSON.parse(line.slice(19));save();console.log('[PROPS_PASS] '+id+' built '+JSON.stringify(result.build.built))}
// 2. texture (the recipe, on the new faces only)
if(on('texture')){const t={note:'Props pass (2026-09-28): the new props textured old-school; only faces of the props material, each with the kit texture its author declared',
  source:spec.flat,outBlend:spec.outBlend,outGlb:spec.outGlb,report:spec.texReport,blender:spec.blender,reference:spec.reference,
  vertexColour:Object.assign({material:'Holm props colour',faceAttribute:'holm_tex',faceClasses:['','beam','planks','rock','plaster','stone_course','thatch'],woodOnly:'.',maxVariants:3,minShare:0},spec.vertexColour||{})};
 const tf='docs/rebuild/holm-overhaul/props-pass/'+id+'.textures.json';fs.writeFileSync(abs(tf),JSON.stringify(t,null,1)+'\n');
 const out=run(BLENDER(spec.blender),['-b',spec.flat,'--python-exit-code','1','--python','tools/blender/apply_oldschool_textures.py','--',tf],path.join(LOG,'texture.log'));
 (spec.copy||[]).forEach(([x,y])=>{fs.mkdirSync(path.dirname(abs(y)),{recursive:true});fs.copyFileSync(abs(x),abs(y))});
 const line=out.split(/\r?\n/).find(l=>l.startsWith('[OLDSCHOOL TEXTURES]'));result.texture=line?JSON.parse(line.slice(21)):null;save();console.log('[PROPS_PASS] '+id+' textured '+JSON.stringify(result.texture&&result.texture.glb))}
// 3. structure proof
if(on('proof')){const r=cp.spawnSync(process.execPath,['tools/compare_glb_props_pass.js',spec.reference,spec.outGlb,spec.changed,spec.added],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
 const p=JSON.parse(r.stdout);result.proof=p;save();fs.writeFileSync(path.join(LOG,'proof.json'),JSON.stringify(p,null,1)+'\n');
 if(!p.ok)throw Error(id+': structure proof failed '+JSON.stringify(p.issues));console.log('[PROPS_PASS] '+id+' proof ok: kept '+p.kept+', changed '+Object.keys(p.changed).length+', added '+Object.keys(p.added).length)}
// 4. graph on the new bytes
if(on('graph')){const before=read('.studio-workspaces/'+refGraph+'/candidates/navigation.json');
 if(spec.relock){const a={script:spec.relock.script,replace:spec.relock.replace,note:'props pass (2026-09-28): measured on '+spec.outGlb};const f='docs/rebuild/holm-overhaul/props-pass/'+id+'.relock.json';fs.writeFileSync(abs(f),JSON.stringify(a,null,1)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/relock_with_swapped_paths.py','--',f],path.join(LOG,'graph.log'))}
 else{const s=read(spec.navSpec||'docs/rebuild/holm-overhaul/buildings/'+id+'-v2land.nav.json');s.model=spec.outGlb;s.out=graphDir;
  s.note=(s.note||'')+' | props pass (2026-09-28): measured again on the model with its props designed again';const f='docs/rebuild/holm-overhaul/props-pass/'+id+'.nav.json';fs.writeFileSync(abs(f),JSON.stringify(s)+'\n');
  run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/extract_holm_building_navigation.py','--',f],path.join(LOG,'graph.log'))}
 const after=read(graphDir+'/navigation.json');
 if(after.modelSha256!==sha(spec.outGlb))throw Error(id+': the new graph does not lock the new model');
 result.graph={ws:spec.graph,nodes:after.nodes.length,identical:same(before,after),differs:diff(before,after),modelSha256:after.modelSha256};save();
 if(!result.graph.identical){
  const bi=new Set(before.nodes.map(n=>n.id)),ai=new Set(after.nodes.map(n=>n.id));
  result.graph.lost=[...bi].filter(x=>!ai.has(x));result.graph.gained=[...ai].filter(x=>!bi.has(x));save();
  throw Error(id+': the graph measured on the new model differs from '+refGraph+' in '+result.graph.differs.join(',')+' lost '+result.graph.lost.slice(0,12).join(' ')+' gained '+result.graph.gained.slice(0,12).join(' '))}
 console.log('[PROPS_PASS] '+id+' graph identical ('+after.nodes.length+' nodes) -> '+spec.graph)}
// 5. the game's cutaway keeps every new object whole
if(on('cutaway')){const f='scratchpad/holm_props_pass/'+id+'/cutaway.json';
 const r=cp.spawnSync(process.execPath,['tools/check_holm_cutaway_props.js',spec.outGlb,graphDir+'/navigation.json',id,spec.added,'--json',f],{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024});
 const c=JSON.parse(fs.readFileSync(abs(f),'utf8'));result.cutaway={pieces:c.pieces,keep:c.keep,cut:c.cut,clipped:c.clipped.length};save();
 if(c.clipped.length)throw Error(id+': '+c.clipped.length+' new pieces clipped by the cutaway '+JSON.stringify(c.clipped.slice(0,6)));
 console.log('[PROPS_PASS] '+id+' cutaway ok: '+c.pieces+' pieces of the new parts, none clipped ('+c.cut+' cut below the cut height)')}
// 5. no new z-fighting (the game's views: outside and every cutaway storey)
if(on('coplanar')){const nav=graphDir+'/navigation.json',prof=spec.coplanar||'m44',o={};
 for(const [k,m,g] of [['before',spec.reference,'.studio-workspaces/'+refGraph+'/candidates/navigation.json'],['after',spec.outGlb,nav]]){
  const f='scratchpad/holm_props_pass/'+id+'/coplanar.'+k+'.json';run(BLENDER('5.1'),['-b','--python-exit-code','1','--python','tools/blender/check_holm_coplanar.py','--',abs(m),abs(f),prof,abs(g)],path.join(LOG,'coplanar.'+k+'.log'));
  const j=JSON.parse(fs.readFileSync(abs(f),'utf8')),c={};j.fights.filter(q=>q.visible!==false).forEach(q=>{const key=[q.a,q.b].sort().join(' | ');c[key]=(c[key]||0)+1});o[k]={summary:j.summary,pairs:c}}
 const worse=Object.keys(o.after.pairs).filter(k=>o.after.pairs[k]>(o.before.pairs[k]||0)).map(k=>[k,o.before.pairs[k]||0,o.after.pairs[k]]);
 result.coplanar={before:o.before.summary.fights,after:o.after.summary.fights,areaBefore:o.before.summary.area,areaAfter:o.after.summary.area,worse};save();
 if(worse.length)throw Error(id+': new coplanar fights '+JSON.stringify(worse.slice(0,12)));
 console.log('[PROPS_PASS] '+id+' coplanar ok: '+o.before.summary.fights+' -> '+o.after.summary.fights+' visible fights')}
// 6. registry
if(on('registry')){if(!result.graph||!result.graph.identical)throw Error(id+': no identical graph to register');
 const r2=read(REG),e=(r2.buildings||r2)[id],after=read(graphDir+'/navigation.json');
 const was={graph:refGraph,model:spec.reference};
 Object.assign(e,{graph:spec.graph,model:spec.outGlb,nodes:after.nodes.length,modelSha256:after.modelSha256,measuredAt:new Date().toISOString(),
  props:'props pass (2026-09-28): every prop designed again in Blender ('+spec.script+', '+SPEC+'); graph identical to '+was.graph+' apart from the model hash'});
 fs.writeFileSync(abs(REG),JSON.stringify(r2,null,1)+'\n');result.registry={was,now:{graph:e.graph,model:e.model}};save();console.log('[PROPS_PASS] '+id+' registry -> '+spec.outGlb)}
