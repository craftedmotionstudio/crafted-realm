/* ================ TUTOR'S HOLM LANDSCAPE PLAN ================
 * Pure, deterministic Phase-2 composition data. The runtime consumes this
 * plan for terrain, minimap geography and chunk-owned blockout objects; no NPC
 * or quest behavior belongs here.
 *
 * North is -z. Every route segment is cardinal so the visible path agrees with
 * the game's four-direction movement law.
 */
var HolmLandscape=(function(){
  'use strict';

  var envelope={x0:102,z0:93,w:112,h:96,cx:158,cz:141};
  // New adventurers begin on the Guide Hall's arrival apron, centred on the
  // south door.  The former 158,165 point landed inside the widened east bay
  // once the approved full-scale Hall replaced the blockout.
  var arrival={id:'holm_arrival',label:'Guide Hall Arrival',x:151,z:169,kind:'safe-spawn'};
  var pond={id:'holm_pond',label:'Survival Pond',x:132,z:151,r:6.2,kind:'landmark'};
  var bridge={id:'holm_tidebridge',label:'Tidebridge',x:174,z:143,w:18,d:4,kind:'crossing'};

  // Overlapping lobes make one irregular island instead of a rectangular map.
  var lobes=[
    {id:'arrival_lobe',cx:155,cz:166,rx:31,rz:23},
    {id:'survival_lobe',cx:130,cz:149,rx:29,rz:24},
    {id:'quarry_lobe',cx:143,cz:121,rx:35,rz:25},
    {id:'ridge_lobe',cx:172,cz:124,rx:34,rz:25},
    {id:'headland_lobe',cx:195,cz:143,rx:22,rz:24}
  ];
  var inlet={id:'tide_inlet',cx:174,cz:147,rx:7.2,rz:22};
  var arrivalCove={id:'arrival_cove_water',cx:158,cz:179,rx:5.2,rz:11};
  var departureCove={id:'departure_cove_water',cx:211,z:151,cz:151,rx:5.3,rz:8.2};
  var departurePier={id:'holm_departure_pier',x:207,z:151,w:8,d:2.2};

  var districts=[
    {id:'arrival_cove',label:'Arrival Cove',role:'arrival',center:[151,169],radius:13,landmark:'holm_arrival'},
    {id:'survival_wood',label:'Survival Wood',role:'gathering',center:[132,151],radius:17,landmark:'holm_pond'},
    {id:'lesson_green',label:'Lesson Green',role:'civic-learning',center:[141,137],radius:15,landmark:'holm_lesson_green'},
    {id:'quarry_rise',label:'Quarry Rise',role:'production',center:[128,120],radius:16,landmark:'holm_cave_gate'},
    {id:'wardens_ridge',label:"Warden's Ridge",role:'bank-combat',center:[164,120],radius:17,landmark:'holm_wardens_ridge'},
    {id:'mage_headland',label:'Mage Headland',role:'magic-departure',center:[193,140],radius:19,landmark:'holm_mage_headland'}
  ];

  var routes=[
    {id:'holm_guided_spine',label:'Guided island spine',width:3.2,kind:'primary',points:[
      [151,169],[151,167],[151,142],[134,142],[134,147],[145,147],[145,137],
      [128,137],[128,120],[158,120],[158,143],[184,143],[184,136],[193,136],
      [193,151],[207,151]
    ]},
    {id:'survival_pond_loop',label:'Pond loop',width:2.4,kind:'secondary',points:[
      [134,158],[114,158],[114,143],[128,143],[128,146],[134,146]
    ]},
    {id:'arrival_lookout_path',label:'Arrival lookout path',width:2.4,kind:'secondary',points:[
      [150,165],[145,165],[145,175]
    ]}
  ];

  // These are reserved support spaces, not finished buildings. They ensure the
  // future structures can be large, functional and entered from the guided path.
  var pads=[
    {id:'guide_hall',label:'Guide Hall',role:'orientation-service',x:151,z:155,w:26,d:24,level:0.82,door:'S'},
    {id:'survival_shelter',label:'Survival Workyard',role:'gathering-support',x:116,z:151,w:20,d:14,level:0.92,door:'S'},
    {id:'quest_lodge',label:'Quest Lodge',role:'story-service',x:136,z:136,w:12,d:9,level:1.25,door:'E'},
    {id:'teaching_kitchen',label:'Teaching Kitchen',role:'cooking-service',x:153,z:136,w:13,d:10,level:1.28,door:'W'},
    {id:'mine_gatehouse',label:'Mine Gatehouse',role:'cave-access',x:127,z:119,w:10,d:8,level:1.72,door:'S'},
    {id:'holm_bank',label:'Holm Bank',role:'bank-service',x:157,z:116,w:10,d:8,level:2.08,door:'S'},
    {id:'combat_hall',label:'Combat Hall',role:'combat-service',x:172,z:119,w:12,d:9,level:2.02,door:'S'},
    {id:'mage_tower',label:'Mage Tower',role:'magic-service',x:193,z:136,w:11,d:11,level:1.62,door:'S'}
  ];

  var landmarks={
    holm_arrival:arrival,
    holm_pond:pond,
    holm_lesson_green:{id:'holm_lesson_green',label:'Lesson Green',x:145,z:137,kind:'landmark'},
    holm_cave_gate:{id:'holm_cave_gate',label:'Mine Gatehouse',x:128,z:120,kind:'cave-entrance'},
    holm_wardens_ridge:{id:'holm_wardens_ridge',label:"Warden's Ridge",x:158,z:120,kind:'landmark'},
    holm_tidebridge:bridge,
    holm_mage_headland:{id:'holm_mage_headland',label:'Mage Headland',x:193,z:136,kind:'landmark'},
    holm_departure:{id:'holm_departure',label:'Departure Dock',x:207,z:151,kind:'departure'}
  };

  function tree(id,x,z,scale,rot){ return {id:id,asset:'holm_oak',x:x,z:z,scale:scale||1,rot:rot||0,collider:{type:'circle',r:0.46*(scale||1)}}; }
  function rock(id,x,z,scale,rot){ return {id:id,asset:'holm_rock',x:x,z:z,scale:scale||1,rot:rot||0,collider:{type:'circle',r:0.48*(scale||1)}}; }
  // Fence collision waits for the Phase-2 rect/wall footprint contract; a large
  // circle would incorrectly block the protected cardinal corridors.
  function fence(id,x,z,length,rot){ return {id:id,asset:'holm_fence',x:x,z:z,scale:[length/2,1,1],rot:rot||0}; }
  var objectPlacements=[];
  pads.forEach(function(p){ objectPlacements.push({id:'holm_pad_'+p.id,asset:'holm_foundation',x:p.x,z:p.z,scale:[p.w,1,p.d],rot:0}); });
  objectPlacements.push({id:'holm_tidebridge_deck',asset:'holm_bridge',x:bridge.x,z:bridge.z,rot:0});
  objectPlacements.push({id:'holm_departure_pier_deck',asset:'holm_pier',x:departurePier.x,z:departurePier.z,rot:0});

  [
    [124,165,1.05,0.2],[128,160,0.88,1.1],[135,162,1.12,2.2],[104,153,0.92,3.1],
    [104,144,1.08,4.0],[121,138,0.86,5.1],[135,140,1.14,0.7],[135,169,0.94,1.8],
    [108,137,1.12,2.7],[117,164,0.90,3.6],[143,174,1.10,4.5],[151,176,0.88,5.4],
    [169,164,1.05,0.4],[168,158,0.92,1.3],[113,128,1.10,2.1],[118,114,0.86,3.0],
    [139,106,1.13,3.9],[151,105,0.95,4.8],[178,106,1.10,5.7],[187,117,0.88,0.6],
    [201,126,1.08,1.5],[207,139,0.92,2.4],[205,160,1.12,3.3],[190,161,0.90,4.2]
  ].forEach(function(p,i){ objectPlacements.push(tree('holm_tree_'+(i+1),p[0],p[1],p[2],p[3])); });

  [
    [166,163,0.78,0.3],[117,126,1.05,1.2],[122,113,0.88,2.1],[132,109,1.15,3.0],
    [146,105,0.92,3.9],[181,109,1.08,4.8],[189,120,0.82,5.7],[207,132,1.12,0.6],
    [202,148,0.94,1.5],[198,162,1.08,2.4],[177,172,0.86,3.3],[139,178,1.02,4.2]
  ].forEach(function(p,i){ objectPlacements.push(rock('holm_rock_'+(i+1),p[0],p[1],p[2],p[3])); });

  [
    [129,159,7,0],[103,151,6,Math.PI/2],[135,166,6,Math.PI/2],
    [141,131,6,0],[149,131,6,0],[156,125,6,Math.PI/2],
    [183,130,7,Math.PI/2],[194,145,7,Math.PI/2]
  ].forEach(function(p,i){ objectPlacements.push(fence('holm_fence_'+(i+1),p[0],p[1],p[2],p[3])); });

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function smooth(v){ v=clamp(v,0,1); return v*v*(3-2*v); }
  function ellipseQ(x,z,e){ var dx=(x-e.cx)/e.rx,dz=(z-e.cz)/e.rz; return Math.sqrt(dx*dx+dz*dz); }
  function islandQ(x,z){
    var q=Infinity;
    for(var i=0;i<lobes.length;i++) q=Math.min(q,ellipseQ(x,z,lobes[i]));
    return q;
  }
  function inEnvelope(x,z){ return x>=envelope.x0&&z>=envelope.z0&&x<envelope.x0+envelope.w&&z<envelope.z0+envelope.h; }
  function inBridge(x,z,pad){ pad=pad||0; return Math.abs(x-bridge.x)<=bridge.w/2+pad&&Math.abs(z-bridge.z)<=bridge.d/2+pad; }
  function inPond(x,z,pad){ return Math.hypot(x-pond.x,z-pond.z)<pond.r+(pad||0); }
  function inInlet(x,z){ return ellipseQ(x,z,inlet)<1; }
  function inArrivalCove(x,z){ return ellipseQ(x,z,arrivalCove)<1; }
  function inDepartureCove(x,z){ return ellipseQ(x,z,departureCove)<1; }
  function inDeparturePier(x,z,pad){ pad=pad||0; return Math.abs(x-departurePier.x)<=departurePier.w/2+pad&&Math.abs(z-departurePier.z)<=departurePier.d/2+pad; }
  function padAt(x,z,shoulder){
    shoulder=shoulder||0;
    for(var i=0;i<pads.length;i++){
      var p=pads[i];
      if(Math.abs(x-p.x)<=p.w/2+shoulder&&Math.abs(z-p.z)<=p.d/2+shoulder) return p;
    }
    return null;
  }
  function segmentDistance(p,a,b){
    var abx=b[0]-a[0],abz=b[1]-a[1],den=abx*abx+abz*abz;
    var t=den?clamp(((p[0]-a[0])*abx+(p[1]-a[1])*abz)/den,0,1):0;
    return Math.hypot(p[0]-(a[0]+abx*t),p[1]-(a[1]+abz*t));
  }
  function pathDistance(x,z){
    var d=Infinity;
    for(var r=0;r<routes.length;r++) for(var i=1;i<routes[r].points.length;i++)
      d=Math.min(d,segmentDistance([x,z],routes[r].points[i-1],routes[r].points[i]));
    return d;
  }
  function rawInteriorHeight(x,z){
    var base=0.62+Math.sin(x*0.13)*Math.cos(z*0.11)*0.10;
    var hills=[
      [145,121,2.0,22],[169,119,1.55,20],[193,137,0.95,17],[133,143,0.42,18]
    ];
    for(var i=0;i<hills.length;i++){
      var h=hills[i],d=Math.hypot(x-h[0],z-h[1]); base+=h[2]*Math.exp(-(d*d)/(2*h[3]*h[3]));
    }
    return base;
  }
  function heightAt(x,z){
    if(!inEnvelope(x,z)) return null;
    if(inBridge(x,z,0.15)) return 1.28;
    if(inDeparturePier(x,z,0.15)) return 0.72;
    var q=islandQ(x,z);
    if(q>1) return -2.45;
    var interior=rawInteriorHeight(x,z);
    var coastT=smooth((1-q)/0.18);
    var height=-1.72+(interior+1.72)*coastT;
    var p=padAt(x,z,2.2);
    if(p){
      var dx=Math.max(0,Math.abs(x-p.x)-p.w/2),dz=Math.max(0,Math.abs(z-p.z)-p.d/2);
      var blend=1-smooth(Math.hypot(dx,dz)/2.2);
      height=height*(1-blend)+p.level*blend;
    }
    // Carve water with sloped banks; hard vertical cuts read as generated blocks.
    var carveQ=Math.min(ellipseQ(x,z,inlet),ellipseQ(x,z,arrivalCove),ellipseQ(x,z,departureCove));
    if(carveQ<1){
      var carve=smooth((1-carveQ)/0.22);
      height=height*(1-carve)+(-2.45)*carve;
    }
    // Give the pond a readable sandy shoulder without flattening the whole wood.
    var pd=Math.hypot(x-pond.x,z-pond.z);
    if(pd<pond.r+2.1){
      if(pd<pond.r){
        var wet=smooth((pond.r-pd)/1.8);
        height=height*(1-wet)+(-3.05)*wet;
      }else{
        var rim=1-smooth((pd-pond.r)/2.1);
        // A raised freshwater shoulder meets the U4 dock waterline. Keeping
        // this just under the visible surface prevents a floating pond rim.
        height=height*(1-rim)+0.44*rim;
      }
    }
    return height;
  }
  function biomeAt(x,z){
    if(!inEnvelope(x,z)) return null;
    if(inBridge(x,z,0.1)||inDeparturePier(x,z,0.1)) return 'rock';
    var h=heightAt(x,z);
    if(h===null||h<-1.2) return 'water';
    if(h<0.28||inPond(x,z,2.0)) return 'desert';
    if(Math.hypot(x-128,z-119)<12) return 'rock';
    return 'grass';
  }
  function routeLength(route){
    var n=0; for(var i=1;i<route.points.length;i++) n+=Math.abs(route.points[i][0]-route.points[i-1][0])+Math.abs(route.points[i][1]-route.points[i-1][1]);
    return n;
  }
  function roleBounds(role){
    if(role.center) return {x0:role.center[0]-role.radius,z0:role.center[1]-role.radius,x1:role.center[0]+role.radius,z1:role.center[1]+role.radius};
    if(role.points){
      var xs=role.points.map(function(p){return p[0];}),zs=role.points.map(function(p){return p[1];});
      return {x0:Math.min.apply(Math,xs)-role.width,z0:Math.min.apply(Math,zs)-role.width,x1:Math.max.apply(Math,xs)+role.width,z1:Math.max.apply(Math,zs)+role.width};
    }
    return {x0:role.x-role.w/2,z0:role.z-role.d/2,x1:role.x+role.w/2,z1:role.z+role.d/2};
  }
  function overlaps(a,b){ return a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0; }
  function rolesForChunk(cx,cz){
    var c={x0:cx*8,z0:cz*8,x1:cx*8+8,z1:cz*8+8},out=[];
    districts.forEach(function(d){ if(overlaps(c,roleBounds(d))) out.push({kind:'district',id:d.id,role:d.role}); });
    routes.forEach(function(r){ if(overlaps(c,roleBounds(r))) out.push({kind:'route',id:r.id,role:r.kind}); });
    pads.forEach(function(p){ if(overlaps(c,roleBounds(p))) out.push({kind:'building-pad',id:p.id,role:p.role}); });
    if(overlaps(c,{x0:pond.x-pond.r,z0:pond.z-pond.r,x1:pond.x+pond.r,z1:pond.z+pond.r})) out.push({kind:'water',id:pond.id,role:'freshwater'});
    if(overlaps(c,{x0:inlet.cx-inlet.rx,z0:inlet.cz-inlet.rz,x1:inlet.cx+inlet.rx,z1:inlet.cz+inlet.rz})) out.push({kind:'water',id:inlet.id,role:'coastal-inlet'});
    if(overlaps(c,{x0:arrivalCove.cx-arrivalCove.rx,z0:arrivalCove.cz-arrivalCove.rz,x1:arrivalCove.cx+arrivalCove.rx,z1:arrivalCove.cz+arrivalCove.rz})) out.push({kind:'water',id:arrivalCove.id,role:'arrival-cove'});
    if(overlaps(c,{x0:departureCove.cx-departureCove.rx,z0:departureCove.cz-departureCove.rz,x1:departureCove.cx+departureCove.rx,z1:departureCove.cz+departureCove.rz})) out.push({kind:'water',id:departureCove.id,role:'departure-cove'});
    return out;
  }

  var landscapeContract={
    revision:2,planId:'tutors-holm-landscape-v1',referenceSet:'Bible_References/tutorial-island',
    districts:districts,routes:routes,pads:pads,
    water:[pond,{id:inlet.id,label:'Tide Inlet',x:inlet.cx,z:inlet.cz,rx:inlet.rx,rz:inlet.rz,kind:'coastal-inlet'}],
    underground:[{id:'holm_mining_cavern',label:'Tutorial Mining Cavern',w:48,h:40,entrance:'holm_cave_gate',status:'reserved'}]
  };

  function acceptance(){
    var checks=[];
    function add(label,ok){ checks.push({label:label,ok:!!ok}); }
    add('112x96 authored envelope',envelope.w===112&&envelope.h===96);
    add('six distinct surface districts',districts.length===6&&new Set(districts.map(function(d){return d.id;})).size===6);
    add('eight functional building reservations',pads.length===8&&pads.every(function(p){return p.role&&p.w>=8&&p.d>=7;}));
    add('primary route is at least 180 tiles',routeLength(routes[0])>=180);
    add('all routes are cardinal',routes.every(function(r){return r.points.every(function(p,i){return i===0||p[0]===r.points[i-1][0]||p[1]===r.points[i-1][1];});}));
    add('every pad centre is walkable',pads.every(function(p){return heightAt(p.x,p.z)>-1.2;}));
    add('arrival and departure are walkable',heightAt(arrival.x,arrival.z)>-1.2&&heightAt(207,151)>-1.2);
    add('pond and inlet are water',heightAt(pond.x,pond.z)<-1.2&&heightAt(inlet.cx,inlet.cz+8)<-1.2);
    add('bridge crosses the inlet',heightAt(bridge.x,bridge.z)>-1.2&&inInlet(bridge.x,bridge.z));
    add('departure boat cove is water beside a walkable pier',heightAt(211,154)<-1.2&&heightAt(departurePier.x,departurePier.z)>-1.2);
    add('authored landscape props stay on land',objectPlacements.every(function(o){return o.asset==='holm_bridge'||o.asset==='holm_pier'||heightAt(o.x,o.z)>-1.2;}));
    var completedPads=pads.filter(function(p){return p.id==='guide_hall'||p.id==='survival_shelter';});
    function overlapsCompletedPad(o){
      if(o.asset==='holm_foundation'||o.asset==='holm_bridge'||o.asset==='holm_pier') return false;
      var hx=.6,hz=.6;
      if(o.asset==='holm_oak'){ hx=hz=.9*(typeof o.scale==='number'?o.scale:1); }
      else if(o.asset==='holm_fence'){
        var along=Array.isArray(o.scale)?o.scale[0]:1,ac=Math.abs(Math.cos(o.rot||0)),as=Math.abs(Math.sin(o.rot||0));
        hx=ac*along+as*.22; hz=as*along+ac*.22;
      }
      return completedPads.some(function(p){
        return Math.abs(o.x-p.x)<p.w/2+hx&&Math.abs(o.z-p.z)<p.d/2+hz;
      });
    }
    add('passive landscape props clear completed building footprints',
      objectPlacements.every(function(o){return !overlapsCompletedPad(o);}));
    add('underground reservation is 48x40',landscapeContract.underground[0].w===48&&landscapeContract.underground[0].h===40);
    var failed=checks.filter(function(c){return !c.ok;});
    if(failed.length) throw new Error('[HolmLandscape] acceptance failed: '+failed.map(function(c){return c.label;}).join(', '));
    return {passed:checks.length,total:checks.length,routeTiles:routeLength(routes[0]),checks:checks};
  }

  landscapeContract.water.push({id:arrivalCove.id,label:'Arrival Cove',x:arrivalCove.cx,z:arrivalCove.cz,
    rx:arrivalCove.rx,rz:arrivalCove.rz,kind:'coastal-cove'});
  landscapeContract.water.push({id:departureCove.id,label:'Departure Cove',x:departureCove.cx,z:departureCove.cz,
    rx:departureCove.rx,rz:departureCove.rz,kind:'coastal-cove'});

  var api={version:2,envelope:envelope,arrival:arrival,pond:pond,bridge:bridge,lobes:lobes,inlet:inlet,arrivalCove:arrivalCove,
    departureCove:departureCove,departurePier:departurePier,
    districts:districts,routes:routes,pads:pads,landmarks:landmarks,objectPlacements:objectPlacements,
    landscapeContract:landscapeContract,inEnvelope:inEnvelope,inBridge:inBridge,inPond:inPond,
    inDepartureCove:inDepartureCove,inDeparturePier:inDeparturePier,
    heightAt:heightAt,biomeAt:biomeAt,pathDistance:pathDistance,padAt:padAt,
    routeLength:routeLength,rolesForChunk:rolesForChunk,acceptance:acceptance};
  api.acceptanceResult=acceptance();
  if(typeof console!=='undefined'&&console.info) console.info('[HOLM_LANDSCAPE] '+api.acceptanceResult.passed+'/'+api.acceptanceResult.total+' acceptance ok; '+api.acceptanceResult.routeTiles+'-tile spine');
  return api;
})();

if(typeof globalThis!=='undefined') globalThis.HolmLandscape=HolmLandscape;
