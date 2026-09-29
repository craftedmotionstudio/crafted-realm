#!/usr/bin/env node
/* ============================================================================
   Crafted Realm — the naming-bible guard (docs/rebuild/NAMING_BIBLE.md; the pass: NAMING_PASS_2026-09-27.md).

   Fails when a RuneScape-owned name (every one the bible lists, plus the EXTRA list below) or a place name the bible
   superseded shows up in player-facing text, and when an internal id the pass promised to keep has gone:
     1. the detector itself: bible names are caught, ids / comments / regexes are not (a guard that sees nothing fails);
     2. every "RuneScape name" and "(was ...)" entry in the bible's own tables is on the banned list, so a name added to
        the bible is guarded without editing this file;
     3. ids unchanged, display names per the bible: ITEMS.air_rune is "Gale rune" (all runes), SPELLS.wind_strike is
        "Gale Dart" (all spells), the 17 prayers (client book + shared/combat.js rules keep the same ids), the Great
        Delver, the zones, the battleaxe special; spell rune costs still point at real item ids;
     4. the structured player data is clean: ITEMS names + examines, NPC names + examines, spell / prayer / special
        names, quest names + descriptions + stage text, zone and shop names;
     5. every string literal in src/, shared/ and the server runtime (engine, net, content, persist) is clean: dialogue,
        chat and examine lines, map and signpost labels, tooltips, banners, loading and arrival text;
     6. index.html's visible text and its title / aria-label / alt / placeholder attributes are clean (the login badge);
     7. server/data map area names and the display fields (name, label, title, text, examine, tooltip) of every
        tracked assets/ and server/data JSON file are clean.
   Run: node tools/test_naming_bible.js     Exit code 0 = clean, 1 = a banned name is back (each hit printed).
   ========================================================================== */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let failures=0;
function check(name,ok,detail){
  if(ok)console.log('  ok  '+name);
  else{failures++;console.error('  FAIL '+name+(detail!==undefined?'\n       '+(typeof detail==='string'?detail:JSON.stringify(detail)):''));}
}

/* ---------------------------------------------------------------------------------------------------------------
 * The banned names. Case-sensitive whole words unless marked /i: ids stay lowercase with _ or - (air_rune,
 * veyhollow-commons-v2, not_in_wilderness) and never match; ordinary words (sword, platebody, rune, curse) stay.
 * ------------------------------------------------------------------------------------------------------------- */
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words=list=>new RegExp('\\b(?:'+list.map(esc).join('|')+')\\b');
/* the bible's tables (also parsed from NAMING_BIBLE.md in section 2) */
const BIBLE_RS=[
  'Wind Strike','Water Strike','Earth Strike','Fire Strike','Wind Bolt','Water Bolt','Earth Bolt','Fire Bolt',
  'Wind Blast','Water Blast','Earth Blast','Fire Blast','Confuse','Weaken','Curse','Low Level Alchemy','High Level Alchemy',
  'Thick Skin','Rock Skin','Steel Skin','Burst of Strength','Superhuman Strength','Ultimate Strength','Clarity of Thought',
  'Improved Reflexes','Incredible Reflexes','Sharp Eye','Hawk Eye','Mystic Will','Mystic Lore','Rapid Restore','Rapid Heal',
  'Protect Item','Protect from Magic','Protect from Missiles','Protect from Melee','Giant Mole',
  'Lumbridge','Varrock','Falador','Stormwind','Rivendell','Murkmire'];
/* the places the bible superseded (our own old names; the ids keep them) */
const SUPERSEDED=['Veyhollow','VEYHOLLOW','Wardenholm','WARDENHOLM','Frontier Post','FRONTIER POST','Palmgate','PALMGATE',
  'Emberford','EMBERFORD','Saltreach','SALTREACH','Brynstead','BRYNSTEAD'];
/* the extra list: other distinctly RuneScape names a player could meet */
const EXTRA_RS=[
  // places and regions
  'Draynor','Al Kharid','Edgeville','Karamja','Port Sarim','Rimmington','Taverley','Burthorpe','Catherby','Camelot',
  'Ardougne','Yanille','Canifis','Morytania','Misthalin','Asgarnia','Kandarin','Gielinor','Entrana','Crandor',
  'Tutorial Island','Barbarian Village',"Seers' Village",'Duel Arena','Grand Exchange','Wilderness','WILDERNESS',
  // gods
  'Zamorak','Saradomin','Guthix','Armadyl','Bandos','Zaros',
  // quests
  'Rune Mysteries',"Cook's Assistant",'Dragon Slayer','Demon Slayer','Sheep Shearer','Imp Catcher','Restless Ghost',
  'Shield of Arrav','Ernest the Chicken','Vampire Slayer',"Witch's Potion",'Goblin Diplomacy',"Black Knights' Fortress",
  'Prince Ali Rescue',"Doric's Quest","Pirate's Treasure",
  // NPCs and tutorial titles
  'Duke Horacio','Wise Old Man','Brother Brace','Survival Expert','Master Chef','Quest Guide','Mining Instructor',
  'Combat Instructor','Magic Instructor','Financial Advisor','Gielinor Guide','RuneScape Guide','Lumbridge Guide',
  'Aubury','Sedridor','Oziach','Reldo',
  // monsters
  'Moss Giant','Hill Giant','Lesser Demon','Greater Demon','Black Demon','King Black Dragon','Kalphite Queen',
  'Chaos Elemental','Abyssal demon','Hellhound','Dagannoth','Zulrah','Vorkath','Elvarg','Obor','Bryophyta',
  // metals, items, sets
  'Mithril','Adamant','Adamantite','Runite','Abyssal whip','Granite maul','Rune essence','Pure essence','Barrows',
  'Dharok','Ahrim','Guthan','Karil','Torag','Verac',
  // prayers and spells past the bible's tables
  'Eagle Eye','Mystic Might','Smite','Redemption','Retribution','Piety','Chivalry','Low Alch','High Alch',
  'Telekinetic Grab','Bones to Bananas','Superheat Item','Home Teleport',
  // special attacks (Rampage is RuneScape's dragon battleaxe special; ours is Roaring Swing)
  'Rampage',
  // the brand
  'RuneScape','Runescape','Jagex'];
const RULES=[
  {why:'bible: RuneScape name',re:words(BIBLE_RS)},
  {why:'bible: superseded place name',re:words(SUPERSEDED)},
  {why:'extra: RuneScape name',re:words(EXTRA_RS)},
  {why:'bible: RuneScape spell tier',re:/\b(?:Wind|Water|Earth|Fire|Air|Smoke|Shadow|Blood|Ice) (?:Strike|Bolt|Blast|Wave|Surge|Burst|Blitz|Barrage)\b/},
  {why:'bible: RuneScape rune name',re:/\b(?:air|water|earth|fire|mind|body|chaos|nature|law|death|cosmic|blood|soul|astral|wrath) runes?\b/i},
  {why:'extra: RuneScape rune/dragon gear',re:/\b(?:rune|dragon) (?:platebody|platelegs|plateskirt|scimitar|longsword|sword|full helm|med helm|kiteshield|sq shield|pickaxe|axe|battleaxe|2h sword|chainbody|dagger|mace|warhammer|spear|halberd)\b/i},
];
function hits(text){const out=[];for(const r of RULES){const m=r.re.exec(text);if(m)out.push(r.why+' "'+m[0]+'"');}return out;}

/* ---------------------------------------------------------------------------------------------------------------
 * A small JS lexer: the string literals of a file (template chunks without their ${...}); comments and regex
 * literals are skipped, so a comment may name RuneScape freely and a regex may match an old save's text.
 * ------------------------------------------------------------------------------------------------------------- */
const KW=new Set(['return','typeof','instanceof','in','of','new','delete','void','throw','case','do','else','yield','await']);
function strings(src){
  const out=[];let i=0,last='';const n=src.length,tpl=[];let depth=0;
  const regexOk=()=>!(last==='id'||last==='num'||last==='str'||last==='re'||last===')'||last===']'||last==='}');
  function template(){let s=i;while(i<n){const c=src[i];if(c==='\\'){i+=2;continue}
    if(c==='`'){out.push({s,e:i});i++;last='str';return}
    if(c==='$'&&src[i+1]==='{'){out.push({s,e:i});i+=2;tpl.push(depth);depth++;last='{';return}i++}
    out.push({s,e:i});}
  while(i<n){const c=src[i];
    if(c===' '||c==='\t'||c==='\r'||c==='\n'){i++;continue}
    if(c==='/'&&src[i+1]==='/'){while(i<n&&src[i]!=='\n')i++;continue}
    if(c==='/'&&src[i+1]==='*'){const e=src.indexOf('*/',i+2);i=e<0?n:e+2;continue}
    if(c==='"'||c==="'"){const q=c,s=++i;while(i<n&&src[i]!==q&&src[i]!=='\n'){if(src[i]==='\\')i++;i++}out.push({s,e:i});i++;last='str';continue}
    if(c==='`'){i++;template();continue}
    if(c==='}'){if(tpl.length&&tpl[tpl.length-1]===depth-1){tpl.pop();depth--;i++;template();continue}depth--;i++;last='}';continue}
    if(c==='{'){depth++;i++;last='{';continue}
    if(c==='/'){if(regexOk()){i++;let cls=false;while(i<n){const d=src[i];if(d==='\\'){i+=2;continue}if(d==='\n')break;
        if(cls){if(d===']')cls=false}else if(d==='[')cls=true;else if(d==='/')break;i++}
        i++;while(i<n&&/[a-z]/i.test(src[i]))i++;last='re';continue}
      i++;last='/';continue}
    if(/[A-Za-z_$\u00c0-\uffff]/.test(c)){const s=i;while(i<n&&/[A-Za-z0-9_$\u00c0-\uffff]/.test(src[i]))i++;last=KW.has(src.slice(s,i))?'kw':'id';continue}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){i++;while(i<n&&/[0-9A-Za-z_.]/.test(src[i]))i++;last='num';continue}
    last=c;i++;}
  return out.map(o=>({text:src.slice(o.s,o.e),at:o.s}));
}
const lineAt=(src,at)=>src.slice(0,at).split('\n').length;

/* ---- 1. the detector works both ways ---- */
console.log('1. the detector:');
{
  const sample="// Wind Strike in a comment is fine\nconst A={air_rune:{name:'Gale rune'},id:'veyhollow-commons-v2',why:'not_in_wilderness'};\n"+
    "const r=/Protect Item/.test(x);/* Lumbridge */ const B=\"Welcome to Veyhollow.\",C=`cast ${'Wind Strike'} now`,D='fire runes';";
  const flagged=strings(sample).filter(s=>hits(s.text).length).map(s=>s.text);
  check('flags the banned names in string literals (and inside ${...} of templates)',
    JSON.stringify(flagged)===JSON.stringify(['Welcome to Veyhollow.','Wind Strike','fire runes']),flagged);
  check('ignores ids, comments and regex literals',!flagged.some(t=>/air_rune|veyhollow-commons|not_in_wilderness|Protect Item|Lumbridge/.test(t)));
  const clean=['Gale Dart','Gale rune','Keepsake Ward','Ward against Blades','Hearthmere','the Great Delver','Tutor\'s Holm',
    'Oak Hide','Lion\'s Heart','Lesser Transmute','Befuddle','Sap','Gullhaven','the Ditch','Bronze platebody','Rune table',
    'That foe is already weakened there.','Choose a foe first, then cast the curse.','Hawk Shot','Power Surge','Roaring Swing'];
  const falsePos=clean.filter(t=>hits(t).length);
  check('passes the bible\'s own names and ordinary words',!falsePos.length,falsePos);
}

/* ---- 2. every name the bible lists as RuneScape's (or superseded) is guarded ---- */
console.log('2. the bible\'s tables are all on the banned list:');
{
  const bible=read('docs/rebuild/NAMING_BIBLE.md');
  // "A / B / C Strike" -> A Strike, B Strike, C Strike; "Protect from Magic / Missiles / Melee" -> Protect from ...
  const expand=cell=>{const p=cell.split(' / ').map(s=>s.trim());if(p.length<2)return p;
    const w=p.map(s=>s.split(' ').length),first=p[0].split(' '),lastP=p[p.length-1].split(' ');
    if(w[0]>1&&w.slice(1).every(k=>k===1))return p.map((s,i)=>i?first.slice(0,-1).concat(s).join(' '):s);
    if(w[w.length-1]>1&&w.slice(0,-1).every(k=>k===1))return p.map((s,i)=>i<p.length-1?[s].concat(lastP.slice(1)).join(' '):s);
    return p;};
  const rsNames=[];let inRs=false;
  for(const line of bible.split(/\r?\n/)){
    if(/^\|\s*RuneScape name/.test(line)){inRs=true;continue}
    if(!line.startsWith('|')){inRs=false;continue}
    if(inRs&&!/^\|\s*-/.test(line)){const cell=line.split('|')[1].trim();if(cell&&!/^</.test(cell))rsNames.push(...expand(cell));}
  }
  const was=[...bible.matchAll(/\(was ([^)]+)\)/g)].map(m=>m[1].replace(/^the valley of /,''));
  const runeIds=[...bible.matchAll(/^\|\s*([a-z]+)_rune\s*\|/gm)].map(m=>m[1][0].toUpperCase()+m[1].slice(1)+' rune');
  check('found the bible\'s RuneScape names (magic, prayers, monsters)',rsNames.length>=30,rsNames.length);
  check('found the bible\'s superseded places and rune ids',was.length>=8&&runeIds.length===13,{was,runeIds});
  const missing=rsNames.concat(was,runeIds).filter(n=>!hits(n).length);
  check('every one of them is caught by the guard',!missing.length,missing);
}

/* ---- load the game's data the way the server does (server/content/GameData.js: the client files in a VM) ---- */
const box={Math,console,JSON,Set,Map,Array,Object,WORLD:{}};box.globalThis=box;vm.createContext(box);
vm.runInContext(read('src/game1_data.js')+'\n;globalThis.__D={ITEMS,NPC_TYPES,QUESTS,ZONES,SHOPS};',box,{filename:'src/game1_data.js'});
vm.runInContext(read('src/magic_spells.js')+'\n;globalThis.__S=SPELLS;',box,{filename:'src/magic_spells.js'});
const sys=read('src/game3_systems.js');
const block=name=>{const a=sys.indexOf('const '+name+' = {');if(a<0)throw new Error(name+' not found in src/game3_systems.js');
  const b=sys.indexOf('\n};',a);return vm.runInNewContext('('+sys.slice(a+('const '+name+' = ').length,b+2)+')');};
const {ITEMS,NPC_TYPES,QUESTS,ZONES,SHOPS}=box.__D,SPELLS=box.__S,PRAYERS=block('PRAYERS'),SPECIALS=block('SPECIALS');
const SHARED_PRAYERS=require('../shared/combat.js').PRAYERS;

/* ---- 3. ids unchanged, display names per the bible ---- */
console.log('3. ids unchanged, names per the bible:');
{
  const RUNES={air_rune:'Gale rune',water_rune:'Tide rune',earth_rune:'Stone rune',fire_rune:'Ember rune',mind_rune:'Wit rune',
    body_rune:'Flesh rune',chaos_rune:'Wild rune',nature_rune:'Verdant rune',law_rune:'Writ rune',death_rune:'Grave rune',
    cosmic_rune:'Star rune',blood_rune:'Vein rune',soul_rune:'Spirit rune'};
  check('ITEMS.air_rune exists and is named "Gale rune"',!!ITEMS.air_rune&&ITEMS.air_rune.name==='Gale rune',ITEMS.air_rune&&ITEMS.air_rune.name);
  const have=Object.keys(RUNES).filter(id=>ITEMS[id]);
  check('the eight runes in the game keep their ids (air, water, earth, fire, mind, body, chaos, nature)',
    ['air_rune','water_rune','earth_rune','fire_rune','mind_rune','body_rune','chaos_rune','nature_rune'].every(id=>ITEMS[id]),have);
  const badRunes=have.filter(id=>ITEMS[id].name!==RUNES[id]).map(id=>id+'='+ITEMS[id].name);
  check('every rune carries its bible name (and a later law/death/... rune must too)',!badRunes.length,badRunes);
  const SP={wind_strike:'Gale Dart',water_strike:'Tide Dart',earth_strike:'Stone Dart',fire_strike:'Ember Dart',
    wind_bolt:'Gale Lance',water_bolt:'Tide Lance',earth_bolt:'Stone Lance',fire_bolt:'Ember Lance',
    wind_blast:'Gale Wrath',water_blast:'Tide Wrath',earth_blast:'Stone Wrath',fire_blast:'Ember Wrath',
    confuse:'Befuddle',weaken:'Sap',low_alch:'Lesser Transmute',high_alch:'Greater Transmute',home_tele:'Hearthmere Teleport'};
  check('SPELLS.wind_strike exists and is named "Gale Dart"',!!SPELLS.wind_strike&&SPELLS.wind_strike.name==='Gale Dart',SPELLS.wind_strike&&SPELLS.wind_strike.name);
  const badSp=Object.keys(SP).filter(id=>!SPELLS[id]||SPELLS[id].name!==SP[id]).map(id=>id+'='+(SPELLS[id]&&SPELLS[id].name));
  check('all 17 spell ids kept, each with its bible name',!badSp.length,badSp);
  const runeRefs=[];for(const id in SPELLS)for(const r in (SPELLS[id].runes||{}))if(!ITEMS[r])runeRefs.push(id+'->'+r);
  check('every spell\'s rune cost still names a real item id',!runeRefs.length,runeRefs);
  const PR={thick_skin:'Oak Hide',rock_skin:'Stone Hide',steel_skin:'Iron Hide',burst_str:'Boar\'s Heart',superhuman:'Bear\'s Heart',
    ultimate_str:'Lion\'s Heart',clarity:'Steady Hand',reflexes:'Sure Hand',incredible_ref:'True Hand',sharp_eye:'Kestrel\'s Sight',
    hawk_eye:'Falcon\'s Sight',mystic_will:'Candle Will',mystic_lore:'Lantern Lore',protect_item:'Keepsake Ward',
    protect_magic:'Ward against Spells',protect_range:'Ward against Arrows',protect_melee:'Ward against Blades'};
  const badPr=Object.keys(PR).filter(id=>!PRAYERS[id]||PRAYERS[id].name!==PR[id]).map(id=>id+'='+(PRAYERS[id]&&PRAYERS[id].name));
  check('all 17 prayer ids kept in the client book, each with its bible name',!badPr.length,badPr);
  const ruleIds=Object.keys(PR).filter(id=>!SHARED_PRAYERS[id]);
  check('the shared/combat.js prayer rules keep the same 17 ids',!ruleIds.length,ruleIds);
  check('NPC_TYPES.giant_mole is "The Great Delver"',!!NPC_TYPES.giant_mole&&NPC_TYPES.giant_mole.name==='The Great Delver',NPC_TYPES.giant_mole&&NPC_TYPES.giant_mole.name);
  // the creatures pass (2026-09-29): plain old-school creature words, ids kept; the grubkin is gone (the large rat)
  const CR={pasturehen:'Chicken',moorcalf:'Cow',gnarlgob:'Goblin',burrowrat:'Rat',large_rat:'Large rat'};
  const badCr=Object.keys(CR).filter(id=>!NPC_TYPES[id]||NPC_TYPES[id].name!==CR[id]).map(id=>id+'='+(NPC_TYPES[id]&&NPC_TYPES[id].name));
  check('the farm animals, the goblin and the rats keep their ids with plain names (Chicken, Cow, Goblin, Rat, Large rat)',!badCr.length,badCr);
  check('no creature is a grubkin any more (the large rat replaced it)',!NPC_TYPES.grubkin&&!Object.values(NPC_TYPES).some(t=>/grubkin/i.test(t.name||'')));
  check('zone ids kept: commons = Hearthmere, wardenholm = Hearthmere Castle, saltreach = Gullhaven',
    ZONES.commons&&ZONES.commons.name==='Hearthmere'&&ZONES.wardenholm&&ZONES.wardenholm.name==='Hearthmere Castle'&&ZONES.saltreach&&ZONES.saltreach.name==='Gullhaven',
    [ZONES.commons,ZONES.wardenholm,ZONES.saltreach].map(z=>z&&z.name));
  check('SPELLS.home_tele still sends you to the commons zone',SPELLS.home_tele&&SPELLS.home_tele.dest==='commons');
  check('the battleaxe special is Roaring Swing',SPECIALS.battleaxe&&SPECIALS.battleaxe.name==='Roaring Swing',SPECIALS.battleaxe);
  const main=read('src/world_v2_mainland.js');
  check('the mainland provider id stays veyhollow-commons-v2 (saves name it) with its hollow_well_square landmark',
    /id:'veyhollow-commons-v2'/.test(main)&&/hollow_well_square/.test(main));
  check('the teleport tablet keeps its id (home_tab) and is named "Hearthmere teleport"',
    /const ID\s*=\s*'home_tab'/.test(read('src/item_teleport_tabs.js'))&&/name:'Hearthmere teleport'/.test(read('src/item_teleport_tabs.js')));
}

/* ---- 4. the structured player data ---- */
console.log('4. items, NPCs, spells, prayers, specials, quests, zones, shops:');
{
  const bad=[];const see=(where,t)=>{if(typeof t!=='string')return;const h=hits(t);if(h.length)bad.push(where+': '+h.join(', ')+' in "'+t.slice(0,90)+'"');};
  for(const id in ITEMS){see('ITEMS.'+id+'.name',ITEMS[id].name);see('ITEMS.'+id+'.examine',ITEMS[id].examine);}
  for(const id in NPC_TYPES){see('NPC_TYPES.'+id+'.name',NPC_TYPES[id].name);see('NPC_TYPES.'+id+'.examine',NPC_TYPES[id].examine);}
  for(const id in SPELLS)see('SPELLS.'+id,SPELLS[id].name);
  for(const id in PRAYERS)see('PRAYERS.'+id,PRAYERS[id].name);
  for(const id in SPECIALS){see('SPECIALS.'+id,SPECIALS[id].name);see('SPECIALS.'+id+'.msg',SPECIALS[id].msg);}
  for(const id in QUESTS){const q=QUESTS[id];see('QUESTS.'+id+'.name',q.name);see('QUESTS.'+id+'.desc',q.desc);see('QUESTS.'+id+'.giver',q.giver);
    (q.stages||[]).forEach((s,i)=>see('QUESTS.'+id+'.stages['+i+']',s.text));}
  for(const id in ZONES)see('ZONES.'+id,ZONES[id].name);
  for(const id in SHOPS)see('SHOPS.'+id,SHOPS[id].name);
  check('ITEMS '+Object.keys(ITEMS).length+', NPC_TYPES '+Object.keys(NPC_TYPES).length+', SPELLS '+Object.keys(SPELLS).length+
    ', PRAYERS '+Object.keys(PRAYERS).length+', QUESTS '+Object.keys(QUESTS).length+': no banned name',!bad.length,bad.join('\n       '));
}

/* ---- 5. every string literal the game can show ---- */
console.log('5. string literals in src/, shared/ and the server runtime:');
const tracked=(...specs)=>cp.execSync('git ls-files -- '+specs.map(s=>'"'+s+'"').join(' '),{cwd:ROOT,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
{
  const files=tracked('src/*.js','shared/*.js','server/engine/*.js','server/net/*.js','server/content/*.js','server/persist/*.js','server/app.js','server/index.js')
    .filter(f=>fs.existsSync(path.join(ROOT,f)));
  const bad=[];let seen=0;
  for(const f of files){const src=read(f);for(const s of strings(src)){seen++;const h=hits(s.text);
    if(h.length)bad.push(f+':'+lineAt(src,s.at)+': '+h.join(', ')+' in "'+s.text.slice(0,100).replace(/\s+/g,' ')+'"');}}
  check('scanned '+files.length+' files, '+seen+' string literals (the sweep is not empty)',files.length>200&&seen>20000,{files:files.length,seen});
  check('no banned name in any of them',!bad.length,bad.join('\n       '));
  const all=files.map(read).join('\n');
  check('the new names are really in the game (Gale Dart, Keepsake Ward, Hearthmere, Gullhaven, the Great Delver)',
    ['Gale Dart','Keepsake Ward','Hearthmere','Gullhaven','Great Delver','Hearthmere Castle'].every(n=>all.indexOf(n)>=0));
}

/* ---- 6. index.html: what the page shows ---- */
console.log('6. index.html visible text:');
{
  const html=read('index.html');
  const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
  const body=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
  const attrs=[...body.matchAll(/\b(?:title|aria-label|alt|placeholder|data-tip)="([^"]*)"/gi)].map(m=>m[1]);
  const text=body.replace(/<[^>]+>/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);
  const bad=[];
  for(const t of text.concat(attrs)){const h=hits(t);if(h.length)bad.push(h.join(', ')+' in "'+t.slice(0,90)+'"');}
  for(const js of inline)for(const s of strings(js)){const h=hits(s.text);if(h.length)bad.push('inline script: '+h.join(', ')+' in "'+s.text.slice(0,90)+'"');}
  check('scanned '+text.length+' text runs and '+attrs.length+' attributes',text.length>100&&attrs.length>20,{text:text.length,attrs:attrs.length});
  check('no banned name on the page',!bad.length,bad.join('\n       '));
  check('the login badge and play button name Hearthmere',/<small>HEARTHMERE<\/small>/.test(html)&&/>ENTER HEARTHMERE</.test(html));
}

/* ---- 7. JSON display fields (server maps, assets) ---- */
console.log('7. server/data and assets JSON display fields:');
{
  const bad=[];let fields=0;
  for(const f of tracked('server/data/*.json','server/data/**/*.json','assets/*.json','assets/**/*.json')){
    const p=path.join(ROOT,f);if(!fs.existsSync(p))continue;const raw=fs.readFileSync(p,'utf8');
    for(const m of raw.matchAll(/"(name|label|title|text|examine|tooltip|displayName|message|banner)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)){
      fields++;const h=hits(m[2]);if(h.length)bad.push(f+': '+m[1]+' '+h.join(', ')+' in "'+m[2].slice(0,90)+'"');}
  }
  check('scanned '+fields+' display fields',fields>1000,fields);
  check('no banned name in a JSON display field',!bad.length,bad.join('\n       '));
  const maps=tracked('server/data/maps/*.json').map(f=>JSON.parse(read(f)));
  const named=maps.flatMap(m=>((m.areas&&m.areas.named)||[]).map(a=>a.name));
  check('the online maps call the safe start Hearthmere (area ids and rects unchanged)',named.includes('Hearthmere'),named);
}

console.log(failures?'\nNAMING BIBLE GUARD: '+failures+' check(s) FAILED':'\nNAMING BIBLE GUARD: clean');
process.exit(failures?1:0);
