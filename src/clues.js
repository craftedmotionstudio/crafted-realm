/* ============ Cipher Scrolls — the treasure-trail analogue (GOAL.md §5) ============
 * Monsters rarely drop a Cipher Scroll. Reading it (pick it up) reveals a
 * riddle pointing at a landmark; a mound of disturbed earth rises there.
 * Search the mound → Wayfarer's casket → coins + gear. Content module only:
 * runtime item defs, drop injection via Events (game1 data stays untouched so
 * the validator is unaffected), dispatcher hook for the dig spot.
 */
const Clues = {
  KEY:'cr_clue',
  cur:null, _mound:null,
  SPOTS:[   // riddle → landmark tile (world coords chosen on walkable ground near anchors)
    {zone:'commons',  x:6,   z:18,  riddle:'Where every crown in the Hollow sleeps, I wait outside the teller’s keep.'},
    {zone:'emberwood',x:-34, z:-12, riddle:'Amber leaves above, axe-song below — dig where the millers’ path bends slow.'},
    {zone:'quarry',   x:38,  z:-30, riddle:'Stone confesses under hammer and heat; I lie where the smiths and the mountain meet.'},
    {zone:'mirrorpond',x:-20, z:38, riddle:'Still water tells no lies — seek the shore where the perch arise.'},
    {zone:'commons',  x:-8,  z:2,   riddle:'Ale mends most regrets, they say. I rest a stone’s throw from the tray.'},
  ],
  _load(){ this.cur=Persist.getJSON(this.KEY,null); },
  _save(){ Persist.setJSON(this.KEY, this.cur); },
  defineItems(){
    if(!ITEMS.cipher_scroll) ITEMS.cipher_scroll={name:'Cipher scroll', stack:false, value:1,
      examine:'Cramped ciphertext. Someone buried something worth hiding.'};
    if(!ITEMS.wayfarer_casket) ITEMS.wayfarer_casket={name:"Wayfarer's casket", stack:false, value:1,
      examine:'Heavier than it looks. Open it!'};
  },
  start(){
    const spot=this.SPOTS[Math.floor(Math.random()*this.SPOTS.length)];
    this.cur={x:spot.x, z:spot.z, riddle:spot.riddle, solved:false};
    this._save();
    UI.chat('📜 The cipher unravels into a riddle:','xp');
    UI.chat(`<i>“${spot.riddle}”</i>`,'plain');
    this.spawnMound();
  },
  spawnMound(){
    if(this._mound || !this.cur || this.cur.solved) return;
    if(typeof scene==='undefined' || typeof groundY!=='function') return;
    const {x,z}=this.cur;
    const g=new THREE.Group();
    const mound=new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5),
      new THREE.MeshLambertMaterial({color:0x6a4e2e}));
    mound.scale.y=0.35; mound.castShadow=true;
    g.add(mound);
    g.position.set(x, (groundY(x,z)||0)+0.05, z);
    g.userData={kind:'cluespot', label:'Search <b>Disturbed earth</b>'};
    scene.add(g); WORLD.clickables.push(g);
    this._mound=g;
  },
  solve(){
    if(!this.cur || this.cur.solved) return;
    this.cur.solved=true; this._save();
    if(this._mound){ scene.remove(this._mound); removeClickable(this._mound); this._mound=null; }
    Player.addItem('wayfarer_casket', 1);
    UI.chat('You dig… and haul up a Wayfarer’s casket!','xp');
    if(typeof Sfx!=='undefined'&&Sfx.quest) Sfx.quest();
    // open it straight away — the payoff (coins + a chance at gear)
    const gp=120+Math.floor(Math.random()*280);
    Player.removeItem('wayfarer_casket', 1);
    Player.addItem('coins', gp);
    const gear=['iron_sword','bronze_plate','wood_shield','iron_helm','bronze_legs'].filter(id=>ITEMS[id]);
    let bonus='';
    if(Math.random()<0.4 && gear.length){
      const id=gear[Math.floor(Math.random()*gear.length)];
      Player.addItem(id,1); bonus=' and '+aOrAn(ITEMS[id].name);
    }
    UI.chat(`The casket holds ${gp} crowns${bonus}!`,'xp');
    if(typeof Deeds!=='undefined'){ Deeds.state.clues++; Deeds.addLog('Solved a Cipher Scroll ('+gp+' crowns)'); Deeds.check(); }
    this.cur=null; this._save();
  },
};
Clues.defineItems();
Clues._load();

/* rare drop injection — validator-safe (game1 data untouched) */
Events.on('npcKilled', ({npc})=>{
  if(Clues.cur) return;                                  // one trail at a time, like the old school
  const chance = npc.t.level>=15 ? 1/18 : 1/40;
  if(Math.random()<chance) makeDrop('cipher_scroll', 1, npc.mesh.position.x+0.4, npc.mesh.position.z+0.4);
});
/* picking the scroll up starts the trail */
Events.on('itemPickup', ({id})=>{
  if(id!=='cipher_scroll' && id!=='wayfarer_casket') return;
  if(id==='cipher_scroll'){
    Player.removeItem('cipher_scroll', 1);   // it unravels as you read it
    Clues.start();
  }
});
/* the dig interaction */
Interact.register({
  target:'kind:cluespot', option:'Search', walkTo:true, reach:2.4,
  handler(){ Clues.solve(); }
});
/* respawn the mound after a reload with an active trail */
const _clueBoot=setInterval(()=>{
  if(typeof scene!=='undefined' && typeof groundY==='function'){
    clearInterval(_clueBoot);
    if(Clues.cur && !Clues.cur.solved) Clues.spawnMound();
  }
}, 1500);
