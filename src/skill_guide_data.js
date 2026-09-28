/* ============================================================================
   SKILL GUIDE DATA -- what each level unlocks, for the old-school skill guides
   (owner 2026-09-27: "clicking a skill should open a skill guide like old-school RuneScape's, showing what each
   level unlocks ... they must match the weapons and items we have or plan to create").

   Pure data, no DOM. build(G) reads the game's OWN tables and returns one guide per skill, so a guide cannot drift
   from the content it describes:
     ITEMS / TIERS (game1_data.js)           -> Attack, Defence, Ranged, Magic and Prayer gear; hatchets, pickaxes,
                                                fishing tools; food for Hitpoints
     SPELLS (magic_spells.js)                -> Magic
     PRAYERS (game3_systems.js) + the rules in shared/combat.js (CRShared.combat.PRAYERS) -> Prayer
     SMELTS / SMITHABLES / FLETCHABLES / PICKPOCKETS / STALL_KINDS / COOK_FISH (game3_systems.js)
     ROCK_KINDS (game2_world.js), GATHER_RATES (game1_data.js)
     the Minnow Hollow fishing rules (docs/rebuild/holm-overhaul/island-fishing.json, via HolmFishing.data())
     CRShared.drinks.BREWS (coffee)
   Every live row carries `proofs`: the table, id and field its level came from. tools/test_skill_guides.js
   re-reads those tables on its own and fails when a row names an item that does not exist or a level that
   disagrees with the data, and when a table gains an entry no guide lists.

   PLANNED CONTENT (the PLANNED table below) is everything the guides show that is not in live data yet: the
   four skills that arrive in W4 (Crafting, Herblore, Agility, Runecrafting), the metal tiers past steel at the
   anvil, the woods, fish, ores, courses, potions and places of docs/rebuild/WORLD_CONTENT_PLAN.md.
   Decision: planned rows are SHOWN, always dimmed and marked "Coming later", never mixed silently with live
   ones. Why: four of the 19 skills have no data at all and several ladders stop early (the anvil at steel,
   the woods at Emberwood), so leaving planned rows out would give four empty guides and ladders that hide
   where the game is going; marking every one of them the same way means a player never grinds for something
   that is not in the game. The test keeps the table honest: a planned row may not repeat a live unlock, may
   only name items that exist (new things are name-only), and must cite the plan.
   ============================================================================ */
var SkillGuideData=(function(){
'use strict';

/* the 2004 set of 19 (Farming comes later), in our stats-tab order, then the four that arrive in W4 */
var ALL_SKILLS=['Attack','Strength','Defence','Hitpoints','Ranged','Magic','Prayer','Woodcutting','Mining','Fishing',
  'Cooking','Firemaking','Smithing','Fletching','Thieving','Crafting','Herblore','Agility','Runecrafting'];
/* the category tabs down the side of each guide, in order (a tab with no rows is not shown) */
var TABS={
  Attack:['Weapons','Tools','Places'], Strength:['Places'], Defence:['Armour','Other'], Hitpoints:['Food'],
  Ranged:['Bows','Armour','Places'], Magic:['Combat','Utility','Equipment','Places'], Prayer:['Prayers','Equipment','Places'],
  Woodcutting:['Trees','Hatchets'], Mining:['Ores','Pickaxes','Places'], Fishing:['Catches','Finds','Tools','Places'],
  Cooking:['Food','Places'], Firemaking:['Logs','Other'], Smithing:['Smelting'],   // + one tab per metal tier (TIERS order)
  Fletching:['Bows','Arrows'], Thieving:['Pickpocketing','Stalls','Other'],
  Crafting:['Leather','Other','Places'], Herblore:['Potions','Herbs'], Agility:['Courses','Shortcuts'], Runecrafting:['Runes']
};
var STAT={att:'Attack',str:'Strength',def:'Defence',rng:'Ranged',mag:'Magic'};

/* ------------------------------------------------------------------------------------------------------------
   PLANNED CONTENT -- not in the game's data yet. Shown dimmed with "Coming later". Sources: WCP = the world content
   plan (docs/rebuild/WORLD_CONTENT_PLAN.md), with the 2004 level steps the plan adopts (its section 4, "Levels and
   unlock steps follow 2004"). `item` names an item that already exists (its name and icon come from ITEMS);
   rows without one are name-only until the thing exists. `need` replaces the plain level for a combined gate.
   Left out on purpose (the plan collides with live data; owner calls, listed in the pass report): the plan's
   Aldermarch 25 / Duskford 45 / Brynholt 58 teleports (live: Gloomfen 25, Ashar 45, Brynholt 38), silver stall 50,
   spice stall 65 and hold knights 55 (live: 20, 30, 35), iron-to-undercrag arrows (live: one arrow type), the
   Spire robes at Magic 40 (live: starweave), the copper anvil ladder 1-9 and the Woodcutting/Mining levels on tools
   (live tools have none).
   ------------------------------------------------------------------------------------------------------------ */
var HALL={tab:'Places',level:130,label:'130',name:'Hall of the Hold',sub:'Attack and Strength together; Whitmoor Hold',
  need:{skills:['Attack','Strength'],total:130},icon:'misc/door',plan:'WCP 2.2 G8'};
var PLANNED=[
  Object.assign({skill:'Attack'},HALL),
  Object.assign({skill:'Strength'},HALL),

  {skill:'Ranged',tab:'Bows',level:50,name:'Glimmerbark shortbow',sub:'Wood from Spire Isle',plan:'WCP 4.1 Ranged'},
  {skill:'Ranged',tab:'Bows',level:60,name:'Heartscar shortbow',sub:'Wood from the deep Scarlands',plan:'WCP 4.1 Ranged'},
  {skill:'Ranged',tab:'Armour',level:50,name:'Matriarch hide armour',sub:'After Wyrmfall',plan:'WCP 4.2 ranged ladder'},
  {skill:'Ranged',tab:'Armour',level:60,name:'Ash wyrm hide armour',sub:'Hide of the Ash Wyrm',plan:'WCP 4.2 ranged ladder'},
  {skill:'Ranged',tab:'Places',level:40,name:'Longbow Lodge',sub:'Butts, marksmen and a bowyer; Emberwood',icon:'misc/door',plan:'WCP 2.2 G6'},

  {skill:'Magic',tab:'Utility',level:31,name:'Zahrim Teleport',sub:'Teleports you to Zahrim.',plan:'WCP 4.1 Magic'},
  {skill:'Magic',tab:'Utility',level:37,name:'Whitmoor Teleport',sub:'Teleports you to Whitmoor Hold.',plan:'WCP 4.1 Magic'},
  {skill:'Magic',tab:'Utility',level:51,name:'Gullhaven Teleport',sub:'Teleports you to Gullhaven.',plan:'WCP 4.1 Magic'},
  {skill:'Magic',tab:'Equipment',level:60,name:'Circle robes',sub:'From The Warded Circle',plan:'WCP 4.2 robe ladder'},
  {skill:'Magic',tab:'Places',level:50,name:'Spire Trials',sub:'The Spire\'s spell trials',icon:'misc/door',plan:'WCP 4.1 Magic'},
  {skill:'Magic',tab:'Places',level:60,name:'The Warded Circle',sub:'Circle spells; Scarlands level 15',icon:'misc/door',plan:'WCP 4.4'},
  {skill:'Magic',tab:'Places',level:66,name:'The Upper Study',sub:'Portals to three rune ruins; the Spire',icon:'misc/door',plan:'WCP 2.2 G7'},

  {skill:'Prayer',tab:'Places',level:31,name:'Monastery upper altar',sub:'Monastery of the Dawn; more prayer from each bone',icon:'misc/door',plan:'WCP 4.4'},

  {skill:'Woodcutting',tab:'Trees',level:15,item:'oak_logs',sub:'Oaks on the Woodline and the Emberwood edge',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:30,item:'willow_logs',sub:'Willows by the Duskford bank',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:45,name:'Maple logs',sub:'Deep Emberwood',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:52,name:'Frostpine logs',sub:'Whitmoor highlands',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:60,name:'Yew logs',sub:'Marcher\'s Garden, the Monastery',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:75,name:'Glimmerbark logs',sub:'Spire Isle and the grove',plan:'WCP 4.1 Woodcutting'},
  {skill:'Woodcutting',tab:'Trees',level:90,name:'Heartscar logs',sub:'The Scarlands, levels 16 to 20',plan:'WCP 4.1 Woodcutting'},

  {skill:'Firemaking',tab:'Logs',level:15,item:'oak_logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:30,item:'willow_logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:45,name:'Maple logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:52,name:'Frostpine logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:60,name:'Yew logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:75,name:'Glimmerbark logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Logs',level:90,name:'Heartscar logs',sub:'Burns at the level it is cut',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Other',level:30,name:'Censers',sub:'Light the chapel censers',plan:'WCP 4.1 Firemaking'},
  {skill:'Firemaking',tab:'Other',level:43,name:'Ditch Beacons',sub:'Online: the beacon line along the Ditch',icon:'misc/door',plan:'WCP 4.1 Firemaking'},

  {skill:'Fishing',tab:'Catches',level:5,name:'Fen sprat',sub:'Bait; Reedwick',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:10,name:'Silverfin',sub:'Bait',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:15,name:'Saltling',sub:'Net; the coast',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:20,item:'raw_trout',sub:'Fly rod; the Duskford ford',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:25,name:'Fen pike',sub:'Bait; Reedwick',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:30,name:'Salmon',sub:'Fly rod; the Duskford ford',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:35,name:'Tunny',sub:'Harpoon; Gullhaven',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:40,name:'Creel crab',sub:'Cage; Gullhaven, Brynholt',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:46,name:'Stripe bass',sub:'Big net',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:50,name:'Sabrefish',sub:'Harpoon; Gullhaven',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:53,name:'Cinder eel',sub:'Oily rod; Scarlands pools',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:62,name:'Frostcod',sub:'Big net; Brynholt',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:76,name:'Greyjaw',sub:'Harpoon; Brynholt deep pier',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:82,name:'Deepfin',sub:'Lantern rod; the Undercrag lakes',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Catches',level:88,name:'Emberfin',sub:'The Slagfield lava; Scarlands',plan:'WCP 4.1 Fishing'},
  {skill:'Fishing',tab:'Places',level:68,name:'Anglers\' Pier',sub:'Gullhaven',icon:'misc/door',plan:'WCP 2.2 G5'},

  {skill:'Cooking',tab:'Food',level:1,item:'cooked_meat',sub:'Roast raw beef',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:15,item:'trout',sub:'Heals 7',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:20,name:'Meat pie',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:20,name:'Fen pike',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:25,name:'Salmon',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:25,name:'Stew',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:30,name:'Tunny',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:35,name:'Duskford wine',sub:'Grapes from the Cooks\' Hall garden',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:40,name:'Cake',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:40,name:'Creel crab',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:43,name:'Stripe bass',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:45,name:'Sabrefish',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:53,name:'Cinder eel',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:62,name:'Frostcod',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:80,name:'Greyjaw',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:84,name:'Deepfin',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Food',level:90,name:'Emberfin',plan:'WCP 4.1 Cooking'},
  {skill:'Cooking',tab:'Places',level:32,name:'Cooks\' Hall',sub:'Needs a cook\'s cap; west of Aldermarch',icon:'misc/door',plan:'WCP 2.2 G2'},

  {skill:'Smithing',tab:'Smelting',level:40,item:'gold_bar',sub:'Gold ore; the Zahrim furnace',plan:'WCP 4.2'},
  {skill:'Smithing',tab:'Smelting',level:40,name:'Whitsteel bar',sub:'Iron ore, silver ore, 2 coal; Hold Forge only',plan:'WCP 4.2'},
  {skill:'Smithing',tab:'Smelting',level:50,name:'Aurel bar',sub:'Aurel ore, 4 coal',plan:'WCP 4.2'},
  {skill:'Smithing',tab:'Smelting',level:70,name:'Veyrite bar',sub:'Veyrite ore, 6 coal',plan:'WCP 4.2'},
  {skill:'Smithing',tab:'Smelting',level:85,name:'Undercrag bar',sub:'Undercrag ore, 8 coal; the Emberforge',plan:'WCP 4.2'},
  /* the anvil past steel: each tier's base level from the plan (4.2), laid out in the SAME steps as the live steel
     anvil (SMITHABLES.steel_bar: sword +0, helm +2, platelegs +7, kiteshield +10, platebody +13), so the planned
     tiers read exactly like the live ones. The items themselves already exist (buildTieredGear). */
  {skill:'Smithing',expand:'anvil',tier:'whitsteel',level:40,sub:'Hold Forge only',plan:'WCP 4.2'},
  {skill:'Smithing',expand:'anvil',tier:'aurel',level:50,plan:'WCP 4.2'},
  {skill:'Smithing',expand:'anvil',tier:'veyrite',level:70,plan:'WCP 4.2'},
  {skill:'Smithing',expand:'anvil',tier:'undercrag',level:85,sub:'The Emberforge',plan:'WCP 4.2'},

  {skill:'Mining',tab:'Ores',level:20,name:'Silver ore',sub:'Frostpeak, the south mine, Zahrim mine',plan:'WCP 4.2'},
  {skill:'Mining',tab:'Ores',level:40,item:'gold_ore',sub:'Zahrim mine',plan:'WCP 4.2 (2004 step)'},
  {skill:'Mining',tab:'Ores',level:55,name:'Aurel ore',sub:'Zahrim mine, Mirehill, the Deepdelvers\' Lodge',plan:'WCP 4.2'},
  {skill:'Mining',tab:'Ores',level:70,name:'Veyrite ore',sub:'The Veyrite Seam, Frostpeak, the Slagfield',plan:'WCP 4.2'},
  {skill:'Mining',tab:'Ores',level:85,name:'Undercrag ore',sub:'The Undercrag Galleries',plan:'WCP 4.2'},
  {skill:'Mining',tab:'Places',level:60,name:'Deepdelvers\' Lodge',sub:'Coal, aurel and veyrite rocks; Stonereach Deeps',icon:'misc/door',plan:'WCP 2.2 G4'},

  /* the live shortbows fletched at the plan's steps for their wield level: wield 30 cuts at 50, wield 40 at 65,
     wield 50 at 80, wield 60 at 90 (WCP 4.1: maple 50, yew 65, glimmerbark 80, heartscar 90) */
  {skill:'Fletching',tab:'Bows',level:50,item:'blackthorn_bow',sub:'Wields at Ranged 30',plan:'WCP 4.1 Fletching'},
  {skill:'Fletching',tab:'Bows',level:65,item:'duskwood_bow',sub:'Wields at Ranged 40',plan:'WCP 4.1 Fletching'},
  {skill:'Fletching',tab:'Bows',level:80,name:'Glimmerbark shortbow',sub:'Wields at Ranged 50',plan:'WCP 4.1 Fletching'},
  {skill:'Fletching',tab:'Bows',level:90,name:'Heartscar shortbow',sub:'Wields at Ranged 60',plan:'WCP 4.1 Fletching'},

  {skill:'Thieving',tab:'Pickpocketing',level:10,name:'Farmhand',sub:'Hollin\'s Farm, Duskford',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:25,name:'Zahrim guard',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:32,name:'Road rogue',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:40,name:'City guard',sub:'Aldermarch',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:65,name:'Frontier sentry',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:70,name:'March paladin',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Pickpocketing',level:80,name:'Wardens\' veteran',sub:'The Wardens\' Guildhall',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Stalls',level:5,name:'Tea cart',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Stalls',level:20,name:'Cloth stall',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Stalls',level:20,name:'Silk stall',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Stalls',level:35,name:'Fur stall',sub:'Aldermarch',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Stalls',level:75,name:'Gem stall',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Other',level:28,name:'Blackbriar strongroom chest',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Other',level:43,name:'Scarlands raider chests',sub:'Scarlands level 6',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Other',level:50,name:'The Night Ledger',sub:'Safes and a trap maze under the Brine Barrel',icon:'misc/door',plan:'WCP 2.2 G10'},
  {skill:'Thieving',tab:'Other',level:72,name:'The Marcher\'s strongroom',plan:'WCP 4.1 Thieving'},
  {skill:'Thieving',tab:'Other',level:85,name:'Undercrag vault chests',plan:'WCP 4.1 Thieving'},

  /* the four skills that arrive in W4 (WORLD_GOAL W4): every row planned */
  {skill:'Crafting',tab:'Leather',level:1,item:'leather_gloves',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:7,item:'leather_boots',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:14,item:'leather_body',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:18,item:'leather_chaps',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:41,item:'riveted_body',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:44,item:'riveted_chaps',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:57,item:'fenhide_vambraces',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:60,item:'fenhide_chaps',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Leather',level:63,item:'fenhide_body',plan:'WCP 4.1 Crafting (2004 steps)'},
  {skill:'Crafting',tab:'Other',level:1,item:'ball_of_wool',sub:'Spin wool on a wheel',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:1,item:'pot',sub:'Soft clay on a potter\'s wheel',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:5,name:'Gold ring',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:6,name:'Gold necklace',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:8,item:'bowl',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:8,name:'Gold amulet',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:10,item:'bow_string',sub:'Spin flax on a wheel',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:16,item:'holy_symbol',sub:'Silver',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:33,name:'Vial',sub:'Glass; the Gullhaven Glassworks',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Other',level:46,name:'Orb',sub:'Glass; for battlestaves',plan:'WCP 4.1 Crafting'},
  {skill:'Crafting',tab:'Places',level:40,name:'Crafters\' Hall',sub:'Needs a leather apron; the south-east coast',icon:'misc/door',plan:'WCP 2.2 G3'},

  {skill:'Herblore',tab:'Potions',level:1,name:'The Hedge Rite',sub:'The quest that opens Herblore; Reedwick',icon:'tabs/quests',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:3,name:'Attack potion',sub:'Fenmint, eye of newt',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:5,name:'Antipoison',sub:'Bogthyme, moorcalf horn dust',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:12,name:'Strength potion',sub:'Sallowleaf, thornboar tusk',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:22,name:'Restore potion',sub:'Hollowroot, ember spider eggs',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:26,name:'Energy potion',sub:'Hollowroot, bogcap',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:30,name:'Defence potion',sub:'Emberbloom, moorberries',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:38,name:'Prayer potion',sub:'Emberbloom, reedshoot',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:45,name:'Super attack',sub:'Duneflower, eye of newt',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:50,name:'Fishing potion',sub:'Duneflower, reedshoot',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:52,name:'Super energy',sub:'Frostcap, bogcap',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:55,name:'Super strength',sub:'Saltwort, thornboar tusk',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:63,name:'Super restore',sub:'Gravemoss, ember spider eggs',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:66,name:'Super defence',sub:'Cinderleaf, moorberries',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:69,name:'Antifire',sub:'Wyrmroot, wyrmscale dust',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:72,name:'Ranging potion',sub:'Wyrmroot, Duskford wine',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Potions',level:76,name:'Magic potion',sub:'Scarthorn, dune cactus',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:3,name:'Fenmint',sub:'Boglings, gnarlgobs; Mother Sallow\'s stall',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:5,name:'Bogthyme',sub:'Boglings, gnarlgobs; Mother Sallow\'s stall',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:11,name:'Sallowleaf',sub:'Road rogues, fenwretches',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:20,name:'Hollowroot',sub:'Fenwretches, bog hags',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:25,name:'Emberbloom',sub:'Ash druids, bog hags',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:40,name:'Duneflower',sub:'Sand bandits, Tor giants',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:48,name:'Frostcap',sub:'Tor giants, ice wights',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:54,name:'Saltwort',sub:'Moss-ogres, ember mages',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:65,name:'Gravemoss',sub:'Gravewights, fen horrors',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:67,name:'Cinderleaf',sub:'Ember mages, fen horrors',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:70,name:'Wyrmroot',sub:'Ember fiends, snow trolls',plan:'WCP 4.1 Herblore'},
  {skill:'Herblore',tab:'Herbs',level:75,name:'Scarthorn',sub:'Ember fiends, the Drowned King',plan:'WCP 4.1 Herblore'},

  {skill:'Agility',tab:'Courses',level:1,name:'The Rampart Run',sub:'Hearthmere Castle; to level 20',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:10,name:'Canopy Course',sub:'Emberwood; to level 35',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:35,name:'Longship Course',sub:'Brynholt, after Raiders\' Truce',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:40,name:'The Sunpit',sub:'The Proving Grounds',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:52,name:'The Scar Run',sub:'Scarlands level 10; a fall hurts',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:60,name:'Whitmoor Battlements Run',sub:'Whitmoor Hold; to level 80',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Courses',level:80,name:'Undercrag Chasm Leaps',sub:'The Undercrag; to level 99',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:5,name:'Ford stepping stones',sub:'The river ford by Hearthmere',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:15,name:'Fen log bridges',sub:'Gloomfen',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:30,name:'Wall breach',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:38,name:'Stonereach cliff steps',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:45,name:'Zahrim wall gap',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:55,name:'Whitmoor ice ledge',icon:'misc/boot',plan:'WCP 4.1 Agility'},
  {skill:'Agility',tab:'Shortcuts',level:70,name:'Slagfield vent jump',sub:'Scarlands',icon:'misc/boot',plan:'WCP 4.1 Agility'},

  {skill:'Runecrafting',tab:'Runes',level:1,name:'The Blank Stone',sub:'The quest that opens Runecrafting',icon:'tabs/quests',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:1,item:'air_rune',sub:'Windy Tor ruin',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:2,item:'mind_rune',sub:'Watch Pass hills',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:5,item:'water_rune',sub:'Gloomfen caves',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:9,item:'earth_rune',sub:'North-east of Aldermarch',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:14,item:'fire_rune',sub:'North of Zahrim',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:20,item:'body_rune',sub:'South of Rimeby',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:27,name:'Star rune',sub:'A ruin inside a glimmerbark ring',plan:'WCP 4.1 Runecrafting; NAMING_BIBLE runes'},
  {skill:'Runecrafting',tab:'Runes',level:35,item:'chaos_rune',sub:'Cinder Chapel crypt; Scarlands level 9',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:44,item:'nature_rune',sub:'The deep-dunes oasis',plan:'WCP 4.1 Runecrafting'},
  {skill:'Runecrafting',tab:'Runes',level:54,name:'Writ rune',sub:'Waystone Isle, off Gullhaven',plan:'WCP 4.1 Runecrafting; NAMING_BIBLE runes'},
  {skill:'Runecrafting',tab:'Runes',level:65,item:'spark_rune',sub:'The Undercrag Galleries',plan:'WCP 4.1 Runecrafting'},
];
/* the skills that have no live data at all yet (their whole guide is PLANNED rows) */
var PLANNED_SKILLS=['Crafting','Herblore','Agility','Runecrafting'];

/* ------------------------------------------------------------------------------------------------ helpers */
function has(o,k){return !!o&&Object.prototype.hasOwnProperty.call(o,k)}
function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1)}
function num(v){return typeof v==='number'&&isFinite(v)}
function pct(v){return Math.round(v*100)}
function tierMap(G){var m={};(G.TIERS||[]).forEach(function(t,i){m[t.key]={t:t,i:i}});return m}
/* the name kinds inside a tier, in the order a smith or a shop lists them */
var KIND_ORDER=['dagger','sword','sabre','longsword','mace','warhammer','battleaxe','greatsword','hatchet','pickaxe',
  'helm','med helm','sq shield','kiteshield','chainbody','platebody','platelegs','plateskirt'];
function kindRank(k){var i=KIND_ORDER.indexOf(k);return i<0?99:i}
function stripTier(name,label){return name.indexOf(label+' ')===0?name.slice(label.length+1):name}
function row(o){
  var lv=o.level==null?null:o.level;
  return {skill:o.skill,tab:o.tab,level:lv,label:o.label!=null?o.label:(lv==null?'':String(lv)),name:o.name,sub:o.sub||'',
    items:o.items||[],icon:o.icon||null,req:o.req||(lv!=null?[{skill:o.skill,level:lv}]:[]),planned:!!o.planned,
    proofs:o.proofs||[],plan:o.plan||'',order:o.order||0,spell:o.spell||null,prayer:o.prayer||null};
}
function itemIcon(id){return id?{item:id}:null}
/* the first item of a group that has a real picture (Blender render or painted sprite), else the first one */
function bestIcon(G,ids){for(var i=0;i<ids.length;i++)if(G.iconPath&&G.iconPath(ids[i]))return {item:ids[i]};return ids.length?{item:ids[0]}:null}

/* --------------------------------------------------------------------------------------- effect lines */
/* one brief line for a prayer, from the RULES in shared/combat.js (so the tip says what the engine does) */
function prayerLine(G,id){
  var R=G.COMBAT&&G.COMBAT.PRAYERS&&G.COMBAT.PRAYERS[id],P=G.PRAYERS&&G.PRAYERS[id];
  var d=R||{};
  if(d.stat&&num(d.pct))return 'Raises your '+STAT[d.stat]+' by '+(d.pct-100)+'%.';
  if(d.protect){
    var cut=G.COMBAT&&G.COMBAT.pvpProtectedMaxHit?100-G.COMBAT.pvpProtectedMaxHit(100):40;
    var what={magic:'spells',ranged:'arrows',melee:'blades'}[d.protect]||d.protect;
    return 'Stops monsters\' '+what+'; other players\' '+what+' hit '+cut+'% less.';
  }
  if(id==='protect_item')return 'Keep one more item if you fall.';
  return P&&P.name?P.name+'.':'';
}
/* seconds per prayer point at a given prayer bonus, from the 2004 drain timer in shared/combat.js */
function prayerDrainSeconds(G,id,bonus){
  var C=G.COMBAT,R=C&&C.PRAYERS&&C.PRAYERS[id];var d=R?R.drain:(G.PRAYERS&&G.PRAYERS[id]?G.PRAYERS[id].drain:0);
  if(!(d>0))return null;var res=C&&C.prayerDrainResistance?C.prayerDrainResistance(bonus||0):60;
  return res/d*(G.TICK||0.6);
}
function secondsText(s){if(s==null)return '';var r=s>=10?Math.round(s):Math.round(s*10)/10;return r+' s'}
function runeName(G,r){var it=G.ITEMS&&G.ITEMS[r];return it?String(it.name).replace(/ runes?$/i,''):r}
function spellRunes(G,id){
  var sp=G.SPELLS[id];if(!sp||!sp.runes)return '';var k=Object.keys(sp.runes);
  if(!k.length)return 'No runes';
  return 'Runes: '+k.map(function(r){return sp.runes[r]+' '+runeName(G,r)}).join(', ');
}
function spellLine(G,id){
  var sp=G.SPELLS[id];if(!sp)return '';
  if(num(sp.max))return 'Hits for up to '+sp.max+'.';
  if(sp.utility==='curse')return 'Lowers a foe\'s '+(STAT[sp.stat]||sp.stat)+' by '+(100-pct(sp.cut||1))+'%.';
  if(sp.utility==='teleport'){var z=G.ZONES&&sp.dest&&G.ZONES[sp.dest];
    var place=z&&z.name?String(z.name).replace(/^The /,'the '):String(sp.name).replace(/ Teleport$/,'');
    return 'Teleports you to '+place+(sp.cd>=60?'; rest '+sp.cd+' s between casts.':'.');}
  if(sp.utility==='alch')return 'Turns an item into crowns: '+pct(sp.mult)+'% of its value.';
  return '';
}

/* ------------------------------------------------------------------------------------------- builders */
/* gear rows: a metal tier's items share one row per level ("Iron weapons": dagger, sword, sabre...), a non-metal
   set of two or more (leather, riveted, cloth...) shares one row, everything else is its own row */
function gearRows(G,skill,tab,filter,noun,iconPref){
  var TM=tierMap(G),groups={},list=[];
  Object.keys(G.ITEMS).forEach(function(id){
    var it=G.ITEMS[id];if(!it||!filter(it,id))return;
    var lv=num(it.reqLvl)?it.reqLvl:1,tm=TM[it.tier],key;
    if(tm&&String(it.name).indexOf(tm.t.label+' ')===0)key='t:'+it.tier+'@'+lv;
    else if(it.tier&&!tm)key='s:'+it.tier+'@'+lv;
    else key='i:'+id;
    if(!groups[key]){groups[key]={key:key,level:lv,ids:[],tier:it.tier,metal:!!(tm&&key.charAt(0)==='t')};list.push(groups[key])}
    groups[key].ids.push(id);
  });
  var out=[];
  list.forEach(function(g){
    // a non-metal "set" of one item is just that item
    if(g.key.charAt(0)==='s'&&g.ids.length<2){g.key='i:'+g.ids[0];g.metal=false}
    var ids=g.ids.slice(),name,sub='',icon;
    var proofs=ids.map(function(id){return {table:'ITEMS',id:id,field:'reqLvl',value:num(G.ITEMS[id].reqLvl)?G.ITEMS[id].reqLvl:null,skill:skill}});
    if(g.metal){
      var label=TM[g.tier].t.label;
      ids.sort(function(a,b){return kindRank(stripTier(G.ITEMS[a].name,label).toLowerCase())-kindRank(stripTier(G.ITEMS[b].name,label).toLowerCase())});
      name=label+' '+noun;
      sub=cap(ids.map(function(id){return stripTier(G.ITEMS[id].name,label).toLowerCase()}).join(', '));
      var pref=iconPref.map(function(k){return ids.filter(function(id){return stripTier(G.ITEMS[id].name,label).toLowerCase()===k})[0]}).filter(Boolean);
      icon=bestIcon(G,pref.concat(ids));
    }else if(g.key.charAt(0)==='s'){
      var robes=ids.some(function(id){return /robe|hat/.test(G.ITEMS[id].model||'')});
      name=cap(g.tier)+(robes?' robes':' armour');
      sub=ids.map(function(id){return G.ITEMS[id].name}).join(', ');
      icon=bestIcon(G,ids);
    }else{
      var it=G.ITEMS[ids[0]];name=it.name;icon=itemIcon(ids[0]);
      if(it.provides&&G.ITEMS[it.provides])sub='Gives endless '+G.ITEMS[it.provides].name+'s';
    }
    out.push(row({skill:skill,tab:tab,level:g.level,name:name,sub:sub,items:ids,icon:icon,proofs:proofs,
      order:g.metal?TM[g.tier].i:50}));
  });
  return out;
}
/* tools (hatchets, pickaxes, nets): the skill itself sets no level, so every tool is level 1 in its skill; a tool
   that must be wielded also needs its Attack level, and the row says so (and dims until you have it) */
function toolRows(G,skill,tab,tool,wield){
  var ids=Object.keys(G.ITEMS).filter(function(id){var it=G.ITEMS[id];return it&&it.tool===tool});
  ids.sort(function(a,b){return (G.ITEMS[a].power||0)-(G.ITEMS[b].power||0)});
  return ids.map(function(id,i){
    var it=G.ITEMS[id],req=[{skill:skill,level:1}],sub='Speed x'+(it.power||1);
    var proofs=[{table:'ITEMS',id:id,field:'tool',value:tool,fact:true}];
    if(wield&&it.equip==='weapon'&&it.reqSkill){var alv=num(it.reqLvl)?it.reqLvl:1;
      req.push({skill:it.reqSkill,level:alv});sub='Wield with '+it.reqSkill+' '+alv+'; speed x'+(it.power||1);
      proofs.push({table:'ITEMS',id:id,field:'reqLvl',value:num(it.reqLvl)?it.reqLvl:null,skill:it.reqSkill,fact:true})}
    return row({skill:skill,tab:tab,level:1,name:it.name,sub:sub,items:[id],icon:itemIcon(id),req:req,proofs:proofs,order:i});
  });
}
function fishName(G,id){var n=G.ITEMS[id]?G.ITEMS[id].name:id;return cap(String(n).replace(/^raw /i,''))}

function buildLive(G){
  var R=[],I=G.ITEMS,push=function(a){R.push.apply(R,a)};
  var isWeapon=function(it){return it.equip==='weapon'};
  // ---- Attack: melee weapons and wieldable tools (reqSkill Attack)
  push(gearRows(G,'Attack','Weapons',function(it){return isWeapon(it)&&it.style==='melee'&&it.reqSkill==='Attack'&&!it.tool},'weapons',['longsword','sabre','sword','battleaxe','mace']));
  push(gearRows(G,'Attack','Tools',function(it){return isWeapon(it)&&it.reqSkill==='Attack'&&!!it.tool},'tools',['hatchet','pickaxe']));
  // ---- Defence: metal armour by tier, then the rest
  var TM=tierMap(G);
  push(gearRows(G,'Defence','Armour',function(it){var tm=TM[it.tier];return !!it.equip&&!isWeapon(it)&&it.reqSkill==='Defence'&&!!tm&&String(it.name).indexOf(tm.t.label+' ')===0},'armour',['helm','kiteshield','platebody']));
  push(gearRows(G,'Defence','Other',function(it){var tm=TM[it.tier];return !!it.equip&&!isWeapon(it)&&it.reqSkill==='Defence'&&!(tm&&String(it.name).indexOf(tm.t.label+' ')===0)},'armour',[]));
  // ---- Ranged / Magic / Prayer gear
  push(gearRows(G,'Ranged','Bows',function(it){return isWeapon(it)&&it.reqSkill==='Ranged'},'bows',[]));
  push(gearRows(G,'Ranged','Armour',function(it){return !!it.equip&&!isWeapon(it)&&it.reqSkill==='Ranged'},'armour',[]));
  push(gearRows(G,'Magic','Equipment',function(it){return !!it.equip&&it.reqSkill==='Magic'},'robes',[]));
  push(gearRows(G,'Prayer','Equipment',function(it){return !!it.equip&&it.reqSkill==='Prayer'},'robes',[]));
  // ---- Hitpoints: food, by how much it heals (no level)
  Object.keys(I).filter(function(id){return num(I[id].heal)&&I[id].heal>0}).sort(function(a,b){return I[a].heal-I[b].heal}).forEach(function(id,i){
    R.push(row({skill:'Hitpoints',tab:'Food',level:null,name:I[id].name,sub:'Heals '+I[id].heal,items:[id],icon:itemIcon(id),order:i,
      proofs:[{table:'ITEMS',id:id,field:'heal',value:I[id].heal,fact:true}]}));
  });
  // ---- Magic: the spellbook
  Object.keys(G.SPELLS||{}).forEach(function(id){
    var sp=G.SPELLS[id],tab=(num(sp.max)||sp.utility==='curse')?'Combat':'Utility';
    R.push(row({skill:'Magic',tab:tab,level:sp.req,name:sp.name,sub:spellLine(G,id),icon:{sprite:'spells/'+id},spell:id,
      proofs:[{table:'SPELLS',id:id,field:'req',value:sp.req}]}));
  });
  // ---- Prayer: the book (the client table's level, and the rules' level, must agree)
  Object.keys(G.PRAYERS||{}).forEach(function(id){
    var p=G.PRAYERS[id],proofs=[{table:'PRAYERS',id:id,field:'req',value:p.req}];
    if(G.COMBAT&&G.COMBAT.PRAYERS)proofs.push({table:'RULES',id:id,field:'level',value:p.req});
    R.push(row({skill:'Prayer',tab:'Prayers',level:p.req,name:p.name,sub:prayerLine(G,id),icon:{sprite:'prayers/'+id},prayer:id,proofs:proofs}));
  });
  // ---- Woodcutting: every tree gives Emberwood logs (GATHER_RATES.tree; no level), hatchets must be wielded
  if(G.GATHER_RATES&&G.GATHER_RATES.tree){var tl=G.GATHER_RATES.tree.item;
    R.push(row({skill:'Woodcutting',tab:'Trees',level:1,name:I[tl]?I[tl].name:tl,sub:'Any tree',items:[tl],icon:itemIcon(tl),
      proofs:[{table:'GATHER_RATES',id:'tree',field:'req',value:null},{table:'GATHER_RATES',id:'tree',field:'item',value:tl,fact:true}]}))}
  push(toolRows(G,'Woodcutting','Hatchets','woodcutting',true));
  // ---- Mining: the rock kinds; a pickaxe anywhere in the pack will do
  Object.keys(G.ROCK_KINDS||{}).forEach(function(k,i){var rk=G.ROCK_KINDS[k];
    R.push(row({skill:'Mining',tab:'Ores',level:rk.req,name:I[rk.item]?I[rk.item].name:rk.item,sub:String(rk.label||'').replace(/^Mine /,''),
      items:[rk.item],icon:itemIcon(rk.item),order:i,proofs:[{table:'ROCK_KINDS',id:k,field:'req',value:rk.req}]}))});
  push(toolRows(G,'Mining','Pickaxes','mining',false));
  // ---- Fishing: the net spots (GATHER_RATES.fish) and the Minnow Hollow rules
  var fr=G.FISHING;
  if(G.GATHER_RATES&&G.GATHER_RATES.fish){var ff=G.GATHER_RATES.fish.item;
    R.push(row({skill:'Fishing',tab:'Catches',level:1,name:fishName(G,ff),sub:'Small net',items:[ff],icon:itemIcon(ff),
      proofs:[{table:'GATHER_RATES',id:'fish',field:'req',value:null}]}))}
  if(fr&&fr.big){R.push(row({skill:'Fishing',tab:'Catches',level:fr.big.minLevel,name:fishName(G,fr.big.item),sub:'Small net; Minnow Hollow',items:[fr.big.item],
      icon:itemIcon(fr.big.item),proofs:[{table:'FISHING',id:'big',field:'minLevel',value:fr.big.minLevel}]}))}
  if(fr){(fr.rare||[]).forEach(function(q,i){R.push(row({skill:'Fishing',tab:'Finds',level:1,name:I[q.item]?I[q.item].name:q.item,
      sub:'About 1 in '+q.oneIn+' casts'+(q.oncePerAccount?', once':''),items:[q.item],icon:itemIcon(q.item),order:i,
      proofs:[{table:'FISHING',id:'rare:'+q.item,field:'minLevel',value:null}]}))});
    ((fr.junk&&fr.junk.items)||[]).forEach(function(j,i){R.push(row({skill:'Fishing',tab:'Finds',level:1,name:I[j[0]]?I[j[0]].name:j[0],
      sub:'Junk',items:[j[0]],icon:itemIcon(j[0]),order:10+i,proofs:[{table:'FISHING',id:'junk:'+j[0],field:'minLevel',value:null}]}))})}
  push(toolRows(G,'Fishing','Tools','fishing',false));
  // ---- Cooking: fish (COOK_FISH), bread (BreadRecipe: no level), coffee (CRShared.drinks)
  (G.COOK_FISH||[]).forEach(function(f,i){R.push(row({skill:'Cooking',tab:'Food',level:1,name:I[f.done]?I[f.done].name:f.done,
      sub:I[f.done]&&I[f.done].heal?'Heals '+I[f.done].heal:'',items:[f.done],icon:itemIcon(f.done),order:i,
      proofs:[{table:'COOK_FISH',id:f.raw,field:'req',value:null}]}))});
  if(I.bread)R.push(row({skill:'Cooking',tab:'Food',level:1,name:I.bread.name,sub:'Bake dough in a range',items:['bread'],icon:itemIcon('bread'),order:5,
      proofs:[{code:'src/cooking_bread.js',noLevel:'Cooking'}]}));
  var brews=G.DRINKS&&G.DRINKS.BREWS;
  if(brews)Object.keys(brews).forEach(function(k){var b=brews[k];if(b.skill!=='Cooking')return;var out=b.outputs&&b.outputs[0];
    R.push(row({skill:'Cooking',tab:'Food',level:b.level,name:I[out]?I[out].name.replace(/ \(\d\)$/,''):k,sub:'Brew on a range',items:out?[out]:[],
      icon:itemIcon(out),order:6,proofs:[{table:'BREWS',id:k,field:'level',value:b.level}]}))});
  // ---- Firemaking: only Emberwood logs light (startFiremaking checks no level)
  if(I.logs)R.push(row({skill:'Firemaking',tab:'Logs',level:1,name:I.logs.name,sub:'Light with a tinderbox',items:['logs'],icon:itemIcon('logs'),
      proofs:[{code:'src/game3_systems.js',fn:'startFiremaking',noLevel:'Firemaking'}]}));
  // ---- Smithing: the furnace, then one tab per bar at the anvil
  Object.keys(G.SMELTS||{}).forEach(function(bar,i){var s=G.SMELTS[bar];
    var needs=Object.keys(s.needs||{}).map(function(k){var n=s.needs[k],nm=I[k]?I[k].name:k;return n>1?n+' '+nm.toLowerCase():nm.toLowerCase()});
    R.push(row({skill:'Smithing',tab:'Smelting',level:s.req,name:I[bar]?I[bar].name:s.name,sub:cap(needs.join(', ')),items:[bar],icon:itemIcon(bar),order:i,
      proofs:[{table:'SMELTS',id:bar,field:'req',value:s.req}]}))});
  Object.keys(G.SMITHABLES||{}).forEach(function(bar){
    var tab=barTab(G,bar);
    (G.SMITHABLES[bar]||[]).forEach(function(it,i){
      R.push(row({skill:'Smithing',tab:tab,level:it.req,name:it.name,sub:it.bars+' bar'+(it.bars>1?'s':''),items:[it.id],icon:itemIcon(it.id),order:i,
        proofs:[{table:'SMITHABLES',group:bar,id:it.id,field:'req',value:it.req}]}))})});
  // ---- Fletching: FLETCHABLES, and arrows (fletchArrows checks no level)
  (G.FLETCHABLES||[]).forEach(function(f,i){var tab=I[f.id]&&I[f.id].equip?'Bows':'Arrows';
    R.push(row({skill:'Fletching',tab:tab,level:f.req,name:f.name,sub:'Cut from Emberwood logs',items:[f.id],icon:itemIcon(f.id),order:i,
      proofs:[{table:'FLETCHABLES',id:f.id,field:'req',value:f.req}]}))});
  if(I.arrows)R.push(row({skill:'Fletching',tab:'Arrows',level:1,name:I.arrows.name+' (x12)',sub:'12 shafts, 12 feathers, 12 arrowtips',items:['arrows'],icon:itemIcon('arrows'),order:5,
      proofs:[{code:'src/game3_systems.js',fn:'fletchArrows',noLevel:'Fletching'}]}));
  // ---- Thieving: pockets and stalls
  Object.keys(G.PICKPOCKETS||{}).forEach(function(k,i){var p=G.PICKPOCKETS[k],npc=G.NPC_TYPES&&G.NPC_TYPES[k];
    R.push(row({skill:'Thieving',tab:'Pickpocketing',level:p.req,name:npc&&npc.name?npc.name:cap(p.name),sub:p.coins?p.coins[0]+' to '+p.coins[1]+' crowns':'',
      items:['coins'],icon:itemIcon('coins'),order:i,proofs:[{table:'PICKPOCKETS',id:k,field:'req',value:p.req}]}))});
  Object.keys(G.STALL_KINDS||{}).forEach(function(k,i){var s=G.STALL_KINDS[k],loot=s.loot&&s.loot[0];
    var lid=loot?loot[0]:null,lsub=lid?(lid==='coins'?loot[1]+' crowns':(I[lid]?I[lid].name:lid)):'';
    R.push(row({skill:'Thieving',tab:'Stalls',level:s.req,name:s.label,sub:lsub,items:lid?[lid]:[],icon:itemIcon(lid),order:i,
      proofs:[{table:'STALL_KINDS',id:k,field:'req',value:s.req}]}))});
  return R;
}
/* a bar's anvil tab is named after its metal tier (TIERS label), so a renamed tier renames the tab */
function barTab(G,bar){var k=String(bar).replace(/_bar$/,''),tm=tierMap(G)[k];return tm?tm.t.label:cap(k)}

function buildPlanned(G){
  var R=[],TM=tierMap(G);
  PLANNED.forEach(function(p,n){
    if(p.expand==='anvil'){
      // the live steel anvil's steps, moved to this tier's base (see the table's comment)
      var shape=anvilShape(G),tm=TM[p.tier];if(!tm)return;
      shape.forEach(function(s,i){
        var id=p.tier+'_'+s.kind,it=G.ITEMS[id];
        R.push(row({skill:'Smithing',tab:tm.t.label,level:Math.min(99,p.level+s.off),name:it?it.name:tm.t.label+' '+s.kind,
          sub:s.bars+' bar'+(s.bars>1?'s':'')+(p.sub?'; '+p.sub:''),items:it?[id]:[],icon:it?itemIcon(id):null,planned:true,plan:p.plan,order:i}));
      });
      return;
    }
    var it=p.item?G.ITEMS[p.item]:null,name=p.name||(it?(p.skill==='Fishing'?fishName(G,p.item):it.name):p.item);
    var req=p.need?[{skills:p.need.skills,total:p.need.total}]:[{skill:p.skill,level:p.level}];
    var icon=p.icon?{sprite:p.icon}:(p.item?itemIcon(p.item):null);
    R.push(row({skill:p.skill,tab:p.tab,level:p.level,label:p.label,name:name,sub:p.sub||'',items:p.item?[p.item]:[],icon:icon,
      req:req,planned:true,plan:p.plan,order:100+n}));
  });
  return R;
}
/* the steps of the last live anvil tab: [{kind, off, bars}] relative to its first item */
function anvilShape(G){
  var S=G.SMITHABLES||{},bars=Object.keys(S),last=bars[bars.length-1],list=S[last]||[];if(!list.length)return [];
  var tier=String(last).replace(/_bar$/,''),base=list[0].req;
  return list.map(function(it){return {kind:String(it.id).slice(tier.length+1),off:it.req-base,bars:it.bars}})
    .filter(function(s){return s.kind&&s.kind!=='tips'});
}

/* ------------------------------------------------------------------------------------------ assemble */
function sortRows(a,b){
  var la=a.level==null?-1:a.level,lb=b.level==null?-1:b.level;
  if(la!==lb)return la-lb;
  if(a.planned!==b.planned)return a.planned?1:-1;
  return (a.order||0)-(b.order||0);
}
function build(G){
  var rows=buildLive(G).concat(buildPlanned(G)),out={};
  ALL_SKILLS.forEach(function(s){
    var mine=rows.filter(function(r){return r.skill===s});
    var names=(TABS[s]||[]).slice();
    if(s==='Smithing')(G.TIERS||[]).forEach(function(t){if(names.indexOf(t.label)<0)names.push(t.label)});
    mine.forEach(function(r){if(names.indexOf(r.tab)<0)names.push(r.tab)});
    var tabs=names.map(function(t){return {id:t,label:t,rows:mine.filter(function(r){return r.tab===t}).sort(sortRows)}})
      .filter(function(t){return t.rows.length});
    out[s]={skill:s,planned:PLANNED_SKILLS.indexOf(s)>=0,live:!!(G.SKILLS&&G.SKILLS.indexOf(s)>=0),tabs:tabs,
      count:mine.length,plannedCount:mine.filter(function(r){return r.planned}).length};
  });
  return out;
}
/* is a row within reach at these levels? (planned rows are never "unlocked": the UI dims them regardless) */
function met(r,lvl){
  for(var i=0;i<r.req.length;i++){var q=r.req[i];
    if(q.skills){var t=0;q.skills.forEach(function(s){t+=lvl(s)});if(t<q.total)return false}
    else if(lvl(q.skill)<q.level)return false}
  return true;
}
/* the game's globals, gathered at call time (top-level const tables are reachable by name, not on window) */
function fromGlobals(extra){
  function g(f){try{return f()}catch(e){return undefined}}
  var G={
    ITEMS:g(function(){return ITEMS}),TIERS:g(function(){return TIERS}),SKILLS:g(function(){return SKILLS}),TICK:g(function(){return TICK}),
    GATHER_RATES:g(function(){return GATHER_RATES}),NPC_TYPES:g(function(){return NPC_TYPES}),ZONES:g(function(){return ZONES}),
    SPELLS:g(function(){return SPELLS}),PRAYERS:g(function(){return PRAYERS}),
    SMELTS:g(function(){return SMELTS}),SMITHABLES:g(function(){return SMITHABLES}),FLETCHABLES:g(function(){return FLETCHABLES}),
    PICKPOCKETS:g(function(){return PICKPOCKETS}),STALL_KINDS:g(function(){return STALL_KINDS}),COOK_FISH:g(function(){return COOK_FISH}),
    ROCK_KINDS:g(function(){return ROCK_KINDS}),
    COMBAT:g(function(){return CRShared.combat}),DRINKS:g(function(){return CRShared.drinks}),
    FISHING:g(function(){var d=HolmFishing.data();return d&&d.rules}),
    iconPath:imagePath
  };
  if(extra)for(var k in extra)if(extra[k]!=null)G[k]=extra[k];
  return G;
}
/* an item's REAL picture: a Blender render (assets/icons/items) or a painted gear sprite (assets/icons/gear), the two
   pictures game0_icons.js knows about. null = no picture yet (the guide leaves the slot empty and the gap is reported;
   it never falls back to a drawn glyph) */
function imagePath(id){
  try{if(typeof HOLM_ITEM_ICONS!=='undefined'&&HOLM_ITEM_ICONS.has(id))return 'assets/icons/items/'+id+'.png'}catch(e){}
  try{if(typeof _gearSprite==='function'&&_gearSprite(id))return 'assets/icons/gear/'+id+'.png'}catch(e){}
  return null;
}

return {ALL_SKILLS:ALL_SKILLS,TABS:TABS,PLANNED:PLANNED,PLANNED_SKILLS:PLANNED_SKILLS,build:build,met:met,fromGlobals:fromGlobals,
  imagePath:imagePath,prayerLine:prayerLine,prayerDrainSeconds:prayerDrainSeconds,secondsText:secondsText,spellLine:spellLine,
  spellRunes:spellRunes,anvilShape:anvilShape};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SkillGuideData;
