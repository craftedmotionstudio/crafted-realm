/* ============ saltreach — the SE harbour town (bible map: "Saltreach Port") ============
 * Pass-010: the map's last unbuilt named region. Buildings on the bay's north shore
 * (Buildkit, all furnished), two timber piers reaching south into the harbour inlet,
 * boats riding the water. Smuggler-flavoured trade post per STORY_BIBLE ("our Port
 * Sarim"). NO NPCs — the port's folk arrive in its repopulation pass.
 */
(function(){
  const S={x:232, z:48};                                // shore row anchor (ZONES.saltreach)
  function build(){
    if(typeof Buildkit==='undefined' || typeof makeSignpost!=='function') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(S.x,S.z)===null) return false;
    const G=new THREE.Group(); scene.add(G);
    const wood=new THREE.MeshPhongMaterial({color:0x6f5638, flatShading:true, shininess:0, specular:0x000000});
    const woodDark=new THREE.MeshPhongMaterial({color:0x54402a, flatShading:true, shininess:0, specular:0x000000});

    /* ---- the shore row (weathered salt-bleached timber, furnished) ---- */
    Buildkit.house({x:S.x-8, z:S.z-2, w:6.5, d:5, doorSide:'S',
      color:0xb8ac92, roofColor:0x5a6a72, roof:'gable', interior:'shop'});   // the Salt Exchange (trade house)
    Buildkit.house({x:S.x+8, z:S.z-2, w:6, d:5, doorSide:'S',
      color:0xb0a488, roofColor:0x6e4a2e, roof:'gable', interior:'pub'});    // the Brine Barrel tavern
    Buildkit.house({x:S.x, z:S.z-9, w:7, d:5, doorSide:'S',
      color:0xa89a80, roofColor:0x4e5a62, roof:'gable', interior:'house'});  // the harbour warehouse

    /* ---- the piers: south into the harbour inlet ---- */
    function pier(px, z0, z1){
      const deckY=-0.55;
      for(let z=z0; z<z1; z+=0.62){
        const plank=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.1,0.5), wood);
        plank.position.set(px, deckY, z+0.31); plank.castShadow=true; G.add(plank);
      }
      for(let z=z0+0.8; z<z1; z+=2.8) for(const s of [-1,1]){
        const pile=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1.9,6), woodDark);
        pile.position.set(px+s*1.0, deckY-0.9, z); G.add(pile);
      }
      const moor=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.8,6), woodDark);
      moor.position.set(px+0.9, deckY+0.35, z1-0.6); G.add(moor);
      const crate=Buildkit.furniture.crate(Buildkit);
      crate.position.set(px-0.7, deckY+0.06, z0+1.0); G.add(crate);
      if(typeof makeTorch==='function') makeTorch(px-1.1, z0-0.8);
    }
    // the long pier into the bay — the Fishing_Pier_Option1 reference build when loaded
    // (integration 2026-07-06: railed deck, pilings + braces, water ladder); the bare
    // plank pier stays as the fallback. Deck top seated at the harbour walk level.
    if(typeof makeRefPier==='function'){
      const p=makeRefPier(228, 52.5, 0); p.position.y=-0.55; G.add(p);
    } else pier(228, 52.5, 65);
    // a boat riding the harbour water beside it
    if(typeof makeRowboat==='function'){
      const b1=makeRowboat(230.4, 62.5, 1.2); b1.position.y=-1.72;
    }
    /* ---- harbour dressing ---- */
    if(typeof makeCrateCluster==='function'){ makeCrateCluster(S.x-2, S.z+2.5); makeCrateCluster(S.x+3, S.z+3); }
    if(typeof makeTorch==='function'){ makeTorch(S.x-12, S.z+1); makeTorch(S.x+12, S.z+1); }
    makeSignpost(S.x-14, S.z-4, [
      {text:'Saltreach Port', ang:0.1}, {text:'The Ashar Dunes', ang:2.9}]);
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Saltreach Port opens on the eastern sea — piers, salt-bleached timber, and room for ships.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[saltreach]', e); clearInterval(iv); } }, 2100);
})();
