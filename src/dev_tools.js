/* ============ Dev tools — definition browser, live validation, hiscores, hot-reload ============
 * (GOAL.md §8 admin layer + §15) The OpenRS2/Displee lesson: expose the
 * definition registry as browse + validate operations, right in the client.
 *   - DefBrowser: searchable ITEMS / NPC_TYPES / SHOPS inspector (admin)
 *   - liteValidate(): the referential-integrity core of validate_content.js,
 *     run in-browser after runtime edits (full gate stays `node tools/validate_content.js`)
 *   - Hiscores: local skill totals panel + window.CraftedData JSON surface
 *     (the standalone drop-table/hiscores data surface, single-player edition)
 *   - DevReload: re-fetch + re-eval a content script without a full refresh
 */
const DevTools = {
  openDefs(){
    let m=document.getElementById('defs-modal');
    if(!m){ m=document.createElement('div'); m.id='defs-modal'; m.className='modal steel';
      m.style.cssText='display:none;max-width:520px;max-height:74vh;overflow:auto;'; document.body.appendChild(m); }
    m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
      `<div class="osrs-title" style="text-align:center;margin-bottom:6px">Definition browser</div>`+
      `<div style="display:flex;gap:6px;margin-bottom:6px">`+
      `<input id="defs-q" placeholder="Search items / npcs / shops…" style="flex:1;padding:3px 6px;background:#1e1a14;color:#ffd24a;border:2px inset #6b5f4a;font:11px Verdana">`+
      `<button id="defs-validate" style="padding:3px 8px;background:#4f483c;color:#ffd24a;border:2px outset #6b5f4a;cursor:pointer;font-size:10px">Validate</button></div>`+
      `<div id="defs-out" style="font-size:10px"></div>`;
    m.style.display='block';
    const out=document.getElementById('defs-out');
    const render=q=>{
      q=(q||'').toLowerCase();
      const rows=[];
      const card=(kind,id,o,extra)=>rows.push(
        `<div style="border-bottom:1px solid rgba(93,84,71,.4);padding:3px 0">`+
        `<span style="color:#8fd0ff">[${kind}]</span> <b style="color:#ffd24a">${id}</b> — ${o.name||''} ${extra||''}`+
        `<br><span style="color:#9a8e78">${JSON.stringify(o).slice(0,180)}</span></div>`);
      for(const id in ITEMS){ const it=ITEMS[id];
        if(!q || id.includes(q) || (it.name||'').toLowerCase().includes(q)) card('item', id, it); if(rows.length>60) break; }
      if(rows.length<=60) for(const id in NPC_TYPES){ const t=NPC_TYPES[id];
        if(!q || id.includes(q) || (t.name||'').toLowerCase().includes(q)) card('npc', id, {name:t.name, level:t.level, hp:t.hp, drops:(t.drops||[]).length+' drops'}); if(rows.length>80) break; }
      if(rows.length<=80) for(const id in SHOPS){ const s=SHOPS[id];
        if(!q || id.includes(q) || (s.name||'').toLowerCase().includes(q)) card('shop', id, {name:s.name, stock:(s.stock||[]).length+' lines'}); }
      out.innerHTML=rows.slice(0,90).join('')||'<i style="color:#9a8e78">No matches.</i>';
    };
    document.getElementById('defs-q').oninput=e=>render(e.target.value);
    document.getElementById('defs-validate').onclick=()=>{
      const errs=DevTools.liteValidate();
      UI.chat(errs.length?('⚠ Validation: '+errs.length+' error(s): '+errs.slice(0,3).join(' | ')):'✅ Live definitions validate clean.', errs.length?'combat':'xp');
    };
    render('');
  },
  liteValidate(){
    const errs=[];
    for(const id in NPC_TYPES){ const t=NPC_TYPES[id];
      (t.drops||[]).forEach(d=>{ if(!ITEMS[d.id]) errs.push(`npc ${id} drops unknown item ${d.id}`);
        if(!(d.p>0&&d.p<=1)) errs.push(`npc ${id} drop ${d.id} bad probability ${d.p}`); });
      ['level','hp','att','str','def'].forEach(k=>{ if(!isFinite(t[k])) errs.push(`npc ${id} non-finite ${k}`); }); }
    for(const id in SHOPS){ (SHOPS[id].stock||[]).forEach(s=>{
      const iid=Array.isArray(s)?s[0]:s.id; if(iid && !ITEMS[iid]) errs.push(`shop ${id} stocks unknown item ${iid}`); }); }
    for(const id in ITEMS){ const it=ITEMS[id];
      if(!isFinite(it.value)) errs.push(`item ${id} non-finite value`); }
    return errs;
  },
  openHiscores(){
    let m=document.getElementById('hiscores-modal');
    if(!m){ m=document.createElement('div'); m.id='hiscores-modal'; m.className='modal steel';
      m.style.cssText='display:none;max-width:300px;max-height:70vh;overflow:auto;'; document.body.appendChild(m); }
    const rows=SKILLS.map(s=>({s, lvl:Player.lvl(s), xp:Math.floor(Player.xp[s]||0)}))
      .sort((a,b)=>b.xp-a.xp)
      .map(r=>`<tr><td style="padding:1px 8px 1px 0;color:#d8ccb4">${r.s}</td>`+
        `<td style="color:#ffd24a;text-align:right;padding-right:8px">${r.lvl}</td>`+
        `<td style="color:#9a8e78;text-align:right">${r.xp.toLocaleString()}</td></tr>`).join('');
    const total=SKILLS.reduce((a,s)=>a+Player.lvl(s),0);
    m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
      `<div class="osrs-title" style="text-align:center">Hiscores — total ${total}</div>`+
      `<table style="font-size:11px;margin:6px auto 0">${rows}</table>`;
    m.style.display='block';
  },
  reload(src){   // content hot-reload: re-fetch + re-eval one script, no page refresh
    return fetch(src+'?hot='+Date.now()).then(r=>r.text()).then(code=>{
      (0,eval)(code);
      UI.chat('♻ Reloaded '+src+' (function bindings replaced; consts keep their first value).','sys');
      return true;
    }).catch(e=>{ UI.chat('Hot-reload failed for '+src+': '+e.message,'combat'); return false; });
  },
};
/* the standalone data surface (V2 serves this over HTTP; identical shape today) */
window.CraftedData = {
  hiscores(){ return SKILLS.map(s=>({skill:s, level:Player.lvl(s), xp:Math.floor(Player.xp[s]||0)})); },
  dropTables(){ const o={}; for(const id in NPC_TYPES){ const t=NPC_TYPES[id];
    if(t.drops) o[id]={name:t.name, level:t.level, drops:t.drops}; } return o; },
};
/* surface in the generated settings section */
if(typeof GAME_SETTINGS!=='undefined'){
  GAME_SETTINGS.push(
    {id:'defs',     name:'Definition browser', act:()=>DevTools.openDefs()},
    {id:'hiscores', name:'Hiscores',           act:()=>DevTools.openHiscores()},
  );
}
