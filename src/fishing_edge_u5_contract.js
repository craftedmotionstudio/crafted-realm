/* ================= WORKYARD U5 FISHING CONTRACT =================
 * Pure-data state machine for the first Small-net lesson.  No Date, random,
 * DOM, THREE, Player, or input dependencies.  Every function returns fresh
 * state and the exact-once reward ledger survives save/reload replay.
 */
var FISHING_EDGE_U5_CONTRACT={
  version:1,
  assetId:'workyard_fishing_edge_u5_v1',
  item:{requires:'fishing_net',produces:'raw_perch'},
  xp:{skill:'fishing',amount:28},
  sockets:{operator:'fishing_operator_socket',presentation:'catch_presentation_socket',reward:'fish_reward_socket'},
  clips:{
    idle:{name:'FishingSpot_Idle',seconds:4.5},
    bite:{name:'FishingSpot_Bite',seconds:1.25,eventNormalized:.4},
    catch:{name:'FishingSpot_Catch',seconds:1.5,rewardNormalized:.5278}
  },
  states:['idle','casting','waiting','bite','catching','settling'],
  maxRememberedOps:32
};

function u5CreateSave(){return {firstCatchComplete:false,sequence:0,appliedOps:[],active:null};}

function u5CloneSave(save){
  save=save||u5CreateSave();
  return {firstCatchComplete:!!save.firstCatchComplete,sequence:Number(save.sequence)||0,
    appliedOps:Array.isArray(save.appliedOps)?save.appliedOps.slice(-32):[],
    active:save.active?Object.assign({},save.active):null};
}

function u5HasItem(inventory,id){
  var slots=inventory&&Array.isArray(inventory.slots)?inventory.slots:[];
  return slots.some(function(slot){return slot===id||(slot&&slot.id===id);});
}

function u5CanAcceptCatch(inventory){
  var slots=inventory&&Array.isArray(inventory.slots)?inventory.slots:[];
  var capacity=Number(inventory&&inventory.capacity)||slots.length||28;
  if(slots.length<capacity)return true;
  return slots.some(function(slot){return slot===null||slot===undefined||slot===false;});
}

function u5Hash(seed){
  var text=String(seed||'holm');var hash=2166136261;
  for(var i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

function u5WaitSeconds(save,seed){
  if(!save||!save.firstCatchComplete)return .70;
  return +(1.25+(u5Hash(seed)%151)/100).toFixed(2);
}

function u5BeginOperation(save,opId,inventory,seed){
  var next=u5CloneSave(save);
  if(next.active)return {ok:false,reason:'operation already active',save:next};
  if(next.appliedOps.indexOf(opId)>=0)return {ok:false,reason:'operation id already rewarded',save:next};
  if(!u5HasItem(inventory,FISHING_EDGE_U5_CONTRACT.item.requires))
    return {ok:false,reason:'requires small net',save:next};
  if(!u5CanAcceptCatch(inventory))return {ok:false,reason:'inventory full',save:next};
  next.sequence+=1;
  next.active={opId:opId,state:'casting',waitSeconds:u5WaitSeconds(next,seed),firstTutorialCatch:!next.firstCatchComplete};
  return {ok:true,save:next};
}

function u5Advance(save,event,inventory){
  var next=u5CloneSave(save),effects=[];
  if(!next.active)return {save:next,effects:effects};
  var active=next.active;
  if(event==='INTERRUPT'){
    next.active=null;effects.push({type:'reset',opId:active.opId});return {save:next,effects:effects};
  }
  var transitions={casting:{CAST_COMPLETE:'waiting'},waiting:{BITE:'bite'},bite:{NET:'catching'},
    catching:{CATCH_COMPLETE:'settling'},settling:{SETTLED:'idle'}};
  var state=(transitions[active.state]||{})[event];
  if(!state)return {save:next,effects:effects};
  if(event==='CATCH_COMPLETE'){
    if(next.appliedOps.indexOf(active.opId)>=0){active.state='settling';return {save:next,effects:effects};}
    if(!u5CanAcceptCatch(inventory)){
      next.active=null;effects.push({type:'message',text:'Your pack is too full to keep the fish.'});return {save:next,effects:effects};
    }
    next.appliedOps.push(active.opId);next.appliedOps=next.appliedOps.slice(-FISHING_EDGE_U5_CONTRACT.maxRememberedOps);
    next.firstCatchComplete=true;active.state='settling';
    effects.push({type:'reward',id:'raw_perch',qty:1,skill:'fishing',xp:28,opId:active.opId});
    return {save:next,effects:effects};
  }
  if(event==='SETTLED'){next.active=null;return {save:next,effects:effects};}
  active.state=state;return {save:next,effects:effects};
}

if(typeof module!=='undefined'&&module.exports)module.exports={
  FISHING_EDGE_U5_CONTRACT:FISHING_EDGE_U5_CONTRACT,u5CreateSave:u5CreateSave,u5CloneSave:u5CloneSave,
  u5HasItem:u5HasItem,u5CanAcceptCatch:u5CanAcceptCatch,u5WaitSeconds:u5WaitSeconds,
  u5BeginOperation:u5BeginOperation,u5Advance:u5Advance
};

