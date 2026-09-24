/* Durable initial teaching kits. Explicit exhaustion recovery is a separate service. */
var HolmCombatKits=(function(){
  'use strict';
  var kits={ranged:[{id:'worn_bow',qty:1},{id:'arrows',qty:30}],
    magic:[{id:'air_rune',qty:15},{id:'mind_rune',qty:15}]};
  function chat(message){if(typeof UI!=='undefined'&&UI.chat)UI.chat(message,'sys');}
  function claim(style){
    if(!Object.prototype.hasOwnProperty.call(kits,style))return false;
    if(typeof Player==='undefined'||typeof Tutorial==='undefined'||typeof ITEMS==='undefined'||
      typeof HolmRewardPlan==='undefined')return false;
    if(Tutorial.combatKitClaims&&Tutorial.combatKitClaims[style]===true)return true;
    var bank=Player.bank,counts=Object.create(null);
    if(!Array.isArray(bank))return false;
    for(var i=0;i<bank.length;i++){
      var slot=bank[i];
      if(!slot||typeof slot.id!=='string'||!Object.prototype.hasOwnProperty.call(ITEMS,slot.id)||
        !Number.isSafeInteger(slot.qty)||slot.qty<=0)return false;
      counts[slot.id]=(counts[slot.id]||0)+slot.qty;
      if(!Number.isSafeInteger(counts[slot.id]))return false;
    }
    var base=HolmRewardPlan.plan(Player.inv,Player.equip,ITEMS,[]);
    if(!base.ok)return false;
    Player.inv.forEach(function(s){if(s)counts[s.id]=(counts[s.id]||0)+s.qty;});
    Object.keys(Player.equip).forEach(function(k){var id=Player.equip[k];if(id)counts[id]=(counts[id]||0)+1;});
    if(Object.keys(counts).some(function(id){return !Number.isSafeInteger(counts[id]);}))return false;
    var rows=[];
    kits[style].forEach(function(row){var need=row.qty-(counts[row.id]||0);if(need>0)rows.push({id:row.id,qty:need});});
    var result=HolmRewardPlan.plan(Player.inv,Player.equip,ITEMS,rows);
    if(!result.ok){chat('Make room in your pack, then return to the lesson for your teaching kit.');return false;}
    // Preserve unrelated per-slot metadata while applying the planner's quantities.
    result.inventory=result.inventory.map(function(s,index){
      var old=Player.inv[index];return s&&old&&s.id===old.id?Object.assign({},old,s):s;
    });
    var previousInv=Player.inv,previousClaims=Tutorial.combatKitClaims;
    Player.inv=result.inventory;
    Tutorial.combatKitClaims=Object.assign({},previousClaims||{});Tutorial.combatKitClaims[style]=true;
    var saved=false;
    try{saved=typeof SaveGame!=='undefined'&&SaveGame.save(true)===true;}catch(e){}
    if(!saved){
      Player.inv=previousInv;
      if(previousClaims===undefined)delete Tutorial.combatKitClaims;else Tutorial.combatKitClaims=previousClaims;
      chat('Your teaching kit could not be saved. Your pack is unchanged; please try again.');return false;
    }
    if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv();
    chat(result.grants.length?'Your '+style+' teaching kit is ready in your pack.':'You already own the '+style+' teaching kit.');
    if(kits[style].some(function(row){return bank.some(function(s){return s.id===row.id;});}))
      chat('Some of your teaching supplies are in your bank. Withdraw them before practice.');
    return true;
  }
  return {claim:claim};
})();
