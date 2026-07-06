/* ============================================================================
 * ref_gemstall.js  —  Gem merchant's market stall (OSRS-quality low-poly)
 * Self-contained. Exposes window.makeRefGemStall(x=0, z=0, rot=0) -> THREE.Group.
 * Recreated from Bible_References/Gem_Stall.jpg:
 *   timber-framed stall, cream cloth awning, a plank counter bearing two
 *   black felt display trays FULL of cut faceted gems (ruby, emerald,
 *   sapphire, diamond, amethyst, topaz, magenta), an empty open sorting
 *   box, a brass balance scale, loose gems, and a small hanging sign.
 * Flat-shaded low-poly OSRS; gems get a subtle emissive so they sparkle.
 * Gentle awning / sign sway via a self-installed rAF (shared, self-cleaning).
 * ==========================================================================*/
(function(){
  if (typeof THREE === 'undefined') { return; }

  // ---- material helper: reuse the game's mat() when present, else fallback ----
  const M = (c)=> typeof mat==='function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // shared cache so repeated calls reuse one material per colour
  const _matCache = {};
  const CM = (c)=> _matCache[c] || (_matCache[c] = M(c));

  // ---- gem material: faceted jewel with a subtle emissive glow ----
  const _gemCache = {};
  const GEM = (c)=> _gemCache[c] || (_gemCache[c] = new THREE.MeshPhongMaterial({
    color: c, emissive: c, emissiveIntensity: 0.35,
    shininess: 90, specular: 0x9a9a9a, flatShading: true
  }));

  // ---------------- palette ----------------
  const COL = {
    postDark:  0x5f3f24,   // structural timber (dark, weathered)
    beam:      0x7a5533,   // frame beams / rails
    counter:   0x8a6a44,   // counter body
    counterTop:0x9c7a4e,   // scrubbed plank top
    plank:     0x6e4a2e,   // shelf / rail planks
    trayWood:  0x8c6a42,   // sorting box timber
    trayWoodDk:0x6f5030,   // sorting box darker
    felt:      0x161318,   // near-black display felt
    feltRim:   0x4a3826,   // display tray wooden rim
    awning:    0xdcd2b4,   // cream cloth awning
    awningDk:  0xc7bb98,   // awning underside / valance
    signBoard: 0x8a6a44,   // hanging sign frame
    signFace:  0xe7dcbf,   // painted panel
    signMark:  0x3a6f8f,   // painted gem glyph
    rope:      0x4a3826,
    brass:     0xb9962f,   // scale arm / brass
    brassDk:   0x8a6f22,
    pan:       0x9a9488,   // scale pans (grey metal)
    panDk:     0x7d786d
  };

  // cut-gem colours (matching the trays in the reference)
  const GEMS = {
    ruby:     0xd21f4a,   // crimson red
    emerald:  0x2fae5a,   // green
    sapphire: 0x2f6fd2,   // blue
    diamond:  0xeaf2f6,   // white / clear
    amethyst: 0x9a4fd0,   // purple
    topaz:    0xe6c22a,   // yellow/gold
    magenta:  0xd23aa8,   // pink/magenta
    lavender: 0xb08fe0,   // pale violet
    aqua:     0x35c0b0    // teal
  };
  const GEM_KEYS = Object.keys(GEMS);

  // ---------------- tiny mesh helpers ----------------
  function m(geo, col, sx, sy, sz){
    const me = new THREE.Mesh(geo, CM(col));
    me.castShadow = true; me.receiveShadow = true;
    if (sx!==undefined) me.position.set(sx, sy, sz);
    return me;
  }
  function box(w,h,d,col,x,y,z){ return m(new THREE.BoxGeometry(w,h,d), col, x,y,z); }
  function cyl(rt,rb,h,seg,col,x,y,z){ return m(new THREE.CylinderGeometry(rt,rb,h,seg), col, x,y,z); }

  // A single cut gem — low-poly faceted jewel with subtle glow.
  // Alternates octahedron (kite/diamond cut) and icosahedron (brilliant cut).
  function gem(colHex, r, cut){
    const geo = (cut===1)
      ? new THREE.IcosahedronGeometry(r, 0)
      : new THREE.OctahedronGeometry(r, 0);
    const me = new THREE.Mesh(geo, GEM(colHex));
    me.castShadow = true;
    // octahedrons read best stood on a point and stretched a touch (kite cut)
    if (cut!==1) me.scale.set(1, 1.35, 1);
    return me;
  }

  // A felt display tray filled with a scatter of cut gems.
  function gemTray(w, d){
    const g = new THREE.Group();
    const rim = 0.05, th = 0.05;
    // wooden rim frame around the felt
    g.add(box(w, 0.09, rim, COL.feltRim, 0, 0, -d/2+rim/2));
    g.add(box(w, 0.09, rim, COL.feltRim, 0,  0,  d/2-rim/2));
    g.add(box(rim, 0.09, d, COL.feltRim, -w/2+rim/2, 0, 0));
    g.add(box(rim, 0.09, d, COL.feltRim,  w/2-rim/2, 0, 0));
    // black felt bed (slightly recessed)
    g.add(box(w-rim*1.6, th, d-rim*1.6, COL.felt, 0, -0.01, 0));
    // scatter gems in a loose grid with jitter so it reads hand-laid
    const cols = 5, rows = 4;
    const ux = (w-0.24)/(cols-1), uz = (d-0.20)/(rows-1);
    let ci = 0;
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const key = GEM_KEYS[(ci*3 + r*2 + c) % GEM_KEYS.length];
        ci++;
        const gx = -w/2+0.12 + c*ux + (Math.sin(ci*12.9)*0.5)*0.03;
        const gz = -d/2+0.10 + r*uz + (Math.cos(ci*7.3)*0.5)*0.03;
        const rr = 0.05 + (ci%3)*0.007;
        const jw = gem(GEMS[key], rr, ci%2);
        jw.position.set(gx, 0.055, gz);
        jw.rotation.y = ci*0.7;
        g.add(jw);
      }
    }
    return g;
  }

  // A brass balance / weighing scale.
  function scale(){
    const g = new THREE.Group();
    // base + central column
    g.add(cyl(0.16, 0.20, 0.05, 10, COL.brassDk, 0, 0.025, 0));
    g.add(cyl(0.035, 0.045, 0.62, 8, COL.brass, 0, 0.34, 0));
    g.add(m(new THREE.IcosahedronGeometry(0.05,0), COL.brass, 0, 0.66, 0)); // finial
    // cross beam
    const beam = box(0.66, 0.03, 0.03, COL.brass, 0, 0.62, 0);
    beam.rotation.z = 0.06; g.add(beam);
    // two hanging pans
    const pan = (side)=>{
      const pg = new THREE.Group();
      // three thin support strings meeting the pan
      for (let i=0;i<3;i++){
        const s = cyl(0.004,0.004,0.16,4, COL.brassDk, Math.cos(i*2.1)*0.06, 0.42, Math.sin(i*2.1)*0.06);
        pg.add(s);
      }
      // shallow dish
      const dish = cyl(0.13, 0.05, 0.05, 12, COL.pan, 0, 0.33, 0);
      pg.add(dish);
      pg.add(cyl(0.13, 0.13, 0.012, 12, COL.panDk, 0, 0.31, 0));
      pg.position.x = side*0.30;
      pg.position.y = side>0 ? -0.02 : 0.02; // slight tilt with the beam
      return pg;
    };
    g.add(pan(1));
    g.add(pan(-1));
    return g;
  }

  // ========================================================================
  window.makeRefGemStall = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    const W = 4.0;    // counter width (x)
    const D = 2.4;    // depth (z) — customer side at +z, keeper side at -z
    const POST = 2.8;
    const px = W*0.5 - 0.12, pz = D*0.5 - 0.12;

    // ---------------- structural timber frame ----------------
    const postGeo = new THREE.BoxGeometry(0.20, POST, 0.20);
    for (const [sx,sz] of [[-px,-pz],[px,-pz],[-px,pz],[px,pz]]){
      g.add(m(postGeo, COL.postDark, sx, POST*0.5, sz));
    }
    // top rails forming the awning plate
    g.add(box(W, 0.15, 0.15, COL.beam,  0, POST, -pz));
    g.add(box(W, 0.15, 0.15, COL.beam,  0, POST,  pz));
    g.add(box(0.15, 0.15, D, COL.beam, -px, POST,  0));
    g.add(box(0.15, 0.15, D, COL.beam,  px, POST,  0));

    // ---------------- cream cloth awning (sloped forward) ----------------
    const awning = new THREE.Group();
    const cloth = box(W+0.5, 0.05, D+0.7, COL.awning, 0, 0, 0);
    awning.add(cloth);
    // faint darker underside stripe so the flat cloth reads as fabric
    awning.add(box(W+0.5, 0.045, 0.12, COL.awningDk, 0, -0.01, (D+0.7)*0.32));
    awning.rotation.x = 0.30;
    awning.position.set(0, POST + 0.32, 0.12);
    g.add(awning);

    // a short hanging valance fringe along the awning's front edge (gently sways)
    // NOTE: pivots are children of `awning`, so their positions are AWNING-LOCAL.
    // The awning group already carries the tilt (rotation.x) + world placement, so
    // reusing world/`g`-space coords here would double-transform the fringe and fling
    // it out past the front edge as a long flat strip. We pivot on the local front
    // lip and hang straight DOWN instead.
    const flaps = [];
    const slopeLen = D + 0.7;                                    // local cloth length (z)
    const nFlap = 5, fw = (W+0.5)/nFlap;
    const lipGeo = new THREE.BoxGeometry(fw*0.95, 0.20, 0.03);   // short thin fringe, not a 4.5-unit plank
    const frontZ = slopeLen*0.5 - 0.02;                          // local front edge of the cloth
    for (let i=0;i<nFlap;i++){
      const pivot = new THREE.Group();
      pivot.position.set(-(W+0.5)/2 + fw*(i+0.5), 0, frontZ);    // AWNING-LOCAL, sitting on the front lip
      const lip = new THREE.Mesh(lipGeo, CM(i%2 ? COL.awningDk : COL.awning));
      lip.castShadow = true; lip.position.y = -0.10;             // hangs straight down from the edge
      pivot.add(lip);
      pivot.userData.phase = i*0.7;
      // tiny fore/aft (x) wobble only — a couple degrees, so it never juts out
      pivot.userData.swayAxis = 'x';
      pivot.userData.swayAmp  = 0.03;
      awning.add(pivot);
      flaps.push(pivot);
    }

    // ---------------- plank counter (customer-facing) ----------------
    const counterY = 0.95, counterZ = pz - 0.35;
    g.add(box(W-0.2, counterY, 0.7, COL.counter, 0, counterY*0.5, counterZ));
    g.add(box(W+0.1, 0.1, 0.9, COL.counterTop, 0, counterY+0.05, counterZ));
    // slatted plank front (the layered rails visible in the reference)
    for (let i=0;i<3;i++){
      g.add(box(W-0.4, 0.10, 0.02, COL.plank, 0, 0.28+i*0.26, counterZ+0.36));
    }
    // under-counter shelf
    g.add(box(W-0.3, 0.06, 0.6, COL.plank, 0, 0.34, counterZ));

    // ---------------- wares ON the counter ----------------
    const topY = counterY + 0.1;

    // two big black felt gem trays, tilted slightly up toward the customer
    const t1 = gemTray(1.35, 0.95);
    t1.position.set(-W*0.25, topY+0.10, counterZ-0.02);
    t1.rotation.x = -0.22;
    g.add(t1);
    const t2 = gemTray(1.35, 0.95);
    t2.position.set(W*0.14, topY+0.10, counterZ-0.02);
    t2.rotation.x = -0.22;
    g.add(t2);

    // empty open sorting box (light timber) at the near-left
    const boxG = new THREE.Group();
    const bw = 0.62, bd = 0.44, bh = 0.16;
    boxG.add(box(bw, 0.03, bd, COL.trayWoodDk, 0, 0, 0)); // floor
    boxG.add(box(bw, bh, 0.04, COL.trayWood, 0,  bh*0.5,  bd/2-0.02));
    boxG.add(box(bw, bh, 0.04, COL.trayWood, 0,  bh*0.5, -bd/2+0.02));
    boxG.add(box(0.04, bh, bd, COL.trayWood,  bw/2-0.02, bh*0.5, 0));
    boxG.add(box(0.04, bh, bd, COL.trayWood, -bw/2+0.02, bh*0.5, 0));
    boxG.position.set(-W*0.5+0.5, topY+0.02, counterZ+0.15);
    g.add(boxG);

    // brass balance scale at the right
    const sc = scale();
    sc.position.set(W*0.5-0.55, topY, counterZ-0.05);
    g.add(sc);

    // a few loose gems scattered on the bare counter
    const loose = [
      [GEMS.magenta, -0.15, 0.20], [GEMS.amethyst, 0.02, 0.24],
      [GEMS.ruby, 0.9, 0.16], [GEMS.sapphire, -W*0.5+0.85, 0.20]
    ];
    let li=0;
    for (const [c,lx,lz] of loose){
      const jw = gem(c, 0.052, (li++)%2);
      jw.position.set(lx, topY+0.04, counterZ+lz);
      jw.rotation.y = li*1.3;
      g.add(jw);
    }

    // ---------------- hanging painted sign ----------------
    const signG = new THREE.Group();
    g.add(box(0.7, 0.1, 0.1, COL.beam, px+0.32, POST-0.15, pz));
    g.add(box(0.1, 0.1, 0.55, COL.beam, px+0.63, POST-0.15, pz-0.26)); // back strut
    const ropeGeo = new THREE.CylinderGeometry(0.02,0.02,0.4,5);
    const rL = new THREE.Mesh(ropeGeo, CM(COL.rope)); rL.position.set(px+0.46, POST-0.35, pz);
    const rR = new THREE.Mesh(ropeGeo, CM(COL.rope)); rR.position.set(px+0.80, POST-0.35, pz);
    g.add(rL); g.add(rR);
    const board = box(0.80, 0.54, 0.06, COL.signBoard, 0, 0, 0);
    signG.add(board);
    signG.add(box(0.66, 0.40, 0.02, COL.signFace, 0, 0, 0.04));
    // painted gem glyph (a blue diamond) on the sign
    const glyph = gem(GEMS.sapphire, 0.12, 0);
    glyph.position.set(0, -0.02, 0.06); glyph.scale.set(1, 1, 0.3);
    signG.add(glyph);
    signG.position.set(px+0.63, POST-0.60, pz);
    signG.userData.phase = 1.4;
    g.add(signG);

    // ---------------- final transform ----------------
    let baseY = 0;
    if (typeof gy === 'function'){ try { baseY = gy(x,z)||0; } catch(e){} }
    g.position.set(x, baseY, z);
    g.rotation.y = rot;

    // collider (if the world uses them) — footprint ~ W x D
    if (typeof WORLD === 'object' && WORLD && Array.isArray(WORLD.colliders)){
      WORLD.colliders.push({type:'rect', x:x, z:z, hw:W*0.5, hd:D*0.5});
    }

    // ---------------- gentle cloth / sign sway (shared self-cleaning rAF) ----------------
    g.userData.swayers = flaps.concat([signG]);
    if (!window.__refGemStallTick){
      window.__refGemStallTick = { groups: [] };
      const tick = ()=>{
        const t = (typeof performance!=='undefined'? performance.now(): Date.now())*0.001;
        const list = window.__refGemStallTick.groups;
        for (let i=list.length-1;i>=0;i--){
          const grp = list[i];
          if (!grp.parent){ list.splice(i,1); continue; }   // removed from scene
          const sw = grp.userData.swayers; if (!sw) continue;
          for (const s of sw){
            const ph  = s.userData.phase||0;
            const amp = (s.userData.swayAmp!=null) ? s.userData.swayAmp : 0.045;
            const ax  = s.userData.swayAxis || 'z';
            s.rotation[ax] = Math.sin(t*1.1 + ph)*amp;
          }
        }
        requestAnimationFrame(tick);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
    }
    window.__refGemStallTick.groups.push(g);

    return g;
  };

  console.log('[ref_gemstall] makeRefGemStall ready');
})();
