/* ============================================================================
   CRAFTED REALM — the Music Director for the 2004 set (replaces the retired sampled orchestra)
   ----------------------------------------------------------------------------
   Keeps the game's Music API (game3_systems.js: Music.start/stop/toggle/play/unlock/onZone, TRACKS) and plays the
   seventeen original pieces through GM2004 (src/audio_gm2004.js). One piece at a time, crossfaded:
     • the title piece on the login screen, then the area's piece (src/audio_music_areas.js), sampled twice a second
       from where the player actually is (the island's nav surface inside a building, the zone on the mainland);
     • a piece unlocks the first time its area is visited, whether or not music is on (the 2004 music tab rule);
     • modes: Auto follows the area, Manual keeps the player's pick; Loop repeats the piece. With Loop off, Auto
       plays the area's piece again after a short breath and Manual stops at the end;
     • music stays OPT-IN (localStorage cr_music_on): the first click on the login screen starts it for a player
       who had it on, per browser autoplay rules;
     • unlocks, mode, loop and the manual pick are saved with the adventurer (ui_save.js: Music.saveState /
     Music.restoreState; ids from before the 2004 set carry over to their nearest new piece).
   The music tab (ui_osrs_kit.js) and the ♪ menu (game4_ui.js MusicMenu, re-rendered here) listen for 'cr-music'.
   Loaded after game4_ui.js.
   ========================================================================== */
(function(){
  'use strict';
  if(typeof Music==='undefined' || typeof TRACKS==='undefined' || typeof GM2004==='undefined' || typeof MusicAreas==='undefined'){
    console.warn('[music] 2004 set not loaded: missing', {Music:typeof Music, GM2004:typeof GM2004, MusicAreas:typeof MusicAreas}); return; }

  var ORDER=['hm_title','holm_morning','holm_camp','holm_hollow','holm_mill','holm_bakehouse','holm_lodge','holm_mine',
    'holm_keep','holm_bank','holm_mage','holm_lastlight','holm_cove','hm_hearthmere','hm_road','hm_scarlands','hm_cave'];
  var TITLE=MusicAreas.TITLE;
  // saves made before the 2004 set carry the retired ids: carry each over to its nearest new piece
  var LEGACY={ tutors_tide:'holm_morning', tutors_holm:'holm_morning', hollow_square:'hm_hearthmere', veyhollow_town:'hm_hearthmere',
    title_theme:'hm_title', scarlands:'hm_scarlands', scarlands_song:'hm_scarlands', scar_dirge:'hm_scarlands', the_ditch:'hm_scarlands',
    emberwood_road:'hm_road', wilds_road:'hm_road', sea_breeze:'hm_road', undercrag:'hm_cave', keep_quiet:'holm_keep', white_keep:'holm_keep' };
  var ZONE_OF=function(id){ return /^holm_/.test(id)? 'holm' : id==='hm_hearthmere'? 'commons' : id==='hm_scarlands'? 'scarlands' : ''; };

  /* ---- the registry both music lists read: the set, in play order (the retired sine-era rows are gone) */
  Object.keys(TRACKS).forEach(function(k){ delete TRACKS[k]; });
  ORDER.forEach(function(id){ var s=GM2004.songs[id]; if(s) TRACKS[id]={ name:s.name, where:s.where, zone:ZONE_OF(id) }; });
  Music.tracks=TRACKS;
  Music.unlocked=[TITLE];
  Music.mode='auto'; Music.loop=true; Music.current=null;
  Music.vol=(function(){ try{ var v=localStorage.getItem('cr_vol_music'); return v!=null? Math.max(0,Math.min(1,+v)) : 0.5; }catch(e){ return 0.5; } })();

  var D={ area:null, areaKey:null, manual:null, zone:null, again:null, poller:null,
    target:function(){ return (Music.mode==='manual' && this.manual)? this.manual : this.area; } };
  Music.Director=D;

  function changed(){
    Music.current=Music.on? GM2004.current : null;
    try{ window.dispatchEvent(new Event('cr-music')); }catch(e){}
    try{ if(typeof MusicMenu!=='undefined' && MusicMenu.open) MusicMenu.render(); }catch(e){}
  }
  function setButton(on){ var b=document.getElementById('music-btn'); if(b) b.textContent=on? '♪' : '✕'; }   // the kit paints ♪ / muted from this
  function welcomeUp(){ var w=document.getElementById('welcome-screen'); if(!w) return false;
    try{ return getComputedStyle(w).display!=='none'; }catch(e){ return w.style.display!=='none'; } }

  /* ---- where is the player? */
  function sample(){
    var s={ welcome:welcomeUp(), prev:D.areaKey };
    if(s.welcome) return s;
    if(typeof running==='undefined' || !running) return null;           // loading, or not entered yet: no area, no unlocks
    if(typeof player==='undefined' || !player || !player.position) return null;
    s.x=player.position.x; s.z=player.position.z; s.plane=(typeof Player!=='undefined' && Player.plane)||0;
    var holm=false;
    try{ holm=(typeof HolmArrivalQA!=='undefined' && HolmArrivalQA.active()) || (typeof HolmV3Preview!=='undefined' && HolmV3Preview.active()); }catch(e){}
    if(holm){ s.holm=true;
      try{ var r=HolmArrivalQA.saveRecord(); if(r && r.surface) s.surface=r.surface; }catch(e){} }
    else { try{ s.zone=zoneAt(s.x, s.z); }catch(e){ s.zone=D.zone; } }
    return s;
  }
  function poll(){
    var s=sample(); if(!s) return;
    var r=MusicAreas.trackFor(s);
    D.areaKey=r.key;
    if(r.track!==D.area){ D.area=r.track; if(!s.welcome) Music.unlock(r.track); }
    apply(false);
  }
  function apply(force){
    if(!Music.on) return;
    var t=D.target(); if(!t || !GM2004.songs[t]) return;
    GM2004.loop=Music.loop;
    if(GM2004.current===t && !force) return;
    clearTimeout(D.again);
    GM2004.play(t, { restart:!!force, fade:GM2004.current? 1.6 : 0.4 }).then(changed, function(e){ console.warn('[music] play', t, e); });
  }
  GM2004.onEnded=function(){   // Loop off: Auto takes a breath and plays the area's piece; Manual stays quiet
    changed();
    if(Music.mode!=='auto') return;
    clearTimeout(D.again);
    D.again=setTimeout(function(){ if(Music.on && !Music.loop && Music.mode==='auto') apply(true); }, 3000);
  };

  /* ---- the Music API the rest of the game calls */
  Music.start=function(){
    if(this.on) return; this.on=true;
    try{ localStorage.setItem('cr_music_on','1'); }catch(e){}
    var ctx=this.ensure(); GM2004.attach(ctx, this._master);
    try{ if(ctx.state==='suspended') ctx.resume(); }catch(e){}
    try{ var g=this._master.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(0.0001, ctx.currentTime); g.linearRampToValueAtTime(this.vol, ctx.currentTime+0.6); }
    catch(e){ try{ this._master.gain.value=this.vol; }catch(_e){} }
    setButton(true); poll(); apply(false); changed();
  };
  Music.stop=function(){
    this.on=false; clearTimeout(D.again);
    try{ localStorage.setItem('cr_music_on','0'); }catch(e){}
    GM2004.stop(0.8); setButton(false); changed();
  };
  Music.toggle=function(){ this.on? this.stop() : this.start(); };
  Music.setVolume=function(v){
    this.vol=Math.max(0,Math.min(1,+v||0)); try{ localStorage.setItem('cr_vol_music', this.vol); }catch(e){}
    if(this._master && this.on){ try{ this._master.gain.cancelScheduledValues(0); this._master.gain.value=this.vol; }catch(e){} }
  };
  // a pick from the music tab or the ♪ menu: Manual mode, that piece
  Music.play=function(id){
    id=LEGACY[id]||id;
    if(!TRACKS[id] || this.unlocked.indexOf(id)<0) return false;
    this.mode='manual'; D.manual=id;
    if(!this.on) this.start(); else apply(GM2004.current===id && GM2004.ended);
    changed(); return true;
  };
  Music.unlock=function(id, silent){
    id=LEGACY[id]||id;
    if(!TRACKS[id] || this.unlocked.indexOf(id)>=0) return false;
    this.unlocked.push(id);
    if(!silent){ try{ UI.chat('Music unlocked: '+TRACKS[id].name+'.', 'quest'); }catch(e){} }
    changed(); return true;
  };
  Music.onZone=function(z){ D.zone=z; poll(); };
  Music.setMode=function(m){
    this.mode=(m==='manual')? 'manual' : 'auto';
    if(this.mode==='auto') D.manual=null;
    else if(!D.manual) D.manual=GM2004.current||D.area;
    apply(false); changed();
  };
  Music.setLoop=function(on){
    this.loop=!!on; GM2004.loop=this.loop;
    if(this.loop && this.on && GM2004.ended) apply(true);
    changed();
  };
  Music.scheduleLoop=function(){};   // the retired oscillator loop never runs
  Music.saveState=function(){ return { unlocked:this.unlocked.slice(), mode:this.mode, loop:this.loop,
    current:(this.mode==='manual' && D.manual)? D.manual : (GM2004.current||null) }; };
  Music.restoreState=function(d){
    d=d||{};
    var un=[TITLE];
    (d.unlocked||[]).forEach(function(x){ x=LEGACY[x]||x; if(TRACKS[x] && un.indexOf(x)<0) un.push(x); });
    this.unlocked=un;
    this.loop=d.loop!==false; GM2004.loop=this.loop;
    var c=LEGACY[d.current]||d.current;
    this.mode=(d.mode==='manual' && TRACKS[c] && un.indexOf(c)>=0)? 'manual' : 'auto';
    D.manual=this.mode==='manual'? c : null;
    apply(false); changed();
  };

  /* ---- the login screen: a player who had music on hears the title piece from their first click */
  function firstGesture(){
    if(Music.on || !welcomeUp()) return;
    var opted=false; try{ opted=localStorage.getItem('cr_music_on')==='1'; }catch(e){}
    if(!opted) return;
    try{ if(typeof Sfx!=='undefined') Sfx.ensure(); }catch(e){}
    Music.start();
  }
  document.addEventListener('pointerdown', firstGesture, true);
  document.addEventListener('keydown', firstGesture, true);

  /* ---- the ♪ menu (game4_ui.js MusicMenu): unlocked pieces, Auto / Manual / Loop, on-off */
  if(typeof MusicMenu!=='undefined'){
    MusicMenu.render=function(){
      var m=document.getElementById('music-menu'); if(!m) return;
      m.style.display=this.open? 'block' : 'none'; if(!this.open) return;
      var self=this; m.innerHTML='';
      var head=document.createElement('div'); head.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px';
      var h=document.createElement('h4'); h.style.margin='2px 0'; h.textContent='Music'; head.appendChild(h);
      var x=document.createElement('span'); x.textContent='✕'; x.style.cssText='cursor:pointer;color:#ff6a6a;font-weight:bold;padding:0 4px;font-size:13px';
      x.onclick=function(){ try{ Sfx.click(); }catch(e){} self.close(); }; head.appendChild(x); m.appendChild(head);
      function row(text, cls, fn){ var r=document.createElement('div'); r.className='mtrack'+(cls? ' '+cls : ''); r.textContent=text;
        r.onclick=function(){ try{ Sfx.click(); }catch(e){} fn(); self.render(); }; m.appendChild(r); return r; }
      row((Music.mode==='auto'? '● ' : '○ ')+'Auto (by area)', 'mode', function(){ Music.setMode('auto'); });
      row((Music.mode==='manual'? '● ' : '○ ')+'Manual', 'mode', function(){ Music.setMode('manual'); });
      row((Music.loop? '● ' : '○ ')+'Loop', 'mode', function(){ Music.setLoop(!Music.loop); });
      ORDER.forEach(function(id){ if(!TRACKS[id] || Music.unlocked.indexOf(id)<0) return;
        var playing=Music.on && GM2004.current===id;
        row((playing? '▶ ' : '  ')+TRACKS[id].name, playing? 'cur' : '', function(){ Music.play(id); }); });
      row(Music.on? 'Turn music off' : 'Turn music on', 'mode', function(){ Music.toggle(); });
      // the kit anchors the menu from the bottom and the UI scale zooms it: cap it to the screen, the list scrolls
      try{ var k=(typeof UIScale!=='undefined' && UIScale.zoomOf)? UIScale.zoomOf(m) : 1, r=m.getBoundingClientRect();
        m.style.maxHeight=Math.max(120, Math.floor((r.bottom-8)/(k||1)))+'px'; m.style.overflowY='auto'; }catch(e){}
    };
  }

  D.poller=setInterval(poll, 500);
  window.Music2004={ ORDER:ORDER, LEGACY:LEGACY, poll:poll, sample:sample };
})();
