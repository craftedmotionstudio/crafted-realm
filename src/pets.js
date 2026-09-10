/* ============ Pets — rare companion drops (GOAL.md §5 collectibles) ============
 * Monsters have a rare chance (bosses much better odds) of yielding a wisp
 * companion in their colors — a little spirit of the defeated foe that follows
 * you around. Collectible, persisted, one summoned at a time.
 *   Pets.list()        — owned pets
 *   Pets.summon(i) / Pets.dismiss()
 * Follows with a light 10Hz seek (works under the hidden-tab heartbeat too).
 */
const Pets = {
  KEY:'cr_pets',
  owned:[], active:-1, _mesh:null, _iv:null,
  _load(){ const d=Persist.getJSON(this.KEY,null); if(d){ this.owned=d.owned||[]; this.active=d.active!==undefined?d.active:-1; } },
  _save(){ Persist.setJSON(this.KEY, {owned:this.owned, active:this.active}); },
  grant(npcT){
    const pet={name:npcT.name+' wisp', color:npcT.color||0x9ad0ff, from:npcT.name, t:Date.now()};
    this.owned.push(pet);
    this.active=this.owned.length-1;
    this._save();
    UI.chat(`✨ A ${pet.name} rises from the fallen ${npcT.name} and pads after you!`,'xp');
    if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest();
    if(typeof Deeds!=='undefined'){ Deeds.state.pets++; Deeds.addLog('Earned a pet: '+pet.name); Deeds.check(); }
    this.summon(this.active);
  },
  buildMesh(pet){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6),
      new THREE.MeshLambertMaterial({color:pet.color, transparent:true, opacity:0.92}));
    body.position.y=0.35; body.castShadow=true; g.add(body);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(0.30, 7, 6),
      new THREE.MeshBasicMaterial({color:pet.color, transparent:true, opacity:0.18}));
    glow.position.y=0.35; g.add(glow);
    const eye=(dx)=>{ const e=new THREE.Mesh(new THREE.SphereGeometry(0.04,5,4),
      new THREE.MeshBasicMaterial({color:0x1a1208})); e.position.set(dx,0.42,0.17); g.add(e); };
    eye(-0.07); eye(0.07);
    g.userData._pet=true;
    return g;
  },
  summon(i){
    this.dismiss(false);
    const pet=this.owned[i]; if(!pet || typeof scene==='undefined') return;
    this.active=i; this._save();
    this._mesh=this.buildMesh(pet);
    this._mesh.position.copy(player.position).add(new THREE.Vector3(0.8,0,0.8));
    scene.add(this._mesh);
    const self=this;
    this._iv=setInterval(()=>{
      if(!self._mesh || typeof player==='undefined') return;
      const m=self._mesh, p=player.position;
      const dx=p.x-m.position.x, dz=p.z-m.position.z, d=Math.hypot(dx,dz);
      if(d>12){ m.position.set(p.x-0.8, p.y, p.z-0.8); }            // teleport when left behind, OSRS-style
      else if(d>1.4){
        const step=Math.min(d-1.1, 0.42);
        m.position.x+=dx/d*step; m.position.z+=dz/d*step;
        m.rotation.y=Math.atan2(dx,dz);
      }
      const y=(typeof groundY==='function'&&groundY(m.position.x,m.position.z));
      if(y!==null&&y!==false) m.position.y=y;
      m.children[0].position.y=0.35+Math.sin(performance.now()*0.004)*0.05;  // idle bob
      m.children[1].position.y=m.children[0].position.y;
    }, 100);
  },
  dismiss(save=true){
    if(this._iv){ clearInterval(this._iv); this._iv=null; }
    if(this._mesh){ scene.remove(this._mesh); this._mesh=null; }
    if(save){ this.active=-1; this._save(); }
  },
  list(){ return this.owned.map((p,i)=>`${i}: ${p.name}${i===this.active?' (out)':''}`).join('\n') || 'No pets yet.'; },
};
Pets._load();

Events.on('npcKilled', ({npc})=>{
  const boss=npc.t.level>=25 || npc.t.glb;
  const chance=boss ? 1/25 : 1/256;
  if(Math.random()<chance && !Pets.owned.some(p=>p.from===npc.t.name)) Pets.grant(npc.t);
});
/* resummon the active pet once the world exists */
const _petBoot=setInterval(()=>{
  if(typeof scene!=='undefined' && typeof player!=='undefined' && player){
    clearInterval(_petBoot);
    if(Pets.active>=0) Pets.summon(Pets.active);
  }
}, 2000);
