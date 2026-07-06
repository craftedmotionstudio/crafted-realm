/* ============ town_square — the Veyhollow Commons square, Varrock-style ============
 * Pass-014, styled on Bible_References/Town_Square.jpg (the OSRS town square):
 *  - a big IRREGULAR flagstone plaza (organic blob, not a circle) over a dirt fringe,
 *    scattered with pebbles so the ground reads worked, not painted
 *  - the Hollow Well rebuilt as the quatrefoil stone fountain: rough stone ring,
 *    four water basins, a stone cross you can read from the air, statue pillars
 *  - striped-canvas market stalls (the OSRS awning look) replacing the flat canopies
 * NO NPCs — depopulation law (2026-07-03) holds.
 */
(function(){
  const C={x:0, z:-1};                      // the square's heart (the map's centre circle)
  const rnd=i=>Math.abs(Math.sin(i*127.1+13.7)*43758.5453)%1;   // deterministic jitter

  /* ---- an organic ground blob: radius wobbles point to point (never a neat circle),
   * and every rim vertex HUGS the terrain — a blob on a bank drapes down the slope
   * instead of cantilevering out as a floating sheet ---- */
  function blob(x,z,rBase,rJit,color,y,tex,seed){
    const N=26, cy=(gy(x,z)||0), verts=[0,0,0], idx=[];
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2, r=rBase + (rnd(seed+i)-0.5)*2*rJit;
      const px=Math.cos(a)*r, pz=Math.sin(a)*r;
      verts.push(px, (gy(x+px,z+pz)||cy)-cy, pz);
      idx.push(0, ((i+1)%N)+1, i+1);
    }
    // a blob can drape a gentle slope, but nothing readable drapes a cliff — on a
    // steep bank the fan shreds into shards, so skip it there (reeds/stones carry it)
    let lo=1e9, hi=-1e9;
    for(let i=4;i<verts.length;i+=3){ lo=Math.min(lo,verts[i]); hi=Math.max(hi,verts[i]); }
    if(hi-lo>1.1) return null;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color, side:THREE.DoubleSide,
      polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2}));
    m.position.set(x, cy+y, z);
    m.receiveShadow=true; scene.add(m);
    return m;
  }

  /* ---- a striped-canvas market stall (the OSRS awning look) ---- */
  function stripeTex(c1,c2){
    const cv=document.createElement('canvas'); cv.width=64; cv.height=16;
    const g2=cv.getContext('2d');
    for(let i=0;i<8;i++){ g2.fillStyle=(i%2)?c1:c2; g2.fillRect(i*8,0,8,16); }
    const t=new THREE.CanvasTexture(cv);
    t.wrapS=t.wrapT=THREE.RepeatWrapping; t.magFilter=THREE.NearestFilter;
    return t;
  }
  /* the stall model is a PROP PIPELINE asset (Bible_References/Stall.jpg): authored
   * in Blender — tapered posts, planked counter, sagging striped canvas. Loaded once,
   * cloned per stall; the canvas stripes tint to each stall's trade colours. */
  let _stallBase=null, _stallWait=[];
  function withStallModel(cb){
    if(_stallBase){ cb(_stallBase); return; }
    _stallWait.push(cb);
    if(_stallWait.length>1) return;
    new THREE.GLTFLoader().load('assets/models/stall.glb?v=2', gl=>{
      _stallBase=gl.scene;
      _stallWait.forEach(f=>f(_stallBase)); _stallWait=[];
    }, undefined, e=>console.error('[town_square] stall.glb failed', e));
  }
  function makeCanvasStall(x,z,rot,c1,c2,stallKind){
    const g=new THREE.Group();
    const tintC1=new THREE.Color(c1), tintC2=new THREE.Color(c2);
    withStallModel(base=>{
      const inst=base.clone(true);
      inst.traverse(o=>{ if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        // per-stall canvas tint: clone materials so each stall keeps its own stripes
        const mats=(Array.isArray(o.material)?o.material:[o.material]).map(mm=>{
          const c=mm.clone(); c.metalness=0;
          if(/BLUE/i.test(mm.name)){  c.color.copy(tintC2); c.emissive=tintC2.clone().multiplyScalar(0.40); }
          if(/CREAM/i.test(mm.name)){ c.color.copy(tintC1); c.emissive=tintC1.clone().multiplyScalar(0.28); }  // beige, not glowing white
          if(/WOODD/i.test(mm.name)) c.color.setHex(0x7d7040);        // planks must READ as planks
          else if(/WOOD/i.test(mm.name)) c.color.setHex(0x968a4e);    // the reference's muted olive wood
          return c;
        });
        o.material=Array.isArray(o.material)?mats:mats[0];
      }});
      g.add(inst);
    });
    // goods on the counter
    const goods=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.32,0.55), new THREE.MeshLambertMaterial({color:0xc9a85a}));
    goods.position.set(-0.6,1.02,0); g.add(goods);
    const goods2=new THREE.Mesh(new THREE.IcosahedronGeometry(0.24,0), new THREE.MeshLambertMaterial({color:0x7a9a4a}));
    goods2.position.set(0.55,1.05,0.15); g.add(goods2);
    const goods3=new THREE.Mesh(new THREE.SphereGeometry(0.17,6,5), new THREE.MeshLambertMaterial({color:0xb05a3a}));
    goods3.position.set(0.1,1.0,-0.35); g.add(goods3);
    g.position.set(x, gy(x,z), z); g.rotation.y=rot||0;
    if(stallKind && typeof STALL_KINDS!=='undefined'){
      g.userData={kind:'stall', stall:stallKind, restock:0,
        label:'Steal from <b>'+(STALL_KINDS[stallKind]?STALL_KINDS[stallKind].label:'stall')+'</b>'};
      WORLD.clickables.push(g);
      WORLD.stalls=WORLD.stalls||[]; WORLD.stalls.push(g);
    }
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    scene.add(g);
    WORLD.colliders.push({type:'rect', x, z, hw:1.4, hd:0.85});
    return g;
  }

  /* ---- the quatrefoil fountain: the Hollow Well — the first PROP PIPELINE asset
   * (PIPELINES.md): concept v03 (two-reviewer 9/9) → Hunyuan mesh → Blender cleanup
   * (6k tris flat-shaded, engine-matched raw-sRGB stone/water) → fountain.glb.
   * Colliders stay authored here; the GLB is the visual only. ---- */
  function fountain(x,z){
    const base=gy(x,z)||0;
    const g=new THREE.Group(); g.position.set(x,base,z);
    const loader=new THREE.GLTFLoader();
    loader.load('assets/models/fountain.glb?v=2', gltf=>{
      const m=gltf.scene;
      // the GLB carries geometry only — dress it in the GAME'S materials so it sits in
      // the world instead of on it: textured stone like the walls, SCROLLING water
      // like every other pool (user critique 2026-07-03: pale + dead water)
      const stoneTex=TEX.stone.clone(); stoneTex.needsUpdate=true;
      stoneTex.wrapS=stoneTex.wrapT=THREE.RepeatWrapping; stoneTex.repeat.set(3,3);
      const stoneMat=new THREE.MeshLambertMaterial({map:stoneTex, color:0xb6b0a4});   // matches the town wall masonry
      const waterTex=TEX.water.clone(); waterTex.needsUpdate=true;
      waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping; waterTex.repeat.set(2.2,2.2);
      WORLD.waterTextures.push(waterTex);                 // the world tick scrolls it
      const waterMat=new THREE.MeshLambertMaterial({map:waterTex, color:0x9fd0e8});
      m.traverse(o=>{ if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        // Hunyuan shape meshes have no UVs — project from above so textures land
        if(!o.geometry.attributes.uv){
          const pos=o.geometry.attributes.position, uv=new Float32Array(pos.count*2);
          for(let i=0;i<pos.count;i++){ uv[i*2]=(pos.getX(i)/6.8+0.5)*3; uv[i*2+1]=(pos.getZ(i)/6.8+0.5)*3; }
          o.geometry.setAttribute('uv', new THREE.BufferAttribute(uv,2));
        }
        const n=(o.material&&o.material.name)||'';
        o.material=/WATER/i.test(n)?waterMat:stoneMat;
      }});
      g.add(m);
    }, undefined, err=>{ console.error('[town_square] fountain.glb failed to load', err); });
    scene.add(g);
    // block the basin (players walk the plaza around it, like the reference)
    for(const [qx,qz] of [[1.7,1.7],[-1.7,1.7],[1.7,-1.7],[-1.7,-1.7]])
      WORLD.colliders.push({type:'rect', x:x+qx*0.82, z:z+qz*0.82, hw:1.45, hd:1.45});
    WORLD.colliders.push({type:'rect', x, z, hw:1.1, hd:1.1});
    // never leave anyone STANDING in the basin (old saves/respawns predate the
    // fountain) — step them out to the plaza on its west side
    if(typeof player!=='undefined' && player &&
       Math.hypot(player.position.x-x, player.position.z-z)<4.8){
      const sx=x-8, sz=z+1;
      player.position.set(sx, (groundY(sx,sz)||0), sz);
    }
    return g;
  }

  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof gy!=='function' || typeof groundY!=='function') return false;
    if(typeof TEX==='undefined' || !TEX.stone) return false;

    /* ---- the ground: dirt fringe under an organic PALE GREY expanse (the reference
     * plaza is smooth light stone, not brick courses — flat colour + scattered laid
     * slabs reads far closer than any brown-hued texture) ---- */
    blob(C.x, C.z, 16.8, 2.0, 0x8f7f62, 0.03, null, 3);            // trodden dirt, feathering into the grass
    blob(C.x, C.z, 14.6, 2.2, 0x878580, 0.055, null, 17);          // worn grey stone, LAPPING AT THE DOORSTEPS
    // tendrils: the stone sprawls amoeba-like out toward the gates — an old square
    // grown over the roads, never a neat contained oval
    const TENDRILS=[[0,-13,5.6],[2,-19,4.0],[9,5,5.0],[15,1,3.6],[-10,-8,4.6],[-15,-4,3.4],[-2,11,4.8],[-6,16,3.5]];
    TENDRILS.forEach(([tx,tz,tr],i)=>{
      blob(C.x+tx, C.z+tz, tr+0.9, tr*0.22, 0x8f7f62, 0.026+i*0.0008, null, 950+i*17);
      blob(C.x+tx, C.z+tz, tr,     tr*0.20, 0x878580, 0.046+i*0.0008, null, 990+i*23);
    });
    // subtle mottling — broad soft-grey patches, never floating squares
    for(let i=0;i<7;i++){
      const a=rnd(i+500)*Math.PI*2, r=2.2+rnd(i+600)*9.5;
      blob(C.x+Math.cos(a)*r, C.z+Math.sin(a)*r, 1.5+rnd(i+40)*1.8, 0.7,
        [0x807e79,0x8d8b85,0x7b7974][i%3], 0.062+i*0.0015, null, 900+i*31);
    }
    // pebbles scattered right out onto the fringes
    for(let i=0;i<52;i++){
      const a=rnd(i+200)*Math.PI*2, r=1.5+rnd(i+300)*14.0;
      const px=C.x+Math.cos(a)*r, pz=C.z+Math.sin(a)*r;
      if(groundY(px,pz)===null) continue;
      const s=0.1+rnd(i+400)*0.16;
      const peb=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),
        new THREE.MeshLambertMaterial({color:[0x9a968e,0x87837b,0xa8a49c][i%3]}));
      peb.scale.y=0.45;
      peb.position.set(px,(gy(px,pz)||0)+0.05,pz);
      peb.rotation.y=rnd(i)*3; scene.add(peb);
    }
    // grass tufts breaking the plaza's rim so stone and green interleave, not butt-join
    for(let i=0;i<30;i++){
      const a=rnd(i+700)*Math.PI*2, r=12.6+rnd(i+800)*4.2;
      const px=C.x+Math.cos(a)*r, pz=C.z+Math.sin(a)*r;
      if(groundY(px,pz)===null || groundY(px,pz)<-0.6) continue;
      const tuft=new THREE.Mesh(new THREE.IcosahedronGeometry(0.16+rnd(i+40)*0.14,0),
        new THREE.MeshLambertMaterial({color:(i%2)?0x5a7a3a:0x6a8a42}));
      tuft.scale.y=0.6;
      tuft.position.set(px,(gy(px,pz)||0)+0.08,pz);
      scene.add(tuft);
    }

    /* ---- the fountain (the Hollow Well, in stone) ---- */
    fountain(C.x, C.z);

    /* ---- rung 4 (pass 015): terrain & transitions ---- */
    // gate aprons: the roads flow THROUGH the wall — worn dirt through each gate
    // and a spill of plaza stone just inside, so road, gate and square knit together
    for(let i=0;i<28;i++){
      const a=i/28*Math.PI*2, gx2=Math.cos(a)*26, gz2=Math.sin(a)*26;
      if(typeof pathDist!=='function' || pathDist(gx2,gz2)>=3.6) continue;
      const g0=groundY(gx2,gz2); if(g0===null || g0<-0.8) continue;
      blob(gx2, gz2, 3.8, 0.55, 0x84744f, 0.027, null, 1200+i*13);   // road-toned, soft-lobed
      blob(gx2*0.86, gz2*0.86, 2.6, 0.5, 0x878580, 0.049, null, 1300+i*17);
    }
    // the pond shore: the in-ring water gets a sandy lip, reed clumps in the
    // shallows and shore stones — never a bare grass funnel into the blue
    const shore=[];
    for(let tx=-6;tx<=12;tx++) for(let tz=13;tz<=26;tz++){
      const sx=tx+0.5, sz=tz+0.5;
      const g0=groundY(sx,sz);
      if(g0===null || g0<-0.9) continue;                        // land only (groundY returns DEPTH for water, null only off-map)
      if(Math.hypot(sx-C.x, sz-C.z)>27.5) continue;             // stay by the town
      const wn=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx2,dz2])=>{
        const gn=groundY(sx+dx2*1.2, sz+dz2*1.2); return gn!==null && gn<-1.5; });
      if(wn.length) shore.push([sx,sz,wn[0]]);
    }
    shore.forEach(([sx,sz,dir],i)=>{
      if(i%2===0) blob(sx, sz, 0.85, 0.3, 0xa8946e, 0.024+(i%5)*0.0006, null, 1500+i*7);   // muddy sand lip
      if(i%3===0){                                              // a reed clump in the shallows
        for(let k=0;k<4;k++){
          const rx=sx+dir[0]*(1.2+rnd(i*9+k)*1.1)+(rnd(i+k*3)-0.5)*0.9;
          const rz=sz+dir[1]*(1.2+rnd(i*7+k)*1.1)+(rnd(i*5+k)-0.5)*0.9;
          let gb=gy(rx,rz); if(gb>-1.1) continue;               // past the bank crest only
          gb=Math.min(gb,-1.6);                                 // rooted at least at the waterline
          const hgt=(-1.55-gb)+0.75+rnd(i+k)*0.5;               // clears the surface by a head
          const reed=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,hgt,4),
            new THREE.MeshLambertMaterial({color:0x5f7a3d}));
          reed.position.set(rx, gb+hgt/2, rz); scene.add(reed);
          const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.22,4),
            new THREE.MeshLambertMaterial({color:0x6b4a2f}));
          tip.position.set(rx, gb+hgt-0.05, rz); scene.add(tip);
        }
      }
      if(i%4===1){                                              // a weathered shore stone
        const st=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22+rnd(i+60)*0.16,0),
          new THREE.MeshLambertMaterial({color:(i%2)?0x8e8a82:0x9a968e}));
        st.scale.y=0.6;
        st.position.set(sx-dir[0]*0.5, (gy(sx,sz)||0)+0.08, sz-dir[1]*0.5);
        st.rotation.y=rnd(i)*3; scene.add(st);
      }
    });

    /* ---- rung 5 (pass 016): lighting & atmosphere ---- */
    // wrought lamp posts ringing the plaza — warm emissive lanterns pooling amber
    // light on the stone (the game's torch idiom: emissive + glow decal, no real lights)
    function lampPost(x,z){
      const base=gy(x,z)||0;
      const g=new THREE.Group(); g.position.set(x,base,z);
      const iron=new THREE.MeshLambertMaterial({color:0x2e2a26});
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,2.7,5), iron);
      post.position.y=1.35; post.castShadow=true; g.add(post);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.07,0.07), iron);
      arm.position.set(0.2,2.62,0); g.add(arm);
      const cage=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,0.3),
        new THREE.MeshLambertMaterial({color:0x3a342c}));
      cage.position.set(0.42,2.4,0); g.add(cage);
      const flame=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.28,0.2),
        new THREE.MeshLambertMaterial({color:0xffdf9a, emissive:0xc98a2a}));
      flame.position.set(0.42,2.4,0); g.add(flame);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(0.26,0.2,4), iron);
      cap.rotation.y=Math.PI/4; cap.position.set(0.42,2.66,0); g.add(cap);
      // the amber pool on the stone below
      const glow=new THREE.Mesh(new THREE.CircleGeometry(1.5,12),
        new THREE.MeshBasicMaterial({color:0xffc46a, transparent:true, opacity:0.2,
          polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3}));
      glow.rotation.x=-Math.PI/2; glow.position.set(0.42,0.085,0); g.add(glow);
      scene.add(g);
      WORLD.colliders.push({type:'circle', x, z, r:0.28});
      return g;
    }
    // ring the plaza where the ground is clear — probed, spread, deterministic
    let placed=0;
    for(let i=0;i<24 && placed<6;i++){
      const a=(i/24)*Math.PI*2 + 0.26, r=7.4+((i%3)*0.9);
      const lx=C.x+Math.cos(a)*r, lz=C.z+Math.sin(a)*r;
      if(typeof collides==='function' && collides(lx,lz,0.9)) continue;
      if(typeof pathDist==='function' && pathDist(lx,lz)<0.9) continue;
      const gl=groundY(lx,lz); if(gl===null||gl<-0.6) continue;
      if(i>0 && placed>0 && (i%4)!==0) continue;                 // spread them round the ring
      lampPost(lx,lz); placed++;
    }

    /* ---- the market: the Bible_References stall builds replace the canvas-stall GLBs
     * (integration pass 2026-07-06 — gem/cake/fur banked ≥9.0 vs Gem_Stall.jpg /
     * Cake_Stall.jpg / EmptyStall+FurStall.jpg). The makeRefX stalls self-register an
     * axis-aligned footprint collider; rotated ones get the swapped-axis rect added. ---- */
    const stallAt=(fn,x,z,rot)=>{ if(typeof window[fn]!=='function') return false;
      const s=window[fn](x,z,rot); s.position.y=gy(x,z)||0; scene.add(s); return true; };
    if(!stallAt('makeRefGemStall', -4.2,-8.6, 0.12))
      makeCanvasStall(-4.2,-8.6, 0.12, '#d8cdaa','#2a6a96', 'silver');
    if(!stallAt('makeRefCakeStall', 4.2,-8.6,-0.1))
      makeCanvasStall( 4.2,-8.6,-0.1, '#e0d8c2','#a83a48', 'baker');
    if(stallAt('makeRefFurStall', -7.6,-3.2, Math.PI/2+0.08))
      WORLD.colliders.push({type:'rect', x:-7.6, z:-3.2, hw:1.3, hd:2.1});   // swapped-axis block for the rotated stall
    else makeCanvasStall(-7.6,-3.2, Math.PI/2+0.08, '#dcd8c6','#47763c');
    // the General Store stall (net-new, mirrors the fur stall across the south road)
    if(!(typeof collides==='function' && collides(7.6,-3.2,1.3)) && stallAt('makeRefStore', 7.6,-3.2, -Math.PI/2+0.08))
      WORLD.colliders.push({type:'rect', x:7.6, z:-3.2, hw:1.3, hd:2.1});
    if(typeof CollisionGrid!=='undefined' && CollisionGrid.baked)
      for(const [rx,rz] of [[-4.2,-8.6],[4.2,-8.6],[-7.6,-3.2],[7.6,-3.2]]) CollisionGrid.rebakeArea(rx,rz,4);
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[town_square]', e); clearInterval(iv); } }, 1900);
})();
