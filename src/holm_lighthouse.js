/* ============ holm_lighthouse — the Tutor's Holm LIGHTHOUSE (map-parity, 2026-07-08) ============
 * The bible map draws a lighthouse on the Holm's north shore — the island's landmark —
 * and the game never built it. A cozy OSRS take: rough stone plinth on the rocks, tapered
 * whitewashed tower with a red band, a plank door facing the plaza, a railed gallery, a
 * glazed lamp room, and a live ROTATING BEACON (emissive lamp + two light-cone beams spun
 * by a self-installed rAF, the ref_bankbasement FX pattern) — the spine rule: anything
 * that moves in reality ships animated. Site probed in-engine: (161,120) dry coastal
 * knoll, collider-free, water within 8 tiles north. One circle collider; no interior.
 */
(function(){
  const L={x:161, z:120};
  let built=false;
  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(L.x,L.z)===null) return false;
    if(typeof mat!=='function') return false;

    const G=new THREE.Group();
    const WHITE=0xe8e2d4, RED=0xa0392e, STONE=0x8a8578, TRIM=0x6b5a44, GLASS=0x9fd8e8;
    const add=(m)=>{ m.castShadow=true; m.receiveShadow=true; G.add(m); return m; };

    // rough stone plinth over the shore rock
    add(new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.4,1.2,8),
      (typeof TEX!=='undefined'&&TEX.stone)?new THREE.MeshLambertMaterial({map:TEX.stone,color:STONE}):mat(STONE))).position.y=0.6;
    // tapered whitewashed tower
    const tower=add(new THREE.Mesh(new THREE.CylinderGeometry(1.7,2.2,9,10),
      (typeof TEX!=='undefined'&&TEX.plaster)?new THREE.MeshLambertMaterial({map:TEX.plaster,color:WHITE}):mat(WHITE)));
    tower.position.y=1.2+4.5;
    // the red band
    const band=add(new THREE.Mesh(new THREE.CylinderGeometry(1.93,2.0,1.4,10), mat(RED)));
    band.position.y=4.4;
    // plank door facing the plaza (south, +Z) + lintel
    const door=add(new THREE.Mesh(new THREE.BoxGeometry(1.0,1.9,0.2), mat(0x6a4a2a)));
    door.position.set(0,2.2,2.12);
    add(new THREE.Mesh(new THREE.BoxGeometry(1.3,0.22,0.26), mat(TRIM))).position.set(0,3.25,2.12);
    // two small windows up the shaft (south face)
    for(const wy of [5.6,7.6]){ const w=add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.15), mat(0x35404e)));
      w.position.set(0,wy,1.94-(wy-4.5)*0.055); }
    // railed gallery
    const gal=add(new THREE.Mesh(new THREE.CylinderGeometry(2.35,2.35,0.3,10), mat(TRIM)));
    gal.position.y=10.35;
    for(let i=0;i<10;i++){ const a=i/10*Math.PI*2;
      const p=add(new THREE.Mesh(new THREE.BoxGeometry(0.09,0.8,0.09), mat(TRIM)));
      p.position.set(Math.cos(a)*2.2, 10.9, Math.sin(a)*2.2); }
    const rail=add(new THREE.Mesh(new THREE.TorusGeometry(2.2,0.055,4,12), mat(TRIM)));
    rail.rotation.x=Math.PI/2; rail.position.y=11.3;
    // glazed lamp room + cap
    const lampRoom=add(new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,1.5,8),
      new THREE.MeshPhongMaterial({color:GLASS, transparent:true, opacity:0.45, shininess:0, specular:0x000000})));
    lampRoom.position.y=11.35;
    const cap=add(new THREE.Mesh(new THREE.ConeGeometry(1.6,1.2,8), mat(RED)));
    cap.position.y=12.8;
    const finial=add(new THREE.Mesh(new THREE.SphereGeometry(0.16,6,5), mat(TRIM))); finial.position.y=13.5;

    // ---- the BEACON: emissive lamp + rotating twin light-cones + a real light ----
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.42,8,6),
      new THREE.MeshPhongMaterial({color:0xffe9a8, emissive:0xffdD80, emissiveIntensity:1.0, flatShading:true, shininess:0}));
    lamp.position.y=11.35; G.add(lamp);
    const glow=new THREE.PointLight(0xffe2a0, 0.7, 26); glow.position.y=11.4; G.add(glow);
    const rotor=new THREE.Group(); rotor.position.y=11.35; G.add(rotor);
    const beamMat=new THREE.MeshBasicMaterial({color:0xfff2c0, transparent:true, opacity:0.16, depthWrite:false});
    for(const s of [1,-1]){
      const beam=new THREE.Mesh(new THREE.ConeGeometry(1.5,9,8,1,true), beamMat);
      beam.rotation.z=s*Math.PI/2; beam.position.x=s*4.5; rotor.add(beam);
    }
    // self-installed rAF spin (ref_bankbasement FX pattern — survives without engine hooks)
    if(!window.__holmBeacon){ window.__holmBeacon={rotor};
      (function spin(){ const t=(typeof performance!=='undefined'?performance.now():Date.now())*0.001;
        if(window.__holmBeacon.rotor) window.__holmBeacon.rotor.rotation.y=t*0.5;
        requestAnimationFrame(spin); })(); }
    else window.__holmBeacon.rotor=rotor;

    G.position.set(L.x, groundY(L.x,L.z), L.z);
    G.userData={kind:'deco', label:'Examine <b>Lighthouse</b>',
      examine:'The Holm light. Keeps the tutors’ rowboats off the rocks.'};
    scene.add(G); WORLD.clickables.push(G);
    WORLD.colliders.push({type:'circle', x:L.x, z:L.z, r:2.6});
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] The Holm light turns again on the north shore.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()){ built=true; clearInterval(iv); } }
    catch(e){ console.error('[holm_lighthouse]', e); clearInterval(iv); } }, 2300);
})();
