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

  /* Initial teaching grants share the atomic, bank-aware recovery transaction.
   * Failed attempts never latch a flag; the provision rack remains available
   * throughout later lessons if a teaching tool is lost. */
  const granted = {};
  function grantForStep(){
    if(Tutorial.complete) return;
    const s=Tutorial.steps[Tutorial.step];
    if(!s||!['equip_hatchet','mine_copper','forge_dagger'].includes(s.id)||granted[s.id]) return;
    if(typeof HolmToolRecoveryService!=='undefined'&&HolmToolRecoveryService.recover()){
      granted[s.id]=true;
    }else{
      UI.chat('Make room, then collect your teaching tools from the Guide Hall provision rack.','sys');
    }
  }
  const DEPARTURE_LINE='Board the skiff at Departure Dock.';
  function onHolm(){ return typeof CRWorldMode!=='undefined' && CRWorldMode.providerId==='tutors-holm-v2'; }
  /* After graduation the banner keeps one last line until the crossing (play review F-35). */
  function showDepartureBanner(){
    const el=document.getElementById('objective'), txt=document.getElementById('obj-text');
    if(!el||!txt) return;
    el.style.display='block'; txt.textContent=DEPARTURE_LINE;
    try{
      if(typeof GuideArrow!=='undefined' && HolmTutorialFlow.departure){
        const d=HolmTutorialFlow.departure.dockTile;
        GuideArrow.keepAfterComplete=true; GuideArrow.setTarget({x:d.x,z:d.z},'Board the skiff');
      }
    }catch(e){}
  }
  const origBanner = Tutorial.banner.bind(Tutorial);
  Tutorial.banner = function(){
    if(this.complete && onHolm()){ showDepartureBanner(); return; }
    origBanner(); try{ grantForStep(); }catch(e){}
  };
  Tutorial.showDepartureBanner = showDepartureBanner;

  /* Departure inventory transaction is installed by holm_departure_rewards.js. */
  Tutorial.finish = function(){
    this.complete=true; this.step=this.steps.length;
    showDepartureBanner();
    try{ if(typeof Player!=='undefined' && (Player.plane||0)!==0){
      // playtest P-10: dropping to plane 0 in place left the player inside the tower body; climb down to the door step
      if(typeof Planes!=='undefined' && Planes.climbTo && typeof HolmLastlightData!=='undefined'){
        const d=HolmLastlightData.contract.footprint.door;
        Planes.climbTo({plane:0,x:d.x,z:d.z+1.5,zone:'Lastlight Summit',message:'You climb back down to the summit as the beacon turns.'});
      } else { Player.plane = 0; if(typeof Planes!=='undefined' && Planes.refreshVisibility) Planes.refreshVisibility(); }
    } }catch(e){}
    UI.chat('You have completed the active Holm curriculum. Departure Dock is now unlocked.','xp');
    UI.dialogue('Holm passage writ',
      'Your lessons are marked complete. Take the switchback down from Lastlight and follow the road south to Departure Dock, where the skiff waits.',
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
