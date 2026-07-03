/* ============ prop_buggy — the wooden handcart / buggy ============
 * Reference: Bible_References/Buggy.jpg (the cart in the background of Character.jpg).
 * A low-poly flat-shaded pull-cart: an open planked box bed on two spoked wheels,
 * with two long angled pull-shafts meeting in rounded knob feet at the front.
 * Self-booting IIFE (like world_scatter.js / saltreach.js): polls until the world
 * is built, then parks a few carts where carts belong — the Commons market, by the
 * general store, the Saltreach dock, and Olun's Mill farm track. Owns ONE new file;
 * touches nothing else. Deps stay global: mat(), gy()/groundY(), collides(),
 * addCircleCollider(), scene, THREE.
 *
 * REFERENCE INVENTORY (Buggy.jpg) — every object, and where it lives here:
 *   - open planked box bed (floor + 4 walls, open top) ....... bed(): floor + plank walls
 *   - two big low-poly SPOKED wheels (wood rim, iron hub/spokes) .. wheel(): rim+hub+spokes
 *   - axle connecting the wheels under the bed .................. axle cylinder
 *   - two long curved PULL-SHAFTS reaching forward ............. shaft cylinders
 *   - rounded knob FEET where the shafts rest on the ground ..... knob spheres at shaft tips
 *   - (no load in this ref) optional sacks/crate as a small load  opts.load
 */
function makeBuggy(x, z, rot, opts){
  opts = opts || {};
  const WOOD      = 0x9a7f4c;   // warm tan planking (matches the khaki-wood of the ref)
  const WOOD_DK   = 0x6e5836;   // darker trim / rails / axle
  const WOOD_RIM  = 0x836b3f;   // the wheel rims — a shade browner than the bed
  const IRON      = 0x4a4640;   // hub + spokes, dark forged iron
  const g = new THREE.Group();

  /* ---- the wheels: low-poly faceted rim + iron hub + spokes ---- */
  function wheel(px){
    const w = new THREE.Group();
    const R = 0.56;
    // rim — a thin 10-sided cylinder, laid so its round face points along X (cart width)
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.14, 10), mat(WOOD_RIM));
    rim.rotation.z = Math.PI/2; rim.castShadow = true; w.add(rim);
    // inner rim ring, slightly recessed & darker, to read the tyre band
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R*0.82, R*0.82, 0.16, 10), mat(WOOD_DK));
    band.rotation.z = Math.PI/2; w.add(band);
    // hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 6), mat(IRON));
    hub.rotation.z = Math.PI/2; w.add(hub);
    // spokes — six thin bars radiating from the hub
    for(let i=0;i<6;i++){
      const a = i*Math.PI/3;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, R*0.9, 0.05), mat(IRON));
      sp.position.set(0, Math.cos(a)*R*0.45, Math.sin(a)*R*0.45);
      sp.rotation.x = a;
      w.add(sp);
    }
    w.position.set(px, R, -0.05);   // seated so the wheel rests on the ground; slightly aft
    return w;
  }
  g.add(wheel(-0.72));
  g.add(wheel( 0.72));

  // axle through the hubs
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), mat(IRON));
  axle.rotation.z = Math.PI/2; axle.position.set(0, 0.56, -0.05); g.add(axle);

  /* ---- the bed: an open planked box sitting above the axle ---- */
  const bedY = 0.72, bedL = 1.9, bedW = 1.12, bedH = 0.64;
  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.1, bedL), mat(WOOD_DK));
  floor.position.set(0, bedY, 0); floor.castShadow = true; g.add(floor);
  // vertical planks make up each long side (a few boxes with hair gaps = the OSRS plank read)
  function plankWall(len, alongZ){
    const wall = new THREE.Group();
    const n = alongZ ? 6 : 4;
    const step = len / n;
    for(let i=0;i<n;i++){
      const pk = new THREE.Mesh(new THREE.BoxGeometry(step*0.86, bedH, 0.09),
        mat(i%2 ? WOOD : WOOD_RIM));   // alternate tint = plank-to-plank variation
      pk.position.set(-len/2 + step*(i+0.5), 0, 0);
      pk.castShadow = true; wall.add(pk);
    }
    // top rail cap
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.14), mat(WOOD_DK));
    rail.position.set(0, bedH/2, 0); wall.add(rail);
    return wall;
  }
  const left  = plankWall(bedL, true); left.position.set(-bedW/2, bedY + bedH/2, 0);
  left.rotation.y =  Math.PI/2; g.add(left);
  const right = plankWall(bedL, true); right.position.set( bedW/2, bedY + bedH/2, 0);
  right.rotation.y = Math.PI/2; g.add(right);
  const front = plankWall(bedW, false); front.position.set(0, bedY + bedH/2,  bedL/2); g.add(front);
  const back  = plankWall(bedW, false); back.position.set(0, bedY + bedH/2, -bedL/2); g.add(back);

  /* ---- the two pull-shafts, angling forward & down to knob feet ---- */
  for(const s of [-1, 1]){
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.7, 6), mat(WOOD_RIM));
    // from under the bed front (z≈+0.9) reaching forward to z≈+2.0, dipping to the ground
    shaft.position.set(s*0.4, 0.5, 1.45);
    shaft.rotation.x = Math.PI/2 - 0.42;    // tilt so the far end drops toward the earth
    shaft.castShadow = true; g.add(shaft);
    // rounded knob foot at the tip (the ref's ball-ends resting on the grass)
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(WOOD_DK));
    knob.position.set(s*0.4, 0.18, 2.18); g.add(knob);
  }
  // a low cross-brace tying the shafts together (stops them reading as loose sticks)
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), mat(WOOD_DK));
  brace.position.set(0, 0.36, 1.85); g.add(brace);

  /* ---- optional small load: sacks or a crate riding in the bed ---- */
  if(opts.load === 'sacks'){
    const sackCol = [0xcdBd94, 0xc2b184, 0xd4c6a0];
    for(let i=0;i<3;i++){
      const sk = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), mat(sackCol[i%3]));
      sk.scale.set(1, 0.9, 1.15);
      sk.position.set((i-1)*0.34, bedY + 0.28, (i%2?0.3:-0.3));
      sk.castShadow = true; g.add(sk);
    }
  } else if(opts.load === 'crate'){
    const cr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), mat(WOOD_DK));
    cr.position.set(0, bedY + 0.33, -0.15); cr.castShadow = true; g.add(cr);
    // plank banding on the crate
    for(const yy of [-0.15, 0.15]){
      const bnd = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.74), mat(WOOD_RIM));
      bnd.position.set(0, bedY + 0.33 + yy, -0.15); g.add(bnd);
    }
  }

  g.position.set(x, (typeof gy==='function' ? gy(x,z) : 0), z);
  g.rotation.y = rot || 0;
  g.traverse(o=>{ if(o.isMesh){ o.receiveShadow = true; } });
  scene.add(g);
  // collide against the cart body (skip the shafts, which lie on open ground)
  if(typeof addCircleCollider==='function') addCircleCollider(x, z, 0.95);
  return g;
}

(function(){
  // candidate carts: each where a handcart honestly belongs. Probed for solid, clear
  // ground; anything blocked or off the map is simply skipped (never overlaps a build).
  const CARTS = [
    // --- Veyhollow Commons: the market row, between the stalls and the bank ---
    {x:2.6,  z:-13.4, rot: 2.5,  load:'crate'},
    // --- Commons: parked in front of the general store (door faces east) ---
    {x:-7.2, z:-15.2, rot: 0.6,  load:'sacks'},
    // --- Saltreach Port: dockside by the pier head, ready to load the boats ---
    {x:224.6, z:51.2, rot:-1.9,  load:'crate'},
    // --- Olun's Mill: the farm track beside the fenced wheat rows (harvest sacks) ---
    {x:-61.5, z:45.5, rot: 1.2,  load:'sacks'},
  ];
  function place(){
    if(typeof scene==='undefined' || typeof THREE==='undefined') return false;
    if(typeof mat!=='function' || typeof groundY!=='function') return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    let placed = 0;
    for(const c of CARTS){
      // ground must exist and be dry land (not sea/ditch); site must be clear
      const y = groundY(c.x, c.z);
      if(y===null || y < -0.8) continue;
      if(typeof collides==='function' && collides(c.x, c.z, 1.0)) continue;
      makeBuggy(c.x, c.z, c.rot, {load:c.load});
      placed++;
    }
    if(placed && typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] Handcarts stand ready — at the market, the store, the dock, and the mill track.','sys');
    return true;   // one-shot: attempt all, then stop regardless of how many landed
  }
  const iv = setInterval(()=>{ try{ if(place()) clearInterval(iv); }
    catch(e){ console.error('[prop_buggy]', e); clearInterval(iv); } }, 2000);
})();
