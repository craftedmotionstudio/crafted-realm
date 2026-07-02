/* ============ Homesteads — player housing MVP (GOAL.md §5, STORY_BIBLE §7) ============
 * The RuneScape way per our buildings doctrine: a modular kit, hand-placed.
 * Claim a patch of open ground as your homestead (auto-fenced), then build
 * furniture from materials — each build raises your Homestead level. All of
 * it persists and rebuilds on login. MVP scope: one plot, four furnishings,
 * refunds on removal; the social "visit a friend's house" layer arrives with
 * the online milestone.
 *   Homesteads.claimHere()  — also exposed as a Game-settings button
 */
const Homesteads = {
  KEY:'cr_homestead',
  KIT:{
    chair:  {name:'Sturdy chair',  cost:{logs:2}, xp:6,  build(){ const g=new THREE.Group();
      const mt=new THREE.MeshLambertMaterial({color:0x7a5a34});
      const seat=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.5), mt); seat.position.y=0.42; g.add(seat);
      const back=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.07), mt); back.position.set(0,0.7,-0.22); g.add(back);
      [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]].forEach(([dx,dz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.42,0.07), mt); leg.position.set(dx,0.21,dz); g.add(leg); });
      return g; }},
    table:  {name:'Trestle table', cost:{logs:3}, xp:10, build(){ const g=new THREE.Group();
      const mt=new THREE.MeshLambertMaterial({color:0x8a6a44});
      const top=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.09,0.8), mt); top.position.y=0.62; g.add(top);
      [[-0.55,-0.3],[0.55,-0.3],[-0.55,0.3],[0.55,0.3]].forEach(([dx,dz])=>{
        const leg=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.6,0.09), mt); leg.position.set(dx,0.3,dz); g.add(leg); });
      return g; }},
    bed:    {name:'Rope bed',      cost:{logs:4}, xp:15, build(){ const g=new THREE.Group();
      const frame=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.25,1.9), new THREE.MeshLambertMaterial({color:0x7a5a34}));
      frame.position.y=0.2; g.add(frame);
      const mat=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.12,1.7), new THREE.MeshLambertMaterial({color:0xc8b890}));
      mat.position.y=0.38; g.add(mat);
      const pil=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.12,0.4), new THREE.MeshLambertMaterial({color:0xe8e2d0}));
      pil.position.set(0,0.46,-0.6); g.add(pil);
      return g; }},
    firepit:{name:'Fire pit',      cost:{logs:2, coins:20}, xp:12, build(){ const g=new THREE.Group();
      for(let i=0;i<7;i++){ const a=i/7*Math.PI*2;
        const st=new THREE.Mesh(new THREE.DodecahedronGeometry(0.13,0), new THREE.MeshLambertMaterial({color:0x8a8276}));
        st.position.set(Math.cos(a)*0.4, 0.08, Math.sin(a)*0.4); g.add(st); }
      const fl=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.45,6), new THREE.MeshBasicMaterial({color:0xf07818, transparent:true, opacity:0.9}));
      fl.position.y=0.3; g.add(fl);
      const glow=new THREE.PointLight(0xffa040, 0.7, 6); glow.position.y=0.6; g.add(glow);
      return g; }},
  },
  data:null, _meshes:[], level:0,
  _load(){ this.data=Persist.getJSON(this.KEY, null); },
  _save(){ Persist.setJSON(this.KEY, this.data); },
  claimHere(){
    if(this.data){ UI.chat('You already hold a homestead. Visit it from the world you claimed it in.','plain'); return; }
    const px=Math.floor(player.position.x)+0.5, pz=Math.floor(player.position.z)+0.5, R=4;
    // the plot must be open, walkable ground — no buildings, water or props
    for(let dx=-R;dx<=R;dx++) for(let dz=-R;dz<=R;dz++){
      const x=px+dx, z=pz+dz;
      const y=(typeof groundY==='function')?groundY(x,z):null;
      if(y===null||y<-1){ UI.chat('This ground won’t take a claim — find open, dry land.','plain'); return; }
      if(WORLD.interiors && WORLD.interiors.some(it=>Math.abs(x-it.x)<it.hw+2 && Math.abs(z-it.z)<it.hd+2)){
        UI.chat('Too close to a building — the surveyors would object.','plain'); return; }
    }
    this.data={x:px, z:pz, items:[], xp:0};
    this._save();
    this.buildPlot();
    UI.chat('🏡 You drive the claim-stake home. This land is yours! Open “Homestead” in settings to furnish it.','xp');
    if(typeof Deeds!=='undefined') Deeds.addLog('Claimed a homestead at '+Math.floor(px)+','+Math.floor(pz));
  },
  buildPlot(){
    if(!this.data || typeof scene==='undefined') return;
    this._meshes.forEach(m=>scene.remove(m)); this._meshes=[];
    const {x,z}=this.data, R=4.5;
    // fence ring (posts + rails, our own light version)
    const mt=new THREE.MeshLambertMaterial({color:0x7a5a34});
    const fence=new THREE.Group();
    for(let i=0;i<4;i++){
      const horiz=(i%2===0);
      const len=R*2;
      for(let s=0;s<=8;s++){
        const t=-R+s*(len/8);
        const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.8,0.12), mt);
        const px2=horiz?t:(i===1?R:-R), pz2=horiz?(i===0?-R:R):t;
        post.position.set(px2,0.4,pz2); fence.add(post);
      }
      const rail=new THREE.Mesh(new THREE.BoxGeometry(horiz?len:0.08,0.08,horiz?0.08:len), mt);
      rail.position.set(horiz?0:(i===1?R:-R), 0.62, horiz?(i===0?-R:R):0);
      fence.add(rail);
    }
    fence.position.set(x, (groundY(x,z)||0), z);
    scene.add(fence); this._meshes.push(fence);
    // furnishings
    this.level=0;
    for(const it of this.data.items){
      const kit=this.KIT[it.kind]; if(!kit) continue;
      const m=kit.build();
      m.position.set(it.x, (groundY(it.x,it.z)||0), it.z);
      m.rotation.y=it.rot||0;
      m.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      scene.add(m); this._meshes.push(m);
      this.level += kit.xp;
      if(typeof addCircleCollider==='function' && it.kind!=='firepit') addCircleCollider(it.x, it.z, 0.4);
    }
  },
  openPanel(){
    let m=document.getElementById('home-modal');
    if(!m){ m=document.createElement('div'); m.id='home-modal'; m.className='modal steel';
      m.style.cssText='display:none;max-width:340px;'; document.body.appendChild(m); }
    if(!this.data){
      m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
        `<div class="osrs-title" style="text-align:center">Homestead</div>`+
        `<div style="font-size:11px;color:#d8ccb4;margin:8px 0">You hold no land yet. Stand on open ground and claim a plot!</div>`+
        `<button onclick="Homesteads.claimHere();this.parentElement.style.display='none'" `+
        `style="width:100%;padding:6px;background:#4f6a3c;color:#fff;border:2px outset #6a8a4c;cursor:pointer">Claim this spot</button>`;
    } else {
      const opts=Object.keys(this.KIT).map(k=>{
        const kit=this.KIT[k];
        const cost=Object.keys(kit.cost).map(c=>kit.cost[c]+' '+(ITEMS[c]?ITEMS[c].name.toLowerCase():c)).join(', ');
        return `<button data-k="${k}" class="home-build" style="display:block;width:100%;margin:3px 0;padding:5px;`+
          `background:#4f483c;color:#ffd24a;border:2px outset #6b5f4a;cursor:pointer;font-size:11px;text-align:left">`+
          `${kit.name} <span style="color:#9a8e78">(${cost} · +${kit.xp} homestead)</span></button>`;
      }).join('');
      m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
        `<div class="osrs-title" style="text-align:center">Homestead — level ${this.level}</div>`+
        `<div style="font-size:10px;color:#9a8e78;margin:4px 0">Plot at ${Math.floor(this.data.x)}, ${Math.floor(this.data.z)} · ${this.data.items.length} furnishings. Build where you stand (inside the fence).</div>`+opts;
      m.querySelectorAll('.home-build').forEach(b=>{ b.onclick=()=>this.build(b.dataset.k); });
    }
    m.style.display='block';
  },
  build(kind){
    const kit=this.KIT[kind]; if(!kit || !this.data) return;
    const {x,z}=this.data;
    if(Math.abs(player.position.x-x)>4 || Math.abs(player.position.z-z)>4){
      UI.chat('Stand inside your homestead fence to build.','plain'); return; }
    for(const c in kit.cost){
      if(Player.count(c)<kit.cost[c]){ UI.chat(`You need ${kit.cost[c]}× ${ITEMS[c]?ITEMS[c].name:c}.`,'plain'); return; }
    }
    for(const c in kit.cost) Player.removeItem(c, kit.cost[c]);
    this.data.items.push({kind, x:Math.floor(player.position.x)+0.5, z:Math.floor(player.position.z)+0.5, rot:player.rotation.y});
    this._save(); this.buildPlot();
    UI.chat(`You build a ${kit.name.toLowerCase()}. Homestead level ${this.level}.`,'xp');
    if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest();
    UI.refreshInv();
  },
};
Homesteads._load();
if(typeof GAME_SETTINGS!=='undefined') GAME_SETTINGS.push({id:'home', name:'Homestead', act:()=>Homesteads.openPanel()});
const _homeBoot=setInterval(()=>{
  if(typeof scene!=='undefined' && typeof groundY==='function' && typeof WORLD!=='undefined'){
    clearInterval(_homeBoot);
    if(Homesteads.data) Homesteads.buildPlot();
  }
}, 1800);
