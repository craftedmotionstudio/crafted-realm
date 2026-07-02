/* ================= QUEST UI (OSRS-style journal, reward scroll, quest points) =================
 * Loads after game4_ui.js and upgrades the quest surfaces to match the private-server standard:
 *  - quest tab: Quest Points header, red/yellow/green titles, click opens the JOURNAL
 *  - journal: the story so far — done stages struck out, current objective highlighted, reqs shown
 *  - reward scroll: "Congratulations!" modal on completion listing QP + XP + items
 * All DOM is self-contained (no index.html edits beyond the script tag). */

(function(){

/* ---------- quest tab ---------- */
UI.refreshQuests = function(){
  Quest.updateMarker();
  const el=document.getElementById('quest-list'); if(!el) return;
  el.innerHTML='';
  const qp=document.createElement('div');
  qp.style.cssText='padding:4px 6px;margin-bottom:4px;border-bottom:1px solid #5a4a33;color:#e8d9a0;font-weight:bold;font-size:12px;display:flex;justify-content:space-between';
  qp.innerHTML=`<span>Quest Journal</span><span title="Quest Points">QP: ${Quest.qp()}/${Quest.qpMax()}</span>`;
  el.appendChild(qp);
  for(const id in QUESTS){
    const q=QUESTS[id], st=Player.quests[id];
    const row=document.createElement('div'); row.className='quest-row';
    let color='#c85450', sub='Not started';                       // red = not started
    if(st && st.stage===99){ color='#66b25a'; sub='Complete'; }   // green = done
    else if(st){ color='#d8c24a'; sub=Quest.stageText(id); }      // yellow = in progress
    else if(!Quest.canStart(id)){ color='#8a5450'; sub='Requires: '+Quest.reqText(id); }
    const tracked = Quest.tracked===id;
    row.innerHTML=`<div style="color:${color}"><b>${tracked?'🚩 ':''}${q.name}</b></div>
      <div style="font-size:10px;color:#9a8e78">${sub}</div>`;
    row.title='Click to open the quest journal';
    row.style.cursor='pointer';
    row.onclick=()=>{ UI.questJournal(id); Sfx.click(); };
    el.appendChild(row);
  }
};

/* ---------- shared overlay helper ---------- */
function overlay(id){
  let o=document.getElementById(id);
  if(o){ o.innerHTML=''; o.style.display='flex'; return o; }
  o=document.createElement('div'); o.id=id;
  o.style.cssText='position:fixed;inset:0;background:rgba(10,8,4,.55);z-index:260;display:flex;align-items:center;justify-content:center';
  o.addEventListener('click', e=>{ if(e.target===o) o.style.display='none'; });
  document.body.appendChild(o);
  return o;
}
function panel(w){
  const p=document.createElement('div');
  p.style.cssText=`width:${w}px;max-width:92vw;max-height:80vh;overflow-y:auto;background:#2a2318;border:3px solid #6a5636;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.7);padding:14px 18px;color:#d8ccb0;font-family:inherit`;
  return p;
}
function btn(label, fn){
  const b=document.createElement('button'); b.className='opt'; b.textContent=label;
  b.style.cssText='margin:8px 6px 0 0;padding:5px 14px;cursor:pointer';
  b.onclick=fn; return b;
}

/* ---------- the quest journal ---------- */
UI.questJournal = function(id){
  const q=QUESTS[id], st=Player.quests[id];
  const o=overlay('quest-journal'); const p=panel(420);
  const state = (st&&st.stage===99) ? 'done' : st ? 'prog' : 'not';
  const titleCol = state==='done' ? '#66b25a' : state==='prog' ? '#d8c24a' : '#c85450';
  let html=`<div style="text-align:center;border-bottom:2px solid #5a4a33;padding-bottom:6px;margin-bottom:8px">
    <div style="font-size:17px;font-weight:bold;color:${titleCol}">${q.name}</div>
    <div style="font-size:11px;color:#9a8e78">${q.difficulty||'Novice'} quest · ${q.qp||1} Quest Point${(q.qp||1)>1?'s':''} · Started with ${q.giver}</div>
  </div>`;
  html+=`<div style="font-size:12px;font-style:italic;color:#b8a988;margin-bottom:10px">${q.desc}</div>`;
  if(q.requires && q.requires.quests && q.requires.quests.length){
    const missing=Quest.reqText(id);
    html+=`<div style="font-size:11px;margin-bottom:8px;color:${missing?'#c85450':'#66b25a'}">Requires: ${q.requires.quests.map(r=>QUESTS[r].name).join(', ')}${missing?'':' ✓'}</div>`;
  }
  html+=`<div style="border-top:1px solid #4a3d2a;padding-top:8px">`;
  if(!st){
    html+=`<div style="color:#d8c24a;font-size:13px">✦ ${q.stages[0].text}</div>`;
  } else {
    const cur = st.stage===99 ? q.stages.length : st.stage;
    for(let i=1;i<q.stages.length;i++){
      const s=q.stages[i];
      if(i<cur) html+=`<div style="color:#7a6f5c;font-size:12px;text-decoration:line-through;margin:3px 0">${s.text.replace('%n', s.count||'')}</div>`;
      else if(i===cur) html+=`<div style="color:#d8c24a;font-size:13px;margin:3px 0">✦ ${s.text.replace('%n', st.counter)}</div>`;
      else html+=`<div style="color:#5c5344;font-size:12px;margin:3px 0">· · ·</div>`;
    }
    if(st.stage===99) html+=`<div style="color:#66b25a;font-weight:bold;margin-top:8px;text-align:center">— QUEST COMPLETE —</div>`;
  }
  html+=`</div>`;
  p.innerHTML=html;
  const bar=document.createElement('div'); bar.style.textAlign='center';
  if(!(st&&st.stage===99)){
    bar.appendChild(btn(Quest.tracked===id?'Untrack':'Track on minimap', ()=>{ Quest.track(id); UI.questJournal(id); }));
  }
  bar.appendChild(btn('Close', ()=>{ o.style.display='none'; Sfx.click(); }));
  p.appendChild(bar);
  o.appendChild(p);
};

/* ---------- the reward scroll ---------- */
UI.questComplete = function(id){
  const q=QUESTS[id];
  UI.chat(`Congratulations! Quest complete: ${q.name}.`,'xp');
  const o=overlay('quest-scroll'); const p=panel(360);
  p.style.background='#3a3020';
  let html=`<div style="text-align:center">
    <div style="font-size:13px;color:#b8a988;letter-spacing:2px">CONGRATULATIONS!</div>
    <div style="font-size:17px;font-weight:bold;color:#e8d9a0;margin:4px 0 10px">You have completed<br>${q.name}!</div>
    <div style="border-top:2px solid #6a5636;border-bottom:2px solid #6a5636;padding:8px 0;margin-bottom:6px;text-align:left">
      <div style="font-size:11px;color:#9a8e78;text-align:center;margin-bottom:6px">You are awarded:</div>`;
  html+=`<div style="font-size:13px;color:#d8c24a;margin:2px 12px">✦ ${q.qp||1} Quest Point${(q.qp||1)>1?'s':''}</div>`;
  for(const sk in (q.reward.xp||{}))
    html+=`<div style="font-size:12px;color:#8ab4d8;margin:2px 12px">✦ ${q.reward.xp[sk].toLocaleString()} ${sk} XP</div>`;
  (q.reward.items||[]).forEach(it=>{
    const nm=(ITEMS[it.id]&&ITEMS[it.id].name)||it.id;
    html+=`<div style="font-size:12px;color:#d0c49f;margin:2px 12px">✦ ${it.q>1? it.q+'× ':''}${nm}</div>`;
  });
  html+=`</div><div style="font-size:12px;color:#e8d9a0">Quest Points: ${Quest.qp()}/${Quest.qpMax()}</div></div>`;
  p.innerHTML=html;
  const bar=document.createElement('div'); bar.style.textAlign='center';
  bar.appendChild(btn('Close', ()=>{ o.style.display='none'; Sfx.click(); }));
  p.appendChild(bar);
  o.appendChild(p);
};

})();
