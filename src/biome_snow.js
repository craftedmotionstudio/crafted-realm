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

    // the north's own flora: snow-dusted pines (stacked cones, OSRS-conifer read)
    const pineGreen=new THREE.MeshLambertMaterial({color:0x2e4a38});
    const pineSnow=new THREE.MeshLambertMaterial({color:0xe8efec});
    const barkM=new THREE.MeshLambertMaterial({color:0x4a3628});
    function pine(x, z, s){
      const gy2=groundY(x,z); if(gy2===null||gy2<-0.8) return;
      if(typeof collides==='function' && collides(x,z,1.2,true)) return;
      const p=new THREE.Group();
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.14*s,0.22*s,1.1*s,6), barkM);
      trunk.position.y=0.55*s; p.add(trunk);
      for(let t=0;t<3;t++){
        const r=(1.15-t*0.3)*s, h=1.1*s, y=(0.9+t*0.75)*s;
        const cone=new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), pineGreen);
        cone.position.y=y+h/2; cone.castShadow=true; p.add(cone);
        const cap=new THREE.Mesh(new THREE.ConeGeometry(r*0.85, h*0.32, 7), pineSnow);
        cap.position.y=y+h*0.86; p.add(cap);
      }
      p.position.set(x, gy2, z); p.rotation.y=Math.sin(x*7+z*3)*3;
      G.add(p);
      if(typeof addCircleCollider==='function') addCircleCollider(x, z, 0.4*s);
    }
    for(let i=0;i<16;i++){
      const zc = i%2 ? ZONES.whitmoor.pos : ZONES.brynholt.pos;
      pine(zc[0]+Math.sin(i*5.1)*24, zc[1]+Math.cos(i*3.3)*22, 0.85+Math.abs(Math.sin(i*11))*0.5);
    }
    built=true;
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[biome_snow]', e); clearInterval(iv); } }, 2400);
})();
