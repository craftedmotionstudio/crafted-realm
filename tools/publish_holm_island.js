/* Publish the finished Tutor's Holm island (finish goal M7.1) through the Studio Safe Publish pipeline
 * (tools/studio_workspace.js: snapshot, stage, export, plan, journaled apply with backups and rollback).
 * The island runtime loads its Blender candidates from /.studio-workspaces/ (gitignored scratch) and its data from
 * docs/rebuild/holm-overhaul/. This collects every runtime file it actually loads (GLB/JSON/PNG/BIN only; never the
 * .blend sources) and publishes byte-identical copies to one mirrored root:
 *   .studio-workspaces/<ws>/<rel>        -> assets/holm_island/ws/<ws>/<rel>
 *   docs/rebuild/holm-overhaul/<file>     -> assets/holm_island/data/<file>
 * so the runtime only swaps two URL prefixes (HolmIsland.asset()). Model hashes recorded in the measured navigation
 * graphs stay valid because the bytes are identical.
 * The arrival package is not in this bundle: its loader consumes the validated Studio export by design
 * (HolmArrivalExportLoader requires a workspace exports directory), so it ships as that export.
 * Run: node tools/publish_holm_island.js [plan|apply]   (default plan: prints the file list, changes nothing) */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),W=require('./studio_workspace.js');
const WS='.studio-workspaces',DATA='docs/rebuild/holm-overhaul';
const DIRS=[ // workspace folders the island loads (candidates/, working/ or exports/)
'holm-keep-navigation-v7/candidates','holm-kitchen-navigation-v6/candidates','holm-kitchen-wings-v8/candidates',
 'holm-quest-lodge-v6/candidates','holm-quest-foundation-v1/candidates','holm-quest-placement-v1/candidates','holm-quest-terrain-navigation-v4/candidates',
 'holm-warden-keep-v8/candidates','holm-tree-family-v3/candidates','holm-habitat-v4/working','holm-island-bridges-v2/candidates',
 'holm-props-v1/candidates','holm-props-v2/candidates','holm-props-v3/candidates','holm-props-v4/candidates','holm-props-v5/candidates','holm-items-v1/candidates','holm-equipment-v1/candidates',
 'holm-bank-v3/candidates','holm-bank-navigation-v3/candidates',
 ...['survival','quarry','mage','haven','lastlight'].flatMap(b=>['holm-'+b+'-v3/candidates','holm-'+b+'-navigation-v3/candidates']),
 ...['cavern'].flatMap(b=>['holm-'+b+'-v1/candidates','holm-'+b+'-navigation-v1/candidates']),
 // old-school look (2026-09-25/26, src/holm_oldschool_look.js SWAPS): every textured building + its re-measured graph,
 // the textured tree family, bridges and prop packs
 ...['survival','keep','kitchen','quest-lodge','bank','mage','lastlight','quarry','haven','cavern'].flatMap(b=>['holm-'+b+'-oldschool-v1/candidates','holm-'+b+'-oldschool-navigation-v1/candidates']),
 'holm-tree-family-oldschool-v1/candidates','holm-island-bridges-oldschool-v1/candidates','holm-props1-oldschool-v1/candidates','holm-props3-oldschool-v1/candidates','holm-props5-oldschool-v1/candidates'];
const DATA_FILES=['plan.json','island-bridges.json','island-gates.json','island-ladders.json','island-lessons.json'];
const KEEP=/\.(glb|json|png|bin)$/i;
// the arrival package export is a sealed bundle (its manifest names its .blend sources): published whole
function walk(dir,all){const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p,all));else if(all||KEEP.test(e.name))out.push(p)}return out}
function collect(){
 const rows=[];
 DIRS.forEach(d=>{const abs=path.join(ROOT,WS,d);if(!fs.existsSync(abs))throw new Error('missing '+WS+'/'+d);
  walk(abs,/arrival-package/.test(d)).forEach(f=>{const rel=path.relative(path.join(ROOT,WS),f).split(path.sep).join('/');rows.push({src:f,target:'assets/holm_island/ws/'+rel})})});
 DATA_FILES.forEach(n=>rows.push({src:path.join(ROOT,DATA,n),target:'assets/holm_island/data/'+n}));
 return rows;
}
// a Studio workspace's target list is fixed at init: when the island gains files, publish through the next version
function workspaceId(rows){let v=1;for(;;v++){const m=path.join(ROOT,WS,'holm-island-publish-v'+v,'studio-workspace.json');if(!fs.existsSync(m))return 'holm-island-publish-v'+v;
  const have=new Set(JSON.parse(fs.readFileSync(m,'utf8')).targets.map(t=>t.path));if(rows.every(r=>have.has(r.target)))return 'holm-island-publish-v'+v}}
const mode=process.argv[2]||'plan',rows=collect(),id=workspaceId(rows);
const bytes=rows.reduce((a,r)=>a+fs.statSync(r.src).size,0);
console.log('[HOLM PUBLISH] '+rows.length+' files, '+(bytes/1048576).toFixed(1)+' MB -> assets/holm_island/');
if(mode==='plan'){rows.slice(0,12).forEach(r=>console.log('  '+r.target));if(rows.length>12)console.log('  …');process.exit(0)}
if(mode!=='apply')throw new Error('usage: plan|apply');
if(!fs.existsSync(path.join(ROOT,WS,id,'studio-workspace.json')))W.init(ROOT,id,rows.map(r=>r.target));
rows.forEach(r=>W.stage(ROOT,id,r.target,r.src));
const ex=W.exportWorkspace(ROOT,id),pl=W.plan(ROOT,id,ex.exportId);
if(!pl.ok&&!pl.noChanges)throw new Error('publish plan refused: '+JSON.stringify(pl.files.filter(f=>!f.ok).slice(0,5)));
const res=W.apply(ROOT,id,ex.exportId);
console.log('[HOLM PUBLISH] applied',JSON.stringify({exportId:ex.exportId,files:(res.files||pl.files||[]).length,receipt:res.receiptId||res.id||null}));
