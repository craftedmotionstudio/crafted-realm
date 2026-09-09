/* ================= DATA =================
   Schemas modelled on community OSRS databases (osrsbox-db style):
   weapons carry attack speed in game ticks (1 tick = 0.6s) plus
   attack/strength bonuses; armour carries defence bonuses; tools
   carry a skill + power tier. All names/art are MotionScape originals. */
const TICK = 0.6;

const ITEMS = {
  coins:        {name:'Crowns', stack:true, value:1},
  bones:        {name:'Bones', stack:false, value:1, bury:true},
  beast_hide:   {name:'Beast hide', stack:false, value:14},
  feathers:     {name:'Feathers', stack:true, value:1},
  logs:         {name:'Emberwood logs', stack:false, value:8},
  copper_ore:   {name:'Copper ore', stack:false, value:10},
  tin_ore:      {name:'Tin ore', stack:false, value:10},
  clay:         {name:'Clay', stack:false, value:6, examine:'Soft mineral clay, ready to be worked.'},
  iron_ore:     {name:'Iron ore', stack:false, value:17},
  coal:         {name:'Coal', stack:false, value:25},
  bronze_bar:   {name:'Bronze bar', stack:false, value:18},
  iron_bar:     {name:'Iron bar', stack:false, value:34},
  steel_bar:    {name:'Steel bar', stack:false, value:65},
  hammer:       {name:'Hammer', stack:false, value:2, tool:true},
  tinderbox:    {name:'Tinderbox', stack:false, value:2, tool:true},
  knife:        {name:'Knife', stack:false, value:3, tool:true},
  arrow_shafts: {name:'Arrow shafts', stack:true, value:1},
  bronze_tips:  {name:'Bronze arrowtips', stack:true, value:2},
  iron_tips:    {name:'Iron arrowtips', stack:true, value:4},
  silver_trinket:{name:'Silver trinket', stack:false, value:32, examine:'Lifted from a stall when no one was looking.'},
  bucket:       {name:'Bucket', stack:false, value:1, examine:'A sturdy empty stave bucket with an iron handle.'},
  bucket_water: {name:'Bucket of water', stack:false, value:1, examine:'Cold, clean and sloshing.'},
  raw_perch:    {name:'Raw mirrorperch', stack:false, value:6},
  bread:        {name:'Bread', stack:false, value:4, heal:4, weight:0.3, examine:'Squashy but filling.'},
  cooked_perch: {name:'Mirrorperch', stack:false, value:12, heal:4},
  burnt_perch:  {name:'Burnt mirrorperch', stack:false, value:1, examine:'Cooked with confidence, not skill.'},
  hollow_ale:   {name:'Hollow ale', stack:false, value:4, heal:5},

  /* ===== TOP-100 batch 1 (2026-07-17): missing common items — data layer only.
     Gathering/crafting sources wire in through later content passes; missing
     EQUIPMENT analogs (longsword, mace, chainbody…) wait for the modelled-gear
     pass so they never ship with placeholder meshes. ===== */
  ashes:       {name:'Ashes', stack:false, value:1, examine:'All that burning leaves behind.'},
  chisel:      {name:'Chisel', stack:false, value:2, tool:true},
  rope:        {name:'Rope', stack:false, value:18},
  shears:      {name:'Shears', stack:false, value:2, tool:true},
  spade:       {name:'Spade', stack:false, value:5, tool:true},
  jug:         {name:'Jug', stack:false, value:1},
  jug_water:   {name:'Jug of water', stack:false, value:1},
  pot:         {name:'Pot', stack:false, value:1},
  bowl:        {name:'Bowl', stack:false, value:4},
  oak_logs:    {name:'Oak logs', stack:false, value:20},
  willow_logs: {name:'Willow logs', stack:false, value:40},
  soft_clay:   {name:'Soft clay', stack:false, value:8, examine:'Worked with water until it gives.'},
  gold_ore:    {name:'Gold ore', stack:false, value:75},
  gold_bar:    {name:'Gold bar', stack:false, value:110},
  leather:     {name:'Leather', stack:false, value:6},
  wool:        {name:'Wool', stack:false, value:2},
  ball_of_wool:{name:'Ball of wool', stack:false, value:4},
  flax:        {name:'Flax', stack:false, value:3},
  bow_string:  {name:'Bow string', stack:false, value:12},
  grain:       {name:'Grain', stack:false, value:2},
  pot_of_flour:{name:'Pot of flour', stack:false, value:10},
  bread_dough: {name:'Bread dough', stack:false, value:4},
  cabbage:     {name:'Cabbage', stack:false, value:1, heal:1},
  potato:      {name:'Potato', stack:false, value:1},
  onion:       {name:'Onion', stack:false, value:1},
  egg:         {name:'Egg', stack:false, value:2},
  cheese:      {name:'Cheese', stack:false, value:4, heal:2},
  raw_beef:    {name:'Raw beef', stack:false, value:2},
  cooked_meat: {name:'Cooked meat', stack:false, value:4, heal:3},
  raw_trout:   {name:'Raw brooktrout', stack:false, value:20},
  trout:       {name:'Brooktrout', stack:false, value:32, heal:7},
  fishing_rod: {name:'Fishing rod', stack:false, value:5, tool:'fishing', power:1.2, useOn:'fish'},
  fly_fishing_rod:{name:'Fly fishing rod', stack:false, value:10, tool:'fishing', power:1.5, useOn:'fish'},
  iron_dagger: {name:'Iron dagger', stack:false, value:35, equip:'weapon', style:'melee',
                speedTicks:4, aBonus:11, sBonus:8, aStab:11, aSlash:5, aCrush:0,
                tier:'iron', reqSkill:'Attack', reqLvl:5, weight:1.1,
                examine:'A quick iron blade.'},

  /* legacy starter ids kept as bronze-tier gear */
  bronze_sword: {name:'Bronze sword', stack:false, value:25,  equip:'weapon', style:'melee',  speedTicks:4, aBonus:7,  sBonus:6, aStab:7, aSlash:5, aCrush:0, tier:'bronze', model:'sword', reqSkill:'Attack', reqLvl:1},
  iron_sword:   {name:'Iron sword',   stack:false, value:120, equip:'weapon', style:'melee',  speedTicks:4, aBonus:14, sBonus:13, aStab:14, aSlash:10, aCrush:0, tier:'iron', model:'sword', reqSkill:'Attack', reqLvl:5},
  hatchet:      {name:'Bronze hatchet', stack:false, value:16, tool:'woodcutting', power:1.0,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:1, sBonus:2, aStab:0, aSlash:1, aCrush:1, tier:'bronze', model:'axe', reqSkill:'Attack', reqLvl:1},
  iron_hatchet: {name:'Iron hatchet',   stack:false, value:56, tool:'woodcutting', power:1.45,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:4, sBonus:5, aStab:0, aSlash:4, aCrush:3, tier:'iron', model:'axe', reqSkill:'Attack', reqLvl:1},
  pickaxe:      {name:'Bronze pickaxe', stack:false, value:16, tool:'mining', power:1.0,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:1, sBonus:2, aStab:1, aSlash:0, aCrush:0, tier:'bronze', model:'pick', reqSkill:'Attack', reqLvl:1},
  iron_pickaxe: {name:'Iron pickaxe',   stack:false, value:56, tool:'mining', power:1.45,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:4, sBonus:5, aStab:4, aSlash:0, aCrush:0, tier:'iron', model:'pick', reqSkill:'Attack', reqLvl:1},
  wood_shield:  {name:'Wooden shield',    stack:false, value:20, equip:'shield', dBonus:5, model:'shield', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  bronze_helm:  {name:'Bronze helm',      stack:false, value:18, equip:'head',   dBonus:4, model:'helm', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  bronze_plate: {name:'Bronze platebody', stack:false, value:80, equip:'body',   dBonus:11, model:'plate', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  leather_body: {name:'Leather body',     stack:false, value:14, equip:'body',   dBonus:4, model:'plate', tier:'leather', reqSkill:'Defence', reqLvl:1},
  /* top-100 set 3 (2026-07-17): leather set — standalone leather items (like leather_body),
     NOT metal-tiered. Introduces the hands + feet equip slots. */
  leather_chaps:  {name:'Leather chaps',  stack:false, value:12, equip:'legs',  dBonus:3, model:'chaps',  tier:'leather', reqSkill:'Defence', reqLvl:1},
  leather_gloves: {name:'Leather gloves', stack:false, value:6,  equip:'hands', dBonus:1, model:'gloves', tier:'leather', reqSkill:'Defence', reqLvl:1},
  leather_boots:  {name:'Leather boots',  stack:false, value:6,  equip:'feet',  dBonus:1, model:'boots',  tier:'leather', reqSkill:'Defence', reqLvl:1},
  bronze_legs:  {name:'Bronze platelegs', stack:false, value:60, equip:'legs',   dBonus:7, model:'legs', tier:'bronze', reqSkill:'Defence', reqLvl:1},

  fishing_net:  {name:'Small net', stack:false, value:12, tool:'fishing', power:1.0, useOn:'fish'},

  /* ranged: bow tiers (arrows shared) */
  worn_bow:     {name:'Worn shortbow', stack:false, value:30,  equip:'weapon', style:'ranged', speedTicks:5, aBonus:8,  sBonus:7,  model:'bow', reqSkill:'Ranged', reqLvl:1, needs:'arrows'},
  ash_bow:      {name:'Ash shortbow',  stack:false, value:160, equip:'weapon', style:'ranged', speedTicks:5, aBonus:17, sBonus:15, model:'bow', reqSkill:'Ranged', reqLvl:10, needs:'arrows'},
  gale_longbow: {name:'Gale longbow',  stack:false, value:520, equip:'weapon', style:'ranged', speedTicks:6, aBonus:28, sBonus:26, model:'longbow', reqSkill:'Ranged', reqLvl:25, needs:'arrows'},
  arrows:       {name:'Arrows', stack:true, value:2},

  /* magic: staves cast without selecting runes; runes still consumed */
  spark_rune:        {name:'Spark runes', stack:true, value:4},
  air_rune:   {name:'Air runes',   stack:true, value:4},
  body_rune:  {name:'Body runes',  stack:true, value:3},
  big_bones:  {name:'Big bones',   stack:false, value:9, bury:true, big:true},
  crag_maul:  {name:'Crag maul', stack:false, value:2400, equip:'weapon', style:'melee', speedTicks:6,
               aBonus:30, sBonus:44, aStab:0, aSlash:0, aCrush:30, weight:9, model:'sword', tier:'crag', reqSkill:'Attack', reqLvl:30,
               examine:"Korthul's arm, quarried and furious."},
  monk_robe_top:    {name:'Monk robe top',    stack:false, value:26, equip:'body', dBonus:2, prayB:6, model:'robe', tier:'monk', reqSkill:'Prayer', reqLvl:1},
  monk_robe_bottom: {name:'Monk robe bottom', stack:false, value:20, equip:'legs', dBonus:1, prayB:5, model:'robe', tier:'monk', reqSkill:'Prayer', reqLvl:1},
  holy_symbol:      {name:'Holy symbol',      stack:false, value:60, equip:'amulet', prayB:8, model:'amulet', tier:'holy', reqSkill:'Prayer', reqLvl:1},
  water_rune: {name:'Water runes', stack:true, value:4},
  earth_rune: {name:'Earth runes', stack:true, value:4},
  fire_rune:  {name:'Fire runes',  stack:true, value:4},
  mind_rune:  {name:'Mind runes',  stack:true, value:3},
  chaos_rune: {name:'Chaos runes', stack:true, value:25},
  nature_rune:{name:'Nature runes',stack:true, value:40},
  wizard_hat: {name:'Wizard hat',  stack:false, value:30, equip:'head', dBonus:1, magB:2, model:'hat', tier:'wizard', reqSkill:'Magic', reqLvl:1},
  apprentice_staff:  {name:'Apprentice staff', stack:false, value:35,  equip:'weapon', style:'magic', speedTicks:5, aBonus:6,  sBonus:2, model:'staff', reqSkill:'Magic', reqLvl:1},
  ember_staff:       {name:'Ember staff',      stack:false, value:180, equip:'weapon', style:'magic', speedTicks:5, aBonus:13, sBonus:4, provides:'fire_rune', model:'staff', reqSkill:'Magic', reqLvl:10},
  storm_staff:       {name:'Storm staff',      stack:false, value:560, equip:'weapon', style:'magic', speedTicks:5, aBonus:22, sBonus:6, provides:'air_rune', model:'staff', reqSkill:'Magic', reqLvl:25},
  cloth_robe_top:    {name:'Cloth robe top',   stack:false, value:12,  equip:'body', dBonus:1, mBonus:3,  model:'robe', tier:'cloth', reqSkill:'Magic', reqLvl:1},
  cloth_robe_skirt:  {name:'Cloth robe skirt', stack:false, value:10,  equip:'legs', dBonus:1, mBonus:2,  model:'robe', tier:'cloth', reqSkill:'Magic', reqLvl:1},
  apprentice_hat:    {name:'Apprentice hat',   stack:false, value:8,   equip:'head', dBonus:0, mBonus:2,  model:'hat',  tier:'cloth', reqSkill:'Magic', reqLvl:1},
  glimmer_robe_top:  {name:'Glimmer robe top', stack:false, value:240, equip:'body', dBonus:3, mBonus:9,  model:'robe', tier:'glimmer', reqSkill:'Magic', reqLvl:15},
  glimmer_hat:       {name:'Glimmer hat',      stack:false, value:120, equip:'head', dBonus:1, mBonus:5,  model:'hat',  tier:'glimmer', reqSkill:'Magic', reqLvl:15},

  /* amulets + capes */
  amulet_of_might:     {name:'Amulet of Might',     stack:false, value:220, equip:'amulet', sBonus:4, model:'amulet', reqSkill:'Defence', reqLvl:1},
  amulet_of_precision: {name:'Amulet of Precision', stack:false, value:220, equip:'amulet', aBonus:4, model:'amulet', reqSkill:'Defence', reqLvl:1},
  amulet_of_warding:   {name:'Amulet of Warding',   stack:false, value:220, equip:'amulet', dBonus:4, model:'amulet', reqSkill:'Defence', reqLvl:1},
  trav_cape_red:   {name:'Traveller\'s cape (red)',   stack:false, value:30, equip:'cape', dBonus:1, capeColor:0xa83232, model:'cape', reqSkill:'Defence', reqLvl:1},
  trav_cape_blue:  {name:'Traveller\'s cape (blue)',  stack:false, value:30, equip:'cape', dBonus:1, capeColor:0x3253a8, model:'cape', reqSkill:'Defence', reqLvl:1},
  trav_cape_green: {name:'Traveller\'s cape (green)', stack:false, value:30, equip:'cape', dBonus:1, capeColor:0x3a8a3a, model:'cape', reqSkill:'Defence', reqLvl:1},

  fen_charm:    {name:'Fenlord charm', stack:false, value:900},
  guild_sigil:  {name:'Wardens\' sigil', stack:false, value:0, equip:'cape', dBonus:5, capeColor:0xd4a83e, model:'cape', reqSkill:'Defence', reqLvl:1},
};
/* metal tiers: Copper/Bronze/Iron/Steel are generic; Whitsteel, Aurel, Veyrite, Undercrag are
   MotionScape originals. tpow = explicit tool power (woodcutting/mining), monotonic with tier.
   Existing Bronze/Iron/Steel/Aurel/Veyrite tpow values reproduce the old 1+ti*0.45 curve exactly. */
const TIERS = [
  {key:'copper',    label:'Copper',    metal:0xc6794a, req:1,  mult:0.85, price:1,   tpow:0.8},
  {key:'bronze',    label:'Bronze',    metal:0xb08d57, req:1,  mult:1.0,  price:1,   tpow:1.0},
  {key:'iron',      label:'Iron',      metal:0x9aa0a8, req:5,  mult:2.0,  price:4,   tpow:1.45},
  {key:'steel',     label:'Steel',     metal:0xd0d4dc, req:10, mult:3.2,  price:12,  tpow:1.9},
  {key:'whitsteel', label:'Whitsteel', metal:0xe8ecf2, req:15, mult:4.0,  price:26,  tpow:2.1},
  {key:'aurel',     label:'Aurel',     metal:0xd4a83e, req:20, mult:5.0,  price:45,  tpow:2.35},
  {key:'veyrite',   label:'Veyrite',   metal:0x3ec6b4, req:30, mult:7.5,  price:140, tpow:2.8},
  {key:'undercrag', label:'Undercrag', metal:0x6a5a7a, req:40, mult:9.0,  price:300, tpow:3.25},
];
/* melee weapon templates also carry per-style attack bonuses (aStab/aSlash/aCrush,
   pre-mult base values scaled by tier in buildTieredGear) for the stab/slash/crush
   combat triangle. Swords: stab-lead; sabres (scimitar): slash-lead; battleaxes/axes:
   slash+crush; picks: stab. aBonus is kept as the fallback. */
const GEAR_TEMPLATES = {
  sword:     {name:'sword',      equip:'weapon', style:'melee', speedTicks:4, a:7,  s:6,  aStab:7, aSlash:5, aCrush:0, reqSkill:'Attack',  base:25, model:'sword'},
  sabre:     {name:'sabre',      equip:'weapon', style:'melee', speedTicks:4, a:9,  s:9,  aStab:5, aSlash:9, aCrush:0, reqSkill:'Attack',  base:40, model:'sabre'},
  longsword: {name:'longsword',  equip:'weapon', style:'melee', speedTicks:5, a:8,  s:10, aStab:6, aSlash:9, aCrush:1, reqSkill:'Attack',  base:40, model:'longsword'},
  /* top-100 set 2 (2026-07-17): crush weapons + 2h + open helm + square shield */
  mace:      {name:'mace',       equip:'weapon', style:'melee', speedTicks:4, a:6,  s:7,  aStab:4, aSlash:0, aCrush:7,  reqSkill:'Attack',  base:22, model:'mace'},
  warhammer: {name:'warhammer',  equip:'weapon', style:'melee', speedTicks:6, a:5,  s:12, aStab:0, aSlash:0, aCrush:11, reqSkill:'Attack',  base:35, model:'warhammer'},
  greatsword:{name:'greatsword', equip:'weapon', style:'melee', speedTicks:7, a:8,  s:15, aStab:2, aSlash:12, aCrush:6, reqSkill:'Attack',  base:60, model:'greatsword'},
  medhelm:   {name:'med helm',   equip:'head',   d:3,  reqSkill:'Defence', base:14, model:'medhelm'},
  sqshield:  {name:'sq shield',  equip:'shield', d:5,  reqSkill:'Defence', base:26, model:'sqshield'},
  battleaxe: {name:'battleaxe',  equip:'weapon', style:'melee', speedTicks:5, a:6,  s:13, aStab:0, aSlash:6, aCrush:5, reqSkill:'Attack',  base:38, model:'battleaxe'},
  helm:      {name:'helm',       equip:'head',   d:4,  reqSkill:'Defence', base:18, model:'helm'},
  platebody: {name:'platebody',  equip:'body',   d:11, reqSkill:'Defence', base:80, model:'plate'},
  platelegs: {name:'platelegs',  equip:'legs',   d:7,  reqSkill:'Defence', base:60, model:'legs'},
  /* top-100 set 3: metal-tiered chain + skirt (body-fit worn overlays) */
  chainbody: {name:'chainbody',  equip:'body',   d:9,  reqSkill:'Defence', base:70, model:'chainbody'},
  plateskirt:{name:'plateskirt', equip:'legs',   d:7,  reqSkill:'Defence', base:60, model:'plateskirt'},
  kiteshield:{name:'kiteshield', equip:'shield', d:6,  reqSkill:'Defence', base:34, model:'kiteshield'},
  hatchet:   {name:'hatchet',    equip:'weapon', style:'melee', speedTicks:5, a:1, s:2, aStab:0, aSlash:1, aCrush:1, tool:'woodcutting', base:16, model:'axe'},
  pickaxe:   {name:'pickaxe',    equip:'weapon', style:'melee', speedTicks:5, a:1, s:2, aStab:1, aSlash:0, aCrush:0, tool:'mining', base:16, model:'pick'},
};
const GEAR_WEIGHTS = {sword:1.8, longsword:2.4, sabre:2.0, axe:2.2, battleaxe:3.0, helm:2.7, plate:9, legs:9,
  shield:5.4, kiteshield:5.4, bow:1.3, longbow:1.8, staff:2.1, robe:0.9, hat:0.4,
  mace:2.0, warhammer:4.5, greatsword:4.0, medhelm:2.0, sqshield:4.0,
  chainbody:6, plateskirt:8, chaps:2, gloves:0.4, boots:0.6};
/* Legacy hand-authored ids that predate buildTieredGear own these tier×template
   slots. Aliasing keeps a single canonical item (so no two items share a display
   name) and preserves every existing drop / shop / quest / tutorial reference to
   the old id. The validator resolves these to their target instead of expecting a
   generated `<tier>_<template>` item. */
const GEAR_ALIASES = {
  bronze_hatchet:   'hatchet',
  bronze_pickaxe:   'pickaxe',
  bronze_platebody: 'bronze_plate',
  bronze_platelegs: 'bronze_legs',
};
function buildTieredGear(items){
  TIERS.forEach((t,ti)=>{
    for(const tk in GEAR_TEMPLATES){
      const tpl=GEAR_TEMPLATES[tk];
      const id = `${t.key}_${tk}`;
      if(GEAR_ALIASES[id]) continue;   // canonical legacy item already owns this slot
      if(items[id]) continue;
      const def = {name:`${t.label} ${tpl.name}`, stack:false,
        value: Math.round(tpl.base*t.price), tier:t.key, template:tk, model:tpl.model,
        weight: GEAR_WEIGHTS[tpl.model]||1,
        reqSkill:tpl.reqSkill||'Attack', reqLvl:t.req};
      if(tpl.equip){ def.equip=tpl.equip;
        if(tpl.style){ def.style=tpl.style; def.speedTicks=tpl.speedTicks;
          def.aBonus=Math.round(tpl.a*t.mult); def.sBonus=Math.round(tpl.s*t.mult);
          if(tpl.style==='melee'){   // stab/slash/crush attack split scales with the tier, like aBonus
            def.aStab =Math.round((tpl.aStab ||0)*t.mult);
            def.aSlash=Math.round((tpl.aSlash||0)*t.mult);
            def.aCrush=Math.round((tpl.aCrush||0)*t.mult); } }
        else def.dBonus=Math.round(tpl.d*t.mult);
      }
      if(tpl.tool){ def.tool=tpl.tool; def.power=(t.tpow!=null ? t.tpow : 1+ti*0.45); }
      items[id]=def;
    }
  });
}
const EQUIP_SLOTS = [['head','Head'],['body','Body'],['legs','Legs'],['weapon','Weapon'],
                     ['shield','Shield'],['amulet','Amulet'],['cape','Cape'],
                     ['hands','Hands'],['feet','Feet']];   // set 3: gloves + boots slots

buildTieredGear(ITEMS);

const SKILLS = ['Attack','Strength','Defence','Hitpoints','Ranged','Magic','Prayer',
                'Woodcutting','Mining','Fishing','Cooking','Firemaking','Smithing','Fletching','Thieving'];

/* OSRS XP curve */
const XP_TABLE = (()=>{ const t=[0,0]; let pts=0;
  for(let lv=1; lv<100; lv++){ pts += Math.floor(lv + 300*Math.pow(2, lv/7));
    t[lv+1] = Math.floor(pts/4); } return t; })();
function levelFromXp(xp){ let lv=1; while(lv<99 && xp>=XP_TABLE[lv+1]) lv++; return lv; }

/* per-tick gather success, interpolated low(lv1) -> high(lv99), OSRS-style */
const GATHER_RATES = {
  tree: {low:0.25, high:0.70, xp:25,  item:'logs',       toolMsg:'You must be wielding an axe to chop down this tree.'},
  rock: {low:0.18, high:0.60, xp:32,  item:'copper_ore', toolMsg:'You need a pickaxe to mine this rock.'},
  fish: {low:0.22, high:0.65, xp:28,  item:'raw_perch',  toolMsg:'You need a small net to catch these fish.'},
};
function gatherChance(rtype, lvl, power){
  const r=GATHER_RATES[rtype];
  return Math.min(0.95, (r.low + (r.high-r.low)*(lvl-1)/98) * power);
}

/* NPCs: OSRS-style stat blocks (att/str/def levels + bonuses, speed in ticks) */
const NPC_TYPES = {
  pasturehen:{name:'Pasture hen', level:1, examine:"The yard's finest egg engine.", hp:3, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0, dStab:0, dSlash:0, dCrush:0, speedTicks:4, color:0xeae4d8, size:0.5, aggro:false, respawn:10, model:'chicken',
             drops:[ {id:'bones',q:1,p:1}, {id:'feathers',q:[3,8],p:1}, {id:'egg',q:1,p:0.3} ]},
  oathbreaker:{name:'The Oathbreaker', level:32, examine:'A fallen warden, chained a century and hating every link of it.',
             hp:88, att:28, str:30, def:22, aBonus:14, sBonus:18, dBonus:12, dStab:13, dSlash:14, dCrush:9, speedTicks:5, color:0x5a4a5e, size:1.45,
             aggro:false, respawn:45, body:'brute',
             drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[90,260],p:1}, {id:'steel_sword',q:1,p:0.14},
                     {id:'steel_platebody',q:1,p:0.1}, {id:'chaos_rune',q:[4,12],p:0.4} ]},
  bogling:  {name:'Bogling', level:3, examine:"A surly swamp imp, all tusks and grievance.", hp:8, att:3, str:3, def:2, aBonus:1, sBonus:1, dBonus:1, dStab:1, dSlash:0, dCrush:2, speedTicks:4, color:0x6f9a4a, size:0.76, aggro:false, respawn:14, model:'bogling',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[2,12],p:0.85}, {id:'mind_rune',q:[1,3],p:0.15} ]},
  skeleton: {name:'Skeleton', level:15, examine:"It rattles with old menace. Bare bone shrugs off a thrust but splinters under a heavy blow.", hp:29, att:14, str:13, def:12, aBonus:8, sBonus:9, dBonus:7, dStab:11, dSlash:8, dCrush:3, speedTicks:4, color:0xe8e2d0, size:1.0, aggro:true, respawn:20, model:'skeleton',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[8,40],p:0.9}, {id:'iron_sword',q:1,p:0.05}, {id:'bronze_helm',q:1,p:0.05}, {id:'mind_rune',q:[1,4],p:0.2} ]},
  gnarlgob: {name:'Gnarlgob', level:5, examine:"Small, green and furious about it.", hp:13, att:5, str:4, def:3, aBonus:2, sBonus:2, dBonus:1, dStab:2, dSlash:1, dCrush:0, speedTicks:4, color:0x6a8a3a, size:0.78, aggro:true, respawn:14, model:'goblin',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[3,18],p:0.9}, {id:'bronze_sword',q:1,p:0.06}, {id:'bronze_helm',q:1,p:0.05}, {id:'mind_rune',q:[1,4],p:0.2} ]},
  moss_seer:{name:'Moss seer', level:5, examine:"It hums with damp magic.", hp:13, att:5, str:4, def:4, aBonus:3, sBonus:2, dBonus:2, dStab:2, dSlash:1, dCrush:3, speedTicks:5, color:0x3a6a4a, size:1, aggro:true, respawn:22, humanoid:true, robe:0x3a6a4a, hat:'wizard', ranged:true,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[8,30],p:1}, {id:'air_rune',q:[2,6],p:0.6}, {id:'mind_rune',q:[2,6],p:0.6}, {id:'apprentice_staff',q:1,p:0.06}, {id:'cloth_robe_top',q:1,p:0.06} ]},
  burrowrat:{name:'Burrow rat', level:1, examine:"Overgrown and underfed.", hp:4, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0, dStab:0, dSlash:0, dCrush:0, speedTicks:4, color:0x6b5440, size:0.85, aggro:false, respawn:8, model:'rat',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[1,5],p:0.6} ]},
  moorcalf: {name:'Moorcalf', level:2, examine:"Converts grass into hide and hoof.", hp:9, att:1, str:2, def:2, aBonus:0, sBonus:0, dBonus:0, dStab:1, dSlash:0, dCrush:1, speedTicks:5, color:0x9a8468, size:1.25, aggro:false, respawn:15, model:'cow',
             drops:[ {id:'bones',q:1,p:1}, {id:'beast_hide',q:1,p:1}, {id:'raw_beef',q:1,p:1}, {id:'coins',q:[2,10],p:0.5} ]},
  duneclaw: {name:'Duneclaw', level:12, examine:"All shell and spite. A blade glances off; a mace caves it in.", hp:24, att:11, str:10, def:9, aBonus:6, sBonus:6, dBonus:6, dStab:7, dSlash:10, dCrush:2, speedTicks:4, color:0xc4a04a, size:0.9, aggro:true, respawn:20, body:'crab',
             drops:[ {id:'coins',q:[15,55],p:1}, {id:'steel_sword',q:1,p:0.05}, {id:'amulet_of_precision',q:1,p:0.02} ]},
  bryn_raider:{name:'Bryn raider', level:18, examine:"A northerner spoiling for a scrap.", hp:38, att:16, str:17, def:14, aBonus:10, sBonus:12, dBonus:8, dStab:6, dSlash:10, dCrush:7, speedTicks:4, color:0x7a3d2a, size:1, aggro:true, respawn:25, humanoid:true, weapon:'battleaxe', helm:'iron', armour:'leather',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[25,80],p:1}, {id:'steel_battleaxe',q:1,p:0.06}, {id:'steel_helm',q:1,p:0.08}, {id:'hollow_ale',q:1,p:0.3} ]},
  hex_adept:{name:'Hex adept', level:24, examine:"Its robes crackle with stolen sparks.", hp:42, att:22, str:20, def:18, aBonus:14, sBonus:10, dBonus:10, dStab:11, dSlash:9, dCrush:10, speedTicks:5, color:0x4a3a7a, size:1, aggro:true, respawn:30, humanoid:true, robe:0x4a3a7a, hat:'wizard', ranged:true,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[40,110],p:1}, {id:'chaos_rune',q:[2,6],p:0.6}, {id:'air_rune',q:[4,12],p:0.7}, {id:'ember_staff',q:1,p:0.05}, {id:'glimmer_hat',q:1,p:0.04}, {id:'amulet_of_warding',q:1,p:0.02} ]},
  gravewight:{name:'Gravewight', level:30, examine:"Death only made it angrier. Its dry frame dreads a crushing weapon.", hp:55, att:28, str:26, def:24, aBonus:16, sBonus:14, dBonus:14, dStab:18, dSlash:15, dCrush:8, speedTicks:4, color:0x8a8a92, size:1.05, aggro:true, respawn:35, humanoid:true, weapon:'sword', skin:0xb8bcc4, helm:'iron', shield:true, drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[60,160],p:1}, {id:'aurel_sword',q:1,p:0.05}, {id:'aurel_platelegs',q:1,p:0.04}, {id:'amulet_of_might',q:1,p:0.03} ]},
  ash_stalker:{name:'Ash stalker', level:38, examine:"It hunts where the land burned. Slag-plated hide turns aside blunt force — find the gap with a point.", hp:70, att:36, str:34, def:30, aBonus:20, sBonus:18, dBonus:18, dStab:12, dSlash:18, dCrush:24, speedTicks:4, color:0x3a3a42, size:1.25, aggro:true, respawn:40, body:'wolf',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[90,220],p:1}, {id:'aurel_platebody',q:1,p:0.05}, {id:'veyrite_sword',q:1,p:0.015}, {id:'gale_longbow',q:1,p:0.03} ]},

  hold_knight: {name:'Hold Knight', level:18, hp:35, att:16, str:14, def:18, aBonus:12, sBonus:10, dBonus:16, dStab:18, dSlash:19, dCrush:11,
    speedTicks:4, color:0xd8dce2, size:1.05, aggro:false, respawn:30, humanoid:true, weapon:'sword', helm:'steel', armour:'steel', legArmour:'steel', shield:true,
    examine:"A knight of Whitmoor. Polished, patient, deadly.",
    drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[10,40],p:0.9}, {id:'iron_sword',q:1,p:0.05},
            {id:'iron_platebody',q:1,p:0.03}, {id:'whitsteel_sword',q:1,p:0.03}, {id:'whitsteel_helm',q:1,p:0.02},
            {id:'bread',q:1,p:0.2} ]},
  deep_crawler: {name:'Deep crawler', level:25, hp:38, att:22, str:20, def:16, aBonus:12, sBonus:10, dBonus:8, dStab:9, dSlash:10, dCrush:3,
    speedTicks:4, color:0x3a3548, size:1.1, aggro:true, alwaysAggro:true, respawn:35, body:'crawler',
    examine:"It has never seen the sun, and resents that you have. Its chitin splits to a crushing blow.",
    drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[30,90],p:1}, {id:'chaos_rune',q:[2,6],p:0.4},
            {id:'iron_platelegs',q:1,p:0.04} ]},
  korthul: {name:'Korthul the Undercrag', level:58, hp:130, att:48, str:46, def:40, aBonus:22, sBonus:24, dBonus:20, dStab:22, dSlash:24, dCrush:14, boss:true, script:'korthul', body:'brute', atype:'crush',
    speedTicks:5, color:0x4a4456, size:2.6, aggro:true, alwaysAggro:true, respawn:120,
    examine:"The mountain's grudge, given legs.",
    drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[400,900],p:1}, {id:'crag_maul',q:1,p:0.05},
            {id:'veyrite_sabre',q:1,p:0.08}, {id:'aurel_platebody',q:1,p:0.1},
            {id:'undercrag_sword',q:1,p:0.04}, {id:'undercrag_platebody',q:1,p:0.025},
            {id:'nature_rune',q:[4,12],p:0.7}, {id:'chaos_rune',q:[6,20],p:0.7}, {id:'fen_charm',q:1,p:0.2} ]},
  wizard: {name:'Wizard', level:9, hp:20, att:8, str:6, def:6, aBonus:6, sBonus:4, dBonus:4, dStab:4, dSlash:3, dCrush:5,
    speedTicks:5, color:0x35418f, size:1.0, aggro:true, respawn:24, humanoid:true, robe:0x35418f, hat:'wizard', ranged:true,
    examine:"A robed scholar of the Spire. Quick to take offence.",
    drops:[ {id:'bones',q:1,p:1}, {id:'air_rune',q:[2,8],p:0.8}, {id:'mind_rune',q:[2,8],p:0.7},
            {id:'water_rune',q:[2,6],p:0.3}, {id:'earth_rune',q:[2,6],p:0.3}, {id:'fire_rune',q:[2,6],p:0.3},
            {id:'chaos_rune',q:[1,3],p:0.15}, {id:'nature_rune',q:1,p:0.08},
            {id:'coins',q:[2,12],p:0.6}, {id:'wizard_hat',q:1,p:0.04} ]},
  monk: {name:'Monk', level:5, hp:15, att:3, str:3, def:4, aBonus:1, sBonus:1, dBonus:3, dStab:3, dSlash:2, dCrush:4,
    speedTicks:5, color:0x6b5a3a, size:1.0, aggro:false, respawn:30, humanoid:true, robe:0x6b5a3a,
    examine:"A devoted brother of the Dawn.",
    drops:[{id:'bones',q:1,p:1},{id:'coins',q:[2,7],p:0.6},{id:'bread',q:1,p:0.25},
           {id:'monk_robe_top',q:1,p:0.05},{id:'monk_robe_bottom',q:1,p:0.05},{id:'holy_symbol',q:1,p:0.02}]},
  wanderer: {name:'Wanderer', level:2, hp:7, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0, dStab:0, dSlash:0, dCrush:0,
    speedTicks:4, color:0x7a6a52, size:1.0, aggro:false, respawn:25, examine:"One of Veyhollow's idle hands.",
    humanoid:true,
    drops:[{id:'bones',q:1,p:1},{id:'coins',q:[1,4],p:0.85},{id:'bread',q:1,p:0.1}]},
  grubkin:  {name:'Grubkin', level:2, examine:"A wriggling pest of the commons.",  hp:7,  att:1,  str:1,  def:1,  aBonus:0,  sBonus:0,  dBonus:0, dStab:1, dSlash:0, dCrush:1,  speedTicks:4, color:0x6a8f3c, size:0.8, aggro:false, respawn:12, body:'crawler',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[3,12],p:0.8}, {id:'arrows',q:[2,6],p:0.3}, {id:'bronze_sword',q:1,p:0.06}, {id:'mind_rune',q:[1,4],p:0.2}, {id:'leather_body',q:1,p:0.05} ]},
  mosswolf: {name:'Mosswolf', level:8, examine:"A lean marsh-hunter. Its hide parts cleanly to a slashing edge.", hp:18, att:7,  str:7,  def:6,  aBonus:4,  sBonus:4,  dBonus:4, dStab:4, dSlash:1, dCrush:7,  speedTicks:4, color:0x4f6b4a, size:1.0, aggro:true, respawn:18, body:'wolf',
             glb:'assets/models/mosswolf.glb', glbHeight:0.95, barH:1.35, skinnedRig:true, animDriver:'wolf',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[10,40],p:0.9}, {id:'raw_perch',q:1,p:0.25}, {id:'wood_shield',q:1,p:0.08}, {id:'bronze_helm',q:1,p:0.06} ]},
  fenwretch:{name:'Fenwretch', level:15, hp:30, att:14, str:13, def:12, aBonus:8,  sBonus:8,  dBonus:10, dStab:11, dSlash:8, dCrush:12, speedTicks:4, color:0x57456b, size:1.1, aggro:true, respawn:25, body:'brute', atype:'crush',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[30,90],p:1}, {id:'iron_sword',q:1,p:0.05}, {id:'bronze_plate',q:1,p:0.08}, {id:'bronze_legs',q:1,p:0.08} ]},
  duelist:  {name:'Pit duelist', level:10, examine:"A professional. Mind the footwork.", hp:30, att:10, str:10, def:8, aBonus:6, sBonus:6, dBonus:5, dStab:5, dSlash:6, dCrush:4, speedTicks:4, color:0x8a5a32, size:1, aggro:false, respawn:9999, humanoid:true, weapon:'sword',
             drops:[]},
  fenlord:  {name:'The Fenlord', level:15, examine:"The marsh bows to it. You shouldn't.", hp:40, att:14, str:12, def:8, aBonus:8, sBonus:7, dBonus:8, dStab:9, dSlash:6, dCrush:9, speedTicks:5, color:0x2d1b3d, size:2.2, aggro:true, respawn:90, boss:true, script:'fenlord', body:'brute', atype:'crush',
             drops:[{id:'big_bones',q:1,p:1}, {id:'coins',q:[120,300],p:1}, {id:'fen_charm',q:1,p:0.5}, {id:'steel_sabre',q:1,p:0.3}, {id:'veyrite_sabre',q:1,p:0.02} ]},
  ash_wyrm: {name:'The Ash Wyrm', level:62,
             examine:"A dragon of the deep Scarlands, its hide a shell of cooled slag. Blunt blows ring off it — find the gap with a point.",
             hp:165, att:52, str:50, def:44, aBonus:24, sBonus:26, dBonus:30, dStab:18, dSlash:34, dCrush:40,
             speedTicks:6, color:0x3a2a24, size:2.8, aggro:false, respawn:150, boss:true, script:'ashwyrm', atype:'crush',
             glb:'assets/models/ash_wyrm_built.glb', glbHeight:3.4, barH:4.4, skinnedRig:true,
             drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[500,1200],p:1}, {id:'veyrite_sword',q:1,p:0.08},
                     {id:'veyrite_sabre',q:1,p:0.05}, {id:'aurel_platebody',q:1,p:0.12}, {id:'gale_longbow',q:1,p:0.05},
                     {id:'nature_rune',q:[6,16],p:0.7}, {id:'fire_rune',q:[10,30],p:0.8}, {id:'fen_charm',q:1,p:0.3} ]},
  giant_mole:{name:'Giant Mole', level:46,
             examine:"It undermines the whole kingdom, one burrow at a time.",
             hp:110, att:38, str:40, def:35, aBonus:18, sBonus:22, dBonus:24, dStab:22, dSlash:12, dCrush:26,
             speedTicks:5, color:0x5a4234, size:2.4, aggro:false, respawn:60, atype:'crush',
             glb:'assets/models/giant_mole.glb', glbHeight:2.5, barH:3.0, skinnedRig:true, animDriver:'mole',
             drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[150,400],p:1}, {id:'beast_hide',q:[1,3],p:0.8},
                     {id:'steel_sabre',q:1,p:0.06}, {id:'nature_rune',q:[4,10],p:0.5}, {id:'fen_charm',q:1,p:0.2} ]},

  /* ---- new mobs (reuse existing models/bodies) ---- */
  // Emberwood (west forest, low threat): a tusked forest hog. Bristled hide parts to a slash.
  thornboar:{name:'Thornboar', level:6, examine:"A tusked forest hog, quick to charge. Its bristled hide parts to a slashing edge.",
             hp:16, att:6, str:7, def:5, aBonus:3, sBonus:4, dBonus:3, dStab:5, dSlash:1, dCrush:6, speedTicks:4, color:0x6b4a2e, size:0.95, aggro:true, respawn:16, body:'wolf',
             drops:[ {id:'bones',q:1,p:1}, {id:'beast_hide',q:1,p:0.5}, {id:'raw_beef',q:1,p:0.7}, {id:'coins',q:[6,24],p:0.8}, {id:'logs',q:[1,2],p:0.3}, {id:'wood_shield',q:1,p:0.05} ]},
  // Stonereach Quarry (mining zone, low-mid): a pale rock-louse. Stony shell caves to a crushing blow.
  quarry_crawler:{name:'Quarry crawler', level:9, examine:"A pale rock-louse from the quarry deeps. Its stony shell caves to a crushing blow.",
             hp:20, att:8, str:8, def:7, aBonus:5, sBonus:5, dBonus:6, dStab:9, dSlash:8, dCrush:2, speedTicks:4, color:0x7a7264, size:0.95, aggro:true, respawn:18, body:'crawler',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[8,30],p:0.9}, {id:'copper_ore',q:1,p:0.4}, {id:'tin_ore',q:1,p:0.3}, {id:'iron_ore',q:1,p:0.12} ]},
  // The Ashar Dunes (mid): a lean desert hunter that runs down stragglers. Thin hide splits to a slash.
  dust_jackal:{name:'Dust jackal', level:14, examine:"A lean desert hunter that runs down stragglers. Its thin hide splits to a slashing edge.",
             hp:28, att:13, str:12, def:10, aBonus:8, sBonus:8, dBonus:7, dStab:8, dSlash:3, dCrush:9, speedTicks:4, color:0xc8a86a, size:0.9, aggro:true, respawn:20, body:'wolf',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[15,55],p:1}, {id:'beast_hide',q:1,p:0.6}, {id:'steel_sword',q:1,p:0.03}, {id:'hollow_ale',q:1,p:0.15} ]},
  // The Scarlands (high, deep-north): a charred revenant. Bone resists a point; steel splinters it.
  cinder_shade:{name:'Cinder shade', level:34, examine:"A charred revenant of the Scarlands, bone showing through cracked ash. Steel splinters it; a point skitters off.",
             hp:62, att:32, str:30, def:28, aBonus:18, sBonus:16, dBonus:16, dStab:20, dSlash:14, dCrush:6, speedTicks:4, color:0x4a3a34, size:1.05, aggro:true, respawn:38, model:'skeleton',
             drops:[ {id:'big_bones',q:1,p:1}, {id:'ashes',q:1,p:1}, {id:'coins',q:[70,180],p:1}, {id:'chaos_rune',q:[2,6],p:0.4}, {id:'aurel_sword',q:1,p:0.04}, {id:'aurel_platelegs',q:1,p:0.03}, {id:'veyrite_sword',q:1,p:0.01} ]},
};
/* derive an OSRS-style npc max hit from its strength stats */
function npcMaxHit(t){ return Math.max(1, Math.floor(0.5 + (t.str+8)*(t.sBonus+64)/640)); }

const SHOPS = {
  bowyer: {name:"Rask's Bows & Shafts", stock:[
    {id:'worn_bow',price:35},{id:'ash_bow',price:175},{id:'arrows',price:2},
    {id:'feathers',price:2},{id:'knife',price:3},{id:'arrow_shafts',price:1},
  ]},
  marble_arms: {name:'Marble Arms', stock:[
    {id:'iron_sword',price:130},{id:'iron_platebody',price:340},{id:'iron_platelegs',price:260},
    {id:'iron_helm',price:90},{id:'iron_kiteshield',price:190},{id:'iron_hatchet',price:60},
  ]},
  gilded_boar: {name:'The Gilded Boar', stock:[
    {id:'bread',price:4},{id:'cooked_perch',price:11},{id:'hollow_ale',price:3},
    {id:'cooked_meat',price:6},{id:'cheese',price:6},
  ]},
  spire: {name:"The Spire Vaults", stock:[
    {id:'air_rune',price:4},{id:'water_rune',price:4},{id:'earth_rune',price:4},{id:'fire_rune',price:4},
    {id:'mind_rune',price:3},{id:'body_rune',price:3},{id:'chaos_rune',price:28},{id:'nature_rune',price:45},
    {id:'wizard_hat',price:32},{id:'apprentice_staff',price:42},
  ]},
  bazaar:   {name:'Hollow Bazaar', stock:[
    {id:'hatchet',price:20},{id:'pickaxe',price:20},{id:'fishing_net',price:15},
    {id:'fishing_rod',price:6},{id:'fly_fishing_rod',price:12},
    {id:'arrows',price:2},{id:'air_rune',price:5},{id:'mind_rune',price:4},
    {id:'hammer',price:2},{id:'tinderbox',price:2},{id:'knife',price:3},
    {id:'bread',price:5},{id:'cooked_perch',price:15},{id:'wood_shield',price:25},{id:'leather_body',price:18},
    /* top-100 batch 1 general-store lines (2026-07-17) */
    {id:'bucket',price:2},{id:'jug',price:1},{id:'pot',price:1},{id:'bowl',price:5},
    {id:'rope',price:22},{id:'shears',price:2},{id:'spade',price:6},{id:'chisel',price:3},
    {id:'cabbage',price:2},{id:'potato',price:2},{id:'onion',price:2},{id:'egg',price:3},{id:'cheese',price:6}]},
  smith:    {name:'Stonereach Smithy', stock:[
    {id:'copper_sword',price:20},{id:'copper_helm',price:14},{id:'copper_pickaxe',price:45},{id:'copper_hatchet',price:45},
    {id:'bronze_sword',price:30},{id:'bronze_longsword',price:48},{id:'bronze_helm',price:22},{id:'bronze_plate',price:95},{id:'bronze_legs',price:75},
    {id:'iron_longsword',price:190},
    {id:'bronze_mace',price:26},{id:'bronze_warhammer',price:42},{id:'bronze_greatsword',price:72},
    {id:'bronze_medhelm',price:17},{id:'bronze_sqshield',price:31},
    {id:'bronze_chainbody',price:60},{id:'bronze_plateskirt',price:60},{id:'iron_chainbody',price:240},
    {id:'iron_sword',price:150},{id:'iron_helm',price:90},{id:'iron_platebody',price:380},{id:'iron_platelegs',price:290},{id:'iron_kiteshield',price:165},
    {id:'steel_sword',price:380},{id:'steel_sabre',price:600},{id:'steel_battleaxe',price:560},{id:'steel_helm',price:280},{id:'steel_platebody',price:1200},{id:'steel_platelegs',price:900},{id:'steel_kiteshield',price:520},
    {id:'aurel_sword',price:1400},{id:'aurel_platebody',price:4500},
    {id:'iron_hatchet',price:70},{id:'iron_pickaxe',price:70},{id:'steel_hatchet',price:240},{id:'steel_pickaxe',price:240}]},
  arcanist: {name:'Glimmerveil Arcana', stock:[
    {id:'air_rune',price:5},{id:'water_rune',price:5},{id:'earth_rune',price:5},{id:'fire_rune',price:5},
    {id:'mind_rune',price:4},
    {id:'apprentice_staff',price:45},{id:'ember_staff',price:230},{id:'storm_staff',price:700},
    {id:'cloth_robe_top',price:15},{id:'cloth_robe_skirt',price:12},{id:'apprentice_hat',price:10},
    {id:'glimmer_robe_top',price:300},{id:'glimmer_hat',price:150},
    {id:'amulet_of_might',price:280},{id:'amulet_of_precision',price:280},{id:'amulet_of_warding',price:280}]},
  clothier: {name:'Threadworks', stock:[
    {id:'trav_cape_red',price:35},{id:'trav_cape_blue',price:35},{id:'trav_cape_green',price:35},
    {id:'leather_body',price:18},{id:'cloth_robe_top',price:15},{id:'cloth_robe_skirt',price:12},
    {id:'wool',price:3},{id:'ball_of_wool',price:6},{id:'leather',price:8},
    {id:'leather_chaps',price:14},{id:'leather_gloves',price:8},{id:'leather_boots',price:8}]},
  pub:      {name:'The Tipsy Grub', stock:[
    {id:'hollow_ale',price:3},{id:'bread',price:4},{id:'cooked_perch',price:12}]},
  fletcher: {name:'Brynholt Bowyer', stock:[
    {id:'worn_bow',price:35},{id:'ash_bow',price:220},{id:'gale_longbow',price:680},{id:'arrows',price:2},
    {id:'bow_string',price:15},{id:'flax',price:4}]},
};
const SHOP_STOCK = [
  {id:'hatchet', price:20}, {id:'iron_hatchet', price:70},
  {id:'pickaxe', price:20}, {id:'iron_pickaxe', price:70},
  {id:'fishing_net', price:15},
  {id:'bronze_sword', price:30}, {id:'wood_shield', price:25}, {id:'bronze_helm', price:22},
  {id:'leather_body', price:18}, {id:'bronze_plate', price:95}, {id:'bronze_legs', price:75},
  {id:'arrows', price:2}, {id:'air_rune', price:5}, {id:'mind_rune', price:4}, {id:'iron_sword', price:150},
];

/* QUESTS — OSRS-style data-driven state machines.
 * stages[0] = how to start (shown before the quest is taken); a started quest is at stage 1.
 * Stage objects: {text, type:'talk'|'kill'|'goto'|'bring', npc, zone, at:[x,z], target, count, items:[{id,q}]}
 *  - kill  : Quest.onKill counts `target` NPC-type kills up to `count`, then auto-advances.
 *  - goto  : Quest.onZone advances when the player enters `zone`.
 *  - talk  : advanced from the giver's dialogue tree.
 *  - bring : turn-in stage — dialogue checks `items` in the inventory, takes them, advances.
 * `requires` gates the start (quests / QP). `qp` = quest points. stage 99 = complete. */
const QUESTS = {
  undercroft_oath: {
    name:'Oath of the Undercroft', giver:'Old Halbrec', qp:2, difficulty:'Intermediate',
    desc:'A forgotten warden waits below Wardenholm Keep, bound to an oath older than its walls — and to the thing chained beside him.',
    stages:[
      {text:'Find Old Halbrec in the undercroft beneath Wardenholm Keep (down the kitchen trapdoor).', npc:'halbrec', at:[62,-6]},
      {text:'Slay the Oathbreaker chained in the keep\'s dungeon.', type:'kill', target:'oathbreaker', count:1, at:[62,-6]},
      {text:'Return to Old Halbrec with word of the deed.', type:'talk', npc:'halbrec'},
      {text:'Carry Halbrec\'s blessing to Lady Maren, at the top of the keep\'s tower.', type:'talk', npc:'maren'},
    ],
    reward:{xp:{Attack:800, Defence:500}, items:[{id:'coins',q:450},{id:'steel_sword',q:1}]},
  },
  grub_trouble: {
    name:'Grub Trouble', giver:'Warden Maela', qp:1, difficulty:'Novice',
    desc:'Grubkins gnaw at the commons fences and frighten the hens. Warden Maela wants their numbers thinned.',
    stages:[
      {text:'Speak to Warden Maela by the Veyhollow bank.', npc:'maela'},
      {text:'Slay 3 grubkins in the commons (%n/3). Their mounds rise north-east of town.', type:'kill', target:'grubkin', count:3, at:[24,33]},
      {text:'Return to Warden Maela.', type:'talk', npc:'maela'},
    ],
    reward:{xp:{Attack:120}, items:[{id:'coins',q:60},{id:'wood_shield',q:1}]},
  },
  thirsty_smith: {
    name:'The Thirsty Smith', giver:'Ferra the Smith', qp:1, difficulty:'Novice',
    desc:'Ferra won\'t light the forge without a Hollow ale from The Tipsy Grub.',
    stages:[
      {text:'Speak to Ferra at the Stonereach Smithy.', npc:'ferra'},
      {text:'Buy a Hollow ale at The Tipsy Grub and bring it to Ferra.', type:'bring', npc:'ferra', items:[{id:'hollow_ale',q:1}]},
    ],
    reward:{xp:{Attack:300}, items:[{id:'steel_sword',q:1},{id:'coins',q:50}]},
  },
  splinters: {
    name:'Splinters & Sparks', giver:'Olun the Miller', qp:1, difficulty:'Novice',
    desc:'Olun the Miller needs 5 sturdy logs for his cracked mill wheel.',
    stages:[
      {text:'Speak to Olun the Miller near Emberwood.', npc:'olun'},
      {text:'Bring Olun 5 logs — the Emberwood trees grow thick just west.', type:'bring', npc:'olun', items:[{id:'logs',q:5}], zone:'emberwood'},
    ],
    reward:{xp:{Woodcutting:200}, items:[{id:'coins',q:80},{id:'iron_hatchet',q:1}]},
  },
  wardens_trial: {
    name:'The Wardens\' Trial', giver:'Warden Maela', qp:2, difficulty:'Experienced',
    desc:'Prove yourself worthy of the Wardens\' Guild by felling the Fenlord that broods in Gloomfen.',
    requires:{quests:['grub_trouble']},
    stages:[
      {text:'Ask Warden Maela about the Wardens\' Guild (requires Grub Trouble).', npc:'maela'},
      {text:'Slay the Fenlord in Gloomfen, south-west of Veyhollow.', type:'kill', target:'fenlord', count:1, zone:'gloomfen'},
      {text:'Return to Warden Maela for your sigil.', type:'talk', npc:'maela'},
    ],
    reward:{xp:{Attack:600, Defence:600}, items:[{id:'guild_sigil',q:1},{id:'coins',q:300}]},
  },
  quarry_pests: {
    name:'Pests in the Deeps', giver:'Ferra the Smith', qp:1, difficulty:'Novice',
    desc:'Ferra can\'t work the Stonereach seams — pale quarry crawlers have overrun the deeps and gnaw at the ore carts.',
    requires:{quests:['thirsty_smith']},
    stages:[
      {text:'Speak to Ferra at the Stonereach Smithy.', npc:'ferra'},
      {text:'Cull 4 quarry crawlers in the Stonereach deeps (%n/4).', type:'kill', target:'quarry_crawler', count:4, zone:'quarry'},
      {text:'Return to Ferra with the deeps cleared.', type:'talk', npc:'ferra'},
    ],
    reward:{xp:{Mining:250, Defence:150}, items:[{id:'iron_pickaxe',q:1},{id:'coins',q:120}]},
  },
  /* ---- Main storyline: the Scarring is waking (STORY_BIBLE §1 "the long arc") ---- */
  whispers_moss: {
    name:'Whispers in the Moss', giver:'Old Pell', qp:1, difficulty:'Novice',
    desc:'Old Pell swears the standing stones west of town have begun to hum — the same hum his grandmother heard before the Scarring.',
    requires:{quests:['grub_trouble']},   // the seers (lvl 9) eat unproven adventurers — earn your sword arm first
    stages:[
      {text:'Speak to Old Pell in Veyhollow Commons.', npc:'greeter'},
      {text:'Silence 2 moss seers at the Seers\' Ring west of town and take their resonant moss (%n/2).', type:'kill', target:'moss_seer', count:2, at:[-30,44]},
      {text:'Bring word of the humming stones back to Old Pell.', type:'talk', npc:'greeter'},
    ],
    reward:{xp:{Prayer:200}, items:[{id:'coins',q:100}]},
  },
  seers_ashes: {
    name:'The Seer\'s Ashes', giver:'Sage Imbrel', qp:1, difficulty:'Intermediate',
    desc:'The Spire must know why the Seers\' Ring hums. Sage Imbrel needs runes for a scrying rite — and ash from the Scarlands, where the hum is loudest.',
    requires:{quests:['whispers_moss']},
    stages:[
      {text:'Speak to Sage Imbrel at Glimmerveil Arcana in Veyhollow.', npc:'arcanist'},
      {text:'Bring Sage Imbrel 2 fire runes and 2 earth runes for the scrying rite.', type:'bring', npc:'arcanist', items:[{id:'fire_rune',q:2},{id:'earth_rune',q:2}]},
      {text:'Carry the warded ash-catcher north, past the Wilderness Ditch, into the Scarlands.', type:'goto', zone:'scarlands'},
      {text:'Slay 2 ash stalkers and gather their still-burning ash (%n/2).', type:'kill', target:'ash_stalker', count:2, zone:'scarlands'},
      {text:'Return the ashes to Sage Imbrel.', type:'talk', npc:'arcanist'},
    ],
    reward:{xp:{Magic:500}, items:[{id:'mind_rune',q:20},{id:'coins',q:150}]},
  },
  knights_vigil: {
    name:'The Knight\'s Vigil', giver:'Captain Veyle', qp:1, difficulty:'Intermediate',
    desc:'Imbrel\'s scrying points beneath Whitmoor: something below the crag is drawing the Scarring\'s heat — and the dead of the Scarlands are rising restless.',
    requires:{quests:['seers_ashes']},
    stages:[
      {text:'Speak to Captain Veyle at Whitmoor Hold.', npc:'captain'},
      {text:'Cull 2 gravewights rising in the Scarlands (%n/2).', type:'kill', target:'gravewight', count:2, zone:'scarlands'},
      {text:'Report back to Captain Veyle.', type:'talk', npc:'captain'},
      {text:'Scout the mouth of the Undercrag beneath the keep. Return alive.', type:'goto', zone:'undercrag'},
      {text:'Tell Captain Veyle what stirs below.', type:'talk', npc:'captain'},
    ],
    reward:{xp:{Defence:800, Attack:400}, items:[{id:'steel_kiteshield',q:1},{id:'coins',q:250}]},
  },
  mountains_grudge: {
    name:'The Mountain\'s Grudge', giver:'Captain Veyle', qp:3, difficulty:'Master',
    desc:'Korthul — the mountain\'s grudge given legs — is drawing the Scarring\'s embers to itself beneath Whitmoor. The Hold cannot leave its post. Someone must go down.',
    requires:{quests:['knights_vigil','wardens_trial']},
    stages:[
      {text:'Speak to Captain Veyle at Whitmoor Hold (requires The Knight\'s Vigil and The Wardens\' Trial).', npc:'captain'},
      {text:'Clear Korthul\'s brood — slay 3 deep crawlers in the Undercrag (%n/3).', type:'kill', target:'deep_crawler', count:3, zone:'undercrag'},
      {text:'Face Korthul, the mountain\'s grudge, in the deep.', type:'kill', target:'korthul', count:1, zone:'undercrag'},
      {text:'Tell Whitmoor the mountain sleeps again.', type:'talk', npc:'captain'},
    ],
    reward:{xp:{Attack:1500, Defence:1500, Hitpoints:800}, items:[{id:'aurel_sword',q:1},{id:'coins',q:1000}]},
  },
};

/* Zone anchors follow the bible map (Maps/Crafted Realms Map.png) via the baked world
 * grid (src/worldgrid.js): commons = world (0,0), map north = -z. Re-anchored 2026-07-03. */
const ZONES = {
  commons:  {name:'Veyhollow Commons', pos:[0,0],    fog:0xb8c8cc},
  wardenholm:{name:'Wardenholm Keep',  pos:[77,0],   fog:0xb2bcc4},
  emberwood:{name:'Emberwood',         pos:[-144,-30], fog:0xaabfa0},
  quarry:   {name:'Stonereach Quarry', pos:[120,-14], fog:0xbcb6a8},
  pond:     {name:'Mirrorpond',        pos:[-4,88],   fog:0xaac4cc},
  gloomfen: {name:'Gloomfen',          pos:[-158,56], fog:0x4e4a58},
  brynholt: {name:'Brynholt',          pos:[178,-97], fog:0xb4c2c8},
  dunes:    {name:'The Ashar Dunes',   pos:[188,40],  fog:0xd8c8a0},
  scarlands:{name:'The Scarlands',     pos:[20,-100], fog:0x8e7c70},
  arena:    {name:'The Proving Grounds', pos:[84,79], fog:0xc8b896},
  holm:     {name:"Tutor's Holm",      pos:[158,141], fog:0xb8c8cc},
  saltreach:{name:'Saltreach Port',    pos:[232,48],  fog:0xb6c2c0},
  whitmoor: {name:'Whitmoor Hold',     pos:[-163,-105], fog:0xd8dce2},
  undercrag:{name:'The Undercrag',     pos:[-330,-260], fog:0x16141c},
};
/* The Wilderness Ditch: a dry trench walling off the northern wilds along the map's band.
 * Crossing is only possible at the gate causeways (x-ranges where roads pass). */
const DITCH = {z:-58, half:2.4, gates:[[3,9],[-109,-103],[151,157]]};
function inDitchGate(x){ return DITCH.gates.some(g=>x>=g[0]&&x<=g[1]); }
/* Scarlands threat: deeper NORTH past the Ditch = deadlier, like a wilderness level */
const SCAR_EDGE = DITCH.z;
function scarThreat(z){ return z<SCAR_EDGE ? Math.floor((SCAR_EDGE-z)/6)+1 : 0; }
function zoneAt(x,z){
  let best='commons', bd=1e9;
  for(const k in ZONES){ const d=(x-ZONES[k].pos[0])**2+(z-ZONES[k].pos[1])**2;
    if(d<bd){bd=d;best=k;} }
  return best;
}
/* dirt paths radiating from town, painted into the terrain */
/* Roads re-traced from the bible map (rough pass-001 polylines; later passes refine).
 * All three Ditch crossings line up with DITCH.gates. */
const PATHS = [
  [[0,-1],[-3,20]],      // chapel road
  [[0,-1],[14,15]],      // hearthhouse lane
  [[0,-1],[0,-17]],      // market row
  [[2,-6],[24,-5]],      // pasture track
  [[16,4],[45,2]], [[45,2],[68,0]],           // Wardenholm road: east to the keep's bridge
  [[14,15],[36,52]], [[36,52],[30,66]],       // the Spire road, southeast
  [[0,-17],[6,-40]], [[6,-40],[6,-70]],       // north road to the Wilderness Ditch gate
  [[6,-70],[20,-92]],                          // into the Scarlands
  [[0,0],[-70,-20]], [[-70,-20],[-143,-30]],  // west to the mill + Emberwood
  [[-143,-30],[-108,-48]], [[-108,-48],[-106,-70]], [[-106,-70],[-150,-95]],  // Whitmoor road, over the Ditch
  [[0,0],[60,-10]], [[60,-10],[118,-14]],     // to Stonereach Quarry
  [[0,0],[-2,45]], [[-2,45],[-4,80]],         // south to Mirrorpond
  [[0,0],[-70,30]], [[-70,30],[-155,52]],     // to Gloomfen
  [[-52,22],[-52,39]],                        // the mill lane (map windmill POI)
  [[118,-14],[150,-40]], [[150,-40],[154,-70]], [[154,-70],[176,-92]],  // NE over the Ditch to Brynholt
  [[118,-14],[160,15]], [[160,15],[186,38]],  // to the Ashar Dunes
  [[186,38],[232,32]],                        // dunes to Saltreach Port
  [[36,52],[80,76]],                          // to the Proving Grounds
  // (Tried a Holm winding dirt path here 2026-07-04 — the vertex-color painter reads too faintly on the Holm's
  //  bright grass to match the reference's bold ribbon; reverted. A dedicated dirt-mesh path is the right way
  //  if we revisit — the PATHS painter alone isn't enough contrast on the shelf.)
];
function distToSeg(px,pz, ax,az, bx,bz){
  const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz;
  let t = L2 ? ((px-ax)*dx+(pz-az)*dz)/L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px-(ax+dx*t), pz-(az+dz*t));
}
function pathDist(x,z){
  let d=1e9;
  for(const [[ax,az],[bx,bz]] of PATHS) d=Math.min(d, distToSeg(x,z,ax,az,bx,bz));
  return d;
}
