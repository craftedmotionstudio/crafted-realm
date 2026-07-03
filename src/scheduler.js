/* ============ Sched — the tick action scheduler (GOAL.md §14.7) ============
 * Apollo-style DistancedAction for the 600ms world tick: "walk there, then do
 * the thing, then repeat every N ticks" as cancellable tasks instead of ad-hoc
 * flags. Driven from the fixed-tick block in game5_main (Sched._tick()).
 *   Sched.after(5, fn)                    — run once, 5 ticks from now
 *   const id = Sched.every(4, fn)         — run every 4 ticks until cancelled
 *   Sched.cancel(id)
 *   Sched.walkThen(pos, 2.2, fn)          — path to pos, fire fn on arrival
 * Handlers are isolated; a throw cancels only that task.
 *
 * Queue priorities (GOAL.md §15) — OSRS-style 'weak' | 'normal' | 'strong',
 * passed as an optional trailing argument (default 'normal'):
 *   Sched.after(5, fn, 'weak')            — skippable filler (idle emotes, ambience)
 *   Sched.every(4, fn, runNow, 'strong')  — scheduling a STRONG task cancels every
 *                                           pending WEAK task (like OSRS strong
 *                                           script events flushing the weak queue)
 *   Sched.walkThen(pos, 2.2, fn, 'weak')
 *   Sched.clearWeak()                     — drop all pending weak tasks now
 * Weak tasks are also flushed when a modal interface opens (bank / shop /
 * dialogue emit Events 'modalOpened'); normal and strong tasks always survive.
 */
const Sched = {
  _tasks: [], _id: 0,
  _prio(p){ return (p==='weak'||p==='strong') ? p : 'normal'; },
  after(ticks, fn, prio){ return this._add({left:Math.max(1,ticks|0), fn, repeat:0, prio:this._prio(prio)}); },
  every(ticks, fn, runNow, prio){ const t=Math.max(1,ticks|0);
    if(runNow){ try{ fn(); }catch(e){} }
    return this._add({left:t, fn, repeat:t, prio:this._prio(prio)}); },
  walkThen(pos, reach, fn, prio){
    const p = pos.clone ? pos.clone() : {x:pos.x, z:pos.z};
    if(typeof orderWalk==='function') orderWalk(new THREE.Vector3(p.x, (typeof groundY==='function'&&groundY(p.x,p.z))||0, p.z));
    const self=this;
    return this._add({left:1, repeat:1, prio:this._prio(prio), fn(){
      const d=Math.hypot(player.position.x-p.x, player.position.z-p.z);
      if(d<= (reach||2.2)){ self.cancel(this._tid); try{ fn(); }catch(e){} }
      else if(!Player.moveTo){ self.cancel(this._tid); }   // walk was cancelled/blocked — give up
    }});
  },
  cancel(id){ const i=this._tasks.findIndex(t=>t._tid===id); if(i>=0) this._tasks.splice(i,1); },
  clearWeak(){
    for(let i=this._tasks.length-1; i>=0; i--) if(this._tasks[i].prio==='weak') this._tasks.splice(i,1);
  },
  _add(t){ if(t.prio==='strong') this.clearWeak(); t._tid=++this._id; this._tasks.push(t); return t._tid; },
  _tick(){
    for(const t of this._tasks.slice()){
      if(this._tasks.indexOf(t)<0) continue;   // cancelled mid-tick (e.g. weak flushed by a strong)
      if(--t.left>0) continue;
      if(t.repeat) t.left=t.repeat;
      else this.cancel(t._tid);
      try{ t.fn(); }catch(e){ console.error('[Sched] task failed:', e); this.cancel(t._tid); }
    }
  },
};
// A modal interface opening interrupts weak actions, as in OSRS.
if(typeof Events!=='undefined') Events.on('modalOpened', ()=>Sched.clearWeak());
