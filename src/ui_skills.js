/* ============================================================================
   UI SKILLS PASS — OSRS Stats interface (dark-stone stat grid).
   Self-registering IIFE (like ui_osrs.js): injects CSS + re-skins the SKILLS
   tab pane (#pane-skills > #skill-list) to the classic OSRS look:
     - 3-column grid of stone stat cells (5 rows x 15 skills)
     - each cell: skill icon + current/next level offset diagonally (e.g. 43/43),
       bright OSRS yellow with a black drop-shadow
     - dark rounded "Total level" footer
     - hover tooltip keeps the XP / next-level readout
   Loads AFTER ui_osrs.js / ui_medieval.js and REPLACES UI.refreshSkills so this
   render wins. Targets only #skill-list from here — game4_ui.js is NOT edited.
   Reference: Bible_References/UI_Stats.jpg
   ============================================================================ */
(function(){
'use strict';
if(typeof UI==='undefined') return;   // nothing to skin without the UI object

/* ---------------- OSRS stat grid render ----------------------------------- */
UI.refreshSkills = function(){
  const el=document.getElementById('skill-list'); if(!el) return;
  el.innerHTML='';

  const grid=document.createElement('div'); grid.id='osk-grid';
  let total=0;
  SKILLS.forEach(s=>{
    const lv=Player.lvl(s), xp=Math.floor(Player.xp[s]);
    total+=lv;
    const next = lv<99 ? XP_TABLE[lv+1] : null;   // XP for the next level, or mastered

    const cell=document.createElement('div'); cell.className='osk-cell';
    cell.innerHTML=
      `<img class="osk-ico" src="assets/icons/skills/${s.toLowerCase()}_cut.png" `+
        `onerror="this.style.display='none'" alt="">`+
      `<span class="osk-cur">${lv}</span>`+
      `<span class="osk-max">${lv}</span>`;
    // OSRS shows current(boosted)/base — unboosted both read the base level.
    cell.title = `${s} — level ${lv}\n${xp.toLocaleString()} XP`+
      (next ? `\nNext level at ${next.toLocaleString()} XP (${(next-xp).toLocaleString()} to go)`
            : `\nMastered!`);
    grid.appendChild(cell);
  });
  el.appendChild(grid);

  const tot=document.createElement('div'); tot.id='osk-total';
  tot.innerHTML=`Total level:&nbsp;<b>${total}</b>`;
  el.appendChild(tot);
};

/* ---------------- CSS ------------------------------------------------------ */
const css=document.createElement('style');
css.id='osk-skills-css';
css.textContent=`
  /* ---- base (all widths): keep the grid legible even off desktop ---- */
  #osk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
    background:#17150f;border:2px solid #17150f;border-radius:2px;}
  .osk-cell{position:relative;min-height:34px;display:flex;align-items:center;
    background:#544f45;overflow:hidden;}
  .osk-ico{width:20px;height:20px;margin:0 5px;image-rendering:pixelated;
    filter:drop-shadow(1px 1px 0 rgba(0,0,0,.5));}
  .osk-cur,.osk-max{position:absolute;color:#ffff00;font-weight:bold;
    font-size:12px;line-height:1;text-shadow:1px 1px 0 #000,0 0 2px #000;}
  .osk-cur{top:4px;right:22px;}
  .osk-max{bottom:4px;right:6px;}
  #osk-total{margin-top:3px;text-align:center;color:#ffff00;font-weight:bold;
    font-size:13px;padding:5px 4px;text-shadow:1px 1px 0 #000;
    background:linear-gradient(#3a352b,#221d15);border:2px solid #17150f;
    border-radius:9px;letter-spacing:.3px;}
  #osk-total b{color:#ffff00;}

  /* ---- desktop refinement (OSRS stone bevel + hover), like the other ui_ files ---- */
  @media(min-width:881px){
    #osk-grid{gap:1px;background:#141209;border-color:#141209;}
    .osk-cell{min-height:37px;
      background:linear-gradient(158deg,#6d665a 0%,#565045 52%,#494339 100%);
      box-shadow:inset 1px 1px 0 rgba(255,255,255,.10),
                 inset -1px -1px 0 rgba(0,0,0,.42);}
    .osk-cell::after{content:"";position:absolute;inset:0;pointer-events:none;
      background:radial-gradient(ellipse at 30% 25%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%);}
    .osk-cell:hover{background:linear-gradient(158deg,#807867 0%,#655d4d 52%,#544d40 100%);
      box-shadow:inset 0 0 0 1px #d4a83e,
                 inset 1px 1px 0 rgba(255,255,255,.14);}
    .osk-ico{width:22px;height:22px;margin:0 6px;}
    .osk-cur{font-size:13px;top:5px;right:24px;}
    .osk-max{font-size:13px;bottom:5px;right:7px;}
    #osk-total{font-size:14px;padding:6px 4px;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 1px 2px rgba(0,0,0,.5);}
  }
`;
if(!document.getElementById('osk-skills-css')) document.head.appendChild(css);

/* If the Skills pane is already open when this loads, repaint it now. */
if(document.getElementById('skill-list') && document.getElementById('skill-list').children.length){
  try{ UI.refreshSkills(); }catch(e){}
}

})();
