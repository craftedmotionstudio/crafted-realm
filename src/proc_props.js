/* ============================================================================
   Shared procedural prop geometry — crisp, low-poly, OSRS-style hard-surface
   props (where SF3D is too lumpy). Framework-agnostic: pass in THREE and a
   mat(colorHex) -> flat-shaded Material function, so the GAME (r128 Lambert)
   and the review tool (r160 Standard) build IDENTICAL geometry + colours.
   Add new builders here once; both consumers get them.
   ========================================================================== */
function makeProcProps(THREE, mat){
  const C = {
    wood:      0xc8a154,  // warm golden tan (bucket staves)
    woodDk:    0x8a6a30,
    metal:     0xb3a89a,  // light warm grey (bucket bands/handle)
    barrelWood:0x9a6a30,  // richer brown (barrel)
    barrelHoop:0x33312c,  // dark iron hoops
    crateWood: 0xa9783a,  // crate planks
    crateFrame:0x6e4d24,  // crate corner posts / rails (darker)
  };
  // open-ended rings are DOUBLE-SIDED so the far/inner wall renders too
  // (a single-sided open cylinder culls its back wall -> looks like half a bucket).
  const ring = (rt, rb, h, y, c) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 8, 1, true), mat(c));
    m.position.y = y; m.castShadow = true; m.material.side = THREE.DoubleSide; return m;
  };

  return {
    // tapered octagonal bucket: 3 bands + rolled rim lip + strap handle with lugs
    bucket(){
      const g = new THREE.Group();
      g.add(ring(0.30, 0.22, 0.44, 0.24, C.wood));      // staves (double-sided -> full vessel)
      const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.03,8), mat(C.woodDk));
      bottom.position.y = 0.02; g.add(bottom);
      g.add(ring(0.315, 0.315, 0.06, 0.43, C.metal));   // top band
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.025, 6, 8), mat(C.metal));
      lip.position.y = 0.47; lip.rotation.x = Math.PI/2; g.add(lip);   // rolled rim lip (character)
      g.add(ring(0.27,  0.27,  0.04, 0.27, C.metal));   // upper band
      g.add(ring(0.235, 0.235, 0.04, 0.055, C.metal));  // lower band
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.024, 6, 12, Math.PI), mat(C.metal));
      handle.position.y = 0.44; handle.scale.z = 0.6; g.add(handle);   // flattened strap handle
      [-1, 1].forEach(s => {                                            // handle attachment lugs (character)
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.05), mat(C.metal));
        lug.position.set(s*0.285, 0.42, 0); g.add(lug);
      });
      return g;
    },

    // bulged wooden barrel (lathe profile) with 3 dark iron hoops
    barrel(){
      const g = new THREE.Group();
      const prof = [
        new THREE.Vector2(0.0001, 0.0),
        new THREE.Vector2(0.26,   0.0),
        new THREE.Vector2(0.30,   0.10),
        new THREE.Vector2(0.345,  0.39),
        new THREE.Vector2(0.30,   0.68),
        new THREE.Vector2(0.26,   0.78),
        new THREE.Vector2(0.0001, 0.78),
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 12), mat(C.barrelWood));
      body.castShadow = true; g.add(body);
      [[0.10,0.305],[0.39,0.352],[0.68,0.305]].forEach(([y,r])=>{
        const hoop = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 12, 1, true), mat(C.barrelHoop));
        hoop.position.y = y; g.add(hoop);
      });
      return g;
    },

    // wooden crate: plank box + darker corner posts + top/bottom rails (framed)
    crate(){
      const g = new THREE.Group();
      const s = 0.60, h = 0.58, fw = 0.055;
      const box = (w,hh,d,x,y,z,c) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w,hh,d), mat(c));
        m.position.set(x,y,z); m.castShadow = true; return m;
      };
      g.add(box(s, h, s, 0, h/2, 0, C.crateWood));                                  // body
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz]) =>                            // corner posts
        g.add(box(fw, h+0.02, fw, sx*s/2, h/2, sz*s/2, C.crateFrame)));
      [h-fw/2, fw/2].forEach(y => {                                                 // top + bottom rails
        g.add(box(s+0.02, fw, fw, 0, y,  s/2, C.crateFrame));
        g.add(box(s+0.02, fw, fw, 0, y, -s/2, C.crateFrame));
        g.add(box(fw, fw, s+0.02,  s/2, y, 0, C.crateFrame));
        g.add(box(fw, fw, s+0.02, -s/2, y, 0, C.crateFrame));
      });
      return g;
    },
  };
}
if (typeof window !== 'undefined') window.makeProcProps = makeProcProps;
