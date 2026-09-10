/* ============ tut_holm_path — a winding dirt PATH mesh climbing Tutor's Holm ============
 * The Elevation reference (Bible_References/Elevation_Change_Ground_Tiles.jpg) shows a bold
 * winding dirt path climbing the hill. The global PATHS vertex-color painter reads too faintly
 * on the Holm's bright grass (tried + reverted, Pass 53), so this builds a DEDICATED ribbon of
 * dirt-textured geometry that drapes over the raised shelf — real contrast, reference-accurate.
 *
 * Self-contained + REVERSIBLE: remove the one <script src="src/tut_holm_path.js"> tag from
 * index.html and the path is gone. Uses only globals (scene, THREE, terrainHeight, TEX).
 */
(function(){
  // winding waypoints: from the south shore, up the EAST side of the plaza (clear of the SW tree
  // clutter + the central statue), to the NE lodge door. Tuned eyes-on in the main session.
  const WP = [[166,161],[165,154],[167,148],[163,142],[166,137],[167,132]];
  const HALF = 0.95;   // path half-width (~1.9 wide)
  const STEP = 1.0;    // resample spacing so the ribbon hugs the terrain

  function resample(pts){
    const out=[];
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i], b=pts[i+1];
      const dx=b[0]-a[0], dz=b[1]-a[1], L=Math.hypot(dx,dz), n=Math.max(1,Math.round(L/STEP));
      for(let k=0;k<n;k++){ const t=k/n; out.push([a[0]+dx*t, a[1]+dz*t]); }
    }
    out.push(pts[pts.length-1]);
    return out;
  }

  function build(allowFallback){
    if(typeof scene==='undefined'||!scene||typeof THREE==='undefined'||typeof terrainHeight!=='function') return false;
    if(scene.getObjectByName('holm_dirt_path')) return true;   // already built
    const texReady = (typeof TEX!=='undefined' && TEX.dirtPath && TEX.dirtPath.isTexture);
    if(!texReady && !allowFallback) return false;              // wait for the dirt texture before building
    const line = resample(WP);
    const pos=[], uv=[], idx=[]; let run=0;
    for(let i=0;i<line.length;i++){
      const p=line[i], a=line[Math.max(0,i-1)], b=line[Math.min(line.length-1,i+1)];
      let dx=b[0]-a[0], dz=b[1]-a[1]; const L=Math.hypot(dx,dz)||1; dx/=L; dz/=L;
      const nx=-dz, nz=dx;                                  // perpendicular
      if(i>0) run+=Math.hypot(p[0]-line[i-1][0], p[1]-line[i-1][1]);
      for(const s of [-1,1]){
        const px=p[0]+nx*HALF*s, pz=p[1]+nz*HALF*s;
        pos.push(px, terrainHeight(px,pz)+0.06, pz);        // drape just above the ground
        uv.push(s<0?0:1, run/2.2);                          // dirt tiles along the path
      }
    }
    for(let i=0;i<line.length-1;i++){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(idx); geo.computeVertexNormals();
    let matOpts={ roughness:1, metalness:0, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 };
    if(texReady){
      const tex=TEX.dirtPath.clone(); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.needsUpdate=true;
      matOpts.map=tex;
    } else { matOpts.color=0x7a5836; }   // fallback: solid dirt brown if the texture never loaded
    const mesh=new THREE.Mesh(geo, new THREE.MeshStandardMaterial(matOpts));
    mesh.name='holm_dirt_path'; mesh.receiveShadow=true;
    scene.add(mesh);
    console.log('[tut_holm_path] winding dirt path built ('+line.length+' cross-sections)');
    return true;
  }

  // the world/terrain builds async — wait for it, then build once
  let tries=0;
  const iv=setInterval(function(){
    tries++;
    try{ if(build(tries>15) || tries>60){ clearInterval(iv); } }   // after ~10s, build with the color fallback
    catch(e){ if(tries>60) clearInterval(iv); }
  }, 700);
})();
