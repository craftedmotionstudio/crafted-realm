/* ================= UI: MAP RENDERING =================
   World-map + minimap canvas rendering. Extracted verbatim from
   game4_ui.js (pure move, zero behaviour change). Loads after
   game4_ui.js (which owns UI.openWorldMap / minimapWalkTo) and before
   its consumers (qol_ui.js, map_search.js, game5_main.js). */
/* ---------- minimap ---------- */
const WMAP = {x0:-206, z0:-142, x1:274, z1:178};   // the charted world = the baked map
function drawWorldMap(){
  const c=document.getElementById('worldmap'); if(!c) return;
  const ctx=c.getContext('2d');
  const S=c.width, sx=S/(WMAP.x1-WMAP.x0), sz=S/(WMAP.z1-WMAP.z0);
  const mx=(x,z)=>({x:(x-WMAP.x0)*sx, y:(z-WMAP.z0)*sz});
  // terrain, sampled honestly from the biome grid + heightfield
  const BCOL={water:'#2c4a66', grass:'#4d6b35', autumn:'#a06a28', swamp:'#453655',
    desert:'#c2a862', snow:'#dbe0de', scar:'#54453a', rock:'#8a8276'};
  const step=2.2;
  for(let wx=WMAP.x0; wx<WMAP.x1; wx+=step){
    for(let wz=WMAP.z0; wz<WMAP.z1; wz+=step){
      const cxw=wx+step/2, czw=wz+step/2;
      const y=(typeof groundY==='function')?groundY(cxw,czw):0;
      const b=(typeof gridBiome==='function')?gridBiome(cxw,czw):'grass';
      let col;
      if(y===null) col='#2c4a66';
      else if(typeof DITCH!=='undefined' && y<-1.15 && Math.abs(czw-DITCH.z)<DITCH.half+2) col='#2e261e';  // the Ditch
      else if(y<-1.15) col='#2c4a66';
      else if(y<-0.75) col='#c9b98a';                     // shoreline sand
      else col=BCOL[b]||'#4d6b35';
      ctx.fillStyle=col;
      const p=mx(wx,wz);
      ctx.fillRect(p.x, p.y, step*sx+1, step*sz+1);
    }
  }
  // roads
  ctx.strokeStyle='#c4b696'; ctx.lineWidth=2.4; ctx.lineJoin='round';
  for(const seg of PATHS){
    ctx.beginPath();
    seg.forEach(([ax,az],i)=>{ const p=mx(ax,az); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); });
    ctx.stroke();
  }
  // buildings: every roofed room, drawn as the surveyor sees it
  ctx.fillStyle='#8a6a44'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=0.8;
  for(const it of WORLD.interiors){
    const p=mx(it.x-it.hw, it.z-it.hd);
    ctx.fillRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
    ctx.strokeRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
  }
  // Whitmoor's walls
  ctx.strokeStyle='#d8d2c4'; ctx.lineWidth=2.2;
  const wA=mx(-175,-119), wB=mx(-151,-91);
  ctx.strokeRect(wA.x, wA.y, wB.x-wA.x, wB.y-wA.y);
  // place names, the cartographer's hand
  ctx.font='bold 12px "Realm Small", Verdana'; ctx.textAlign='center';
  const label=(x,z,t)=>{ const p=mx(x,z);
    ctx.fillStyle='#1a1208'; ctx.fillText(t,p.x+1,p.y+1);
    ctx.fillStyle='#ffe9b0'; ctx.fillText(t,p.x,p.y); };
  label(0,-22,'Veyhollow');
  for(const k in ZONES){ const zn=ZONES[k];
    if(zn.name && k!=='town') label(zn.pos[0], zn.pos[1]-3, zn.name); }
  // you are here: a white arrow that knows your facing
  const pp=mx(player.position.x, player.position.z);
  const fa=player.rotation.y;
  ctx.save(); ctx.translate(pp.x,pp.y); ctx.rotate(-fa);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4.4,5); ctx.lineTo(0,2.4); ctx.lineTo(-4.4,5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/* Three bounded layers keep the familiar rotating minimap honest without
 * repainting thousands of terrain samples every 80 ms:
 *   static  — sampled terrain, roads, landmarks and risk areas; rebuilds per chunk
 *   markers — resources; rebuilds per chunk or when their alive state changes
 *   dynamic — nearby actors, drops, destination, player and compass; always cheap
 */
var CRMinimap=(function(){
  'use strict';
  var W=144, R=70, SCALE=1.35, CACHE=224, SAMPLE=2;
  var staticCanvas=document.createElement('canvas'), markerCanvas=document.createElement('canvas');
  staticCanvas.width=staticCanvas.height=markerCanvas.width=markerCanvas.height=CACHE;
  var cache={key:'',cx:0,cz:0,markerSignature:'',markerCheckedAt:0};
  var telemetry={layerVersion:2,staticBuilds:0,markerBuilds:0,dynamicFrames:0,
    staticCacheHits:0,markerCacheHits:0,cacheKey:'',lastStaticMs:0,maxStaticMs:0,
    lastMarkerMs:0,maxMarkerMs:0,lastPaintMs:0,maxPaintMs:0,dynamicMarkers:0,
    maxDynamicMarkers:0,dynamicLimit:128,clicks:0,lastClickWorld:null,routeTiles:0,compassYaw:null};
  var BCOL={water:'#2c4a66',grass:'#4d6b35',autumn:'#a06a28',swamp:'#453655',
    desert:'#c2a862',snow:'#dbe0de',scar:'#54453a',rock:'#8a8276'};
  function elapsed(t){ return +(performance.now()-t).toFixed(3); }
  function provider(){ return (typeof CRWorldMode!=='undefined'&&CRWorldMode.provider)||null; }
  function worldToCache(x,z){ return {x:CACHE/2+(x-cache.cx)*SCALE,y:CACHE/2+(z-cache.cz)*SCALE}; }
  function updateCacheKey(){
    var p=provider(), tx=player.position.x, tz=player.position.z;
    var ccx=Math.floor(tx/8), ccz=Math.floor(tz/8);
    var plane=(typeof Player!=='undefined'&&Player.plane)||0;
    var key=(p?p.id:'legacy')+':'+(p?p.worldRevision:0)+':p'+plane+':'+ccx+','+ccz+(islandFloorTiles()?':f'+floorCache.key:'');
    if(key===cache.key){ telemetry.staticCacheHits++; return false; }
    cache.key=key; cache.cx=ccx*8+4; cache.cz=ccz*8+4; cache.markerSignature='';
    telemetry.cacheKey=key; return true;
  }
  function terrainColor(x,z){
    var y=(typeof groundY==='function')?groundY(x,z):0;
    if(y===null) return '#2c4a66';
    if(typeof DITCH!=='undefined'&&y<-1.15&&Math.abs(z-DITCH.z)<DITCH.half+2) return '#2e261e';
    if(y<-1.15) return '#2c4a66';
    if(y<-0.75) return '#c9b98a';
    var b=(typeof gridBiome==='function')?gridBiome(x,z):'grass';
    return BCOL[b]||'#4d6b35';
  }
  function buildLastlightFloorMap(ctx){
    if(typeof HolmLastlightData==='undefined'||typeof Player==='undefined')return false;
    var c=HolmLastlightData.contract,p=Player.plane||0,level=c.levels.filter(function(l){return l.plane===p;})[0],cp=worldToCache(c.center.x,c.center.z);
    if(level){
      ctx.fillStyle='#1b2831';ctx.fillRect(0,0,CACHE,CACHE);
      ctx.fillStyle='#76512d';ctx.strokeStyle='#e0d8bd';ctx.lineWidth=5;ctx.beginPath();ctx.arc(cp.x,cp.y,8.9*SCALE,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#3b2616';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cp.x,cp.y,7.9*SCALE,0,Math.PI*2);ctx.stroke();
      function socket(pos,color){if(!pos)return;var q=worldToCache(pos.x,pos.z);ctx.fillStyle=color;ctx.fillRect(q.x-3,q.y-3,6,6);ctx.strokeStyle='#1a1208';ctx.strokeRect(q.x-3,q.y-3,6,6);}
      socket(level.down,'#f0d36b');socket(level.up,'#f0d36b');if(p===c.trapdoor.plane)socket(c.trapdoor,'#c87632');if(p===c.beacon.plane)socket(c.beacon.lever,'#dc4037');return true;
    }
    if(p===c.dungeon.plane){
      ctx.fillStyle='#18242a';ctx.fillRect(0,0,CACHE,CACHE);var d=c.dungeon,pts=[[-18.5,-9],[-14.8,-13.8],[-7.5,-15],[1,-14.4],[9.8,-13],[16.8,-9.2],[19,-2],[18.2,6.2],[13,12.8],[5.8,14.8],[-2.8,14.2],[-11.2,12],[-17.2,6],[-19,-1.5]];
      ctx.fillStyle='#5f655f';ctx.strokeStyle='#c5c9bb';ctx.lineWidth=3;ctx.beginPath();pts.forEach(function(v,i){var q=worldToCache(d.center.x+v[0],d.center.z+v[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#2b8585';ctx.beginPath();[[-1,-5.2],[4.5,-8],[11.8,-6.8],[14.2,-1.4],[12.8,4.8],[7,7],[1,5.5],[-2.8,1.2]].forEach(function(v,i){var q=worldToCache(d.center.x+v[0],d.center.z+v[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.closePath();ctx.fill();
      var l=worldToCache(d.ladder.x,d.ladder.z);ctx.fillStyle='#f0d36b';ctx.fillRect(l.x-3,l.y-3,6,6);return true;
    }
    return false;
  }
  function buildStatic(){
    var t=performance.now(), ctx=staticCanvas.getContext('2d'), half=CACHE/(2*SCALE);
    ctx.clearRect(0,0,CACHE,CACHE); ctx.fillStyle='#2c4a66'; ctx.fillRect(0,0,CACHE,CACHE);
    if(buildLastlightFloorMap(ctx)){
      var interiorMs=elapsed(t);telemetry.staticBuilds++;telemetry.lastStaticMs=interiorMs;telemetry.maxStaticMs=Math.max(telemetry.maxStaticMs,interiorMs);return;
    }
    for(var z=cache.cz-half;z<cache.cz+half;z+=SAMPLE){
      for(var x=cache.cx-half;x<cache.cx+half;x+=SAMPLE){
        ctx.fillStyle=terrainColor(x+SAMPLE/2,z+SAMPLE/2);
        var cp=worldToCache(x,z);
        ctx.fillRect(Math.floor(cp.x),Math.floor(cp.y),Math.ceil(SAMPLE*SCALE)+1,Math.ceil(SAMPLE*SCALE)+1);
      }
    }
    // Roads remain north-up in the cache; the complete cache rotates with the camera.
    ctx.strokeStyle='rgba(214,197,160,.72)'; ctx.lineWidth=2.4; ctx.lineJoin='round';
    if(typeof PATHS!=='undefined') for(var si=0;si<PATHS.length;si++){
      var seg=PATHS[si]; ctx.beginPath();
      for(var pi=0;pi<seg.length;pi++){
        var rp=worldToCache(seg[pi][0],seg[pi][1]);
        pi?ctx.lineTo(rp.x,rp.y):ctx.moveTo(rp.x,rp.y);
      }
      ctx.stroke();
    }
    drawIslandFloors(ctx);
    var p=provider(), meta=p&&p.mapMetadata;
    if(meta&&Array.isArray(meta.riskAreas)) for(var ri=0;ri<meta.riskAreas.length;ri++){
      var risk=meta.riskAreas[ri], rr=Number(risk.r||risk.radius||5)*SCALE;
      var rcp=worldToCache(Number(risk.x),Number(risk.z));
      ctx.fillStyle='rgba(120,31,28,.52)'; ctx.beginPath(); ctx.arc(rcp.x,rcp.y,rr,0,7); ctx.fill();
    }
    if(meta&&Array.isArray(meta.landmarks)) for(var li=0;li<meta.landmarks.length;li++){
      var lm=meta.landmarks[li], lp=worldToCache(lm.x,lm.z);
      ctx.fillStyle=lm.kind==='safe-spawn'?'#f0c95b':'#e7ddaf';
      ctx.strokeStyle='#3a2a16'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(lp.x,lp.y,lm.kind==='safe-spawn'?3.2:2.5,0,7); ctx.fill(); ctx.stroke();
    }
    var ms=elapsed(t); telemetry.staticBuilds++; telemetry.lastStaticMs=ms;
    telemetry.maxStaticMs=Math.max(telemetry.maxStaticMs,ms);
  }
  // Tutor's Holm: every roofed floor, porch and jetty tile of the walk graph, drawn as a floor with pale wall
  // edges the way the old minimap drew buildings. The tile set is cached per graph (doors/gates change it rarely).
  var floorCache={key:'',tiles:null};
  function islandFloorTiles(){
    if(typeof HolmArrivalQA==='undefined'||!HolmArrivalQA.islandActive||!HolmArrivalQA.islandActive())return null;
    var ns=HolmArrivalQA.graphNodes(),key=ns.length+':'+(ns[0]&&ns[0].id);
    if(floorCache.key===key)return floorCache.tiles;
    var tiles=Object.create(null);
    for(var i=0;i<ns.length;i++){var n=ns[i],sf=n.surface||'',kind=sf.split(':')[0];
      if(n.y<-5||kind==='land'||kind==='upper'||kind==='stair')continue;
      var k=Math.floor(n.x)+','+Math.floor(n.z);if(!tiles[k])tiles[k]=(kind==='deck'||kind==='dock')?2:1;}
    floorCache.key=key;floorCache.tiles=tiles;return tiles;
  }
  function drawIslandFloors(ctx){
    var tiles=islandFloorTiles();if(!tiles)return;var half=CACHE/(2*SCALE)+2,s=SCALE;
    for(var k in tiles){var c=k.split(','),x=+c[0],z=+c[1];if(Math.abs(x-cache.cx)>half||Math.abs(z-cache.cz)>half)continue;
      var q=worldToCache(x,z);ctx.fillStyle=tiles[k]===2?'#8a6a40':'#6e4f33';ctx.fillRect(q.x,q.y,s+.6,s+.6);}
    ctx.fillStyle='#ece4d2';
    for(var k2 in tiles){if(tiles[k2]!==1)continue;var c2=k2.split(','),x2=+c2[0],z2=+c2[1];if(Math.abs(x2-cache.cx)>half||Math.abs(z2-cache.cz)>half)continue;
      var q2=worldToCache(x2,z2);
      if(!tiles[x2+','+(z2-1)])ctx.fillRect(q2.x,q2.y,s+.6,1);
      if(!tiles[x2+','+(z2+1)])ctx.fillRect(q2.x,q2.y+s-.4,s+.6,1);
      if(!tiles[(x2-1)+','+z2])ctx.fillRect(q2.x,q2.y,1,s+.6);
      if(!tiles[(x2+1)+','+z2])ctx.fillRect(q2.x+s-.4,q2.y,1,s+.6);}
  }
  function markerSignature(){
    var s=[];
    if(typeof WORLD==='undefined'||!WORLD.resources) return '';
    var half=CACHE/(2*SCALE)+2;
    for(var i=0;i<WORLD.resources.length;i++){
      var r=WORLD.resources[i];
      if(!r.userData||!r.userData.alive||Math.abs(r.position.x-cache.cx)>half||Math.abs(r.position.z-cache.cz)>half) continue;
      s.push((r.userData.rtype||'r')+':'+Math.round(r.position.x*2)+','+Math.round(r.position.z*2));
    }
    return s.join('|');
  }
  function buildMarkers(signature){
    var t=performance.now(), ctx=markerCanvas.getContext('2d');
    ctx.clearRect(0,0,CACHE,CACHE);
    if(typeof WORLD!=='undefined'&&WORLD.resources) for(var i=0;i<WORLD.resources.length;i++){
      var r=WORLD.resources[i]; if(!r.userData||!r.userData.alive) continue;
      var p=worldToCache(r.position.x,r.position.z);
      if(p.x<-3||p.y<-3||p.x>CACHE+3||p.y>CACHE+3) continue;
      ctx.fillStyle=r.userData.rtype==='tree'?'#1f5414':r.userData.rtype==='rock'?'#c4b89f':'#bfe8ff';
      ctx.fillRect(p.x-1.5,p.y-1.5,3,3);
    }
    cache.markerSignature=signature; var ms=elapsed(t);
    telemetry.markerBuilds++; telemetry.lastMarkerMs=ms; telemetry.maxMarkerMs=Math.max(telemetry.maxMarkerMs,ms);
  }
  function drawDot(ctx,x,z,color,size,px,pz,yaw,count){
    if(count.n>=telemetry.dynamicLimit) return;
    var dx=(x-px)*SCALE, dz=(z-pz)*SCALE;
    if(dx*dx+dz*dz>(R+4)*(R+4)) return;
    var ca=Math.cos(yaw),sa=Math.sin(yaw),sx=dx*ca-dz*sa,sy=dx*sa+dz*ca;
    // OSRS dots: a bright core on a dark one-pixel rim so they read on any terrain
    var x0=Math.round(W/2+sx-size/2),y0=Math.round(W/2+sy-size/2);
    ctx.fillStyle='#000';ctx.fillRect(x0-1,y0-1,size+2,size+2);
    ctx.fillStyle=color; ctx.fillRect(x0,y0,size,size); count.n++;
  }
  // world -> minimap pixel (rotated with the camera like the terrain)
  function toMap(x,z,px,pz,yaw){var dx=(x-px)*SCALE,dz=(z-pz)*SCALE,ca=Math.cos(yaw),sa=Math.sin(yaw);return {x:W/2+dx*ca-dz*sa,y:W/2+dx*sa+dz*ca};}
  // The tiles the walker will actually follow: the island bridge's remaining graph route, else the legacy BFS path.
  function routePoints(){
    try{
      if(typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.active()&&HolmArrivalPlayer.route)return HolmArrivalPlayer.route();
    }catch(e){}
    return (typeof Player!=='undefined'&&Player.path)||[];
  }
  function drawRoute(ctx,yaw,px,pz){
    var pts=routePoints(); if(!pts||!pts.length) return null;
    var n=Math.min(pts.length,400),path=[toMap(px,pz,px,pz,yaw)];
    for(var i=0;i<n;i++) path.push(toMap(pts[i].x,pts[i].z,px,pz,yaw));
    ctx.save();ctx.beginPath();ctx.arc(W/2,W/2,R,0,7);ctx.clip();
    ctx.lineJoin='round';ctx.lineCap='round';
    function stroke(w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();for(var k=0;k<path.length;k++)k?ctx.lineTo(path[k].x,path[k].y):ctx.moveTo(path[k].x,path[k].y);ctx.stroke();}
    stroke(4.4,'rgba(0,0,0,.8)');stroke(2.2,'#ffffff');
    ctx.restore();
    telemetry.routeTiles=pts.length;
    return pts[pts.length-1];
  }
  function drawFlag(ctx,x,y){
    // the OSRS red destination flag: a dark pole planted on the tile, a red pennant with a black edge
    ctx.fillStyle='#000';ctx.fillRect(Math.round(x)-1,Math.round(y)-12,3,13);
    ctx.fillStyle='#d9cfb0';ctx.fillRect(Math.round(x),Math.round(y)-11,1,11);
    ctx.beginPath();ctx.moveTo(x+1,y-12);ctx.lineTo(x+10,y-9);ctx.lineTo(x+1,y-5.5);ctx.closePath();
    ctx.fillStyle='#e0241b';ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='#1a0303';ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x+.5,y+1,3,1.3,0,0,7);ctx.fill();
  }
  function drawDynamic(ctx,yaw,px,pz){
    var count={n:0};
    // OSRS dot law: yellow for folk, red for spoils on the ground.
    if(typeof WORLD!=='undefined'){
      for(var i=0;i<WORLD.npcs.length;i++){ var n=WORLD.npcs[i]; if(!n.dead)
        drawDot(ctx,n.mesh.position.x,n.mesh.position.z,n.isPlayer?'#ffffff':n.t.boss?'#ff4d4d':'#ffff00',4,px,pz,yaw,count); }   // other adventurers (online) are white, as in 2004
      for(var j=0;j<WORLD.clickables.length;j++){ var o=WORLD.clickables[j]; if(o.userData&&o.userData.kind==='friendly')
        drawDot(ctx,o.position.x,o.position.z,'#ffff00',4,px,pz,yaw,count); }
      // island folk: tutors are yellow (friendly), the trial pens' foes yellow as well, like any NPC
      try{ if(typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors){ var tl=HolmIslandTutors.tutors();
        for(var ti=0;ti<tl.length;ti++) drawDot(ctx,tl[ti].x,tl[ti].z,'#ffff00',4,px,pz,yaw,count); }
        if(typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs){ var tn=HolmIslandTrials.npcs();
        for(var tj=0;tj<tn.length;tj++){ var m=tn[tj]; if(!m.dead&&m.mesh) drawDot(ctx,m.mesh.position.x,m.mesh.position.z,'#ffff00',4,px,pz,yaw,count); } } }catch(e){}
      for(var k=0;k<WORLD.drops.length;k++){ var d=WORLD.drops[k];
        drawDot(ctx,d.position.x,d.position.z,'#ff3a2a',3,px,pz,yaw,count); }
    }
    var end=drawRoute(ctx,yaw,px,pz);
    var dest=end||((Player.path&&Player.path.length)?Player.path[Player.path.length-1]:Player.moveTo);
    telemetry.routeTiles=end?telemetry.routeTiles:0;
    if(dest){
      var q=toMap(dest.x,dest.z,px,pz,yaw),x=q.x,y=q.y;
      var dd=Math.hypot(x-W/2,y-W/2);
      if(dd>R-4){ x=W/2+(x-W/2)*(R-4)/dd; y=W/2+(y-W/2)*(R-4)/dd; }   // off the map: pin the flag to the rim, pointing the way
      drawFlag(ctx,x,y);
    }
    telemetry.dynamicMarkers=count.n; telemetry.maxDynamicMarkers=Math.max(telemetry.maxDynamicMarkers,count.n);
  }
  function draw(){
    if(typeof player==='undefined'||!player) return;
    var t=performance.now(), changed=updateCacheKey();
    if(changed||telemetry.staticBuilds===0) buildStatic();
    var now=performance.now(), signature=cache.markerSignature;
    if(changed||now-cache.markerCheckedAt>=500){ signature=markerSignature(); cache.markerCheckedAt=now; }
    if(changed||telemetry.markerBuilds===0||signature!==cache.markerSignature) buildMarkers(signature);
    else telemetry.markerCacheHits++;
    var c=document.getElementById('minimap'); if(!c) return;
    var ctx=c.getContext('2d'), yaw=(typeof camCtl!=='undefined'&&camCtl)?camCtl.yaw:0;
    var px=player.position.x,pz=player.position.z;
    ctx.clearRect(0,0,W,W); ctx.save(); ctx.beginPath();ctx.arc(W/2,W/2,R,0,7);ctx.clip();
    ctx.fillStyle='#2c4a66';ctx.fillRect(0,0,W,W);ctx.translate(W/2,W/2);ctx.rotate(yaw);
    var ox=(cache.cx-px)*SCALE-CACHE/2,oy=(cache.cz-pz)*SCALE-CACHE/2;
    ctx.drawImage(staticCanvas,ox,oy);ctx.drawImage(markerCanvas,ox,oy);ctx.restore();
    drawDynamic(ctx,yaw,px,pz);
    // you: the OSRS white square with a dark rim at the exact centre
    ctx.fillStyle='#000';ctx.fillRect(W/2-3,W/2-3,6,6);ctx.fillStyle='#fff';ctx.fillRect(W/2-2,W/2-2,4,4);
    // inner rim shading: the map sits recessed in its stone ring
    var g=ctx.createRadialGradient(W/2,W/2,R-10,W/2,W/2,R);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(W/2,W/2,R,0,7);ctx.fill();
    // the compass needle lives on its own button (ui_osrs_kit.js); tell it where north is, only when it changes
    if(typeof window.CRCompassSet==='function'&&Math.abs(yaw-(telemetry.compassYaw||1e9))>0.004){telemetry.compassYaw=yaw;window.CRCompassSet(yaw);}
    telemetry.dynamicFrames++; var ms=elapsed(t); telemetry.lastPaintMs=ms;telemetry.maxPaintMs=Math.max(telemetry.maxPaintMs,ms);
  }
  function screenToWorld(x,y,origin,yaw){
    var sx=(x-W/2)/SCALE,sz=(y-W/2)/SCALE,ca=Math.cos(-yaw),sa=Math.sin(-yaw);
    var out={x:origin.x+sx*ca-sz*sa,z:origin.z+sx*sa+sz*ca};
    telemetry.clicks++;telemetry.lastClickWorld={x:+out.x.toFixed(3),z:+out.z.toFixed(3)};return out;
  }
  function snapshot(){ return Object.assign({},telemetry); }
  return {draw:draw,screenToWorld:screenToWorld,snapshot:snapshot};
})();
window.CRMinimap=CRMinimap;
function drawMinimap(){ CRMinimap.draw(); }
