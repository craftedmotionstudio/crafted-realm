/* ============================================================================
   UI FINISH PASS — the last two OSRS finishing touches (CSS-only, reskin-only).
   Loads AFTER ui_medieval.js. Injects ONE <style> block, changes NO logic and
   NO handlers. Owns nothing but src/ui_finish.js.

     1. SETTINGS pane  -> OSRS stone-panel look: brown/stone rows, the "Toggle"
        buttons re-skinned as OSRS switch pills, OSRS-carved sliders, framed
        panel with an inset stone border (matches Bible_References/UI_Settings.jpg).
     2. NUMERAL / LABEL POLISH -> a crisp bitmap-flavoured look on the HUD
        numerals + labels (stat orbs, run orb, skill levels, chat, xp drops)
        using ONLY a system font stack + text-shadow tuning. No external font
        is loaded (CSP blocks external hosts).

   There is no Emotes / Clan / Friends pane in this build, so none is invented.
   ============================================================================ */
(function(){
'use strict';

const css = document.createElement('style');
css.id = 'ui-finish-css';
css.textContent = `
/* ================= 2. OSRS numeral + label polish (safe, global) =========
   No sizes change — only family + shadow — so layout is untouched. A crisp
   1px hard-black drop shadow over a bold condensed system stack reads as the
   old bitmap RuneScape numerals without loading any external font. */
:root{
  --osrs-num:'Trebuchet MS','Tahoma','Verdana',sans-serif;
}
#orbs .orb .num,
#orbs .orb .lbl,
#run-orb, #run-pct,
#skill-total, #skill-total b,
.sk-lv, .sk-lv i,
.xp-drop{
  font-family:var(--osrs-num) !important;
  font-weight:bold !important;
  letter-spacing:.3px;
  text-shadow:1px 1px 0 #000, 0 0 1px rgba(0,0,0,.85) !important;
  -webkit-font-smoothing:none;
}
#orbs .orb .num{ letter-spacing:.2px; }
#orbs .orb .lbl{ letter-spacing:.6px; }
#chatbox{
  font-family:var(--osrs-num);
  letter-spacing:.15px;
  -webkit-font-smoothing:none;
}
#chat-title{
  font-family:var(--osrs-num);
  letter-spacing:.4px;
}

/* ================= 1. Settings pane -> OSRS stone panel ===================
   Desktop-scoped: structural padding/borders only apply on the desktop HUD so
   the mobile settings sheet keeps its existing (touch-tuned) layout. */
@media(min-width:881px){
  #pane-settings{
    background:
      linear-gradient(rgba(0,0,0,.16), rgba(0,0,0,.28)),
      linear-gradient(150deg,#6f6a60 0%,#585148 45%,#403a31 100%);
    border:2px solid #2b2620;
    border-radius:4px;
    box-shadow:inset 0 0 0 1px #837a6b, inset 0 0 14px rgba(0,0,0,.55);
    padding:10px 11px 12px;
  }
  /* toggle / slider rows -> carved stone strips */
  #pane-settings .set-row{
    padding:8px 9px;
    margin-bottom:6px;
    border:1px solid #2b2620;
    border-radius:3px;
    background:linear-gradient(#4d463b,#39332a);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 6px rgba(0,0,0,.4);
    color:#efe4c4;
    text-shadow:1px 1px 0 #000;
    font-family:var(--osrs-num);
    letter-spacing:.3px;
  }
  /* "Toggle" / "Open" buttons -> OSRS switch pill */
  #pane-settings .set-btn{
    font:bold 11px var(--osrs-num);
    letter-spacing:.4px;
    color:#f4e8c6;
    background:linear-gradient(#6a5f49,#463d2c);
    border:2px solid;
    border-color:#8f8161 #2a241a #2a241a #8f8161;
    border-radius:4px;
    padding:5px 14px;
    text-shadow:1px 1px 0 #000;
    box-shadow:inset 0 0 5px rgba(0,0,0,.35);
    transition:none;
  }
  #pane-settings .set-btn:hover{
    color:#ffd24a;
    background:linear-gradient(#7a6d52,#544934);
    border-color:#a89468 #2a241a #2a241a #a89468;
  }
  #pane-settings .set-btn:active{
    border-color:#2a241a #8f8161 #8f8161 #2a241a;
    box-shadow:inset 0 0 7px rgba(0,0,0,.6);
  }
  /* OSRS carved slider track + rune-blue knob */
  #pane-settings .set-slider{
    -webkit-appearance:none; appearance:none;
    height:8px; width:130px;
    background:linear-gradient(#241f16,#3a3225);
    border:1px solid #100c07;
    border-radius:5px;
    box-shadow:inset 0 1px 3px rgba(0,0,0,.7);
    accent-color:#4a78d0;
    outline:none;
  }
  #pane-settings .set-slider::-webkit-slider-thumb{
    -webkit-appearance:none; appearance:none;
    width:15px; height:15px; border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#8fb4f0,#2f5bb0 70%,#173679 100%);
    border:1px solid #0d1c40;
    box-shadow:0 1px 2px rgba(0,0,0,.6);
    cursor:pointer;
  }
  #pane-settings .set-slider::-moz-range-thumb{
    width:15px; height:15px; border-radius:50%;
    background:radial-gradient(circle at 35% 30%,#8fb4f0,#2f5bb0 70%,#173679 100%);
    border:1px solid #0d1c40;
    box-shadow:0 1px 2px rgba(0,0,0,.6);
    cursor:pointer;
  }
  /* wide Save / Logout buttons keep their intent, gain the stone frame */
  #pane-settings .set-btn.wide{
    font:bold 12px var(--osrs-num);
    letter-spacing:.5px;
    border-radius:4px;
    box-shadow:inset 0 0 6px rgba(0,0,0,.4);
    padding:9px;
  }
  #pane-settings .set-btn.logout{
    background:linear-gradient(#8a201a,#4d0c09);
    border-color:#c46a63 #2a0605 #2a0605 #c46a63;
  }
  #pane-settings .set-btn.logout:hover{
    background:linear-gradient(#a8281f,#5d0f0b);
  }
}
`;

function boot(){ document.head.appendChild(css); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
