/* ============ tut_bld_guide — the Tutorial Island GUIDE HALL (the hero building) ============
 * Fixes the "plain rectangle, no character" complaint for the island's flagship structure.
 * Reuses the PROVEN functional shell (Buildkit.house: walls/working-door/colliders/interior/
 * roof) and then hangs a coat of CHARACTER geometry around it in WORLD space: an attached
 * L-shape side WING, a covered front PORCH/portico, a roof DORMER, a tall stone CHIMNEY, a
 * hanging "Guide" SIGN (canvas-texture text — CSP-safe), a pair of BANNERS, flower PLANTERS
 * under the front windows, an entry STEP and a door LANTERN. Warm low-poly flat-shaded, grey
 * stone (0x9a9a92) + grey-gold shingle (0x8f8f88) to stay cohesive with the town, but grand.
 *
 *   window.makeGuideHall(x, z, rot=0)   // door/porch face outward along +z rotated by rot
 *
 * Globals reused (all live in game2_world.js / buildkit.js): THREE, scene, WORLD, mat(), gy(),
 * TEX, Buildkit, addCircleCollider(). 1 unit = 1 tile. STOREY_H = 3.2 (two storeys => top 6.4).
 */
(function(){
  const STONE=0x9a9a92, STONE_DK=0x83837b, ROOF=0x8f8f88, ROOF_DK=0x6d6d68;
  const WOOD=0x6b4a2f, WOOD_LT=0x8a6a44, CLOTH=0x8a2f2f, TRIM=0xcaa64a, GLOW=0xffcf80;

  // r128 merge util (fence idiom) — collapse high-count repeats (planks/banners) to 1 draw call
  const BGU=THREE.BufferGeometryUtils||{};
  const mergeFn=BGU.mergeBufferGeometries||BGU.mergeGeometries||null;
  function merged(geoms, material){
    if(mergeFn){ const m=new THREE.Mesh(mergeFn(geoms,false), material); m.castShadow=true; return m; }
    const g=new THREE.Group(); geoms.forEach(gg=>{ const mm=new THREE.Mesh(gg,material); mm.castShadow=true; g.add(mm); }); return g;
  }
  // stone reads with the shell's worked-stone grain when the atlas is loaded
  function stoneMat(c){ return (typeof TEX!=='undefined'&&TEX.stone)
    ? new THREE.MeshLambertMaterial({map:TEX.stone, color:c}) : mat(c); }
  function box(w,h,d,c,mtl){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mtl||mat(c)); }

  /* painted board face: "Guide" in serif on a timber plaque (canvas → texture, no network) */
  function signTexture(text){
    const c=document.createElement('canvas'); c.width=256; c.height=128;
    const g=c.getContext('2d');
    g.fillStyle='#5f4227'; g.fillRect(0,0,256,128);
    g.strokeStyle='#caa64a'; g.lineWidth=9; g.strokeRect(11,11,234,106);
    g.fillStyle='#f4e6b6'; g.font='bold 62px Georgia, "Times New Roman", serif';
    g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,128,70);
    const t=new THREE.CanvasTexture(c); t.needsUpdate=true; return t;
  }

  /* one tilted portico slope: a solid roof board + merged shingle courses riding its face.
     Built flat, tilted about z by `sign*ang`; ridge is along +z (points outward from the wall). */
  function porticoSlope(run, depth, ang, sign){
    const slope=box(run,0.13,depth, ROOF); slope.castShadow=true;
    const geoms=[]; const n=Math.max(4, Math.round(run/0.3));
    for(let i=1;i<n;i++){ const g=new THREE.BoxGeometry(0.06,0.05,depth*0.98);
      g.translate(-run/2 + i*(run/n), 0.09, 0); geoms.push(g); }
    slope.add(merged(geoms, mat(ROOF_DK)));   // shingle bands, one merged mesh
    const hold=new THREE.Group(); hold.add(slope);
    slope.position.x = sign*run/2;             // hinge the board at the ridge
    hold.rotation.z = -sign*ang;
    return hold;
  }

  /* a small flower tuft (stems + petals) for the planter boxes */
  const PETALS=[0xd85a6a,0xe0c24a,0x9a6ad0];
  function tuft(){ const g=new THREE.Group();
    for(let i=0;i<3;i++){ const a=i*2.1, ox=Math.cos(a)*0.12, oz=Math.sin(a)*0.12;
      const st=box(0.03,0.28,0.03, 0x4a7a3a); st.position.set(ox,0.14,oz); g.add(st);
      const fl=new THREE.Mesh(new THREE.IcosahedronGeometry(0.08,0), mat(PETALS[i%3]));
      fl.position.set(ox,0.3,oz); g.add(fl); }
    return g; }

  /* small tabletop candle (unlit by default; lit ones carry a soft warm point light) */
  function tableCandle(lit){ const g=new THREE.Group();
    const wax=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,0.24,6), mat(0xe8e0c8)); wax.position.y=0.12; g.add(wax);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), new THREE.MeshBasicMaterial({color:0xffe6a0})); fl.position.y=0.28; g.add(fl);
    if(lit){ const li=new THREE.PointLight(0xffce88,0.4,4.5); li.position.y=0.34; g.add(li); }
    return g; }

  /* a potted plant (clay pot + leafy flower tuft) for the hall corners */
  function pottedPlant(){ const g=new THREE.Group();
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.17,0.44,7), mat(0x9a5a3a)); pot.position.y=0.22; g.add(pot);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.24,0.08,7), mat(0x8a4a2a)); rim.position.y=0.44; g.add(rim);
    const soil=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.05,7), mat(0x3a2a1a)); soil.position.y=0.45; g.add(soil);
    const t=tuft(); t.position.y=0.45; t.scale.set(1.5,1.7,1.5); g.add(t);
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); return g; }

  function makeGuideHall(x, z, rot){
    rot = rot||0;
    const W=14, D=11, HW=W/2, HD=D/2, WALL_TOP=Buildkit.STOREY_H*2;   // 6.4 — larger grand hall (was 12x10)

    // 1) the FUNCTIONAL SHELL (Buildkit adds it to the scene itself; door faces S/+z)
    //    interior:'house' furnish dropped — this hall gets a bespoke banquet interior below
    Buildkit.house({x, z, w:W, d:D, floors:2, doorSide:'S', color:STONE, roofColor:ROOF,
      shellOpts:{wall:'stone', chimney:true}, roof:'gable'});

    // seat character on the same base the shell uses (lowest footprint corner), then rotate
    const baseY=Math.min(gy(x-HW,z-HD),gy(x+HW,z-HD),gy(x-HW,z+HD),gy(x+HW,z+HD));
    const G=new THREE.Group(); G.position.set(x, baseY, z); G.rotation.y=rot;
    const add=m=>{ m.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(m); };
    // local(lx,lz) -> world, matching G's Y-rotation, for rotation-invariant circle colliders
    const c=Math.cos(rot), s=Math.sin(rot);
    const wcol=(lx,lz,r)=>{ if(typeof addCircleCollider==='function') addCircleCollider(x+lx*c+lz*s, z-lx*s+lz*c, r); };

    /* ---- attached SIDE WING (L-shape footprint) on the west (−x), one storey + gable ---- */
    { const ww=2.9, wd=4.2, wh=Buildkit.STOREY_H+0.2, cx=-(HW+ww/2-0.35), cz=-0.5;
      const body=box(ww,wh,wd, STONE, stoneMat(STONE)); body.position.set(cx, wh/2, cz);
      body.receiveShadow=true; add(body);
      for(const qz of [cz-wd/2, cz+wd/2]){                              // corner quoins for texture
        const q=box(0.26,wh,0.26, STONE_DK); q.position.set(cx-ww/2, wh/2, qz); add(q); }
      const win=Buildkit._window(0.8,0.85,false); win.position.set(cx, wh*0.55, cz+wd/2+0.02); add(win);
      // gable roof over the wing: two tilted slabs + a ridge beam (ridge along z)
      for(const sgn of [-1,1]){ const sl=box(ww/2+0.35,0.14,wd+0.4, ROOF);
        sl.position.set(cx + sgn*(ww/4), wh+0.42, cz); sl.rotation.z=-sgn*0.6; add(sl); }
      const ridge=box(0.16,0.16,wd+0.4, ROOF_DK); ridge.position.set(cx, wh+0.72, cz); add(ridge);
      wcol(cx, cz-1.2, 0.95); wcol(cx, cz+1.2, 0.95); wcol(cx-0.4, cz, 0.9);
    }

    /* ---- covered PORCH / portico over the front door (+z): stone posts + a pediment roof ---- */
    { const PW=3.6, PD=1.9, zOut=HD+PD, ph=2.75;
      for(const px of [-PW/2+0.2, PW/2-0.2]){                          // two stone columns out front
        const post=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.2,ph,7), stoneMat(STONE));
        post.position.set(px, ph/2, zOut-0.25); add(post);
        const cap=box(0.5,0.16,0.5, STONE_DK); cap.position.set(px, ph, zOut-0.25); add(cap);
        wcol(px, zOut-0.25, 0.28);
      }
      // pediment: ridge along z from wall to the posts; two shingled slopes to ±x
      const run=PW/2+0.35, mid=(HD+zOut)/2, ang=0.42;
      for(const sgn of [-1,1]){ const sl=porticoSlope(run, PD+0.4, ang, sgn);
        sl.position.set(0, ph+0.05, mid); add(sl); }
      const ridge=box(0.16,0.16,PD+0.5, ROOF_DK); ridge.position.set(0, ph+run*Math.sin(ang)+0.05, mid); add(ridge);
      // triangular front pediment face (a flat 3-gon) so the portico reads grand head-on
      const ped=new THREE.Mesh(new THREE.CylinderGeometry(run,run,0.1,3), mat(STONE_DK));
      ped.rotation.x=Math.PI/2; ped.rotation.z=Math.PI/2; ped.position.set(0, ph+0.05, zOut+0.05); ped.scale.y=Math.sin(ang)*2; add(ped);
    }

    /* ---- entry STEP + door LANTERN ---- */
    { const step=box(2.2,0.16,0.8, STONE_DK); step.position.set(0,0.08, HD+0.45); step.receiveShadow=true; add(step);
      const lp=box(0.1,2.2,0.1, WOOD); lp.position.set(1.05,1.1, HD+0.35); add(lp);
      const arm=box(0.5,0.08,0.08, WOOD); arm.position.set(0.85,2.1, HD+0.35); add(arm);
      const lan=box(0.28,0.4,0.28, GLOW, new THREE.MeshBasicMaterial({color:GLOW}));
      lan.position.set(0.62,1.95, HD+0.35); add(lan);
      const li=new THREE.PointLight(0xffb861,0.7,6); li.position.set(0.62,1.95, HD+0.55); G.add(li);
    }

    /* ---- central roof DORMER (front slope), a lit little window ---- */
    { const dz=HD-0.9, dy=WALL_TOP+0.55;
      const bodyD=box(1.3,1.15,0.9, STONE, stoneMat(STONE)); bodyD.position.set(0,dy,dz); add(bodyD);
      const pane=box(0.75,0.7,0.06, GLOW, Buildkit._glass()); pane.position.set(0,dy+0.05,dz+0.47); add(pane);
      for(const sgn of [-1,1]){ const sl=box(0.85,0.1,1.0, ROOF); sl.position.set(sgn*0.36, dy+0.75, dz); sl.rotation.z=-sgn*0.7; add(sl); }
    }

    /* ---- tall stone CHIMNEY stack (rear, −x) rising well above the ridge ---- */
    { const cx=-(HW-0.7), cz=-1.4, top=WALL_TOP+2.6;
      const skirt=box(1.0,WALL_TOP+0.6,1.0, STONE, stoneMat(STONE)); skirt.position.set(cx,(WALL_TOP+0.6)/2,cz); add(skirt);
      const shaft=box(0.72,top,0.72, STONE, stoneMat(STONE)); shaft.position.set(cx,top/2,cz); add(shaft);
      const lip=box(0.92,0.2,0.92, STONE_DK); lip.position.set(cx,top,cz); add(lip);
      for(const px of [-0.18,0.18]) for(const pz of [-0.18,0.18]){    // clay pots on the cap
        const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.35,6), mat(0x9a5a3a));
        pot.position.set(cx+px, top+0.28, cz+pz); add(pot); }
      wcol(cx, cz, 0.6);
    }

    /* ---- two hanging BANNERS flanking the door (cloth merged) + pennant tails ---- */
    { const bz=HD+0.06, BX=HW-1.5, geoms=[];                          // flank door, derived from new HW
      for(const bx of [-BX, BX]){ const g=new THREE.BoxGeometry(0.6,2.0,0.05); g.translate(bx, WALL_TOP-1.4, bz); geoms.push(g); }
      add(merged(geoms, mat(CLOTH)));                                  // both banner cloths, 1 mesh
      for(const bx of [-BX, BX]){
        const rail=box(0.72,0.08,0.08, WOOD_LT); rail.position.set(bx, WALL_TOP-0.42, bz); add(rail);
        const tail=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.5,3), mat(CLOTH));
        tail.rotation.x=Math.PI; tail.position.set(bx, WALL_TOP-2.5, bz); add(tail);
        const crest=new THREE.Mesh(new THREE.IcosahedronGeometry(0.14,0), mat(TRIM)); crest.position.set(bx, WALL_TOP-1.4, bz+0.05); add(crest);
      }
    }

    /* ---- flower PLANTER boxes under the front windows ---- */
    { for(const px of [-(HW-1.4), HW-1.4]){                           // under front windows, derived from new HW
        const pl=box(1.2,0.4,0.42, WOOD_LT); pl.position.set(px,0.25, HD+0.22); add(pl);
        const soil=box(1.1,0.1,0.34, 0x4a3524); soil.position.set(px,0.46, HD+0.22); add(soil);
        for(let i=0;i<3;i++){ const t=tuft(); t.position.set(px-0.35+i*0.35,0.5, HD+0.22); add(t); }
      }
    }

    /* ---- standing "Guide" SIGN on a post beside the porch, board hung from a bracket ---- */
    { const sx=2.7, sz=HD+1.7;
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,2.5,6), mat(WOOD)); post.position.set(sx,1.25,sz); add(post);
      const arm=box(0.9,0.09,0.09, WOOD); arm.position.set(sx-0.4,2.35,sz); add(arm);
      const tex=signTexture('Guide');
      const board=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.62,0.06),
        [mat(WOOD_LT),mat(WOOD_LT),mat(WOOD_LT),mat(WOOD_LT),
         new THREE.MeshBasicMaterial({map:tex}), new THREE.MeshBasicMaterial({map:tex})]);
      board.position.set(sx-0.75,1.95,sz); add(board);
      for(const cxo of [-0.35,0.35]){ const ch=box(0.03,0.35,0.03, 0x3a3a44); ch.position.set(sx-0.75+cxo,2.2,sz); add(ch); }
      wcol(sx, sz, 0.2);
    }

    /* ---- RICH INTERIOR: a grand banquet hall. Door is on +z; the centre lane stays
       clear so you can walk straight in. All pieces are decorative (no colliders). ---- */
    { // guide hall's walk surface is the FLATTENED TERRAIN (no pad slab, unlike chef/quest) —
      // seat each piece on the terrain at its own world spot (the Holm slopes under the shell)
      const iy=(lx,lz)=>{ const cs=Math.cos(rot||0), sn=Math.sin(rot||0);
        const wx=x+cs*lx+sn*lz, wz=z-sn*lx+cs*lz;
        return ((typeof gy==='function')?gy(wx,wz):0) - baseY + 0.05; };
      const F=(name,lx,lz,ry,opt)=>{ const p=Buildkit.furniture[name](Buildkit,opt);
        p.position.set(lx,iy(lx,lz),lz); if(ry) p.rotation.y=ry;
        p.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(p); return p; };
      // Mixar hero props (sprint 2026-07-08): ONE laden feast table (candles/roast baked in)
      // replaces the three-kit-table run + candles; stone fireplace replaces the primitive hearth
      const GP=(url,h,lx,lz,r)=>{ const p=makeGlbModel(url,{height:h}); p.position.set(lx,iy(lx,lz),lz);
        if(r) p.rotation.y=r; G.add(p); return p; };
      F('rug', 0, -2.6);
      GP('assets/models/tut_banquettable.glb', 1.1, 0, -2.6, 0);
      // chairs: three along the far (-z) side, two on the near side (centre left open for the door)
      for(const cxs of [-2.3,0,2.3]) F('chair', cxs, -3.35, 0);
      for(const cxs of [-2.3,2.3])   F('chair', cxs, -1.85, Math.PI);
      GP('assets/models/tut_fireplace.glb', 2.2, -6.0, 2.6, Math.PI/2);
      F('shelf',   6.3, -1.6, -Math.PI/2);
      F('shelf',   6.3,  1.4, -Math.PI/2);
      F('shelf',  -4.6, -4.85, 0);
      // a pair of potted plants in the front corners
      const p1=pottedPlant(); p1.position.set(6.2,iy(6.2,4.2),4.2); G.add(p1);
      const p2=pottedPlant(); p2.position.set(-6.2,iy(-6.2,-4.2),-4.2); G.add(p2);
    }

    scene.add(G);
    return G;
  }

  window.makeGuideHall = makeGuideHall;
})();
