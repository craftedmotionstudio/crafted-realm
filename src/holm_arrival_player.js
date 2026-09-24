/* Actual Player movement bridge. Inactive until a resident arrival provider
 * explicitly attaches at an already established, supported spawn/checkpoint. */
var HolmArrivalPlayer=(function(){
 'use strict';
 var Follower=typeof module!=='undefined'&&module.exports?require('./holm_arrival_follower'):HolmArrivalFollower;
 var session=null;
 function create(o){
  var actor=o.actor,state=o.state,doors={arrival:o.doors.arrival,garden:o.doors.garden};
  var follower=Follower.create({navigation:o.navigation,graphForDoors:o.graphForDoors,startNodeId:o.startNodeId,doors:doors,speed:state.moveSpeed()});
  var initial=follower.snapshot(),manualHeld=false;
  if(!actor||!actor.position||Math.hypot(actor.position.x-initial.x,actor.position.y-initial.y,actor.position.z-initial.z)>.00001)throw Error('[HolmArrivalPlayer] attach requires exact supported player stance');
  function pointTarget(p){
   if(!p||![p.x,p.y,p.z].every(Number.isFinite))return null;
   var rows=o.graphForDoors(doors).nodes.filter(function(n){return Math.floor(n.x)===Math.floor(p.x)&&Math.floor(n.z)===Math.floor(p.z)&&(!p.surface||p.surface===n.surface)&&Math.abs(n.y-p.y)<.8});
   rows.sort(function(a,b){return Math.abs(a.y-p.y)-Math.abs(b.y-p.y)});
   if(!rows.length||(rows.length>1&&Math.abs(Math.abs(rows[0].y-p.y)-Math.abs(rows[1].y-p.y))<1e-7))return null;
   return rows[0];
  }
  function order(point){
   var target=pointTarget(point);if(!target||!follower.order(target.id))return false;
   state.moveTo=actor.position.clone();state.moveTo.set(target.x,target.y,target.z);state.path=[];state._pathPartial=false;return true;
  }
  function stop(){follower.stop();state.moveTo=null;state.path=[]}
  function update(dt,input){
   input=input||{};var before=follower.snapshot(),keys=input.keys||{};
   // Keep queued cardinal routes intact while an authored door finishes its swing.
   if(o.canMove&&!o.canMove())return {moved:false,pose:before};
   var locked=!!input.locked||state.stunT>0;
   var f=locked?0:(keys.w?1:0)-(keys.s?1:0),r=locked?0:(keys.d?1:0)-(keys.a?1:0);
   if(locked){stop();return {moved:false,pose:before}}
   if(f||r){
    if(!manualHeld)stop();manualHeld=true;state.action=null;
    var yaw=Number.isFinite(input.yaw)?input.yaw:0,dx=-Math.sin(yaw)*f-Math.cos(yaw)*r,dz=-Math.cos(yaw)*f+Math.sin(yaw)*r;
    if(Math.abs(dx)>=Math.abs(dz)){dx=Math.sign(dx);dz=0}else{dz=Math.sign(dz);dx=0}
    if(before.nodeId){
     var graph=o.graphForDoors(doors),links=graph.links[before.nodeId]||[],next=graph.nodes.filter(function(n){return links.indexOf(n.id)>=0&&Math.abs(n.x-before.x-dx)<1e-7&&Math.abs(n.z-before.z-dz)<1e-7});
     if(next.length===1)order(next[0]);
    }
   }else if(manualHeld){stop();manualHeld=false}
   else if(!state.moveTo&&before.moving)follower.stop();
   follower.setSpeed(state.moveSpeed());var pose=follower.update(dt),moved=Math.hypot(pose.x-before.x,pose.y-before.y,pose.z-before.z)>1e-8;
   actor.position.set(pose.x,pose.y,pose.z);
   if(moved)actor.lookAt(pose.x+pose.x-before.x,pose.y,pose.z+pose.z-before.z);
   if(!pose.moving){state.moveTo=null;state.path=[]}
   return {moved:moved,pose:pose};
  }
  function setDoors(next){if(!follower.setDoors(next))return false;doors={arrival:next.arrival,garden:next.garden};return true}
  function replaceActor(next){
   var pose=follower.snapshot();
   if(!next||!next.position||Math.hypot(next.position.x-pose.x,next.position.y-pose.y,next.position.z-pose.z)>1e-5)throw Error('[HolmArrivalPlayer] replacement actor changed the supported stance');
   actor=next;
  }
  return {order:order,update:update,stop:stop,setDoors:setDoors,snapshot:follower.snapshot,replaceActor:replaceActor};
 }
 function active(){
  if(!session||typeof CRWorldMode==='undefined'||CRWorldMode.providerId!==session.providerId||typeof player==='undefined')return false;
  if(player!==session.actor){session.bridge.replaceActor(player);session.actor=player}
  return true;
 }
 function attach(options){
  if(typeof player==='undefined'||typeof Player==='undefined'||options.actor!==player||options.state!==Player||typeof CRWorldMode==='undefined'||CRWorldMode.providerId!==options.providerId)throw Error('[HolmArrivalPlayer] provider/player identity mismatch');
  if(session)throw Error('[HolmArrivalPlayer] detach previous owner first');
  var bridge=create(options);session={bridge:bridge,providerId:options.providerId,actor:options.actor};return bridge;
 }
 function detach(){if(session)session.bridge.stop();session=null}
 function update(dt){
  var controls=typeof Controls==='undefined'?null:Controls;
  return session.bridge.update(dt,{keys:controls&&!controls.chatting?controls.keys:{},yaw:typeof camCtl!=='undefined'?camCtl.yaw:0,locked:typeof CharCreator!=='undefined'&&CharCreator.active});
 }
 return {create:create,attach:attach,detach:detach,active:active,order:function(p){return session.bridge.order(p)},update:update};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalPlayer;
