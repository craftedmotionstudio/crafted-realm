/* ============ stonereach_bridge — the map's named crossing south of the Commons ============
 * The Mirrorpond arm cuts the south road (grid water, unwalkable); a causeway berm in
 * terrainHeight carries the walking, and this file dresses it as the wooden bridge the
 * bible map draws: plank deck, rails (real colliders — you stay on the bridge), piles,
 * lamps at both ends, and the name post. No NPCs (buildout law).
 */
(function(){
  const A={x:-3.1, z:61.5}, B={x:-3.7, z:67.5};        // just the water gap; the berm road carries the rest
  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof addRectCollider!=='function') return false;
    const G=new THREE.Group(); scene.add(G);
    const wood=new THREE.MeshPhongMaterial({color:0x77593a, flatShading:true, shininess:0, specular:0x000000});
    const woodDark=new THREE.MeshPhongMaterial({color:0x5a4229, flatShading:true, shininess:0, specular:0x000000});

    const dx=B.x-A.x, dz=B.z-A.z, L=Math.hypot(dx,dz), ux=dx/L, uz=dz/L;
    const px=-uz, pz=ux;                                // perpendicular (deck width axis)
    const deckY=-0.08, HALF_W=1.55;

    // deck: cross-planks marching the span
    for(let d=0.4; d<L; d+=0.62){
      const cx=A.x+ux*d, cz=A.z+uz*d;
      const plank=new THREE.Mesh(new THREE.BoxGeometry(HALF_W*2, 0.09, 0.5), wood);
      plank.position.set(cx, deckY, cz);
      plank.rotation.y=Math.atan2(ux,uz);               // face across the walking line
      plank.castShadow=true; G.add(plank);
    }
    // rails: posts + top beam each side, with matching thin colliders
    for(const s of [-1,1]){
      for(let d=0; d<=L; d+=2.4){
        const cx=A.x+ux*d+px*s*HALF_W, cz=A.z+uz*d+pz*s*HALF_W;
        const post=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.85,0.14), woodDark);
        post.position.set(cx, deckY+0.42, cz); post.castShadow=true; G.add(post);
      }
      const beam=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.09,L), woodDark);
      beam.position.set((A.x+B.x)/2+px*s*HALF_W, deckY+0.82, (A.z+B.z)/2+pz*s*HALF_W);
      beam.rotation.y=Math.atan2(dx,dz); G.add(beam);
      // the rail is real: a thin collider run per side keeps walkers on the deck
      addRectCollider((A.x+B.x)/2+px*s*(HALF_W+0.12), (A.z+B.z)/2+pz*s*(HALF_W+0.12), Math.abs(dx)/2+0.2, Math.abs(dz)/2);
    }
    // piles into the water beneath
    for(let d=1.6; d<L; d+=3.1){
      for(const s of [-1,1]){
        const cx=A.x+ux*d+px*s*(HALF_W-0.2), cz=A.z+uz*d+pz*s*(HALF_W-0.2);
        const pile=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.13,1.9,6), woodDark);
        pile.position.set(cx, deckY-1.0, cz); G.add(pile);
      }
    }
    // lamps at both ends + the name post
    if(typeof makeTorch==='function'){ makeTorch(A.x+px*HALF_W, A.z-1.2); makeTorch(B.x-px*HALF_W, B.z+1.2); }
    if(typeof makeSignpost==='function') makeSignpost(A.x+2.2, A.z-0.6, [
      {text:'Stonereach Bridge', ang:-1.6}, {text:'Mirrorpond', ang:Math.PI-0.2}]);
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Stonereach Bridge spans the Mirrorpond arm — the south road walks through again.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[stonereach_bridge]', e); clearInterval(iv); } }, 1900);
})();
