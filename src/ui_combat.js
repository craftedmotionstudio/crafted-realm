/* ============================================================================
   UI_COMBAT — the Combat Options tab, drawn like Bible_References/UI_Combat.jpg.

   Round 3 (owner 2026-09-25: "combat options must use images or Blender models, not basic shapes"):
   every style button shows a picture rendered from our own Blender props (fist, boot, open hand,
   crossed arms, sword / axe / pick / mace with a swing arc, bow with a target, staff with a spark;
   tools/blender/build_ui_icons_v1.py -> assets/icons/ui/v3/combat/*.png), the chosen style is the red
   stone tile, the header gives the weapon name, its family and the combat level, and Auto Retaliate
   is one full-width bar with a small armoured figure.

   COSMETIC ONLY. UI.refreshCombat (game4_ui.js) still builds the pane and owns every handler:
       .cmb-weap[data-cat]          weapon name + its 2004 category
       .cmb-style[.active] data-i=N one per button of the category (shared/combat.js CATEGORY_STYLES: data-label,
                                    data-style, data-type); onclick sets Player.styleIndex through the combat engine
       .set-row > #retal-btn        auto-retaliate toggle (onclick flips Player.autoRetaliate)
   A MutationObserver re-dresses those elements after each rebuild: it only prepends children and
   rewrites the inner HTML of elements whose handlers are element properties (kept by innerHTML edits),
   so the style -> XP / accuracy mapping (shared/combat.js) is untouched. Styling lives in assets/ui/osrs_kit.css.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiCombatBooted) return;            // guard against a double script tag
window.__uiCombatBooted = true;

var PIC = 'assets/icons/ui/v3/combat/', V = '?v=2';
// 2004 weapon category (shared/combat.js weaponCategory) -> the name shown in the tab
var CATEGORY = {unarmed:'Unarmed', stab:'Stab sword', slash:'Slash sword', spiked:'Spiked', blunt:'Blunt', twohanded:'Two-handed sword',
  axe:'Axe', pickaxe:'Pickaxe', staff:'Staff', bow:'Bow', thrown:'Thrown'};
// category -> button label -> picture (our own Blender props with a swing arc; tools/blender/build_ui_icons_v1.py)
var PICS = {
  unarmed:  {Punch:'punch', Kick:'kick', Block:'block_unarmed'},
  stab:     {Stab:'sword_stab', Lunge:'sword_lunge', Slash:'sword_slash', Block:'sword_block'},
  slash:    {Chop:'sword_smash', Slash:'sword_slash', Lunge:'sword_lunge', Block:'sword_block'},
  spiked:   {Pound:'mace_smash', Pummel:'mace_slash', Spike:'mace_stab', Block:'mace_block'},
  blunt:    {Pound:'mace_smash', Pummel:'mace_slash', Block:'mace_block'},
  twohanded:{Chop:'sword_smash', Slash:'sword_slash', Smash:'mace_smash', Block:'sword_block'},
  axe:      {Chop:'axe_slash', Hack:'axe_lunge', Smash:'axe_smash', Block:'axe_block'},
  pickaxe:  {Spike:'pick_stab', Impale:'pick_lunge', Smash:'pick_smash', Block:'pick_block'},
  staff:    {Bash:'staff_cast', Pound:'mace_smash', Focus:'staff_focus'},
  bow:      {Accurate:'bow_accurate', Rapid:'bow_rapid', Longrange:'bow_longrange'},
  thrown:   {Accurate:'bow_accurate', Rapid:'bow_rapid', Longrange:'bow_longrange'}
};
var TRAINS = {accurate:'Attack', aggressive:'Strength', defensive:'Defence', controlled:'Attack, Strength and Defence',
  ranged_accurate:'Ranged', ranged_rapid:'Ranged', ranged_longrange:'Ranged and Defence'};
var STYLE_NAME = {accurate:'Accurate', aggressive:'Aggressive', defensive:'Defensive', controlled:'Controlled',
  ranged_accurate:'Accurate', ranged_rapid:'Rapid', ranged_longrange:'Longrange'};

function combatLevel(){
  // NB: Player is a top-level lexical const — a bare global, NOT on window (CLAUDE.md scope gotcha).
  try{ if(typeof Player!=='undefined' && Player && typeof Player.combatLevel==='function') return Player.combatLevel(); }catch(e){}
  return null;
}
function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function pic(name, cls){ return '<img class="kit-spr '+cls+'" src="'+PIC+name+'.png'+V+'" alt="" draggable="false">'; }

var obs = new MutationObserver(augment);

function augment(){
  var host = document.getElementById('combat-styles');
  if(!host) return;
  obs.disconnect();
  try{
    var weap = host.querySelector('.cmb-weap'), cat = (weap && weap.getAttribute('data-cat')) || 'unarmed';

    /* --- header: weapon name, its 2004 category, combat level --- */
    if(weap && !weap.querySelector('.cr-wname')){
      var raw = (weap.textContent||'').trim();
      var name = raw.split('·')[0].trim() || raw || 'Unarmed';
      var lvl = combatLevel();
      weap.innerHTML = '<div class="cr-wname">'+esc(name)+'</div>'+
        '<div class="cr-wcat">Category: '+esc(CATEGORY[cat]||cat)+'</div>'+
        (lvl!=null ? '<div class="cr-clvl">Combat Lvl: '+lvl+'</div>' : '');
    }

    /* --- style tiles: picture + name (the <b>/<small> text and the onclick stay) --- */
    Array.prototype.forEach.call(host.querySelectorAll('.cmb-style'), function(el){
      if(el.querySelector('.cr-pic')) return;
      var label = el.getAttribute('data-label') || 'Style', st = el.getAttribute('data-style') || '', ty = el.getAttribute('data-type') || '';
      var pics = PICS[cat] || PICS.unarmed, picName = pics[label] || null;
      var tip = label+' ('+(STYLE_NAME[st]||st)+')\nTrains '+(TRAINS[st]||st)+
        (st==='ranged_rapid' ? '\nAttacks one tick faster' : '')+(st==='ranged_longrange' ? '\nReaches two tiles further' : '')+
        (ty ? '\n'+ty.charAt(0).toUpperCase()+ty.slice(1)+' damage' : '');
      el.setAttribute('data-tip', tip); el.setAttribute('aria-label', label+', '+(STYLE_NAME[st]||st));
      el.insertAdjacentHTML('afterbegin', (picName ? pic(picName, 'cr-pic') : '')+'<span class="cr-sname">'+esc(label)+'</span>');
    });

    /* --- auto-retaliate: one full-width bar with the armoured figure, red when On --- */
    var rb = document.getElementById('retal-btn');
    if(rb){
      if(!rb.querySelector('.cr-knight')){
        var on = (typeof Player!=='undefined') ? !!Player.autoRetaliate : (rb.textContent||'').trim().toLowerCase() === 'on';
        rb.classList.toggle('cr-on', on);
        // innerHTML edit preserves the element's onclick property (toggle logic).
        rb.innerHTML = pic('retaliate', 'cr-knight')+'<span class="cr-rtext">Auto Retaliate<br>('+(on?'On':'Off')+')</span>';
        rb.setAttribute('data-tip', 'Fight back automatically when attacked');
      }
    }
  }catch(e){ /* never let cosmetics break the combat pane */ }
  finally{ obs.observe(host, {childList:true}); }
}

function boot(){
  var host = document.getElementById('combat-styles');
  if(!host) return;
  obs.observe(host, {childList:true});
  augment();   // in case the pane was already populated
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
