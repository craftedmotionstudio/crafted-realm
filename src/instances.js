/* ============ Instances — private encounter support (GOAL.md §14, Zenyte lesson) ============
 * World-model groundwork for instanced content (boss rooms, minigames, future
 * raids): spawn a private copy of an encounter, track everything it created,
 * tear it down cleanly. Single-player today; the SAME lifecycle maps onto
 * per-party instances when the online layer lands.
 *
 *   const inst = Instances.enter({
 *     at:{x:60, z:60},                       // arena anchor (defaults to the Proving Grounds)
 *     npcs:[{type:'gnarlgob', dx:2, dz:0}],  // encounter spawns (relative to the anchor)
 *     onClear(){ ... }                       // fires when every instanced npc is dead
 *   });
 *   Instances.leave()                        // teleport back + despawn everything
 */
const Instances = {
  cur:null, _seq:0,
  enter(cfg){
    if(this.cur) this.leave();
    const id=++this._seq;
    const at=cfg.at || (typeof ZONES!=='undefined' && ZONES.arena ? {x:ZONES.arena.pos[0], z:ZONES.arena.pos[1]} : {x:0,z:0});
    const ret={x:player.position.x, z:player.position.z};
    const spawned=[];
    for(const s of (cfg.npcs||[])){
      if(typeof spawnNpc!=='function' || !NPC_TYPES[s.type]) continue;
      const n=spawnNpc(s.type, at.x+(s.dx||0), at.z+(s.dz||0));
      if(n){ n._instanceId=id; if(s.aggro!==false) n.aggroOverride=true; spawned.push(n); }
    }
    const y=(typeof groundY==='function'&&groundY(at.x,at.z))||0;
    player.position.set(at.x, y, at.z);
    Player.moveTo=null; Player.path=[]; Player.target=null;
    this.cur={id, ret, spawned, cfg};
    UI.chat('You step into a private encounter. Slay everything to prevail!','sys');
    /* watch for the clear condition on the world tick */
    this._watch=Sched.every(2, ()=>{
      if(!this.cur) return;
      if(this.cur.spawned.every(n=>n.dead)){
        UI.chat('The encounter is cleared!','xp');
        try{ this.cur.cfg.onClear && this.cur.cfg.onClear(); }catch(e){}
        this.leave();
      }
    });
    return this.cur;
  },
  leave(){
    if(!this.cur) return;
    Sched.cancel(this._watch);
    for(const n of this.cur.spawned){
      if(!n.dead){ n.dead=true; n.mesh.visible=false; if(typeof removeClickable==='function') removeClickable(n.mesh); }
      n.respawnT=99999;                 // instanced npcs never respawn into the open world
      const i=WORLD.npcs.indexOf(n); if(i>=0) WORLD.npcs.splice(i,1);
      if(n.mesh && n.mesh.parent) n.mesh.parent.remove(n.mesh);
    }
    const {x,z}=this.cur.ret;
    const y=(typeof groundY==='function'&&groundY(x,z))||0;
    player.position.set(x, y, z);
    Player.target=null;
    this.cur=null;
  },
};
