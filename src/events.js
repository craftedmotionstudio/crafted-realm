/* ============ Events — the game's typed event bus (GOAL.md §14.2) ============
 * Content and overlays subscribe to engine events instead of patching the loop:
 *   Events.on('npcKilled', ({npc}) => {...})     // returns an off() handle
 *   Events.emit('npcKilled', {npc})
 * Engine emit sites (kept deliberately few and stable):
 *   'xp'          {skill, amt}            every XP gain (addXp)
 *   'levelUp'     {skill, level}          on advancing a level
 *   'npcKilled'   {npc}                   player kill confirmed (killNpc)
 *   'lootSpawned' {id, qty, x, z}         a ground item appears (makeDrop)
 *   'itemPickup'  {id, qty}               player picks a drop off the ground
 * Handlers are isolated: one throwing never breaks the loop or other handlers.
 * Loaded FIRST so every later file may emit/subscribe freely.
 */
const Events = {
  _subs: {},
  on(type, fn){
    (this._subs[type] = this._subs[type] || []).push(fn);
    return () => this.off(type, fn);
  },
  off(type, fn){
    const a=this._subs[type]; if(!a) return;
    const i=a.indexOf(fn); if(i>=0) a.splice(i,1);
  },
  emit(type, payload){
    const a=this._subs[type]; if(!a || !a.length) return;
    for(const fn of a.slice()){
      try{ fn(payload); }catch(err){ console.error('[Events] '+type+' handler failed:', err); }
    }
  }
};
