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
  raw_perch:    {name:'Raw mirrorperch', stack:false, value:6},
  bread:        {name:'Bread', stack:false, value:4, heal:4, weight:0.3, examine:'Squashy but filling.'},
  cooked_perch: {name:'Mirrorperch', stack:false, value:12, heal:4},
  burnt_perch:  {name:'Burnt mirrorperch', stack:false, value:1, examine:'Cooked with confidence, not skill.'},
  hollow_ale:   {name:'Hollow ale', stack:false, value:4, heal:5},

  /* legacy starter ids kept as bronze-tier gear */
  bronze_sword: {name:'Bronze sword', stack:false, value:25,  equip:'weapon', style:'melee',  speedTicks:4, aBonus:7,  sBonus:6, tier:'bronze', model:'sword', reqSkill:'Attack', reqLvl:1},
  iron_sword:   {name:'Iron sword',   stack:false, value:120, equip:'weapon', style:'melee',  speedTicks:4, aBonus:14, sBonus:13, tier:'iron', model:'sword', reqSkill:'Attack', reqLvl:5},
  hatchet:      {name:'Bronze hatchet', stack:false, value:16, tool:'woodcutting', power:1.0,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:1, sBonus:2, tier:'bronze', model:'axe', reqSkill:'Attack', reqLvl:1},
  iron_hatchet: {name:'Iron hatchet',   stack:false, value:56, tool:'woodcutting', power:1.45,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:4, sBonus:5, tier:'iron', model:'axe', reqSkill:'Attack', reqLvl:1},
  pickaxe:      {name:'Bronze pickaxe', stack:false, value:16, tool:'mining', power:1.0,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:1, sBonus:2, tier:'bronze', model:'pick', reqSkill:'Attack', reqLvl:1},
  iron_pickaxe: {name:'Iron pickaxe',   stack:false, value:56, tool:'mining', power:1.45,
                 equip:'weapon', style:'melee', speedTicks:5, aBonus:4, sBonus:5, tier:'iron', model:'pick', reqSkill:'Attack', reqLvl:1},
  wood_shield:  {name:'Wooden shield',    stack:false, value:20, equip:'shield', dBonus:5, model:'shield', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  bronze_helm:  {name:'Bronze helm',      stack:false, value:18, equip:'head',   dBonus:4, model:'helm', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  bronze_plate: {name:'Bronze platebody', stack:false, value:80, equip:'body',   dBonus:11, model:'plate', tier:'bronze', reqSkill:'Defence', reqLvl:1},
  leather_body: {name:'Leather body',     stack:false, value:14, equip:'body',   dBonus:4, model:'plate', tier:'leather', reqSkill:'Defence', reqLvl:1},
  bronze_legs:  {name:'Bronze platelegs', stack:false, value:60, equip:'legs',   dBonus:7, model:'legs', tier:'bronze', reqSkill:'Defence', reqLvl:1},

  fishing_net:  {name:'Small net', stack:false, value:12, tool:'fishing', power:1.0, useOn:'fish'},

  /* ranged: bow tiers (arrows shared) */
  worn_bow:     {name:'Worn shortbow', stack:false, value:30,  equip:'weapon', style:'ranged', speedTicks:5, aBonus:8,  sBonus:7,  model:'bow', reqSkill:'Ranged', reqLvl:1, needs:'arrows'},
  ash_bow:      {name:'Ash shortbow',  stack:false, value:160, equip:'weapon', style:'ranged', speedTicks:5, aBonus:17, sBonus:15, model:'bow', reqSkill:'Ranged', reqLvl:10, needs:'arrows'},
  gale_longbow: {name:'Gale longbow',  stack:false, value:520, equip:'weapon', style:'ranged', speedTicks:6, aBonus:28, sBonus:26, model:'bow', reqSkill:'Ranged', reqLvl:25, needs:'arrows'},
  arrows:       {name:'Arrows', stack:true, value:2},

  /* magic: staves cast without selecting runes; runes still consumed */
  spark_rune:        {name:'Spark runes', stack:true, value:4},
  air_rune:   {name:'Air runes',   stack:true, value:4},
  body_rune:  {name:'Body runes',  stack:true, value:3},
  big_bones:  {name:'Big bones',   stack:false, value:9, bury:true, big:true},
  crag_maul:  {name:'Crag maul', stack:false, value:2400, equip:'weapon', style:'melee', speedTicks:6,
               aBonus:30, sBonus:44, weight:9, model:'sword', tier:'crag', reqSkill:'Attack', reqLvl:30,
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
/* metal tiers: Bronze/Iron/Steel are generic; Aurel and Veyrite are MotionScape originals */
const TIERS = [
  {key:'bronze',  label:'Bronze',  metal:0xb08d57, req:1,  mult:1.0, price:1},
  {key:'iron',    label:'Iron',    metal:0x9aa0a8, req:5,  mult:2.0, price:4},
  {key:'steel',   label:'Steel',   metal:0xd0d4dc, req:10, mult:3.2, price:12},
  {key:'aurel',   label:'Aurel',   metal:0xd4a83e, req:20, mult:5.0, price:45},
  {key:'veyrite', label:'Veyrite', metal:0x3ec6b4, req:30, mult:7.5, price:140},
];
const GEAR_TEMPLATES = {
  sword:     {name:'sword',      equip:'weapon', style:'melee', speedTicks:4, a:7,  s:6,  reqSkill:'Attack',  base:25, model:'sword'},
  sabre:     {name:'sabre',      equip:'weapon', style:'melee', speedTicks:4, a:9,  s:9,  reqSkill:'Attack',  base:40, model:'sword'},
  battleaxe: {name:'battleaxe',  equip:'weapon', style:'melee', speedTicks:5, a:6,  s:13, reqSkill:'Attack',  base:38, model:'axe'},
  helm:      {name:'helm',       equip:'head',   d:4,  reqSkill:'Defence', base:18, model:'helm'},
  platebody: {name:'platebody',  equip:'body',   d:11, reqSkill:'Defence', base:80, model:'plate'},
  platelegs: {name:'platelegs',  equip:'legs',   d:7,  reqSkill:'Defence', base:60, model:'legs'},
  kiteshield:{name:'kiteshield', equip:'shield', d:6,  reqSkill:'Defence', base:34, model:'shield'},
  hatchet:   {name:'hatchet',    equip:'weapon', style:'melee', speedTicks:5, a:1, s:2, tool:'woodcutting', base:16, model:'axe'},
  pickaxe:   {name:'pickaxe',    equip:'weapon', style:'melee', speedTicks:5, a:1, s:2, tool:'mining', base:16, model:'pick'},
};
const GEAR_WEIGHTS = {sword:1.8, axe:2.2, helm:2.7, plate:9, legs:9, shield:5.4, bow:1.3, staff:2.1, robe:0.9, hat:0.4};
function buildTieredGear(items){
  TIERS.forEach((t,ti)=>{
    for(const tk in GEAR_TEMPLATES){
      const tpl=GEAR_TEMPLATES[tk];
      const id = `${t.key}_${tk}`;
      if(items[id]) continue;
      const def = {name:`${t.label} ${tpl.name}`, stack:false,
        value: Math.round(tpl.base*t.price), tier:t.key, template:tk, model:tpl.model,
        weight: GEAR_WEIGHTS[tpl.model]||1,
        reqSkill:tpl.reqSkill||'Attack', reqLvl:t.req};
      if(tpl.equip){ def.equip=tpl.equip;
        if(tpl.style){ def.style=tpl.style; def.speedTicks=tpl.speedTicks;
          def.aBonus=Math.round(tpl.a*t.mult); def.sBonus=Math.round(tpl.s*t.mult); }
        else def.dBonus=Math.round(tpl.d*t.mult);
      }
      if(tpl.tool){ def.tool=tpl.tool; def.power=1+ti*0.45; }
      items[id]=def;
    }
  });
}
const EQUIP_SLOTS = [['head','Head'],['body','Body'],['legs','Legs'],['weapon','Weapon'],
                     ['shield','Shield'],['amulet','Amulet'],['cape','Cape']];

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
  pasturehen:{name:'Pasture hen', level:1, examine:"The yard's finest egg engine.", hp:3, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0, speedTicks:4, color:0xeae4d8, size:0.5, aggro:false, respawn:10, model:'chicken',
             drops:[ {id:'bones',q:1,p:1}, {id:'feathers',q:[3,8],p:1} ]},
  bogling:  {name:'Bogling', level:3, examine:"A surly swamp imp, all tusks and grievance.", hp:8, att:3, str:3, def:2, aBonus:1, sBonus:1, dBonus:1, speedTicks:4, color:0x6f9a4a, size:0.76, aggro:false, respawn:14, model:'bogling',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[2,12],p:0.85}, {id:'mind_rune',q:[1,3],p:0.15} ]},
  skeleton: {name:'Skeleton', level:15, examine:"It rattles with old menace.", hp:29, att:14, str:13, def:12, aBonus:8, sBonus:9, dBonus:7, speedTicks:4, color:0xe8e2d0, size:1.0, aggro:true, respawn:20, model:'skeleton',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[8,40],p:0.9}, {id:'iron_sword',q:1,p:0.05}, {id:'bronze_helm',q:1,p:0.05}, {id:'mind_rune',q:[1,4],p:0.2} ]},
  gnarlgob: {name:'Gnarlgob', level:5, examine:"Small, green and furious about it.", hp:13, att:5, str:4, def:3, aBonus:2, sBonus:2, dBonus:1, speedTicks:4, color:0x6a8a3a, size:0.78, aggro:true, respawn:14, model:'goblin',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[3,18],p:0.9}, {id:'bronze_sword',q:1,p:0.06}, {id:'bronze_helm',q:1,p:0.05}, {id:'mind_rune',q:[1,4],p:0.2} ]},
  moss_seer:{name:'Moss seer', level:9, examine:"It hums with damp magic.", hp:20, att:9, str:7, def:7, aBonus:5, sBonus:4, dBonus:4, speedTicks:5, color:0x3a6a4a, size:1, aggro:true, respawn:22, humanoid:true, robe:0x3a6a4a, hat:'wizard', ranged:true,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[8,30],p:1}, {id:'air_rune',q:[2,6],p:0.6}, {id:'mind_rune',q:[2,6],p:0.6}, {id:'apprentice_staff',q:1,p:0.06}, {id:'cloth_robe_top',q:1,p:0.06} ]},
  burrowrat:{name:'Burrow rat', level:1, examine:"Overgrown and underfed.", hp:4, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0, speedTicks:4, color:0x6b5440, size:0.85, aggro:false, respawn:8, model:'rat',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[1,5],p:0.6} ]},
  moorcalf: {name:'Moorcalf', level:2, examine:"Converts grass into hide and hoof.", hp:9, att:1, str:2, def:2, aBonus:0, sBonus:0, dBonus:0, speedTicks:5, color:0x9a8468, size:1.25, aggro:false, respawn:15, model:'cow',
             drops:[ {id:'bones',q:1,p:1}, {id:'beast_hide',q:1,p:1}, {id:'coins',q:[2,10],p:0.5} ]},
  duneclaw: {name:'Duneclaw', level:12, examine:"All shell and spite.", hp:24, att:11, str:10, def:9, aBonus:6, sBonus:6, dBonus:6, speedTicks:4, color:0xc4a04a, size:0.9, aggro:true, respawn:20,
             drops:[ {id:'coins',q:[15,55],p:1}, {id:'steel_sword',q:1,p:0.05}, {id:'amulet_of_precision',q:1,p:0.02} ]},
  bryn_raider:{name:'Bryn raider', level:18, examine:"A northerner spoiling for a scrap.", hp:38, att:16, str:17, def:14, aBonus:10, sBonus:12, dBonus:8, speedTicks:4, color:0x7a3d2a, size:1, aggro:true, respawn:25, humanoid:true, weapon:'battleaxe',
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[25,80],p:1}, {id:'steel_battleaxe',q:1,p:0.06}, {id:'steel_helm',q:1,p:0.08}, {id:'hollow_ale',q:1,p:0.3} ]},
  hex_adept:{name:'Hex adept', level:24, examine:"Its robes crackle with stolen sparks.", hp:42, att:22, str:20, def:18, aBonus:14, sBonus:10, dBonus:10, speedTicks:5, color:0x4a3a7a, size:1, aggro:true, respawn:30, humanoid:true, robe:0x4a3a7a, hat:'wizard', ranged:true,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[40,110],p:1}, {id:'chaos_rune',q:[2,6],p:0.6}, {id:'air_rune',q:[4,12],p:0.7}, {id:'ember_staff',q:1,p:0.05}, {id:'glimmer_hat',q:1,p:0.04}, {id:'amulet_of_warding',q:1,p:0.02} ]},
  gravewight:{name:'Gravewight', level:30, examine:"Death only made it angrier.", hp:55, att:28, str:26, def:24, aBonus:16, sBonus:14, dBonus:14, speedTicks:4, color:0x8a8a92, size:1.05, aggro:true, respawn:35, humanoid:true, weapon:'sword', skin:0xb8bcc4, drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[60,160],p:1}, {id:'aurel_sword',q:1,p:0.05}, {id:'aurel_platelegs',q:1,p:0.04}, {id:'amulet_of_might',q:1,p:0.03} ]},
  ash_stalker:{name:'Ash stalker', level:38, examine:"It hunts where the land burned.", hp:70, att:36, str:34, def:30, aBonus:20, sBonus:18, dBonus:18, speedTicks:4, color:0x3a3a42, size:1.25, aggro:true, respawn:40,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[90,220],p:1}, {id:'aurel_platebody',q:1,p:0.05}, {id:'veyrite_sword',q:1,p:0.015}, {id:'gale_longbow',q:1,p:0.03} ]},

  hold_knight: {name:'Hold Knight', level:18, hp:35, att:16, str:14, def:18, aBonus:12, sBonus:10, dBonus:16,
    speedTicks:4, color:0xd8dce2, size:1.05, aggro:false, respawn:30, humanoid:true, weapon:'sword',
    examine:"A knight of Whitmoor. Polished, patient, deadly.",
    drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[10,40],p:0.9}, {id:'iron_sword',q:1,p:0.05},
            {id:'iron_platebody',q:1,p:0.03}, {id:'bread',q:1,p:0.2} ]},
  deep_crawler: {name:'Deep crawler', level:25, hp:38, att:22, str:20, def:16, aBonus:12, sBonus:10, dBonus:8,
    speedTicks:4, color:0x3a3548, size:1.1, aggro:true, alwaysAggro:true, respawn:35,
    examine:"It has never seen the sun, and resents that you have.",
    drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[30,90],p:1}, {id:'chaos_rune',q:[2,6],p:0.4},
            {id:'iron_platelegs',q:1,p:0.04} ]},
  korthul: {name:'Korthul the Undercrag', level:58, hp:130, att:48, str:46, def:40, aBonus:22, sBonus:24, dBonus:20, boss:true, script:'korthul',
    speedTicks:5, color:0x4a4456, size:2.6, aggro:true, alwaysAggro:true, respawn:120,
    examine:"The mountain's grudge, given legs.",
    drops:[ {id:'big_bones',q:1,p:1}, {id:'coins',q:[400,900],p:1}, {id:'crag_maul',q:1,p:0.05},
            {id:'veyrite_sabre',q:1,p:0.08}, {id:'aurel_platebody',q:1,p:0.1},
            {id:'nature_rune',q:[4,12],p:0.7}, {id:'chaos_rune',q:[6,20],p:0.7}, {id:'fen_charm',q:1,p:0.2} ]},
  wizard: {name:'Wizard', level:9, hp:20, att:8, str:6, def:6, aBonus:6, sBonus:4, dBonus:4,
    speedTicks:5, color:0x35418f, size:1.0, aggro:true, respawn:24, humanoid:true, robe:0x35418f, hat:'wizard', ranged:true,
    examine:"A robed scholar of the Spire. Quick to take offence.",
    drops:[ {id:'bones',q:1,p:1}, {id:'air_rune',q:[2,8],p:0.8}, {id:'mind_rune',q:[2,8],p:0.7},
            {id:'water_rune',q:[2,6],p:0.3}, {id:'earth_rune',q:[2,6],p:0.3}, {id:'fire_rune',q:[2,6],p:0.3},
            {id:'chaos_rune',q:[1,3],p:0.15}, {id:'nature_rune',q:1,p:0.08},
            {id:'coins',q:[2,12],p:0.6}, {id:'wizard_hat',q:1,p:0.04} ]},
  monk: {name:'Monk', level:5, hp:15, att:3, str:3, def:4, aBonus:1, sBonus:1, dBonus:3,
    speedTicks:5, color:0x6b5a3a, size:1.0, aggro:false, respawn:30, humanoid:true, robe:0x6b5a3a,
    examine:"A devoted brother of the Dawn.",
    drops:[{id:'bones',q:1,p:1},{id:'coins',q:[2,7],p:0.6},{id:'bread',q:1,p:0.25},
           {id:'monk_robe_top',q:1,p:0.05},{id:'monk_robe_bottom',q:1,p:0.05},{id:'holy_symbol',q:1,p:0.02}]},
  wanderer: {name:'Wanderer', level:2, hp:7, att:1, str:1, def:1, aBonus:0, sBonus:0, dBonus:0,
    speedTicks:4, color:0x7a6a52, size:1.0, aggro:false, respawn:25, examine:"One of Veyhollow's idle hands.",
    humanoid:true,
    drops:[{id:'bones',q:1,p:1},{id:'coins',q:[1,4],p:0.85},{id:'bread',q:1,p:0.1}]},
  grubkin:  {name:'Grubkin', level:2, examine:"A wriggling pest of the commons.",  hp:7,  att:1,  str:1,  def:1,  aBonus:0,  sBonus:0,  dBonus:0,  speedTicks:4, color:0x6a8f3c, size:0.8, aggro:false, respawn:12,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[3,12],p:0.8}, {id:'arrows',q:[2,6],p:0.3}, {id:'bronze_sword',q:1,p:0.06}, {id:'mind_rune',q:[1,4],p:0.2}, {id:'leather_body',q:1,p:0.05} ]},
  mosswolf: {name:'Mosswolf', level:8, hp:18, att:7,  str:7,  def:6,  aBonus:4,  sBonus:4,  dBonus:4,  speedTicks:4, color:0x4f6b4a, size:1.0, aggro:true, respawn:18,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[10,40],p:0.9}, {id:'raw_perch',q:1,p:0.25}, {id:'wood_shield',q:1,p:0.08}, {id:'bronze_helm',q:1,p:0.06} ]},
  fenwretch:{name:'Fenwretch', level:15, hp:30, att:14, str:13, def:12, aBonus:8,  sBonus:8,  dBonus:10, speedTicks:4, color:0x57456b, size:1.1, aggro:true, respawn:25,
             drops:[ {id:'bones',q:1,p:1}, {id:'coins',q:[30,90],p:1}, {id:'iron_sword',q:1,p:0.05}, {id:'bronze_plate',q:1,p:0.08}, {id:'bronze_legs',q:1,p:0.08} ]},
  duelist:  {name:'Pit duelist', level:10, examine:"A professional. Mind the footwork.", hp:30, att:10, str:10, def:8, aBonus:6, sBonus:6, dBonus:5, speedTicks:4, color:0x8a5a32, size:1, aggro:false, respawn:9999, humanoid:true, weapon:'sword',
             drops:[]},
  fenlord:  {name:'The Fenlord', level:15, examine:"The marsh bows to it. You shouldn't.", hp:40, att:14, str:12, def:8, aBonus:8, sBonus:7, dBonus:8, speedTicks:5, color:0x2d1b3d, size:2.2, aggro:true, respawn:90, boss:true, script:'fenlord',
             drops:[{id:'big_bones',q:1,p:1}, {id:'coins',q:[120,300],p:1}, {id:'fen_charm',q:1,p:0.5}, {id:'steel_sabre',q:1,p:0.3}, {id:'veyrite_sabre',q:1,p:0.02} ]},
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
  ]},
  spire: {name:"The Spire Vaults", stock:[
    {id:'air_rune',price:4},{id:'water_rune',price:4},{id:'earth_rune',price:4},{id:'fire_rune',price:4},
    {id:'mind_rune',price:3},{id:'body_rune',price:3},{id:'chaos_rune',price:28},{id:'nature_rune',price:45},
    {id:'wizard_hat',price:32},{id:'apprentice_staff',price:42},
  ]},
  bazaar:   {name:'Hollow Bazaar', stock:[
    {id:'hatchet',price:20},{id:'pickaxe',price:20},{id:'fishing_net',price:15},
    {id:'arrows',price:2},{id:'air_rune',price:5},{id:'mind_rune',price:4},
    {id:'hammer',price:2},{id:'tinderbox',price:2},{id:'knife',price:3},
    {id:'bread',price:5},{id:'cooked_perch',price:15},{id:'wood_shield',price:25},{id:'leather_body',price:18}]},
  smith:    {name:'Stonereach Smithy', stock:[
    {id:'bronze_sword',price:30},{id:'bronze_helm',price:22},{id:'bronze_plate',price:95},{id:'bronze_legs',price:75},
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
    {id:'leather_body',price:18},{id:'cloth_robe_top',price:15},{id:'cloth_robe_skirt',price:12}]},
  pub:      {name:'The Tipsy Grub', stock:[
    {id:'hollow_ale',price:3},{id:'bread',price:4},{id:'cooked_perch',price:12}]},
  fletcher: {name:'Brynholt Bowyer', stock:[
    {id:'worn_bow',price:35},{id:'ash_bow',price:220},{id:'gale_longbow',price:680},{id:'arrows',price:2}]},
};
const SHOP_STOCK = [
  {id:'hatchet', price:20}, {id:'iron_hatchet', price:70},
  {id:'pickaxe', price:20}, {id:'iron_pickaxe', price:70},
  {id:'fishing_net', price:15},
  {id:'bronze_sword', price:30}, {id:'wood_shield', price:25}, {id:'bronze_helm', price:22},
  {id:'leather_body', price:18}, {id:'bronze_plate', price:95}, {id:'bronze_legs', price:75},
  {id:'arrows', price:2}, {id:'air_rune', price:5}, {id:'mind_rune', price:4}, {id:'iron_sword', price:150},
];

const QUESTS = {
  grub_trouble: {
    name:'Grub Trouble', giver:'Warden Maela',
    desc:'Warden Maela wants 3 grubkins cleared from the commons.',
    stages:['Speak to Warden Maela by the bank.','Slay 3 grubkins (%n/3).','Return to Warden Maela.'],
    targets:[{npc:'maela'},{zone:'commons'},{npc:'maela'}],
    reward:{xp:{Attack:120}, items:[{id:'coins',q:60},{id:'wood_shield',q:1}]},
  },
  thirsty_smith: {
    name:'The Thirsty Smith', giver:'Ferra the Smith',
    desc:'Ferra won\'t light the forge without a Hollow ale from The Tipsy Grub.',
    stages:['Speak to Ferra at the Stonereach Smithy.','Buy a Hollow ale at The Tipsy Grub and bring it to Ferra.','Quest complete.'],
    targets:[{npc:'ferra'},{npc:'barkeep'},{npc:'ferra'}],
    reward:{xp:{Attack:300}, items:[{id:'steel_sword',q:1},{id:'coins',q:50}]},
  },
  splinters: {
    name:'Splinters & Sparks', giver:'Olun the Miller',
    desc:'Olun the Miller needs 5 emberwood logs for his mill wheel.',
    stages:['Speak to Olun the Miller near Emberwood.','Bring Olun 5 emberwood logs.','Quest complete.'],
    targets:[{npc:'olun'},{zone:'emberwood'},{npc:'olun'}],
    reward:{xp:{Woodcutting:200}, items:[{id:'coins',q:80},{id:'iron_hatchet',q:1}]},
  },
  wardens_trial: {
    name:'The Wardens\' Trial', giver:'Warden Maela',
    desc:'Prove yourself to the Wardens\' Guild by felling the Fenlord in Gloomfen.',
    stages:['Ask Warden Maela about the guild (requires Grub Trouble).','Slay the Fenlord in Gloomfen.','Return for your sigil.'],
    targets:[{npc:'maela'},{zone:'gloomfen'},{npc:'maela'}],
    reward:{xp:{Attack:600, Defence:600}, items:[{id:'guild_sigil',q:1},{id:'coins',q:300}]},
  },
};

const ZONES = {
  commons:  {name:'Veyhollow Commons', pos:[0,0],    fog:0xb8c8cc},
  emberwood:{name:'Emberwood',         pos:[-65,-40], fog:0xaabfa0},
  quarry:   {name:'Stonereach Quarry', pos:[70,-35],  fog:0xbcb6a8},
  pond:     {name:'Mirrorpond',        pos:[55,55],   fog:0xaac4cc},
  gloomfen: {name:'Gloomfen',          pos:[-70,60],  fog:0x4e4a58},
  brynholt: {name:'Brynholt',          pos:[-20,-95], fog:0xb4c2c8},
  dunes:    {name:'The Ashar Dunes',   pos:[115,30],  fog:0xd8c8a0},
  scarlands:{name:'The Scarlands',     pos:[0,115],   fog:0x8e7c70},
  arena:    {name:'The Proving Grounds', pos:[78,52], fog:0xc8b896},
  holm:     {name:"Tutor's Holm",      pos:[230,230], fog:0xb8c8cc},
  whitmoor: {name:'Whitmoor Hold',     pos:[50,-62],  fog:0xd8dce2},
  undercrag:{name:'The Undercrag',     pos:[-230,-160], fog:0x16141c},
};
/* Scarlands threat: deeper in = deadlier, like a wilderness level */
const SCAR_EDGE = 80;
function scarThreat(z){ return z>SCAR_EDGE ? Math.floor((z-SCAR_EDGE)/6)+1 : 0; }
function zoneAt(x,z){
  let best='commons', bd=1e9;
  for(const k in ZONES){ const d=(x-ZONES[k].pos[0])**2+(z-ZONES[k].pos[1])**2;
    if(d<bd){bd=d;best=k;} }
  return best;
}
/* dirt paths radiating from town, painted into the terrain */
const PATHS = [
  [[0,-1],[-3,20]],      // chapel road
  [[0,-1],[14,15]],      // hearthhouse lane
  [[0,-1],[0,-17]],      // market row
  [[2,-6],[24,-5]],      // pasture track
  [[14,15],[30,66]],     // the Spire road, southeast toward the wilds
  [[24,-5],[44,-20]],    // the Whitmoor road east, then north past the lake
  [[44,-20],[48,-44]],
  [[48,-44],[50,-49]],
[[-12,-12],[-62,-39]],     // the Miller's Causeway over the marsh
  [[0,0],[-40,-28]], [[-40,-28],[-65,-40]],   // to the mill + Emberwood
  [[0,0],[35,-18]], [[35,-18],[70,-35]],      // to Stonereach
  [[0,0],[28,28]], [[28,28],[55,55]],         // to Mirrorpond
  [[0,0],[-35,30]], [[-35,30],[-70,60]],      // to Gloomfen
  [[0,0],[-12,-52]], [[-12,-52],[-20,-95]],   // to Brynholt
  [[35,-18],[78,2]], [[78,2],[115,30]],       // to the Ashar Dunes
  [[0,0],[-2,45]], [[-2,45],[0,80]],          // to the Scarlands gate
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
