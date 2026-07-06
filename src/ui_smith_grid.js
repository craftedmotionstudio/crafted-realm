/* ============ Smithing icon grid — the OSRS "What would you like to make?" anvil screen ============
 * Upgrades openSmithing's plain-text dialogue into an ICON GRID matching
 * Bible_References/Anvil_Interface_for_Making_Items.jpg. Each SMITHABLES entry
 * becomes a cell: iconFor(it.id) sprite + name + bar cost (green when you can
 * make it, grey when your Smithing/bars fall short) + a qty badge on multi-output
 * rows (arrowtips). If you carry more than one bar type, bronze/iron/steel tabs
 * switch the grid. A hammer is required, mirroring openSmithing.
 *
 * Self-contained: all DOM is built in-code with createElement + .onclick + .style
 * (no inline handler attributes — strict CSP safe), like quest_ui.js's modal. It
 * monkey-patches openSmithing once so every anvil click opens the grid, and the
 * click contract is byte-identical to the old menu:
 *   Player.action = {type:'smith', obj, bar:barType, make:it, t:0}; orderWalk(obj.position);
 * The action-tick loop is untouched.
 */
(function(){

const BARS = ['bronze_bar','iron_bar','steel_bar'];   // fine → coarse order (finest tab wins by default)
const GREEN='#3fd35a', GREY='#7a6f5c';

/* ---------- self-contained overlay/panel (the quest_ui.js modal pattern) ---------- */
function overlay(){
  let o=document.getElementById('smith-grid-overlay');
  if(o){ o.innerHTML=''; o.style.display='flex'; return o; }
  o=document.createElement('div'); o.id='smith-grid-overlay';
  o.style.cssText='position:fixed;inset:0;background:rgba(10,8,4,.55);z-index:260;display:flex;align-items:center;justify-content:center';
  o.addEventListener('click', e=>{ if(e.target===o) o.style.display='none'; });
  document.body.appendChild(o);
  return o;
}
function close(){ const o=document.getElementById('smith-grid-overlay'); if(o) o.style.display='none'; }

/* ---------- one smithable cell: icon + name + bar cost, dimmed when you can't make it ---------- */
function cell(barType, it, rec){
  const canLvl = Player.lvl('Smithing')>=it.req;
  const canBar = Player.count(barType)>=it.bars;
  const ok = canLvl && canBar;
  const c=document.createElement('div');
  c.style.cssText='position:relative;width:92px;padding:8px 4px 6px;display:flex;flex-direction:column;align-items:center;'
    +'background:var(--slot-bg,#241c10);border:1px solid var(--slot-line,#5a4a33);border-radius:6px;'
    +(ok?'cursor:pointer':'cursor:default;opacity:.55');
  c.title = canLvl ? it.name : `Requires Smithing level ${it.req}.`;

  const img=document.createElement('img'); img.src=iconFor(it.id); img.draggable=false;
  img.style.cssText='width:34px;height:34px;image-rendering:pixelated';
  c.appendChild(img);

  if(it.qty){                                            // multi-output badge (e.g. arrowtips ×12)
    const b=document.createElement('span');
    b.textContent='×'+it.qty;
    b.style.cssText='position:absolute;top:4px;right:6px;font-size:10px;font-weight:bold;color:#e8d9a0;text-shadow:0 1px 2px #000';
    c.appendChild(b);
  }

  const nm=document.createElement('div'); nm.textContent=it.name;
  nm.style.cssText='margin-top:4px;font-size:10px;line-height:1.15;text-align:center;color:#d8ccb0';
  c.appendChild(nm);

  const cost=document.createElement('div');
  cost.textContent=`${it.bars} bar${it.bars>1?'s':''}`;
  cost.style.cssText=`margin-top:2px;font-size:10px;font-weight:bold;color:${ok?GREEN:GREY}`;
  c.appendChild(cost);

  if(!canLvl){                                           // show the wall the same way OSRS greys a locked row
    const req=document.createElement('div'); req.textContent='Lvl '+it.req;
    req.style.cssText='font-size:9px;color:#c85450';
    c.appendChild(req);
  }

  if(rec){                                               // the cheapest 1-bar item — a new smith's first forge
    let tut=false; try{ tut = (typeof Tutorial!=='undefined' && !Tutorial.complete); }catch(e){}
    c.style.borderColor='#e8c060';                       // golden ring, matched to the cell's own 1px border
    c.style.boxShadow = tut
      ? '0 0 0 2px rgba(232,192,96,.7), 0 0 14px rgba(232,192,96,.45)'   // strong "start here" glow during the tutorial
      : '0 0 0 1px rgba(232,192,96,.45)';                                // gentle always-on hint otherwise
    if(tut){
      const tag=document.createElement('div'); tag.textContent='Start here';
      tag.style.cssText='margin-top:3px;font-size:8px;letter-spacing:.5px;text-transform:uppercase;font-weight:bold;color:#e8c060';
      c.appendChild(tag);
    }
  }

  if(ok) c.onclick=()=>{                                 // EXACT existing contract — do not change
    Player.action={type:'smith', obj:cell._obj, bar:barType, make:it, t:0};
    orderWalk(cell._obj.position);
    close(); Sfx.click();
  };
  return c;
}

/* ---------- build the grid for one bar type into a host div ---------- */
function renderGrid(host, barType){
  host.innerHTML='';
  const list = SMITHABLES[barType] || [];
  const rec = (list.find(x=>x.bars===1) || {}).id;   // cheapest 1-bar item (list is req-ascending) = recommended first forge
  list.forEach(it=>host.appendChild(cell(barType, it, it.id===rec)));
}

/* ---------- the modal ---------- */
window.UI_SmithGrid = {
  open(obj){
    if(Player.count('hammer')<1){ UI.chat('You need a hammer to work the metal.','plain'); return; }
    const carried = BARS.filter(id=>Player.count(id)>0);
    if(!carried.length){ UI.chat('You need metal bars to smith. The furnace turns ore into bars.','plain'); return; }
    cell._obj=obj;
    let active=carried[carried.length-1];                // work the finest bar carried, like the old menu

    const o=overlay();
    const p=document.createElement('div');
    p.style.cssText='width:440px;max-width:92vw;max-height:80vh;overflow-y:auto;background:#2a2318;border:3px solid #6a5636;'
      +'border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.7);padding:14px 18px;color:#d8ccb0;font-family:inherit';

    const head=document.createElement('div');
    head.style.cssText='text-align:center;border-bottom:2px solid #5a4a33;padding-bottom:6px;margin-bottom:8px;font-weight:bold;color:#e8d9a0';
    head.innerHTML='<span style="font-size:16px">⚒ Smith on the anvil</span>'
      +'<div style="font-size:11px;font-weight:normal;color:#9a8e78">What would you like to make?</div>';
    p.appendChild(head);

    const grid=document.createElement('div');
    grid.style.cssText='display:flex;flex-wrap:wrap;gap:6px;justify-content:center';

    if(carried.length>1){                                // bar-type tabs only when there's a choice
      const tabs=document.createElement('div');
      tabs.style.cssText='display:flex;gap:6px;justify-content:center;margin-bottom:8px';
      const paint=()=>{
        [...tabs.children].forEach(t=>{ const on=t._bar===active;
          t.style.background=on?'#4a3d2a':'transparent';
          t.style.color=on?'#e8d9a0':'#9a8e78';
          t.style.borderColor=on?'#8a6a3e':'#5a4a33'; });
      };
      carried.forEach(id=>{
        const t=document.createElement('button'); t._bar=id; t.className='opt';
        t.textContent=ITEMS[id].name.replace(' bar','');
        t.style.cssText='padding:4px 12px;font-size:11px;cursor:pointer;background:transparent;border:1px solid #5a4a33;border-radius:5px;color:#9a8e78';
        t.onclick=()=>{ active=id; paint(); renderGrid(grid, active); Sfx.click(); };
        tabs.appendChild(t);
      });
      paint();
      p.appendChild(tabs);
    }

    renderGrid(grid, active);
    p.appendChild(grid);

    const bar=document.createElement('div'); bar.style.cssText='text-align:center;margin-top:10px';
    const b=document.createElement('button'); b.className='opt'; b.textContent='Never mind.';
    b.style.cssText='padding:5px 14px;cursor:pointer';
    b.onclick=()=>{ close(); Sfx.click(); };
    bar.appendChild(b);
    p.appendChild(bar);

    o.appendChild(p);
  }
};

/* ---------- patch openSmithing once so anvil clicks open the grid (the item_tags.js wrap pattern) ---------- */
function patch(){
  if(typeof openSmithing!=='function' || typeof UI==='undefined') return false;
  if(openSmithing._grid) return true;                    // already patched
  openSmithing=function(obj){ UI_SmithGrid.open(obj); };
  openSmithing._grid=true;
  return true;
}

/* ---------- fire the tutorial/event gate on a successful forge ----------
 * The forge itself completes in game5_main's action-tick (bar consumed, item
 * added to the pack). We wrap Player.addItem once and, guarded, fire only when
 * the item added is the one the active smith action is making — so it fires
 * exactly once per successful forge, from both the grid and any legacy path. */
function hookForge(){
  if(typeof Player==='undefined' || typeof Player.addItem!=='function') return false;
  if(Player.addItem._smithHook) return true;             // already wrapped
  const orig = Player.addItem;
  const wrapped = function(id, qty){
    const r = orig.apply(this, arguments);
    try{
      const a = Player.action;
      if(a && a.type==='smith' && a.make && a.make.id===id){
        const forgedId = id;
        try{ if(typeof Tutorial!=='undefined') Tutorial.notify('smith','forged'); }catch(e){}
        try{ if(typeof Events!=='undefined') Events.emit('smithed',{id:forgedId}); }catch(e){}
      }
    }catch(e){}
    return r;
  };
  wrapped._smithHook = true;
  Player.addItem = wrapped;
  return true;
}

const iv=setInterval(()=>{ try{ hookForge(); if(patch()) clearInterval(iv); }
  catch(e){ console.error('[ui_smith_grid]', e); clearInterval(iv); } }, 1200);

})();
