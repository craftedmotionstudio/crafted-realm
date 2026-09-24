/* Isolated Studio interlock. Movement uses only the measured open-door graph. */
(function(root){
 'use strict';
 function create(data, navigation){
  if(data?.schema!=='holm-quest-door-v1'||data.modelSha256!==navigation.modelSha256)throw Error('Door evidence does not match navigation');
  const e=data.envelope,a=navigation.avatar;
  if(!e||!['centerX','centerZ','radius','minY','maxY'].every(k=>Number.isFinite(e[k]))||e.radius<=0||e.minY>e.maxY||!a||!Number.isFinite(a.radius)||!Number.isFinite(a.height)||!(a.radius>0)||!(a.height>0))throw Error('Invalid door clearance envelope');
  if(data.closedTimeSeconds!==0||data.openTimeSeconds!==navigation.doorPoseTimeSeconds||!(data.openTimeSeconds>0)||!data.clipName)throw Error('Door pose does not match measured route');
  const nodes=new Map(navigation.nodes.map(n=>[n.id,n]));
  const clear=id=>{const n=nodes.get(id);return !!n&&[n.x,n.z,n.capsuleBase].every(Number.isFinite)&&(n.capsuleBase>e.maxY+.01||n.capsuleBase+a.height+.015<e.minY-.01||Math.hypot(n.x-e.centerX,n.z-e.centerZ)>e.radius+a.radius+.01)};
  // Recalculate clearance; metadata cannot grant a stance that the envelope rejects.
  if(!Array.isArray(data.safeNodeIds)||data.safeNodeIds.some(id=>!clear(id)))throw Error('Invalid safe door stance');
  let phase='open',time=data.openTimeSeconds;
  return {
   get phase(){return phase}, get time(){return time}, get canWalk(){return phase==='open'}, clear,
   request(open,nodeId,moving){
    if(moving)return {ok:false,reason:'Finish walking before operating the door.'};
    if(phase==='opening'||phase==='closing')return {ok:false,reason:'Wait for the door to finish moving.'};
    if((open&&phase==='open')||(!open&&phase==='closed'))return {ok:true};
    if(!clear(nodeId))return {ok:false,reason:'Stand clear of the doorway before operating the door. Walk to the map table or outer approach.'};
    phase=open?'opening':'closing';return {ok:true};
   },
   tick(dt){
    if(!Number.isFinite(dt)||dt<0)throw Error('Invalid door time step');
    if(phase==='opening'){time=Math.min(data.openTimeSeconds,time+dt);if(time===data.openTimeSeconds)phase='open'}
    if(phase==='closing'){time=Math.max(0,time-dt);if(time===0)phase='closed'}
    return time;
   }
  };
 }
 if(typeof module==='object'&&module.exports)module.exports={create};else root.HolmQuestDoorState={create};
})(typeof globalThis==='object'?globalThis:this);
