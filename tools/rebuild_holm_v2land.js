/* Tutor's Holm v2 land (W0b, 2026-09-26): one command from the land design to a playable island draft.
 *  1. terrain   tools/build_holm_v2_terrain.js (design -> source v2 -> bundle, seats, numbers)
 *  2. measure   tools/remeasure_holm_v2land.js (every Blender building graph on the v2 land, registry)
 *  3. data      island-gates.json (door leaves follow their building's rise), island-bridges.json (decks from the design,
 *               measured against the v2 land), the habitat without plants now standing in water
 *  4. arrival   tools/stage_holm_arrival_package_v2land.js (Safe Publish export) and its id pinned in src/holm_v2_land.js
 *  5. bridges   (--bridges) the bridge GLBs rebuilt in Blender on the new decks and textured old-school
 *  6. audit     tools/audit_holm_v2_routes.js
 * v1 inputs come from docs/rebuild/holm-overhaul/v2land/v1-snapshot/ (the Sept 13 island data at 5435f46).
 * Run: node tools/rebuild_holm_v2land.js [--bridges] [--skip-measure] */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),abs=p=>path.join(root,p),read=p=>JSON.parse(fs.readFileSync(abs(p),'utf8'));
const write=(p,v)=>{fs.mkdirSync(path.dirname(abs(p)),{recursive:true});fs.writeFileSync(abs(p),typeof v==='string'?v:JSON.stringify(v,null,1)+'\n')};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const args=process.argv.slice(2);
function node(script,...a){const r=cp.spawnSync(process.execPath,[script,...a],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});
 if(r.status!==0){console.error((r.stdout||'').slice(-3000),(r.stderr||'').slice(-3000));throw Error(script+' failed')}return r.stdout}
function blender(v,a){const r=cp.spawnSync('C:/Program Files/Blender Foundation/Blender '+v+'/blender.exe',['-b','--python-exit-code','1','--python',...a],{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024,windowsHide:true});
 if(r.status!==0){console.error((r.stdout||'').slice(-3000),(r.stderr||'').slice(-3000));throw Error('blender '+a[0]+' failed')}return r.stdout}
const SNAP='docs/rebuild/holm-overhaul/v2land/v1-snapshot/',DATA='docs/rebuild/holm-overhaul/';
// 1-2
console.log(node('tools/build_holm_v2_terrain.js').split('\n').filter(l=>/relief|slope|<= 3|pond t|WROTE|wrote/.test(l)).join('\n'));
if(!args.includes('--skip-measure'))console.log(node('tools/remeasure_holm_v2land.js').trim());
const T=require('../src/holm_overhaul_terrain.js'),Nav=require('../src/holm_island_nav.js');
const terrain=read('.studio-workspaces/holm-overhaul-terrain-v2/working/assets/world/authoring/holm-overhaul.terrain.bundle.json');
const seats=read('.studio-workspaces/holm-overhaul-terrain-v2/seats.json'),design=read(DATA+'terrain-v2.design.json'),reg=read(DATA+'v2land.json');
const dyOf=id=>{const q=seats.find(s=>s.id===(id==='bakehouse'?'bakehouse':id));return q?q.y-q.oldY:0};
// 3a gates: the leaf height follows the building's rise
const gates=read(SNAP+'island-gates.json');
gates.status=gates.status+' Holm v2 land (2026-09-26): each leaf height rises with its building seat (tools/rebuild_holm_v2land.js).';
gates.gates.forEach(g=>{g.y=+(g.y+dyOf(g.building)).toFixed(3)});
write(DATA+'island-gates.json',gates);
// 3b bridges: the design's decks, measured on the v2 land (deck tiles, landings, bed, water under the deck, clearance)
const bridges=design.bridges.map(b=>{const r=Nav.bridgeFrom(terrain,b),wet=r.tiles.filter(t=>T.waterHeight(terrain,t[0]+.5,t[1]+.5)!==null);
 const wy=wet.map(t=>T.waterHeight(terrain,t[0]+.5,t[1]+.5)),bed=Math.min(...r.tiles.map(t=>T.sample(terrain,t[0]+.5,t[1]+.5)));
 const waterY=[+wy[0].toFixed(3),+wy[wy.length-1].toFixed(3)];
 return Object.assign(r,{bedY:+bed.toFixed(3),waterY,clearance:+(r.deckY-Math.max(...waterY)).toFixed(3)})});
write(DATA+'island-bridges.json',{schema:'holm-island-bridges-v1',note:'Holm v2 land (2026-09-26): deck tiles measured on the terrain v2 bundle (HolmIslandNav.bridgeFrom with the design spans, docs/rebuild/holm-overhaul/terrain-v2.design.json); bedY = lowest deck-tile ground, waterY = the creek level under the first and last deck tiles over water, clearance = deckY - max waterY.',bridges});
bridges.forEach(b=>{if(b.clearance<.3)throw Error(b.label+' deck clears the water by only '+b.clearance)});
// 3c habitat: the Sept 13 placements that now stand in water or on a cliff face are left out (Phase 5 re-plants the island)
const habSrc=read('.studio-workspaces/holm-habitat-v4/working/vegetation.json'),W=terrain.width,S=W+1;
const rise=(x,z)=>{const tx=Math.floor(x),tz=Math.floor(z),h=terrain.heights,c=[h[tz*S+tx],h[tz*S+tx+1],h[(tz+1)*S+tx],h[(tz+1)*S+tx+1]];return Math.max(...c)-Math.min(...c)};
const dropped=[];const keep=habSrc.placements.filter(p=>{const tx=Math.floor(p.x),tz=Math.floor(p.z),k=terrain.water[tz*W+tx];
 const bad=k!==0||Nav.creekBank(terrain,tx,tz)||rise(p.x,p.z)>1.25;if(bad)dropped.push(p.id);return !bad});
write('.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json',Object.assign({},habSrc,{note:'Holm v2 land (2026-09-26): holm-habitat-v4 without the '+dropped.length+' plants that now stand in the pond, the creek or on a cliff face',placements:keep,v2land:{from:'holm-habitat-v4',dropped}}));
reg.habitat='.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json';write(DATA+'v2land.json',reg);
console.log('[V2LAND DATA] gates',gates.gates.map(g=>g.id+' y '+g.y).join(', '),'| bridges',bridges.map(b=>b.id+' deck '+b.deckY+' clear '+b.clearance).join(', '),'| habitat kept',keep.length,'dropped',dropped.length);
// 4 arrival package + pin
const out=node('tools/stage_holm_arrival_package_v2land.js'),m=/"exportId":\s*"([0-9a-f]{16})"/.exec(out);if(!m)throw Error('no export id');
const pin='src/holm_v2_land.js',src=fs.readFileSync(abs(pin),'utf8').replace(/exportId:'[0-9a-f]{16}'/,"exportId:'"+m[1]+"'");fs.writeFileSync(abs(pin),src);
console.log('[V2LAND ARRIVAL] export',m[1],'pinned in',pin);
// 5 bridges
if(args.includes('--bridges')){
 const raw='.studio-workspaces/holm-island-bridges-v3/candidates',tex='.studio-workspaces/holm-island-bridges-v2land-v1/candidates';
 blender('4.5',['tools/blender/build_holm_island_bridges_v2.py','--',abs(DATA+'island-bridges.json'),raw,'scratchpad/holm_v2_land/bridges']);
 for(const [id,name,rule] of [['timber','timber_teaching_bridge',[['(?i)weathered oak|oak (lit|shade)','planks',1]]],['stone','stone_village_bridge',null]]){
  const base=read(DATA+'oldschool/bridge-'+id+'.textures.json'),spec=Object.assign({},base,{source:raw+'/'+name+'.blend',reference:raw+'/'+name+'.glb',outBlend:tex+'/'+name+'.blend',outGlb:tex+'/'+name+'.glb',report:tex+'/'+id+'.report.json',
   manifest:{from:raw+'/manifest.json',to:tex+'/manifest.json'}});if(rule)spec.rules=rule;
  const sp='docs/rebuild/holm-overhaul/v2land/bridge-'+id+'.textures.json';write(sp,spec);blender(base.blender||'4.5',['tools/blender/apply_oldschool_textures.py','--',sp]);
 }
 // the textured manifest names the textured files' hashes
 const man=read(raw+'/manifest.json');man.bridges.forEach(b=>{b.sha256_glb=sha(tex+'/'+b.file);const bl=tex+'/'+b.file.replace(/\.glb$/,'.blend');if(fs.existsSync(abs(bl)))b.sha256_blend=sha(bl)});
 man.v2land='textured old-school rebuild of '+raw;write(tex+'/manifest.json',man);reg.bridgeModels=tex;write(DATA+'v2land.json',reg);
 console.log('[V2LAND BRIDGES] rebuilt',man.bridges.map(b=>b.id).join(', '));
}
// 6 audit
const a=cp.spawnSync(process.execPath,['tools/audit_holm_v2_routes.js','--json','scratchpad/holm_v2_land/route_audit.json'],{cwd:root,encoding:'utf8'});
console.log((a.stdout||'').split('\n').filter(l=>!/acceptance ok/.test(l)).join('\n'));
