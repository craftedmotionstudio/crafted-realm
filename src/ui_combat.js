/* ============================================================================
   UI_COMBAT — OSRS Combat-tab re-skin (UI track slice #2).
   SELF-CONTAINED: owns ONE injected <style> block + a MutationObserver that
   applies purely-cosmetic DOM augmentations to the combat pane. It does NOT
   rewire the real style-selection or auto-retaliate logic — those handlers are
   attached by UI.refreshCombat (game4_ui.js) and are left fully intact.

   Target (do NOT edit game4_ui.js): the combat pane `#combat-styles`, which
   UI.refreshCombat rebuilds via innerHTML into:
       .cmb-weap                       (weapon name + class)
       .cmb-style[.active] data-i=N    (one per attack style; has onclick)
       .set-row > #retal-btn           (auto-retaliate toggle; button has onclick)

   Reference: Bible_References/UI_Combat.jpg — weapon-name header, "Combat Lvl:N",
   attack styles as selectable stone tiles (active = red) laid out in a grid, and
   a full-width Auto-Retaliate tile that goes red when On.

   How we stay non-destructive:
     - Layout/colour is 100% CSS scoped under #combat-styles.
     - Cosmetic DOM (combat-level line, per-tile icons, retaliate icon/label) is
       re-applied by an observer AFTER each refreshCombat rebuild. We only ever
       PREPEND children or rewrite innerHTML of elements that carry NO handler
       (.cmb-weap) or whose handler is an element property that innerHTML edits
       preserve (#retal-btn). We never replace .cmb-style / #retal-btn elements,
       so their onclick handlers survive. The observer is disconnected while we
       mutate and reconnected after, so it can never loop.
   Guarded behind @media(min-width:881px) to leave the mobile drawer untouched.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiCombatBooted) return;            // guard against a double script tag
window.__uiCombatBooted = true;

/* ------------------------------------------------------------------ CSS ---- */
const css = document.createElement('style');
css.id = 'ui-combat-style';
css.textContent = `
@media (min-width:881px){
  /* pane -> 2-column tile grid (weapon header + retaliate span full width) */
  #combat-styles{
    display:grid; grid-template-columns:1fr 1fr; gap:8px;
    align-content:start; padding:2px 2px 4px;
  }

  /* --- weapon-name header + combat level ------------------------------- */
  #combat-styles .cmb-weap{
    grid-column:1 / -1; padding:2px 0 3px; margin:0;
    text-align:center; line-height:1.15;
  }
  #combat-styles .cr-wname{
    color:var(--orange,#ff981f); font:bold 17px Verdana;
    text-shadow:1px 1px 0 #000; letter-spacing:.3px;
  }
  #combat-styles .cr-clvl{
    color:#ecdcb2; font:bold 12px Verdana; margin-top:2px;
    text-shadow:1px 1px 0 #000;
  }

  /* --- attack-style stone tiles --------------------------------------- */
  #combat-styles .cmb-style{
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:4px; min-height:74px; margin:0; padding:8px 6px; cursor:pointer;
    text-align:center; color:#efe6cf; border:0; border-radius:6px;
    background:linear-gradient(#564a3a,#37301f);
    box-shadow:inset 0 1px 0 #7a6c58, inset 0 0 0 1px #14110b, 0 1px 2px rgba(0,0,0,.55);
    transition:background .08s, box-shadow .08s;
  }
  #combat-styles .cmb-style:hover{
    background:linear-gradient(#63563f,#403626);
    box-shadow:inset 0 1px 0 #8a7a62, inset 0 0 0 1px #14110b, 0 0 5px rgba(255,180,90,.25);
  }
  #combat-styles .cmb-style.active{
    color:#fff;
    background:linear-gradient(#9a4331,#5a1f14);
    box-shadow:inset 0 1px 0 #d67a58, inset 0 0 0 1px #2a0d06, 0 0 8px rgba(255,120,60,.42);
  }
  #combat-styles .cmb-style b{ display:block; font:bold 12px Verdana; }
  /* the reference tiles show only icon + name — hide the sub-text + atype tag */
  #combat-styles .cmb-style small{ display:none; }
  #combat-styles .cmb-style b span{ display:none; }
  #combat-styles .cr-ico{ font-size:23px; line-height:1; filter:saturate(.6) brightness(1.04); }

  /* --- auto-retaliate full-width tile --------------------------------- */
  #combat-styles .set-row{
    grid-column:1 / -1; display:block; border:0; padding:0; margin:3px 0 0;
  }
  #combat-styles .set-row > span{ display:none; }   /* fold label into the button */
  #combat-styles #retal-btn{
    width:100%; display:flex; align-items:center; justify-content:center; gap:9px;
    padding:11px 8px; border:0; border-radius:6px; cursor:pointer;
    font:bold 13px Verdana; color:#efe6cf; text-shadow:1px 1px 0 #000;
    background:linear-gradient(#564a3a,#37301f);
    box-shadow:inset 0 1px 0 #7a6c58, inset 0 0 0 1px #14110b, 0 1px 2px rgba(0,0,0,.55);
    transition:background .08s, box-shadow .08s;
  }
  #combat-styles #retal-btn:hover{ background:linear-gradient(#63563f,#403626); }
  #combat-styles #retal-btn.cr-on{
    color:#fff; background:linear-gradient(#9a4331,#5a1f14);
    box-shadow:inset 0 1px 0 #d67a58, inset 0 0 0 1px #2a0d06, 0 0 8px rgba(255,120,60,.42);
  }
  #combat-styles #retal-btn.cr-on:hover{ background:linear-gradient(#a84a37,#661f14); }
  #combat-styles #retal-btn .cr-knight{ font-size:20px; line-height:1; }
}
`;
document.head.appendChild(css);

/* -------------------------------------------------- cosmetic augmentation -- */
/* Pick a readable glyph for a style tile from its label / attack-type text. */
function styleIcon(txt){
  const t = (txt||'').toLowerCase();
  if(/punch|jab/.test(t))                 return '\u{1F44A}'; // fist
  if(/kick/.test(t))                      return '\u{1F9B5}'; // leg
  if(/block|defend|defensive|guard/.test(t)) return '\u{1F6E1}'; // shield
  if(/stab|lunge|impale/.test(t))         return '\u{1F5E1}';  // dagger
  if(/slash|hack|chop|slice/.test(t))     return '⚔';     // crossed swords
  if(/crush|smash|pound|pummel|spike/.test(t)) return '\u{1F528}'; // hammer
  if(/accurate|rapid|longrange|arrow|bolt|range/.test(t)) return '\u{1F3F9}'; // bow
  if(/magic|spell|blast|bolt|strike|surge|cast/.test(t))  return '✨';     // sparkles
  return '⚔'; // default: crossed swords
}

function combatLevel(){
  // NB: Player is a top-level lexical const — a bare global, NOT on window
  // (CLAUDE.md scope gotcha). Reference it by name, guarded by typeof.
  try{ if(typeof Player!=='undefined' && Player && typeof Player.combatLevel==='function') return Player.combatLevel(); }
  catch(e){}
  return null;
}

const obs = new MutationObserver(augment);

function augment(){
  const host = document.getElementById('combat-styles');
  if(!host) return;
  obs.disconnect();
  try{
    /* --- header: weapon name (drop the "· class" suffix) + combat level --- */
    const weap = host.querySelector('.cmb-weap');
    if(weap && !weap.querySelector('.cr-wname')){
      const raw  = (weap.textContent||'').trim();
      const name = raw.split('·')[0].trim() || raw || 'Unarmed';
      const lvl  = combatLevel();
      weap.innerHTML =
        '<div class="cr-wname">'+name+'</div>'+
        (lvl!=null ? '<div class="cr-clvl">Combat Lvl: '+lvl+'</div>' : '');
    }

    /* --- style tiles: prepend an icon (keeps <b>/<small> + onclick intact) - */
    host.querySelectorAll('.cmb-style').forEach(el=>{
      if(el.querySelector('.cr-ico')) return;
      const ico = document.createElement('span');
      ico.className = 'cr-ico';
      ico.textContent = styleIcon(el.textContent);
      el.insertBefore(ico, el.firstChild);
    });

    /* --- auto-retaliate: fold into one full-width tile, colour by state --- */
    const rb = document.getElementById('retal-btn');
    if(rb){
      const on = (rb.textContent||'').trim().toLowerCase() === 'on';
      rb.classList.toggle('cr-on', on);
      // innerHTML edit preserves the element's onclick property (toggle logic).
      rb.innerHTML = '<span class="cr-knight">\u{1F6E1}</span>Auto Retaliate ('+(on?'On':'Off')+')';
    }
  }catch(e){ /* never let cosmetics break the combat pane */ }
  finally{ obs.observe(host, {childList:true}); }
}

function boot(){
  const host = document.getElementById('combat-styles');
  if(!host) return;
  obs.observe(host, {childList:true});
  augment();   // in case the pane was already populated
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
