/* ============ SMITHY / FORGE (prop pack) ============
 * Reference: Bible_References/Anvil_Building_For_Smithing.jpg — an OSRS smithy:
 * anvils on wooden stumps, a coal forge glowing warm, bellows, a water quench
 * trough, a tool rack of hammers & tongs, and piles of ingots / raw ore.
 * Cozy 2007/OSRS, low-poly flat-shaded (mat() = flatShading MeshPhong).
 *
 * Self-booting IIFE (pattern: src/prop_beds_torches.js). Owns ONLY this file.
 * Reuses the global world helpers left in game2_world.js — mat(), gy(), collides(),
 * addRectCollider(), addCircleCollider(), scene, WORLD (and TEX / WORLD.waterTextures
 * for the trough water) — and the ENGINE FLAME IDIOM: push a group to WORLD.fires
 * carrying a userData.flame node, and game5_main.js's loop flickers it via
 *   f.userData.flame.scale.y = 1 + Math.sin(performance.now()*0.02)*0.25
 * (same line that drives makeTorch/makeCampfire/makeWallTorch). No new anim system.
 *
 * Placement: the Stonereach Smithy yard in Veyhollow — building at (13,11), the
 * outdoor furnace (makeFurnace) at (17.5,14) with a cinder ground-patch at (15,13.6).
 * This set fills that cinder yard BESIDE the existing furnace (never duplicating it).
 */
(function(){

  const IRON   = 0x3e3a38;   // dark cast iron (anvil / tool heads)
  const IRON2  = 0x4a4642;   // slightly lighter iron
  const STONE  = 0x6e6a64;   // forge stonework (matches makeFurnace body)
  const STONE2 = 0x5a5650;
  const WOOD   = 0x6b4a2f;   // stained pine
  const WOOD2  = 0x7d5734;   // lighter rails
  const LEATHER= 0x5a3a24;

  const box = (w,h,d,c)=> new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(c));
  const cyl = (rt,rb,h,c,seg)=> new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||6), mat(c));

  /* ---- ANVIL on a wood stump: stump base + faceted iron body + horn + heel ----
     Built centred on the stump; horn points +x. rot yaws the whole piece.
     Clickable (kind:'anvil') so it works like the interior/OSRS anvil. */
  function makeAnvil(x, z, rot){
    const g = new THREE.Group();
    // wooden chopping stump it sits on
    const stump = cyl(0.34,0.4,0.6,WOOD,8);
    stump.position.y=0.3; stump.castShadow=true; g.add(stump);
    const bark = cyl(0.42,0.42,0.1,WOOD2,8);
    bark.position.y=0.05; g.add(bark);
    // iron anvil, faceted: foot → waist → face, with a horn and a stepped heel
    const foot = box(0.5,0.11,0.34, IRON);   foot.position.y=0.66; g.add(foot);
    const waist= box(0.26,0.14,0.24, IRON2); waist.position.y=0.79; g.add(waist);
    const face = box(0.66,0.17,0.32, IRON);  face.position.y=0.94; face.castShadow=true; g.add(face);
    // the horn (tapered cone) off the +x end
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11,0.36,6), mat(IRON2));
    horn.rotation.z=-Math.PI/2; horn.position.set(0.48,0.95,0); g.add(horn);
    // the squared heel/step off the -x end
    const heel = box(0.14,0.13,0.28, IRON2); heel.position.set(-0.38,0.9,0); g.add(heel);
    // a stray hammer resting on the face
    const hh = cyl(0.02,0.02,0.34,WOOD2,5); hh.rotation.z=Math.PI/2; hh.position.set(0.06,1.05,0.04); g.add(hh);
    const hhd= box(0.14,0.1,0.1, IRON);     hhd.position.set(0.24,1.05,0.04); g.add(hhd);

    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.position.set(x, gy(x,z), z); g.rotation.y = rot||0;
    g.userData = {kind:'anvil', label:'Smith at <b>Anvil</b>'};
    scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD.clickables) WORLD.clickables.push(g);
    addCircleCollider(x, z, 0.42);
    return g;
  }

  /* ---- COAL FORGE: stone hearth + back hood + a bed of GLOWING coals + flame ----
     Coals/flame use unlit warm materials; the flame is a GROUP pushed to WORLD.fires
     so the engine loop flickers it (and the atmosphere layer smokes it). */
  function makeForge(x, z, rot){
    const g = new THREE.Group();
    // stone hearth body
    const body = box(1.3,0.72,0.92, STONE); body.position.y=0.36; body.castShadow=true; g.add(body);
    const lip  = box(1.36,0.1,0.98, STONE2); lip.position.y=0.74; g.add(lip);
    // raised back wall + a tapering hood/chimney (vents at +z, the "back")
    const back = box(1.3,0.95,0.2, STONE); back.position.set(0,1.15,0.4); back.castShadow=true; g.add(back);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.5,0.7,4), mat(STONE2));
    hood.rotation.y=Math.PI/4; hood.position.set(0,1.9,0.3); g.add(hood);
    // recessed bed of glowing coals (unlit warm) sitting in the hearth top
    const coals = new THREE.Mesh(new THREE.BoxGeometry(0.92,0.14,0.6),
      new THREE.MeshBasicMaterial({color:0xff5a1e}));
    coals.position.set(0,0.7,-0.06); g.add(coals);
    // a few brighter ember lumps
    for(let i=0;i<5;i++){
      const e=new THREE.Mesh(new THREE.IcosahedronGeometry(0.07+Math.random()*0.05,0),
        new THREE.MeshBasicMaterial({color:0xffb347}));
      e.position.set((Math.random()-.5)*0.8, 0.76, -0.06+(Math.random()-.5)*0.4);
      g.add(e);
    }
    // flame licks above the coals — nested cones in a GROUP for the flicker idiom
    const flame = new THREE.Group();
    const fo = new THREE.Mesh(new THREE.ConeGeometry(0.26,0.5,6),
      new THREE.MeshBasicMaterial({color:0xff8a2e}));
    fo.position.y=0.25; flame.add(fo);
    const fi = new THREE.Mesh(new THREE.ConeGeometry(0.13,0.32,6),
      new THREE.MeshBasicMaterial({color:0xffe07a}));
    fi.position.y=0.2; flame.add(fi);
    flame.position.set(0,0.78,-0.06); g.add(flame);
    g.userData.flame = flame;                 // <-- game5_main.js flickers this

    g.traverse(o=>{ if(o.isMesh && o.material.type==='MeshPhongMaterial') o.castShadow=true; });
    g.position.set(x, gy(x,z), z); g.rotation.y = rot||0;
    scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD.fires) WORLD.fires.push(g);
    // warm hearth light
    const light = new THREE.PointLight(0xff7c2e, 0.7, 8);
    light.position.set(x, gy(x,z)+1.0, z); scene.add(light);
    addRectCollider(x, z, 0.68, 0.5);
    return g;
  }

  /* ---- BELLOWS: two hinged paddle boards + leather bag + iron nozzle ----
     Nozzle points +z by default; rot aims it at the forge. */
  function makeBellows(x, z, rot){
    const g = new THREE.Group();
    const top = box(0.5,0.05,0.4, WOOD2); top.position.set(0,0.42,-0.05); top.rotation.x=0.12; g.add(top);
    const bot = box(0.5,0.05,0.4, WOOD);  bot.position.set(0,0.24,-0.05); bot.rotation.x=-0.06; g.add(bot);
    const bag = box(0.42,0.14,0.34, LEATHER); bag.position.set(0,0.33,-0.05); g.add(bag);
    // pivot hinge at the wide back
    const hinge = cyl(0.05,0.05,0.42,IRON,5); hinge.rotation.z=Math.PI/2; hinge.position.set(0,0.33,-0.22); g.add(hinge);
    // iron nozzle out the narrow front
    const noz = cyl(0.04,0.06,0.4,IRON2,5); noz.rotation.x=Math.PI/2; noz.position.set(0,0.3,0.28); g.add(noz);
    // little wood stand/legs
    for(const sx of [-1,1]){
      const leg=box(0.05,0.28,0.05,WOOD); leg.position.set(sx*0.18,0.14,-0.05); g.add(leg);
    }
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.position.set(x, gy(x,z), z); g.rotation.y = rot||0;
    g.userData={kind:'prop', label:'Bellows'};
    scene.add(g);
    addCircleCollider(x, z, 0.3);
    return g;
  }

  /* ---- QUENCH TROUGH: plank sides + hoops + a rippling water surface ---- */
  function makeQuenchTrough(x, z, rot){
    const g = new THREE.Group();
    const L=1.1, W=0.62, H=0.5;
    // four plank walls
    const wallLong = ()=> box(L, H, 0.08, WOOD);
    const wf=wallLong(); wf.position.set(0,H/2,-(W/2-0.04)); g.add(wf);
    const wb=wallLong(); wb.position.set(0,H/2, (W/2-0.04)); g.add(wb);
    const wallEnd = ()=> box(0.08, H, W, WOOD2);
    const we1=wallEnd(); we1.position.set(-(L/2-0.04),H/2,0); g.add(we1);
    const we2=wallEnd(); we2.position.set( (L/2-0.04),H/2,0); g.add(we2);
    // iron hoops
    for(const sx of [-0.32,0.32]){
      const hoop=box(0.05,H*0.9,W+0.02, IRON); hoop.position.set(sx,H/2,0); g.add(hoop);
    }
    // water surface — use the shared water texture so it ripples with the world
    let waterMat;
    if(typeof TEX!=='undefined' && TEX.water){
      const wtex = TEX.water.clone(); wtex.needsUpdate=true; wtex.repeat.set(1,1);
      waterMat = new THREE.MeshLambertMaterial({map:wtex, transparent:true, opacity:0.9});
      if(typeof WORLD!=='undefined' && WORLD.waterTextures) WORLD.waterTextures.push(wtex);
    } else {
      waterMat = new THREE.MeshLambertMaterial({color:0x2e5a6e, transparent:true, opacity:0.9});
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(L-0.14, W-0.14), waterMat);
    water.rotation.x=-Math.PI/2; water.position.y=H-0.09; g.add(water);
    g.traverse(o=>{ if(o.isMesh && o.material.type==='MeshPhongMaterial') o.castShadow=true; });
    g.position.set(x, gy(x,z), z); g.rotation.y = rot||0;
    g.userData={kind:'prop', label:'Quenching trough'};
    scene.add(g);
    addRectCollider(x, z, (rot? W/2:L/2), (rot? L/2:W/2));
    return g;
  }

  /* ---- TOOL RACK: free-standing post-and-rail frame hung with hammers & tongs ---- */
  function makeToolRack(x, z, rot){
    const g = new THREE.Group();
    // two posts + a top rail + backboard
    for(const sx of [-1,1]){
      const post=box(0.08,1.3,0.08,WOOD); post.position.set(sx*0.5,0.65,0); post.castShadow=true; g.add(post);
    }
    const rail=box(1.12,0.09,0.08,WOOD2); rail.position.set(0,1.24,0); g.add(rail);
    const board=box(1.05,0.7,0.05,WOOD); board.position.set(0,0.85,-0.05); g.add(board);
    // hanging hammers (handle + head)
    for(const hx of [-0.34,0.34]){
      const hd=cyl(0.02,0.02,0.42,WOOD2,5); hd.position.set(hx,0.95,0.04); g.add(hd);
      const hh=box(0.15,0.1,0.1,IRON); hh.position.set(hx,1.18,0.04); g.add(hh);
    }
    // a pair of tongs (two crossed iron bars) hung centre
    const t1=cyl(0.015,0.02,0.44,IRON2,4); t1.position.set(-0.02,0.98,0.05); t1.rotation.z=0.12; g.add(t1);
    const t2=cyl(0.015,0.02,0.44,IRON2,4); t2.position.set( 0.02,0.98,0.05); t2.rotation.z=-0.12; g.add(t2);
    const pin=cyl(0.03,0.03,0.06,IRON,5); pin.rotation.x=Math.PI/2; pin.position.set(0,1.12,0.06); g.add(pin);

    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.position.set(x, gy(x,z), z); g.rotation.y = rot||0;
    g.userData={kind:'prop', label:'Tool rack'};
    scene.add(g);
    addRectCollider(x, z, (rot? 0.14:0.56), (rot? 0.56:0.14));
    return g;
  }

  /* ---- INGOT / ORE PILE: a small stack of bars + a couple of raw ore chunks ---- */
  function makeMetalPile(x, z){
    const g = new THREE.Group();
    const barCols=[0x8a8f96, 0xb87333, 0xc9a85a];  // steel, copper, gold-ish bars
    // stacked bars
    let yy=0.05;
    for(let i=0;i<4;i++){
      const c=barCols[i%barCols.length];
      const bar=box(0.34,0.09,0.15,c);
      bar.position.set((Math.random()-.5)*0.1, yy, (Math.random()-.5)*0.1);
      bar.rotation.y=(Math.random()-.5)*0.3; g.add(bar);
      yy+=0.09;
    }
    // a couple of raw ore rocks beside the bars
    for(let i=0;i<2;i++){
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(0.16+Math.random()*0.06,0), mat(0x574f47));
      rock.position.set(0.35+i*0.28, 0.13, 0.1); rock.rotation.set(Math.random(),Math.random(),Math.random());
      g.add(rock);
      // ore fleck
      const fleck=new THREE.Mesh(new THREE.IcosahedronGeometry(0.05,0),
        new THREE.MeshBasicMaterial({color:0xd6a24a}));
      fleck.position.copy(rock.position); fleck.position.y+=0.08; g.add(fleck);
    }
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.position.set(x, gy(x,z), z);
    g.userData={kind:'prop', label:'Ingots & ore'};
    scene.add(g);
    return g;   // low pile: no collider, walk over freely
  }

  /* --------------------------- placement --------------------------- */
  let placed = false;
  function place(){
    if(placed) return true;
    if(typeof scene==='undefined' || typeof WORLD==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;      // world built + loop live
    if(typeof gy!=='function' || typeof mat!=='function' ||
       typeof collides!=='function' || typeof addRectCollider!=='function' ||
       typeof addCircleCollider!=='function') return false;

    // The cinder yard SE of the Stonereach Smithy (13,11); furnace already at (17.5,14).
    // Each solid piece guards collides() so it never lands on the building or furnace.
    const put = (fn, px, pz, rot, pad)=>{
      if(collides(px, pz, pad===undefined?0.5:pad)){
        if(typeof console!=='undefined') console.warn('[prop_smithy] skipped (blocked):', fn.name, px, pz);
        return;
      }
      fn(px, pz, rot);
    };

    put(makeForge,        13.0, 15.2, 0);            // coal forge, hood venting north-away
    put(makeAnvil,        14.9, 15.4, -Math.PI/2);   // horn toward the forge
    makeBellows(          13.0, 16.2, Math.PI);      // low prop; behind the forge, nozzle at it
    put(makeQuenchTrough, 16.6, 15.9, 0);            // quench barrel/trough by the furnace
    put(makeToolRack,     12.2, 16.4, 0);            // hammers & tongs on the rack
    makeMetalPile(        15.6, 16.4);               // ingots + ore, no collider
    makeMetalPile(        14.0, 16.8);

    placed = true;
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[PROPS] The Stonereach smithy yard heats up — forge coals glow, the anvil waits.','sys');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(place()) clearInterval(iv); }
    catch(e){ console.error('[prop_smithy]', e); clearInterval(iv); } }, 2000);
})();
