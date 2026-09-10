/* ============================================================================
 * ref_furstall.js  —  Furrier / pelt market stall (OSRS-quality low-poly)
 * Self-contained. Exposes window.makeRefFurStall(x=0, z=0, rot=0) -> THREE.Group.
 * Recreated from Bible_References/EmptyStall+FurStall.jpg (the FUR STALL):
 *   timber-framed shopfront, sloped cream cloth awning with a short hanging
 *   fringe, a plank counter piled with FOLDED HIDES + rolled skins + a couple
 *   of FUR HATS and a curing bowl, and rows of HANGING PELTS (draped animal
 *   skins in browns/greys/white, some with tails) along the back & one side.
 * Flat-shaded, cached materials, cast shadows on solids, gentle cloth/pelt sway.
 * ==========================================================================*/
(function(){
  if (typeof THREE === 'undefined') { return; }

  // ---- material helper: reuse the game's mat() when present, else fallback ----
  const M = (c)=> typeof mat==='function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // shared cache so repeated calls reuse one material per colour
  const _matCache = {};
  const CM = (c)=> _matCache[c] || (_matCache[c] = M(c));

  // ---------- warm rustic palette ----------
  const COL = {
    postDark:  0x5f3f24,   // structural timber (dark, weathered)
    beam:      0x7a5533,   // frame beams / rails
    pole:      0x6e4a2e,   // hanging pole
    counter:   0x8a6a44,   // counter body
    counterTop:0x9c7a4e,   // scrubbed plank top
    plank:     0x6e4a2e,   // shelf / kick planks
    cloth:     0xe7dcbf,   // awning cream
    clothB:    0xd9caa2,   // awning shade band
    fringe:    0xcf9d5a,   // valance / fringe accent
    rope:      0x4a3826,
    bowl:      0x8a6a44,   // curing bowl
    bowlIn:    0x5f3f24,
    // pelt / hide colours — richer animal-FUR tones (dark brown, grey-brown,
    // russet fox, off-white, black) so hanging pelts read as furs, not cloth.
    furBrown:  0x5a3a22,   // dark brown fur
    furBrDk:   0x2e2620,   // near-black fur
    furTan:    0x8a6338,   // warm tan pelt
    furTanLt:  0xa8895a,   // warm tan (belly / lighter fur)
    furGrey:   0x6b5a48,   // grey-brown fur
    furGreyLt: 0x8a7a63,   // lighter grey-brown
    furWhite:  0xd8cdb8,   // off-white fur
    furFox:    0x9a5a2a,   // russet fox
    furBelly:  0xa8895a,   // warm-tan underside (darkened from pale cream)
    hatFelt:   0x5a3f2a,
    hatFelt2:  0x3e5a4a
  };
  const PELTS = [
    {c:COL.furBrown,  belly:COL.furBelly, tail:true },
    {c:COL.furGrey,   belly:COL.furGreyLt,tail:false},
    {c:COL.furWhite,  belly:COL.furWhite, tail:true },
    {c:COL.furFox,    belly:COL.furBelly, tail:true },
    {c:COL.furTan,    belly:COL.furTanLt, tail:false},
    {c:COL.furBrDk,   belly:COL.furBelly, tail:true }
  ];

  // ---------- tiny mesh helpers ----------
  function m(geo, col, sx, sy, sz){
    const me = new THREE.Mesh(geo, CM(col));
    me.castShadow = true; me.receiveShadow = true;
    if (sx!==undefined) me.position.set(sx, sy, sz);
    return me;
  }
  function box(w,h,d,col,x,y,z){ return m(new THREE.BoxGeometry(w,h,d), col, x,y,z); }
  function cyl(rt,rb,h,seg,col,x,y,z){ return m(new THREE.CylinderGeometry(rt,rb,h,seg), col, x,y,z); }

  // A draped hanging pelt — animal skin hung from a curing pole.
  // Local origin sits at the TOP (where it drapes over the pole);
  // the body hangs downward along -y. Returned as its own Group so it can sway.
  function hangingPelt(w, h, spec){
    const g = new THREE.Group();
    const col = spec.c, belly = spec.belly;
    // deterministic per-pelt jitter so each skin has its own irregular outline
    const seed = (spec.c & 0xff) / 255;              // 0..1 from colour byte
    const jig  = (k)=> Math.sin(seed*12.9898 + k*4.317) * 0.5;   // -0.5..0.5-ish
    // main skin slab (thin), draped — a touch BIGGER and with irregular width
    const mw = w * (1.08 + jig(1)*0.12);             // varied body width
    g.add(box(mw, h, 0.07, col, jig(2)*w*0.05, -h*0.5, 0));
    // shaggy irregular side lobes down the flanks (uneven silhouette)
    const lobeGeo = new THREE.BoxGeometry(w*0.26, h*0.34, 0.06);
    for (let k=0;k<3;k++){
      const side = (k%2? 1 : -1);
      const lw = mw*0.5 + w*(0.02 + Math.abs(jig(k+3))*0.06);
      const lob = m(lobeGeo, col, side*lw, -h*(0.28 + k*0.22), 0.01);
      lob.rotation.z = side * (0.18 + Math.abs(jig(k+7))*0.22);
      lob.scale.set(0.7 + Math.abs(jig(k+5))*0.7, 1, 1);
      g.add(lob);
    }
    // warm-tan underside patch (belly), a touch in front so it reads as fur inside
    g.add(box(mw*0.58, h*0.72, 0.02, belly, jig(2)*w*0.05, -h*0.5, 0.045));
    // head lobe at the top (draped over the pole) — enlarged
    const head = m(new THREE.SphereGeometry(w*0.4, 7, 5), col);
    head.scale.set(1.05, 0.9, 0.7); head.position.set(jig(2)*w*0.05, 0.05, 0.0); g.add(head);
    // two little ears
    for (const ex of [-w*0.2, w*0.2]){
      const ear = m(new THREE.ConeGeometry(w*0.1, w*0.18, 4), col);
      ear.position.set(ex, 0.12, 0.0); g.add(ear);
    }
    // four splayed leg flaps (front pair high, back pair low)
    const legGeo = new THREE.BoxGeometry(w*0.2, h*0.3, 0.05);
    const legs = [
      [-w*0.5, -h*0.2,  0.55],
      [ w*0.5, -h*0.2, -0.55],
      [-w*0.55,-h*0.72, 0.4 ],
      [ w*0.55,-h*0.72,-0.4 ]
    ];
    for (const [lx,ly,rz] of legs){
      const leg = m(legGeo, col, lx, ly, 0);
      leg.rotation.z = rz; g.add(leg);
    }
    // tail hanging off the bottom (some pelts only)
    if (spec.tail){
      const tail = m(new THREE.CylinderGeometry(w*0.05, w*0.11, h*0.34, 6),
                     col, 0, -h*1.02, 0.01);
      g.add(tail);
      // pale tail tip (fox-style)
      g.add(m(new THREE.SphereGeometry(w*0.07,6,5), belly, 0, -h*1.16, 0.01));
    }
    return g;
  }

  // A folded hide — low rounded slab with a soft folded crease along the front.
  function foldedHide(w, d, col){
    const g = new THREE.Group();
    g.add(box(w, 0.13, d, col, 0, 0.065, 0));
    // rounded fold edge (half-cylinder laid along the width, at the front)
    const fold = m(new THREE.CylinderGeometry(0.075, 0.075, w*0.98, 8), col);
    fold.rotation.z = Math.PI/2; fold.position.set(0, 0.075, d*0.5);
    g.add(fold);
    return g;
  }

  // A rolled skin — a short fur bolster lying on its side.
  function rolledHide(len, r, col){
    const g = new THREE.Group();
    const roll = cyl(r, r, len, 9, col, 0, 0, 0);
    roll.rotation.z = Math.PI/2; roll.position.y = r; g.add(roll);
    // darker end swirl so the roll reads
    for (const ex of [-len*0.5, len*0.5]){
      const cap = m(new THREE.CylinderGeometry(r*0.55, r*0.55, 0.02, 9), COL.furBrDk);
      cap.rotation.z = Math.PI/2; cap.position.set(ex*1.001, r, 0); g.add(cap);
    }
    return g;
  }

  // A fur-trimmed winter hat: felt crown + shaggy fur band + fur bobble.
  function furHat(felt, fur){
    const g = new THREE.Group();
    g.add(cyl(0.15, 0.17, 0.2, 10, felt, 0, 0.14, 0));          // crown
    const dome = m(new THREE.SphereGeometry(0.15, 9, 6), felt);
    dome.scale.set(1, 0.55, 1); dome.position.y = 0.24; g.add(dome);
    g.add(cyl(0.2, 0.2, 0.11, 12, fur, 0, 0.055, 0));           // fur band
    g.add(m(new THREE.IcosahedronGeometry(0.06,0), fur, 0, 0.32, 0)); // bobble
    return g;
  }

  // ========================================================================
  window.makeRefFurStall = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    const W = 4.0;   // counter width (x)
    const D = 2.4;   // depth (z) — customer side at +z, furrier side at -z
    const POST = 2.9;
    const px = W*0.5 - 0.12, pz = D*0.5 - 0.12;

    // ---------------- structural timber frame ----------------
    const postGeo = new THREE.BoxGeometry(0.22, POST, 0.22);
    for (const [sx,sz] of [[-px,-pz],[px,-pz],[-px,pz],[px,pz]]){
      g.add(m(postGeo, COL.postDark, sx, POST*0.5, sz));
    }
    // top rails — form the awning plate and pelt-hanging structure
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST, -pz));
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST,  pz));
    g.add(box(0.16, 0.16, D, COL.beam, -px, POST,  0));
    g.add(box(0.16, 0.16, D, COL.beam,  px, POST,  0));

    // ---------------- sloped cream cloth awning ----------------
    const awning = new THREE.Group();
    const nStripe = 7, sw = (W+0.5)/nStripe;
    const slopeLen = D + 0.7;
    const stripeGeo = new THREE.BoxGeometry(sw*0.99, 0.05, slopeLen);
    for (let i=0;i<nStripe;i++){
      const strip = new THREE.Mesh(stripeGeo, CM(i%2 ? COL.clothB : COL.cloth));
      strip.castShadow = true; strip.receiveShadow = true;
      strip.position.x = -(W+0.5)/2 + sw*(i+0.5);
      awning.add(strip);
    }
    awning.rotation.x = 0.30;                    // front edge drops lower
    awning.position.set(0, POST + 0.34, 0.15);
    g.add(awning);

    // ---------------- SHORT hanging valance fringe (front) ----------------
    // Built in the untilted group so it hangs STRAIGHT DOWN off the front rail;
    // short local flaps — never a wide flat plank that can swing out to a strip.
    const frontZ = pz + 0.06;
    const frontY = POST + 0.30;
    const fringe = [];
    const flapGeo = new THREE.BoxGeometry(sw*0.9, 0.24, 0.03);
    for (let i=0;i<nStripe;i++){
      const pivot = new THREE.Group();
      pivot.position.set(-(W+0.5)/2 + sw*(i+0.5), frontY, frontZ);
      const flap = new THREE.Mesh(flapGeo, CM(i%2 ? COL.fringe : COL.cloth));
      flap.castShadow = true; flap.position.y = -0.12;   // hangs down, local space
      // little triangular scallop point at the bottom
      const point = new THREE.Mesh(new THREE.ConeGeometry(sw*0.42, 0.14, 4),
                                   CM(i%2 ? COL.fringe : COL.cloth));
      point.rotation.x = Math.PI; point.position.y = -0.31; flap.add(point);
      pivot.add(flap);
      pivot.userData.phase = i*0.7;
      g.add(pivot);
      fringe.push(pivot);
    }

    // ---------------- goods counter (customer-facing front) ----------------
    const counterY = 0.95, counterZ = pz - 0.35;
    g.add(box(W-0.2, counterY, 0.7, COL.counter, 0, counterY*0.5, counterZ));
    g.add(box(W+0.1, 0.1, 0.9, COL.counterTop, 0, counterY+0.05, counterZ));
    g.add(box(W-0.6, 0.5, 0.02, COL.plank, 0, 0.4, counterZ+0.36));   // kick panel
    g.add(box(W-0.3, 0.06, 0.6, COL.plank, 0, 0.34, counterZ));        // under-shelf

    // ---------------- hanging pelts along the BACK ----------------
    // a curing pole slung just below the back rail; pelts drape over it
    const bpole = cyl(0.05, 0.05, W-0.4, 8, COL.pole, 0, POST-0.32, -pz+0.28);
    bpole.rotation.z = Math.PI/2; g.add(bpole);
    const pelts = [];
    const backN = 4;
    for (let i=0;i<backN;i++){
      const spec = PELTS[i % PELTS.length];
      const p = hangingPelt(0.7, 1.45, spec);
      const bx = -W*0.5 + 0.62 + i*((W-1.24)/(backN-1));
      p.position.set(bx, POST-0.30, -pz+0.28);
      p.userData.phase = i*0.9;
      p.rotation.x = 0.06;                    // slight forward drape
      g.add(p); pelts.push(p);
    }

    // ---------------- hanging pelts along one SIDE (left) ----------------
    const spole = cyl(0.05, 0.05, D-0.4, 8, COL.pole, -px+0.02, POST-0.5, 0);
    spole.rotation.x = Math.PI/2; g.add(spole);
    for (let i=0;i<2;i++){
      const spec = PELTS[(i+2) % PELTS.length];
      const p = hangingPelt(0.56, 1.12, spec);
      p.position.set(-px+0.05, POST-0.48, -0.35 + i*0.7);
      p.rotation.y = Math.PI*0.5;             // face outward along the side
      p.userData.phase = 3 + i*0.8;
      g.add(p); pelts.push(p);
    }

    // ---------------- FOLDED HIDES piled on the counter ----------------
    const topY = counterY + 0.1;
    // pile A (left) — stack of three folded hides
    const stackA = [
      [0.9, 0.6, COL.furBrown, 0.0 ],
      [0.82,0.55,COL.furTan,   0.12],
      [0.7, 0.5, COL.furGrey, -0.1 ]
    ];
    let ay = topY;
    for (const [w,d,c,ry] of stackA){
      const h = foldedHide(w, d, c);
      h.position.set(-W*0.5+0.75, ay, counterZ-0.02);
      h.rotation.y = ry; g.add(h);
      ay += 0.15;
    }
    // pile B (centre) — two wider hides
    const stackB = [
      [1.0, 0.62, COL.furFox,  0.05],
      [0.86,0.55, COL.furWhite,-0.08]
    ];
    let by = topY;
    for (const [w,d,c,ry] of stackB){
      const h = foldedHide(w, d, c);
      h.position.set(0.35, by, counterZ+0.05);
      h.rotation.y = ry; g.add(h);
      by += 0.15;
    }
    // a rolled skin resting on top of pile B
    const roll = rolledHide(0.8, 0.12, COL.furTanLt);
    roll.position.set(0.35, by, counterZ+0.05); roll.rotation.y = 0.15; g.add(roll);
    // a couple of loose rolled skins at the right end
    const roll2 = rolledHide(0.62, 0.1, COL.furBrDk);
    roll2.position.set(W*0.5-0.7, topY, counterZ+0.12); roll2.rotation.y = -0.25; g.add(roll2);

    // ---------------- fur hats + curing bowl on the counter ----------------
    const hat1 = furHat(COL.hatFelt, COL.furWhite);
    hat1.position.set(W*0.5-0.7, topY, counterZ-0.16); g.add(hat1);
    const hat2 = furHat(COL.hatFelt2, COL.furGrey);
    hat2.position.set(W*0.5-1.15, topY, counterZ-0.05); hat2.scale.setScalar(0.85); g.add(hat2);

    // small curing/dye bowl (as seen in the reference), between the piles
    const bowl = new THREE.Group();
    bowl.add(cyl(0.17, 0.11, 0.13, 10, COL.bowl, 0, 0.065, 0));
    bowl.add(cyl(0.14, 0.14, 0.03, 10, COL.bowlIn, 0, 0.12, 0));   // dark contents
    bowl.position.set(-0.5, topY, counterZ+0.14); g.add(bowl);

    // ---------------- final transform ----------------
    let baseY = 0;
    if (typeof gy === 'function'){ try { baseY = gy(x,z)||0; } catch(e){} }
    g.position.set(x, baseY, z);
    g.rotation.y = rot;

    // collider (if the world uses them) — footprint ~ W x D
    if (typeof WORLD === 'object' && WORLD && Array.isArray(WORLD.colliders)){
      WORLD.colliders.push({type:'rect', x:x, z:z, hw:W*0.5, hd:D*0.5});
    }

    // ---------------- gentle cloth + pelt sway (self-installed rAF) ----------
    const swayers = fringe.concat(pelts);
    g.userData.swayers = swayers;
    if (!window.__refFurStallTick){
      window.__refFurStallTick = { groups: [] };
      const tick = ()=>{
        const t = (typeof performance!=='undefined'? performance.now(): Date.now())*0.001;
        const list = window.__refFurStallTick.groups;
        for (let i=list.length-1;i>=0;i--){
          const grp = list[i];
          if (!grp.parent){ list.splice(i,1); continue; }   // removed from scene
          const sw = grp.userData.swayers; if (!sw) continue;
          for (const s of sw){
            const ph = s.userData.phase||0;
            s.rotation.z = Math.sin(t*1.05 + ph)*0.04;
          }
        }
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
    }
    window.__refFurStallTick.groups.push(g);

    return g;
  };

  console.log('[ref_furstall] makeRefFurStall ready');
})();
