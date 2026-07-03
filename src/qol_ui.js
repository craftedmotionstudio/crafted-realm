/* ============ UI quality-of-life (GOAL.md §15 Batch B) ============
 * 1. Bank: total vault value + live search filter (injected into the bank modal)
 * 2. Gear presets: save/load up to 3 equipment loadouts at the bank (best-effort
 *    restore from vault + inventory, reports anything missing)
 * 3. Menu-entry swapper: shift+right-click → "Set left-click: X" per target name;
 *    rules persist and reorder the menu, and since left-click now runs the TOP
 *    entry (game4_ui), the swap remaps left-click too — the RuneLite behavior
 * 4. Drop-table lookup: right-click any monster → "Drop table"
 * 5. World map: click anywhere on the map → walk there (destination pin drawn)
 * 6. Generated game-settings section in the Overlays panel (run/music/save)
 */

/* ---------- 1 + 2: bank value, search, presets ---------- */
const BankQoL = {
  wrap(){
    if(this._wrapped || typeof UI==='undefined' || !UI.openBank) return;
    const orig=UI.openBank.bind(UI);
    UI.openBank=(announce)=>{ orig(announce); try{ this.inject(); }catch(e){} };
    this._wrapped=true;
  },
  value(){ return (Player.bank||[]).reduce((a,s)=>a+((ITEMS[s.id]&&ITEMS[s.id].value||0)*s.qty),0); },
  inject(){
    const modal=document.getElementById('bank-modal'); if(!modal) return;
    const grid=document.getElementById('bank-grid'); if(!grid) return;
    let bar=document.getElementById('bank-qol-bar');
    if(!bar){
      bar=document.createElement('div'); bar.id='bank-qol-bar';
      bar.style.cssText='display:flex;gap:8px;align-items:center;margin:2px 0 6px;flex-wrap:wrap;';
      grid.parentElement.insertBefore(bar, grid);
    }
    bar.innerHTML=`<span style="color:#ffd24a;font-weight:bold">Vault value: ${this.value().toLocaleString()} gp</span>`+
      `<input id="bank-search" placeholder="Search the vault…" style="flex:1;min-width:110px;padding:3px 6px;`+
      `background:#1e1a14;color:#ffd24a;border:2px inset #6b5f4a;font:11px Verdana">`+
      `<span id="bank-presets"></span>`;
    const inp=document.getElementById('bank-search');
    inp.oninput=()=>{
      const q=inp.value.toLowerCase();
      [...grid.children].forEach((el,i)=>{
        const s=Player.bank[i];
        const name=s&&ITEMS[s.id]?ITEMS[s.id].name.toLowerCase():'';
        el.style.display=(!q||name.includes(q))?'':'none';
      });
    };
    // presets: 3 slots, save = 📥 hold-free simple buttons
    const box=document.getElementById('bank-presets');
    const sets=this.presets();
    box.innerHTML='Presets: '+[0,1,2].map(i=>
      `<button data-i="${i}" class="preset-load" style="padding:2px 7px;margin:0 1px;background:#4f483c;`+
      `color:${sets[i]?'#ffd24a':'#7a7265'};border:2px outset #6b5f4a;cursor:pointer;font-size:10px">${i+1}</button>`).join('')+
      `<button id="preset-save" style="padding:2px 7px;margin-left:3px;background:#5a4a2c;color:#ffd24a;`+
      `border:2px outset #8a6a3c;cursor:pointer;font-size:10px" title="Save current gear as a preset">💾</button>`;
    box.querySelectorAll('.preset-load').forEach(b=>{
      b.onclick=()=>this.load(+b.dataset.i);
    });
    document.getElementById('preset-save').onclick=()=>{
      const i=sets.findIndex(s=>!s);
      const slot=i>=0?i:0;
      sets[slot]=Object.assign({}, Player.equip);
      this.save(sets);
      UI.chat(`Gear preset ${slot+1} saved.`,'sys');
      this.inject();
    };
  },
  presets(){ try{ return JSON.parse(localStorage.getItem('cr_gear_presets')||'[null,null,null]'); }
             catch(e){ return [null,null,null]; } },
  save(s){ try{ localStorage.setItem('cr_gear_presets', JSON.stringify(s)); }catch(e){} },
  load(i){
    const p=this.presets()[i];
    if(!p){ UI.chat('That preset slot is empty — press 💾 to save your current gear.','plain'); return; }
    const missing=[];
    for(const slot in p){
      const want=p[slot];
      if(!want || Player.equip[slot]===want) continue;
      // find it in the inventory or the vault
      const inInv=Player.inv.findIndex(s=>s&&s.id===want);
      const inBank=Player.bank.findIndex(s=>s.id===want);
      if(inInv<0 && inBank<0){ missing.push(ITEMS[want]?ITEMS[want].name:want); continue; }
      // the old piece goes to the vault
      if(Player.equip[slot]){
        const old=Player.equip[slot];
        const ex=Player.bank.find(b=>b.id===old);
        if(ex) ex.qty++; else Player.bank.push({id:old, qty:1});
      }
      if(inInv>=0){ const s=Player.inv[inInv]; if(s.qty>1) s.qty--; else Player.inv[inInv]=null; }
      else { const s=Player.bank[inBank]; if(s.qty>1) s.qty--; else Player.bank.splice(inBank,1); }
      Player.equip[slot]=want;
    }
    if(typeof refreshPlayerGear==='function') refreshPlayerGear();
    UI.refreshEquip(); UI.refreshInv(); UI.refreshHud(); UI.openBank(false);
    UI.chat(missing.length?`Preset loaded — missing: ${missing.join(', ')}.`:`Preset ${i+1} equipped.`,'sys');
  }
};
BankQoL.wrap();

/* ---------- 3 + 4: menu swapper + drop-table lookup (one menu wrap) ---------- */
const MenuQoL = {
  rules:(()=>{ try{ return JSON.parse(localStorage.getItem('cr_menu_swaps')||'{}'); }
               catch(e){ return {}; } })(),
  _shift:false,
  saveRules(){ try{ localStorage.setItem('cr_menu_swaps', JSON.stringify(this.rules)); }catch(e){} },
  text(html){ return String(html).replace(/<[^>]+>/g,''); },
  targetKey(hit){
    const u=hit&&hit.obj&&hit.obj.userData;
    if(!u) return null;
    if(u.kind==='npc'&&u.npc) return 'npc:'+u.npc.t.name;
    if(u.kind==='friendly') return 'npc:'+u.name;
    return u.kind ? u.kind+':'+this.text(u.label||'') : null;
  },
  wrap(){
    if(this._wrapped || typeof buildCtxEntries!=='function') return;
    const orig=buildCtxEntries;
    const self=this;
    buildCtxEntries=function(hit, e){
      let entries=orig(hit, e);
      const key=self.targetKey(hit);
      const realList=entries.slice(0, Math.max(0, entries.length-2));   // minus Walk here + Cancel
      // apply a saved swap: move the matching entry to the top
      if(key && self.rules[key]){
        const i=entries.findIndex(en=>self.text(en.html)===self.rules[key]);
        if(i>0){ const [en]=entries.splice(i,1); entries.unshift(en); }
      }
      // drop-table lookup on monsters
      const u=hit&&hit.obj&&hit.obj.userData;
      if(u && u.kind==='npc' && u.npc && u.npc.t.drops){
        entries.splice(entries.length-2, 0,
          {html:`Drop table <b>${u.npc.t.name}</b>`, fn:()=>self.showDrops(u.npc.t)});
      }
      // shift+right-click: configure the left-click for this target
      if(key && self._shift && realList.length>1){
        realList.forEach(en=>{
          const label=self.text(en.html);
          entries.splice(entries.length-2, 0,
            {html:`⇄ Left-click: <b>${label}</b>`, fn:()=>{
              self.rules[key]=label; self.saveRules();
              UI.chat(`Left-click for ${key.split(':')[1]} is now “${label}”.`,'sys');
            }});
        });
      }
      return entries;
    };
    addEventListener('keydown', e=>{ if(e.key==='Shift') self._shift=true; });
    addEventListener('keyup',   e=>{ if(e.key==='Shift') self._shift=false; });
    this._wrapped=true;
  },
  showDrops(t){
    let m=document.getElementById('droptable-modal');
    if(!m){
      m=document.createElement('div'); m.id='droptable-modal'; m.className='modal steel';
      m.style.cssText='display:none;max-width:320px;';
      document.body.appendChild(m);
    }
    const rows=(t.drops||[]).map(d=>{
      const def=ITEMS[d.id]||{name:d.id};
      const q=Array.isArray(d.q)?d.q[0]+'–'+d.q[1]:d.q;
      const pct=d.p>=1?'Always':(d.p*100).toFixed(d.p<0.05?1:0)+'%';
      return `<tr><td style="padding:2px 8px 2px 0;color:#d8ccb4">${def.name}</td>`+
             `<td style="padding:2px 8px 2px 0;color:#c0b49a">×${q}</td>`+
             `<td style="color:${d.p>=1?'#00e000':d.p>=0.2?'#ffd24a':'#ff9040'}">${pct}</td></tr>`;
    }).join('');
    m.innerHTML=`<span class="close-x" onclick="this.parentElement.style.display='none'">✕</span>`+
      `<div class="osrs-title" style="text-align:center;margin-bottom:6px">${t.name} — drops</div>`+
      `<table style="font-size:11px;margin:0 auto">${rows}</table>`;
    m.style.display='block';
  }
};
MenuQoL.wrap();

/* ---------- 5: world map — click to walk (destination pin) ---------- */
const MapQoL = {
  dest:null,
  walkTo(wx, wz){   // the ONE pin/walk path — map clicks + the name search both land here
    const y=(typeof groundY==='function')?groundY(wx,wz):0;
    if(y===null || y<-1.15){ UI.chat('You can’t walk there — that’s open water.','plain'); return false; }
    this.dest={x:wx,z:wz};
    if(typeof minimapWalkTo==='function') minimapWalkTo(new THREE.Vector3(wx,y,wz));
    UI.closeModal ? UI.closeModal('worldmap-modal')
                  : (document.getElementById('worldmap-modal').style.display='none');
    UI.chat('You set off toward the marked spot.','plain');
    return true;
  },
  hook(){
    const c=document.getElementById('worldmap'); if(!c || c._qol) return;
    c._qol=true; c.style.cursor='crosshair';
    c.addEventListener('click', e=>{
      const r=c.getBoundingClientRect();
      const fx=(e.clientX-r.left)/r.width, fz=(e.clientY-r.top)/r.height;
      const wx=WMAP.x0+fx*(WMAP.x1-WMAP.x0), wz=WMAP.z0+fz*(WMAP.z1-WMAP.z0);
      this.walkTo(wx, wz);
    });
    // draw the pin over the map whenever it redraws
    if(typeof drawWorldMap==='function' && !this._wrapped){
      const orig=drawWorldMap;
      const self=this;
      drawWorldMap=function(){
        orig();
        if(!self.dest) return;
        const ctx=c.getContext('2d'), S=c.width;
        const px=(self.dest.x-WMAP.x0)/(WMAP.x1-WMAP.x0)*S, pz=(self.dest.z-WMAP.z0)/(WMAP.z1-WMAP.z0)*S;
        ctx.fillStyle='#ff3333'; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(px, pz, 5, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff'; ctx.font='bold 10px Verdana'; ctx.fillText('✕', px-3.5, pz+3.5);
      };
      this._wrapped=true;
    }
  }
};
addEventListener('DOMContentLoaded', ()=>MapQoL.hook());
setTimeout(()=>MapQoL.hook(), 2000);   // in case the modal markup lands late

/* ---------- 6: generated game-settings section in the Overlays panel ---------- */
const GAME_SETTINGS = [
  {id:'run',    name:'Toggle run',        act:()=>UI.toggleRun()},
  {id:'music',  name:'Toggle music',      act:()=>UI.toggleMusic()},
  {id:'save',   name:'Save game now',     act:()=>{ UI.manualSave(); UI.chat('Game saved.','sys'); }},
  {id:'map',    name:'Open world map',    act:()=>UI.openWorldMap()},
];
(function(){
  if(typeof Overlays==='undefined') return;
  const orig=Overlays._renderList.bind(Overlays);
  Overlays._renderList=function(){
    orig();
    const host=document.getElementById('overlays-list'); if(!host) return;
    let sec=document.getElementById('overlays-settings');
    if(sec) sec.remove();
    sec=document.createElement('div'); sec.id='overlays-settings';
    sec.innerHTML=`<div class="osrs-title" style="font-size:11px;margin:8px 0 4px;border-top:1px solid #5d5447;padding-top:6px">Game settings</div>`+
      GAME_SETTINGS.map(s=>`<button data-id="${s.id}" style="margin:2px 3px 2px 0;padding:3px 8px;`+
        `background:#4f483c;color:#ffd24a;border:2px outset #6b5f4a;cursor:pointer;font-size:10px">${s.name}</button>`).join('');
    host.appendChild(sec);
    sec.querySelectorAll('button').forEach(b=>{
      b.onclick=()=>{ const s=GAME_SETTINGS.find(x=>x.id===b.dataset.id); if(s) try{ s.act(); }catch(e){} };
    });
  };
})();
