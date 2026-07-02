/* ============ fx_atmosphere — the living sky (visual loop pass #1) ============
 * Cheap, always-on atmosphere so the world breathes:
 *   - drifting cloud clusters that CAST SOFT MOVING SHADOWS across the ground
 *     (the single most visible "alive" cue in a top-down world)
 *   - a few birds tracing lazy arcs overhead
 *   - sunlit pollen motes drifting near the ground
 * All driven by one light setInterval (hidden-tab safe); everything wraps around
 * the charted map. Registered as an overlay toggle ("Atmosphere") for perf control.
 */
const Atmosphere = {
  _group:null, _iv:null, clouds:[], birds:[], motes:null,
  BOUNDS: 150,

  start(){
    if(this._group || typeof scene==='undefined') return;
    const G=new THREE.Group(); this._group=G;

    // ---- clouds: 7 puffs of merged soft spheres, high up, shadow-casting ----
    const cloudMat=new THREE.MeshLambertMaterial({color:0xffffff, transparent:true, opacity:0.88});
    for(let i=0;i<7;i++){
      const c=new THREE.Group();
      const n=3+Math.floor(Math.abs(Math.sin(i*13.7))*3);
      for(let j=0;j<n;j++){
        const r=2.2+Math.abs(Math.sin(i*7+j*3))*2.6;
        const s=new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), cloudMat);
        s.position.set((j-(n-1)/2)*r*1.15, Math.abs(Math.sin(j*5+i))*0.8, Math.sin(j*2.3+i)*1.6);
        s.scale.y=0.42;                      // flat-bottomed cumulus read
        s.castShadow=true;                   // the drifting ground shadows
        c.add(s);
      }
      c.position.set((Math.sin(i*17.3)*0.9)*this.BOUNDS, 44+Math.sin(i*3)*6, (Math.cos(i*11.1)*0.9)*this.BOUNDS);
      c.userData.v={x:0.55+Math.abs(Math.sin(i*5))*0.35, z:0.12*Math.sin(i*9)};
      G.add(c); this.clouds.push(c);
    }

    // ---- birds: 3 little dark chevrons on slow circular tracks ----
    const birdMat=new THREE.MeshBasicMaterial({color:0x2a2620});
    for(let i=0;i<3;i++){
      const b=new THREE.Group();
      for(const s of [-1,1]){
        const wing=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.04,0.16), birdMat);
        wing.position.x=s*0.26; wing.rotation.z=s*0.35; b.add(wing);
      }
      b.userData.t=i*2.1; b.userData.r=26+i*14; b.userData.h=17+i*4; b.userData.cx=i*30-20; b.userData.cz=i*24-10;
      G.add(b); this.birds.push(b);
    }

    // ---- pollen motes: sunlit specks drifting near the ground ----
    const N=120, pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      pos[i*3]=(Math.sin(i*12.9)*0.9)*60; pos[i*3+1]=0.6+Math.abs(Math.sin(i*3.7))*2.2; pos[i*3+2]=(Math.cos(i*7.7)*0.9)*60;
    }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    this.motes=new THREE.Points(geo, new THREE.PointsMaterial({color:0xfff2c0, size:0.09, transparent:true, opacity:0.7}));
    G.add(this.motes);

    // ---- fire smoke: drifting puffs above every campfire/range ----
    this.smoke=[];
    const smokeMat=new THREE.MeshLambertMaterial({color:0xcfd2d6, transparent:true, opacity:0.42});
    const fires=(typeof WORLD!=='undefined' && WORLD.fires ? WORLD.fires.slice(0,14) : []);
    for(const f of fires){
      for(let j=0;j<3;j++){
        const p=new THREE.Mesh(new THREE.SphereGeometry(0.16+j*0.05, 6, 5), smokeMat.clone());
        p.userData={fx:f.position.x, fz:f.position.z, fy:(f.position.y||0)+1.0, t:j/3};
        G.add(p); this.smoke.push(p);
      }
    }

    // ---- tree sway: the whole grove breathes (gentle trunk-pivot oscillation) ----
    this.trees=(typeof WORLD!=='undefined' && WORLD.resources ? WORLD.resources : [])
      .filter(r=>r.userData && r.userData.rtype==='tree')
      .map((g,i)=>({g, phase:i*1.37, base:g.rotation.z||0}));

    // ---- butterflies: six flutterers low over the commons meadows ----
    this.flies=[];
    for(let i=0;i<6;i++){
      const b=new THREE.Group();
      const wmat=new THREE.MeshBasicMaterial({color:[0xf0e07a,0xe08a9a,0x9ac8f0][i%3], side:THREE.DoubleSide});
      for(const s of [-1,1]){
        const wing=new THREE.Mesh(new THREE.CircleGeometry(0.11, 5), wmat);
        wing.position.x=s*0.09; wing.rotation.y=s*0.5; b.add(wing);
      }
      b.userData={t:i*2.4, cx:Math.sin(i*23.7)*22, cz:10+Math.cos(i*17.1)*20, r:2.5+i*0.7, h:0.7+0.2*(i%3)};
      G.add(b); this.flies.push(b);
    }

    scene.add(G);
    this._iv=setInterval(()=>this.tick(0.12), 120);
  },

  tick(dt){
    const B=this.BOUNDS;
    for(const c of this.clouds){
      c.position.x+=c.userData.v.x*dt; c.position.z+=c.userData.v.z*dt;
      if(c.position.x> B) c.position.x=-B;
      if(c.position.z> B) c.position.z=-B; if(c.position.z<-B) c.position.z=B;
    }
    const t=performance.now()*0.001;
    for(const b of this.birds){
      const u=b.userData; u.t+=dt*0.16;
      b.position.set(u.cx+Math.cos(u.t)*u.r, u.h+Math.sin(u.t*3)*0.8, u.cz+Math.sin(u.t)*u.r);
      b.rotation.y=-u.t+Math.PI/2;
      // wing flap
      b.children[0].rotation.z=0.35+Math.sin(t*7)*0.4;
      b.children[1].rotation.z=-0.35-Math.sin(t*7)*0.4;
    }
    if(this.motes){
      // gentle updraft drift, anchored around the player so motes are always nearby
      const p=(typeof player!=='undefined')?player.position:{x:0,z:0};
      const a=this.motes.geometry.attributes.position;
      for(let i=0;i<a.count;i++){
        let y=a.getY(i)+dt*0.12*(0.5+Math.sin(i)*0.5);
        if(y>3.2) y=0.5;
        a.setY(i,y);
      }
      a.needsUpdate=true;
      this.motes.position.x=p.x; this.motes.position.z=p.z;
    }
    // smoke puffs: rise, drift, fade, recycle
    for(const s of (this.smoke||[])){
      const u=s.userData; u.t+=dt*0.24;
      if(u.t>1) u.t-=1;
      s.position.set(u.fx+Math.sin(u.t*6.2)*0.22+u.t*0.55, u.fy+u.t*2.4, u.fz+u.t*0.3);
      s.material.opacity=0.42*(1-u.t);
      const sc=0.7+u.t*1.6; s.scale.set(sc,sc,sc);
    }
    // trees breathe
    for(const tr of (this.trees||[])){
      if(!tr.g.parent) continue;
      tr.g.rotation.z=tr.base+Math.sin(t*0.9+tr.phase)*0.014;
    }
    // butterflies flutter on loopy tracks
    for(const b of (this.flies||[])){
      const u=b.userData; u.t+=dt*0.5;
      b.position.set(u.cx+Math.cos(u.t)*u.r+Math.sin(u.t*2.7)*0.8,
                     u.h+Math.sin(u.t*3.1)*0.35+((typeof groundY==='function'&&groundY(b.position.x,b.position.z))||0),
                     u.cz+Math.sin(u.t*0.8)*u.r);
      b.rotation.y=-u.t;
      const flap=Math.sin(t*16+u.t)*0.75;
      b.children[0].rotation.y=0.5+flap; b.children[1].rotation.y=-0.5-flap;
    }
  },

  stop(){
    clearInterval(this._iv); this._iv=null;
    if(this._group){ scene.remove(this._group); this._group=null; }
    // trees keep their groups (we only nudged rotation) — settle them back
    for(const tr of (this.trees||[])){ if(tr.g.parent) tr.g.rotation.z=tr.base; }
    this.clouds=[]; this.birds=[]; this.motes=null; this.smoke=[]; this.trees=[]; this.flies=[];
  },
};
/* boot once the scene exists; toggleable like every other layer */
if(typeof Overlays!=='undefined'){
  Overlays.register({ id:'atmosphere', name:'Atmosphere (clouds, birds, motes)',
    desc:'Drifting cloud shadows, birds overhead, sunlit pollen. Turn off on weak devices.',
    defaultOn:true, start:()=>{ const iv=setInterval(()=>{ if(typeof scene!=='undefined' && typeof running!=='undefined' && running){ clearInterval(iv); Atmosphere.start(); } }, 1200); },
    stop:()=>Atmosphere.stop() });
} else {
  const iv=setInterval(()=>{ if(typeof scene!=='undefined' && typeof running!=='undefined' && running){ clearInterval(iv); Atmosphere.start(); } }, 1500);
}
