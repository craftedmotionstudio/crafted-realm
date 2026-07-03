/* ============ gloomfen — the drowned purple fen reads like the bible map ============
 * Pass-002 dressing on the map-driven substrate: murky water over the pools, a dense
 * dead forest, reeds on the mud banks, mushroom clusters, marsh-lights (the Wardens'
 * wisps), and fen fishing. All placement samples the real terrain — no hardcoded
 * geography beyond the zone anchor. Self-boots like biome_snow.
 */
(function(){
  let built=false;
  function fenSpot(gf, tries, test){
    for(let i=0;i<tries;i++){
      const x=gf[0]-52+Math.random()*104, z=gf[1]-40+Math.random()*100;
      if(typeof gridBiome==='function' && gridBiome(x,z)!=='swamp') continue;
      const y=groundY(x,z); if(y===null) continue;
      if(test(x,z,y)) return [x,z,y];
    }
    return null;
  }
  function build(){
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined') return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof makeTree!=='function' || typeof makeReed!=='function') return false;
    const G=new THREE.Group(); scene.add(G);
    const gf=ZONES.gloomfen.pos;

    // murk: a dark sheet a hair above the sea plane — only shows where the fen dips
    // into pools, so every pool reads stagnant-green instead of ocean-blue
    const murk=new THREE.Mesh(new THREE.PlaneGeometry(108,130),
      new THREE.MeshBasicMaterial({color:0x37402e, transparent:true, opacity:0.55, depthWrite:false}));
    murk.rotation.x=-Math.PI/2; murk.position.set(gf[0]+6, -1.5, gf[1]+25); G.add(murk);   // stops at the world's west rim

    // the dead forest thickens (dry footing only)
    for(let i=0;i<24;i++){
      const s=fenSpot(gf, 14, (x,z,y)=> y>-0.7 && !(typeof collides==='function' && collides(x,z,0.8)));
      if(s) makeTree(s[0], s[1], Math.random()<0.65?'dead':'dark');
    }
    // reeds crowd the mud banks (the pool rims)
    for(let i=0;i<30;i++){
      const s=fenSpot(gf, 16, (x,z,y)=> y<-0.72 && y>-1.05);
      if(s) makeReed(s[0], s[1]);
    }
    // mushroom clusters glow on the drier hummocks
    if(typeof makeMushroom==='function') for(let i=0;i<10;i++){
      const s=fenSpot(gf, 12, (x,z,y)=> y>-0.5);
      if(s){ makeMushroom(s[0], s[1]); if(Math.random()<0.5) makeMushroom(s[0]+0.7, s[1]+0.4); }
    }
    // fen fishing: eels lurk in the deep pools
    if(typeof makeFishSpot==='function'){
      let placed=0;
      for(let i=0;i<40 && placed<2;i++){
        const s=fenSpot(gf, 10, (x,z,y)=> y<-1.6);
        if(s){ makeFishSpot(s[0], s[1], -1.48); placed++; }
      }
    }
    // marsh-lights: the Wardens' wisps burn cold over the water (STORY_BIBLE identity line)
    for(let i=0;i<3;i++){
      const s=fenSpot(gf, 20, (x,z,y)=> y<-1.3);
      if(!s) continue;
      const orb=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,5),
        new THREE.MeshBasicMaterial({color:0x9fe8b0}));
      orb.position.set(s[0], -0.6, s[1]); G.add(orb);
      const gl=new THREE.PointLight(0x6fd88a, 0.55, 10); gl.position.copy(orb.position); gl.position.y+=0.3; G.add(gl);
    }
    built=true;
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Gloomfen breathes: marsh-lights burn over the drowned pools.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(built || build()) clearInterval(iv); }
    catch(e){ console.error('[gloomfen]', e); clearInterval(iv); } }, 1600);
})();
