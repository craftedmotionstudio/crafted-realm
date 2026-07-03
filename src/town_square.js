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

  /* ---- an organic ground blob: radius wobbles point to point (never a neat circle) ---- */
  function blob(x,z,rBase,rJit,color,y,tex,seed){
    const shape=new THREE.Shape(); const N=26;
    for(let i=0;i<=N;i++){
      const a=i/N*Math.PI*2, r=rBase + (rnd(seed+i%N)-0.5)*2*rJit;
      const px=Math.cos(a)*r, pz=Math.sin(a)*r;
      if(i===0) shape.moveTo(px,pz); else shape.lineTo(px,pz);
    }
    const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),
      new THREE.MeshLambertMaterial({color, map:tex||null,
        polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2}));
    m.rotation.x=-Math.PI/2;
    m.position.set(x, (gy(x,z)||0)+y, z);
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
  function makeCanvasStall(x,z,rot,c1,c2,stallKind){
    const g=new THREE.Group();
    const wood=new THREE.MeshLambertMaterial({color:0x8a6a44});
    const table=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.16,1.5), wood);
    table.position.y=0.78; table.castShadow=true; g.add(table);
    const skirt=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.62,1.4),
      new THREE.MeshLambertMaterial({color:0x6b4a2f}));
    skirt.position.y=0.4; g.add(skirt);
    for(const [sx,sz] of [[-1.2,-0.65],[1.2,-0.65],[-1.2,0.65],[1.2,0.65]]){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,5), wood);
      post.position.set(sx,1.1,sz); g.add(post);
    }
    // the striped canvas: two gathered slopes meeting at a ridge, hems sagging past the posts
    const canvas=new THREE.MeshLambertMaterial({map:stripeTex(c1,c2), side:THREE.DoubleSide});
    for(const s of [-1,1]){
      const slope=new THREE.Mesh(new THREE.BoxGeometry(3.1,0.07,1.14), canvas);
      slope.rotation.x=s*0.5;
      slope.position.set(0, 2.42, s*0.5);
      slope.castShadow=true; g.add(slope);
    }
    const hemMat=new THREE.MeshLambertMaterial({map:stripeTex(c1,c2)});
    for(const s of [-1,1]){
      const hem=new THREE.Mesh(new THREE.BoxGeometry(3.1,0.34,0.06), hemMat);
      hem.position.set(0, 2.05, s*1.02); g.add(hem);
    }
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

  /* ---- the quatrefoil fountain: the Hollow Well, rebuilt in stone ---- */
  function fountain(x,z){
    const base=gy(x,z)||0;
    const g=new THREE.Group(); g.position.set(x,base,z);
    const R=3.3;
    const stone =new THREE.MeshLambertMaterial({map:(typeof TEX!=='undefined'&&TEX.stone)||null, color:0xa8a49c});
    const stoneD=new THREE.MeshLambertMaterial({map:(typeof TEX!=='undefined'&&TEX.stone)||null, color:0x8e8a82});
    // rough outer ring: fat rounded blocks, sizes and radii jittered
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2, r=R+(rnd(i+40)-0.5)*0.36;
      const s=0.62+rnd(i+80)*0.34;
      const b=new THREE.Mesh(new THREE.BoxGeometry(s,0.55+rnd(i)*0.25,s), (i%3)?stone:stoneD);
      b.position.set(Math.cos(a)*r, 0.28, Math.sin(a)*r);
      b.rotation.y=rnd(i+7)*0.8;
      b.castShadow=true; g.add(b);
    }
    // the water, sitting low inside the ring — flat OSRS blue, unlit so it never blows white
    const waterMat=new THREE.MeshBasicMaterial({color:0x7db4d8});
    const water=new THREE.Mesh(new THREE.CircleGeometry(R-0.28, 20), waterMat);
    water.rotation.x=-Math.PI/2; water.position.y=0.34; g.add(water);
    // the stone cross over the water (reads from the air exactly like the reference)
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const arm=new THREE.Mesh(new THREE.BoxGeometry(dx?R:0.95, 0.26, dz?R:0.95), stone);
      arm.position.set(dx*R/2, 0.5, dz*R/2); arm.castShadow=true; g.add(arm);
      // a worn statue pillar where each arm meets the ring
      const pil=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.95,0.3), stoneD);
      pil.position.set(dx*(R-0.15), 1.0, dz*(R-0.15)); pil.castShadow=true; g.add(pil);
      const head=new THREE.Mesh(new THREE.IcosahedronGeometry(0.16,0), stoneD);
      head.position.set(dx*(R-0.15), 1.58, dz*(R-0.15)); g.add(head);
    }
    // the centre: pedestal, bowl and a low jet column
    const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.0,0.6,8), stone);
    ped.position.y=0.62; ped.castShadow=true; g.add(ped);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.5,0.3,8), stoneD);
    bowl.position.y=1.05; g.add(bowl);
    const bowlWater=new THREE.Mesh(new THREE.CircleGeometry(0.6,10),
      new THREE.MeshBasicMaterial({color:0x8cc0de}));
    bowlWater.rotation.x=-Math.PI/2; bowlWater.position.y=1.21; g.add(bowlWater);
    const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,0.85,6),
      new THREE.MeshBasicMaterial({color:0xa8d2e8}));
    jet.position.y=1.6; g.add(jet);
    scene.add(g);
    // block the basin (players walk the plaza around it, like the reference)
    for(const [qx,qz] of [[1.7,1.7],[-1.7,1.7],[1.7,-1.7],[-1.7,-1.7]])
      WORLD.colliders.push({type:'rect', x:x+qx*0.82, z:z+qz*0.82, hw:1.45, hd:1.45});
    WORLD.colliders.push({type:'rect', x, z, hw:1.1, hd:1.1});
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

    /* ---- the market: striped awnings round the south side, like the reference ---- */
    makeCanvasStall(-4.2,-8.6, 0.12, '#b8bdc4','#3a6ab0', 'silver');   // blue-white: the silver stall
    makeCanvasStall( 4.2,-8.6,-0.1, '#c9cdd2','#b03a4a', 'baker');     // red-white: the baker
    makeCanvasStall(-7.6,-3.2, Math.PI/2+0.08, '#c4c9be','#4a7a3a');   // green-white: produce awning
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[town_square]', e); clearInterval(iv); } }, 1900);
})();
