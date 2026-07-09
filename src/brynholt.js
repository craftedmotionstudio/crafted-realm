/* ============ brynholt — the raider village on the frost coast (bible map NE) ============
 * Pass-004: Brynholt gets its identity (STORY_BIBLE §2: "Raiders & bowyers").
 * Buildkit one-liners for the buildings — every one furnished — plus the hand-placed
 * 10%: a timber dock reaching into the NE sea, the beached rowboat, dockside fishing.
 * The zone anchor drives placement; populateBrynholt keeps only NPCs/campfire.
 */
(function(){
  function build(){
    if(typeof Buildkit==='undefined' || typeof makeBuilding!=='function') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined') return false;
    const b=ZONES.brynholt.pos;
    if(groundY(b[0],b[1])===null) return false;
    const G=new THREE.Group(); scene.add(G);
    const wood=new THREE.MeshPhongMaterial({color:0x6a5138, flatShading:true, shininess:0, specular:0x000000});
    const woodDark=new THREE.MeshPhongMaterial({color:0x53402c, flatShading:true, shininess:0, specular:0x000000});

    /* ---- the buildings (kit; northern palette: weathered timber, slate-blue roofs) ---- */
    // the Whalebone Hall — the raiders' mead hall
    Buildkit.house({x:b[0]-3, z:b[1]-7, w:9, d:5, doorSide:'S',
      color:0x9a8468, roofColor:0x4a5a66, roof:'gable', interior:'pub'});
    // Hask's Bows — the bowyer's shop
    Buildkit.house({x:b[0]+8, z:b[1]-2, w:6, d:5, doorSide:'W',
      color:0xa89478, roofColor:0x5a4a38, roof:'gable', interior:'shop'});
    // village homes
    Buildkit.house({x:b[0]-7, z:b[1]+6, w:5, d:4.5, doorSide:'E',
      color:0x94805f, roofColor:0x55636e, roof:'gable', interior:'house'});
    Buildkit.house({x:b[0]+5, z:b[1]+6.5, w:5, d:4.5, doorSide:'N',
      color:0x8f7a5c, roofColor:0x4a5a66, roof:'gable', interior:'house'});
    // Track C deploy (2026-07-08): the bible map draws Brynholt with ~6 substantial
    // roofs — the kit row builds 4. The Building_Exterior_Option4 CLOCK HALL deploys
    // as the raiders' great hall on the east side (the map's big east house). rot 0
    // ON PURPOSE (its blocking rects rotate centres but not extents); door (+Z front)
    // faces the southern approach. Its REAL geometry spans ~x-12.5..+11 of centre
    // (eaves + wings — measured in-engine; first pick at 192 ate the NE home), so it
    // sits at 199: west walls clear the home by ~2, east eaves end x~210, dry land
    // to 212 (water at 214). Frost meadow undulates ~1.2 → seats on its LOWEST corner.
    if(typeof makeRefBld4==='function'){
      const hall=makeRefBld4(199, -88, 0);
      let hy=Infinity;
      for(const [dx,dz] of [[0,0],[-6,-5],[-6,5],[10.4,-5],[10.4,5],[2,0]]){
        const y=groundY(199+dx, -88+dz); if(y!==null) hy=Math.min(hy,y); }
      if(hy<Infinity) hall.position.y=hy;
      G.add(hall);
    }

    /* ---- village dressing ---- */
    if(typeof makeSignpost==='function') makeSignpost(b[0]-6, b[1]+1, [
      {text:'Brynholt', ang:0.2}, {text:'The Scarlands', ang:-2.6}]);
    if(typeof makeTorch==='function'){ makeTorch(b[0]-3, b[1]-4); makeTorch(b[0]+5, b[1]-2); }
    if(typeof makeCrateCluster==='function'){ makeCrateCluster(b[0]+9, b[1]+4); }
    // a low palisade on the wild (west) approach — raiders watch the Scarlands
    if(typeof makeFence==='function'){
      makeFence(b[0]-12, b[1]-8, b[0]-12, b[1]-1);
      makeFence(b[0]-12, b[1]+3, b[0]-12, b[1]+9);
    }

    /* ---- the hand-placed identity: the dock into the NE sea ---- */
    // coast probe: walk east from the village until the sea, then run planks out
    let dz=-16, dockX0=null;
    for(let x=b[0]+12; x<b[0]+34; x++){
      const y=groundY(x, b[1]+dz);
      if(y!==null && y<-1.55){ dockX0=x-1; break; }
    }
    if(dockX0!==null){
      const zD=b[1]+dz, deckY=-0.55;
      // the Fishing_Pier_Option1 reference build when loaded (integration 2026-07-06):
      // rot PI/2 runs its deck east into the sea, seated at the old deck level. The
      // bare plank dock stays as the fallback.
      if(typeof makeRefPier==='function'){
        const p=makeRefPier(dockX0, zD, Math.PI/2); p.position.y=deckY; G.add(p);
      } else {
        for(let i=0;i<6;i++){                           // 6 plank sections, 1.6 each
          const px=dockX0+0.8+i*1.6;
          const plank=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,2.4), wood);
          plank.position.set(px, deckY, zD); plank.castShadow=true; G.add(plank);
          if(i%2===0) for(const s of [-1,1]){            // piles into the water
            const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,1.8,6), woodDark);
            post.position.set(px-0.6, deckY-0.85, zD+s*1.05); G.add(post);
          }
        }
        const moor=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.8,6), woodDark);
        moor.position.set(dockX0+8.6, deckY+0.35, zD+0.9); G.add(moor);
      }
      const crate=Buildkit.furniture.crate(Buildkit);
      crate.position.set(dockX0+1.2, deckY+0.06, zD-0.8); G.add(crate);
      if(typeof makeTorch==='function') makeTorch(dockX0-0.8, zD-1.6);
      // the rowboat FLOATS beside the dock (makeRowboat grounds at gy — deep water sinks it)
      if(typeof makeRowboat==='function'){
        const boat=makeRowboat(dockX0+9.6, zD+2.4, 0.8);
        boat.position.y=-1.72;                             // hull riding the sea plane
      }
      // the raiders fish off the dock: spots in the water beside it
      if(typeof makeFishSpot==='function'){
        makeFishSpot(dockX0+4, zD-2.6, -1.5);
        makeFishSpot(dockX0+7, zD+2.8, -1.5);
      }
    }
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Brynholt stands on the frost coast — mead hall, bowyer, and a dock into the grey sea.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[brynholt]', e); clearInterval(iv); } }, 2000);
})();
