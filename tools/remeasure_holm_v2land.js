/* Holm v2 land (W0b, 2026-09-26): re-measure every Blender building's navigation graph on the terrain v2 bundle at its
 * seat height, with the existing measuring tools (no tolerance changes):
 *   - survival, quarry, bank, mage, lastlight, haven: the general extractor (tools/blender/extract_holm_building_navigation.py)
 *     on docs/rebuild/holm-overhaul/buildings/<id>-v2land.nav.json (the old-school spec + terrain v2 + new placement y);
 *   - keep, bakehouse, lodge: their own extractors re-run through tools/blender/relock_with_swapped_paths.py with the
 *     terrain folder, output folder, model hash source and foundation height swapped (docs/rebuild/holm-overhaul/v2land/*.relock.json).
 * Each graph lands in a NEW workspace .studio-workspaces/holm-<id>-v2land-navigation-v1 and is hash-bound to the exact GLB the
 * island loads. Writes the registry docs/rebuild/holm-overhaul/v2land.json read by the runtime pins and tools/holm_v2_land_inputs.js.
 * One Blender process at a time. Run: node tools/remeasure_holm_v2land.js [ids...]   (default: all) */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),abs=p=>path.join(root,p),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const B51='C:/Program Files/Blender Foundation/Blender 5.1/blender.exe';
const TERRAIN='.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json';
const seats=read('.studio-workspaces/holm-overhaul-terrain-v2/seats.json'),seatY=id=>seats.find(s=>s.id===id).y;
// id -> [model the island loads, graph workspace]
const MODELS={survival:'.studio-workspaces/holm-survival-v2land-v1/candidates/survival.glb',quarry:'.studio-workspaces/holm-quarry-oldschool-v1/candidates/quarry.glb',
 bank:'.studio-workspaces/holm-bank-oldschool-v1/candidates/bank.glb',mage:'.studio-workspaces/holm-mage-oldschool-v1/candidates/mage.glb',
 lastlight:'.studio-workspaces/holm-lastlight-oldschool-v1/candidates/lastlight.glb',haven:'.studio-workspaces/holm-haven-oldschool-v1/candidates/haven.glb',
 keep:'.studio-workspaces/holm-keep-oldschool-v1/candidates/keep.glb',bakehouse:'.studio-workspaces/holm-kitchen-oldschool-v1/candidates/kitchen-character.glb',
 lodge:'.studio-workspaces/holm-quest-lodge-oldschool-v1/candidates/lodge.glb'};
const GRAPH={keep:'holm-keep-v2land-navigation-v1',bakehouse:'holm-kitchen-v2land-navigation-v1',lodge:'holm-quest-lodge-v2land-navigation-v1'};
const graphWs=id=>GRAPH[id]||'holm-'+id+'-v2land-navigation-v1';
const OLD={keep:[8.025,'-8.025'],bakehouse:[4.07,'-4.07'],lodge:[5.02,'-5.02']};
function relockArgs(id){
 const y=seatY(id==='bakehouse'?'bakehouse':id),t=['holm-overhaul-terrain-v1/working','holm-overhaul-terrain-v2/working'];
 if(id==='keep')return {script:'tools/blender/extract_holm_keep_navigation_v6.py',replace:[t,['holm-keep-navigation-v7/candidates',GRAPH.keep+'/candidates'],
  ["(BASE/'keep.glb').read_bytes()","(ROOT/'"+MODELS.keep+"').read_bytes()"],["terrain['heights'][z*stride+x]-8.025","terrain['heights'][z*stride+x]-"+y],
  ["'placement':{'x':87,'y':8.025,'z':35}","'placement':{'x':87,'y':"+y+",'z':35}"]]};
 if(id==='bakehouse')return {script:'tools/blender/extract_holm_kitchen_navigation_v6.py',replace:[t,['holm-kitchen-wings-v8/candidates','holm-kitchen-oldschool-v1/candidates'],
  ['holm-kitchen-navigation-v6/candidates',GRAPH.bakehouse+'/candidates'],["terrain['heights'][z*stride+x]-4.07","terrain['heights'][z*stride+x]-"+y],
  ["'placement':{'x':44,'y':4.07,'z':67}","'placement':{'x':44,'y':"+y+",'z':67}"]]};
 return {script:'tools/blender/extract_holm_quest_terrain_navigation_v4.py',replace:[t,['holm-quest-lodge-v6/candidates','holm-quest-lodge-oldschool-v1/candidates'],
  ['holm-quest-terrain-navigation-v4/candidates',GRAPH.lodge+'/candidates'],['655e69f88d24b389ccf6b7c90e61d60d1d9b4ccde32030b0a45754285feb1d98',sha(TERRAIN)],
  ["origin={'x':35,'y':5.02,'z':51}","origin={'x':35,'y':"+y+",'z':51}"],['-5.02','-'+y]]};
}
// the old-school spec on the v2 land: seat height, terrain v2, the island's model; a target on the terrain lane outside the
// seat (the survival camp's trail end) is requested at the v2 ground there, since the lane itself moved
const Terrain=require('../src/holm_overhaul_terrain.js');
function generalSpec(id){
 const s=read('docs/rebuild/holm-overhaul/buildings/'+id+'-oldschool.nav.json'),q=seats.find(x=>x.id===id),T=read(TERRAIN);
 s.note='Holm v2 land (2026-09-26): re-measured on the terrain v2 bundle at the seat height ('+(q.dy>=0?'+':'')+q.dy+' over Sept 13)';
 s.placement={x:s.placement.x,y:q.y,z:s.placement.z};s.terrain=TERRAIN;s.model=MODELS[id];s.out='.studio-workspaces/'+graphWs(id)+'/candidates';
 if(id==='survival')s.targets=s.targets.filter(t=>t.id!=='fishing');
 s.targets.forEach(t=>{const wx=t.at[0]+s.placement.x,wz=t.at[2]+s.placement.z;
  if(wx<q.x0||wx>q.x0+q.w||wz<q.z0||wz>q.z0+q.d){const y=+(Terrain.sample(T,wx,wz)-s.placement.y).toFixed(3);if(Math.abs(y-t.at[1])>.3){t.at=[t.at[0],y,t.at[2]];t.v2land='requested at the v2 ground'}}});
 return s;
}
function run(args,log){const r=cp.spawnSync(B51,['-b','--python-exit-code','1','--python',...args],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});
 fs.writeFileSync(log,(r.stdout||'')+'\n'+(r.stderr||''));if(r.status!==0)throw Error('Blender failed ('+r.status+'), see '+log);return r.stdout}
const want=process.argv.slice(2).length?process.argv.slice(2):Object.keys(MODELS);
const regPath='docs/rebuild/holm-overhaul/v2land.json',reg=fs.existsSync(abs(regPath))?read(regPath):{schema:'holm-v2-land-registry-v1',buildings:{}};
fs.mkdirSync(abs('scratchpad/holm_v2_land/remeasure'),{recursive:true});
for(const id of want){
 const t0=Date.now(),log=abs('scratchpad/holm_v2_land/remeasure/'+id+'.log');
 if(OLD[id]){const a=relockArgs(id),f=abs('docs/rebuild/holm-overhaul/v2land/'+id+'.relock.json');fs.writeFileSync(f,JSON.stringify(a,null,1)+'\n');
  run(['tools/blender/relock_with_swapped_paths.py','--',path.relative(root,f).split(path.sep).join('/')],log)}
 else{const sp='docs/rebuild/holm-overhaul/buildings/'+id+'-v2land.nav.json';fs.writeFileSync(abs(sp),JSON.stringify(generalSpec(id))+'\n');
  run(['tools/blender/extract_holm_building_navigation.py','--',sp],log)}
 const gp='.studio-workspaces/'+graphWs(id)+'/candidates/navigation.json',g=read(gp),o=g.placement||g.origin;
 if(g.modelSha256!==sha(MODELS[id]))throw Error(id+': graph hash '+g.modelSha256+' is not the model the island loads');
 if(g.terrainSha256&&g.terrainSha256!==sha(TERRAIN))throw Error(id+': graph measured on a different terrain');
 const unreached=(g.targets||[]).filter(t=>!t.reachable).map(t=>t.id);
 reg.buildings[id]=Object.assign(reg.buildings[id]||{},{graph:graphWs(id),model:MODELS[id],placement:{x:o.x,y:o.y,z:o.z},nodes:g.nodes.length,modelSha256:g.modelSha256,terrainSha256:sha(TERRAIN),unreachableTargets:unreached,measuredAt:new Date().toISOString()});
 // the lodge's bay foundation is a separate GLB placed at the lodge origin: its placement follows the seat height
 if(id==='lodge'){const d=read('.studio-workspaces/holm-quest-placement-v1/candidates/placement.json'),out='.studio-workspaces/holm-quest-placement-v2land-v1/candidates/placement.json';
  d.status='Holm v2 land (2026-09-26): the v1 placement lifted to the lodge seat height (same foundation bytes)';d.world.y=o.y;(d.supports||[]).forEach(q=>{q.y=o.y});d.v2land={from:'holm-quest-placement-v1',dy:+(o.y-5.02).toFixed(4),terrainSha256:sha(TERRAIN)};
  fs.mkdirSync(path.dirname(abs(out)),{recursive:true});fs.writeFileSync(abs(out),JSON.stringify(d,null,2)+'\n');reg.buildings.lodge.extraPlacement=out}
 fs.writeFileSync(abs(regPath),JSON.stringify(reg,null,1)+'\n');
 console.log('[V2LAND REMEASURE]',id,'nodes',g.nodes.length,'y',o.y,'unreachable targets',unreached.join(',')||'none',((Date.now()-t0)/1000).toFixed(0)+'s');
}
