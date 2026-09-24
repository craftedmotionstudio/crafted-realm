/* Pure tutorial tool recovery; load after HolmTutorialFlow + HolmRewardPlan.
 * plan(inv,equip,bank,definitions,progress), where progress is a required lesson
 * ID or {lessonId,complete:boolean}. Completion unlocks every required tool.
 * Bank-owned tools are reported for withdrawal, never duplicated or removed.
 * Successful inventory/grants are an atomic proposal for the caller to commit.
 */
var HolmToolRecovery=(function(){
  'use strict';
  var unlocks=[
    {lesson:'equip_hatchet',tools:['hatchet','tinderbox','fishing_net']},
    {lesson:'mine_copper',tools:['pickaxe']},
    {lesson:'forge_dagger',tools:['hammer']}
  ];
  function own(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
  function invalid(message){return {ok:false,code:'invalid-input',message:message};}
  function plan(inv,equip,bank,definitions,progress){
    if(typeof HolmRewardPlan==='undefined'||typeof HolmTutorialFlow==='undefined')
      return {ok:false,code:'missing-dependency',message:'HolmRewardPlan and HolmTutorialFlow are required.'};
    // Validate carried items/equipment before consulting ownership.
    var base=HolmRewardPlan.plan(inv,equip,definitions,[]);
    if(!base.ok) return base;
    if(!Array.isArray(bank)) return invalid('Bank must be an array.');
    var bankCounts=Object.create(null);
    for(var i=0;i<bank.length;i++){
      var slot=bank[i];
      if(!slot||typeof slot!=='object'||Array.isArray(slot)||typeof slot.id!=='string'||
          !own(definitions,slot.id)||!definitions[slot.id]||typeof definitions[slot.id]!=='object'||
          Array.isArray(definitions[slot.id])||!Number.isSafeInteger(slot.qty)||slot.qty<=0)
        return invalid('Invalid bank slot '+i+'.');
      var total=(bankCounts[slot.id]||0)+slot.qty;
      if(!Number.isSafeInteger(total)) return invalid('Bank quantity overflow.');
      bankCounts[slot.id]=total;
    }
    var complete=false,lessonId;
    if(typeof progress==='string') lessonId=progress;
    else if(progress&&typeof progress==='object'&&!Array.isArray(progress)){
      if(progress.complete!==undefined&&typeof progress.complete!=='boolean') return invalid('Completion must be boolean.');
      complete=progress.complete===true;lessonId=progress.lessonId;
    }else return invalid('Expected a lesson ID or progress object.');
    var steps=HolmTutorialFlow.runtimeSteps(),ids=steps.map(function(s){return s.id;});
    var at=complete?ids.length:ids.indexOf(lessonId);
    if(at<0) return invalid('Unknown required lesson ID.');
    var unlockedTools=[];
    for(i=0;i<unlocks.length;i++){
      var entry=unlocks[i],index=ids.indexOf(entry.lesson);
      if(index<0) return invalid('Tool unlock lesson is absent from the curriculum: '+entry.lesson);
      if(at>=index) unlockedTools=unlockedTools.concat(entry.tools);
    }
    var bankOwned=[],missingTools=[],rows=[];
    var worn=Object.keys(equip).map(function(k){return equip[k];});
    for(i=0;i<unlockedTools.length;i++){
      var id=unlockedTools[i];
      if(!own(definitions,id)||!definitions[id]||typeof definitions[id]!=='object'||Array.isArray(definitions[id]))
        return invalid('Unknown required tool: '+id);
      var carried=inv.some(function(s){return s&&s.id===id;})||worn.indexOf(id)>=0;
      if(carried) continue;
      if(bankCounts[id]) bankOwned.push(id);
      else {missingTools.push(id);rows.push({id:id,qty:1,mode:'keep-one'});}
    }
    var result=HolmRewardPlan.plan(inv,equip,definitions,rows);
    result.unlockedTools=unlockedTools;result.bankOwned=bankOwned;result.missingTools=missingTools;
    return result;
  }
  return {plan:plan};
})();
if(typeof globalThis!=='undefined') globalThis.HolmToolRecovery=HolmToolRecovery;
if(typeof module!=='undefined'&&module.exports) module.exports=HolmToolRecovery;
