/* ============ Overlays — RuneLite-style toggleable overlay layer ============
 * OverlayManager (GOAL.md §14-15): feature modules register
 *   Overlays.register({id, name, desc, defaultOn, start(), stop()})
 * and get a persisted per-user toggle (localStorage `cr_overlays`) plus a row in
 * a GENERATED settings list — one consistent tree, no hand-built UI per feature.
 * First registered overlay: the XP session tracker (session XP, XP/hr,
 * xp-to-next-level and time-to-level per skill, RuneLite-style).
 * Open the panel with the 📊 button under the minimap (next to the world map)
 * or Shift+L. New overlays = new register() calls, zero core edits.
 */

const Overlays = {
  _defs: [],
  _on: (()=>{ try{ return JSON.parse(localStorage.getItem('cr_overlays')||'{}'); }
              catch(e){ return {}; } })(),
  _save(){ try{ localStorage.setItem('cr_overlays', JSON.stringify(this._on)); }catch(e){} },
  enabled(id){
    const d=this._defs.find(x=>x.id===id);
    return this._on[id]!==undefined ? !!this._on[id] : !!(d && d.defaultOn);
  },
  register(def){
    this._defs.push(def);
    if(this.enabled(def.id)){ try{ def.start && def.start(); }catch(e){} def._live=true; }
  },
  toggle(id, on){
    const d=this._defs.find(x=>x.id===id); if(!d) return;
    const want = (on!==undefined) ? !!on : !this.enabled(id);
    this._on[id]=want; this._save();
    if(want && !d._live){ try{ d.start && d.start(); }catch(e){} d._live=true; }
    else if(!want && d._live){ try{ d.stop && d.stop(); }catch(e){} d._live=false; }
    this._renderList();
  },
  /* ---- the generated settings panel (a .steel modal, like the world map) ---- */
  _panel:null,
  openPanel(){
    if(!this._panel){
      const m=document.createElement('div');
      m.className='modal steel'; m.id='overlays-modal';
      m.style.cssText='display:none;max-width:340px;';
      m.innerHTML='<span class="close-x" onclick="Overlays.closePanel()">✕</span>'+
        '<div class="osrs-title" style="text-align:center;margin-bottom:6px">Overlays</div>'+
        '<div id="overlays-list"></div>'+
        '<div style="color:#9a8e78;font-size:10px;margin-top:6px;text-align:center">'+
        'Toggles persist on this device. Shift+L opens this panel.</div>';
      document.body.appendChild(m);
      this._panel=m;
    }
    this._renderList();
    this._panel.style.display='block';
  },
  closePanel(){ if(this._panel) this._panel.style.display='none'; },
  _renderList(){
    const host=document.getElementById('overlays-list'); if(!host) return;
    host.innerHTML=this._defs.map(d=>
      `<label style="display:flex;gap:8px;align-items:flex-start;padding:5px 2px;cursor:pointer">`+
      `<input type="checkbox" ${this.enabled(d.id)?'checked':''} `+
      `onchange="Overlays.toggle('${d.id}')" style="margin-top:2px">`+
      `<span><b style="color:#ffd24a">${d.name}</b>`+
      `<br><span style="color:#c0b49a;font-size:10px">${d.desc||''}</span></span></label>`
    ).join('');
  }
};

/* the 📊 launcher rides under the minimap next to the world-map button */
addEventListener('DOMContentLoaded', ()=>{
  const wb=document.getElementById('worldmap-btn');
  if(wb && wb.parentElement){
    const b=document.createElement('button');
    b.id='overlays-btn'; b.textContent='\u{1F4CA}'; b.title='Overlays (Shift+L)';
    b.style.cssText='position:absolute;left:calc(50% + 34px);transform:translateX(-50%);'+
      'bottom:-30px;width:30px;height:26px;background:#4f483c;color:#ffd24a;'+
      'border:2px outset #6b5f4a;cursor:pointer;font-size:13px;line-height:1;';
    b.onclick=()=>Overlays.openPanel();
    wb.parentElement.appendChild(b);
  }
});
addEventListener('keydown', e=>{
  if((e.key==='L'||e.key==='l') && e.shiftKey &&
     !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
    e.preventDefault();
    const p=document.getElementById('overlays-modal');
    (p && p.style.display==='block') ? Overlays.closePanel() : Overlays.openPanel();
  }
});

/* ============ Overlay #1: XP session tracker ============
 * RuneLite-style: hooks UI.xpDrop (the single funnel every addXp already feeds),
 * accumulates per-skill session XP, and shows XP/hr + xp-to-level + time-to-level.
 * The per-skill clock starts at that skill's FIRST drop (honest rates, not
 * diluted by time spent before training started). */
const XPTracker = {
  data:{},              // skill -> {xp, t0}
  _el:null, _iv:null, _hooked:false,
  add(skill, amt){
    if(!this.data[skill]) this.data[skill]={xp:0, t0:performance.now()};
    this.data[skill].xp+=amt;
    this.render();
  },
  hook(){
    if(this._hooked || typeof UI==='undefined' || !UI.xpDrop) return;
    const orig=UI.xpDrop.bind(UI);
    const self=this;
    UI.xpDrop=function(skill, amt){ try{ if(self._on) self.add(skill, amt); }catch(e){} return orig(skill, amt); };
    this._hooked=true;
  },
  _fmt(n){ return n>=1e6 ? (n/1e6).toFixed(1)+'m' : n>=1e4 ? Math.round(n/1e3)+'k' : String(Math.round(n)); },
  _ttl(ms){ if(!isFinite(ms)) return '—';
    const m=Math.round(ms/60000); return m<60 ? m+'m' : (m/60).toFixed(1)+'h'; },
  render(){
    if(!this._el) return;
    const rows=Object.keys(this.data).map(s=>{
      const d=this.data[s];
      const hrs=(performance.now()-d.t0)/3600000;
      const rate=hrs>0.0003 ? d.xp/hrs : 0;
      let goal='';
      if(typeof Player!=='undefined' && Player.xp && Player.xp[s]!==undefined &&
         typeof levelFromXp==='function' && typeof XP_TABLE!=='undefined'){
        const lv=levelFromXp(Player.xp[s]);
        if(lv<99){
          const left=XP_TABLE[lv+1]-Player.xp[s];
          goal=`lvl ${lv} · ${this._fmt(left)} to ${lv+1}`+
               (rate>0 ? ` · ${this._ttl(left/rate*3600000)}` : '');
        } else goal='lvl 99';
      }
      return `<div style="padding:2px 0;border-bottom:1px solid rgba(93,84,71,.5)">`+
        `<b style="color:#ffd24a">${s}</b> <span style="color:#00e000">+${this._fmt(d.xp)}</span>`+
        ` <span style="color:#c0b49a">(${this._fmt(rate)}/hr)</span>`+
        (goal?`<br><span style="color:#9a8e78;font-size:10px">${goal}</span>`:'')+`</div>`;
    });
    this._el.innerHTML=rows.length
      ? `<div class="osrs-title" style="font-size:11px;margin-bottom:2px">XP this session</div>`+rows.join('')
      : '';
    this._el.style.display=rows.length?'block':'none';
  },
  start(){
    this._on=true; this.hook();
    if(!this._el){
      const e=document.createElement('div');
      e.id='xp-tracker';
      e.style.cssText='position:absolute;top:64px;left:8px;width:185px;z-index:26;'+
        'background:rgba(43,37,28,.88);border:2px solid;border-color:#7a7265 #241f17 #241f17 #7a7265;'+
        'padding:5px 7px;font-size:11px;color:#d8ccb4;display:none;pointer-events:none;';
      document.body.appendChild(e);
      this._el=e;
    }
    this.render();
    this._iv=setInterval(()=>this.render(), 1000);   // keep XP/hr and TTL ticking
  },
  stop(){
    this._on=false;
    if(this._iv){ clearInterval(this._iv); this._iv=null; }
    if(this._el) this._el.style.display='none';
  }
};
Overlays.register({
  id:'xp-tracker', name:'XP session tracker',
  desc:'Session XP, XP/hr, xp-to-level and time-to-level per skill. Clock starts at each skill’s first drop.',
  defaultOn:true,
  start:()=>XPTracker.start(), stop:()=>XPTracker.stop()
});
