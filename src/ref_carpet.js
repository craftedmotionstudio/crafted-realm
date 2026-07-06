// ref_carpet.js — ornate OSRS star-medallion aisle rug (recreated from Bible_References/Town2.jpg)
// Global-script (r128). Exposes window.makeRefCarpet(x,z,rot) -> THREE.Group.
// Deep-red field, gold/yellow border band, a centred column of black 4-pointed
// concave-star (compass-cross) medallions, drawn via an in-file canvas texture.
(function(){
  'use strict';
  if (typeof window === 'undefined' || typeof THREE === 'undefined') return;

  // Material guard: reuse the world's mat() palette if present, else flat Lambert.
  const M = (c) => (typeof mat === 'function')
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // ---- in-file canvas texture: red base, gold border, black star motifs ----
  // Footprint is ~2x4 tiles (2 wide, 4 long). Canvas is 128x256 to match that 1:2
  // aspect so the square star medallions stay square, not stretched.
  function carpetTexture(){
    const W = 128, H = 256;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');

    const RED_D = '#7c1512';   // deep shadow red
    const RED   = '#a51f1a';   // main field red
    const RED_L = '#c22a22';   // lighter mottle
    const GOLD  = '#e0b23c';   // gold/yellow border
    const GOLD_D= '#a67a20';   // gold shadow line
    const GOLD_L= '#f4d873';   // gold highlight line
    const BLACK = '#161210';   // star motif

    // deep-red field with subtle woven mottle (kept low-contrast, OSRS colour field)
    x.fillStyle = RED; x.fillRect(0,0,W,H);
    for (let i=0;i<520;i++){ x.fillStyle = (Math.random()<0.5?RED_D:RED_L);
      x.fillRect(Math.random()*W|0, Math.random()*H|0, 2, 2); }

    // ---- gold border band ----
    const b = 14;                       // border band thickness
    x.fillStyle = GOLD;
    x.fillRect(0,0,W,b); x.fillRect(0,H-b,W,b);
    x.fillRect(0,0,b,H); x.fillRect(W-b,0,b,H);
    // twin trim lines framing the gold band (inner + outer) for that woven edge
    x.strokeStyle = GOLD_D; x.lineWidth = 2;
    x.strokeRect(2,2,W-4,H-4);
    x.strokeStyle = GOLD_L; x.lineWidth = 1;
    x.strokeRect(b,b,W-2*b,H-2*b);
    // inner red field is inset from the gold band
    x.strokeStyle = RED_D; x.lineWidth = 2;
    x.strokeRect(b+3,b+3,W-2*(b+3),H-2*(b+3));

    // ---- 4-pointed concave-star (compass-cross) medallion ----
    // Four sharp points on the axes; the sides between points curve INWARD toward
    // the centre (the OSRS "throwing star" look). r = tip radius, k = waist inset.
    function star(cx, cy, r){
      const k = r * 0.30;               // how close the concave waist pulls in
      x.beginPath();
      // up
      x.moveTo(cx, cy - r);
      x.quadraticCurveTo(cx + k, cy - k, cx + r, cy);      // to right tip
      x.quadraticCurveTo(cx + k, cy + k, cx, cy + r);      // to down tip
      x.quadraticCurveTo(cx - k, cy + k, cx - r, cy);      // to left tip
      x.quadraticCurveTo(cx - k, cy - k, cx, cy - r);      // back to up tip
      x.closePath();
      x.fillStyle = BLACK; x.fill();
      // tiny centre diamond accent (negative-space read)
      const s = r*0.16;
      x.fillStyle = RED_D;
      x.beginPath();
      x.moveTo(cx, cy-s); x.lineTo(cx+s, cy); x.lineTo(cx, cy+s); x.lineTo(cx-s, cy);
      x.closePath(); x.fill();
    }

    // column of medallions down the centre of the red field
    const cx = W/2;
    const big = 30;                     // large medallions
    const small = 11;                   // small linking diamonds between them
    const rows = 3;
    const top = 52, bot = H-52;
    for (let i=0;i<rows;i++){
      const cy = top + (bot-top) * (i/(rows-1));
      star(cx, cy, big);
      // small linking star halfway to the next big one
      if (i < rows-1){
        const cyMid = top + (bot-top) * ((i+0.5)/(rows-1));
        star(cx, cyMid, small);
      }
    }

    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  // cache the texture (one canvas shared by all carpets)
  let CARPET_TEX = null;

  window.makeRefCarpet = function(x=0, z=0, rot=0){
    const g = new THREE.Group();
    const LEN = 4.0, WID = 2.0, THK = 0.04, Y = 0.02;

    if (!CARPET_TEX) CARPET_TEX = carpetTexture();

    // thin flat slab carrying the pattern on its top face
    const topMat = new THREE.MeshLambertMaterial({ map: CARPET_TEX, flatShading: true });
    const sideMat = M(0x7c1512);        // deep-red edges/underside
    // BoxGeometry face order: +x,-x,+y,-y,+z,-z  -> pattern on +y (top)
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const slab = new THREE.Mesh(new THREE.BoxGeometry(WID, THK, LEN), mats);
    slab.position.y = Y;
    if (slab.receiveShadow !== undefined) slab.receiveShadow = true;
    g.add(slab);

    // short fringe/tassels at the two short ends
    const fringeMat = M(0xe0b23c);      // gold tassels
    const nTass = 9;
    for (let end=-1; end<=1; end+=2){
      const ez = end * (LEN/2 + 0.08);
      for (let i=0;i<nTass;i++){
        const tx = -WID/2 + WID*((i+0.5)/nTass);
        const tass = new THREE.Mesh(new THREE.BoxGeometry(0.06, THK*0.8, 0.16), fringeMat);
        tass.position.set(tx, Y, ez);
        g.add(tass);
      }
    }

    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return g;
  };

  console.log('[ref_carpet] makeRefCarpet ready');
})();
