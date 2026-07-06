/* ============ tut_statue — the heroic KNIGHT MONUMENT for the tutorial-island plaza ============
 * Reference: Bible_References/A_Tutorial_Island_Option.jpg — a central statue of armoured figures
 * on a stepped stone plinth with an engraved plaque on the front face. Replaces the old crude
 * stacked-box statue (tutorial_island.js buildStatue) with a proper sculpted memorial knight.
 *
 * What it reads as: a moulded STEPPED STONE PLINTH (3 chamfered tiers + top pedestal + engraved
 * "In Memoriam" plaque on the front/+Z face) carrying a well-proportioned KNIGHT in the classic
 * memorial pose — helmeted+crested head, pauldrons, breastplate, belt, greaved legs, cape falling
 * from the shoulders, both hands resting on the pommel of a downward SWORD whose tip rests on the
 * pedestal between the feet. ~4.3 units tall, plinth 2.4 wide. One circle collider at (x,z,1.4).
 *
 * Art: cozy OSRS LOW-POLY FLAT-SHADED weathered grey stone with darker recessed tones + bronze
 * accents on the sword hilt / breastplate emblem. Rounded/beveled shapes (cylinders, cones, icosa)
 * so it sculpts, not blocks. Merges the repeated cornice rivets into one geometry (1 draw call).
 * CSP-safe: the plaque is a local CanvasTexture (guarded for the headless validator).
 *
 * Global deps (all in game2_world.js): THREE, mat(), gy(), scene, WORLD, addCircleCollider().
 * All are used DEFENSIVELY with local fallbacks so the file is self-contained. Load AFTER
 * game2_world.js; tutorial_island.js calls window.makeTutStatue(x,z) in place of the old statue.
 */
(function(){
  const STONE   = 0x9a948a;   // weathered worked grey stone (body)
  const STONE_D = 0x6f6a62;   // shadowed / recessed grey (mouldings, cape, boots)
  const STONE_HI= 0xaaa49a;   // lit grey (breastplate, knee guards, folds)
  const STEEL   = 0x8b8d90;   // cool grey for the sword blade
  const BRONZE  = 0x7a6a48;   // bronze accents (crossguard, pommel, emblem, rivets)

  /* the front (plaque-bearing) face is +Z; the knight faces +Z too. Caller can't rotate the
   * group, so placement chooses the plaza-facing side by picking x,z accordingly. */
  function makeTutStatue(x, z){
    if(typeof THREE==='undefined') return null;
    // --- defensive globals: real ones if present, else local equivalents ---
    const M   = (typeof mat==='function') ? mat
              : (c)=> new THREE.MeshPhongMaterial({color:c, flatShading:true, shininess:0, specular:0x000000});
    const GY  = (typeof gy==='function') ? gy : ()=>0;
    const y0  = GY(x, z);

    const G = new THREE.Group();
    G.position.set(x, y0, z);

    // ---- shared builders (local coords, relative to G's base at ground level) ----
    const box = (w,h,d, c, px,py,pz, parent)=>{                      // axis-aligned block
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c));
      m.position.set(px,py,pz); m.castShadow=true; m.receiveShadow=true; (parent||G).add(m); return m;
    };
    const cyl = (rt,rb,h,seg, c, px,py,pz, parent)=>{               // tapered rounded post
      const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8), M(c));
      m.position.set(px,py,pz); m.castShadow=true; (parent||G).add(m); return m;
    };
    const ico = (r, c, px,py,pz, parent)=>{                          // faceted blob (studs, joints)
      const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0), M(c));
      m.position.set(px,py,pz); m.castShadow=true; (parent||G).add(m); return m;
    };
    // a truncated-pyramid chamfer band (4-sided cylinder, faces axis-aligned) for tier mouldings
    const cham = (wb,wt,h, c, py)=>{                                 // wb/wt = bottom/top full width
      const m=new THREE.Mesh(new THREE.CylinderGeometry(wt/Math.SQRT2, wb/Math.SQRT2, h, 4), M(c));
      m.rotation.y=Math.PI/4; m.position.set(0,py,0); m.castShadow=true; m.receiveShadow=true; G.add(m); return m;
    };
    // an oriented tapered limb between two local points (arms, legs, blade)
    const limb = (a,b, rt,rb, c, parent)=>{
      const A=new THREE.Vector3(a[0],a[1],a[2]), B=new THREE.Vector3(b[0],b[1],b[2]);
      const d=new THREE.Vector3().subVectors(B,A), len=d.length()||0.001;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,len,7), M(c));
      m.position.copy(A).addScaledVector(d,0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.clone().normalize());
      m.castShadow=true; (parent||G).add(m); return m;
    };

    // ================= STEPPED STONE PLINTH (3 chamfered tiers + pedestal) =================
    box(2.40,0.42,2.40, STONE_D, 0,0.21,0);                          // tier 1 (base)
    cham(2.40,2.05,0.20, STONE, 0.52);                               //   moulding
    box(2.05,0.36,2.05, STONE,   0,0.80,0);                          // tier 2
    cham(2.05,1.55,0.20, STONE_D, 1.08);                            //   moulding
    const PW=1.45, PY0=1.18, PH=0.98;                                // pedestal box
    box(PW,PH,PW, STONE, 0, PY0+PH/2, 0);
    cham(PW,1.62,0.13, STONE_D, PY0+PH+0.065);                       // overhanging cornice
    const TOP = PY0+PH+0.13;                                         // top-slab underside
    box(1.52,0.10,1.52, STONE, 0, TOP+0.05, 0);                      // top slab (knight stands here)
    const FEET = TOP+0.10;                                           // figure base height

    // --- a ring of bronze rivets under the cornice, merged into ONE geometry (1 draw call) ---
    {
      const geoms=[], ry=PY0+PH-0.06, half=PW/2-0.02, n=5;
      for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]]){            // one row per pedestal face
        for(let i=0;i<n;i++){
          const t=(i+0.5)/n - 0.5, g=new THREE.BoxGeometry(0.06,0.06,0.06);
          if(ax){ g.translate(ax*half, ry, t*(PW-0.06)); }           // stud on an X-face
          else  { g.translate(t*(PW-0.06), ry, az*half); }           // stud on a Z-face
          geoms.push(g);
        }
      }
      const BGU=THREE.BufferGeometryUtils||{};
      const mergeFn=BGU.mergeGeometries||BGU.mergeBufferGeometries||null;  // r128 = mergeBufferGeometries
      const merged=mergeFn?mergeFn(geoms,false):null;
      if(merged){ const m=new THREE.Mesh(merged, M(BRONZE)); m.castShadow=true; G.add(m); }
      else geoms.forEach(g=>{ const m=new THREE.Mesh(g,M(BRONZE)); m.castShadow=true; G.add(m); });
    }

    // ---- engraved PLAQUE on the front (+Z) pedestal face: beam-framed textured panel ----
    {
      const zf=PW/2+0.015, py=PY0+PH*0.52, pw=1.02, ph=0.50;
      let panelMat;
      if(typeof document!=='undefined'){                            // CanvasTexture (CSP-safe, local)
        const cv=document.createElement('canvas'); cv.width=256; cv.height=128;
        const g=cv.getContext('2d');
        g.fillStyle='#6b6258'; g.fillRect(0,0,256,128);             // weathered bronze plate
        g.fillStyle='#565049'; g.fillRect(7,7,242,114);            // recessed field
        g.textAlign='center'; g.fillStyle='#39352e';               // engraved (dark, sunk) lettering
        g.font='bold 33px Georgia, serif'; g.fillText('IN MEMORIAM',128,42);
        g.font='15px Georgia, serif';
        g.fillText('THE FALLEN KNIGHTS',128,72);
        g.fillText('OF VEYHOLLOW',128,93);
        g.strokeStyle='rgba(205,196,176,0.30)'; g.lineWidth=1;      // faint lit lip = engrave depth
        g.strokeRect(8,8,240,112);
        const t=new THREE.CanvasTexture(cv); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.LinearFilter;
        panelMat=new THREE.MeshPhongMaterial({map:t, shininess:0, specular:0x000000});
      } else panelMat=M(STONE_D);
      const panel=new THREE.Mesh(new THREE.BoxGeometry(pw,ph,0.03), panelMat);
      panel.position.set(0,py,zf); panel.receiveShadow=true; G.add(panel);
      // bronze frame beams around the panel
      box(pw+0.14,0.07,0.06, BRONZE, 0, py+ph/2+0.02, zf);          // top rail
      box(pw+0.14,0.07,0.06, BRONZE, 0, py-ph/2-0.02, zf);          // bottom rail
      box(0.07,ph+0.16,0.06, BRONZE, -pw/2-0.05, py, zf);           // left stile
      box(0.07,ph+0.16,0.06, BRONZE,  pw/2+0.05, py, zf);           // right stile
    }

    // ============================ the KNIGHT (memorial pose) ============================
    const F=new THREE.Group(); F.position.set(0, FEET, 0); G.add(F);   // feet at slab top
    const b =(w,h,d,c,px,py,pz)=>box(w,h,d,c,px,py,pz,F);
    const cy=(rt,rb,h,s,c,px,py,pz)=>cyl(rt,rb,h,s,c,px,py,pz,F);
    const ic=(r,c,px,py,pz)=>ico(r,c,px,py,pz,F);

    // -- legs: greaved, tapered, feet slightly apart; knee guards + boots --
    for(const s of [-1,1]){
      limb([s*0.14,0.78,0.00],[s*0.15,0.16,0.02], 0.13,0.10, STONE, F);   // thigh + greave
      ic(0.09, STONE_HI, s*0.15,0.46,0.06);                                // knee guard
      b(0.20,0.14,0.36, STONE_D, s*0.15,0.07,0.07);                        // boot (toe +Z)
    }
    cy(0.30,0.32,0.20,8, STONE_D, 0,0.75,0);                               // armoured skirt / tassets

    // -- torso: octagonal breastplate cylinder + protruding chest plate + belt --
    cy(0.24,0.30,0.60,8, STONE, 0,1.20,0);                                 // torso
    b(0.36,0.42,0.10, STONE_HI, 0,1.24,0.22);                              // chest plate
    ic(0.06, BRONZE, 0,1.30,0.29);                                         // bronze emblem boss
    b(0.58,0.13,0.38, STONE_D, 0,0.90,0);                                  // belt
    b(0.13,0.11,0.05, BRONZE, 0,0.90,0.20);                                // belt buckle

    // -- shoulders: rounded pauldrons (flattened icosa) --
    for(const s of [-1,1]){
      const p=ic(0.18, STONE, s*0.31,1.46,0.01); p.scale.set(1,0.78,1);
    }

    // -- head: gorget + crested visored helm --
    cy(0.17,0.17,0.05,8, STONE_D, 0,1.55,0);                               // gorget / neck guard
    cy(0.13,0.16,0.26,8, STONE, 0,1.70,0);                                 // helm dome
    ic(0.13, STONE, 0,1.84,0);                                             // rounded crown
    b(0.22,0.035,0.03, STONE_D, 0,1.70,0.15);                              // visor slit (recessed dark)
    b(0.05,0.17,0.30, STONE_D, 0,1.95,-0.02);                             // crest fin
    { const pl=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.26,6), M(BRONZE));  // plume cone
      pl.position.set(0,2.00,0.12); pl.rotation.x=-0.5; pl.castShadow=true; F.add(pl); }

    // -- cape falling from the shoulders down the back (−Z) --
    { const cape=b(0.52,1.06,0.05, STONE_D, 0,0.95,-0.22); cape.rotation.x=-0.06; }
    b(0.62,0.30,0.05, STONE_D, 0,0.50,-0.27);                              // flared hem
    for(const s of [-1,1]){                                               // side folds (lit)
      const f=b(0.14,0.92,0.05, STONE, s*0.24,0.92,-0.18); f.rotation.z=s*0.06; f.rotation.x=-0.05;
    }

    // -- arms resting inward+down onto the sword pommel (classic memorial pose) --
    for(const s of [-1,1]){
      limb([s*0.28,1.42,0.03],[s*0.24,1.08,0.16], 0.075,0.065, STONE, F);  // upper arm
      limb([s*0.24,1.08,0.16],[s*0.07,1.02,0.30], 0.065,0.055, STONE, F);  // forearm (to pommel)
      ic(0.06, STONE, s*0.07,1.05,0.31);                                    // gauntleted hand
    }

    // -- downward SWORD: pommel under the hands, blade tip resting on the slab between the feet --
    ic(0.065, BRONZE, 0,1.13,0.31);                                        // pommel
    limb([0,1.12,0.31],[0,0.99,0.31], 0.03,0.03, STONE_D, F);              // grip
    b(0.34,0.05,0.07, BRONZE, 0,0.96,0.31);                                // crossguard
    limb([0,0.94,0.31],[0,0.03,0.32], 0.055,0.012, STEEL, F);              // blade (tapered to point)

    // ---- register in the world ----
    if(typeof scene!=='undefined' && scene) scene.add(G);
    if(typeof addCircleCollider==='function') addCircleCollider(x,z,1.4);
    else if(typeof WORLD!=='undefined' && WORLD && WORLD.colliders) WORLD.colliders.push({type:'circle',x,z,r:1.4});

    return G;
  }

  window.makeTutStatue = makeTutStatue;
})();
