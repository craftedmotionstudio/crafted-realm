/* ============ tut_bld_chef — the Tutorial Island CHEF'S KITCHEN ============
 * A characterful cottage, NOT a plain box: a proven Buildkit.house stone shell
 * dressed with a working-kitchen silhouette — a big stone OVEN + smoking chimney
 * stack, a striped serving-hatch AWNING, a hanging loaf "Kitchen" sign, a wooden
 * LEAN-TO wing, barrels/sacks/woodpile/chopping-block out front, herb PLANTERS
 * under the windows and a warm hanging lantern by the door.
 *
 * Warm low-poly flat-shaded, 1 unit = 1 tile. Base grey stone (0x9a9a92) + gold
 * shingle roof (shell), warm wood + red/cream cloth for the kitchen character.
 *
 * window.makeChefKitchen(x, z, rot=0) — shell is axis-aligned (door on S/+z, the
 * serving side); every character piece hangs off ONE parent group rotated by rot
 * about (x,z), so the serving side + door face out. Returns that character group.
 *
 * Global deps (all defined before this file loads): THREE, Buildkit, makeBuilding
 * (via Buildkit.house), gy(), mat(), addCircleCollider(), scene.
 * CSP-safe: the sign uses an in-page <canvas> texture, no external assets.
 */
(function(){
  const STONE=0x9a9a92, OVEN=0x8a8378, WOOD=0x7a5a34, WOOD_D=0x5a4028,
        IRON=0x33333a, RED=0xb04a3a, CREAM=0xe0d8c2, HERB=0x5a8a3a, SACK=0xcdbd94;
  // flat-shaded matte material (reuse the engine's mat() so props match world-wide)
  const M=(typeof mat==='function')?mat
    :(c=>new THREE.MeshPhongMaterial({color:c,flatShading:true,shininess:0,specular:0x000000}));
  const ST=c=>(Buildkit&&Buildkit._stone)?Buildkit._stone(c):M(c);   // textured stone, shell-matching
  const BGU=THREE.BufferGeometryUtils||{};
  const mergeFn=BGU.mergeGeometries||BGU.mergeBufferGeometries||null;   // r128 = mergeBufferGeometries
  const merge=(geoms,m)=>new THREE.Mesh(mergeFn?mergeFn(geoms,false):geoms[0], m);

  /* a loaf + "Kitchen" painted on a board (canvas texture, no external file) */
  function signTex(){
    const c=document.createElement('canvas'); c.width=256; c.height=128;
    const g=c.getContext('2d');
    g.fillStyle='#e8dcc0'; g.fillRect(0,0,256,128);                      // board
    g.fillStyle='#c48a4a'; g.beginPath(); g.ellipse(60,64,46,30,0,0,Math.PI*2); g.fill();  // loaf
    g.strokeStyle='#8a5a2a'; g.lineWidth=4;
    for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(60+i*14,42); g.lineTo(60+i*14,86); g.stroke(); }  // scoring
    g.fillStyle='#3a2a1a'; g.font='bold 40px Georgia,serif'; g.textAlign='center';
    g.fillText('Kitchen',168,78);
    const t=new THREE.CanvasTexture(c); t.needsUpdate=true; return t;
  }

  /* merged stack of horizontal logs (axis along X, ends facing ±X) */
  function woodpile(){
    const geoms=[]; let yy=0.17;
    [4,3,2,1].forEach(n=>{ for(let i=0;i<n;i++){
      const g=new THREE.CylinderGeometry(0.14,0.14,1.1,6); g.rotateZ(Math.PI/2);
      g.translate((i-(n-1)/2)*0.31, yy, 0); geoms.push(g); } yy+=0.27; });
    return merge(geoms, M(WOOD));
  }
  /* merged pile of flour sacks (squashed spheres) */
  function sacks(){
    const geoms=[]; [[0,0.30,0.30],[0.36,0,0.28],[0.18,0.36,0.26],[-0.28,0.08,0.27]]
      .forEach(([dx,dz,r])=>{ const g=new THREE.SphereGeometry(r,6,5); g.scale(1,1.35,1);
        g.translate(dx, r*1.15, dz); geoms.push(g); });
    return merge(geoms, M(SACK));
  }
  /* herb planter: wood trough + one merged clump of leafy cubes */
  function planter(w){
    const g=new THREE.Group();
    const box=new THREE.Mesh(new THREE.BoxGeometry(w,0.3,0.34), M(WOOD_D)); box.position.y=0.15; g.add(box);
    const geoms=[], n=Math.max(3,Math.round(w/0.22));
    for(let i=0;i<n;i++){ const s=0.15+((i*37)%5)*0.02; const gg=new THREE.BoxGeometry(s,s,s);
      gg.translate((i-(n-1)/2)*(w/n), 0.34+((i*7)%3)*0.03, ((i%2)-0.5)*0.12); geoms.push(gg); }
    g.add(merge(geoms, M(HERB)));
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); return g;
  }
  /* chopping block: a log stump with an axe buried in the top */
  function choppingBlock(){
    const g=new THREE.Group();
    const stump=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.35,0.62,9), M(WOOD)); stump.position.y=0.31; g.add(stump);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.33,0.05,9), M(0x9a7a54)); top.position.y=0.63; g.add(top);
    const helve=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.5,0.05), M(WOOD_D)); helve.position.set(0.1,0.85,0); helve.rotation.z=0.35; g.add(helve);
    const head=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.14,0.22), M(0x6a6a72)); head.position.set(0.02,1.05,0); head.rotation.z=0.35; g.add(head);
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); return g;
  }
  /* striped market-style awning that slopes out+down over the serving hatch */
  function awning(width){
    const g=new THREE.Group(), n=Math.max(4,Math.round(width/0.32)), sw=width/n;
    for(let i=0;i<n;i++){
      const s=new THREE.Mesh(new THREE.BoxGeometry(sw*0.99,0.05,1.5), M((i%2)?CREAM:RED));
      s.position.set(-width/2+sw*(i+0.5),0,0); s.castShadow=true; g.add(s);
      const v=new THREE.Mesh(new THREE.ConeGeometry(sw*0.52,0.24,3), M((i%2)?RED:CREAM));  // scalloped valance
      v.rotation.x=Math.PI; v.rotation.y=Math.PI/2; v.position.set(-width/2+sw*(i+0.5),-0.02,0.78); g.add(v);
    }
    return g;
  }

  window.makeChefKitchen=function(x,z,rot){
    rot=rot||0;
    const W=13, D=10, H=(Buildkit&&Buildkit.STOREY_H)||3.2;   // larger kitchen (was 11x9)
    const hw=W/2, hd=D/2;   // 6.5, 5.0 — wall faces (every prop is placed off these)

    // 1) functional shell — proven cottage generator (walls/door/windows/colliders/roof)
    //    interior:'house' furnish dropped — bespoke working-kitchen interior added below
    Buildkit.house({x,z,w:W,d:D,floors:1,doorSide:'S',color:STONE,roofColor:0x8f8f88,
      shellOpts:{wall:'stone'}, roof:'gable'});

    // 2) character group: local frame with +z = South = serving/door side, +x = East.
    // Parenting every piece to a group at (x,gy(x,z),z) rotated by rot rotates them
    // ALL about (x,z) at once (step 3), and seats them on the ground.
    const baseY=(typeof gy==='function')?gy(x,z):0;
    const G=new THREE.Group(); G.position.set(x,baseY,z); G.rotation.y=rot;
    const add=(m,dx,dy,dz)=>{ m.position.set(dx,dy,dz); m.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(m); return m; };
    // rotated-world circle collider for a local (dx,dz) — keeps solid props solid at any rot
    const cos=Math.cos(rot), sin=Math.sin(rot);
    const wc=(dx,dz,r)=>{ if(typeof addCircleCollider==='function') addCircleCollider(x+cos*dx+sin*dz, z-sin*dx+cos*dz, r); };

    // --- BIG stone OVEN + smoking chimney stack, against the East wall (+x) ---
    const ox=hw+0.35, oz=1.0;                                        // oven base centre (just proud of the east wall)
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5,1.75,1.7), ST(OVEN)), ox,0.88,oz);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.66,0.16,1.86), ST(0x6e6a64)), ox,1.8,oz);   // oven shelf/lip
    // arched fire mouth facing front (+z): dark recess + ember glow + flame + heat light
    add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.62,0.18), M(0x140f0a)), ox,0.55,oz+0.86);
    const ember=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.4,0.08), new THREE.MeshBasicMaterial({color:0xff6a1a}));
    add(ember, ox,0.5,oz+0.9);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.2,0.42,5), new THREE.MeshBasicMaterial({color:0xf07818})), ox,0.6,oz+0.86);
    const glow=new THREE.PointLight(0xff8a3a,0.8,6); glow.position.set(ox,0.7,oz+1.1); G.add(glow);
    // the chimney: a tapering stone column rising past the roof, with a cap
    add(new THREE.Mesh(new THREE.BoxGeometry(0.78,3.0,0.78), ST(0x807a72)), ox,3.35,oz-0.45);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.94,0.18,0.94), M(0x6e6a64)), ox,4.9,oz-0.45);
    // a small SMOKE plume: a few translucent grey puffs drifting up off the cap
    const smokeMat=new THREE.MeshLambertMaterial({color:0xb8b4ac,transparent:true,opacity:0.5,depthWrite:false});
    for(let i=0;i<5;i++){ const p=new THREE.Mesh(new THREE.IcosahedronGeometry(0.2+i*0.07,0), smokeMat);
      p.position.set(ox+Math.sin(i*1.7)*0.22, 5.1+i*0.45, oz-0.45+Math.cos(i*1.3)*0.18); G.add(p); }
    wc(ox,oz,1.05);

    // --- wooden LEAN-TO kitchen wing off the West wall (-x), mono-pitch shed roof ---
    const lxWall=-(hw-0.1), lxOut=lxWall-1.8, lxMid=(lxWall+lxOut)/2;  // wall face -> outer post line (off new west wall)
    for(const pz of [-2.0,1.1]){                                     // two outer posts
      add(new THREE.Mesh(new THREE.BoxGeometry(0.16,2.15,0.16), M(WOOD_D)), lxOut,1.07,pz); wc(lxOut,pz,0.2); }
    const leanRoof=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.12,3.6), M(0x6e4a2c));
    leanRoof.position.set(lxMid,2.28,-0.4); leanRoof.rotation.z=-0.42;   // slopes down away from the wall
    add(leanRoof,lxMid,2.28,-0.4);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.95,0.1,0.12), M(WOOD_D)), lxMid,1.72,-2.2);  // eave beam (front)
    // under the wing: a prep counter + a barrel + the woodpile + hanging herbs
    add(Buildkit.furniture.counter(Buildkit), lxOut+0.7,0,-1.4); wc(lxOut+0.7,-1.4,0.5);
    add(Buildkit.furniture.barrel(Buildkit), lxOut+0.55,0,0.7); wc(lxOut+0.55,0.7,0.35);
    add(woodpile(), lxMid,0,-0.4);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.9,5), M(WOOD)), lxMid-0.1,1.9,-1.4).rotation.x=Math.PI/2;  // herb-drying pole

    // --- striped AWNING over a serving HATCH on the front (S/+z) wall, right of the door ---
    const hx=2.2, wallZ=hd;                                          // hatch centre (right of door, clear of door path) / front wall face
    add(new THREE.Mesh(new THREE.BoxGeometry(1.9,0.14,0.55), M(0x9a7a54)), hx,1.12,wallZ+0.28);   // serving counter ledge
    for(const s of [-1,1]){ add(new THREE.Mesh(new THREE.BoxGeometry(0.12,1.5,0.12), M(WOOD_D)), hx+s*0.9,1.25,wallZ+0.05); }  // hatch jambs
    add(new THREE.Mesh(new THREE.BoxGeometry(1.95,0.14,0.14), M(WOOD_D)), hx,2.0,wallZ+0.05);     // hatch lintel
    // a couple of loaves on the counter (small goods)
    add(new THREE.Mesh(new THREE.SphereGeometry(0.16,7,5), M(0xc48a4a)), hx-0.5,1.28,wallZ+0.28);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.15,7,5), M(0xcf9a58)), hx+0.4,1.28,wallZ+0.32);
    const aw=awning(2.3); aw.position.set(hx,2.55,wallZ+0.05); aw.rotation.x=-0.5; add(aw,hx,2.55,wallZ+0.05);

    // --- hanging loaf "Kitchen" SIGN on an iron bracket, left of the door ---
    const sx=-2.0;   // left of door, clear of the door path
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.7), M(IRON)), sx,2.9,wallZ+0.4);          // bracket arm
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.28), M(IRON)), sx,3.05,wallZ+0.1).rotation.x=0.7;
    for(const s of [-1,1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.03,0.32,0.03), M(IRON)), sx+s*0.5,2.72,wallZ+0.72);  // hangers
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.25,0.62,0.06),
      new THREE.MeshLambertMaterial({map:signTex()}));
    add(board, sx,2.4,wallZ+0.72);

    // --- hanging LANTERN by the door ---
    add(new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.4), M(IRON)), 0.95,2.6,wallZ+0.2);        // little arm
    add(new THREE.Mesh(new THREE.BoxGeometry(0.18,0.26,0.18), M(IRON)), 0.95,2.35,wallZ+0.4);      // cage
    add(new THREE.Mesh(new THREE.SphereGeometry(0.08,6,5), new THREE.MeshBasicMaterial({color:0xffe6a0})), 0.95,2.35,wallZ+0.4);
    const ll=new THREE.PointLight(0xffd080,0.5,5); ll.position.set(0.95,2.35,wallZ+0.4); G.add(ll);

    // --- BARRELS + SACKS + chopping-block out front (door path x∈[-0.9,0.9] left clear) ---
    add(Buildkit.furniture.barrel(Buildkit), -2.4,0,hd+0.9); wc(-2.4,hd+0.9,0.35);
    add(Buildkit.furniture.barrel(Buildkit), -3.0,0,hd+0.3); wc(-3.0,hd+0.3,0.35);
    add(sacks(), -2.7,0,hd+1.5); wc(-2.7,hd+1.5,0.5);
    add(choppingBlock(), 2.5,0,hd+1.4); wc(2.5,hd+1.4,0.4);
    add(Buildkit.furniture.crate(Buildkit), 3.1,0,hd+0.5); wc(3.1,hd+0.5,0.35);

    // --- herb PLANTER boxes under the front windows ---
    add(planter(1.3), -2.4,0,wallZ+0.28);                           // under a front window, clear of the door path
    add(planter(1.1), lxWall-0.1,0,2.3);                             // under a west-front window

    // --- RICH KITCHEN INTERIOR: door on +z; keep the x∈[-1,1] entry lane clear.
    //     All pieces decorative (no colliders block the floor). ---
    { // seat each piece on the terrain at ITS OWN world spot — the walk surface is the flattened
      // Holm terrain (the "pad slab" we briefly seated on was actually the belt-course band, a
      // CEILING that now lifts with the roof — see game5 roof-lift, 2026-07-08)
      const iy=(lx,lz)=>{ const cs=Math.cos(rot||0), sn=Math.sin(rot||0);
        const wx=x+cs*lx+sn*lz, wz=z-sn*lx+cs*lz;
        return ((typeof gy==='function')?gy(wx,wz):0) - baseY + 0.05; };
      const F=(name,lx,lz,r,opt)=>{ const p=Buildkit.furniture[name](Buildkit,opt);
        p.position.set(lx,iy(lx,lz),lz); if(r) p.rotation.y=r;
        p.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(p); return p; };
      // a counter run along the back wall (-z)
      for(const cx of [-3.2,-2.0,-0.8,0.4]) F('counter', cx, -4.2, 0);
      // Mixar hero props (sprint 2026-07-08): generated stone bread oven on the west wall +
      // a laden prep table — replaces the primitive hearth/table/pottery trio
      const GP=(url,h,lx,lz,r)=>{ const p=makeGlbModel(url,{height:h}); p.position.set(lx,iy(lx,lz),lz);
        if(r) p.rotation.y=r; G.add(p); return p; };
      GP('assets/models/tut_oven.glb', 1.9, -5.4, -1.0, Math.PI/2);
      GP('assets/models/tut_preptable.glb', 1.1, 1.6, -1.0, 0);
      F('stool', 1.6, 0.1, 0);
      // shelves with crockery/food on the east wall
      F('shelf', 5.7, -0.4, -Math.PI/2);
      F('shelf', 5.7, 1.2, -Math.PI/2);
      // stacked barrels + crates in the corners
      F('barrel', 5.3, -3.8); F('barrel', 5.3, -2.9);
      F('crate', 5.4, 3.3); const cstack=F('crate', 5.4, 3.3); cstack.position.y=0.72;
      F('barrel', 4.5, 3.4);
      // a couple of loaves on the counter run (ride the counters' terrain-seated height)
      for(const [lx2,lz2] of [[-2.0,-3.95],[-0.8,-4.0]]){
        const loaf=new THREE.Mesh(new THREE.SphereGeometry(0.15,7,5), M(0xc48a4a)); loaf.position.set(lx2,iy(lx2,lz2)+1.08,lz2); G.add(loaf); }
      // a warm rug off to the side, out of the door lane
      F('rug', -2.2, 1.6);
    }

    scene.add(G);
    return G;   // the character group (step 4)
  };
})();
