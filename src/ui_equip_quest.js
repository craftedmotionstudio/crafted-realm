/* ============================================================================
   UI EQUIP + QUEST PASS — OSRS-look re-skin for two side-panel tabs.
   Self-registering IIFE (like ui_osrs.js / ui_skills.js): injects ONE <style>
   block and touches NO other file. It RE-SKINS existing DOM by CSS only — it
   does NOT rewire behaviour, so every click / hover / equip / journal handler
   built by ui_medieval.js and quest_ui.js keeps working untouched.

   1. EQUIPMENT pane (#pane-equip > #equip-list, paper-doll built by
      ui_medieval.js): the doll slots (.doll-slot) become classic OSRS bordered
      equip-slot squares — recessed dark stone tiles with a bevelled gold rim —
      arranged around the central 3D figure portrait, plus an OSRS-framed
      "Equipment bonuses" readout.  (ref: Bible_References/UI_Equipment.jpg)
   2. QUESTS pane (#pane-quests > #quest-list, journal built by quest_ui.js):
      the OSRS quest-journal — a "Quest Points" header pill over a scrollable
      list of quest names colour-coded by state (green=done / yellow=active /
      red=not-started, colours already set inline by quest_ui.js and preserved).
      (ref: Bible_References/UI_Quests.jpg)

   LOAD ORDER (the equip supersede): this <script> tag sits AFTER
   ui_medieval.js in index.html, so this stylesheet is appended to <head> last.
   For equal-specificity selectors CSS resolves ties in favour of the later
   rule, so these rules win over ui_medieval.js's #equip-doll/.doll-slot styles
   without needing to edit that file. Inline styles (quest row colours) are left
   to win where we WANT the state colour to show.

   All overrides are desktop-scoped behind @media(min-width:881px) so the mobile
   drawer layout defined in index.html is untouched.
   ============================================================================ */
(function(){
'use strict';
if(window.__uiEquipQuestBooted) return;   // guard against a double script tag
window.__uiEquipQuestBooted = true;

const css = document.createElement('style');
css.id = 'ui-equip-quest-style';
css.textContent = `
@media (min-width:881px){

  /* =====================================================================
     1. EQUIPMENT — OSRS bordered equip-slot squares round the paper doll
     ===================================================================== */

  /* the doll cross keeps its 3-col grid but gets a little more air so the
     bevelled slots read as discrete tiles rather than a solid block */
  #pane-equip #equip-doll{
    grid-template-columns:repeat(3,46px) !important;
    gap:6px !important;
    padding:10px 0 12px !important;
    background:radial-gradient(ellipse at 50% 42%, rgba(88,72,44,.42), rgba(0,0,0,0) 72%) !important;
  }

  /* the classic OSRS empty slot: recessed near-black stone tile with a warm
     inner bevel and a soft dark rim */
  #pane-equip .doll-slot{
    width:46px !important; height:46px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,0) 40%),
      linear-gradient(#38301f, #241d12) !important;
    border:1px solid #14100a !important;
    border-radius:4px !important;
    box-shadow:
      inset 0 0 0 1px rgba(120,100,64,.30),
      inset 0 3px 7px rgba(0,0,0,.7),
      0 1px 0 rgba(90,74,46,.35) !important;
  }
  #pane-equip .doll-gap{ width:46px !important; height:46px !important; }

  /* a filled slot lights its rim gold, OSRS-style, to read as "worn" */
  #pane-equip .doll-slot.filled{
    border-color:#0f0c07 !important;
    background:
      linear-gradient(180deg, rgba(255,214,120,.10), rgba(0,0,0,0) 45%),
      linear-gradient(#4c4028, #322817) !important;
    box-shadow:
      inset 0 0 0 1px rgba(198,160,86,.65),
      inset 0 2px 6px rgba(0,0,0,.6) !important;
  }
  #pane-equip .doll-slot.filled:hover{
    border-color:#0f0c07 !important;
    box-shadow:
      inset 0 0 0 1px #ffcf6a,
      inset 0 0 10px rgba(255,184,74,.30),
      inset 0 2px 6px rgba(0,0,0,.55) !important;
  }
  #pane-equip .doll-slot.locked{ opacity:.4 !important; }
  #pane-equip .doll-slot img{ width:33px !important; height:33px !important; }

  /* the paper-doll header banner reads as a carved OSRS title bar */
  #pane-equip #equip-list > .panel-banner{
    background:linear-gradient(#4a3d26,#2c2415) !important;
    border:1px solid #6a5636 !important;
    box-shadow:inset 0 0 0 1px rgba(20,16,10,.6), 0 1px 0 rgba(120,100,64,.25) !important;
    color:#ffdf9a !important;
  }

  /* the character portrait socket gets the same carved-stone frame */
  #pane-equip #equip-portrait{
    border:1px solid #14100a !important;
    box-shadow:
      inset 0 0 0 1px rgba(120,100,64,.35),
      inset 0 0 22px rgba(0,0,0,.65) !important;
    border-radius:5px !important;
  }

  /* OSRS "Equipment bonuses" panel: recessed dark stone card */
  #pane-equip #bonus-box{
    margin-top:9px !important;
    background:linear-gradient(#2b2417,#211a10) !important;
    border:1px solid #14100a !important;
    border-radius:5px !important;
    box-shadow:inset 0 0 0 1px rgba(120,100,64,.28), inset 0 2px 8px rgba(0,0,0,.55) !important;
    padding:7px 9px 9px !important;
  }
  #pane-equip #bonus-box .bonus-head{
    color:#ffdf9a !important; letter-spacing:.5px !important;
    text-align:center !important; border-bottom:1px solid #4a3d26 !important;
    padding-bottom:4px !important; margin-bottom:4px !important;
  }
  #pane-equip #bonus-box .bonus-row{
    display:flex !important; justify-content:space-between !important;
    padding:2px 2px !important; font-size:12px !important; color:#cdbf9e !important;
  }
  #pane-equip #bonus-box .bonus-row .pos{ color:#7ad66a !important; }
  #pane-equip #bonus-box .bonus-row .neg{ color:#e07a6a !important; }

  /* =====================================================================
     2. QUESTS — OSRS quest journal (Quest Points pill + colour-coded list)
     ===================================================================== */

  /* the whole quest tab becomes a recessed dark-stone journal page with its
     own inner scroll, matching the OSRS quest interface */
  #pane-quests{ padding:6px !important; }
  #pane-quests #quest-list{
    background:linear-gradient(#241d12,#1c160d) !important;
    border:1px solid #14100a !important;
    border-radius:5px !important;
    box-shadow:inset 0 0 0 1px rgba(120,100,64,.26), inset 0 2px 10px rgba(0,0,0,.6) !important;
    padding:6px 4px 6px 6px !important;
    max-height:296px !important; overflow-y:auto !important;
  }

  /* the "Quest Points" header becomes the OSRS gold pill sitting above the
     list (quest_ui.js sets it inline; override to a carved bar) */
  #pane-quests #quest-list > div:first-child{
    background:linear-gradient(#4a3d26,#2c2415) !important;
    border:1px solid #6a5636 !important;
    border-radius:4px !important;
    box-shadow:inset 0 0 0 1px rgba(20,16,10,.55) !important;
    color:#ffdf9a !important; text-shadow:1px 1px 0 #000 !important;
    padding:5px 8px !important; margin-bottom:6px !important;
    font-size:12px !important; letter-spacing:.4px !important;
  }

  /* each quest is a tight OSRS list row; the name colour is set inline by
     quest_ui.js (green/yellow/red) and deliberately NOT overridden here */
  #pane-quests .quest-row{
    padding:3px 6px !important;
    border-bottom:1px solid rgba(74,61,38,.5) !important;
    border-radius:2px !important;
    cursor:pointer !important;
    transition:background .08s !important;
  }
  #pane-quests .quest-row:hover{ background:rgba(255,184,74,.10) !important; }
  #pane-quests .quest-row b{ text-shadow:1px 1px 0 #000 !important; letter-spacing:.2px !important; }

  /* slim OSRS-brown scrollbar for the journal */
  #pane-quests #quest-list::-webkit-scrollbar{ width:9px; }
  #pane-quests #quest-list::-webkit-scrollbar-track{ background:#161109; border-left:1px solid #14100a; }
  #pane-quests #quest-list::-webkit-scrollbar-thumb{
    background:linear-gradient(#5d4a2e,#3d3019); border:1px solid #14100a; border-radius:2px;
  }
  #pane-quests #quest-list::-webkit-scrollbar-thumb:hover{ background:linear-gradient(#6f5836,#463620); }
}
`;
document.head.appendChild(css);

})();
