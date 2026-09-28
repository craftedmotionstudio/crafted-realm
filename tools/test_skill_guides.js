#!/usr/bin/env node
/* ============================================================================
   Crafted Realm -- the skill-guide contract (src/skill_guide_data.js, src/ui_skill_guide.js, src/ui_book_tips.js).

   The guides are built from the game's own tables; this test re-reads those tables in a separate sandbox and fails when
   a guide and the data part ways:
     1. every one of the 19 skills (the 15 in SKILLS + the 4 of W4) has a guide with rows, and the W4 four are all planned;
     2. every row names only items that exist in ITEMS, with a level that is 1..99 (a combined gate may read 130);
     3. every live row's level agrees with the table and field it came from (its `proofs`), and rows the code does not
        gate (bread, firemaking, arrows) are still ungated in the code;
     4. nothing in the tables is missing from its guide: every Attack / Defence / Ranged / Magic / Prayer item, spell,
        prayer, smelt, anvil item, fletch, pocket, stall, rock, food, cooked fish, brew and tool;
     5. the planned-content table stays honest: each row cites the plan, only names items that exist, never repeats a
        live unlock of the same skill, and a planned anvil tier has no live anvil yet;
     6. the checker itself works: a copy of the data with one level moved, or one new anvil item, is caught;
     7. the prayer and spell lines come from the rules (Oak Hide: 5% Defence, 12 s a point at no bonus, the drain
        formula matches the 2004 drain timer run tick by tick) and every prayer and spell has one;
     8. every picture a row uses exists on disk; every item a row names has a real picture (a Blender render or a painted
        sprite: the icon gap report must stay empty, a gap is never faked with a drawn glyph); all 19 skills have their
        stat sprite;
     9. no RuneScape rune or metal name reaches the rendered text.
   Run: node tools/test_skill_guides.js      Exit code 0 = pass, 1 = a failure (each printed).
   ========================================================================== */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let pass=0,fail=0;
function ok(c,m,d){if(c)pass++;else{fail++;console.log('  FAIL '+m+(d!==undefined?'\n       '+(typeof d==='string'?d:JSON.stringify(d).slice(0,600)):''))}}

/* ---------------------------------------------------------------- the game's data, loaded as the browser loads it */
function loadGame(){
  const sb={Math,console:{log(){},warn(){},error(){}},JSON,Set,Map,Array,Object,WORLD:{},setInterval:()=>0,clearInterval:()=>{}};
  sb.globalThis=sb;vm.createContext(sb);
  const ev=(f,cap)=>vm.runInContext(read(f)+'\n;'+(cap||''),sb,{filename:f});
  ev('src/game0_icons.js','globalThis.__I={HOLM_ITEM_ICONS,_gearSprite};');
  ev('src/game1_data.js','globalThis.__D={ITEMS,TIERS,SKILLS,GATHER_RATES,NPC_TYPES,ZONES,TICK};');
  ev('src/magic_spells.js','globalThis.__S=SPELLS;');
  ev('src/combat_math.js');
  ev('src/game3_systems.js','globalThis.__X={SMELTS,SMITHABLES,FLETCHABLES,PICKPOCKETS,STALL_KINDS,PRAYERS,COOK_FISH};');
  ev('src/smith_bronze_dagger.js');   // the browser adds the bronze dagger to ITEMS and the bronze anvil at load
  // ROCK_KINDS lives in the world builder (three.js at top level): read just its literal
  const m=/const ROCK_KINDS = (\{[\s\S]*?\n\});/.exec(read('src/game2_world.js'));
  const ROCK_KINDS=m?vm.runInNewContext('('+m[1]+')'):null;
  const I=sb.__I;
  return Object.assign({},sb.__D,sb.__X,{SPELLS:sb.__S,ROCK_KINDS,
    COMBAT:require(path.join(ROOT,'shared/combat.js')),DRINKS:require(path.join(ROOT,'shared/drinks.js')),
    FISHING:JSON.parse(read('docs/rebuild/holm-overhaul/island-fishing.json')).rules,
    iconPath:id=>I.HOLM_ITEM_ICONS.has(id)?'assets/icons/items/'+id+'.png':I._gearSprite(id)?'assets/icons/gear/'+id+'.png':null});
}
const SGD=require(path.join(ROOT,'src/skill_guide_data.js'));
const G=loadGame();
const guides=SGD.build(G);
const allRows=g=>[].concat.apply([],Object.keys(g).map(s=>[].concat.apply([],g[s].tabs.map(t=>t.rows))));
const rows=allRows(guides);
const liveRows=rows.filter(r=>!r.planned),plannedRows=rows.filter(r=>r.planned);
const inGuide=(skill,id)=>rows.some(r=>r.skill===skill&&r.items.indexOf(id)>=0);

/* ---- 1. nineteen guides */
console.log('1. every skill has a guide');
{
  ok(SGD.ALL_SKILLS.length===19,'the 2004 set of 19 skills',SGD.ALL_SKILLS);
  const want=G.SKILLS.concat(SGD.PLANNED_SKILLS);
  ok(want.length===19&&want.every(s=>SGD.ALL_SKILLS.indexOf(s)>=0),'SKILLS plus the four W4 skills make the 19',want);
  SGD.ALL_SKILLS.forEach(s=>{const g=guides[s];ok(g&&g.tabs.length&&g.count>0,s+' has a guide with rows')});
  SGD.PLANNED_SKILLS.forEach(s=>{
    ok(G.SKILLS.indexOf(s)<0,s+' is not live yet (when it joins SKILLS, build its guide from its data and drop it from PLANNED_SKILLS)');
    ok(guides[s].count===guides[s].plannedCount,s+': every row is planned');
  });
  G.SKILLS.forEach(s=>ok(guides[s].live,s+' is marked live'));
}

/* ---- 2. rows name real items at sane levels */
console.log('2. rows name real items at sane levels');
{
  const bad=rows.filter(r=>r.items.some(id=>!Object.prototype.hasOwnProperty.call(G.ITEMS,id)));
  ok(!bad.length,'every item id a row names exists in ITEMS',bad.map(r=>r.skill+'/'+r.name+': '+r.items.join(',')));
  const lv=rows.filter(r=>!(r.level===null||(Number.isInteger(r.level)&&r.level>=1&&(r.level<=99||(r.req[0]&&r.req[0].total===r.level)))));
  ok(!lv.length,'every level is 1..99 (or a combined gate)',lv.map(r=>r.skill+'/'+r.name+': '+r.level));
  ok(rows.every(r=>typeof r.name==='string'&&r.name.trim()),'every row has a name');
  ok(rows.filter(r=>r.level===null).every(r=>r.skill==='Hitpoints'),'only Hitpoints food rows go without a level');
  // the tabs a guide shows are its own category list (Smithing adds one per metal tier)
  SGD.ALL_SKILLS.forEach(s=>{const allowed=(SGD.TABS[s]||[]).concat(s==='Smithing'?G.TIERS.map(t=>t.label):[]);
    const odd=guides[s].tabs.filter(t=>allowed.indexOf(t.id)<0).map(t=>t.id);ok(!odd.length,s+': tabs are from its category list',odd)});
}

/* ---- 3. every live level agrees with the data it came from */
function fieldOf(D,p){
  const T=p.table;
  if(T==='ITEMS')return D.ITEMS[p.id]?D.ITEMS[p.id][p.field]:Symbol.for('missing');
  if(T==='SPELLS')return D.SPELLS[p.id]?D.SPELLS[p.id][p.field]:Symbol.for('missing');
  if(T==='PRAYERS')return D.PRAYERS[p.id]?D.PRAYERS[p.id][p.field]:Symbol.for('missing');
  if(T==='RULES')return D.COMBAT.PRAYERS[p.id]?D.COMBAT.PRAYERS[p.id][p.field]:Symbol.for('missing');
  if(T==='SMELTS')return D.SMELTS[p.id]?D.SMELTS[p.id][p.field]:Symbol.for('missing');
  if(T==='SMITHABLES'){const e=(D.SMITHABLES[p.group]||[]).find(x=>x.id===p.id);return e?e[p.field]:Symbol.for('missing')}
  if(T==='FLETCHABLES'){const e=D.FLETCHABLES.find(x=>x.id===p.id);return e?e[p.field]:Symbol.for('missing')}
  if(T==='PICKPOCKETS')return D.PICKPOCKETS[p.id]?D.PICKPOCKETS[p.id][p.field]:Symbol.for('missing');
  if(T==='STALL_KINDS')return D.STALL_KINDS[p.id]?D.STALL_KINDS[p.id][p.field]:Symbol.for('missing');
  if(T==='ROCK_KINDS')return D.ROCK_KINDS[p.id]?D.ROCK_KINDS[p.id][p.field]:Symbol.for('missing');
  if(T==='GATHER_RATES')return D.GATHER_RATES[p.id]?D.GATHER_RATES[p.id][p.field]:Symbol.for('missing');
  if(T==='COOK_FISH'){const e=D.COOK_FISH.find(x=>x.raw===p.id);return e?e[p.field]:Symbol.for('missing')}
  if(T==='BREWS')return D.DRINKS.BREWS[p.id]?D.DRINKS.BREWS[p.id][p.field]:Symbol.for('missing');
  if(T==='FISHING'){
    if(p.id==='big')return D.FISHING.big?D.FISHING.big[p.field]:Symbol.for('missing');
    const [k,item]=p.id.split(':');
    const e=k==='rare'?(D.FISHING.rare||[]).find(q=>q.item===item):k==='junk'?((D.FISHING.junk&&D.FISHING.junk.items)||[]).find(j=>j[0]===item):null;
    return e?(Array.isArray(e)?undefined:e[p.field]):Symbol.for('missing');
  }
  return Symbol.for('unknown table '+T);
}
function fnBody(src,name){const i=src.indexOf('function '+name+'(');if(i<0)return null;let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(j,k+1)}}return null}
/* all the ways a row can disagree with its data; [] = in step */
function drift(D,list){
  const out=[];
  list.forEach(r=>{
    if(!r.proofs.length){out.push(r.skill+'/'+r.name+': no proof of where its level came from');return}
    r.proofs.forEach(p=>{
      if(p.code){const src=read(p.code),body=p.fn?fnBody(src,p.fn):src;
        if(body==null){out.push(r.skill+'/'+r.name+': '+p.code+' has no function '+p.fn);return}
        if(new RegExp("lvl\\(\\s*'"+p.noLevel+"'\\s*\\)").test(body))out.push(r.skill+'/'+r.name+': '+p.code+(p.fn?' '+p.fn:'')+' now checks a '+p.noLevel+' level; read it into the guide');
        return}
      const v=fieldOf(D,p);
      if(typeof v==='symbol'){out.push(r.skill+'/'+r.name+': '+p.table+' has no '+(p.group?p.group+'/':'')+p.id);return}
      const want=p.value==null?undefined:p.value,got=v==null?undefined:v;
      if(got!==want)out.push(r.skill+'/'+r.name+': '+p.table+'.'+(p.group?p.group+'.':'')+p.id+'.'+p.field+' is '+JSON.stringify(got)+', the guide says '+JSON.stringify(want));
      if(!p.fact&&r.level!==null){const lv=got==null?1:got;if(lv!==r.level)out.push(r.skill+'/'+r.name+': shows level '+r.level+' but '+p.table+' gives '+lv)}
      if(p.table==='ITEMS'&&p.skill&&D.ITEMS[p.id]&&D.ITEMS[p.id].reqSkill&&D.ITEMS[p.id].reqSkill!==p.skill)
        out.push(r.skill+'/'+r.name+': '+p.id+' is gated by '+D.ITEMS[p.id].reqSkill+', not '+p.skill);
    });
  });
  return out;
}
console.log('3. every live level agrees with its table');
{
  const D=loadGame();   // a second, independent load of the same files
  const d=drift(D,liveRows);
  ok(!d.length,'no live row disagrees with its data ('+liveRows.length+' live rows, '+liveRows.reduce((a,r)=>a+r.proofs.length,0)+' proofs)',d.slice(0,12).join('\n       '));
  ok(liveRows.every(r=>r.req.length===0||r.req[0].skill===r.skill||r.req[0].skills),'each live row is first gated by its own skill');
}

/* ---- 4. nothing in the tables is missing from its guide */
console.log('4. every table entry is in its guide');
{
  const miss=[];
  Object.keys(G.ITEMS).forEach(id=>{const it=G.ITEMS[id];
    if(it.equip&&['Attack','Defence','Ranged','Magic','Prayer'].indexOf(it.reqSkill)>=0&&!inGuide(it.reqSkill,id))miss.push(it.reqSkill+': '+id);
    if(typeof it.heal==='number'&&it.heal>0&&!inGuide('Hitpoints',id))miss.push('Hitpoints: '+id);
    if(it.tool==='woodcutting'&&!inGuide('Woodcutting',id))miss.push('Woodcutting: '+id);
    if(it.tool==='mining'&&!inGuide('Mining',id))miss.push('Mining: '+id);
    if(it.tool==='fishing'&&!inGuide('Fishing',id))miss.push('Fishing: '+id);});
  Object.keys(G.SPELLS).forEach(id=>{if(!rows.some(r=>r.skill==='Magic'&&r.spell===id))miss.push('Magic: spell '+id)});
  Object.keys(G.PRAYERS).forEach(id=>{if(!rows.some(r=>r.skill==='Prayer'&&r.prayer===id))miss.push('Prayer: '+id)});
  Object.keys(G.SMELTS).forEach(id=>{if(!liveRows.some(r=>r.skill==='Smithing'&&r.tab==='Smelting'&&r.items[0]===id))miss.push('Smithing: smelt '+id)});
  Object.keys(G.SMITHABLES).forEach(b=>G.SMITHABLES[b].forEach(e=>{if(!liveRows.some(r=>r.skill==='Smithing'&&r.items[0]===e.id&&r.level===e.req))miss.push('Smithing: '+b+' '+e.id)}));
  G.FLETCHABLES.forEach(f=>{if(!liveRows.some(r=>r.skill==='Fletching'&&r.items[0]===f.id))miss.push('Fletching: '+f.id)});
  Object.keys(G.PICKPOCKETS).forEach(k=>{if(!liveRows.some(r=>r.skill==='Thieving'&&r.tab==='Pickpocketing'&&r.proofs.some(p=>p.id===k)))miss.push('Thieving: pocket '+k)});
  Object.keys(G.STALL_KINDS).forEach(k=>{if(!liveRows.some(r=>r.skill==='Thieving'&&r.tab==='Stalls'&&r.proofs.some(p=>p.id===k)))miss.push('Thieving: stall '+k)});
  Object.keys(G.ROCK_KINDS).forEach(k=>{if(!liveRows.some(r=>r.skill==='Mining'&&r.proofs.some(p=>p.table==='ROCK_KINDS'&&p.id===k)))miss.push('Mining: rock '+k)});
  G.COOK_FISH.forEach(f=>{if(!liveRows.some(r=>r.skill==='Cooking'&&r.items[0]===f.done))miss.push('Cooking: '+f.done)});
  Object.keys(G.DRINKS.BREWS).forEach(k=>{const b=G.DRINKS.BREWS[k];if(b.skill==='Cooking'&&!liveRows.some(r=>r.skill==='Cooking'&&r.proofs.some(p=>p.table==='BREWS'&&p.id===k)))miss.push('Cooking: brew '+k)});
  ['tree','fish'].forEach(k=>{const it=G.GATHER_RATES[k].item,s=k==='tree'?'Woodcutting':'Fishing';if(!liveRows.some(r=>r.skill===s&&r.items[0]===it))miss.push(s+': '+it)});
  [G.FISHING.big.item].concat(G.FISHING.rare.map(q=>q.item),G.FISHING.junk.items.map(j=>j[0])).forEach(id=>{if(!inGuide('Fishing',id))miss.push('Fishing: '+id)});
  ok(!miss.length,'no table entry is missing from its guide',miss.slice(0,20));
  ok(!!G.ROCK_KINDS&&Object.keys(G.ROCK_KINDS).length>=5,'ROCK_KINDS was read from the world builder');
  ok(inGuide('Attack','bronze_dagger'),'the bronze dagger (added at load by smith_bronze_dagger.js) is in the Attack guide');
}

/* ---- 5. the planned-content table stays honest */
console.log('5. the planned-content table');
{
  ok(SGD.PLANNED.every(p=>typeof p.plan==='string'&&p.plan.trim()),'every planned row cites the plan');
  ok(SGD.PLANNED.every(p=>SGD.ALL_SKILLS.indexOf(p.skill)>=0),'every planned row belongs to one of the 19 skills');
  const noItem=SGD.PLANNED.filter(p=>p.item&&!G.ITEMS[p.item]);
  ok(!noItem.length,'a planned row only names items that exist (new things are name-only)',noItem.map(p=>p.skill+'/'+p.item));
  const dupItem=plannedRows.filter(r=>r.items.some(id=>liveRows.some(l=>l.skill===r.skill&&l.items.indexOf(id)>=0)));
  ok(!dupItem.length,'no planned row repeats a live unlock of the same skill (item)',dupItem.map(r=>r.skill+'/'+r.name));
  const lc=s=>String(s).toLowerCase();
  const dupName=plannedRows.filter(r=>liveRows.some(l=>l.skill===r.skill&&lc(l.name)===lc(r.name)));
  ok(!dupName.length,'no planned row repeats a live unlock of the same skill (name)',dupName.map(r=>r.skill+'/'+r.name));
  SGD.PLANNED.filter(p=>p.expand==='anvil').forEach(p=>{
    ok(G.TIERS.some(t=>t.key===p.tier),'planned anvil tier '+p.tier+' is a metal tier');
    ok(!G.SMITHABLES[p.tier+'_bar'],'planned anvil tier '+p.tier+' has no live anvil yet (else build it from SMITHABLES)');
  });
  ok(SGD.anvilShape(G).length>=4,'the planned anvils copy the live steel anvil\'s steps',SGD.anvilShape(G));
  ok(plannedRows.every(r=>r.planned&&r.plan),'planned rows carry their mark and citation');
  const spells=Object.keys(G.SPELLS).map(k=>lc(G.SPELLS[k].name));
  const clash=plannedRows.filter(r=>r.skill==='Magic'&&spells.indexOf(lc(r.name))>=0);
  ok(!clash.length,'no planned spell shares a live spell\'s name',clash.map(r=>r.name));
}

/* ---- 6. the checker catches drift */
console.log('6. the checker catches drift');
{
  const D=loadGame();D.ITEMS.iron_sword.reqLvl=6;D.SMITHABLES.steel_bar[1].req=33;D.SPELLS.wind_bolt.req=18;D.COMBAT=Object.assign({},D.COMBAT,{PRAYERS:Object.assign({},D.COMBAT.PRAYERS,{rock_skin:Object.assign({},D.COMBAT.PRAYERS.rock_skin,{level:11})})});
  const d=drift(D,liveRows);
  ok(d.some(x=>/iron_sword\.reqLvl is 6/.test(x)),'a moved weapon level is caught',d);
  ok(d.some(x=>/steel_bar\.steel_helm\.req is 33/.test(x)),'a moved anvil level is caught');
  ok(d.some(x=>/wind_bolt\.req is 18/.test(x)),'a moved spell level is caught');
  ok(d.some(x=>/rock_skin\.level is 11/.test(x)),'a prayer whose rule level parts from its book level is caught');
  const D2=loadGame();D2.SMITHABLES.steel_bar.push({id:'steel_greatsword',name:'Steel greatsword',req:44,bars:3});
  const g2=allRows(SGD.build(D2)).filter(r=>!r.planned);
  ok(g2.some(r=>r.skill==='Smithing'&&r.items[0]==='steel_greatsword'&&r.level===44),'a new anvil item appears in the guide by itself');
  const D3=loadGame();D3.ITEMS.test_blade={name:'Test blade',equip:'weapon',style:'melee',reqSkill:'Attack',reqLvl:7,speedTicks:4};
  ok(allRows(SGD.build(D3)).some(r=>r.skill==='Attack'&&r.items.indexOf('test_blade')>=0&&r.level===7),'a new weapon appears in the Attack guide at its level');
}

/* ---- 7. prayer and spell lines */
console.log('7. prayer and spell lines come from the rules');
{
  ok(SGD.prayerLine(G,'thick_skin')==='Raises your Defence by 5%.','Oak Hide: "Raises your Defence by 5%."',SGD.prayerLine(G,'thick_skin'));
  ok(SGD.prayerLine(G,'ultimate_str')==='Raises your Strength by 15%.','Lion\'s Heart: 15% Strength');
  ok(/40% less/.test(SGD.prayerLine(G,'protect_melee'))&&/blades/.test(SGD.prayerLine(G,'protect_melee')),'Ward against Blades: stops monsters, 40% off players (pvpProtectedMaxHit)',SGD.prayerLine(G,'protect_melee'));
  ok(/one more item/.test(SGD.prayerLine(G,'protect_item')),'Keepsake Ward: one more item kept');
  Object.keys(G.PRAYERS).forEach(id=>ok(SGD.prayerLine(G,id).length>8,'prayer '+id+' has a line'));
  ok(Math.abs(SGD.prayerDrainSeconds(G,'thick_skin',0)-12)<1e-9,'Oak Hide drains a point every 12 s with no prayer bonus',SGD.prayerDrainSeconds(G,'thick_skin',0));
  ok(Math.abs(SGD.prayerDrainSeconds(G,'protect_magic',0)-3)<1e-9,'a ward drains a point every 3 s');
  // the formula against the 2004 drain timer, run for 20 minutes of ticks at several bonuses
  const C=G.COMBAT;
  [0,8,15].forEach(bonus=>['thick_skin','protect_item','rock_skin','protect_melee'].forEach(id=>{
    const eff=C.PRAYERS[id].drain,res=C.prayerDrainResistance(bonus);let c=0,pts=0;const ticks=2000;
    for(let t=C.PRAYER_DRAIN_INTERVAL;t<=ticks;t+=C.PRAYER_DRAIN_INTERVAL){const r=C.prayerDrainTick(c,eff,res);c=r.counter;pts+=r.drained}
    const sim=ticks*G.TICK/pts,f=SGD.prayerDrainSeconds(G,id,bonus);
    ok(Math.abs(sim-f)/f<0.03,'drain '+id+' at bonus '+bonus+': '+f.toFixed(2)+' s by formula, '+sim.toFixed(2)+' s by the timer');
  }));
  Object.keys(G.SPELLS).forEach(id=>ok(SGD.spellLine(G,id).length>8,'spell '+id+' has a line'));
  ok(SGD.spellLine(G,'wind_strike')==='Hits for up to 2.','Gale Dart hits for up to its max (2)');
  ok(SGD.spellLine(G,'confuse')==='Lowers a foe\'s Attack by 5%.','Befuddle: 5% Attack');
  ok(/Stonereach/.test(SGD.spellLine(G,'tele_quarry')),'a teleport names its place (ZONES)');
  ok(/40%/.test(SGD.spellLine(G,'low_alch')),'Lesser Transmute: 40% of value');
  ok(SGD.spellRunes(G,'wind_strike')==='Runes: 1 Gale, 1 Wit','runes read by their names (Gale, Wit)',SGD.spellRunes(G,'wind_strike'));
  ok(SGD.spellRunes(G,'home_tele')==='No runes','Hearthmere Teleport needs no runes');
  ok(rows.filter(r=>r.skill==='Prayer'&&r.prayer).every(r=>r.sub===SGD.prayerLine(G,r.prayer)),'the Prayer guide and the prayer tip say the same thing');
}

/* ---- 8. pictures */
console.log('8. pictures');
{
  const missing=[],gaps=new Set(),sprites=new Set();
  rows.forEach(r=>{if(!r.icon)return;
    if(r.icon.item){const p=G.iconPath(r.icon.item);if(p){if(!fs.existsSync(path.join(ROOT,p)))missing.push(p)}else gaps.add(r.icon.item)}
    if(r.icon.sprite){const p='assets/icons/ui/v3/'+r.icon.sprite+'.png';sprites.add(p);if(!fs.existsSync(path.join(ROOT,p)))missing.push(p)}});
  ok(!missing.length,'every picture a row uses exists on disk ('+sprites.size+' sprites)',missing);
  // all 19 skills, the four W4 skills too (their guides and the "Coming later" line show it), at 24 and 18 px
  SGD.ALL_SKILLS.forEach(s=>ok(['skills','skills18'].every(d=>fs.existsSync(path.join(ROOT,'assets/icons/ui/v3/'+d+'/'+s.toLowerCase()+'.png'))),s+' has its stat sprite (24 and 18 px)'));
  // rows whose item has no picture yet, and rows with nothing to show (name-only planned rows)
  const noIcon=rows.filter(r=>!r.icon).map(r=>r.skill+'/'+r.name);
  const live=[...gaps].filter(id=>liveRows.some(r=>r.icon&&r.icon.item===id));
  console.log('     icon gaps (live rows whose item has no Blender render or painted sprite): '+live.length+'\n       '+live.join(', '));
  const plan=[...gaps].filter(id=>live.indexOf(id)<0);
  console.log('     icon gaps (planned rows naming an existing item without a picture): '+plan.length+'\n       '+plan.join(', '));
  console.log('     planned rows with no picture (the thing does not exist yet): '+noIcon.length);
  console.log('     stat sprites missing for the W4 skills: '+(SGD.PLANNED_SKILLS.filter(s=>!fs.existsSync(path.join(ROOT,'assets/icons/ui/v3/skills/'+s.toLowerCase()+'.png'))).join(', ')||'none'));
  // owner rule: every icon is an image or a Blender render. Every item a row names has one (world item icons v1,
  // tools/blender/build_world_item_icons_v1.py closed the last 94); a new item needs its picture before it joins a guide.
  ok(!gaps.size,'every item a guide row names has a picture (Blender render or painted sprite)',[...gaps]);
  // every item a row lists (not only the one its picture shows: a tier row's sword, platebody, platelegs...) has one too
  const unpictured=[...new Set([].concat.apply([],rows.map(r=>r.items)))].filter(id=>!G.iconPath(id));
  ok(!unpictured.length,'every item any row lists has a picture (the inventory, bank and shops show them all)',unpictured);
  ok(typeof SGD.imagePath==='function'&&SGD.imagePath('bronze_sword')===null,'outside the browser the resolver finds no picture tables (it never draws one)');
  ok(!/toDataURL|getContext\(/.test(read('src/skill_guide_data.js')+read('src/ui_skill_guide.js')+read('src/ui_book_tips.js')),'the guide and the tips never draw an icon');
}

/* ---- 9. names */
console.log('9. no RuneScape rune or metal names in the text');
{
  const RX=[/\b(?:air|water|earth|fire|mind|body|chaos|nature|law|death|cosmic|blood|soul|astral) runes?\b/i,/\b(?:Mithril|Adamant|Adamantite|Runite|Rune essence|Pure essence)\b/,
    /\b(?:rune|dragon) (?:platebody|platelegs|scimitar|longsword|sword|kiteshield|pickaxe|axe|battleaxe|dagger|mace|warhammer)\b/i,/\bWilderness\b/,
    /\b(?:Wind|Water|Earth|Fire) (?:Strike|Bolt|Blast|Wave)\b/,/\b(?:Thick Skin|Rock Skin|Steel Skin|Protect Item|Protect from)\b/];
  const text=rows.map(r=>[r.name,r.sub,r.tab].join(' | '));
  const hits=text.filter(t=>RX.some(re=>re.test(t)));
  ok(!hits.length,'the rendered rows are clean',hits);
  const tips=Object.keys(G.PRAYERS).map(id=>SGD.prayerLine(G,id)).concat(Object.keys(G.SPELLS).map(id=>SGD.spellLine(G,id)+' '+SGD.spellRunes(G,id)));
  ok(!tips.filter(t=>RX.some(re=>re.test(t))).length,'the tips are clean');
}

console.log('\n'+Object.keys(guides).map(s=>s+' '+guides[s].count+(guides[s].plannedCount?' ('+guides[s].plannedCount+' planned)':'')).join(', '));
console.log('\n[SKILL GUIDES] '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
