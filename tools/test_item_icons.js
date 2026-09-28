#!/usr/bin/env node
/* ============================================================================
   Crafted Realm -- every item has a real picture (owner rule: every icon is an image or a Blender render; no drawn
   placeholder shapes, no emoji, no glyphs).

   Loads src/game0_icons.js and the item tables the way the browser does (src/game1_data.js ITEMS + buildTieredGear's
   generated tier gear, src/smith_bronze_dagger.js) and checks:
     1. every item id resolves through iconFor's picture tables (HOLM_ITEM_ICONS -> assets/icons/items/<id>.png, then the
        painted gear-sprite rule -> assets/icons/gear/<id>.png), never to the canvas fallback;
     2. every file those tables point at exists, and every Blender item render is a 96 x 96 PNG with transparency;
     3. every id in HOLM_ITEM_ICONS is a real item (a typo would silently fall back to a drawn icon).
   Renders: tools/blender/build_holm_items_v1.py, build_holm_equipment_v1..v4.py, build_holm_fishing_items_v1.py,
   build_world_item_icons_v1.py. Run: node tools/test_item_icons.js    Exit 0 = pass.
   ========================================================================== */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let pass=0,fail=0;
function ok(c,m,d){if(c)pass++;else{fail++;console.log('  FAIL '+m+(d!==undefined?'\n       '+JSON.stringify(d).slice(0,800):''))}}

const sb={Math,console:{log(){},warn(){},error(){}},JSON,Set,Map,Array,Object,WORLD:{},setInterval:()=>0,clearInterval:()=>{}};
sb.globalThis=sb;vm.createContext(sb);
const ev=(f,cap)=>vm.runInContext(read(f)+'\n;'+(cap||''),sb,{filename:f});
ev('src/game0_icons.js','globalThis.__I={HOLM_ITEM_ICONS,_gearSprite};');
ev('src/game1_data.js','globalThis.__D={ITEMS};');
ev('src/magic_spells.js');ev('src/combat_math.js');ev('src/game3_systems.js');   // what smith_bronze_dagger.js hooks into
ev('src/smith_bronze_dagger.js');                                                   // adds the bronze dagger at load
const {HOLM_ITEM_ICONS,_gearSprite}=sb.__I,ITEMS=sb.__D.ITEMS;
const picture=id=>HOLM_ITEM_ICONS.has(id)?'assets/icons/items/'+id+'.png':_gearSprite(id)?'assets/icons/gear/'+id+'.png':null;
/* width, height and colour type of a PNG from its IHDR */
function pngInfo(p){const b=fs.readFileSync(p);if(b.readUInt32BE(0)!==0x89504e47)return null;return {w:b.readUInt32BE(16),h:b.readUInt32BE(20),ct:b[25]}}

console.log('1. every item resolves to a picture');
const ids=Object.keys(ITEMS);
const none=ids.filter(id=>!picture(id));
ok(ids.length>250&&!!ITEMS.bronze_dagger,'the item table loaded ('+ids.length+' items: tier gear and the bronze dagger included)');
ok(!none.length,'every item has a Blender render or a painted sprite (no canvas-drawn fallback)',none);

console.log('2. the pictures exist');
const missing=ids.map(picture).filter(p=>p&&!fs.existsSync(path.join(ROOT,p)));
ok(!missing.length,'every picture file exists',missing);
const badSize=[...HOLM_ITEM_ICONS].filter(id=>{const p=path.join(ROOT,'assets/icons/items/'+id+'.png');if(!fs.existsSync(p))return true;
  const i=pngInfo(p);return !i||i.w!==96||i.h!==96||i.ct!==6});
ok(!badSize.length,'every Blender item render is a 96 x 96 RGBA PNG ('+HOLM_ITEM_ICONS.size+' renders)',badSize);

console.log('3. the render table names real items');
const stray=[...HOLM_ITEM_ICONS].filter(id=>!ITEMS[id]&&!['dough','bucket_flour'].includes(id));   // cooking_bread.js adds these two at load
ok(!stray.length,'every HOLM_ITEM_ICONS id is an item',stray);

console.log('\n[ITEM ICONS] '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
