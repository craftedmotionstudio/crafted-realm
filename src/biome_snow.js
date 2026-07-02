/* ============ biome_snow — the cold north reads WHITE (macro biome plan) ============
 * Vertex tints can't beat the green grass texture (colors multiply), so the snow
 * zones get a real snow BLANKET: terrain-hugging pale layers over Brynholt and
 * Whitmoor, plus scattered drift mounds. One glance = you're in the north.
 */
(function(){
  let built=false;
  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined') return false;
    const G=new THREE.Group(); scene.add(G);
    const snowT=(typeof TEX!=='undefined' && TEX.plaster)?TEX.plaster.clone():null;
    if(snowT){ snowT.needsUpdate=true; snowT.wrapS=snowT.wrapT=THREE.RepeatWrapping; snowT.repeat.set(18,18); }
    const snowMat=new THREE.MeshLambertMaterial(snowT?{map:snowT, color:0xf0f4f2}:{color:0xecf1ef});

    function blanket(cx, cz, half){
      const geo=new THREE.PlaneGeometry(half*2, half*2, Math.ceil(half/1.5), Math.ceil(half/1.5));
      geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const vx=pos.getX(i)+cx, vz=pos.getZ(i)+cz;
        const gy2=groundY(vx,vz);
        // shoreline/water stays uncovered: sink those verts out of sight
        pos.setY(i, (gy2===null||gy2<-0.8) ? -3 : gy2+0.045);
      }
      geo.computeVertexNormals();
      const m=new THREE.Mesh(geo, snowMat);
      m.position.set(cx, 0, cz); m.receiveShadow=true; G.add(m);
    }
    blanket(ZONES.whitmoor.pos[0], ZONES.whitmoor.pos[1], 26);
    blanket(ZONES.brynholt.pos[0], ZONES.brynholt.pos[1], 30);

    // drift mounds for depth
    for(let i=0;i<22;i++){
      const zc = i%2 ? ZONES.whitmoor.pos : ZONES.brynholt.pos;
      const x=zc[0]+Math.sin(i*7.3)*20, z=zc[1]+Math.cos(i*4.7)*20;
      const gy2=groundY(x,z); if(gy2===null||gy2<-0.8) continue;
      const d=new THREE.Mesh(new THREE.SphereGeometry(0.9+Math.abs(Math.sin(i*3))*1.4, 7, 5), snowMat);
      d.scale.y=0.28; d.position.set(x, gy2+0.05, z); d.castShadow=true; G.add(d);
    }
    built=true;
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[biome_snow]', e); clearInterval(iv); } }, 2400);
})();
