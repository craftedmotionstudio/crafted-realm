/* char_creator.js — OSRS-style Character Design, shown on Tutor's Holm for a NEW adventurer.
 *
 * Right after you wash ashore, a live-preview panel lets you set gender / skin / hair style +
 * colour / beard / shirt / pants — or keep the default look and skip. It drives CharCfg +
 * applyPlayerLook() (the REAL player rebuild), so the spinning preview IS your character.
 *
 * Self-contained: opened once from play-btn (new char only), turntable via one tick() hook in
 * game5_main.update(), and guarded out of click-to-move + WASD while open. Procedural/modular —
 * no image-to-3D, no combat math touched. */
const CharCreator = {
  active:false, panel:null, els:{}, _spin:0, _savedCam:null,
  DEFAULT:{ gender:'m', skin:0xd8a878, hair:0x4a3526, hairStyle:'short', beard:false, shirt:0x3a6ea5, legs:0x4a4a3a },

  open(){
    if(this.active || typeof CharCfg==='undefined' || typeof applyPlayerLook!=='function') return;
    this.active = true;
    this._spin = (typeof player!=='undefined') ? player.rotation.y : 0;
    if(!this.panel) this._build();
    this.panel.style.display = 'block';
    if(typeof camCtl!=='undefined'){ this._savedCam={dist:camCtl.dist, pitch:camCtl.pitch}; camCtl.dist=5.2; camCtl.pitch=0.74; }
    this._sync();
  },
  finish(){
    this.active = false;
    if(this.panel) this.panel.style.display='none';
    if(this._savedCam && typeof camCtl!=='undefined'){ camCtl.dist=this._savedCam.dist; camCtl.pitch=this._savedCam.pitch; }
    try{ if(typeof SaveGame!=='undefined' && SaveGame.save) SaveGame.save(); }catch(e){}
    if(typeof UI!=='undefined' && UI.chat) UI.chat('Your adventurer is ready. Talk to Guide Bram by the rowboat.','sys');
  },
  keepDefault(){ Object.assign(CharCfg, this.DEFAULT); applyPlayerLook(); this.finish(); },
  randomize(){
    const pk=a=>a[Math.floor(Math.random()*a.length)];
    CharCfg.gender    = Math.random()<0.5 ? 'm' : 'f';
    CharCfg.skin      = pk(SKIN_CHOICES);
    CharCfg.hair      = pk(HAIR_CHOICES);
    CharCfg.hairStyle = pk(HAIR_STYLES);
    CharCfg.shirt     = pk(SHIRT_CHOICES);
    CharCfg.legs      = pk(PANTS_CHOICES);
    CharCfg.beard     = (CharCfg.gender==='m' && Math.random()<0.5);
    applyPlayerLook(); this._sync();
  },
  // slow turntable so every side of the design shows
  tick(dt){ if(this.active && typeof player!=='undefined'){ this._spin += dt*0.7; player.rotation.y = this._spin; } },

  _cycle(key, arr, dir){ const i=Math.max(0, arr.indexOf(CharCfg[key])); CharCfg[key]=arr[(i+dir+arr.length)%arr.length]; applyPlayerLook(); this._sync(); },
  _set(key, val){ CharCfg[key]=val; applyPlayerLook(); this._sync(); },

  _build(){
    const p=document.createElement('div');
    p.id='char-creator';
    p.style.cssText='position:absolute;left:14px;top:50%;transform:translateY(-50%);z-index:95;width:236px;'+
      'background:linear-gradient(#3e3529,#2b251c);border:2px solid;border-color:#7a7265 #241f17 #241f17 #7a7265;'+
      'box-shadow:0 6px 24px rgba(0,0,0,.7);border-radius:8px;padding:12px;font:12px Verdana;color:#d8ccb4;display:none;';
    const h=document.createElement('div');
    h.innerHTML='<b style="color:#ff981f;font-size:14px;text-shadow:1px 1px 0 #000">Design your adventurer</b>'+
      '<div style="font-size:10px;color:#9a8e78;margin:3px 0 8px">Make it yours — or keep the default look.</div>';
    p.appendChild(h);

    const E=this.els;
    // a "◀ label ▶" cycle row
    const cycleRow=(title,key,arr,fmt)=>{
      const row=document.createElement('div'); row.style.cssText='margin:6px 0';
      row.innerHTML='<div style="font-size:10px;color:#9a8e78;margin-bottom:2px">'+title+'</div>';
      const bar=document.createElement('div'); bar.style.cssText='display:flex;align-items:center;gap:4px';
      const mk=(t,dir)=>{ const b=document.createElement('button'); b.textContent=t;
        b.style.cssText='font:bold 13px Verdana;color:#ffd24a;background:linear-gradient(#5a5043,#3e3529);border:2px outset #6b5f4a;cursor:pointer;width:26px;height:26px;border-radius:4px;';
        b.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); this._cycle(key,arr,dir); }; return b; };
      const lbl=document.createElement('div'); lbl.style.cssText='flex:1;text-align:center;color:#fff;font-weight:bold;text-shadow:1px 1px 0 #000';
      bar.appendChild(mk('◀',-1)); bar.appendChild(lbl); bar.appendChild(mk('▶',1));
      row.appendChild(bar); p.appendChild(row);
      E[key]={lbl, fmt, arr, row};
    };
    // a swatch palette row
    const swRow=(title,key,choices)=>{
      const row=document.createElement('div'); row.style.cssText='margin:6px 0';
      row.innerHTML='<div style="font-size:10px;color:#9a8e78;margin-bottom:2px">'+title+'</div>';
      const wrap=document.createElement('div'); wrap.style.cssText='display:flex;gap:4px;flex-wrap:wrap';
      const swatches=[];
      choices.forEach(c=>{
        const d=document.createElement('div');
        d.style.cssText='width:24px;height:24px;border:2px solid #1a1208;cursor:pointer;border-radius:3px;background:#'+c.toString(16).padStart(6,'0');
        d.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); this._set(key,c); };
        wrap.appendChild(d); swatches.push({d,c});
      });
      row.appendChild(wrap); p.appendChild(row);
      E[key]={swatches, row};
    };

    cycleRow('Gender','gender',['m','f'], v=> v==='f'?'Female':'Male');
    cycleRow('Hairstyle','hairStyle',HAIR_STYLES, v=> v.charAt(0).toUpperCase()+v.slice(1));
    cycleRow('Facial hair','beard',[false,true], v=> v?'Bearded':'Clean-shaven');
    swRow('Skin','skin',SKIN_CHOICES);
    swRow('Hair colour','hair',HAIR_CHOICES);
    swRow('Shirt','shirt',SHIRT_CHOICES);
    swRow('Trousers','legs',PANTS_CHOICES);

    // action buttons
    const acts=document.createElement('div'); acts.style.cssText='margin-top:10px;display:flex;flex-direction:column;gap:5px';
    const btn=(t,style,fn)=>{ const b=document.createElement('button'); b.textContent=t;
      b.style.cssText='font:bold 12px Verdana;padding:8px;cursor:pointer;border-radius:4px;'+style;
      b.onclick=()=>{ if(typeof Sfx!=='undefined')Sfx.click&&Sfx.click(); fn(); }; return b; };
    acts.appendChild(btn('Looks good!', 'color:#fff;background:linear-gradient(#3a7c2a,#225017);border:2px solid;border-color:#5aa84e #0a2a05 #0a2a05 #5aa84e;', ()=>this.finish()));
    acts.appendChild(btn('Randomize',   'color:#ffd24a;background:linear-gradient(#5a5043,#3e3529);border:2px outset #6b5f4a;', ()=>this.randomize()));
    acts.appendChild(btn('Keep default look', 'color:#cfc6a8;background:linear-gradient(#4a4236,#3a3328);border:2px outset #5d5447;', ()=>this.keepDefault()));
    p.appendChild(acts);

    document.body.appendChild(p);
    this.panel=p;
  },

  _sync(){
    const E=this.els;
    ['gender','hairStyle','beard'].forEach(k=>{ if(E[k]) E[k].lbl.textContent = E[k].fmt(CharCfg[k]); });
    // beard row only makes sense for male
    if(E.beard) E.beard.row.style.display = (CharCfg.gender==='f') ? 'none' : 'block';
    ['skin','hair','shirt','legs'].forEach(k=>{ if(!E[k]) return;
      E[k].swatches.forEach(s=>{ s.d.style.outline = (s.c===CharCfg[k]) ? '2px solid #ffd24a' : 'none';
        s.d.style.boxShadow = (s.c===CharCfg[k]) ? '0 0 6px #ffd24a' : 'none'; });
    });
  },
};
