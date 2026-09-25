/* ============================================================================
   UI_PRAYER_MAGIC — the Prayer book and the Spellbook as OSRS icon grids
   (Bible_References/UI_Prayer.jpg, UI_MagicBook.jpg).

   Round 3 (owner 2026-09-25): the emoji glyphs are gone. Every prayer and spell shows a pixel sprite
   rendered from our own Blender props (assets/icons/ui/v3/prayers|spells, tools/blender/build_ui_icons_v1.py):
   a leather / stone / steel shield for the skins, a fist (with lightning, with fire) for strength, a candle
   and hourglasses for the reflex prayers, an eye and a hawk feather for ranged, a crystal orb and a glowing
   book for magic, three wards for the protections; wind / water / earth / fire strikes, bolts and blasts,
   the curses, five portal teleports and the two alchemies. Locked entries are dark silhouettes.

   COSMETIC ONLY: game4_ui.js still builds each .prayer-btn with its own onclick (toggle / cast); this file
   wraps UI.refreshPrayers / UI.refreshSpells and, after each render, swaps the leading emoji text node of
   every button for the sprite and moves the name + level into a tooltip. Styling: assets/ui/osrs_kit.css.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiPrayerMagicBooted) return;       // guard against a double script tag
window.__uiPrayerMagicBooted = true;
var BASE = 'assets/icons/ui/v3/', V = '?v=1';

function dress(box, table, dir){
  if(!box || !table) return;
  var ids = Object.keys(table), btns = box.querySelectorAll('.prayer-btn');
  Array.prototype.forEach.call(btns, function(b, i){
    var id = ids[i]; if(!id || b.querySelector('.kit-spr')) return;
    // drop the emoji text node(s) in front of <b>
    Array.prototype.slice.call(b.childNodes).forEach(function(n){ if(n.nodeType === 3) b.removeChild(n); });
    var img = document.createElement('img'); img.className = 'kit-spr'; img.alt = ''; img.draggable = false;
    img.src = BASE + dir + '/' + id + '.png' + V;
    img.onerror = function(){ this.style.visibility = 'hidden'; };
    b.insertBefore(img, b.firstChild);
    var nm = b.querySelector('b'), lv = b.querySelector('.lv');
    var tip = (nm ? nm.textContent : table[id].name) + (lv ? '\n' + lv.textContent.replace(/^lvl /, 'Level ') : '');
    b.setAttribute('data-tip', tip); b.setAttribute('aria-label', nm ? nm.textContent : id); b.removeAttribute('title');
  });
}
function wrap(){
  if(typeof UI === 'undefined') return false;
  if(UI.refreshPrayers && !UI.refreshPrayers.__v3){
    var rp = UI.refreshPrayers;
    UI.refreshPrayers = function(){ var r = rp.apply(this, arguments); try{ dress(document.getElementById('prayer-grid'), typeof PRAYERS !== 'undefined' ? PRAYERS : null, 'prayers'); }catch(e){} return r; };
    UI.refreshPrayers.__v3 = true;
  }
  if(UI.refreshSpells && !UI.refreshSpells.__v3){
    var rs = UI.refreshSpells;
    UI.refreshSpells = function(){ var r = rs.apply(this, arguments); try{ dress(document.getElementById('spell-grid'), typeof SPELLS !== 'undefined' ? SPELLS : null, 'spells'); }catch(e){} return r; };
    UI.refreshSpells.__v3 = true;
  }
  return !!(UI.refreshPrayers && UI.refreshSpells);
}
if(!wrap()){
  var tries = 0, t = setInterval(function(){ if(wrap() || ++tries > 60) clearInterval(t); }, 250);
}
window.addEventListener('load', wrap);
})();
