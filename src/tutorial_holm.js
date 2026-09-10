/* ============ tutorial_holm — the full guided Tutor's Holm station flow ============
 * Replaces Tutorial.steps wholesale with a world-arrow-guided, NPC-FREE station
 * tour: route chart -> hatchet -> chop -> light -> fish -> cook -> climb down ->
 * mine copper -> mine tin -> smelt -> smith -> bank -> relight Lastlight. Completion unlocks the departure boat; boarding
 * performs the mainland transition and grants the starter inventory.
 *
 * Every step carries a {target,arrowLabel} so ui_guide_arrow.js paints a world
 * beacon + screen-edge pointer for it automatically (no extra wiring). Each step
 * is gated on a REAL skill-success event the engine already emits, plus two
 * defensive monkey-patches (descend + smelt/smith) added below.
 *
 * Loads AFTER tutorial_ext.js and REPLACES Tutorial.steps, so ext's spliced
 * ranged/magic/bank steps are discarded — but ext's OTHER hooks (UI.openBank ->
 * notify('bank','open'), the Holm bank chest, npcKilled styled-kill detection)
 * stay live and are reused. We do NOT re-grant bow/arrows/runes at a step (ext's
 * grant hook keys off the now-absent 'ranged'/'magic' steps and never fires), so
 * the departure pack includes the ranged+magic kit for the current proving slice.
 *
 * COMBAT DEFERRED: there is no practice enemy on the Holm (the only grubkin is at
 * [430,408] on the mainland) and enemies are modelled-last, so the melee/ranged/
 * magic kill steps from the original brief are OMITTED. Combat is taught in the
 * NPC phase; the flow ends after banking.
 *
 * REVERSIBLE: remove the one <script src="src/tutorial_holm.js"> tag from
 * index.html and the base Tutorial (and tutorial_ext's steps) are fully restored.
 */
(function(){
  if(typeof Tutorial==='undefined') return;

  if(typeof HolmTutorialFlow==='undefined') throw new Error('[tutorial_holm] HolmTutorialFlow data is required');
  Tutorial.steps = HolmTutorialFlow.runtimeSteps();
  Tutorial.curriculumVersion = HolmTutorialFlow.curriculumVersion;

  /* ---- station-item grants: fire once as each gated step becomes current ----
   * Mirrors tutorial_ext's grantForStep pattern (banner hook + a `granted` guard).
   * We do NOT grant bow/arrows/runes here — those ship in the departure pack. */
  const granted = {};
  function have(id){ try{ return Player.count ? Player.count(id) : 0; }catch(e){ return 0; } }
  function grantForStep(){
    if(Tutorial.complete) return;
    const s = Tutorial.steps[Tutorial.step]; if(!s) return;

    // step 1 — survival kit so the very first "wield hatchet" step is possible
    if(s.match==='hatchet' && !granted.kit){
      granted.kit = 1;
      if(have('hatchet')<1 && Player.equip.weapon!=='hatchet') Player.addItem('hatchet',1);
      if(have('tinderbox')<1)   Player.addItem('tinderbox',1);
      if(have('fishing_net')<1) Player.addItem('fishing_net',1);
      UI.chat('Guide Bram hands you a survival kit: a bronze hatchet, a tinderbox and a small net.','sys');
    }
    // Mining kit only. Tin must be mined in the north offshoot so the player
    // learns both ore reads before combining them into bronze.
    if(s.match==='copper_ore' && !granted.mine){
      granted.mine = 1;
      if(have('pickaxe')<1 && Player.equip.weapon!=='pickaxe') Player.addItem('pickaxe',1);
      UI.chat('The miner lends you a bronze pickaxe. Mine copper here, then find tin in the north offshoot.','sys');
    }
    // step 9 — a hammer for the anvil (the player smelts their own bar at step 8)
    if(s.match==='forged' && !granted.smith){
      granted.smith = 1;
      if(have('hammer')<1) Player.addItem('hammer',1);
      UI.chat('The smith passes you a hammer. Use it on the anvil with a bronze bar.','sys');
    }
  }
  const origBanner = Tutorial.banner.bind(Tutorial);
  Tutorial.banner = function(){ origBanner(); try{ grantForStep(); }catch(e){} };

  /* ---- departure pack: claimed by the boat, never by tutorial completion. ---- */
  let starterDone = false;
  function keepOne(id){ if(have(id)<1 && Player.equip.weapon!==id) Player.addItem(id,1); }
  function grantStarter(){
    if(starterDone||Tutorial.departurePackClaimed) return false;
    starterDone = true; Tutorial.departurePackClaimed=true;
    // consumable/kit rewards (additive)
    Player.addItem('coins', 25);
    Player.addItem('bread', 3);
    Player.addItem('air_rune', 25);
    Player.addItem('mind_rune', 25);
    Player.addItem('arrows', 25);
    // gear — grant only if the player somehow lacks it
    keepOne('wood_shield');
    keepOne('leather_body');
    keepOne('worn_bow');
    // ensure the player keeps their tools + the forged Bronze dagger (smith_bronze_dagger.js registers it)
    ['hatchet','pickaxe','fishing_net','tinderbox','hammer','bronze_dagger'].forEach(keepOne);
    // teleport tabs — item_teleport_tabs.js registers home_tab (use → Admin.tp('commons'))
    if(typeof ITEMS==='undefined' || ITEMS.home_tab) Player.addItem('home_tab', 3);
    UI.chat('Warden\'s welcome pack: 25 crowns, bread, runes, arrows, a shield, leather body and teleport tabs. Your tools and forged dagger come with you.','sys');
    return true;
  }
  Tutorial.grantDeparturePack = grantStarter;
  Tutorial.finish = function(){
    this.complete=true; this.step=this.steps.length;
    const objective=document.getElementById('objective'); if(objective) objective.style.display='none';
    try{ if(typeof Player!=='undefined' && (Player.plane||0)!==0){
      Player.plane = 0;
      if(typeof Planes!=='undefined' && Planes.refreshVisibility) Planes.refreshVisibility();
    } }catch(e){}
    UI.chat('You have completed the active Holm curriculum. Departure Dock is now unlocked.','xp');
    UI.dialogue('Holm passage writ',
      'Your lessons are marked complete. Follow the eastern path over Tidebridge to the Mage Headland, then board the skiff at Departure Dock.',
      [{label:'The mainland awaits.'}],'📜');
    try{ if(typeof HolmDeparture!=='undefined') HolmDeparture.announceUnlocked(); }catch(e){}
    try{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }catch(e){}
    return true;
  };

  /* ================= defensive monkey-patches (each guarded, no-op if absent) ================= */

  /* DESCEND gate — Planes.climbTo teleports the player between planes; after a
   * descent to a negative plane, advance the "climb down" step. */
  (function(){
    const iv = setInterval(()=>{
      try{
        if(typeof Planes==='undefined' || typeof Planes.climbTo!=='function') return;
        if(Planes._holmWrapped) { clearInterval(iv); return; }
        Planes._holmWrapped = true; clearInterval(iv);
        const orig = Planes.climbTo.bind(Planes);
        Planes.climbTo = function(dest){
          const r = orig(dest);
          try{
            if(!Tutorial.complete && typeof Player!=='undefined' && (Player.plane||0) < 0)
              Tutorial.notify('descend','cave');
          }catch(e){}
          return r;
        };
      }catch(e){ clearInterval(iv); }
    }, 1000);
  })();

  /* SMELT + SMITH gate — the furnace/anvil produce items via the game5 action
   * loop (a.type==='smelt' -> addItem(bar); a.type==='smith' -> addItem(item)),
   * so there is no per-craft function to wrap. Player.addItem is the clean seam:
   * an item added WHILE a smelt/smith action is live is a successful craft.
   * (ui_smith_grid.js is expected to fire notify('smith','forged') too; this is
   * idempotent — Tutorial.notify only advances when the step matches.) */
  (function(){
    const iv = setInterval(()=>{
      try{
        if(typeof Player==='undefined' || typeof Player.addItem!=='function') return;
        if(Player._holmSmeltWrapped){ clearInterval(iv); return; }
        Player._holmSmeltWrapped = true; clearInterval(iv);
        const orig = Player.addItem.bind(Player);
        Player.addItem = function(id, qty){
          const r = orig(id, qty);
          try{
            if(!Tutorial.complete && Player.action){
              if(Player.action.type==='smelt' && /_bar$/.test(id)) Tutorial.notify('smelt','bar');
              else if(Player.action.type==='smith')                Tutorial.notify('smith','forged');
            }
          }catch(e){}
          return r;
        };
      }catch(e){ clearInterval(iv); }
    }, 1000);
  })();

  /* ---- reset to step 0 and refresh the objective/arrow to the new step 0 ---- */
  Tutorial.step = 0;
  if(!Tutorial.complete){ try{ Tutorial.banner(); }catch(e){} }

  console.log('[tutorial_holm] installed '+Tutorial.steps.length+'-step compact graduation route; kitchen, quest, and extended combat lessons remain optional');
})();
