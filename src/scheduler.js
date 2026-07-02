/* ============ Sched — the tick action scheduler (GOAL.md §14.7) ============
 * Apollo-style DistancedAction for the 600ms world tick: "walk there, then do
 * the thing, then repeat every N ticks" as cancellable tasks instead of ad-hoc
 * flags. Driven from the fixed-tick block in game5_main (Sched._tick()).
 *   Sched.after(5, fn)                    — run once, 5 ticks from now
 *   const id = Sched.every(4, fn)         — run every 4 ticks until cancelled
 *   Sched.cancel(id)
 *   Sched.walkThen(pos, 2.2, fn)          — path to pos, fire fn on arrival
 * Handlers are isolated; a throw cancels only that task.
 */
const Sched = {
  _tasks: [], _id: 0,
  after(ticks, fn){ return this._add({left:Math.max(1,ticks|0), fn, repeat:0}); },
  every(ticks, fn, runNow){ const t=Math.max(1,ticks|0);
    if(runNow){ try{ fn(); }catch(e){} }
    return this._add({left:t, fn, repeat:t}); },
  walkThen(pos, reach, fn){
    const p = pos.clone ? pos.clone() : {x:pos.x, z:pos.z};
    if(typeof orderWalk==='function') orderWalk(new THREE.Vector3(p.x, (typeof groundY==='function'&&groundY(p.x,p.z))||0, p.z));
    const self=this;
    return this._add({left:1, repeat:1, fn(){
      const d=Math.hypot(player.position.x-p.x, player.position.z-p.z);
      if(d<= (reach||2.2)){ self.cancel(this._tid); try{ fn(); }catch(e){} }
      else if(!Player.moveTo){ self.cancel(this._tid); }   // walk was cancelled/blocked — give up
    }});
  },
  cancel(id){ const i=this._tasks.findIndex(t=>t._tid===id); if(i>=0) this._tasks.splice(i,1); },
  _add(t){ t._tid=++this._id; this._tasks.push(t); return t._tid; },
  _tick(){
    for(const t of this._tasks.slice()){
      if(--t.left>0) continue;
      if(t.repeat) t.left=t.repeat;
      else this.cancel(t._tid);
      try{ t.fn(); }catch(e){ console.error('[Sched] task failed:', e); this.cancel(t._tid); }
    }
  },
};
