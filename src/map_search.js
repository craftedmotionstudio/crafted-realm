/* ============ World map name search (GOAL.md §15 "name search (V1)") ============
 * OSRS-style: type a place name in the world map modal, pick a suggestion
 * (click / arrows+Enter), the map highlights it with a pulsing gold marker;
 * a second Enter — or clicking the marker on the map — sets the click-to-walk
 * destination pin via MapQoL.walkTo (the one existing pin/walk path).
 * Sources (no new registry): ZONES from game1_data + named friendly NPCs
 * already living in WORLD.clickables (quest givers, shopkeepers, bankers…).
 */
const MapSearch = {
  mark:null,        // {x,z,name} — the gold highlight painted on the map
  _armed:null,      // entry primed by the first Enter; the second Enter walks
  _list:[],         // current suggestions
  _sel:0,           // keyboard-selected suggestion index
  _hintDefault:null,

  entries(){
    const out=[];
    if(typeof ZONES!=='undefined'){
      for(const k in ZONES){ const z=ZONES[k];
        if(z.name && z.pos) out.push({name:z.name, x:z.pos[0], z:z.pos[1], kind:'Zone'}); }
    }
    if(typeof WORLD!=='undefined' && WORLD.clickables){
      const seen={};
      for(const o of WORLD.clickables){
        const u=o.userData;
        if(u && u.kind==='friendly' && u.name && !seen[u.name]){
          seen[u.name]=1;
          out.push({name:u.name, x:o.position.x, z:o.position.z, kind:'NPC'});
        }
      }
    }
    return out;
  },

  inject(){
    const modal=document.getElementById('worldmap-modal'); if(!modal) return;
    if(!document.getElementById('map-search')){
      const wrap=document.createElement('div');
      wrap.id='map-search-wrap';
      wrap.style.cssText='position:relative;margin:4px auto 0;width:min(84vw,560px);';
      wrap.innerHTML=
        '<input id="map-search" placeholder="Search the map… (zones, folk)" autocomplete="off" '+
          'style="width:100%;box-sizing:border-box;padding:4px 7px;background:#1e1a14;color:#ffd24a;'+
          'border:2px inset #6b5f4a;font:11px Verdana;outline:none">'+
        '<div id="map-search-list" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:40;'+
          'background:#2b251c;border:2px solid #6b5f4a;border-top:0;max-height:180px;overflow-y:auto;'+
          'font:11px Verdana;box-shadow:0 4px 10px rgba(0,0,0,.6)"></div>';
      modal.insertBefore(wrap, document.getElementById('worldmap'));
      const st=document.createElement('style');
      st.textContent='#map-search-list .map-sugg:hover{background:#4f483c;color:#ffe9b0}';
      document.head.appendChild(st);
      this.wire();
    }
    // wrap the map painter once so the highlight survives every redraw
    if(!this._wrapped && typeof drawWorldMap==='function'){
      const orig=drawWorldMap, self=this;
      drawWorldMap=function(){ orig(); self.paintMark(); };
      this._wrapped=true;
    }
  },

  wire(){
    const inp=document.getElementById('map-search'), self=this;
    // typing here must NEVER reach the game hotkeys (belt: the global handlers
    // already skip INPUT targets; braces: stop the bubble at the source)
    inp.addEventListener('keyup',    e=>e.stopPropagation());
    inp.addEventListener('keypress', e=>e.stopPropagation());
    inp.addEventListener('keydown', e=>{
      e.stopPropagation();
      if(e.key==='ArrowDown'){ e.preventDefault(); self.move(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); self.move(-1); }
      else if(e.key==='Enter'){
        e.preventDefault();
        if(self._list.length) self.select(self._list[Math.min(self._sel, self._list.length-1)]);
        else if(self._armed && typeof MapQoL!=='undefined'){
          const a=self._armed;
          if(MapQoL.walkTo(a.x, a.z)) self.reset(true);
        }
      }
      else if(e.key==='Escape'){ self.reset(); inp.blur(); }
    });
    inp.addEventListener('input', ()=>self.refresh());
  },

  refresh(){
    this._armed=null;
    const inp=document.getElementById('map-search');
    const q=inp.value.trim().toLowerCase();
    if(!q){ this._list=[]; this.render(); return; }
    const hits=this.entries().filter(e=>e.name.toLowerCase().includes(q));
    hits.sort((a,b)=>{
      const ap=a.name.toLowerCase().startsWith(q)?0:1, bp=b.name.toLowerCase().startsWith(q)?0:1;
      return ap-bp || a.name.localeCompare(b.name);
    });
    this._list=hits.slice(0,8); this._sel=0;
    this.render();
  },

  render(){
    const list=document.getElementById('map-search-list'); if(!list) return;
    if(!this._list.length){ list.style.display='none'; list.innerHTML=''; return; }
    list.innerHTML=this._list.map((e,i)=>
      '<div class="map-sugg" data-i="'+i+'" style="padding:3px 8px;cursor:pointer;display:flex;'+
      'justify-content:space-between;'+(i===this._sel?'background:#4f483c;color:#ffe9b0':'color:#d8ccb4')+'">'+
      '<span>'+e.name+'</span><span style="color:#9a8e78;font-size:10px">'+e.kind+'</span></div>').join('');
    list.style.display='block';
    const self=this;
    list.querySelectorAll('.map-sugg').forEach(el=>{
      el.onclick=()=>{ const en=self._list[+el.dataset.i]; if(en) self.select(en); };
    });
  },

  move(d){
    if(!this._list.length) return;
    this._sel=(this._sel+d+this._list.length)%this._list.length;
    this.render();
  },

  select(e){
    this.mark={x:e.x, z:e.z, name:e.name};
    this._armed=e;
    this._list=[]; this.render();
    const inp=document.getElementById('map-search'); if(inp) inp.value=e.name;
    if(typeof drawWorldMap==='function') drawWorldMap();
    this.pulse();
    this.hint('Press Enter again — or click the gold marker — to walk to '+e.name+'.');
    if(typeof Sfx!=='undefined' && Sfx.click) Sfx.click();
  },

  hint(text){
    const h=document.querySelector('#worldmap-modal .map-hint'); if(!h) return;
    if(this._hintDefault===null) this._hintDefault=h.textContent;
    h.textContent = text!==undefined ? text : this._hintDefault;
  },

  pulse(){   // a short breathe on the marker so the eye finds it
    if(this._pulseT) clearInterval(this._pulseT);
    let t=0; const self=this;
    this._pulseT=setInterval(()=>{
      t++; self._pulsePhase=t;
      const m=document.getElementById('worldmap-modal');
      if(t>36 || !m || m.style.display!=='block'){
        clearInterval(self._pulseT); self._pulseT=null; self._pulsePhase=0;
      }
      if(typeof drawWorldMap==='function') drawWorldMap();
    }, 60);
  },

  paintMark(){
    if(!this.mark) return;
    const c=document.getElementById('worldmap'); if(!c) return;
    const ctx=c.getContext('2d'), S=c.width;
    const px=(this.mark.x-WMAP.x0)/(WMAP.x1-WMAP.x0)*S;
    const pz=(this.mark.z-WMAP.z0)/(WMAP.z1-WMAP.z0)*S;
    const r=9+2.5*Math.sin((this._pulsePhase||0)*0.55);
    ctx.save();
    ctx.strokeStyle='rgba(26,18,8,.85)'; ctx.lineWidth=4.5;
    ctx.beginPath(); ctx.arc(px,pz,r,0,7); ctx.stroke();
    ctx.strokeStyle='#ffd24a'; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.arc(px,pz,r,0,7); ctx.stroke();
    ctx.fillStyle='#ffd24a';
    ctx.beginPath(); ctx.arc(px,pz,2,0,7); ctx.fill();
    ctx.restore();
  },

  reset(clearMark){
    this._armed=null; this._list=[]; this.render();
    if(clearMark){
      this.mark=null;
      const inp=document.getElementById('map-search'); if(inp) inp.value='';
    }
    this.hint();
  },
};

/* hook the modal open so the search bar is there from the first look */
(function(){
  function wrap(){
    if(typeof UI==='undefined' || !UI.openWorldMap || UI._mapSearchWrapped) return false;
    const orig=UI.openWorldMap.bind(UI);
    UI.openWorldMap=function(){ orig(); try{ MapSearch.inject(); MapSearch.reset(); }catch(err){} };
    UI._mapSearchWrapped=true;
    return true;
  }
  if(!wrap()) addEventListener('DOMContentLoaded', wrap);
  addEventListener('DOMContentLoaded', ()=>{ try{ MapSearch.inject(); }catch(err){} });
})();
