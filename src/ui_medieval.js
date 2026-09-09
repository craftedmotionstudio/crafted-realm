/* ============================================================================
   MEDIEVAL UI PASS — OSRS-style interface, our own medieval read.
   Loads after game4_ui.js / quest_ui.js and upgrades:
     1. hand-drawn TAB ICONS (canvas, no emoji)
     2. skills tab -> OSRS 3-column stat grid (icon + level, hover XP tooltip, total level)
     3. worn equipment -> paper-doll slot layout (see exactly what you wear) + bonuses
     4. a Music player tab (tracks list, like the OSRS music tab)
     5. resizable chatbox (drag the title bar) — panels stay clickable everywhere
   All DOM/CSS is injected from here so the pass is one <script> tag to revert.
   ============================================================================ */
(function(){
'use strict';

/* ---------------- 1. tab icons -------------------------------------------------
   Primary: Nano Banana (Gemini) designed PNGs in assets/icons/ui/nb/<panel>.png
   (one cohesive 2007-OSRS set, 2026-07-18). Fallback: the hand-drawn canvas icons
   below (tabIconCanvas), wired via img.onerror so a missing PNG never blanks a tab. */
function tabIcon(kind){ return 'assets/icons/ui/nb/'+kind+'.png'; }
function tabIconCanvas(kind){
  const c=document.createElement('canvas'); c.width=26; c.height=26;
  const x=c.getContext('2d');
  x.lineWidth=1.6; x.lineJoin='round'; x.lineCap='round';
  const O='#241a0e';
  const F=(fill,fn)=>{ x.fillStyle=fill; x.strokeStyle=O; x.beginPath(); fn(); x.fill(); x.stroke(); };
  const P=(pts)=>{ x.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); x.closePath(); };
  switch(kind){
    case 'combat':   // crossed sword + axe
      F('#d0d4dc',()=>P([[5,21],[17,7],[20,5],[21,8],[8,21],[6,23]]));       // blade
      F('#7a512f',()=>P([[4,19],[8,23],[6,25],[3,21]]));                     // hilt
      F('#b8bcc0',()=>P([[20,20],[14,10],[19,8],[23,13],[23,18]]));          // axe head
      F('#7a512f',()=>P([[12,8],[22,22],[20,24],[10,10]]));                  // haft
      break;
    case 'inv':      // leather satchel
      F('#8a5e34',()=>P([[4,10],[22,10],[23,22],[3,22]]));
      F('#a97a45',()=>P([[4,10],[13,4],[22,10],[13,13]]));                   // flap
      F('#d4a83e',()=>{ x.rect(11.5,12,3,4); });                             // buckle
      break;
    case 'equip':    // cuirass
      F('#9aa0a8',()=>P([[6,5],[10,7],[13,6],[16,7],[20,5],[22,12],[19,22],[13,24],[7,22],[4,12]]));
      F('#6e747c',()=>P([[13,6],[16,7],[20,5],[22,12],[19,22],[13,24]]));    // shaded half
      x.strokeStyle=O; x.beginPath(); x.moveTo(13,7); x.lineTo(13,23); x.stroke();
      break;
    case 'skills':   // laurel + rising bars
      F('#5a8033',()=>P([[3,14],[7,9],[8,15],[5,19]]));
      F('#5a8033',()=>P([[23,14],[19,9],[18,15],[21,19]]));
      F('#b08d57',()=>{ x.rect(8,15,3,6); });
      F('#d0d4dc',()=>{ x.rect(12,11,3,10); });
      F('#d4a83e',()=>{ x.rect(16,7,3,14); });
      break;
    case 'quests':   // sealed scroll
      F('#e3d3a8',()=>P([[6,4],[20,4],[20,22],[6,22]]));
      F('#cdb987',()=>{ x.rect(6,4,14,3); });
      x.strokeStyle='#8a744c'; x.beginPath();
      x.moveTo(9,11); x.lineTo(17,11); x.moveTo(9,14); x.lineTo(17,14); x.moveTo(9,17); x.lineTo(14,17); x.stroke();
      F('#a83030',()=>{ x.arc(17,19,3,0,7); });                              // wax seal
      break;
    case 'prayers':  // dawn sunburst over altar
      F('#d4a83e',()=>{ x.arc(13,12,5,0,7); });
      x.strokeStyle='#d4a83e'; x.beginPath();
      for(let i=0;i<8;i++){ const a=i/8*6.283;
        x.moveTo(13+Math.cos(a)*7,12+Math.sin(a)*7); x.lineTo(13+Math.cos(a)*9.5,12+Math.sin(a)*9.5); }
      x.stroke();
      F('#9aa0a8',()=>{ x.rect(7,20,12,3); });                               // altar slab
      break;
    case 'spells':   // rune-lit staff
      F('#7a512f',()=>P([[11,24],[13,8],[15,8],[14,24]]));
      F('#7ad0ff',()=>P([[13,3],[17,6],[15,10],[11,10],[9,6]]));             // crystal
      F('#b48ae0',()=>{ x.arc(20,17,2.2,0,7); });                            // drifting rune motes
      F('#b48ae0',()=>{ x.arc(6,13,1.7,0,7); });
      break;
    case 'drops':    // bestiary tome with claw marks
      F('#6b4426',()=>P([[4,5],[22,5],[22,22],[4,22]]));
      F('#8a5e34',()=>{ x.rect(4,5,3,17); });                                // spine
      x.strokeStyle='#d8ccb0'; x.lineWidth=1.4; x.beginPath();
      x.moveTo(11,8);  x.lineTo(14,19); x.moveTo(14,8); x.lineTo(17,19); x.moveTo(17,8); x.lineTo(20,19);
      x.stroke(); x.lineWidth=1.6;
      break;
    case 'music':    // horn with banner
      F('#d4a83e',()=>P([[5,17],[15,7],[19,9],[21,13],[9,21],[5,21]]));
      F('#a83030',()=>P([[15,7],[19,9],[21,13],[23,10],[19,5]]));            // pennant
      x.strokeStyle=O; x.beginPath(); x.arc(7,19,2.4,0,7); x.stroke();
      break;
    case 'settings': // iron gear
      F('#9aa0a8',()=>{ for(let i=0;i<8;i++){ const a=i/8*6.283;
        const cx=13+Math.cos(a)*8.5, cy=13+Math.sin(a)*8.5;
        x.moveTo(cx+2,cy); x.arc(cx,cy,2,0,7); } x.arc(13,13,6.5,0,7); });
      F('#4f483c',()=>{ x.arc(13,13,3,0,7); });
      break;
  }
  return c.toDataURL();
}
const TAB_KINDS=['combat','inv','equip','skills','quests','prayers','spells','drops','music','settings',
                'clan','friends','ignore','logout','emotes'];   // full nanobanana set (2026-07-18)
function installTabIcons(){
  document.querySelectorAll('.tab-btn').forEach(b=>{
    const k=b.dataset.tab;
    if(TAB_KINDS.indexOf(k)<0) return;
    b.textContent='';
    const img=document.createElement('img'); img.className='tab-ico';
    img.onerror=function(){ this.onerror=null; this.src=tabIconCanvas(k); };  // fall back to canvas draw
    img.src=tabIcon(k);
    b.appendChild(img);
  });
}

/* ---------------- 2. skills tab -> OSRS stat grid -------------------------- */
UI.refreshSkills = function(){
  const el=document.getElementById('skill-list'); if(!el) return;
  el.innerHTML='';
  const grid=document.createElement('div'); grid.id='skill-grid';
  let total=0;
  SKILLS.forEach(s=>{
    const lv=Player.lvl(s), xp=Math.floor(Player.xp[s]);
    total+=lv;
    const next = lv<99 ? XP_TABLE[lv+1] : null;
    const cur  = XP_TABLE[lv];
    const frac = next ? Math.min(1,(xp-cur)/Math.max(1,next-cur)) : 1;
    const cell=document.createElement('div'); cell.className='skill-cell';
    cell.innerHTML=`
      <img src="assets/icons/skills/${s.toLowerCase()}_cut.png" onerror="this.style.display='none'">
      <span class="sk-lv">${lv}<i>/99</i></span>
      <div class="sk-bar"><div style="width:${frac*100}%"></div></div>`;
    cell.title = `${s} — level ${lv}\n${xp.toLocaleString()} XP`+
      (next?`\nNext level at ${next.toLocaleString()} XP (${(next-xp).toLocaleString()} to go)`:'\nMastered!');
    grid.appendChild(cell);
  });
  el.appendChild(grid);
  const tot=document.createElement('div'); tot.id='skill-total';
  tot.innerHTML=`Total level: <b>${total}</b>`;
  el.appendChild(tot);
};

/* ---------------- 3. worn equipment -> paper-doll -------------------------- */
/* OSRS-style slot cross. Active slots today: head/weapon/body/shield/legs.
   Cape, amulet, gloves, boots, ring, ammo render as dimmed sockets so the
   silhouette reads complete (and the layout is ready when those slots land). */
const DOLL_LAYOUT=[
  [null,        {k:'head'},   null       ],
  [{k:'cape'},  {k:'body'},   {k:'amulet'}],
  [{k:'weapon'},{k:'legs'},   {k:'shield'}],
  [{g:'gloves'},{g:'boots'},  {g:'ring'}  ],
];
const SLOT_GLYPH={ head:'⛑', body:'🛡', legs:'👖', weapon:'🗡', shield:'⬟',
                   cape:'cape', amulet:'amulet', gloves:'gloves', boots:'boots', ring:'ring' };
function slotGhost(name){   // faint drawn silhouette for an empty socket
  const c=document.createElement('canvas'); c.width=30; c.height=30;
  const x=c.getContext('2d'); x.strokeStyle='rgba(216,204,176,0.28)'; x.lineWidth=1.6; x.lineJoin='round';
  const P=(pts,close)=>{ x.beginPath(); x.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); if(close!==false) x.closePath(); x.stroke(); };
  switch(name){
    case 'head':   P([[8,20],[8,12],[15,5],[22,12],[22,20]]); break;
    case 'body':   P([[8,6],[12,8],[15,7],[18,8],[22,6],[24,13],[21,24],[15,26],[9,24],[6,13]]); break;
    case 'legs':   P([[9,5],[21,5],[22,12],[18,12],[17,25],[13,25],[12,12],[8,12]]); break;
    case 'weapon': P([[7,23],[18,8],[21,5],[23,8],[11,24],[9,25]]); x.beginPath(); x.moveTo(6,19); x.lineTo(12,25); x.stroke(); break;
    case 'shield': P([[15,4],[24,8],[23,17],[15,26],[7,17],[6,8]]); break;
    case 'cape':   P([[10,4],[20,4],[23,25],[15,21],[7,25]]); break;
    case 'amulet': x.beginPath(); x.arc(15,11,6,0.6,2.55,true); x.stroke(); P([[12,16],[18,16],[15,22]]); break;
    case 'gloves': P([[10,6],[20,6],[21,16],[19,25],[11,25],[9,16]]); break;
    case 'boots':  P([[9,5],[16,5],[16,15],[24,19],[24,24],[9,24]]); break;
    case 'ring':   x.beginPath(); x.arc(15,17,7,0,7); x.stroke(); P([[12,7],[15,3],[18,7],[15,11]]); break;
  }
  return c.toDataURL();
}
const GHOSTS={};
function ghost(name){ return GHOSTS[name]||(GHOSTS[name]=slotGhost(name)); }

UI.refreshEquip = function(){
  const el=document.getElementById('equip-list'); if(!el) return;
  el.innerHTML='';
  const head=document.createElement('div'); head.className='panel-banner'; head.textContent='Worn Equipment';
  el.appendChild(head);
  // live character portrait — reflects actually-equipped gear (see equip_preview.js)
  const port=document.createElement('div'); port.id='equip-portrait';
  const hint=document.createElement('div'); hint.className='equip-portrait-hint'; hint.textContent='drag to rotate · double-click to spin';
  port.appendChild(hint);
  el.appendChild(port);
  if(typeof EquipPreview!=='undefined') EquipPreview.mount(port);
  const doll=document.createElement('div'); doll.id='equip-doll';
  DOLL_LAYOUT.forEach(row=>{
    row.forEach(cell=>{
      const d=document.createElement('div');
      if(!cell){ d.className='doll-gap'; doll.appendChild(d); return; }
      if(cell.g){                                    // future slot — dimmed socket
        d.className='doll-slot locked'; d.title=cell.g[0].toUpperCase()+cell.g.slice(1)+' — nothing fits here yet';
        const im=document.createElement('img'); im.src=ghost(cell.g); d.appendChild(im);
        doll.appendChild(d); return;
      }
      const k=cell.k, v=Player.equip[k];
      d.className='doll-slot'+(v?' filled':'');
      if(v){
        const it=ITEMS[v];
        const im=document.createElement('img'); im.src=iconFor(v); d.appendChild(im);
        const p=[];
        if(it.aBonus)p.push('+'+it.aBonus+' Attack'); if(it.sBonus)p.push('+'+it.sBonus+' Strength');
        if(it.dBonus)p.push('+'+it.dBonus+' Defence'); if(it.magB||it.mBonus)p.push('+'+(it.magB||it.mBonus)+' Magic');
        if(it.prayB)p.push('+'+it.prayB+' Prayer');
        d.title=it.name+(p.length?'\n'+p.join('\n'):'')+'\nClick to remove';
        d.onclick=()=>{ if(Player.addItem(v,1)){ Player.equip[k]=null; Sfx.click();
          if(typeof refreshPlayerGear==='function') refreshPlayerGear(); UI.refreshEquip(); UI.refreshInv&&UI.refreshInv(); } };
      } else {
        const im=document.createElement('img'); im.src=ghost(k); d.appendChild(im);
        d.title=k[0].toUpperCase()+k.slice(1)+' — empty';
      }
      doll.appendChild(d);
    });
  });
  el.appendChild(doll);
  // ---- total bonuses (OSRS equipment stats) ----
  const sum=f=>(Player._sumBonus?Player._sumBonus(f):0);
  const rows=[
    ['Attack',   sum('aBonus')], ['Strength', sum('sBonus')],
    ['Defence',  Player.defBonus?Player.defBonus():sum('dBonus')],
    ['Magic',    Player.magBonus?Player.magBonus():0], ['Prayer', sum('prayB')],
    ['Attack speed', Math.round(Player.weaponSpeed()/TICK)+' ticks'],
    ['Weight', Player.weight().toFixed(1)+' kg'],
  ];
  const box=document.createElement('div'); box.id='bonus-box';
  const bh=document.createElement('div'); bh.className='bonus-head'; bh.textContent='Equipment bonuses'; box.appendChild(bh);
  rows.forEach(([lbl,val])=>{
    const r=document.createElement('div'); r.className='bonus-row';
    const v=typeof val==='number'?(val>0?'+'+val:String(val)):val;
    r.innerHTML=`<span>${lbl}</span><span class="${typeof val==='number'&&val>0?'pos':typeof val==='number'&&val<0?'neg':''}">${v}</span>`;
    box.appendChild(r);
  });
  el.appendChild(box);
  // ---- items kept on death ----
  const all=[];
  for(const s of Player.inv) if(s) all.push({id:s.id, val:(ITEMS[s.id].value||0)});
  for(const sk in Player.equip){ const v=Player.equip[sk]; if(v) all.push({id:v, val:(ITEMS[v].value||0)}); }
  all.sort((a,b)=>b.val-a.val);
  const kept=all.slice(0,3);
  const kbox=document.createElement('div'); kbox.style.marginTop='8px';
  const kh=document.createElement('div'); kh.className='bonus-head'; kh.textContent='Items Kept on Death'; kbox.appendChild(kh);
  const krow=document.createElement('div'); krow.style.cssText='display:flex;gap:4px;margin-top:4px;justify-content:center';
  if(kept.length){
    kept.forEach(it=>{ const c=document.createElement('div'); c.title=ITEMS[it.id].name; c.className='doll-slot filled';
      const img=document.createElement('img'); img.src=iconFor(it.id); c.appendChild(img); krow.appendChild(c); });
  } else { krow.textContent='Nothing — your pack is empty.'; krow.style.cssText+='color:#9a8e78;font-size:11px'; }
  kbox.appendChild(krow);
  el.appendChild(kbox);
};

/* ---------------- 4. music player tab -------------------------------------- */
function refreshMusicPane(){
  const el=document.getElementById('music-list'); if(!el) return;
  el.innerHTML='';
  const head=document.createElement('div'); head.className='panel-banner'; head.textContent='Music Player';
  el.appendChild(head);
  const onoff=document.createElement('button'); onoff.className='set-btn wide';
  onoff.textContent = Music.on ? '♪ Music: ON — click to stop' : '♪ Music: off — click to play';
  onoff.onclick=()=>{ Music.toggle(); Sfx.click(); refreshMusicPane(); };
  el.appendChild(onoff);
  Object.keys(TRACKS).forEach(id=>{
    const t=TRACKS[id], un=Music.unlocked.indexOf(id)>=0;
    const row=document.createElement('div');
    row.className='music-row'+(un?'':' locked')+(Music.current===id&&Music.on?' playing':'');
    row.innerHTML=`<span>${un?t.name:'???'}</span><span class="mz">${un?(ZONES[t.zone]?ZONES[t.zone].name:''):'undiscovered'}</span>`;
    if(un){ row.onclick=()=>{ Music.mode='manual'; Music.play(id); if(!Music.on) Music.start(); Sfx.click(); refreshMusicPane(); }; }
    el.appendChild(row);
  });
  const note=document.createElement('div');
  note.style.cssText='font-size:10px;color:#9a8e78;margin-top:6px;line-height:1.4';
  note.textContent='Tracks unlock as you discover each region. Click a track to play it.';
  el.appendChild(note);
}

/* ---------------- 5. resizable chatbox ------------------------------------- */
function installChatResize(){
  const frame=document.getElementById('chatbox-frame'), title=document.getElementById('chat-title');
  if(!frame||!title) return;
  try{ const h=localStorage.getItem('cr_chat_h'); if(h) frame.style.height=h+'px'; }catch(e){}
  title.style.cursor='ns-resize';
  title.title='Drag to resize the chat';
  let drag=null;
  title.addEventListener('mousedown', e=>{ drag={y:e.clientY, h:frame.offsetHeight}; e.preventDefault(); });
  window.addEventListener('mousemove', e=>{ if(!drag) return;
    const nh=Math.max(70, Math.min(window.innerHeight*0.6, drag.h + (drag.y - e.clientY)));
    frame.style.height=nh+'px';
  });
  window.addEventListener('mouseup', ()=>{ if(drag){ try{ localStorage.setItem('cr_chat_h', frame.offsetHeight); }catch(e){} drag=null; } });
}

/* ---------------- CSS + boot ------------------------------------------------ */
const css=document.createElement('style');
css.textContent=`
  .tab-ico{width:23px;height:23px;image-rendering:auto;vertical-align:middle;
    filter:drop-shadow(1px 1px 0 rgba(0,0,0,.55));}
  .tab-btn{display:flex;align-items:center;justify-content:center;}
  .tab-btn.active .tab-ico{filter:drop-shadow(0 0 4px #ffb84a) drop-shadow(1px 1px 0 rgba(0,0,0,.55));}
  .panel-banner{margin:2px 0 7px;padding:4px 0;text-align:center;font-weight:bold;color:#e8d9a0;
    background:linear-gradient(#54452c,#3a2f1e);border:1px solid #6a5636;border-radius:3px;
    text-shadow:1px 1px 0 #000;letter-spacing:1px;font-size:12px;}
  /* skills grid */
  #skill-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
  .skill-cell{position:relative;background:linear-gradient(#4a4030,#3a3223);border:1px solid #5d5447;
    border-radius:3px;padding:4px 3px 6px;display:flex;align-items:center;gap:4px;cursor:default;}
  .skill-cell:hover{border-color:#d4a83e;background:linear-gradient(#544931,#413826);}
  .skill-cell img{width:20px;height:20px;image-rendering:pixelated;}
  .sk-lv{font-size:12px;font-weight:bold;color:#ffd24a;text-shadow:1px 1px 0 #000;}
  .sk-lv i{font-style:normal;font-size:9px;color:#b8a97e;}
  .sk-bar{position:absolute;left:3px;right:3px;bottom:2px;height:2px;background:#241f15;}
  .sk-bar div{height:100%;background:#5edb5e;}
  #skill-total{margin-top:7px;text-align:center;color:#d8ccb0;font-size:12px;padding:4px;
    background:linear-gradient(#54452c,#3a2f1e);border:1px solid #6a5636;border-radius:3px;}
  #skill-total b{color:#ffd24a;}
  /* equipment live portrait */
  #equip-portrait{position:relative;height:208px;margin:0 auto 6px;width:190px;border:1px solid #5d5447;
    border-radius:4px;overflow:hidden;box-shadow:inset 0 0 22px rgba(0,0,0,.6);
    background:radial-gradient(ellipse at 50% 38%, #6a5836 0%, #3c3120 55%, #241c11 100%);}
  #equip-portrait::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34%;pointer-events:none;
    background:linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.45));}
  .equip-portrait-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
  .equip-portrait-hint{position:absolute;left:0;right:0;bottom:3px;text-align:center;z-index:2;
    font-size:9px;color:#c9b78a;opacity:.7;pointer-events:none;text-shadow:1px 1px 0 #000;letter-spacing:.3px;}
  /* equipment paper-doll */
  #equip-doll{display:grid;grid-template-columns:repeat(3,44px);gap:5px;justify-content:center;
    padding:8px 0 10px;background:radial-gradient(ellipse at 50% 40%, rgba(90,74,46,.45), rgba(0,0,0,0) 75%);}
  .doll-slot{width:44px;height:44px;background:linear-gradient(#473e30,#38301f);border:1px solid #5d5447;
    border-radius:3px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 6px rgba(0,0,0,.5);}
  .doll-slot img{width:32px;height:32px;image-rendering:pixelated;}
  .doll-slot.filled{border-color:#8a744c;background:linear-gradient(#564a35,#443a26);cursor:pointer;}
  .doll-slot.filled:hover{border-color:#ffb84a;}
  .doll-slot.locked{opacity:.45;}
  .doll-gap{width:44px;height:44px;}
  /* music tab */
  .music-row{display:flex;justify-content:space-between;padding:5px 6px;border-bottom:1px solid #4a3d2a;
    cursor:pointer;font-size:12px;color:#8fdc8f;}
  .music-row:hover{background:rgba(255,184,74,.08);}
  .music-row.locked{color:#8a7f6a;cursor:default;}
  .music-row.playing{color:#ffd24a;font-weight:bold;}
  .music-row .mz{font-size:10px;color:#9a8e78;}
`;
document.head.appendChild(css);

function boot(){
  installTabIcons();
  installChatResize();
  // music tab: pane + bottom-row button (before settings)
  const panes=document.getElementById('pane-settings');
  if(panes && !document.getElementById('pane-music')){
    const pane=document.createElement('div'); pane.className='tab-pane'; pane.id='pane-music';
    pane.innerHTML='<div id="music-list"></div>';
    panes.parentNode.insertBefore(pane, panes);
    const bar=document.getElementById('tab-bar-bottom');
    const btn=document.createElement('div'); btn.className='tab-btn'; btn.dataset.tab='music'; btn.title='Music player';
    const img=document.createElement('img'); img.className='tab-ico';
    img.onerror=function(){ this.onerror=null; this.src=tabIconCanvas('music'); }; img.src=tabIcon('music');
    btn.appendChild(img);
    bar.insertBefore(btn, bar.lastElementChild);
    btn.addEventListener('click', ()=>{      // same switching behaviour as game4_ui's handler
      document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active'); pane.classList.add('active');
      refreshMusicPane(); Sfx.click();
    });
  }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
