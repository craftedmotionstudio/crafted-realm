/* ============ BossSM — declarative boss state machines (GOAL.md §15) ============
 * Boss behavior expressed as data — phases gated by HP, abilities on tick
 * timers, one-shot triggers — compiled to the same (npc, dt) function shape
 * BOSS_SCRIPTS already dispatches, so existing bosses keep working and new
 * bosses are a table, not bespoke code:
 *
 *   BossSM.define('fenlord', {
 *     abilities:[{every:9, when:n=>n.hp<n.t.hp*0.55, act(n){...}}],
 *     triggers:[{once:'enrage', when:n=>n.hp<n.t.hp*0.45, act(n){...}}],
 *   });
 *
 * Per-instance state lives on the npc INSTANCE (never the shared type —
 * CLAUDE.md rule): timers under n._smT, one-shots under n._smFlags.
 */
const BossSM = {
  compile(def){
    return function(n, dt){
      n._smT=n._smT||{}; n._smFlags=n._smFlags||{};
      (def.abilities||[]).forEach((ab,i)=>{
        n._smT[i]=(n._smT[i]||0)+dt;
        if(n._smT[i] < (ab.every||6)) return;
        n._smT[i]=0;
        try{ if(!ab.when || ab.when(n)) ab.act(n, dt); }catch(e){ console.error('[BossSM] ability failed:', e); }
      });
      (def.triggers||[]).forEach(tr=>{
        if(n._smFlags[tr.once]) return;
        try{ if(tr.when(n)){ n._smFlags[tr.once]=true; tr.act(n, dt); } }
        catch(e){ console.error('[BossSM] trigger failed:', e); }
      });
      if(def.always){ try{ def.always(n, dt); }catch(e){} }
    };
  },
  define(key, def){
    if(typeof BOSS_SCRIPTS==='undefined'){ console.error('[BossSM] no BOSS_SCRIPTS registry'); return; }
    BOSS_SCRIPTS[key]=this.compile(def);
  },
};

/* the Fenlord, re-expressed declaratively (behavior identical to the bespoke version) */
BossSM.define('fenlord', {
  abilities:[{
    every:9,
    when:n=> n.target==='player' && n.hp < n.t.hp*0.55,
    act(n){
      n.hp=Math.min(n.t.hp, n.hp + Math.ceil(n.t.hp*0.08));
      if(n.hpbar){ n.hpbar.spr.visible=true; n.hpbar.draw(Math.max(0,n.hp/n.t.hp)); }
      UI.chat('The Fenlord draws strength from the drowned mire.','combat');
    },
  }],
});
