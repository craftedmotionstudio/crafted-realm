/* ============ Map pipeline showcase — proves verticality + buildkit end-to-end ============
 * One block of Veyhollow built the MAP_PIPELINE way, so every capability the
 * pipeline promises is standing in the world to inspect and copy:
 *   - "The Wayfarer's Rest": a 2-storey furnished inn (pub downstairs, bedroom
 *     upstairs) with a working interior ladder — Buildkit.house one-liner
 *   - a cellar below it (trapdoor down / ladder up) — the OSRS far-offset cave
 *     pattern via Planes.addCave, stocked with crates and a rat… er, ambience
 * Remove or relocate freely — this is the reference block, not canon geography.
 */
(function(){
  const SPOT={x:14, z:26};            // open ground east of the Commons square
  const CAVE={x:300, z:300};          // far off the charted map, OSRS-style
  function build(){
    if(typeof makeBuilding!=='function' || typeof Planes==='undefined' || typeof Buildkit==='undefined') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;   // wait for full boot — never build mid-populate
    const y=groundY(SPOT.x, SPOT.z);
    if(y===null) return false;

    // the inn — one data line, whole building
    Buildkit.house({x:SPOT.x, z:SPOT.z, w:7, d:6, floors:2, doorSide:'S',
      color:0xd8cdb4, roofColor:0x8a5a3a, roof:'gable', interior:'pub', upstairs:'bedroom'});

    // the cellar: room far off-map on plane -1 + a trapdoor pair inside the inn
    const cave=Planes.addCave({x:CAVE.x, z:CAVE.z, hw:5, hd:4, y:-6, plane:-1});
    // stock the cellar (barrels + crates — an inn's cellar, after all)
    const stock=new THREE.Group();
    [[CAVE.x-3,CAVE.z-2],[CAVE.x-2.4,CAVE.z-2],[CAVE.x-3,CAVE.z-1.3],[CAVE.x+3,CAVE.z+2]].forEach(([bx,bz],i)=>{
      const b=(i<3)?Buildkit.furniture.barrel(Buildkit):Buildkit.furniture.crate(Buildkit);
      b.position.set(bx, -6, bz); stock.add(b);
    });
    scene.add(stock);
    // trapdoor: inn ground floor -> cellar; ladder back up
    Planes.addClimb({x:SPOT.x-2.4, z:SPOT.z+1.6, h:0.1, name:'Trapdoor',
      label:'Climb-down <b>Trapdoor</b>',
      mesh:(()=>{ const g=new THREE.Group();
        const t=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.08,0.9), new THREE.MeshLambertMaterial({color:0x5a4226}));
        t.position.y=0.08; g.add(t);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.03,4,8), new THREE.MeshLambertMaterial({color:0x3a3a44}));
        ring.position.set(0.25,0.13,0); ring.rotation.x=Math.PI/2; g.add(ring);
        return g; })(),
      down:{plane:-1, x:CAVE.x-3.5, z:CAVE.z+2.5}});
    Planes.addClimb({x:CAVE.x-4.2, z:CAVE.z+3.0, h:2.8, basePlane:-1, y:-6, name:'Ladder',
      label:'Climb-up <b>Ladder</b>',
      up:{plane:0, x:SPOT.x-1.6, z:SPOT.z+1.6}});
    // a signpost so wanderers find the showcase
    UI && UI.chat && UI.chat('[MAP] The Wayfarer\'s Rest stands east of the square — 2 storeys, a ladder, and a cellar. The pipeline\'s reference build.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }catch(e){ console.error('[showcase]', e); clearInterval(iv); } }, 2000);
})();
