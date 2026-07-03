/* ============ biome_snow — the cold north reads WHITE (macro biome plan) ============
 * Vertex tints can't beat the green grass texture (colors multiply), so the snow
 * gets a real BLANKET. Pass-003: the blanket follows the BAKED MAP (worldgrid snow
 * cells) instead of square zone rects — the frost is shaped exactly like the bible
 * map paints it, no more rectangular "inset" read from altitude.
 */
(function(){
  let built=false;
  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined') return false;
    if(typeof gridBiome!=='function' || typeof WORLDGRID==='undefined') return false;
    const G=new THREE.Group(); scene.add(G);
    const snowT=(typeof TEX!=='undefined' && TEX.plaster)?TEX.plaster.clone():null;
    if(snowT){ snowT.needsUpdate=true; snowT.wrapS=snowT.wrapT=THREE.RepeatWrapping; snowT.repeat.set(18,18); }
    const snowMat=new THREE.MeshLambertMaterial(snowT?{map:snowT, color:0xf0f4f2}:{color:0xecf1ef});

    const snowy=(x,z)=> gridBiome(x,z)==='snow';
    // a vert keeps its blanket if its own tile or any 4-neighbour tile is snow — the
    // one-tile skirt melts the blob's edge into the moor instead of a hard cliff
    const nearSnow=(x,z)=> snowy(x,z)||snowy(x+1.5,z)||snowy(x-1.5,z)||snowy(x,z+1.5)||snowy(x,z-1.5);

    /* one blanket mesh per frost region: bbox in world coords, verts masked by the grid */
    function blanket(x0, z0, x1, z1){
      const w=x1-x0, h=z1-z0, cx=(x0+x1)/2, cz=(z0+z1)/2;
      const geo=new THREE.PlaneGeometry(w, h, Math.ceil(w/1.5), Math.ceil(h/1.5));
      geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){
        const vx=pos.getX(i)+cx, vz=pos.getZ(i)+cz;
        const gy2=groundY(vx,vz);
        // only true frost cells (and their skirt) carry snow; water/shore stays bare
        pos.setY(i, (!nearSnow(vx,vz)||gy2===null||gy2<-0.8) ? -3 : gy2+0.045);
      }
      geo.computeVertexNormals();
      const m=new THREE.Mesh(geo, snowMat);
      m.position.set(cx, 0, cz); m.receiveShadow=true; G.add(m);
    }
    // frost regions from the grid: scan the wilderness band, split NW / NE halves
    const g=WORLDGRID, chars='0123456789abcdefghijklmnop', snowIdx=g.biomes.indexOf('snow');
    const box={nw:[1e9,1e9,-1e9,-1e9], ne:[1e9,1e9,-1e9,-1e9]}; let counts={nw:0, ne:0};
    for(let gz=0; gz<g.h; gz++) for(let gx=0; gx<g.w; gx++){
      if(chars.indexOf(g.data[gz*g.w+gx])!==snowIdx) continue;
      const B = gx<g.w/2 ? (counts.nw++, box.nw) : (counts.ne++, box.ne);
      B[0]=Math.min(B[0],gx); B[1]=Math.min(B[1],gz); B[2]=Math.max(B[2],gx); B[3]=Math.max(B[3],gz);
    }
    for(const k of ['nw','ne']){
      if(counts[k]<30) continue;                       // no real frost in that corner
      const B=box[k];
      blanket(g.x0+B[0]-2, g.z0+B[1]-2, g.x0+B[2]+3, g.z0+B[3]+3);
    }

    // drift mounds for depth — only ever on true snow
    let placed=0;
    for(let i=0;i<160 && placed<26;i++){
      const zc = i%2 ? ZONES.whitmoor.pos : ZONES.brynholt.pos;
      const x=zc[0]+Math.sin(i*7.3)*30, z=zc[1]+Math.cos(i*4.7)*28;
      if(!snowy(x,z)) continue;
      const gy2=groundY(x,z); if(gy2===null||gy2<-0.8) continue;
      const d=new THREE.Mesh(new THREE.SphereGeometry(0.9+Math.abs(Math.sin(i*3))*1.4, 7, 5), snowMat);
      d.scale.y=0.28; d.position.set(x, gy2+0.05, z); d.castShadow=true; G.add(d);
      placed++;
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
    // pines cluster on the frost (snow cells only), a few more than before
    let pines=0;
    for(let i=0;i<200 && pines<20;i++){
      const zc = i%2 ? ZONES.whitmoor.pos : ZONES.brynholt.pos;
      const x=zc[0]+Math.sin(i*5.1)*34, z=zc[1]+Math.cos(i*3.3)*30;
      if(!snowy(x,z)) continue;
      pine(x, z, 0.85+Math.abs(Math.sin(i*11))*0.5);
      pines++;
    }
    built=true;
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[biome_snow]', e); clearInterval(iv); } }, 2400);
})();
