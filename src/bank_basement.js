/* ============ bank_basement — the Bank of Veyhollow VAULT (Track C batch 5, 2026-07-08) ============
 * Wires the dormant ref_bankbasement.js reference interior (Bank Basement.jpg: clerk hall,
 * barred vault gate, strongboxes, gold shelves, torches, up-staircase) into the game with the
 * PROVEN tutorial-cave pattern (tutorial_island.js PHASE3): the roofless room sits at a far
 * off-map offset on plane -1 (the OSRS +6400 trick), reached by a TRAPDOOR inside the Bank of
 * Veyhollow and left by its wooden staircase. Sea/terrain visibility rules for plane<0 are
 * global (installed by the cave) — this file only adds floor, wall colliders, and the climbs.
 *
 * Wall collider lines mirror the ref build's geometry (read from ref_bankbasement.js):
 * outer ring W22 D17 (inner faces x±11 z±8.5), dividing wall at local x=-4 with a 2.2 gate
 * gap at z0 (the barred gate stays OPEN so the storage rooms are walkable), cross-wall at
 * local z0 spanning x -11..-3.7. Up-staircase at local (9.6, 6.1).
 */
(function(){
  const BB={x:240, z:300};                 // vault centre, far off the charted map
  const Y=-6;                              // cellar depth (matches the cave's underground level)
  const TD={x:10.5, z:-15};                // trapdoor: Bank of Veyhollow public floor (SW of the booth)
  let done=false;
  const iv=setInterval(()=>{
    try{
      if(done){ clearInterval(iv); return; }
      if(typeof running==='undefined' || !running) return;
      if(typeof makeRefBankBasement!=='function') return;
      if(typeof Planes==='undefined' || typeof Planes.addFloor!=='function' || typeof Planes.addClimb!=='function') return;
      if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.colliders) return;
      if(typeof groundY!=='function' || groundY(TD.x,TD.z)===null) return;   // commons terrain baked

      // --- the reference room, seated at cellar depth ---
      const bb=makeRefBankBasement(BB.x, BB.z, 0);
      bb.position.y=Y;
      scene.add(bb);

      // --- walkable floor (plane -1), inside the outer walls ---
      Planes.addFloor({plane:-1, x:BB.x, z:BB.z, hw:10.3, hd:7.8, y:Y});

      // --- wall colliders: circle lines along each wall (cave trick), plane -1, LOCAL->WORLD ---
      const wc=(x1,z1,x2,z2)=>{ const n=Math.max(2,Math.round(Math.hypot(x2-x1,z2-z1)/1.6));
        for(let i=0;i<=n;i++){ const t=i/n;
          WORLD.colliders.push({type:'circle', x:BB.x+x1+(x2-x1)*t, z:BB.z+z1+(z2-z1)*t, r:0.5, plane:-1}); } };
      wc(-11.3,-8.8, 11.3,-8.8); wc(-11.3, 8.8, 11.3, 8.8);      // end walls
      wc(-11.3,-8.8,-11.3, 8.8); wc( 11.3,-8.8, 11.3, 8.8);      // side walls
      wc(-4, 1.4, -4, 8.5);  wc(-4,-8.5, -4,-1.4);               // dividing wall (gate gap open at z±1.1)
      wc(-11, 0, -3.9, 0);                                        // cross-wall in the storage block

      // --- travel: trapdoor in the bank -> down; the room's staircase -> up ---
      Planes.addClimb({x:TD.x, z:TD.z, h:0.1, name:'Trapdoor',
        label:'Climb-down <b>Bank trapdoor</b>', down:{plane:-1, x:BB.x+7.6, z:BB.z+6.1},
        mesh:(()=>{ const q=new THREE.Group();
          const t=new THREE.Mesh(new THREE.BoxGeometry(1,0.1,1), new THREE.MeshLambertMaterial({color:0x5a4226})); t.position.y=0.06; q.add(t);
          const rim=new THREE.Mesh(new THREE.TorusGeometry(0.62,0.07,4,8), new THREE.MeshLambertMaterial({color:0x3a2a18})); rim.rotation.x=Math.PI/2; rim.position.y=0.02; q.add(rim);
          return q; })()});
      // climb-up at the staircase FOOT, one tile into the room (local 7.8, 5.3) — flush
      // against the stairs the corner walls occlude the ladder from the fixed camera and
      // clicks can't reach it (found in-browser; the click ray hits the wall cap first)
      Planes.addClimb({x:BB.x+7.8, z:BB.z+5.3, h:2.6, basePlane:-1, y:Y, name:'Staircase',
        label:'Climb-up <b>Staircase</b>', up:{plane:0, x:TD.x+1.4, z:TD.z+1.2}});

      // --- a bank chest down in the vault: bank access at the strongroom (kind:'bank') ---
      { const c=new THREE.Group();
        const body=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.7,0.8), new THREE.MeshLambertMaterial({color:0x6a4a26}));
        body.position.y=0.35; body.castShadow=true; c.add(body);
        const lid=new THREE.Mesh(new THREE.BoxGeometry(1.14,0.16,0.84), new THREE.MeshLambertMaterial({color:0x4a3218}));
        lid.position.y=0.78; c.add(lid);
        const latch=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.2,0.08), new THREE.MeshLambertMaterial({color:0xcaa63c}));
        latch.position.set(0,0.5,0.42); c.add(latch);
        c.position.set(BB.x+6.5, Y, BB.z-6.5);
        c.userData={kind:'bank', label:'Use <b>Bank chest</b>', plane:-1};
        scene.add(c); WORLD.clickables.push(c);
        WORLD.colliders.push({type:'circle', x:BB.x+6.5, z:BB.z-6.5, r:0.7, plane:-1}); }

      if(typeof UI!=='undefined' && UI.chat)
        UI.chat('[MAP] The Bank of Veyhollow opens its vault — a trapdoor by the west door leads down.','sys');
      done=true; clearInterval(iv);
      console.log('[bank_basement] vault wired at ('+BB.x+','+BB.z+'), trapdoor at ('+TD.x+','+TD.z+')');
    }catch(e){ console.error('[bank_basement]', e); clearInterval(iv); }
  }, 2100);
})();
