/* ============================================================================
   UI_OSRS — OSRS-look re-skin pass (START of the UI track as its own effort).
   SELF-CONTAINED: this file owns a single injected <style> block plus ONE small
   cosmetic DOM addition (the chatbox tab row). It re-SKINS existing HUD chrome
   by CSS override — it does NOT rewire any behaviour. Existing handlers keep
   working: side-panel tabs still switch, chat still logs, orbs still update.

   Restyled in this first slice (highest visual impact, references in
   Bible_References/UI_*.jpg):
     1. Side-panel chrome  -> OSRS stone frame w/ flanking pillars + tab tiles
        (targets #side-panel / .tab-btn — see UI_Combat / UI_Stats / UI_Inventory1)
     2. Chatbox            -> parchment frame + the iconic bottom chat-tab row
        (All / Game / Public / Private / Clan / Trade / Yell / Report — UI_ChatBar)
     3. Stat orbs          -> per-orb OSRS colour theming (HP red, Prayer blue…)

   Desktop overrides are guarded behind @media(min-width:881px) so the mobile
   drawer layout defined in index.html is untouched.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiOsrsBooted) return;           // guard against a double script tag
window.__uiOsrsBooted = true;

/* ------------------------------------------------------------------ CSS ---- */
const css = document.createElement('style');
css.id = 'ui-osrs-style';
css.textContent = `
/* ============================ 1. SIDE-PANEL STONE CHROME ================== */
@media (min-width:881px){
  /* the whole panel becomes a recessed stone frame; content inset by padding */
  #side-panel.steel{
    background:linear-gradient(#332d23,#241f16);
    border:0;
    padding:11px 13px 12px;
    border-radius:7px;
    box-shadow:
      inset 0 0 0 2px #14110b,
      inset 0 0 0 4px #6b6152,
      inset 0 0 0 6px #2b251c,
      0 7px 20px rgba(0,0,0,.72);
  }
  /* flanking OSRS pillars, drawn in the frame gutter, behind (and un-clickable
     under) the panel content */
  #side-panel.steel::before,
  #side-panel.steel::after{
    content:"";position:absolute;top:8px;bottom:8px;width:8px;z-index:1;
    pointer-events:none;border-radius:3px;
    background:linear-gradient(90deg,#3a352c 0%,#8a8270 42%,#6b6354 58%,#2e2a22 100%);
    box-shadow:inset 0 0 0 1px #14110b,0 0 4px rgba(0,0,0,.5);
  }
  #side-panel.steel::before{left:4px;}
  #side-panel.steel::after {right:4px;}

  /* tab rows: transparent so the stone shows through; tiles get rounded bevels */
  #side-panel #tab-bar,
  #side-panel #tab-bar-bottom{
    background:transparent;gap:3px;padding:1px 0;
  }
  #side-panel .tab-btn{
    border:0;border-radius:6px;margin:0 1px;
    background:linear-gradient(#564a3a,#37301f);
    box-shadow:inset 0 1px 0 #7a6c58, inset 0 0 0 1px #14110b, 0 1px 2px rgba(0,0,0,.55);
    transition:background .08s,box-shadow .08s;
  }
  #side-panel .tab-btn:hover{
    background:linear-gradient(#63563f,#403626);
    box-shadow:inset 0 1px 0 #8a7a62, inset 0 0 0 1px #14110b, 0 0 4px rgba(255,180,90,.25);
  }
  #side-panel #tab-bar .tab-btn.active,
  #side-panel #tab-bar-bottom .tab-btn.active{
    background:linear-gradient(#9a4331,#5a1f14);
    box-shadow:inset 0 1px 0 #d67a58, inset 0 0 0 1px #2a0d06, 0 0 6px rgba(255,120,60,.45);
  }
  /* panes read as a dark inset stone tablet */
  #side-panel .tab-pane{
    background:rgba(18,15,10,.34);
    border:1px solid #14110b;
    border-radius:5px;
    box-shadow:inset 0 0 14px rgba(0,0,0,.55);
    padding:9px;
  }
}

/* ================================ 2. CHATBOX ============================== */
@media (min-width:881px){
  #chatbox-frame.steel{
    background:linear-gradient(#3a2f1f,#241b10);
    border:0;padding:5px 6px 6px;border-radius:6px;
    box-shadow:
      inset 0 0 0 2px #14110b,
      inset 0 0 0 4px #6b5636,
      inset 0 0 0 6px #241b10,
      0 6px 18px rgba(0,0,0,.7);
  }
  #chat-title{
    color:#ffcf5a;letter-spacing:.4px;
    padding:2px 8px 5px;
  }
  #chatbox{
    background:#c9b98f;                 /* warmer OSRS parchment */
    border:2px solid;
    border-color:#4a3d28 #d8cca8 #d8cca8 #4a3d28;
    box-shadow:inset 0 0 10px rgba(74,61,40,.35);
  }
}
/* the iconic OSRS chat tab row (cosmetic chrome — injected below the frame) */
#chat-tabs{
  position:absolute;left:0;right:0;top:100%;margin-top:3px;
  display:flex;gap:3px;z-index:2;
}
#chat-tabs .chtab{
  flex:1;min-width:0;text-align:center;cursor:pointer;
  padding:4px 2px 3px;border-radius:4px 4px 3px 3px;
  font:bold 11px Verdana;color:#efe6cf;line-height:1.05;
  background:linear-gradient(#5c4e38,#3a2f1e);
  border:1px solid #14110b;
  box-shadow:inset 0 1px 0 #7c6a4c;
  text-shadow:1px 1px 0 #000;
}
#chat-tabs .chtab small{display:block;font-weight:bold;font-size:9px;color:#5edb5e;margin-top:1px;}
#chat-tabs .chtab:hover{background:linear-gradient(#6a5a40,#453824);}
#chat-tabs .chtab.active{
  background:linear-gradient(#8a7350,#5a4a30);
  box-shadow:inset 0 1px 0 #a8926a,0 0 5px rgba(255,200,110,.3);
}
#chat-tabs .chtab.report{
  background:linear-gradient(#9a2420,#5c130f);color:#ffe0d8;
  box-shadow:inset 0 1px 0 #c85a4a;
}
#chat-tabs .chtab.report:hover{background:linear-gradient(#b12c26,#6c1712);}
@media (max-width:880px){ #chat-tabs{display:none;} }

/* ================================ 3. STAT ORBS =========================== */
@media (min-width:881px){
  #orbs .orb{
    border:3px solid #7a7265;
    background:radial-gradient(circle at 38% 32%,#4a4234,#1a160d 78%);
    box-shadow:inset 0 0 9px rgba(0,0,0,.7), 0 2px 6px rgba(0,0,0,.6);
  }
  #orbs .orb .num{text-shadow:1px 1px 0 #000,0 0 3px rgba(0,0,0,.8);}
  #orbs #hp-orb{background:radial-gradient(circle at 38% 32%,#8a2b24,#320d0a 80%);}
  #orbs #hp-orb .num{color:#dfffd8;}
  #orbs .orb:nth-child(2){background:radial-gradient(circle at 38% 32%,#6b5326,#2e2109 80%);} /* crowns */
  #orbs .orb:nth-child(3){background:radial-gradient(circle at 38% 32%,#7a4a1f,#33200a 80%);} /* combat */
  #orbs .orb:nth-child(4){background:radial-gradient(circle at 38% 32%,#274a7a,#0c1a33 80%);} /* prayer */
  #orbs #spec-orb{background:radial-gradient(circle at 38% 32%,#1f4a5a,#08202a 80%);}
}
`;
document.head.appendChild(css);

/* -------------------------------------------- chat tab row (cosmetic) ----- */
/* Purely chrome: matches the OSRS chat tab strip (UI_ChatBar+More.jpg). Clicks
   only move the visual "active" highlight — the real chat log is untouched, so
   there is no way for this to break chat logging. */
function installChatTabs(){
  const frame = document.getElementById('chatbox-frame');
  if(!frame || document.getElementById('chat-tabs')) return;
  const TABS = ['All','Game','Public','Private','Clan','Trade','Yell'];
  const bar = document.createElement('div'); bar.id = 'chat-tabs';
  TABS.forEach((label,i)=>{
    const t = document.createElement('div');
    t.className = 'chtab' + (i===0 ? ' active' : '');
    t.innerHTML = label + (i===0 ? '' : '<small>On</small>');
    t.addEventListener('click', ()=>{
      bar.querySelectorAll('.chtab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      if(window.Sfx && Sfx.click) try{ Sfx.click(); }catch(e){}
    });
    bar.appendChild(t);
  });
  const report = document.createElement('div');
  report.className = 'chtab report'; report.textContent = 'Report';
  bar.appendChild(report);
  frame.appendChild(bar);
}

function boot(){ installChatTabs(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
