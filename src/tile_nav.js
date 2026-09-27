/* ============ TileNav — the tile grid the combat engine walks on (8 directions, 2004 rules) ============
 * One small adapter over the two walk models the client has, so combat (reach, approach, NPC steps) is written once:
 *   - Tutor's Holm island: the composed island graph (HolmIslandNav via HolmArrivalQA.navGraph()); a node is a
 *     stance {id, x, y, z, tx, tz, surface}; a step is a graph link (links are cardinal plus the diagonals
 *     HolmIslandNav adds when both orthogonal neighbours are linked, the 2004 rule);
 *   - everywhere else: the tile grid of computePath (CollisionGrid.canStep, else tileWalkable), where a node is a tile
 *     centre {tx, tz, x: tx + .5, z: tz + .5, y}. A diagonal step needs both orthogonal steps and both second legs
 *     open (2004: dx/dz collision on the two neighbours), exactly like computePath's 8-direction BFS.
 * Coordinates are world tiles; north is whatever +z is on the map (the rules only use Chebyshev distance).
 * Pure queries: nothing here moves anything except walkPlayerTo(). */
var TileNav=(function(){
 'use strict';
 var DIRS=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];   // rsmod BFS order: W, E, S, N, then diagonals
 function key(tx,tz){return tx+','+tz}
 /* ---------------------------------------------------------------- island ---------------------------------------- */
 function islandGraph(){
  try{if(typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active()&&typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.navGraph)return HolmArrivalQA.navGraph()}catch(e){}
  return null;
 }
 function island(){return !!islandGraph()}
 function tileOfNode(n){return {tx:Number.isInteger(n.tx)?n.tx:Math.floor(n.x),tz:Number.isInteger(n.tz)?n.tz:Math.floor(n.z)}}
 function inode(n){if(!n)return null;var t=tileOfNode(n);return {id:n.id,x:n.x,y:n.y,z:n.z,tx:t.tx,tz:t.tz,surface:n.surface,island:true}}
 function iNodeAt(g,tx,tz,y){
  var rows=g.byTile[key(tx,tz)];if(!rows||!rows.length)return null;
  if(rows.length===1||!Number.isFinite(y))return inode(rows[0]);
  var best=rows[0],bd=Infinity;for(var i=0;i<rows.length;i++){var d=Math.abs(rows[i].y-y);if(d<bd){bd=d;best=rows[i]}}return inode(best);
 }
 /* ---------------------------------------------------------------- grid ------------------------------------------ */
 function plane(){return (typeof Player!=='undefined'&&Player.plane)||0}
 function gy(tx,tz){
  var x=tx+.5,z=tz+.5,p=plane();
  if(p!==0&&typeof Planes!=='undefined')return Planes.elevAt(x,z,p);
  return typeof groundY==='function'?groundY(x,z):0;
 }
 function gnode(tx,tz){var y=gy(tx,tz);return {tx:tx,tz:tz,x:tx+.5,z:tz+.5,y:y===null?0:y,id:null,island:false}}
 function gridStep(fx,fz,dx,dz){   // one cardinal step
  var useGrid=typeof CollisionGrid!=='undefined'&&CollisionGrid.enabled&&CollisionGrid.baked&&plane()===0,ok;
  if(useGrid){var s=CollisionGrid.canStep(fx,fz,dx,dz);ok=s===null?(typeof tileWalkable==='function'?tileWalkable(fx+dx,fz+dz):true):s}
  else ok=typeof tileWalkable==='function'?tileWalkable(fx+dx,fz+dz):true;
  if(!ok)return false;
  if(typeof tileTransitionWalkable==='function'&&!tileTransitionWalkable(fx,fz,fx+dx,fz+dz))return false;
  return true;
 }
 function gridCanStep(fx,fz,dx,dz){
  if(dx===0||dz===0)return gridStep(fx,fz,dx,dz);
  // 2004 diagonal: both orthogonal neighbours open and both second legs open
  return gridStep(fx,fz,dx,0)&&gridStep(fx,fz,0,dz)&&gridStep(fx+dx,fz,0,dz)&&gridStep(fx,fz+dz,dx,0);
 }
 /* ---------------------------------------------------------------- common ---------------------------------------- */
 /** the node on tile (tx, tz) (island: the stance nearest height y), or null when nothing stands there */
 function nodeAt(tx,tz,y){
  var g=islandGraph();if(g)return iNodeAt(g,tx,tz,y);
  return gridStep(tx,tz,0,0)||(typeof tileWalkable==='function'&&tileWalkable(tx,tz))?gnode(tx,tz):null;
 }
 /** the node nearest a world point (search out to r tiles) */
 function nodeNear(x,y,z,r){
  var tx=Math.floor(x),tz=Math.floor(z),g=islandGraph(),best=null,bd=Infinity;r=r==null?3:r;
  for(var d=0;d<=r;d++){for(var i=-d;i<=d;i++)for(var j=-d;j<=d;j++){if(Math.max(Math.abs(i),Math.abs(j))!==d)continue;
    var n=g?iNodeAt(g,tx+i,tz+j,y):(typeof tileWalkable==='function'&&!tileWalkable(tx+i,tz+j)?null:gnode(tx+i,tz+j));
    if(!n)continue;var s=Math.hypot(n.x-x,n.z-z)+(Number.isFinite(y)?Math.abs(n.y-y)*2:0);if(s<bd){bd=s;best=n}}
   if(best)return best}
  return null;
 }
 /** the node one step (dx, dz) from `n`, or null when the step is blocked (8 directions, 2004 diagonal rule) */
 function step(n,dx,dz){
  if(!n||(dx===0&&dz===0))return null;
  if(n.island){var g=islandGraph();if(!g||!g.links[n.id])return null;
   var ls=g.links[n.id],best=null,bd=Infinity;
   for(var i=0;i<ls.length;i++){var m=g.byId[ls[i]];if(!m)continue;var t=tileOfNode(m);if(t.tx!==n.tx+dx||t.tz!==n.tz+dz)continue;var d=Math.abs(m.y-n.y);if(d<bd){bd=d;best=m}}
   return inode(best)}
  return gridCanStep(n.tx,n.tz,dx,dz)?gnode(n.tx+dx,n.tz+dz):null;
 }
 function neighbours(n){
  if(n&&n.island){var g=islandGraph();if(!g||!g.links[n.id])return [];var ls=g.links[n.id],o=[];for(var j=0;j<ls.length;j++){var q=g.byId[ls[j]];if(q)o.push(inode(q))}return o}   // every link (stairs and ladders too)
  var out=[];for(var i=0;i<8;i++){var m=step(n,DIRS[i][0],DIRS[i][1]);if(m)out.push(m)}return out}
 /** are two nodes one legal step apart? (melee reach across a fence or a wall edge fails here) */
 function linked(a,b){if(!a||!b)return false;var dx=b.tx-a.tx,dz=b.tz-a.tz;if(Math.abs(dx)>1||Math.abs(dz)>1)return false;var m=step(a,dx,dz);return !!m&&(m.id?m.id===b.id:(m.tx===b.tx&&m.tz===b.tz))}
 function nkey(n){return n.id||key(n.tx,n.tz)}
 /** breadth-first search (8 directions) from `start` to the first node for which goal(n) is true; returns the node
  *  list start..goal or null. `avoid(n)` excludes a node (the target's own tile, other NPCs). */
 function bfs(start,goal,opts){
  if(!start)return null;opts=opts||{};var max=opts.max||4096,avoid=opts.avoid;
  if(goal(start))return [start];
  var prev=Object.create(null),q=[start],head=0,seen=Object.create(null);seen[nkey(start)]=true;
  while(head<q.length&&head<max){var c=q[head++],ns=neighbours(c);
   for(var i=0;i<ns.length;i++){var m=ns[i],k=nkey(m);if(seen[k])continue;seen[k]=true;if(avoid&&avoid(m))continue;prev[k]=c;
    if(goal(m)){var out=[m],p=c;while(p){out.push(p);if(p===start)break;p=prev[nkey(p)]}return out.reverse()}
    q.push(m)}}
  return null;
 }
 /** line of sight between two tiles (projectiles): the flag grid's ray, endpoints never block */
 function los(a,b){if(typeof CollisionGrid==='undefined')return true;return CollisionGrid.hasLoS(a.tx+.5,a.tz+.5,b.tx+.5,b.tz+.5)}
 function cheb(a,b){return Math.max(Math.abs(a.tx-b.tx),Math.abs(a.tz-b.tz))}
 /** the player's LOGICAL tile: the stance they stand on or, mid-step, the stance the step ends on (2004: the
  *  position moves at the start of a step and the model catches up) */
 function playerNode(){
  if(typeof player==='undefined'||!player)return null;
  var g=islandGraph();
  if(g){try{var snap=HolmArrivalPlayer.snapshot?HolmArrivalPlayer.snapshot():null;
    if(snap&&snap.nodeId&&g.byId[snap.nodeId])return inode(g.byId[snap.nodeId]);
    var r=HolmArrivalPlayer.route?HolmArrivalPlayer.route():[];
    if(snap&&!snap.nodeId&&r&&r.length)return nodeNear(r[0].x,r[0].y,r[0].z,1)}catch(e){}
   return nodeNear(player.position.x,player.position.y,player.position.z,2)}
  if(typeof Player!=='undefined'&&Player.path&&Player.path.length){var w=Player.path[0];return gnode(Math.floor(w.x),Math.floor(w.z))}
  return gnode(Math.floor(player.position.x),Math.floor(player.position.z));
 }
 /** order the player to walk to a node (island: the graph follower; elsewhere: the tile planner) */
 function walkPlayerTo(n){
  if(!n)return false;
  if(n.island&&typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active())return !!HolmArrivalPlayer.order({x:n.x,y:n.y,z:n.z,surface:n.surface});
  if(typeof orderWalk==='function'&&typeof THREE!=='undefined'){orderWalk(new THREE.Vector3(n.x,n.y,n.z));return true}
  return false;
 }
 function stopPlayer(){if(typeof Player!=='undefined'){Player.moveTo=null;if(Player.path)Player.path=[]}}
 return {DIRS:DIRS,island:island,nodeAt:nodeAt,nodeNear:nodeNear,step:step,neighbours:neighbours,linked:linked,bfs:bfs,los:los,cheb:cheb,
  playerNode:playerNode,walkPlayerTo:walkPlayerTo,stopPlayer:stopPlayer,gridCanStep:gridCanStep,key:nkey};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TileNav;
