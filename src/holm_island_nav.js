/* Tutor's Holm island navigation composer (finish goal M4.1, on the Sept 13 overhaul base).
 * One cardinal walk graph for the whole 144x128 island, satisfying the arrival follower's navigation contract
 * ({compile(doors), route, support, point, edge}) so the existing HolmArrivalFollower/HolmArrivalPlayer drive it:
 *  - land: every dry tile centre of the terrain bundle (surface 'land'), height from the terrain sample;
 *  - the arrival house + approach + dock graph (HolmArrivalDock) owns its tiles and its two doors;
 *  - Blender-measured building graphs (holm-keep-navigation-v1: keep, bakehouse, lodge) are placed in world
 *    space and own every tile of their measured patch; patch tiles they did not find walkable stay blocked;
 *  - bridges add deck tiles over water; blockers (tree trunks, statue, rocks) refuse the tiles they cover;
 *  - owners join where two open-ground nodes sit on cardinal neighbours within one step of height.
 * Pure data: no scene, player or save access. Coordinates are world tiles; node ids are unique across owners. */
var HolmIslandNav=(function(){
 'use strict';
 var common=typeof module!=='undefined'&&module.exports;
 var Terrain=common?require('./holm_overhaul_terrain'):HolmOverhaulTerrain;
 var LAND_STEP=.9,SEAM_STEP=.6,EPS=1e-9;
 function need(ok,msg){if(!ok)throw Error('[HolmIslandNav] '+msg)}
 function key(x,z){return x+','+z}
 function doorKey(d){return (d.arrival?'open':'closed')+'-'+(d.garden?'open':'closed')}
 function openGround(surface){return surface==='land'||surface==='exterior'||surface==='dock'||surface==='deck'||/:(?:IslandTerrain|StagedTerrain)$/.test(surface)}
 function create(input){
  need(input&&input.terrain&&input.terrain.schema==='holm-overhaul-terrain-bundle-v1','terrain bundle required');
  var T=input.terrain,W=T.width,D=T.depth,arrival=input.arrival||null,owned=Object.create(null),blocked=Object.create(null);
  function sample(x,z){return Terrain.sample(T,x,z)}
  function wet(x,z){return x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0}
  (input.blockers||[]).forEach(function(b){
   need([b.x0,b.x1,b.z0,b.z1].every(Number.isFinite)&&b.x0<b.x1&&b.z0<b.z1,'invalid blocker');
   // 'centre' (default) blocks the tiles whose centre it covers; 'overlap' blocks every tile it touches (tree trunks
   // planted on tile corners would otherwise block nothing)
   for(var z=Math.floor(b.z0);z<=Math.floor(b.z1-EPS);z++)for(var x=Math.floor(b.x0);x<=Math.floor(b.x1-EPS);x++)
    if(b.mode==='overlap'||(x+.5>b.x0&&x+.5<b.x1&&z+.5>b.z0&&z+.5<b.z1))blocked[key(x,z)]=b.id||true;
  });
  // ---- progress gates (M5.2b, 2004 Tutorial Island style): a building's doorway tiles stay shut until its gate is
  // opened by the lesson before it. Gates only ever open; the cache key carries the open set. ----
  var gateAt=Object.create(null),openGates=Object.create(null);
  (input.gates||[]).forEach(function(g){need(g&&typeof g.id==='string'&&typeof g.building==='string'&&Array.isArray(g.tiles)&&g.tiles.length,'invalid gate');
   g.tiles.forEach(function(t){need(Number.isInteger(t[0])&&Number.isInteger(t[1]),'gate tiles are integers');gateAt[key(t[0],t[1])]={id:g.id,building:g.building}})});
  function gateKey(){return Object.keys(openGates).filter(function(k){return openGates[k]}).sort().join(',')}
  function setGates(open){var changed=false;Object.keys(open||{}).forEach(function(k){if(open[k]&&!openGates[k]){openGates[k]=true;changed=true}});return changed}
  function shut(n,b){var g=gateAt[key(n.tx,n.tz)];return !!(g&&g.building===b.id&&!openGates[g.id])}
  // ---- Blender building graphs, placed in world space ----
  var buildings=(input.buildings||[]).map(function(b){
   var g=b.graph,o=b.placement||g.placement||g.origin;
   need(g&&g.schema==='holm-keep-navigation-v1'&&Array.isArray(g.nodes)&&g.links&&typeof b.id==='string','building '+b.id+' needs a measured graph');
   need(o&&[o.x,o.y,o.z].every(Number.isFinite)&&Number.isInteger(o.x)&&Number.isInteger(o.z),'building '+b.id+' needs an integer placement');
   var nodes=g.nodes.map(function(n){
    var wx=n.x+o.x,wz=n.z+o.z,y=(Number.isFinite(n.capsuleBase)?n.capsuleBase:n.y)+o.y;
    return {id:'b:'+b.id+':'+n.id,local:n.id,building:b.id,surface:'b:'+b.id+':'+n.id.split(':')[2]+':'+n.surface,x:wx,y:y,z:wz,tx:Math.floor(wx),tz:Math.floor(wz)};
   });
   var tiles=Object.create(null);nodes.forEach(function(n){tiles[key(n.tx,n.tz)]=true});
   // the measured patch: every tile inside the node bounds belongs to this building (walkable or not)
   var x0=Math.min.apply(null,nodes.map(function(n){return n.tx})),x1=Math.max.apply(null,nodes.map(function(n){return n.tx}));
   var z0=Math.min.apply(null,nodes.map(function(n){return n.tz})),z1=Math.max.apply(null,nodes.map(function(n){return n.tz}));
   return {id:b.id,graph:g,origin:o,nodes:nodes,tiles:tiles,rect:{x0:x0,x1:x1,z0:z0,z1:z1},priority:b.priority||0};
  });
  // Where measured patches overlap, the smaller patch claims first: it belongs to the building standing there
  // (the lodge's patch carries a long terrain lane that reaches the quarry's approach).
  buildings.slice().sort(function(a,b){return (a.rect.x1-a.rect.x0+1)*(a.rect.z1-a.rect.z0+1)-(b.rect.x1-b.rect.x0+1)*(b.rect.z1-b.rect.z0+1)||(a.id<b.id?-1:1)})
   .forEach(function(b){for(var z=b.rect.z0;z<=b.rect.z1;z++)for(var x=b.rect.x0;x<=b.rect.x1;x++){var k=key(x,z);if(!owned[k])owned[k]='b:'+b.id}});
  // ---- arrival: its approach/dock/house tiles, all door states, plus the house footprint ----
  var arrivalGraphs=Object.create(null);
  function arrivalGraph(d){var k=doorKey(d);return arrivalGraphs[k]||(arrivalGraphs[k]=arrival.compile({arrival:!!d.arrival,garden:!!d.garden}))}
  if(arrival){
   need(typeof arrival.compile==='function'&&typeof arrival.support==='function'&&typeof arrival.point==='function','arrival navigation contract required');
   [[0,0],[1,0],[0,1],[1,1]].forEach(function(s){arrivalGraph({arrival:!!s[0],garden:!!s[1]}).nodes.forEach(function(n){owned[key(Math.floor(n.x),Math.floor(n.z))]='arrival'})});
   (input.arrivalFootprints||[]).forEach(function(r){for(var z=r.z0;z<r.z1;z++)for(var x=r.x0;x<r.x1;x++)owned[key(x,z)]='arrival'});
  }
  // ---- bridges: deck tiles over the water, level at deckY ----
  var decks=Object.create(null);
  (input.bridges||[]).forEach(function(br){
   need(typeof br.id==='string'&&Array.isArray(br.tiles)&&br.tiles.length&&Number.isFinite(br.deckY),'invalid bridge');
   br.tiles.forEach(function(t){need(Number.isInteger(t[0])&&Number.isInteger(t[1]),'bridge tiles are integers');decks[key(t[0],t[1])]={bridge:br.id,y:br.deckY}});
  });
  // ---- land nodes ----
  var land=[];
  for(var z=0;z<D;z++)for(var x=0;x<W;x++){
   var k=key(x,z);
   // a bridge deck is always the island's own crossing, even where a building's measured patch reaches over it
   if(decks[k]&&!blocked[k]){owned[k]=null;land.push({id:'deck:'+k,surface:'deck',x:x+.5,y:decks[k].y,z:z+.5,tx:x,tz:z});continue}
   if(owned[k]||blocked[k])continue;
   if(decks[k]){land.push({id:'deck:'+k,surface:'deck',x:x+.5,y:decks[k].y,z:z+.5,tx:x,tz:z});continue}
   if(wet(x,z))continue;
   land.push({id:'land:'+k,surface:'land',x:x+.5,y:sample(x+.5,z+.5),z:z+.5,tx:x,tz:z});
  }
  function landEdge(a,b){
   if(a.surface==='deck'||b.surface==='deck')return Math.abs(a.y-b.y)<=SEAM_STEP+EPS;
   return Math.abs(a.y-b.y)<=LAND_STEP+EPS;   // both tiles are dry by construction; the rise is the only rule
  }
  var cache=Object.create(null);
  function compile(doors){
   doors=doors||{arrival:false,garden:false};var dk=doorKey(doors)+'|'+gateKey();if(cache[dk])return cache[dk];
   var nodes=[],links=Object.create(null),byTile=Object.create(null),by=Object.create(null);
   function add(n,owner){n.owner=owner;nodes.push(n);by[n.id]=n;links[n.id]=[];var k=key(n.tx,n.tz);(byTile[k]=byTile[k]||[]).push(n)}
   function link(a,b){if(links[a.id].indexOf(b.id)<0){links[a.id].push(b.id);links[b.id].push(a.id)}}
   land.forEach(function(n){add(n,'land')});
   // Blender patches measured the carved creek bed as walkable terrain (the water surface was not in their
   // collision set): terrain stances on water tiles are dropped, so every owner obeys the same water rule.
   buildings.forEach(function(b){b.nodes.forEach(function(n){var k=key(n.tx,n.tz);
    if(owned[k]==='b:'+b.id&&!blocked[k]&&!shut(n,b)&&!(openGround(n.surface)&&wet(n.tx,n.tz)&&!decks[k]))add(n,'b:'+b.id)})});
   if(arrival){var ag=arrivalGraph(doors);ag.nodes.forEach(function(n){add({id:n.id,surface:n.surface,x:n.x,y:n.y,z:n.z,tx:Math.floor(n.x),tz:Math.floor(n.z),arrival:true},'arrival')});
    Object.keys(ag.links).forEach(function(id){ag.links[id].forEach(function(t){if(by[id]&&by[t])link(by[id],by[t])})})}
   // land-land cardinal links
   nodes.forEach(function(n){if(n.owner!=='land')return;[[1,0],[0,1]].forEach(function(d){
    (byTile[key(n.tx+d[0],n.tz+d[1])]||[]).forEach(function(m){if(m.owner==='land'&&landEdge(n,m))link(n,m)});
   })});
   // building-internal links (measured), only between kept nodes
   buildings.forEach(function(b){Object.keys(b.graph.links).forEach(function(lid){var a=by['b:'+b.id+':'+lid];if(!a)return;
    b.graph.links[lid].forEach(function(t){var c=by['b:'+b.id+':'+t];if(c)link(a,c)})})});
   // seams: open ground of different owners on cardinal neighbours within one step
   nodes.forEach(function(n){if(!openGround(n.surface))return;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
    (byTile[key(n.tx+d[0],n.tz+d[1])]||[]).forEach(function(m){if(m.owner!==n.owner&&openGround(m.surface)&&Math.abs(m.y-n.y)<=SEAM_STEP+EPS)link(n,m)});
   })});
   return (cache[dk]={schema:'holm-island-graph-v1',nodes:nodes,links:links,byId:by,byTile:byTile});
  }
  function route(graph,start,goal){
   if(!graph.links[start]||!graph.links[goal])return null;if(start===goal)return [start];
   var prev=Object.create(null),q=[start],head=0;prev[start]=null;
   while(head<q.length){var c=q[head++];if(c===goal)break;var ls=graph.links[c];for(var i=0;i<ls.length;i++)if(!(ls[i] in prev)){prev[ls[i]]=c;q.push(ls[i])}}
   if(!(goal in prev))return null;var out=[];for(var p=goal;p!==null;p=prev[p])out.push(p);return out.reverse();
  }
  function profileOf(a,b){
   if(!a.building||a.building!==b.building)return null;var g=buildings.find(function(x){return x.id===a.building}),pr=g.graph.profiles||{};
   var f=pr[a.local+'|'+b.local],r=pr[b.local+'|'+a.local];if(!f&&!r)return null;
   var o=g.origin,rows=(f||r.slice().reverse()).map(function(p){return {x:p.x+o.x,y:(Number.isFinite(p.capsuleBase)?p.capsuleBase:p.y)+o.y,z:p.z+o.z}});return rows;
  }
  function nodeAt(surface,x,z,doors){
   var g=compile(doors),rows=g.byTile[key(Math.floor(x),Math.floor(z))]||[];
   for(var i=0;i<rows.length;i++)if(rows[i].surface===surface)return rows[i];return null;
  }
  function support(surface,x,z,doors){
   if(arrival&&!/^(?:land|deck|b:)/.test(surface)){var s=arrival.support(surface,x,z,doors);if(s)return s}
   var n=nodeAt(surface,x,z,doors);return n?{surface:n.surface,x:n.x,y:n.y,z:n.z}:null;
  }
  function point(a,b,t,doors){
   if(a.arrival&&b.arrival)return arrival.point(a,b,t,doors);
   var x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y,surface=t<.5?a.surface:b.surface,pr=profileOf(a,b);
   if(pr&&pr.length>1){var f=t*(pr.length-1),i=Math.min(pr.length-2,Math.floor(f)),u=f-i;y=pr[i].y+(pr[i+1].y-pr[i].y)*u}
   else if(a.surface==='land'&&b.surface==='land')y=sample(x,z);
   else y=a.y+(b.y-a.y)*t;
   return {surface:surface,x:x,y:y,z:z};
  }
  function edge(a,b,doors){var g=compile(doors);return !!(g.links[a.id]&&g.links[a.id].indexOf(b.id)>=0)}
  function stats(doors){var g=compile(doors),e=0;Object.keys(g.links).forEach(function(k){e+=g.links[k].length});var own={};g.nodes.forEach(function(n){own[n.owner]=(own[n.owner]||0)+1});return {nodes:g.nodes.length,edges:e/2,owners:own}}
  return {compile:compile,route:route,support:support,point:point,edge:edge,stats:stats,height:function(x,z){return sample(x,z)},setGates:setGates,gateKey:gateKey};
 }
 // A plan crossing (concept x/z + orientation) becomes deck tiles: snap along its axis to the nearest creek tile
 // (within 4), span every wet tile to dry land both sides; the deck sits b.rise (default .2) above the higher bank.
 function bridgeFrom(T,b){
  var W=T.width,wet=function(x,z){return T.water[z*W+x]!==0},dx=b.orientation==='EW'?1:0,dz=dx?0:1,x=b.x,z=b.z;
  if(!wet(x,z)){var hit=[1,-1,2,-2,3,-3,4,-4].map(function(o){return [b.x+dx*o,b.z+dz*o]}).filter(function(p){return wet(p[0],p[1])})[0];
   need(hit,'bridge '+b.label+' has no creek within 4 tiles along its axis');x=hit[0];z=hit[1]}
  var tiles=[[x,z]];
  [-1,1].forEach(function(s){var cx=x+dx*s,cz=z+dz*s;while(wet(cx,cz)){tiles.push([cx,cz]);cx+=dx*s;cz+=dz*s}});
  tiles.sort(function(p,q){return p[0]-q[0]||p[1]-q[1]});
  var a=tiles[0],c=tiles[tiles.length-1],ends=[[a[0]-dx,a[1]-dz],[c[0]+dx,c[1]+dz]];
  var endY=ends.map(function(e){return +Terrain.sample(T,e[0]+.5,e[1]+.5).toFixed(3)});
  return {id:b.label.replace(/\W+/g,'_').toLowerCase(),label:b.label,orientation:b.orientation,tiles:tiles,ends:ends,endY:endY,deckY:+(Math.max(endY[0],endY[1])+(Number.isFinite(b.rise)?b.rise:.2)).toFixed(3)};   // lifted clear of the water, within one seam step of both banks
 }
 // Island stance checkpoints (the arrival checkpoint only knows its own graph and five surfaces): a settled node
 // of the composed graph, its exact stance, and a strict revision.
 var CHECKPOINT='holm-island-checkpoint-v1';
 function nodeOf(graph,id){need(graph&&graph.schema==='holm-island-graph-v1'&&graph.byId,'invalid island graph');need(typeof id==='string'&&graph.byId[id],'unknown node');return graph.byId[id]}
 function encodeCheckpoint(graph,nodeId,revision){
  need(typeof revision==='string'&&revision.length>0,'invalid revision');var n=nodeOf(graph,nodeId);
  return {schema:CHECKPOINT,version:1,revision:revision,nodeId:n.id,surface:n.surface,x:n.x,y:n.y,z:n.z};
 }
 function restoreCheckpoint(graph,record,revision){
  need(record&&record.schema===CHECKPOINT&&record.version===1,'invalid checkpoint schema/version');need(record.revision===revision,'stale checkpoint revision');
  var n=nodeOf(graph,record.nodeId);need(record.surface===n.surface&&Math.abs(record.x-n.x)<1e-9&&Math.abs(record.y-n.y)<1e-9&&Math.abs(record.z-n.z)<1e-9,'checkpoint stance mismatch');
  return n;
 }
 return {create:create,bridgeFrom:bridgeFrom,encodeCheckpoint:encodeCheckpoint,restoreCheckpoint:restoreCheckpoint,LAND_STEP:LAND_STEP,SEAM_STEP:SEAM_STEP};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandNav;
