/* ============================================================================
   CRAFTED REALM — SAMPLED ORCHESTRA + MUSIC DIRECTOR  (medieval-lofi)
   ----------------------------------------------------------------------------
   A small sampled ensemble (harp, strings, cello, flute, lute) playing ORIGINAL
   cozy, OSRS-inspired compositions, with:
     • SEAMLESS looping — a chord/pad vamp runs continuously while melody
       instruments layer in and out (intro→A→B→reprise). No abrupt loop reset.
     • A LOFI master chain — gentle low-pass + soft warm reverb (no fuzz).
     • A MUSIC DIRECTOR — exactly ONE song at a time, with smooth crossfades:
         zone song (base)  +  optional per-building song (override).
       Enter a building with a song → it crossfades in; leave → the zone song
       returns. Debounced so quick in/out doesn't thrash. Some buildings have
       no song (stay on the zone track).
   Keeps Music's public API + the opt-in localStorage flag. Loaded after
   game3_systems.js and soundfont-player. Composition spec: see the brief in chat.
   ========================================================================== */
(function(){
  function ready(){ return typeof Music!=='undefined' && typeof Soundfont!=='undefined'; }
  if(ready()) init();
  else { var w=setInterval(function(){ if(ready()){ clearInterval(w); init(); } }, 200); }

  function init(){
  /* ---------------- ORIGINAL COMPOSITIONS ----------------
     melody arrays are one note (or null = rest/breath) per beat, length =
     chords.length * beatsPerBar. Two melodies (A/B) give development. */
  var CR_TRACKS = {
    // Recipe A — warm town waltz (A minor, Aeolian w/ Dorian/major colour), 100 BPM 3/4
    // 16-bar form (A section + B section) so it journeys further before repeating.
    veyhollow_town: {
      name:'Veyhollow', bpm:100, beatsPerBar:3, pedal:['A2'],
      chords:[ ['A3','C4','E4'],['G3','B3','D4'],['C4','E4','G4'],['G3','B3','D4'],
               ['A3','C4','E4'],['F3','A3','C4'],['D4','F4','A4'],['E3','G#3','B3'],
               ['C4','E4','G4'],['G3','B3','D4'],['A3','C4','E4'],['E3','G3','B3'],
               ['F3','A3','C4'],['C4','E4','G4'],['D4','F4','A4'],['E3','G#3','B3'] ],
      bass:[ 'A2','G2','C3','G2','A2','F2','D3','E2', 'C3','G2','A2','E2','F2','C3','D3','E2' ],
      melodyA:[ 'E4',null,'A4', 'B4',null,'G4', 'G4',null,'E4', 'D4',null,null,
                'A4',null,'C5', 'B4',null,'A4', 'F4',null,'D4', 'E4',null,null,
                'G4',null,'C5', 'B4',null,'D5', 'C5',null,'A4', 'B4',null,'G4',
                'A4',null,'C5', 'G4',null,'E4', 'F4',null,'A4', 'E4',null,null ],
      melodyB:[ 'A4','C5','B4', 'D5',null,'B4', 'C5',null,'G4', 'B4',null,'D5',
                'C5',null,'E5', 'D5','C5','A4', 'A4',null,'F4', 'G#4',null,'E4',
                'E5',null,'G5', 'D5',null,'B4', 'C5','B4','A4', 'B4',null,'E4',
                'A4',null,'C5', 'G4',null,'E4', 'D5',null,'A4', 'G#4',null,'E4' ]
    },
    // Recipe B — quiet keep interior (C harmonic minor, pentatonic melody), 70 BPM 4/4
    keep_quiet: {
      name:'The Quiet Keep', bpm:70, beatsPerBar:4, pedal:['C2'],
      chords:[ ['C4','Eb4','G4'],['G3','B3','D4'],['F3','Ab3','C4'],['C4','Eb4','G4'] ],
      bass:[ 'C2','G2','F2','C2' ],
      melodyA:[ 'Eb5',null,null,'G5', 'F5',null,'Eb5',null, 'C5',null,null,'Eb5', 'G4',null,null,null ],
      melodyB:[ 'G5',null,'Bb5',null, 'G5','F5',null,'Eb5', 'F5',null,'Eb5',null, 'C5',null,null,null ]
    },
    // Recipe C — wistful open road (D Dorian, open-fifth drone), 84 BPM 4/4
    wilds_road: {
      name:'The Open Road', bpm:84, beatsPerBar:4, pedal:['D2','A2'],
      chords:[ ['D4','F4','A4'],['G3','B3','D4'],['D4','F4','A4'],['C4','E4','G4'] ],
      bass:[ 'D2','G2','D2','C3' ],
      melodyA:[ 'A4',null,'D5',null, 'B4',null,'A4',null, 'F4',null,'A4',null, 'G4',null,'E4',null ],
      melodyB:[ 'D5',null,'F5','E5', 'D5',null,'B4',null, 'A4',null,'C5','A4', 'G4',null,null,null ]
    }
  };
  function zoneToTrack(z){
    if(z==='commons'||z==='holm') return 'veyhollow_town';
    if(z==='whitmoor') return 'keep_quiet';
    return 'wilds_road';   // emberwood, gloomfen, brynholt, dunes, scarlands, quarry, pond, arena, undercrag…
  }

  /* ---------------- INSTRUMENTS + LOFI CHAIN ---------------- */
  var INSTRUMENTS = { strings:'string_ensemble_1', cello:'cello', harp:'orchestral_harp', flute:'flute', lute:'acoustic_guitar_nylon' };
  Music._inst={}; Music._lofi=null; Music._fade=null; Music._ready=false; Music._loading=false;
  function shift(n,oct){ var m=/^([A-G][#b]?)(-?\d+)$/.exec(n); return m? m[1]+(parseInt(m[2],10)+oct) : n; }
  function up(n){ return shift(n,1); }

  function makeImpulse(ctx,dur,decay){
    var rate=ctx.sampleRate, len=Math.floor(rate*dur), buf=ctx.createBuffer(2,len,rate);
    for(var c=0;c<2;c++){ var d=buf.getChannelData(c), last=0;
      for(var i=0;i<len;i++){ var w=(Math.random()*2-1)*Math.pow(1-i/len,decay); last+=0.32*(w-last); d[i]=last*1.8; } }
    return buf;
  }
  function buildChain(ctx){
    var input=ctx.createGain();
    var lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3600; lp.Q.value=0.3;
    var dry=ctx.createGain(); dry.gain.value=0.86;
    var wet=ctx.createGain(); wet.gain.value=0.2;
    var conv=ctx.createConvolver(); conv.buffer=makeImpulse(ctx,3.4,2.2);
    var fade=ctx.createGain(); fade.gain.value=1;                 // crossfade bus
    input.connect(lp);
    lp.connect(dry); dry.connect(fade);
    lp.connect(conv); conv.connect(wet); wet.connect(fade);
    fade.connect(Music._master);
    Music._lofi=input; Music._fade=fade;
  }
  function loadInstruments(){
    if(Music._loading||Music._ready) return;
    Music._loading=true; var ctx=Music.ensure(); if(!Music._lofi) buildChain(ctx);
    var keys=Object.keys(INSTRUMENTS); Music._g={};
    keys.forEach(function(k){ var g=ctx.createGain(); g.gain.value=(k==='flute'||k==='lute')?0:1; g.connect(Music._lofi); Music._g[k]=g; });
    Promise.all(keys.map(function(k){
      return Soundfont.instrument(ctx, INSTRUMENTS[k], { nameToUrl:function(n){ return 'assets/audio/sf/'+n+'-mp3.js'; }, destination:Music._g[k] })
        .then(function(inst){ Music._inst[k]=inst; });
    })).then(function(){ Music._ready=true; Music._loading=false; Director.apply(true);
      if(typeof UI!=='undefined'&&UI.chat) UI.chat('🎼 The orchestra is tuned.','sys');
    }).catch(function(){ Music._loading=false; });
  }
  // per-instrument ADSR so notes EASE IN (soft attack) and release gently — no hard "key press"
  var ENV={ strings:{attack:0.55,release:0.9}, cello:{attack:0.3,release:0.7},
            flute:{attack:0.18,release:0.45}, harp:{attack:0.01,release:0.5}, lute:{attack:0.012,release:0.45} };
  function note(inst,n,when,dur,gain,env){ var I=Music._inst[inst]; if(!I||!n) return;
    var e=env||ENV[inst]||{}; try{ I.play(n,when,{duration:dur,gain:gain,attack:e.attack,release:e.release}); }catch(ex){} }
  // smoothly fade a whole instrument layer in/out (continuity: melody/counter swell rather than snap)
  function rampGain(inst,target,when,dur){ var g=Music._g&&Music._g[inst]; if(!g) return;
    try{ g.gain.cancelScheduledValues(when); g.gain.setValueAtTime(g.gain.value,when); g.gain.linearRampToValueAtTime(target,when+dur); }catch(e){} }

  /* ---------------- SEAMLESS BAR SCHEDULER ----------------
     Schedules one bar at a time on an absolute clock so loops are gapless.
     `pass` (how many times the chord cycle has repeated) selects which layers
     play, so the music evolves intro→A→B→reprise without the harmony stopping. */
  var S = { running:false, clock:0, bar:0, track:null, look:null };
  // per-pass layer volumes (0..1). Flute melody & lute counter SWELL in/out via gain ramps,
  // so the music breathes continuously instead of layers snapping on at section borders.
  // layers stay PRESENT and only vary subtly (no "here's the flute / now it stopped"); always-on floors.
  function passDensity(p){ p=p%4; return { flute:(p===0?0.72:(p===3?0.82:1)), lute:(p===2?0.7:(p===3?0.3:0.12)) }; }
  function sameChord(a,b){ return a&&b && a.join()===b.join(); }
  function scheduleBar(id,bar,t0){
    var tr=CR_TRACKS[id]; if(!tr) return;
    var n=tr.chords.length, ci=bar%n, pass=Math.floor(bar/n);
    var spb=60/tr.bpm, bpb=tr.beatsPerBar, barLen=spb*bpb;
    var chord=tr.chords[ci], prev=tr.chords[(ci-1+n)%n];
    // top of each cycle: a soft SUSTAINED tonic pedal + VERY gradual (4-bar) layer swells
    if(ci===0){
      if(tr.pedal) tr.pedal.forEach(function(pn){ note('strings', pn, t0, n*barLen*1.03, 0.035, {attack:2.0, release:2.0}); });
      var d=passDensity(pass), r=barLen*4;
      rampGain('flute', d.flute, t0, r); rampGain('lute', d.lute, t0, r);
    }
    // string pad: RE-VOICE only when the chord actually changes; long attack + ~2-bar ring → chords
    // crossfade into each other instead of re-attacking every bar (kills the "organ stab" pulse)
    if(!sameChord(chord,prev) || bar===0){
      chord.forEach(function(nn){ note('strings', nn, t0, barLen*2.2, 0.07, {attack:1.0, release:1.5}); });
    }
    note('cello', tr.bass[ci], t0, barLen*1.15, 0.14, {attack:0.45, release:0.9});   // smooth legato bass
    // a single soft harp colour per bar (no busy comping)
    note('harp', up(bpb===3?chord[1]:chord[2%chord.length]), t0+spb*(bpb===3?1.5:2), spb*1.6, 0.04);
    // legato flute melody — gentle attack, long overlap between notes
    var mel=(pass%2===1 && tr.melodyB)? tr.melodyB : tr.melodyA;
    for(var k=0;k<bpb;k++){ var nn=mel[ci*bpb+k]; if(nn) note('flute', nn, t0+k*spb, spb*2.1, 0.15, {attack:0.32, release:0.55}); }
    // lute counter — soft, always lightly present (its gain bus shapes it)
    note('lute', up(chord[0]), t0+spb*0.5, spb*1.9, 0.08, {attack:0.05, release:0.7});
  }
  function schedTick(){
    if(!Music.on||!S.running){ return; }
    var ctx=Music.ensure(), ahead=ctx.currentTime+0.7;
    while(S.clock<ahead){ scheduleBar(S.track,S.bar,S.clock);
      var tr=CR_TRACKS[S.track]; S.clock += (60/tr.bpm)*tr.beatsPerBar; S.bar++; }
    clearTimeout(S.look); S.look=setTimeout(schedTick,140);
  }
  function startTrack(id){
    if(!CR_TRACKS[id]) return; var ctx=Music.ensure();
    S.track=id; S.bar=0; S.clock=ctx.currentTime+0.15; S.running=true;
    Music.current=id; clearTimeout(S.look); schedTick();
  }
  /* smooth crossfade: dip the fade bus (reverb tail bridges the gap), swap, swell back */
  function crossfadeTo(id){
    if(!CR_TRACKS[id]) return;
    var ctx=Music.ensure(), now=ctx.currentTime;
    if(S.track===id && S.running) return;                       // already this song — don't restart
    if(!S.running){ startTrack(id); try{ Music._fade.gain.setValueAtTime(0.0001,now); Music._fade.gain.linearRampToValueAtTime(1,now+1.2);}catch(e){} return; }
    try{ Music._fade.gain.cancelScheduledValues(now); Music._fade.gain.setValueAtTime(Math.max(0.0001,Music._fade.gain.value),now);
         Music._fade.gain.linearRampToValueAtTime(0.0001, now+1.0); }catch(e){}
    clearTimeout(Music._xf);
    Music._xf=setTimeout(function(){ startTrack(id); var t=Music.ensure().currentTime;
      try{ Music._fade.gain.setValueAtTime(0.0001,t); Music._fade.gain.linearRampToValueAtTime(1,t+1.4);}catch(e){} }, 1050);
  }

  /* ---------------- MUSIC DIRECTOR (one song at a time) ---------------- */
  var Director = {
    zone:null, building:null, manual:null, current:null, timer:null,
    target:function(){ return this.manual || this.building || this.zone || 'veyhollow_town'; },
    setZone:function(z){ this.zone=zoneToTrack(z); this.apply(); },
    setBuilding:function(t){ t=t||null; if(t===this.building) return; this.building=t; this.apply(); },
    setManual:function(t){ this.manual=(t&&CR_TRACKS[t])?t:null; this.apply(true); },
    apply:function(now){
      var self=this; clearTimeout(this.timer);
      this.timer=setTimeout(function(){
        var tgt=self.target();
        if(tgt===self.current && S.running) return;             // tasteful: no redundant restarts
        self.current=tgt; if(Music.on && Music._ready) crossfadeTo(tgt);
      }, now?0:650);                                            // debounce → no thrash on quick in/out
    }
  };
  Music.Director=Director;
  // poll which (if any) song-bearing building the player is standing in
  setInterval(function(){
    if(typeof player==='undefined'||!player||!WORLD.interiors) return;
    var px=player.position.x, pz=player.position.z, found=null;
    for(var i=0;i<WORLD.interiors.length;i++){ var it=WORLD.interiors[i];
      if(it.song && Math.abs(px-it.x)<it.hw && Math.abs(pz-it.z)<it.hd){ found=it.song; break; } }
    Director.setBuilding(found);
  }, 400);

  /* ---------------- volume + public API ---------------- */
  Music.tracks = CR_TRACKS;
  Music.vol = (function(){ try{ var v=localStorage.getItem('cr_vol_music'); return v!=null?+v:0.5; }catch(e){ return 0.5; } })();
  Music.setVolume = function(v){ Music.vol=Math.max(0,Math.min(1,v)); try{ localStorage.setItem('cr_vol_music',Music.vol); }catch(e){}
    if(Music._master && Music.on){ try{ Music._master.gain.cancelScheduledValues(Music.ensure().currentTime); }catch(e){} try{ Music._master.gain.value=Music.vol; }catch(e){} } };
  Music.start=function(){
    if(this.on) return; this.on=true;
    try{ localStorage.setItem('cr_music_on','1'); }catch(e){}
    var ctx=this.ensure(); if(!Music._lofi) buildChain(ctx);
    var v=(Music.vol!=null?Music.vol:0.5);
    try{ this._master.gain.setValueAtTime(0.0001,ctx.currentTime); this._master.gain.exponentialRampToValueAtTime(Math.max(0.0001,v),ctx.currentTime+1.2); }
    catch(e){ try{ this._master.gain.value=v; }catch(_e){} }
    var b=document.getElementById('music-btn'); if(b) b.textContent='♪';
    if(Music._ready) Director.apply(true); else loadInstruments();
  };
  Music.stop=function(){
    this.on=false; try{ localStorage.setItem('cr_music_on','0'); }catch(e){}
    S.running=false; clearTimeout(S.look); clearTimeout(Music._xf);
    try{ this._master.gain.value=0; }catch(e){}
    var b=document.getElementById('music-btn'); if(b) b.textContent='✕';
  };
  Music.toggle=function(){ this.on? this.stop() : this.start(); };
  Music.onZone=function(z){ this.mode = this.mode||'auto'; if(this.mode==='auto'){ Director.manual=null; Director.setZone(z); } };
  Music.play=function(id){ this.mode='manual'; Director.setManual(id); };
  Music.scheduleLoop=function(){};   // superseded by the bar scheduler
  }
})();
