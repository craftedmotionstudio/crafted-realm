/* ============ OnlineMenu — the online entries of the right-click menu (W2) ============
 * One small provider: given what is under the cursor, the rows the online world adds, each with the intent it sends.
 * Kept apart so the game's menu system (a provider-based "Choose Option" menu, docs/rebuild/MENU_PROVIDERS.md) can
 * register it as is; the online glue (src/online_main.js) appends "Walk here" / "Cancel" and passes the actions in.
 *   OnlineMenu.entries(hit, act) -> [{html, fn, kind, target}]
 *   hit = {obj, point}; obj.userData.kind is one of OnlineMenu.KINDS
 *   act = {attackNpc(e), attackPlayer(e), castOn(kind, e, spell), follow(e), take(uid), kit(name), openChest(),
 *          examine(text), note(text)}
 * Rules (2004): "Attack <name> (level-N)" on another adventurer only when both stand in the Scarlands and the combat
 * level difference is within the lower Wilderness level (shared/pvp.js levelCheck); the level is coloured by the
 * difference from yours (green weaker .. red stronger); a readied spell adds "Cast <spell> -> <name>" on top.
 */
var OnlineMenu=(function(){
 'use strict';
 var KINDS=['onl_npc','onl_player','onl_obj','onl_chest','onl_scenery'];
 function lvl(my,their){return '<span style="color:'+OnlineActors.combatColour(my,their)+'">(level-'+their+')</span>'}
 /** may I attack this adventurer here? {ok, reason} (the server checks again) */
 function canAttackPlayer(e){
  var P=typeof CRShared!=='undefined'&&CRShared.pvp,m=OnlineWorld.model(),me=OnlineActors.me();
  if(!P||!m||!me||!me.tile||!e.tile)return {ok:false,reason:'unknown'};
  var myWl=m.wildernessLevel(me.tile.x,me.tile.z),theirWl=m.wildernessLevel(e.tile.x,e.tile.z),myCb=OnlineUI.state().cb;
  var r=P.levelCheck(myCb,myWl,e.cb,theirWl);return {ok:!r,reason:r};
 }
 function entries(hit,act){
  var out=[],o=hit&&hit.obj,u=(o&&o.userData)||{},myCb=OnlineUI.state().cb,armed=OnlineUI.armedSpell(),asp=armed&&typeof SPELLS!=='undefined'&&SPELLS[armed];
  function row(html,fn,kind,target){out.push({html:html,fn:fn,kind:kind,target:target||null})}
  if(u.kind==='onl_npc'){
   var ne=OnlineActors.npcs().get(u.nid);if(!ne||ne.rec.dead)return out;
   var nn='<b style="color:#ff0">'+ne.t.name+'</b>';
   if(asp)row('Cast <b style="color:#0f0">'+asp.name+'</b> -&gt; '+nn+' '+lvl(myCb,ne.t.level),function(){act.castOn('n',ne,armed)},'cast',['n',ne.id]);
   row('Attack '+nn+' '+lvl(myCb,ne.t.level),function(){act.attackNpc(ne)},'attack',['n',ne.id]);
   row('Examine '+nn,function(){act.examine(ne.t.examine||('A '+ne.t.name.toLowerCase()+'.'))},'examine',['n',ne.id]);
  }else if(u.kind==='onl_player'){
   var pe=OnlineActors.players().get(u.pid);if(!pe||pe.dead)return out;
   var pn='<b style="color:#fff">'+pe.name+'</b>',can=canAttackPlayer(pe);
   if(can.ok&&asp)row('Cast <b style="color:#0f0">'+asp.name+'</b> -&gt; '+pn+' '+lvl(myCb,pe.cb),function(){act.castOn('p',pe,armed)},'cast',['p',pe.id]);
   if(can.ok)row('Attack '+pn+' '+lvl(myCb,pe.cb),function(){act.attackPlayer(pe)},'attack',['p',pe.id]);
   row('Follow '+pn+' '+lvl(myCb,pe.cb),function(){act.follow(pe)},'follow',['p',pe.id]);
   row('Trade with '+pn+' '+lvl(myCb,pe.cb),function(){act.note('Trading with other adventurers opens in a later release.')},'trade',['p',pe.id]);
   row('Report '+pn,function(){act.note('Reports reach the moderators once the world opens to the public. Thank you for looking out for others.')},'report',['p',pe.id]);
  }else if(u.kind==='onl_obj'){
   var t=null;OnlineActors.objs().forEach(function(r){if(r.uid===u.uid)t=r});if(!t)return out;
   // every item on that tile, as in 2004
   OnlineActors.objs().forEach(function(r){if(r.x!==t.x||r.z!==t.z||r.mesh.userData._cfxHide)return;var d=ITEMS[r.id];
    row('Take <b style="color:#ff9040">'+d.name+'</b>'+(r.q>1?' ('+r.q+')':''),function(){act.take(r.uid)},'take',['o',r.uid])});
   row('Examine <b style="color:#ff9040">'+ITEMS[t.id].name+'</b>',function(){act.examine(ITEMS[t.id].examine||('It\'s '+ITEMS[t.id].name.toLowerCase()+'.'))},'examine',['o',t.uid]);
  }else if(u.kind==='onl_chest'){
   var a=OnlineWorld.map().alpha;
   if(a&&a.kits){row('Open <b style="color:#0ff">Supply chest</b>',function(){act.openChest()},'open');
    Object.keys(a.kits).forEach(function(k){row('Take-'+k+'-kit <b style="color:#0ff">Supply chest</b>',function(){act.kit(k)},'kit')})}
   row('Examine <b style="color:#0ff">Supply chest</b>',function(){act.examine('Fighting kits for anyone brave enough to cross the Ditch. Taking one swaps your pack and gear for it.')},'examine');
  }else if(u.kind==='onl_scenery'&&(u.examine||u.label)){
   row('Examine',function(){act.examine(u.examine||'Nothing interesting.')},'examine');
  }
  return out;
 }
 return {KINDS:KINDS,entries:entries,canAttackPlayer:canAttackPlayer};
})();
