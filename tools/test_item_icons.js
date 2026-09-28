#!/usr/bin/env node
/* ============================================================================
   Crafted Realm -- every item has a real picture (owner rule: every icon is an image or a Blender render; no drawn
   placeholder shapes, no emoji, no glyphs).

   Loads src/game0_icons.js and the item tables the way the browser does: src/game1_data.js ITEMS (+ buildTieredGear's
   generated tier gear), then EVERY script index.html loads that adds items at load (found by scanning the script list
   for writes into ITEMS: the bronze dagger, the bread chain, the teleport tablet, the clue items...), each run in the
   sandbox with stand-ins for the game globals it waits for, so its registration really happens. Then it checks:
     1. every item id resolves through iconFor's picture tables (HOLM_ITEM_ICONS -> assets/icons/items/<id>.png, then the
        painted gear-sprite rule -> assets/icons/gear/<id>.png), never to the canvas fallback, the load-time items too;
     2. every file those tables point at exists, and every Blender item render is a 96 x 96 PNG with transparency;
     3. every id in HOLM_ITEM_ICONS is a real item (a typo would silently fall back to a drawn icon);
     4. no script seeds the icon cache (ICONS[id] = a canvas drawing) for an item unless it yields to the item's render.
   Renders: tools/blender/build_holm_items_v1.py, build_holm_equipment_v1..v4.py, build_holm_fishing_items_v1.py,
   build_world_item_icons_v1.py. Run: node tools/test_item_icons.js    Exit 0 = pass.
   ========================================================================== */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let pass=0,fail=0;
function ok(c,m,d){if(c)pass++;else{fail++;console.log('  FAIL '+m+(d!==undefined?'\n       '+JSON.stringify(d).slice(0,800):''))}}

/* a do-nothing stand-in for any game global a load-time module waits for (UI, Player, Admin, Events, Persist, ...):
   every property is another stand-in, every call returns undefined, assignments land on the target */
const stub=()=>{const t=function(){};return new Proxy(t,{get:(o,k)=>k in o?o[k]:(k===Symbol.toPrimitive||k==='then'?undefined:(o[k]=stub())),apply:()=>undefined})};
const sb={Math,console:{log(){},warn(){},error(){},info(){}},JSON,Set,Map,Array,Object,Date,WORLD:{},
  setInterval:f=>{try{f()}catch(e){}return 0},clearInterval:()=>{},setTimeout:()=>0};   // a boot interval gets one try, now
sb.globalThis=sb;sb.window=sb;vm.createContext(sb);
const ev=(f,cap)=>vm.runInContext(read(f)+'\n;'+(cap||''),sb,{filename:f});
ev('src/game0_icons.js','globalThis.__I={HOLM_ITEM_ICONS,_gearSprite};');
ev('src/game1_data.js','globalThis.__D={ITEMS};');
ev('src/magic_spells.js');ev('src/combat_math.js');ev('src/game3_systems.js');   // the tables the load-time modules hook into
const {HOLM_ITEM_ICONS,_gearSprite}=sb.__I,ITEMS=sb.__D.ITEMS;
const literal=new Set(Object.keys(ITEMS));

/* every script index.html loads, in order; the ones that write into ITEMS add items at load */
const scripts=[...read('index.html').matchAll(/<script[^>]*\ssrc="(src\/[^"?]+\.js)/g)].map(m=>m[1]);
const WRITES=/ITEMS\s*\[[^\]]+\]\s*=(?!=)|ITEMS\.\w+\s*=(?!=)/;
const loaders=scripts.filter(f=>f!=='src/game1_data.js'&&fs.existsSync(path.join(ROOT,f))&&WRITES.test(read(f)));
['UI','Player','Admin','Events','Persist','Interact','Sfx','BreadRecipe','scene','THREE','handleClick','orderWalk','groundY','player']
  .forEach(k=>{if(!(k in sb))sb[k]=stub()});
const loadErr=[];
loaders.forEach(f=>{try{ev(f)}catch(e){loadErr.push(f+': '+String(e&&e.message||e))}});
const atLoad=Object.keys(ITEMS).filter(id=>!literal.has(id));
const picture=id=>HOLM_ITEM_ICONS.has(id)?'assets/icons/items/'+id+'.png':_gearSprite(id)?'assets/icons/gear/'+id+'.png':null;
/* width, height and colour type of a PNG from its IHDR */
function pngInfo(p){const b=fs.readFileSync(p);if(b.readUInt32BE(0)!==0x89504e47)return null;return {w:b.readUInt32BE(16),h:b.readUInt32BE(20),ct:b[25]}}

console.log('1. every item resolves to a picture');
ok(!loadErr.length,'every load-time item module ran in the sandbox ('+loaders.join(', ')+')',loadErr);
ok(['home_tab','bronze_dagger','dough','cipher_scroll'].every(id=>atLoad.indexOf(id)>=0),
   'the items added at load are in the table ('+atLoad.length+': '+atLoad.join(', ')+')',atLoad);
const ids=Object.keys(ITEMS);
ok(ids.length>250,'the item table loaded ('+ids.length+' items: tier gear and load-time items included)');
const none=ids.filter(id=>!picture(id));
ok(!none.length,'every item has a Blender render or a painted sprite (no canvas-drawn fallback)',none);

console.log('2. the pictures exist');
const missing=ids.map(picture).filter(p=>p&&!fs.existsSync(path.join(ROOT,p)));
ok(!missing.length,'every picture file exists',missing);
const badSize=[...HOLM_ITEM_ICONS].filter(id=>{const p=path.join(ROOT,'assets/icons/items/'+id+'.png');if(!fs.existsSync(p))return true;
  const i=pngInfo(p);return !i||i.w!==96||i.h!==96||i.ct!==6});
ok(!badSize.length,'every Blender item render is a 96 x 96 RGBA PNG ('+HOLM_ITEM_ICONS.size+' renders)',badSize);

console.log('3. the render table names real items');
const stray=[...HOLM_ITEM_ICONS].filter(id=>!ITEMS[id]);
ok(!stray.length,'every HOLM_ITEM_ICONS id is an item',stray);

console.log('4. nothing seeds a drawn icon over a render');
/* iconFor returns a cached ICONS[id] before it looks for the render, so a module that pre-draws an item's icon must step
   aside when the render exists (smith_bronze_dagger.js checks HOLM_ITEM_ICONS first) */
const seeders=scripts.filter(f=>f!=='src/game0_icons.js'&&fs.existsSync(path.join(ROOT,f))&&/ICONS\s*\[[^\]]+\]\s*=(?!=)/.test(read(f)));
const unguarded=seeders.filter(f=>!/HOLM_ITEM_ICONS\.has\(/.test(read(f)));
ok(!unguarded.length,'every script that caches an item icon yields to the Blender render ('+(seeders.join(', ')||'none')+')',unguarded);

console.log('\n[ITEM ICONS] '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
