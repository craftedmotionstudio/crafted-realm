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
  function recover(){
    if(typeof CRWorldMode==='undefined'||(CRWorldMode.providerId!=='tutors-holm-v2'&&
      !(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.active()))) return false;
    if(typeof HolmToolRecovery==='undefined'||typeof Tutorial==='undefined'||typeof Player==='undefined'||typeof ITEMS==='undefined'){
      chat('The provision ledger is not ready. Please try again.');return false;
    }
    var step=Tutorial.steps&&Tutorial.steps[Tutorial.step],result;
    try{result=HolmToolRecovery.plan(Player.inv,Player.equip,Player.bank,ITEMS,
      {lessonId:step&&step.id,complete:!!Tutorial.complete});}catch(e){
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
      if(!result.unlockedTools.length) chat('Study the Guide Hall island chart first to unlock your survival kit.');
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
    chat('Replacement tools placed in your pack: '+names(result.grants.map(function(row){return row.id;}))+'.');
    bankMessage(result.bankOwned);return true;
  }
  return {recover:recover};
})();
if(typeof globalThis!=='undefined') globalThis.HolmToolRecoveryService=HolmToolRecoveryService;
