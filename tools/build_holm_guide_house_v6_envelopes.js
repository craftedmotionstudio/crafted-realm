/* Guide House v6 collision envelopes (owner review 4, 2026-09-27): v5's list (the arrival navigation's source of truth for
 * the house's furniture) with the changes the v6 Blender build made to the ground floor:
 *  - the cellar trapdoor moved from between the tables to the south-east corner at the stair foot, where the pot plant stood
 *    (tools/blender/holm_guide_house_cellar_v6.py FRAME); the pot plant took the south-west corner's tall urn's place, with
 *    the broom beside it;
 *  - the north wall's water urn is larger than v5's jar (tools/blender/holm_guide_house_interior_v6.py: urn 0.72 tall, with
 *    its pail beside it).
 * Everything else stands where v5's pieces stood (the redesigned ware sits on the same tables and shelves).
 * Run: node tools/build_holm_guide_house_v6_envelopes.js  -> .studio-workspaces/holm-guide-house-overhaul-v6/candidates/ */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),src=path.join(ROOT,'.studio-workspaces/holm-guide-house-overhaul-v5/candidates/guide-house-collision-envelopes.json');
const out=path.join(ROOT,'.studio-workspaces/holm-guide-house-overhaul-v6/candidates/guide-house-collision-envelopes.json');
const e=JSON.parse(fs.readFileSync(src,'utf8'));
const drop=new Set(['cellar_hatch','water_urn_and_broom','water_jar_and_bucket','pot_plant']);
const src6='Blender declared: tools/blender/holm_guide_house_cellar_v6.py / holm_guide_house_interior_v6.py (owner review 4)';
e.blockers=e.blockers.filter(b=>!drop.has(b.id)).concat([
 {id:'cellar_hatch',surface:'ground',x0:4.97,x1:5.77,z0:4.01,z1:4.77,source:'Blender declared: tools/blender/holm_guide_house_cellar_v6.py',note:'v6: the trapdoor frame in the south-east corner (its lid stands upright on the north edge when open)'},
 {id:'pot_plant',surface:'ground',x0:-5.62,x1:-4.98,z0:4.08,z1:4.72,source:src6},
 {id:'corner_broom',surface:'ground',x0:-5.8,x1:-5.52,z0:3.48,z1:3.9,source:src6},
 {id:'water_urn_and_pail',surface:'ground',x0:2.8,x1:3.64,z0:-4.78,z1:-4.12,source:src6}]);
e.status='v6 (owner review 4, 2026-09-27): v5 list with the trapdoor moved to the south-east corner at the stair foot, the pot plant and a broom in the south-west corner, the north urn larger. '+e.status;
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(e,null,1)+'\n');
console.log('[GUIDE_V6_ENVELOPES]',e.blockers.length,'blockers ->',path.relative(ROOT,out));
