/* ================= ENGINE / WORLD ================= */
let scene, camera, renderer, clock;
const WORLD = {size:320, clickables:[], npcs:[], drops:[], resources:[], grounds:[], fires:[], interiors:[]};
let player;
const camCtl = {yaw: Math.PI*0.75, pitch: 1.08, dist: 19, dragging:false, lx:0, ly:0};

function initEngine(){
  const canvas = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  const isSmall = (typeof matchMedia==='function') && matchMedia('(max-width: 880px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, isSmall?1.5:2));   // phones render lighter
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8c8cc);
  scene.fog = new THREE.Fog(0xb8c8cc, 16, 50);   // the old-school horizon: close, atmospheric, fast

  camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 600);

  scene.add(new THREE.HemisphereLight(0xf2e8cc, 0x55604a, 0.85));
  const sun = new THREE.DirectionalLight(0xf4e2b0, 0.62);
  sun.position.set(60, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-160; sun.shadow.camera.right=200;
  sun.shadow.camera.top=200; sun.shadow.camera.bottom=-160;
  scene.add(sun);

  clock = new THREE.Clock();
  addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
}

function mat(c){ return new THREE.MeshLambertMaterial({color:c, flatShading:true}); }

/* ---------- static collision: rectangles + circles ---------- */
WORLD.colliders = [];
function addRectCollider(x,z,hw,hd){ WORLD.colliders.push({type:'rect',x,z,hw,hd}); }
function addCircleCollider(x,z,r){ WORLD.colliders.push({type:'circle',x,z,r}); }
function collides(x,z,pad,ignoreDoors){
  pad = pad||0.25;
  for(const c of WORLD.colliders){
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
function buildTextures(){
  TEX.grass = pixelTexture('#7d9450', [['#6d8344',220,2],['#8aa05c',160,2],['#5f7440',110,1],['#74894a',90,2]], '#8aa05c');
  TEX.water = waterTexture();
  TEX.stone = pixelTexture('#8a8276', [['#7a7268',200,2],['#9a9286',160,2],['#6a6258',70,1]]);
  TEX.wood  = pixelTexture('#6b4a2f', [['#5d3e26',180,2],['#7a5838',140,2]]);
  TEX.thatch= pixelTexture('#a8854a', [['#96743e',220,2],['#ba9659',160,2]]);
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
const HOLM_POND = {x:232, z:244, r:5.2};
function terrainHeight(x,z){
  let h = Math.sin(x*0.07)*Math.cos(z*0.06)*1.4 + Math.sin(x*0.013+z*0.017)*2.0;
  for(const k in ZONES){ const d=Math.hypot(x-ZONES[k].pos[0], z-ZONES[k].pos[1]);
    if(d<18) h *= d/18; }
  // carve the Mirrorpond basin
  const pd = Math.hypot(x-ZONES.pond.pos[0], z-ZONES.pond.pos[1]);
  if(pd<9) h -= (1-pd/9)*1.6;
  // carve the Tutor's Holm practice pond
  const hd = Math.hypot(x-HOLM_POND.x, z-HOLM_POND.z);
  if(hd<HOLM_POND.r+0.5) h -= (1-hd/(HOLM_POND.r+0.5))*1.5;
  // the Miller's Causeway: a raised road across the western marsh to Emberwood
  h = Math.max(h, causewayLift(x,z, -12,-12, -62,-39, 4.5, -0.55));
  // the Emberwood rise: the grove stands on a dry knoll above the wetlands
  const ed = Math.hypot(x-(-63), z-(-41));
  if(ed<17){ const k=1-ed/17; h = Math.max(h, -0.45 + k*0.85); }
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
function buildTerrainPatch(cx, cz, size, segs, edgeFalloff){
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const colors = []; const c = new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const lx=pos.getX(i), lz=pos.getZ(i);
    const x=lx+cx, z=lz+cz;
    let h = terrainHeight(x,z);
    if(edgeFalloff){
      const r = Math.max(Math.abs(lx),Math.abs(lz)) / (size/2);
      if(r>0.7) h = h*(1-(r-0.7)/0.3) - ((r-0.7)/0.3)*4;
    }
    pos.setY(i, h);
    const zone = zoneAt(x,z);
    if(zone==='gloomfen') c.setHex(0x4e5944);
    else if(zone==='quarry') c.setHex(0xa39a85);
    else if(zone==='holm') c.setHex(0x8aa45e);
    else if(zone==='dunes') c.setHex(0xccb578);
    else if(zone==='scarlands') c.setHex(0x8a7c62);
    else if(zone==='brynholt') c.setHex(0x778f52);
    else c.setHex(0x83a055);
    // OSRS-style ground mottle: hand-painted unevenness
    const mot = Math.sin(x*0.31)*Math.sin(z*0.27) + Math.sin(x*0.071+1.3)*Math.sin(z*0.083);
    c.offsetHSL(0, -0.04+mot*0.02, mot*0.035);
    // the deeper into the Scarlands, the more scorched the earth
    if(zone==='scarlands' && typeof scarThreat==='function'){
      const t=Math.min(scarThreat(z),12);
      if(t>0) c.lerp(new THREE.Color(0x6e5a48), t/14);
    }
    if(h<-0.8) c.setHex(0xe2d49a);                       // sandy shore
    if(!edgeFalloff && pathDist(x,z)<2.4) c.setHex(0xb89868); // dirt path
    const pd = Math.hypot(x-ZONES.pond.pos[0], z-ZONES.pond.pos[1]);
    if(pd<10.5 && pd>=9) c.setHex(0xd6c489);             // pond shore sand
    const hd = Math.hypot(x-HOLM_POND.x, z-HOLM_POND.z);
    if(hd<HOLM_POND.r+1.6 && hd>=HOLM_POND.r-0.4) c.setHex(0xd6c489);
    const ad = Math.hypot(x-ZONES.arena.pos[0], z-ZONES.arena.pos[1]);
    if(ad<11) c.setHex(0xd2bc86);                        // duel pit sand
    c.offsetHSL(0,(Math.random()-.5)*0.03,(Math.random()-.5)*0.04);
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const tex = TEX.grass.clone(); tex.needsUpdate=true; tex.repeat.set(size/4, size/4);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({map:tex, vertexColors:true}));
  m.position.set(cx,0,cz);
  m.receiveShadow = true; m.name='ground';
  scene.add(m);
  WORLD.clickables.push(m); WORLD.grounds.push(m);
  return m;
}
function buildGround(){
  buildTerrainPatch(0,0, WORLD.size, 140, false);
  buildTerrainPatch(230,230, 70, 28, true);
  // Mirrorpond water
  makeWaterSurface(new THREE.CircleGeometry(9.6,24), ZONES.pond.pos[0], -0.55, ZONES.pond.pos[1], 8, 0.94);
  // Tutor's Holm pond water
  const hp=HOLM_POND;
  makeWaterSurface(new THREE.CircleGeometry(hp.r+0.4,20), hp.x, gy(hp.x,hp.z)+0.62, hp.z, 5, 0.94);
}
/* analytic ground height — identical math to the generated meshes, no raycasts */
function patchHeight(x,z, cx,cz, size, edgeFalloff){
  const lx=x-cx, lz=z-cz, half=size/2;
  if(Math.abs(lx)>half || Math.abs(lz)>half) return null;
  let h = terrainHeight(x,z);
  if(edgeFalloff){
    const r = Math.max(Math.abs(lx),Math.abs(lz)) / half;
    if(r>0.7) h = h*(1-(r-0.7)/0.3) - ((r-0.7)/0.3)*4;
    if(r>=0.995) return null;             // very rim of the island = sea
  }
  return h;
}
function groundY(x,z){
  const m = patchHeight(x,z, 0,0, WORLD.size, false);
  if(m!==null) return m;
  const hm = patchHeight(x,z, 230,230, 70, true);
  if(hm!==null && hm>-1.55) return hm;
  return null;
}
function gy(x,z){ const y=groundY(x,z); return y===null?0:y; }

/* ---------- trees: blobby canopies, not pine cones ---------- */
function makeTree(x,z,variant){
  // variant: 'normal' | 'dark' | 'dead'
  variant = variant||'normal';
  const g = new THREE.Group();
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
    const greens = variant==='dark' ? [0x33402c,0x2c3826,0x3a4a32] : [0x4f7434,0x45682e,0x5a8040,0x52753a];
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
function makeStall(x,z,color,stallKind){
  const g=new THREE.Group();
  const table=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.16,1.2), mat(0x8a6a44));
  table.position.y=0.78; g.add(table);
  for(const [sx,sz] of [[-0.95,-0.45],[0.95,-0.45],[-0.95,0.45],[0.95,0.45]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.78,0.1), mat(0x6b4a2f));
    leg.position.set(sx,0.39,sz); g.add(leg);
  }
  for(const sx of [-1.0,1.0]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.9,5), mat(0x6b4a2f));
    pole.position.set(sx,0.95,0); g.add(pole);
  }
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,1.5), mat(color||0xb03a3a));
  canopy.position.y=1.95; canopy.rotation.x=0.08; g.add(canopy);
  const goods=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.5), mat(0xc9a85a));
  goods.position.set(-0.5,0.95,0); g.add(goods);
  const goods2=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), mat(0x7a9a4a));
  goods2.position.set(0.45,0.95,0.1); g.add(goods2);
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
  const wall=new THREE.Mesh(new THREE.BoxGeometry(len,h,0.9), mat(0xe6e2d8));
  wall.position.set(cx, gy(cx,cz)+h/2, cz); wall.rotation.y=-ang;
  wall.castShadow=true; wall.receiveShadow=true; scene.add(wall);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(len,0.25,1.15), mat(0xcfcabe));
  cap.position.set(cx, gy(cx,cz)+h+0.12, cz); cap.rotation.y=-ang; scene.add(cap);
  const teeth=Math.floor(len/1.6);
  for(let i=0;i<teeth;i++){
    const t=(i+0.5)/teeth;
    const tx=x1+dx*t, tz=z1+dz*t;
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,1.0), mat(0xe6e2d8));
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
  const t=new THREE.Mesh(new THREE.BoxGeometry(2.2,5.2,2.2), mat(0xe6e2d8));
  t.position.set(x,py+2.6,z); t.castShadow=true; scene.add(t);
  const cap=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.3,2.7), mat(0xcfcabe));
  cap.position.set(x,py+5.3,z); scene.add(cap);
  for(let i=0;i<4;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6), mat(0xe6e2d8));
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
  const wallMat = opts.wall==='stone'
    ? new THREE.MeshLambertMaterial({map:TEX.stone, color})
    : mat(color);
  function wall(wx,wz,ww,wd){
    const m=new THREE.Mesh(new THREE.BoxGeometry(ww,h,wd), wallMat);
    m.position.set(wx,h/2,wz); m.castShadow=true; m.receiveShadow=true; g.add(m);
    addRectCollider(x+wx, z+wz, ww/2+0.08, wd/2+0.08);
    return m;
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
  // corner beams + waist band, as before
  for(const sx of [-w/2+0.12, w/2-0.12]) for(const sz of [-d/2+0.12, d/2-0.12]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.16,h,0.16),mat(0x4a3a28));
    beam.position.set(sx,h/2,sz); g.add(beam);
  }
  const band=new THREE.Mesh(new THREE.BoxGeometry(w+0.04,0.14,d+0.04),mat(0x4a3a28));
  band.position.y=h*0.55; g.add(band);
  // wooden floor inside
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w-0.1,0.1,d-0.1),
    new THREE.MeshLambertMaterial({map:TEX.plank||TEX.stone, color:0x8a6a48}));
  floor.position.y=0.08; floor.receiveShadow=true; g.add(floor);
  const win=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.06),mat(0x2c3e50));
  win.position.set(w/4,h*0.62,d/2+0.04); g.add(win);
  const win2=win.clone(); win2.position.x=-w/4; g.add(win2);
  let roof;
  const roofMat = new THREE.MeshLambertMaterial({map:TEX.thatch, color:roofColor});
  TEX.thatch.repeat.set(2,2);
  if(opts.roof==='gable'){
    // a true gabled ridge: triangular prism laid along the longer axis
    const alongX = w>=d;
    const span = (alongX?d:w), len = (alongX?w:d)+0.6;
    const prism = new THREE.Mesh(new THREE.CylinderGeometry(span*0.72, span*0.72, len, 3, 1), roofMat);
    prism.rotation.z = Math.PI/2;             // lay the axis flat
    prism.rotation.x = Math.PI/2 + Math.PI/6; // flat face down, apex up
    const holder=new THREE.Group(); holder.add(prism);
    if(!alongX) holder.rotation.y = Math.PI/2;
    holder.position.y = h + span*0.3;
    roof = holder; roof.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roof);
  } else {
    roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*0.82, h*(opts.tall?1.25:0.85), 4), roofMat);
    roof.position.y = h + h*0.42; roof.rotation.y = Math.PI/4; roof.castShadow=true; g.add(roof);
  }
  const corners=[[x-w/2,z-d/2],[x+w/2,z-d/2],[x-w/2,z+d/2],[x+w/2,z+d/2],[x,z]];
  const hs=corners.map(c=>gy(c[0],c[1]));
  const yMin=Math.min(...hs), yMax=Math.max(...hs);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(w+0.5,(yMax-yMin)+0.9,d+0.5),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  plinth.position.y=(yMax-yMin)/2-((yMax-yMin)+0.9)/2+0.15;
  plinth.receiveShadow=true; g.add(plinth);
  g.position.set(x, yMin, z);
  scene.add(g);
  /* ---- the 2006-flavour detail kit: timber, chimney, sign, door, shutters ---- */
  // timber X-braces on the two windowless walls
  const brace=(bx,bz,len,rotY)=>{
    for(const s of [1,-1]){
      const b=new THREE.Mesh(new THREE.BoxGeometry(len,0.13,0.1), mat(0x4a3a28));
      b.position.set(bx,h*0.32,bz); b.rotation.y=rotY; b.rotation.z=s*0.42; g.add(b);
    }
  };
  if(doorSide!=='E' && doorSide!=='W'){ brace(-w/2+0.06,0,Math.min(d*0.8,3.4),Math.PI/2); brace(w/2-0.06,0,Math.min(d*0.8,3.4),Math.PI/2); }
  else { brace(0,-d/2+0.06,Math.min(w*0.8,3.4),0); brace(0,d/2-0.06,Math.min(w*0.8,3.4),0); }
  // ridge cap along the roof peak
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.3), mat(0x4a3a28));
  ridge.position.y=h + h*0.85; g.add(ridge);
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
  // shutters beside the windows
  for(const wn of [win, win2]){
    for(const s of [-1,1]){
      const sh=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.52,0.05), mat(0x4a5a3a));
      sh.position.set(wn.position.x+s*0.36, wn.position.y, wn.position.z+0.02); g.add(sh);
    }
  }
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
/* vertical light gradient: lit from above, ambient occlusion toward the hem */
function gradBase(x, hex){
  for(let r=0;r<64;r++){
    const f = 1.1 - (r/64)*0.26;
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
    const dark=_shadeHex(skin,0.68), mid=_shadeHex(skin,0.82);
    // soft brow shadow
    x.fillStyle=mid; x.fillRect(16,22,12,2); x.fillRect(36,22,12,2);
    // gentle closed-lid shading (subtle, like distant OSRS faces)
    x.strokeStyle=dark; x.lineWidth=1.5;
    x.beginPath(); x.moveTo(18,28); x.quadraticCurveTo(22,30,26,28); x.stroke();
    x.beginPath(); x.moveTo(38,28); x.quadraticCurveTo(42,30,46,28); x.stroke();
    // soft nose shade
    x.fillStyle=mid; x.fillRect(30,31,3,8);
    // faint mouth
    x.strokeStyle=_shadeHex(skin,0.62); x.lineWidth=1.5;
    x.beginPath(); x.moveTo(26,48); x.quadraticCurveTo(32,49.5,38,48); x.stroke();
    // chin shading
    x.fillStyle=_shadeHex(skin,0.9); x.fillRect(20,54,24,6);
  });
}
function clothTex(hex){
  return paintedTex('cloth'+hex, x=>{
    gradBase(x, hex);
    // painted folds: soft vertical streaks
    for(let i=0;i<5;i++){
      const fx=6+i*12+((i*7)%5);
      x.fillStyle='rgba(0,0,0,0.13)';
      x.fillRect(fx,4,2,56);
      x.fillStyle='rgba(255,255,255,0.07)';
      x.fillRect(fx+2,4,1,56);
    }
    // hem band
    x.fillStyle='rgba(0,0,0,0.22)'; x.fillRect(0,58,64,6);
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
  const hasBeard = opts.beard!==undefined ? opts.beard : (!opts.hairLong && Math.random()<0.45);
  const g = new THREE.Group();
  const parts = {};
  const prism5=(rT,rB,h,c)=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(rT,rB,h,8), mat(c)); m.castShadow=true; return m; };

  // ---- legs: dramatic faceted flare (5-sided, corner-forward) over wedge shoes ----
  for(const side of ['L','R']){
    const piv=new THREE.Group(); piv.position.set(side==='L'?-0.1:0.1, 0.84, 0);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.2,0.82,8),
      new THREE.MeshLambertMaterial({map:clothTex(legC)}));
    leg.castShadow=true; leg.position.y=-0.41; piv.add(leg);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.09,0.3), mat(0x6e4a2a));
    shoe.position.set(0,-0.84,0.08); shoe.castShadow=true; piv.add(shoe);
    g.add(piv); parts['leg'+side]=piv; parts['legMesh'+side]=leg; parts['shoe'+side]=shoe;
  }
  // ---- hips + thin belt ----
  const hips=prism5(0.17,0.19,0.16,legC); hips.position.y=0.92; hips.scale.z=0.66; g.add(hips);
  const belt=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.05,0.24), mat(beltC));
  belt.position.y=1.01; g.add(belt);
  // ---- torso: hard taper, broad chest, faceted ----
  parts.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.145,0.52,8),
    new THREE.MeshLambertMaterial({map:clothTex(bodyColor)}));
  parts.torso.castShadow=true;
  parts.torso.position.y=1.29; parts.torso.scale.z=0.6; g.add(parts.torso);
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
    pad.position.set(sgn*0.27,1.5,0); pad.rotation.z=sgn*0.55; pad.castShadow=true; g.add(pad);
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
  const cap2=new THREE.Mesh(new THREE.CylinderGeometry(0.125,0.12,0.1,8), mat(hairC));
  cap2.position.y=1.85; cap2.scale.z=0.88; g.add(cap2);
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.19,opts.hairLong?0.38:0.16,0.05), mat(hairC));
  back.position.set(0, opts.hairLong?1.66:1.76, -0.105); g.add(back);
  for(const s of [-1,1]){
    const sidep=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.1,0.13), mat(hairC));
    sidep.position.set(s*0.105,1.79,-0.01); g.add(sidep);
  }
  const fringe=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.045,0.04), mat(hairC));
  fringe.position.set(0.008,1.855,0.085); fringe.rotation.z=0.07; g.add(fringe);
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

  g.scale.setScalar(opts.scale||1);
  g.userData.parts = parts;
  g.userData.walkT = 0;
  return g;
}
/* OSRS-style tweened slash: raise over the shoulder, fast diagonal cut, recover */
function tickSwing(g, dt){
  const s=g.userData.swing; if(!s) return false;
  const p=g.userData.parts; if(!p||!p.armR){ g.userData.swing=null; return false; }
  s.t += dt;
  const f = Math.min(1, s.t/s.dur);
  let armX=0, armZ=0, wrist=0, twist=0;
  if(f<0.35){                       // windup: weapon raised behind the shoulder
    const k=f/0.35;
    armX=-2.9*k; armZ=-0.4*k; wrist=0.6*k; twist=-0.3*k;
  } else if(f<0.6){                 // the cut: fast diagonal slash across the body
    const k=(f-0.35)/0.25;
    armX=-2.9+2.5*k; armZ=-0.4+0.75*k; wrist=0.6-1.4*k; twist=-0.3+0.55*k;
  } else {                          // recover
    const k=(f-0.6)/0.4;
    armX=-0.4*(1-k); armZ=0.35*(1-k); wrist=-0.8*(1-k); twist=0.25*(1-k);
  }
  p.armR.rotation.x=armX; p.armR.rotation.z=armZ;
  if(p.handR) p.handR.rotation.x=wrist;
  if(p.torso) p.torso.rotation.y=twist;
  if(f>=1){ g.userData.swing=null; g.userData.swinging=false;
    p.armR.rotation.set(0,0,0); if(p.handR) p.handR.rotation.x=0;
    if(p.torso) p.torso.rotation.y=0; }
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
  if(tickSwing(g, dt)) { /* swing owns the right arm this frame */ }
  if(moving){
    g.userData.walkT += dt*9*(speedMul||1);
    const s=Math.sin(g.userData.walkT)*0.55;
    p.legL.rotation.x=s; p.legR.rotation.x=-s;
    if(!g.userData.swinging){ p.armL.rotation.x=-s*0.7; p.armR.rotation.x=s*0.7; }
  } else {
    for(const k of ['legL','legR']) p[k].rotation.x*=0.8;
    if(!g.userData.swinging){ p.armL.rotation.x*=0.8; p.armR.rotation.x*=0.8; }
  }
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
function beastAnim(g, moving, dt){
  const p=g.userData.parts; if(!p||!p.legs) return;
  if(moving){
    g.userData.walkT += dt*10;
    const s=Math.sin(g.userData.walkT)*0.5;
    p.legs.forEach((l,i)=>l.rotation.z = (i%2?s:-s));
  } else p.legs.forEach(l=>l.rotation.z*=0.8);
  if(p.tail) p.tail.rotation.y = Math.sin(performance.now()*0.004+g.userData.walkT)*0.3;
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
    new THREE.MeshLambertMaterial({color, side:THREE.DoubleSide, flatShading:true}));
  c.position.set(0,0.95,-0.16);
  return c;
}
const METALS = {bronze:0xb08d57, iron:0x9aa0a8, steel:0xd0d4dc, aurel:0xd4a83e,
  veyrite:0x3ec6b4, leather:0x8a5e34, cloth:0x7a86b8, glimmer:0xb48ae0};
function tierMetal(def){ return METALS[def.tier] !== undefined ? METALS[def.tier] : 0xb08d57; }
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
