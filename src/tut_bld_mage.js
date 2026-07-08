/* ============ tut_bld_mage — the Tutorial Island MAGE TOWER ============
 * The most CHARACTERFUL building of the set: a wizard's tower, not a plain box.
 * Base is a proven 2-storey Buildkit stone shell; on top we graft a TALL stone
 * drum/turret that punches up through the roof, capped by a conical blue spire
 * with a glowing crystal finial, round glowing-blue windows, wall runes/crystals,
 * star/moon banners, a lean-to study wing with a chimney, and an orb-on-a-post
 * brazier flanking the door. Warm low-poly FLAT-SHADED, but mystical grey-blue.
 *
 * window.makeMageTower(x, z, rot=0) -> the character THREE.Group (added to scene).
 * Deps (all globals from game2_world.js / buildkit.js): THREE, scene, gy, mat,
 * Buildkit, WORLD, TEX. r128; 1 unit = 1 tile. PointLights capped at 2 (spire
 * finial + door brazier). Repeated crenellation blocks are merged to one mesh.
 * Loaded AFTER buildkit.js.
 */
(function(){
  // --- mystical palette (grey/blue stone, blue-violet spire, cyan glow) ---
  const STONE   = 0x8a8a96;   // drum stone (matches shell base color)
  const STONE_D = 0x74748a;   // bluer shaded stone for the drum body
  const CORNICE = 0x6a6a80;   // cool grey ledge / battlement
  const SPIRE   = 0x3a3560;   // deep blue-violet conical roof
  const GLOW    = 0x7fd4ff;   // arcane cyan (windows, runes, finial, brazier)
  const RUNE    = 0x9a7fff;   // violet rune glyphs
  const CLOTH   = 0x2a2f66;   // deep-blue banner cloth

  const glow = c => new THREE.MeshBasicMaterial({color:c});               // unlit = always-bright accent
  const emis = c => new THREE.MeshPhongMaterial({color:c, emissive:c, emissiveIntensity:0.9, flatShading:true, shininess:0});

  // merge helper (r128 exposes mergeBufferGeometries; newer builds mergeGeometries)
  const BGU = THREE.BufferGeometryUtils||{};
  const mergeFn = BGU.mergeGeometries||BGU.mergeBufferGeometries||null;

  /* a round glowing window: stone ring + cyan pane, built facing +Z at local origin */
  function roundWindow(r){
    r=r||0.42; const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,0.09,4,12), mat(CORNICE)); g.add(ring);
    const pane=new THREE.Mesh(new THREE.CylinderGeometry(r-0.04,r-0.04,0.05,12), glow(GLOW));
    pane.rotation.x=Math.PI/2; pane.position.z=-0.02; g.add(pane);
    g.traverse(o=>{ if(o.isMesh) o.castShadow=false; });
    return g;
  }

  /* an unlit study candlestick (pale wax + cool arcane flame; NO point light, to keep
     the tower's dynamic-light budget for the finial/brazier/orb) */
  function studyCandle(){ const g=new THREE.Group();
    const wax=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,0.24,6), mat(0xd8d0e0)); wax.position.y=0.12; g.add(wax);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), new THREE.MeshBasicMaterial({color:0xbfe6ff})); fl.position.y=0.28; g.add(fl);
    return g; }

  /* a hanging banner: deep-blue cloth with a glowing crescent moon + a star */
  function banner(){
    const g=new THREE.Group();
    const cloth=new THREE.Mesh(new THREE.BoxGeometry(0.95,2.3,0.06), mat(CLOTH));
    cloth.position.y=-1.15; g.add(cloth);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.1,0.1), mat(0x4a4a3a)); g.add(rail);
    const moon=new THREE.Mesh(new THREE.TorusGeometry(0.24,0.07,4,10,Math.PI*1.35), glow(GLOW));
    moon.position.set(0,-0.85,0.06); moon.rotation.z=0.5; g.add(moon);
    const star=new THREE.Mesh(new THREE.IcosahedronGeometry(0.13,0), glow(0xfff0b0));
    star.position.set(0.02,-1.7,0.06); g.add(star);
    return g;
  }

  window.makeMageTower = function(x, z, rot){
    rot = rot||0;
    const STH = (typeof Buildkit!=='undefined' && Buildkit.STOREY_H) || 3.2;
    const W=11, D=10, HW=W/2, HD=D/2;   // larger base (was 9x9); tower still tighter than the halls

    // 1) FUNCTIONAL SHELL: proven walkable 2-storey stone box (door on W, faces out).
    //    interior:'house' furnish dropped — a bespoke wizard-study interior added below
    if(typeof Buildkit!=='undefined')
      Buildkit.house({x, z, w:W, d:D, floors:2, doorSide:'W', color:0x8a8a96,
        roofColor:0x6a6a80, shellOpts:{wall:'stone'}});

    // 2) CHARACTER: a group seated on the ground at (x,z), spun by `rot` so every
    //    added piece rotates about the tower axis together (door-flanking props stay put).
    const G = new THREE.Group();
    G.position.set(x, (typeof gy==='function')?gy(x,z):0, z);
    G.rotation.y = rot;
    const add=(m)=>{ m.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(m); return m; };

    // ---- the TALL stone drum: an octagonal turret rising up through the roof ----
    const drumBaseY = STH*2 - 1.1, drumH = 5.0, R = 2.0;
    const drumTopY  = drumBaseY + drumH;
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(R, R+0.25, drumH, 8),
      (typeof TEX!=='undefined'&&TEX.stone)?new THREE.MeshLambertMaterial({map:TEX.stone,color:STONE_D}):mat(STONE_D));
    drum.position.y=drumBaseY+drumH/2; add(drum);
    // cornice ring + merged battlement crenellations (high count -> one mesh)
    const cornice=new THREE.Mesh(new THREE.CylinderGeometry(R+0.35,R+0.3,0.35,8), mat(CORNICE));
    cornice.position.y=drumTopY+0.15; add(cornice);
    { const merlG=[], nM=8;
      for(let i=0;i<nM;i++){ const a=(i/nM)*Math.PI*2;
        const bg=new THREE.BoxGeometry(0.42,0.5,0.42);
        bg.rotateY(-a); bg.translate(Math.cos(a)*(R+0.2), drumTopY+0.55, Math.sin(a)*(R+0.2));
        merlG.push(bg); }
      const m = mergeFn ? new THREE.Mesh(mergeFn(merlG,false), mat(CORNICE)) : null;
      if(m) add(m); else merlG.forEach(bg=>add(new THREE.Mesh(bg, mat(CORNICE))));
    }

    // ---- the CONICAL SPIRE + glowing crystal finial (1 of 2 PointLights) ----
    const spireBaseY=drumTopY+0.4, spireH=4.4;
    const spire=new THREE.Mesh(new THREE.ConeGeometry(R+0.45, spireH, 8), mat(SPIRE));
    spire.position.y=spireBaseY+spireH/2; add(spire);
    // banding rings down the spire for detail
    for(let i=1;i<=3;i++){ const f=i/4, rr=(R+0.45)*(1-f);
      const ring=new THREE.Mesh(new THREE.CylinderGeometry(rr+0.05,rr+0.1,0.08,8), mat(0x2a2648));
      ring.position.y=spireBaseY+f*spireH; add(ring); }
    const tipY=spireBaseY+spireH;
    const finial=new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,0), emis(GLOW));
    finial.position.y=tipY+0.35; add(finial);
    const fLight=new THREE.PointLight(GLOW, 0.6, 8); fLight.position.y=tipY+0.35; G.add(fLight);

    // ---- round glowing-blue windows around the drum (4, face outward) ----
    for(let i=0;i<4;i++){ const a=(i/4)*Math.PI*2 + Math.PI/8;
      const w=roundWindow(0.44);
      w.position.set(Math.cos(a)*(R+0.02), drumBaseY+drumH*0.55, Math.sin(a)*(R+0.02));
      w.rotation.y=-a+Math.PI/2; add(w); }

    // ---- embedded RUNE glyphs + a wall CRYSTAL on the main shell (mystical accents) ----
    const runeAt=(lx,ly,lz,ry,col)=>{ const q=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.6), glow(col));
      q.position.set(lx,ly,lz); q.rotation.y=ry; add(q); };
    runeAt(-(HW+0.02), 3.6, 1.4, -Math.PI/2, RUNE);      // W wall (door side), proud of new wall face
    runeAt(-(HW+0.02), 3.6, -1.4, -Math.PI/2, RUNE);
    runeAt(1.5, 4.2, HD+0.02, 0, GLOW);                  // S wall
    const crystal=new THREE.Mesh(new THREE.IcosahedronGeometry(0.35,0), emis(RUNE));
    crystal.position.set(HW+0.05, 2.2, -1.2); add(crystal); // embedded on E wall

    // ---- attached STUDY WING (lean-to) on the E side, with a chimney ----
    { const wW=2.6, wD=3.0, wH=2.6, cx=HW+wW/2-0.15;   // attached just proud of the new E wall
      const wing=new THREE.Mesh(new THREE.BoxGeometry(wW,wH,wD),
        (typeof TEX!=='undefined'&&TEX.stone)?new THREE.MeshLambertMaterial({map:TEX.stone,color:STONE}):mat(STONE));
      wing.position.set(cx, wH/2, 0.4); add(wing);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(wW+0.4,0.18,wD+0.4), mat(SPIRE));
      roof.position.set(cx, wH+0.35, 0.4); roof.rotation.z=-0.42; add(roof);   // mono-pitch sloping off the tower
      const win=roundWindow(0.3); win.position.set(cx+wW/2+0.01, wH*0.6, 0.4); win.rotation.y=Math.PI/2; add(win);
      const chim=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.5,0.5), mat(0x6e6a64));
      chim.position.set(cx+0.4, wH+0.9, -0.7); add(chim);
      const cap=new THREE.Mesh(new THREE.BoxGeometry(0.64,0.15,0.64), mat(CORNICE));
      cap.position.set(cx+0.4, wH+1.7, -0.7); add(cap);
    }

    // ---- star/moon BANNERS hanging from the cornice (N & S drum faces) ----
    for(const s of [1,-1]){ const b=banner();
      b.position.set(0, drumTopY-0.1, s*(R+0.32)); if(s<0) b.rotation.y=Math.PI; add(b); }

    // ---- orb-on-a-post BRAZIER flanking the W door (2nd/last PointLight) ----
    { const px=-(HW+0.6), pz=-1.5;   // just outside the W wall, flanking (not blocking) the door gap
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,2.2,6), mat(0x4a4a52));
      post.position.set(px,1.1,pz); add(post);
      const cage=new THREE.Mesh(new THREE.IcosahedronGeometry(0.32,0), mat(0x3a3a42));
      cage.position.set(px,2.35,pz); add(cage);
      const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(0.24,0), emis(GLOW));
      orb.position.set(px,2.35,pz); add(orb);
      const bLight=new THREE.PointLight(GLOW,0.5,6); bLight.position.set(px,2.35,pz); G.add(bLight);
    }

    // ---- WIZARD-STUDY INTERIOR: door on -x (west); keep the z∈[-1,1] entry lane clear and
    //      leave the +x,-z corner free for the shell ladder. Candles are unlit; the only new
    //      interior light is the crystal orb (the 1 allowed extra point light). ----
    { const F=(name,lx,lz,r,opt)=>{ const p=Buildkit.furniture[name](Buildkit,opt);
        p.position.set(lx,0.1,lz); if(r) p.rotation.y=r;
        p.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(p); return p; };
      F('rug', 0.6, 0.6);
      // Mixar hero props (sprint 2026-07-08): scroll-cluttered arcane desk + stuffed bookshelves
      const GP=(url,h,lx,lz,r)=>{ const p=makeGlbModel(url,{height:h}); p.position.set(lx,0.05,lz);
        if(r) p.rotation.y=r; G.add(p); return p; };
      GP('assets/models/tut_arcanedesk.glb', 1.1, 1.6, 3.0, 0); F('stool', 1.6, 2.0, 0);
      // tall bookshelves along the east wall (GLB heroes) + back (-z) wall (kit shelves)
      GP('assets/models/tut_bookshelf.glb', 2.1, 4.6, 1.4, -Math.PI/2);
      GP('assets/models/tut_bookshelf.glb', 2.1, 4.6, 3.0, -Math.PI/2);
      F('shelf', -1.8, -4.3, 0);
      F('shelf',  1.0, -4.3, 0);
      // a glowing crystal ORB on a stand (the single extra interior point light)
      { const stand=new THREE.Group();
        const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.2,1.0,6), mat(0x4a4a52)); ped.position.y=0.5; stand.add(ped);
        const bowl=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,5,0,Math.PI*2,0,Math.PI/2), mat(0x3a3a42));
        bowl.rotation.x=Math.PI; bowl.position.y=1.05; stand.add(bowl);
        const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), emis(GLOW)); orb.position.y=1.24; stand.add(orb);
        const oli=new THREE.PointLight(GLOW,0.5,5); oli.position.y=1.28; stand.add(oli);
        stand.position.set(-0.4,0.1,2.4); stand.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(stand); }
    }

    if(typeof scene!=='undefined') scene.add(G);
    return G;
  };
})();
