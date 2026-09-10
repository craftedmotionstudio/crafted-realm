/* anim_showcase.js — deterministic in-game ANIMATION PROOF harness.
 *
 * Toggle with Shift+A (or AnimShowcase.toggle() from the console). Spawns one rig of
 * every body archetype in a fan in front of the camera and exposes a button panel that
 * fires each animation on all of them ON DEMAND — so the whole rig vocabulary
 * (idle / combat-ready stance / per-archetype walk / per-WEAPON attack swings /
 * block / hit-react / per-archetype death) can be QA'd in seconds without hunting a
 * specific mob, fighting it in armour, and waiting for a rare 0-hitsplat.
 *
 * It drives the REAL game functions (walkAnim / beastAnim / swing / hitReact /
 * blockReact / startDeath / tickDeath) on real procedural rigs, so what you see here
 * is exactly what plays in combat — this is a viewer, not a re-implementation. It adds
 * only its own throwaway meshes + DOM; it never touches WORLD, NPCs, combat math, or
 * shared NPC_TYPES, and removing it leaves the game untouched. */
const AnimShowcase = {
  active:false, rigs:[], panel:null, group:null,
  _moving:false, _inCombat:false, _statusEl:null,

  toggle(){ this.active ? this.close() : this.open(); },

  open(){
    if(typeof scene==='undefined' || typeof player==='undefined'){ return; }
    this.active = true;
    this._build();
    this._ensurePanel();
    this.panel.style.display = 'block';
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[ANIM] Showcase open — fire any animation on every archetype at once. Shift+A to close.','sys');
  },

  close(){
    this.active = false;
    this._teardownRigs();
    if(this.panel) this.panel.style.display = 'none';
  },

  /* ---- rig construction: a fan of one of each archetype, facing the camera ---- */
  _teardownRigs(){
    for(const r of this.rigs){ if(r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh); }
    this.rigs = [];
    if(this.group && this.group.parent) this.group.parent.remove(this.group);
    this.group = null;
  },

  _build(){
    this._teardownRigs();
    const groundAt = (x,z)=> (typeof gy==='function' ? gy(x,z) : 0);
    const cam = camera.position, px = player.position.x, pz = player.position.z;
    // unit vector player -> camera, and its right-hand perpendicular (the row axis)
    let vx = cam.x - px, vz = cam.z - pz; const vl = Math.hypot(vx,vz) || 1; vx/=vl; vz/=vl;
    const rx = -vz, rz = vx;
    // Row centre sits a few tiles PAST the player (away from the camera). The game camera is a
    // steep near-top-down view, so "away from camera" lifts the row into the middle of the frame,
    // clear of the bottom-centre control panel — putting it toward the camera buried it behind that panel.
    const cX = px - vx*3.0, cZ = pz - vz*3.0;

    // builders are global; guard each so a missing one just drops that rig
    const specs = [];
    const H = (fn)=> (typeof fn==='function' ? fn({}) : null);
    const B = (key,color,size)=> (typeof BEAST_BODIES!=='undefined' && BEAST_BODIES[key]) ? BEAST_BODIES[key](color,size) : null;
    specs.push({label:'Sword',   kind:'humanoid', mesh:H(typeof goblinModel!=='undefined'&&goblinModel),   weapon:'sword'});
    specs.push({label:'Bow',     kind:'humanoid', mesh:H(typeof skeletonModel!=='undefined'&&skeletonModel), weapon:'bow'});
    specs.push({label:'Staff',   kind:'humanoid', mesh:H(typeof goblinModel!=='undefined'&&goblinModel),   weapon:'staff'});
    specs.push({label:'Wolf',    kind:'beast',    mesh:B('wolf',    0x6b5a3a, 1.0)});
    specs.push({label:'Crawler', kind:'beast',    mesh:B('crawler', 0x5a6b4a, 1.0)});
    specs.push({label:'Crab',    kind:'beast',    mesh:B('crab',    0x9a4a3a, 1.0)});
    specs.push({label:'Brute',   kind:'beast',    mesh:B('brute',   0x7a5a4a, 1.3)});

    const live = specs.filter(s=>s.mesh);
    const span = 1.7, x0 = -(live.length-1)/2 * span;
    live.forEach((s,i)=>{
      const o = x0 + i*span;
      const x = cX + rx*o, z = cZ + rz*o;
      const g = s.mesh;
      g.position.set(x, groundAt(x,z), z);
      g.rotation.y = Math.atan2(cam.x - x, cam.z - z);   // front (+Z) toward the camera
      // measure the BARE BODY's top (before any weapon) so the name floats a fixed margin
      // above each archetype's actual head — a hard-coded height crowds the tall humanoids and
      // floats far above the short beasts.
      const box = new THREE.Box3().setFromObject(g);
      if(s.weapon) this._giveWeapon(g, s.weapon);
      const lbl = this._label(s.label);
      if(isFinite(box.max.y)) lbl.position.y = (box.max.y - g.position.y) + 0.5;
      g.add(lbl);
      scene.add(g);
      this.rigs.push({mesh:g, kind:s.kind, label:s.label, dead:false});
    });
  },

  _giveWeapon(g, kind){
    const grip = g.userData && g.userData.parts && g.userData.parts.handR;
    if(!grip || typeof holdWeapon!=='function') return;
    let w=null, def=null;
    const metal = (typeof METALS!=='undefined') ? METALS.iron : 0x9aa0a8;
    if(kind==='sword' && typeof swordMesh==='function'){ w=swordMesh(metal); def={model:'sword'}; }
    else if(kind==='bow' && typeof bowMesh==='function'){ w=bowMesh(); def={model:'bow'}; }
    else if(kind==='staff'&& typeof staffMesh==='function'){ w=staffMesh(0xb48ae0); def={model:'staff'}; }
    if(w) holdWeapon(grip, w, def);
  },

  _label(text){
    const c = document.createElement('canvas'); c.width=256; c.height=64;
    const x = c.getContext('2d');
    x.fillStyle='rgba(20,16,8,0.82)'; x.fillRect(0,0,256,64);
    x.font='bold 30px sans-serif'; x.fillStyle='#ffd24a'; x.textAlign='center'; x.textBaseline='middle';
    x.fillText(text,128,34);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map:t, depthTest:false}));
    s.scale.set(1.7,0.42,1); s.position.y = 2.7;
    return s;
  },

  /* ---- per-frame: drive the real animation funcs on the throwaway rigs ---- */
  tick(dt){
    if(!this.active) return;
    for(const r of this.rigs){
      const g = r.mesh, ud = g.userData;
      if(r.dead) continue;                                  // toppled corpse — leave it until Reset
      if(ud.death){ if(typeof tickDeath==='function' && !tickDeath(g,dt)) r.dead=true; continue; }
      ud.inCombat = this._inCombat;
      if(r.kind==='humanoid'){ if(typeof walkAnim==='function') walkAnim(g, this._moving, dt, this._moving?1.5:1); }
      else { if(typeof beastAnim==='function') beastAnim(g, this._moving, dt); }
    }
  },

  /* ---- panel actions ---- */
  setMode(m){
    this._moving   = (m==='walk');
    this._inCombat = (m==='combat');
    this._status(m==='walk' ? 'Walking — each archetype uses its own gait' :
                 m==='combat' ? 'Combat-ready stance (idle, locked in a fight)' :
                 'Peaceful idle');
  },
  doSwing(type){
    if(typeof swing!=='function') return;
    for(const r of this.rigs){ if(!r.dead && !r.mesh.userData.death) swing(r.mesh, type); }
    this._status('Attack: '+type+' — humanoids show the per-weapon motion; beasts lunge/snap');
  },
  doBlock(){ for(const r of this.rigs){ if(!r.dead && typeof blockReact==='function') blockReact(r.mesh); } this._status('Block / parry guard (the 0-hitsplat pose)'); },
  doHit(){ for(const r of this.rigs){ if(!r.dead && typeof hitReact==='function') hitReact(r.mesh); } this._status('Hit-react flinch (squash-and-stretch)'); },
  doDeath(){ for(const r of this.rigs){ if(!r.dead && typeof startDeath==='function') startDeath(r.mesh); } this._status('Death — each archetype collapses its own way. Reset to revive.'); },
  reset(){ this._moving=false; this._inCombat=false; this._build(); this._status('Reset — rigs revived at peaceful idle'); },

  _status(t){ if(this._statusEl) this._statusEl.textContent = t; },

  _ensurePanel(){
    if(this.panel) return;
    const p = document.createElement('div');
    p.id = 'anim-showcase-panel';
    p.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9000;'+
      'background:rgba(24,18,10,0.92);border:2px solid #6b4a2f;border-radius:10px;padding:10px 12px;'+
      'font-family:sans-serif;color:#f0e4c8;box-shadow:0 4px 18px rgba(0,0,0,0.5);max-width:760px;display:none';
    const title = document.createElement('div');
    title.innerHTML = '<b style="color:#ffd24a">Animation Showcase</b> &nbsp;<span style="opacity:.7;font-size:12px">— fires the real combat animations on every archetype · Shift+A to close</span>';
    title.style.marginBottom = '8px';
    p.appendChild(title);

    const mk = (label, fn, accent)=>{
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'margin:2px;padding:5px 9px;border-radius:6px;border:1px solid #5a4a32;cursor:pointer;'+
        'font-size:12px;background:'+(accent||'#3a2e1c')+';color:#f0e4c8';
      b.onmouseenter = ()=> b.style.filter='brightness(1.25)';
      b.onmouseleave = ()=> b.style.filter='none';
      b.onclick = fn;
      return b;
    };
    const row = (children)=>{ const d=document.createElement('div'); d.style.margin='3px 0'; children.forEach(c=>d.appendChild(c)); return d; };

    p.appendChild(row([
      mk('Idle',   ()=>this.setMode('idle')),
      mk('Combat stance', ()=>this.setMode('combat')),
      mk('Walk',   ()=>this.setMode('walk')),
    ]));
    p.appendChild(row([
      mk('Slash', ()=>this.doSwing('slash'), '#2c3a4a'),
      mk('Stab',  ()=>this.doSwing('stab'),  '#2c3a4a'),
      mk('Crush', ()=>this.doSwing('crush'), '#2c3a4a'),
      mk('Bow',   ()=>this.doSwing('bow'),   '#2c3a4a'),
      mk('Cast',  ()=>this.doSwing('cast'),  '#2c3a4a'),
    ]));
    p.appendChild(row([
      mk('Block', ()=>this.doBlock(), '#3a2c1c'),
      mk('Hit-react', ()=>this.doHit(), '#4a2c2c'),
      mk('Death', ()=>this.doDeath(), '#4a2020'),
      mk('Reset', ()=>this.reset(), '#1c3a24'),
      mk('Close', ()=>this.close(), '#3a1c1c'),
    ]));
    const status = document.createElement('div');
    status.style.cssText = 'margin-top:6px;font-size:12px;color:#bfe6a0;min-height:15px';
    status.textContent = 'Order: Sword · Bow · Staff · Wolf · Crawler · Crab · Brute';
    p.appendChild(status);
    this._statusEl = status;

    document.body.appendChild(p);
    this.panel = p;
  },
};

addEventListener('keydown', e=>{
  if((e.key==='A'||e.key==='a') && e.shiftKey &&
     !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault();
    AnimShowcase.toggle();
  }
});
