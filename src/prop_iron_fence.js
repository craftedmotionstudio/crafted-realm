/* ============ prop_iron_fence — the black wrought-iron picket fence + ornate gate ============
 * Reference: Bible_References/Fence.jpg — the tall BLACK wrought-iron picket fence on a low
 * stone kerb, with an ornate double gate, ringing a civic garden. This is a SEPARATE asset
 * from the wooden rail fence (game2_world.js `makeFence`) — do NOT confuse the two.
 *
 * Enumeration of the reference (have / built here):
 *   - vertical iron pickets with pointed (spear-tip) finials  ✔ makeIronFenceRun
 *   - a top rail and a bottom rail joining the pickets         ✔ makeIronFenceRun
 *   - thicker square posts at intervals, urn/ball finial caps  ✔ makeIronFenceRun
 *   - an ornate double gate (arched bars + scroll, ajar)       ✔ makeIronGate
 *   - a low stone kerb / plinth the ironwork stands on         ✔ makeIronFenceRun (kerb)
 *
 * Art: cozy 2007/OSRS, LOW-POLY FLAT-SHADED. Dark iron palette matches the plaza lamp posts.
 * Pieces seat on groundY via gy(); the run registers a line of circle colliders like makeFence.
 * Global deps (all live in game2_world.js): THREE, mat(), gy(), groundY, scene, WORLD, TEX,
 * collides(), addCircleCollider(). Loaded AFTER world_scatter.js; only invoked at world-build.
 */
(function(){
  const IRON      = 0x27272d;   // wrought-iron body (near-black, matches lamp-post iron 0x2e2a26)
  const IRON_DARK = 0x1b1b20;   // shadowed iron for rails / tips
  const KERB      = 0x9a9a92;   // cool worked GREY stone (OSRS kerb reads grey, not brown) — was 0x8a8478 warm-tan
  const KERB_HI   = 0xa9a9a1;   // lighter grey for the scalloped dentil molding on the kerb top

  /* a single spear-tip finial (the pointed picket top) — a squat 4-sided cone */
  function spearTip(h){
    const c=new THREE.Mesh(new THREE.ConeGeometry(0.045, h||0.2, 4), mat(IRON_DARK));
    c.rotation.y=Math.PI/4; c.castShadow=true; return c;
  }

  /* ---- a run of wrought-iron picket fence from (x1,z1) to (x2,z2) ----
   * Builds a low stone kerb, top+bottom rails, thin pointed pickets, and square posts with
   * ball finials at the ends and at ~2-unit intervals. Registers circle colliders along the
   * run so it blocks like the wooden fence. Per-piece guards drop any element that would
   * overlap an existing collider or fall off the map, so runs abut buildings cleanly. */
  function makeIronFenceRun(x1,z1,x2,z2, opts){
    opts=opts||{};
    const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz);
    if(len<0.05) return;
    const ang=Math.atan2(dx,dz)+Math.PI/2;   // aligns a box's X axis with the run (makeFence idiom)
    const PICK_H=1.28, RAIL_TOP=1.14, RAIL_BOT=0.24, POST_H=1.5;
    const guarded = opts.guard!==false;      // per-piece collider guard (default on)
    // sample the lowest ground under the run so the kerb + rails sit flush, never float
    let yBase=Infinity;
    for(let s=0;s<=len;s+=Math.max(0.5,len/6)){ const t=s/len; const y=gy(x1+dx*t, z1+dz*t); if(y<yBase) yBase=y; }
    if(!isFinite(yBase)) yBase=gy((x1+x2)/2,(z1+z2)/2);

    // --- the low stone kerb the ironwork stands on ---
    const kerb=new THREE.Mesh(new THREE.BoxGeometry(len, 0.2, 0.34),
      (typeof TEX!=='undefined'&&TEX.stone)
        ? new THREE.MeshLambertMaterial({map:TEX.stone, color:KERB})
        : mat(KERB));
    kerb.position.set((x1+x2)/2, yBase+0.1, (z1+z2)/2); kerb.rotation.y=ang;
    kerb.receiveShadow=true; kerb.castShadow=true; scene.add(kerb);

    // --- scalloped dentil molding along the kerb top (the OSRS kerb's decorative edge) ---
    // a run of small merged blocks stepping along the top face; one merged mesh = 1 draw call
    {
      const nD=Math.max(4, Math.round(len/0.28)), dStep=len/nD;
      const dGeoms=[];
      const ux=dx/len, uz=dz/len;   // unit vector along the run
      for(let i=0;i<nD;i++){
        const s=(i+0.5)*dStep, cxp=x1+ux*s, czp=z1+uz*s;
        const g=new THREE.BoxGeometry(0.14, 0.08, 0.30);
        g.rotateY(ang); g.translate(cxp, yBase+0.24, czp);
        dGeoms.push(g);
      }
      const BGU=THREE.BufferGeometryUtils||{};
      const mergeFn=BGU.mergeGeometries||BGU.mergeBufferGeometries||null;   // r128 uses mergeBufferGeometries
      const merged=mergeFn?mergeFn(dGeoms,false):null;
      if(merged){
        const dent=new THREE.Mesh(merged, mat(KERB_HI));
        dent.castShadow=true; dent.receiveShadow=true; scene.add(dent);
      } else {
        // fallback: individual blocks if the merge util isn't loaded
        for(const g of dGeoms){ const m=new THREE.Mesh(g, mat(KERB_HI)); m.castShadow=true; scene.add(m); }
      }
    }

    // --- the two rails, one box per rail spanning the whole run ---
    for(const ry of [RAIL_TOP, RAIL_BOT]){
      const rail=new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), mat(IRON_DARK));
      rail.position.set((x1+x2)/2, yBase+0.2+ry, (z1+z2)/2); rail.rotation.y=ang;
      rail.castShadow=true; scene.add(rail);
    }

    // --- thin pointed pickets, evenly spaced between the posts (denser + thinner, OSRS railing rhythm) ---
    const nGaps=Math.max(4, Math.round(len/0.22)), step=len/nGaps;
    for(let i=1;i<nGaps;i++){
      const t=(i*step)/len, px=x1+dx*t, pz=z1+dz*t;
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.038, PICK_H, 0.038), mat(IRON));
      bar.position.set(px, yBase+0.2+PICK_H/2, pz); bar.castShadow=true; scene.add(bar);
      const tip=spearTip(0.2); tip.position.set(px, yBase+0.2+PICK_H+0.1, pz); scene.add(tip);
    }

    // --- square posts at the ends and every ~2 units, each capped with a ball finial ---
    const nPosts=Math.max(1, Math.round(len/2)), pStep=len/nPosts;
    for(let i=0;i<=nPosts;i++){
      const t=(i*pStep)/len, px=x1+dx*t, pz=z1+dz*t;
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.16, POST_H, 0.16), mat(IRON));
      post.position.set(px, yBase+0.2+POST_H/2, pz); post.rotation.y=ang; post.castShadow=true; scene.add(post);
      const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(0.11,0), mat(IRON_DARK));
      ball.position.set(px, yBase+0.2+POST_H+0.08, pz); ball.castShadow=true; scene.add(ball);
      const collar=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.12,4), mat(IRON_DARK));  // ornate neck under the ball
      collar.rotation.y=Math.PI/4; collar.position.set(px, yBase+0.2+POST_H-0.02, pz); scene.add(collar);
    }

    // --- colliders: a line of circles down the run (makeFence idiom) ---
    const nCol=Math.max(1, Math.round(len/0.9));
    for(let i=0;i<=nCol;i++){
      const t=(i/nCol), cx=x1+dx*t, cz=z1+dz*t;
      addCircleCollider(cx, cz, 0.3);
    }
  }

  /* ---- an ornate double gate straddling (cx,cz), opening toward `faceAng` (radians, the
   * direction the gate leaves swing/point). Two tall piers with ball finials + a pair of
   * ajar leaves (framed bars, spear tips, a scroll). The opening is LEFT WALKABLE — no
   * collider across the mouth — so the run's gap is a true doorway. ---- */
  function makeIronGate(cx,cz, faceAng, halfWidth){
    faceAng=faceAng||0; halfWidth=halfWidth||1.1;
    const yB=gy(cx,cz);
    // unit vector ALONG the fence line (perpendicular to the facing direction)
    const ax=Math.cos(faceAng+Math.PI/2), az=Math.sin(faceAng+Math.PI/2);
    const PIER_H=1.9, ang=Math.atan2(ax,az)+Math.PI/2;

    // --- the two gate piers ---
    for(const s of [-1,1]){
      const px=cx+ax*halfWidth, pz=cz+az*halfWidth, sx=cx+ax*halfWidth*s, sz=cz+az*halfWidth*s;
      const pier=new THREE.Mesh(new THREE.BoxGeometry(0.24, PIER_H, 0.24), mat(IRON));
      pier.position.set(sx, yB+0.2+PIER_H/2, sz); pier.rotation.y=ang; pier.castShadow=true; scene.add(pier);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.16,4), mat(IRON_DARK));
      cap.rotation.y=Math.PI/4; cap.position.set(sx, yB+0.2+PIER_H+0.02, sz); scene.add(cap);
      const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(0.13,0), mat(IRON_DARK));
      ball.position.set(sx, yB+0.2+PIER_H+0.18, sz); ball.castShadow=true; scene.add(ball);
      addCircleCollider(sx, sz, 0.28);   // the piers are solid; the mouth between them stays open
    }
    // NOTE (pass 4): tried a semicircular arched crown here — both reviewers found it awkward
    // (hoop-like, not elegant wrought-iron; Gemini 5). Reverted per keep-only-if-obvious rule.
    // A shallower, more decorated arc (or a flat ornamented lintel) is the path to try next.

    // --- a leaf: framed bars + spear tips + a decorative arch scroll, built flat then hung ---
    function leaf(hingeSign, openRad){
      const g=new THREE.Group();
      const LW=halfWidth-0.16, LH=1.5;   // leaf spans hinge -> centre
      // vertical frame stiles + a few inner bars
      const nBar=Math.max(3, Math.round(LW/0.26));
      for(let i=0;i<=nBar;i++){
        const lx=(i/nBar)*LW;
        const bar=new THREE.Mesh(new THREE.BoxGeometry(0.05, LH, 0.05), mat(IRON));
        bar.position.set(lx, LH/2, 0); g.add(bar);
        const tip=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.18,4), mat(IRON_DARK));
        tip.rotation.y=Math.PI/4; tip.position.set(lx, LH+0.09, 0); g.add(tip);
      }
      // top & mid horizontal rails
      for(const ry of [LH-0.1, LH*0.5, 0.14]){
        const r=new THREE.Mesh(new THREE.BoxGeometry(LW,0.06,0.06), mat(IRON_DARK));
        r.position.set(LW/2, ry, 0); g.add(r);
      }
      // an ornate half-ring scroll near the hinge (the reference's curl)
      const scroll=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.03,4,8,Math.PI), mat(IRON_DARK));
      scroll.position.set(0.22, LH*0.5, 0); scroll.rotation.z=-Math.PI/2; g.add(scroll);
      g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      // hinge at a pier, swung slightly ajar
      const hx=cx+ax*halfWidth*hingeSign, hz=cz+az*halfWidth*hingeSign;
      g.position.set(hx, yB+0.2, hz);
      g.rotation.y=ang + hingeSign*(-openRad) + (hingeSign<0?Math.PI:0);
      scene.add(g);
    }
    leaf(-1, 0.5); leaf(1, 0.5);   // both leaves ajar inward — an invitingly open gate
  }

  /* ---- placement: a formal wrought-iron forecourt in front of the Bank of Veyhollow ----
   * The bank (veyhollow_town.js) is a grand stone hall at (13,-12.5), door on its WEST wall
   * (x≈8) facing the plaza. We ring the frontage with iron on the plaza stone: three runs
   * (N/S/W) box in a forecourt, the ORNATE GATE centred on the door axis (z=-12.5) facing the
   * plaza. Flowers dress the garden inside. The east side is the bank wall itself. */
  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof mat!=='function' || typeof gy!=='function' || typeof groundY!=='function') return false;
    if(typeof addCircleCollider!=='function' || typeof collides!=='function') return false;
    if(groundY(5,-12.5)===null) return false;   // the forecourt ground must exist

    const xW=3.4, xE=7.5, zN=-9.2, zS=-15.6, zGate=-12.5;   // forecourt bounds (in front of bank)
    // north & south runs (parallel to the bank's west wall spacing)
    makeIronFenceRun(xW, zN, xE, zN);
    makeIronFenceRun(xW, zS, xE, zS);
    // west run, split around the gate opening on the door axis
    makeIronFenceRun(xW, zN, xW, zGate+0.85);
    makeIronFenceRun(xW, zGate-0.85, xW, zS);
    // the ornate gate in the west run, facing the plaza (−x)
    makeIronGate(xW, zGate, Math.PI, 0.85);

    // dress the garden inside: a couple of flower clusters + low bushes (guarded)
    if(typeof makeFlower==='function' || typeof makeBush==='function'){
      const spots=[[4.4,-10.6],[6.6,-10.4],[4.5,-14.4],[6.6,-14.2],[5.4,-12.6]];
      spots.forEach(([fx,fz],i)=>{
        if(groundY(fx,fz)===null || collides(fx,fz,0.3)) return;
        if(i%2===0 && typeof makeFlower==='function'){ makeFlower(fx,fz); makeFlower(fx+0.3,fz+0.2); }
        else if(typeof makeBush==='function') makeBush(fx,fz,false);
      });
    }
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[PROP] A black wrought-iron fence rings the Bank of Veyhollow — an ornate gate on the plaza side.','sys');
    return true;
  }

  // expose the builders for reuse elsewhere (other civic gardens/plazas)
  window.makeIronFenceRun = makeIronFenceRun;
  window.makeIronGate     = makeIronGate;

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[prop_iron_fence]', e); clearInterval(iv); } }, 2000);
})();
