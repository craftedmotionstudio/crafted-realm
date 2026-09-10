/* ================= WORLD SCATTER PROPS ================= */
/* Small decorative scatter-prop builders, extracted verbatim from game2_world.js
   (zero behaviour change). Each is a pure geometry builder that seats itself on the
   ground via gy(), adds to the scene, and (where solid) registers a collider. All
   dependencies stay global in game2_world.js: mat(), gy(), TEX, procDoorPanel(),
   addCircleCollider(), scene, WORLD. Loaded AFTER game2_world.js; only ever invoked
   at world-build time, so load order is satisfied. */
function makeStick(x,z){
  const g=new THREE.Group();
  const n=1+Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.045,0.7+Math.random()*0.5,4),mat(0x6b4a2f));
    st.rotation.z=Math.PI/2; st.rotation.y=Math.random()*6;
    st.position.set((Math.random()-.5)*0.4, 0.04, (Math.random()-.5)*0.4);
    g.add(st);
    const nub=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.2,4),mat(0x6b4a2f));
    nub.rotation.z=Math.PI/2+0.8; nub.position.set(0.15,0.07,0.05); g.add(nub);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeBush(x,z,dark){
  const g=new THREE.Group();
  // green palette, bottom(darkest) -> top(lightest); dark variant for shade
  const pal=dark?[0x25311f,0x2f4026,0x3a4f2c]:[0x3a5f26,0x4a7a34,0x5c9040];
  // hint of a woody base peeking out under the foliage
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.09,0.2,5),mat(0x5b4128));
  trunk.position.y=0.1; g.add(trunk);
  // layered clustered foliage lobes (offset icosahedrons, mixed tones)
  const R=0.32+Math.random()*0.18;
  const lobes=4+Math.floor(Math.random()*3);
  for(let i=0;i<lobes;i++){
    const t=i/lobes;
    const rad=R*(0.55+Math.random()*0.5);
    const col=pal[Math.min(pal.length-1,Math.floor(t*pal.length+Math.random()*0.6))];
    const lobe=new THREE.Mesh(new THREE.IcosahedronGeometry(rad,0),mat(col));
    const ang=Math.random()*Math.PI*2, spread=R*0.55*Math.random();
    lobe.position.set(Math.cos(ang)*spread, 0.24+t*0.32+Math.random()*0.1, Math.sin(ang)*spread);
    lobe.scale.y=0.8+Math.random()*0.15;
    lobe.rotation.set(Math.random(),Math.random(),Math.random());
    lobe.castShadow=true; g.add(lobe);
  }
  // a scatter of berries / flower dots for colour
  if(Math.random()<0.85){
    const berry=Math.random()<0.5?0xc23a3a:(Math.random()<0.5?0x7a3fb0:0xe8d24a);
    const nb=2+Math.floor(Math.random()*4);
    for(let i=0;i<nb;i++){
      const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.035+Math.random()*0.02,0),mat(berry));
      const ang=Math.random()*Math.PI*2, rr=R*(0.5+Math.random()*0.5);
      b.position.set(Math.cos(ang)*rr, 0.3+Math.random()*0.34, Math.sin(ang)*rr);
      g.add(b);
    }
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
  return g;
}
function makeFlower(x,z){
  // petal + centre colour pairs (a few cheerful variants)
  const variants=[
    {petal:0xe85c5c,center:0xf4d23c},{petal:0xf1c24a,center:0x8a5a1e},
    {petal:0xb56ce8,center:0xf4d23c},{petal:0xffffff,center:0xf4d23c},
    {petal:0xf07ab0,center:0xf4d23c},{petal:0x6aa9e8,center:0xf4d23c}
  ];
  const v=variants[Math.floor(Math.random()*variants.length)];
  const g=new THREE.Group();
  const h=0.24+Math.random()*0.12;
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.02,h,4),mat(0x477a30));
  stem.position.y=h/2; g.add(stem);
  // a leaf or two on the stem
  const nl=1+Math.floor(Math.random()*2);
  for(let i=0;i<nl;i++){
    const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(0.05,0),mat(0x4f8a34));
    leaf.scale.set(1.7,0.22,0.7);
    const ang=Math.random()*Math.PI*2;
    leaf.position.set(Math.cos(ang)*0.05, h*0.4, Math.sin(ang)*0.05);
    leaf.rotation.y=ang; leaf.rotation.z=0.5; g.add(leaf);
  }
  // multi-petal head (ring of flattened petals + a raised centre)
  const head=new THREE.Group(); head.position.y=h+0.02;
  const petals=5+Math.floor(Math.random()*2);
  const pmat=new THREE.MeshPhongMaterial({color:v.petal,flatShading:true,shininess:0,specular:0x000000});
  for(let i=0;i<petals;i++){
    const p=new THREE.Mesh(new THREE.IcosahedronGeometry(0.05,0),pmat);
    p.scale.set(1.5,0.4,0.9);
    const a=i/petals*Math.PI*2;
    p.position.set(Math.cos(a)*0.06,0,Math.sin(a)*0.06); p.rotation.y=-a;
    head.add(p);
  }
  const center=new THREE.Mesh(new THREE.IcosahedronGeometry(0.045,0),
    new THREE.MeshPhongMaterial({color:v.center,flatShading:true,shininess:0,specular:0x000000}));
  center.scale.y=0.6; center.position.y=0.015; head.add(center);
  g.add(head);
  g.position.set(x,gy(x,z),z); g.rotation.y=Math.random()*Math.PI*2; scene.add(g);
  return g;
}
function makeMushroom(x,z){
  const g=new THREE.Group();
  const caps=[0xa83838,0xb85a2a,0xc9a24a,0x8a6a4a];
  const capCol=caps[Math.floor(Math.random()*caps.length)];
  const n=1+Math.floor(Math.random()*3); // small cluster
  for(let i=0;i<n;i++){
    const m=new THREE.Group();
    const s=(i===0?1:0.5+Math.random()*0.4);
    const stemH=0.16*s;
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.035*s,0.055*s,stemH,6),mat(0xe7ddc7));
    stem.position.y=stemH/2; m.add(stem);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.13*s,7,4,0,6.3,0,1.5),mat(capCol));
    cap.position.y=stemH; cap.scale.y=0.85; m.add(cap);
    // lighter gill disc tucked under the cap rim
    const gill=new THREE.Mesh(new THREE.CylinderGeometry(0.11*s,0.09*s,0.03*s,7),mat(0xe0cfae));
    gill.position.y=stemH-0.005; m.add(gill);
    // a few pale spots on the cap
    if(Math.random()<0.7){
      const ns=2+Math.floor(Math.random()*3);
      for(let k=0;k<ns;k++){
        const sp=new THREE.Mesh(new THREE.IcosahedronGeometry(0.018*s,0),mat(0xf2ece0));
        const a=Math.random()*Math.PI*2, rr=0.07*s;
        sp.position.set(Math.cos(a)*rr, stemH+0.055*s, Math.sin(a)*rr); m.add(sp);
      }
    }
    const a=Math.random()*Math.PI*2, rr=(i===0?0:0.1+Math.random()*0.12);
    m.position.set(Math.cos(a)*rr,0,Math.sin(a)*rr);
    m.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    g.add(m);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
  return g;
}
function makeReed(x,z){
  const g=new THREE.Group();
  const green=[0x5d7a3a,0x6b8a42,0x4f6e32];
  const n=5+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){
    const h=0.6+Math.random()*0.7; // varied blade heights
    const col=green[Math.floor(Math.random()*green.length)];
    const blade=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.03,h,4),mat(col));
    const ang=Math.random()*Math.PI*2, rr=Math.random()*0.28;
    const bx=Math.cos(ang)*rr, bz=Math.sin(ang)*rr;
    blade.position.set(bx, h/2, bz);
    const bend=(Math.random()-.5)*0.5;
    blade.rotation.z=bend; blade.rotation.x=(Math.random()-.5)*0.3;
    blade.castShadow=true; g.add(blade);
    // cattail seed head on some of the taller blades
    if(h>0.9 && Math.random()<0.5){
      const topX=bx-Math.sin(bend)*h*0.42;
      const head=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.22,6),mat(0x7a4a24));
      head.position.set(topX, h*0.96, bz); head.rotation.z=bend; g.add(head);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.09,5),mat(0x6b3f1e));
      tip.position.set(topX, h*0.96+0.15, bz); tip.rotation.z=bend; g.add(tip);
    }
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
  return g;
}
function makeCliff(x,z,s){
  const r=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0),
    new THREE.MeshLambertMaterial({map:TEX.stone, color:0xbab2a4}));
  TEX.stone.repeat.set(2,2);
  r.position.set(x, gy(x,z)+s*0.25, z);
  r.scale.y=0.85; r.rotation.y=Math.random()*6;
  r.castShadow=true; r.receiveShadow=true;
  scene.add(r);
  addCircleCollider(x,z,s*0.8);
}
function makeFountain(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.7,0.5,10), new THREE.MeshLambertMaterial({map:TEX.stone}));
  base.position.y=0.25; g.add(base);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,0.22,10), mat(0x8a8478));
  rim.position.y=0.58; g.add(rim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.25,0.1,10),
    new THREE.MeshLambertMaterial({map:TEX.water.clone(), transparent:true, opacity:0.95}));
  water.material.map.needsUpdate=true; water.material.map.repeat.set(2,2);
  WORLD.waterTextures.push(water.material.map);
  water.position.y=0.56; g.add(water);
  const column=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.42,1.5,8), new THREE.MeshLambertMaterial({map:TEX.stone}));
  column.position.y=1.3; g.add(column);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.6,0.35,9), mat(0x9a948a));
  bowl.position.y=2.1; g.add(bowl);
  const bw=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.08,9),
    new THREE.MeshLambertMaterial({map:TEX.water.clone(), transparent:true, opacity:0.95}));
  bw.material.map.needsUpdate=true; bw.material.map.repeat.set(1,1);
  WORLD.waterTextures.push(bw.material.map);
  bw.position.y=2.24; g.add(bw);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.7,7), mat(0x9a948a));
  spire.position.y=2.6; g.add(spire);
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  g.position.set(x,gy(x,z),z); scene.add(g);
  addCircleCollider(x,z,2.8);
  return g;
}
function makeCactus(x,z){
  const g=new THREE.Group();
  const c=0x5a8a3e;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,1.8+Math.random(),7),mat(c));
  trunk.position.y=0.9; trunk.castShadow=true; g.add(trunk);
  for(const s of [-1,1]){
    if(Math.random()<0.3) continue;
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.15,0.8,6),mat(c));
    arm.position.set(s*0.42,1.1,0); arm.castShadow=true; g.add(arm);
    const el=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.45,6),mat(c));
    el.position.set(s*0.42,0.85,0); el.rotation.z=s*Math.PI/2; g.add(el);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
  addCircleCollider(x,z,0.4);
}
function makeHut(x,z,scale){
  scale=scale||1;
  const g=new THREE.Group();
  const wall=new THREE.Mesh(new THREE.CylinderGeometry(2*scale,2.1*scale,2*scale,9),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  wall.position.y=scale; wall.castShadow=true; g.add(wall);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.7*scale,1.8*scale,9),
    new THREE.MeshLambertMaterial({map:TEX.thatch}));
  roof.position.y=2.9*scale; roof.castShadow=true; g.add(roof);
  const door=procDoorPanel(0.9*scale,1.4*scale,0.16);
  door.position.set(0,0.7*scale,2.05*scale); g.add(door);
  const hs=[gy(x-2*scale,z),gy(x+2*scale,z),gy(x,z-2*scale),gy(x,z+2*scale),gy(x,z)];
  const yMin=Math.min(...hs), yMax=Math.max(...hs);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(2.2*scale,2.3*scale,(yMax-yMin)+0.8,9),
    new THREE.MeshLambertMaterial({map:TEX.stone}));
  plinth.position.y=(yMax-yMin)/2-((yMax-yMin)+0.8)/2+0.12;
  g.add(plinth);
  g.position.set(x,yMin,z); scene.add(g);
  addCircleCollider(x,z,2.25*scale);
  return g;
}
function makeAshPile(x,z){
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const p=new THREE.Mesh(new THREE.IcosahedronGeometry(0.25+Math.random()*0.3,0),mat(0x5e5852));
    p.position.set((Math.random()-.5)*0.8,0.12,(Math.random()-.5)*0.8);
    p.rotation.set(Math.random(),Math.random(),Math.random());
    g.add(p);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeTorch(x,z){
  const g=new THREE.Group();
  const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.9,0.1),mat(0x4a3a28));
  post.position.y=0.95; g.add(post);
  const fl=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.35,5),
    new THREE.MeshBasicMaterial({color:0xff9c3e}));
  fl.position.y=2.0; g.add(fl); g.userData.flame=fl;
  g.position.set(x,gy(x,z),z); scene.add(g);
  WORLD.fires.push(g);
  const light=new THREE.PointLight(0xff9c4a,0.6,7); light.position.set(x,2.1+gy(x,z),z); scene.add(light);
}
function makeRowboat(x,z,rot){
  // asset-replacement rule (integration pass 2026-07-06): the RowBoat.jpg reference build
  // (ref_rowboat.js, banked ≥9.0) is the visual for EVERY rowboat when loaded. Same
  // contract as before: positioned at gy, scene-added, returned (harbour callers re-seat
  // the result on the sea plane at y=-1.72 themselves).
  if(typeof makeRefRowboat==='function'){
    const g=makeRefRowboat(x,z,rot||0);
    g.position.y=gy(x,z);
    g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    scene.add(g);
    return g;
  }
  const g=new THREE.Group();
  const hull=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.42,2.6,7,1),mat(0x6b4426));
  hull.rotation.z=Math.PI/2; hull.scale.y=1.4; hull.position.y=0.35; g.add(hull);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.06,5,10),mat(0x4a3422));
  rim.rotation.x=-Math.PI/2; rim.position.y=0.62; rim.scale.x=1.9; g.add(rim);
  g.position.set(x, gy(x,z), z); g.rotation.y=rot||0;
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  scene.add(g);
  return g;
}
