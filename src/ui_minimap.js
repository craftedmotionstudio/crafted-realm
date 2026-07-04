/* ============================================================================
   UI_MINIMAP — OSRS-look re-skin of the minimap bezel + corner control cluster.
   Continues the UI track (after ui_osrs.js). SELF-CONTAINED: this file owns a
   single injected <style> block and adds NO DOM. It only re-SKINS existing HUD
   chrome by CSS override — it never rewires behaviour.

   Targets (all defined in index.html, none edited here):
     #minimap-frame  -> chunky rounded stone/bronze OSRS bezel around the circle
     #compass-btn    -> OSRS compass orb (top-left of the ring)
     #music-btn      -> OSRS bronze orb (top-right of the ring)
     #worldmap-btn   -> OSRS world-map button (below the ring)
     #run-orb        -> OSRS run-energy orb (left of the ring)

   SAFETY — the minimap must keep rendering + accepting click-to-walk:
     * The #minimap canvas (144px) is NEVER covered. All decorative geometry is
       either the frame's OWN background/box-shadow (painted BELOW the child
       canvas, which owns its stacking context) or a ::before ring that sits
       OUTSIDE/behind the frame (inset:negative, z-index:-1).
     * Every purely-decorative overlay carries pointer-events:none so it can
       never swallow a click meant for the canvas or a button.

   Desktop overrides guarded behind @media(min-width:881px) so the mobile drawer
   layout in index.html is untouched (the minimap shrinks to 104px there and the
   relative bezel still fits).
   ============================================================================ */
(function(){
'use strict';
if(window.__uiMinimapBooted) return;        // guard against a double script tag
window.__uiMinimapBooted = true;

const css = document.createElement('style');
css.id = 'ui-minimap-style';
css.textContent = `
/* ===================== OSRS MINIMAP BEZEL + ORB CLUSTER ==================== */

/* --- the circular bronze/stone bezel around the minimap ------------------- */
/* The frame keeps its size; we replace the flat steel ring with a layered
   bronze rim. Its background only shows in the ~4px gutter around the opaque
   canvas, so the map render is never hidden. */
#minimap-frame{
  border:0 !important;
  background:
    radial-gradient(circle at 50% 42%, #8c7c5e 0%, #6d5f45 58%, #4a4030 100%) !important;
  box-shadow:
    inset 0 0 0 2px #2a2115,          /* dark seat against the canvas edge   */
    inset 0 0 0 3px #c8b184,          /* bright bronze highlight ring        */
    0 0 0 1px #14100a,
    0 5px 14px rgba(0,0,0,.62) !important;
  z-index:30;
}

/* chunky outer stone rim — a decorative ring OUTSIDE the frame box, pushed
   behind it (z-index:-1) so it can never cover the canvas; non-interactive. */
#minimap-frame::before{
  content:"";position:absolute;inset:-8px;border-radius:50%;
  z-index:-1;pointer-events:none;
  background:
    radial-gradient(circle at 50% 34%, #7d6f54 0%, #5b4f3b 46%, #3b3325 78%, #241d12 100%);
  box-shadow:
    inset 0 2px 4px rgba(255,238,200,.28),   /* top sheen                    */
    inset 0 -3px 6px rgba(0,0,0,.55),        /* bottom shade -> domed metal  */
    0 3px 9px rgba(0,0,0,.55);
  border:1px solid #14100a;
}

/* keep the canvas exactly as it was — round, full 144px, above all chrome */
#minimap{position:relative;z-index:2;}

/* --- shared OSRS orb/button skin ----------------------------------------- */
/* compass + music share the round bronze-orb look sitting on the ring. */
#minimap-frame #compass-btn,
#minimap-frame #music-btn{
  width:30px;height:30px;border:0 !important;border-radius:50% !important;
  z-index:33;
  background:radial-gradient(circle at 42% 34%, #6b5f47 0%, #443a2a 62%, #241d12 100%) !important;
  box-shadow:
    inset 0 1px 2px rgba(255,236,196,.30),
    inset 0 -2px 3px rgba(0,0,0,.5),
    0 0 0 2px #c8b184,               /* bright bronze bezel                  */
    0 0 0 3px #14100a,
    0 2px 5px rgba(0,0,0,.55) !important;
  color:#f4e6c0;text-shadow:0 1px 1px #000;
}
#minimap-frame #compass-btn{left:-6px;bottom:auto;top:-6px;}   /* OSRS: compass top-left */
#minimap-frame #music-btn:active,
#minimap-frame #compass-btn:active{
  box-shadow:
    inset 0 2px 4px rgba(0,0,0,.6),
    0 0 0 2px #c8b184,0 0 0 3px #14100a !important;
}

/* world-map button — a small bronze plaque tab below the ring */
#worldmap-btn{
  background:radial-gradient(circle at 50% 30%, #6b5f47 0%, #443a2a 68%, #241d12 100%) !important;
  border:0 !important;border-radius:7px !important;
  box-shadow:
    inset 0 1px 1px rgba(255,236,196,.28),
    0 0 0 2px #c8b184,0 0 0 3px #14100a,0 2px 4px rgba(0,0,0,.5) !important;
  color:#f4e6c0 !important;text-shadow:0 1px 1px #000;z-index:33;
}
#worldmap-btn:hover{filter:brightness(1.12);}
#worldmap-btn:active{box-shadow:inset 0 2px 4px rgba(0,0,0,.6),0 0 0 2px #c8b184,0 0 0 3px #14100a !important;}

/* --- run-energy orb (left of the minimap) -------------------------------- */
/* Reshaped into a proper round OSRS activity orb w/ a bright bronze bezel and
   the yellow runner glyph. Behaviour + the #run-pct label are untouched. */
@media (min-width:881px){
  #run-orb{
    width:40px !important;height:40px !important;border-radius:50% !important;
    right:388px !important;top:8px !important;border:0 !important;
    flex-direction:column;gap:0;line-height:1;
    background:radial-gradient(circle at 44% 34%, #3a4a24 0%, #24301a 62%, #121808 100%) !important;
    box-shadow:
      inset 0 1px 2px rgba(255,236,196,.22),
      inset 0 -2px 4px rgba(0,0,0,.5),
      0 0 0 2px #c8b184,0 0 0 3px #14100a,
      0 2px 5px rgba(0,0,0,.55) !important;
    font:bold 9px Verdana !important;color:#ffd24a !important;
    text-shadow:0 1px 1px #000;
  }
  #run-orb.walking{color:#9a8e78 !important;}
  #run-orb #run-pct{font-size:9px;}
}
`;
(document.head||document.documentElement).appendChild(css);
})();
