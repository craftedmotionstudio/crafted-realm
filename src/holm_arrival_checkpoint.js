/* Pure arrival stance checkpoints. No storage, Player, or scene access.
 * Call only after reaching a graph node (tile centre). Choosing when/how to save
 * during an edge traversal is deliberately deferred to the integrating caller.
 * Revision is a nonempty string or positive safe integer, compared strictly.
 */
var HolmArrivalCheckpoint=(function(){
 'use strict';
 var SCHEMA='holm-arrival-checkpoint-v1';
 function need(ok,message){if(!ok)throw Error('[HolmArrivalCheckpoint] '+message)}
 function revisionValid(revision){return typeof revision==='string'?revision.trim().length>0:Number.isSafeInteger(revision)&&revision>0}
 function node(graph,nodeId){
  need(graph&&graph.schema==='holm-arrival-graph-v1'&&graph.version===1&&Array.isArray(graph.nodes),'invalid graph');
  need(typeof nodeId==='string'&&nodeId.length>0,'invalid node id');
  var matches=graph.nodes.filter(function(n){return n&&n.id===nodeId});
  need(matches.length===1,'unknown or duplicate node');
  var n=matches[0];
  need(['ground','upper','stair','exterior','dock'].indexOf(n.surface)>=0,'invalid surface');
  need([n.x,n.y,n.z].every(Number.isFinite),'nonfinite node coordinates');
  need(Number.isSafeInteger(n.x-.5)&&Number.isSafeInteger(n.z-.5),'node is not a tile centre');
  need(n.id===n.surface+':'+Math.floor(n.x)+','+Math.floor(n.z),'node identity mismatch');
  need(graph.links&&Object.prototype.hasOwnProperty.call(graph.links,n.id)&&Array.isArray(graph.links[n.id]),'node missing from graph links');
  return {id:n.id,surface:n.surface,x:n.x,y:n.y,z:n.z};
 }
 function encode(graph,nodeId,revision){
  need(revisionValid(revision),'invalid revision');
  var n=node(graph,nodeId);
  return {schema:SCHEMA,version:1,revision:revision,nodeId:n.id,surface:n.surface,x:n.x,y:n.y,z:n.z};
 }
 function restore(graph,record,revision){
  need(revisionValid(revision),'invalid revision');
  need(record&&record.schema===SCHEMA&&record.version===1,'invalid checkpoint schema/version');
  need(record.revision===revision,'stale checkpoint revision');
  need([record.x,record.y,record.z].every(Number.isFinite),'nonfinite checkpoint coordinates');
  var n=node(graph,record.nodeId);
  need(record.surface===n.surface&&record.x===n.x&&record.y===n.y&&record.z===n.z,'checkpoint stance mismatch');
  return n;
 }
 // Small boot gate: preserves explicit surface identity without any game state.
 var fixture={schema:'holm-arrival-graph-v1',version:1,nodes:[{id:'upper:0,0',surface:'upper',x:.5,y:2.8,z:.5}],links:{'upper:0,0':[]}};
 need(restore(fixture,encode(fixture,'upper:0,0',1),1).surface==='upper','boot roundtrip');
 var rejected=false;try{restore(fixture,encode(fixture,'upper:0,0',1),2)}catch(e){rejected=true}
 need(rejected,'boot revision rejection');
 if(typeof console!=='undefined')console.log('[HOLM_ARRIVAL_CHECKPOINT] 2/2 boot acceptance ok');
 return {encode:encode,restore:restore};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalCheckpoint;
