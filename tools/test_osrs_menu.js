/* Headless contract for the old-school right-click menu (owner 2026-09-26: "The right click functionality doesn't really
 * work like OSRS"). The real menu model (src/osrs_menu.js), world providers (src/osrs_menu_world.js) and slot menus
 * (src/osrs_menu_items.js) run in a VM with small stand-ins for the game:
 *  1. order: the top entity's primary first, its other options, the next entity's rows, tile rows, Walk here, one Examine
 *     per entity in the same order, Cancel last; one row per option; hooks (menu swaps) reorder after sorting;
 *  2. colours: verb white, NPC yellow, object cyan, item orange, player white; "(level-N)" coloured by the level
 *     difference exactly as the old client (green lower, yellow equal, red higher); the top-left line and its count;
 *  3. every Tutor's Holm kind has its OSRS rows and our own Examine (tutor, service, door, chart, provision rack, hatch,
 *     cellar ladder, stairs, statue, gate, signpost), lesson objects (Chop down / Net / Mine / Cook / Smelt / Smith),
 *     ground items (Take / Examine), NPCs (Attack <name> (level-N), Talk-to), and the Interact registry (primary first);
 *  4. use-mode: "Use <item> -> <target>" per entity, no Examine, Cancel puts the item away; which targets take which items;
 *  5. pack rows by type (Wield/Wear, Eat/Drink, Bury, Knead, then Use, Drop, Examine), Wield only for equippable items
 *     and only through UI.useItem; bank Withdraw/Deposit-1/5/10/All/X, shop Value/Buy/Sell; "Enter amount" parsing;
 *     item-on-item (tinderbox on logs lights a fire, anything unknown: "Nothing interesting happens.");
 *  6. every island service carries a menu option, name and examine line, every tutor an examine line.
 * Run: node tools/test_osrs_menu.js */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const src=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m)}};
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+'\n     got  '+JSON.stringify(a)+'\n     want '+JSON.stringify(b));

/* ---------- a small game for the VM ---------- */
function world(){
 const chats=[],calls=[];
 const ctx={console,Math,JSON,Date,setTimeout,clearTimeout,chats,calls};
 ctx.window=ctx;
 ctx.ITEMS={hatchet:{name:'Bronze hatchet',equip:'weapon',tool:'woodcutting'},bread:{name:'Bread',heal:4,examine:'Squashy but filling.'},hollow_ale:{name:'Hollow ale',heal:5},
  bones:{name:'Bones',bury:true},logs:{name:'Emberwood logs'},tinderbox:{name:'Tinderbox',tool:true},fishing_net:{name:'Small net',tool:'fishing',useOn:'fish'},
  dough:{name:'Dough'},bucket_flour:{name:'Bucket of flour'},bucket_water:{name:'Bucket of water'},bread_dough:{name:'Bread dough'},coins:{name:'Crowns',stack:true},
  leather_body:{name:'Leather body',equip:'body'},raw_perch:{name:'Raw mirrorperch'},copper_ore:{name:'Copper ore'},bronze_bar:{name:'Bronze bar'},knife:{name:'Knife',tool:true}};
 ctx.Player={usingItem:null,inv:[],bank:[],equip:{weapon:null},plane:0,alchMode:null,combatLevel:()=>3,count(id){return this.inv.reduce((a,s)=>a+(s&&s.id===id?s.qty:0),0)}};
 ctx.UI={chat:(t)=>chats.push(t),refreshInv(){},action(){},useItem:(i)=>calls.push(['useItem',i]),refreshEquip(){},
  bankWithdraw:(i,n)=>calls.push(['withdraw',i,n]),bankDeposit:(i,n)=>calls.push(['deposit',i,n]),shopValue:id=>calls.push(['value',id]),shopBuy:(id,n)=>calls.push(['buy',id,n]),
  shopSell:(i,n)=>calls.push(['sell',i,n]),shopSellValue:id=>calls.push(['sellvalue',id])};
 ctx.InvMenu={drop:(i)=>calls.push(['drop',i]),examine:(id)=>chats.push('examine '+id)};
 ctx.handleClick=(o,p)=>calls.push(['click',o.name||o.userData.kind]);
 ctx.startFiremaking=(slot)=>{calls.push(['firemaking',slot]);return true};
 ctx.openFletching=(slot)=>{calls.push(['fletch',slot]);return true};
 ctx.isGroundName=n=>n==='ground'||(typeof n==='string'&&n.indexOf('ground-chunk-')===0);
 ctx.PICKPOCKETS={};ctx.tryPickpocket=()=>{};
 ctx.HolmIslandTutors={cast:()=>[{id:'bram',name:'Guide Bram',examine:'The Holm\'s guide.'}]};
 ctx.HolmArrivalQA={doorOpen:id=>id==='garden',islandActive:()=>true};
 ctx.HolmIslandGates={isOpen:id=>id==='bakehouse-door'};
 ctx.WORLD={drops:[]};
 vm.createContext(ctx);
 ['osrs_menu.js','osrs_menu_world.js','osrs_menu_items.js'].forEach(f=>vm.runInContext(src(f),ctx,{filename:f}));
 return ctx;
}
function obj(name,ud,parent){return {name,userData:ud,parent:parent||null,position:{x:1,y:0,z:1}}}
function ent(o,point){const u=o.userData;return {kind:u.kind,obj:o,u,point:point||o.position,key:o}}
const text=(M,rows)=>rows.map(r=>M.rowText(r));

/* ---------- 1: order ---------- */
{
 const w=world(),M=w.OsrsMenu;
 M.registerProvider({id:'t-order',order:1,kinds:['t_npc','t_obj'],describe:e=>e.u.kind==='t_npc'?{name:'Hans',type:'npc',examine:'A man.'}:{name:'Door',type:'object',examine:'A door.'},
  entries:e=>e.u.kind==='t_npc'?[{option:'Pickpocket',priority:10,fn(){}},{option:'Talk-to',priority:100,fn(){}}]:[{option:'Open',priority:100,fn(){}},{option:'Knock-at',priority:5,fn(){}}]});
 M.registerGround({id:'t-ground',entries:()=>[{option:'Mark',target:'Tile',targetType:'object',fn(){}}]});
 const rows=M.build([ent(obj('hans',{kind:'t_npc'})),ent(obj('door',{kind:'t_obj'}))],{walk(){},cancel:null});
 eq(text(M,rows),['Talk-to Hans','Pickpocket Hans','Open Door','Knock-at Door','Mark Tile','Walk here','Examine Hans','Examine Door','Cancel'],'2004 order: entities, tile rows, Walk here, Examines, Cancel');
 ok(M.hoverText(rows)==='Talk-to Hans / 7 more options','the top-left line is the top row plus the other rows but Cancel: '+M.hoverText(rows));
 ok(M.moreCount(rows)===7,'more count');
 M.unregister('t-ground');
 const one=M.build([],{walk(){}});eq(text(M,one),['Walk here','Cancel'],'bare ground: Walk here, Cancel');
 ok(M.hoverText(one)==='Walk here','ground hover has no "more options" (only Cancel besides)');
 eq(text(M,M.build([],{walk:null})),['Cancel'],'no ground under the cursor: Cancel only');
 // duplicates collapse, first registered wins
 M.registerProvider({id:'t-dup',order:2,kinds:['t_obj'],entries:()=>[{option:'Open',priority:1,fn(){}}]});
 const d=M.build([ent(obj('door',{kind:'t_obj'}))],{walk(){}});
 ok(text(M,d).filter(t=>t==='Open Door').length===1,'one row per option per entity');
 // a hook (menu swap) reorders after sorting
 M.registerHook((rows)=>{const i=rows.findIndex(r=>r.option==='Knock-at');if(i>0){const out=rows.slice();out.unshift(out.splice(i,1)[0]);return out}});
 ok(M.rowText(M.build([ent(obj('door',{kind:'t_obj'}))],{walk(){}})[0])==='Knock-at Door','a swap hook moves its row to the top (and so to the left click)');
}

/* ---------- 2: colours ---------- */
{
 const w=world(),M=w.OsrsMenu;
 const table=[[3,3,'#ffff00'],[3,2,'#c0ff00'],[3,0,'#c0ff00'],[10,6,'#80ff00'],[10,3,'#40ff00'],[20,1,'#00ff00'],[3,4,'#ffb000'],[3,8,'#ff7000'],[3,11,'#ff3000'],[3,20,'#ff0000']];
 table.forEach(([me,them,c])=>ok(M.levelColour(me,them)===c,'level colour me '+me+' vs '+them+' -> '+c+' (got '+M.levelColour(me,them)+')'));
 const h=M.rowHtml({option:'Attack',target:'Practice grubkin',targetType:'npc',level:1});
 ok(/class="om-v" style="color:#ffffff">Attack/.test(h),'verb white');
 ok(/om-npc" style="color:#ffff00">Practice grubkin/.test(h),'NPC name yellow');
 ok(/style="color:#c0ff00">\(level-1\)/.test(h),'(level-1) green-yellow for a lower level (player 3)');
 ok(/om-object" style="color:#00ffff">Door/.test(M.rowHtml({option:'Open',target:'Door',targetType:'object'})),'object name cyan');
 ok(/om-item" style="color:#ff9040">Bones/.test(M.rowHtml({option:'Take',target:'Bones',targetType:'item'})),'item name orange');
 ok(/om-player" style="color:#ffffff">Zezima/.test(M.rowHtml({option:'Follow',target:'Zezima',targetType:'player',level:3})),'player name white');
 const u=M.rowHtml({option:'Use',item:'Tinderbox',target:'Emberwood logs',targetType:'item'});
 ok(M.plain(u)==='Use Tinderbox -> Emberwood logs'&&/om-i" style="color:#ff9040">Tinderbox/.test(u),'use row: "Use <item> -> <target>" with the item orange');
 ok(M.rowHtml({html:'Walk <b>here</b>',fn:null})==='Walk <b>here</b>','legacy {html, fn} rows render as given (Ctx.show callers)');
 ok(!/<script/.test(M.rowHtml({option:'Examine',target:'<script>x</script>',targetType:'object'})),'names are escaped');
}

/* ---------- 3: world + Holm providers ---------- */
{
 const w=world(),M=w.OsrsMenu,W=w.OsrsMenuWorld;
 const menu=(o)=>text(M,M.build([ent(o)],{walk(){}}));
 const svc={building:'bakehouse',label:'Cook',call:['HolmTeachingKitchen','cookAtRange'],option:'Cook',name:'Oven',examine:'A brick bread oven.'};
 const cases=[
  [obj('m',{kind:'island_tutor',islandTutor:'bram',label:'Talk-to <b>Guide Bram</b>'}),['Talk-to Guide Bram','Walk here','Examine Guide Bram','Cancel']],
  [obj('m',{kind:'island_service',islandService:svc,label:'Cook'}),['Cook Oven','Walk here','Examine Oven','Cancel']],
  [obj('DoorSouthLeaf',{kind:'arrival_door',arrivalDoor:'arrival'}),['Open Door','Walk here','Examine Door','Cancel']],
  [obj('DoorNorthLeaf',{kind:'arrival_door',arrivalDoor:'garden'}),['Close Door','Walk here','Examine Door','Cancel']],
  [obj('chart',{kind:'arrival_chart',label:'Study relief chart'}),['Study Relief chart','Walk here','Examine Relief chart','Cancel']],
  [obj('rack',{kind:'arrival_provisions',label:'Collect teaching tools'}),['Collect-tools Provision rack','Walk here','Examine Provision rack','Cancel']],
  [obj('CellarHatch',{kind:'arrival_hatch',label:'Climb-down Hatch'}),['Climb-down Trapdoor','Walk here','Examine Trapdoor','Cancel']],
  [obj('CellarLadder',{kind:'arrival_cellar_ladder',label:'Climb-up Ladder'}),['Climb-up Ladder','Walk here','Examine Ladder','Cancel']],
  [obj('stair-mesh',{kind:'arrival_surface',arrivalSurface:'stair'},{name:'StairFlight',userData:{label:'Climb-up Staircase'},parent:null}),['Climb-up Staircase','Walk here','Examine Staircase','Cancel']],
  [obj('stair-mesh',{kind:'arrival_surface',arrivalSurface:'stair'},{name:'StairFlight',userData:{label:'Climb-down Staircase'},parent:null}),['Climb-down Staircase','Walk here','Examine Staircase','Cancel']],
  [obj('statue',{kind:'arrival_statue',label:'Read-plaque <b>Statue</b>'}),['Read-plaque Statue','Walk here','Examine Statue','Cancel']],
  [obj('gate',{kind:'island_gate',islandGate:'lodge-door',label:'Open door'}),['Open Door','Walk here','Examine Door','Cancel']],
  [obj('gate',{kind:'island_gate',islandGate:'bakehouse-door',label:'Door (open)'}),['Walk here','Examine Door','Cancel']],
  [obj('gate',{kind:'island_gate',islandGate:'haven-gate',label:'Open door'}),['Open Gate','Walk here','Examine Gate','Cancel']],
  [obj('sign',{kind:'island_sign',islandSign:'The signpost reads: camp.',label:'Read signpost'}),['Read Signpost','Walk here','Examine Signpost','Cancel']],
  [obj('island-lesson-survival-oak-1',{kind:'resource',rtype:'tree',label:'Chop down Oak',alive:true}),['Chop down Oak','Walk here','Examine Oak','Cancel']],
  [obj('island-lesson-survival-oak-1',{kind:'resource',rtype:'tree',label:'Chop down Oak',alive:false}),['Walk here','Examine Tree stump','Cancel']],
  [obj('island-lesson-survival-perch',{kind:'resource',rtype:'fish',label:'Net Fishing spot',alive:true}),['Net Fishing spot','Walk here','Examine Fishing spot','Cancel']],
  [obj('rock',{kind:'resource',rtype:'rock',label:'Mine Copper rock',alive:true,oreKind:'copper'}),['Mine Copper rock','Walk here','Examine Copper rock','Cancel']],
  [obj('island-campfire',{kind:'fire'}),['Cook Fire','Walk here','Examine Fire','Cancel']],
  [obj('island-lesson-furnace',{kind:'furnace',label:'Use Furnace'}),['Smelt Furnace','Walk here','Examine Furnace','Cancel']],
  [obj('island-lesson-anvil',{kind:'anvil',label:'Use Anvil'}),['Smith Anvil','Walk here','Examine Anvil','Cancel']],
  [obj('drop',{kind:'drop',id:'bones',qty:1,label:'Take <b>Bones</b>'}),['Take Bones','Walk here','Examine Bones','Cancel']],
  [obj('grub',{kind:'npc',npc:{t:{name:'Practice grubkin',level:1,examine:'A tame grubkin.'},typeId:'holm_practice_grubkin'}}),['Attack Practice grubkin (level-1)','Walk here','Examine Practice grubkin (level-1)','Cancel']],
  [obj('olun',{kind:'friendly',name:'Olun'}),['Talk-to Olun','Walk here','Examine Olun','Cancel']]];
 cases.forEach(([o,want])=>eq(menu(o),want,'menu for '+o.userData.kind+' '+(o.userData.label||o.userData.islandGate||o.userData.arrivalDoor||'')));
 // every Holm entity's Examine is our own line, never the generic fallback
 cases.slice(0,15).forEach(([o])=>{const e=M.build([ent(o)],{walk(){}}).find(r=>r.option==='Examine');w.chats.length=0;e.fn();ok(w.chats.length===1&&!/^It's an? /.test(w.chats[0]),'own examine text for '+o.userData.kind+': '+w.chats[0])});
 // the NPC's level colour on the menu row
 const grub=M.build([ent(cases[23][0])],{walk(){}})[0];ok(/style="color:#c0ff00">\(level-1\)/.test(M.rowHtml(grub)),'grubkin (level-1) against combat 3 is green-yellow');
 // a tutor in front of a door: both, tutor first; Walk here after both; Examines in the same order
 eq(text(M,M.build([ent(cases[0][0]),ent(cases[2][0])],{walk(){}})),['Talk-to Guide Bram','Open Door','Walk here','Examine Guide Bram','Examine Door','Cancel'],'a tutor in front of a door gives both');
 // left click = top row: Holm rows run the game's own click on that object
 w.calls.length=0;M.build([ent(cases[4][0])],{walk(){}})[0].fn();eq(w.calls,[['click','chart']],'the chart\'s top row is the game\'s own click on the chart');
 // the Interact registry: every option, primary first (above the kind's own rows), secondaries after them
 w.Interact={optionsFor:()=>[{option:'Inspect',target:'Quest board',primary:false,fn(){}},{option:'Study',target:'Quest board',primary:true,fn(){}}]};
 eq(menu(obj('qb',{kind:'holm_quest_board',label:'Study <b>Quest board</b>'})),['Study Quest board','Inspect Quest board','Walk here','Examine Quest board','Cancel'],'Interact options: primary first, then the rest, then an Examine');
 delete w.Interact;
 // labels split into verb + name
 eq([W.splitLabel('Chop down <b>Emberwood</b> tree'),W.splitLabel('Mine Copper rock'),W.splitLabel('Pray at <b>Altar</b>')],
  [{option:'Chop down',name:'Emberwood tree'},{option:'Mine',name:'Copper rock'},{option:'Pray at',name:'Altar'}],'authored labels split into verb and name');
 // the player hook: another layer's provider adds player rows (online agent: Follow, Trade with, Attack, Report)
 M.registerProvider({id:'t-players',kinds:['player'],describe:e=>({name:e.u.player.name,type:'player',level:e.u.player.level,examine:false}),
  entries:e=>[{option:'Follow',priority:90,fn(){}},{option:'Trade with',priority:80,fn(){}},{option:'Report',priority:10,fn(){}}]});
 eq(menu(obj('pl',{kind:'player',player:{name:'Zezima',level:3}})),['Follow Zezima (level-3)','Trade with Zezima (level-3)','Report Zezima (level-3)','Walk here','Cancel'],'player rows through the provider hook (no Examine on players)');
}

/* ---------- 4: use-mode ---------- */
{
 const w=world(),M=w.OsrsMenu,W=w.OsrsMenuWorld;
 w.Player.usingItem='fishing_net';
 const fish=ent(obj('island-lesson-survival-perch',{kind:'resource',rtype:'fish',label:'Net Fishing spot',alive:true}));
 const tutor=ent(obj('m',{kind:'island_tutor',islandTutor:'bram'}));
 const useRows=(e)=>M.build([e],{walk(){},use:M.using(),useEntries:(en,d)=>[{option:'Use',item:M.itemName(M.using()),target:d.name,targetType:d.type,fn(){}}],cancel(){M.endUse()}});
 eq(text(M,useRows(fish)),['Use Small net -> Fishing spot','Walk here','Cancel'],'use-mode: one Use row per entity, no Examine');
 ok(M.hoverText(useRows(fish))==='Use Small net -> Fishing spot / 1 more option','use-mode top-left line');
 ok(W.accepts(fish,'fishing_net'),'the net goes on the fishing spot');
 ok(!W.accepts(tutor,'fishing_net'),'the net does not go on a tutor');
 ok(!W.accepts(fish,'tinderbox'),'the tinderbox does not go on the fishing spot');
 const oven=ent(obj('m',{kind:'island_service',islandService:{call:['HolmTeachingKitchen','cookAtRange'],label:'Cook'}}));
 ok(W.accepts(oven,'bread_dough')&&W.accepts(oven,'raw_perch')&&!W.accepts(oven,'logs'),'bread dough and raw fish go in the oven, logs do not');
 ok(W.accepts(ent(obj('f',{kind:'fire'})),'raw_perch'),'raw fish on a fire');
 ok(W.accepts(ent(obj('f',{kind:'furnace'})),'copper_ore')&&W.accepts(ent(obj('a',{kind:'anvil'})),'bronze_bar'),'ore on the furnace, a bar on the anvil');
 ok(W.accepts(ent(obj('t',{kind:'resource',rtype:'tree',alive:true})),'hatchet'),'a hatchet on a tree');
 const c=useRows(fish);c[c.length-1].fn();ok(w.Player.usingItem===null,'Cancel puts the item away');
}

/* ---------- 5: slot menus ---------- */
{
 const w=world(),M=w.OsrsMenu,I=w.OsrsMenuItems;
 const inv=w.Player.inv=[{id:'hatchet',qty:1},{id:'bread',qty:1},{id:'bones',qty:1},{id:'logs',qty:1},{id:'dough',qty:1},{id:'hollow_ale',qty:1},{id:'leather_body',qty:1},{id:'tinderbox',qty:1},{id:'coins',qty:25}];
 const pack=(i)=>text(M,I.menuFor({kind:'slot-pack',item:inv[i],id:inv[i].id,index:i},false));
 eq(pack(0),['Wield Bronze hatchet','Use Bronze hatchet','Drop Bronze hatchet','Examine Bronze hatchet','Cancel'],'pack: a weapon is wielded');
 eq(pack(6),['Wear Leather body','Use Leather body','Drop Leather body','Examine Leather body','Cancel'],'pack: armour is worn');
 eq(pack(1),['Eat Bread','Use Bread','Drop Bread','Examine Bread','Cancel'],'pack: food is eaten');
 eq(pack(5),['Drink Hollow ale','Use Hollow ale','Drop Hollow ale','Examine Hollow ale','Cancel'],'pack: ale is drunk');
 eq(pack(2),['Bury Bones','Use Bones','Drop Bones','Examine Bones','Cancel'],'pack: bones are buried');
 eq(pack(3),['Use Emberwood logs','Drop Emberwood logs','Examine Emberwood logs','Cancel'],'pack: logs lead with Use');
 eq(pack(4),['Knead Dough','Use Dough','Drop Dough','Examine Dough','Cancel'],'pack: the dough keeps the knead click the lesson teaches');
 eq(pack(8),['Use Crowns','Drop Crowns','Examine Crowns','Cancel'],'pack: crowns');
 Object.keys(w.ITEMS).forEach(id=>{const rows=I.packEntries({item:{id,qty:1},id,index:0});ok(!rows.some(r=>r.option==='Wield'||r.option==='Wear')||!!w.ITEMS[id].equip,id+': Wield/Wear only for equippable items')});
 // Wield goes through the one equip path (UI.useItem), Use picks the item up, Drop drops, Examine examines
 w.calls.length=0;I.menuFor({kind:'slot-pack',item:inv[0],id:'hatchet',index:0},false)[0].fn();eq(w.calls,[['useItem',0]],'Wield runs UI.useItem (the only equip path)');
 I.menuFor({kind:'slot-pack',item:inv[7],id:'tinderbox',index:7},false)[0].fn();ok(w.Player.usingItem==='tinderbox'&&M.useSlot()===7,'Use picks the tinderbox up');
 eq(text(M,I.menuFor({kind:'slot-pack',item:inv[3],id:'logs',index:3},false)),['Use Tinderbox -> Emberwood logs','Cancel'],'use-mode in the pack: Use <item> -> <item>');
 eq(text(M,I.menuFor({kind:'slot-pack',item:inv[7],id:'tinderbox',index:7},false)),['Cancel'],'the picked-up item itself offers only Cancel');
 w.calls.length=0;I.leftClick({kind:'slot-pack',item:inv[3],id:'logs',index:3});eq(w.calls,[['firemaking',3]],'left click logs with the tinderbox in use: a fire');
 ok(w.Player.usingItem===null,'the use ends once the item is used');
 w.Player.usingItem='tinderbox';w.chats.length=0;I.leftClick({kind:'slot-pack',item:inv[1],id:'bread',index:1});ok(w.chats[0]==='Nothing interesting happens.','tinderbox on bread: nothing interesting happens');
 w.Player.usingItem=null;
 // bank, shop
 w.Player.bank=[{id:'coins',qty:100}];
 eq(text(M,I.menuFor({kind:'slot-bank',item:w.Player.bank[0],id:'coins',index:0},false)),['Withdraw-1 Crowns','Withdraw-5 Crowns','Withdraw-10 Crowns','Withdraw-All Crowns','Withdraw-X Crowns','Examine Crowns','Cancel'],'bank vault rows');
 eq(text(M,I.menuFor({kind:'slot-deposit',item:inv[1],id:'bread',index:1},false)),['Deposit-1 Bread','Deposit-5 Bread','Deposit-10 Bread','Deposit-All Bread','Deposit-X Bread','Examine Bread','Cancel'],'bank deposit rows');
 eq(text(M,I.menuFor({kind:'slot-shop',item:{id:'bread',qty:1},id:'bread',index:-1},false)),['Value Bread','Buy-1 Bread','Buy-5 Bread','Buy-10 Bread','Examine Bread','Cancel'],'shop stock rows');
 eq(text(M,I.menuFor({kind:'slot-sell',item:inv[1],id:'bread',index:1},false)),['Value Bread','Sell-1 Bread','Sell-5 Bread','Sell-10 Bread','Examine Bread','Cancel'],'shop sell rows');
 eq(text(M,I.menuFor({kind:'slot-worn',slot:'weapon',id:'hatchet'},false)),['Remove Bronze hatchet','Examine Bronze hatchet','Cancel'],'worn equipment rows');
 w.calls.length=0;I.menuFor({kind:'slot-bank',item:w.Player.bank[0],id:'coins',index:0},false)[3].fn();eq(w.calls,[['withdraw',0,Infinity]],'Withdraw-All asks the bank for everything');
 eq(['10','5k','1.5m','abc',' 7 '].map(I.parseAmount),[10,5000,1500000,0,7],'Enter amount: 10, 5k, 1.5m');
}

/* ---------- 6: data ---------- */
{
 const ex=src('holm_island_extras.js'),svc=ex.match(/\{prefix:'[A-Za-z]+_[A-Za-z0-9]*_?[^}]*\}/g)||[];
 ok(svc.length>=30,'island services found ('+svc.length+')');
 svc.forEach(s=>ok(/option:'[^']+'/.test(s)&&/name:'[^']+'/.test(s)&&/examine:'/.test(s),'service has a menu option, name and examine: '+s.slice(0,60)));
 const T=require(path.join(ROOT,'src','holm_island_tutors.js'));
 T.cast().forEach(c=>ok(typeof c.examine==='string'&&c.examine.length>10,'tutor '+c.id+' has an examine line'));
 const idx=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 ok(idx.indexOf('src/osrs_menu.js?v=')>0&&idx.indexOf('src/osrs_menu.js?v=')<idx.indexOf('src/game4_ui.js?v=')&&idx.indexOf('src/osrs_menu_world.js?v=')>idx.indexOf('src/game4_ui.js?v=')&&
  idx.indexOf('src/osrs_menu_items.js?v=')>idx.indexOf('src/item_tags.js?v='),'script order: model before game4_ui, world after it, slot menus after item_tags');
 ok(fs.existsSync(path.join(ROOT,'docs','rebuild','MENU_PROVIDERS.md')),'the provider API is documented (docs/rebuild/MENU_PROVIDERS.md)');
}
console.log(pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
