/* ============================================================================
   UI_COMBAT — the Combat Options tab, drawn like Bible_References/UI_Combat.jpg.

   Round 3 (owner 2026-09-25: "combat options must use images or Blender models, not basic shapes"):
   every style button shows a picture rendered from our own Blender props (fist, boot, open hand,
   crossed arms, sword / axe / pick / mace with a swing arc, bow with a target, staff with a spark;
   tools/blender/build_ui_icons_v1.py -> assets/icons/ui/v3/combat/*.png), the chosen style is the red
   stone tile, the header gives the weapon name, its family and the combat level, and Auto Retaliate
   is one full-width bar with a small armoured figure.

   COSMETIC ONLY. UI.refreshCombat (game4_ui.js) still builds the pane and owns every handler:
       .cmb-weap                    weapon name + class
       .cmb-style[.active] data-i=N one per STYLE_DEFS entry (onclick sets Player.attackStyles)
       .set-row > #retal-btn        auto-retaliate toggle (onclick flips Player.autoRetaliate)
   A MutationObserver re-dresses those elements after each rebuild: it only prepends children and
   rewrites the inner HTML of elements whose handlers are element properties (kept by innerHTML edits),
   so the style -> XP / accuracy mapping in STYLE_DEFS is untouched. Styling lives in assets/ui/osrs_kit.css.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiCombatBooted) return;            // guard against a double script tag
window.__uiCombatBooted = true;

var PIC = 'assets/icons/ui/v3/combat/', V = '?v=1';
// weapon model -> family shown in the tab (pictures + names only; the maths still come from STYLE_DEFS by index)
var FAMILY = {sword:'sword', sabre:'sword', longsword:'sword', greatsword:'sword', scimitar:'sword', dagger:'sword',
  axe:'axe', battleaxe:'axe', hatchet:'axe', pick:'pick', mace:'mace', warhammer:'mace', maul:'mace',
  bow:'bow', longbow:'bow', shortbow:'bow', staff:'staff', wand:'staff'};
var CATEGORY = {unarmed:'Unarmed', sword:'Sword', axe:'Axe', pick:'Pickaxe', mace:'Blunt', bow:'Bow', staff:'Staff', magic:'Spellcasting'};
// family -> style key -> [shown name, picture]
var STYLES = {
  unarmed:{accurate:['Punch','punch'], aggressive:['Kick','kick'], controlled:['Shove','shove'], defensive:['Block','block_unarmed']},
  sword:  {accurate:['Stab','sword_stab'], aggressive:['Lunge','sword_lunge'], controlled:['Slash','sword_slash'], defensive:['Block','sword_block']},
  axe:    {accurate:['Chop','axe_lunge'], aggressive:['Smash','axe_smash'], controlled:['Hack','axe_slash'], defensive:['Block','axe_block']},
  pick:   {accurate:['Spike','pick_stab'], aggressive:['Smash','pick_smash'], controlled:['Impale','pick_lunge'], defensive:['Block','pick_block']},
  mace:   {accurate:['Pound','mace_smash'], aggressive:['Pummel','mace_slash'], controlled:['Spike','mace_stab'], defensive:['Block','mace_block']},
  bow:    {accurate:['Accurate','bow_accurate'], rapid:['Rapid','bow_rapid'], longrange:['Longrange','bow_longrange']},
  staff:  {standard:['Cast','staff_cast'], defensive:['Focus','staff_focus']}
};
var TRAINS = {Attack:'Attack', Strength:'Strength', Defence:'Defence', Shared:'Attack, Strength and Defence', Ranged:'Ranged',
  RangedDef:'Ranged and Defence', Magic:'Magic', MagicDef:'Magic and Defence'};

function combatLevel(){
  // NB: Player is a top-level lexical const — a bare global, NOT on window (CLAUDE.md scope gotcha).
  try{ if(typeof Player!=='undefined' && Player && typeof Player.combatLevel==='function') return Player.combatLevel(); }catch(e){}
  return null;
}
function family(cls){
  try{
    if(cls==='magic') return 'staff';
    var w = Player.equip && Player.equip.weapon, it = w && ITEMS[w];
    if(!it) return cls==='ranged' ? 'bow' : 'unarmed';
    return FAMILY[it.model] || (cls==='ranged' ? 'bow' : 'sword');
  }catch(e){ return 'unarmed'; }
}
function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function pic(name, cls){ return '<img class="kit-spr '+cls+'" src="'+PIC+name+'.png'+V+'" alt="" draggable="false">'; }

var obs = new MutationObserver(augment);

function augment(){
  var host = document.getElementById('combat-styles');
  if(!host) return;
  obs.disconnect();
  try{
    var cls = (typeof Player!=='undefined' && Player.weaponStyle) ? Player.weaponStyle() : 'melee';
    var list = (typeof STYLE_DEFS!=='undefined' && (STYLE_DEFS[cls] || STYLE_DEFS.melee)) || [];
    var fam = family(cls), names = STYLES[fam] || STYLES.unarmed;

    /* --- header: weapon name, its family, combat level --- */
    var weap = host.querySelector('.cmb-weap');
    if(weap && !weap.querySelector('.cr-wname')){
      var raw = (weap.textContent||'').trim();
      var name = raw.split('·')[0].trim() || raw || 'Unarmed';
      var lvl = combatLevel();
      weap.innerHTML = '<div class="cr-wname">'+esc(name)+'</div>'+
        '<div class="cr-wcat">Category: '+esc(cls==='magic'&&!(Player.equip&&Player.equip.weapon) ? CATEGORY.magic : (CATEGORY[fam]||fam))+'</div>'+
        (lvl!=null ? '<div class="cr-clvl">Combat Lvl: '+lvl+'</div>' : '');
    }

    /* --- style tiles: picture + name (the <b>/<small> text and the onclick stay) --- */
    Array.prototype.forEach.call(host.querySelectorAll('.cmb-style'), function(el){
      if(el.querySelector('.cr-pic')) return;
      var s = list[+el.dataset.i] || {}, n = names[s.key] || [s.name || s.label || 'Style', null];
      var tip = n[0]+' ('+(s.label||s.key||'')+')\nTrains '+(TRAINS[s.xp]||s.xp||'')+
        (s.speedDelta ? '\nAttacks a little faster' : '')+(s.rangeBonus ? '\nReaches a little further' : '')+
        (s.atype ? '\n'+s.atype.charAt(0).toUpperCase()+s.atype.slice(1)+' damage' : '');
      el.setAttribute('data-tip', tip); el.setAttribute('aria-label', n[0]+', '+(s.label||''));
      el.insertAdjacentHTML('afterbegin', (n[1] ? pic(n[1], 'cr-pic') : '')+'<span class="cr-sname">'+esc(n[0])+'</span>');
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
