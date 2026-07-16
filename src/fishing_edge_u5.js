/* ================= WORKYARD U5 FISHING EDGE =================
 * Live r128 integration for the Blender-authored fishing target.  The GLB owns
 * fish, creel, water and motion; this module owns approach, Small-net gating,
 * exact-once reward/XP, interruption, messages and durable state.
 */
var WorkyardFishingU5=(function(){
  'use strict';
  var root=null,family=null,mixer=null,actions={},clips={};
  var txSave=typeof u5CreateSave==='function'?u5CreateSave():{firstCatchComplete:false,sequence:0,appliedOps:[],active:null};
  var phase='idle',phaseTime=0,rewardFired=false,opCounter=0,operationAnchor=null,lastMessage=null,lastReward=null;

  function find(id){return family&&WorldV2Buildings.findPart(family,id);}
  function message(text){lastMessage=text;if(typeof UI!=='undefined'&&UI.chat)UI.chat(text,'plain');}
  function inventoryView(){
    return {slots:(Player.inv||[]).map(function(slot){return slot?slot.id:null;}),capacity:(Player.inv||[]).length||28};
  }
  function play(name,loop){
    if(!mixer||!clips[name])return null;
    Object.keys(actions).forEach(function(key){actions[key].stop();});
    var action=actions[name]||(actions[name]=mixer.clipAction(clips[name],family));
    action.reset();action.enabled=true;action.clampWhenFinished=!loop;
    action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);action.play();return action;
  }
  function bind(){
    if(typeof scene==='undefined'||typeof WorldV2Buildings==='undefined')return false;
    var next=scene.getObjectByName('world-object-holm_survival_workyard');
    if(next===root&&family)return true;
    if(root&&next!==root)interrupt(true);
    root=next||null;family=root&&WorldV2Buildings.findPart(root,'workyard_fishing_edge_u5_v1');
    mixer=null;actions={};clips={};
    if(!family)return false;
    WorldV2Buildings.dependencyAnimations('workyard_fishing_edge_u5_v1').forEach(function(clip){clips[clip.name]=clip;});
    ['FishingSpot_Idle','FishingSpot_Bite','FishingSpot_Catch'].forEach(function(name){
      if(!clips[name])throw new Error('[WorkyardFishingU5] missing animation '+name);
    });
    mixer=new THREE.AnimationMixer(family);phase='idle';phaseTime=0;play('FishingSpot_Idle',true);return true;
  }
  function apply(event){
    var out=u5Advance(txSave,event,inventoryView());txSave=out.save;
    out.effects.forEach(function(effect){
      if(effect.type==='reward'){
        if(Player.addItem(effect.id,effect.qty||1)){
          Player.addXp(effect.skill,effect.xp);lastReward=effect.opId;
          if(typeof Tutorial!=='undefined'&&Tutorial.notify)Tutorial.notify('gather','raw_perch');
          if(typeof Events!=='undefined'&&Events.emit)Events.emit('gather',{id:'raw_perch',qty:1,source:'workyard_fishing_edge_u5'});
          if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv();
          message('You sweep the small net beneath the ripple and catch a mirrorperch.');
          if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.fishCatch)SfxFurnishings.fishCatch();
          if(typeof SaveGame!=='undefined'&&SaveGame.save)SaveGame.save(true);
        }else message('The mirrorperch slips free while you rearrange your overstuffed pack.');
      }else if(effect.type==='message')message(effect.text);
    });
  }
  function begin(){
    if(!bind())return;
    if(phase!=='idle'){message('The shoal is already disturbed. Give the water a moment.');return;}
    var opId='u5-'+Date.now().toString(36)+'-'+(++opCounter);
    var out=u5BeginOperation(txSave,opId,inventoryView(),opId);txSave=out.save;
    if(!out.ok){
      message(out.reason==='requires small net'?'You need a Small net to fish here.':
        out.reason==='inventory full'?'You need a free inventory slot before casting the net.':'The fishing spot is already in use.');return;
    }
    var socket=find('fishing_operator_socket');operationAnchor=socket?socket.getWorldPosition(new THREE.Vector3()):null;
    phase='casting';phaseTime=0;rewardFired=false;play('FishingSpot_Idle',true);
    message('You lower the small net beside the quiet shoal.');
    if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.netCast)SfxFurnishings.netCast();
  }
  function operateFrom(){
    if(!bind())return;
    if(Player.usingItem!=='fishing_net'){
      message(Player.count('fishing_net')>0?'Click the Small net in your pack, then click the fishing water.':'You need a Small net before fishing here.');return;
    }
    Player.usingItem=null;if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv();
    var socket=find('fishing_operator_socket');if(!socket){message('The fishing approach is not ready.');return;}
    var target=socket.getWorldPosition(new THREE.Vector3());Player.action=null;Player.target=null;
    if(Math.hypot(player.position.x-target.x,player.position.z-target.z)<=1.15)begin();
    else Sched.walkThen(target,1.15,begin,'strong');
  }
  function interrupt(silent){
    if(txSave.active)txSave=u5Advance(txSave,'INTERRUPT',inventoryView()).save;
    phase='idle';phaseTime=0;rewardFired=false;operationAnchor=null;if(mixer)play('FishingSpot_Idle',true);
    if(!silent)message('You lift the net before the fish commit to their mistake.');
  }
  function update(dt){
    bind();if(!family||!mixer)return;mixer.update(dt);if(phase==='idle')return;
    phaseTime+=dt;
    if(operationAnchor&&txSave.active&&Math.hypot(player.position.x-operationAnchor.x,player.position.z-operationAnchor.z)>3.0){interrupt(false);return;}
    if(phase==='casting'&&phaseTime>=.55){apply('CAST_COMPLETE');phase='waiting';phaseTime=0;}
    else if(phase==='waiting'&&txSave.active&&phaseTime>=txSave.active.waitSeconds){apply('BITE');phase='bite';phaseTime=0;play('FishingSpot_Bite',false);
      if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.fishBite)SfxFurnishings.fishBite();}
    else if(phase==='bite'&&phaseTime>=FISHING_EDGE_U5_CONTRACT.clips.bite.seconds){apply('NET');phase='catching';phaseTime=0;rewardFired=false;play('FishingSpot_Catch',false);}
    else if(phase==='catching'){
      if(!rewardFired&&phaseTime>=FISHING_EDGE_U5_CONTRACT.clips.catch.seconds*FISHING_EDGE_U5_CONTRACT.clips.catch.rewardNormalized){rewardFired=true;apply('CATCH_COMPLETE');}
      if(phaseTime>=FISHING_EDGE_U5_CONTRACT.clips.catch.seconds){phase='settling';phaseTime=0;}
    }else if(phase==='settling'&&phaseTime>=.28){apply('SETTLED');phase='idle';phaseTime=0;operationAnchor=null;play('FishingSpot_Idle',true);}
  }
  function saveState(){return {version:1,firstCatchComplete:!!txSave.firstCatchComplete,sequence:txSave.sequence||0,
    appliedOps:(txSave.appliedOps||[]).slice(-32),active:txSave.active?Object.assign({},txSave.active):null};}
  function restoreState(raw){
    raw=raw||{};txSave={firstCatchComplete:!!raw.firstCatchComplete,sequence:Number(raw.sequence)||0,
      appliedOps:Array.isArray(raw.appliedOps)?raw.appliedOps.slice(-32):[],active:null};
    phase='idle';phaseTime=0;rewardFired=false;operationAnchor=null;if(mixer)play('FishingSpot_Idle',true);
  }
  function snapshot(){
    var operator=find('fishing_operator_socket'),water=find('water_surface_socket');
    var point=operator?operator.getWorldPosition(new THREE.Vector3()):null;
    return {ready:!!family,phase:phase,clipNames:Object.keys(clips).sort(),firstCatchComplete:!!txSave.firstCatchComplete,
      appliedOps:(txSave.appliedOps||[]).length,active:txSave.active?Object.assign({},txSave.active):null,lastReward:lastReward,
      lastMessage:lastMessage,operatorReady:!!operator,waterReady:!!water,operator:point?{x:+point.x.toFixed(2),z:+point.z.toFixed(2)}:null};
  }
  if(typeof Interact!=='undefined')Interact.register({target:'kind:holm_fishing_edge',option:'Net-fish',primary:true,
    handler:function(){operateFrom();}});
  return {update:update,begin:begin,interrupt:interrupt,saveState:saveState,restoreState:restoreState,snapshot:snapshot};
})();
