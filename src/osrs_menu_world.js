/* ============ OsrsMenuWorld: the world under the cursor, as old-school menu entries (owner 2026-09-26) ============
 * The world half of the one menu model (src/osrs_menu.js). pickAll() (game4_ui.js) walks the whole ray, not just its
 * first hit: every entity it meets before the ground is listed (a tutor standing in front of a door gives both), each
 * with its own rows, in the order the ray meets them. The first entity is exactly what pick() returns, so a left click
 * still acts on what it always did; it now runs the TOP menu row, which for every Holm object is the same click the game
 * handled before (handleClick -> HolmArrivalQA.handleClick: walk to the stance, the tutor-first refusals, the lesson).
 * Providers here (all registered through OsrsMenu.registerProvider, see docs/rebuild/MENU_PROVIDERS.md):
 *   holm      tutors, island services, arrival doors / chart / provision rack / hatch / cellar ladder / stairs,
 *             the statue plaque, progress gates, signposts (Tutor's Holm island)
 *   world     resources (Chop down / Mine / Net), fires, furnace, anvil, ground items (one Take per item on the tile),
 *             NPCs (Attack <name> (level-N) coloured by level difference; Talk-to for townsfolk), legacy kinds
 *   interact  every option registered with the Interact dispatcher (primary first)
 *   generic   a name and an Examine for anything else with a kind
 * Use-mode (an item picked with "Use"): every entity offers "Use <item> -> <target>"; targets that take the item run
 * the game's own handler (net on the fishing spot, dough or fish on the oven or fire, ore on the furnace), anything
 * else says "Nothing interesting happens." */
var OsrsMenuWorld=(function(){
 'use strict';
 var M=OsrsMenu;
 function has(name){try{return typeof window!=='undefined'&&typeof window[name]!=='undefined'}catch(e){return false}}
 function U(o){return (o&&o.userData)||{}}
 function strip(s){return M.plain(s)}
 function cap(s){s=String(s||'').trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s}
 function article(n){return (/^[aeiou]/i.test(n)?'an ':'a ')+String(n).toLowerCase()}
 function island(){return typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive()}
 // a click on this entity exactly as a left click on it always was (the island provider first, then the game)
 function click(ent){return function(){handleClick(ent.obj,ent.point||ent.obj.position)}}
 function wpos(o){try{return o.getWorldPosition(new THREE.Vector3())}catch(e){return o.position}}

 /* ---------- labels: "Verb <b>Name</b>" or "Verb Name" -> {option, name} ---------- */
 var VERBS=['Chop down','Climb-up','Climb-down','Climb up','Climb down','Look down','Pick up','Cook on','Cook at','Smelt at','Smith at','Steal from','Pray at','Talk-to','Open / close','Take','Read','Open','Close','Study','Inspect','Search','Use','Net','Mine','Pick','Harvest','Enter','Operate','Board','Pull','Cook'];
 function splitLabel(label){
  var html=String(label||''),b=/<b>([^<]+)<\/b>/.exec(html);
  if(b){var before=strip(html.slice(0,b.index)),after=strip(html.slice(b.index+b[0].length));return {option:before,name:cap((b[1]+(after?' '+after:'')).trim())}}
  var t=strip(html);
  for(var i=0;i<VERBS.length;i++){var v=VERBS[i];if(t.toLowerCase()===v.toLowerCase())return {option:v,name:''};if(t.toLowerCase().indexOf(v.toLowerCase()+' ')===0)return {option:v,name:cap(t.slice(v.length+1))}}
  var sp=t.indexOf(' ');return sp>0?{option:t.slice(0,sp),name:cap(t.slice(sp+1))}:{option:'',name:cap(t)};
 }

 /* ---------- the ray: entities in the order the cursor meets them ---------- */
 function isWalk(o){var u=U(o);return isGroundName(o.name)||(u.kind==='arrival_surface'&&u.arrivalSurface!=='stair')||u.kind==='arrival_cellar_floor'||u.walkSurface===true}
 function signRoot(o){for(var q=o;q;q=q.parent)if(/^island-habitat-/.test(q.name||''))return q;return null}
 // one entity per thing the player sees (a tutor's many meshes, a service's mesh and its hit box, a door's parts)
 function keyOf(o){
  var u=U(o);
  if(u.npc)return u.npc;
  if(u.islandService)return u.islandService;
  if(u.islandTutor)return 'tutor:'+u.islandTutor;
  if(u.islandGate)return 'gate:'+u.islandGate;
  if(u.arrivalDoor)return 'door:'+u.arrivalDoor;
  if(u.kind==='island_sign')return signRoot(o)||('sign:'+u.islandSign);
  if(u.kind==='arrival_provisions'||u.kind==='arrival_hatch'||u.kind==='arrival_statue'||u.kind==='arrival_cellar_ladder')return u.kind;
  if(u.kind==='arrival_surface'&&u.arrivalSurface==='stair')return 'stair';
  return o;
 }
 function entityOf(o,point){var u=U(o);return {kind:u.kind||'ground',obj:o,u:u,point:point||o.position,key:keyOf(o)}}
 // e: {clientX, clientY}. Returns {top:{obj,point}|null, entities:[...], walk:{obj,point}|null}
 function scan(e){
  var r=pickAll(e),ents=[],keys=new Set(),walk=null;
  function add(o,point){
   var k=keyOf(o);if(keys.has(k))return;var u=U(o);if(u.kind==='npc'&&(!u.npc||u.npc.dead))return;keys.add(k);ents.push(entityOf(o,point));
   // a ground stack: every item on the tile gets its own Take, as in 2004
   if(u.kind==='drop'&&typeof WORLD!=='undefined'&&WORLD.drops){var tx=Math.floor(o.position.x),tz=Math.floor(o.position.z);
    WORLD.drops.forEach(function(d){if(d!==o&&Math.floor(d.position.x)===tx&&Math.floor(d.position.z)===tz&&!keys.has(d)){keys.add(d);ents.push(entityOf(d,d.position))}})}
  }
  if(r.top){if(isWalk(r.top.obj))walk=r.top;else add(r.top.obj,r.top.point)}
  if(!walk)for(var i=0;i<r.list.length;i++){var c=r.list[i];if(isWalk(c.obj)){walk=c;break}add(c.obj,c.point)}
  return {top:r.top,entities:ents,walk:walk,e:e};
 }

 /* ---------- the ground under the cursor: "Walk here" ---------- */
 function walkFn(s){
  var e=s.e,top=s.top;
  return function(){
   if(M.using())M.endUse();
   if(top&&U(top.obj).inspectOnly){var gp=walkPointForHit(top,e);if(gp)minimapWalkTo(gp);return}
   if(s.walk){handleClick(s.walk.obj,s.walk.point);return}
   var g=groundPick(e);if(g)minimapWalkTo(g);
  };
 }

 /* ---------- use-mode: which targets take which items ---------- */
 function itemDef(id){return (typeof ITEMS!=='undefined'&&ITEMS[id])||{}}
 function cookable(id){return /^raw_/.test(id)||id==='bread_dough'||!!itemDef(id).cooks}
 function accepts(ent,id){
  var u=ent.u,d=itemDef(id);
  if(u.acceptsUseItem)return true;
  if(u.kind==='resource'){if(!u.alive)return false;
   if(u.rtype==='fish')return d.useOn==='fish'||d.tool==='fishing';
   if(u.rtype==='tree')return d.tool==='woodcutting';
   if(u.rtype==='rock')return d.tool==='mining';
   return false}
  if(u.kind==='fire')return cookable(id);
  if(u.kind==='furnace')return /_ore$|^coal$|^clay$/.test(id);
  if(u.kind==='anvil')return /_bar$/.test(id)||id==='hammer';
  if(u.kind==='altar')return !!d.bury;
  if(u.kind==='island_service'&&u.islandService){var call=u.islandService.call;
   if(!call)return false;
   if(call[1]==='cookAtRange')return cookable(id);
   return /^(bucket|bucket_flour|bucket_water|dough)$/.test(id)&&call[0]==='HolmTeachingKitchen'}
  return false;
 }
 function useOn(ent){
  var id=M.using();if(!id)return;
  if(!accepts(ent,id)){M.endUse();UI.chat('Nothing interesting happens.','plain');return}
  // the game's own handler reads Player.usingItem (and clears it once the item is used)
  if(ent.u.acceptsUseItem&&typeof Interact!=='undefined'&&Interact.entriesFor){
   var p=Interact.entriesFor({obj:ent.obj,point:ent.point},null).filter(function(en){return en.primary});
   if(p.length===1&&p[0].fn){p[0].fn();return}
  }
  handleClick(ent.obj,ent.point||ent.obj.position);
 }
 function useEntries(ent,desc){
  var id=M.using();if(!id||!desc||!desc.name)return [];
  return [{option:'Use',item:M.itemName(id),target:desc.name,targetType:desc.type,priority:100,fn:function(){useOn(ent)}}];
 }

 /* ---------- Tutor's Holm ---------- */
 var HOLM_KINDS=['island_tutor','island_service','island_sign','island_gate','arrival_door','arrival_chart','arrival_provisions','arrival_hatch','arrival_cellar_ladder','arrival_statue','arrival_surface'];
 function tutorOf(id){try{return HolmIslandTutors.cast().filter(function(c){return c.id===id})[0]||null}catch(e){return null}}
 function stairDown(o){for(var q=o;q;q=q.parent)if(q.userData&&q.userData.label)return /Climb-down/.test(q.userData.label);return false}
 function doorOpen(id){try{return !!(HolmArrivalQA.doorOpen&&HolmArrivalQA.doorOpen(id))}catch(e){return false}}
 function gateOpen(id){try{return !!HolmIslandGates.isOpen(id)}catch(e){return false}}
 var HOLM_EXAMINE={
  arrival_chart:'A painted relief of the whole Holm, with every lesson marked on it.',
  arrival_provisions:'A rack of teaching tools, one set for every new arrival.',
  arrival_hatch:'A trapdoor in the floorboards. A ladder leads down into the dark.',
  arrival_cellar_ladder:'A short ladder back up to the Guide House.',
  arrival_statue:'The Lantern Keeper, carved in pale stone. There is a plaque on the plinth.',
  stair:'A narrow oak staircase.',sign:'A weathered signpost where the paths meet.'};
 M.registerProvider({id:'holm',order:10,kinds:HOLM_KINDS,
  describe:function(ent){
   var u=ent.u,k=u.kind;
   if(k==='island_tutor'){var c=tutorOf(u.islandTutor);return {name:c?c.name:splitLabel(u.label).name,type:'npc',examine:(c&&c.examine)||'One of the Holm\'s tutors.'}}
   if(k==='island_service'){var s=u.islandService||{},sl=splitLabel(s.label||u.label);return {name:s.name||sl.name||cap(s.label),type:'object',examine:s.examine||null}}
   if(k==='island_sign')return {name:'Signpost',type:'object',examine:HOLM_EXAMINE.sign};
   if(k==='island_gate'){var gate=/gate$/.test(u.islandGate||'')?'Gate':'Door';return {name:gate,type:'object',examine:gateOpen(u.islandGate)?'It stands open.':(gate==='Gate'?'A sturdy yard gate, shut for now.':'A stout door on iron hinges, shut for now.')}}
   if(k==='arrival_door')return {name:'Door',type:'object',examine:'A stout oak door on iron hinges.'};
   if(k==='arrival_chart')return {name:'Relief chart',type:'object',examine:HOLM_EXAMINE.arrival_chart};
   if(k==='arrival_provisions')return {name:'Provision rack',type:'object',examine:HOLM_EXAMINE.arrival_provisions};
   if(k==='arrival_hatch')return {name:'Trapdoor',type:'object',examine:HOLM_EXAMINE.arrival_hatch};
   if(k==='arrival_cellar_ladder')return {name:'Ladder',type:'object',examine:HOLM_EXAMINE.arrival_cellar_ladder};
   if(k==='arrival_statue')return {name:'Statue',type:'object',examine:HOLM_EXAMINE.arrival_statue};
   if(k==='arrival_surface'&&u.arrivalSurface==='stair')return {name:'Staircase',type:'object',examine:HOLM_EXAMINE.stair};
   return null;
  },
  entries:function(ent,ctx,desc){
   var u=ent.u,k=u.kind,P=100;
   if(k==='island_tutor')return [{option:'Talk-to',priority:P,fn:click(ent)}];
   if(k==='island_service'){var s=u.islandService||{};return [{option:s.option||splitLabel(s.label||u.label).option||'Use',priority:P,fn:click(ent)}]}
   if(k==='island_sign')return [{option:'Read',priority:P,fn:click(ent)}];
   if(k==='island_gate')return gateOpen(u.islandGate)?[]:[{option:'Open',priority:P,fn:click(ent)}];
   if(k==='arrival_door')return [{option:doorOpen(u.arrivalDoor)?'Close':'Open',priority:P,fn:click(ent)}];
   if(k==='arrival_chart')return [{option:'Study',priority:P,fn:click(ent)}];
   if(k==='arrival_provisions')return [{option:'Collect-tools',priority:P,fn:click(ent)}];
   if(k==='arrival_hatch')return [{option:'Climb-down',priority:P,fn:click(ent)}];
   if(k==='arrival_cellar_ladder')return [{option:'Climb-up',priority:P,fn:click(ent)}];
   if(k==='arrival_statue')return [{option:'Read-plaque',priority:P,fn:click(ent)}];
   if(k==='arrival_surface'&&u.arrivalSurface==='stair')return [{option:stairDown(ent.obj)?'Climb-down':'Climb-up',priority:P,fn:click(ent)}];
   return [];
  }});

 /* ---------- the game world: gathering, stations, items on the ground, creatures ---------- */
 var ORE={tin:'Pale tin shows through the stone.',clay:'Workable clay shows through the stone.',iron:'Iron shows through the stone.',coal:'Coal shows through the stone.',copper:'Copper shows through the stone.'};
 function resourceDesc(u){
  var sl=splitLabel(u.label);
  if(u.rtype==='tree'){if(!u.alive)return {name:'Tree stump',type:'object',examine:'This tree has been cut down.'};
   var nm=sl.name||'Tree';return {name:nm,type:'object',examine:/oak/i.test(nm)?'A sturdy oak. Good wood for a first fire.':'A sturdy emberwood tree.'}}
  if(u.rtype==='rock'){if(!u.alive)return {name:'Rocks',type:'object',examine:'There is no ore left in this rock.'};
   return {name:sl.name||'Rocks',type:'object',examine:ORE[u.oreKind]||ORE.copper}}
  if(u.rtype==='fish')return {name:sl.name||'Fishing spot',type:'object',examine:'Small fish dart beneath the ripples.'};
  return {name:sl.name||'Resource',type:'object',examine:null};
 }
 var LEGACY_EXAMINE={altar:'Candles gutter over old stone. The Dawn listens.',door:'Stout emberwood on iron hinges.',well:'Veyhollow’s sweetest water, the wanderers swear.',
  furnace:'Hot enough to make ore confess.',anvil:'Scarred by ten thousand honest blows.',stall:'The keeper seems distracted...',cave:'Cold air rises from the dark.',
  bank:'The realm’s bankers keep your valuables safe.',signpost:'A weathered signpost.',climb:'A sturdy ladder.',lighthouseDoor:'A weathered oak door set into the tower.',
  lever:'A heavy bronze lever controls the Lastlight lens.',trapdoor:'A sealed hatch descends beneath the lighthouse.'};
 var WORLD_KINDS=['npc','friendly','resource','drop','climb','lighthouseDoor','lever','trapdoor','altar','fire','door','signpost','well','furnace','anvil','stall','cave','bank','prop'];
 M.registerProvider({id:'world',order:20,kinds:WORLD_KINDS,
  describe:function(ent){
   var u=ent.u,k=u.kind,sl=splitLabel(u.label);
   if(k==='npc'){var t=u.npc&&u.npc.t||{};return {name:t.name||'Creature',type:'npc',level:t.level,examine:t.examine||('It\'s '+article(t.name||'creature')+'.')}}
   if(k==='friendly')return {name:u.name||sl.name||'Stranger',type:'npc',examine:u.examine||u.desc||('One of the folk of the realm.')};
   if(k==='resource')return resourceDesc(u);
   if(k==='drop'){var d=itemDef(u.id);return {name:d.name||u.id,type:'item',examine:typeof InvMenu!=='undefined'?function(){InvMenu.examine(u.id)}:(d.examine||d.desc||null)}}   // the pack's own examine line (stacks read as stacks)
   if(k==='fire')return u.range?{name:sl.name||'Range',type:'object',examine:'A hot range, banked for cooking.'}:{name:'Fire',type:'object',examine:'A crackling fire. Good for cooking on.'};
   if(k==='furnace')return {name:'Furnace',type:'object',examine:LEGACY_EXAMINE.furnace};
   if(k==='anvil')return {name:'Anvil',type:'object',examine:LEGACY_EXAMINE.anvil};
   if(k==='climb')return {name:cap((u.label||'Ladder').replace(/^Climb(-up|-down)? /,''))||'Ladder',type:'object',examine:u.inspectMessage||u.examine||LEGACY_EXAMINE.climb};
   if(k==='lighthouseDoor')return {name:'Lastlight door',type:'object',examine:u.inspectMessage||LEGACY_EXAMINE.lighthouseDoor};
   if(k==='lever')return {name:'Beacon lever',type:'object',examine:u.inspectMessage||LEGACY_EXAMINE.lever};
   if(k==='trapdoor')return {name:'Trapdoor',type:'object',examine:u.inspectMessage||LEGACY_EXAMINE.trapdoor};
   if(k==='prop')return {name:u.inspectName||sl.name||'Curio',type:'object',examine:u.examine||u.inspectMessage||'Just a curio of the realm.'};
   return {name:sl.name||cap(k),type:'object',examine:u.examine||LEGACY_EXAMINE[k]||null};
  },
  entries:function(ent,ctx,desc){
   var u=ent.u,k=u.kind,o=ent.obj,P=100,out=[],sl=splitLabel(u.label);
   if(k==='npc'){var npc=u.npc;if(!npc||npc.dead)return [];
    out.push({option:'Attack',showLevel:true,level:npc.t.level,priority:P,fn:click(ent)});
    if(typeof PICKPOCKETS!=='undefined'&&PICKPOCKETS[npc.typeId])out.push({option:'Pickpocket',priority:50,fn:function(){tryPickpocket(npc)}});
    return out}
   if(k==='friendly')return [{option:'Talk-to',priority:P,fn:click(ent)}];
   if(k==='resource')return u.alive?[{option:sl.option||(u.rtype==='tree'?'Chop down':u.rtype==='rock'?'Mine':'Net'),priority:P,fn:click(ent)}]:[];
   if(k==='drop')return [{option:'Take',priority:P,fn:click(ent)}];
   if(k==='fire')return [{option:'Cook',priority:P,fn:click(ent)}];
   if(k==='furnace')return [{option:'Smelt',priority:P,fn:click(ent)}];
   if(k==='anvil')return [{option:'Smith',priority:P,fn:click(ent)}];
   if(k==='climb'){var pl=(Player.plane||0),c=u.climb||{};
    if(c.up&&c.up.plane>pl)out.push({option:'Climb-up',priority:P,fn:click(ent)});
    if(c.down&&c.down.plane<pl)out.push({option:'Climb-down',priority:P-1,fn:function(){queueClimb(o,c.down)}});
    if(!c.up&&!c.down)out.push({option:sl.option||'Climb',priority:P,fn:click(ent)});
    return out}
   if(k==='lighthouseDoor'||k==='lever'||k==='trapdoor')return [{option:sl.option||(k==='lever'?'Operate':'Open'),priority:P,fn:click(ent)}];
   if(k==='altar'){out.push({option:'Pray-at',priority:P,fn:function(){Player.action={type:'pray',obj:o,t:0};Player.moveTo=o.position.clone()}});
    if(Player.count('bones')>0)out.push({option:'Offer-bones',priority:50,fn:function(){Player.action={type:'offer',obj:o,t:0};Player.moveTo=o.position.clone()}});
    return out}
   if(k==='bank')return [{option:'Use',priority:P,fn:click(ent)}];
   if(k==='prop'){if(u.inspectOnly)return [];return [{option:'Inspect',priority:P,fn:function(){UI.chat(u.inspectMessage||u.examine||'Just a curio of the realm.','plain')}}]}
   // door, signpost, well, stall, cave: the label's own verb
   if(u.label)return [{option:sl.option||'Use',priority:P,fn:click(ent)}];
   return [];
  }});

 /* ---------- the Interact dispatcher: every registered option, primary first ---------- */
 M.registerProvider({id:'interact',order:5,kinds:'*',
  entries:function(ent,ctx){
   if(!ent.obj||typeof Interact==='undefined'||!Interact.optionsFor)return [];   // world entities only (not item slots)
   return Interact.optionsFor({obj:ent.obj,point:ent.point},ctx&&ctx.e).map(function(r){
    return {option:r.option,target:r.target,targetType:r.npc?'npc':'object',priority:r.primary?300:20,examine:r.option==='Examine',fn:r.fn}});
  }});

 /* ---------- anything else with a kind: a name and an Examine; an authored inspect line ---------- */
 M.registerProvider({id:'generic',order:1000,kinds:'*',
  describe:function(ent){if(!ent.u)return null;var u=ent.u,sl=splitLabel(u.label);return {name:u.inspectName||sl.name||cap(u.name||'')||cap(String(u.kind||'').replace(/^holm_/,'').replace(/_/g,' ')),type:'object',examine:u.examine||u.inspectMessage||null}},
  entries:function(ent){var u=ent.u;if(!u)return [];
   if(u.inspectMessage&&!u.inspectOnly&&u.kind!=='prop')return [{option:'Inspect',priority:10,fn:function(){UI.chat(u.inspectMessage,'plain')}}];
   return [];
  }});

 /* ---------- building, hovering, clicking ---------- */
 function context(s,e,extra){
  var ctx={e:e,scan:s,entities:s.entities,shift:!!(e&&e.shiftKey)||!!(typeof MenuQoL!=='undefined'&&MenuQoL._shift),
   walk:(s.top||s.walk)?walkFn(s):null,cancel:null};
  var id=M.using();if(id){ctx.use=id;ctx.useEntries=useEntries;ctx.cancel=function(){M.endUse()}}
  if(extra)for(var k in extra)ctx[k]=extra[k];
  return ctx;
 }
 function menuFor(e,extra){var s=scan(e);var ctx=context(s,e,extra);var entries=M.build(s.entities,ctx);return {scan:s,ctx:ctx,entries:entries}}
 // OSRS rule: a left click runs exactly the top row
 function leftClick(e){
  var r=menuFor(e,{shift:false}),top=r.entries[0];   // the shift extras live on the right-click menu only
  if(!r.scan.top&&!r.scan.walk&&!M.using())return null;
  if(top)M.record(top,'left');
  if(top&&typeof top.fn==='function'){try{top.fn()}catch(err){console.error('[OsrsMenu] left click '+M.rowText(top),err)}}
  return top||null;
 }
 function open(e,opts){
  var r=menuFor(e,{touch:!!(opts&&opts.touch)});
  M.show(e.clientX,e.clientY,r.entries,{source:opts&&opts.touch?'touch':'world'});
  return r.entries;
 }
 // the legacy menu for one hit ({html, fn} rows): buildCtxEntries() callers keep working
 function legacyEntries(hit,e){
  var ents=hit&&hit.obj&&!isWalk(hit.obj)?[entityOf(hit.obj,hit.point)]:[];
  var s={top:hit||null,entities:ents,walk:hit&&hit.obj&&isWalk(hit.obj)?hit:null,e:e||{clientX:0,clientY:0}};
  return M.build(ents,context(s,e)).map(function(en){return {html:M.rowHtml(en),fn:en.fn,option:en.option,target:en.target}});
 }
 return {scan:scan,menuFor:menuFor,leftClick:leftClick,open:open,legacyEntries:legacyEntries,accepts:accepts,splitLabel:splitLabel,isWalk:isWalk,keyOf:keyOf};
})();
