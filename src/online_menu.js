/* ============ OnlineMenu — the online world on the old-school menu (W2 / W2b) ============
 * The online entities as OsrsMenu providers (src/osrs_menu.js, docs/rebuild/MENU_PROVIDERS.md): the one "Choose
 * Option" menu and the one left click (the top row) serve the online world exactly as they serve the island.
 *   OnlineMenu.register(act)   registers the providers; act = the online glue's actions (src/online_main.js):
 *     {attackNpc(e), attackPlayer(e), castOn(kind, e, spell), follow(e), take(uid), kit(name), openChest(),
 *      unequip(slot), examine(text), note(text)}
 *   OnlineMenu.rowsFor(obj)    the menu for one object as plain text rows (QA and the driver)
 * Kinds (userData.kind): onl_player, onl_npc, onl_obj, onl_chest, onl_scenery; and the worn-equipment slots.
 * Rules (2004):
 *  - Another adventurer: "Attack <name> (level-N)" only where both stand in the Scarlands and the combat-level gap is
 *    within the lower Wilderness level (shared/pvp.js levelCheck), with a readied spell "Cast <spell> -> <name>" above
 *    it; Follow, Trade with and Report sit under Walk here, so a plain left click on someone you may not attack walks.
 *    Player rows carry no Examine.
 *  - A monster: "Cast <spell> -> <name>" (a readied spell), "Attack <name> (level-N)", then Walk here, then Examine.
 *  - Items on the ground: one Take per item on the tile, one Examine per item.
 *  - The supply chest: Open, Take-<kit>-kit per kit, Examine. Scenery: Walk here, Examine.
 * The level colour, the row order and the text come from the model; the actions are intents (the server decides). */
var OnlineMenu=(function(){
 'use strict';
 var KINDS=['onl_npc','onl_player','onl_obj','onl_chest','onl_scenery'];
 var act=null,registered=false;
 function M(){return typeof OsrsMenu!=='undefined'?OsrsMenu:null}
 /** may I attack this adventurer here? {ok, reason} (the server checks again) */
 function canAttackPlayer(e){
  var P=typeof CRShared!=='undefined'&&CRShared.pvp,m=OnlineWorld.model(),me=OnlineActors.me();
  if(!P||!m||!me||!me.tile||!e.tile)return {ok:false,reason:'unknown'};
  var myWl=m.wildernessLevel(me.tile.x,me.tile.z),theirWl=m.wildernessLevel(e.tile.x,e.tile.z),myCb=OnlineUI.state().cb;
  var r=P.levelCheck(myCb,myWl,e.cb,theirWl);return {ok:!r,reason:r};
 }
 function armed(){var id=OnlineUI.armedSpell(),sp=id&&typeof SPELLS!=='undefined'&&SPELLS[id];return sp?{id:id,name:sp.name}:null}
 function playerOf(ent){var e=OnlineActors.players().get(ent.u.pid);return e&&!e.dead?e:null}
 function npcOf(ent){var e=OnlineActors.npcs().get(ent.u.nid);return e&&!e.rec.dead?e:null}
 function objsOnTile(uid){
  var t=null,all=[];OnlineActors.objs().forEach(function(r){if(r.uid===uid)t=r});if(!t)return {t:null,all:all};
  OnlineActors.objs().forEach(function(r){if(r.x===t.x&&r.z===t.z&&!(r.mesh&&r.mesh.userData._cfxHide))all.push(r)});
  return {t:t,all:all};
 }
 // several item meshes on one tile can sit under the cursor: the first one met speaks for the whole tile
 function tileLead(ent,ctx){
  var o=objsOnTile(ent.u.uid);if(!o.t)return null;
  var list=(ctx&&ctx.entities)||[];
  for(var i=0;i<list.length;i++){var u=list[i].u||{};if(u.kind!=='onl_obj')continue;var r=objsOnTile(u.uid);if(r.t&&r.t.x===o.t.x&&r.t.z===o.t.z)return list[i]===ent?o:null}
  return o;
 }
 function itemName(id){return (typeof ITEMS!=='undefined'&&ITEMS[id]&&ITEMS[id].name)||id}
 function itemExamine(id){var d=typeof ITEMS!=='undefined'&&ITEMS[id]||{};return d.examine||d.desc||('It\'s '+(/^[aeiou]/i.test(itemName(id))?'an ':'a ')+itemName(id).toLowerCase()+'.')}
 var CHEST_EXAMINE='Fighting kits for anyone brave enough to cross the Ditch. Taking one swaps your pack and gear for it.';

 var PROVIDERS=[
  {id:'online-players',order:30,kinds:['onl_player'],
   describe:function(ent){var e=playerOf(ent);return e?{name:e.name,type:'player',level:e.cb,examine:false}:{name:'',type:'player',examine:false}},
   entries:function(ent){
    var e=playerOf(ent);if(!e)return [];
    var out=[],can=canAttackPlayer(e),sp=armed();
    if(can.ok&&sp)out.push({option:'Cast',item:sp.name,priority:110,fn:function(){act.castOn('p',e,sp.id)},kindTag:'cast'});
    if(can.ok)out.push({option:'Attack',priority:100,fn:function(){act.attackPlayer(e)},kindTag:'attack'});
    out.push({option:'Follow',below:true,priority:60,fn:function(){act.follow(e)},kindTag:'follow'});
    out.push({option:'Trade with',below:true,priority:50,fn:function(){act.note('Trading with other adventurers opens in a later release.')},kindTag:'trade'});
    out.push({option:'Report',below:true,priority:10,level:'',fn:function(){act.note('Reports reach the moderators once the world opens to the public. Thank you for looking out for others.')},kindTag:'report'});
    return out;
   }},
  {id:'online-npcs',order:30,kinds:['onl_npc'],
   describe:function(ent){var e=npcOf(ent);if(!e)return {name:'',type:'npc',examine:false};
    return {name:e.t.name,type:'npc',level:e.t.level,examine:e.t.examine||('It\'s '+(/^[aeiou]/i.test(e.t.name)?'an ':'a ')+e.t.name.toLowerCase()+'.')}},
   entries:function(ent){
    var e=npcOf(ent);if(!e)return [];var out=[],sp=armed();
    if(sp)out.push({option:'Cast',item:sp.name,priority:110,fn:function(){act.castOn('n',e,sp.id)},kindTag:'cast'});
    out.push({option:'Attack',priority:100,fn:function(){act.attackNpc(e)},kindTag:'attack'});
    return out;
   }},
  {id:'online-ground-items',order:30,kinds:['onl_obj'],
   describe:function(ent){var o=objsOnTile(ent.u.uid);if(!o.t)return {name:'',type:'item',examine:false};
    // the tile's lead lists every item's Examine; the others under the cursor add none of their own
    return {name:itemName(o.t.id),type:'item',examine:false}},
   entries:function(ent,ctx){
    var o=tileLead(ent,ctx);if(!o)return [];var out=[];
    o.all.forEach(function(r,i){out.push({option:'Take',target:itemName(r.id)+(r.q>1?' ('+r.q+')':''),targetType:'item',priority:100-i,fn:function(){act.take(r.uid)},kindTag:'take'})});
    o.all.forEach(function(r){out.push({option:'Examine',target:itemName(r.id),targetType:'item',examine:true,fn:function(){act.examine(itemExamine(r.id))}})});
    return out;
   }},
  {id:'online-chest',order:30,kinds:['onl_chest'],
   describe:function(){return {name:'Supply chest',type:'object',examine:CHEST_EXAMINE}},
   entries:function(){
    var a=OnlineWorld.map().alpha,out=[];if(!a||!a.kits)return out;
    out.push({option:'Open',priority:100,fn:function(){act.openChest()},kindTag:'open'});
    Object.keys(a.kits).forEach(function(k,i){out.push({option:'Take-'+k+'-kit',priority:90-i,fn:function(){act.kit(k)},kindTag:'kit'})});
    return out;
   }},
  {id:'online-scenery',order:30,kinds:['onl_scenery'],
   describe:function(ent){var u=ent.u,n=u.label?String(u.label).replace(/<[^>]+>/g,''):(u.name||'');
    return {name:n||'Scenery',type:'object',examine:u.examine||false}},
   entries:function(){return []}},
  // worn equipment online: Remove is an intent (the offline handler moves items locally, which the server owns)
  {id:'online-worn',order:5,kinds:['slot-worn'],
   entries:function(ent){return [{option:'Remove',priority:100,fn:function(){act.unequip(ent.slot)}}]}}
 ];
 /** register the online providers with the one menu model (idempotent) */
 function register(actions){
  act=actions;var m=M();if(!m)return false;
  PROVIDERS.forEach(function(p){m.registerProvider(p)});registered=true;return true;
 }
 /** the menu for one object, as the model builds it (Walk here and Cancel included), as rows of plain text */
 function rows(obj,point){
  if(typeof OsrsMenuWorld==='undefined'||!obj)return null;
  return OsrsMenuWorld.legacyEntries({obj:obj,point:point||obj.position},{clientX:0,clientY:0});
 }
 function rowsFor(obj,point){var r=rows(obj,point);return r?r.map(function(x){return OsrsMenu.plain(x.html)}):null}
 return {KINDS:KINDS,PROVIDERS:PROVIDERS,register:register,registered:function(){return registered},rows:rows,rowsFor:rowsFor,canAttackPlayer:canAttackPlayer};
})();
