/* Tutor's Holm island navigation composer (finish goal M4.1, on the Sept 13 overhaul base).
 * One walk graph (cardinal links plus 2004-rule diagonals) for the whole 144x128 island, satisfying the arrival follower's navigation contract
 * ({compile(doors), route, support, point, edge}) so the existing HolmArrivalFollower/HolmArrivalPlayer drive it:
 *  - land: every dry tile centre of the terrain bundle (surface 'land'), height from the terrain sample;
 *  - the arrival house + approach + dock graph (HolmArrivalDock) owns its tiles and its two doors;
 *  - Blender-measured building graphs (holm-keep-navigation-v1: keep, bakehouse, lodge) are placed in world
 *    space and own every tile of their measured patch; patch tiles they did not find walkable stay blocked;
 *  - bridges add deck tiles over water; blockers (tree trunks, statue, rocks) refuse the tiles they cover;
 *  - water is the bundle's mask plus the creek banks under the creek's water line (creekBank, 2026-09-25);
 *  - owners join where two open-ground nodes sit on cardinal neighbours within one step of height.
 * Pure data: no scene, player or save access. Coordinates are world tiles; node ids are unique across owners. */
var HolmIslandNav=(function(){
 'use strict';
 var common=typeof module!=='undefined'&&module.exports;
 var Terrain=common?require('./holm_overhaul_terrain'):HolmOverhaulTerrain;
 var LAND_STEP=.9,SEAM_STEP=.6,EPS=1e-9;
 function need(ok,msg){if(!ok)throw Error('[HolmIslandNav] '+msg)}
 // ---- creek banks under the water line (owner play-test 2026-09-25) ----
 // The terrain carves the creek channel to the creek's authored water line well past creek.halfWidth (the bed lies
 // `depth` under the line out to halfWidth, the bank climbs to a lip .3 over it at halfWidth+bankWidth/2), but the
 // bundle's water mask only flags tile centres within halfWidth. The drawn creek (HolmArrivalWater.surface) fills the
 // channel to its bank, so a tile inside the channel whose centre ground, as walked (bilinear) or as drawn (the tile's
 // split diagonal), stands under the water line (+BANK_CLEAR) is water as well: nobody wades, bridges span the channel.
 var BANK_CLEAR=.05;
 function creekLevel(c,x,z){
  var best=Infinity,level=null;
  for(var i=1;i<c.points.length;i++){var a=c.points[i-1],b=c.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
   var d=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);if(d<best){best=d;level=a[2]+(b[2]-a[2])*t}}
  return best<=c.halfWidth+c.bankWidth/2?level:null;
 }
 function drawnCentre(T,x,z){var s=T.width+1,h=T.heights;return (x+z)&1?(h[z*s+x]+h[(z+1)*s+x+1])/2:(h[z*s+x+1]+h[(z+1)*s+x])/2}
 function creekBank(T,x,z){
  var c=T.creek;if(!c||!Array.isArray(c.points)||c.points.length<2||!(c.halfWidth>0)||!(c.bankWidth>0))return false;
  var level=creekLevel(c,x+.5,z+.5);if(level===null)return false;
  return Math.min(Terrain.sample(T,x+.5,z+.5),drawnCentre(T,x,z))<level+BANK_CLEAR;
 }
 function bankMask(T){var m=new Uint8Array(T.width*T.depth);for(var z=0;z<T.depth;z++)for(var x=0;x<T.width;x++)if(T.water[z*T.width+x]===0&&creekBank(T,x,z))m[z*T.width+x]=1;return m}
 function key(x,z){return x+','+z}
 function doorKey(d){return (d.arrival?'open':'closed')+'-'+(d.garden?'open':'closed')}
 function openGround(surface){return surface==='land'||surface==='exterior'||surface==='dock'||surface==='deck'||/:(?:IslandTerrain|StagedTerrain)$/.test(surface)}
 function create(input){
  need(input&&input.terrain&&input.terrain.schema==='holm-overhaul-terrain-bundle-v1','terrain bundle required');
  var T=input.terrain,W=T.width,D=T.depth,arrival=input.arrival||null,owned=Object.create(null),blocked=Object.create(null),bank=bankMask(T);
  function sample(x,z){return Terrain.sample(T,x,z)}
  function wet(x,z){return x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0||bank[z*W+x]===1}
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
   return {id:b.id,graph:g,origin:o,nodes:nodes,tiles:tiles,rect:{x0:x0,x1:x1,z0:z0,z1:z1},priority:b.priority||0,overlay:!!b.overlay};
  });
  // Where measured patches overlap, the smaller patch claims first: it belongs to the building standing there
  // (the lodge's patch carries a long terrain lane that reaches the quarry's approach).
  // an overlay storey (the Guide House cellar) lies under another owner's tiles: it claims none of them
  buildings.filter(function(b){return !b.overlay}).sort(function(a,b){return (a.rect.x1-a.rect.x0+1)*(a.rect.z1-a.rect.z0+1)-(b.rect.x1-b.rect.x0+1)*(b.rect.z1-b.rect.z0+1)||(a.id<b.id?-1:1)})
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
    if(b.overlay||owned[k]==='b:'+b.id&&!blocked[k]&&!shut(n,b)&&!(openGround(n.surface)&&wet(n.tx,n.tz)&&!decks[k]))add(n,'b:'+b.id)})});
   if(arrival){var ag=arrivalGraph(doors);ag.nodes.forEach(function(n){add({id:n.id,surface:n.surface,x:n.x,y:n.y,z:n.z,tx:Math.floor(n.x),tz:Math.floor(n.z),arrival:true},'arrival')});
    Object.keys(ag.links).forEach(function(id){ag.links[id].forEach(function(t){if(by[id]&&by[t])link(by[id],by[t])})})}
   // land-land cardinal links
   nodes.forEach(function(n){if(n.owner!=='land')return;[[1,0],[0,1]].forEach(function(d){
    (byTile[key(n.tx+d[0],n.tz+d[1])]||[]).forEach(function(m){if(m.owner==='land'&&landEdge(n,m))link(n,m)});
   })});
   // building-internal links (measured), only between kept nodes
   buildings.forEach(function(b){Object.keys(b.graph.links).forEach(function(lid){var a=by['b:'+b.id+':'+lid];if(!a)return;
    b.graph.links[lid].forEach(function(t){var c=by['b:'+b.id+':'+t];if(c)link(a,c)})})});
   // seams: open ground of different owners on cardinal neighbours within one step. A Guide House doorstep (an arrival
   // floor node outside the house footprint, e.g. beyond the garden door) counts as open ground, so the back door
   // leads onto the island (owner play-test 2026-09-25: the route went round to the front door)
   var feet=input.arrivalFootprints||[];
   function doorstep(n){return n.owner==='arrival'&&n.surface==='ground'&&!feet.some(function(r){return n.x>r.x0&&n.x<r.x1&&n.z>r.z0&&n.z<r.z1})}
   function seamable(n){return openGround(n.surface)||doorstep(n)}
   nodes.forEach(function(n){if(!seamable(n))return;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){
    (byTile[key(n.tx+d[0],n.tz+d[1])]||[]).forEach(function(m){if(m.owner!==n.owner&&seamable(m)&&Math.abs(m.y-n.y)<=SEAM_STEP+EPS)link(n,m)});
   })});
   // diagonals (owner decision 2026-09-25: 8-direction movement like 2004). A diagonal joins two stances only where the
   // 2004 rule allows it: both orthogonal neighbours stand on this storey and all four straight links exist (so no
   // wall corner, fence, door frame, water edge or storey change is ever cut), none of those links is an authored
   // stair profile, and every rise stays within one land step. The arrival house keeps its own cardinal graph.
   function linked(a,b){return links[a.id].indexOf(b.id)>=0}
   function flat(a,b){return !profileOf(a,b)&&Math.abs(a.y-b.y)<=LAND_STEP+EPS}
   nodes.forEach(function(n){if(n.owner==='arrival')return;[[1,1],[1,-1]].forEach(function(d){
    (byTile[key(n.tx+d[0],n.tz+d[1])]||[]).forEach(function(m){if(m.owner==='arrival'||linked(n,m))return;
     var ok=(byTile[key(n.tx+d[0],n.tz)]||[]).some(function(o1){return o1.owner!=='arrival'&&linked(n,o1)&&linked(o1,m)&&flat(n,o1)&&flat(o1,m)})&&
      (byTile[key(n.tx,n.tz+d[1])]||[]).some(function(o2){return o2.owner!=='arrival'&&linked(n,o2)&&linked(o2,m)&&flat(n,o2)&&flat(o2,m)});
     if(ok&&Math.abs(n.y-m.y)<=(n.owner==='land'&&m.owner==='land'?LAND_STEP:SEAM_STEP)+EPS)link(n,m)});
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
 // (within 4), span every wet tile (the water mask and the creek banks under the water line) to dry land both sides;
 // the deck sits b.rise (default .2) above the higher bank, so it clears the water line by at least the rise.
 function bridgeFrom(T,b){
  var W=T.width,bank=bankMask(T),wet=function(x,z){return T.water[z*W+x]!==0||bank[z*W+x]===1},dx=b.orientation==='EW'?1:0,dz=dx?0:1,x=b.x,z=b.z;
  if(!wet(x,z)){var hit=[1,-1,2,-2,3,-3,4,-4].map(function(o){return [b.x+dx*o,b.z+dz*o]}).filter(function(p){return wet(p[0],p[1])})[0];
   need(hit,'bridge '+b.label+' has no creek within 4 tiles along its axis');x=hit[0];z=hit[1]}
  var tiles=[[x,z]];
  [-1,1].forEach(function(s){var cx=x+dx*s,cz=z+dz*s;while(wet(cx,cz)){tiles.push([cx,cz]);cx+=dx*s;cz+=dz*s}});
  tiles.sort(function(p,q){return p[0]-q[0]||p[1]-q[1]});
  // An authored span (plan b.span [first,last] along the axis, with b.deckY) lands the deck on the bank tops where a bank
  // is too steep to step onto from the water's edge (the timber bridge's east bank climbs 1.3 in one tile): it must
  // cover every wet tile of the crossing, and the deck must meet both landings within one seam step.
  if(b.span){need(Array.isArray(b.span)&&b.span.length===2&&b.span.every(Number.isInteger)&&b.span[0]<=b.span[1]&&Number.isFinite(b.deckY),'bridge '+b.label+' span needs [first,last] and deckY');
   var along=function(t){return dx?t[0]:t[1]};need(tiles.every(function(t){return along(t)>=b.span[0]&&along(t)<=b.span[1]}),'bridge '+b.label+' span leaves water uncovered');
   tiles=[];for(var v=b.span[0];v<=b.span[1];v++)tiles.push(dx?[v,z]:[x,v])}
  var a=tiles[0],c=tiles[tiles.length-1],ends=[[a[0]-dx,a[1]-dz],[c[0]+dx,c[1]+dz]];
  var endY=ends.map(function(e){return +Terrain.sample(T,e[0]+.5,e[1]+.5).toFixed(3)});
  var deckY=b.span?b.deckY:+(Math.max(endY[0],endY[1])+(Number.isFinite(b.rise)?b.rise:.2)).toFixed(3);
  if(b.span)need(endY.every(function(e){return Math.abs(e-deckY)<=SEAM_STEP+EPS}),'bridge '+b.label+' deck must meet both landings within a seam step');
  return {id:b.label.replace(/\W+/g,'_').toLowerCase(),label:b.label,orientation:b.orientation,tiles:tiles,ends:ends,endY:endY,deckY:deckY};   // lifted clear of the water, within one seam step of both banks
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
 return {create:create,bridgeFrom:bridgeFrom,creekBank:creekBank,BANK_CLEAR:BANK_CLEAR,encodeCheckpoint:encodeCheckpoint,restoreCheckpoint:restoreCheckpoint,LAND_STEP:LAND_STEP,SEAM_STEP:SEAM_STEP};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandNav;
