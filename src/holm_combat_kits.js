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
  /* Exhaustion recovery (goal audit 2026-09-29: the trials promised "ammo and rune recovery", but a player who spent
   * every teaching rune or arrow without the kill, or lost the bow, could never finish the trial). While that style's
   * trial is the lesson due and its kit has been claimed, a part of the kit the player no longer holds anywhere (pack,
   * worn, bank) is handed over again when they speak to the trial's tutor (HolmIslandTutors). Partly used supplies are
   * never topped up, so nothing can be farmed; the same saved, all-or-nothing transaction as the first claim. */
  function recover(style,from){
    if(!Object.prototype.hasOwnProperty.call(kits,style)||typeof Player==='undefined'||typeof Tutorial==='undefined'||
      typeof ITEMS==='undefined'||typeof HolmRewardPlan==='undefined')return false;
    var cur=!Tutorial.complete&&Tutorial.steps&&Tutorial.steps[Tutorial.step];
    if(!cur||cur.ev!=='killStyle'||cur.match!==style)return false;
    if(!(Tutorial.combatKitClaims&&Tutorial.combatKitClaims[style]===true))return claim(style);
    var held=Object.create(null);
    (Player.inv||[]).concat(Player.bank||[]).forEach(function(s){if(s&&typeof s.id==='string')held[s.id]=(held[s.id]||0)+(Number(s.qty)||0);});
    Object.keys(Player.equip||{}).forEach(function(k){var id=Player.equip[k];if(id)held[id]=(held[id]||0)+1;});
    var rows=kits[style].filter(function(row){return !(held[row.id]>0);}).map(function(row){return {id:row.id,qty:row.qty};});
    if(!rows.length)return false;
    var result=HolmRewardPlan.plan(Player.inv,Player.equip,ITEMS,rows);
    if(!result.ok){chat('Make room in your pack, then ask again for your teaching supplies.');return false;}
    var previousInv=Player.inv;Player.inv=result.inventory;
    var saved=false;try{saved=typeof SaveGame!=='undefined'&&SaveGame.save(true)===true;}catch(e){}
    if(!saved){Player.inv=previousInv;chat('Your teaching supplies could not be saved. Your pack is unchanged; please try again.');return false;}
    if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv();
    chat((from||'Your tutor')+' hands you '+rows.map(function(r){var d=ITEMS[r.id]||{};var nm=(d.name||r.id).toLowerCase();return d.stack?r.qty+' '+(r.qty>1&&!/s$/.test(nm)?nm+'s':nm):'a '+nm;}).join(' and ')+'.');
    return true;
  }
  return {claim:claim,recover:recover};
})();
