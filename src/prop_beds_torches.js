/* ============ BEDS + WALL TORCHES (prop pack) ============
 * Reference: Bible_References/Beds+Torches.jpg — OSRS cottage beds (wood frame,
 * warm brown blanket, white pillow) and WALL-MOUNTED torches (bracket + cup + a
 * flickering flame). Cozy 2007/OSRS, low-poly flat-shaded.
 *
 * Self-booting IIFE (pattern: src/wardenholm.js). Owns ONLY this file. Reuses the
 * global world helpers left in game2_world.js — mat(), gy(), addRectCollider(),
 * scene, WORLD — and the ENGINE FLAME IDIOM: push a group to WORLD.fires with a
 * userData.flame node, and game5_main.js's loop flickers it via
 *   f.userData.flame.scale.y = 1 + Math.sin(performance.now()*0.02)*0.25
 * (same line that drives makeTorch/makeCampfire). No new animation system.
 */
(function(){

  /* ---- a cottage bed: wood frame + mattress + warm blanket + white pillow ----
     Built along +z (length) / +x (width); head (pillow) at -z. Seats on gy(). */
  function makeBed(x, z, rot){
    const g = new THREE.Group();
    const wood   = mat(0x6b4a2f);   // dark stained pine frame
    const wood2  = mat(0x7d5734);   // slightly lighter rails
    const sheet  = mat(0xe6e0d2);   // pale mattress/undersheet
    const blanket= mat(0xa15c2e);   // warm russet-brown blanket (matches ref)
    const pillow = mat(0xefe9dc);   // off-white pillow
    const L = 2.05, W = 1.0, legH = 0.34;

    // four corner legs
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14,legH,0.14), wood);
      leg.position.set(sx*(W/2-0.09), legH/2, sz*(L/2-0.09));
      leg.castShadow=true; g.add(leg);
    }
    // side + end rails
    const railY = legH-0.02;
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.16,L), wood2);
    railL.position.set(-(W/2-0.05), railY, 0); railL.castShadow=true; g.add(railL);
    const railR = railL.clone(); railR.position.x = (W/2-0.05); g.add(railR);
    // mattress base
    const matt = new THREE.Mesh(new THREE.BoxGeometry(W-0.06, 0.16, L-0.06), sheet);
    matt.position.set(0, legH+0.09, 0); matt.castShadow=true; matt.receiveShadow=true; g.add(matt);
    // blanket over the lower ~2/3 (foot end = +z)
    const bl = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, L*0.66), blanket);
    bl.position.set(0, legH+0.19, L*0.15); bl.castShadow=true; g.add(bl);
    // turn-down cuff at the blanket's head edge
    const cuff = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 0.16), sheet);
    cuff.position.set(0, legH+0.24, -L*0.18); g.add(cuff);
    // pillow at the head (-z)
    const pl = new THREE.Mesh(new THREE.BoxGeometry(W-0.22, 0.14, 0.5), pillow);
    pl.position.set(0, legH+0.22, -(L/2-0.4)); pl.castShadow=true; g.add(pl);
    // headboard + footboard
    const hb = new THREE.Mesh(new THREE.BoxGeometry(W+0.06, 0.5, 0.12), wood);
    hb.position.set(0, legH+0.2, -(L/2+0.02)); hb.castShadow=true; g.add(hb);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(W+0.06, 0.3, 0.12), wood);
    fb.position.set(0, legH+0.1, (L/2+0.02)); fb.castShadow=true; g.add(fb);

    g.position.set(x, gy(x,z), z);
    g.rotation.y = rot||0;
    g.userData = {kind:'prop', label:'Bed', examine:'A snug cottage bed — someone slept here recently.'};
    scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD.clickables) WORLD.clickables.push(g);
    // collider footprint (respect rotation: swap extents for the E/W orientations)
    const rr = ((rot||0)%Math.PI);
    const sideways = Math.abs(rr) > 0.6;
    if(sideways) addRectCollider(x, z, L/2, W/2);
    else         addRectCollider(x, z, W/2, L/2);
    return g;
  }

  /* ---- a WALL-mounted torch: back-plate + angled bracket + iron cup + FLAME ----
     Placed at an absolute (x,y,z) on a wall face. Default reaches out toward +z;
     rot yaws it to the wall it hangs on. Flame flickers via the WORLD.fires loop. */
  function makeWallTorch(x, y, z, rot){
    const g = new THREE.Group();
    const iron = mat(0x2c2622);
    const wood = mat(0x4a3420);
    // back-plate flush to the wall
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.42,0.07), wood);
    plate.castShadow=true; g.add(plate);
    // angled bracket arm reaching up-and-out
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,0.55,5), iron);
    arm.position.set(0,0.14,0.17); arm.rotation.x=-0.7; arm.castShadow=true; g.add(arm);
    // iron holder cup at the arm's tip
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.06,0.17,6), iron);
    cup.position.set(0,0.33,0.33); cup.castShadow=true; g.add(cup);

    // flame: two nested cones (outer ember, inner bright) — a GROUP so the engine
    // flame loop can scale.y it and it flickers, cones and all.
    const flame = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.36,6),
      new THREE.MeshBasicMaterial({color:0xff8a2e}));
    outer.position.y=0.18; flame.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.22,6),
      new THREE.MeshBasicMaterial({color:0xffe07a}));
    inner.position.y=0.14; flame.add(inner);
    flame.position.set(0,0.42,0.33); g.add(flame);
    g.userData.flame = flame;                 // <-- the idiom game5_main.js flickers

    g.position.set(x,y,z);
    g.rotation.y = rot||0;
    scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD.fires) WORLD.fires.push(g);
    // warm point light, offset out along the bracket in world space
    const lx = x + Math.sin(rot||0)*0.33, lz = z + Math.cos(rot||0)*0.33;
    const light = new THREE.PointLight(0xff9c4a, 0.5, 6.5);
    light.position.set(lx, y+0.55, lz); scene.add(light);
    return g;
  }

  /* --------------------------- placement --------------------------- */
  let placed = false;
  function place(){
    if(placed) return true;
    if(typeof scene==='undefined' || typeof WORLD==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;      // world built + loop live
    if(typeof gy!=='function' || typeof mat!=='function' || typeof addRectCollider!=='function') return false;

    const OUT_X=Math.PI/2, OUT_NX=-Math.PI/2, OUT_Z=0, OUT_NZ=Math.PI;

    // --- beds inside a few Commons homes (coords from makeBuilding calls) ---
    // the Hearthhouse inn (18,18) 4.5x4, door 'W' → two beds against the east wall
    makeBed(18.3, 17.4, 0);
    makeBed(18.3, 18.6, 0);
    // west cottage row (-19,-14) 4x3.6, door 'E' → one bed head-to-north wall
    makeBed(-19.4, -14.0, 0);
    // east cottage row (20,-14) 4x3.6, door 'W' → one bed
    makeBed(20.4, -14.0, 0);

    // --- wall torches ---
    const H = 1.85;                     // mount height up the wall
    const yAt=(x,z)=>gy(x,z)+H;
    // Hearthhouse: flank the west door (wall face x≈15.75)
    makeWallTorch(15.66, yAt(15.66,17.0), 17.0, OUT_NX);
    makeWallTorch(15.66, yAt(15.66,19.0), 19.0, OUT_NX);
    // Hearthhouse interior: two torches on the east wall over the beds (face inward -x)
    makeWallTorch(20.06, yAt(20.06,17.2), 17.2, OUT_X);
    makeWallTorch(20.06, yAt(20.06,18.8), 18.8, OUT_X);
    // The Tipsy Grub tavern (-13,2) 5x4.5, door 'E' → flank the east door (face +x)
    makeWallTorch(-10.42, yAt(-10.42,1.0), 1.0, OUT_X);
    makeWallTorch(-10.42, yAt(-10.42,3.0), 3.0, OUT_X);
    // Stonereach Smithy (9,12) 5x4.5, door 'N' → flank the north door (face -z)
    makeWallTorch(7.8, yAt(7.8,9.66), 9.66, OUT_NZ);
    makeWallTorch(10.2, yAt(10.2,9.66), 9.66, OUT_NZ);

    placed = true;
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[PROPS] Beds warm the cottages; wall torches gutter by the doorways.','sys');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(place()) clearInterval(iv); }
    catch(e){ console.error('[prop_beds_torches]', e); clearInterval(iv); } }, 2000);
})();
