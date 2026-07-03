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
  const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4+Math.random()*0.25,0),
    mat(dark?0x33402c:0x4a7a34));
  b.position.y=0.3; b.scale.y=0.75; b.castShadow=true; g.add(b);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeFlower(x,z){
  const cols=[0xe85c5c,0xe8c45a,0xb05ce8,0xffffff];
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.28,3),mat(0x4a7a34));
  stem.position.y=0.14; g.add(stem);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(0.07,0),
    new THREE.MeshBasicMaterial({color:cols[Math.floor(Math.random()*4)]}));
  head.position.y=0.3; g.add(head);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeMushroom(x,z){
  const g=new THREE.Group();
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.2,5),mat(0xd8ccb4));
  stem.position.y=0.1; g.add(stem);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,4,0,6.3,0,1.4),mat(0xa83838));
  cap.position.y=0.2; g.add(cap);
  g.position.set(x,gy(x,z),z); scene.add(g);
}
function makeReed(x,z){
  const g=new THREE.Group();
  for(let i=0;i<3;i++){
    const r=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.7+Math.random()*0.4,3),mat(0x5d7a3a));
    r.position.set((Math.random()-.5)*0.25, 0.4, (Math.random()-.5)*0.25);
    r.rotation.z=(Math.random()-.5)*0.2; g.add(r);
  }
  g.position.set(x,gy(x,z),z); scene.add(g);
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
