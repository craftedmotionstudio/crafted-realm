/* ============ prop_fallen_tree — deadfall logs for the deep woods ============
 * Reference: Bible_References/Fallen_Tree.png — a toppled OSRS log: a chunky
 * tapering horizontal trunk, an exposed splayed root stump at one end (jagged
 * upward root spikes), broken snapped branch stubs, forked twigs at the far tip,
 * warm faceted bark. We add the optional cozy layer the ref doesn't show: a few
 * moss patches and tiny mushrooms riding the top of damp logs.
 *
 * Self-booting IIFE (same discipline as world_evil_tree.js / world_scatter.js).
 * Owns a NEW file only — never edits game2_world.js et al. Depends on globals:
 * THREE, scene, mat(), groundY(), gy(), collides(), addCircleCollider(), WORLD,
 * ZONES, running, UI. Loaded AFTER world_scatter.js so mat()/gy()/colliders exist.
 */
(function(){
  let built=false;

  // ---- one procedural low-poly fallen log, seated + collidered on the ground ----
  // pal: {bark, barkDark, root, moss} ; mossy: place moss+mushrooms on the top
  function makeFallenLog(x, z, rot, pal, mossy){
    const y = groundY(x,z); if(y===null) return false;
    const g = new THREE.Group();

    const L    = 4.6 + Math.random()*2.2;          // trunk length
    const rRt  = 0.46 + Math.random()*0.12;        // fat root end
    const rTip = rRt*0.55;                          // tapered snapped tip
    const barkMat  = mat(pal.bark);
    const darkMat  = mat(pal.barkDark);
    const rootMat  = mat(pal.root);

    // --- main trunk: faceted cylinder laid along local +X (root at -X, tip at +X)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(rTip, rRt, L, 8, 1), barkMat);
    trunk.rotation.z = -Math.PI/2;                  // top(+Y)->+X so tip sits at +X
    trunk.castShadow = true; trunk.receiveShadow = true;
    g.add(trunk);

    // a slight kink: a second short faceted segment past the tip, angled down
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTip*0.7, rTip, L*0.28, 7, 1), barkMat);
    seg.rotation.z = -Math.PI/2; seg.rotation.y = 0.35;
    seg.position.set(L*0.5 + L*0.13, -0.06, L*0.13*0.34);
    seg.castShadow = true; g.add(seg);

    // --- exposed root stump at -X: a squashed faceted ball + splayed upward spikes
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(rRt*1.35, 0), rootMat);
    ball.scale.set(0.7, 1.15, 1.15);                // flat disc facing along the log
    ball.position.set(-L*0.5 - rRt*0.35, 0.05, 0);
    ball.castShadow = true; g.add(ball);
    const spikeN = 4 + Math.floor(Math.random()*3);
    for(let i=0;i<spikeN;i++){
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.55+Math.random()*0.45, 5), rootMat);
      const a = (i/spikeN)*Math.PI*2 + Math.random()*0.5;
      sp.position.set(-L*0.5 - rRt*0.35 + (Math.random()-0.5)*0.2,
                      0.28+Math.random()*0.35,
                      Math.cos(a)*rRt*0.8);
      sp.rotation.z = Math.cos(a)*0.5;              // fan them up-and-out
      sp.rotation.x = -Math.sin(a)*0.6;
      sp.castShadow = true; g.add(sp);
    }
    // a couple of low ground-roots creeping forward from the stump
    for(const s of [-1,1]){
      const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.13,0.9,5), rootMat);
      gr.rotation.z = -Math.PI/2; gr.rotation.y = s*0.6;
      gr.position.set(-L*0.5+0.2, -rRt*0.55, s*0.28); g.add(gr);
    }

    // --- broken branch stubs along the trunk (short tapered snaps)
    const stubN = 2 + Math.floor(Math.random()*2);
    for(let i=0;i<stubN;i++){
      const along = (-0.2 + Math.random()*0.7)*L;   // sit on the mid/far part
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.13,0.55+Math.random()*0.4,5), darkMat);
      const yaw = Math.random()*Math.PI*2;
      st.position.set(along, rRt*0.4, 0);
      st.rotation.z = -0.7 - Math.random()*0.5;
      st.rotation.y = yaw;
      st.castShadow = true; g.add(st);
    }

    // --- forked snapped twigs bursting from the tip (the ref's branchy far end)
    const tipX = L*0.5 + L*0.26;
    const forkN = 3 + Math.floor(Math.random()*3);
    for(let i=0;i<forkN;i++){
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.07,0.6+Math.random()*0.6,4), darkMat);
      const a = (i/forkN)*2.2 - 1.1;
      tw.position.set(tipX + Math.cos(a)*0.25, -0.05 + Math.sin(a)*0.35, Math.sin(a*1.7)*0.3);
      tw.rotation.z = -Math.PI/2 + a*0.7;
      tw.rotation.y = a*1.2;
      g.add(tw);
    }

    // --- optional cozy layer: moss patches + tiny mushrooms riding the top
    if(mossy){
      const mossMat = mat(pal.moss);
      const patchN = 3 + Math.floor(Math.random()*3);
      for(let i=0;i<patchN;i++){
        const along = (-0.35 + Math.random()*0.85)*L;
        const rHere = rRt + (rTip-rRt)*((along+L*0.5)/L);   // taper-aware radius
        const mo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16+Math.random()*0.12,0), mossMat);
        mo.scale.set(1.1,0.4,0.9);
        mo.position.set(along, Math.max(0.12,rHere)*0.85, (Math.random()-0.5)*0.2);
        g.add(mo);
      }
      // a little mushroom cluster on top — mirrors world_scatter's makeMushroom look
      const shN = 1 + Math.floor(Math.random()*2);
      for(let i=0;i<shN;i++){
        const along = (-0.15 + Math.random()*0.55)*L;
        const rHere = rRt + (rTip-rRt)*((along+L*0.5)/L);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.045,0.14,5), mat(0xd8ccb4));
        stem.position.set(along, Math.max(0.12,rHere)*0.85+0.07, (Math.random()-0.5)*0.25);
        g.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4,0,6.3,0,1.4), mat(0xa83838));
        cap.position.set(stem.position.x, stem.position.y+0.07, stem.position.z);
        g.add(cap);
      }
    }

    // seat: half-sunk into the ground so it reads settled, not floating
    g.position.set(x, y + rRt*0.6, z);
    g.rotation.y = rot;
    scene.add(g);

    // --- collider: a line of circles down the trunk so it blocks like a solid log.
    // local X maps to world by g.rotation.y (Three.js Y-rot: wx=lx*cos, wz=-lx*sin)
    if(typeof addCircleCollider==='function'){
      const c=Math.cos(rot), s=Math.sin(rot);
      for(let t=-1;t<=1;t++){
        const lx=t*L*0.42;
        addCircleCollider(x + lx*c, z - lx*s, 0.5);
      }
    }
    return true;
  }

  // scatter a handful around a zone anchor, guarding collides + solid footing
  function scatter(pos, spanX, spanZ, count, minY, pal, mossy){
    let placed=0;
    for(let i=0;i<count*14 && placed<count;i++){
      const x = pos[0] + (Math.random()-0.5)*spanX;
      const z = pos[1] + (Math.random()-0.5)*spanZ;
      const y = groundY(x,z);
      if(y===null || y<minY) continue;
      if(typeof collides==='function' && collides(x,z,1.6)) continue;
      if(makeFallenLog(x, z, Math.random()*Math.PI*2, pal, mossy)) placed++;
    }
    return placed;
  }

  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof mat!=='function') return false;
    if(typeof ZONES==='undefined' || !ZONES.emberwood) return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    built=true;

    let n=0;
    // Emberwood deep woods — warm healthy deadfall, mossy & mushroomed
    n += scatter(ZONES.emberwood.pos, 70, 46, 5, -50,
      {bark:0x6e4a2c, barkDark:0x5a3c24, root:0x63432a, moss:0x4a7a34}, true);
    // Gloomfen — damp rotting logs, dark green moss, sit above the pools
    n += scatter(ZONES.gloomfen.pos, 80, 70, 5, -0.55,
      {bark:0x5c4832, barkDark:0x483826, root:0x53412d, moss:0x3c5a30}, true);
    // The Scarlands — charred, ashy deadfall, no fresh moss
    n += scatter(ZONES.scarlands.pos, 70, 60, 4, -50,
      {bark:0x4d3626, barkDark:0x3a281c, root:0x45301f, moss:0x5a5048}, false);

    if(typeof UI!=='undefined' && UI.chat && n>0)
      UI.chat('[MAP] Toppled trunks and root-torn stumps litter the deep woods.','sys');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[prop_fallen_tree]', e); clearInterval(iv); } }, 1800);
})();
