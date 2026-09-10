/* ============ gloomfen_stilts — the Gloomfen STILT HOUSES (map-parity, 2026-07-08) ============
 * The bible map draws stilted fen-huts over the drowned pools at the Gloomfen's heart;
 * gloomfen.js only dresses the biome. Two rough timber huts on stilts over the pool
 * pocket probed in-engine at (-170..-166, 68..76) (gy -1.9 = standing water), decks
 * above the murk, mono-pitch thatch, a plank walkway reaching the dry bank. Decorative
 * over water like the harbour piers — the water already blocks walkers, no colliders
 * needed except none at all. Deliberately sparse: two huts and one walkway.
 */
(function(){
  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(-166,76)===null) return false;
    if(typeof mat!=='function') return false;

    const G=new THREE.Group();
    const WOOD=0x5c4a34, WOOD_D=0x453626, THATCH=0x6e6242, WALL=0x6b5a44;
    const DECK_Y=-0.35;                       // deck rides above the murk sheet (-1.5)
    const add=(m)=>{ m.castShadow=true; m.receiveShadow=true; G.add(m); return m; };

    function stiltHut(cx,cz,rot,w,d){
      const h=new THREE.Group();
      // stilts down into the pool
      for(const [sx,sz] of [[-w/2+0.3,-d/2+0.3],[w/2-0.3,-d/2+0.3],[-w/2+0.3,d/2-0.3],[w/2-0.3,d/2-0.3],[0,0]]){
        const p=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.13,2.2,6), mat(WOOD_D));
        p.position.set(sx, DECK_Y-1.1, sz); h.add(p);
      }
      // plank deck (slightly proud of the hut)
      const deck=new THREE.Mesh(new THREE.BoxGeometry(w+1.2,0.14,d+1.2), mat(WOOD));
      deck.position.y=DECK_Y; h.add(deck);
      // hut shell: low walls + open door gap on the deck side
      const wall=new THREE.Mesh(new THREE.BoxGeometry(w,1.7,d), mat(WALL));
      wall.position.y=DECK_Y+0.92; h.add(wall);
      const dark=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.25,0.1), mat(0x241c12));
      dark.position.set(0, DECK_Y+0.75, d/2+0.01); h.add(dark);      // the dark doorway
      // mono-pitch thatch, low over the fen
      const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.9,0.18,d+0.9),
        (typeof TEX!=='undefined'&&(TEX.thatchRoof||TEX.thatch))?new THREE.MeshLambertMaterial({map:(TEX.thatchRoof||TEX.thatch),color:THATCH}):mat(THATCH));
      roof.position.y=DECK_Y+1.95; roof.rotation.z=0.16; h.add(roof);
      h.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
      h.position.set(cx,0,cz); h.rotation.y=rot; G.add(h);
      return h;
    }
    stiltHut(-168.5, 71, 0.35, 3.4, 2.8);
    stiltHut(-165.5, 75, -0.5, 2.8, 2.4);
    // plank walkway from the second hut east to the dry bank (~-162,76 at gy>-0.7)
    for(let i=0;i<5;i++){ const px=-164.0+i*0.75, pz=75.4+i*0.18;
      const plank=add(new THREE.Mesh(new THREE.BoxGeometry(0.72,0.1,1.1), mat(WOOD)));
      plank.position.set(px, DECK_Y-0.06-i*0.05, pz);
      if(i%2===0){ const post=add(new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,1.6,5), mat(WOOD_D)));
        post.position.set(px, DECK_Y-0.85, pz+0.6); } }

    scene.add(G);
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] Stilt huts stand over the Gloomfen pools — the fen-folk build above the murk.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[gloomfen_stilts]', e); clearInterval(iv); } }, 2600);
})();
