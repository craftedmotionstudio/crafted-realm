/* ============================================================================
 * ref_bank.js  —  OSRS-style bank booth  (self-contained, global-script r128)
 * ----------------------------------------------------------------------------
 * window.makeRefBank(x=0, z=0, rot=0) -> THREE.Group
 *
 * Recreated from Bible_References/Bank.jpg + Bank_Option1.jpg:
 *   - polished warm-wood counter with a panelled, pilastered front
 *   - a booth frame: two turned wood posts on stone footings carrying a
 *     lintel + crown cornice ARCH over the counter
 *   - a teller window: two lattice-grille panes (green glass behind) flanking a
 *     central open teller gap with a pass-through shelf
 *   - gold trim band under the counter lip and along the frieze
 *   - counter accents: a stack of gold coins + an open ledger book
 *
 * Flat-shaded low-poly OSRS look. Edits ONLY this file. Author-fresh geometry.
 * ==========================================================================*/
(function(){
  if(typeof THREE==='undefined'){ console.warn('[ref_bank] THREE missing'); return; }

  // --- material guard: reuse the world's OSRS mat() when present ------------
  const M=(c)=> typeof mat==='function'
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // warm-wood + trim palette pulled to sit with the existing town props
  const C = {
    body   : 0x5f4128,  // counter carcass (dark oak)
    panel  : 0x4d331d,  // recessed front-panel insets (darker than carcass)
    lip    : 0xa87c4a,  // polished counter top (lighter, waxed sheen)
    frame  : 0x7a5433,  // lintel / window surrounds
    post   : 0x4a3120,  // booth posts (darkest wood, in shadow)
    crown  : 0x8a6141,  // cornice crown
    trim   : 0xc9a63a,  // muted brass trim line
    footing: 0x8a857a,  // stone post footings
    glass  : 0x2f6a3f,  // green teller-window glass (darkened so muntins contrast)
    lead   : 0x1a1109,  // dark leaded muntins across the green panes (darker + bolder)
    coin   : 0xe8c34a,  // gold coins
    ledger : 0x7a2020,  // ledger cover
    page   : 0xe9ddc2   // ledger pages
  };

  // merge helper — collapse many small box bars into ONE mesh when the util is
  // present, else fall back to a light sub-group (still one wood material).
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

  window.makeRefBank = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    // ---- footprint constants ------------------------------------------------
    const CW = 1.95, CH = 1.00, CD = 0.72;   // counter carcass
    const TOP_Y = CH + 0.10;                  // counter-top height (1.10)
    const POST_X = 1.03, POST_T = 0.16;       // booth posts
    const POST_H = 2.36;                       // post height
    const FRONT = -CD/2 - 0.01;                // customer-facing plane (−z)

    // =====================================================================
    // 1. COUNTER carcass + polished top + gold lip
    // =====================================================================
    g.add(at(box(CW, CH, CD, C.body), 0, CH/2, 0));
    // gold trim band tucked under the lip
    g.add(at(box(CW+0.10, 0.06, CD+0.06, C.trim), 0, CH-0.02, 0));
    // overhanging polished top slab
    g.add(at(box(CW+0.24, 0.12, CD+0.20, C.lip), 0, TOP_Y, 0));

    // ---- panelled + pilastered front (customer side, −z) -------------------
    // top & bottom rails
    g.add(at(box(CW-0.02, 0.12, 0.06, C.frame), 0, CH-0.14, FRONT));
    g.add(at(box(CW-0.02, 0.12, 0.06, C.frame), 0, 0.12,    FRONT));
    // three pilaster stiles split the front into two bays
    for(const px of [-CW/2+0.05, 0, CW/2-0.05]){
      g.add(at(box(0.10, CH-0.30, 0.07, C.frame), px, CH/2-0.02, FRONT));
    }
    // two raised panels with a slim gold inset
    for(const bx of [-CW/4, CW/4]){
      g.add(at(box(CW/2-0.30, CH-0.42, 0.05, C.panel), bx, CH/2-0.02, FRONT-0.02));
      g.add(at(box(CW/2-0.44, CH-0.56, 0.02, C.trim ), bx, CH/2-0.02, FRONT-0.05));
    }

    // =====================================================================
    // 2. BOOTH FRAME — posts on stone footings + lintel + crown (the arch)
    // =====================================================================
    for(const sx of [-POST_X, POST_X]){
      // stone footing
      g.add(at(box(POST_T+0.10, 0.34, CD*0.6, C.footing), sx, 0.17, -0.02));
      // wood post (darkest wood tone)
      g.add(at(box(POST_T, POST_H, POST_T, C.post), sx, POST_H/2, -0.02));
      // turned ring details banding the post (brass + wood collars)
      for(const [ry, rc, rr] of [[0.42, C.trim, 0.105], [0.50, C.crown, 0.11],
                                  [POST_H-0.52, C.crown, 0.11], [POST_H-0.44, C.trim, 0.105]]){
        const ring=new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.05, 8), M(rc));
        ring.position.set(sx, ry, -0.02); g.add(ring);
      }
      // corbel bracket where post meets lintel (little OSRS shoulder)
      const br = at(box(0.30, 0.10, 0.14, C.crown), sx - Math.sign(sx)*0.24, POST_H-0.18, -0.02);
      br.rotation.z = Math.sign(sx)*0.5; g.add(br);
    }
    // lintel beam spanning the posts
    g.add(at(box(2*POST_X+POST_T, 0.22, POST_T+0.06, C.frame), 0, POST_H-0.05, -0.02));
    // crown cornice (overhangs the lintel)
    g.add(at(box(2*POST_X+POST_T+0.16, 0.12, POST_T+0.20, C.crown), 0, POST_H+0.10, -0.02));
    // small central triangular pediment centred on the crown (flush + symmetric)
    const PED_R = 0.22;
    const pedCY = POST_H + 0.16 + 0.5*PED_R;            // triangle base sits flush on the crown top
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(PED_R, PED_R, 0.24, 3), M(C.crown));
    ped.rotation.x = -Math.PI/2;                        // 3-sided prism -> upright gable, apex up
    ped.position.set(0, pedCY, -0.02); g.add(ped);
    g.add(at(box(0.60, 0.03, POST_T+0.12, C.trim), 0, POST_H+0.17, -0.02)); // brass line across (base molding)
    const finial=new THREE.Mesh(new THREE.CylinderGeometry(0,0.06,0.14,6), M(C.trim));
    finial.position.set(0, pedCY + PED_R + 0.03, -0.02); g.add(finial);     // brass finial caps the apex
    // frieze / valance board under the lintel with a gold trim line
    g.add(at(box(2*POST_X-0.10, 0.18, 0.07, C.frame), 0, POST_H-0.30, FRONT+0.02));
    g.add(at(box(2*POST_X-0.30, 0.03, 0.02, C.trim ), 0, POST_H-0.30, FRONT-0.01));

    // =====================================================================
    // 3. TELLER WINDOW — two lattice panes flanking a central open gap
    // =====================================================================
    const WIN_BOT = TOP_Y + 0.10;         // 1.20
    const WIN_TOP = POST_H - 0.42;         // ~1.94
    const WIN_H   = WIN_TOP - WIN_BOT;
    const GAP_HW  = 0.34;                   // half-width of central teller gap
    const paneOuter = POST_X - POST_T*0.5 - 0.02;
    const paneCX    = (GAP_HW + paneOuter) / 2;
    const paneHW    = (paneOuter - GAP_HW) / 2;
    const barZ      = -0.02;

    const frameBars = [];   // wood surrounds -> C.frame
    const leadBars  = [];   // thin leaded muntins across the glass -> C.lead
    const midY = (WIN_TOP+WIN_BOT)/2;
    for(const sgn of [-1, 1]){
      const cx = sgn * paneCX;
      // pane frame (mullion box border)
      frameBars.push({w:paneHW*2+0.06, h:0.05, d:0.09, x:cx, y:WIN_TOP, z:barZ});
      frameBars.push({w:paneHW*2+0.06, h:0.05, d:0.09, x:cx, y:WIN_BOT, z:barZ});
      frameBars.push({w:0.05, h:WIN_H+0.05, d:0.09, x:cx-paneHW, y:midY, z:barZ});
      frameBars.push({w:0.05, h:WIN_H+0.05, d:0.09, x:cx+paneHW, y:midY, z:barZ});
      // green glass behind this pane
      g.add(at(box(paneHW*2, WIN_H, 0.03, C.glass), cx, midY, barZ+0.05));
      // dark leaded lattice ACROSS the green pane — vertical muntins
      const nV = 4;
      for(let i=1;i<=nV;i++){
        const px = cx - paneHW + (2*paneHW)*(i/(nV+1));
        leadBars.push({w:0.045, h:WIN_H, d:0.07, x:px, y:midY, z:barZ+0.06});
      }
      // horizontal muntins
      const nH = 4;
      for(let i=1;i<=nH;i++){
        const py = WIN_BOT + WIN_H*(i/(nH+1));
        leadBars.push({w:paneHW*2, h:0.045, d:0.07, x:cx, y:py, z:barZ+0.06});
      }
      // brass diamond accent centred in each pane (as in Bank.jpg)
      const dia = at(box(0.10, 0.10, 0.02, C.trim), cx, midY, barZ+0.085);
      dia.rotation.z = Math.PI*0.25; g.add(dia);
    }
    // central teller-gap surround: two inner jambs + a header + a pass shelf
    frameBars.push({w:0.06, h:WIN_H+0.05, d:0.10, x:-GAP_HW, y:midY, z:barZ});
    frameBars.push({w:0.06, h:WIN_H+0.05, d:0.10, x: GAP_HW, y:midY, z:barZ});
    frameBars.push({w:GAP_HW*2+0.10, h:0.07, d:0.12, x:0, y:WIN_TOP+0.02, z:barZ});
    g.add(mergeBoxes(frameBars, M(C.frame)));
    g.add(mergeBoxes(leadBars,  M(C.lead)));
    // pass-through shelf at the base of the teller gap
    g.add(at(box(GAP_HW*2, 0.06, 0.30, C.lip), 0, WIN_BOT+0.02, 0.02));

    // =====================================================================
    // 4. COUNTER ACCENTS — gold coin stack + open ledger book
    // =====================================================================
    const SURF = TOP_Y + 0.06;
    // coin stacks
    function coinStack(cx, cz, n){
      for(let i=0;i<n;i++){
        const c=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.022,10), M(C.coin));
        c.position.set(cx, SURF+i*0.022, cz); g.add(c);
      }
    }
    coinStack( 0.66, -0.02, 5);
    coinStack( 0.82,  0.10, 3);
    // open ledger: red cover + two angled cream pages
    const cover = at(box(0.40, 0.04, 0.30, C.ledger), -0.62, SURF, 0.0); g.add(cover);
    const pL = at(box(0.19, 0.02, 0.28, C.page), -0.72, SURF+0.03, 0.0); pL.rotation.z= 0.12; g.add(pL);
    const pR = at(box(0.19, 0.02, 0.28, C.page), -0.52, SURF+0.03, 0.0); pR.rotation.z=-0.12; g.add(pR);
    // quill leaning in the ledger
    const quill=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.010,0.30,5), M(0xddd2c0));
    quill.position.set(-0.50, SURF+0.14, -0.02); quill.rotation.set(0.4,0,-0.5); g.add(quill);

    // =====================================================================
    // shadows, placement, and world integration
    // =====================================================================
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = { kind:'bank', label:'Use <b>Bank booth</b>' };

    if(typeof scene!=='undefined' && scene && scene.add) scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD){
      if(WORLD.clickables) WORLD.clickables.push(g);
      // blocking rect follows the booth's yaw: counters placed at ±90° run along Z
      const turned = Math.abs(Math.sin(rot)) > 0.707;
      if(WORLD.colliders)  WORLD.colliders.push(turned
        ? {type:'rect', x, z, hw:0.52, hd:1.12}
        : {type:'rect', x, z, hw:1.12, hd:0.52});
    }
    return g;
  };

  console.log('[ref_bank] makeRefBank ready');
})();
