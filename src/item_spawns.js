/* ============ ItemSpawns — OSRS-style respawning ground items (world detail) ============
 * The signature OSRS micro-story mechanic: items that live at a SPOT and respawn
 * after being taken (the mind rune by the stairs, the cabbage in the cellar).
 * Data-driven; each entry is a place with a reason. Spawned drops never despawn
 * (unlike kill loot) and respect planes (cellar spawns hide from the surface).
 */
const ItemSpawns = {
  TABLE: [
    // the commons: a taste of magic near the arcanist (the Lumbridge mind-rune law)
    {id:'mind_rune',   x:-12,  z:16,  every:30, plane:0},
    {id:'air_rune',    x:-14,  z:18,  every:45, plane:0},
    // pub life: someone always leaves a heel of bread
    {id:'bread',       x:-7,   z:3,   every:60, plane:0},
    // hen yard: stray feathers
    {id:'feathers',    x:25,   z:-4,  every:25, plane:0, qty:3},
    // woodline: a dropped log by the stumps
    {id:'logs',        x:-30,  z:-14, every:50, plane:0},
    // Wardenholm: an arrow lost by the Proving Ring; a coin under the throne dais
    {id:'arrows',      x:49,   z:14,  every:40, plane:0, qty:2},
    {id:'coins',       x:66,   z:1,   every:90, plane:1, qty:8},
    // the Wayfarer's cellar: someone left half a loaf by the barrels (the cellar-cabbage law)
    {id:'bread',       x:303,  z:301, every:45, plane:-1},
    // the undercroft dungeon: chaos runes near the chained thing (risk = reward)
    {id:'chaos_rune',  x:344,  z:331, every:75, plane:-1, qty:2},
  ],
  _live: new Map(),   // table index -> {mesh, timer}
  start(){
    // guard: some spawns reference items that must exist
    this.TABLE=this.TABLE.filter(s=>{
      if(typeof ITEMS!=='undefined' && ITEMS[s.id]) return true;
      console.warn('[ItemSpawns] unknown item', s.id); return false;
    });
    if(typeof Sched!=='undefined'){
      Sched.every(3, ()=>this.tick(1.8));   // every 3 world ticks
    } else setInterval(()=>this.tick(2), 2000);
  },
  tick(dt){
    for(let i=0;i<this.TABLE.length;i++){
      const s=this.TABLE[i];
      let st=this._live.get(i);
      if(!st){ st={mesh:null, timer:0}; this._live.set(i, st); }
      const alive = st.mesh && WORLD.drops.includes(st.mesh);
      if(alive) continue;
      st.mesh=null;
      st.timer-=dt;
      if(st.timer>0) continue;
      // (re)spawn it
      if(typeof makeDrop!=='function') return;
      makeDrop(s.id, s.qty||1, s.x, s.z);
      const m=WORLD.drops[WORLD.drops.length-1];
      if(!m) continue;
      m.userData.life=1e9; m.userData.publicAt=0;      // world spawns never rot away
      if(s.plane!==undefined && s.plane!==0){
        m.userData.plane=s.plane;                       // hides off-plane (planes.js)
        m.position.y=(typeof Planes!=='undefined' && Planes.elevAt(s.x, s.z, s.plane))||m.position.y;
        m.visible=((typeof Player!=='undefined'&&Player.plane)||0)===s.plane;
      }
      st.mesh=m; st.timer=s.every;
    }
  },
};
(function boot(){
  const iv=setInterval(()=>{
    if(typeof WORLD!=='undefined' && WORLD.drops && typeof running!=='undefined' && running){
      clearInterval(iv); ItemSpawns.start();
    }
  }, 2500);
})();
