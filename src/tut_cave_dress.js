/* ============ TUTORIAL MINING CAVE — DECORATIVE DRESSING ============
 * Reference: Bible_References/Cave_Walls_+Stalagtites+Stalagmites.jpg and
 *            Bible_References/Tutorial_Island_Mining_Cave_&_Mining_Rocks.jpg
 *
 * Purely-decorative dressing for the open-top mining pit built in
 * src/tutorial_island.js PHASE3 (centre [300,360] on plane -1, floor top y=-6,
 * half-extents HW=9 x / HD=7 z, low rock walls 1.4 high). Adds stalagmites, tall
 * jagged rock spikes against the walls, wall torches (animated flame), and rubble
 * clusters — all hugging the PERIMETER so nothing traps the player or overlaps the
 * gameplay props (mining rocks, furnace, anvil, ladder, descend point).
 *
 * Self-contained, additive, reversible: owns ONLY this file. Adds nothing but decor
 * meshes to `scene`, each group tagged userData.plane=-1 so the Planes system hides
 * them with the surface (planes.js: o.userData.plane===currentPlane -> o.visible).
 * NO colliders are added (dressing sits at the wall edges only).
 *
 * FLAME: reuses the engine's flame idiom (same as makeWallTorch in
 * src/prop_beds_torches.js) — push a group to WORLD.fires with a userData.flame
 * node; game5_main.js's loop scales flame.scale.y each frame. No new anim system.
 * A tiny local rAF additionally flickers the torch PointLights.
 */
(function(){
  'use strict';
  let done=false;
  const iv=setInterval(()=>{
    try{
      if(done) return;
      if(typeof scene==='undefined' || typeof WORLD==='undefined') return;
      if(typeof mat!=='function') return;
      if(typeof TUTORIAL_ISLAND==='undefined' || !TUTORIAL_ISLAND || !TUTORIAL_ISLAND.cave) return;
      done=true; clearInterval(iv);
      build();
    }catch(e){ console.error('[tut_cave_dress]', e); clearInterval(iv); }
  }, 1700);

  function build(){
    const CC={x:300, z:360};       // cave centre (matches PHASE3)
    const Y=-6;                    // floor TOP (props seat here)
    const ROCK  = 0x574d42;        // brown-grey cave rock
    const ROCK2 = 0x6a5f50;        // lighter highlight rock
    const ROCK_D= 0x433b31;        // darker base rock

    // shared geometry cache so repeated cones/rocks reuse one BufferGeometry (perf)
    const geoCache={};
    const cone=(r,h)=>{ const k='c'+r+'_'+h; return geoCache[k]||(geoCache[k]=new THREE.ConeGeometry(r,h,6)); };
    const chunk=(r)=>{ const k='k'+r; return geoCache[k]||(geoCache[k]=new THREE.IcosahedronGeometry(r,0)); };
    const mBase=mat(ROCK), mHi=mat(ROCK2), mDk=mat(ROCK_D);

    const torchLights=[];   // for the local light-flicker tick

    // --- one stalagmite: a rock cone rising from the floor, jittered a touch ---
    function stalagmite(x,z,h,r){
      const g=new THREE.Group();
      const c=new THREE.Mesh(cone(r,h), mBase);
      c.position.y=h/2; c.rotation.y=Math.random()*Math.PI; c.castShadow=true; g.add(c);
      // a small offset secondary spur for a less-uniform silhouette
      if(h>0.9){ const s=new THREE.Mesh(cone(r*0.55,h*0.6), mHi);
        s.position.set(r*0.5,h*0.28,r*0.2); s.rotation.z=0.25; g.add(s); }
      g.position.set(x,Y,z);
      g.userData.plane=-1;
      scene.add(g);
      return g;
    }

    // --- a tall jagged rock spike/pillar for the "cave wall" vertical read ---
    function spike(x,z,h){
      const g=new THREE.Group();
      const main=new THREE.Mesh(cone(0.55,h), mBase); main.position.y=h/2; main.castShadow=true; g.add(main);
      const mid =new THREE.Mesh(cone(0.34,h*0.7), mDk); mid.position.set(0.28,h*0.42,0.05); mid.rotation.z=-0.18; g.add(mid);
      const tip =new THREE.Mesh(cone(0.2,h*0.5), mHi); tip.position.set(-0.2,h*0.55,-0.15); tip.rotation.z=0.2; g.add(tip);
      g.position.set(x,Y,z);
      g.userData.plane=-1;
      scene.add(g);
      return g;
    }

    // --- a low rubble/rock cluster scattered on the floor ---
    function rubble(x,z){
      const g=new THREE.Group();
      const n=3+Math.floor(Math.random()*3);
      for(let i=0;i<n;i++){
        const r=0.14+Math.random()*0.16;
        const m=new THREE.Mesh(chunk(r), i%2?mDk:mBase);
        m.position.set((Math.random()-0.5)*1.1, r*0.6, (Math.random()-0.5)*1.1);
        m.rotation.set(Math.random(),Math.random(),Math.random());
        m.castShadow=true; g.add(m);
      }
      g.position.set(x,Y,z);
      g.userData.plane=-1;
      scene.add(g);
      return g;
    }

    // --- a WALL torch: back-plate + bracket + cup + flickering flame (engine idiom) ---
    function torch(x,y,z,rot){
      const g=new THREE.Group();
      const iron=mat(0x2c2622), wood=mat(0x4a3420);
      const plate=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.42,0.07), wood); plate.castShadow=true; g.add(plate);
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.05,0.55,5), iron);
      arm.position.set(0,0.14,0.17); arm.rotation.x=-0.7; g.add(arm);
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.06,0.17,6), iron);
      cup.position.set(0,0.33,0.33); g.add(cup);
      // flame = nested cones inside a GROUP so scale.y flickers cones and all
      const flame=new THREE.Group();
      const outer=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.36,6), new THREE.MeshBasicMaterial({color:0xff8a2e}));
      outer.position.y=0.18; flame.add(outer);
      const inner=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.22,6), new THREE.MeshBasicMaterial({color:0xffe07a}));
      inner.position.y=0.14; flame.add(inner);
      flame.position.set(0,0.42,0.33); g.add(flame);
      g.userData.flame=flame;                      // engine loop scales flame.scale.y
      // warm light parented into the group (toggles + moves with it, out along bracket)
      const light=new THREE.PointLight(0xff9c4a, 0.6, 7); light.position.set(0,0.5,0.35); g.add(light);
      light.userData.base=0.6; torchLights.push(light);
      g.position.set(x,y,z); g.rotation.y=rot||0;
      g.userData.plane=-1;
      scene.add(g);
      if(WORLD.fires) WORLD.fires.push(g);         // reuse engine flame-flicker loop
      return g;
    }

    /* --- PLACEMENT (all perimeter-hugging; keep-outs: mining rocks 296/298/303/357,
       296/304,362; furnace 305,363; anvil 302,363; ladder 293,365; descend 294,364) --- */

    // stalagmites along the four walls, clear of every prop tile
    const stal=[
      [296,354.5,0.9,0.42],[300,354.4,1.1,0.5],[304,354.6,0.85,0.4],   // north wall
      [298,365.9,1.0,0.46],[301,366.0,0.8,0.4],                        // south wall
      [308.1,358.0,1.05,0.48],[308.1,361.5,0.9,0.42],                  // east wall
      [292.0,357.5,1.0,0.46],[292.0,360.5,0.85,0.4]                    // west wall
    ];
    stal.forEach(s=>stalagmite(s[0],s[1],s[2],s[3]));

    // tall jagged spikes at the four corners (against the walls)
    const spk=[ [292.4,354.4,2.9], [307.6,354.4,3.2], [307.6,365.8,2.7], [291.9,366.2,2.5] ];
    spk.forEach(s=>spike(s[0],s[1],s[2]));

    // rubble clusters at empty edge spots
    [[294.5,354.3],[306.5,366.0],[291.8,363.2],[306.0,354.4]].forEach(r=>rubble(r[0],r[1]));

    // four wall torches (inner faces; rot yaws the flame toward the pit interior)
    const TY=-5.0;
    torch(300, TY, 353.9,  0);            // north wall, flame -> +z
    torch(308.1, TY, 359.0, -Math.PI/2);  // east wall,  flame -> -x
    torch(299, TY, 366.1,  Math.PI);      // south wall, flame -> -z
    torch(291.9, TY, 362.0, Math.PI/2);   // west wall,  flame -> +x

    // local tick: gently flicker the torch PointLights (flame scale is engine-driven)
    (function flick(){
      const t=performance.now()*0.006;
      for(const L of torchLights){ L.intensity=L.userData.base*(0.82+Math.sin(t+L.position.z)*0.12+Math.random()*0.06); }
      requestAnimationFrame(flick);
    })();

    const nStone=stal.length+spk.length;   // 13 stalagmites/spikes
    console.log('[tut_cave_dress] added '+nStone+' stalagmites + '+torchLights.length+' torches');
  }
})();
