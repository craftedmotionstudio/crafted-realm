/* ============ prop_grass_tufts — OSRS ground-texture grass blade clumps ============
 * Reference: Bible_References/Grass.jpg — the OSRS grass treatment is little clumps of
 * thin, tapered, V-fanned blade tufts scattered at moderate density over the flat green
 * ground, each clump a slightly different sage/olive green. They add ground texture; they
 * are NOT walls or bushes.
 *
 * This is a self-booting IIFE (same discipline as world_scatter/biome_snow). It touches
 * NOTHING in game2_world.js — it only READS the global helpers (scene, groundY, gridBiome,
 * collides, nearPath, WORLDGRID, THREE) and adds ONE merged mesh.
 *
 * PERF: every blade of every clump is baked into a SINGLE merged, non-indexed
 * BufferGeometry -> ONE mesh, ONE draw call, ONE material. No per-frame animation, no
 * colliders (tufts are walk-through). Flat-shaded via computeVertexNormals on a
 * non-indexed buffer + flatShading, per-clump hue baked into vertex colors. At the cap
 * (~400 clumps x ~5 blades) that is ~2k triangles total — negligible frame cost.
 *
 * PLACEMENT: grass biome only (gridBiome(x,z)==='grass' guard keeps them off roads/water/
 * desert/swamp/snow), sane footing (groundY not null/underwater), never on a collider
 * (collides) and never on a path (nearPath). Sampled around the Commons where the player
 * actually walks so the ground reads dressed, not empty.
 */
(function(){
  let built=false;

  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof THREE==='undefined' || typeof groundY!=='function') return false;
    if(typeof gridBiome!=='function' || typeof WORLDGRID==='undefined') return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    built=true;                                   // claim the slot once we really build

    // ---- deterministic RNG so the scatter is identical every load ----
    let seed=0x9e3779b1;
    const rnd=()=>{ seed=(seed*1664525+1013904223)&0x7fffffff; return seed/0x7fffffff; };

    const CAP = 400;                              // hard cap on clumps → frame budget
    const REACH = 110;                            // sample box half-size around Commons (0,0)
    const pos=[], col=[];
    const tmp = new THREE.Color();

    // one grass-blade clump: a small fan of thin tapered triangles, one baked HSL green
    function addClump(cx, cy, cz){
      const blades = 4 + Math.floor(rnd()*3);     // 4–6 blades
      // per-clump green: muted sage/olive, slight hue + value variation (matches ref)
      const hue = 0.23 + rnd()*0.09;              // yellow-green → green
      const sat = 0.30 + rnd()*0.18;
      const lit = 0.28 + rnd()*0.15;
      tmp.setHSL(hue, sat, lit);
      const cr = 0.10 + rnd()*0.10;               // clump footprint radius
      const base = rnd()*Math.PI*2;
      for(let b=0;b<blades;b++){
        const a = base + b/blades*Math.PI*2 + (rnd()-0.5)*0.7;
        const rr = rnd()*cr;
        const bx = cx + Math.cos(a)*rr, bz = cz + Math.sin(a)*rr;
        const h  = 0.26 + rnd()*0.30;             // blade height
        const lean = 0.10 + rnd()*0.18;           // outward lean (varies the normal → catches light)
        const lx = Math.cos(a)*lean, lz = Math.sin(a)*lean;
        const w  = 0.016 + rnd()*0.014;           // half-width at the base
        const px = -Math.sin(a)*w, pz = Math.cos(a)*w;   // perpendicular for the base edge
        // one tapered triangle: two base points + a raised, leaned-out apex
        pos.push(bx-px, cy,   bz-pz);
        pos.push(bx+px, cy,   bz+pz);
        pos.push(bx+lx, cy+h, bz+lz);
        const shade = 0.80 + rnd()*0.35;          // per-blade micro shade
        for(let v=0;v<3;v++) col.push(tmp.r*shade, tmp.g*shade, tmp.b*shade);
      }
    }

    let placed=0, attempts=0;
    while(placed<CAP && attempts<CAP*40){
      attempts++;
      const x = (rnd()*2-1)*REACH, z = (rnd()*2-1)*REACH;
      if(gridBiome(x,z)!=='grass') continue;                       // grass zones ONLY
      const y = groundY(x,z); if(y===null || y<-0.2) continue;     // sane, dry footing
      if(typeof collides==='function' && collides(x,z,0.3,true)) continue;
      if(typeof nearPath==='function' && nearPath(x,z,1.1)) continue;
      addClump(x, y+0.02, z);
      placed++;
    }

    if(placed>0){
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
      geo.setAttribute('color',    new THREE.Float32BufferAttribute(col,3));
      geo.computeVertexNormals();                 // non-indexed → per-face flat normals
      const mat=new THREE.MeshLambertMaterial({
        vertexColors:true, side:THREE.DoubleSide, flatShading:true
      });
      const mesh=new THREE.Mesh(geo, mat);
      mesh.castShadow=false; mesh.receiveShadow=true;
      mesh.frustumCulled=true;
      scene.add(mesh);
    }
    console.log('[prop_grass_tufts] placed '+placed+' grass-blade clumps (1 merged mesh, 1 draw call)');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[prop_grass_tufts]', e); clearInterval(iv); } }, 1800);
})();
