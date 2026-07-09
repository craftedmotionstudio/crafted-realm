/* ============ dunes_camp — the Ashar Dunes nomad CAMP (map-parity, 2026-07-08) ============
 * The bible map draws a tent camp with a campfire in the Ashar Dunes; in-game the dunes
 * had only cacti and cliffs (the old trading post is legacy-gated). Two low canvas tents,
 * a fire, a rug, and cargo — a nomad waypoint, deliberately sparse. Pad probed in-engine
 * at (184,36): flat sand (gy .27-.49), one cactus nearby (kept — it frames the camp).
 */
(function(){
  const C={x:184, z:36};
  function tent(px,pz,rot,len,col,colD){
    const g=new THREE.Group();
    // A-frame canvas: a 3-sided prism laid on its side (open front), plus a back panel
    const body=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,len,3), mat(col));
    body.rotation.z=Math.PI/2; body.rotation.x=Math.PI/6; body.position.y=0.95;
    body.rotation.y=0; g.add(body);
    const back=new THREE.Mesh(new THREE.CylinderGeometry(1.42,1.42,0.12,3), mat(colD));
    back.rotation.z=Math.PI/2; back.rotation.x=Math.PI/6; back.position.set(-len/2+0.02,0.95,0); g.add(back);
    // ridgepole ends + guy pegs
    for(const s of [-1,1]){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,1.9,5), mat(0x6b4f2e));
      pole.position.set(s*(len/2-0.1),0.95,0); g.add(pole); }
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    g.position.set(px, (typeof gy==='function'?gy(px,pz):0), pz); g.rotation.y=rot;
    scene.add(g);
    WORLD.colliders.push({type:'circle', x:px, z:pz, r:1.3});
    return g;
  }
  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(C.x,C.z)===null) return false;
    if(typeof mat!=='function' || typeof makeCampfire!=='function') return false;

    tent(C.x-3.2, C.z-1.4,  0.5, 3.2, 0xc9a26a, 0x9c7a4c);   // the big sand-canvas tent
    tent(C.x+3.0, C.z+1.8, -2.2, 2.6, 0xa8794a, 0x7e5a36);   // the smaller ochre tent
    makeCampfire(C.x, C.z+0.6);                               // already animated (flame + light)
    // a woven rug by the fire + cargo
    const rug=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.06,1.2), mat(0x8a3d3d));
    rug.position.set(C.x-0.4, (typeof gy==='function'?gy(C.x-0.4,C.z+2.2):0)+0.06, C.z+2.2);
    rug.receiveShadow=true; scene.add(rug);
    if(typeof makeCrateCluster==='function') makeCrateCluster(C.x+1.8, C.z-2.6);
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] A nomad camp smokes among the Ashar dunes — canvas, coals, and cargo.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[dunes_camp]', e); clearInterval(iv); } }, 2500);
})();
