/* Explicit provisions service; the caller owns reach/interaction registration.
 * Recovery inventory is committed only after a successful durable save.
 */
var HolmToolRecoveryService=(function(){
  'use strict';
  function chat(message){ if(typeof UI!=='undefined'&&typeof UI.chat==='function') UI.chat(message,'sys'); }
  function names(ids){return ids.map(function(id){return ITEMS[id]&&ITEMS[id].name||id;}).join(', ');}
  function bankMessage(ids){
    if(ids.length) chat('Already in your bank: '+names(ids)+'. Withdraw '+(ids.length===1?'it':'them')+' at Holm Bank on Warden\'s Ridge, west of the Combat Hall.');
  }
  /* Tutor's Holm island (owner review 2026-09-27): the island runs the 18-lesson curriculum, whose extra lessons (bread,
   * quests, the trials) are not in the compact tool ledger; the tools earned are those of the first required lesson not
   * yet in the lesson ledger, and while that lesson's tutor has not been spoken to its own tools stay with the tutor
   * (2004: Wenna hands over the hatchet, Durgin the pickaxe). Returns {lessonId, heldBy} or null off the island. */
  function islandProgress(){
    if(typeof HolmIslandTalk==='undefined'||!HolmIslandTalk.active()||typeof HolmTutorialFlow==='undefined') return null;
    var ids=HolmTutorialFlow.runtimeSteps().map(function(r){return r.id;}),done=Array.isArray(Tutorial.completedLessonIds)?Tutorial.completedLessonIds:[];
    var at=ids.findIndex(function(id){return done.indexOf(id)<0;});if(at<0) return {lessonId:ids[ids.length-1],heldBy:null,complete:true};
    // the lesson in hand counts too: a step's banner (and its tool grant) runs as the step starts, before the lesson just
    // finished reaches the ledger (the hammer at forge_dagger was lost to that lag and never offered again)
    var cur=Tutorial.steps&&Tutorial.steps[Tutorial.step],ci=cur?ids.indexOf(cur.id):-1;if(ci>at) at=ci;
    var t=cur&&cur.id===ids[at]&&HolmIslandTalk.pending();
    if(t) return {lessonId:ids[Math.max(0,at-1)],heldBy:t};
    return {lessonId:ids[at],heldBy:null};
  }
  function article(name){return /^[aeiou]/i.test(name)?'an '+name:'a '+name;}
  function handed(ids){var n=ids.map(function(id){return article(ITEMS[id]&&ITEMS[id].name||id);});return n.length>1?n.slice(0,-1).join(', ')+' and '+n[n.length-1]:n[0];}
  function recover(opts){
    opts=opts||{};
    if(typeof CRWorldMode==='undefined'||(CRWorldMode.providerId!=='tutors-holm-v2'&&
      !(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.active())&&
      !(typeof HolmV3Preview!=='undefined'&&HolmV3Preview.active()))) return false;
    if(typeof HolmToolRecovery==='undefined'||typeof Tutorial==='undefined'||typeof Player==='undefined'||typeof ITEMS==='undefined'){
      chat('The provision ledger is not ready. Please try again.');return false;
    }
    var step=Tutorial.steps&&Tutorial.steps[Tutorial.step],result,island=null;
    try{island=Tutorial.complete?null:islandProgress();}catch(e){island=null;}
    try{result=HolmToolRecovery.plan(Player.inv,Player.equip,Player.bank,ITEMS,
      {lessonId:island?island.lessonId:step&&step.id,complete:!!Tutorial.complete||!!(island&&island.complete)});}catch(e){
      chat('The provision ledger could not be read. Your pack is unchanged; please try again.');return false;
    }
    if(!result.ok){
      if(result.code==='insufficient-space'){
        chat('Your replacement tools need '+result.requiredSlots+' free inventory slot'+(result.requiredSlots===1?'':'s')+
          '; you have '+result.freeSlots+'. Free '+result.missingSlots+' more slot'+(result.missingSlots===1?'':'s')+' and try again.');
        bankMessage(result.bankOwned||[]);
      }else chat('The provision ledger could not prepare your tools. Your pack is unchanged; please try again.');
      return false;
    }
    if(!result.grants.length){
      if(island&&island.heldBy&&!opts.from) chat('The tools for your next lesson come from '+island.heldBy.name+'. Speak to '+island.heldBy.name+' first; this rack only keeps spares.');
      else if(!result.unlockedTools.length) chat(island?'Wenna, at the survival camp, gives you your first tools. This rack only keeps spares.':'Study the Guide Hall island chart first to unlock your survival kit.');
      else if(!result.bankOwned.length) chat('You already carry or wear every tool for your unlocked lessons.');
      bankMessage(result.bankOwned);return true;
    }
    var previous=Player.inv,saved=false;
    Player.inv=result.inventory;
    try{saved=typeof SaveGame!=='undefined'&&SaveGame.save(true)===true;}catch(e){}
    if(!saved){
      Player.inv=previous;
      chat('Your replacement tools could not be saved. Your pack is unchanged; please try again.');
      return false;
    }
    if(typeof UI!=='undefined'&&typeof UI.refreshInv==='function') UI.refreshInv();
    if(opts.from) chat(opts.from+' hands you '+handed(result.grants.map(function(row){return row.id;}))+'.');
    else chat('Replacement tools placed in your pack: '+names(result.grants.map(function(row){return row.id;}))+'.');
    bankMessage(result.bankOwned);return true;
  }
  return {recover:recover};
})();
if(typeof globalThis!=='undefined') globalThis.HolmToolRecoveryService=HolmToolRecoveryService;
