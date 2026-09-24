/* Deliver the complete departure pack as one saved inventory transaction. */
var HolmDepartureRewards=(function(){
  'use strict';
  function rows(){
    var rewards=[{id:'coins',qty:25},{id:'bread',qty:3},{id:'air_rune',qty:25},
      {id:'mind_rune',qty:25},{id:'arrows',qty:25}];
    ['wood_shield','leather_body','worn_bow','hatchet','pickaxe','fishing_net','tinderbox','hammer','bronze_dagger']
      .forEach(function(id){rewards.push({id:id,qty:1,mode:'keep-one'});});
    rewards.push({id:'home_tab',qty:3});
    return rewards;
  }
  function claim(){
    if(Tutorial.departurePackClaimed)return true;
    if(!Tutorial.complete)return false;
    var result=HolmRewardPlan.plan(Player.inv,Player.equip,ITEMS,rows(),Player.inv.length);
    if(!result.ok){
      UI.chat(result.code==='insufficient-space'
        ?'Your welcome pack is still aboard. Free '+result.missingSlots+' inventory slot'+(result.missingSlots===1?'':'s')+' at Holm Bank, then board again.'
        :'Your welcome pack could not be prepared. It remains aboard; please try again.','sys');
      return false;
    }
    var previous=Player.inv;
    Player.inv=result.inventory;
    Tutorial.departurePackClaimed=true;
    // Inventory and claim marker live in the same serialized save. A refused
    // write restores both so retrying cannot lose or duplicate a partial pack.
    var saved=false;
    try{saved=SaveGame.save(true)===true;}catch(e){}
    if(!saved){
      Player.inv=previous;Tutorial.departurePackClaimed=false;
      UI.chat('Your welcome pack could not be saved. It remains aboard; please try boarding again.','sys');
      return false;
    }
    UI.refreshInv();
    UI.chat('Warden\'s welcome pack: 25 crowns, bread, runes, arrows, a shield, leather body and teleport tabs. Your tools and forged dagger come with you.','sys');
    return true;
  }
  return {rows:rows,claim:claim};
})();
Tutorial.grantDeparturePack=HolmDepartureRewards.claim;
