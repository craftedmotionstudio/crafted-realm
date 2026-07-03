/* ============ GameConfig — data-driven progression knobs (GOAL.md §15) ============
 * Global + per-skill XP-rate multipliers and an optional fatigue system, all
 * persisted and admin-tunable at runtime:
 *   GameConfig.set('xpRate', 2)                      // double XP weekend
 *   GameConfig.set('xpRateSkill', {Fishing:1.5})     // skill-specific boost
 *   GameConfig.set('fatigueEnabled', true)           // RSC-style fatigue
 * Player.addXp consults xpMult(); nothing else needs to know these exist.
 */
const GameConfig = {
  xpRate: 1,
  xpRateSkill: {},          // e.g. {Fishing: 1.5}
  fatigueEnabled: false,    // when on: fatigue builds with xp, rests at beds/idle
  fatigue: 0,               // 0..100
  friendlyMode: true,       // when on: no NPC ever starts a fight (they still fight back)
  _KEY: 'cr_config',
  load(){
    const d = (typeof Persist!=='undefined') ? Persist.getJSON(this._KEY, null) : null;
    if(d){ if(isFinite(d.xpRate)) this.xpRate=d.xpRate;
           if(d.xpRateSkill) this.xpRateSkill=d.xpRateSkill;
           if(d.fatigueEnabled!==undefined) this.fatigueEnabled=!!d.fatigueEnabled;
           if(d.friendlyMode!==undefined) this.friendlyMode=!!d.friendlyMode; }
  },
  save(){ if(typeof Persist!=='undefined')
    Persist.setJSON(this._KEY, {xpRate:this.xpRate, xpRateSkill:this.xpRateSkill, fatigueEnabled:this.fatigueEnabled, friendlyMode:this.friendlyMode}); },
  set(k, v){ this[k]=v; this.save(); },
  xpMult(skill){
    let m = (isFinite(this.xpRate) && this.xpRate>0 ? this.xpRate : 1) *
            (this.xpRateSkill[skill]>0 ? this.xpRateSkill[skill] : 1);
    if(this.fatigueEnabled && this.fatigue>=100) m=0;   // dead tired: no gains until rested
    return m;
  },
  /* fatigue hooks (only do anything when enabled) */
  onXp(amt){ if(this.fatigueEnabled) this.fatigue=Math.min(100, this.fatigue + amt*0.02); },
  rest(dt){ if(this.fatigueEnabled) this.fatigue=Math.max(0, this.fatigue - dt*4); },
};
GameConfig.load();
