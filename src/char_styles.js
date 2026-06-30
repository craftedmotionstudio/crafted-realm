/* char_styles.js — QUALITY-PASS procedural character: a smooth, rounded low-poly humanoid
 * (cozy 2007/OSRS, not Lego). The fix for blockiness is rounded geometry + smooth (gourad)
 * shading + better proportions — NOT photogrammetry. One builder, several STYLE presets that
 * differ in proportion/roundness so we can vote on the look and lock it in. The winner becomes
 * the player base and stays fully modular (skin/hair/clothes colours + the existing rig hooks
 * so walkAnim/gear keep working).
 *
 * Vote in-game: CharStyleVote.show()  (or Shift+V). */

function _csMat(color){ return new THREE.MeshLambertMaterial({ color:color }); }   // smooth, no flatShading

// a smooth tapered limb segment (rounded by sphere caps at both ends)
function _csLimb(rTop, rBot, len, mat, seg){
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg||14), mat);
  cyl.castShadow = true; g.add(cyl);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(rTop, seg||14, 8), mat); cap.position.y =  len/2; g.add(cap);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(rBot, seg||14, 8), mat); capB.position.y = -len/2; g.add(capB);
  return g;
}

/* P: skin, shirt, legs(=trousers), hair colours + style knobs:
 *    headScale, shoulder (width), limb (thickness), heightK, round (joint roundness) */
function makeCharStyle(opts){
  const P = Object.assign({
    skin:0xe0b48c, shirt:0x3a6ea5, legs:0x47433a, hair:0x4a3526,
    headScale:1.0, shoulder:1.0, limb:1.0, heightK:1.0, round:1.0,
  }, opts||{});
  const g = new THREE.Group();
  const parts = {};
  const skinM=_csMat(P.skin), shirtM=_csMat(P.shirt), legM=_csMat(P.legs), hairM=_csMat(P.hair), shoeM=_csMat(0x4a3220);
  const H = P.heightK, LT = 0.072*P.limb, R = P.round;

  // ---- legs: rounded tapered thigh + knee + shin + rounded boot ----
  for(const s of [-1,1]){
    const piv = new THREE.Group(); piv.position.set(s*0.115, 0.86*H, 0);
    const thigh = _csLimb(LT*1.25, LT*1.05, 0.40*H, legM); thigh.position.y=-0.22*H; piv.add(thigh);
    const knee  = new THREE.Mesh(new THREE.SphereGeometry(LT*1.05*R, 12,10), legM); knee.position.y=-0.44*H; piv.add(knee);
    const shin  = _csLimb(LT*1.0, LT*0.8, 0.36*H, legM); shin.position.y=-0.64*H; piv.add(shin);
    const boot  = new THREE.Mesh(new THREE.SphereGeometry(LT*1.15, 12,10), shoeM);
    boot.scale.set(1,0.7,1.5); boot.position.set(0,-0.85*H,0.04); boot.castShadow=true; piv.add(boot);
    g.add(piv); parts['leg'+(s<0?'L':'R')]=piv;
  }
  // ---- hips ----
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.19*P.shoulder, 16,12), legM);
  hips.scale.set(1,0.62,0.72); hips.position.y=0.9*H; hips.castShadow=true; g.add(hips);
  // ---- torso: smooth egg, tapering to the waist ----
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.255*P.shoulder, 0.2, 0.46*H, 18), shirtM);
  torso.position.y=1.18*H; torso.scale.z=0.66; torso.castShadow=true; g.add(torso); parts.torso=torso;
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.255*P.shoulder, 18,12), shirtM);
  chest.scale.set(1,0.7,0.66); chest.position.y=1.40*H; chest.castShadow=true; g.add(chest);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 18), _csMat(0x6b4a2a));
  belt.position.y=0.97*H; belt.scale.z=0.7; g.add(belt);

  // ---- arms: shoulder ball + tapered upper + elbow + forearm + rounded hand ----
  for(const s of [-1,1]){
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.085*P.shoulder*R, 12,10), shirtM);
    sh.position.set(s*0.275*P.shoulder, 1.46*H, 0); sh.castShadow=true; g.add(sh);
    const piv = new THREE.Group(); piv.position.set(s*0.285*P.shoulder, 1.45*H, 0); piv.rotation.z=s*0.08;
    const up = _csLimb(LT*0.95, LT*0.82, 0.30*H, shirtM); up.position.y=-0.15*H; piv.add(up);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(LT*0.82*R, 12,10), skinM); elbow.position.y=-0.30*H; piv.add(elbow);
    const fore = _csLimb(LT*0.78, LT*0.62, 0.28*H, skinM); fore.position.y=-0.45*H; piv.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(LT*0.95, 12,10), skinM);
    hand.scale.set(1,1.1,0.8); hand.position.y=-0.61*H; piv.add(hand);
    const grip = new THREE.Group(); grip.position.set(0,-0.63*H,0.03); piv.add(grip);
    g.add(piv); parts['arm'+(s<0?'L':'R')]=piv; parts['hand'+(s<0?'L':'R')]=grip;
  }

  // ---- neck + rounded head + simple cozy face ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.07,0.08,12), skinM); neck.position.y=1.58*H; g.add(neck);
  const hs = 0.135*P.headScale;
  const head = new THREE.Mesh(new THREE.SphereGeometry(hs, 18,16), skinM);
  head.scale.set(0.92,1.06,0.95); head.position.y=1.70*H; head.castShadow=true; g.add(head); parts.head=head;
  // eyes
  for(const s of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(hs*0.13,8,8), _csMat(0x2a2018));
    eye.position.set(s*hs*0.36, 1.71*H, hs*0.86); g.add(eye);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(hs*0.3,hs*0.06,hs*0.06), hairM);
    brow.position.set(s*hs*0.36, 1.74*H, hs*0.84); g.add(brow);
  }
  // nose
  const nose=new THREE.Mesh(new THREE.SphereGeometry(hs*0.13,8,8), skinM); nose.scale.set(0.8,1,1.1); nose.position.set(0,1.69*H,hs*0.95); g.add(nose);
  // ---- smooth hair cap ----
  const hair = new THREE.Mesh(new THREE.SphereGeometry(hs*1.04, 18,14, 0, Math.PI*2, 0, Math.PI*0.6), hairM);
  hair.scale.set(1,1.05,1); hair.position.y=1.71*H; g.add(hair);
  parts.headTop = new THREE.Group(); parts.headTop.position.y=1.86*H; g.add(parts.headTop);

  g.userData.parts = parts; g.userData.walkT = 0;
  return g;
}

// the four style candidates to vote on (proportion/roundness only — colours identical)
const CHAR_STYLES = [
  { key:'A', name:'Smooth Classic', p:{ headScale:1.0, shoulder:1.0,  limb:1.0,  heightK:1.0,  round:1.0 } },
  { key:'B', name:'Cozy / Chibi',   p:{ headScale:1.28, shoulder:1.05, limb:1.18, heightK:0.9,  round:1.25 } },
  { key:'C', name:'Heroic',         p:{ headScale:0.9,  shoulder:1.18, limb:1.05, heightK:1.12, round:1.0 } },
  { key:'D', name:'Sleek',          p:{ headScale:0.96, shoulder:0.92, limb:0.85, heightK:1.06, round:1.1 } },
];

const CharStyleVote = {
  active:false, group:null,
  show(){
    if(typeof scene==='undefined' || typeof player==='undefined') return;
    this.hide();
    const grp = new THREE.Group(); this.group = grp;
    const cam=camera.position, px=player.position.x, pz=player.position.z;
    let vx=cam.x-px, vz=cam.z-pz; const vl=Math.hypot(vx,vz)||1; vx/=vl; vz/=vl;
    const rx=-vz, rz=vx, cX=px-vx*3.2, cZ=pz-vz*3.2;
    const span=1.5, x0=-(CHAR_STYLES.length-1)/2*span;
    CHAR_STYLES.forEach((s,i)=>{
      const o=x0+i*span, x=cX+rx*o, z=cZ+rz*o;
      const m=makeCharStyle(s.p);
      const gy_=(typeof gy==='function')?gy(x,z):0;
      m.position.set(x, gy_, z);
      m.rotation.y=Math.atan2(cam.x-x, cam.z-z);
      m.add(this._label(s.key+'  ·  '+s.name));
      grp.add(m);
    });
    scene.add(grp); this.active=true;
    if(typeof UI!=='undefined'&&UI.chat) UI.chat('[STYLE] Four character styles spawned to vote on: A Smooth · B Cozy · C Heroic · D Sleek. Shift+V to close.','sys');
  },
  hide(){ if(this.group&&this.group.parent) this.group.parent.remove(this.group); this.group=null; this.active=false; },
  _label(t){
    const c=document.createElement('canvas'); c.width=320; c.height=48;
    const x=c.getContext('2d'); x.fillStyle='rgba(20,16,8,0.85)'; x.fillRect(0,0,320,48);
    x.font='bold 26px sans-serif'; x.fillStyle='#ffd24a'; x.textAlign='center'; x.textBaseline='middle'; x.fillText(t,160,26);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c), depthTest:false}));
    sp.scale.set(2.0,0.3,1); sp.position.y=2.15; return sp;
  },
};
addEventListener('keydown', e=>{
  if((e.key==='V'||e.key==='v') && e.shiftKey && !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault(); CharStyleVote.active ? CharStyleVote.hide() : CharStyleVote.show();
  }
});
