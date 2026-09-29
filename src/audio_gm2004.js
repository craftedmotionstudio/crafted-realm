/* ============================================================================
   CRAFTED REALM — GM2004: a small General MIDI-style sequencer for the old-school soundtrack
   ----------------------------------------------------------------------------
   The 2004 browser-MMO sound: one General MIDI bank, voices panned dry, notes that start cleanly and decay, a
   singable tune over a bouncy accompaniment, a little velocity life, a short room and no lofi smear. Songs are
   DATA written in a compact score notation (below), compiled once into timed note events, and looped seamlessly.

   Bank: assets/audio/gm/<instrument>-mp3.js (MIDI.js format; FluidR3_GM, CC BY 3.0; built by tools/build_gm_bank.py)
   with one sample every three semitones. The sampler pitch-shifts at most a semitone between them. Only the samples
   a song actually uses are decoded, and buffers no longer used by the playing songs are dropped.

   SCORE NOTATION (one string per voice per part):
     melody   E5/8 D5 C5/4. r/8 | G4/2~ G4/8 ...     note/duration; the duration carries over until changed
              durations 1 2 4 8 16 (+'.' dotted, +'t' triplet); r = rest; C4+E4+G4/2 = chord; '|' = bar check
              suffixes: ~ tie into the next note, ! accent, ? soft, ' staccato, _ full length
              dynamics tokens pp p mp mf f ff; % repeats the previous bar
     pattern  @arp/8 R 3 5 8 5 3 5 3                  steps over the part's chords, repeated every bar
              R/1 root, 3 third, 5 fifth, 7 seventh (octave if none), 8 10 12 an octave up, -3 -5 -8 below,
              B bass (the slash bass, else the root), C the whole chord (block), '.' rest, '-' hold
     chords   'F | C/E | Dm7 | Bb C | Bb:3 C:1'     one bar per '|'; several chords share a bar evenly or by :beats
   Voices: {i: instrument, v: volume 0-1, p: pan -1..1, base: register ('C3': pattern roots sit around it),
            rv: reverb send, hum: velocity jitter}. Instrument 'kit' is a small synthesized GM drum kit
            (36 kick, 37 rim, 38 snare, 42 hat, 54 tambourine, 70 shaker).
   Loaded as a plain script before the Music Director bridge; also require()-able in node for the tests.
   ========================================================================== */
(function(root){
  'use strict';
  var NAMES=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  var PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function noteToMidi(s){ var m=/^([A-G])(#|b)?(-?\d)$/.exec(s); if(!m) return null;
    return PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12*(+m[3]+1); }
  function midiName(m){ return NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1); }

  /* ---------------- chords ---------------- */
  var QUAL={ '':[0,4,7], 'm':[0,3,7], 'dim':[0,3,6], 'aug':[0,4,8], 'sus2':[0,2,7], 'sus4':[0,5,7], 'sus':[0,5,7],
    '7':[0,4,7,10], 'maj7':[0,4,7,11], 'm7':[0,3,7,10], '6':[0,4,7,9], 'm6':[0,3,7,9], 'add9':[0,4,7,14],
    'madd9':[0,3,7,14], '5':[0,7,12], 'dim7':[0,3,6,9], 'm7b5':[0,3,6,10], '9':[0,4,7,10,14], '7sus4':[0,5,7,10],
    'mmaj7':[0,3,7,11] };
  function parseChord(sym){
    if(sym==='N') return null;
    var m=/^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(sym);
    if(!m || !QUAL.hasOwnProperty(m[3])) throw new Error('bad chord "'+sym+'"');
    var r=(PC[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+12)%12;
    var b=m[4]? (PC[m[4]]+(m[5]==='#'?1:m[5]==='b'?-1:0)+12)%12 : r;
    return { sym:sym, root:r, iv:QUAL[m[3]], bass:b };
  }
  // the root's pitch placed around a register (base-5 .. base+6)
  function rootNear(pc, base){ var m=base-5; while(((m%12)+12)%12!==pc) m++; return m; }
  function degree(ch, tok){
    var iv=ch.iv, map={ 'R':iv[0], '1':iv[0], '3':iv[1], '5':iv[2]!=null?iv[2]:7, '7':iv[3]!=null?iv[3]:12,
      '9':iv[4]!=null?iv[4]:14, '8':12, '10':iv[1]+12, '12':(iv[2]!=null?iv[2]:7)+12, '15':24,
      '-3':iv[1]-12, '-5':(iv[2]!=null?iv[2]:7)-12, '-8':-12 };
    return map.hasOwnProperty(tok)? map[tok] : null;
  }
  // close-position voicing near base, smallest total movement from the previous voicing
  function voice(ch, base, prev){
    var tones=ch.iv.slice(0, Math.min(4, ch.iv.length)).map(function(i){ return (ch.root+i)%12; });
    var best=null, bestCost=1e9;
    for(var inv=0; inv<tones.length; inv++){
      for(var shift=-12; shift<=12; shift+=12){
        var notes=[], lo=base+shift, p=lo;
        for(var k=0;k<tones.length;k++){ var pc=tones[(inv+k)%tones.length]; while(((p%12)+12)%12!==pc) p++; notes.push(p); p++; }
        var cost=0;
        if(prev && prev.length===notes.length){ for(var j=0;j<notes.length;j++) cost+=Math.abs(notes[j]-prev[j]); }   // voice by voice
        else if(prev){ for(var j2=0;j2<notes.length;j2++){ var d=1e9; for(var q=0;q<prev.length;q++) d=Math.min(d,Math.abs(prev[q]-notes[j2])); cost+=d; } }
        else cost=Math.abs(notes[0]-base)*2;
        cost+=Math.abs(notes[0]-base)*0.1;   // tie-break toward the register centre
        cost+=Math.max(0,notes[0]-(base+7))*3+Math.max(0,(base-5)-notes[0])*3;   // stay in the register
        if(cost<bestCost){ bestCost=cost; best=notes; }
      }
    }
    return best;
  }

  /* ---------------- durations ---------------- */
  function durBeats(code){   // in quarter-note beats
    var m=/^(1|2|4|8|16|32)(\.|t)?$/.exec(code); if(!m) return null;
    var d=4/(+m[1]); if(m[2]==='.') d*=1.5; else if(m[2]==='t') d*=2/3; return d;
  }
  var DYN={pp:40, p:54, mp:68, mf:82, f:98, ff:112};

  /* ---------------- deterministic humanize ---------------- */
  function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function rnd(seed){ seed=(seed^0x9e3779b9)>>>0; seed=Math.imul(seed^(seed>>>16),0x85ebca6b)>>>0; seed=Math.imul(seed^(seed>>>13),0xc2b2ae35)>>>0; return ((seed^(seed>>>16))>>>0)/4294967296; }

  /* ---------------- compiler ---------------- */
  function parseBars(str){ return String(str).split('|').map(function(b){ return b.trim(); }); }
  function chordTimeline(str, bpb){   // -> [{t0,t1,ch}] in beats, and the bar count
    var out=[], bars=parseBars(str), prev=null;
    if(bars.length && bars[bars.length-1]==='') bars.pop();
    bars.forEach(function(bar, bi){
      var toks=bar.split(/\s+/).filter(Boolean), w=[], sum=0;
      if(!toks.length) throw new Error('empty chord bar '+(bi+1));
      toks.forEach(function(t){ var m=/^(.*?)(?::(\d+(?:\.\d+)?))?$/.exec(t); var wt=m[2]?+m[2]:null; w.push({sym:m[1],wt:wt}); });
      var fixed=w.reduce(function(a,x){ return a+(x.wt||0); },0), free=w.filter(function(x){ return !x.wt; }).length;
      if(fixed>bpb+1e-9 || (free===0 && Math.abs(fixed-bpb)>1e-9)) throw new Error('chord bar '+(bi+1)+' "'+bar+'" weights != '+bpb+' beats');
      var t=bi*bpb;
      w.forEach(function(x){ var len=x.wt||(bpb-fixed)/free; var sym=(x.sym==='%'||x.sym==='-')?(prev&&prev.sym):x.sym;
        var ch=sym?parseChord(sym):null; out.push({t0:t,t1:t+len,ch:ch}); t+=len; prev=ch||prev; });
    });
    return { spans:out, bars:bars.length };
  }
  function chordAt(spans, t){ for(var i=0;i<spans.length;i++) if(t>=spans[i].t0-1e-9 && t<spans[i].t1-1e-9) return spans[i].ch; return null; }

  function compileMelody(str, bpb, where){
    var toks=String(str).trim().split(/\s+/).filter(Boolean), out=[], t=0, dur=1, vel=DYN.mf, bars=[], barStart=0, tieNext=false;
    function err(m){ throw new Error(where+': '+m+' (at beat '+t.toFixed(2)+', bar '+(Math.floor(t/bpb+1e-9)+1)+')'); }
    for(var i=0;i<toks.length;i++){
      var tk=toks[i];
      if(tk==='|'){ if(Math.abs(t/bpb-Math.round(t/bpb))>1e-6) err('bar line mid-bar (bar holds '+(t-barStart).toFixed(3)+' beats)');
        bars.push(out.filter(function(e){ return e.t>=barStart-1e-9 && e.t<t-1e-9; })); barStart=t; continue; }
      if(DYN.hasOwnProperty(tk)){ vel=DYN[tk]; continue; }
      if(tk==='%'){   // repeat the previous bar (must stand alone in its bar)
        var pb=bars[bars.length-1]; if(!pb) err('% with no previous bar'); if(Math.abs(t-barStart)>1e-6) err('% must start a bar');
        pb.forEach(function(e){ out.push({t:e.t+bpb, d:e.d, m:e.m, v:e.v, g:e.g}); });
        t+=bpb; tieNext=false; continue; }
      var m=/^([^/!?'_~]+)(?:\/([0-9]+[.t]?))?([!?'_~]*)$/.exec(tk);
      if(!m) err('bad token "'+tk+'"');
      if(m[2]!=null){ var d=durBeats(m[2]); if(d==null) err('bad duration "'+m[2]+'"'); dur=d; }
      var sfx=m[3]||'', v=vel+(sfx.indexOf('!')>=0?16:0)-(sfx.indexOf('?')>=0?16:0);
      var gate=sfx.indexOf("'")>=0?0.45:(sfx.indexOf('_')>=0?1.0:null);
      if(m[1]==='r'){ t+=dur; tieNext=false; continue; }
      var ps=m[1].split('+'), mids=ps.map(function(p){ var x=noteToMidi(p); if(x==null) err('bad note "'+p+'"'); return x; });
      if(tieNext){   // extend the tied notes instead of re-striking
        mids.forEach(function(x){ for(var q=out.length-1;q>=0;q--){ if(out[q].m===x && Math.abs(out[q].t+out[q].d-t)<1e-6){ out[q].d+=dur; return; } } err('tie to a different note '+midiName(x)); });
      } else mids.forEach(function(x){ out.push({t:t, d:dur, m:x, v:v, g:gate}); });
      tieNext=sfx.indexOf('~')>=0; t+=dur;
    }
    return { events:out, beats:t };
  }

  function compilePattern(str, spans, beats, bpb, vo, where){
    var toks=String(str).trim().split(/\s+/), head=toks.shift(), out=[];
    var m=/^@(arp|bass|pad|strum|none)(?:\/([0-9]+[.t]?))?$/.exec(head);
    if(!m) throw new Error(where+': bad pattern head "'+head+'"');
    if(m[1]==='none') return out;
    var step=m[2]? durBeats(m[2]) : (m[1]==='pad'? bpb : 0.5);
    if(step==null) throw new Error(where+': bad pattern step');
    if(m[1]==='pad' && !toks.length) toks=['C'];
    var base=noteToMidi(vo.base||(m[1]==='bass'?'C3':(m[1]==='pad'?'G3':'C4')));
    var prevV=null, n=Math.round(bpb/step), lastCh=null, lastBlock=null;
    if(Math.abs(n*step-bpb)>1e-6) throw new Error(where+': pattern step does not divide the bar');
    for(var t=0, k=0; t<beats-1e-9; t+=step, k++){
      var tk=toks[k%toks.length], ch=chordAt(spans,t); if(!ch || tk==='.') continue;
      if(m[1]==='pad' && tk==='C' && ch===lastCh && lastBlock && k%n!==0){   // pads re-strike only when the chord changes
        lastBlock.forEach(function(e){ e.d+=step; }); continue; }
      lastCh=ch;
      var acc=/!$/.test(tk), soft=/\?$/.test(tk); tk=tk.replace(/[!?]$/,'');
      if(tk==='-'){ for(var q=out.length-1;q>=0&&out[q].t>=t-step*8;q--){ if(Math.abs(out[q].t+out[q].d-t)<1e-6){ var tt=out[q].t; for(var z=q;z>=0&&out[z].t===tt;z--) out[z].d+=step; break; } } continue; }
      var v=(k%n===0? 88:76)+(acc?14:0)-(soft?14:0);
      if(tk==='C'){ prevV=voice(ch, base, prevV); lastBlock=prevV.map(function(x){ var e={t:t,d:step,m:x,v:v-4,g:(m[1]==='pad'?1.02:null)}; out.push(e); return e; }); continue; }
      var r=rootNear(ch.root, base);
      if(tk==='B'){ out.push({t:t,d:step,m:rootNear(ch.bass,base),v:v}); continue; }
      var dg=degree(ch,tk); if(dg==null) throw new Error(where+': bad pattern token "'+tk+'"');
      out.push({t:t,d:step,m:r+dg,v:v});
    }
    return out;
  }

  function compile(id, spec){
    var ts=(spec.time||'4/4').split('/'), bpb=+ts[0]*4/(+ts[1]), bpm=spec.bpm;
    var spb=60/bpm, form=String(spec.form||Object.keys(spec.parts)[0]).split(/\s+/).filter(Boolean);
    var events=[], t0=0, partInfo=[], seen={};
    form.forEach(function(pid, fi){
      var part=spec.parts[pid]; if(!part) throw new Error(id+': form names missing part '+pid);
      var where=id+'.'+pid, tl=part.chords? chordTimeline(part.chords, bpb) : {spans:[],bars:0};
      var beats=tl.bars*bpb, lines={}, mel={};
      Object.keys(part).forEach(function(k){ if(k!=='chords' && !spec.voices[k]) throw new Error(where+': unknown voice "'+k+'"'); });
      Object.keys(spec.voices).forEach(function(vn){
        var src=part[vn]; if(src==null || src==='') return;
        lines[vn]=src;
        if(/^\s*[@=]/.test(src)) return;
        var c=mel[vn]=compileMelody(src, bpb, where+'.'+vn);
        if(!part.chords) beats=Math.max(beats, c.beats);
        else if(Math.abs(c.beats-beats)>1e-6) throw new Error(where+'.'+vn+': '+c.beats+' beats but the part is '+beats+' ('+tl.bars+' bars)');
      });
      Object.keys(mel).forEach(function(vn){ if(Math.abs(mel[vn].beats-beats)>1e-6) throw new Error(where+'.'+vn+': '+mel[vn].beats+' beats, part is '+beats); });
      if(Math.abs(beats/bpb-Math.round(beats/bpb))>1e-6) throw new Error(where+': part is not a whole number of bars');
      var partEv={};
      var order=Object.keys(lines).sort(function(a,b){ return (/^\s*=/.test(lines[a])?1:0)-(/^\s*=/.test(lines[b])?1:0); });
      order.forEach(function(vn){
        var vo=spec.voices[vn], src=lines[vn], evs, cp=/^\s*=(\w+)([+-]\d+)?\s*$/.exec(src);
        if(cp){   // '=lead+12': double another voice of this part, transposed
          if(!partEv[cp[1]]) throw new Error(where+'.'+vn+': nothing to double in "'+cp[1]+'"');
          var sh=cp[2]?+cp[2]:0; evs=partEv[cp[1]].map(function(e){ return {t:e.t,d:e.d,m:e.m+sh,v:e.v,g:e.g}; });
        }
        else if(/^\s*@/.test(src)){ if(!part.chords) throw new Error(where+'.'+vn+': pattern needs chords'); evs=compilePattern(src, tl.spans, beats, bpb, vo, where+'.'+vn); }
        else evs=mel[vn].events;
        partEv[vn]=evs;
        evs.forEach(function(e, i){
          var beatInBar=e.t%bpb, metric=(beatInBar<1e-6?7:(Math.abs(beatInBar-bpb/2)<1e-6&&bpb%2===0?3:0));
          var j=(rnd(hash(id+vn+pid+fi+':'+i))-0.5)*2*(vo.hum!=null?vo.hum:5);
          var tt=t0+e.t;
          if(spec.swing && Math.abs((e.t*2)%2-1)<1e-6) tt+=spec.swing*0.5;   // late off-beat eighths
          events.push({ t:tt*spb, d:e.d*spb, m:e.m, v:Math.max(1,Math.min(127,Math.round(e.v+metric+j))), vo:vn, g:e.g });
        });
      });
      partInfo.push({part:pid, bars:beats/bpb, at:t0*spb});
      t0+=beats; seen[pid]=1;
    });
    events.sort(function(a,b){ return a.t-b.t || a.m-b.m; });
    var notes={};
    events.forEach(function(e){ var inst=spec.voices[e.vo].i; (notes[inst]=notes[inst]||{})[e.m]=1; });
    return { id:id, name:spec.name, spec:spec, bpm:bpm, bpb:bpb, beats:t0, seconds:t0*spb, events:events,
             parts:partInfo, notes:notes, voices:spec.voices };
  }

  /* ---------------- instruments (MIDI-like envelopes; seconds) ---------------- */
  var ENV={ flute:{a:.03,r:.14}, recorder:{a:.02,r:.1}, oboe:{a:.03,r:.1}, clarinet:{a:.025,r:.12}, bassoon:{a:.03,r:.1},
    french_horn:{a:.05,r:.2}, fiddle:{a:.03,r:.15}, accordion:{a:.03,r:.1}, choir_aahs:{a:.14,r:.4},
    string_ensemble_1:{a:.09,r:.35}, cello:{a:.05,r:.25}, timpani:{a:0,r:.7,ring:1}, glockenspiel:{a:0,r:.9,ring:1},
    marimba:{a:0,r:.3,ring:1}, acoustic_bass:{a:0,r:.12}, tubular_bells:{a:0,r:1.4,ring:1}, harpsichord:{a:0,r:.3},
    taiko_drum:{a:0,r:.5,ring:1}, woodblock:{a:0,r:.1,ring:1}, orchestral_harp:{a:0,r:.9,ring:1},
    acoustic_guitar_nylon:{a:0,r:.55,ring:1}, pizzicato_strings:{a:0,r:.3,ring:1}, kit:{a:0,r:.05,ring:1} };
  var GATE={ sustain:0.93, decay:1.0 };

  /* ---------------- bank loading (browser) ---------------- */
  var BANK={ url:'assets/audio/gm/', manifest:null, fonts:{}, buffers:{}, pending:{} };
  function fetchText(u){ return fetch(u).then(function(r){ if(!r.ok) throw new Error(u+' '+r.status); return r.text(); }); }
  function loadManifest(){ return BANK.manifest? Promise.resolve(BANK.manifest) :
    fetchText(BANK.url+'BANK.json').then(function(t){ BANK.manifest=JSON.parse(t); return BANK.manifest; }); }
  function loadFont(inst){
    if(BANK.fonts[inst]) return BANK.fonts[inst];
    return BANK.fonts[inst]=fetchText(BANK.url+inst+'-mp3.js').then(function(txt){
      var b=txt.indexOf('=',txt.indexOf('MIDI.Soundfont.'))+1, e=txt.lastIndexOf(',');
      return JSON.parse(txt.slice(b,e)+'}'); });
  }
  function nearestSample(inst, m){
    var s=BANK.manifest[inst].samples, best=s[0];
    for(var i=1;i<s.length;i++) if(Math.abs(s[i]-m)<Math.abs(best-m)) best=s[i];
    return best;
  }
  function b64ToBuf(dataUri){ var s=atob(dataUri.slice(dataUri.indexOf(',')+1)), u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u.buffer; }
  function decode(ctx, ab){ return new Promise(function(ok,bad){ ctx.decodeAudioData(ab, ok, bad); }); }
  // MP3 encoder delay: Chrome keeps LAME's ~50 ms of leading silence (other decoders may trim it). Find where the
  // sound really starts: first sample above -34 dB of the peak (MP3 pre-echo sits below that), backed off 3 ms.
  function leadIn(buf){
    var d=buf.getChannelData(0), n=Math.min(d.length, Math.floor(buf.sampleRate*0.25)), pk=0, i;
    for(i=0;i<d.length;i++) pk=Math.max(pk, Math.abs(d[i]));
    var thr=pk*0.02; for(i=0;i<n;i++) if(Math.abs(d[i])>thr) break;
    return i>=n? 0 : Math.max(0, i/buf.sampleRate-0.003);
  }
  // make sure every sample the song needs is decoded for this context
  function prepare(ctx, song){
    return loadManifest().then(function(){
      var jobs=[];
      Object.keys(song.notes).forEach(function(inst){
        if(inst==='kit') return;
        if(!BANK.manifest[inst]) throw new Error('instrument not in bank: '+inst);
        var need={}; Object.keys(song.notes[inst]).forEach(function(m){ need[nearestSample(inst,+m)]=1; });
        jobs.push(loadFont(inst).then(function(font){
          return Promise.all(Object.keys(need).map(function(sm){
            var key=inst+':'+sm; if(BANK.buffers[key] && BANK.buffers[key].ctx===ctx) return;
            if(BANK.pending[key]) return BANK.pending[key];
            return BANK.pending[key]=decode(ctx, b64ToBuf(font[midiName(+sm)])).then(function(buf){ BANK.buffers[key]={ctx:ctx,buf:buf,lead:leadIn(buf)}; delete BANK.pending[key]; });
          }));
        }));
      });
      return Promise.all(jobs);
    });
  }
  // drop decoded samples that none of the given songs use (memory: only the playing songs stay resident)
  function release(keepSongs){
    var keep={};
    keepSongs.forEach(function(s){ if(!s) return; Object.keys(s.notes).forEach(function(inst){ if(inst==='kit') return;
      Object.keys(s.notes[inst]).forEach(function(m){ keep[inst+':'+nearestSample(inst,+m)]=1; }); }); });
    Object.keys(BANK.buffers).forEach(function(k){ if(!keep[k]) delete BANK.buffers[k]; });
  }

  /* ---------------- mix chain ---------------- */
  function makeRoom(ctx){   // short, bright-ish room: ~1.1 s tail, no low rumble, deterministic
    var sr=ctx.sampleRate, len=Math.floor(sr*1.3), buf=ctx.createBuffer(2,len,sr), seed=12345;
    for(var c=0;c<2;c++){ var d=buf.getChannelData(c), lp=0, avg=0;
      for(var i=0;i<len;i++){ seed=(Math.imul(seed,1664525)+1013904223)>>>0; var w=(seed/4294967296*2-1);
        var t=i/sr, env=t<0.012?0:Math.exp(-(t-0.012)/0.2);
        lp+=0.55*(w-lp);                       // gentle top roll-off (air, not a muffle)
        avg+=0.003*(lp-avg);                   // slow average: subtracting it removes DC and sub rumble
        d[i]=(lp-avg)*env; } }
    var conv=ctx.createConvolver(); conv.normalize=true; conv.buffer=buf; return conv;
  }
  function makeChain(ctx, dest){
    var input=ctx.createGain(), send=ctx.createGain(), room=makeRoom(ctx), wet=ctx.createGain(), comp=ctx.createDynamicsCompressor();
    input.gain.value=1.8; wet.gain.value=0.55; send.gain.value=1;   // +5 dB into a gentle peak catcher
    comp.threshold.value=-8; comp.knee.value=6; comp.ratio.value=3; comp.attack.value=0.01; comp.release.value=0.2;
    input.connect(comp); send.connect(room); room.connect(wet); wet.connect(comp); comp.connect(dest);
    return { input:input, send:send, out:comp };
  }

  /* ---------------- the sampler ---------------- */
  var NOISE=null;
  function noise(ctx){ if(NOISE&&NOISE.ctx===ctx) return NOISE.buf; var sr=ctx.sampleRate, b=ctx.createBuffer(1,sr,sr), d=b.getChannelData(0), s=777;
    for(var i=0;i<sr;i++){ s=(Math.imul(s,1664525)+1013904223)>>>0; d[i]=s/4294967296*2-1; } NOISE={ctx:ctx,buf:b}; return b; }
  function drum(ctx, out, m, t, g){   // small synthesized GM kit
    var n, f, e=ctx.createGain(); e.connect(out);
    if(m===36){ var o=ctx.createOscillator(); o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(42,t+0.16);
      e.gain.setValueAtTime(g*1.2,t); e.gain.exponentialRampToValueAtTime(0.001,t+0.28); o.connect(e); o.start(t); o.stop(t+0.3); return; }
    n=ctx.createBufferSource(); n.buffer=noise(ctx); f=ctx.createBiquadFilter();
    var dur= m===38?0.16 : m===54?0.2 : m===70?0.07 : m===37?0.04 : 0.05;
    f.type= m===38?'bandpass':'highpass'; f.frequency.value= m===38?1900 : m===54?6500 : m===70?5200 : m===37?2500 : 8000; f.Q.value= m===38?0.8:0.7;
    var lvl= m===38?0.9 : m===54?0.5 : m===70?0.35 : m===37?0.6 : 0.35;
    e.gain.setValueAtTime(0.0001,t); e.gain.linearRampToValueAtTime(g*lvl,t+0.002); e.gain.exponentialRampToValueAtTime(0.001,t+dur);
    n.connect(f); f.connect(e); n.start(t, (m*0.0137)%0.8); n.stop(t+dur+0.02);
    if(m===38){ var o2=ctx.createOscillator(), e2=ctx.createGain(); o2.frequency.value=190; e2.gain.setValueAtTime(g*0.5,t); e2.gain.exponentialRampToValueAtTime(0.001,t+0.08); o2.connect(e2); e2.connect(out); o2.start(t); o2.stop(t+0.1); }
  }
  function playNote(ctx, out, inst, m, t, dur, vel, gateOverride){
    var g=Math.pow(vel/127,1.7);
    if(inst==='kit'){ drum(ctx,out,m,t,g); return; }
    var man=BANK.manifest[inst], sm=nearestSample(inst,m), rec=BANK.buffers[inst+':'+sm];
    if(!rec || rec.ctx!==ctx) return;
    var buf=rec.buf, lead=rec.lead||0, rate=Math.pow(2,(m-sm)/12), env=ENV[inst]||{a:.02,r:.2}, kind=man.kind;
    g*=man.gain||1;
    var hold=dur*(gateOverride!=null? gateOverride : GATE[kind]), sampleLen=(buf.duration-lead)/rate;
    var end = env.ring? Math.min(t+Math.max(hold,0.05)+env.r, t+sampleLen) : t+hold+env.r;
    var usable=sampleLen-0.06;
    var segs=[];   // sustained notes longer than the sample: crossfade loop from 0.9 s into the sample
    if(kind==='sustain' && end-t>usable){
      var loopOff=lead+0.9, xf=0.18, segLen=(buf.duration-loopOff)/rate-0.06, at=t, off=lead, len=usable;
      while(at<end){ segs.push({at:at, off:off, len:Math.min(len, end-at+0.02)}); at+=len-xf; off=loopOff; len=segLen; }
    } else segs.push({at:t, off:lead, len:Math.min(end-t+0.02, sampleLen)});
    segs.forEach(function(s, i){
      var src=ctx.createBufferSource(), e=ctx.createGain(); src.buffer=buf; src.playbackRate.value=rate;
      src.connect(e); e.connect(out);
      var a=i? 0.18 : Math.max(0.002, env.a), stopAt=s.at+s.len;
      e.gain.setValueAtTime(0, s.at); e.gain.linearRampToValueAtTime(g, s.at+a);
      if(i<segs.length-1){ e.gain.setValueAtTime(g, stopAt-0.18); e.gain.linearRampToValueAtTime(0, stopAt); }
      else if(!env.ring || end<t+sampleLen){ var rs=Math.max(s.at+a, end-env.r); e.gain.setValueAtTime(g, rs); e.gain.exponentialRampToValueAtTime(0.0005, end); }
      src.start(s.at, s.off); src.stop(Math.min(stopAt, end)+0.01);
    });
  }

  /* ---------------- song instance (voices -> song bus) ---------------- */
  function Voices(ctx, song, chain){
    var bus=ctx.createGain(), vs={};
    bus.connect(chain.input);
    Object.keys(song.voices).forEach(function(vn){
      var vo=song.voices[vn], g=ctx.createGain(), pan=ctx.createStereoPanner? ctx.createStereoPanner() : null, sg=ctx.createGain();
      g.gain.value=(vo.v!=null?vo.v:0.7);
      if(pan){ pan.pan.value=vo.p||0; g.connect(pan); pan.connect(bus); pan.connect(sg); } else { g.connect(bus); g.connect(sg); }
      sg.gain.value=(vo.rv!=null?vo.rv:0.22); sg.connect(chain.send);
      vs[vn]=g;
    });
    return { bus:bus, v:vs };
  }
  function scheduleRange(ctx, song, voices, startTime, from, to){   // events with from <= t < to (song seconds)
    var ev=song.events;
    for(var i=0;i<ev.length;i++){ var e=ev[i]; if(e.t<from-1e-9) continue; if(e.t>=to-1e-9) break;
      playNote(ctx, voices.v[e.vo], song.voices[e.vo].i, e.m, startTime+e.t, e.d, e.v, e.g); }
  }

  /* ---------------- live player: one song at a time, crossfaded ---------------- */
  var P={ ctx:null, chain:null, cur:null, loop:true, onEnded:null, timer:null, want:null, compiled:{} };
  function compiled(id){ if(!P.compiled[id]){ var s=GM.songs[id]; if(!s) return null; P.compiled[id]=compile(id,s); } return P.compiled[id]; }
  function tick(){
    var c=P.cur; clearTimeout(P.timer); if(!c || !P.ctx) return;
    var now=P.ctx.currentTime, horizon=now+0.5;
    while(true){
      var songEnd=c.start+c.song.seconds;
      var to=Math.min(horizon, songEnd)-c.start;
      if(to>c.pos){ scheduleRange(P.ctx, c.song, c.voices, c.start, c.pos, to); c.pos=to; }
      if(horizon>=songEnd){
        if(P.loop){ c.start=songEnd; c.pos=0; c.loops++; continue; }
        if(!c.endFired && now>=songEnd+0.3){ c.endFired=true; if(P.onEnded) try{ P.onEnded(c.id); }catch(e){} return; }   // Loop off: done, stop ticking
      }
      break;
    }
    P.timer=setTimeout(tick, 120);
  }
  function fadeOut(inst, sec){
    if(!inst) return; var t=P.ctx.currentTime;
    try{ inst.voices.bus.gain.cancelScheduledValues(t); inst.voices.bus.gain.setValueAtTime(inst.voices.bus.gain.value,t); inst.voices.bus.gain.linearRampToValueAtTime(0.0001,t+sec); }catch(e){}
    setTimeout(function(){ try{ inst.voices.bus.disconnect(); }catch(e){} }, (sec+2.5)*1000);
  }
  var GM={
    songs:{}, BANK:BANK, ENV:ENV,
    song:function(id, spec){ this.songs[id]=spec; delete P.compiled[id]; return spec; },
    compile:compile, parseChord:parseChord, noteToMidi:noteToMidi, midiName:midiName, voiceChord:voice,
    list:function(){ return Object.keys(this.songs); },
    get current(){ return P.cur? P.cur.id : null; },
    get ended(){ return !!(P.cur && P.cur.endFired); },   // Loop was off and the current song has played through
    get loop(){ return P.loop; }, set loop(v){ P.loop=!!v; },
    set onEnded(fn){ P.onEnded=fn; },
    attach:function(ctx, dest){ if(P.ctx===ctx) return; P.ctx=ctx; P.chain=makeChain(ctx, dest||ctx.destination); },
    preload:function(id){ var s=compiled(id); return s&&P.ctx? prepare(P.ctx, s) : Promise.resolve(); },
    // play a song (crossfade from whatever plays); resolves once it has started
    play:function(id, opt){
      opt=opt||{}; var s=compiled(id); if(!s || !P.ctx) return Promise.resolve(false);
      if(P.cur && P.cur.id===id && !opt.restart) return Promise.resolve(true);
      P.want=id;
      return prepare(P.ctx, s).then(function(){
        if(P.want!==id) return false;                       // a newer request won
        var old=P.cur, fade=opt.fade!=null? opt.fade : 1.6, t=P.ctx.currentTime;
        fadeOut(old, fade);
        var v=Voices(P.ctx, s, P.chain);
        v.bus.gain.setValueAtTime(0.0001, t); v.bus.gain.linearRampToValueAtTime(1, t+(old? Math.max(0.4, fade*0.6) : 0.25));
        P.cur={ id:id, song:s, voices:v, start:t+(old? fade*0.35 : 0.08), pos:0, loops:0 };
        release([s, old&&old.song]);
        tick(); return true;
      });
    },
    stop:function(fade){ var c=P.cur; P.cur=null; P.want=null; clearTimeout(P.timer); if(c) fadeOut(c, fade!=null?fade:1.2); },
    // offline render: schedule loops x the song (plus an optional tail) into ctx -> dest
    render:function(ctx, dest, id, opt){
      opt=opt||{}; var s=compiled(id); if(!s) return Promise.reject(new Error('no song '+id));
      return prepare(ctx, s).then(function(){
        var chain=makeChain(ctx, dest), v=Voices(ctx, s, chain), loops=opt.loops||1, t0=opt.start||0.1;
        for(var k=0;k<loops;k++) scheduleRange(ctx, s, v, t0+k*s.seconds, 0, s.seconds);
        return s;
      });
    },
    release:function(){ release([P.cur&&P.cur.song]); }
  };
  root.GM2004=GM;
  if(typeof module!=='undefined' && module.exports) module.exports=GM;
})(typeof window!=='undefined'? window : globalThis);
