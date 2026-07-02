/* char_customizer.js — live appearance panel for the player.glb avatar (the v02 adventurer).
 *
 * Pass-1 of the customization system: COLOUR swapping only. Each region of the GLB (skin / hair /
 * tunic / belt / legs / boots) is its own flat material slot, so this panel just calls
 * recolorPlayer({region: hex}) (fx_humanoid.js) to repaint a region instantly. Colours persist on
 * CharCfg.colors and re-apply whenever the avatar (re)loads. Part-SHAPE swapping is pass-2.
 *
 * Self-contained + reversible: a floating button (and Shift+C) toggles the panel; if the GLB avatar
 * isn't equipped yet it installs it first. No combat math / shared data touched. Styled to match
 * CharCreator. */
const CharStyler = {
  panel:null, btn:null, open:false, els:{},

  // curated OSRS-ish palettes per region (first entry ~= the factory colour)
  PALETTES:{
    skin : ['#f2d2b0','#dba572','#c98a52','#9c6b3f','#7a5236','#5a3c28'],
    hair : ['#67421f','#141414','#3a2a1a','#a8662e','#d8b24a','#9a9a9a','#ece4d6'],
    tunic: ['#5a8033','#2f5db0','#9c2b2b','#6a3f8f','#2f8f7d','#caa23a','#36506e','#3a3a3a','#b9b9b9'],
    belt : ['#4d3417','#2a2018','#7a5a32','#101010','#caa23a'],
    legs : ['#73736a','#4a4236','#262626','#3a5a32','#1c2540','#7a5230'],
    boots: ['#5d3b20','#2a1c10','#101010','#7a5230','#3a3a3a'],
  },
  ROWS:[['skin','Skin'],['hair','Hair'],['tunic','Tunic'],['belt','Belt'],['legs','Legs'],['boots','Boots']],

  toggle(){
    // make sure the GLB avatar (with region materials) is actually equipped first
    const ready = typeof player!=='undefined' && player.userData && player.userData.regionMats;
    if(!ready){
      if(typeof installPlayerGLB==='function'){
        if(typeof UI!=='undefined' && UI.chat) UI.chat('Equipping your adventurer to customise…','sys');
        installPlayerGLB(()=>{ this._show(true); });
      }
      return;
    }
    this._show(!this.open);
  },

  _show(v){
    if(!this.panel) this._build();
    this.open = v;
    this.panel.style.display = v ? 'block' : 'none';
    if(v) this._sync();
  },

  _apply(region, hex){
    if(typeof recolorPlayer==='function') recolorPlayer({[region]:hex});
    try{ if(typeof SaveGame!=='undefined' && SaveGame.save) SaveGame.save(); }catch(e){}
    this._sync();
  },

  _reset(){
    if(typeof recolorPlayer==='function' && typeof PLAYER_DEFAULT_COLORS!=='undefined') recolorPlayer(PLAYER_DEFAULT_COLORS);
    this._sync();
  },

  _build(){
    const p=document.createElement('div');
    p.id='char-styler';
    p.style.cssText='position:absolute;right:14px;top:50%;transform:translateY(-50%);z-index:96;width:250px;'+
      'background:linear-gradient(#3e3529,#2b251c);border:2px solid;border-color:#7a7265 #241f17 #241f17 #7a7265;'+
      'box-shadow:0 6px 24px rgba(0,0,0,.7);border-radius:8px;padding:12px;font:12px Verdana;color:#d8ccb4;display:none;';
    // keep panel clicks from reaching the canvas (click-to-move)
    ['click','pointerdown','mousedown','wheel'].forEach(ev=> p.addEventListener(ev, e=>e.stopPropagation()));

    const head=document.createElement('div');
    head.innerHTML='<b style="color:#ff981f;font-size:14px;text-shadow:1px 1px 0 #000">Customise Appearance</b>'+
      '<div style="font-size:10px;color:#9a8e78;margin:3px 0 8px">Click a colour for each part.</div>';
    // close (×)
    const x=document.createElement('div'); x.textContent='✕';
    x.style.cssText='position:absolute;right:10px;top:9px;cursor:pointer;color:#caa;font-weight:bold;font-size:13px';
    x.onclick=()=>this._show(false);
    p.appendChild(x); p.appendChild(head);

    const E=this.els;
    this.ROWS.forEach(([key,title])=>{
      const row=document.createElement('div'); row.style.cssText='margin:6px 0';
      row.innerHTML='<div style="font-size:10px;color:#9a8e78;margin-bottom:2px">'+title+'</div>';
      const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:4px;flex-wrap:wrap';
      const swatches=[];
      (this.PALETTES[key]||[]).forEach(hex=>{
        const d=document.createElement('div');
        d.style.cssText='width:24px;height:24px;border:2px solid #1a1208;cursor:pointer;border-radius:3px;background:'+hex;
        d.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); this._apply(key,hex); };
        wrap.appendChild(d); swatches.push({d,hex});
      });
      row.appendChild(wrap); p.appendChild(row);
      E[key]={swatches};
    });

    const acts=document.createElement('div'); acts.style.cssText='margin-top:10px;display:flex;gap:5px';
    const mk=(t,style,fn)=>{ const b=document.createElement('button'); b.textContent=t;
      b.style.cssText='flex:1;font:bold 12px Verdana;padding:8px;cursor:pointer;border-radius:4px;'+style;
      b.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); fn(); }; return b; };
    acts.appendChild(mk('Reset', 'color:#cfc6a8;background:linear-gradient(#4a4236,#3a3328);border:2px outset #5d5447;', ()=>this._reset()));
    acts.appendChild(mk('Done',  'color:#fff;background:linear-gradient(#3a7c2a,#225017);border:2px solid;border-color:#5aa84e #0a2a05 #0a2a05 #5aa84e;', ()=>this._show(false)));
    p.appendChild(acts);

    document.body.appendChild(p);
    this.panel=p;
  },

  // highlight the swatch matching each region's current colour
  _sync(){
    const cur = (typeof CharCfg!=='undefined' && CharCfg.colors) ? CharCfg.colors : {};
    const norm=h=>String(h||'').toLowerCase();
    this.ROWS.forEach(([key])=>{
      const E=this.els[key]; if(!E) return;
      const c=norm(cur[key]);
      E.swatches.forEach(s=>{ const on=(norm(s.hex)===c);
        s.d.style.outline = on ? '2px solid #ffd24a' : 'none';
        s.d.style.boxShadow = on ? '0 0 6px #ffd24a' : 'none'; });
    });
  },

  // a small always-on toggle button, bottom-right above the tab panel
  _buildButton(){
    const b=document.createElement('button'); b.id='char-styler-btn'; b.title='Customise appearance (Shift+C)';
    b.textContent='🎨';
    b.style.cssText='position:absolute;right:14px;bottom:150px;z-index:90;width:40px;height:40px;font-size:18px;cursor:pointer;'+
      'background:linear-gradient(#5a5043,#3e3529);border:2px outset #6b5f4a;border-radius:6px;box-shadow:0 3px 10px rgba(0,0,0,.6);';
    b.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); this.toggle(); };
    document.body.appendChild(b); this.btn=b;
  },

  init(){
    if(typeof document==='undefined') return;
    this._buildButton();
    addEventListener('keydown', e=>{
      if((e.key==='C'||e.key==='c') && e.shiftKey &&
         !/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')){
        e.preventDefault(); this.toggle();
      }
    });
  },
};
if(typeof window!=='undefined') addEventListener('load', ()=>CharStyler.init());
