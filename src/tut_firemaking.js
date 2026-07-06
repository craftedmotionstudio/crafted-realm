/* ============ Firemaking tutorial gate (TUTORIAL_ISLAND.md — survival station) ============
 * Exposes a tutorial hook for FIREMAKING so the main session can add a
 * "use tinderbox on logs -> light a fire" step to the tutorial.
 *
 * Firemaking IS implemented: the success point is inline in the game5_main.js
 * action loop (the a.type==='lightfire' branch), which calls
 * makeCampfire(...) and grants `Player.addXp('Firemaking', 40)`. That XP grant
 * is the ONLY place Firemaking XP is awarded anywhere in the codebase, so it is
 * the exact, precise "a fire is lit from logs" success signal.
 *
 * There is no discrete lightFire() function to wrap (the success is inline in the
 * per-frame update loop), so — exactly like tutorial_ext.js wraps UI.openBank —
 * this module defensively wraps the global `Player.addXp` method and fires the
 * tutorial notify only when the skill being trained is 'Firemaking'. Content
 * module only; no engine file is edited, and the wrap is fully reversible.
 */
(function(){
  'use strict';

  function armHook(){
    if(typeof Player==='undefined' || !Player || typeof Player.addXp!=='function') return false;
    if(Player.__tutFiremakingHooked) return true;      // idempotent — never double-wrap

    var origAddXp = Player.addXp.bind(Player);
    Player.addXp = function(skill, amt){
      var r = origAddXp(skill, amt);                    // preserve original behaviour + return
      try{
        if(skill==='Firemaking'){                       // the one and only firemaking success point
          try{ if(typeof Tutorial!=='undefined') Tutorial.notify('firemake','fire'); }catch(e){}
          try{ if(typeof Events!=='undefined')   Events.emit('firemade',{}); }catch(e){}
        }
      }catch(e){}
      return r;
    };
    Player.__tutFiremakingHooked = true;
    try{ console.log('[tut_firemaking] firemaking gate armed (hooked Player.addXp, skill==="Firemaking")'); }catch(e){}
    return true;
  }

  // Player is a global const defined in game3_systems.js, which loads well before
  // this module, so the hook normally arms immediately. Retry briefly just in case.
  if(!armHook()){
    var tries=0;
    var boot=setInterval(function(){
      if(armHook() || ++tries>40) clearInterval(boot);  // ~10s ceiling, then give up quietly
    }, 250);
  }
})();
