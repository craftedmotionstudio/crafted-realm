/* ================= UI ================= */
function slotEl(item, onclick, price, showQty){
  const d=document.createElement('div'); d.className='inv-slot';
  if(item && typeof Player!=='undefined' && Player.usingItem===item.id) d.classList.add('using');
  if(item){
    const def=ITEMS[item.id];
    if((def.stack||showQty) && item.qty>1){ const q=document.createElement('span');
      q.className='inv-qty'; q.textContent=item.qty>=1000?Math.floor(item.qty/1000)+'K':item.qty; d.appendChild(q); }
    const img=document.createElement('img'); img.src=iconFor(item.id); img.draggable=false;
    d.appendChild(img);
    d.title=def.name;
    if(price!==undefined){ const p=document.createElement('span'); p.className='price-tag';
      p.textContent=price+'c'; d.appendChild(p); }
    if(onclick) d.onclick=onclick;
  }
  return d;
}

const UI = {
  chat(msg, cls='plain'){
    try{
      const cf=document.getElementById('chatbox-frame'), dot=document.getElementById('chat-dot');
      const btn=document.getElementById('mob-chat-btn');
      if(cf && dot && btn && btn.offsetParent!==null && !cf.classList.contains('open')) dot.style.display='block';
    }catch(e){}
    const box=document.getElementById('chatbox');
    const d=document.createElement('div'); d.className=cls; d.textContent=msg;
    box.appendChild(d); box.scrollTop=box.scrollHeight;
    while(box.children.length>60) box.removeChild(box.firstChild);
  },
  refreshHud(){
    const hpn=document.getElementById('hp-orb-num');
    hpn.textContent = Math.max(0,Player.hp);
    const f=Math.max(0,Player.hp/Player.maxHp);
    hpn.style.color = f<0.3?'#ff3333': f<0.6?'#ffff00':'#00ff00';
    document.getElementById('coin-orb').textContent =
      Player.count('coins')>=10000 ? Math.floor(Player.count('coins')/1000)+'K' : Player.count('coins');
    document.getElementById('cmb-orb').textContent = Player.combatLevel();
    const po=document.getElementById('pray-orb');
    if(po){ po.textContent = Math.ceil(Player.prayerPts);
      po.style.color = Player.activePrayers.size ? '#7fdfff' : '#c9e8f5'; }
    if(this.refreshSpec) this.refreshSpec();
  },
  refreshSpells(){
    const box=document.getElementById('spell-grid'); if(!box) return;
    box.innerHTML='';
    const head=document.createElement('div'); head.className='bonus-head';
    const runeIds=['air_rune','water_rune','earth_rune','fire_rune','mind_rune','chaos_rune','nature_rune'];
    head.textContent='Runes: '+runeIds.map(r=>ITEMS[r].name.split(' ')[0]+' '+Player.count(r)).join(' · ');
    box.appendChild(head);
    for(const id in SPELLS){
      const sp=SPELLS[id];
      const b=document.createElement('button'); b.className='style-btn prayer-btn';
      const locked=Player.lvl('Magic')<sp.req;
      if(locked) b.classList.add('locked');
      if(Player.spell===id || Player.alchMode===id) b.classList.add('sel');
      const cost=Object.keys(sp.runes).map(r=>sp.runes[r]+' '+ITEMS[r].name.split(' ')[0].toLowerCase()).join(', ');
      const sub = sp.utility==='teleport' ? 'no runes' : cost;
      const ready = locked ? '' : (sp.utility!=='teleport' && !Player.hasRunes(sp) ? ' style="color:#d86a5a"' : '');
      b.innerHTML=`${sp.icon} <b>${sp.name}</b><span class="lv"${ready}>lvl ${sp.req} — ${sub}</span>`;
      b.onclick=()=>{ Sfx.click(); Player.selectSpell(id); };
      box.appendChild(b);
    }
  },
  refreshPrayers(){
    const box=document.getElementById('prayer-grid'); if(!box) return;
    box.innerHTML='';
    const head=document.createElement('div'); head.className='bonus-head';
    head.textContent=`Prayer points: ${Math.ceil(Player.prayerPts)} / ${Player.maxPrayer()}`;
    box.appendChild(head);
    for(const id in PRAYERS){
      const p=PRAYERS[id];
      const b=document.createElement('button'); b.className='style-btn prayer-btn';
      const locked=Player.lvl('Prayer')<p.req;
      if(locked) b.classList.add('locked');
      if(Player.activePrayers.has(id)) b.classList.add('sel');
      b.innerHTML=`${p.icon} <b>${p.name}</b><span class="lv">lvl ${p.req}</span>`;
      b.onclick=()=>{ Sfx.click(); Player.togglePrayer(id); };
      box.appendChild(b);
    }
  },
  refreshInv(){
    const grid=document.getElementById('inv-grid'); grid.innerHTML='';
    Player.inv.forEach((s,i)=>{
      grid.appendChild(slotEl(s, s?()=>UI.useItem(i):null));
    });
    this.refreshHud();
    if(typeof player!=='undefined' && player && player.userData.parts) refreshPlayerGear();
    if(document.getElementById('bank-modal').style.display==='block') this.openBank(false);
    if(document.getElementById('shop-modal').style.display==='block') this.openShop(false);
  },
  useItem(i){
    if(Player.alchMode){ if(castAlchemy(i)) return; }
    const sdef0=Player.inv[i] && ITEMS[Player.inv[i].id];
    if(sdef0 && Player.inv[i].id==='logs'){
      const hasTinder=Player.count('tinderbox')>0, hasKnife=Player.count('knife')>0;
      if(hasTinder && hasKnife){
        UI.dialogue('Emberwood logs','Burn them, or carve them?',
          [{label:'Light a fire.', fn:()=>startFiremaking(i)},
           {label:'Fletch something.', fn:()=>openFletching(i)},
           {label:'Never mind.', fn:null}],'🪵');
        return;
      }
      if(hasTinder){ startFiremaking(i); return; }
      if(hasKnife){ if(openFletching(i)) return; }
    }
    if(sdef0 && Player.inv[i].id==='arrow_shafts'){ fletchArrows(i); return; }
    if(sdef0 && (Player.inv[i].id==='tinderbox')){ UI.chat('Use it on some logs to light a fire.','plain'); return; }
    if(sdef0 && (Player.inv[i].id==='knife')){ UI.chat('Use it on some logs to fletch.','plain'); return; }
    if(sdef0 && (Player.inv[i].id==='hammer')){ UI.chat('Take it to an anvil with some metal bars.','plain'); return; }
    const s=Player.inv[i]; if(!s) return;
    const def=ITEMS[s.id];
    Sfx.click();
    if(def.equip){
      if(def.reqSkill && def.reqLvl && Player.lvl(def.reqSkill) < def.reqLvl){
        UI.chat(`You need ${def.reqSkill==='Attack'?'an':'a'} ${def.reqSkill} level of ${def.reqLvl} to ${def.equip==='weapon'?'wield':'wear'} the ${def.name}.`,'plain');
        return;
      }
      const slot=def.equip, prev=Player.equip[slot];
      Player.equip[slot]=s.id; Player.inv[i]=null;
      if(prev) Player.addItem(prev,1);
      UI.chat(`You ${slot==='weapon'?'wield':'wear'} the ${def.name}.`,'plain');
      refreshPlayerGear();
      Tutorial.notify('equip', s.id);
      this.refreshInv(); this.refreshEquip(); return;
    }
    if(def.heal){
      if(Player.hp>=Player.maxHp){ UI.chat('You are already at full hitpoints.','plain'); return; }
      Player.hp=Math.min(Player.maxHp, Player.hp+def.heal);
      Player.inv[i]=null; Sfx.eat();
      UI.chat(`You eat the ${def.name.toLowerCase()}. It heals some health.`,'plain');
      this.refreshInv(); return;
    }
    if(def.bury){
      if(Player.action && Player.action.type==='bury') return;   // one rite at a time
      Player.action={type:'bury', t:0, slot:i};
      Player.moveTo=null; Player.target=null;
      return;
    }
    if(def.useOn){
      Player.usingItem = Player.usingItem===s.id ? null : s.id;
      UI.chat(Player.usingItem
        ? `You take out the ${def.name.toLowerCase()}. Now click a fishing spot to use it.`
        : `You put the ${def.name.toLowerCase()} away.`,'plain');
      this.refreshInv();
      return;
    }
    if(s.id==='spark_rune'){
      Player.castMode=!Player.castMode;
      UI.chat(Player.castMode?'You ready your spark runes. Your attacks will now cast Spark Bolt.':'You put your runes away.','xp');
      return;
    }
    if(s.id==='raw_perch'){ UI.chat('You should cook this on a campfire first.','plain'); return; }
    UI.chat('Nothing interesting happens.','plain');
  },
  refreshEquip(){
    const el=document.getElementById('equip-list'); el.innerHTML='';
    const itemBonusStr=(id)=>{ const it=ITEMS[id]; const p=[];
      if(it.aBonus)p.push('+'+it.aBonus+' Att'); if(it.sBonus)p.push('+'+it.sBonus+' Str');
      if(it.dBonus)p.push('+'+it.dBonus+' Def'); if(it.magB||it.mBonus)p.push('+'+(it.magB||it.mBonus)+' Mag');
      if(it.prayB)p.push('+'+it.prayB+' Pray'); return p.join('  '); };
    EQUIP_SLOTS.forEach(([k,label])=>{
      const v=Player.equip[k];
      const row=document.createElement('div'); row.className='equip-row';
      const left=document.createElement('span'); left.className='slot-name'; left.textContent=label;
      const right=document.createElement('span');
      if(v){ const img=document.createElement('img'); img.src=iconFor(v);
        right.appendChild(img); right.appendChild(document.createTextNode(' '+ITEMS[v].name));
        const bs=itemBonusStr(v);
        if(bs){ const tag=document.createElement('div');
          tag.style.cssText='font-size:10px;color:#5edb5e;margin-top:1px'; tag.textContent=bs;
          right.appendChild(tag); } }
      else right.textContent='—';
      row.appendChild(left); row.appendChild(right);
      if(v){ row.style.cursor='pointer'; row.title='Click to remove';
        row.onclick=()=>{ if(Player.addItem(v,1)){ Player.equip[k]=null;
          refreshPlayerGear(); UI.refreshEquip(); } }; }
      el.appendChild(row);
    });
    // combat style selector (like the 2007 combat options)
    const cls = Player.weaponStyle();
    const wname = Player.equip.weapon ? ITEMS[Player.equip.weapon].name
                : Player.castMode ? 'Spellcasting' : 'Unarmed';
    const styBox=document.createElement('div'); styBox.id='style-box';
    const head=document.createElement('div'); head.className='bonus-head';
    head.textContent='Combat style — '+wname; styBox.appendChild(head);
    const grid=document.createElement('div'); grid.id='style-grid';
    (STYLE_DEFS[cls]||STYLE_DEFS.melee).forEach((s,i)=>{
      const b=document.createElement('button'); b.className='style-btn';
      if((Player.attackStyles[cls]||0)===i) b.classList.add('sel');
      const trains = s.xp==='Shared' ? 'Att/Str/Def' : s.xp==='RangedDef' ? 'Rng+Def'
                   : s.xp==='MagicDef' ? 'Mag+Def' : s.xp;
      b.innerHTML=`<b>${s.label}</b><span>${trains}</span>`;
      b.onclick=()=>{ Player.attackStyles[cls]=i; Sfx.click();
        UI.chat(`Combat style: ${s.label} — training ${trains}${s.speedDelta?' (faster attacks)':''}${s.rangeBonus?' (longer reach)':''}.`,'plain');
        UI.refreshEquip(); };
      grid.appendChild(b);
    });
    styBox.appendChild(grid);
    el.appendChild(styBox);
    // OSRS-style total equipment bonuses, summed across everything worn
    const sum=f=>(Player._sumBonus?Player._sumBonus(f):0);
    const rows = [
      ['Total equipment bonuses', null],
      ['Attack',   sum('aBonus')],
      ['Strength', sum('sBonus')],
      ['Defence',  Player.defBonus?Player.defBonus():sum('dBonus')],
      ['Magic',    Player.magBonus?Player.magBonus():0],
      ['Prayer',   sum('prayB')],
      ['Attack speed', Math.round(Player.weaponSpeed()/TICK)+' ticks'],
      ['Weight',   Player.weight().toFixed(1)+' kg'],
    ];
    const box=document.createElement('div'); box.id='bonus-box';
    rows.forEach(([lbl,val])=>{
      const r=document.createElement('div');
      if(val===null){ r.className='bonus-head'; r.textContent=lbl; }
      else {
        r.className='bonus-row';
        const v = typeof val==='number' ? (val>0?'+'+val:String(val)) : val;
        r.innerHTML=`<span>${lbl}</span><span class="${typeof val==='number'&&val>0?'pos':typeof val==='number'&&val<0?'neg':''}">${v}</span>`;
      }
      box.appendChild(r);
    });
    el.appendChild(box);
    // ---- Items Kept on Death ----
    const all=[];
    for(const s of Player.inv) if(s) all.push({id:s.id, val:(ITEMS[s.id].value||0)});
    for(const sk in Player.equip){ const v=Player.equip[sk]; if(v) all.push({id:v, val:(ITEMS[v].value||0)}); }
    all.sort((a,b)=>b.val-a.val);
    const kept=all.slice(0,3);
    const kbox=document.createElement('div'); kbox.id='kept-box'; kbox.style.marginTop='8px';
    const kh=document.createElement('div'); kh.className='bonus-head'; kh.textContent='Items Kept on Death'; kbox.appendChild(kh);
    const krow=document.createElement('div'); krow.style.cssText='display:flex;gap:4px;margin-top:4px';
    if(kept.length){
      kept.forEach(it=>{ const c=document.createElement('div'); c.title=ITEMS[it.id].name;
        c.style.cssText='width:38px;height:38px;background:var(--slot-bg);border:1px solid var(--slot-line);display:flex;align-items:center;justify-content:center';
        const img=document.createElement('img'); img.src=iconFor(it.id); img.style.cssText='width:28px;height:28px';
        c.appendChild(img); krow.appendChild(c); });
    } else { krow.textContent='Nothing — your pack is empty.'; krow.style.color='#9a8e78'; krow.style.fontSize='11px'; }
    kbox.appendChild(krow);
    const note=document.createElement('div');
    note.style.cssText='font-size:10px;color:#9a8e78;margin-top:5px;line-height:1.4';
    note.textContent='On death you keep your 3 most valuable items. Everything else drops where you fall.';
    kbox.appendChild(note);
    el.appendChild(kbox);
  },
  refreshSkills(){
    const el=document.getElementById('skill-list'); el.innerHTML='';
    SKILLS.forEach(s=>{
      const lv=Player.lvl(s), xp=Player.xp[s];
      const next=lv<99?XP_TABLE[lv+1]:xp, cur=XP_TABLE[lv];
      const frac=lv<99?Math.min(1,(xp-cur)/Math.max(1,next-cur)):1;
      const row=document.createElement('div'); row.className='skill-row';
      row.innerHTML=`<span><img src="assets/icons/skills/${s.toLowerCase()}_cut.png" class="skill-ico" onerror="this.style.display='none'">${s}</span><span class="lvl">${lv}/99</span>`;
      row.title=`${Math.floor(xp).toLocaleString()} XP`;
      el.appendChild(row);
      const bar=document.createElement('div'); bar.className='skill-xp';
      bar.innerHTML=`<div style="width:${frac*100}%"></div>`;
      el.appendChild(bar);
    });
  },
  refreshRun(){
    const orb=document.getElementById('run-orb'); if(!orb) return;
    const pct=document.getElementById('run-pct');
    if(pct) pct.textContent=Math.floor(Player.energy);
    orb.className = Player.runOn ? '' : 'walking';
  },
  refreshSpec(){
    const num=document.getElementById('spec-num'); const orb=document.getElementById('spec-orb');
    if(num) num.textContent=Math.floor(Player.spec);
    if(orb) orb.classList.toggle('armed', !!Player.specArmed);
  },
  refreshDrops(filter){
    const el=document.getElementById('drops-list'); if(!el) return;
    el.innerHTML='';
    const q=(filter||'').toLowerCase();
    Object.keys(NPC_TYPES)
      .filter(id=>!q || NPC_TYPES[id].name.toLowerCase().includes(q))
      .sort((a,b)=>NPC_TYPES[a].level-NPC_TYPES[b].level)
      .forEach(id=>{
        const t=NPC_TYPES[id];
        const row=document.createElement('div'); row.className='npc-row';
        row.innerHTML=`<span>${t.name}</span><span class="lvl">Lvl ${t.level}</span>`;
        row.onclick=()=>{ Sfx.click(); UI.showDropTable(id); };
        el.appendChild(row);
      });
  },
  showDropTable(id){
    const el=document.getElementById('drops-list'); if(!el) return;
    const t=NPC_TYPES[id];
    el.innerHTML='';
    const back=document.createElement('span'); back.className='drops-back';
    back.textContent='← All creatures';
    back.onclick=()=>{ Sfx.click(); UI.refreshDrops(document.getElementById('drops-search').value); };
    el.appendChild(back);
    const head=document.createElement('div'); head.className='bonus-head';
    head.textContent=`${t.name} (level ${t.level}) — drops`;
    el.appendChild(head);
    t.drops.forEach(d=>{
      const def=ITEMS[d.id];
      const row=document.createElement('div'); row.className='drop-row';
      const qty = Array.isArray(d.q) ? `${d.q[0]}–${d.q[1]}` : d.q;
      const sell = d.id==='coins'
        ? `${qty} cr`
        : `~${Math.max(1,Math.floor(def.value/2))} cr`;
      const pct = d.p>=1 ? 'Always' : (d.p*100).toFixed(0)+'%';
      row.innerHTML=`<img src="${iconFor(d.id)}"><span>${def.name}${qty!==1&&d.id!=='coins'?' ×'+qty:''}</span>
        <span class="pct">${pct}</span><span class="price">${sell}</span>`;
      row.title = d.id==='coins' ? 'Crowns drop directly'
        : `Shops and merchants pay about half value (${Math.max(1,Math.floor(def.value/2))} crowns each).`;
      el.appendChild(row);
    });
    const note=document.createElement('div');
    note.style.cssText='font-size:10px;color:#9a8e78;margin-top:8px;padding:0 4px;';
    note.textContent='Prices are what shops pay (half of value). Rare gear is often worth keeping!';
    el.appendChild(note);
  },
  refreshQuests(){
    Quest.updateMarker();
    const el=document.getElementById('quest-list'); el.innerHTML='';
    for(const id in QUESTS){
      const q=QUESTS[id], st=Player.quests[id];
      const row=document.createElement('div'); row.className='quest-row';
      let cls='q-not', sub='Not started';
      if(st && st.stage===99){ cls='q-done'; sub='Complete'; }
      else if(st){ cls='q-prog';
        sub=q.stages[Math.min(st.stage, q.stages.length-1)].replace('%n', st.counter); }
      const tracked = Quest.tracked===id;
      row.innerHTML=`<div class="${cls}"><b>${tracked?'🚩 ':''}${q.name}</b></div>
        <div style="font-size:10px;color:#9a8e78">${sub}</div>`;
      row.title=q.desc;
      row.style.cursor='pointer';
      row.onclick=()=>{ Quest.track(id); Sfx.click(); };
      el.appendChild(row);
    }
  },
  dialogue(name, text, opts, face){
    document.getElementById('dlg-name').textContent=name;
    document.getElementById('dlg-text').textContent=text;
    document.getElementById('dlg-head').textContent=face||'🧔';
    const box=document.getElementById('dlg-opts'); box.innerHTML='';
    (opts||[{label:'Farewell.', fn:null}]).forEach(o=>{
      const b=document.createElement('button'); b.className='opt'; b.textContent=o.label;
      b.onclick=()=>{ UI.closeModal('dialogue-modal'); Sfx.click(); if(o.fn) o.fn(); };
      box.appendChild(b);
    });
    document.getElementById('dialogue-modal').style.display='block';
  },
  closeModal(id){ document.getElementById(id).style.display='none'; },
  openWorldMap(){
    const m=document.getElementById('worldmap-modal');
    m.style.display='block';
    drawWorldMap();
    const c=document.getElementById('worldmap');
    if(c && !c._mapWired && c.addEventListener){
      c._mapWired=true;
      c.addEventListener('click', e=>{
        const r=c.getBoundingClientRect ? c.getBoundingClientRect() : {left:0,top:0,width:c.width,height:c.height};
        const kx=c.width/(r.width||c.width), kz=c.height/(r.height||c.height);
        const wx=WMAP.x0 + (e.clientX-r.left)*kx*(WMAP.x1-WMAP.x0)/c.width;
        const wz=WMAP.z0 + (e.clientY-r.top)*kz*(WMAP.z1-WMAP.z0)/c.height;
        UI.closeModal('worldmap-modal');
        minimapWalkTo({x:wx, z:wz});
        Sfx.click();
      });
    }
  },
  closeWorldModals(){   // walking away shuts the counter, like the classics
    for(const id of ['bank-modal','shop-modal','dialogue-modal']){
      const m=document.getElementById(id);
      if(m && m.style.display==='block') m.style.display='none';
    }
  },
  openBank(announce=true){
    const bg=document.getElementById('bank-grid'); bg.innerHTML='';
    Player.bank.forEach((s,i)=>{
      const def=ITEMS[s.id];
      bg.appendChild(slotEl(s, ()=>{
        if(Player.addItem(s.id, def.stack?s.qty:1)){
          if(def.stack || s.qty===1) Player.bank.splice(i,1); else s.qty--;
          UI.openBank(false); }
      }, undefined, true));   // the vault stacks everything — always show the count
    });
    if(!Player.bank.length) bg.innerHTML='<i style="grid-column:1/-1;color:#9a8e78">Your vault is empty.</i>';
    const ig=document.getElementById('bank-inv-grid'); ig.innerHTML='';
    Player.inv.forEach((s,i)=>{
      ig.appendChild(slotEl(s, s?()=>{
        const ex=Player.bank.find(b=>b.id===s.id);
        if(ex) ex.qty+=s.qty; else Player.bank.push({id:s.id, qty:s.qty});
        Player.inv[i]=null; UI.refreshInv(); UI.openBank(false);
      }:null));
    });
    document.getElementById('bank-modal').style.display='block';
    if(announce) Sfx.coin();
  },
  currentShop:'bazaar',
  openShop(shopKey, announce=true){
    if(shopKey===false){ announce=false; shopKey=this.currentShop; }   // legacy refresh call
    if(typeof shopKey==='string') this.currentShop=shopKey;
    const shop = SHOPS[this.currentShop] || SHOPS.bazaar;
    const DEF=10;
    if(!shop._q){ shop._q={}; shop.stock.forEach(st=>shop._q[st.id]=DEF); }
    const sprice=(base,q)=>Math.max(1, Math.round(base*(1+(DEF-q)*0.03)));   // scarcer stock = dearer
    const t=document.getElementById('shop-title'); if(t) t.textContent=shop.name;
    const sg=document.getElementById('shop-grid'); sg.innerHTML='';
    shop.stock.forEach(st=>{
      const q=shop._q[st.id]!==undefined?shop._q[st.id]:DEF;
      sg.appendChild(slotEl({id:st.id, qty:1}, ()=>{
        const cq=shop._q[st.id]!==undefined?shop._q[st.id]:DEF;
        if(cq<=0){ UI.chat('The shopkeeper is out of stock of that.','plain'); return; }
        const p=sprice(st.price, cq);
        if(Player.count('coins')<p){ UI.chat('You don\'t have enough crowns for that.','plain'); return; }
        Player.removeItem('coins',p); Player.addItem(st.id,1); shop._q[st.id]=cq-1; Sfx.coin();
        UI.chat(`You buy a ${ITEMS[st.id].name.toLowerCase()} for ${p} crowns.`,'loot');
        UI.openShop(false);
      }, sprice(st.price, q)));
    });
    const ig=document.getElementById('shop-inv-grid'); ig.innerHTML='';
    Player.inv.forEach((s,i)=>{
      if(s && s.id==='coins'){ ig.appendChild(slotEl(s,null)); return; }
      ig.appendChild(slotEl(s, s?()=>{
        const def=ITEMS[s.id];
        const price=Math.max(1,Math.floor(def.value/2));
        Player.inv[i] = (def.stack && s.qty>1) ? {id:s.id, qty:s.qty-1} : null;
        Player.addItem('coins',price); Sfx.coin();
        if(shop._q && shop._q[s.id]!==undefined) shop._q[s.id]=Math.min(DEF*2, shop._q[s.id]+1);
        UI.chat(`You sell the ${def.name.toLowerCase()} for ${price} crowns.`,'loot'); UI.refreshInv();
        UI.openShop(false);
      }:null));
    });
    document.getElementById('shop-modal').style.display='block';
    if(announce) Sfx.coin();
  },
  worldToScreen(obj, yOff=1.8){
    const v=new THREE.Vector3();
    if(obj.isObject3D) v.setFromMatrixPosition(obj.matrixWorld); else v.copy(obj);
    v.y += yOff; v.project(camera);
    return {x:(v.x*0.5+0.5)*innerWidth, y:(-v.y*0.5+0.5)*innerHeight};
  },
  floatDmg(obj, dmg){
    const p=this.worldToScreen(obj);
    const d=document.createElement('div');
    d.className='float-dmg'+(dmg===0?' zero':''); d.textContent=dmg;
    d.style.left=(p.x-10)+'px'; d.style.top=(p.y-10)+'px';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(), 800);
  },
  xpDrop(skill, amt){
    let host=document.getElementById('xp-drops');
    if(!host){ host=document.createElement('div'); host.id='xp-drops'; document.body.appendChild(host); }
    const d=document.createElement('div'); d.className='xp-drop';
    d.innerHTML=`<img src="assets/icons/skills/${skill.toLowerCase()}_cut.png" onerror="this.style.display='none'">+${Math.round(amt)}`;
    host.appendChild(d);
    let t=0; const iv=setInterval(()=>{ t++;
      d.style.transform='translateY(-'+(t*0.9)+'px)'; d.style.opacity=String(Math.max(0,1-t/46));
      if(t>46){ clearInterval(iv); d.remove(); } },16);
  },
  tip(e, html){
    const t=document.getElementById('ctx-tip');
    if(!html){ t.style.display='none'; return; }
    t.innerHTML=html; t.style.display='block';
    t.style.left=(e.clientX+14)+'px'; t.style.top=(e.clientY+10)+'px';
  },
  zone(name){ document.getElementById('zone-label').textContent=name; },
};

/* tabs */
document.querySelectorAll('.tab-btn').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('pane-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='prayers' && UI.refreshPrayers) UI.refreshPrayers();
    if(b.dataset.tab==='spells' && UI.refreshSpells) UI.refreshSpells();
    if(b.dataset.tab==='combat' && UI.refreshCombat) UI.refreshCombat();
    Sfx.click();
  };
});

/* ---------- combat styles tab ---------- */
UI.refreshCombat = function(){
  const host=document.getElementById('combat-styles'); if(!host) return;
  const cls=Player.weaponStyle();
  const list=STYLE_DEFS[cls]||STYLE_DEFS.melee;
  const cur=Math.min(Player.attackStyles[cls]||0, list.length-1);
  const wpn=Player.equip.weapon?ITEMS[Player.equip.weapon].name:'Unarmed';
  host.innerHTML='<div class="cmb-weap">'+wpn+' · '+cls+'</div>'+
    list.map((s,i)=>'<div class="cmb-style'+(i===cur?' active':'')+'" data-i="'+i+'">'+
      '<b>'+s.label+'</b><small>'+(s.xp==='Shared'?'shares XP across Attack/Strength/Defence'
        :'trains '+s.xp)+'</small></div>').join('')+
    '<div class="set-row" style="margin-top:9px"><span>Auto-retaliate</span>'+
      '<button class="set-btn" id="retal-btn">'+(Player.autoRetaliate?'On':'Off')+'</button></div>';
  host.querySelectorAll('.cmb-style').forEach(el=>{
    el.onclick=()=>{ Player.attackStyles[cls]=+el.dataset.i; Sfx.click(); UI.refreshCombat(); };
  });
  const rb=document.getElementById('retal-btn');
  if(rb) rb.onclick=()=>{ Player.autoRetaliate=!Player.autoRetaliate; Sfx.click(); UI.refreshCombat(); };
};

/* ---------- settings / account ---------- */
UI.toggleRun   = function(){ const e=document.getElementById('run-orb');   if(e) e.click(); };
UI.toggleMusic = function(){ const e=document.getElementById('music-btn'); if(e) e.click(); };
UI.manualSave  = function(){ if(typeof SaveGame!=='undefined'){ SaveGame.save(); } };
UI.logout      = function(){
  try{ if(typeof SaveGame!=='undefined') SaveGame.save(true); }catch(e){}
  location.reload();   // return to the title/login screen with progress saved
};

/* ---------- minimap ---------- */
const WMAP = {x0:-95, z0:-95, x1:95, z1:95};   // the charted world
function drawWorldMap(){
  const c=document.getElementById('worldmap'); if(!c) return;
  const ctx=c.getContext('2d');
  const S=c.width, sx=S/(WMAP.x1-WMAP.x0), sz=S/(WMAP.z1-WMAP.z0);
  const mx=(x,z)=>({x:(x-WMAP.x0)*sx, y:(z-WMAP.z0)*sz});
  // terrain, sampled honestly from the heightfield
  const step=2.2;
  for(let wx=WMAP.x0; wx<WMAP.x1; wx+=step){
    for(let wz=WMAP.z0; wz<WMAP.z1; wz+=step){
      const y=gy(wx+step/2, wz+step/2);
      let col;
      if(y===null || y<-1.15) col='#2c4a66';
      else if(y<-0.75) col='#7a9a6a';
      else if(y>2.2) col='#8a8276';
      else col='#4d6b35';
      ctx.fillStyle=col;
      const p=mx(wx,wz);
      ctx.fillRect(p.x, p.y, step*sx+1, step*sz+1);
    }
  }
  // zone tints
  const tint={gloomfen:'rgba(60,48,84,.4)', quarry:'rgba(150,140,115,.45)', scarlands:'rgba(140,60,40,.3)'};
  for(const k in ZONES){ if(!tint[k]) continue;
    const p=mx(ZONES[k].pos[0],ZONES[k].pos[1]);
    ctx.fillStyle=tint[k];
    ctx.beginPath(); ctx.arc(p.x,p.y, 22*sx, 0, 7); ctx.fill();
  }
  // roads
  ctx.strokeStyle='#c4b696'; ctx.lineWidth=2.4; ctx.lineJoin='round';
  for(const seg of PATHS){
    ctx.beginPath();
    seg.forEach(([ax,az],i)=>{ const p=mx(ax,az); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); });
    ctx.stroke();
  }
  // buildings: every roofed room, drawn as the surveyor sees it
  ctx.fillStyle='#8a6a44'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=0.8;
  for(const it of WORLD.interiors){
    const p=mx(it.x-it.hw, it.z-it.hd);
    ctx.fillRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
    ctx.strokeRect(p.x, p.y, it.hw*2*sx, it.hd*2*sz);
  }
  // Whitmoor's walls
  ctx.strokeStyle='#d8d2c4'; ctx.lineWidth=2.2;
  const wA=mx(38,-76), wB=mx(62,-48);
  ctx.strokeRect(wA.x, wA.y, wB.x-wA.x, wB.y-wA.y);
  // place names, the cartographer's hand
  ctx.font='bold 12px Verdana'; ctx.textAlign='center';
  const label=(x,z,t)=>{ const p=mx(x,z);
    ctx.fillStyle='#1a1208'; ctx.fillText(t,p.x+1,p.y+1);
    ctx.fillStyle='#ffe9b0'; ctx.fillText(t,p.x,p.y); };
  label(0,-22,'Veyhollow');
  label(50,-79,'Whitmoor Hold');
  for(const k in ZONES){ const zn=ZONES[k];
    if(zn.name && k!=='town') label(zn.pos[0], zn.pos[1]-3, zn.name); }
  // you are here: a white arrow that knows your facing
  const pp=mx(player.position.x, player.position.z);
  const fa=player.rotation.y;
  ctx.save(); ctx.translate(pp.x,pp.y); ctx.rotate(-fa);
  ctx.fillStyle='#fff'; ctx.strokeStyle='#1a1208'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(4.4,5); ctx.lineTo(0,2.4); ctx.lineTo(-4.4,5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawMinimap(){
  const c=document.getElementById('minimap'), ctx=c.getContext('2d');
  const W=144, R=70;
  const yaw = (typeof camCtl!=='undefined' && camCtl) ? camCtl.yaw : 0;
  ctx.clearRect(0,0,W,W);
  ctx.save();
  ctx.beginPath(); ctx.arc(W/2,W/2,R,0,7); ctx.clip();
  ctx.fillStyle='#2c4a66'; ctx.fillRect(0,0,W,W); // sea
  // the old-school trick: the world turns, you do not
  ctx.translate(W/2,W/2); ctx.rotate(yaw);
  const scale=1.35, px=player.position.x, pz=player.position.z;
  const mx=(x,z)=>({x:(x-px)*scale, y:(z-pz)*scale});
  const land=(cx,cz,half,col)=>{ const p=mx(cx,cz);
    ctx.fillStyle=col; ctx.fillRect(p.x-half*scale,p.y-half*scale,half*2*scale,half*2*scale); };
  land(0,0,108,'#4d6b35');
  land(150,150,30,'#5d7a40');
  for(const k in ZONES){ const p=mx(ZONES[k].pos[0],ZONES[k].pos[1]);
    ctx.fillStyle = k==='gloomfen'?'rgba(60,48,84,.55)': k==='quarry'?'rgba(150,140,115,.5)':
      k==='pond'?'rgba(90,160,190,.5)':'rgba(120,170,85,.35)';
    ctx.beginPath(); ctx.arc(p.x,p.y,30,0,7); ctx.fill(); }
  // roads, faint and honest
  ctx.strokeStyle='rgba(196,182,150,0.55)'; ctx.lineWidth=2.2;
  for(const seg of PATHS){
    ctx.beginPath();
    seg.forEach(([sx,sz],i)=>{ const p=mx(sx,sz); i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); });
    ctx.stroke();
  }
  WORLD.resources.forEach(r=>{ if(!r.userData.alive) return; const p=mx(r.position.x,r.position.z);
    ctx.fillStyle = r.userData.rtype==='tree'?'#1f5414': r.userData.rtype==='rock'?'#c4b89f':'#bfe8ff';
    ctx.fillRect(p.x-1.5,p.y-1.5,3,3); });
  // OSRS dot law: yellow for folk, red for spoils on the ground
  WORLD.npcs.forEach(n=>{ if(n.dead) return; const p=mx(n.mesh.position.x,n.mesh.position.z);
    ctx.fillStyle = n.t.boss?'#ff4d4d':'#ffff00'; ctx.fillRect(p.x-2,p.y-2,4,4); });
  WORLD.clickables.forEach(o=>{ if(o.userData && o.userData.kind==='friendly'){
    const p=mx(o.position.x,o.position.z);
    ctx.fillStyle='#ffff00'; ctx.fillRect(p.x-2,p.y-2,4,4); } });
  WORLD.drops.forEach(d=>{ const p=mx(d.position.x,d.position.z);
    ctx.fillStyle='#ff3a2a'; ctx.fillRect(p.x-1.5,p.y-1.5,3,3); });
  // the red destination flag, planted where you clicked
  const dest = (Player.path && Player.path.length) ? Player.path[Player.path.length-1] : Player.moveTo;
  if(dest){
    const p=mx(dest.x,dest.z);
    ctx.strokeStyle='#d8d2c4'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x,p.y-8); ctx.stroke();
    ctx.fillStyle='#e03a2a';
    ctx.beginPath(); ctx.moveTo(p.x,p.y-8); ctx.lineTo(p.x+6,p.y-6); ctx.lineTo(p.x,p.y-4);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // you, dead centre, always
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(W/2,W/2,3.2,0,7); ctx.fill();
  // the compass: N rides the rim, honest to world north
  const na = yaw + Math.PI;   // world north (-z) in rotated screen space
  const nx = W/2 + Math.sin(na)*(R-9)*-1, ny = W/2 + Math.cos(na)*(R-9);
  ctx.fillStyle='#1a1208'; ctx.beginPath(); ctx.arc(nx,ny,7.5,0,7); ctx.fill();
  ctx.fillStyle='#ffd24a'; ctx.font='bold 10px Verdana'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('N', nx, ny+0.5);
}

/* ---------- admin ---------- */
const Admin = {
  speedOn:false,
  tp(z){ const p=ZONES[z].pos;
    player.position.set(p[0], gy(p[0],p[1]), p[1]);
    Player.moveTo=null; Player.target=null;
    UI.chat(`[ADMIN] Teleported to ${ZONES[z].name}.`,'sys'); },
  spawn(t){ const p=player.position;
    spawnNpc(t, p.x+2+Math.random()*2, p.z+2+Math.random()*2);
    UI.chat(`[ADMIN] Spawned ${NPC_TYPES[t].name}.`,'sys'); },
  give(){ const id=document.getElementById('admin-item').value;
    const q=parseInt(document.getElementById('admin-qty').value)||1;
    Player.addItem(id,q); UI.chat(`[ADMIN] Gave ${q}× ${ITEMS[id].name}.`,'sys'); },
  setLevel(){ const s=document.getElementById('admin-skill').value;
    const lv=Math.min(99,Math.max(1,parseInt(document.getElementById('admin-lvl').value)||1));
    Player.xp[s]=XP_TABLE[lv];
    if(s==='Hitpoints'){ Player.maxHp=lv; Player.hp=lv; }
    UI.refreshSkills(); UI.refreshHud();
    UI.chat(`[ADMIN] ${s} set to ${lv}.`,'sys'); },
  heal(){ Player.hp=Player.maxHp; UI.refreshHud(); UI.chat('[ADMIN] Healed.','sys'); },
  coins(){ Player.addItem('coins',10000); UI.chat('[ADMIN] +10,000 crowns.','sys'); },
  speed(){ this.speedOn=!this.speedOn; Player.speed=this.speedOn?8.4:4.2;
    UI.chat(`[ADMIN] Run speed ${this.speedOn?'2×':'normal'}.`,'sys'); },
  killAll(){ WORLD.npcs.forEach(n=>{ if(!n.dead && n.mesh.position.distanceTo(player.position)<25) killNpc(n); });
    UI.chat('[ADMIN] Nearby NPCs despawned.','sys'); },
};
addEventListener('keydown', e=>{
  if(e.key==='`'){ const p=document.getElementById('admin-panel');
    p.style.display = p.style.display==='block'?'none':'block'; }
  if(e.key==='Escape'){ ['dialogue-modal','bank-modal','shop-modal'].forEach(id=>UI.closeModal(id));
    document.getElementById('admin-panel').style.display='none'; }
  if((e.key==='o'||e.key==='O') && !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    if(typeof toggleRoofs==='function') toggleRoofs(); }
});
function fillAdminSelects(){
  const ai=document.getElementById('admin-item');
  for(const id in ITEMS){ const o=document.createElement('option'); o.value=id; o.textContent=ITEMS[id].name; ai.appendChild(o); }
  const as=document.getElementById('admin-skill');
  SKILLS.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; as.appendChild(o); });
  // tracked quest marker: yellow flag, pinned to the rim when out of range
  if(WORLD.questMarker){
    const dx=(WORLD.questMarker.x-player.position.x)*scale;
    const dz=(WORLD.questMarker.z-player.position.z)*scale;
    let mx=W/2+dx, my=W/2+dz;
    const dd=Math.hypot(dx,dz), maxR=W/2-10;
    if(dd>maxR){ mx=W/2+dx/dd*maxR; my=W/2+dz/dd*maxR; }
    x.strokeStyle='#000'; x.lineWidth=2;
    x.beginPath(); x.moveTo(mx,my); x.lineTo(mx,my-9); x.stroke();
    x.fillStyle='#ffd000';
    x.beginPath(); x.moveTo(mx,my-9); x.lineTo(mx+7,my-6.5); x.lineTo(mx,my-4); x.closePath(); x.fill();
    x.strokeStyle='#1a1208'; x.lineWidth=0.8; x.stroke();
  }
}
/* ================= INPUT ================= */
var _swallowClickUntil=0;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const canvasEl = document.getElementById('game-canvas');

function pick(e){
  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(WORLD.clickables, true);
  for(const h of hits){
    let o=h.object;
    while(o && !o.userData.kind && o.name!=='ground') o=o.parent;
    if(o && (o.userData.kind || o.name==='ground')) return {obj:o, point:h.point};
  }
  return null;
}

canvasEl.addEventListener('mousedown', e=>{
  camCtl.dragging=false; camCtl.lx=e.clientX; camCtl.ly=e.clientY; camCtl.down=true;
});
canvasEl.addEventListener('mousemove', e=>{
  if(camCtl.down && (Math.abs(e.clientX-camCtl.lx)>3 || Math.abs(e.clientY-camCtl.ly)>3)){
    camCtl.dragging=true;
    camCtl.yaw  -= (e.clientX-camCtl.lx)*0.008;
    camCtl.pitch = Math.min(1.45, Math.max(0.55, camCtl.pitch+(e.clientY-camCtl.ly)*0.005));
    camCtl.lx=e.clientX; camCtl.ly=e.clientY;
  } else {
    const hit = pick(e);
    UI.tip(e, hit && hit.obj.userData.label ? hit.obj.userData.label : (hit&&hit.obj.name==='ground'?'Walk here':null));
    canvasEl.style.cursor = hit && hit.obj.userData.label ? 'pointer' : 'crosshair';
    if(hit && hit.obj && hit.obj.name==='ground' && hit.point) showHoverTile(hit.point);
    else hideHoverTile();
  }
});
canvasEl.addEventListener('mouseup', e=>{
  if(Date.now() < (typeof _swallowClickUntil!=='undefined' ? _swallowClickUntil : 0)) return;
  camCtl.down=false;
  if(camCtl.dragging){ camCtl.dragging=false; return; }
  if(window.Build && Build.active){ Build.onClick(e); return; }   // editor: place prop
  const hit = pick(e); if(!hit) return;
  handleClick(hit.obj, hit.point);
});
canvasEl.addEventListener('wheel', e=>{
  camCtl.dist = Math.min(40, Math.max(7, camCtl.dist + e.deltaY*0.02));
});
const Ctx = {
  open:false,
  show(e, entries){
    const m=document.getElementById('ctx-menu'), rows=document.getElementById('ctx-rows');
    rows.innerHTML='';
    entries.forEach(en=>{
      const r=document.createElement('div'); r.className='ctx-row';
      r.innerHTML=en.html;
      r.onclick=(ev)=>{ ev&&ev.stopPropagation&&ev.stopPropagation(); Ctx.hide(); Sfx.click(); en.fn&&en.fn(); };
      rows.appendChild(r);
    });
    m.style.display='block';
    m.style.left=Math.min(e.clientX, innerWidth-180)+'px';
    m.style.top=Math.min(e.clientY, innerHeight-entries.length*28-30)+'px';
    this.open=true;
  },
  hide(){ document.getElementById('ctx-menu').style.display='none'; this.open=false; },
};
function appraiseChat(npcOrType){
  const t = npcOrType.t || npcOrType;
  const p = appraiseFight(t);
  const [verdict,color] = appraiseVerdict(p);
  const nFood = Player.inv.reduce((a,s)=>a+((s&&ITEMS[s.id].heal)?s.qty:0),0);
  UI.chat(`Appraisal vs ${t.name} (lvl ${t.level}): <span style="color:${color}"><b>${verdict}</b></span> — ~${Math.round(p*100)}% to win with your current gear, style${nFood?` and ${nFood} food`:', and no food'}.`,'plain');
}
function aOrAn(n){ return (/^[aeiou]/i.test(n)?'an ':'a ')+n.toLowerCase(); }
function buildCtxEntries(hit, e){
  const entries=[];
  if(hit && hit.obj){
    const o=hit.obj, u=o.userData||{};
    if(u.kind==='npc'){
      const npc=u.npc;
      if(npc && !npc.dead){
        entries.push({html:`Attack <b>${npc.t.name}</b> <span class="lv">(level ${npc.t.level})</span>`,
          fn:()=>{ Player.target=npc; Player.action=null; }});
        if(PICKPOCKETS[npc.typeId])
          entries.push({html:`Pickpocket <b>${npc.t.name}</b>`, fn:()=>tryPickpocket(npc)});
        entries.push({html:`Appraise <b>${npc.t.name}</b>`, fn:()=>appraiseChat(npc)});
        entries.push({html:`Examine <b>${npc.t.name}</b>`,
          fn:()=>UI.chat(npc.t.examine||`It's ${aOrAn(npc.t.name)}.`,'plain')});
      }
    } else if(u.kind==='friendly'){
      entries.push({html:`Talk-to <b>${u.name}</b>`, fn:()=>handleClick(o, o.position)});
    } else if(u.kind==='resource' && u.alive){
      entries.push({html:u.label, fn:()=>handleClick(o, hit.point||o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat(
        u.rtype==='tree'?'A sturdy emberwood tree.':u.rtype==='rock'?'Copper glints in the stone.':'Fish dart beneath the surface.','plain')});
    } else if(u.kind==='drop'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:`Examine <b>${ITEMS[u.id].name}</b>`,
        fn:()=>UI.chat(ITEMS[u.id].examine||`It's ${aOrAn(ITEMS[u.id].name)}.`,'plain')});
    } else if(u.kind==='altar'){
      entries.push({html:'Pray at <b>Altar</b>', fn:()=>{ Player.action={type:'pray', obj:o, t:0}; Player.moveTo=o.position.clone(); }});
      if(Player.count('bones')>0)
        entries.push({html:'Offer bones at <b>Altar</b>', fn:()=>{ Player.action={type:'offer', obj:o, t:0}; Player.moveTo=o.position.clone(); }});
      entries.push({html:'Examine', fn:()=>UI.chat('Candles gutter over old stone. The Dawn listens.','plain')});
    } else if(u.kind==='fire'){
      entries.push({html:'Cook on <b>Campfire</b>', fn:()=>handleClick(o, o.position)});
    } else if(u.kind==='door'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('Stout emberwood on iron hinges.','plain')});
    } else if(u.kind==='signpost'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
    } else if(u.kind==='well'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('Veyhollow\u2019s sweetest water, the wanderers swear.','plain')});
    } else if(u.kind==='furnace'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('Hot enough to make ore confess.','plain')});
    } else if(u.kind==='anvil'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('Scarred by ten thousand honest blows.','plain')});
    } else if(u.kind==='stall'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('The keeper seems distracted...','plain')});
    } else if(u.kind==='cave'){
      entries.push({html:u.label, fn:()=>handleClick(o, o.position)});
      entries.push({html:'Examine', fn:()=>UI.chat('Cold air rises from the dark.','plain')});
    } else if(u.kind==='bank'){
      entries.push({html:'Use <b>Bank booth</b>', fn:()=>handleClick(o, o.position)});
    } else if(u.kind==='prop'){
      entries.push({html:'Examine', fn:()=>UI.chat(u.examine||'Just a curio of the realm.','plain')});
    }
  }
  entries.push({html:'Walk here', fn:()=>{ const gp=e?groundPick(e):null;
    if(gp) minimapWalkTo(gp); else if(hit&&hit.point) minimapWalkTo(hit.point); }});
  entries.push({html:'Cancel', fn:null});
  return entries;
}
canvasEl.addEventListener('contextmenu', e=>{
  e.preventDefault();
  if(!running) return;
  if(window.Build && Build.active){ Build.onRightClick(e); return; }   // editor: remove prop
  const hit = pick(e);
  Ctx.show(e, buildCtxEntries(hit, e));
});
canvasEl.addEventListener('mousedown', ()=>{ if(Ctx.open) Ctx.hide(); });
/* ---------- touch: hold to open the action menu, like a long right-click ---------- */
let _lpTimer=null, _lpStart=null;
let _twoT=null;
canvasEl.addEventListener('touchstart', e=>{
  if(e.touches.length===2){
    if(_lpTimer){ clearTimeout(_lpTimer); _lpTimer=null; }
    const [a,b]=e.touches;
    _twoT={d:Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY),
           x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2};
    return;
  }
  if(!running || e.touches.length!==1) return;
  const t=e.touches[0];
  _lpStart={x:t.clientX, y:t.clientY};
  const fake={clientX:t.clientX, clientY:t.clientY, preventDefault:()=>{}};
  _lpTimer=setTimeout(()=>{
    _lpTimer=null;
    _swallowClickUntil=Date.now()+450;   // the lifted finger must not pick a row
    const hit=pick(fake);
    Ctx.show(fake, buildCtxEntries(hit, fake));
    const menu=document.getElementById('ctx-menu');
    if(menu){ menu.style.pointerEvents='none'; setTimeout(()=>{ menu.style.pointerEvents=''; }, 360); }
    if(navigator.vibrate) navigator.vibrate(18);
  }, 430);
}, {passive:true});
let _touchCam=null;
canvasEl.addEventListener('touchmove', e=>{
  if(e.touches.length===2 && _twoT){
    const [a,b]=e.touches;
    const d=Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const cx=(a.clientX+b.clientX)/2, cy=(a.clientY+b.clientY)/2;
    camCtl.dist = Math.min(40, Math.max(7, camCtl.dist + (_twoT.d-d)*0.045));
    camCtl.yaw  -= (cx-_twoT.x)*0.008;
    camCtl.pitch = Math.min(1.45, Math.max(0.55, camCtl.pitch+(cy-_twoT.y)*0.005));
    _twoT={d, x:cx, y:cy};
    return;
  }
  if(e.touches.length!==1 || !_lpStart) return;
  const t=e.touches[0];
  if(_touchCam){
    // one finger sweeps the camera around, like dragging with the mouse
    camCtl.yaw  -= (t.clientX-_touchCam.x)*0.009;
    camCtl.pitch = Math.min(1.45, Math.max(0.55, camCtl.pitch+(t.clientY-_touchCam.y)*0.006));
    _touchCam={x:t.clientX, y:t.clientY};
    return;
  }
  if(Math.hypot(t.clientX-_lpStart.x, t.clientY-_lpStart.y)>12){
    if(_lpTimer){ clearTimeout(_lpTimer); _lpTimer=null; }
    _touchCam={x:t.clientX, y:t.clientY};
  }
}, {passive:true});
canvasEl.addEventListener('touchend', e=>{
  if(e.touches.length<2) _twoT=null;
  if(_touchCam){ _touchCam=null; _swallowClickUntil=Date.now()+420; }   // a sweep is not a tap
  if(_lpTimer){ clearTimeout(_lpTimer); _lpTimer=null; }
}, {passive:true});
function groundPick(e){
  const r=canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : {left:0,top:0,width:innerWidth,height:innerHeight};
  mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits=raycaster.intersectObjects(WORLD.grounds);
  return hits[0] ? hits[0].point : null;
}
function toggleDoor(door){
  const u=door.userData;
  if(u.open){
    door.rotation.y=u.closedRot; u.open=false; u.label='Open <b>Door</b>';
    if(!WORLD.colliders.includes(u.col)) WORLD.colliders.push(u.col);
    Sfx.click();
  } else {
    door.rotation.y=u.openRot; u.open=true; u.label='Close <b>Door</b>';
    const i=WORLD.colliders.indexOf(u.col); if(i>=0) WORLD.colliders.splice(i,1);
    Sfx.click();
  }
}
function minimapWalkTo(p){
  Player.target=null; Player.action=null;
  const y=groundY(p.x,p.z);
  if(y===null||y<-1.2){ UI.chat('You cannot walk there.','plain'); return; }
  const sp=snapWalkTarget(new THREE.Vector3(p.x,y,p.z));
  orderWalk(sp); moveMarker(sp);
}

function handleClick(obj, point){
  Sfx.click();
  UI.closeWorldModals();   // stepping away from the counter closes it
  const u=obj.userData;
  Player.target=null; Player.action=null;
  if(obj.name==='ground'){ Player.action=null; Player.target=null;
    const sp=snapWalkTarget(point); orderWalk(sp); moveMarker(sp); return; }
  if(u.kind==='npc' && !u.npc.dead){
    Player.target = u.npc;
    return;
  }
  if(u.kind==='drop'){ Player.action={type:'pickup', obj}; orderWalk(obj.position); return; }
  if(u.kind==='resource'){
    if(!u.alive){ UI.chat('There is nothing left to gather here.','plain'); return; }
    if(u.rtype==='fish'){
      if(Player.usingItem!=='fishing_net'){
        UI.chat(Player.count('fishing_net')>0
          ? 'Nothing interesting happens. (Click your small net in your pack first, then click the fishing spot.)'
          : 'You need a small net to fish here. The Hollow Bazaar sells them.','plain');
        return;
      }
      Player.usingItem=null; UI.refreshInv();
    }
    Player.action = {type:'gather', obj, t:0, tick:0};
    orderWalk(obj.position);
    return;
  }
  if(u.kind==='fire'){ Player.action={type:'cook', obj, t:0}; orderWalk(obj.position); return; }
  if(u.kind==='bank'){ Player.action={type:'usebank', obj}; orderWalk(obj.position); return; }
  if(u.kind==='cave'){ Player.action={type:'cavetravel', obj}; orderWalk(obj.position); return; }
  if(u.kind==='door'){
    Player.action={type:'door', obj}; orderWalk(obj.position); return;
  }
  if(u.kind==='signpost'){
    UI.chat('The signpost reads: '+obj.userData.boards.map(b=>b.text).join(' \u2022 ')+'.','plain');
    return;
  }
  if(u.kind==='well'){ UI.chat('Cold dark water glimmers far below. Best keep hold of the bucket.','plain'); return; }
  if(u.kind==='furnace'){ openSmelting(obj); return; }
  if(u.kind==='anvil'){ openSmithing(obj); return; }
  if(u.kind==='stall'){ tryStealStall(obj); return; }
  if(u.kind==='altar'){
    Player.action = (Player.count('bones')>0||Player.count('big_bones')>0) ? {type:'offer', obj, t:0} : {type:'pray', obj, t:0};
    orderWalk(obj.position); return;
  }
  if(u.kind==='friendly'){ Player.action={type:'talk', obj}; orderWalk(obj.position); return; }
}

/* ===== OSRS-style tile feedback: hover highlight, destination tile, path preview =====
   One world unit = one tile. We snap to tile centres (floor()+0.5), draw squares that
   conform to the terrain by sampling groundY at each corner, and trace the planned route
   so you can see exactly where the character will walk — like Old School, but in 3D. */
const TILE = 1.0;
function _tileCenter(x,z){ return [Math.floor(x/TILE)*TILE+TILE/2, Math.floor(z/TILE)*TILE+TILE/2]; }
/* write the 5 perimeter points of a terrain-hugging square into a Line geometry (reused) */
function _setSquareGeom(geom, cx, cz, half, lift){
  const c=[[cx-half,cz-half],[cx+half,cz-half],[cx+half,cz+half],[cx-half,cz+half],[cx-half,cz-half]];
  const a=geom.getAttribute('position');
  const v=(a && a.array.length===15) ? a.array : new Float32Array(15);
  for(let i=0;i<5;i++){ const px=c[i][0], pz=c[i][1];
    v[i*3]=px; v[i*3+1]=(groundY(px,pz)||0)+lift; v[i*3+2]=pz; }
  if(a && a.array.length===15){ a.needsUpdate=true; }
  else geom.setAttribute('position', new THREE.BufferAttribute(v,3));
}
/* the yellow tile that follows the cursor */
let _hoverTile;
function showHoverTile(p){
  if(!_hoverTile){
    _hoverTile=new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({color:0xffe14d, transparent:true, opacity:0.85}));
    _hoverTile.renderOrder=996; scene.add(_hoverTile);
  }
  const [cx,cz]=_tileCenter(p.x,p.z);
  _setSquareGeom(_hoverTile.geometry, cx, cz, TILE/2-0.03, 0.06);
  _hoverTile.visible=true;
}
function hideHoverTile(){ if(_hoverTile) _hoverTile.visible=false; }
/* the animated destination tile (fill + outline), pulses while walking, fades on arrival */
let _destFill, _destOutline, _destActive=false, _destFade=0;
function _ensureDest(){
  if(_destFill) return;
  _destFill=new THREE.Mesh(new THREE.PlaneGeometry(TILE*0.9, TILE*0.9),
    new THREE.MeshBasicMaterial({color:0xffb030, transparent:true, opacity:0.32, depthWrite:false, side:THREE.DoubleSide}));
  _destFill.rotation.x=-Math.PI/2; _destFill.renderOrder=997; scene.add(_destFill);
  _destOutline=new THREE.Line(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({color:0xffd83a, transparent:true}));
  _destOutline.renderOrder=998; scene.add(_destOutline);
}
function markDestTile(p){
  _ensureDest();
  const [cx,cz]=_tileCenter(p.x,p.z);
  _destFill.position.set(cx,(groundY(cx,cz)||0)+0.05,cz);
  _setSquareGeom(_destOutline.geometry, cx, cz, TILE/2-0.02, 0.07);
  _destFill.visible=true; _destOutline.visible=true; _destActive=true; _destFade=1;
}
/* the planned route: the exact orthogonal staircase of TILES the character will step on,
   highlighted square by square, plus a connecting line — OSRS-style, never diagonal */
let _pathLine, _pathTiles, _pathFrame=0;
function showPathPreview(){
  if(!_pathLine){
    _pathLine=new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({color:0xffe14d, transparent:true, opacity:0.85}));
    _pathLine.renderOrder=995; scene.add(_pathLine);
  }
  if(!_pathTiles){
    _pathTiles=new THREE.Mesh(new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({color:0xffe14d, transparent:true, opacity:0.18, depthWrite:false, side:THREE.DoubleSide}));
    _pathTiles.renderOrder=994; scene.add(_pathTiles);
  }
  const tiles = Player.path || [];
  // connecting line (player feet → each tile centre); right-angle turns, no diagonals
  const pts=[[player.position.x, player.position.z]];
  for(const w of tiles) pts.push([w.x, w.z]);
  const v=[];
  for(let i=0;i<pts.length-1;i++){
    const ax=pts[i][0], az=pts[i][1], bx=pts[i+1][0], bz=pts[i+1][1];
    const segs=Math.max(1, Math.ceil(Math.hypot(bx-ax,bz-az)));
    for(let s=0;s<segs;s++){ const t=s/segs, px=ax+(bx-ax)*t, pz=az+(bz-az)*t;
      v.push(px,(groundY(px,pz)||0)+0.1,pz); }
  }
  const L=pts[pts.length-1]; v.push(L[0],(groundY(L[0],L[1])||0)+0.1,L[1]);
  _pathLine.geometry.dispose();
  _pathLine.geometry=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(v,3));
  _pathLine.visible=true;
  // one faint filled square per route tile
  const h=TILE/2*0.86, tv=[];
  for(const w of tiles){
    const cx=w.x, cz=w.z, y=(groundY(cx,cz)||0)+0.04;
    const x0=cx-h, x1=cx+h, z0=cz-h, z1=cz+h;
    tv.push(x0,y,z0, x1,y,z0, x1,y,z1,  x0,y,z0, x1,y,z1, x0,y,z1);
  }
  _pathTiles.geometry.dispose();
  _pathTiles.geometry=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tv,3));
  _pathTiles.visible=true;
}
function hidePathPreview(){ if(_pathLine) _pathLine.visible=false; if(_pathTiles) _pathTiles.visible=false; }
/* a faint tile grid painted on the ground around the player, so the world reads as tiles */
let _groundGrid, _gridTX=null, _gridTZ=null;
function updateGroundGrid(){
  if(typeof player==='undefined') return;
  const R=14, ptx=Math.floor(player.position.x), ptz=Math.floor(player.position.z);
  if(_groundGrid && ptx===_gridTX && ptz===_gridTZ) return;
  _gridTX=ptx; _gridTZ=ptz;
  if(!_groundGrid){
    _groundGrid=new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({color:0x18220e, transparent:true, opacity:0.32}));
    _groundGrid.renderOrder=990; scene.add(_groundGrid);
  }
  const v=[], x0=ptx-R, x1=ptx+R, z0=ptz-R, z1=ptz+R;
  const ok=y=>y!==null && y>-1.2;
  for(let x=x0; x<=x1; x++) for(let z=z0; z<z1; z++){
    const a=groundY(x,z), b=groundY(x,z+1); if(ok(a)&&ok(b)) v.push(x,a+0.03,z, x,b+0.03,z+1);
  }
  for(let z=z0; z<=z1; z++) for(let x=x0; x<x1; x++){
    const a=groundY(x,z), b=groundY(x+1,z); if(ok(a)&&ok(b)) v.push(x,a+0.03,z, x+1,b+0.03,z);
  }
  _groundGrid.geometry.dispose();
  _groundGrid.geometry=new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(v,3));
}
/* snap a walk target to the centre of the tile clicked (the tile we highlighted) */
function snapWalkTarget(p){
  const [cx,cz]=_tileCenter(p.x,p.z);
  const y=groundY(cx,cz);
  if(y!==null && y>-1.2) return new THREE.Vector3(cx,y,cz);
  return p.clone ? p.clone() : new THREE.Vector3(p.x,p.y||0,p.z);
}
/* drives the pulse, the arrival fade, and trims the route as the player advances */
(function _tileFXLoop(){
  requestAnimationFrame(_tileFXLoop);
  try{ updateGroundGrid(); }catch(e){}
  const moving = !!(typeof Player!=='undefined' && Player.moveTo);
  if(_destActive){
    if(moving){
      const t=performance.now()*0.006;
      if(_destFill) _destFill.material.opacity=0.20+Math.abs(Math.sin(t))*0.18;
      if(_destOutline) _destOutline.material.opacity=1;
    } else {
      _destFade-=0.045;
      if(_destFill) _destFill.material.opacity=Math.max(0,_destFade)*0.32;
      if(_destOutline) _destOutline.material.opacity=Math.max(0,_destFade);
      if(_destFade<=0){ _destActive=false;
        if(_destFill) _destFill.visible=false; if(_destOutline) _destOutline.visible=false; }
    }
  }
  if(_pathLine && _pathLine.visible){
    if(moving){ if((++_pathFrame & 3)===0) showPathPreview(); }
    else hidePathPreview();
  }
})();
/* kept as the marker entry point so existing call sites just work */
function moveMarker(p){ markDestTile(p); showPathPreview(); }

/* minimap click-to-walk */
function minimapWalk(px, py){
  const W=144, scale=1.35;
  // undo the map's rotation: screen offset back into world space
  const yaw = (typeof camCtl!=='undefined' && camCtl) ? camCtl.yaw : 0;
  const sx=(px-W/2)/scale, sz=(py-W/2)/scale;
  const ca=Math.cos(-yaw), sa=Math.sin(-yaw);
  const wx = player.position.x + sx*ca - sz*sa;
  const wz = player.position.z + sx*sa + sz*ca;
  minimapWalkTo({x:wx, z:wz});
}
(function(){
  const mm = document.getElementById('minimap');
  if(mm && mm.addEventListener) mm.addEventListener('click', e=>{
    const r = mm.getBoundingClientRect ? mm.getBoundingClientRect() : {left:0,top:0,width:144,height:144};
    const k = 144/(r.width||144);
    minimapWalk((e.clientX-r.left)*k, (e.clientY-r.top)*k);
    Sfx.click();
  });
})();

/* ================= TUTORIAL (Tutor's Holm) ================= */
const Tutorial = {
  complete:false, step:0,
  steps:[
    {text:'Talk to Guide Bram by the rowboat.',                              ev:'talk',   match:'bram'},
    {text:'Open your pack and click the Bronze hatchet to wield it.',        ev:'equip',  match:'hatchet'},
    {text:'Chop down a tree on the island. Click the tree.',                 ev:'gather', match:'logs'},
    {text:'Click your Small net in your pack, then click a fishing spot in the pond.', ev:'gather', match:'raw_perch'},
    {text:'Cook your fish on the campfire. Click the fire.',                 ev:'cook',   match:'cooked_perch'},
    {text:'Now wield the Bronze sword from your pack.',                      ev:'equip',  match:'bronze_sword'},
    {text:'Slay the practice grubkin near the camp.',                        ev:'kill',   match:'grubkin'},
    {text:'Return to Guide Bram. He will row you to the mainland.',          ev:'talk',   match:'bram_done'},
  ],
  notify(ev, match){
    if(this.complete) return;
    const s=this.steps[this.step];
    if(!s) return;
    if(s.ev===ev && s.match===match){
      this.step++;
      Sfx.quest();
      if(this.step>=this.steps.length){ this.finish(); }
      else this.banner();
    }
  },
  banner(){
    const el=document.getElementById('objective');
    if(this.complete){ el.style.display='none'; return; }
    // auto-skip the equip step if the sword is already wielded
    const s=this.steps[this.step];
    if(s && s.ev==='equip' && Player.equip.weapon===s.match){
      this.step++; if(this.step>=this.steps.length){ this.finish(); return; }
    }
    el.style.display='block';
    document.getElementById('obj-text').textContent = this.steps[this.step].text;
  },
  finish(){
    this.complete=true;
    document.getElementById('objective').style.display='none';
    UI.chat('You have completed the tutorial! Welcome to the mainland.','xp');
    Admin.tp('commons');
    UI.dialogue('Guide Bram',
      'The oars are yours no longer, friend — Veyhollow lies before you. Seek Warden Maela by the bank; she always has work for a new face.',
      [{label:'Thank you, Bram.'}], '🧓');
  },
  skip(){
    if(this.complete) return;
    this.finish();
  },
};

/* ================= DIALOGUE TREES ================= */
function talkTo(id, name, face){
  if(id==='barkeep'){
    UI.dialogue(name,'Welcome to The Tipsy Grub! Finest Hollow ale this side of the Scarlands. A mug takes the edge off any wound.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('pub')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='fletcher'){
    UI.dialogue(name,'Rask. Bows, shafts, feathers — and a knife if you want to carve your own. The emberwood fletches sweet.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('bowyer')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='whitbanker'){
    UI.dialogue(name,'Whitmoor Bank, the safest vault on the moor. Same ledger as Veyhollow, of course.',
      [{label:'Open my vault.', fn:()=>UI.openBank()},{label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='marblesmith'){
    UI.dialogue(name,'Marble Arms. Iron, mostly — the knights keep me too busy for fancier metals.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('marble_arms')},{label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='innkeep'){
    UI.dialogue(name,'The Gilded Boar! Stew that fixes most regrets, bread for the road.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('gilded_boar')},{label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='captain'){
    UI.dialogue(name,'Captain Veyle, of the Hold. Mind the cave behind the keep — Korthul sleeps shallow, and my knights do not follow anyone down there. Whatever you haul back up is yours.',
      [{label:'I will brave it.', fn:null},{label:'Wise to stay above.', fn:null}],face);
    return;
  }
  if(id==='archmage'){
    UI.dialogue(name,'Welcome to the Spire, apprentice. We sell runes of every school — and mind the wizards on the grounds; they duel anything that lingers. The bank booth is for paying customers who keep dying out there.',
      [{label:'Show me your runes.', fn:()=>UI.openShop('spire')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='spirebanker'){
    UI.dialogue(name,'Banker Odwin, at your service. Far from town, I know — the Archmage pays triple for the danger.',
      [{label:'Open my vault.', fn:()=>UI.openBank()},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='friar'){
    UI.dialogue(name,'Welcome to the Chapel of the Dawn, child. Lay bones upon the altar and the Dawn doubles their blessing. The dead rest easier for it.',
      [{label:'I shall.', fn:null},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='clothier'){
    UI.dialogue(name,'Threadworks, dear — capes, robes, and leathers. A traveller should never look shabby.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('clothier')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='arcanist'){
    UI.dialogue(name,'You stand in Glimmerveil Arcana. Staves, runes, robes... and amulets with a little something extra woven in.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('arcanist')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='fletcher'){
    UI.dialogue(name,'Hask\'s the name. Bryn folk fight with axes, but a good bow keeps your blood inside you.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('fletcher')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='duneTrader'){
    UI.dialogue(name,'A traveller, out here? The Dunes strip the unprepared to bone. Buy water— ah, we\'re out. Buy gear instead.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('bazaar')},
       {label:'Farewell.', fn:null}],face);
    return;
  }
  if(id==='ferra'){
    const q=Player.quests.thirsty_smith;
    if(!q){
      UI.dialogue(name,'Forge is cold and so is my throat. Fetch me a Hollow ale from The Tipsy Grub and I\'ll make it worth your while — Stonereach steel, friend.',
        [{label:'I\'ll fetch your ale. (Start: The Thirsty Smith)', fn:()=>Quest.start('thirsty_smith')},
         {label:'Show me your wares.', fn:()=>UI.openShop('smith')},
         {label:'Farewell.', fn:null}],face);
    } else if(q.stage===1){
      if(Player.count('hollow_ale')>=1){
        UI.dialogue(name,'THAT\'s the stuff! The forge roars again. As promised — a steel sword, sharp as my thirst was deep.',
          [{label:'(Hand over the ale)', fn:()=>{
            Player.removeItem('hollow_ale',1);
            Quest.complete('thirsty_smith');
          }}],face);
      } else {
        UI.dialogue(name,'No ale, no steel. The Tipsy Grub is just across the square — follow your nose.',
          [{label:'Show me your wares.', fn:()=>UI.openShop('smith')},
           {label:'Farewell.', fn:null}],face);
      }
    } else {
      UI.dialogue(name,'Forge\'s hot and the work is good. Need armour? You know where I am.',
        [{label:'Show me your wares.', fn:()=>UI.openShop('smith')},
         {label:'Farewell.', fn:null}],face);
    }
    return;
  }
  if(id==='duelmaster'){
    if(Duel.active){
      UI.dialogue(name,'Finish your bout first, fighter! The pit only ever holds one duel of yours at a time.',
        [{label:'Right.', fn:null}],face);
      return;
    }
    UI.dialogue(name,'Welcome to the Proving Grounds! Stake your crowns, step into the pit, and beat a duelist your own size. Win and I pay DOUBLE your stake. Lose... well. What\'s it going to be?',
      [{label:'Friendly duel (no stake).', fn:()=>Duel.start(0)},
       {label:'Stake 10 crowns.', fn:()=>Duel.start(10)},
       {label:'Stake 50 crowns.', fn:()=>Duel.start(50)},
       {label:'Stake 200 crowns.', fn:()=>Duel.start(200)},
       {label:'Not today.', fn:null}],face);
    return;
  }
  if(id==='bram'){
    if(Tutorial.complete){
      UI.dialogue(name,'Veyhollow treating you well? The mainland holds far more than this little holm ever did.',null,face);
    } else if(Tutorial.step===0){
      UI.dialogue(name,'Ah, you\'re awake! Washed up in the night, you did. This is Tutor\'s Holm — before I row you to the mainland, let me show you how to survive out there. Take this kit: a bronze hatchet, a small net, and a bronze sword. Wield the hatchet from your pack, then chop one of those trees.',
        [{label:'(Take the hatchet, net and sword)', fn:()=>{
          Player.addItem('hatchet',1); Player.addItem('fishing_net',1); Player.addItem('bronze_sword',1);
          UI.chat('Guide Bram hands you a bronze hatchet, a small net and a bronze sword.','plain');
          refreshPlayerGear();
          Tutorial.notify('talk','bram');
        }}],face);
    } else if(Tutorial.step<6){
      UI.dialogue(name,`Keep at it! ${Tutorial.steps[Tutorial.step].text}`,null,face);
    } else {
      UI.dialogue(name,'You\'ve the makings of an adventurer. Hop in the boat — Veyhollow awaits!',
        [{label:'(Sail to the mainland)', fn:()=>Tutorial.notify('talk','bram_done')}],face);
    }
    return;
  }
  if(id==='maela'){
    const gt=Quest.state('grub_trouble'), wt=Quest.state('wardens_trial');
    if(!gt){
      UI.dialogue(name, 'Adventurer! Grubkins gnaw at our fences and frighten the hens. Would you thin their numbers? Three should do it.',
        [{label:'I\'ll handle the grubkins. (Start quest)', fn:()=>Quest.start('grub_trouble')},
         {label:'Perhaps later.'}],face);
    } else if(gt.stage===1){
      UI.dialogue(name, `Still ${3-gt.counter} grubkin${3-gt.counter>1?'s':''} squealing out there. They wander the commons grass.`,null,face);
    } else if(gt.stage===2){
      UI.dialogue(name, 'The fences are quiet at last. Take these crowns and this shield — the Wardens thank you.',
        [{label:'Glad to help.', fn:()=>Quest.complete('grub_trouble')}],face);
    } else if(!wt){
      UI.dialogue(name, 'You\'ve a warden\'s heart. If you would join our guild, prove it: the Fenlord broods in Gloomfen, south-west of here. Fell it.',
        [{label:'I accept the Wardens\' Trial. (Start quest)', fn:()=>Quest.start('wardens_trial')},
         {label:'That sounds beyond me, for now.'}],face);
    } else if(wt.stage===1){
      UI.dialogue(name, 'The Fenlord waits in Gloomfen. Bring food, wear your best armour, and mind its claws.',null,face);
    } else if(wt.stage===2){
      UI.dialogue(name, 'By the old oaks — you actually did it. Wear this sigil; the Wardens\' Guild is yours.',
        [{label:'(Take the sigil)', fn:()=>Quest.complete('wardens_trial')}],face);
    } else {
      UI.dialogue(name, 'Veyhollow sleeps easier with you about, Warden.',null,face);
    }
    return;
  }
  if(id==='olun'){
    const q=Quest.state('splinters');
    if(!q){
      UI.dialogue(name, 'My mill wheel\'s cracked clean through. Five sturdy emberwood logs would mend it. The trees grow thick just west.',
        [{label:'I\'ll fetch your logs. (Start quest)', fn:()=>Quest.start('splinters')},
         {label:'Not my trade, miller.'}],face);
    } else if(q.stage===1){
      if(Player.count('logs')>=5){
        UI.dialogue(name, 'Five fine logs! You\'ve saved my livelihood. Here — crowns, and my spare hatchet.',
          [{label:'(Hand over 5 logs)', fn:()=>{ Player.removeItem('logs',5); Quest.complete('splinters'); }}],face);
      } else {
        UI.dialogue(name, `That's ${Player.count('logs')} of 5 logs. Emberwood lies west — click the trees to chop.`,null,face);
      }
    } else {
      UI.dialogue(name, 'The wheel turns true again. Bless you.',null,face);
    }
    return;
  }
  if(id==='banker'){
    UI.dialogue(name, 'Welcome to the Bank of Veyhollow. Your vault is safe with us.',
      [{label:'Open my vault.', fn:()=>UI.openBank()},
       {label:'Just passing through.'}],face);
    return;
  }
  if(id==='merchant'){
    UI.dialogue(name, 'Fresh from the caravans! Tools, blades, armour, runes — the Hollow Bazaar has it all.',
      [{label:'Show me your wares.', fn:()=>UI.openShop('bazaar')},
       {label:'Another time.'}],face);
    return;
  }
  if(id==='greeter'){
    UI.dialogue(name, 'New to Veyhollow? Chop trees west in Emberwood, mine east at Stonereach, fish north-east at Mirrorpond. Steer clear of Gloomfen until you\'re stronger... it\'s the dark corner of the map.',
      [{label:'Thanks for the tips.'}],face);
  }
}

/* ================= MUSIC MENU ================= */
const MusicMenu = {
  open:false,
  toggle(){ this.open=!this.open; this.render(); },
  render(){
    const m=document.getElementById('music-menu'); if(!m) return;
    m.style.display=this.open?'block':'none';
    if(!this.open) return;
    m.innerHTML='<h4>🎵 Music</h4>';
    const mode=document.createElement('div'); mode.className='mtrack mode';
    mode.textContent = (Music.mode==='auto'?'● ':'○ ')+'Auto (by location)';
    mode.onclick=()=>{ Music.mode='auto'; Music.onZone(curZone); Sfx.click(); this.render(); };
    m.appendChild(mode);
    for(const id in TRACKS){
      const tr=TRACKS[id];
      const row=document.createElement('div');
      if(Music.unlocked.indexOf(id)>=0){
        row.className='mtrack'+(Music.current===id&&Music.mode==='manual'?' cur':'');
        row.textContent=(Music.current===id?'▶ ':'  ')+tr.name;
        row.onclick=()=>{ Music.mode='manual'; Music.play(id); if(!Music.on) Music.start(); Sfx.click(); this.render(); };
      } else {
        row.className='mtrack locked';
        row.textContent='🔒 Locked — visit '+(ZONES[tr.zone]?ZONES[tr.zone].name:'?');
      }
      m.appendChild(row);
    }
    const off=document.createElement('div'); off.className='mtrack mode';
    off.textContent=Music.on?'Turn music off':'Turn music on';
    off.onclick=()=>{ Music.toggle(); Sfx.click(); this.render(); };
    m.appendChild(off);
  },
};

/* ================= CHARACTER CREATION ================= */
const CharCfg = { name:'Adventurer', shirt:0x3a6ea5, skin:0xd8a878 };
const SHIRT_CHOICES=[0x3a6ea5,0x5b7d4a,0x8a3d3d,0x6b4a8a,0x9a7a32,0x3a3a42];
const SKIN_CHOICES=[0xd8a878,0xc89868,0xa87848,0x8a5e38];
function applyPlayerLook(){
  const pos = player ? player.position.clone() : null;
  const rot = player ? player.rotation.y : 0;
  if(player){ scene.remove(player); }
  player = humanoid(CharCfg.shirt, {skin:CharCfg.skin, beard:false, emblem:true});
  if(pos) player.position.copy(pos);
  player.rotation.y = rot;
  player.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
  const tag = makeNameTag(CharCfg.name||'Adventurer');
  tag.position.y = 2.3; player.add(tag);
  scene.add(player);
  refreshPlayerGear();
}
function wireLogin(){
  const $=id=>document.getElementById(id);
  const show=(a,b,c)=>{ if($('login-choose'))$('login-choose').style.display=a;
    if($('login-create'))$('login-create').style.display=b;
    if($('login-play'))$('login-play').style.display=c; };
  const buildSw=(holderId, choices, key)=>{
    const h=$(holderId); if(!h) return;
    choices.forEach((c,i)=>{
      const d=document.createElement('div'); d.className='sw'+(i===0?' sel':'');
      d.style.background='#'+c.toString(16).padStart(6,'0');
      d.onclick=()=>{ CharCfg[key]=c;
        h.children && [...h.children].forEach(x=>x.classList&&x.classList.remove('sel'));
        d.classList.add('sel'); };
      h.appendChild(d);
    });
  };
  buildSw('sw-shirt', SHIRT_CHOICES, 'shirt');
  buildSw('sw-skin',  SKIN_CHOICES,  'skin');
  if($('btn-new')) $('btn-new').onclick=()=>{ Sfx.click(); SaveGame.reset(); show('none','block','none'); };
  if($('btn-continue')) $('btn-continue').onclick=()=>{
    Sfx.click();
    if(!SaveGame.exists()){ if($('login-note')) $('login-note').textContent='No saved adventurer was found on this device.'; return; }
    SaveGame.load();
    if($('play-welcome')) $('play-welcome').textContent='Welcome back, '+(CharCfg.name||'adventurer');
    if($('play-sub')) $('play-sub').textContent='Your progress has been restored.';
    show('none','none','block');
  };
  if($('btn-begin')) $('btn-begin').onclick=()=>{
    Sfx.click();
    const nm=(($('char-name')&&$('char-name').value)||'Adventurer').trim().slice(0,14);
    CharCfg.name=nm||'Adventurer';
    applyPlayerLook();
    if($('play-welcome')) $('play-welcome').textContent='Welcome, '+CharCfg.name;
    show('none','none','block');
  };
  if($('music-btn')) $('music-btn').onclick=()=>{ Sfx.click(); MusicMenu.toggle(); };
  const sp=$('side-panel'), cf=$('chatbox-frame');
  if($('mob-panel-btn')) $('mob-panel-btn').onclick=()=>{ Sfx.click();
    sp.classList.toggle('open');
    if(sp.classList.contains('open') && cf) cf.classList.remove('open');
  };
  if($('mob-chat-btn')) $('mob-chat-btn').onclick=()=>{ Sfx.click();
    cf.classList.toggle('open');
    if(cf.classList.contains('open')){
      const dot=$('chat-dot'); if(dot) dot.style.display='none';
      if(sp) sp.classList.remove('open');
    }
  };
  if($('compass-btn')) $('compass-btn').onclick=()=>{ Sfx.click();
    camCtl.yaw=Math.PI*0.75; camCtl.pitch=1.08; camCtl.dist=19;
  };
  if($('run-orb')) $('run-orb').onclick=()=>{
    if(Player.energy<=0 && !Player.runOn){ UI.chat('You are too exhausted to run.','plain'); return; }
    Player.runOn=!Player.runOn; Sfx.click(); UI.refreshRun();
    UI.chat(Player.runOn?'Run mode: on.':'Run mode: off — walking.','sys');
  };
  if($('spec-orb')) $('spec-orb').onclick=()=>{
    const wm = Player.equip.weapon ? ITEMS[Player.equip.weapon].model : null;
    if(!wm || !SPECIALS[wm]){ UI.chat('This weapon has no special attack.','plain'); return; }
    if(Player.spec < SPECIALS[wm].cost){ UI.chat(`You need ${SPECIALS[wm].cost}% special-attack energy for ${SPECIALS[wm].name}.`,'plain'); return; }
    Player.specArmed=!Player.specArmed; Sfx.click();
    UI.chat(Player.specArmed?`Special attack armed: ${SPECIALS[wm].name}.`:'Special attack disarmed.','sys');
    UI.refreshSpec();
  };
  const ds=$('drops-search');
  if(ds && ds.addEventListener) ds.addEventListener('input', ()=>UI.refreshDrops(ds.value));
}
wireLogin();

/* ================= SAVE SYSTEM (localStorage) ================= */
const SaveGame = {
  KEY:'motionscape_save',
  available(){ try{ return typeof localStorage!=='undefined' && !!localStorage; }catch(e){ return false; } },
  exists(){ if(!this.available()) return false;
    try{ return !!localStorage.getItem(this.KEY); }catch(e){ return false; } },
  serialize(){
    return JSON.stringify({
      v:1,
      xp:Player.xp, hp:Player.hp, maxHp:Player.maxHp,
      inv:Player.inv, bank:Player.bank, equip:Player.equip,
      quests:Player.quests, castMode:!!Player.castMode,
      tut:{step:Tutorial.step, complete:!!Tutorial.complete},
      pos:[player.position.x, player.position.z],
      tracked:Quest.tracked,
      look:{name:CharCfg.name, shirt:CharCfg.shirt, skin:CharCfg.skin},
      styles:Player.attackStyles, autoRetaliate:Player.autoRetaliate,
      music:{unlocked:Music.unlocked, mode:Music.mode, current:Music.current},
      energy:Player.energy, runOn:Player.runOn, spec:Player.spec,
      prayerPts:Player.prayerPts,
      spell:Player.spell,
    });
  },
  save(silent){
    if(!this.available()) return false;
    try{ localStorage.setItem(this.KEY, this.serialize());
      if(!silent) UI.chat('Game saved.','sys');
      return true;
    }catch(e){ return false; }
  },
  load(){
    if(!this.available()) return false;
    let d=null;
    try{ const raw=localStorage.getItem(this.KEY); if(!raw) return false; d=JSON.parse(raw); }
    catch(e){ return false; }
    if(!d || d.v!==1) return false;
    try{
      Object.assign(Player.xp, d.xp);
      Player.hp=d.hp; Player.maxHp=d.maxHp;
      Player.inv=d.inv; Player.bank=d.bank; Player.equip=d.equip;
      Player.quests=d.quests||{}; Player.castMode=!!d.castMode;
      Quest.tracked=d.tracked||null;
      if(d.styles) Object.assign(Player.attackStyles, d.styles);
      if(d.autoRetaliate!==undefined) Player.autoRetaliate=!!d.autoRetaliate;
      if(d.energy!==undefined){ Player.energy=d.energy; Player.runOn=!!d.runOn; }
      if(d.spec!==undefined) Player.spec=d.spec;
      if(d.prayerPts!==undefined) Player.prayerPts=Math.min(d.prayerPts, Player.maxPrayer());
      if(d.spell && SPELLS[d.spell]){ Player.spell=d.spell; Player.castMode=true; }
      // old spark runes fuse into mind runes
      Player.inv.forEach(s=>{ if(s && s.id==='spark_rune') s.id='mind_rune'; });
      (Player.bank||[]).forEach(s=>{ if(s && s.id==='spark_rune') s.id='mind_rune'; });
      if(d.music){ Music.unlocked=d.music.unlocked||Music.unlocked;
        Music.mode=d.music.mode||'auto'; Music.current=d.music.current||'hollow_square'; }
      if(d.look){ CharCfg.name=d.look.name||'Adventurer';
        CharCfg.shirt=d.look.shirt||0x3a6ea5; CharCfg.skin=d.look.skin||0xd8a878;
        applyPlayerLook(); }
      if(d.tut && d.tut.complete){
        Tutorial.complete=true; Tutorial.step=Tutorial.steps.length;
        const ob=document.getElementById('objective'); if(ob) ob.style.display='none';
      } else if(d.tut){ Tutorial.step=d.tut.step||0; }
      if(d.pos){
        const y=groundY(d.pos[0],d.pos[1]);
        if(y!==null) player.position.set(d.pos[0], y, d.pos[1]);
      }
      refreshPlayerGear();
      UI.refreshInv(); UI.refreshSkills(); UI.refreshQuests(); UI.refreshEquip(); UI.refreshHud();
      UI.chat('Welcome back to Veyhollow. Your progress has been restored.','sys');
      return true;
    }catch(e){ return false; }
  },
  reset(){
    if(!this.available()) return;
    try{ localStorage.removeItem(this.KEY); }catch(e){}
  },
  timer:0,
  tick(dt){
    this.timer-=dt;
    if(this.timer<=0){ this.timer=20; this.save(true); }
  },
};

/* ================= AMBIENT ADVENTURERS (bots) ================= */
function makeNameTag(text){
  const c=document.createElement('canvas'); c.width=128; c.height=24;
  const x=c.getContext('2d');
  x.font='bold 14px Verdana'; x.textAlign='center';
  x.fillStyle='#000'; x.fillText(text, 65, 17);
  x.fillStyle='#ffff00'; x.fillText(text, 64, 16);
  const tex=new THREE.CanvasTexture(c);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false}));
  spr.scale.set(2.2,0.42,1);
  return spr;
}
const Bots = {
  list:[],
  DEFS:[
    {name:'Skorn',       shirt:0x7a2a2a, opts:{}},
    {name:'MaplePicker', shirt:0x2a6b3a, opts:{}, job:'chop'},
    {name:'Lady_Vex',    shirt:0x6b2a6b, opts:{hairLong:true}},
    {name:'Wynna',       shirt:0x4a3a7a, opts:{robe:0x4a3a7a, hat:'wizard', hairLong:true}},
    {name:'Otto99',      shirt:0x3a5a8a, opts:{}, job:'fight'},
  ],
  spawn(){
    this.DEFS.forEach((d,i)=>{
      const mesh = humanoid(d.shirt, d.opts);
      mesh.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
      const tag = makeNameTag(d.name);
      tag.position.y = 2.25; mesh.add(tag);
      const a = i*1.26, r = 6+i*2;
      mesh.position.set(Math.cos(a)*r, 0, Math.sin(a)*r);
      mesh.position.y = gy(mesh.position.x, mesh.position.z);
      // give some of them visible gear
      if(i===0) holdWeapon(mesh.userData.parts.handR, swordMesh(METALS.iron), {model:'sword'});
      if(i===1) holdWeapon(mesh.userData.parts.handR, axeMesh(METALS.bronze), {model:'sword'});
      if(i===4) holdWeapon(mesh.userData.parts.handR, swordMesh(METALS.steel), {model:'sword'});
      scene.add(mesh);
      this.list.push({mesh, def:d, state:'idle', t:1+Math.random()*4, dest:null, swingT:0, fightNpc:null});
    });
  },
  POIS:[[0,5],[6,-1],[-7,-2],[2,7],[-12,8],[12,8],[-30,-20],[-50,-34],[35,-18],[28,28],[-3,12]],
  update(dt){
    this.list.forEach(b=>{
      b.t -= dt;
      if(b.state==='idle'){
        walkAnim(b.mesh, false, dt);
        if(b.t<=0){
          if(b.def.job==='fight' && Math.random()<0.5){
            const npc = WORLD.npcs.find(n=>!n.dead && !n.t.boss && !n.t.humanoid &&
              n.mesh.position.distanceTo(b.mesh.position)<22);
            if(npc){ b.state='fight'; b.fightNpc=npc; b.t=20; return; }
          }
          const p=this.POIS[Math.floor(Math.random()*this.POIS.length)];
          b.dest=new THREE.Vector3(p[0]+(Math.random()-.5)*4, 0, p[1]+(Math.random()-.5)*4);
          b.state='walk'; b.t=25;
        }
      }
      else if(b.state==='walk'){
        const d=b.dest.clone().sub(b.mesh.position); d.y=0;
        if(d.length()<0.5 || b.t<=0){ b.state = b.def.job==='chop'&&Math.random()<0.6?'chop':'idle'; b.t=2+Math.random()*5; return; }
        const step=d.normalize().multiplyScalar(3.4*dt);
        const slid=slideMove(b.mesh.position.x,b.mesh.position.z,
          b.mesh.position.x+step.x,b.mesh.position.z+step.z,0.2);
        if(!slid){ b.state='idle'; b.t=1; return; }
        const y=groundY(slid[0],slid[1]);
        if(y===null||y<-1.2){ b.state='idle'; b.t=1; return; }
        b.mesh.position.set(slid[0],y,slid[1]);
        b.mesh.lookAt(slid[0]+step.x,y,slid[1]+step.z);
        walkAnim(b.mesh, true, dt);
      }
      else if(b.state==='chop'){
        walkAnim(b.mesh, false, dt);
        b.swingT-=dt;
        if(b.swingT<=0){ b.swingT=0.8; swing(b.mesh); }
        if(b.t<=0){ b.state='idle'; b.t=2; }
      }
      else if(b.state==='fight'){
        const n=b.fightNpc;
        if(!n || n.dead || b.t<=0){ b.state='idle'; b.t=2+Math.random()*4; b.fightNpc=null; return; }
        const d=n.mesh.position.clone().sub(b.mesh.position); d.y=0;
        if(d.length()>1.8){
          const step=d.normalize().multiplyScalar(3.4*dt);
          const slid=slideMove(b.mesh.position.x,b.mesh.position.z,
            b.mesh.position.x+step.x,b.mesh.position.z+step.z,0.2);
          if(slid){ const y=groundY(slid[0],slid[1]);
            if(y!==null){ b.mesh.position.set(slid[0],y,slid[1]);
              b.mesh.lookAt(n.mesh.position.x,y,n.mesh.position.z);
              walkAnim(b.mesh, true, dt); } }
        } else {
          walkAnim(b.mesh, false, dt);
          b.swingT-=dt;
          if(b.swingT<=0){
            b.swingT=2.4; swing(b.mesh); Sfx.swing();
            const dmg = Math.random()<0.7 ? Math.ceil(Math.random()*4) : 0;
            n.hp-=dmg; UI.floatDmg(n.mesh,dmg);
            n.hpbar.spr.visible=true; n.hpbar.draw(Math.max(0,n.hp/n.t.hp));
            if(n.hp<=0){ killNpc(n, {silent:true, noQuest:true}); b.state='idle'; b.t=3; }
          }
        }
      }
    });
  },
};

/* ================= WORLD POPULATION ================= */
function populateMainland(){
  // Veyhollow town
  makeBuilding(6,-6, 6,5,3.4, 0xc9b28a, 0x8a4a32,'S',{sign:0xc9a85a, doorOpen:true});   // bank — gold sign
  makeBuilding(-7,-8, 5,4,3, 0xbfa87f, 0x6b7a8f,'S',{sign:0x8a3d68, doorOpen:true});    // bazaar
  makeBuilding(12,4, 4,4,2.6, 0xd0bc94, 0x8a4a32,'W',{chimney:true, roof:'gable'});   // cottage
  makeBuilding(-40,-31, 4.5,4,3, 0xc9b28a, 0x7a5838,'S',{chimney:true, roof:'gable'});// Olun's mill house
  makeBuilding(-13,2, 5,4.5,3, 0xb89a6e, 0x6e4a2e,'E',{sign:0x6e4a2e, chimney:true, doorOpen:true, roof:'gable'});  // The Tipsy Grub
  makeBuilding(13,-7, 4.5,4,2.8, 0xcdb890, 0x5a6a8a,'W',{sign:0x8a6a9a, doorOpen:true});// Threadworks
  makeBuilding(-8.5,13, 4.5,4,3, 0xb0a8c4, 0x4a3a7a,'N',{sign:0x4a3a7a, doorOpen:true, tall:true});  // Glimmerveil Arcana
  makeBuilding(9,12, 5,4.5,3, 0xa89884, 0x3e3a36,'N',{sign:0x4a4642, chimney:true, doorOpen:true, roof:'gable', wall:'stone'});   // Stonereach Smithy
  makeFountain(0,-1);
  makeBankBooth(6,-7.45, 0);       // the booth sits at the great counter
  makeFurnace(12.5,15.2);           // the town furnace, beside the smithy
  /* ---------- purposeful placement: the dressing of Veyhollow ---------- */
  // the ground remembers: cobbles at the fountain, mud in the pen, cinders at the forge
  makeGroundPatch(0,-1, 5.2, 0x9a9288);                 // fountain plaza, paved
  makeGroundPatch(0,-15.5, 3.4, 0x8a7a5e);              // market row, trodden bare
  makeGroundPatch(12.5,14.2, 3.0, 0x4e4640);            // the smithy yard, black with cinders
  makeGroundPatch(29,-6, 4.6, 0x6a5638);                // the cow pen, honest mud
  makeGroundPatch(-2.5,5.5, 2.0, 0x9a9288);             // around the well
  makeGroundPatch(50,-56, 5.4, 0xc8c2b6);               // Whitmoor's white plaza
  makeGroundPatch(50,-62, 3.4, 0xc8c2b6);
  makeFurrows(-48.4,-28.6, -43.6,-24.6);                // the ploughed wheat rows
  makeWell(-2.5,5.5);                                 // the village well on the green
  // the churchyard, behind the chapel where the Dawn keeps watch
  makeFence(-7,29.5, -7,32.5); makeFence(-7,32.5, 1,32.5); makeFence(1,29.5, 1,32.5);
  makeGrave(-5.6,30.6,0); makeGrave(-4.2,31.4,1); makeGrave(-2.6,30.4,2);
  makeGrave(-1.2,31.2,0); makeGrave(0,30.2,1); makeGrave(-5.8,31.8,2);
  // the cow pen earns its keep: hay and water
  makeHayBale(31,-3); makeHayBale(32.2,-3.6); makeTrough(27,-9.4, 0.2);
  // deliveries stack behind the shops
  makeCrateCluster(3.2,-8.6); makeCrateCluster(-9.8,-6.2); makeCrateCluster(11.2,13.8);
  makeCrateCluster(-15.6,3.4);
  // signposts where roads truly fork
  makeSignpost(2.5,-11.5, [
    {text:'Whitmoor Hold', ang:-1.2}, {text:'The Spire', ang:2.2}, {text:'Emberwood', ang:0.9}]);
  makeSignpost(-12,-13, [
    {text:'Olun\u2019s Mill', ang:1.3}, {text:'Gloomfen', ang:2.4}, {text:'Veyhollow', ang:-0.6}]);
  makeSignpost(46,-44, [
    {text:'Whitmoor Hold', ang:0.1}, {text:'Veyhollow', ang:2.8}]);
  // Olun's mill becomes a true windmill, wheat rows fenced beside it
  makeWindmill(-44.5,-34);
  makeFence(-49,-29, -49,-24); makeFence(-49,-24, -43,-24); makeFence(-43,-29, -43,-24);
  makeWheatField(-48.4,-28.6, -43.6,-24.6);
  makeButterflies();
  dressWorld();   // the instanced ground cover goes down last, around everything
  makeStall(8.5,-16.5, 0x4a7a3a, null);   // Rask's bow table (shop, not a mark)
  spawnFriendly('fletcher','Fletcher Rask', 8.5,-15.2, 0x4a6a3a,'🏹');
  makeInterior('bank', 6,-6, 6,5,'S');
  makeInterior('pub', -13,2, 5,4.5,'E');
  makeInterior('smithy', 9,12, 5,4.5,'N');
  makeInterior('arcana', -8.5,13, 4.5,4,'N');
  makeInterior('chapel', -3,26, 6,5,'N');
  /* ---------- the town grows: north chapel, hearthhouse, market row, east pastures ---------- */
  makeBuilding(-3,26, 6,5,4, 0xd8d2c4, 0x6b6458,'N',{doorOpen:true});    // Chapel of the Dawn
  makeAltar(-3,27.4);                                  // the altar at the head of the nave
  // the chapel bell gable and rose window
  (function(){
    const py=gy(-3,26);
    const gable=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.4,0.5), mat(0xd8d2c4));
    gable.position.set(-3, py+4.9, 26); scene.add(gable);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(0.85,0.8,4), mat(0x6b6458));
    cap.position.set(-3, py+6.0, 26); cap.rotation.y=Math.PI/4; scene.add(cap);
    const bell=new THREE.Mesh(new THREE.ConeGeometry(0.26,0.4,7), mat(0xc9b870));
    bell.position.set(-3, py+5.0, 26); scene.add(bell);
    const rose=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,10),
      new THREE.MeshBasicMaterial({color:0x7aa8d8}));
    rose.rotation.x=Math.PI/2; rose.position.set(-3, py+3.1, 23.55); scene.add(rose);
  })();
  makeBuilding(18,18, 4.5,4,2.8, 0xc9b28a, 0x8a4a32,'W',{sign:0xc77b4a, chimney:true, doorOpen:true, roof:'gable'});// the Hearthhouse
  makeRange(14.5,16);                                  // public cooking range
  makeBuilding(-19,-14, 4,3.6,2.6, 0xd0bc94, 0x7a5838,'E',{chimney:true}); // cottage row west
  makeBuilding(-22,10, 4,3.6,2.6, 0xc9b28a, 0x6e4a2e,'E');
  makeBuilding(20,-14, 4,3.6,2.8, 0xc4ae84, 0x6e4a2e,'W',{chimney:true, roof:'gable'}); // cottage row east
  makeStall(-3,-17, 0xb03a3a, 'baker');                         // market plaza, clear of the bazaar lane
  makeStall(3,-17, 0x3a6ab0, 'silver');
  makeStall(-9,-18, 0x3a8a4a, 'spice');
  // the east pasture: a proper fenced cow pen with a gate gap
  makeFence(24,-10, 34,-10); makeFence(34,-10, 34,0);
  makeFence(34,0, 24,0);     makeFence(24,0, 24,-6);   // gap at 24,-6..-10 is the gate
  // wheat rows by the hearthhouse
  for(let r=0;r<3;r++) for(let c=0;c<5;c++) makeBush(23+c*1.4, 14+r*1.6);
  // townsfolk idling about the commons — the classic first scrap
  spawnNpc('wanderer', -2, 6);
  spawnNpc('wanderer', 7, -10);
  spawnNpc('wanderer', -10, 18);
  spawnFriendly('friar','Friar Aldous', -4.7,27.3, 0x6b5a3a,'🙏',{robe:0x6b5a3a});   // beside the altar
  // brothers of the Dawn keep the chapel grounds
  spawnNpc('monk', -7, 25); spawnNpc('monk', 0, 28); spawnNpc('monk', -1, 23);
  // moorcalves graze the new pen
  spawnNpc('moorcalf', 28,-5); spawnNpc('moorcalf', 31,-7); spawnNpc('moorcalf', 27,-8);
  /* ---------- the Veyhollow Spire: a wizards' tower on the southeast road ---------- */
  makeTower(30, 72);
  makeBankBooth(34.5, 70, 0.5);                         // the mage bank
  makeStall(25.5, 69.5, 0x5a4a9a);                      // rune-sellers' table
  makeFence(24,76, 36,78);                               // a low boundary behind the tower
  spawnFriendly('archmage','Archmage Sylvarin', 27,69, 0x35418f,'🧙‍♂️',{robe:0x35418f, hat:'wizard'});
  spawnFriendly('spirebanker','Banker Odwin', 35,68.2, 0x39536b,'🧑‍💼');
  spawnNpc('wizard', 28, 75); spawnNpc('wizard', 33, 74); spawnNpc('wizard', 31, 67);
  spawnNpc('wizard', 36, 73);

  /* ============ WHITMOOR HOLD — the white city on the moor ============ */
  // curtain walls with a south gate; two banner towers flank it
  makeStoneWallRun(38,-48, 47,-48);  makeStoneWallRun(53,-48, 62,-48);    // south wall, gate at 47..53
  makeStoneWallRun(38,-76, 62,-76);                                        // north wall
  makeStoneWallRun(38,-48, 38,-76);  makeStoneWallRun(62,-48, 62,-76);    // east & west walls
  makeGateTower(46.4,-48); makeGateTower(53.6,-48);
  // the raised portcullis between the towers, and torchlight on the stone
  (function(){
    const py=gy(50,-48);
    for(let i=0;i<5;i++){
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.09,1.3,0.09), mat(0x3a3632));
      bar.position.set(47.6+i*1.2, py+3.9, -48); scene.add(bar);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.22,4), mat(0x3a3632));
      tip.rotation.x=Math.PI; tip.position.set(47.6+i*1.2, py+3.18, -48); scene.add(tip);
    }
    const cross=new THREE.Mesh(new THREE.BoxGeometry(5.4,0.12,0.12), mat(0x3a3632));
    cross.position.set(50, py+4.4, -48); scene.add(cross);
    for(const tx of [47.8,52.2]){
      const sconce=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.4,0.12), mat(0x4a3a28));
      sconce.position.set(tx, py+2.3, -47.4); scene.add(sconce);
      const flame=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.34,5),
        new THREE.MeshBasicMaterial({color:0xffb24a}));
      flame.position.set(tx, py+2.7, -47.4); scene.add(flame);
      const gl=new THREE.PointLight(0xff9a3a, 0.5, 8); gl.position.set(tx, py+2.8, -47.2); scene.add(gl);
    }
  })();
  // the gate plaza: statue of the First Warden, paved approach
  makeStatue(50,-56);
  // the Keep of Whitmoor, flanked by towers
  makeBuilding(50,-71, 8,5.5,4.6, 0xe6e2d8, 0x5a6474,'S',{doorOpen:true});
  makeGateTower(45,-71.5); makeGateTower(55,-71.5);
  makeInterior('keep', 50,-71, 8,5.5,'S');
  // the bank of Whitmoor
  makeBuilding(42.5,-60, 5.5,4.5,3.4, 0xe6e2d8, 0x5a6474,'E',{sign:0xc9a85a, doorOpen:true, roof:'gable'});
  makeBankBooth(40.8,-60, 0.5);
  makeInterior('bank', 42.5,-60, 5.5,4.5,'E');
  // Marble Arms — the iron-smith of the Hold
  makeBuilding(57.5,-60, 5,4.5,3.2, 0xe6e2d8, 0x5a6474,'W',{sign:0x9a948c, chimney:true, doorOpen:true, roof:'gable'});
  makeInterior('smithy', 57.5,-60, 5,4.5,'W');
  // The Gilded Boar inn
  makeBuilding(42.5,-68.5, 5,4.5,3.2, 0xe2dccc, 0x6e4a2e,'E',{sign:0x6e4a2e, chimney:true, doorOpen:true, roof:'gable'});
  makeInterior('pub', 42.5,-68.5, 5,4.5,'E');
  // homes of the Hold
  makeBuilding(57.5,-68.5, 4,3.6,2.8, 0xe6e2d8, 0x5a6474,'W',{chimney:true, roof:'gable'});
  makeBuilding(57.5,-52.5, 4,3.6,2.8, 0xe6e2d8, 0x5a6474,'W',{chimney:true, roof:'gable'});
  // lamp-lit lane flavor: braziers along the plaza
  for(const [bx,bz] of [[46,-58],[54,-58],[46,-66],[54,-66]]) makeCampfire(bx,bz);
  // the people of Whitmoor
  spawnFriendly('whitbanker','Banker Maren', 40.3,-60, 0x39536b,'🧑‍💼');
  spawnFriendly('marblesmith','Smith Harrad', 57.5,-60.8, 0x5a4a3e,'🛠');
  makeFurnace(54.6,-57.2);
  spawnFriendly('innkeep','Innkeep Bora', 41.8,-69.2, 0x6e4a2e,'🍲');
  spawnFriendly('captain','Captain Veyle', 50,-69.6, 0xd8dce2,'⚔');
  spawnNpc('hold_knight', 47,-54); spawnNpc('hold_knight', 53,-54);
  spawnNpc('hold_knight', 44,-64); spawnNpc('hold_knight', 56,-64);
  spawnNpc('wanderer', 49,-60); spawnNpc('wanderer', 52,-66);
  // the way down: a cave mouth in the keep yard
  makeCaveMouth(54.5,-73.5, 'undercrag', 'Climb down into <b>the Undercrag</b>');

  /* ============ THE UNDERCRAG — the dark beneath the Hold ============ */
  (function(){
    const C=ZONES.undercrag.pos;
    // a ring of cliffs walls the cavern
    for(let i=0;i<14;i++){ const a=i/14*6.283, r=20+Math.random()*4;
      makeCliff(C[0]+Math.cos(a)*r, C[1]+Math.sin(a)*r, 3.4+Math.random()*2.2); }
    for(let i=0;i<10;i++) makeStalagmite(C[0]-14+Math.random()*28, C[1]-14+Math.random()*28);
    makeCrystal(C[0]-8, C[1]-6, 0x7fd4ff); makeCrystal(C[0]+9, C[1]+4, 0x9a7fd4);
    makeCrystal(C[0]+3, C[1]-10, 0x7fd4a0); makeCrystal(C[0]-6, C[1]+9, 0xd47f9a);
    // bones of the unlucky
    for(let i=0;i<5;i++) makeAshPile(C[0]-10+Math.random()*20, C[1]-10+Math.random()*20);
    // the way back up
    makeCaveMouth(C[0]+1.5, C[1]+16, 'whitmoor_top', 'Climb the rope to <b>Whitmoor Hold</b>');
    // the brood, and the mountain's grudge itself
    spawnNpc('deep_crawler', C[0]-7, C[1]-3); spawnNpc('deep_crawler', C[0]+6, C[1]+6);
    spawnNpc('deep_crawler', C[0]+2, C[1]-9);
    spawnNpc('korthul', C[0], C[1]-2);
  })();
  makeCampfire(2,6);
  makeSignpost(0,3.5);
  makeTorch(4,-2); makeTorch(-4,-3);
  makeFence(9.5,-2.5, 9.5,7); makeFence(9.5,7, 2,7);   // hen yard
  makeFence(-10,-1, -10,6); makeFence(-10,6, -5,9);
  for(let i=0;i<10;i++) makeFlower(-12+Math.random()*26, -2+Math.random()*16);
  for(let i=0;i<6;i++) makeBush(-16+Math.random()*34, -14+Math.random()*30);

  spawnFriendly('banker','Banker Tilly', 6,-8.0, 0x39536b,'👩');   // behind the great counter
  spawnFriendly('merchant','Merchant Saff', -7,-8.8, 0x8a3d68,'🧔');
  spawnFriendly('maela','Warden Maela', 3,-5, 0x6b1f1f,'👮');
  spawnFriendly('greeter','Old Pell', -2,8, 0x4a6b3a,'🧓');
  spawnFriendly('olun','Olun the Miller', -40,-28, 0x7a6a32,'👨‍🌾');
  spawnFriendly('barkeep','Barkeep Dunn', -13.4,0.1, 0x6e4a2e,'🍺');   // behind the bar
  spawnFriendly('clothier','Mistress Wynnel', 13.6,-7, 0x8a6a9a,'👗',{hairLong:true});
  spawnFriendly('arcanist','Sage Imbrel', -8.5,14.2, 0x4a3a7a,'🧙',{robe:0x4a3a7a, hat:'wizard'});
  spawnFriendly('ferra','Ferra the Smith', 9,13.4, 0x5a4a3e,'👩‍🏭',{hairLong:true});
  // the grubkin nest: mounds in the meadow northeast, well off the chapel road
  makeMound(24,33,0.9); makeMound(26.5,31.5,0.7); makeMound(25,35,0.8);
  for(let i=0;i<6;i++) spawnNpc('grubkin', 22+Math.random()*6, 30+Math.random()*7);
  // the burrowrat warren: holes dug behind the eastern cottages, raiding the larders
  makeMound(25,-20,0.6); makeMound(26.6,-21.2,0.55); makeMound(24.2,-22,0.5);
  for(let i=0;i<4;i++) spawnNpc('burrowrat', 23.5+Math.random()*4, -22.5+Math.random()*4);
  // the herd grazes the open pasture, as herds do
  for(let i=0;i<3;i++) spawnNpc('moorcalf', 18+Math.random()*12, 12+Math.random()*10);
  for(let i=0;i<4;i++) spawnNpc('pasturehen', 4+Math.random()*4.5, -1.5+Math.random()*7);
  // gnarlgob camp east of town
  makeCampfire(34,16);
  makeHut(37,13,0.7);
  // the gnarlgob war-camp: hide tents, a skull totem, a cookfire — a place, not a scatter
  makeTent(39,18, 0.6); makeTent(42,20.5, -1.2); makeTotem(40.6,17.2);
  makeCampfire(40.5,19.4);
  for(let i=0;i<4;i++) spawnNpc('gnarlgob', 38+Math.random()*5.5, 16.5+Math.random()*5);
  // the Seers' Ring — a circle of standing stones and moss seers
  const SR=[-30,44];   // the ring keeps its distance from the western road
  for(let i=0;i<5;i++){ const a=i/5*6.283;
    makeStandingStone(SR[0]+Math.cos(a)*5.5, SR[1]+Math.sin(a)*5.5, 0.9+Math.random()*0.4); }
  makeAshPile(SR[0],SR[1]);
  // the seers keep their vigil inside the stones — never on the road
  for(let i=0;i<3;i++){
    let sx=SR[0], sz=SR[1];
    for(let tries=0; tries<12; tries++){
      const a=Math.random()*6.283, r=1.5+Math.random()*2.2;
      const cx=SR[0]+Math.cos(a)*r, cz=SR[1]+Math.sin(a)*r;
      if(!nearPath(cx,cz,4.5)){ sx=cx; sz=cz; break; }
    }
    spawnNpc('moss_seer', sx, sz);
  }

  // Emberwood: dense blobby forest + wolves
  const ew=ZONES.emberwood.pos;
  for(let i=0;i<18;i++) makeTree(ew[0]-17+Math.random()*34, ew[1]-17+Math.random()*34);
  for(let i=0;i<6;i++)  makeTree(ew[0]-7+Math.random()*14, ew[1]-7+Math.random()*14);   // the knoll grove proper — always dry
  for(let i=0;i<7;i++) makeBush(ew[0]-15+Math.random()*30, ew[1]-15+Math.random()*30);
  for(let i=0;i<6;i++) makeFlower(ew[0]-12+Math.random()*24, ew[1]-12+Math.random()*24);
  // wolves prowl the deep woods west of the grove — the quest trees sit at the safer east fringe
  for(let i=0;i<3;i++) spawnNpc('mosswolf', ew[0]-24+Math.random()*10, ew[1]-6+Math.random()*14);
  for(let i=0;i<6;i++) makeTree(ew[0]-28+Math.random()*12, ew[1]-8+Math.random()*18);

  // Stonereach Quarry: cliffs ring the copper rocks
  const qy=ZONES.quarry.pos;
  for(let i=0;i<7;i++){ const a=i*0.9, r=16+Math.random()*5;
    makeCliff(qy[0]+Math.cos(a)*r, qy[1]+Math.sin(a)*r, 2.2+Math.random()*1.8); }
  // the quarry seams: copper and tin shallow, iron midway, coal in the deep corner
  const ROCK_SPREAD=['copper','copper','copper','tin','tin','tin','iron','iron','iron','coal','coal'];
  ROCK_SPREAD.forEach((k,i)=>{
    const deep = (k==='coal') ? 0.8 : (k==='iron' ? 0.45 : 0);
    makeRock(qy[0]-13+Math.random()*(26-deep*10)+deep*10, qy[1]-11+Math.random()*22, k);
  });
  // and the Undercrag hides the richest veins, for those who dare mine beside Korthul
  const UC=ZONES.undercrag.pos;
  makeRock(UC[0]-12, UC[1]+8, 'iron'); makeRock(UC[0]+11, UC[1]-7, 'coal');
  makeRock(UC[0]-4, UC[1]+12, 'coal'); makeRock(UC[0]+8, UC[1]+10, 'iron');

  // Mirrorpond: spots float on the water, reeds at the shore
  const pd=ZONES.pond.pos;
  for(let i=0;i<5;i++){ const a=Math.random()*6.28, r=2+Math.random()*5;
    makeFishSpot(pd[0]+Math.cos(a)*r, pd[1]+Math.sin(a)*r, -0.48); }
  for(let i=0;i<9;i++){ const a=Math.random()*6.28;
    makeReed(pd[0]+Math.cos(a)*10.2, pd[1]+Math.sin(a)*10.2); }
  makeCampfire(pd[0]+12, pd[1]+11);

  // Gloomfen: dead trees, mushrooms, wretches, the boss
  const gf=ZONES.gloomfen.pos;
  for(let i=0;i<7;i++) makeTree(gf[0]-16+Math.random()*32, gf[1]-16+Math.random()*32, 'dead');
  for(let i=0;i<5;i++) makeTree(gf[0]-16+Math.random()*32, gf[1]-16+Math.random()*32, 'dark');
  for(let i=0;i<8;i++) makeMushroom(gf[0]-14+Math.random()*28, gf[1]-14+Math.random()*28);
  for(let i=0;i<3;i++) spawnNpc('fenwretch', gf[0]-12+Math.random()*24, gf[1]-12+Math.random()*24);
  spawnNpc('fenlord', gf[0], gf[1]);

  // scattered countryside
  for(let i=0;i<10;i++){ const a=Math.random()*6.28, r=22+Math.random()*18;
    makeTree(Math.cos(a)*r, Math.sin(a)*r); }
  for(let i=0;i<8;i++){ const a=Math.random()*6.28, r=14+Math.random()*26;
    makeStick(Math.cos(a)*r, Math.sin(a)*r); }
  const ew2=ZONES.emberwood.pos;
  for(let i=0;i<7;i++) makeStick(ew2[0]-15+Math.random()*30, ew2[1]-15+Math.random()*30);
  for(let i=0;i<8;i++){ const a=Math.random()*6.28, r=20+Math.random()*30;
    makeBush(Math.cos(a)*r, Math.sin(a)*r); }
}
function populateBrynholt(){
  const b=ZONES.brynholt.pos;
  makeHut(b[0]-5, b[1]-3, 1.1);
  makeHut(b[0]+5, b[1]-1, 1);
  makeHut(b[0], b[1]+6, 0.9);
  makeCampfire(b[0], b[1]);
  makeTorch(b[0]-2, b[1]-6); makeTorch(b[0]+3, b[1]+3);
  for(let i=0;i<4;i++) makeTree(b[0]-14+Math.random()*8, b[1]-8+Math.random()*16);
  for(let i=0;i<3;i++) makeStick(b[0]-6+Math.random()*12, b[1]-6+Math.random()*12);
  spawnFriendly('fletcher','Bowyer Hask', b[0]+2, b[1]-5, 0x7a3d2a,'🏹');
  for(let i=0;i<4;i++) spawnNpc('bryn_raider', b[0]-10+Math.random()*20, b[1]-10+Math.random()*20);
}
function populateDunes(){
  const d=ZONES.dunes.pos;
  makeBuilding(d[0], d[1]-6, 5,4.5,3, 0xd8c08a, 0xb89a5e); // sandstone trading post
  for(let i=0;i<8;i++) makeCactus(d[0]-18+Math.random()*36, d[1]-14+Math.random()*28);
  for(let i=0;i<4;i++) makeCliff(d[0]-16+Math.random()*32, d[1]-12+Math.random()*24, 0.8+Math.random()*0.8);
  spawnFriendly('duneTrader','Trader Soleh', d[0]+2, d[1]-3, 0xc4883a,'🧕',{hairLong:true});
  for(let i=0;i<5;i++) spawnNpc('duneclaw', d[0]-15+Math.random()*30, d[1]-12+Math.random()*24);
  for(let i=0;i<2;i++) spawnNpc('hex_adept', d[0]+8+Math.random()*10, d[1]+8+Math.random()*8);
}
function populateScarlands(){
  // gate warning at the edge
  makeSignpost(0, SCAR_EDGE-2);
  makeTorch(-3, SCAR_EDGE-2); makeTorch(3, SCAR_EDGE-2);
  for(let i=0;i<10;i++){
    const x=-40+Math.random()*80, z=SCAR_EDGE+5+Math.random()*55;
    Math.random()<0.6 ? makeTree(x,z,'dead') : makeAshPile(x,z);
  }
  for(let i=0;i<5;i++) makeCliff(-35+Math.random()*70, SCAR_EDGE+10+Math.random()*50, 1+Math.random());
  // mid-threat: gravewights; deep threat: ash stalkers
  for(let i=0;i<4;i++) spawnNpc('gravewight', -25+Math.random()*50, SCAR_EDGE+8+Math.random()*20);
  for(let i=0;i<3;i++) spawnNpc('ash_stalker', -25+Math.random()*50, SCAR_EDGE+34+Math.random()*22);
  for(let i=0;i<2;i++) spawnNpc('hex_adept', -20+Math.random()*40, SCAR_EDGE+20+Math.random()*15);
}
function populateArena(){
  const a=ZONES.arena.pos;
  // octagonal fence ring
  const R=10;
  for(let i=0;i<8;i++){
    const a1=i/8*6.283, a2=(i+1)/8*6.283;
    makeFence(a[0]+Math.cos(a1)*R, a[1]+Math.sin(a1)*R, a[0]+Math.cos(a2)*R, a[1]+Math.sin(a2)*R);
  }
  makeTorch(a[0]-R-1, a[1]); makeTorch(a[0]+R+1, a[1]);
  makeTorch(a[0], a[1]-R-1); makeTorch(a[0], a[1]+R+1);
  makeSignpost(a[0]-R-2, a[1]+6);
  spawnFriendly('duelmaster','Pit Master Korr', a[0]-R+1, a[1]+7, 0x6b2a1a,'🥊');
  // two resident duelists, forever sparring
  WORLD.sparring = [];
  for(let i=0;i<2;i++){
    const m = humanoid(i?0x8a5a32:0x4a4a5a, {beard:i===0});
    m.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    holdWeapon(m.userData.parts.handR, swordMesh(METALS.iron), {model:'sword'});
    const tag=makeNameTag(i?'Pit_Brawler':'Iron_Maev'); tag.position.y=2.25; m.add(tag);
    m.position.set(a[0]+(i?1.4:-1.4), gy(a[0],a[1]), a[1]);
    m.lookAt(a[0]+(i?-5:5), m.position.y, a[1]);
    scene.add(m);
    WORLD.sparring.push({mesh:m, t:Math.random()*2});
  }
}
function updateSparring(dt){
  if(!WORLD.sparring) return;
  WORLD.sparring.forEach((s,i)=>{
    s.t-=dt;
    walkAnim(s.mesh, false, dt);
    if(s.t<=0){
      s.t=1.6+Math.random()*1.4;
      swing(s.mesh);
      const other=WORLD.sparring[1-i];
      if(other && Math.random()<0.6){
        const d=Math.random()<0.35?0:Math.ceil(Math.random()*3);
        UI.floatDmg(other.mesh, d);
      }
    }
  });
}
function populateHolm(){
  const h=ZONES.holm.pos;
  spawnFriendly('bram','Guide Bram', h[0]-4, h[1]+6, 0x4a5a7a,'🧓');
  makeRowboat(h[0]-8, h[1]+10, 0.7);
  for(let i=0;i<4;i++) makeTree(h[0]+6+Math.random()*8, h[1]-2+Math.random()*10);
  // fishing spots sit ON the pond water
  const wy = gy(HOLM_POND.x, HOLM_POND.z) + 0.66;
  makeFishSpot(HOLM_POND.x-1.6, HOLM_POND.z-0.8, wy);
  makeFishSpot(HOLM_POND.x+1.8, HOLM_POND.z+1.2, wy);
  for(let i=0;i<6;i++){ const a=Math.random()*6.28;
    makeReed(HOLM_POND.x+Math.cos(a)*(HOLM_POND.r+0.9), HOLM_POND.z+Math.sin(a)*(HOLM_POND.r+0.9)); }
  for(let i=0;i<3;i++) makeStick(h[0]+2+Math.random()*10, h[1]-4+Math.random()*8);
  makeCampfire(h[0], h[1]+2);
  spawnNpc('grubkin', h[0]+8, h[1]+8);
  spawnNpc('grubkin', h[0]+11, h[1]+5);
  spawnNpc('bogling', h[0]+5, h[1]+4);          // pipeline-authored demo creature
  spawnNpc('bogling', h[0]+7, h[1]+1);
  for(let i=0;i<4;i++) makeBush(h[0]-6+Math.random()*14, h[1]-4+Math.random()*12);
  for(let i=0;i<5;i++) makeFlower(h[0]-6+Math.random()*14, h[1]-2+Math.random()*10);
  makeSignpost(h[0]-6, h[1]+8);
  // image-to-3D props: a little starter farm + camp supplies (Gemini sprite -> Hunyuan3D-2)
  // crop rows, west of the camp
  placeProp('cabbage', h[0]-3,   h[1]+4);
  placeProp('cabbage', h[0]-2,   h[1]+5);
  placeProp('cabbage', h[0]-3.6, h[1]+5.4);
  placeProp('potato',  h[0]-5,   h[1]+3.2);
  placeProp('potato',  h[0]-5.8, h[1]+3.9);
  placeProp('onion',   h[0]-6.4, h[1]+2.6);
  placeProp('carrot',  h[0]-5.4, h[1]+1.9);
  placeProp('carrot',  h[0]-4.5, h[1]+2.4);
  placeProp('wheat',   h[0]-7.6, h[1]+4.2);
  placeProp('wheat',   h[0]-7.0, h[1]+5.2);
  // camp supplies, by the campfire
  placeProp('crate',   h[0]+2.4, h[1]+3.4);
  placeProp('barrel',  h[0]+3.4, h[1]+2.6);
  placeProp('bucket',  h[0]+2.8, h[1]+4.4);
  placeProp('sack',    h[0]+1.6, h[1]+4.2);
}

/* ---------- AUTHORED CHUNK #1: a starter town square (reviewable) ----------
   Hand-placed using the library builders: textured hall + houses, bank, stalls,
   cobble plaza, statue, fences, props, townsfolk, and an enemy at the edge. */
function buildStarterTown(cx,cz){
  const D = window.Decor || {};
  const pathMat = (typeof TEX!=='undefined' && TEX.cobble) ? new THREE.MeshLambertMaterial({map:TEX.cobble}) : mat(0x8a8276);
  const pathTile=(x,z,s)=>{ s=s||2.05; const t=new THREE.Mesh(new THREE.BoxGeometry(s,0.08,s),pathMat);
    t.position.set(x, gy(x,z)+0.05, z); t.receiveShadow=true; scene.add(t); };
  // cobble cross through the plaza
  for(let i=-3;i<=3;i++){ pathTile(cx+i*2, cz); pathTile(cx, cz+i*2); }
  // town hall (north) with a bank booth, central statue
  makeTexHouse(cx, cz-7.5, {w:5.6,d:5,label:'Enter <b>Town Hall</b>'});
  makeBankBooth(cx, cz-4.3);
  makeStatue(cx, cz);
  // market stalls + corner houses
  makeStall(cx-6, cz-0.5, 0xb03a3a);
  makeStall(cx+6, cz-0.5, 0x3a6ab0);
  makeTexHouse(cx-8, cz+6, {w:4.2,d:4.2});
  makeTexHouse(cx+8, cz+6, {w:4.2,d:4.2});
  makeSignpost(cx-2.4, cz+5);
  makeCampfire(cx+4, cz+5);
  // greenery
  for(const [dx,dz] of [[-11,-6],[11,-7],[-12,9],[12,10]]) makeTree(cx+dx, cz+dz);
  for(let i=0;i<6;i++) makeBush(cx-12+Math.random()*24, cz-9+Math.random()*20);
  for(let i=0;i<8;i++) makeFlower(cx-9+Math.random()*18, cz-5+Math.random()*12);
  // decor props
  if(D.fencePost){ for(const fx of [-9,-7,-5,5,7,9]) D.fencePost(cx+fx, cz+11); }
  if(D.barrel){ D.barrel(cx-5.6,cz-1.4); D.barrel(cx-6.4,cz-1.0); }
  if(D.crate){ D.crate(cx+5.7,cz-1.4); }
  if(D.bookcase){ D.bookcase(cx+1.7, cz-8.7); }
  if(D.cabbage){ for(let i=0;i<6;i++) D.cabbage(cx-9+i*0.75, cz+3.2+(i%2)*0.6); }
  // townsfolk + a lurking enemy
  spawnFriendly('townelder','Elder Marn', cx+2.2, cz+2.4, 0x5a4a6a, '🧓');
  spawnFriendly('townsmith','Smith Bryn', cx-6, cz-1.8, 0x5a4a3e, '🧔');
  spawnNpc('skeleton', cx-11, cz+12);
}

