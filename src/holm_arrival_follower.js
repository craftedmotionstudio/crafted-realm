/* Pure cardinal surface follower; no scene, player, save or provider side effects.
 * speed is horizontal tiles/second (stairs use authored tread support heights).
 * update consumes at most .25 seconds and 64 edges; excess time is discarded,
 * never accumulated into a later teleport. stop/repath finish the occupied edge.
 * nodeId is null between nodes: only settled poses are checkpoint candidates. */
var HolmArrivalFollower=(function(){
 'use strict';
 var EPS=1e-9,MAX_DT=.25,MAX_EDGES=64;
 function create(options){
  var nav=options.navigation,getGraph=options.graphForDoors,speed=options.speed===undefined?2.2:options.speed;
  function need(ok,msg){if(!ok)throw Error('[HolmArrivalFollower] '+msg)}
  need(nav&&typeof nav.point==='function'&&typeof nav.edge==='function'&&typeof nav.route==='function'&&typeof getGraph==='function','navigation contract required');
  need(Number.isFinite(speed)&&speed>0,'positive finite speed required');
  function copyDoors(value){need(value&&typeof value.arrival==='boolean'&&typeof value.garden==='boolean','explicit boolean door states required');return {arrival:value.arrival,garden:value.garden}}
  function index(g){var by=Object.create(null);g.nodes.forEach(function(n){by[n.id]=n});return by}
  var doors=copyDoors(options.doors),graph=getGraph(copyDoors(doors)),nodes=index(graph),at=options.startNodeId,edge=null,path=[],pose;
  need(nodes[at]&&nav.support(nodes[at].surface,nodes[at].x,nodes[at].z,doors),'start must be a supported graph node');
  pose=nav.support(nodes[at].surface,nodes[at].x,nodes[at].z,doors);
  function snapshot(){return {x:pose.x,y:pose.y,z:pose.z,surface:pose.surface,nodeId:edge?null:at,moving:!!edge||path.length>0}}
  function order(id){
   if(typeof id!=='string'||!nodes[id])return false;
   var from=edge?edge.b.id:at,route=nav.route(graph,from,id);
   if(!route)return false;
   path=route.slice(1);return true;
  }
  function stop(){path=[];return snapshot()}
  function validEdge(a,b,g,ds){
   if(!a||!b||!g.links[a.id]||g.links[a.id].indexOf(b.id)<0)return false;
   var dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z);
   return Math.abs(dx+dz-1)<EPS&&(dx<EPS||dz<EPS)&&!!nav.edge(a,b,ds);
  }
  function setDoors(value){
   var next=copyDoors(value),g=getGraph(copyDoors(next)),by=index(g);
   // Door changes are atomic: never invalidate feet or any part of an occupied edge.
   if(edge){if(!by[edge.a.id]||!by[edge.b.id]||!validEdge(edge.a,edge.b,g,next)||!nav.point(edge.a,edge.b,edge.t,next))return false}
   else if(!by[at]||!nav.support(pose.surface,pose.x,pose.z,next))return false;
   doors=next;graph=g;nodes=by;
   // Keep the existing itinerary until its first invalid edge; no invented detour.
   var previous=edge?edge.b:nodes[at],keep=[];
   for(var i=0;i<path.length;i++){var n=nodes[path[i]];if(!validEdge(previous,n,graph,doors))break;keep.push(n.id);previous=n}
   path=keep;return true;
  }
  function update(dt){
   need(Number.isFinite(dt)&&dt>=0,'dt must be finite and nonnegative');
   var budget=speed*Math.min(dt,MAX_DT),steps=0;
   while(budget>EPS&&steps<MAX_EDGES){
    if(!edge){
     if(!path.length)break;
     var a=nodes[at],b=nodes[path[0]];
     if(!validEdge(a,b,graph,doors)){path=[];break}
     path.shift();edge={a:a,b:b,t:0};
    }
    // An occupied edge can only be changed through the rejecting setDoors API.
    var distance=Math.min(budget,1-edge.t),t=Math.min(1,edge.t+distance),p=nav.point(edge.a,edge.b,t,doors);
    need(p,'occupied navigation edge lost support');
    pose=p;edge.t=t;budget-=distance;
    if(t>=1-EPS){at=edge.b.id;pose=nav.point(edge.a,edge.b,1,doors);edge=null;steps++}
   }
   return snapshot();
  }
  function setSpeed(value){need(Number.isFinite(value)&&value>0,'positive finite speed required');speed=value}
  // read-only: the tiles still ahead (the occupied edge's far end, then the queued route), for the minimap route line
  function remaining(){var out=[];if(edge)out.push({x:edge.b.x,y:edge.b.y,z:edge.b.z});for(var i=0;i<path.length;i++){var n=nodes[path[i]];if(n)out.push({x:n.x,y:n.y,z:n.z})}return out}
  return {order:order,update:update,stop:stop,setDoors:setDoors,snapshot:snapshot,setSpeed:setSpeed,remaining:remaining};
 }
 return {create:create,MAX_DT:MAX_DT,MAX_EDGES:MAX_EDGES};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalFollower;
