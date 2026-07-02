/* char_styles.js — refined OSRS-style procedural character: flat-shaded LOW-POLY, but NOT blocky.
 *
 * The "blocky" problem was the FACE (a plain box with decal features) and crude tube limbs. The
 * fix: SCULPT the head into real facial planes (rounded skull, brow ridge, cheeks, tapered jaw,
 * chin, a protruding nose wedge) and flat-shade it so the facets read as a face — matching the
 * approved concepts (assets/char_ref + char_concepts). Stays fully procedural so it animates with
 * the existing rig (parts.legL etc.) and is grounded by the game's groundY (no floating), and
 * stays modular (skin/tunic/legs/hair/boots colours).
 *
 * Preview in-game: CharPreview.show()  (or Shift+V). */

function _flat(color){ return new THREE.MeshLambertMaterial({ color:color, flatShading:true }); }

// ---- a sculpted low-poly head (facial planes), NOT a box ----
function _sculptHead(skinM, hairM, P){
  const grp = new THREE.Group();
  const HW=0.088, HH=0.132, HD=0.097;                 // narrower → an oval head, not a slab
  const eyeWhiteM=_flat(0xf2ece0), pupilM=_flat(0x241a12);
  const geo = new THREE.BoxGeometry(HW*2, HH*2, HD*2, 5, 7, 5);
  const pa = geo.attributes.position;
  for(let i=0;i<pa.count;i++){
    let x=pa.getX(i), y=pa.getY(i), z=pa.getZ(i);
    const hy = y/HH;                                   // -1 chin .. +1 crown
    // rounded skull + strongly tapered jaw, plus general egg rounding
    let w = 1 - 0.34*Math.pow(Math.max(0,hy),1.4) - 0.5*Math.pow(Math.max(0,-hy),1.5) - 0.14*Math.pow(Math.abs(hy),2);
    let d = 1 - 0.26*Math.pow(Math.max(0,hy),1.5) - 0.34*Math.pow(Math.max(0,-hy),1.4);
    // pull the side columns inward at mid-height too (cheeks taper, not a box)
    x*=w; z*=d;
    if(z>0){
      if(hy>0.05 && hy<0.42) z += 0.014*(1-Math.abs(hy-0.22)/0.25);   // brow ridge
      if(hy<-0.45) z += (-hy-0.45)*0.06;                              // chin
      if(hy>-0.2 && hy<0.05) z += 0.006;                              // cheek/upper-lip fullness
    } else {
      z -= 0.014*Math.max(0, 1-Math.abs(hy));                         // round occiput
    }
    pa.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const head = new THREE.Mesh(geo, skinM); head.castShadow=true; grp.add(head);
  // nose: a clear forward-pointing triangular prism (skin), reads as a nose, not a hole
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.05, 3), skinM);
  nose.rotation.set(Math.PI*0.5, Math.PI, 0); nose.position.set(0, -0.012, HD*0.96); nose.scale.set(1,1.4,0.9); grp.add(nose);
  // eyes: a light eye-shape with a dark pupil, set just into the face (clearly visible)
  for(const s of [-1,1]){
    const sock=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.026,0.01), eyeWhiteM);
    sock.position.set(s*0.04, 0.028, HD*0.93); sock.rotation.z=-s*0.06; grp.add(sock);
    const pup=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.02,0.012), pupilM);
    pup.position.set(s*0.04, 0.028, HD*0.95); grp.add(pup);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(0.046,0.013,0.014), hairM);
    brow.position.set(s*0.042, 0.06, HD*0.9); brow.rotation.z=-s*0.13; grp.add(brow);
  }
  // mouth
  const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.044,0.013,0.012), _flat(0x9a5f4a));
  mouth.position.set(0,-0.062, HD*0.9); grp.add(mouth);
  // ears flush to the head
  for(const s of [-1,1]){
    const ear=new THREE.Mesh(new THREE.BoxGeometry(0.016,0.044,0.034), skinM);
    ear.position.set(s*0.083,-0.004,-0.005); grp.add(ear);
  }
  return grp;
}

function makeOSRSChar(opts){
  const P = Object.assign({
    skin:0xe0b189, tunic:0x4a6a4a, legs:0x6f5a44, boots:0x5a3c24, hair:0x6a4a2a, belt:0x4a3018,
  }, opts||{});
  const g = new THREE.Group(); const parts = {};
  const skinM=_flat(P.skin), tunicM=_flat(P.tunic), legM=_flat(P.legs), bootM=_flat(P.boots), hairM=_flat(P.hair), beltM=_flat(P.belt);

  // ---- legs: faceted tapered trousers + shaped boot (toe + heel + cuff) ----
  for(const s of [-1,1]){
    const piv=new THREE.Group(); piv.position.set(s*0.1, 0.74, 0);
    const thigh=new THREE.Mesh(new THREE.CylinderGeometry(0.092,0.078,0.34,8), legM); thigh.position.y=-0.18; thigh.castShadow=true; piv.add(thigh);
    const shin =new THREE.Mesh(new THREE.CylinderGeometry(0.078,0.062,0.34,8), legM); shin.position.y=-0.5; shin.castShadow=true; piv.add(shin);
    const cuff =new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.088,0.1,8), bootM); cuff.position.y=-0.66; piv.add(cuff);
    const foot =new THREE.Mesh(new THREE.BoxGeometry(0.11,0.085,0.2), bootM); foot.position.set(0,-0.73,0.04); piv.add(foot);
    const toe  =new THREE.Mesh(new THREE.BoxGeometry(0.1,0.06,0.08), bootM); toe.position.set(0,-0.745,0.15); piv.add(toe);
    g.add(piv); parts['leg'+(s<0?'L':'R')]=piv;
  }
  // ---- tunic: shaped flat-shaded top, flaring to a hem, with a chest taper ----
  const tunicGeo = new THREE.CylinderGeometry(0.21,0.3,0.82,10,3);
  { const pa=tunicGeo.attributes.position;                 // flatten front/back + waist pinch
    for(let i=0;i<pa.count;i++){ let x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i);
      z*=0.7; const ty=y/0.41; if(ty>-0.1&&ty<0.4){ const k=1-0.12*(1-Math.abs(ty-0.15)/0.25); x*=k; z*=k; }
      pa.setXYZ(i,x,y,z); } tunicGeo.computeVertexNormals(); }
  const tunic=new THREE.Mesh(tunicGeo, tunicM); tunic.position.y=1.12; tunic.castShadow=true; g.add(tunic); parts.torso=tunic;
  const belt=new THREE.Mesh(new THREE.CylinderGeometry(0.235,0.235,0.045,10), beltM); belt.position.y=1.0; belt.scale.z=0.72; g.add(belt);
  // shoulders fill
  const shoulders=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.16,10), tunicM); shoulders.position.y=1.44; shoulders.scale.z=0.72; g.add(shoulders);

  // ---- arms: faceted tapered sleeves + a shaped low-poly hand ----
  for(const s of [-1,1]){
    const piv=new THREE.Group(); piv.position.set(s*0.235,1.46,0); piv.rotation.z=s*0.09;
    const up =new THREE.Mesh(new THREE.CylinderGeometry(0.072,0.06,0.3,8), tunicM); up.position.y=-0.15; up.castShadow=true; piv.add(up);
    const fore=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.05,0.28,8), tunicM); fore.position.y=-0.42; piv.add(fore);
    const hand=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.1,0.055), skinM);
    { const pa=hand.geometry.attributes.position; for(let i=0;i<pa.count;i++){ if(pa.getY(i)<0){ pa.setX(i,pa.getX(i)*0.7);} } hand.geometry.computeVertexNormals(); }
    hand.position.y=-0.6; piv.add(hand);
    const grip=new THREE.Group(); grip.position.set(0,-0.63,0.03); piv.add(grip);
    g.add(piv); parts['arm'+(s<0?'L':'R')]=piv; parts['hand'+(s<0?'L':'R')]=grip;
  }

  // ---- neck + sculpted head ----
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.072,0.08,8), skinM); neck.position.y=1.54; g.add(neck);
  const head=_sculptHead(skinM, hairM, P); head.position.y=1.71; g.add(head); parts.head=head;
  // ---- hair: swept low-poly cap (angled pieces, leaves the face) ----
  const cap=new THREE.Mesh(new THREE.SphereGeometry(0.122,10,6,0,Math.PI*2,0,Math.PI*0.55), hairM);
  cap.scale.set(1,0.95,1.04); cap.position.y=1.745; g.add(cap);
  const fringe=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.05,0.05), hairM); fringe.position.set(0,1.79,0.1); fringe.rotation.x=0.2; g.add(fringe);
  const back=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.18,0.06), hairM); back.position.set(0,1.71,-0.1); g.add(back);
  for(const s of [-1,1]){ const side=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.16,0.18), hairM); side.position.set(s*0.103,1.72,-0.005); g.add(side); }

  parts.headTop=new THREE.Group(); parts.headTop.position.y=1.87; g.add(parts.headTop);
  g.userData.parts=parts; g.userData.walkT=0;
  return g;
}

const CharPreview = {
  active:false, group:null, char:null,
  show(){
    if(typeof scene==='undefined' || typeof player==='undefined') return;
    this.hide();
    const grp=new THREE.Group(); this.group=grp;
    const cam=camera.position, px=player.position.x, pz=player.position.z;
    let vx=cam.x-px, vz=cam.z-pz; const vl=Math.hypot(vx,vz)||1; vx/=vl; vz/=vl;
    const x=px-vx*2.6, z=pz-vz*2.6;
    const m=makeOSRSChar({});
    const gy_=(typeof gy==='function')?gy(x,z):0;
    m.position.set(x, gy_, z);
    m.rotation.y=Math.atan2(cam.x-x, cam.z-z)+Math.PI;
    grp.add(m); scene.add(grp); this.active=true; this.char=m;
    if(typeof UI!=='undefined'&&UI.chat) UI.chat('[STYLE] Refined OSRS character preview (sculpted face). Shift+V to close.','sys');
  },
  hide(){ if(this.group&&this.group.parent) this.group.parent.remove(this.group); this.group=null; this.active=false; },
};
addEventListener('keydown', e=>{
  if((e.key==='V'||e.key==='v') && e.shiftKey && !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault(); CharPreview.active ? CharPreview.hide() : CharPreview.show();
  }
});
