/* Rebuilt lodge service identity and measured approach data; no progression effects. */
var HolmLodgeServiceBindings=(function(){
 'use strict';
 var model='a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324';
 var rows=[
  {id:'holm_quest_lodge.quest_board',partId:'quest_board',kind:'holm_quest_board',prefix:'Lodge_FurnishingBoard_',targetId:'board',expected:[-3.5,0,2.5],label:'Quest board'},
  {id:'holm_quest_lodge.region_map',partId:'region_map',kind:'holm_region_map',prefix:'Lodge_FurnishingMap_',targetId:'map',expected:[2.5,0,1.5],label:'Region chart'}
 ];
 function create(data,names){
  if(data.modelSha256!==model)throw Error('Lodge service model drift');
  var result=rows.map(function(row){
   var target=data.targets.filter(function(t){return t.id===row.targetId;});
   if(target.length!==1||!target[0].reachable)throw Error('Missing reachable service target '+row.id);
   var node=data.nodes.filter(function(n){return n.id===target[0].nodeId;});
   if(node.length!==1||![node[0].x,node[0].y,node[0].z].every(function(v,i){return Number.isFinite(v)&&Math.abs(v-row.expected[i])<0.00002;}))throw Error('Wrong service floor '+row.id);
   var parts=names.filter(function(n){return n.indexOf(row.prefix)===0;});
   if(!parts.length)throw Error('Missing authored service meshes '+row.id);
   return Object.freeze(Object.assign({},row,{expected:Object.freeze(row.expected.slice()),nodeId:node[0].id,local:Object.freeze([node[0].x,node[0].y,node[0].z]),meshNames:Object.freeze(parts)}));
  });
  return Object.freeze({services:Object.freeze(result),find:function(name){return result.find(function(r){return r.meshNames.indexOf(name)>=0;})||null;}});
 }
 return {create:create};
})();
if(typeof module!=='undefined')module.exports=HolmLodgeServiceBindings;
