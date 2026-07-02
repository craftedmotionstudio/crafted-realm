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
  },

  stop(){
    clearInterval(this._iv); this._iv=null;
    if(this._group){ scene.remove(this._group); this._group=null; }
    this.clouds=[]; this.birds=[]; this.motes=null;
  },
};
/* boot once the scene exists; toggleable like every other layer */
if(typeof Overlays!=='undefined'){
  Overlays.register({ id:'atmosphere', name:'Atmosphere (clouds, birds, motes)',
    desc:'Drifting cloud shadows, birds overhead, sunlit pollen. Turn off on weak devices.',
    defaultOn:true, start:()=>{ const iv=setInterval(()=>{ if(typeof scene!=='undefined'){ clearInterval(iv); Atmosphere.start(); } }, 1200); },
    stop:()=>Atmosphere.stop() });
} else {
  const iv=setInterval(()=>{ if(typeof scene!=='undefined'){ clearInterval(iv); Atmosphere.start(); } }, 1500);
}
