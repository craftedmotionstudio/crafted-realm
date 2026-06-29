/* ============================================================================
   CRAFTED REALM — ADMIN LIBRARY & BUILD MODE  (live chunk/object editor)
   ----------------------------------------------------------------------------
   - Palette library of placeable props (searchable, categorized) + new decor.
   - Click ground to place, right-click to remove, R rotate, [ ] scale, G grid.
   - CHUNK DATABASE: placements serialize per 8x8 chunk (cx,cz -> local objects).
   - Save/Load/Export/Import the whole map; save a chunk as a reusable TEMPLATE
     and stamp it elsewhere ("grab a chunk and place it").
   Built on top of the live world — toggle with B.
   ========================================================================== */
(function(){
  const CHUNK = 8;                       // world units per chunk side (OSRS 8x8)
  const _box=(w,h,d,c)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat(c));
  const _cyl=(rt,rb,h,s,c)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s), mat(c));
  function place(g,x,z){ g.position.set(x, gy(x,z), z); scene.add(g); return g; }

  /* ---- new decorative props ---- */
  function bookcase(x,z){
    const g=new THREE.Group();
    const frame=_box(1.4,1.8,0.5,0x5a3d24); frame.position.y=0.9; frame.castShadow=true; g.add(frame);
    const back=_box(1.3,1.7,0.05,0x3a2716); back.position.set(0,0.9,-0.2); g.add(back);
    for(let i=0;i<3;i++){
      const shelf=_box(1.32,0.06,0.46,0x42301c); shelf.position.set(0,0.45+i*0.5,0); g.add(shelf);
      const cols=[0x8a2a22,0x2a4a8a,0x2a6a3a,0x8a6a2a,0x5a2a6a];
      for(let b=0;b<6;b++){ const bk=_box(0.13,0.34,0.34,cols[(b+i)%5]);
        bk.position.set(-0.55+b*0.22,0.66+i*0.5,0.04); bk.rotation.z=(Math.random()-0.5)*0.12; g.add(bk); }
    }
    place(g,x,z); g.userData={kind:'deco',label:'Search <b>Bookcase</b>'};
    WORLD.clickables.push(g); WORLD.colliders.push({type:'rect',x,z,hw:0.72,hd:0.3});
    return g;
  }
  function cabbage(x,z){
    const g=new THREE.Group();
    const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.17,0), mat(0x6a9a38)); b.scale.y=0.82; b.position.y=0.14; g.add(b);
    const c=new THREE.Mesh(new THREE.IcosahedronGeometry(0.11,0), mat(0x83b34c)); c.position.set(0.04,0.2,0.03); g.add(c);
    place(g,x,z); g.userData={kind:'deco',label:'Pick <b>Cabbage</b>'}; WORLD.clickables.push(g);
    return g;
  }
  function crate(x,z){
    const g=new THREE.Group();
    const b=_box(0.6,0.6,0.6,0x7a5836); b.position.y=0.3; b.castShadow=true; g.add(b);
    for(const yy of [0.12,0.48]){ const band=_box(0.62,0.05,0.62,0x5a3d24); band.position.y=yy; g.add(band); }
    place(g,x,z); g.userData={kind:'deco',label:'Search <b>Crate</b>'};
    WORLD.clickables.push(g); WORLD.colliders.push({type:'rect',x,z,hw:0.32,hd:0.32});
    return g;
  }
  function barrel(x,z){
    const g=new THREE.Group();
    const b=_cyl(0.3,0.3,0.7,9,0x7a5838); b.position.y=0.35; b.castShadow=true; g.add(b);
    for(const yy of [0.12,0.35,0.58]){ const hoop=new THREE.Mesh(new THREE.TorusGeometry(0.31,0.025,5,12),mat(0x4a3526)); hoop.rotation.x=Math.PI/2; hoop.position.y=yy; g.add(hoop); }
    place(g,x,z); g.userData={kind:'deco',label:'Search <b>Barrel</b>'};
    WORLD.clickables.push(g); WORLD.colliders.push({type:'circle',x,z,r:0.33});
    return g;
  }
  function bonepile(x,z){
    const g=new THREE.Group();
    const sk=new THREE.Mesh(new THREE.SphereGeometry(0.13,7,6),mat(0xe9e2d0)); sk.scale.z=1.1; sk.position.set(0,0.12,0); g.add(sk);
    for(let i=0;i<4;i++){ const r=_cyl(0.03,0.03,0.42,5,0xe2dac6); r.rotation.z=Math.PI/2; r.rotation.y=i*0.7;
      r.position.set((Math.random()-0.5)*0.3,0.05+i*0.015,(Math.random()-0.5)*0.3); g.add(r); }
    place(g,x,z); g.userData={kind:'deco',label:'Examine <b>Bones</b>'}; WORLD.clickables.push(g);
    return g;
  }
  function fencePost(x,z){
    const g=new THREE.Group();
    const p=_box(0.12,0.9,0.12,0x6b4a2f); p.position.y=0.45; p.castShadow=true; g.add(p);
    const r1=_box(1.0,0.08,0.06,0x7a5838); r1.position.set(0.5,0.62,0); g.add(r1);
    const r2=_box(1.0,0.08,0.06,0x7a5838); r2.position.set(0.5,0.34,0); g.add(r2);
    place(g,x,z); g.userData={kind:'deco',label:'Examine <b>Fence</b>'};
    WORLD.clickables.push(g); WORLD.colliders.push({type:'rect',x,z,hw:0.5,hd:0.1});
    return g;
  }

  /* ---- The Hollow Well + standing-stone ring: Veyhollow's central landmark (VEYHOLLOW_DESIGN §3) ---- */
  function hollowWell(x,z){
    const g=new THREE.Group();
    const base=_cyl(0.6,0.68,0.72,12,0x8a8276); base.position.y=0.36; base.castShadow=true; g.add(base);
    for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; const brick=_box(0.18,0.12,0.06,(i%2?0x7c756a:0x948c80));
      brick.position.set(Math.cos(a)*0.63,0.3+(i%3)*0.14,Math.sin(a)*0.63); brick.rotation.y=-a; g.add(brick); }
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.62,0.08,6,16),mat(0x6e675b)); rim.rotation.x=Math.PI/2; rim.position.y=0.72; g.add(rim);
    const water=new THREE.Mesh(new THREE.CircleGeometry(0.5,16),mat(0x2b5a78)); water.rotation.x=-Math.PI/2; water.position.y=0.58; g.add(water);
    for(const sx of [-0.52,0.52]){ const post=_box(0.1,1.05,0.1,0x5a3d24); post.position.set(sx,1.05,0); post.castShadow=true; g.add(post); }
    const beam=_box(1.2,0.1,0.1,0x6b4a2f); beam.position.y=1.55; g.add(beam);
    const roof=_cyl(0.001,0.98,0.55,4,0x8a3d2e); roof.position.y=1.82; roof.rotation.y=Math.PI/4; roof.castShadow=true; g.add(roof);
    const bucket=_cyl(0.13,0.11,0.2,8,0x6b4a2f); bucket.position.set(0,1.25,0); g.add(bucket);
    // ring of rough standing stones
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2, r=2.5, h=1.3+Math.sin(i*1.7)*0.35;
      const st=_box(0.42,h,0.32,(i%2?0x7c756a:0x857d72));
      st.position.set(Math.cos(a)*r, h/2, Math.sin(a)*r);
      st.rotation.y=a+Math.sin(i)*0.25; st.rotation.x=Math.cos(i*2)*0.07; st.castShadow=true; g.add(st);
    }
    place(g,x,z); g.userData={kind:'landmark', label:'Examine <b>The Hollow Well</b>'};
    WORLD.clickables.push(g); WORLD.colliders.push({type:'circle',x,z,r:0.72});
    return g;
  }

  /* ---- the placeable library (categorized + searchable) ---- */
  const PALETTE=[
    {id:'hollowwell', cat:'Town',   label:'⛲ Hollow Well', build:hollowWell},
    {id:'tree',       cat:'Nature', label:'🌳 Tree',       build:(x,z)=>makeTree(x,z)},
    {id:'deadtree',   cat:'Nature', label:'🌲 Dead tree',  build:(x,z)=>makeTree(x,z,'dead')},
    {id:'bush',       cat:'Nature', label:'🌿 Bush',       build:(x,z)=>makeBush(x,z)},
    {id:'flower',     cat:'Nature', label:'🌷 Flower',     build:(x,z)=>makeFlower(x,z)},
    {id:'cabbage',    cat:'Nature', label:'🥬 Cabbage',    build:cabbage},
    {id:'rock_copper',cat:'Mining', label:'⛏ Copper',     build:(x,z)=>makeRock(x,z,'copper')},
    {id:'rock_iron',  cat:'Mining', label:'⛏ Iron',       build:(x,z)=>makeRock(x,z,'iron')},
    {id:'signpost',   cat:'Town',   label:'🪧 Signpost',   build:(x,z)=>makeSignpost(x,z)},
    {id:'campfire',   cat:'Town',   label:'🔥 Campfire',   build:(x,z)=>makeCampfire(x,z)},
    {id:'statue',     cat:'Town',   label:'🗿 Statue',     build:(x,z)=>makeStatue(x,z)},
    {id:'furnace',    cat:'Town',   label:'🏭 Furnace',    build:(x,z)=>makeFurnace(x,z)},
    {id:'bank',       cat:'Town',   label:'🏦 Bank booth', build:(x,z)=>makeBankBooth(x,z)},
    {id:'stall',      cat:'Town',   label:'🛒 Stall',      build:(x,z)=>makeStall(x,z,0xb03a3a)},
    {id:'bookcase',   cat:'Town',   label:'📚 Bookcase',   build:bookcase},
    {id:'crate',      cat:'Town',   label:'📦 Crate',      build:crate},
    {id:'barrel',     cat:'Town',   label:'🛢 Barrel',     build:barrel},
    {id:'fence',      cat:'Town',   label:'🚧 Fence',      build:fencePost},
    {id:'house',      cat:'Town',   label:'🏠 House',      build:(x,z)=>makeTexHouse(x,z)},
    {id:'bones',      cat:'Dungeon',label:'🦴 Bones',      build:bonepile},
    {id:'npc_bogling',cat:'NPC',    label:'👹 Goblin',     npc:true, build:(x,z)=>{ spawnNpc('bogling',x,z); return null; }},
    {id:'npc_skeleton',cat:'NPC',   label:'💀 Skeleton',   npc:true, build:(x,z)=>{ spawnNpc('skeleton',x,z); return null; }},
  ];

  function removeFromWorld(mesh){
    for(const arr of [WORLD.clickables, WORLD.resources, WORLD.fires]){
      const i=arr&&arr.indexOf(mesh); if(i>=0) arr.splice(i,1);
    }
  }

  const Build = {
    active:false, sel:0, rot:0, scale:1, snap:true, ghost:null, gridMesh:null, placed:[], filter:'', _loaded:false,
    _snapX(x){ return this.snap ? Math.floor(x)+0.5 : x; },

    /* ---- chunk math + (de)serialization ---- */
    key(x,z){ return Math.floor(x/CHUNK)+','+Math.floor(z/CHUNK); },
    serialize(){
      const chunks={};
      this.placed.forEach(p=>{
        const cx=Math.floor(p.x/CHUNK), cz=Math.floor(p.z/CHUNK), k=cx+','+cz;
        (chunks[k]=chunks[k]||[]).push({type:p.type, lx:+(p.x-cx*CHUNK).toFixed(2), lz:+(p.z-cz*CHUNK).toFixed(2), rot:+p.rot.toFixed(3), scale:+p.scale});
      });
      return {chunk:CHUNK, chunks};
    },
    _placeRec(type,x,z,rot,scale){
      const e=PALETTE.find(p=>p.id===type); if(!e) return;
      const m=e.build(x,z); if(m){ m.rotation.y=rot||0; if(scale&&scale!==1) m.scale.multiplyScalar(scale); }
      this.placed.push({type,x,z,rot:rot||0,scale:scale||1,mesh:m});
    },
    deserialize(data, silent){
      if(!data||!data.chunks) return; let n=0, c=0;
      for(const k in data.chunks){ c++; const [cx,cz]=k.split(',').map(Number);
        data.chunks[k].forEach(r=>{ this._placeRec(r.type, cx*CHUNK+r.lx, cz*CHUNK+r.lz, r.rot, r.scale); n++; }); }
      this._count(); if(!silent) UI.chat('[BUILD] Loaded '+n+' objects across '+c+' chunks.','sys');
    },

    toggle(on){
      this.active = (on===undefined)? !this.active : on;
      document.getElementById('build-panel').style.display = this.active?'block':'none';
      if(this.active){ this._ensureGhost(); UI.chat('[BUILD] Build Mode ON — click ground to place, right-click to remove. (R rotate · [ ] scale · G grid)','sys'); }
      else if(this.ghost){ this.ghost.visible=false; }
    },
    _ensureGhost(){
      if(this.ghost){ this.ghost.visible=true; return; }
      const g=new THREE.Group();
      const fill=new THREE.Mesh(new THREE.PlaneGeometry(0.94,0.94),
        new THREE.MeshBasicMaterial({color:0x6cf06c, transparent:true, opacity:0.28, side:THREE.DoubleSide, depthWrite:false}));
      fill.rotation.x=-Math.PI/2; g.add(fill);
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.98,0.98)),
        new THREE.LineBasicMaterial({color:0x9cff9c}));
      line.rotation.x=-Math.PI/2; g.add(line);
      g.position.y=0.05; scene.add(g); this.ghost=g;
    },
    updateGhost(e){
      if(!this.active||!this.ghost) return;
      const gp=groundPick(e); if(!gp) return;
      const sx=this._snapX(gp.x), sz=this._snapX(gp.z);
      const sy=this.snap ? (typeof gy==='function'?gy(sx,sz):gp.y) : gp.y;
      this.ghost.position.set(sx, sy+0.05, sz);
      const el=document.getElementById('build-chunk');
      if(el) el.textContent='tile '+Math.floor(sx)+','+Math.floor(sz)+'  ·  chunk '+this.key(sx,sz)+(this.snap?'  [snap]':'  [free]');
    },
    onClick(e){
      const gp=groundPick(e); if(!gp) return;
      const x=this._snapX(gp.x), z=this._snapX(gp.z);
      const entry=PALETTE[this.sel];
      const m=entry.build(x,z);
      if(m){ m.rotation.y=this.rot; if(this.scale!==1) m.scale.multiplyScalar(this.scale); }
      this.placed.push({type:entry.id, x, z, rot:this.rot, scale:this.scale, mesh:m});
      try{ if(window.WorldChunks) WorldChunks.placeObject(entry.id, Math.floor(x), Math.floor(z), this.rot); }catch(_e){}
      Sfx&&Sfx.click&&Sfx.click(); this._count();
    },
    onRightClick(e){
      const gp=groundPick(e); if(!gp) return;
      let bi=-1, bd=2.2;
      this.placed.forEach((p,i)=>{ const d=Math.hypot(p.x-gp.x,p.z-gp.z); if(d<bd){bd=d;bi=i;} });
      if(bi<0) return;
      const p=this.placed[bi];
      if(p.mesh){ scene.remove(p.mesh); removeFromWorld(p.mesh); }
      try{ if(window.WorldChunks){ const ms=WorldChunks.objectsAt(Math.floor(p.x), Math.floor(p.z)); const hit=ms.find(o=>o.def===p.type); if(hit) WorldChunks.removeObject(hit); } }catch(_e){}
      this.placed.splice(bi,1); this._count();
    },
    select(i){ this.sel=i; this._renderPalette(); },
    rotate(){ this.rot=(this.rot+Math.PI/4)%(Math.PI*2); this._hint(); },
    bump(d){ this.scale=Math.min(2.5,Math.max(0.4, +(this.scale+d).toFixed(2))); this._hint(); },
    toggleSnap(){ this.snap=!this.snap; this._hint(); if(typeof UI!=='undefined') UI.chat('[BUILD] Tile snap '+(this.snap?'ON':'OFF')+'.','sys'); },
    toggleGrid(){
      if(this.gridMesh){ scene.remove(this.gridMesh); this.gridMesh=null; return; }
      const size=WORLD.size, div=Math.round(size/CHUNK);
      const g=new THREE.GridHelper(size, div, 0x2a2a2a, 0x3a4a2a);
      g.position.y=0.06; this.gridMesh=g; scene.add(g);
    },

    /* ---- map persistence (chunk database) ---- */
    save(){ const s=this.serialize(); localStorage.setItem('cr_map', JSON.stringify(s));
      UI.chat('[BUILD] Saved map: '+this.placed.length+' objects in '+Object.keys(s.chunks).length+' chunks.','sys'); },
    load(silent){ const raw=localStorage.getItem('cr_map'); if(!raw) return; let d; try{d=JSON.parse(raw)}catch(e){return;} this.deserialize(d, silent); },
    exportMap(){ const json=JSON.stringify(this.serialize(),null,1);
      const a=document.createElement('a'); a.href='data:application/json;charset=utf-8,'+encodeURIComponent(json); a.download='crafted_map.json';
      document.body.appendChild(a); a.click(); a.remove();
      try{ navigator.clipboard.writeText(json); }catch(e){}
      UI.chat('[BUILD] Exported map JSON ('+this.placed.length+' objects).','sys'); },
    importMap(){ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
      inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const r=new FileReader();
        r.onload=()=>{ try{ this.deserialize(JSON.parse(r.target.result)); }catch(err){ UI.chat('[BUILD] Bad map file.','sys'); } };
        r.readAsText(f); };
      inp.click(); },
    clear(){ this.placed.forEach(p=>{ if(p.mesh){ scene.remove(p.mesh); removeFromWorld(p.mesh); } }); this.placed=[]; this._count();
      UI.chat('[BUILD] Cleared placed objects (this session).','sys'); },

    /* ---- chunk templates: save the current chunk, stamp it elsewhere ---- */
    _templates(){ try{ return JSON.parse(localStorage.getItem('cr_templates')||'{}'); }catch(e){ return {}; } },
    saveTemplate(){
      const cx=Math.floor(player.position.x/CHUNK), cz=Math.floor(player.position.z/CHUNK);
      const recs=this.placed.filter(p=>Math.floor(p.x/CHUNK)===cx&&Math.floor(p.z/CHUNK)===cz)
        .map(p=>({type:p.type, lx:+(p.x-cx*CHUNK).toFixed(2), lz:+(p.z-cz*CHUNK).toFixed(2), rot:+p.rot.toFixed(3), scale:+p.scale}));
      if(!recs.length){ UI.chat('[BUILD] Your current chunk ('+cx+','+cz+') is empty.','sys'); return; }
      const inp=document.getElementById('build-tplname');
      const name=(inp&&inp.value.trim())||('chunk_'+Object.keys(this._templates()).length);
      const t=this._templates(); t[name]=recs; localStorage.setItem('cr_templates', JSON.stringify(t));
      UI.chat('[BUILD] Saved template "'+name+'" ('+recs.length+' objects).','sys'); this._renderTemplates();
    },
    stampTemplate(){
      const sel=document.getElementById('build-tpl'); const name=sel&&sel.value; const t=this._templates()[name]; if(!t){ UI.chat('[BUILD] No template selected.','sys'); return; }
      const cx=Math.floor(player.position.x/CHUNK), cz=Math.floor(player.position.z/CHUNK);
      t.forEach(r=>this._placeRec(r.type, cx*CHUNK+r.lx, cz*CHUNK+r.lz, r.rot, r.scale));
      this._count(); UI.chat('[BUILD] Stamped "'+name+'" at chunk '+cx+','+cz+'.','sys');
    },

    /* ---- UI ---- */
    _count(){ const el=document.getElementById('build-count'); if(el) el.textContent=this.placed.length+' placed'; },
    _hint(){ const el=document.getElementById('build-hint'); if(el) el.textContent='rot '+Math.round(this.rot*57.3)+'°  ·  scale '+this.scale.toFixed(2)+'  ·  snap '+(this.snap?'on':'off'); },
    _renderPalette(){
      const wrap=document.getElementById('build-pal'); if(!wrap) return;
      wrap.innerHTML='';
      const f=this.filter.toLowerCase();
      PALETTE.forEach((e,i)=>{
        if(f && !(e.label.toLowerCase().includes(f)||e.id.includes(f)||e.cat.toLowerCase().includes(f))) return;
        const b=document.createElement('button');
        b.textContent=e.label; b.title=e.cat+' · '+e.id;
        b.style.cssText='font:10px Verdana;padding:5px 2px;background:radial-gradient(#3a3328,#241f17);'+
          'border:1px solid '+(i===this.sel?'#ffd24a':'#6b5f4a')+';color:'+(e.npc?'#ff9a6a':'#cfc6a8')+
          ';cursor:pointer;text-shadow:1px 1px 0 #000;outline:'+(i===this.sel?'2px solid #ffd24a':'none')+';';
        b.onclick=()=>this.select(i);
        wrap.appendChild(b);
      });
    },
    _renderTemplates(){
      const sel=document.getElementById('build-tpl'); if(!sel) return;
      const t=this._templates(); sel.innerHTML='';
      const names=Object.keys(t);
      if(!names.length){ const o=document.createElement('option'); o.textContent='(no templates)'; o.value=''; sel.appendChild(o); return; }
      names.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n+' ('+t[n].length+')'; sel.appendChild(o); });
    },
    _buildUI(){
      const p=document.createElement('div'); p.id='build-panel';
      p.style.cssText='position:absolute;left:8px;top:150px;width:212px;z-index:58;display:none;'+
        'background:#241f17;border:2px outset #6b5f4a;padding:8px;font:11px Verdana;color:#cfc6a8;max-height:78vh;overflow-y:auto;';
      p.innerHTML=
        '<div style="color:#ff981f;font-weight:bold;text-shadow:1px 1px 0 #000;margin-bottom:4px">🔨 ADMIN LIBRARY'+
          ' <span id="build-count" style="float:right;color:#9a8e78;font-weight:normal">0 placed</span></div>'+
        '<div id="build-chunk" style="color:#9ad06a;margin-bottom:5px">chunk 0,0</div>'+
        '<input id="build-search" placeholder="search library…" style="width:100%;box-sizing:border-box;margin-bottom:5px;'+
          'background:#1e1a14;color:#ffd24a;border:2px inset #6b5f4a;padding:4px;font:11px Verdana">'+
        '<div id="build-pal" style="display:grid;grid-template-columns:1fr 1fr;gap:3px;max-height:200px;overflow-y:auto"></div>'+
        '<div id="build-hint" style="margin:6px 0;color:#9a8e78">rot 0°  ·  scale 1.00</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:5px">'+
          '<button data-a="grid">Grid</button><button data-a="rotate">Rotate</button>'+
          '<button data-a="save">Save Map</button><button data-a="load">Load Map</button>'+
          '<button data-a="export">Export</button><button data-a="import">Import</button>'+
          '<button data-a="clear">Clear</button><button data-a="savetpl">Save Chunk</button>'+
          '<button data-a="roofs">Roofs on/off</button><button data-a="snap">Tile snap</button>'+
        '</div>'+
        '<div style="border-top:1px solid #4a4234;padding-top:5px">'+
          '<div style="color:#ff981f;margin-bottom:3px">Chunk templates</div>'+
          '<input id="build-tplname" placeholder="template name" style="width:100%;box-sizing:border-box;margin-bottom:3px;'+
            'background:#1e1a14;color:#ffd24a;border:2px inset #6b5f4a;padding:3px;font:10px Verdana">'+
          '<div style="display:flex;gap:3px"><select id="build-tpl" style="flex:1;background:#1e1a14;color:#cfc6a8;border:1px solid #6b5f4a;font:10px Verdana"></select>'+
          '<button data-a="stamp">Stamp</button></div>'+
        '</div>';
      document.body.appendChild(p);
      p.querySelectorAll('button[data-a]').forEach(b=>{
        b.style.cssText='font:10px Verdana;padding:5px 3px;background:#3a3328;border:1px solid #6b5f4a;color:#ffd24a;cursor:pointer;';
        b.onclick=()=>{ const a=b.dataset.a;
          ({grid:()=>this.toggleGrid(), rotate:()=>this.rotate(), save:()=>this.save(), load:()=>this.load(),
            export:()=>this.exportMap(), import:()=>this.importMap(), clear:()=>this.clear(),
            savetpl:()=>this.saveTemplate(), stamp:()=>this.stampTemplate(),
            roofs:()=>{ if(window.toggleRoofs) toggleRoofs(); }, snap:()=>this.toggleSnap()})[a](); };
      });
      const s=p.querySelector('#build-search');
      s.oninput=()=>{ this.filter=s.value; this._renderPalette(); };
      this._renderPalette(); this._renderTemplates(); this._hint();
    },
  };
  window.Build = Build;
  window.Decor = {bookcase, cabbage, crate, barrel, bonepile, fencePost, hollowWell};   // reusable by town authors

  function whenReady(){
    if(typeof canvasEl==='undefined' || typeof scene==='undefined' || typeof groundPick==='undefined'){ setTimeout(whenReady,200); return; }
    Build._buildUI();
    canvasEl.addEventListener('mousemove', e=>Build.updateGhost(e));
    addEventListener('keydown', e=>{
      if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if(e.key==='b'||e.key==='B'){ Build.toggle(); return; }
      if(!Build.active) return;
      if(e.key==='r'||e.key==='R') Build.rotate();
      else if(e.key===']') Build.bump(0.1);
      else if(e.key==='[') Build.bump(-0.1);
      else if(e.key==='g'||e.key==='G') Build.toggleGrid();
      else if(e.key==='s'||e.key==='S') Build.toggleSnap();
    });
    const tryLoad=()=>{ if(typeof running!=='undefined' && running && !Build._loaded){ Build._loaded=true; Build.load(true); } else setTimeout(tryLoad,400); };
    tryLoad();
  }
  whenReady();
})();
