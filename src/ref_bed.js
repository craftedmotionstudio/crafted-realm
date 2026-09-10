/* ============================================================================
 * ref_bed.js  —  OSRS-style cottage bed  (self-contained, global-script r128)
 * ----------------------------------------------------------------------------
 * window.makeRefBed(x=0, z=0, rot=0) -> THREE.Group
 *
 * Recreated from Bible_References/Beds+Torches.jpg (the BED; torches ignored):
 *   - warm-wood frame on four turned corner posts with little finial caps
 *   - a tall PLANKED HEADBOARD (vertical boards + top rail + centre crest) and
 *     a matching lower FOOTBOARD
 *   - pale under-sheet mattress with a warm russet-brown blanket over the lower
 *     two-thirds and a pale turned-down cuff (matches the ref's brown bedspread)
 *   - two plump off-white pillows at the head (ref's white pillow)
 *   - a folded CONTRAST QUILT (muted teal + cream trim) stacked at the foot
 *
 * Flat-shaded low-poly OSRS look; reads clearly from the overhead camera.
 * Author-fresh geometry. Edits ONLY this file.
 * ==========================================================================*/
(function(){
  if(typeof THREE==='undefined'){ console.warn('[ref_bed] THREE missing'); return; }

  // --- material guard: reuse the world's OSRS mat() when present ------------
  const M=(c)=> typeof mat==='function'
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // warm cottage palette, tuned to sit with the town's wood props
  const C = {
    postW  : 0x53381f,  // corner posts (darkest oak, in shadow)
    plank  : 0x5f4128,  // head/foot board boards
    frame  : 0x7a5433,  // rails + top rails (lighter, waxed)
    cap    : 0x8a6141,  // post finial caps
    sheet  : 0xe7e0cf,  // pale under-sheet / mattress
    cuff   : 0xf1ead9,  // brighter turned-down cuff
    blanket: 0x9c5a2c,  // warm russet-brown bedspread (matches ref)
    pillow : 0xf3eee2,  // off-white pillow
    quilt  : 0x35706a,  // contrast folded quilt (muted teal)
    quiltT : 0xd8c98f   // cream trim band on the quilt fold
  };

  // merge helper — collapse many small boxes into ONE mesh when the util is
  // present, else fall back to a light sub-group (still one material).
  function mergeBoxes(specs, material){
    const geoms = specs.map(s=>{
      const g=new THREE.BoxGeometry(s.w, s.h, s.d);
      g.translate(s.x, s.y, s.z);
      return g;
    });
    const U = THREE.BufferGeometryUtils;
    if(U && U.mergeBufferGeometries){
      const merged = U.mergeBufferGeometries(geoms, false);
      geoms.forEach(g=>g.dispose && g.dispose());
      return new THREE.Mesh(merged, material);
    }
    const grp=new THREE.Group();
    geoms.forEach(g=>grp.add(new THREE.Mesh(g, material)));
    return grp;
  }
  function box(w,h,d,c){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); }
  function at(m,x,y,z){ m.position.set(x,y,z); return m; }

  window.makeRefBed = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    // ---- footprint constants (1 unit = 1 tile) -----------------------------
    const L = 2.15, W = 1.06;          // length (+z) x width (+x); head at -z
    const legH   = 0.34;               // frame / rail top height
    const postT  = 0.15;               // post thickness
    const xPost  = W/2 - postT/2;      // post centre inset
    const zHead  = -(L/2 - postT/2);   // head end (-z)
    const zFoot  =  (L/2 - postT/2);   // foot end (+z)
    const hPostH = 0.92;               // tall head posts
    const fPostH = 0.52;               // short foot posts
    const surfY  = legH + 0.18;        // top of the mattress

    // =====================================================================
    // 1. WOOD FRAME — posts (dark) + rails/boards (mid) as two merged meshes
    // =====================================================================
    const postSpecs = [], plankSpecs = [], frameSpecs = [];

    // four corner posts (tall at head, short at foot)
    postSpecs.push({w:postT,h:hPostH,d:postT, x:-xPost,y:hPostH/2,z:zHead});
    postSpecs.push({w:postT,h:hPostH,d:postT, x: xPost,y:hPostH/2,z:zHead});
    postSpecs.push({w:postT,h:fPostH,d:postT, x:-xPost,y:fPostH/2,z:zFoot});
    postSpecs.push({w:postT,h:fPostH,d:postT, x: xPost,y:fPostH/2,z:zFoot});

    // side rails + end rails carrying the mattress
    const railY = legH - 0.05;
    frameSpecs.push({w:0.09,h:0.16,d:L-0.12, x:-(W/2-0.05),y:railY,z:0});
    frameSpecs.push({w:0.09,h:0.16,d:L-0.12, x: (W/2-0.05),y:railY,z:0});
    frameSpecs.push({w:W-0.14,h:0.14,d:0.09, x:0,y:railY,z:zHead});
    frameSpecs.push({w:W-0.14,h:0.14,d:0.09, x:0,y:railY,z:zFoot});

    // HEADBOARD: vertical boards + capping top rail + centre crest
    const hbZ = zHead;
    for(const bx of [-0.32,-0.11,0.11,0.32]){
      plankSpecs.push({w:0.17,h:0.50,d:0.055, x:bx,y:legH+0.27,z:hbZ});
    }
    frameSpecs.push({w:W+0.04,h:0.12,d:0.11, x:0,y:legH+0.56,z:hbZ});          // top rail
    frameSpecs.push({w:0.34,h:0.12,d:0.12,   x:0,y:legH+0.66,z:hbZ});          // centre crest

    // FOOTBOARD: capping rail + short boards
    const fbZ = zFoot;
    frameSpecs.push({w:W+0.04,h:0.13,d:0.11, x:0,y:legH+0.14,z:fbZ});          // top rail
    for(const bx of [-0.28,0,0.28]){
      plankSpecs.push({w:0.20,h:0.18,d:0.055, x:bx,y:legH+0.02,z:fbZ});
    }

    g.add(mergeBoxes(postSpecs,  M(C.postW)));
    g.add(mergeBoxes(plankSpecs, M(C.plank)));
    g.add(mergeBoxes(frameSpecs, M(C.frame)));

    // pyramid finial caps on each post top (4 little cones)
    for(const [px,pz,ph] of [[-xPost,zHead,hPostH],[xPost,zHead,hPostH],
                             [-xPost,zFoot,fPostH],[xPost,zFoot,fPostH]]){
      const cap=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.14,4), M(C.cap));
      cap.rotation.y=Math.PI/4; cap.position.set(px, ph+0.07, pz); g.add(cap);
    }

    // =====================================================================
    // 2. BEDDING — sheet + russet blanket + cuff + pillows + contrast quilt
    // =====================================================================
    // pale under-sheet / mattress
    const matt = at(box(W-0.08, 0.18, L-0.10, C.sheet), 0, legH+0.09, 0);
    matt.receiveShadow=true; g.add(matt);

    // warm russet blanket over the lower two-thirds (foot side +z)
    g.add(at(box(W-0.02, 0.14, L*0.60, C.blanket), 0, surfY+0.05, L*0.16));
    // turned-down cuff at the blanket's head edge (pale fold)
    g.add(at(box(W-0.02, 0.07, 0.16, C.cuff), 0, surfY+0.10, -L*0.14));

    // two plump off-white pillows at the head (-z), slightly tilted back
    for(const px of [-0.24, 0.24]){
      const pil = at(box(0.42, 0.15, 0.46, C.pillow), px, surfY+0.09, -(L/2-0.42));
      pil.rotation.x = -0.10; g.add(pil);
    }

    // folded CONTRAST quilt stacked at the foot (+z) with a cream trim band
    const qY = surfY + 0.12, qZ = L*0.34;
    g.add(at(box(W-0.06, 0.12, 0.42, C.quilt),  0, qY,      qZ));
    g.add(at(box(W-0.06, 0.09, 0.30, C.quilt),  0, qY+0.10, qZ+0.02)); // second fold on top
    g.add(at(box(W-0.04, 0.035,0.10, C.quiltT), 0, qY+0.02, qZ-0.19)); // trim stripe on the drape

    // =====================================================================
    // shadows, placement, world integration
    // =====================================================================
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = { kind:'prop', label:'Bed',
                   examine:'A snug cottage bed — someone slept here recently.' };

    if(typeof scene!=='undefined' && scene && scene.add) scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD){
      if(WORLD.clickables) WORLD.clickables.push(g);
      if(WORLD.colliders){
        // respect rotation: swap extents for E/W orientations
        const sideways = Math.abs((rot%Math.PI)) > 0.6;
        const hw = sideways ? L/2 : W/2;
        const hd = sideways ? W/2 : L/2;
        if(typeof addRectCollider==='function') addRectCollider(x, z, hw, hd);
        else WORLD.colliders.push({type:'rect', x, z, hw, hd});
      }
    }
    return g;
  };

  console.log('[ref_bed] makeRefBed ready');
})();
