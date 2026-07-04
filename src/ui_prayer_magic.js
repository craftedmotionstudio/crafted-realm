/* ============================================================================
   UI_PRAYER_MAGIC — OSRS icon-grid re-skin for the Prayer + Magic (spellbook)
   tab panes. Continues the UI track (ui_osrs.js owns panel/orbs/chat).

   SELF-CONTAINED: this file owns ONE injected <style> block and adds NO DOM and
   NO behaviour. It re-SKINS by CSS override only, targeting the existing panes /
   grids / buttons that game4_ui.js already builds:
       #pane-prayers > #prayer-grid > button.prayer-btn   (refreshPrayers)
       #pane-spells   > #spell-grid  > button.prayer-btn   (refreshSpells)
   Each cell button keeps its full click target and its innerHTML
   (emoji icon + <b>name</b> + <span class="lv">…</span>) — we only lay them out
   as a dark recessed grid of bordered OSRS icon cells:
       .sel    -> lit / active (gold glow)          references: UI_Prayer.jpg
       .locked -> dimmed / unavailable              references: UI_MagicBook.jpg
   The name is surfaced as a hover tooltip; the level line is folded away so the
   cell reads as a pure icon tile like OSRS. Prayer toggling + spell casting are
   the buttons' own onclick handlers — untouched, so they keep working.

   Desktop-scoped behind @media(min-width:881px) so the mobile drawer layout in
   index.html is left alone.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiPrayerMagicBooted) return;       // guard against a double script tag
window.__uiPrayerMagicBooted = true;

const css = document.createElement('style');
css.id = 'ui-prayer-magic-style';
css.textContent = `
@media (min-width:881px){
  /* ---- the grid: a dark recessed OSRS tablet of icon cells ---------------- */
  #prayer-grid,
  #spell-grid{
    display:grid;
    gap:4px;
    padding:8px;
    border-radius:5px;
    background:linear-gradient(#1c1913,#141109);
    box-shadow:inset 0 0 0 2px #14110b, inset 0 0 12px rgba(0,0,0,.7);
  }
  #prayer-grid{ grid-template-columns:repeat(auto-fill,minmax(40px,1fr)); }
  #spell-grid { grid-template-columns:repeat(auto-fill,minmax(32px,1fr)); }

  /* ---- the header line (prayer points / rune tally) spans the whole grid -- */
  #prayer-grid .bonus-head,
  #spell-grid  .bonus-head{
    grid-column:1 / -1;
    margin:0 0 3px;
    padding:5px 7px;
    font:bold 11px Verdana;
    color:#ffcf5a;
    text-align:center;
    text-shadow:1px 1px 0 #000;
    background:linear-gradient(#3a2f1e,#241b10);
    border:1px solid #14110b;
    border-radius:4px;
    box-shadow:inset 0 1px 0 #7c6a4c;
  }

  /* ---- each spell/prayer becomes a square bordered icon cell -------------- */
  #prayer-grid .prayer-btn,
  #spell-grid  .prayer-btn{
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
    width:auto;
    aspect-ratio:1 / 1;
    margin:0;
    padding:0;
    text-align:center;
    overflow:visible;
    line-height:1;
    border:0;
    border-radius:4px;
    background:radial-gradient(circle at 40% 34%,#4a4234,#211c14 80%);
    box-shadow:inset 0 0 0 1px #14110b, inset 0 1px 0 rgba(122,108,88,.55), 0 1px 2px rgba(0,0,0,.55);
    transition:box-shadow .08s, background .08s, filter .08s;
  }
  /* the bare emoji text node is the icon — size it up to fill the tile */
  #prayer-grid .prayer-btn{ font-size:20px; }
  #spell-grid  .prayer-btn{ font-size:16px; }

  #prayer-grid .prayer-btn:hover,
  #spell-grid  .prayer-btn:hover{
    background:radial-gradient(circle at 40% 34%,#5c5240,#2b251b 80%);
    box-shadow:inset 0 0 0 1px #14110b, inset 0 1px 0 rgba(150,132,104,.7), 0 0 5px rgba(255,190,90,.3);
  }

  /* fold the name + level text out of the tile (icon-only, OSRS style) …  */
  #prayer-grid .prayer-btn b,
  #spell-grid  .prayer-btn b{
    position:absolute; left:50%; top:calc(100% + 3px); transform:translateX(-50%);
    display:none; z-index:30; white-space:nowrap; pointer-events:none;
    padding:3px 7px; font:bold 10px Verdana; color:#ffe6a0;
    background:linear-gradient(#332a1a,#1c150c);
    border:1px solid #14110b; border-radius:4px;
    box-shadow:0 3px 8px rgba(0,0,0,.6);
  }
  /* … but reveal the name as a floating tooltip on hover */
  #prayer-grid .prayer-btn:hover b,
  #spell-grid  .prayer-btn:hover b{ display:block; }

  #prayer-grid .prayer-btn .lv,
  #spell-grid  .prayer-btn .lv{ display:none; }

  /* ---- lit: active prayer / selected (castable) spell -------------------- */
  #prayer-grid .prayer-btn.sel,
  #spell-grid  .prayer-btn.sel{
    outline:none;
    background:radial-gradient(circle at 40% 34%,#6a5a30,#3a2f10 82%);
    box-shadow:inset 0 0 0 2px #ffd24a, inset 0 0 8px rgba(255,210,74,.45), 0 0 8px rgba(255,200,90,.5);
  }
  #prayer-grid .prayer-btn.sel:hover,
  #spell-grid  .prayer-btn.sel:hover{
    box-shadow:inset 0 0 0 2px #ffe27a, inset 0 0 9px rgba(255,210,74,.55), 0 0 10px rgba(255,200,90,.6);
  }

  /* ---- dimmed: unavailable (level-locked) prayer / spell ----------------- */
  #prayer-grid .prayer-btn.locked,
  #spell-grid  .prayer-btn.locked{
    opacity:1;                       /* replace flat opacity with a real "unlit" look */
    filter:grayscale(.65) brightness(.5);
    background:radial-gradient(circle at 40% 34%,#2a2620,#151109 82%);
    box-shadow:inset 0 0 0 1px #14110b, inset 0 0 6px rgba(0,0,0,.7);
    cursor:default;
  }
  #prayer-grid .prayer-btn.locked:hover,
  #spell-grid  .prayer-btn.locked:hover{
    filter:grayscale(.5) brightness(.62);
    box-shadow:inset 0 0 0 1px #14110b, inset 0 0 6px rgba(0,0,0,.7);
  }
}
`;
document.head.appendChild(css);

})();
