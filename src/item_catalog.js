/* ============================================================================
   Crafted Realms ITEM CATALOG — single registry for the grid/dex and (later)
   the in-game admin place/search tool. Each entry:
     id     our sequential catalog id
     name   display name
     osrsId matching OSRS item id (null = OSRS scenery / no direct item)
     src    {t:'proc', k:'<builder key>'}   (all items are procedural low-poly now)
     ref    OSRS reference image path (null = none)
     review 'pass' | 'review' | 'todo'   (Claude's 1:1 verdict vs OSRS)
   All items are low-poly flat-shaded procedural (proc_props.js + proc_items.js)
   to match OSRS's deliberately low-detail look. SF3D retired for items.
   ========================================================================== */
window.ITEM_CATALOG = [
  { id:1,  name:'Bucket',        osrsId:1925,  src:{t:'proc',k:'bucket'},        ref:'art_refs/osrs/bucket_osrs.png',        review:'pass' },
  { id:2,  name:'Barrel',        osrsId:null,  src:{t:'proc',k:'barrel'},        ref:null,                                    review:'pass',   note:'OSRS scenery' },
  { id:3,  name:'Crate',         osrsId:null,  src:{t:'proc',k:'crate'},         ref:null,                                    review:'pass',   note:'OSRS scenery' },
  { id:4,  name:'Cabbage',       osrsId:1965,  src:{t:'proc',k:'cabbage'},       ref:'art_refs/osrs/cabbage_osrs.png',       review:'pass' },
  { id:5,  name:'Potato',        osrsId:1942,  src:{t:'proc',k:'potato'},        ref:'art_refs/osrs/potato_osrs.png',        review:'pass' },
  { id:6,  name:'Onion',         osrsId:1957,  src:{t:'proc',k:'onion'},         ref:'art_refs/osrs/onion_osrs.png',         review:'pass' },
  { id:7,  name:'Carrot',        osrsId:24546, src:{t:'proc',k:'carrot'},        ref:'art_refs/osrs/carrot_osrs.png',        review:'pass' },
  { id:8,  name:'Wheat',         osrsId:1947,  src:{t:'proc',k:'wheat'},         ref:'art_refs/osrs/wheat_osrs.png',         review:'pass', note:'OSRS item is Grain' },
  { id:9,  name:'Sack',          osrsId:5418,  src:{t:'proc',k:'sack'},          ref:'art_refs/osrs/sack_osrs.png',          review:'pass', note:'OSRS empty sack' },
  { id:10, name:'Tomato',        osrsId:1982,  src:{t:'proc',k:'tomato'},        ref:'art_refs/osrs/tomato_osrs.png',        review:'pass' },
  { id:11, name:'Apple',         osrsId:1955,  src:{t:'proc',k:'apple'},         ref:'art_refs/osrs/apple_osrs.png',         review:'pass', note:'OSRS cooking apple' },
  { id:12, name:'Banana',        osrsId:1963,  src:{t:'proc',k:'banana'},        ref:'art_refs/osrs/banana_osrs.png',        review:'pass' },
  { id:13, name:'Bread',         osrsId:2309,  src:{t:'proc',k:'bread'},         ref:'art_refs/osrs/bread_osrs.png',         review:'pass' },
  { id:14, name:'Cooked meat',   osrsId:2142,  src:{t:'proc',k:'cookedMeat'},    ref:'art_refs/osrs/cookedMeat_osrs.png',    review:'pass' },
  { id:15, name:'Egg',           osrsId:1944,  src:{t:'proc',k:'egg'},           ref:'art_refs/osrs/egg_osrs.png',           review:'pass' },
  { id:16, name:'Cheese',        osrsId:1985,  src:{t:'proc',k:'cheese'},        ref:'art_refs/osrs/cheese_osrs.png',        review:'pass' },
  { id:17, name:'Mushroom',      osrsId:6004,  src:{t:'proc',k:'mushroom'},      ref:'art_refs/osrs/mushroom_osrs.png',      review:'pass' },
  { id:18, name:'Logs',          osrsId:1511,  src:{t:'proc',k:'logs'},          ref:'art_refs/osrs/logs_osrs.png',          review:'pass' },
  { id:19, name:'Oak logs',      osrsId:1521,  src:{t:'proc',k:'oakLogs'},       ref:'art_refs/osrs/oakLogs_osrs.png',       review:'pass' },
  { id:20, name:'Bones',         osrsId:526,   src:{t:'proc',k:'bones'},         ref:'art_refs/osrs/bones_osrs.png',         review:'pass' },
  { id:21, name:'Big bones',     osrsId:532,   src:{t:'proc',k:'bigBones'},      ref:'art_refs/osrs/bigBones_osrs.png',      review:'pass' },
  { id:22, name:'Coins',         osrsId:617,   src:{t:'proc',k:'coins'},         ref:'art_refs/osrs/coins_osrs.png',         review:'review' },
  { id:23, name:'Feather',       osrsId:314,   src:{t:'proc',k:'feather'},       ref:'art_refs/osrs/feather_osrs.png',       review:'pass' },
  { id:24, name:'Raw shrimps',   osrsId:317,   src:{t:'proc',k:'rawShrimps'},    ref:'art_refs/osrs/rawShrimps_osrs.png',    review:'pass' },
  { id:25, name:'Raw trout',     osrsId:335,   src:{t:'proc',k:'rawTrout'},      ref:'art_refs/osrs/rawTrout_osrs.png',      review:'pass' },
  { id:26, name:'Copper ore',    osrsId:436,   src:{t:'proc',k:'copperOre'},     ref:'art_refs/osrs/copperOre_osrs.png',     review:'pass' },
  { id:27, name:'Tin ore',       osrsId:438,   src:{t:'proc',k:'tinOre'},        ref:'art_refs/osrs/tinOre_osrs.png',        review:'pass' },
  { id:28, name:'Iron ore',      osrsId:440,   src:{t:'proc',k:'ironOre'},       ref:'art_refs/osrs/ironOre_osrs.png',       review:'pass' },
  { id:29, name:'Coal',          osrsId:453,   src:{t:'proc',k:'coal'},          ref:'art_refs/osrs/coal_osrs.png',          review:'pass' },
  { id:30, name:'Gold ore',      osrsId:444,   src:{t:'proc',k:'goldOre'},       ref:'art_refs/osrs/goldOre_osrs.png',       review:'pass' },
  { id:31, name:'Uncut sapphire',osrsId:1623,  src:{t:'proc',k:'uncutSapphire'}, ref:'art_refs/osrs/uncutSapphire_osrs.png', review:'pass' },
  { id:32, name:'Clay',          osrsId:434,   src:{t:'proc',k:'clay'},          ref:'art_refs/osrs/clay_osrs.png',          review:'pass' },
  { id:33, name:'Bronze bar',    osrsId:2349,  src:{t:'proc',k:'bronzeBar'},     ref:'art_refs/osrs/bronzeBar_osrs.png',     review:'pass' },
  { id:34, name:'Iron bar',      osrsId:2351,  src:{t:'proc',k:'ironBar'},       ref:'art_refs/osrs/ironBar_osrs.png',       review:'pass' },
  { id:35, name:'Steel bar',     osrsId:2353,  src:{t:'proc',k:'steelBar'},      ref:'art_refs/osrs/steelBar_osrs.png',      review:'pass' },
  { id:36, name:'Gold bar',      osrsId:2357,  src:{t:'proc',k:'goldBar'},       ref:'art_refs/osrs/goldBar_osrs.png',       review:'pass' },
  { id:37, name:'Bronze pickaxe',osrsId:1265,  src:{t:'proc',k:'bronzePickaxe'}, ref:'art_refs/osrs/bronzePickaxe_osrs.png', review:'pass' },
  { id:38, name:'Bronze axe',    osrsId:1351,  src:{t:'proc',k:'bronzeAxe'},     ref:'art_refs/osrs/bronzeAxe_osrs.png',     review:'pass' },
  { id:39, name:'Hammer',        osrsId:2347,  src:{t:'proc',k:'hammer'},        ref:'art_refs/osrs/hammer_osrs.png',        review:'pass' },
  { id:40, name:'Tinderbox',     osrsId:590,   src:{t:'proc',k:'tinderbox'},     ref:'art_refs/osrs/tinderbox_osrs.png',     review:'pass' },
  { id:41, name:'Knife',         osrsId:946,   src:{t:'proc',k:'knife'},         ref:'art_refs/osrs/knife_osrs.png',         review:'pass' },
  { id:42, name:'Chisel',        osrsId:1755,  src:{t:'proc',k:'chisel'},        ref:'art_refs/osrs/chisel_osrs.png',        review:'pass' },
  { id:43, name:'Jug',           osrsId:1935,  src:{t:'proc',k:'jug'},           ref:'art_refs/osrs/jug_osrs.png',           review:'pass' },
  { id:44, name:'Pot',           osrsId:1931,  src:{t:'proc',k:'pot'},           ref:'art_refs/osrs/pot_osrs.png',           review:'pass' },
  { id:45, name:'Bowl',          osrsId:1923,  src:{t:'proc',k:'bowl'},          ref:'art_refs/osrs/bowl_osrs.png',          review:'pass' },
  { id:46, name:'Bronze sword',  osrsId:1277,  src:{t:'proc',k:'bronzeSword'},   ref:'art_refs/osrs/bronzeSword_osrs.png',   review:'pass' },
  { id:47, name:'Bronze dagger', osrsId:1205,  src:{t:'proc',k:'bronzeDagger'},  ref:'art_refs/osrs/bronzeDagger_osrs.png',  review:'pass' },
  { id:48, name:'Bronze mace',   osrsId:1422,  src:{t:'proc',k:'bronzeMace'},    ref:'art_refs/osrs/bronzeMace_osrs.png',    review:'pass' },
  { id:49, name:'Wooden shield', osrsId:1171,  src:{t:'proc',k:'woodenShield'},  ref:'art_refs/osrs/woodenShield_osrs.png',  review:'pass' },
  { id:50, name:'Bronze med helm',osrsId:1139, src:{t:'proc',k:'bronzeMedHelm'}, ref:'art_refs/osrs/bronzeMedHelm_osrs.png', review:'pass' },
];
