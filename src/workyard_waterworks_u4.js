/* ================= WORKYARD U4 WATERWORKS =================
 * Live r128 integration for Claude's Blender-authored dock/pulley family.
 * The GLB owns geometry and motion; this module owns approach, state, timed
 * splash/audio cues, the atomic bucket swap, and save-safe interruption.
 */
var WorkyardWaterworksU4=(function(){
  'use strict';
  var root=null,family=null,mixer=null,actions={},clips={};
  var txSave=typeof u4CreateSave==='function'?u4CreateSave():{appliedOps:[],active:null};
  var phase='idle',phaseTime=0,contactFired=false,commitFired=false,opCounter=0;
  var effects=[],lastMessage=null,lastCommit=null,operationAnchor=null;

  function find(id){ return family&&WorldV2Buildings.findPart(family,id); }
  function inventoryView(){
    return {items:(Player.inv||[]).filter(Boolean).map(function(slot){return slot.id;})};
  }
  function play(name,loop){
    if(!mixer||!clips[name]) return null;
    Object.keys(actions).forEach(function(key){actions[key].stop();});
    var action=actions[name]||(actions[name]=mixer.clipAction(clips[name],family));
    action.reset();action.enabled=true;action.clampWhenFinished=!loop;
    action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);action.play();
    return action;
  }
  function message(text){ lastMessage=text; if(typeof UI!=='undefined'&&UI.chat) UI.chat(text,'plain'); }
  function bind(){
    if(typeof scene==='undefined'||typeof WorldV2Buildings==='undefined') return false;
    var next=scene.getObjectByName('world-object-holm_survival_workyard');
    if(next===root&&family) return true;
    if(root&&next!==root) interrupt(true);
    root=next||null;family=root&&WorldV2Buildings.findPart(root,'workyard_waterworks_u4_v1');
    mixer=null;actions={};clips={};
    if(!family) return false;
    var list=WorldV2Buildings.dependencyAnimations('workyard_waterworks_u4_v1');
    list.forEach(function(clip){clips[clip.name]=clip;});
    ['Pulley_Idle','Pulley_Lower','Pulley_Lift'].forEach(function(name){
      if(!clips[name]) throw new Error('[WorkyardWaterworksU4] missing animation '+name);
    });
    mixer=new THREE.AnimationMixer(family);phase='idle';phaseTime=0;play('Pulley_Idle',true);
    return true;
  }

  function effectOrigin(){
    var socket=find('water_contact_socket');
    return socket?socket.getWorldPosition(new THREE.Vector3()):null;
  }
  function splash(){
    var p=effectOrigin();if(!p||typeof scene==='undefined')return;
    // Lock the visual ripple to the live freshwater plane even if the socket
    // receives a later authoring nudge.
    p.y=typeof HOLM_POND_WATER_Y!=='undefined'?HOLM_POND_WATER_Y+.018:p.y;
    var group=new THREE.Group();group.name='workyard-waterworks-splash';group.position.copy(p);
    [0,.16].forEach(function(delay,index){
      var mat=new THREE.MeshBasicMaterial({color:index?0x9ed5df:0xd7f2e9,transparent:true,opacity:.72,
        side:THREE.DoubleSide,depthWrite:false});
      var ring=new THREE.Mesh(new THREE.RingGeometry(.10,.16,12),mat);
      ring.rotation.x=-Math.PI/2;ring.userData.delay=delay;group.add(ring);
    });
    for(var i=0;i<5;i++){
      var drop=new THREE.Mesh(new THREE.OctahedronGeometry(.035,0),
        new THREE.MeshBasicMaterial({color:0xbde8e9,transparent:true,opacity:.82,depthWrite:false}));
      var a=i*Math.PI*2/5;drop.position.set(Math.cos(a)*.10,.04,Math.sin(a)*.10);
      drop.userData.vx=Math.cos(a)*.24;drop.userData.vy=.38+(i%2)*.08;drop.userData.vz=Math.sin(a)*.24;
      group.add(drop);
    }
    scene.add(group);effects.push({group:group,age:0});
    if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.waterSplash)SfxFurnishings.waterSplash();
  }
  function updateEffects(dt){
    for(var i=effects.length-1;i>=0;i--){
      var fx=effects[i];fx.age+=dt;
      fx.group.children.forEach(function(child){
        if(child.geometry&&child.geometry.type==='RingGeometry'){
          var t=Math.max(0,fx.age-(child.userData.delay||0));
          child.visible=t>0;child.scale.setScalar(1+t*2.2);child.material.opacity=Math.max(0,.72-t*.75);
        }else{
          child.position.x+=(child.userData.vx||0)*dt;child.position.z+=(child.userData.vz||0)*dt;
          child.position.y+=(child.userData.vy||0)*dt;child.userData.vy=(child.userData.vy||0)-.92*dt;
          child.material.opacity=Math.max(0,.82-fx.age*.9);
        }
      });
      if(fx.age>1.0){
        scene.remove(fx.group);fx.group.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
        effects.splice(i,1);
      }
    }
  }

  function swapBucket(){
    var index=-1;
    for(var i=0;i<Player.inv.length;i++)if(Player.inv[i]&&Player.inv[i].id==='bucket'){index=i;break;}
    if(index<0)return false;
    var slot=Player.inv[index];
    if((slot.qty||1)>1){
      var empty=Player.inv.indexOf(null);if(empty<0)return false;
      Player.inv[index]={id:'bucket',qty:slot.qty-1};Player.inv[empty]={id:'bucket_water',qty:1};
    }else Player.inv[index]={id:'bucket_water',qty:1};
    if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv();
    return true;
  }
  function applyContract(event){
    var out=u4Advance(txSave,event,inventoryView());txSave=out.save;
    out.effects.forEach(function(effect){
      if(effect.type==='transaction'){
        if(swapBucket()){
          lastCommit=effect.opId;message('You crank the brimming bucket onto the ledge. It is now a bucket of water.');
        }else message('The bucket can no longer be filled safely.');
      }else if(effect.type==='message')message(effect.text);
    });
  }
  function begin(){
    if(!bind())return;
    if(phase!=='idle'){message('The pulley is already in motion.');return;}
    var opId='u4-'+Date.now().toString(36)+'-'+(++opCounter);
    var out=u4BeginOperation(txSave,opId,inventoryView());
    if(!out.ok){message(out.reason==='requires one empty bucket'?'You need an empty bucket before operating the pulley.':'The pulley is already in motion.');return;}
    var operator=find('pulley_operator_socket');
    operationAnchor=operator?operator.getWorldPosition(new THREE.Vector3()):null;
    txSave=out.save;phase='lowering';phaseTime=0;contactFired=false;commitFired=false;
    play('Pulley_Lower',false);
    if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.pulleyCreak)SfxFurnishings.pulleyCreak('lower');
  }
  function operateFrom(obj){
    if(!bind())return;
    var socket=find('pulley_operator_socket');
    if(!socket){message('The pulley approach is not ready.');return;}
    var target=socket.getWorldPosition(new THREE.Vector3());
    if(Math.hypot(player.position.x-target.x,player.position.z-target.z)<=1.25)begin();
    else Sched.walkThen(target,1.25,begin,'strong');
  }
  function interrupt(silent){
    if(txSave.active)txSave=u4Advance(txSave,'INTERRUPT',inventoryView()).save;
    phase='idle';phaseTime=0;contactFired=false;commitFired=false;operationAnchor=null;
    if(mixer)play('Pulley_Idle',true);
    if(!silent)message('You release the crank. The lesson bucket returns to its rest.');
  }
  function update(dt){
    bind();updateEffects(dt);
    if(!family||!mixer)return;
    mixer.update(dt);
    if(phase==='idle')return;
    phaseTime+=dt;
    if(operationAnchor&&txSave.active&&txSave.active.state!=='settling'){
      if(Math.hypot(player.position.x-operationAnchor.x,player.position.z-operationAnchor.z)>3.2){interrupt(false);return;}
    }
    if(phase==='lowering'){
      if(!contactFired&&phaseTime>=WATERWORKS_U4_CONTRACT.clips.lower.seconds*WATERWORKS_U4_CONTRACT.clips.lower.waterContactNormalized){
        contactFired=true;splash();applyContract('WATER_CONTACT');
      }
      if(phaseTime>=WATERWORKS_U4_CONTRACT.clips.lower.seconds){
        applyContract('LIFT');phase='lifting';phaseTime=0;play('Pulley_Lift',false);
        if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.pulleyCreak)SfxFurnishings.pulleyCreak('raise');
      }
    }else if(phase==='lifting'){
      if(!commitFired&&phaseTime>=WATERWORKS_U4_CONTRACT.clips.lift.seconds*WATERWORKS_U4_CONTRACT.clips.lift.commitNormalized){
        commitFired=true;applyContract('LIFT_COMPLETE');
      }
      if(phaseTime>=WATERWORKS_U4_CONTRACT.clips.lift.seconds){
        phase='settling';phaseTime=0;
        if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.bucketSettle)SfxFurnishings.bucketSettle();
      }
    }else if(phase==='settling'&&phaseTime>=.32){
      applyContract('SETTLED');phase='idle';phaseTime=0;operationAnchor=null;play('Pulley_Idle',true);
    }
  }
  function saveState(){
    return {version:1,appliedOps:(txSave.appliedOps||[]).slice(),active:txSave.active?Object.assign({},txSave.active):null};
  }
  function restoreState(raw){
    raw=raw||{};txSave={appliedOps:Array.isArray(raw.appliedOps)?raw.appliedOps.slice(-32):[],active:null};
    // A reload is an interruption. Pre-commit operations pay nothing; already
    // committed operation ids remain banked and cannot replay a reward.
    phase='idle';phaseTime=0;contactFired=false;commitFired=false;operationAnchor=null;if(mixer)play('Pulley_Idle',true);
  }
  function snapshot(){
    var operator=find('pulley_operator_socket'),water=find('water_contact_socket');
    var operatorPoint=operator?operator.getWorldPosition(new THREE.Vector3()):null;
    return {ready:!!family,phase:phase,clipNames:Object.keys(clips).sort(),
      appliedOps:(txSave.appliedOps||[]).length,active:txSave.active?Object.assign({},txSave.active):null,
      lastCommit:lastCommit,lastMessage:lastMessage,effects:effects.length,
      operatorReady:!!operator,operator:operatorPoint?{x:+operatorPoint.x.toFixed(2),z:+operatorPoint.z.toFixed(2)}:null,
      operationAnchor:operationAnchor?{x:+operationAnchor.x.toFixed(2),z:+operationAnchor.z.toFixed(2)}:null,
      operatorDistance:operatorPoint?+Math.hypot(player.position.x-operatorPoint.x,player.position.z-operatorPoint.z).toFixed(2):null,
      waterContactReady:!!water,
      waterLevel:typeof HOLM_POND_WATER_Y!=='undefined'?HOLM_POND_WATER_Y:null};
  }

  if(typeof Interact!=='undefined')Interact.register({
    target:'kind:holm_waterworks_pulley',option:'Operate',primary:true,
    handler:function(ctx){operateFrom(ctx.obj);}
  });
  return {update:update,begin:begin,interrupt:interrupt,saveState:saveState,restoreState:restoreState,snapshot:snapshot};
})();
