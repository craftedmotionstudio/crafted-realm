/* ============================================================================
   UI SKILLS PASS — OSRS Stats interface (stone stat grid), Bible_References/UI_Stats.jpg.
   Self-registering IIFE: re-renders the SKILLS tab pane (#pane-skills > #skill-list):
     - 3-column grid of stone stat cells (5 rows x 15 skills)
     - each cell: the skill's pixel sprite (rendered from our own Blender prop, assets/icons/ui/v3/skills)
       and current / base level either side of a slash, OSRS yellow with a 1 px black shadow
     - a "Total level" plaque underneath
     - hover tooltip keeps the XP / next-level readout
   Loads AFTER ui_osrs.js / ui_medieval.js and REPLACES UI.refreshSkills so this render wins.
   Round 3: the styling lives in assets/ui/osrs_kit.css (the kit retires the old 'osk-skills-css' block);
   only a minimal fallback stays here for pages without the kit. game4_ui.js is NOT edited.
   ============================================================================ */
(function(){
'use strict';
if(typeof UI==='undefined') return;   // nothing to skin without the UI object
var ICO='assets/icons/ui/v3/skills/', V='?v=2';

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
    // OSRS shows current(boosted)/base — unboosted both read the base level.
    cell.innerHTML=
      `<img class="osk-ico kit-spr" src="${ICO}${s.toLowerCase()}.png${V}" alt="" draggable="false" `+
        `onerror="this.style.visibility='hidden'">`+
      `<span class="osk-cur">${lv}</span><span class="osk-slash">/</span>`+
      `<span class="osk-max">${lv}</span>`;
    cell.title = `${s} — level ${lv}\n${xp.toLocaleString()} XP`+
      (next ? `\nNext level at ${next.toLocaleString()} XP (${(next-xp).toLocaleString()} to go)`
            : `\nMastered!`);
    grid.appendChild(cell);
  });
  el.appendChild(grid);

  const tot=document.createElement('div'); tot.id='osk-total';
  tot.innerHTML=`Total level: <b>${total}</b>`;
  el.appendChild(tot);
};

/* minimal fallback layout (the kit stylesheet owns the look and retires this block) */
const css=document.createElement('style');
css.id='osk-skills-css';
css.textContent=`
  #osk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#17150f;border:1px solid #17150f;}
  .osk-cell{position:relative;min-height:34px;display:flex;align-items:center;background:#544f45;overflow:hidden;}
  .osk-ico{width:24px;height:24px;margin:0 3px;image-rendering:pixelated;}
  .osk-cur,.osk-max,.osk-slash{position:absolute;color:#ffff00;font-size:12px;line-height:12px;text-shadow:1px 1px 0 #000;}
  .osk-cur{top:3px;right:21px;} .osk-max{bottom:3px;right:6px;} .osk-slash{top:11px;right:15px;}
  #osk-total{margin-top:3px;text-align:center;color:#ffff00;padding:4px;background:#221d15;text-shadow:1px 1px 0 #000;}
`;
if(!document.getElementById('osk-skills-css')) document.head.appendChild(css);

/* If the Skills pane is already open when this loads, repaint it now. */
if(document.getElementById('skill-list') && document.getElementById('skill-list').children.length){
  try{ UI.refreshSkills(); }catch(e){}
}

})();
