/* ============ prop_ruins — ruined stone masonry set-piece scatter ============
 * Reference: Bible_References/Ruins.jpg — the classic OSRS ruined-fort look:
 * broken grey stone wall stubs with jagged tops, standing broken archways, toppled
 * blocks and rubble piles, cracked column stumps, and (this being the burned south)
 * charred wooden support stakes. Weathered grey stone, chunky flat-shaded facets.
 *
 * Enumeration from the reference → builders here:
 *   - broken wall segments (jagged-top courses, missing blocks) .. makeRuinWall
 *   - standing broken arch / doorway remnant .................... makeBrokenArch
 *   - toppled blocks + scattered rubble ........................ makeRubblePile
 *   - cracked pillar / column stump ............................ makeBrokenColumn
 *   - charred wooden posts/stakes .............................. makeRuinStake
 *   - moss creep on old stone .............................. (moss speckles, all)
 *
 * Self-booting IIFE (mirrors world_evil_tree.js / world_scatter.js discipline):
 * polls until running && scene && ZONES ready, then builds a scatter. Owns its own
 * group + colliders; does NOT edit game2_world.js/game1_data.js/etc. Loaded AFTER
 * world_scatter.js so mat()/gy()/groundY()/collides()/addCircleCollider() exist.
 */
(function(){
  let built=false;

  // --- stone palette: weathered greys with per-block jitter so facets read distinct ---
  const STONE=[0x938d81, 0x847e73, 0x9c968b, 0x78726a, 0x8a847a];
  function stone(){ return mat(STONE[(Math.random()*STONE.length)|0]); }
  function mossMat(){ return mat(0x556b3a); }

  // weather a mesh: tiny random tilt + faint non-uniform squash so nothing is pristine
  function weather(m){
    m.rotation.y += (Math.random()-0.5)*0.5;
    m.rotation.x += (Math.random()-0.5)*0.06;
    m.rotation.z += (Math.random()-0.5)*0.06;
    m.castShadow=true; m.receiveShadow=true;
    return m;
  }
  function block(w,h,d){ return weather(new THREE.Mesh(new THREE.BoxGeometry(w,h,d), stone())); }

  // a few green moss patches clinging to a group's stones
  function moss(g, n, spread, yMax){
    for(let i=0;i<n;i++){
      const p=new THREE.Mesh(new THREE.IcosahedronGeometry(0.10+Math.random()*0.10,0), mossMat());
      p.scale.y=0.4;
      p.position.set((Math.random()-0.5)*spread, 0.05+Math.random()*yMax, (Math.random()-0.5)*spread);
      g.add(p);
    }
  }

  /* ---- a broken wall segment: courses of chunky blocks, jagged top, gaps ---- */
  function makeRuinWall(x,z,len,rot){
    const g=new THREE.Group();
    const cols=Math.max(2, Math.round(len/0.95));
    const bw=len/cols;                       // block width along the wall
    const course=0.55;                       // course (row) height
    for(let c=0;c<cols;c++){
      const lx=-len/2 + bw*(c+0.5);
      if(Math.random()<0.12) continue;       // a fully collapsed bay
      const rows=1+Math.floor(Math.random()*3);   // jagged: 1..3 courses high
      for(let r=0;r<rows;r++){
        const b=block(bw*(0.9+Math.random()*0.12), course*(0.9+Math.random()*0.2), 0.75);
        b.position.set(lx+(Math.random()-0.5)*0.06, course*r+course/2, (Math.random()-0.5)*0.08);
        g.add(b);
      }
      if(rows>=2 && Math.random()<0.5){       // a half-tumbled capstone perched on top
        const cap=block(bw*0.6, course*0.5, 0.5);
        cap.position.set(lx+(Math.random()-0.5)*0.2, course*rows+0.1, (Math.random()-0.5)*0.2);
        g.add(cap);
      }
    }
    moss(g, 3, len*0.8, course);
    g.position.set(x, gy(x,z), z); g.rotation.y=rot; scene.add(g);
    // colliders strung along the wall in world space (rotation.y maps local +X → cos,-sin)
    const steps=Math.max(1, Math.round(len/1.0));
    for(let i=0;i<=steps;i++){
      const lx=-len/2 + (len/steps)*i;
      addCircleCollider(x+lx*Math.cos(rot), z-lx*Math.sin(rot), 0.45);
    }
    return g;
  }

  /* ---- a standing broken arch: two pillar stubs + a partial springing arch ---- */
  function makeBrokenArch(x,z,rot){
    const g=new THREE.Group();
    const span=2.0, pierW=0.6;
    for(const s of [-1,1]){
      const h=1.5+Math.random()*0.6;
      const pier=block(pierW, h, pierW); pier.rotation.set(0,0,0);
      pier.position.set(s*span/2, h/2, 0); g.add(pier);
      // the arch begins to spring inward, then breaks off mid-air
      const spr=block(pierW*0.9, 0.5, pierW*0.9);
      spr.rotation.z=s*0.5; spr.position.set(s*(span/2-0.25), h+0.2, 0); g.add(spr);
      if(s<0){                                // one side keeps a second voussoir
        const v=block(0.5,0.45,pierW*0.85);
        v.rotation.z=0.9; v.position.set(s*(span/2-0.7), h+0.55, 0); g.add(v);
      }
    }
    moss(g, 4, span, 1.2);
    g.position.set(x, gy(x,z), z); g.rotation.y=rot; scene.add(g);
    addCircleCollider(x+ (span/2)*Math.cos(rot), z-(span/2)*Math.sin(rot), 0.45);
    addCircleCollider(x+(-span/2)*Math.cos(rot), z+(span/2)*Math.sin(rot), 0.45);
    return g;
  }

  /* ---- a rubble pile: toppled blocks tumbled flat on the ground ---- */
  function makeRubblePile(x,z){
    const g=new THREE.Group();
    const n=4+Math.floor(Math.random()*4);
    for(let i=0;i<n;i++){
      const s=0.28+Math.random()*0.34;
      const b=weather(new THREE.Mesh(new THREE.BoxGeometry(s,s*0.7,s*(0.8+Math.random()*0.6)), stone()));
      b.rotation.set(Math.random()*0.6, Math.random()*6, Math.random()*0.6);
      b.position.set((Math.random()-0.5)*1.3, s*0.3, (Math.random()-0.5)*1.3);
      g.add(b);
    }
    moss(g, 2, 1.2, 0.15);
    g.position.set(x, gy(x,z), z); scene.add(g);
    addCircleCollider(x, z, 0.6);            // the mound is a shin-high obstacle
    return g;
  }

  /* ---- a cracked column stump: octagonal shaft snapped off at the break ---- */
  function makeBrokenColumn(x,z){
    const g=new THREE.Group();
    const h=0.9+Math.random()*1.1, r=0.34;
    const base=new THREE.Mesh(new THREE.CylinderGeometry(r*1.3,r*1.4,0.25,8), stone());
    base.position.y=0.12; base.castShadow=true; base.receiveShadow=true; g.add(base);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.05,h,8), stone());
    shaft.position.y=0.25+h/2; shaft.castShadow=true; shaft.receiveShadow=true; g.add(shaft);
    // jagged snapped top: an offset chunk hanging off the fracture
    const chunk=block(r*1.1, 0.3, r*1.1);
    chunk.position.set(r*0.4, 0.25+h+0.05, r*0.2); g.add(chunk);
    moss(g, 2, r*2, h*0.6);
    g.position.set(x, gy(x,z), z); g.rotation.y=Math.random()*6; scene.add(g);
    addCircleCollider(x, z, r+0.15);
    return g;
  }

  /* ---- a charred wooden support stake (the burned Scarlands past-life) ---- */
  function makeRuinStake(x,z){
    const g=new THREE.Group();
    const h=0.9+Math.random()*0.8;
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.10,h,5), mat(0x2f2822));
    post.position.y=h/2; post.rotation.z=(Math.random()-0.5)*0.25;
    post.castShadow=true; g.add(post);
    g.position.set(x, gy(x,z), z); scene.add(g);
    return g;
  }

  // pick a clear spot in a box around (cx,cz): on ground, not clipping anything
  function spot(cx,cz,rx,rz,pad,test){
    for(let i=0;i<24;i++){
      const x=cx+(Math.random()-0.5)*rx*2, z=cz+(Math.random()-0.5)*rz*2;
      const y=groundY(x,z); if(y===null) continue;
      if(typeof collides==='function' && collides(x,z,pad)) continue;
      if(test && !test(x,z,y)) continue;
      return [x,z];
    }
    return null;
  }

  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof mat!=='function' || typeof gy!=='function' || typeof groundY!=='function') return false;
    if(typeof addCircleCollider!=='function' || typeof ZONES==='undefined' || !ZONES.scarlands) return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    built=true;

    /* ---- The Scarlands: a ruined fort scattered across the burned north ---- */
    const sc=ZONES.scarlands.pos;            // [20,-100], well past the Ditch (z=-58)
    // one deliberate broken-wall spine near the zone heart, then organic scatter
    let s=spot(sc[0], sc[1], 10, 8, 1.4, (x,z)=>z<-64);
    if(s) makeBrokenWallRun(s[0], s[1]);

    let arches=0, walls=0, cols=0, rubble=0, stakes=0;
    for(let i=0;i<70;i++){
      s=spot(sc[0], sc[1], 34, 26, 1.2, (x,z)=>z<-62);   // stay north of the Ditch band
      if(!s) continue;
      const roll=Math.random();
      if(roll<0.18 && arches<4){ makeBrokenArch(s[0],s[1],Math.random()*Math.PI); arches++; }
      else if(roll<0.42 && walls<7){ makeRuinWall(s[0],s[1], 2.5+Math.random()*3, Math.random()*Math.PI); walls++; }
      else if(roll<0.62 && cols<8){ makeBrokenColumn(s[0],s[1]); cols++; }
      else if(roll<0.85 && rubble<12){ makeRubblePile(s[0],s[1]); rubble++; }
      else if(stakes<10){ makeRuinStake(s[0],s[1]); stakes++; }
      if(arches>=4 && walls>=7 && cols>=8 && rubble>=12 && stakes>=10) break;
    }

    /* ---- Veyhollow Commons edge: a quiet rubble row (old broken boundary wall) ---- */
    // north-west commons fringe, clear of the market/paths — an ancient collapsed wall
    for(let i=0, placed=0; i<20 && placed<4; i++){
      s=spot(-22, -14, 8, 6, 1.2, (x,z)=> (x*x+z*z) > 18*18);  // outside the town core
      if(!s) continue;
      if(Math.random()<0.5) makeRubblePile(s[0],s[1]); else makeBrokenColumn(s[0],s[1]);
      placed++;
    }

    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] Broken masonry litters the Scarlands — a fort the Scarring unmade.','sys');
    return true;
  }

  // a short spine of connected wall stubs (kink at the middle, like a collapsed corner)
  function makeBrokenWallRun(x,z){
    const a=Math.random()*Math.PI;
    makeRuinWall(x, z, 4, a);
    makeRuinWall(x+3*Math.cos(a), z-3*Math.sin(a), 3, a+Math.PI/2*(Math.random()<0.5?1:-1));
    makeRubblePile(x+1.4*Math.cos(a), z-1.4*Math.sin(a));
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[prop_ruins]', e); clearInterval(iv); } }, 1800);
})();
