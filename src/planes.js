/* ============ Planes — verticality: upper floors, ladders, caves (MAP_PIPELINE) ============
 * The OSRS world model adapted to our heightfield engine:
 *   plane 0  = the ground (heightfield, groundY)
 *   plane 1+ = upper storeys — flat rectangular FLOOR REGIONS registered per building
 *   plane -1 = underground — authored cave floors (OSRS parks dungeons at a far
 *              map offset; ours live wherever authored, usually off the charted map)
 *
 * Core ideas:
 *   - Player.plane picks which elevation function rules: elevAt(x,z) is groundY on
 *     plane 0, a registered floor's fixed y elsewhere (null = not walkable there).
 *   - Colliders and floors both carry a plane tag; collides()/tileWalkable filter
 *     by the mover's plane (game2/game5 consult Planes when present).
 *   - Ladders/stairs are clickables {kind:'climb', to:{plane,x,z}} — one tile up
 *     or down, exactly like the OSRS teleport-on-climb model.
 *   - Rendering: each building's storey groups register visibility rules — on a
 *     higher plane you see your storey, roofs above lift away (extends the
 *     existing WORLD.interiors roof-lift); entities on other planes are hidden.
 *
 * Authoring API (used by buildkit.js and by hand):
 *   Planes.addFloor({plane:1, x, z, hw, hd, y})            → walkable upper floor
 *   Planes.addCollider({plane:1, type:'rect', x,z,hw,hd})  → plane-tagged wall
 *   Planes.edgeFence(floor)                                → auto colliders around a floor rim
 *   Planes.addClimb({x, z, up:{...}|down:{...}, label})    → ladder/stair teleport
 *   Planes.addCave({x, z, hw, hd, y:-6, rock:0x5a5248})    → floor + walls + region
 */
const Planes = {
  FLOORS: [],          // {plane, x, z, hw, hd, y}
  current(){ return (typeof Player!=='undefined' && Player.plane) || 0; },

  addFloor(f){ f.plane=f.plane===undefined?1:f.plane; this.FLOORS.push(f); return f; },

  /* the plane-aware elevation: null = you cannot stand there on this plane */
  elevAt(x, z, plane){
    plane = plane===undefined ? this.current() : plane;
    if(plane===0) return (typeof groundY==='function') ? groundY(x, z) : 0;
    let best=null;
    for(const f of this.FLOORS){
      if(f.plane!==plane) continue;
      if(Math.abs(x-f.x)<=f.hw && Math.abs(z-f.z)<=f.hd){ best=f.y; break; }
    }
    return best;
  },

  /* Never change planes until the streamed or GLB-backed destination floor
     has registered. A visible ladder can otherwise win the loading race and
     strand the player in a correctly darkened but empty scene. */
  canEnter(dest){
    if(!dest || !Number.isFinite(dest.x) || !Number.isFinite(dest.z) ||
       !Number.isFinite(dest.plane)) return false;
    return Number.isFinite(this.elevAt(dest.x,dest.z,dest.plane));
  },

  /* plane-tagged colliders live in the same WORLD.colliders array; entries without
     a plane tag are ground-level (back-compatible with every existing collider) */
  addCollider(c){ c.plane=c.plane===undefined?1:c.plane; WORLD.colliders.push(c); return c; },

  /* ring a floor with thin rect colliders so you can't stroll off the rim */
  edgeFence(f){
    const t=0.18;
    this.addCollider({type:'rect', plane:f.plane, x:f.x, z:f.z-f.hd, hw:f.hw, hd:t});
    this.addCollider({type:'rect', plane:f.plane, x:f.x, z:f.z+f.hd, hw:f.hw, hd:t});
    this.addCollider({type:'rect', plane:f.plane, x:f.x-f.hw, z:f.z, hw:t, hd:f.hd});
    this.addCollider({type:'rect', plane:f.plane, x:f.x+f.hw, z:f.z, hw:t, hd:f.hd});
  },

  /* a climbable — ladder/stair/cave-hole. `up`/`down` = {plane, x, z} destinations.
     mesh is optional: pass yours (kit ladder/stairs) or get a simple ladder built. */
  addClimb(opts){
    const g = opts.mesh || (()=>{
      // the OSRS ladder (Bible_References/Ladder.jpg): round golden-wood rails that
      // run past the top rung, round rungs poking past the rails, rung count
      // scaling with height so tall climbs never stretch
      const grp=new THREE.Group();
      const H=opts.h||2.6;
      const wood =new THREE.MeshLambertMaterial({color:0x7e6838});   // muted aged gold-brown — indoor
      const woodD=new THREE.MeshLambertMaterial({color:0x6b582e});   // point lights push Lambert hot, so go dark
      for(const s of [-0.3, 0.3]){
        const rail=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.068,H+0.25,6), wood);
        rail.position.set(s,(H+0.25)/2,0); grp.add(rail);
      }
      const n=Math.max(5, Math.round(H/0.34));
      for(let i=0;i<n;i++){
        const rung=new THREE.Mesh(new THREE.CylinderGeometry(0.037,0.037,0.7,6), woodD);
        rung.rotation.z=Math.PI/2;
        rung.position.set(0, 0.26+i*(H-0.35)/(n-1), 0);
        grp.add(rung);
      }
      grp.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      return grp;
    })();
    const baseY = opts.y!==undefined ? opts.y : (this.elevAt(opts.x, opts.z, opts.basePlane||0) || 0);
    g.position.set(opts.x, baseY, opts.z);
    if(opts.ry) g.rotation.y=opts.ry;
    g.userData={kind:'climb', label:opts.label||('Climb <b>'+(opts.name||'Ladder')+'</b>'),
      climb:{up:opts.up||null, down:opts.down||null}};
    scene.add(g); WORLD.clickables.push(g);
    if(opts.basePlane!==undefined && opts.basePlane!==0) g.userData.plane=opts.basePlane;
    return g;
  },

  climbTo(dest){
    if(!dest) return;
    const fromPlane=this.current();
    const y = this.elevAt(dest.x, dest.z, dest.plane);
    if(!Number.isFinite(y)){
      if(typeof UI!=='undefined' && UI.chat)
        UI.chat('That level is still loading. Try the ladder again in a moment.', 'plain');
      return false;
    }
    Player.plane = dest.plane;
    player.position.set(dest.x, y, dest.z);
    Player.moveTo=null; Player.path=[]; Player.target=null;
    this.refreshVisibility();
    // Plane changes are far-map teleports. Recenter in the same frame instead
    // of letting the camera lerp through several frames of empty darkness.
    if(typeof camera!=='undefined' && typeof camCtl!=='undefined'){
      const cx=dest.x+camCtl.dist*Math.sin(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
      const cz=dest.z+camCtl.dist*Math.cos(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
      const cy=y+camCtl.dist*Math.sin(camCtl.pitch);
      camera.position.set(cx,cy,cz);
      camera.lookAt(dest.x,y+1.2,dest.z);
    }
    UI.chat(dest.plane>fromPlane ? 'You climb up.' : dest.plane<0 ? 'You climb down into the dark…' : 'You climb down.', 'plain');
    if(typeof Sfx!=='undefined' && Sfx.click) Sfx.click();
    return true;
  },

  /* ---- caves: an authored underground room (floor slab + rock walls + ambience) ---- */
  addCave(opts){
    const y=opts.y!==undefined?opts.y:-6;
    const g=new THREE.Group();
    const rock=new THREE.MeshLambertMaterial({color:opts.rock||0x4a4238});
    const floorM=new THREE.Mesh(new THREE.BoxGeometry(opts.hw*2, 0.3, opts.hd*2),
      new THREE.MeshLambertMaterial({color:opts.floor||0x3a3229}));
    floorM.position.set(opts.x, y-0.15, opts.z); floorM.receiveShadow=true; g.add(floorM);
    const H=3.2;
    const mkWall=(wx,wz,ww,wd)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(ww,H,wd), rock);
      m.position.set(wx, y+H/2, wz); g.add(m); };
    mkWall(opts.x, opts.z-opts.hd, opts.hw*2+0.6, 0.6);
    mkWall(opts.x, opts.z+opts.hd, opts.hw*2+0.6, 0.6);
    mkWall(opts.x-opts.hw, opts.z, 0.6, opts.hd*2+0.6);
    mkWall(opts.x+opts.hw, opts.z, 0.6, opts.hd*2+0.6);
    const ceil=new THREE.Mesh(new THREE.BoxGeometry(opts.hw*2+0.6, 0.4, opts.hd*2+0.6),
      new THREE.MeshLambertMaterial({color:0x2e2820}));
    ceil.position.set(opts.x, y+H, opts.z); g.add(ceil);
    // a little torchlight so the dark reads cozy, not void
    const glow=new THREE.PointLight(0xff9a40, 0.9, Math.max(opts.hw,opts.hd)*2.4);
    glow.position.set(opts.x, y+2.0, opts.z); g.add(glow);
    scene.add(g);
    const floor=this.addFloor({plane:opts.plane!==undefined?opts.plane:-1,
      x:opts.x, z:opts.z, hw:opts.hw-0.5, hd:opts.hd-0.5, y});
    this.edgeFence(floor);
    return {group:g, floor};
  },

  /* ---- visibility: storeys/roofs react to the player's plane; off-plane entities hide ---- */
  _watchers: [],   // {group, showOn:(plane)=>bool}
  addVisibilityRule(group, showOn){ this._watchers.push({group, showOn}); },
  refreshVisibility(){
    const p=this.current();
    for(const w of this._watchers){
      try{ const want=!!w.showOn(p); if(w.group.visible!==want) w.group.visible=want; }catch(e){}
    }
    // entities live on plane 0 unless tagged — hide them when we're above/below
    if(typeof WORLD!=='undefined' && WORLD.npcs){
      for(const n of WORLD.npcs){
        if(n.dead) continue;
        const np=n.plane||0;
        const want=(np===p);
        if(n.mesh && n.mesh.visible!==want && !n.dying) n.mesh.visible=want;
      }
    }
    // plane-tagged clickables (friendlies on upper floors, cellar props) follow the same rule
    if(typeof WORLD!=='undefined' && WORLD.clickables){
      for(const o of WORLD.clickables){
        if(!o.userData || o.userData.plane===undefined) continue;
        const want=(o.userData.plane===p);
        if(o.visible!==want) o.visible=want;
      }
    }
  },
};
if(typeof Player!=='undefined') Player.plane=Player.plane||0;
