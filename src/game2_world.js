/* ================= ENGINE / WORLD ================= */
let scene, camera, renderer, clock;
const WORLD = {size:320, clickables:[], npcs:[], drops:[], resources:[], grounds:[], fires:[], interiors:[], roofs:[], roofsOff:false};
let player;
const camCtl = {yaw: Math.PI*0.75, pitch: 1.08, dist: 33, dragging:false, lx:0, ly:0};  // dist scaled for 30° FOV (near-ortho)

function initEngine(){
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  const isSmall = (typeof matchMedia==='function') && matchMedia('(max-width: 880px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, isSmall?1.5:2));   // phones render lighter
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8c4d8);
  // OSRS look-pass: fog was starting at 24u and washing the whole scene grey. Push it
  // WAY back so the world reads crisp and the colours stay saturated (OSRS has a distant,
  // subtle horizon haze, not a near fog). (game5's zone system lerps fog COLOR live.)
  scene.fog = new THREE.Fog(0xb4c6cc, 65, 205);

  // OSRS look-pass R3: OSRS is near-ORTHOGRAPHIC (long lens). Drop FOV 50->30 so parallel lines
  // stay parallel and distant objects barely shrink; camCtl.dist is scaled up to match framing.
  camera = new THREE.PerspectiveCamera(30, innerWidth/innerHeight, 0.1, 600);

  // OSRS look-pass R3 (two independent reviews agreed): OSRS surfaces DO show a clear light->dark
  // gradient across facets (baked directional diffuse), so keep a MODERATE sun — but OSRS has NO
  // hard real-time ground cast shadows, which were the biggest tell. Directional ON, castShadow OFF.
  scene.add(new THREE.HemisphereLight(0xdfe2d8, 0x8a8a72, 0.92));   // brighter, even ambient (OSRS is bright, not moody)
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.85);            // stronger key for facet read
  sun.position.set(75, 62, 28);
  sun.castShadow = false;   // no hard cast shadows — the #1 OSRS-illusion breaker
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-160; sun.shadow.camera.right=200;
  sun.shadow.camera.top=200; sun.shadow.camera.bottom=-160;
  sun.shadow.bias=-0.0004;
  sun.shadow.radius=2.6;               // PCFSoft blur — kills the pixelated shadow edge
  scene.add(sun);

  clock = new THREE.Clock();
  addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
}

// OSRS look-pass: MeshLambertMaterial (Gouraud) renders curved geometry SMOOTH — the "clay" look.
// MeshPhongMaterial DOES honour flatShading in r128, giving the hard, faceted per-face read that
// defines OSRS. shininess:0 + black specular keeps it matte (no plastic highlight).
function mat(c){ return new THREE.MeshPhongMaterial({color:c, flatShading:true, shininess:0, specular:0x000000}); }

/* ---------- static collision: rectangles + circles ---------- */
WORLD.colliders = [];
function addRectCollider(x,z,hw,hd){ WORLD.colliders.push({type:'rect',x,z,hw,hd}); }
function addCircleCollider(x,z,r){ WORLD.colliders.push({type:'circle',x,z,r}); }
function collides(x,z,pad,ignoreDoors,plane){
  pad = pad||0.25;
  // plane-aware: colliders default to the ground plane; upper-floor/cave walls carry
  // a plane tag (src/planes.js) and only block movers on that plane
  if(plane===undefined) plane=0;
  for(const c of WORLD.colliders){
    if((c.plane||0)!==plane) continue;
    if(ignoreDoors && c.door) continue;   // planners may look through doors; walkers may not
    if(c.type==='rect'){
      if(Math.abs(x-c.x) < c.hw+pad && Math.abs(z-c.z) < c.hd+pad) return true;
    } else {
      const dx=x-c.x, dz=z-c.z;
      if(dx*dx+dz*dz < (c.r+pad)*(c.r+pad)) return true;
    }
  }
  return false;
}
/* try full move, then axis slides; returns final [x,z] or null if blocked.
   If already inside a collider (teleport, spawn), movement is always allowed
   so entities can walk out — colliders block entry, never exit. */
function slideMove(fx,fz, tx,tz, pad){
  if(collides(fx,fz,pad)) return [tx,tz];
  if(!collides(tx,tz,pad)) return [tx,tz];
  if(!collides(tx,fz,pad)) return [tx,fz];
  if(!collides(fx,tz,pad)) return [fx,tz];
  return null;
}

/* ---------- low-res pixel textures (2004-era tiling look) ---------- */
function pixelTexture(base, speckles, blades){
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,64,64);
  speckles.forEach(([col,n,s])=>{ x.fillStyle=col;
    for(let i=0;i<n;i++) x.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), s, s); });
  if(blades){ x.strokeStyle=blades; x.lineWidth=1;
    for(let i=0;i<26;i++){ const px=Math.random()*64, py=Math.random()*64;
      x.beginPath(); x.moveTo(px,py); x.lineTo(px+(Math.random()-.5)*2, py-3); x.stroke(); } }
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
let TEX={};
function waterTexture(){
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  const x=c.getContext('2d');
  x.fillStyle='#41698a'; x.fillRect(0,0,64,64);
  [['#4a7494',170,3],['#37597a',130,2],['#5b85a5',80,2]].forEach(([col,n,s])=>{
    x.fillStyle=col;
    for(let i=0;i<n;i++) x.fillRect(Math.floor(Math.random()*64),Math.floor(Math.random()*64),s,s);
  });
  // wave crests: short pale horizontal dashes
  x.strokeStyle='#9fd0ea'; x.lineWidth=1;
  for(let i=0;i<22;i++){ const px=Math.random()*60, py=Math.random()*64;
    x.beginPath(); x.moveTo(px,py); x.lineTo(px+3+Math.random()*4,py); x.stroke(); }
  x.strokeStyle='#6fb0d4';
  for(let i=0;i<16;i++){ const px=Math.random()*58, py=Math.random()*64;
    x.beginPath(); x.moveTo(px,py); x.quadraticCurveTo(px+3,py-1.5,px+6,py); x.stroke(); }
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
WORLD.waterTextures=[];
// ---- structured OSRS textures: brick courses / plank seams read as MATERIAL, not noise ----
function brickTexture(base, light, dark, mortar){
  const c=document.createElement('canvas'); c.width=64; c.height=64; const x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,64,64);
  for(let i=0;i<260;i++){ x.fillStyle=(Math.random()<0.5?light:dark); x.fillRect(Math.random()*64|0,Math.random()*64|0,2,2); }
  x.fillStyle=mortar;                                   // recessed mortar grid, brick rows offset
  const rh=16;
  for(let ry=0,row=0; ry<64; ry+=rh,row++){
    x.fillRect(0,ry,64,2);                               // horizontal course
    const off=(row%2)*16;
    for(let bx=off; bx<=64; bx+=32){ x.fillRect(((bx)%64),ry,2,rh); }  // vertical joins, staggered
  }
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
function plankTexture(base, light, dark, seam){
  const c=document.createElement('canvas'); c.width=64; c.height=64; const x=c.getContext('2d');
  x.fillStyle=base; x.fillRect(0,0,64,64);
  for(let i=0;i<200;i++){ x.fillStyle=(Math.random()<0.5?light:dark); x.fillRect(Math.random()*64|0,Math.random()*64|0,Math.random()<0.5?3:2,1); } // grain streaks
  x.fillStyle=seam;                                      // vertical plank seams
  for(let px=0;px<64;px+=16){ x.fillRect(px,0,2,64); }
  const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
function buildTextures(){
  // grass: MUTED olive-khaki, LOW-contrast so tiling disappears (OSRS ground is a colour field)
  TEX.grass = pixelTexture('#67704a', [['#616a46',210,2],['#6d7652',150,2],['#5b6440',110,2]], '#6f7856');
  TEX.water = waterTexture();
  TEX.stone = brickTexture('#847d72','#8d867a','#787065','#6b645a');   // subtle mortar (less crisp tiling)
  TEX.wood  = plankTexture('#68503a','#6f573f','#5b4733','#4c3a2a');    // subtle plank seams
  TEX.thatch= pixelTexture('#a8854a', [['#96743e',220,2],['#ba9659',160,2]]);
  // creamy lime-plaster daub for Tudor cottage walls — warm cream, subtle mottle
  TEX.plaster = pixelTexture('#ece0bf', [['#e3d4ad',150,3],['#f3ecd6',120,3],['#dccba0',55,2]]);
  // thatch roof with pronounced horizontal courses (straw layers) so the slope never reads as a flat polygon
  TEX.thatchRoof = (function(){
    const c=document.createElement('canvas'); c.width=64; c.height=64; const x=c.getContext('2d');
    x.fillStyle='#c4a35c'; x.fillRect(0,0,64,64);
    [['#b8964e',150,2],['#d0b56e',110,2]].forEach(([col,n,s])=>{ x.fillStyle=col; for(let i=0;i<n;i++) x.fillRect(Math.random()*64|0,Math.random()*64|0,s,s); });
    x.strokeStyle='#8c6b34'; x.lineWidth=2;                 // dark seam at each course
    for(let y=5;y<64;y+=11){ x.beginPath(); x.moveTo(0,y); x.lineTo(64,y); x.stroke(); }
    x.strokeStyle='#dcc587'; x.lineWidth=1;                 // straw highlight just below each seam
    for(let y=8;y<64;y+=11){ x.beginPath(); x.moveTo(0,y); x.lineTo(64,y); x.stroke(); }
    const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
    t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
  })();
  loadCreatureTextures();
}

/* ---------- terrain: sea, mainland, tutorial island ---------- */
function makeWaterSurface(geom, x, y, z, repeat, opacity){
  const t=TEX.water.clone(); t.needsUpdate=true; t.repeat.set(repeat,repeat);
  t.offset.set(Math.random(),Math.random());
  const m=new THREE.Mesh(geom, new THREE.MeshLambertMaterial({map:t,
    transparent:opacity<1, opacity:opacity}));
  m.rotation.x=-Math.PI/2; m.position.set(x,y,z);
  scene.add(m);
  WORLD.waterTextures.push(t);
  return m;
}
function buildSea(){
  WORLD.sea = makeWaterSurface(new THREE.PlaneGeometry(1200,1200,1,1), 0,-1.6,0, 170, 1);
}
function animateWater(dt){
  WORLD.waterTextures.forEach((t,i)=>{
    t.offset.x += dt*0.008*(i%2?1:-1);
    t.offset.y += dt*0.005;
  });
}
const HOLM_POND = {x:176, z:144, r:3.4};   // small practice pond on Tutor's Holm (map-anchored)
/* Veyhollow Keep plateau — a flat mound the Lumbridge-style castle sits on (see castle.js) */
/* ---------- MAP-DRIVEN TERRAIN (src/worldgrid.js) ----------
 * The bible map, baked to a biome-per-tile grid, decides what the ground IS; this
 * turns biome into height. Base levels blend over a 5-tile kernel so coasts and
 * cliff feet slope naturally; per-biome relief stays low-poly rolling, never real. */
const BIOME_H = {water:-2.4, grass:0.35, autumn:0.7, swamp:-0.45, desert:0.6, snow:1.9, scar:1.1, rock:1.6};
function biomeBaseH(x,z){
  const b = (typeof gridBiome==='function') ? gridBiome(x,z) : 'grass';
  if(b===null) return -3.0;                 // off the map's edge: open sea
  return BIOME_H[b] !== undefined ? BIOME_H[b] : 0.3;
}
function terrainHeight(x,z){
  let base=0, wsum=0;
  for(let dz=-4;dz<=4;dz+=2) for(let dx=-4;dx<=4;dx+=2){
    const w=1/(1+Math.abs(dx)+Math.abs(dz));
    base += biomeBaseH(x+dx,z+dz)*w; wsum+=w;
  }
  base/=wsum;
  const b = (typeof gridBiome==='function') ? (gridBiome(x,z)||'water') : 'grass';
  const n1=Math.sin(x*0.07)*Math.cos(z*0.06), n2=Math.sin(x*0.013+z*0.017);
  const relief =
      b==='scar'   ? n1*0.8 + Math.sin(x*0.11+z*0.07)*0.5
    : b==='rock'   ? n1*0.9 + n2*0.5
    : b==='snow'   ? n1*0.7 + n2*0.8
    : b==='desert' ? Math.sin(x*0.05)*Math.cos(z*0.045)*0.6
    : b==='swamp'  ? n1*0.25 - Math.max(0, Math.sin(x*0.09+3)*Math.sin(z*0.11+1))*1.5
                       * (typeof pathDist==='function' && pathDist(x,z)<3.5 ? 0 : 1)   // drowned pools, never under a road
    : b==='water'  ? 0
    : n1*0.5 + n2*0.45;                     // grass / autumn heartland
  let h = base + relief;
  // towns and camps sit on gently flattened ground
  for(const k in ZONES){ const d=Math.hypot(x-ZONES[k].pos[0], z-ZONES[k].pos[1]);
    if(d<18){ const k2=d/18; h = h*k2 + 0.25*(1-k2); } }
  // water cells always flood (small ponds/moats included): below the sea plane
  if(b==='water') h=Math.min(h,-1.9);
  // the Commons moat (bible map): the river channel hugs the town's east and south,
  // NE round to WSW. Fords stay dry ONLY at the map's true crossings (gate roads:
  // E to Wardenholm, SE, S to Stonereach, SW to the mill) — a road merely running
  // NEAR the channel doesn't drain it, so the water reads continuous from the air.
  const mdist=Math.hypot(x,z);
  if(mdist>28.5 && mdist<35.5){
    const ma=Math.atan2(z,x);                 // 0 = east, +PI/2 = south
    if(ma>-0.55 && ma<2.95){
      const CROSS=[0.04, 0.95, 1.55, 2.45, 2.75];
      const atCrossing=CROSS.some(a0=>Math.abs(ma-a0)<0.20)
        && (typeof pathDist!=='function' || pathDist(x,z)<3.0);
      if(!atCrossing){
        const rim=Math.min(mdist-28.5, 35.5-mdist, 1.6)/1.6;   // soft banks
        h=Math.min(h, 0.1 - rim*2.8);         // mid-channel ≈ -2.7: true water
      }
    }
  }
  // Wardenholm's moat: the island castle sits fully ringed in water (bible map).
  // Rect ring just outside the island edge; the west bridge crosses on a dry causeway.
  const wrx=Math.abs(x-77), wrz=Math.abs(z);
  const d2r=Math.max(wrx-17.6, wrz-17.6);
  if(d2r>0.2 && d2r<5.4){
    const rim=Math.min(d2r-0.2, 5.4-d2r, 1.4)/1.4;
    h=Math.min(h, 0.35 - rim*2.7);
  }
  h=Math.max(h, causewayLift(x,z, 54,0, 60.5,0, 2.0, 0.32));   // beneath the bridge deck
  // Stonereach Bridge (bible map POI): the south road crosses the Mirrorpond arm on a
  // raised berm — the plank deck (src/stonereach_bridge.js) dresses it as the bridge
  h = Math.max(h, causewayLift(x,z, -2.8,58.5, -3.9,70.5, 2.6, -0.30));
  // carve the Tutor's Holm practice pond
  const hd = Math.hypot(x-HOLM_POND.x, z-HOLM_POND.z);
  if(hd<HOLM_POND.r+0.5) h -= (1-hd/(HOLM_POND.r+0.5))*2.4;
  // the Wilderness Ditch: a dry trench severing the northern wilds. Its floor (-1.45)
  // is below the walkable line (-1.2) but above the sea plane (-1.6) — impassable, dry.
  if(typeof DITCH!=='undefined' && !inDitchGate(x)){
    const dd=Math.abs(z-DITCH.z);
    if(dd<DITCH.half) h=Math.min(h,-1.45);
    else if(dd<DITCH.half+1.6){ const k=(dd-DITCH.half)/1.6; h=Math.min(h, h*k-1.45*(1-k)); }
  }
  return h;
}
/* lift terrain toward `top` within `w` of the segment AB (smooth edges) */
function causewayLift(x,z, ax,az, bx,bz, w, top){
  const abx=bx-ax, abz=bz-az;
  const t=Math.max(0, Math.min(1, ((x-ax)*abx+(z-az)*abz)/(abx*abx+abz*abz)));
  const px=ax+abx*t, pz=az+abz*t;
  const d=Math.hypot(x-px, z-pz);
  if(d>=w) return -999;
  const k=1-d/w;                       // 1 at center, 0 at edge
  return top - (1-k)*1.0;              // gently shoulders down toward the marsh
}
function buildTerrainPatch(cx, cz, sizeX, sizeZ, segsX, segsZ){
  const geo = new THREE.PlaneGeometry(sizeX, sizeZ, segsX, segsZ);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const colors = []; const c = new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const lx=pos.getX(i), lz=pos.getZ(i);
    const x=lx+cx, z=lz+cz;
    let h = terrainHeight(x,z);
    pos.setY(i, h);
    const zone = (typeof gridBiome==='function' && gridBiome(x,z)) || 'grass';
    if(zone==='swamp') c.setHex(0x4e5944);
    else if(zone==='rock') c.setHex(0xa39a85);
    else if(zone==='desert') c.setHex(0xccb578);
    else if(zone==='scar') c.setHex(0x8a7c62);
    else if(zone==='snow') c.setHex(0xe2e9e7);
    else if(zone==='autumn') c.setHex(0x93a04e);          // warm-toned forest floor
    else c.setHex(0x83a055);
    // OSRS-style ground mottle: hand-painted unevenness
    const mot = Math.sin(x*0.31)*Math.sin(z*0.27) + Math.sin(x*0.071+1.3)*Math.sin(z*0.083);
    c.offsetHSL(0, -0.04+mot*0.02, mot*0.035);
    // living-meadow underlay: broad deterministic drifts of dried gold, deep clover and
    // bright tufts (the OSRS blended-underlay read — grass is never one green)
    if((zone==='grass'||zone==='autumn'||zone==='swamp') && h>-0.8){
      const p1 = Math.sin(x*0.045+2.7)*Math.sin(z*0.052+1.1);    // ~20-tile drifts
      const p2 = Math.sin(x*0.11+0.4)*Math.sin(z*0.09+3.3);      // ~7-tile patches
      if(p1>0.35) c.lerp(new THREE.Color(0xa8a049), Math.min(0.33,(p1-0.35)*0.5));
      else if(p1<-0.4) c.lerp(new THREE.Color(0x55703a), Math.min(0.34,(-p1-0.4)*0.55));
      if(p2>0.55) c.lerp(new THREE.Color(0x97ae5c), Math.min(0.28,(p2-0.55)*0.6));
    } else if(zone==='snow' && h>-0.8){
      // snow drifts: brighter windswept patches instead of meadow golds
      const p1 = Math.sin(x*0.05+1.2)*Math.sin(z*0.06+2.4);
      if(p1>0.3) c.lerp(new THREE.Color(0xf2f6f5), Math.min(0.4,(p1-0.3)*0.7));
    }
    // the deeper into the Scarlands, the more scorched the earth
    if(zone==='scar' && typeof scarThreat==='function'){
      const t=Math.min(scarThreat(z),12);
      if(t>0) c.lerp(new THREE.Color(0x6e5a48), t/14);
    }
    if(h<-0.8) c.setHex(zone==='swamp' ? 0x50483c : 0xe2d49a);   // fen banks are mud, not beach
    // the Ditch reads as scoured cut earth, not beach
    if(typeof DITCH!=='undefined' && h<-0.8 && Math.abs(z-DITCH.z)<DITCH.half+1.8) c.setHex(0x57493c);
    if(h>-0.8){
      const pdst = pathDist(x,z);
      if(pdst<2.4) c.setHex(0xb89868);                                    // dirt path
      else if(pdst<3.8) c.lerp(new THREE.Color(0xb89868), (3.8-pdst)/1.4*0.42); // trampled margin
    }
    const hd = Math.hypot(x-HOLM_POND.x, z-HOLM_POND.z);
    if(hd<HOLM_POND.r+1.6 && hd>=HOLM_POND.r-0.4) c.setHex(0xd6c489);
    const ad = Math.hypot(x-ZONES.arena.pos[0], z-ZONES.arena.pos[1]);
    if(ad<11 && h>-0.8) c.setHex(0xd2bc86);              // duel pit sand
    c.offsetHSL(0,(Math.random()-.5)*0.03,(Math.random()-.5)*0.04);
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const tex = TEX.grass.clone(); tex.needsUpdate=true; tex.repeat.set(sizeX/7, sizeZ/7);
  // flat-shaded terrain: faces read as distinct planes (the OSRS ground), texture + tint kept
  const m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({map:tex, vertexColors:true, flatShading:true, shininess:0, specular:0x000000}));
  m.position.set(cx,0,cz);
  m.receiveShadow = true; m.name='ground';
  scene.add(m);
  WORLD.clickables.push(m); WORLD.grounds.push(m);
  return m;
}
/* One rectangular map-driven landmass: the whole bible map, 480x320 tiles.
 * Centre = (x0+w/2, z0+h/2) from WORLDGRID; commons sits at world (0,0). */
function worldRect(){
  const g=(typeof WORLDGRID!=='undefined')?WORLDGRID:{w:480,h:320,x0:-206,z0:-142};
  return {x0:g.x0, z0:g.z0, w:g.w, h:g.h, cx:g.x0+g.w/2, cz:g.z0+g.h/2};
}
function buildGround(){
  const r=worldRect();
  buildTerrainPatch(r.cx, r.cz, r.w, r.h, 300, 200);
  // Tutor's Holm pond water (the one authored pond; every other water body is grid-driven
  // and covered by the global sea plane)
  const hp=HOLM_POND;
  makeWaterSurface(new THREE.CircleGeometry(hp.r+0.4,20), hp.x, -1.52, hp.z, 5, 0.94);
  // the Ditch is a HARD gate (players AND monsters): colliders wall both rims,
  // broken only at the causeways where the roads cross
  if(typeof DITCH!=='undefined'){
    const xs=[r.x0, ...DITCH.gates.flat().sort((a,b)=>a-b), r.x0+r.w];
    for(let i=0;i<xs.length;i+=2){
      const a=xs[i], b=xs[i+1];
      if(b>a) addRectCollider((a+b)/2, DITCH.z, (b-a)/2, DITCH.half);
    }
  }
}
/* analytic ground height — identical math to the generated mesh, no raycasts */
function groundY(x,z){
  // far-offset review lab (the Menagerie) brings its own walkable stone pad
  if(typeof MENAGERIE_PAD!=='undefined' &&
     x>=MENAGERIE_PAD.x0 && x<=MENAGERIE_PAD.x1 && z>=MENAGERIE_PAD.z0 && z<=MENAGERIE_PAD.z1) return 0;
  const r=worldRect();
  if(x<r.x0 || z<r.z0 || x>=r.x0+r.w || z>=r.z0+r.h) return null;
  return terrainHeight(x,z);
}
function gy(x,z){ const y=groundY(x,z); return y===null?0:y; }

/* ---------- trees: blobby canopies, not pine cones ---------- */
/* the tree model is a PROP PIPELINE asset (Bible_References/Tree1.jpg): authored
 * layered-canopy oak. Preloaded once; makeTree clones it (palette-swapped per
 * variant/biome) with the procedural build as dead-tree + not-yet-loaded fallback. */
let _treeGLB=null;
const _treeMats={};
(function(){ try{ new THREE.GLTFLoader().load('assets/models/tree_oak.glb?v=3',
  gl=>{ _treeGLB=gl.scene; }, undefined, e=>console.error('[trees] tree_oak.glb failed', e)); }catch(e){} })();
function _treePalette(key, pal){
  if(_treeMats[key]) return _treeMats[key];
  _treeMats[key]={
    leaf:  new THREE.MeshLambertMaterial({color:pal.leaf}),
    leafD: new THREE.MeshLambertMaterial({color:pal.leafD}),
    trunk: new THREE.MeshLambertMaterial({color:pal.trunk})
  };
  return _treeMats[key];
}
function makeTree(x,z,variant){
  // variant: 'normal' | 'dark' | 'dead'
  variant = variant||'normal';
  const g = new THREE.Group();
  const _autumn=(typeof zoneAt==='function' && zoneAt(x,z)==='emberwood');
  if(variant!=='dead' && _treeGLB){
    const key=_autumn?'autumn':variant;
    const m=_treePalette(key, _autumn ? {leaf:0xc27a30, leafD:0xa85f2e, trunk:0x6b4a2f}
      : variant==='dark' ? {leaf:0x33402c, leafD:0x2c3826, trunk:0x4a3a30}
      : {leaf:0x556333, leafD:0x424f27, trunk:0x6b4a2f});   // yellow-olive like the OSRS ref, not vivid green
    const inst=_treeGLB.clone(true);
    inst.traverse(o=>{ if(o.isMesh){
      o.castShadow=true;
      const mats=(Array.isArray(o.material)?o.material:[o.material]).map(mm=>
        /LEAFD/i.test(mm.name)?m.leafD : /LEAF/i.test(mm.name)?m.leaf : m.trunk);
      o.material=Array.isArray(o.material)?mats:mats[0];
    }});
    const s=0.85+Math.random()*0.3; inst.scale.set(s,s,s);
    g.add(inst);
    g.position.set(x, gy(x,z), z);
    g.rotation.y = Math.random()*6;
    g.userData = {kind:'resource', rtype:'tree', skill:'Woodcutting',
      label:'Chop down Tree', respawn:8, alive:true};
    addCircleCollider(x,z,0.42);
    scene.add(g); WORLD.clickables.push(g); WORLD.resources.push(g);
    return g;
  }
  const trunkCol = variant==='dead'?0x52453a : variant==='dark'?0x4a3a30:0x6b4a2f;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.42,1.9,7), mat(trunkCol));
  trunk.position.y=0.95; trunk.castShadow=true; g.add(trunk);
  if(variant==='dead'){
    for(let i=0;i<3;i++){
      const br=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.1,1.1,5),mat(trunkCol));
      br.position.set(Math.cos(i*2.1)*0.3, 1.7+i*0.25, Math.sin(i*2.1)*0.3);
      br.rotation.z = 0.7+Math.random()*0.5; br.rotation.y=i*2.1;
      g.add(br);
    }
  } else {
    // branches reaching up into the canopy
    for(let i=0;i<3;i++){
      const br=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.09,0.9,5),mat(trunkCol));
      const a=i*2.1+Math.random();
      br.position.set(Math.cos(a)*0.32, 1.95, Math.sin(a)*0.32);
      br.rotation.z=Math.cos(a)*0.55; br.rotation.x=Math.sin(a)*0.55;
      g.add(br);
    }
    // Emberwood is the WARM AUTUMN forest (STORY_BIBLE §3) — amber/rust canopies there
    const autumn = (typeof zoneAt==='function' && zoneAt(x,z)==='emberwood');
    const greens = autumn ? [0xc27a30, 0xb0642a, 0xd08e3a, 0xa85f2e, 0xcc8434]
                 : variant==='dark' ? [0x33402c,0x2c3826,0x3a4a32] : [0x4f7434,0x45682e,0x5a8040,0x52753a];
    const blobs = 4+Math.floor(Math.random()*3);
    for(let i=0;i<blobs;i++){
      const r = 0.7+Math.random()*0.5;
      const geo = new THREE.IcosahedronGeometry(r,1);
      // hand-modeled lumpiness: jitter every vertex radially
      const pos=geo.attributes.position;
      for(let v=0;v<pos.count;v++){
        const j=0.78+Math.random()*0.5;
        pos.setXYZ(v, pos.getX(v)*j, pos.getY(v)*(0.7+Math.random()*0.45), pos.getZ(v)*j);
      }
      geo.computeVertexNormals();
      const blob = new THREE.Mesh(geo, mat(greens[Math.floor(Math.random()*greens.length)]));
      const a=Math.random()*6.28;
      blob.position.set(Math.cos(a)*0.8*Math.random(), 2.3+Math.random()*1.0, Math.sin(a)*0.8*Math.random());
      blob.rotation.set(Math.random(),Math.random(),Math.random());
      blob.castShadow=true; g.add(blob);
    }
  }
  g.position.set(x, gy(x,z), z);
  g.rotation.y = Math.random()*6;
  g.userData = {kind:'resource', rtype:'tree', skill:'Woodcutting',
    label: variant==='dead'?'Chop down Dead tree':'Chop down Tree', respawn:8, alive:true};
  addCircleCollider(x,z,0.42);
  scene.add(g); WORLD.clickables.push(g); WORLD.resources.push(g);
  return g;
}
/* ---------- image-to-3D props (Gemini sprite -> Hunyuan3D-2 mesh) ----------
   Loads a decimated .glb once, normalises scale + seats the base on the ground,
   then clones per placement. TEXTURED meshes (Hunyuan /generation_all) keep their
   own painted texture; untextured (shape-only) meshes fall back to a flat colour.
   See tools/gemini_image.js + the prop pipeline. */
const PROP_CACHE = {};   // url -> {root} when ready, or {queue:[fn]} while loading
function _propLoader(){ return _propLoader._l || (_propLoader._l = new THREE.GLTFLoader()); }
function makeProp(x, z, opts){
  opts = opts || {};
  const g = new THREE.Group();
  g.position.set(x, gy(x,z), z);
  g.rotation.y = (opts.rot!=null) ? opts.rot : Math.random()*6;
  g.userData = {kind:'prop', label: opts.label||'Examine',
    examine: opts.examine || 'Just a curio of the realm.', alive:true};
  if(opts.collide) addCircleCollider(x, z, opts.collide);
  scene.add(g); WORLD.clickables.push(g);

  const place = (tpl)=>{ g.add(tpl.clone(true)); };
  const cached = PROP_CACHE[opts.url];
  if(cached && cached.root){ place(cached.root); return g; }
  if(cached && cached.queue){ cached.queue.push(place); return g; }

  PROP_CACHE[opts.url] = {queue:[place]};
  _propLoader().load(opts.url, (gltf)=>{
    const root = gltf.scene;
    const col = (opts.color!=null) ? opts.color : 0x9a9a9a;
    root.traverse(c=>{ if(c.isMesh){
      c.geometry.computeVertexNormals();        // Hunyuan meshes ship without normals
      const m = c.material;
      if(m && (m.map || m.vertexColors)){
        // textured/painted mesh: keep its colours, just match the world's flat look
        m.flatShading = true;
        if('roughness' in m) m.roughness = 1;
        if('metalness' in m) m.metalness = 0;
        m.needsUpdate = true;
      } else {
        c.material = mat(col);                   // shape-only fallback: flat house colour
      }
      c.castShadow = true;
    }});
    // normalise: scale to a target height, centre on XZ, seat base at ground
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.setScalar((opts.height||0.6) / (size.y||1));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    const ctr = box.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, -box.min.y, -ctr.z);
    const entry = PROP_CACHE[opts.url];
    PROP_CACHE[opts.url] = {root};
    (entry.queue||[]).forEach(fn=>fn(root));
  }, undefined, (err)=>{ console.warn('[prop] load failed:', opts.url, err); });
  return g;
}
/* load a pipeline GLB (image-to-3D monster body, e.g. the Ash Wyrm boss) into a group, normalised
   to a target height and seated on the ground. Async like makeProp: returns the group immediately,
   fills it when the GLB arrives. Keeps the baked UV texture, just flattens the shading. */
const GLB_CACHE = {};
function makeGlbModel(url, opts){
  opts = opts || {};
  const g = new THREE.Group();
  if(opts.skinned){
    // UniRig-rigged creatures: r128 clone() breaks skeleton binding, so load a fresh copy each time
    // and stash its skeleton/bones on the group so the loop can drive the bones procedurally.
    _propLoader().load(url, (gltf)=>{
      const root = gltf.scene;
      root.traverse(c=>{ if(c.isMesh || c.isSkinnedMesh){
        if(c.geometry && c.geometry.computeVertexNormals) c.geometry.computeVertexNormals();
        const m = c.material;
        if(m && (m.map || m.vertexColors)){ m.flatShading=true; if('roughness'in m)m.roughness=1; if('metalness'in m)m.metalness=0; m.needsUpdate=true; }
        else c.material = mat(opts.color!=null ? opts.color : 0x6a5a52);
        c.castShadow = true; c.frustumCulled = false;   // skinned bounds shift while animating
      }});
      root.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      root.scale.setScalar((opts.height||1.6) / (size.y||1));
      root.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(root);
      const ctr = box.getCenter(new THREE.Vector3());
      root.position.set(-ctr.x, -box.min.y, -ctr.z);
      let sk=null; root.traverse(c=>{ if(c.isSkinnedMesh && !sk) sk=c; });
      if(sk && sk.skeleton){ g.userData.skeleton = sk.skeleton; g.userData.bones = sk.skeleton.bones; }
      g.add(root);
    }, undefined, (err)=>{ console.warn('[glb-skinned] load failed:', url, err); });
    return g;
  }
  const place = (root)=>{ g.add(root.clone(true)); };
  const cached = GLB_CACHE[url];
  if(cached && cached.root){ place(cached.root); return g; }
  if(cached && cached.queue){ cached.queue.push(place); return g; }
  GLB_CACHE[url] = {queue:[place]};
  _propLoader().load(url, (gltf)=>{
    const root = gltf.scene;
    root.traverse(c=>{ if(c.isMesh){
      c.geometry.computeVertexNormals();
      const m = c.material;
      if(m && (m.map || m.vertexColors)){
        m.flatShading = true;
        if('roughness' in m) m.roughness = 1;
        if('metalness' in m) m.metalness = 0;
        m.needsUpdate = true;
      } else c.material = mat(opts.color!=null ? opts.color : 0x6a5a52);
      c.castShadow = true;
    }});
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.setScalar((opts.height||1.6) / (size.y||1));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    const ctr = box.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, -box.min.y, -ctr.z);   // seat base at the group origin
    const entry = GLB_CACHE[url];
    GLB_CACHE[url] = {root};
    (entry.queue||[]).forEach(fn=>fn(root));
  }, undefined, (err)=>{ console.warn('[glb-npc] load failed:', url, err); });
  return g;
}
/* ---------- procedural prop builders (crisp OSRS geometry for manufactured items) ----------
   SF3D meshes are too lumpy/rounded for hard-surface props (handles melt); hand-built
   octagonal geometry + flat mat() matches the 2007 look far better. Built at game scale. */
/* Procedural builders live in src/proc_props.js (shared by the game + the review
   tool so geometry/colours never drift). mat() = the game's flat-shaded Lambert. */
const PROC = makeProcProps(THREE, mat);
function buildBucket(){ return PROC.bucket(); }
function buildBarrel(){ return PROC.barrel(); }
function buildCrate(){ return PROC.crate(); }

/* Shared library of props. GLB entries (url) load image-to-3D meshes; `build`
   entries call a procedural builder. placeProp(kind,x,z,rot) dispatches either way. */
const PROP_LIB = {
  cabbage:{url:'assets/models/cabbage.glb', color:0x5f8f3a, height:0.5,  label:'Pick <b>Cabbage</b>',  examine:'A leafy cabbage. Wholesome.'},
  potato: {url:'assets/models/potato.glb',  color:0xc8a45a, height:0.32, label:'Pick <b>Potato</b>',   examine:'An earthy potato.'},
  onion:  {url:'assets/models/onion.glb',   color:0xcaa94a, height:0.34, label:'Pick <b>Onion</b>',    examine:'It might make you cry.'},
  carrot: {url:'assets/models/carrot.glb',  color:0xd9772a, height:0.42, label:'Pick <b>Carrot</b>',   examine:'Good for the eyes, they say.'},
  wheat:  {url:'assets/models/wheat.glb',   color:0xd9c060, height:0.9,  label:'Harvest <b>Wheat</b>', examine:'Ripe golden wheat, ready for the sickle.'},
  bucket: {build:buildBucket, label:'Take <b>Bucket</b>', examine:'A sturdy wooden bucket.'},  // procedural (crisp)
  crate:  {build:buildCrate,  label:'Search <b>Crate</b>',  examine:'A weathered supply crate.', collide:0.5},  // procedural
  barrel: {build:buildBarrel, label:'Search <b>Barrel</b>', examine:'Smells faintly of ale.',    collide:0.5},  // procedural
  sack:   {url:'assets/models/sack.glb',    color:0xcbb78a, height:0.52, label:'Search <b>Sack</b>',   examine:'A heavy grain sack.'},
};
function placeProp(kind, x, z, rot){
  const d = PROP_LIB[kind];
  if(!d){ console.warn('[prop] unknown kind:', kind); return null; }
  if(d.build) return makeProcProp(x, z, d, rot);
  return makeProp(x, z, Object.assign({rot}, d));
}
function makeProcProp(x, z, d, rot){
  const g = new THREE.Group();
  g.position.set(x, gy(x,z), z);
  g.rotation.y = (rot!=null) ? rot : Math.random()*6;
  g.userData = {kind:'prop', label: d.label||'Examine',
    examine: d.examine || 'Just a curio of the realm.', alive:true};
  if(d.collide) addCircleCollider(x, z, d.collide);
  g.add(d.build());
  scene.add(g); WORLD.clickables.push(g);
  return g;
}
const ROCK_KINDS = {
  copper: {vein:0xc77b4a, item:'copper_ore', req:1,  xp:32, chat:'copper',    label:'Mine Copper rock'},
  tin:    {vein:0xb8bcc0, item:'tin_ore',    req:1,  xp:32, chat:'tin',       label:'Mine Tin rock'},
  iron:   {vein:0x8a4a3a, item:'iron_ore',   req:15, xp:46, chat:'iron',      label:'Mine Iron rock'},
  coal:   {vein:0x2a2a2e, item:'coal',       req:30, xp:62, chat:'some coal', label:'Mine Coal rock'},
};
function makeRock(x,z,kindId){
  const kind = ROCK_KINDS[kindId||'copper'];
  const g = new THREE.Group();
  const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9,0), mat(0x8a8276));
  r.position.y=0.5; r.scale.y=0.72; r.castShadow=true; g.add(r);
  const vein = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3,0), mat(kind.vein));
  vein.position.set(0.4,0.7,0.3); g.add(vein);
  const vein2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2,0), mat(kind.vein));
  vein2.position.set(-0.35,0.55,-0.25); g.add(vein2);
  g.position.set(x, gy(x,z), z);
  g.rotation.y = Math.random()*6;
  g.userData = {kind:'resource', rtype:'rock', skill:'Mining',
    label:kind.label, respawn:10, alive:true,
    mat:{item:kind.item, xp:kind.xp, req:kind.req, chat:kind.chat}};
  scene.add(g); WORLD.clickables.push(g); WORLD.resources.push(g);
  return g;
}
function makeFishSpot(x,z,y){
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7,0.07,6,14),
    new THREE.MeshBasicMaterial({color:0xdff4ff, transparent:true, opacity:0.85}));
  ring.rotation.x = -Math.PI/2; g.add(ring);
  const ring2 = ring.clone(); ring2.scale.setScalar(0.55); ring2.position.y=0.02; g.add(ring2);
  g.position.set(x, y!==undefined?y:gy(x,z)+0.1, z);
  g.userData = {kind:'resource', rtype:'fish', skill:'Fishing',
    label:'Net Fishing spot', respawn:6, alive:true, bob:Math.random()*6};
  scene.add(g); WORLD.clickables.push(g); WORLD.resources.push(g);
  return g;
}
function makeCampfire(x,z){
  const g = new THREE.Group();
  for(let i=0;i<3;i++){ const log=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,1,5),mat(0x5a4030));
    log.rotation.z=Math.PI/2; log.rotation.y=i*1.05; log.position.y=0.1; g.add(log); }
  for(let i=0;i<5;i++){ const st=new THREE.Mesh(new THREE.IcosahedronGeometry(0.12,0),mat(0x7a7268));
    const a=i*1.26; st.position.set(Math.cos(a)*0.62,0.06,Math.sin(a)*0.62); g.add(st); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26,0.75,6),
    new THREE.MeshBasicMaterial({color:0xff8c2e}));
  flame.position.y=0.5; g.add(flame); g.userData.flame=flame;
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.14,0.5,5),
    new THREE.MeshBasicMaterial({color:0xffd24a}));
  flame2.position.y=0.55; g.add(flame2);
  g.position.set(x, gy(x,z), z);
  g.userData.kind='fire'; g.userData.label='Cook on Campfire';
  scene.add(g); WORLD.clickables.push(g); WORLD.fires.push(g);
  const light = new THREE.PointLight(0xff9c4a, 0.85, 9); light.position.set(x,1.4+gy(x,z),z); scene.add(light);
  return g;
}

function makeAltar(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.5,0.9), mat(0x8f8a80));
  base.position.y=0.25; g.add(base);
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.22,1.1), mat(0xa8a298));
  top.position.y=0.6; g.add(top);
  const cloth=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.06,0.8), mat(0x6b1f1f));
  cloth.position.y=0.74; g.add(cloth);
  for(const sx of [-0.75,0.75]){
    const cs=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.5,5), mat(0xe8ddb8));
    cs.position.set(sx,0.95,0); g.add(cs);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.18,5),
      new THREE.MeshBasicMaterial({color:0xffd24a}));
    fl.position.set(sx,1.28,0); g.add(fl);
  }
  g.position.set(x, gy(x,z), z);
  g.userData={kind:'altar', label:'Pray at <b>Altar</b>'};
  scene.add(g); WORLD.clickables.push(g);
  WORLD.colliders.push({type:'rect', x, z, hw:1.15, hd:0.7});
  return g;
}
function makeRange(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.0,0.95), mat(0x6e6a64));
  body.position.y=0.5; g.add(body);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.5,0.2), mat(0x1a1410));
  mouth.position.set(0,0.42,0.43); g.add(mouth);
  const ember=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.3,0.06),
    new THREE.MeshBasicMaterial({color:0xff7c2e}));
  ember.position.set(0,0.4,0.5); g.add(ember);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.9,6), mat(0x4a4642));
  pipe.position.set(0.45,1.4,0); g.add(pipe);
  g.position.set(x, gy(x,z), z);
  g.userData={kind:'fire', range:true, label:'Cook on <b>Range</b>'};
  scene.add(g); WORLD.clickables.push(g); WORLD.fires.push(g);
  WORLD.colliders.push({type:'rect', x, z, hw:0.85, hd:0.6});
  return g;
}
/* the stall model (assets/models/stall.glb) is the PROP PIPELINE asset from
 * Bible_References/Stall.jpg — every stall world-wide uses it (town_square.js
 * has its own loader for the square's three; this one covers all other calls). */
let _stallBase2=null, _stallWait2=[];
function _withStallGLB(cb){
  if(_stallBase2){ cb(_stallBase2); return; }
  _stallWait2.push(cb);
  if(_stallWait2.length>1) return;
  new THREE.GLTFLoader().load('assets/models/stall.glb?v=2', gl=>{
    _stallBase2=gl.scene;
    _stallWait2.forEach(f=>f(_stallBase2)); _stallWait2=[];
  }, undefined, e=>console.error('[world] stall.glb failed', e));
}
function makeStall(x,z,color,stallKind){
  const g=new THREE.Group();
  const tint=new THREE.Color(color||0xb03a3a), cream=new THREE.Color(0xe0d8c2);
  _withStallGLB(base=>{
    const inst=base.clone(true);
    inst.traverse(o=>{ if(o.isMesh){
      o.castShadow=true; o.receiveShadow=true;
      const mats=(Array.isArray(o.material)?o.material:[o.material]).map(mm=>{
        const c=mm.clone(); c.metalness=0;
        if(/BLUE/i.test(mm.name)){  c.color.copy(tint);  c.emissive=tint.clone().multiplyScalar(0.40); }
        if(/CREAM/i.test(mm.name)){ c.color.copy(cream); c.emissive=cream.clone().multiplyScalar(0.28); }
        if(/WOODD/i.test(mm.name)) c.color.setHex(0x7d7040);
        else if(/WOOD/i.test(mm.name)) c.color.setHex(0x968a4e);
        return c;
      });
      o.material=Array.isArray(o.material)?mats:mats[0];
    }});
    g.add(inst);
  });
  const goods=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.5), mat(0xc9a85a));
  goods.position.set(-0.5,1.0,0); g.add(goods);
  const goods2=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), mat(0x7a9a4a));
  goods2.position.set(0.45,1.02,0.1); g.add(goods2);
  g.position.set(x, gy(x,z), z);
  if(stallKind){
    g.userData={kind:'stall', stall:stallKind, restock:0,
      label:'Steal from <b>'+(typeof STALL_KINDS!=='undefined'&&STALL_KINDS[stallKind]?STALL_KINDS[stallKind].label:'stall')+'</b>'};
    WORLD.clickables.push(g);
    WORLD.stalls = WORLD.stalls||[]; WORLD.stalls.push(g);
  }
  scene.add(g);
  WORLD.colliders.push({type:'rect', x, z, hw:1.2, hd:0.7});
  return g;
}

function makeTower(x,z){
  const py=gy(x,z);
  const tiers=[[4.6,5.2,0x9a93a8],[3.8,4.6,0x8f88a0],[3.0,4.0,0x847a96]];
  let h=0;
  for(const [w,th,col] of tiers){
    const t=new THREE.Mesh(new THREE.BoxGeometry(w,th,w), mat(col));
    t.position.set(x, py+h+th/2, z); t.castShadow=true; scene.add(t);
    // a ring ledge between tiers
    const ledge=new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.3,w+0.5), mat(0x6b6480));
    ledge.position.set(x, py+h+th, z); scene.add(ledge);
    h+=th;
  }
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.6,3.2,4), mat(0x3a3560));
  roof.position.set(x, py+h+1.6, z); roof.rotation.y=Math.PI/4; scene.add(roof);
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(0.34,0),
    new THREE.MeshBasicMaterial({color:0x7fd4ff}));
  orb.position.set(x, py+h+3.5, z); scene.add(orb);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.8,0.2), mat(0x3a2c20));
  door.position.set(x, py+0.9, z+2.62); scene.add(door);
  for(let i=0;i<3;i++){
    const win=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.1),
      new THREE.MeshBasicMaterial({color:0xffd24a}));
    win.position.set(x+(i-1)*1.1, py+5.4+ (i%2)*2.2, z+ (i===1? 2.1 : 2.35)); scene.add(win);
  }
  const light=new THREE.PointLight(0x7fd4ff, 0.6, 14); light.position.set(x, py+h+3.5, z); scene.add(light);
  WORLD.colliders.push({type:'rect', x, z, hw:2.7, hd:2.7});
}
function makeFurnace(x,z){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.05,1.7,8), mat(0x6e6a64));
  body.position.y=0.85; body.castShadow=true; g.add(body);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(0.7,0.8,8), mat(0x5a5650));
  cap.position.y=2.05; g.add(cap);
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.5,0.1),
    new THREE.MeshBasicMaterial({color:0xff7c2e}));
  mouth.position.set(0,0.62,0.98); g.add(mouth);
  const glow=new THREE.PointLight(0xff7c2e, 0.55, 7); glow.position.set(0,1,1.2); g.add(glow);
  g.position.set(x, gy(x,z), z);
  g.userData={kind:'furnace', label:'Smelt at <b>Furnace</b>'};
  scene.add(g); WORLD.clickables.push(g);
  WORLD.colliders.push({type:'circle', x, z, r:1.05});
  return g;
}
function makeBankBooth(x,z,rotY){
  const g=new THREE.Group();
  const counter=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.05,0.8), mat(0x6b4a2f));
  counter.position.y=0.52; g.add(counter);
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.1,0.95), mat(0x8a6a44));
  top.position.y=1.08; g.add(top);
  for(const sx of [-0.8,0,0.8]){
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.95,5), mat(0xc9b870));
    bar.position.set(sx,1.6,0); g.add(bar);
  }
  const rail=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.08,0.08), mat(0xc9b870));
  rail.position.y=2.05; g.add(rail);
  g.position.set(x, gy(x,z), z); if(rotY) g.rotation.y=rotY;
  g.userData={kind:'bank', label:'Use <b>Bank booth</b>'};
  scene.add(g); WORLD.clickables.push(g);
  WORLD.colliders.push({type:'rect', x, z, hw:1.05, hd:0.55});
  return g;
}

function makeInterior(kind, x, z, w, d, doorSide){
  doorSide = doorSide||'S';
  const py=gy(x,z);
  const add=(mesh,ox,oz,oy)=>{ mesh.position.set(x+ox, py+(oy||0), z+oz); scene.add(mesh); return mesh; };
  const block=(bw,bh,bd,col)=>new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd), mat(col));
  const solid=(ox,oz,hw,hd)=>WORLD.colliders.push({type:'rect', x:x+ox, z:z+oz, hw, hd});
  // local frame: +v points from the door toward the far wall; u runs lateral
  const map=(u,v)=> doorSide==='S' ? [u,-v] : doorSide==='N' ? [u,v] : doorSide==='E' ? [-v,u] : [v,u];
  const span = (doorSide==='S'||doorSide==='N') ? {lat:w, dep:d} : {lat:d, dep:w};
  const A=(mesh,u,v,oy)=>{ const [ox,oz]=map(u,v); return add(mesh,ox,oz,oy); };
  const S=(u,v,hu,hv)=>{ const [ox,oz]=map(u,v);
    (doorSide==='S'||doorSide==='N') ? solid(ox,oz,hu,hv) : solid(ox,oz,hv,hu); };

  if(kind==='bank'){
    // a full-width counter walls off the tellers, exactly like the old halls
    const deep=span.dep/2-1.05;
    A(block(span.lat-0.5,1.05,0.55,0x6b4a2f), 0, deep, 0.52);
    A(block(span.lat-0.3,0.1,0.7,0x8a6a44), 0, deep, 1.08);
    S(0, deep, span.lat/2+0.1, 0.42);   // its pad merges with the far wall's — nothing open behind
    // golden bars over the counter
    for(let i=-2;i<=2;i++) A(new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.85,5), mat(0xc9b870)), i*(span.lat/6), deep, 1.55);
    // ledger shelves flush on the far wall, behind the tellers
    A(block(span.lat-1.2,1.6,0.4,0x6b4a2f), 0, span.dep/2-0.45, 0.8);
    for(let i=-1;i<=1;i++) A(block(0.34,0.22,0.3,0xc9a85a), i*1.1, span.dep/2-0.45, 0.5+((i+1)%2)*0.5);
  }
  if(kind==='pub'){
    // the bar runs from the far wall, sealed to it; one table with stools; barrels in the corner
    const bw=span.lat*0.62;
    A(block(bw,1.0,0.7,0x6b4a2f), -(span.lat/2-bw/2)+0.1, span.dep/2-1.2, 0.5);
    A(block(bw+0.2,0.1,0.85,0x8a6a44), -(span.lat/2-bw/2)+0.1, span.dep/2-1.2, 1.05);
    S(-(span.lat/2-bw/2)+0.1, span.dep/2-1.2, bw/2+0.12, 0.42);
    A(new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.08,8), mat(0x8a6a44)), 0.35, -0.55, 0.8);
    A(new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.8,5), mat(0x6b4a2f)), 0.35, -0.55, 0.4);
    S(0.35,-0.55, 0.5, 0.5);
    for(const a of [0.6,2.7,4.6])
      A(new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.42,6), mat(0x7a5838)),
        0.35+Math.cos(a)*0.78, -0.55+Math.sin(a)*0.78, 0.21);
    // barrels sealed into the far corner
    for(const [bu,bv] of [[span.lat/2-0.55, span.dep/2-0.55],[span.lat/2-0.55, span.dep/2-1.3]])
      { A(new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,0.8,8), mat(0x7a5838)), bu, bv, 0.4); S(bu,bv,0.36,0.36); }
  }
  if(kind==='smithy'){
    // forge sealed to the far wall; the anvil rings mid-floor with room all round
    A(block(1.3,1.1,0.85,0x6e6a64), -(span.lat/2-0.95), span.dep/2-0.65, 0.55);
    A(new THREE.Mesh(new THREE.BoxGeometry(0.7,0.3,0.08), new THREE.MeshBasicMaterial({color:0xff7c2e})),
      -(span.lat/2-0.95), span.dep/2-0.42, 0.5);
    S(-(span.lat/2-0.95), span.dep/2-0.65, 0.75, 0.55);
    const anv=new THREE.Group();
    const top=block(0.66,0.36,0.3,0x4a4642); top.position.y=0.6; anv.add(top);
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,5), mat(0x4a4642));
    horn.rotation.z=Math.PI/2; horn.position.set(0.42,0.66,0); anv.add(horn);
    const base=block(0.38,0.42,0.38,0x6b4a2f); base.position.y=0.21; anv.add(base);
    const [ax,az]=map(0.45,0.15);
    anv.position.set(x+ax, py, z+az);
    anv.userData={kind:'anvil', label:'Smith at <b>Anvil</b>'};
    scene.add(anv); WORLD.clickables.push(anv);
    S(0.45, 0.15, 0.38, 0.22);
    // tool rack flush on the far wall
    A(block(1.2,1.2,0.12,0x6b4a2f), span.lat/2-1.0, span.dep/2-0.3, 1.0);
  }
  if(kind==='arcana'){
    for(const su of [-1,1]){
      A(block(0.42,1.9,1.5,0x4a3a7a), su*(span.lat/2-0.45), span.dep/2-1.0, 0.95);
      S(su*(span.lat/2-0.45), span.dep/2-1.0, 0.34, 0.8);
      for(let i=0;i<4;i++) A(block(0.3,0.22,0.15,[0xb03a3a,0x3a6ab0,0x3a8a4a,0xc9a85a][i]),
        su*(span.lat/2-0.45), span.dep/2-1.0, 0.45+i*0.4);
    }
    A(new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0),
      new THREE.MeshBasicMaterial({color:0x9a7fd4})), 0, span.dep/2-0.6, 1.5);
  }
  if(kind==='chapel'){
    // pews sealed to the side walls, a clear aisle to the altar
    for(const su of [-1,1]) for(let r=0;r<3;r++){
      const v=-span.dep/2+1.7+r*1.0;
      A(block(1.7,0.34,0.32,0x7a5838), su*(span.lat/2-1.12), v, 0.34);
      A(block(1.7,0.55,0.09,0x6b4a2f), su*(span.lat/2-1.12), v-0.18, 0.72);
      S(su*(span.lat/2-1.12), v, 1.0, 0.3);
    }
    for(const su of [-1,1]){
      A(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,1.2,5), mat(0xc9b870)), su*(span.lat/2-0.6), -span.dep/2+0.6, 0.6);
      A(new THREE.Mesh(new THREE.ConeGeometry(0.07,0.2,5),
        new THREE.MeshBasicMaterial({color:0xffd24a})), su*(span.lat/2-0.6), -span.dep/2+0.6, 1.3);
    }
    A(block(0.9,0.04,span.dep-1.2,0x7a1f1f), 0, 0, 0.13);
  }
  if(kind==='keep'){
    // the long table sealed lengthwise mid-hall; the Warden's seat against the far wall
    A(block(3.4,0.12,1.0,0x8a6a44), 0, 0.2, 0.85);
    for(const su of [-1.5,1.5]) A(block(0.16,0.85,0.85,0x6b4a2f), su, 0.2, 0.42);
    S(0, 0.2, 1.8, 0.56);
    for(const su of [-1.2,-0.4,0.4,1.2]) A(new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.45,6), mat(0x7a5838)), su, 1.35, 0.22);
    A(block(0.8,1.4,0.5,0x5a6474), 0, span.dep/2-0.55, 0.7);
    S(0, span.dep/2-0.55, 0.44, 0.3);
    for(const su of [-1,1]) A(block(0.08,1.8,0.9,0x3a5a9a), su*(span.lat/2-0.4), span.dep/2-0.35, 2.4);
    A(new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.05,10),
      new THREE.MeshBasicMaterial({color:0xc9b870})), 0, span.dep/2-1.3, 0.02);
  }
}

function makeStoneWallRun(x1,z1,x2,z2,h){
  h=h||3.2;
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz);
  const cx=(x1+x2)/2, cz=(z1+z2)/2;
  const ang=Math.atan2(dz,dx);
  // grey blockwork, never bare white — the OSRS town-wall look
  const runTex=TEX.stone?TEX.stone.clone():null;
  if(runTex){ runTex.needsUpdate=true; runTex.wrapS=runTex.wrapT=THREE.RepeatWrapping; runTex.repeat.set(Math.max(1,len/2.1), 1.5); }
  const wallMat=runTex?new THREE.MeshLambertMaterial({map:runTex, color:0xc9c4b8}):mat(0xc9c4b8);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(len,h,0.9), wallMat);
  wall.position.set(cx, gy(cx,cz)+h/2, cz); wall.rotation.y=-ang;
  wall.castShadow=true; wall.receiveShadow=true; scene.add(wall);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(len,0.25,1.15), mat(0x8f8a80));   // dark cap: the ring reads CONTINUOUS from the air
  cap.position.set(cx, gy(cx,cz)+h+0.12, cz); cap.rotation.y=-ang; scene.add(cap);
  const teeth=Math.floor(len/1.6);
  for(let i=0;i<teeth;i++){
    const t=(i+0.5)/teeth;
    const tx=x1+dx*t, tz=z1+dz*t;
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,1.0), wallMat);
    m.position.set(tx, gy(cx,cz)+h+0.45, tz); m.rotation.y=-ang; scene.add(m);
  }
  const steps=Math.ceil(len/1.6);
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    WORLD.colliders.push({type:'circle', x:x1+dx*t, z:z1+dz*t, r:0.62});
  }
}
function makeGateTower(x,z){
  const py=gy(x,z);
  const twTex=TEX.stone?TEX.stone.clone():null;
  if(twTex){ twTex.needsUpdate=true; twTex.wrapS=twTex.wrapT=THREE.RepeatWrapping; twTex.repeat.set(1.4,2.4); }
  const twMat=twTex?new THREE.MeshLambertMaterial({map:twTex, color:0xc9c4b8}):mat(0xc9c4b8);
  const t=new THREE.Mesh(new THREE.BoxGeometry(2.2,5.2,2.2), twMat);
  t.position.set(x,py+2.6,z); t.castShadow=true; scene.add(t);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.3,2.7), mat(0x8f8a80));
  cap.position.set(x,py+5.3,z); scene.add(cap);
  for(let i=0;i<4;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6), twMat);
    m.position.set(x+(i<2?-0.8:0.8), py+5.65, z+(i%2?-0.8:0.8)); scene.add(m);
  }
  const ban=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.6,0.7), mat(0x3a5a9a));
  ban.position.set(x, py+4.4, z+1.15); scene.add(ban);
  WORLD.colliders.push({type:'rect', x, z, hw:1.2, hd:1.2});
}
function makeStatue(x,z){
  const py=gy(x,z);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,1.6), mat(0xcfcabe));
  plinth.position.set(x,py+0.45,z); scene.add(plinth);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.42,1.5,5), mat(0xd8d4c8));
  body.position.set(x,py+1.65,z); scene.add(body);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(0.26,0), mat(0xd8d4c8));
  head.position.set(x,py+2.55,z); scene.add(head);
  const sword=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.6,0.16), mat(0xc4c0b4));
  sword.position.set(x+0.55,py+1.6,z); scene.add(sword);
  WORLD.colliders.push({type:'rect', x, z, hw:0.95, hd:0.95});
}
function makeCaveMouth(x,z,target,label){
  const py=gy(x,z);
  const g=new THREE.Group();
  for(let i=0;i<5;i++){
    const a=i/5*Math.PI;
    const r=new THREE.Mesh(new THREE.IcosahedronGeometry(0.6+Math.random()*0.4,0), mat(0x5a5650));
    r.position.set(Math.cos(a)*1.4, 0.3+Math.random()*0.4, -Math.sin(a)*1.0-0.4); g.add(r);
  }
  const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,0.2,8),
    new THREE.MeshBasicMaterial({color:0x080608}));
  hole.position.y=0.02; g.add(hole);
  g.position.set(x,py,z);
  g.userData={kind:'cave', target, label};
  scene.add(g); WORLD.clickables.push(g);
  return g;
}
function makeCrystal(x,z,color){
  const py=gy(x,z);
  const c=new THREE.Mesh(new THREE.ConeGeometry(0.3,1.2+Math.random()*0.8,5),
    new THREE.MeshBasicMaterial({color}));
  c.position.set(x,py+0.6,z); c.rotation.z=(Math.random()-0.5)*0.5; scene.add(c);
  const l=new THREE.PointLight(color, 0.5, 9); l.position.set(x,py+1.4,z); scene.add(l);
}
function makeStalagmite(x,z){
  const py=gy(x,z);
  const s=new THREE.Mesh(new THREE.ConeGeometry(0.5+Math.random()*0.5, 1.6+Math.random()*1.8, 6), mat(0x4a4650));
  s.position.set(x,py+0.9,z); scene.add(s);
  WORLD.colliders.push({type:'circle', x, z, r:0.55});
}

/* ---------- the world-dressing kit: density the old way, instanced the new way ---------- */
function nearPath(px,pz,limit){
  for(const seg of PATHS){
    for(let i=0;i<seg.length-1;i++){
      const [ax,az]=seg[i],[bx,bz]=seg[i+1];
      const dx=bx-ax, dz=bz-az, L2=dx*dx+dz*dz||1;
      let t=((px-ax)*dx+(pz-az)*dz)/L2; t=Math.max(0,Math.min(1,t));
      const qx=ax+dx*t, qz=az+dz*t;
      if(Math.hypot(px-qx,pz-qz)<limit) return true;
    }
  }
  return false;
}
function inAnyRoom(px,pz,pad){
  return WORLD.interiors.some(it=>Math.abs(px-it.x)<it.hw+pad && Math.abs(pz-it.z)<it.hd+pad);
}
function scatterInstanced(geom, material, spots, jitterRot){
  if(!spots.length) return null;
  const im=new THREE.InstancedMesh(geom, material, spots.length);
  const d=new THREE.Object3D();
  spots.forEach((s,i)=>{
    d.position.set(s[0], s[1], s[2]);
    d.rotation.y = jitterRot ? Math.random()*6.28 : 0;
    const k = s[3]||1;
    d.scale.set(k,k,k);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  });
  im.instanceMatrix.needsUpdate=true;
  scene.add(im);
  return im;
}
function sampleOpenGround(n, x0,z0,x1,z1, accept){
  const out=[];
  for(let i=0;i<n*14 && out.length<n;i++){
    const px=x0+Math.random()*(x1-x0), pz=z0+Math.random()*(z1-z0);
    const y=gy(px,pz);
    if(y===null) continue;
    if(!accept(px,pz,y)) continue;
    out.push([px,y,pz, 0.7+Math.random()*0.7]);
  }
  return out;
}
function dressWorld(){
  const dryOpen=(px,pz,y)=> y>-0.9 && !collides(px,pz,0.5) && !nearPath(px,pz,2.0) && !inAnyRoom(px,pz,1.2);
  // grass tufts across the heartlands — one draw call for five hundred
  const tuftGeom=new THREE.ConeGeometry(0.07,0.42,3);
  const grassSpots=sampleOpenGround(520, -70,-80, 85,85, dryOpen);
  scatterInstanced(tuftGeom, mat(0x5a7a3a), grassSpots, true);
  // flower clusters: the classic red and yellow, in patches
  const flowerGeom=new THREE.SphereGeometry(0.09,5,4);
  const mkPatch=(cx,cz,n)=>sampleOpenGround(n, cx-3,cz-3, cx+3,cz+3, dryOpen);
  let reds=[], yells=[];
  for(const [cx,cz] of [[4,8],[-10,-3],[16,24],[26,40],[-26,2],[44,-30],[52,-58],[8,30]]){
    const p=mkPatch(cx,cz,7);
    (Math.random()<0.5?reds:yells).push(...p);
  }
  const stemGeom=new THREE.CylinderGeometry(0.015,0.015,0.32,3);
  scatterInstanced(stemGeom, mat(0x4a6a2a), [...reds,...yells].map(s=>[s[0],s[1]+0.16,s[2],1]), false);
  scatterInstanced(flowerGeom, new THREE.MeshBasicMaterial({color:0xd43a3a}), reds.map(s=>[s[0],s[1]+0.36,s[2],1]), false);
  scatterInstanced(flowerGeom, new THREE.MeshBasicMaterial({color:0xe8c44a}), yells.map(s=>[s[0],s[1]+0.36,s[2],1]), false);
  // reeds wherever land meets water — sampled off the real terrain
  const reedGeom=new THREE.ConeGeometry(0.05,0.95,3);
  const reedSpots=sampleOpenGround(150, -90,-90, 90,90,
    (px,pz,y)=> y>-1.15 && y<-0.78 && !collides(px,pz,0.4));
  scatterInstanced(reedGeom, mat(0x6a7a4a), reedSpots, true);
  // mushroom rings in the dark woods
  const mushGeom=new THREE.ConeGeometry(0.14,0.16,6);
  let mush=[];
  for(const [cx,cz] of [[-63,-41],[-58,-36],[-70,58],[-66,64]]){
    for(let i=0;i<7;i++){
      const a=i/7*6.28, px=cx+Math.cos(a)*1.4, pz=cz+Math.sin(a)*1.4, y=gy(px,pz);
      if(y!==null && y>-0.9 && !collides(px,pz,0.3)) mush.push([px,y+0.1,pz,1]);
    }
  }
  scatterInstanced(mushGeom, new THREE.MeshBasicMaterial({color:0xb05a4a}), mush, false);
  // pebbles by the roadsides — detail that hugs where the eye travels
  const pebGeom=new THREE.IcosahedronGeometry(0.09,0);
  const pebSpots=sampleOpenGround(110, -50,-70, 70,75,
    (px,pz,y)=> y>-0.9 && !collides(px,pz,0.3) && nearPath(px,pz,2.6) && !nearPath(px,pz,1.1));
  scatterInstanced(pebGeom, mat(0x8a8276), pebSpots, true);
}
function makeSignpost(x,z,boards){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,1.9,5), mat(0x6b4a2f));
  post.position.y=0.95; g.add(post);
  // an unlabeled post is pure decoration, like the old roadside markers
  if(!boards) boards=[{ang:0.4},{ang:2.5},{ang:-1.6}];
  boards.forEach((b,i)=>{
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.22,0.05), mat(0x8a6a44));
    const tip=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.18,4), mat(0x8a6a44));
    tip.rotation.z=-Math.PI/2; tip.position.set(0.56,0,0);
    const arm=new THREE.Group(); arm.add(board); arm.add(tip);
    arm.position.y=1.55-i*0.3; arm.rotation.y=b.ang;
    arm.children.forEach(c=>c.position.x+=0.35);
    g.add(arm);
  });
  g.position.set(x, gy(x,z), z);
  if(boards.some(b=>b.text)){
    g.userData={kind:'signpost', boards, label:'Read <b>Signpost</b>'};
    WORLD.clickables.push(g);
  }
  scene.add(g);
  return g;
}
function makeWell(x,z){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.85,0.7,8),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  ring.position.y=0.35; g.add(ring);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.62,0.06,8),
    new THREE.MeshBasicMaterial({color:0x2a4a6a}));
  water.position.y=0.6; g.add(water);
  for(const s of [-1,1]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.3,0.1), mat(0x6b4a2f));
    post.position.set(s*0.75,1.0,0); g.add(post);
  }
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.6,5), mat(0x6b4a2f));
  beam.rotation.z=Math.PI/2; beam.position.y=1.55; g.add(beam);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.05,0.6,4), mat(0x8a4a32));
  roof.position.y=2.0; roof.rotation.y=Math.PI/4; g.add(roof);
  const rope=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.7,3), mat(0xc9b870));
  rope.position.y=1.2; g.add(rope);
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.1,0.18,6), mat(0x6b4a2f));
  bucket.position.y=0.85; g.add(bucket);
  g.position.set(x, gy(x,z), z);
  g.userData={kind:'well', label:'Look down <b>Well</b>'};
  scene.add(g); WORLD.clickables.push(g);
  WORLD.colliders.push({type:'circle', x, z, r:0.95});
  return g;
}
function makeGrave(x,z,style){
  const g=new THREE.Group();
  if(style===0){
    const st=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.8,0.12), mat(0x8a8a86));
    st.position.y=0.4; g.add(st);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.12,8,1,false,0,Math.PI), mat(0x8a8a86));
    cap.rotation.z=Math.PI/2; cap.rotation.y=Math.PI/2; cap.position.y=0.8; g.add(cap);
  } else if(style===1){
    const st=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.66,0.12), mat(0x76766f));
    st.position.y=0.33; g.add(st);
  } else {
    const a=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.7,0.1), mat(0x8a8a86)); a.position.y=0.35; g.add(a);
    const b=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.12,0.1), mat(0x8a8a86)); b.position.y=0.5; g.add(b);
  }
  g.rotation.z=(Math.random()-0.5)*0.14;
  g.rotation.y=(Math.random()-0.5)*0.4;
  g.position.set(x, gy(x,z), z);
  scene.add(g);
  return g;
}
function makeHayBale(x,z){
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.7,8), mat(0xc9a85a));
  b.rotation.z=Math.PI/2; b.position.set(x, gy(x,z)+0.5, z); b.rotation.y=Math.random()*3;
  scene.add(b); return b;
}
function makeTrough(x,z,rotY){
  const g=new THREE.Group();
  const tub=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.4,0.5), mat(0x6b4a2f));
  tub.position.y=0.25; g.add(tub);
  const wat=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.06,0.34), new THREE.MeshBasicMaterial({color:0x2a4a6a}));
  wat.position.y=0.42; g.add(wat);
  g.position.set(x, gy(x,z), z); if(rotY) g.rotation.y=rotY;
  scene.add(g); return g;
}
function makeCrateCluster(x,z){
  const g=new THREE.Group();
  const c1=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.6), mat(0x8a6a44)); c1.position.set(0,0.3,0); g.add(c1);
  const c2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5), mat(0x7a5a38)); c2.position.set(0.62,0.25,0.1); c2.rotation.y=0.3; g.add(c2);
  const c3=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.45), mat(0x8a6a44)); c3.position.set(0.2,0.82,0.05); c3.rotation.y=0.5; g.add(c3);
  const sack=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,5), mat(0xb89a6e)); sack.scale.y=0.8; sack.position.set(-0.55,0.24,0.25); g.add(sack);
  g.position.set(x, gy(x,z), z); g.rotation.y=Math.random()*6;
  scene.add(g); return g;
}
function makeWindmill(x,z){
  const py=gy(x,z);
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2.0,6.5,8),
    new THREE.MeshLambertMaterial({map:TEX.stone, color:0xc9c2b4}));
  tower.position.set(x,py+3.25,z); tower.castShadow=true; scene.add(tower);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(1.7,1.5,8), mat(0x6e4a2e));
  cap.position.set(x,py+7.2,z); scene.add(cap);
  const hub=new THREE.Group();
  for(let i=0;i<4;i++){
    const sailArm=new THREE.Group();
    const spar=new THREE.Mesh(new THREE.BoxGeometry(0.12,3.0,0.08), mat(0x4a3a28));
    spar.position.y=1.5; sailArm.add(spar);
    const cloth=new THREE.Mesh(new THREE.BoxGeometry(0.85,2.4,0.03), mat(0xe8e2d0));
    cloth.position.set(0.42,1.6,0); sailArm.add(cloth);
    sailArm.rotation.z=i*Math.PI/2;
    hub.add(sailArm);
  }
  const axleN=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), mat(0x4a3a28));
  hub.add(axleN);
  hub.position.set(x, py+6.2, z+1.9);
  scene.add(hub);
  WORLD.windmills=WORLD.windmills||[]; WORLD.windmills.push(hub);
  WORLD.colliders.push({type:'circle', x, z, r:2.2});
  return hub;
}
function makeWheatField(x0,z0,x1,z1){
  const spots=[];
  for(let px=x0; px<=x1; px+=0.55){
    for(let pz=z0; pz<=z1; pz+=0.9){
      const y=gy(px,pz);
      if(y!==null && y>-0.9) spots.push([px+(Math.random()-0.5)*0.1, y, pz, 0.85+Math.random()*0.3]);
    }
  }
  const stalk=new THREE.ConeGeometry(0.06,0.85,3);
  scatterInstanced(stalk, mat(0xd8c46a), spots, true);
}
function makeButterflies(){
  WORLD.butterflies=[];
  for(const [cx,cz,col] of [[4,8,0xe8c44a],[16,24,0xd47a9a],[-10,-3,0x7ab8d8],[26,40,0xe8c44a]]){
    const g=new THREE.Group();
    for(const s of [-1,1]){
      const wing=new THREE.Mesh(new THREE.CircleGeometry(0.12,5),
        new THREE.MeshBasicMaterial({color:col, side:THREE.DoubleSide}));
      wing.position.x=s*0.1; wing.userData.side=s;
      g.add(wing);
    }
    g.position.set(cx, gy(cx,cz)+1.2, cz);
    g.userData={cx,cz, t:Math.random()*9};
    scene.add(g); WORLD.butterflies.push(g);
  }
}

/* ---------- the ground patchwork: worn earth where boots actually fall ---------- */
function makeGroundPatch(x,z,r,color,opts){
  opts=opts||{};
  const segs = opts.square ? 4 : 9;
  const geo=new THREE.CircleGeometry(r, segs);
  // pin every vertex to the terrain so the patch hugs slopes
  const pos=geo.attributes.position;
  const m=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    color, map: opts.tex||null,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2,
    transparent: !!opts.alpha, opacity: opts.alpha||1 }));
  m.rotation.x=-Math.PI/2;
  if(opts.square) m.rotation.z=Math.PI/4;
  m.position.set(x, 0, z);
  m.updateMatrixWorld();
  for(let i=0;i<pos.count;i++){
    const wx=x+pos.getX(i)*(opts.square?1:1), wzRaw=pos.getY(i);
    const wz=z-wzRaw;
    const y=gy(x+pos.getX(i), wz);
  }
  m.position.y = (gy(x,z)||0) + 0.035;
  m.receiveShadow=true;
  scene.add(m);
  return m;
}
function makeFurrows(x0,z0,x1,z1){
  // ploughed rows under the wheat
  makeGroundPatch((x0+x1)/2,(z0+z1)/2, Math.max(x1-x0,z1-z0)*0.62, 0x5e4a32, {square:true});
  for(let px=x0+0.4; px<x1; px+=0.7){
    const row=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.05,(z1-z0)-0.4), mat(0x4e3c28));
    row.position.set(px, (gy(px,(z0+z1)/2)||0)+0.06, (z0+z1)/2);
    scene.add(row);
  }
}

/* ---------- habitat props: every creature lives somewhere ---------- */
function makeMound(x,z,r){
  r=r||0.8;
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,7,5), mat(0x6e5a42));
  m.scale.y=0.38; m.position.set(x, gy(x,z)+r*0.12, z);
  scene.add(m);
  const hole=new THREE.Mesh(new THREE.CircleGeometry(r*0.3,7), new THREE.MeshBasicMaterial({color:0x241a10}));
  hole.rotation.x=-Math.PI/2+0.5; hole.position.set(x, gy(x,z)+r*0.3, z+r*0.7);
  scene.add(hole);
  return m;
}
function makeTent(x,z,rotY){
  const g=new THREE.Group();
  const hide=new THREE.Mesh(new THREE.ConeGeometry(1.15,1.6,6,1,true), mat(0x7a5a3a));
  hide.position.y=0.8; g.add(hide);
  for(let i=0;i<3;i++){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.9,4), mat(0x4a3a28));
    const a=i*2.1;
    pole.position.set(Math.cos(a)*0.5, 0.95, Math.sin(a)*0.5);
    pole.rotation.z=Math.cos(a)*0.3; pole.rotation.x=-Math.sin(a)*0.3;
    g.add(pole);
  }
  const flap=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.7), mat(0x5e442c));
  flap.position.set(0,0.36,1.02); flap.rotation.x=-0.25; g.add(flap);
  g.position.set(x, gy(x,z), z); if(rotY) g.rotation.y=rotY;
  scene.add(g);
  WORLD.colliders.push({type:'circle', x, z, r:1.0});
  return g;
}
function makeTotem(x,z){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,2.0,6), mat(0x5e442c));
  post.position.y=1.0; g.add(post);
  const skull=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,5), mat(0xd8d2c4));
  skull.scale.z=0.8; skull.position.y=2.1; g.add(skull);
  for(const s of [-1,1]){
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.3,4), mat(0xc8c0a8));
    horn.position.set(s*0.2,2.22,0); horn.rotation.z=-s*0.8; g.add(horn);
  }
  const band=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.1,0.24), mat(0xb03a3a));
  band.position.y=1.5; g.add(band);
  g.position.set(x, gy(x,z), z); g.rotation.y=Math.random()*6;
  scene.add(g);
  return g;
}

/* ---------- buildings & props ---------- */
function makeBuilding(x,z,w,d,h,color,roofColor,doorSide,opts){
  opts = opts||{};
  // hollow shell with a real doorway — step inside and the roof lifts away
  doorSide = doorSide||'S';   // which wall holds the door: N,S,E,W (S = +z)
  const g = new THREE.Group();
  const t=0.22, doorW=2.2, doorH=1.9;   // generous, so steering never snags the jambs
  const stoneWall = opts.wall==='stone';
  // textured plaster daub, lightly tinted by the building's colour (keeps shop differentiation)
  const plasterTex = TEX.plaster ? TEX.plaster.clone() : null;
  if(plasterTex){ plasterTex.needsUpdate=true; plasterTex.repeat.set(1.6,1.1); }
  const wallMat = stoneWall
    ? new THREE.MeshLambertMaterial({map:TEX.stone, color})
    : (plasterTex ? new THREE.MeshLambertMaterial({map:plasterTex, color}) : mat(color));
  const beamMat = mat(0x46301d);          // dark Tudor timber framing
  function wall(wx,wz,ww,wd){
    const m=new THREE.Mesh(new THREE.BoxGeometry(ww,h,wd), wallMat);
    m.position.set(wx,h/2,wz); m.castShadow=true; m.receiveShadow=true; g.add(m);
    addRectCollider(x+wx, z+wz, ww/2+0.08, wd/2+0.08);
    return m;
  }
  /* ---- half-timber framing: lay dark beams proud of each wall face (the OSRS Tudor look) ---- */
  function frameWall(side, isDoor){
    const horiz = (side==='S'||side==='N');
    const len = horiz ? w : d;
    const faceSign = (side==='S'||side==='E') ? 1 : -1;
    const face = (horiz ? d/2 : w/2) * faceSign + faceSign*0.08;   // sit just proud of the plaster
    const dep=0.11, th=0.15;                                       // beam depth out of wall / thickness
    // horizontal beam of length la centred at height v (optionally tilted by ang for diagonals)
    const hbeam=(u,v,la,lh,ang)=>{
      let m; if(horiz){ m=new THREE.Mesh(new THREE.BoxGeometry(la,lh,dep),beamMat); m.position.set(u,v,face); if(ang)m.rotation.z=ang; }
      else { m=new THREE.Mesh(new THREE.BoxGeometry(dep,lh,la),beamMat); m.position.set(face,v,u); if(ang)m.rotation.x=-ang; }
      m.castShadow=true; g.add(m); return m;
    };
    // vertical stud at offset u
    const stud=(u)=>{ let m; if(horiz){ m=new THREE.Mesh(new THREE.BoxGeometry(th,h-0.1,dep),beamMat); m.position.set(u,(h-0.1)/2,face); }
      else { m=new THREE.Mesh(new THREE.BoxGeometry(dep,h-0.1,th),beamMat); m.position.set(face,(h-0.1)/2,u); } m.castShadow=true; g.add(m); return m; };
    hbeam(0, h-0.12, len, th);                  // top plate
    const nP = Math.max(2, Math.round(len/1.7));
    const panelW = len/nP;
    if(isDoor){
      // jamb studs either side of the doorway; flanking diagonals only
      stud(-doorW/2-0.12); stud(doorW/2+0.12);
      for(const sgn of [-1,1]){
        const uc = sgn*(doorW/2 + (len/2-doorW/2)/2);
        const fw = (len/2-doorW/2);
        if(fw>0.6){ const dy0=0.3, dy1=h*0.5; const L=Math.hypot(fw*0.8,dy1-dy0);
          hbeam(uc,(dy0+dy1)/2,L,th, sgn*Math.atan2(dy1-dy0,fw*0.8)); }
      }
    } else {
      hbeam(0, 0.3, len-0.08, th);              // bottom sill
      for(let i=1;i<nP;i++) stud(-len/2 + i*panelW);
      for(let i=0;i<nP;i++){                     // one diagonal brace per panel (lower half)
        const uc=-len/2 + (i+0.5)*panelW, sgn=(i%2)?1:-1;
        const dy0=0.3, dy1=h*0.5, L=Math.hypot(panelW*0.72,dy1-dy0);
        hbeam(uc,(dy0+dy1)/2,L,th, sgn*Math.atan2(dy1-dy0,panelW*0.72));
      }
    }
  }
  /* ---- framed window with cross-mullion + warm glow, proud of a wall face ---- */
  function addWindow(side, u, vy){
    const horiz=(side==='S'||side==='N');
    const faceSign=(side==='S'||side==='E')?1:-1;
    const face=(horiz?d/2:w/2)*faceSign + faceSign*0.05;
    const ww2=0.92, hh2=1.0, fr=0.1;
    const grp=new THREE.Group();
    const glass=new THREE.Mesh(new THREE.BoxGeometry(ww2-0.16,hh2-0.16,0.05),
      new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
    grp.add(glass);
    const frame=(fw,fh,fx,fy)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(fw,fh,0.09),beamMat); m.position.set(fx,fy,0.02); grp.add(m); };
    frame(ww2,fr, 0, hh2/2-fr/2); frame(ww2,fr, 0,-hh2/2+fr/2);     // top/bottom
    frame(fr,hh2,-ww2/2+fr/2,0); frame(fr,hh2, ww2/2-fr/2,0);        // sides
    frame(0.06,hh2-0.18,0,0); frame(ww2-0.18,0.06,0,0);             // cross mullion
    // shutters
    for(const s of [-1,1]){ const sh=new THREE.Mesh(new THREE.BoxGeometry(0.2,hh2,0.05),mat(0x4a5a3a)); sh.position.set(s*(ww2/2+0.12),0,-0.01); grp.add(sh); }
    if(horiz){ grp.position.set(u,vy,face); } else { grp.position.set(face,vy,u); grp.rotation.y=Math.PI/2; }
    g.add(grp); return grp;
  }
  function doorWall(horizontal, off){
    // two segments flanking the gap + a lintel above it
    const span = horizontal ? w : d;
    const side = (span-doorW)/2;
    if(horizontal){
      wall(-(doorW/2+side/2), off, side, t);
      wall( (doorW/2+side/2), off, side, t);
      const lin=new THREE.Mesh(new THREE.BoxGeometry(doorW+0.2, h-doorH, t), wallMat);
      lin.position.set(0, doorH+(h-doorH)/2, off); g.add(lin);
    } else {
      wall(off, -(doorW/2+side/2), t, side);
      wall(off,  (doorW/2+side/2), t, side);
      const lin=new THREE.Mesh(new THREE.BoxGeometry(t, h-doorH, doorW+0.2), wallMat);
      lin.position.set(off, doorH+(h-doorH)/2, 0); g.add(lin);
    }
  }
  // four walls; the chosen one gets the doorway
  if(doorSide==='S') doorWall(true,  d/2-t/2); else wall(0, d/2-t/2, w, t);
  if(doorSide==='N') doorWall(true, -d/2+t/2); else wall(0,-d/2+t/2, w, t);
  if(doorSide==='E') doorWall(false, w/2-t/2); else wall( w/2-t/2, 0, t, d);
  if(doorSide==='W') doorWall(false,-w/2+t/2); else wall(-w/2+t/2, 0, t, d);
  // corner posts (dark timber quoins)
  for(const sx of [-w/2+0.1, w/2-0.1]) for(const sz of [-d/2+0.1, d/2-0.1]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.18,h,0.18),beamMat);
    beam.position.set(sx,h/2,sz); g.add(beam);
  }
  const band=new THREE.Mesh(new THREE.BoxGeometry(w+0.06,0.16,d+0.06),beamMat);
  band.position.y=h*0.52; g.add(band);             // belt course (mid rail; toggled with roof)
  // wooden floor inside
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.1,0.1,d-0.1),
    new THREE.MeshLambertMaterial({map:TEX.plank||TEX.stone, color:0x8a6a48}));
  floor.position.y=0.08; floor.receiveShadow=true; g.add(floor);
  // half-timber framing on every wall (door wall framed around the opening)
  if(!stoneWall) for(const side of ['S','N','E','W']) frameWall(side, side===doorSide);
  // framed glowing windows on the non-door walls
  const winY=h*0.6;
  for(const side of ['S','N','E','W']){
    if(side===doorSide) continue;
    const len=(side==='S'||side==='N')?w:d;
    if(len>4.6){ addWindow(side,-len*0.22,winY); addWindow(side,len*0.22,winY); }
    else addWindow(side,0,winY);
  }
  let roof;
  const roofG=new THREE.Group();
  // dedicated thatch texture with horizontal courses; clone so repeat is per-building
  const roofTex = (TEX.thatchRoof||TEX.thatch).clone(); roofTex.needsUpdate=true; roofTex.wrapS=roofTex.wrapT=THREE.RepeatWrapping;
  roofTex.repeat.set(2.4, opts.roof==='gable'?2.4:3.2);   // several straw courses up each slope
  // soften the colour tint toward white so the course detail survives (avoids the "flat dark polygon" look)
  const rc=new THREE.Color(roofColor).lerp(new THREE.Color(0xffffff), 0.42);
  const roofMat = new THREE.MeshLambertMaterial({map:roofTex, color:rc});
  const oh=0.5;                                       // eave overhang past the walls
  const eave=new THREE.Mesh(new THREE.BoxGeometry(w+oh,0.18,d+oh),beamMat);
  eave.position.y=h+0.02; eave.castShadow=true; roofG.add(eave);
  const hash=Math.abs(Math.sin(x*12.9898+z*78.233)*43758.5453)%1;   // deterministic per-location variety
  const pitch=(opts.tall?1.0:0.78)+hash*0.22;        // present but not dwarfing the walls
  if(opts.roof==='gable'){
    const alongX = w>=d;
    const span = (alongX?d:w)+oh, len = (alongX?w:d)+oh+0.4, wallLen=(alongX?w:d);
    const rise = span*0.40;                                    // ~39° pitch: present, never dwarfing the walls
    const slopeAng = Math.atan2(rise, span/2), hyp = Math.hypot(span/2, rise)+0.18;
    // straw courses run parallel to the ridge (u along the ridge, v up the slope) — never a chevron
    roofTex.repeat.set(Math.max(2, Math.round(len/2.2)), Math.max(2, Math.round(hyp)));
    const holder=new THREE.Group();
    for(const s of [-1,1]){                                    // the two slopes meet at a ridge beam
      const slope=new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, hyp), roofMat);
      slope.rotation.x = s*slopeAng;
      slope.position.set(0, h + rise/2 + 0.03, s*span/4);
      slope.castShadow=true; slope.receiveShadow=true; holder.add(slope);
    }
    const ridgeBeam=new THREE.Mesh(new THREE.BoxGeometry(len+0.12, 0.18, 0.3), beamMat);
    ridgeBeam.position.y = h + rise + 0.06; ridgeBeam.castShadow=true; holder.add(ridgeBeam);
    // gable ends: the wall carries on up as plaster, timbered with a king post,
    // collar beam and raking bargeboards — never a giant blank triangle
    const tri=new THREE.Shape();
    tri.moveTo(-span/2+oh/2, 0); tri.lineTo(span/2-oh/2, 0); tri.lineTo(0, rise); tri.lineTo(-span/2+oh/2, 0);
    const triGeo=new THREE.ShapeGeometry(tri);
    const triMat=wallMat.clone(); triMat.side=THREE.DoubleSide;
    triMat.color=new THREE.Color(color).multiplyScalar(0.94);
    const rakeLen=Math.hypot(span/2, rise);
    for(const e of [-1,1]){
      const end=new THREE.Group();
      end.add(new THREE.Mesh(triGeo, triMat));
      const king=new THREE.Mesh(new THREE.BoxGeometry(0.14, rise-0.12, 0.12), beamMat);
      king.position.set(0, (rise-0.12)/2, 0.03); end.add(king);
      const collar=new THREE.Mesh(new THREE.BoxGeometry(span*0.46, 0.12, 0.12), beamMat);
      collar.position.set(0, rise*0.42, 0.03); end.add(collar);
      for(const s2 of [-1,1]){                                 // raking bargeboards up each slope edge
        const bb=new THREE.Mesh(new THREE.BoxGeometry(rakeLen, 0.14, 0.16), beamMat);
        bb.rotation.z = -s2*slopeAng;
        bb.position.set(s2*span/4*0.94, rise/2, 0.04); end.add(bb);
      }
      end.rotation.y = e*Math.PI/2;            // timber trim sits proud of the OUTER face on both ends
      end.position.set(e*(wallLen/2 - 0.02), h, 0);
      end.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      holder.add(end);
    }
    if(!alongX) holder.rotation.y = Math.PI/2;
    roofG.add(holder);
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*0.86+oh*0.5, h*pitch, 4), roofMat);
    cone.position.y = h + h*pitch*0.5; cone.rotation.y = Math.PI/4; cone.castShadow=true; roofG.add(cone);
    // ridge cap at the apex (hip roofs only — gables carry their own ridge beam)
    const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.2,0.26),beamMat);
    ridge.position.y=h + h*pitch*0.9; roofG.add(ridge);
  }
  // ~40% of cottages get a small front dormer (variety)
  if(hash>0.6 && opts.roof!=='gable'){
    const onZ=(doorSide==='S'||doorSide==='N'), fs=(doorSide==='S'||doorSide==='E')?1:-1;
    const dm=new THREE.Group();
    dm.add(new THREE.Mesh(new THREE.BoxGeometry(0.9,0.7,0.6),wallMat));
    const cap=new THREE.Mesh(new THREE.ConeGeometry(0.64,0.5,4),roofMat); cap.rotation.y=Math.PI/4; cap.position.y=0.55; dm.add(cap);
    const gl=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.4,0.06),new THREE.MeshLambertMaterial({color:0xffe6a0,emissive:0x6a4e16}));
    gl.position.set(0,0,0.31); dm.add(gl);
    if(onZ) dm.position.set(0,h+h*pitch*0.26, fs*(d/2-0.1)); else { dm.position.set(fs*(w/2-0.1),h+h*pitch*0.26,0); dm.rotation.y=Math.PI/2; }
    dm.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); roofG.add(dm);
  }
  g.add(roofG); roof=roofG;
  WORLD.roofs.push({mesh:roofG, x, z});          // so the global roofs toggle reaches every building
  const corners=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x-w/2,z+d/2],[x+w/2,z+d/2],[x,z]];
  const hs=corners.map(c=>gy(c[0],c[1]));
  const yMin=Math.min(...hs), yMax=Math.max(...hs);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(w+0.5,(yMax-yMin)+0.9,d+0.5),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  plinth.position.y=(yMax-yMin)/2-((yMax-yMin)+0.9)/2+0.15;
  plinth.receiveShadow=true; g.add(plinth);
  g.position.set(x, yMin, z);
  scene.add(g);
  /* ---- the 2006-flavour detail kit: chimney, sign, door (framing/windows added above) ---- */
  // a true working door: hinged at the jamb, clickable, honest about blocking
  (function(){
    const hinge=new THREE.Group();
    // hinge sits at one jamb of the doorway, panel swings from it
    const hp = doorSide==='S'? [-doorW/2, d/2-t/2] : doorSide==='N'? [doorW/2, -d/2+t/2]
             : doorSide==='E'? [w/2-t/2, doorW/2] : [-w/2+t/2, -doorW/2];
    hinge.position.set(x+hp[0], gy(x,z), z+hp[1]);
    const along = (doorSide==='S'||doorSide==='N') ? 0 : Math.PI/2;   // wall direction
    const panel=new THREE.Mesh(new THREE.BoxGeometry(doorW*0.94, doorH-0.12, 0.09),
      new THREE.MeshLambertMaterial({map:TEX.wood||null, color:0x4a3424}));
    panel.castShadow=true;
    panel.position.set((doorSide==='S'||doorSide==='N'?1:0)*doorW*0.47 + (doorSide==='E'||doorSide==='W'?0:0), (doorH-0.12)/2, 0);
    if(doorSide==='E'||doorSide==='W') panel.position.set(0,(doorH-0.12)/2, doorW*0.47);
    const knob=new THREE.Mesh(new THREE.IcosahedronGeometry(0.05,0), mat(0xc9b870));
    knob.position.set(panel.position.x*1.75, doorH*0.5, panel.position.z*1.75 + 0.07);
    hinge.add(panel); hinge.add(knob);
    hinge.rotation.y = along;
    const sign = (doorSide==='S'||doorSide==='W') ? 1 : -1;
    const colRect = (doorSide==='S'||doorSide==='N')
      ? {type:'rect', x:x+hp[0]+ (doorSide==='S'?doorW/2:-doorW/2), z:z+hp[1], hw:doorW/2+0.05, hd:0.14, door:true}
      : {type:'rect', x:x+hp[0], z:z+hp[1]+ (doorSide==='E'?doorW/2:-doorW/2)*-1, hw:0.14, hd:doorW/2+0.05, door:true};
    hinge.userData={kind:'door', open:false, openRot:along+sign*1.95, closedRot:along, col:colRect,
      label:'Open <b>Door</b>'};
    scene.add(hinge);
    WORLD.clickables.push(hinge);
    WORLD.doors=WORLD.doors||[]; WORLD.doors.push(hinge);
    const startOpen = !!opts.doorOpen;
    if(startOpen){ hinge.userData.open=true; hinge.rotation.y=hinge.userData.openRot;
      hinge.userData.label='Close <b>Door</b>'; }
    else WORLD.colliders.push(colRect);
  })();
  // chimney with living smoke
  if(opts.chimney){
    const ch=new THREE.Mesh(new THREE.BoxGeometry(0.55,h*0.9,0.55), new THREE.MeshLambertMaterial({map:TEX.stone}));
    ch.position.set(w/2-0.5, h+h*0.32, -d/4); g.add(ch);
    const lip=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.16,0.7), mat(0x6e6a64));
    lip.position.set(w/2-0.5, h+h*0.77, -d/4); g.add(lip);
    WORLD.smokes = WORLD.smokes||[];
    for(let i=0;i<3;i++){
      const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0),
        new THREE.MeshBasicMaterial({color:0xbfbab2, transparent:true, opacity:0.5}));
      puff.position.set(x+w/2-0.5, 0, z-d/4);
      puff.userData={baseY:gy(x,z)+h+h*0.8, phase:i/3};
      scene.add(puff); WORLD.smokes.push(puff);
    }
  }
  // a hanging trade sign by the door
  if(opts.sign!==undefined){
    const sgn=new THREE.Group();
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.07,0.07), mat(0x4a3a28));
    arm.position.set(0.35,0,0); sgn.add(arm);
    const board=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.42,0.05), mat(opts.sign));
    board.position.set(0.62,-0.32,0); sgn.add(board);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(0.56,0.08,0.06), mat(0xc9b870));
    trim.position.set(0.62,-0.1,0); sgn.add(trim);
    const sp = doorSide==='S'? [doorW/2+0.3, d/2-t/2, 0] : doorSide==='N'? [doorW/2+0.3, -d/2+t/2, Math.PI]
             : doorSide==='E'? [w/2-t/2, doorW/2+0.3, -Math.PI/2] : [-w/2+t/2, doorW/2+0.3, Math.PI/2];
    if(doorSide==='S'||doorSide==='N') sgn.position.set(sp[0], doorH+0.3, sp[1]);
    else sgn.position.set(sp[0], doorH+0.3, sp[1]);
    sgn.rotation.y=sp[2];
    g.add(sgn);
  }
  // the roof lifts when you stand inside; the door is remembered for lost souls
  const doorOut = doorSide==='S' ? {x:x,        z:z+d/2+0.9}
                : doorSide==='N' ? {x:x,        z:z-d/2-0.9}
                : doorSide==='E' ? {x:x+w/2+0.9, z:z}
                :                  {x:x-w/2-0.9, z:z};
  WORLD.interiors.push({x, z, hw:w/2, hd:d/2, roof, band, door:doorOut});
  return g;
}
function makeFence(x1,z1,x2,z2){
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz), n=Math.max(1,Math.round(len/1.8));
  for(let i=0;i<=n;i++){
    const t=i/n, px=x1+dx*t, pz=z1+dz*t, py=gy(px,pz);
    addCircleCollider(px,pz,0.3);                         // fences block: post…
    if(i<n) addCircleCollider(x1+dx*(i+0.5)/n, z1+dz*(i+0.5)/n, 0.3);   // …and mid-rail
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.9,0.12),mat(0x6b4a2f));
    post.position.set(px,py+0.45,pz); post.castShadow=true; scene.add(post);
    if(i<n){
      const nx=x1+dx*(i+0.5)/n, nz=z1+dz*(i+0.5)/n, ny=(py+gy(x1+dx*(i+1)/n,z1+dz*(i+1)/n))/2;
      for(const ry of [0.62,0.3]){
        const rail=new THREE.Mesh(new THREE.BoxGeometry(len/n,0.08,0.07),mat(0x7a5838));
        rail.position.set(nx,ny+ry,nz);
        rail.rotation.y=Math.atan2(dx,dz)+Math.PI/2;
        scene.add(rail);
      }
    }
  }
}
function makeStick(x,z){
  const g=new THREE.Group();
  const n=1+Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.045,0.7+Math.random()*0.5,4),mat(0x6b4a2f));
    st.rotation.z=Math.PI/2; st.rotation.y=Math.random()*6;
    st.position.set((Math.random()-.5)*0.4, 0.04, (Math.random()-.5)*0.4);
    g.add(st);
    const nub=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.2,4),mat(0x6b4a2f));
    nub.rotation.z=Math.PI/2+0.8; nub.position.set(0.15,0.07,0.05); g.add(nub);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeBush(x,z,dark){
  const g=new THREE.Group();
  const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4+Math.random()*0.25,0),
    mat(dark?0x33402c:0x4a7a34));
  b.position.y=0.3; b.scale.y=0.75; b.castShadow=true; g.add(b);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeFlower(x,z){
  const cols=[0xe85c5c,0xe8c45a,0xb05ce8,0xffffff];
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.28,3),mat(0x4a7a34));
  stem.position.y=0.14; g.add(stem);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(0.07,0),
    new THREE.MeshBasicMaterial({color:cols[Math.floor(Math.random()*4)]}));
  head.position.y=0.3; g.add(head);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeMushroom(x,z){
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.2,5),mat(0xd8ccb4));
  stem.position.y=0.1; g.add(stem);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,4,0,6.3,0,1.4),mat(0xa83838));
  cap.position.y=0.2; g.add(cap);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeReed(x,z){
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.7+Math.random()*0.4,3),mat(0x5d7a3a));
    r.position.set((Math.random()-.5)*0.25, 0.4, (Math.random()-.5)*0.25);
    r.rotation.z=(Math.random()-.5)*0.2; g.add(r);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeCliff(x,z,s){
  const r=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),
    new THREE.MeshLambertMaterial({map:TEX.stone, color:0xbab2a4}));
  TEX.stone.repeat.set(2,2);
  r.position.set(x, gy(x,z)+s*0.25, z);
  r.scale.y=0.85; r.rotation.y=Math.random()*6;
  r.castShadow=true; r.receiveShadow=true;
  scene.add(r);
  addCircleCollider(x,z,s*0.8);
}
function makeFountain(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.7,0.5,10), new THREE.MeshLambertMaterial({map:TEX.stone}));
  base.position.y=0.25; g.add(base);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,0.22,10), mat(0x8a8478));
  rim.position.y=0.58; g.add(rim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.25,0.1,10),
    new THREE.MeshLambertMaterial({map:TEX.water.clone(), transparent:true, opacity:0.95}));
  water.material.map.needsUpdate=true; water.material.map.repeat.set(2,2);
  WORLD.waterTextures.push(water.material.map);
  water.position.y=0.56; g.add(water);
  const column=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.42,1.5,8), new THREE.MeshLambertMaterial({map:TEX.stone}));
  column.position.y=1.3; g.add(column);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.6,0.35,9), mat(0x9a948a));
  bowl.position.y=2.1; g.add(bowl);
  const bw=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.08,9),
    new THREE.MeshLambertMaterial({map:TEX.water.clone(), transparent:true, opacity:0.95}));
  bw.material.map.needsUpdate=true; bw.material.map.repeat.set(1,1);
  WORLD.waterTextures.push(bw.material.map);
  bw.position.y=2.24; g.add(bw);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.7,7), mat(0x9a948a));
  spire.position.y=2.6; g.add(spire);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.position.set(x,gy(x,z),z); scene.add(g);
  addCircleCollider(x,z,2.8);
  return g;
}
function makeCactus(x,z){
  const g=new THREE.Group();
  const c=0x5a8a3e;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,1.8+Math.random(),7),mat(c));
  trunk.position.y=0.9; trunk.castShadow=true; g.add(trunk);
  for(const s of [-1,1]){
    if(Math.random()<0.3) continue;
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.15,0.8,6),mat(c));
    arm.position.set(s*0.42,1.1,0); arm.castShadow=true; g.add(arm);
    const el=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.45,6),mat(c));
    el.position.set(s*0.42,0.85,0); el.rotation.z=s*Math.PI/2; g.add(el);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
  addCircleCollider(x,z,0.4);
}
function makeHut(x,z,scale){
  scale=scale||1;
  const g=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(2*scale,2.1*scale,2*scale,9),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  wall.position.y=scale; wall.castShadow=true; g.add(wall);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.7*scale,1.8*scale,9),
    new THREE.MeshLambertMaterial({map:TEX.thatch}));
  roof.position.y=2.9*scale; roof.castShadow=true; g.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.9*scale,1.4*scale,0.2),mat(0x4a3320));
  door.position.set(0,0.7*scale,2.05*scale); g.add(door);
  const hs=[gy(x-2*scale,z),gy(x+2*scale,z),gy(x,z-2*scale),gy(x,z+2*scale),gy(x,z)];
  const yMin=Math.min(...hs), yMax=Math.max(...hs);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.2*scale,2.3*scale,(yMax-yMin)+0.8,9),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  plinth.position.y=(yMax-yMin)/2-((yMax-yMin)+0.8)/2+0.12;
  g.add(plinth);
  g.position.set(x,yMin,z); scene.add(g);
  addCircleCollider(x,z,2.25*scale);
  return g;
}
function makeAshPile(x,z){
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const p=new THREE.Mesh(new THREE.IcosahedronGeometry(0.25+Math.random()*0.3,0),mat(0x5e5852));
    p.position.set((Math.random()-.5)*0.8,0.12,(Math.random()-.5)*0.8);
    p.rotation.set(Math.random(),Math.random(),Math.random());
    g.add(p);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeTorch(x,z){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.9,0.1),mat(0x4a3a28));
  post.position.y=0.95; g.add(post);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.35,5),
    new THREE.MeshBasicMaterial({color:0xff9c3e}));
  fl.position.y=2.0; g.add(fl); g.userData.flame=fl;
  g.position.set(x,gy(x,z),z); scene.add(g);
  WORLD.fires.push(g);
  const light=new THREE.PointLight(0xff9c4a,0.6,7); light.position.set(x,2.1+gy(x,z),z); scene.add(light);
}
function makeRowboat(x,z,rot){
  const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.42,2.6,7,1),mat(0x6b4426));
  hull.rotation.z=Math.PI/2; hull.scale.y=1.4; hull.position.y=0.35; g.add(hull);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.06,5,10),mat(0x4a3422));
  rim.rotation.x=-Math.PI/2; rim.position.y=0.62; rim.scale.x=1.9; g.add(rim);
  g.position.set(x, gy(x,z), z); g.rotation.y=rot||0;
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  scene.add(g);
  return g;
}

/* ---------- characters: angular low-poly, 2007-era silhouette ----------
   Limbs are 4-sided tapered prisms (flat faces forward), boxy heads with
   shaped hair, shoulder pads, two-tone tunics, belts and boots. */
const SKIN_TONES=[0xd8a878,0xc89868,0xa87848,0x8a5e38];
const HAIR_COLS=[0x4a3422,0x2a2018,0x8a5a2a,0xb08d57,0x6b3a1f];
function prism(rTop,rBot,h,color){   // 4-seg cylinder, flat face forward
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBot,h,4,1,false,Math.PI/4), mat(color));
  m.castShadow=true; return m;
}
function shade(hex,f){ const c=new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
/* ---------- painted textures: baked shading, the 2007 hand-painted look ---------- */
const _texCache = {};
function _hx(c){ return '#'+c.toString(16).padStart(6,'0'); }
function _shadeHex(c,f){ const col=new THREE.Color(c); col.multiplyScalar(f); return '#'+col.getHexString(); }
function paintedTex(key, painter){
  if(_texCache[key]) return _texCache[key];
  const c=document.createElement('canvas'); c.width=64; c.height=64;
  painter(c.getContext('2d'));
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
  _texCache[key]=t;
  return t;
}
/* vertical light gradient: lit from above, ambient occlusion toward the hem.
   2007 OSRS kept colours clean and flat-ish — gentle top-light, soft floor. */
function gradBase(x, hex){
  for(let r=0;r<64;r++){
    const f = 1.16 - (r/64)*0.2;
    x.fillStyle=_shadeHex(hex, f);
    x.fillRect(0,r,64,1);
  }
}
function skinTex(skin){
  return paintedTex('skin'+skin, x=>gradBase(x, skin));
}
function faceTex(skin){
  return paintedTex('face'+skin, x=>{
    gradBase(x, skin);
    const dark=_shadeHex(skin,0.38), mid=_shadeHex(skin,0.8);
    // brows: two short shadow strokes
    x.fillStyle=mid; x.fillRect(17,22,11,2); x.fillRect(36,22,11,2);
    // open eyes — the simple, friendly 2007 face: a pale eye-white with a dark pupil
    x.fillStyle='#efe7d6'; x.fillRect(18,26,10,6); x.fillRect(36,26,10,6);
    x.fillStyle=dark;      x.fillRect(21,28,4,4); x.fillRect(39,28,4,4);
    // brow line above the eyes for that determined look
    x.fillStyle=_shadeHex(skin,0.6); x.fillRect(18,25,10,1); x.fillRect(36,25,10,1);
    // nose shade
    x.fillStyle=mid; x.fillRect(30,34,4,7);
    // mouth
    x.strokeStyle=_shadeHex(skin,0.5); x.lineWidth=2;
    x.beginPath(); x.moveTo(25,48); x.quadraticCurveTo(32,50.5,39,48); x.stroke();
    // chin shading
    x.fillStyle=_shadeHex(skin,0.9); x.fillRect(20,55,24,5);
  });
}
function clothTex(hex){
  return paintedTex('cloth'+hex, x=>{
    gradBase(x, hex);
    // painted folds: soft vertical streaks — kept light so colours stay crisp
    for(let i=0;i<5;i++){
      const fx=6+i*12+((i*7)%5);
      x.fillStyle='rgba(0,0,0,0.09)';
      x.fillRect(fx,4,2,56);
      x.fillStyle='rgba(255,255,255,0.08)';
      x.fillRect(fx+2,4,1,56);
    }
    // hem band
    x.fillStyle='rgba(0,0,0,0.16)'; x.fillRect(0,59,64,5);
  });
}
const CRAFTED_BB = {"elements": [{"name": "head", "from": [-4, 24, -3.5], "to": [4, 31, 3.5], "faces": {"north": {"uv": [0, 0, 16, 16]}, "east": {"uv": [16, 0, 24, 8]}, "south": {"uv": [16, 0, 24, 8]}, "west": {"uv": [16, 0, 24, 8]}, "up": {"uv": [16, 0, 24, 8]}, "down": {"uv": [16, 0, 24, 8]}}}, {"name": "hair_cap", "from": [-4.5, 29.5, -4], "to": [4.5, 32.5, 4], "faces": {"north": {"uv": [24, 0, 32, 8]}, "east": {"uv": [24, 0, 32, 8]}, "south": {"uv": [24, 0, 32, 8]}, "west": {"uv": [24, 0, 32, 8]}, "up": {"uv": [24, 0, 32, 8]}, "down": {"uv": [24, 0, 32, 8]}}}, {"name": "hair_back", "from": [-4, 24, 3.4], "to": [4, 30, 4.6], "faces": {"north": {"uv": [24, 0, 32, 8]}, "east": {"uv": [24, 0, 32, 8]}, "south": {"uv": [24, 0, 32, 8]}, "west": {"uv": [24, 0, 32, 8]}, "up": {"uv": [24, 0, 32, 8]}, "down": {"uv": [24, 0, 32, 8]}}}, {"name": "torso", "from": [-5, 14, -2.5], "to": [5, 24, 2.5], "faces": {"north": {"uv": [0, 16, 16, 32]}, "east": {"uv": [0, 16, 16, 32]}, "south": {"uv": [0, 16, 16, 32]}, "west": {"uv": [0, 16, 16, 32]}, "up": {"uv": [0, 16, 16, 32]}, "down": {"uv": [0, 16, 16, 32]}}}, {"name": "belt", "from": [-5.3, 13, -2.8], "to": [5.3, 15, 2.8], "faces": {"north": {"uv": [56, 0, 64, 8]}, "east": {"uv": [56, 0, 64, 8]}, "south": {"uv": [56, 0, 64, 8]}, "west": {"uv": [56, 0, 64, 8]}, "up": {"uv": [56, 0, 64, 8]}, "down": {"uv": [56, 0, 64, 8]}}}, {"name": "sleeve_L", "from": [-7.6, 19, -1.6], "to": [-5.2, 24.4, 1.6], "faces": {"north": {"uv": [16, 16, 24, 24]}, "east": {"uv": [16, 16, 24, 24]}, "south": {"uv": [16, 16, 24, 24]}, "west": {"uv": [16, 16, 24, 24]}, "up": {"uv": [16, 16, 24, 24]}, "down": {"uv": [16, 16, 24, 24]}}}, {"name": "forearm_L", "from": [-7.2, 15, -1.2], "to": [-5.5, 19, 1.2], "faces": {"north": {"uv": [16, 0, 24, 8]}, "east": {"uv": [16, 0, 24, 8]}, "south": {"uv": [16, 0, 24, 8]}, "west": {"uv": [16, 0, 24, 8]}, "up": {"uv": [16, 0, 24, 8]}, "down": {"uv": [16, 0, 24, 8]}}}, {"name": "cuff_L", "from": [-7.1000000000000005, 13.6, -1.3], "to": [-5.6, 15, 1.3], "faces": {"north": {"uv": [16, 24, 24, 32]}, "east": {"uv": [16, 24, 24, 32]}, "south": {"uv": [16, 24, 24, 32]}, "west": {"uv": [16, 24, 24, 32]}, "up": {"uv": [16, 24, 24, 32]}, "down": {"uv": [16, 24, 24, 32]}}}, {"name": "fist_L", "from": [-7.2, 11.8, -1.1], "to": [-5.5, 13.6, 1.1], "faces": {"north": {"uv": [16, 0, 24, 8]}, "east": {"uv": [16, 0, 24, 8]}, "south": {"uv": [16, 0, 24, 8]}, "west": {"uv": [16, 0, 24, 8]}, "up": {"uv": [16, 0, 24, 8]}, "down": {"uv": [16, 0, 24, 8]}}}, {"name": "thigh_L", "from": [-3.4, 7, -1.6], "to": [-0.6, 14, 1.6], "faces": {"north": {"uv": [32, 16, 48, 32]}, "east": {"uv": [32, 16, 48, 32]}, "south": {"uv": [32, 16, 48, 32]}, "west": {"uv": [32, 16, 48, 32]}, "up": {"uv": [32, 16, 48, 32]}, "down": {"uv": [32, 16, 48, 32]}}}, {"name": "calf_flare_L", "from": [-4.2, 1.4, -2.2], "to": [-0.2, 7, 2.2], "faces": {"north": {"uv": [32, 16, 48, 32]}, "east": {"uv": [32, 16, 48, 32]}, "south": {"uv": [32, 16, 48, 32]}, "west": {"uv": [32, 16, 48, 32]}, "up": {"uv": [32, 16, 48, 32]}, "down": {"uv": [32, 16, 48, 32]}}}, {"name": "shoe_L", "from": [-3.4, 0, -2.8], "to": [-0.6, 1.4, 2.0], "faces": {"north": {"uv": [48, 0, 56, 8]}, "east": {"uv": [48, 0, 56, 8]}, "south": {"uv": [48, 0, 56, 8]}, "west": {"uv": [48, 0, 56, 8]}, "up": {"uv": [48, 0, 56, 8]}, "down": {"uv": [48, 0, 56, 8]}}}, {"name": "sleeve_R", "from": [5.2, 19, -1.6], "to": [7.6, 24.4, 1.6], "faces": {"north": {"uv": [16, 16, 24, 24]}, "east": {"uv": [16, 16, 24, 24]}, "south": {"uv": [16, 16, 24, 24]}, "west": {"uv": [16, 16, 24, 24]}, "up": {"uv": [16, 16, 24, 24]}, "down": {"uv": [16, 16, 24, 24]}}}, {"name": "forearm_R", "from": [5.5, 15, -1.2], "to": [7.2, 19, 1.2], "faces": {"north": {"uv": [16, 0, 24, 8]}, "east": {"uv": [16, 0, 24, 8]}, "south": {"uv": [16, 0, 24, 8]}, "west": {"uv": [16, 0, 24, 8]}, "up": {"uv": [16, 0, 24, 8]}, "down": {"uv": [16, 0, 24, 8]}}}, {"name": "cuff_R", "from": [5.4, 13.6, -1.3], "to": [7.3, 15, 1.3], "faces": {"north": {"uv": [16, 24, 24, 32]}, "east": {"uv": [16, 24, 24, 32]}, "south": {"uv": [16, 24, 24, 32]}, "west": {"uv": [16, 24, 24, 32]}, "up": {"uv": [16, 24, 24, 32]}, "down": {"uv": [16, 24, 24, 32]}}}, {"name": "fist_R", "from": [5.5, 11.8, -1.1], "to": [7.2, 13.6, 1.1], "faces": {"north": {"uv": [16, 0, 24, 8]}, "east": {"uv": [16, 0, 24, 8]}, "south": {"uv": [16, 0, 24, 8]}, "west": {"uv": [16, 0, 24, 8]}, "up": {"uv": [16, 0, 24, 8]}, "down": {"uv": [16, 0, 24, 8]}}}, {"name": "thigh_R", "from": [0.6, 7, -1.6], "to": [3.4, 14, 1.6], "faces": {"north": {"uv": [32, 16, 48, 32]}, "east": {"uv": [32, 16, 48, 32]}, "south": {"uv": [32, 16, 48, 32]}, "west": {"uv": [32, 16, 48, 32]}, "up": {"uv": [32, 16, 48, 32]}, "down": {"uv": [32, 16, 48, 32]}}}, {"name": "calf_flare_R", "from": [0.2, 1.4, -2.2], "to": [4.2, 7, 2.2], "faces": {"north": {"uv": [32, 16, 48, 32]}, "east": {"uv": [32, 16, 48, 32]}, "south": {"uv": [32, 16, 48, 32]}, "west": {"uv": [32, 16, 48, 32]}, "up": {"uv": [32, 16, 48, 32]}, "down": {"uv": [32, 16, 48, 32]}}}, {"name": "shoe_R", "from": [0.6, 0, -2.8], "to": [3.4, 1.4, 2.0], "faces": {"north": {"uv": [48, 0, 56, 8]}, "east": {"uv": [48, 0, 56, 8]}, "south": {"uv": [48, 0, 56, 8]}, "west": {"uv": [48, 0, 56, 8]}, "up": {"uv": [48, 0, 56, 8]}, "down": {"uv": [48, 0, 56, 8]}}}], "resolution": {"width": 64, "height": 64}};

/* ---------- Blockbench model loader ----------
   Parses the embedded .bbmodel cubes: builds a BoxGeometry per cube with the
   model's per-face UVs, paints the 64x64 atlas in-engine (so character-creation
   colors apply), and rigs named cubes onto the same animation pivots the
   procedural characters use. Edit crafted_adventurer.bbmodel in Blockbench,
   re-embed, and the game picks it up. */
const BB_SCALE = 0.0605;     // 16 Blockbench units ≈ 0.97 world units
function bbAtlasTex(shirt, skin, hair){
  const key='bb'+shirt+'_'+skin+'_'+hair;
  return paintedTex(key, x=>{
    const pants=0x5a6248, boot=0x6e4a2a, belt=0x8a2a22, cuff=0x3a3026;
    const region=(x0,y0,w,h,hex,folds)=>{
      for(let r=0;r<h;r++){ x.fillStyle=_shadeHex(hex,1.08-(r/h)*0.3); x.fillRect(x0,y0+r,w,1); }
      if(folds) for(const fx of [3,8,13]){ x.fillStyle='rgba(0,0,0,0.18)'; x.fillRect(x0+fx,y0+2,1,h-4); }
    };
    // face 0,0..16,16
    region(0,0,16,16,skin,false);
    const dark=_shadeHex(skin,0.5), mid=_shadeHex(skin,0.72);
    x.fillStyle=dark; x.fillRect(3,6,4,1); x.fillRect(9,6,4,1);      // closed eyes
    x.fillStyle=mid;  x.fillRect(7,7,2,3);                           // nose
    x.fillStyle=dark; x.fillRect(6,10,1,1); x.fillRect(9,10,1,1);    // nostrils
    x.fillStyle=_shadeHex(skin,0.55); x.fillRect(5,12,6,1);          // mouth
    x.fillStyle=_shadeHex(skin,0.88); x.fillRect(0,14,16,2);         // chin shade
    region(16,0,8,8,skin,false);          // skin
    region(24,0,8,8,hair,false);          // hair
    region(48,0,8,8,boot,false);          // boots
    region(56,0,8,8,belt,false);          // belt
    region(0,16,16,16,shirt,true);        // tunic + folds
    region(16,16,8,8,shade(shirt,0.78),false); // sleeves
    region(16,24,8,8,cuff,false);         // cuffs
    region(32,16,16,16,_pantsHexNum(),true);   // trousers + folds
    function _pantsHexNum(){ return pants; }
  });
}
/* THREE BoxGeometry face order: +x, -x, +y, -y, +z, -z.
   We negate Z so the bbmodel's "north" face becomes our +z front. */
const BB_FACE_ORDER = ['west','east','up','down','north','south'];
function bbCube(el, tex){
  const sx=el.to[0]-el.from[0], sy=el.to[1]-el.from[1], sz=el.to[2]-el.from[2];
  const geo=new THREE.BoxGeometry(sx*BB_SCALE, sy*BB_SCALE, sz*BB_SCALE);
  const uvAttr=geo.attributes.uv, res=CRAFTED_BB.resolution.width;
  BB_FACE_ORDER.forEach((fk,fi)=>{
    const f=el.faces[fk]; if(!f) return;
    const [x1,y1,x2,y2]=f.uv;
    const u1=x1/res, u2=x2/res, v1=1-y2/res, v2=1-y1/res;
    const o=fi*4;
    uvAttr.setXY(o,   u1,v2); uvAttr.setXY(o+1, u2,v2);
    uvAttr.setXY(o+2, u1,v1); uvAttr.setXY(o+3, u2,v1);
  });
  const m=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({map:tex}));
  m.castShadow=true;
  m.position.set(
    (el.from[0]+el.to[0])/2*BB_SCALE,
    (el.from[1]+el.to[1])/2*BB_SCALE,
    -(el.from[2]+el.to[2])/2*BB_SCALE);
  return m;
}
function bbCharacter(shirt, skinC, hairC){
  const tex=bbAtlasTex(shirt, skinC||0xd8a878, hairC||0x4a3422);
  const g=new THREE.Group(); const parts={};
  // pivots in bbmodel space (units), converted once
  const P=(x,y,z)=>new THREE.Vector3(x*BB_SCALE,y*BB_SCALE,-z*BB_SCALE);
  const pivots={
    legL:P(-2,14,0), legR:P(2,14,0),
    armL:P(-6.4,23.6,0), armR:P(6.4,23.6,0),
  };
  for(const k in pivots){ const pv=new THREE.Group(); pv.position.copy(pivots[k]);
    g.add(pv); parts[k]=pv; }
  CRAFTED_BB.elements.forEach(el=>{
    const m=bbCube(el, tex);
    const n=el.name;
    let parent=g;
    if(/_L$/.test(n))      parent = /thigh|calf|shoe/.test(n) ? parts.legL : parts.armL;
    else if(/_R$/.test(n)) parent = /thigh|calf|shoe/.test(n) ? parts.legR : parts.armR;
    if(parent!==g) m.position.sub(parent.position);
    parent.add(m);
    if(n==='torso') parts.torso=m;
    if(n==='head')  parts.head=m;
    if(n==='thigh_L') parts.legMeshL=m;
    if(n==='thigh_R') parts.legMeshR=m;
    if(n==='sleeve_L') parts.armMeshL=m;
    if(n==='sleeve_R') parts.armMeshR=m;
  });
  // hand grips at the fists, headTop above the hair
  for(const side of ['L','R']){
    const grip=new THREE.Group();
    grip.position.set(0, P(0,12.7,0).y - parts['arm'+side].position.y, 0.05);
    parts['arm'+side].add(grip);
    parts['hand'+side]=grip;
  }
  parts.headTop=new THREE.Group(); parts.headTop.position.set(0, 32.6*BB_SCALE, 0);
  g.add(parts.headTop);
  g.userData.parts=parts; g.userData.walkT=0; g.userData.bb=true;
  return g;
}
function humanoid(bodyColor, opts){
  opts=opts||{};
  const skin  = opts.skin  || SKIN_TONES[Math.floor(Math.random()*SKIN_TONES.length)];
  const hairC = opts.hair  || HAIR_COLS[Math.floor(Math.random()*HAIR_COLS.length)];
  const legC  = opts.legs  || [0x5a6248,0x4a4a3a,0x55483e,0x4e4438][Math.floor(Math.random()*4)];
  const beltC = opts.belt  || 0x8a2a22;
  const cuffC = shade(bodyColor,0.45);
  const fem = opts.gender==='f';
  const hasBeard = opts.beard!==undefined ? opts.beard : (!fem && !opts.hairLong && Math.random()<0.45);
  const g = new THREE.Group();
  const parts = {};
  const prism5=(rT,rB,h,c)=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(rT,rB,h,8), mat(c)); m.castShadow=true; return m; };

  // ---- legs: two distinct posts (2007 read), straight columns over blocky boots ----
  for(const side of ['L','R']){
    const sgn = side==='L'?-1:1;
    const piv=new THREE.Group(); piv.position.set(sgn*0.115, 0.86, 0);
    // a near-straight thigh-to-ankle column — reads as a leg, never a skirt
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.108,0.092,0.84,6),
      new THREE.MeshLambertMaterial({map:clothTex(legC)}));
    leg.castShadow=true; leg.position.y=-0.42; leg.scale.z=0.92; piv.add(leg);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.11,0.33), mat(0x5a3c22));
    shoe.position.set(0,-0.86,0.06); shoe.castShadow=true; piv.add(shoe);
    g.add(piv); parts['leg'+side]=piv; parts['legMesh'+side]=leg; parts['shoe'+side]=shoe;
  }
  // ---- hips + thin belt ----
  const hips=prism5(0.17,0.19,0.16,legC); hips.position.y=0.92; hips.scale.z=0.66; g.add(hips);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.05,0.24), mat(beltC));
  belt.position.y=1.01; g.add(belt);
  // ---- torso: broad chest, only a gentle waist — the even 2007 body block ----
  parts.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.255,0.185,0.5,8),
    new THREE.MeshLambertMaterial({map:clothTex(bodyColor)}));
  parts.torso.castShadow=true;
  parts.torso.position.y=1.28; parts.torso.scale.set(fem?0.9:1, 1, 0.62); g.add(parts.torso);
  if(opts.emblem!==false && !opts.robe){
    const emC=shade(bodyColor,0.4);
    for(let i=0;i<3;i++){
      const stud=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.045,0.02), mat(emC));
      stud.position.set(0,1.4-i*0.1,0.105); stud.rotation.z=Math.PI/4; g.add(stud);
    }
  }
  // ---- big sloped pauldrons + tapered arms (sleeve/forearm/cuff/fist) ----
  for(const side of ['L','R']){
    const sgn = side==='L'?-1:1;
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.155,0.2,8), mat(shade(bodyColor,0.86)));
    pad.position.set(sgn*(fem?0.235:0.27),1.5,0); pad.rotation.z=sgn*0.55; if(fem) pad.scale.set(0.82,0.95,1); pad.castShadow=true; g.add(pad);
    const piv=new THREE.Group(); piv.position.set(sgn*0.3, 1.46, 0);
    piv.rotation.z = sgn*0.1;
    const sleeve=prism5(0.06,0.05,0.22,shade(bodyColor,0.78)); sleeve.position.y=-0.11; piv.add(sleeve);
    const fore=prism5(0.048,0.038,0.2,skin); fore.position.y=-0.31; piv.add(fore);
    const cuff=prism5(0.05,0.05,0.08,cuffC); cuff.position.y=-0.43; piv.add(cuff);
    const fist=new THREE.Mesh(new THREE.SphereGeometry(0.055,7,6), mat(skin));
    fist.position.y=-0.51; piv.add(fist);
    const grip=new THREE.Group(); grip.position.set(0,-0.53,0.04); piv.add(grip);
    g.add(piv);
    parts['arm'+side]=piv; parts['hand'+side]=grip; parts['armMesh'+side]=sleeve;
  }
  // ---- robe ----
  if(opts.robe){
    for(const side of ['L','R']){ parts['legMesh'+side].visible=false; parts['shoe'+side].visible=false; }
    const skirt=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.37,0.96,8),
      new THREE.MeshLambertMaterial({map:clothTex(opts.robe)}));
    skirt.position.y=0.54; skirt.scale.z=0.82; skirt.castShadow=true; g.add(skirt);
    parts.torso.material = new THREE.MeshLambertMaterial({map:clothTex(opts.robe)});
    const sash=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.06,0.28), mat(shade(opts.robe,0.55)));
    sash.position.y=1.01; g.add(sash);
  }
  // ---- smaller, narrower head: tapered jaw, soft face, shaped hair ----
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.09,7), mat(skin));
  neck.position.y=1.57; g.add(neck);
  const headGeo = new THREE.BoxGeometry(0.21,0.25,0.19);
  { const hp=headGeo.attributes.position;
    for(let v=0;v<hp.count;v++){
      if(hp.getY(v)<0){ hp.setX(v,hp.getX(v)*0.76); hp.setZ(v,hp.getZ(v)*0.8); }
      else { hp.setX(v,hp.getX(v)*0.92); hp.setZ(v,hp.getZ(v)*0.92); }
    }
    headGeo.computeVertexNormals(); }
  const sideM = new THREE.MeshLambertMaterial({map:skinTex(skin)});
  const faceM = new THREE.MeshLambertMaterial({map:faceTex(skin)});
  parts.head = new THREE.Mesh(headGeo, [sideM,sideM,sideM,sideM,faceM,sideM]);
  parts.head.position.y=1.74; parts.head.castShadow=true; g.add(parts.head);
  // ---- hairstyle: cap2/back/fringe are the base "short" cut and stay defined for the
  //      hat/helm hide-logic below; each named style toggles/adds extra pieces. ----
  const hairStyle = opts.hairStyle || (opts.hairLong ? 'long' : 'short');
  const longBack = (hairStyle==='long' || hairStyle==='ponytail');
  const cap2=new THREE.Mesh(new THREE.CylinderGeometry(0.125,0.12,0.1,8), mat(hairC));
  cap2.position.y=1.85; cap2.scale.z=0.88; g.add(cap2);
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.19,longBack?0.38:0.16,0.05), mat(hairC));
  back.position.set(0, longBack?1.66:1.76, -0.105); g.add(back);
  const hairSides=[];
  for(const s of [-1,1]){
    const sidep=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.1,0.13), mat(hairC));
    sidep.position.set(s*0.105,1.79,-0.01); g.add(sidep); hairSides.push(sidep);
  }
  const fringe=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.045,0.04), mat(hairC));
  fringe.position.set(0.008,1.855,0.085); fringe.rotation.z=0.07; g.add(fringe);
  if(hairStyle==='ponytail'){
    const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.052,0.03,0.36,6), mat(hairC));
    tail.position.set(0,1.58,-0.17); tail.rotation.x=0.3; g.add(tail);
  } else if(hairStyle==='bun'){
    const bun=new THREE.Mesh(new THREE.SphereGeometry(0.085,8,7), mat(hairC));
    bun.position.set(0,1.97,-0.11); g.add(bun);
  } else if(hairStyle==='mohawk'){
    hairSides.forEach(s=>s.visible=false); back.visible=false;
    const crest=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.15,0.27), mat(hairC));
    crest.position.set(0,1.97,-0.01); g.add(crest);
  } else if(hairStyle==='bald'){
    cap2.visible=false; back.visible=false; fringe.visible=false; hairSides.forEach(s=>s.visible=false);
  }
  if(hasBeard){
    const beard=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.028,0.13,8), mat(hairC));
    beard.position.set(0,1.64,0.06); beard.scale.z=0.6; g.add(beard);
    const mo=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.025,0.035), mat(hairC));
    mo.position.set(0,1.695,0.085); g.add(mo);
  }
  parts.headTop = new THREE.Group(); parts.headTop.position.y=1.9; g.add(parts.headTop);
  if(opts.hat==='wizard'){
    cap2.visible=false; fringe.visible=false;
    const brim=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.05,8), mat(opts.hatColor||0x4a3a7a));
    brim.position.y=0; brim.scale.z=0.9; parts.headTop.add(brim);
    const cone=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.42,5), mat(opts.hatColor||0x4a3a7a));
    cone.position.y=0.22; parts.headTop.add(cone);
  }
  // ---- worn armour (opt-in per NPC type; reuses the player's own gear builders so an
  //      armoured NPC reads identically to an armoured player). Every piece is rig-local,
  //      so it scales with opts.scale and rides the same head/arm pivots the anim layer
  //      drives — e.g. a shield in handL is carried up by armL when blockReact fires. ----
  if(opts.helm!==undefined && typeof helmMesh==='function'){
    cap2.visible=false; fringe.visible=false; back.visible=false;   // skull is under the helm now
    const hm=helmMesh(opts.helm); hm.position.y=-0.04; parts.headTop.add(hm);
  }
  if(!opts.robe && opts.armour!==undefined && typeof bodyArmorMesh==='function')
    g.add(bodyArmorMesh(opts.armour));                              // chest plate is rig-absolute (~y1.26)
  if(!opts.robe && opts.legArmour!==undefined && typeof legArmorMesh==='function')
    g.add(legArmorMesh(opts.legArmour, parts));                    // hides the cloth legs, plates the pivots
  if(opts.shield && typeof shieldMesh==='function'){
    const sh=shieldMesh(); sh.rotation.y=Math.PI/2; parts.handL.add(sh);
  }

  g.scale.setScalar(opts.scale||1);
  g.userData.parts = parts;
  g.userData.walkT = 0;
  return g;
}
/* tweened attack animations, one motion per archetype so each weapon class reads
   distinctly: slash (diagonal cut), stab (straight thrust), crush (overhead slam),
   bow (draw + release), cast (raise + flick). Drives armR/handR/torso (+ armL for the
   bowstring); the root scale/rotation are left to hit-react & death so they never fight. */
function tickSwing(g, dt){
  const s=g.userData.swing; if(!s) return false;
  const p=g.userData.parts; if(!p||!p.armR){ g.userData.swing=null; return false; }
  s.t += dt;
  const f = Math.min(1, s.t/s.dur);
  const ease = x => 1-Math.pow(1-x,3);          // ease-out: snap then settle
  const type = s.type||'slash';
  let armX=0, armZ=0, wrist=0, twist=0, lean=0, armLX=null;
  if(type==='stab'){                 // cock the elbow, drive a straight thrust, lunge in
    if(f<0.30){ const k=f/0.30;            armX=-0.9*k;          wrist=-0.5*k;        lean=-0.10*k; }
    else if(f<0.52){ const e=ease((f-0.30)/0.22); armX=-0.9-0.7*e; wrist=-0.5+0.9*e;  lean=-0.10+0.45*e; }
    else { const k=(f-0.52)/0.48;          armX=-1.6*(1-k);      wrist=0.4*(1-k);     lean=0.35*(1-k); }
  } else if(type==='crush'){         // hoist overhead, slam straight down, bend into it
    if(f<0.40){ const e=ease(f/0.40);             armX=-3.2*e;                        lean=-0.12*e; }
    else if(f<0.58){ const e=ease((f-0.40)/0.18); armX=-3.2+3.7*e; wrist=0.5*e;       lean=-0.12+0.42*e; }
    else { const k=(f-0.58)/0.42;          armX=0.5*(1-k);       wrist=0.5*(1-k);     lean=0.30*(1-k); }
  } else if(type==='bow'){           // bow arm held forward, off-arm draws the string then releases
    armX=-1.45; twist=-0.12;
    if(f<0.45){ const e=ease(f/0.45);             armLX=-1.0-1.3*e; }
    else if(f<0.55){                               armLX=-2.3; }
    else { const e=ease((f-0.55)/0.45);           armLX=-2.3+1.3*e; }
  } else if(type==='cast'){          // raise the staff forward and flick the spell out
    if(f<0.35){ const e=ease(f/0.35);             armX=-1.7*e;     wrist=-0.3*e;      lean=0.05*e; }
    else if(f<0.55){ const e=ease((f-0.35)/0.20); armX=-1.7+0.5*e; wrist=-0.3+0.8*e;  lean=0.05+0.08*e; }
    else { const k=(f-0.55)/0.45;          armX=-1.2*(1-k);      wrist=0.5*(1-k);     lean=0.13*(1-k); }
  } else {                           // slash: raise over the shoulder, fast diagonal cut, recover
    if(f<0.35){ const k=f/0.35;            armX=-2.9*k; armZ=-0.4*k;        wrist=0.6*k;     twist=-0.3*k; }
    else if(f<0.6){ const k=(f-0.35)/0.25; armX=-2.9+2.5*k; armZ=-0.4+0.75*k; wrist=0.6-1.4*k; twist=-0.3+0.55*k; }
    else { const k=(f-0.6)/0.4;            armX=-0.4*(1-k); armZ=0.35*(1-k);  wrist=-0.8*(1-k); twist=0.25*(1-k); }
  }
  p.armR.rotation.x=armX; p.armR.rotation.z=armZ;
  if(p.handR) p.handR.rotation.x=wrist;
  if(p.torso){ p.torso.rotation.y=twist; p.torso.rotation.x=lean; }
  if(armLX!==null && p.armL) p.armL.rotation.x=armLX;
  if(f>=1){ g.userData.swing=null; g.userData.swinging=false;
    p.armR.rotation.set(0,0,0); if(p.handR) p.handR.rotation.x=0;
    if(p.torso){ p.torso.rotation.y=0; p.torso.rotation.x=0; }
    if(p.armL) p.armL.rotation.x=0; }
  return true;
}
/* ---------- hit-react + death: per-instance, owns g.scale/rotation only ----------
   walkAnim/beastAnim/swing/lookAt never write the body ROOT scale, and a dead body
   no longer gets lookAt, so these can drive the root transform without ever fighting
   movement, the swing, or facing. All state lives on the instance — shared NPC_TYPES
   and shared materials are never touched. */
function hitReact(g){
  if(!g||!g.userData) return;
  const ud=g.userData;
  if(ud._baseScale===undefined) ud._baseScale = g.scale.x || 1;
  ud.hit = {t:0, dur:0.24};
}
function tickHit(g, dt){
  const ud=g.userData, h=ud&&ud.hit; if(!h) return false;
  h.t += dt;
  const f = Math.min(1, h.t/h.dur);
  const base = ud._baseScale || 1;
  const pulse = Math.exp(-f*7) * Math.cos(f*22);   // sharp squash on impact, springs back with a small wobble
  g.scale.set(base*(1+0.14*pulse), base*(1-0.20*pulse), base*(1+0.14*pulse));
  if(f>=1){ ud.hit=null; g.scale.setScalar(base); }
  return true;
}
/* block / parry: a brief defensive pose when a hit is fully absorbed (a 0 hitsplat).
   Distinct from the hit-flinch (which owns root scale) — this raises a guard through
   CHILD parts only, on channels no other anim writes (armL.z, handL.x, head.x; beast
   head.x / claw.arm.x — the swing tracks own head.z / arm.z), and a sin(pi*f) envelope
   returns every channel to exact rest at f>=1. Skipped on a corpse so a dead body never
   guards; nothing on shared NPC_TYPES is touched. */
function blockReact(g){
  if(!g||!g.userData) return;
  const ud=g.userData;
  if(ud.death) return;                       // a corpse doesn't parry
  if(ud.gmix && ud.gmix.block){ ud.gmix.block.reset(); ud.gmix.block.play(); return; }   // GLB char: baked clip
  ud.block = {t:0, dur:0.34};
}
function tickBlock(g, dt){
  const ud=g.userData, b=ud&&ud.block, p=ud&&ud.parts;
  if(!b||!p){ if(ud) ud.blocking=false; return false; }
  b.t += dt;
  const f = Math.min(1, b.t/b.dur);
  const amp = Math.sin(Math.PI*f);           // 0 -> 1 (at f=0.5) -> 0, so it self-returns to rest
  ud.blocking = true;                         // walkAnim skips its armL writes while this owns the guard
  if(p.armL){                                 // humanoid / brute: snap the off-arm up across the chest
    p.armL.rotation.x = -1.4*amp;
    p.armL.rotation.z =  0.7*amp;
    if(p.handL) p.handL.rotation.x = -0.5*amp;
    if(p.head)  p.head.rotation.x =  0.16*amp;   // chin tucks behind the guard (bob owns head.z, this is free)
  } else if(p.head){                          // wolf: rear the head back off the blow (swing owns head.z)
    p.head.rotation.x = -0.32*amp;
  } else if(p.maw){                            // crawler: flare the mandibles wide in a warding clamp (swing owns maw.y small)
    for(const md of p.maw) md.m.rotation.y = md.sign*(0.4+0.6*amp);
  } else if(p.claws){                          // crab: hoist both pincers up as a shield (swing owns arm.z)
    for(const c of p.claws) c.arm.rotation.x = -0.5*amp;
  }
  if(f>=1){                                   // snap every guard channel back to exact rest
    if(p.armL){ p.armL.rotation.x=0; p.armL.rotation.z=0; if(p.handL) p.handL.rotation.x=0; if(p.head) p.head.rotation.x=0; }
    else if(p.head){ p.head.rotation.x=0; }
    else if(p.maw){ for(const md of p.maw) md.m.rotation.y=md.sign*0.4; }
    else if(p.claws){ for(const c of p.claws) c.arm.rotation.x=0; }
    ud.block=null; ud.blocking=false; return false;
  }
  return true;
}
/* read the archetype off the parts each builder exposed — death motion is dispatched
   on this so a crab, a crawler, a wolf and a brute don't all die the same way. Pure
   read of the rig that's already there; nothing is mutated on shared NPC_TYPES. */
function _deathStyle(p){
  if(!p) return 'topple';
  if(p.claws) return 'crab';        // crabBeast: front pincers + stubby legs
  if(p.maw)   return 'crawler';     // crawlerBeast: scissor mandibles + six legs
  if(p.jaw && p.legs) return 'wolf';// wolfBeast: hinged jaw + four legs
  if(p.armR && p.legs) return 'brute';   // bruteBeast: biped boss with real arms
  if(p.legL || p.armL) return 'biped';   // humanoid rig (walkAnim parts)
  return 'topple';
}
/* tip the body over and sink it — the caller hides the mesh once this returns false.
   The ROOT only ever rolls about z (this is the one axis that provably preserves the
   facing baked into rotation.y), so every style varies the topple's size/speed and
   layers archetype-specific collapse THROUGH the child parts the rig already owns.
   Those child channels are dead this frame (a corpse skips walk/beastAnim), so nothing
   fights them; tickDeath snaps them back to rest at f>=1 before the corpse is hidden. */
function startDeath(g){
  if(!g||!g.userData) return;
  const ud=g.userData;
  if(ud._baseScale===undefined) ud._baseScale = g.scale.x || 1;
  ud.hit = null;                                          // a flinch in flight must not stomp the topple's scale
  ud.swing = null; ud.swinging = false; ud.beastSwing = null;  // an in-flight strike must not resume after respawn
  const style=_deathStyle(ud.parts);
  const dir=(Math.floor(g.position.x+g.position.z)&1)?1:-1;
  // a crab rolls fully onto its back; everything else lays out on its side
  const roll = style==='crab' ? 2.6 : Math.PI/2;
  const dur  = style==='crab' ? 0.70 : style==='brute' ? 0.78 : 0.55;
  ud.death = {t:0, dur, dir, roll, style, baseY:g.position.y};
}
function tickDeath(g, dt){
  const ud=g.userData, d=ud&&ud.death; if(!d) return false;
  const p=ud.parts;
  d.t += dt;
  const f = Math.min(1, d.t/d.dur);
  const e = 1 - Math.pow(1-f, 3);            // ease-out: fast tip, gentle settle
  g.rotation.z = d.dir * d.roll * e;         // roll over from the feet (facing-y is preserved in the Euler)
  g.position.y = d.baseY - 0.15*e;           // settle a touch into the ground
  const base = ud._baseScale || 1;
  g.scale.setScalar(base*(1-0.12*f));        // a slight shrink as it falls
  if(p) switch(d.style){
    case 'crab':                              // pincers fling open + up, legs splay stiff
      for(const c of p.claws){ c.arm.rotation.x = 0.9*e; c.claw1.rotation.z = 0.35+0.5*e; c.claw2.rotation.z = -0.35-0.5*e; }
      if(p.legs) for(const l of p.legs) l.rotation.x = -0.7*e;
      break;
    case 'crawler':                           // six legs curl up tight to the belly, mandibles go slack-wide
      if(p.legs) for(const l of p.legs) l.rotation.x = 1.5*e;
      if(p.maw) for(const md of p.maw) md.m.rotation.y = md.sign*(0.4+0.7*e);
      break;
    case 'wolf':                              // legs buckle forward, head & jaw droop limp
      if(p.legs) for(const l of p.legs) l.rotation.x = 0.9*e;
      if(p.head) p.head.rotation.z = -0.6*e;
      if(p.jaw)  p.jaw.rotation.z  = -0.45*e;
      break;
    case 'brute':                             // heavy arms drop dead-weight, head lolls, legs give
      if(p.armR) p.armR.rotation.z = 0.5*e;
      if(p.armL) p.armL.rotation.z = -0.5*e;
      if(p.legs) for(const l of p.legs) l.rotation.x = 0.4*e;
      break;
    case 'biped':                             // humanoid: limbs go limp, head drops
      if(p.armL) p.armL.rotation.x = -0.6*e;
      if(p.armR) p.armR.rotation.x = -0.6*e;
      if(p.legL) p.legL.rotation.x = 0.3*e;
      if(p.legR) p.legR.rotation.x = 0.3*e;
      if(p.head) p.head.rotation.z = 0.4*e;
      break;
  }
  if(f>=1){                                   // snap child parts back to rest before the corpse is hidden/revived
    if(p) switch(d.style){
      case 'crab': for(const c of p.claws){ c.arm.rotation.x=0; c.claw1.rotation.z=0.35; c.claw2.rotation.z=-0.35; } if(p.legs) for(const l of p.legs) l.rotation.x=0; break;
      case 'crawler': if(p.legs) for(const l of p.legs) l.rotation.x=0; if(p.maw) for(const md of p.maw) md.m.rotation.y=md.sign*0.4; break;
      case 'wolf': if(p.legs) for(const l of p.legs) l.rotation.x=0; if(p.head) p.head.rotation.z=0; if(p.jaw) p.jaw.rotation.z=0; break;
      case 'brute': if(p.armR) p.armR.rotation.z=0; if(p.armL) p.armL.rotation.z=0; if(p.legs) for(const l of p.legs) l.rotation.x=0; break;
      case 'biped': if(p.armL) p.armL.rotation.x=0; if(p.armR) p.armR.rotation.x=0; if(p.legL) p.legL.rotation.x=0; if(p.legR) p.legR.rotation.x=0; if(p.head) p.head.rotation.z=0; break;
    }
    ud.death=null; return false;
  }
  return true;
}
/* hold a weapon clear of the body: angled forward and out of the leg */
function holdWeapon(grip, m, def){
  m.position.set(0.03,0,0.08);
  if(def && def.model==='bow'){ m.rotation.z=Math.PI/2; m.rotation.y=Math.PI/2; m.position.set(0.02,0,0.1); }
  else if(def && def.model==='staff'){ m.rotation.x=0.18; m.position.set(0.03,0.05,0.1); }
  else { m.rotation.x=0.95; m.rotation.z=0.1; }   // blade raised up-FORWARD (positive X tilts +Y toward +Z, the facing direction)
  grip.add(m);
  return m;
}
/* animate limbs while moving; relax when idle */
function walkAnim(g, moving, dt, speedMul){
  const p=g.userData.parts; if(!p) return;
  const ud=g.userData;
  tickHit(g, dt);                            // squash-and-stretch flinch (owns root scale)
  const swung = tickSwing(g, dt);            // swing owns the right arm + torso.y this frame
  tickBlock(g, dt);                          // a parried hit raises a guard (sets ud.blocking; owns armL.z/handL/head.x)
  speedMul = speedMul || 1;
  if(ud.idleT===undefined) ud.idleT = ud.walkT || 0;   // desync breathing so a crowd never pulses in lockstep
  ud.idleT += dt;
  const run = moving && speedMul>1.25;       // a faster gait once you're moving above a walk
  if(moving){
    ud.walkT += dt*9*speedMul;
    const s=Math.sin(ud.walkT)*(run?0.8:0.55);
    p.legL.rotation.x=s; p.legR.rotation.x=-s;
    if(!ud.swinging){ if(!ud.blocking) p.armL.rotation.x=-s*0.7; p.armR.rotation.x=s*0.7; }
    // upper-body life: torso counter-sway + a forward lean that deepens at a run
    if(p.torso && !swung){
      if(ud._torsoSY!==undefined) p.torso.scale.y = ud._torsoSY;   // no breathing swell while striding
      p.torso.rotation.z = -Math.sin(ud.walkT)*(run?0.09:0.05);
      p.torso.rotation.x = run?0.13:0.05;
    }
    const hb = Math.sin(ud.walkT)*0.04;       // head bob with the stride (hat tracks it)
    if(p.head)    p.head.rotation.z = hb;
    if(p.headTop) p.headTop.rotation.z = hb;
  } else if(ud.inCombat && !ud.death){
    // COMBAT-READY STANCE: idle while locked in a fight reads completely differently from
    // peaceful standing — bladed footing, weapon hand raised on guard, weight pitched forward,
    // and a tense, quick ready-bob. Drives only the same idle channels the peaceful branch owns
    // (legs.x, arms.x, torso, head.z), so it never fights the swing (gated by ud.swinging, owns
    // armR/torso.y mid-strike), the block (gated by ud.blocking, owns armL), the hit-flinch
    // (root scale) or death. On combat exit the peaceful branch's decays ease every channel home.
    const cb = Math.sin(ud.idleT*3.2);             // faster + tenser than the breathing idle
    p.legL.rotation.x =  0.16;  p.legR.rotation.x = -0.16;   // one foot forward, one back: a bladed stance
    if(!ud.swinging){
      p.armR.rotation.x = -0.55 + cb*0.05;          // weapon arm up & ready (swing owns it mid-strike)
      if(!ud.blocking) p.armL.rotation.x = -0.32 + cb*0.04; // off-hand raised as a guard (block owns armL)
    }
    if(p.torso && !swung){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*2.6)*0.016);  // shallower, quicker combat breath
      p.torso.rotation.z = cb*0.05;                 // weight shifts foot to foot
      p.torso.rotation.x = 0.13;                    // lean into the fight
    }
    const hc = cb*0.03;
    if(p.head)    p.head.rotation.z = hc;
    if(p.headTop) p.headTop.rotation.z = hc;
  } else {
    for(const k of ['legL','legR']) p[k].rotation.x*=0.8;
    if(!ud.swinging){ if(!ud.blocking) p.armL.rotation.x*=0.8; p.armR.rotation.x*=0.8; }
    // idle: a slow breathing swell of the chest + a gentle weight-shift sway, lean easing to neutral
    if(p.torso && !swung){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*1.6)*0.022);
      p.torso.rotation.z = Math.sin(ud.idleT*0.8)*0.018;
      p.torso.rotation.x *= 0.85;
    }
    const hn = Math.sin(ud.idleT*0.8+0.4)*0.02;   // faint idle head settle
    if(p.head)    p.head.rotation.z = hn;
    if(p.headTop) p.headTop.rotation.z = hn;
  }
}
/* ---------- creature textures: Nano-Banana-painted maps loaded at boot ---------- */
function loadCreatureTextures(){
  const L=new THREE.TextureLoader();
  const reg=(name,file,rep)=>{ const t=L.load('assets/textures/'+file);
    t.wrapS=t.wrapT=THREE.RepeatWrapping; if(rep) t.repeat.set(rep,rep); TEX[name]=t; return t; };
  reg('goblinSkin','goblin_skin.png');
  reg('stoneWall','stone_wall.png',2);
  reg('woodPlanks','wood_planks.png',1);
  reg('thatchTex','thatch_roof.png',2);
  reg('cobble','cobblestone.png',2);
  reg('dirtPath','dirt_path.png',2);
  reg('marketCloth','market_cloth.png',1);
  reg('ratFur','rat_fur.png');
  reg('skelBone','skeleton_bone.png');
}
/* material from a loaded scenery texture, with a flat-colour fallback */
function texMat(name, fallback){ return TEX[name] ? new THREE.MeshLambertMaterial({map:TEX[name]}) : mat(fallback||0x8a8276); }

/* ---------- detailed cottage: foundation, 1-2 storeys, windows, timber, toggle-able thatch roof ---------- */
function makeTexHouse(x,z,opts){
  opts=opts||{};
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const w=opts.w||rnd(4.0,5.4), d=opts.d||rnd(4.0,5.2);
  const stories=opts.stories || (Math.random()<0.45?2:1);
  const floorH=2.05, h=floorH*stories;
  // seat on the LOWEST footprint corner so the house never floats on a slope; a plinth buries the rest
  const _hc=[gy(x-w/2-0.3,z-d/2-0.3),gy(x+w/2+0.3,z-d/2-0.3),gy(x-w/2-0.3,z+d/2+0.3),gy(x+w/2+0.3,z+d/2+0.3),gy(x,z)];
  const yMin=Math.min.apply(null,_hc), yMax=Math.max.apply(null,_hc);
  const py=yMin; const g=new THREE.Group(); g.position.set(x,py,z); if(opts.rot) g.rotation.y=opts.rot;
  const wallMat=texMat('stoneWall',0x9a948a), woodMat=texMat('woodPlanks',0x6b4a2f), thatchMat=texMat('thatchTex',0xa8854a);
  const beamMat=mat(0x49321f), glassMat=new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6f5018});
  const B=(bw,bh,bd,m)=>{ const me=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),m); me.castShadow=true; me.receiveShadow=true; return me; };
  const add=(me,ox,oy,oz)=>{ me.position.set(ox,oy,oz); g.add(me); return me; };

  const wb=-0.4;                                        // walls sink below ground (no floating block)
  add(B(w+0.5,(yMax-yMin)+1.0,d+0.5,wallMat), 0,(yMax-yMin)/2-((yMax-yMin)+1.0)/2+0.15,0);  // plinth buries the slope
  const wallH=h-wb, wallY=(wb+h)/2;
  add(B(w,wallH,0.34,wallMat), 0,wallY,-d/2);          // back
  add(B(0.34,wallH,d,wallMat), -w/2,wallY,0);          // left
  add(B(0.34,wallH,d,wallMat),  w/2,wallY,0);          // right
  const doorW=1.25, side=(w-doorW)/2;
  add(B(side,wallH,0.34,wallMat), -(doorW/2+side/2),wallY,d/2);
  add(B(side,wallH,0.34,wallMat),  (doorW/2+side/2),wallY,d/2);
  if(h>2.0) add(B(doorW,h-2.0,0.34,wallMat), 0,(2.0+h)/2,d/2);
  add(B(doorW+0.16,2.1,0.1,beamMat), 0,1.05,d/2+0.03);            // door frame
  add(B(doorW-0.04,1.95,0.12,woodMat), 0,0.97,d/2+0.07);          // door
  add(B(doorW+0.6,0.22,0.85,wallMat), 0,0.0,d/2+0.3);             // stone step
  for(let s=1;s<stories;s++) add(B(w+0.16,0.22,d+0.16,beamMat), 0,floorH*s,0);  // belt course
  // windows (warm glow, framed)
  function win(ox,oy,oz,vert){ const fh=0.82, fw=0.66;
    add(B(vert?0.12:fw, fh, vert?fw:0.12, beamMat), ox,oy,oz);
    add(B(vert?0.06:fw-0.2, fh-0.22, vert?fw-0.2:0.06, glassMat),
        ox+(vert?(ox>0?0.05:-0.05):0), oy, oz+(vert?0:(oz>0?0.05:-0.05))); }
  for(let s=0;s<stories;s++){ const yy=0.98+floorH*s;
    win(w/2+0.02,yy,0,true); win(-w/2-0.02,yy,0,true); win(0,yy,-d/2-0.02,false);
    if(s>0){ win(-(doorW/2+0.85),yy,d/2+0.02,false); win(doorW/2+0.85,yy,d/2+0.02,false); }
  }
  // corner timber posts (cozy Tudor look)
  for(const sx of [-1,1]) for(const sz of [-1,1]) add(B(0.18,wallH,0.18,beamMat), sx*(w/2-0.02), wallY, sz*(d/2-0.02));
  // ---- roof group (registered so it can be toggled / auto-hidden) ----
  const roofG=new THREE.Group();
  const oh=0.55, rw=w+oh, rd=d+oh, gh=opts.roofH||rnd(1.3,1.9), rad=Math.hypot(rw,rd)/2;
  const eave=B(rw,0.18,rd,beamMat); eave.position.y=h+0.05; roofG.add(eave);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(rad,gh,4), thatchMat);
  roof.rotation.y=Math.PI/4; roof.position.y=h+gh/2; roof.castShadow=true;
  roof.scale.set(rw/(rad*Math.SQRT2),1,rd/(rad*Math.SQRT2)); roofG.add(roof);
  if(Math.random()<0.6){ const ch=B(0.5,1.5,0.5,wallMat); ch.position.set(rw*0.28,h+1.0,-rd*0.28); roofG.add(ch); }
  g.add(roofG);
  scene.add(g);
  WORLD.colliders.push({type:'rect',x,z:z-d/2,hw:w/2,hd:0.2});
  WORLD.colliders.push({type:'rect',x:x-w/2,z,hw:0.2,hd:d/2});
  WORLD.colliders.push({type:'rect',x:x+w/2,z,hw:0.2,hd:d/2});
  g.userData={kind:'deco',label:opts.label||'Enter <b>House</b>'}; WORLD.clickables.push(g);
  WORLD.roofs.push({mesh:roofG, x, z});
  return g;
}
/* roofs hide when you're near a building (OSRS-style) or all at once via the toggle */
function toggleRoofs(){ WORLD.roofsOff=!WORLD.roofsOff;
  if(typeof UI!=='undefined') UI.chat('[VIEW] Roofs '+(WORLD.roofsOff?'hidden':'shown')+'.','sys'); }
function updateRoofs(){ if(!WORLD.roofs.length||typeof player==='undefined'||!player) return;
  const px=player.position.x, pz=player.position.z;
  for(const r of WORLD.roofs) r.mesh.visible = WORLD.roofsOff ? false : (Math.hypot(px-r.x,pz-r.z) > 7.5); }
/* ---------- skeleton: bone-textured undead (oldschool low-level enemy) ---------- */
function skeletonModel(opts){
  opts=opts||{}; const g=new THREE.Group(); const parts={};
  const boneMat = texMat('skelBone',0xe8e2d0);
  const bone = geo=>{ const m=new THREE.Mesh(geo,boneMat); m.castShadow=true; return m; };
  for(const side of ['L','R']){ const sgn=side==='L'?-1:1;
    const piv=new THREE.Group(); piv.position.set(sgn*0.12,0.86,0);
    const leg=bone(new THREE.CylinderGeometry(0.05,0.04,0.84,6)); leg.position.y=-0.42; piv.add(leg);
    const foot=bone(new THREE.BoxGeometry(0.14,0.08,0.26)); foot.position.set(0,-0.86,0.06); piv.add(foot);
    g.add(piv); parts['leg'+side]=piv; parts['legMesh'+side]=leg; parts['shoe'+side]=foot; }
  const pelvis=bone(new THREE.BoxGeometry(0.26,0.12,0.16)); pelvis.position.y=0.92; g.add(pelvis);
  const spine=bone(new THREE.CylinderGeometry(0.04,0.04,0.5,6)); spine.position.y=1.2; g.add(spine);
  const rib=bone(new THREE.CylinderGeometry(0.2,0.16,0.4,8)); rib.position.y=1.25; rib.scale.z=0.62; g.add(rib); parts.torso=rib;
  for(let i=0;i<3;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(0.17,0.015,5,12),boneMat); r.rotation.x=Math.PI/2; r.scale.z=0.62; r.position.y=1.12+i*0.12; g.add(r); }
  for(const side of ['L','R']){ const sgn=side==='L'?-1:1;
    const piv=new THREE.Group(); piv.position.set(sgn*0.22,1.42,0); piv.rotation.z=sgn*0.1;
    const up=bone(new THREE.CylinderGeometry(0.04,0.035,0.42,6)); up.position.y=-0.21; piv.add(up);
    const fo=bone(new THREE.CylinderGeometry(0.035,0.03,0.4,6)); fo.position.y=-0.6; piv.add(fo);
    const hand=bone(new THREE.SphereGeometry(0.05,6,5)); hand.position.y=-0.82; piv.add(hand);
    const grip=new THREE.Group(); grip.position.set(0,-0.84,0.05); piv.add(grip);
    g.add(piv); parts['arm'+side]=piv; parts['hand'+side]=grip; parts['armMesh'+side]=up; }
  const neck=bone(new THREE.CylinderGeometry(0.04,0.05,0.08,6)); neck.position.y=1.55; g.add(neck);
  const headG=new THREE.Group(); headG.position.set(0,1.66,0.02); g.add(headG); parts.head=headG;
  const skull=bone(new THREE.SphereGeometry(0.17,9,8)); skull.scale.set(0.95,1,1.0); headG.add(skull);
  const jaw=bone(new THREE.BoxGeometry(0.2,0.08,0.16)); jaw.position.set(0,-0.14,0.03); headG.add(jaw);
  for(const sgn of [-1,1]){ const eye=new THREE.Mesh(new THREE.SphereGeometry(0.04,6,5),new THREE.MeshBasicMaterial({color:0x100f08}));
    eye.position.set(sgn*0.07,0.02,0.13); headG.add(eye); }
  parts.headTop=new THREE.Group(); parts.headTop.position.set(0,1.86,0); g.add(parts.headTop);
  g.scale.setScalar(opts.scale||1); g.userData.parts=parts; g.userData.walkT=0;
  return g;
}

/* ---------- procedural goblin: smooth low-poly, hunched, OSRS silhouette ----------
   Path-A model: organic primitives (no cubes) + a hand-painted skin texture.
   Honours the standard rig hooks (legL/R, armL/R, handL/R, torso, head, headTop). */
function goblinModel(opts){
  opts=opts||{};
  const g=new THREE.Group();
  const parts={};
  const skinMat  = TEX.goblinSkin ? new THREE.MeshLambertMaterial({map:TEX.goblinSkin})
                                  : mat(0x6f9a4a);
  const clothMat = new THREE.MeshLambertMaterial({map:clothTex(opts.cloth||0x5a4030)});
  const skin = geo=>{ const m=new THREE.Mesh(geo, skinMat); m.castShadow=true; return m; };

  // ---- short, slightly bandy legs over skin feet ----
  for(const side of ['L','R']){
    const sgn=side==='L'?-1:1;
    const piv=new THREE.Group(); piv.position.set(sgn*0.15, 0.5, 0);
    const leg=skin(new THREE.CylinderGeometry(0.12,0.085,0.5,7));
    leg.position.y=-0.25; leg.rotation.z=sgn*0.06; piv.add(leg);
    const foot=skin(new THREE.SphereGeometry(0.12,6,5));
    foot.scale.set(1.05,0.6,1.5); foot.position.set(0,-0.5,0.08); piv.add(foot);
    g.add(piv); parts['leg'+side]=piv; parts['legMesh'+side]=leg; parts['shoe'+side]=foot;
  }
  // ---- loincloth + belt over the hips ----
  const loin=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.32,0.36,8), clothMat);
  loin.position.y=0.6; loin.castShadow=true; g.add(loin);
  const belt=new THREE.Mesh(new THREE.TorusGeometry(0.26,0.03,5,10), mat(0x8a6a3a));
  belt.rotation.x=Math.PI/2; belt.position.y=0.78; g.add(belt);

  // ---- pot belly + hunched chest ----
  const belly=skin(new THREE.SphereGeometry(0.34,9,7));
  belly.scale.set(1,0.92,0.95); belly.position.set(0,1.0,0.05); g.add(belly);
  parts.torso=belly;
  const chest=skin(new THREE.SphereGeometry(0.27,8,6));
  chest.scale.set(1.05,0.82,0.85); chest.position.set(0,1.27,0.0); chest.rotation.x=0.25; g.add(chest);

  // ---- long thin arms hanging low (goblin reach) ----
  for(const side of ['L','R']){
    const sgn=side==='L'?-1:1;
    const piv=new THREE.Group(); piv.position.set(sgn*0.29, 1.31, 0.02);
    piv.rotation.z=sgn*0.12;
    const upper=skin(new THREE.CylinderGeometry(0.075,0.06,0.42,6)); upper.position.y=-0.21; piv.add(upper);
    const fore =skin(new THREE.CylinderGeometry(0.06,0.05,0.4,6));  fore.position.y=-0.58; piv.add(fore);
    const hand =skin(new THREE.SphereGeometry(0.07,6,5));           hand.position.y=-0.8;  piv.add(hand);
    const grip=new THREE.Group(); grip.position.set(0,-0.82,0.05); piv.add(grip);
    g.add(piv); parts['arm'+side]=piv; parts['hand'+side]=grip; parts['armMesh'+side]=upper;
  }

  // ---- big hunched head, thrust forward, with a goblin face ----
  const neck=skin(new THREE.CylinderGeometry(0.07,0.085,0.12,6)); neck.position.set(0,1.43,0.06); g.add(neck);
  const headG=new THREE.Group(); headG.position.set(0,1.6,0.12); g.add(headG); parts.head=headG;
  const skull=skin(new THREE.SphereGeometry(0.26,9,8)); skull.scale.set(0.95,0.92,1.05); headG.add(skull);
  const brow=skin(new THREE.BoxGeometry(0.34,0.08,0.12)); brow.position.set(0,0.06,0.2); brow.rotation.x=-0.2; headG.add(brow);
  const nose=skin(new THREE.ConeGeometry(0.07,0.24,6)); nose.rotation.x=Math.PI*0.6; nose.position.set(0,-0.03,0.27); headG.add(nose);
  for(const sgn of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(0.038,6,5), new THREE.MeshBasicMaterial({color:0xe8e24a}));
    eye.position.set(sgn*0.1,0.04,0.21); headG.add(eye);
    const pup=new THREE.Mesh(new THREE.SphereGeometry(0.017,5,4), new THREE.MeshBasicMaterial({color:0x100f08}));
    pup.position.set(sgn*0.1,0.04,0.245); headG.add(pup);
    const tusk=new THREE.Mesh(new THREE.ConeGeometry(0.024,0.11,5), mat(0xe8e2d0));
    tusk.position.set(sgn*0.07,-0.13,0.2); tusk.rotation.x=0.2; headG.add(tusk);
    const ear=skin(new THREE.ConeGeometry(0.085,0.3,5));
    ear.position.set(sgn*0.24,0.07,-0.06); ear.rotation.z=sgn*1.15; ear.rotation.y=sgn*-0.35; headG.add(ear);
  }
  parts.headTop=new THREE.Group(); parts.headTop.position.set(0,1.84,0.1); g.add(parts.headTop);

  // a goblin stoops — tip the whole frame forward a touch
  g.rotation.x=0.04;
  g.scale.setScalar(opts.scale||1);
  g.userData.parts=parts; g.userData.walkT=0;
  return g;
}

/* quadruped beasts: snout, ears, tail, trotting legs */
function beast(color, size){
  const g = new THREE.Group();
  const parts={legs:[]};
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95*size,0.42*size,0.4*size), mat(color));
  body.position.y=0.52*size; body.castShadow=true; g.add(body);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4*size,0.48*size,0.46*size), mat(color));
  chest.position.set(0.3*size,0.54*size,0); g.add(chest);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3*size,0.28*size,0.3*size), mat(color));
  head.position.set(0.62*size,0.72*size,0); head.castShadow=true; g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18*size,0.14*size,0.16*size), mat(color));
  snout.position.set(0.78*size,0.66*size,0); g.add(snout);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05*size,0.05*size,0.08*size), mat(0x1a1208));
  nose.position.set(0.87*size,0.68*size,0); g.add(nose);
  for(const sz of [-0.08,0.08]){
    const ear=new THREE.Mesh(new THREE.ConeGeometry(0.06*size,0.16*size,4), mat(color));
    ear.position.set(0.58*size,0.9*size,sz*size); g.add(ear);
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.05),
      new THREE.MeshBasicMaterial({color:0xffd24a}));
    eye.position.set(0.74*size,0.78*size,sz*size*1.4); g.add(eye);
  }
  const tailPiv=new THREE.Group(); tailPiv.position.set(-0.48*size,0.62*size,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.34*size,0.08*size,0.08*size), mat(color));
  tail.position.x=-0.17*size; tail.rotation.z=0.35; tailPiv.add(tail);
  g.add(tailPiv); parts.tail=tailPiv;
  for(const sx of [-0.32,0.3]) for(const sz of [-0.13,0.13]){
    const piv=new THREE.Group(); piv.position.set(sx*size,0.36*size,sz*size);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09*size,0.36*size,0.09*size), mat(color));
    leg.position.y=-0.18*size; piv.add(leg);
    g.add(piv); parts.legs.push(piv);
  }
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}
/* chicken: plump body, comb, beak, tail fan, two stick legs */
function chicken(size){
  size=size||0.5;
  const g=new THREE.Group(); const parts={legs:[]};
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55*size,0.45*size,0.42*size), mat(0xeae4d8));
  body.position.y=0.42*size; body.rotation.z=0.18; body.castShadow=true; g.add(body);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.2*size,0.3*size,0.3*size), mat(0xd8d0c0));
  tail.position.set(-0.3*size,0.58*size,0); tail.rotation.z=0.7; g.add(tail);
  for(const s of [-1,1]){
    const wing=new THREE.Mesh(new THREE.BoxGeometry(0.34*size,0.22*size,0.06*size), mat(0xd8d0c0));
    wing.position.set(0,0.42*size,s*0.24*size); g.add(wing);
  }
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.2*size,0.22*size,0.18*size), mat(0xeae4d8));
  head.position.set(0.3*size,0.72*size,0); g.add(head);
  const comb=new THREE.Mesh(new THREE.BoxGeometry(0.12*size,0.1*size,0.04*size), mat(0xc83a2a));
  comb.position.set(0.3*size,0.86*size,0); g.add(comb);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(0.05*size,0.14*size,4), mat(0xe09a3a));
  beak.position.set(0.42*size,0.7*size,0); beak.rotation.z=-Math.PI/2; g.add(beak);
  const wattle=new THREE.Mesh(new THREE.BoxGeometry(0.04*size,0.08*size,0.04*size), mat(0xc83a2a));
  wattle.position.set(0.36*size,0.6*size,0); g.add(wattle);
  for(const s of [-1,1]){
    const piv=new THREE.Group(); piv.position.set(0,0.22*size,s*0.1*size);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.04*size,0.22*size,0.04*size), mat(0xe09a3a));
    leg.position.y=-0.11*size; piv.add(leg);
    g.add(piv); parts.legs.push(piv);
  }
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}
/* cow: patched hide, horns, pink snout and udder */
function cow(size){
  size=size||1.3;
  const g=new THREE.Group(); const parts={legs:[]};
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.05*size,0.5*size,0.5*size), mat(0xe8e2d4));
  body.position.y=0.62*size; body.castShadow=true; g.add(body);
  // hide patches
  for(let i=0;i<3;i++){
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.26*size,0.22*size,0.52*size), mat(0x3a322a));
    p.position.set((-0.3+i*0.3+Math.random()*0.1)*size, (0.58+Math.random()*0.16)*size, 0);
    g.add(p);
  }
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.3*size,0.3*size,0.3*size), mat(0xe8e2d4));
  head.position.set(0.64*size,0.82*size,0); head.castShadow=true; g.add(head);
  const snout=new THREE.Mesh(new THREE.BoxGeometry(0.14*size,0.16*size,0.24*size), mat(0xd8a0a0));
  snout.position.set(0.8*size,0.74*size,0); g.add(snout);
  for(const s of [-1,1]){
    const horn=new THREE.Mesh(new THREE.ConeGeometry(0.045*size,0.18*size,4), mat(0xd8ccb0));
    horn.position.set(0.6*size,1.02*size,s*0.14*size); horn.rotation.z=-s*0.4; g.add(horn);
    const ear=new THREE.Mesh(new THREE.BoxGeometry(0.06*size,0.1*size,0.14*size), mat(0xe8e2d4));
    ear.position.set(0.58*size,0.88*size,s*0.2*size); g.add(ear);
  }
  const udder=new THREE.Mesh(new THREE.BoxGeometry(0.26*size,0.14*size,0.26*size), mat(0xd8a0a0));
  udder.position.set(-0.2*size,0.36*size,0); g.add(udder);
  const tailPiv=new THREE.Group(); tailPiv.position.set(-0.52*size,0.74*size,0);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.3*size,0.06*size,0.06*size), mat(0xe8e2d4));
  tail.position.x=-0.15*size; tail.rotation.z=0.5; tailPiv.add(tail);
  g.add(tailPiv); parts.tail=tailPiv;
  for(const sx of [-0.36,0.34]) for(const sz of [-0.16,0.16]){
    const piv=new THREE.Group(); piv.position.set(sx*size,0.4*size,sz*size);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1*size,0.4*size,0.1*size), mat(0xe8e2d4));
    leg.position.y=-0.2*size; piv.add(leg);
    g.add(piv); parts.legs.push(piv);
  }
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}
/* rat: low slinking body, big ears, bare tail */
function rat(size, color){
  size=size||0.5; color=color||0x6b5440;
  const g=new THREE.Group(); const parts={legs:[]};
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.8*size,0.3*size,0.34*size), mat(color));
  body.position.y=0.24*size; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.17*size,0.4*size,4), mat(color));
  head.position.set(0.55*size,0.26*size,0); head.rotation.z=-Math.PI/2; head.rotation.y=Math.PI/4; g.add(head);
  const nose=new THREE.Mesh(new THREE.BoxGeometry(0.04*size,0.04*size,0.04*size), mat(0xd8a0a0));
  nose.position.set(0.76*size,0.26*size,0); g.add(nose);
  for(const s of [-1,1]){
    const ear=new THREE.Mesh(new THREE.CylinderGeometry(0.09*size,0.09*size,0.03*size,6), mat(0xd8a0a0));
    ear.position.set(0.42*size,0.42*size,s*0.12*size); ear.rotation.x=Math.PI/2; g.add(ear);
  }
  const tailPiv=new THREE.Group(); tailPiv.position.set(-0.4*size,0.2*size,0);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.025*size,0.045*size,0.7*size,4), mat(0xc89090));
  tail.position.x=-0.35*size; tail.rotation.z=Math.PI/2-0.25; tailPiv.add(tail);
  g.add(tailPiv); parts.tail=tailPiv;
  for(const sx of [-0.26,0.28]) for(const sz of [-0.12,0.12]){
    const piv=new THREE.Group(); piv.position.set(sx*size,0.14*size,sz*size);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.06*size,0.14*size,0.06*size), mat(color));
    leg.position.y=-0.07*size; piv.add(leg);
    g.add(piv); parts.legs.push(piv);
  }
  g.userData.parts=parts; g.userData.walkT=Math.random()*6;
  return g;
}
/* standing stone for the seers' ring */
function makeStandingStone(x,z,s){
  s=s||1;
  const st=new THREE.Mesh(new THREE.BoxGeometry(0.6*s,2.2*s,0.4*s), new THREE.MeshLambertMaterial({map:TEX.stone}));
  st.position.set(x, gy(x,z)+1.0*s, z);
  st.rotation.y=Math.random()*6; st.rotation.z=(Math.random()-.5)*0.12;
  st.castShadow=true; scene.add(st);
  addCircleCollider(x,z,0.5*s);
}
/* armless-beast attack: a single lunge-and-snap, one read per archetype, driven only
   through stored child parts (head/jaw, mandibles, pincers) so it never touches the
   root scale/rotation owned by hit-react & death. State lives on the instance. */
function tickBeastSwing(g, dt){
  const ud=g.userData, bs=ud&&ud.beastSwing, p=ud&&ud.parts;
  if(!bs||!p) return false;
  bs.t += dt;
  const f = Math.min(1, bs.t/bs.dur);
  // snap curve: small wind-back, hard strike at f≈0.5 (peak +1), ease back to rest
  const snap = f<0.30 ? -(f/0.30)*0.25
             : f<0.50 ? -0.25 + (f-0.30)/0.20*1.25
             : 1.0*(1-(f-0.50)/0.50);
  const strike = Math.max(0, snap), wind = Math.max(0, -snap);
  if(p.head){ p.head.rotation.z = -0.55*strike + 0.18*wind; }   // wolf: nod down into the bite
  if(p.jaw){ p.jaw.rotation.z = -0.5*strike; }                  // hinged jaw drops open as it lunges
  if(p.maw){ for(const md of p.maw) md.m.rotation.y = md.sign*0.4*(1-1.6*strike); }  // crawler scissor
  if(p.claws){ for(const c of p.claws){                         // crab: pincer thrusts + claws clamp
    c.arm.rotation.z = -0.5*strike + 0.1*wind;
    const clamp=0.32*strike; c.claw1.rotation.z = 0.35-clamp; c.claw2.rotation.z = -0.35+clamp;
  }}
  if(f>=1){ ud.beastSwing=null;
    if(p.head) p.head.rotation.z=0;
    if(p.jaw) p.jaw.rotation.z=0;
    if(p.maw) for(const md of p.maw) md.m.rotation.y=md.sign*0.4;
    if(p.claws) for(const c of p.claws){ c.arm.rotation.z=0; c.claw1.rotation.z=0.35; c.claw2.rotation.z=-0.35; }
    return false; }
  return true;
}
/* ease the locomotion-only channels (torso vertical lurch + shoulder roll, brute off-arm
   counter-swing) back to their captured rest when a beast stops walking, so it never freezes
   mid-stride tilted. Only touches channels the gait itself introduced; gated so a swing/block
   in flight keeps ownership of the off-arm. */
function _gaitHome(p, ud){
  if(p.torso){
    if(ud._torsoBY!==undefined) p.torso.position.y += (ud._torsoBY - p.torso.position.y)*0.2;
    if(Math.abs(p.torso.rotation.z)>1e-4) p.torso.rotation.z *= 0.8; else p.torso.rotation.z=0;
  }
  if(p.armL && !ud.swinging && !ud.blocking) p.armL.rotation.x *= 0.85;
}
function beastAnim(g, moving, dt){
  tickHit(g, dt);                            // flinch works on any body, parts or not
  const swung = tickSwing(g, dt);            // brutes (parts.armR) wind up + slam; no-ops on armless beasts
  const lunged = tickBeastSwing(g, dt);      // armless beasts lunge/snap with what they have
  tickBlock(g, dt);                          // a parried hit rears the head back / hoists pincers (free channels)
  const busy = swung || lunged;              // an attack owns the idle channels this frame
  const p=g.userData.parts; if(!p||!p.legs) return;
  const ud=g.userData;
  if(ud.idleT===undefined) ud.idleT = ud.walkT || 0;
  ud.idleT += dt;
  if(moving){
    // per-archetype locomotion — was a single i%2 gait at one cadence for EVERY beast,
    // so a wolf, a six-legged crawler, a crab and a hulking brute all walked identically.
    // Classify once off the rig parts (same read as death) and drive a distinct gait:
    // a wolf TROTS (diagonal leg pairs), a crawler/crab SKITTERS (a wave travelling down
    // its legs), a brute LUMBERS (slow heavy two-beat + vertical lurch + counter-swinging
    // arms). Cadence + amplitude differ per body. Only free channels are touched —
    // legs.z (walk owns), torso.position.y/rotation.z (no other anim writes these; swing
    // owns torso.rotation.x/y, not z/posY), and brute armR/armL.x are gated by the same
    // swing/block flags the rest of the rig respects.
    if(ud._gaitStyle===undefined) ud._gaitStyle = _deathStyle(p);
    const gs=ud._gaitStyle, n=p.legs.length;
    const cad = gs==='brute'?6.0 : gs==='crawler'?14.0 : gs==='crab'?13.0 : 10.5;
    const amp = gs==='brute'?0.72 : gs==='crab'?0.30 : gs==='crawler'?0.34 : 0.55;
    ud.walkT += dt*cad;
    const t=ud.walkT;
    p.legs.forEach((l,i)=>{
      let ph;
      if(gs==='brute')        ph = (i%2)?0:Math.PI;                 // heavy two-beat plod
      else if(gs==='crawler'||gs==='crab') ph = -i*(Math.PI/Math.max(1,n/2)); // wave travels back -> skitter
      else                    ph = (i===0||i===3)?0:Math.PI;        // diagonal trot (quadruped)
      l.rotation.z = Math.sin(t+ph)*amp;
    });
    if(!busy){
      if(p.torso){
        if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
        if(ud._torsoBY===undefined) ud._torsoBY = p.torso.position.y;
        p.torso.scale.y = ud._torsoSY;                              // hand breath back to walk
        if(gs==='brute'){
          p.torso.position.y = ud._torsoBY + Math.abs(Math.sin(t))*0.06;  // heavy vertical lurch
          p.torso.rotation.z = Math.sin(t)*0.05;                          // shoulder roll
        } else if(gs==='crab'){
          p.torso.rotation.z = Math.sin(t)*0.10;                          // scuttling side-rock
          p.torso.position.y = ud._torsoBY + Math.abs(Math.sin(t*2))*0.02;
        } else if(gs==='crawler'){
          p.torso.position.y = ud._torsoBY;                               // low, steady — no bob
        } else {
          p.torso.position.y = ud._torsoBY + Math.sin(t*2)*0.02;          // light trot bob
        }
      }
      if(gs==='brute'){                                            // arms counter-swing the stride
        if(p.armR && !ud.swinging) p.armR.rotation.x = Math.sin(t+Math.PI)*0.35;
        if(p.armL && !ud.swinging && !ud.blocking) p.armL.rotation.x = Math.sin(t)*0.35;
      } else if(gs==='wolf' && p.head){
        p.head.rotation.z = Math.sin(t*2)*0.05;                    // muzzle bob on the trot
      }
    }
  } else if(ud.inCombat && !ud.death && !busy){
    // agitated combat stance: a resting beast in a fight isn't calm — heavier, faster breath,
    // a low weight-shifting crouch, and (for brutes with real arms) fists hoisted ready. Only
    // touches legs.z / torso.scale / armR.x — the channels walk + idle already own — so it never
    // fights a lunge/slam (gated by !busy), the block, the flinch or death. On exit the peaceful
    // branch decays legs.z and the new armR decay eases the fists back down.
    if(p.torso){
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*3.4)*0.05);   // faster, heavier breath
    }
    p.legs.forEach((l,i)=> l.rotation.z = Math.sin(ud.idleT*3.4 + i*0.9)*0.07);  // restless weight-shift
    if(p.armR && !ud.swinging) p.armR.rotation.x = -0.45 + Math.sin(ud.idleT*3.4)*0.05;  // brute raises its fists
    _gaitHome(p, ud);                          // ease any walk lurch/roll/off-arm swing back to rest
  } else {
    p.legs.forEach(l=>l.rotation.z*=0.8);
    if(p.armR && !ud.swinging) p.armR.rotation.x*=0.85;   // ease the fists down when the fight ends
    _gaitHome(p, ud);                          // ease the walk's torso lurch/roll + off-arm swing home
    if(p.torso && !busy){                       // idle flank breathing so a resting beast still has life
      if(ud._torsoSY===undefined) ud._torsoSY = p.torso.scale.y;
      p.torso.scale.y = ud._torsoSY * (1 + Math.sin(ud.idleT*2.0)*0.03);   // suppressed mid-slam so the swing reads
    }
  }
  if(p.tail) p.tail.rotation.y = Math.sin(performance.now()*0.004+ud.walkT)*0.3;
}
function makeHPBar(parent, yOff){
  const c = document.createElement('canvas'); c.width=64; c.height=8;
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false}));
  spr.scale.set(1.4,0.18,1); spr.position.y=yOff; spr.visible=false;
  parent.add(spr);
  return {spr, c, tex, draw(frac){
    const ctx=c.getContext('2d'); ctx.fillStyle='#7a1d1d'; ctx.fillRect(0,0,64,8);
    ctx.fillStyle='#3fae4a'; ctx.fillRect(0,0,Math.max(0,64*frac),8); tex.needsUpdate=true; }};
}

/* ---------- 3D weapon / armour models (worn + ground) ---------- */
function swordMesh(metal){
  const g=new THREE.Group();
  const blade=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.66,0.13),mat(metal));
  blade.position.y=0.45; g.add(blade);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.6,0.02),mat(metal));
  ridge.position.y=0.43; g.add(ridge);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.14,4),mat(metal));
  tip.position.y=0.84; tip.rotation.y=Math.PI/4; g.add(tip);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.05,0.09),mat(0x6b5a2a));
  guard.position.y=0.1; g.add(guard);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.2,6),mat(0x3e2a17));
  g.add(grip);
  const pommel=new THREE.Mesh(new THREE.SphereGeometry(0.045,5,5),mat(0x6b5a2a));
  pommel.position.y=-0.11; g.add(pommel);
  return g;
}
function bowMesh(){
  const g=new THREE.Group();
  const limb=new THREE.Mesh(new THREE.TorusGeometry(0.46,0.035,5,12,Math.PI*1.15),mat(0x6b4426));
  limb.rotation.z=Math.PI*0.93; g.add(limb);
  const str=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.85,4),
    new THREE.MeshBasicMaterial({color:0xd8ccb4}));
  str.position.x=0.11; g.add(str);
  return g;
}
function arrowMesh(){
  const g=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.66,4),mat(0x8a6a3e));
  g.add(shaft);
  const head=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.11,4),mat(0x9aa0a8));
  head.position.y=0.38; g.add(head);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.13,4),mat(0xb24444));
  fl.position.y=-0.34; fl.rotation.x=Math.PI; g.add(fl);
  g.rotation.x=Math.PI/2;
  const wrap=new THREE.Group(); wrap.add(g);
  return wrap;
}
function axeMesh(metal){
  const g=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.035,0.6,5),mat(0x6b4426));
  g.add(handle);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.16,0.045),mat(metal));
  head.position.set(0.1,0.24,0); g.add(head);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.2,0.05),mat(metal));
  edge.position.set(0.2,0.24,0); g.add(edge);
  return g;
}
function pickMesh(metal){
  const g=new THREE.Group();
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.035,0.6,5),mat(0x6b4426));
  g.add(handle);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.06,0.06),mat(metal));
  head.position.y=0.27; g.add(head);
  for(const s of [-1,1]){
    const spike=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.12,4),mat(metal));
    spike.position.set(s*0.23,0.27,0); spike.rotation.z=s*-Math.PI/2; g.add(spike);
  }
  return g;
}
function shieldMesh(){
  const g=new THREE.Group();
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.06,10),mat(0x8a5e34));
  disc.rotation.z=Math.PI/2; g.add(disc);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.025,5,12),mat(0x6b4426));
  rim.rotation.y=Math.PI/2; g.add(rim);
  const boss=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,6),mat(0x9aa0a8));
  boss.position.x=0.05; g.add(boss);
  return g;
}
function helmMesh(metal){
  const g=new THREE.Group();
  const dome=new THREE.Mesh(new THREE.SphereGeometry(0.21,8,6,0,Math.PI*2,0,Math.PI/2),mat(metal));
  g.add(dome);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.215,0.215,0.07,8),mat(metal));
  rim.position.y=-0.01; g.add(rim);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.12,0.3),mat(metal));
  ridge.position.y=0.15; g.add(ridge);
  return g;
}
function staffMesh(orb){
  const g=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.035,1.1,6),mat(0x6b4426));
  shaft.position.y=0.25; g.add(shaft);
  const head=new THREE.Mesh(new THREE.OctahedronGeometry(0.09),
    new THREE.MeshBasicMaterial({color:orb}));
  head.position.y=0.86; g.add(head);
  return g;
}
function amuletMesh(gem){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.012,4,10),mat(0xcaa36a));
  g.add(ring);
  const stone=new THREE.Mesh(new THREE.OctahedronGeometry(0.045),mat(gem));
  stone.position.y=-0.1; g.add(stone);
  return g;
}
function capeMesh(color){
  const c=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,0.95,8,1,true,Math.PI*0.6,Math.PI*0.8),
    new THREE.MeshLambertMaterial({color, side:THREE.DoubleSide}));   // flatShading unsupported on Lambert (r128)
  c.position.set(0,0.95,-0.16);
  return c;
}
const METALS = {copper:0xc6794a, bronze:0x8a6437, iron:0x9aa0a8, steel:0xd0d4dc, whitsteel:0xe8ecf2,
  aurel:0xd4a83e, veyrite:0x3ec6b4, undercrag:0x6a5a7a, leather:0x8a5e34, cloth:0x7a86b8, glimmer:0xb48ae0};
function tierMetal(def){ return METALS[def.tier] !== undefined ? METALS[def.tier] : 0x8a6437; }
/* one mesh router for any equipable item — used worn AND on the ground */
function gearMesh(id){
  const def=ITEMS[id]; if(!def||!def.model) return null;
  const m=tierMetal(def);
  switch(def.model){
    case 'sword':  return swordMesh(m);
    case 'axe':    return axeMesh(m);
    case 'pick':   return pickMesh(m);
    case 'bow':    return bowMesh();
    case 'staff':  return staffMesh(def.tier==='glimmer'?0xb48ae0: id==='storm_staff'?0x7ad0ff: id==='ember_staff'?0xff8c4a:0x9ad0ff);
    case 'helm':   return helmMesh(m);
    case 'plate':  return bodyArmorMesh(m);
    case 'legs':   return null; // handled via legArmorMesh on the wearer
    case 'shield': return shieldMesh();
    case 'robe':   return null; // recolors the torso
    case 'hat':    return null; // built as headTop hat
    case 'amulet': return amuletMesh(def.sBonus?0xc84a4a:def.aBonus?0x4a9ac8:0x4ac86a);
    case 'cape':   return capeMesh(def.capeColor||0xa83232);
  }
  return null;
}

/* fitted armour overlays for the angular humanoid */
function bodyArmorMesh(metal){
  const g=new THREE.Group();
  const chest=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.2,0.54,4,1,false,Math.PI/4),mat(metal));
  chest.position.y=1.26; chest.scale.z=0.62; chest.castShadow=true; g.add(chest);
  for(const s of [-1,1]){
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.15,0.15,4,1,false,Math.PI/4),mat(metal));
    pad.position.set(s*0.28,1.47,0); g.add(pad);
  }
  const trim=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.06,0.3),mat(0x6b5a2a));
  trim.position.y=1.0; g.add(trim);
  return g;
}
function legArmorMesh(metal, parts){
  const g=new THREE.Group(); g.userData={covers:[]};
  for(const side of ['L','R']){
    if(parts['legMesh'+side]) parts['legMesh'+side].visible=false;   // flare would clip the plate
    const cover=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.09,0.76,4,1,false,Math.PI/4),mat(metal));
    cover.position.y=-0.38;
    parts['leg'+side].add(cover);
    g.userData.covers.push(cover);
  }
  return g;
}

/* ground model for any item id */
function itemGroundMesh(id){
  const g=new THREE.Group();
  const def=ITEMS[id];
  if(def && def.model && !['robe','hat','legs'].includes(def.model)){
    const m=gearMesh(id);
    if(m){
      if(def.model==='sword'||def.model==='axe'||def.model==='pick'||def.model==='staff'){ m.rotation.set(Math.PI/2,0,0.6); m.position.y=0.08; }
      else if(def.model==='bow'){ m.rotation.x=-Math.PI/2; m.position.y=0.06; }
      else if(def.model==='shield'){ m.rotation.z=Math.PI/2; m.position.y=0.06; }
      else if(def.model==='helm'){ m.position.y=0.1; }
      else if(def.model==='plate'){ m.scale.setScalar(0.6); m.position.y=-0.5; }
      else if(def.model==='amulet'){ m.rotation.x=-Math.PI/2; m.position.y=0.05; }
      else if(def.model==='cape'){ m.scale.setScalar(0.45); m.position.set(0,-0.18,0.1); m.rotation.x=0.5; }
      g.add(m);
      return g;
    }
  }
  if(def && def.model==='legs'){
    const l=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.45,0.2),mat(tierMetal(def)));
    l.position.y=0.22; g.add(l); return g;
  }
  if(def && (def.model==='robe'||def.model==='hat')){
    const r=new THREE.Mesh(new THREE.ConeGeometry(def.model==='hat'?0.16:0.24, def.model==='hat'?0.3:0.4, 7),
      mat(def.tier==='glimmer'?0xb48ae0:0x7a86b8));
    r.position.y=0.18; g.add(r); return g;
  }
  switch(id){
    case 'coins': {
      for(let i=0;i<4;i++){ const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.03,8),mat(0xe8c45a));
        coin.position.set((Math.random()-.5)*0.25, 0.03+i*0.028, (Math.random()-.5)*0.25); g.add(coin);} break; }
    case 'bones': {
      const b=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.5,5),mat(0xefe8d8));
      b.rotation.z=Math.PI/2; b.position.y=0.06; g.add(b);
      for(const e of [-0.25,0.25]){ const k=new THREE.Mesh(new THREE.SphereGeometry(0.07,5,5),mat(0xefe8d8));
        k.position.set(e,0.06,0); g.add(k);} break; }
    case 'logs': {
      const l=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.7,6),mat(0x7a512f));
      l.rotation.z=Math.PI/2; l.position.y=0.1; g.add(l);
      const l2=l.clone(); l2.position.set(0.05,0.26,0.1); l2.rotation.y=0.3; g.add(l2); break; }
    case 'copper_ore': {
      const o=new THREE.Mesh(new THREE.IcosahedronGeometry(0.2,0),mat(0x7d7568));
      o.position.y=0.16; g.add(o);
      const v=new THREE.Mesh(new THREE.IcosahedronGeometry(0.07,0),mat(0xc77b4a));
      v.position.set(0.1,0.24,0.06); g.add(v); break; }
    case 'raw_perch': case 'cooked_perch': {
      const f=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,5),mat(id==='raw_perch'?0x9fb6c4:0xc98a4b));
      f.scale.set(1.5,0.5,0.7); f.position.y=0.1; g.add(f);
      const t=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.16,4),mat(id==='raw_perch'?0x7e98a8:0xa86b35));
      t.rotation.z=Math.PI/2; t.position.set(-0.32,0.1,0); g.add(t); break; }
    case 'bronze_sword': { const s=swordMesh(METALS.bronze); s.rotation.set(Math.PI/2,0,0.6); s.position.y=0.08; g.add(s); break; }
    case 'iron_sword':   { const s=swordMesh(METALS.iron);   s.rotation.set(Math.PI/2,0,0.6); s.position.y=0.08; g.add(s); break; }
    case 'worn_bow': { const b=bowMesh(); b.rotation.x=-Math.PI/2; b.position.y=0.06; g.add(b); break; }
    case 'arrows': { for(let i=0;i<3;i++){ const a=arrowMesh();
        a.rotation.y=i*0.4; a.rotation.x=-Math.PI/2*0.96; a.position.y=0.05; g.add(a);} break; }
    case 'air_rune': case 'water_rune': case 'earth_rune': case 'fire_rune':
    case 'mind_rune': case 'chaos_rune': case 'nature_rune':
    case 'spark_rune': { const r=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.07,0.22),mat(0xb9b2a4));
      r.position.y=0.05; g.add(r);
      const s=new THREE.Mesh(new THREE.OctahedronGeometry(0.06),new THREE.MeshBasicMaterial({color:0x3ec6ff}));
      s.position.y=0.13; g.add(s); break; }
    case 'wood_shield': { const s=shieldMesh(); s.rotation.z=Math.PI/2; s.position.y=0.06; g.add(s); break; }
    case 'bronze_helm': { const h=helmMesh(METALS.bronze); h.position.y=0.1; g.add(h); break; }
    case 'bronze_plate': { const p=bodyArmorMesh(METALS.bronze); p.scale.setScalar(0.6); p.position.y=-0.5; g.add(p); break; }
    case 'leather_body': { const p=bodyArmorMesh(METALS.leather); p.scale.setScalar(0.6); p.position.y=-0.5; g.add(p); break; }
    case 'bronze_legs': { const l=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.45,0.2),mat(METALS.bronze));
      l.position.y=0.22; g.add(l); break; }
    case 'hatchet': { const h=axeMesh(METALS.bronze); h.rotation.z=Math.PI/2*0.9; h.position.y=0.07; g.add(h); break; }
    case 'iron_hatchet': { const h=axeMesh(METALS.iron); h.rotation.z=Math.PI/2*0.9; h.position.y=0.07; g.add(h); break; }
    case 'pickaxe': { const h=pickMesh(METALS.bronze); h.rotation.z=Math.PI/2*0.9; h.position.y=0.09; g.add(h); break; }
    case 'iron_pickaxe': { const h=pickMesh(METALS.iron); h.rotation.z=Math.PI/2*0.9; h.position.y=0.09; g.add(h); break; }
    case 'fishing_net': { const n=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.03,5,10),mat(0x8a6a3e));
      n.rotation.x=-Math.PI/2; n.position.y=0.04; g.add(n); break; }
    case 'fen_charm': { const c=new THREE.Mesh(new THREE.OctahedronGeometry(0.14),mat(0x7a3da8));
      c.position.y=0.12; g.add(c); break; }
    case 'beast_hide': { const h=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.04,7),mat(0x9a8468));
      h.position.y=0.04; h.scale.x=1.3; g.add(h); break; }
    case 'hollow_ale': { const mug=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.08,0.2,7),mat(0xc8a45a));
      mug.position.y=0.1; g.add(mug);
      const foam=new THREE.Mesh(new THREE.CylinderGeometry(0.085,0.085,0.04,7),mat(0xf0e6c8));
      foam.position.y=0.21; g.add(foam); break; }
    default: { const b=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.12,0.2),mat(0xc9a23e));
      b.position.y=0.07; g.add(b); }
  }
  return g;
}
