/* Pure, atomic inventory reward planning. No runtime/player/UI dependencies.
 * Rows: {id, qty, mode:'additive'|'keep-one'}; mode defaults to additive.
 * keep-one requires qty:1 and includes every equipped slot in ownership.
 * Success: {ok:true, inventory, grants, requiredSlots, freeSlots}.
 * Failure never exposes a partially rewarded inventory; code is invalid-input
 * or insufficient-space (with requiredSlots/freeSlots/missingSlots).
 */
var HolmRewardPlan=(function(){
  'use strict';
  function own(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
  function record(o){ return !!o&&typeof o==='object'&&!Array.isArray(o); }
  function positive(n){ return Number.isSafeInteger(n)&&n>0; }
  function plan(inventory,equipment,itemDefinitions,rewardRows,capacity){
    function invalid(message){ return {ok:false,code:'invalid-input',message:message}; }
    if(!Array.isArray(inventory)||!record(equipment)||!record(itemDefinitions)||!Array.isArray(rewardRows))
      return invalid('Expected inventory/reward arrays and equipment/item definition objects.');
    if(capacity===undefined) capacity=inventory.length;
    if(!Number.isSafeInteger(capacity)||capacity<0||capacity>65536||inventory.length>capacity)
      return invalid('Capacity must cover inventory length and be an integer from 0 to 65536.');
    function known(id){ return typeof id==='string'&&id.length>0&&own(itemDefinitions,id)&&record(itemDefinitions[id]); }
    var counts=Object.create(null),stackSlots=Object.create(null),equipped=Object.create(null);
    var result=new Array(capacity).fill(null),used=0,i;
    for(i=0;i<inventory.length;i++){
      var slot=inventory[i];
      if(slot===null) continue;
      if(!record(slot)||!known(slot.id)||!positive(slot.qty)||(!itemDefinitions[slot.id].stack&&slot.qty!==1))
        return invalid('Invalid inventory slot '+i+'.');
      var total=(counts[slot.id]||0)+slot.qty;
      if(!Number.isSafeInteger(total)) return invalid('Inventory quantity overflow.');
      counts[slot.id]=total;
      if(itemDefinitions[slot.id].stack&&!own(stackSlots,slot.id)) stackSlots[slot.id]=i;
      result[i]={id:slot.id,qty:slot.qty}; used++;
    }
    var keys=Object.keys(equipment);
    for(i=0;i<keys.length;i++){
      var id=equipment[keys[i]];
      if(id===null) continue;
      if(!known(id)) return invalid('Invalid equipped item in '+keys[i]+'.');
      equipped[id]=true;
    }
    var grants=[],requiredSlots=0,freeSlots=capacity-used;
    for(i=0;i<rewardRows.length;i++){
      var row=rewardRows[i];
      if(!record(row)||!known(row.id)||!positive(row.qty)) return invalid('Invalid reward row '+i+'.');
      var mode=row.mode===undefined?'additive':row.mode;
      if(mode!=='additive'&&mode!=='keep-one') return invalid('Invalid reward mode at row '+i+'.');
      if(mode==='keep-one'&&row.qty!==1) return invalid('keep-one requires qty 1.');
      if(mode==='keep-one'&&((counts[row.id]||0)>0||equipped[row.id])) continue;
      var prior=counts[row.id]||0,next=prior+row.qty;
      if(!Number.isSafeInteger(next)) return invalid('Reward quantity overflow.');
      requiredSlots+=itemDefinitions[row.id].stack?(prior?0:1):row.qty;
      if(!Number.isSafeInteger(requiredSlots)) return invalid('Reward slot overflow.');
      counts[row.id]=next; grants.push({id:row.id,qty:row.qty});
    }
    if(requiredSlots>freeSlots) return {ok:false,code:'insufficient-space',requiredSlots:requiredSlots,
      freeSlots:freeSlots,missingSlots:requiredSlots-freeSlots};
    // Allocate only after validating the entire transaction and its capacity.
    var cursor=0;
    function empty(){ while(result[cursor]!==null) cursor++; return cursor; }
    grants.forEach(function(grant){
      if(itemDefinitions[grant.id].stack){
        if(own(stackSlots,grant.id)) result[stackSlots[grant.id]].qty+=grant.qty;
        else { var at=empty(); result[at]={id:grant.id,qty:grant.qty}; stackSlots[grant.id]=at; }
      }else for(var n=0;n<grant.qty;n++) result[empty()]={id:grant.id,qty:1};
    });
    return {ok:true,inventory:result,grants:grants,requiredSlots:requiredSlots,freeSlots:freeSlots};
  }
  return {plan:plan};
})();
if(typeof globalThis!=='undefined') globalThis.HolmRewardPlan=HolmRewardPlan;
if(typeof module!=='undefined'&&module.exports) module.exports=HolmRewardPlan;
