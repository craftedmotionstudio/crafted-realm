/* ============================================================================
   CRAFTED REALM — the 2004 MIDI set, part 2: the first mainland pieces (Hearthmere, the Hearthlands roads, the
   Scarlands, the caves). PURE DATA. Original compositions for Crafted Realm; none quotes, transcribes or
   paraphrases an existing game's melody, progression or title. Notation: src/audio_gm2004.js.
   ========================================================================== */
(function(){
  function rep(bar, n){ var a=[]; for(var i=0;i<n;i++) a.push(bar); return a.join(' | ')+' |'; }

  function go(G){

  // ---- Hearthmere: the market town. G major; clarinet and oboe chatter over a walking bass and off-beat guitar.
  var HM_A = 'mf B4/8 C5 D5/4 G5/4 D5/4 | E5/4. D5/8 C5/4 E5/4 | D5/8 B4 G4/4 B4/4 D5/4 | A4/4. B4/8 A4/2 | B4/8 C5 D5/4 G5/4 B5/4 | C6/4. B5/8 G5/4 E5/4 |';
  G.song('hm_hearthmere', {
    name:'Hearthmere Market Day', where:'Hearthmere (the town, its square and market)', bpm:108, time:'4/4',
    mood:'Cheerful bustle: a clarinet tune, an oboe that chats back, walking bass, guitar and tambourine.',
    voices:{
      cl:{i:'clarinet', v:1.02, p:-0.14},
      ob:{i:'oboe', v:0.92, p:0.16},
      gtr:{i:'acoustic_guitar_nylon', v:0.29, p:0.3, base:'G3'},
      bass:{i:'acoustic_bass', v:0.38, p:-0.04, base:'E2'},
      str:{i:'string_ensemble_1', v:0.11, p:0, base:'A3'},
      kit:{i:'kit', v:0.19, p:0.24, rv:0.1},
      glock:{i:'glockenspiel', v:0.14, p:-0.28}
    },
    parts:{
      I:{ chords:'G | D7', gtr:'@arp/8 . C . C . C . C', bass:'@bass/4 R 5 8 5', kit:rep('r/4 F#3 r F#3', 2) },
      A:{ chords:'G | C | G | D | G | C | Am D | G',
          cl:HM_A+' A5/4 E5/8 C5 D5/4 F#5/4 | G5/2. r/4 |',
          gtr:'@arp/8 . C . C . C . C', bass:'@bass/4 R 5 8 5', str:'@pad/2', kit:rep('r/4 F#3 r F#3', 8) },
      A2:{ chords:'G | C | G | D | G | C | Am D7 | G',
          ob:HM_A+' C5/4 A4/8 C5 A4/4 F#4/4 | G4/2. r/4 |',
          gtr:'@arp/8 . C . C . C . C', bass:'@bass/4 R 5 8 5', str:'@pad/2', kit:rep('r/4 F#3 r F#3', 8) },
      B:{ chords:'Em | C | G | D | Em | C | Am7 | D7',
          ob:'mf B4/4 E5/8 F#5 G5/4 E5/4 | C5/2 r/2 | r/1 | r/1 | B4/4 E5/8 F#5 G5/4 B5/4 | G5/2 r/2 | r/1 | r/1 |',
          cl:'mf r/1 | r/1 | D5/4 B4/8 G4 B4/4 D5/4 | A4/2 r/2 | r/1 | r/1 | C5/4 E5/8 G5 E5/4 C5/4 | D5/2 F#5/4 A5/4 |',
          gtr:'@arp/8 . C . C . C . C', bass:'@bass/4 R 5 8 5', str:'@pad/2', kit:rep('r/4 F#3 r F#3', 8) },
      A3:{ chords:'G | C | G | D | G | C | Am D | G',
          cl:HM_A+' A5/4 E5/8 C5 D5/4 F#5/4 | G5/2. r/4 |', glock:'=cl+12',
          gtr:'@arp/8 . C . C . C . C', bass:'@bass/4 R 5 8 5', str:'@pad/2', kit:rep('r/4 F#3 r F#3', 8) }
    },
    form:'I A A2 B A3'
  });

  // ---- The Hearthlands roads and fields: walking music. A major 6/8; oboe over harp, a horn on the long straight.
  var ROAD_1 = 'mf E5/4 C#5/8 A4/4 C#5/8 | B4/4. E5/4. | C#5/8 D5 E5 F#5/4 A5/8 | A5/4. F#5/4. |';
  var ROAD_B = 'mf F#4/4. A4/4. | E4/4. C#4/4. | D4/8 F#4 B4 D5/4 C#5/8 | C#5/4. A4/4. | B4/4. D5/4. | A4/8 F#4 D4 F#4/4 A4/8 | G#4/4. B4/4. | D5/4. B4/4. |';
  G.song('hm_road', {
    name:'Hedgerows and Milestones', where:'The Hearthlands roads, fields and farmland', bpm:96, time:'6/8',
    mood:'Open and unhurried: an oboe walking tune over harp, a horn for the long straight, a flute overhead.',
    voices:{
      ob:{i:'oboe', v:0.96, p:-0.12},
      hn:{i:'french_horn', v:0.93, p:0.1},
      fl:{i:'flute', v:0.69, p:0.24},
      harp:{i:'orchestral_harp', v:0.32, p:0.3, base:'C3'},
      pizz:{i:'pizzicato_strings', v:0.35, p:-0.06, base:'E2'},
      str:{i:'string_ensemble_1', v:0.14, p:0, base:'A3'}
    },
    parts:{
      I:{ chords:'A | E', harp:'@arp/8 R 5 8 10 8 5', pizz:'@bass/4. B 5', str:'@pad/2.' },
      A:{ chords:'A | E/G# | F#m | D | A/C# | Bm7 | E | E7',
          ob:ROAD_1+' E5/4 C#5/8 E5/4 A5/8 | D5/4. F#5/8 E5 D5 | B4/8 C#5 D5 E5/4 G#4/8 | B4/4. D5/4. |',
          harp:'@arp/8 R 5 8 10 8 5', pizz:'@bass/4. B 5', str:'@pad/2.' },
      A2:{ chords:'A | E/G# | F#m | D | D | A/E | E7 | A',
          ob:ROAD_1+' F#5/4 A5/8 D6/4 C#6/8 | C#6/4. A5/4. | B5/8 A5 G#5 D5/4 E5/8 | A5/4. r/4. |',
          harp:'@arp/8 R 5 8 10 8 5', pizz:'@bass/4. B 5', str:'@pad/2.' },
      B:{ chords:'D | A/C# | Bm | F#m | G | D/F# | E | E7',
          hn:ROAD_B, fl:'p A5/2. | A5/2. | B5/2. | A5/2. | B5/2. | A5/2. | B5/2. | G#5/2. |',
          harp:'@arp/8 R 5 8 5 10 5', pizz:'@bass/4. B 5', str:'@pad/2.' },
      B2:{ chords:'D | A/C# | Bm | F#m | G | D/F# | E | E7',
          hn:ROAD_B, fl:'=hn+12', harp:'@arp/8 R 5 8 5 10 5', pizz:'@bass/4. B 5', str:'@pad/2.' }
    },
    form:'I A A2 B B2 A2'
  });

  // ---- The Scarlands (past the Ditch): lawless ground. D minor with a Phrygian Eb; taiko, driving strings, horn.
  G.song('hm_scarlands', {
    name:'Ash on the Wind', where:'The Scarlands, north of the Ditch', bpm:100, time:'4/4',
    mood:'Tense and wary: taiko and timpani, driving low strings, a grim horn; the oboe keens like wind over ash.',
    voices:{
      hn:{i:'french_horn', v:0.6, p:-0.12},
      ob:{i:'oboe', v:0.48, p:0.16},
      str:{i:'string_ensemble_1', v:0.32, p:0.08, base:'D3'},
      choir:{i:'choir_aahs', v:0.22, p:0, base:'A3', rv:0.4},
      taiko:{i:'taiko_drum', v:0.5, p:-0.05, rv:0.3},
      timp:{i:'timpani', v:0.4, p:0.1, base:'G2', rv:0.3}
    },
    parts:{
      I:{ chords:'Dm | Dm', str:'@arp/8 R R 5 R 8 R 5 R', taiko:rep('D3/4 r/8 D3/8 D3/4 A2/4', 2) },
      A:{ chords:'Dm | Dm | Eb | Dm | Bb | C | A7 | A',
          hn:'mf D4/2. F4/4 | A4/4. G4/8 F4/4 E4/4 | Eb4/2. G4/4 | F4/4 E4/4 D4/2 | D4/4 F4/4 Bb4/4. A4/8 | G4/2 E4/2 | C#4/4 E4/4 A4/4 G4/4 | A4/2. r/4 |',
          str:'@arp/8 R R 5 R 8 R 5 R', taiko:rep('D3/4 r/8 D3/8 D3/4 A2/4', 8), timp:'@bass/2 R 5' },
      A2:{ chords:'Dm | Dm | Eb | Dm | Gm | A | Bb | A',
          hn:'f D5/2. F5/4 | A5/4. G5/8 F5/4 E5/4 | Eb5/2. G5/4 | F5/4 E5/4 D5/2 | D5/4 Bb4/4 G4/4. A4/8 | C#5/2 E5/2 | F5/4 D5/4 Bb4/2 | A4/2. r/4 |',
          str:'@arp/8 R R 5 R 8 R 5 R', choir:'@pad/1', taiko:rep('D3/4 r/8 D3/8 D3/4 A2/4', 8), timp:'@bass/2 R 5' },
      B:{ chords:'Gm | Gm | Dm | Dm | Eb | Bb | Eb | A7',
          ob:'mf G5/4 A5/8 Bb5 D6/4 Bb5/4 | G5/2. r/4 | F5/4 G5/8 A5 D6/4 A5/4 | A5/2. r/4 | G5/4 Bb5/8 G5 Eb5/4 G5/4 | F5/2 D5/2 | Eb5/4 G5/4 Bb5/4 G5/4 | C#6/2 A5/2 |',
          str:'@arp/8 R R 5 R 8 R 5 R', choir:'@pad/1', taiko:rep('D3/4 r/8 D3/8 D3/4 A2/4', 8), timp:'@bass/2 R 5' }
    },
    form:'I A A2 B A2'
  });

  // ---- Caves and deep places: where the lamps gutter. C minor, slow; bassoon, marimba drips, a dark choir.
  var CAVE_A = 'mp C3/2 Eb3/4 G3/4 | G3/4. Ab3/8 G3/4 Eb3/4 | C3/4 Eb3/4 Ab3/2 | B2/2. r/4 | C3/4 Eb3/4 G3/4 C4/4 | Ab3/2 F3/2 | Db3/4. F3/8 Ab3/2 | B2/2 D3/2 |';
  G.song('hm_cave', {
    name:'Where the Lamps Gutter', where:'Caves, dungeons and deep places', bpm:66, time:'4/4',
    mood:'Dark and dripping: a low bassoon, marimba drops, a far bell and a choir breathing in the stone.',
    voices:{
      bsn:{i:'bassoon', v:0.68, p:-0.1, base:'G2'},
      cl:{i:'clarinet', v:0.61, p:0.12},
      mar:{i:'marimba', v:0.3, p:0.34, base:'C4', rv:0.45},
      harp:{i:'orchestral_harp', v:0.26, p:-0.3, base:'C3', rv:0.4},
      choir:{i:'choir_aahs', v:0.17, p:0, base:'G3', rv:0.5},
      timp:{i:'timpani', v:0.26, p:0.05, base:'G2', rv:0.4},
      bell:{i:'tubular_bells', v:0.24, p:0.22, rv:0.55}
    },
    parts:{
      I:{ chords:'Cm | Cm', bell:'mp C5/1 | r/1 |', mar:'@arp/8 . 12 . . 8 . 10 .', choir:'@pad/1' },
      A:{ chords:'Cm | Cm | Ab | G | Cm | Fm | Db | G',
          bsn:CAVE_A, bell:'mp C5/1 | '+rep('r/1', 7), mar:'@arp/8 . 12 . . 8 . 10 .', choir:'@pad/1', timp:'@bass/1 R' },
      A2:{ chords:'Cm | Cm | Ab | G | Cm | Fm | Db | G',
          cl:'mp C4/2 Eb4/4 G4/4 | G4/4. Ab4/8 G4/4 Eb4/4 | C4/4 Eb4/4 Ab4/2 | B3/2. r/4 | C4/4 Eb4/4 G4/4 C5/4 | Ab4/2 F4/2 | Db4/4. F4/8 Ab4/2 | B3/2 D4/2 |',
          bsn:'@bass/2 R 5', harp:'@arp/8 R 5 8 5 R 5 8 5', mar:'@arp/8 . 12 . . 8 . 10 .', choir:'@pad/1', timp:'@bass/1 R' },
      B:{ chords:'Fm | Cm | Fm | G | Ab | Eb | Db | G7',
          cl:'mp F4/2 Ab4/4 C5/4 | Eb5/2. D5/4 | C5/4 Ab4/4 F4/2 | D4/2 B3/2 | Eb4/4 Ab4/4 C5/2 | Bb4/2 G4/2 | F4/4 Ab4/4 Db5/2 | B4/2 F4/2 |',
          bsn:'@bass/2 R 5', harp:'@arp/8 R 5 8 5 R 5 8 5', mar:'@arp/8 . 12 . . 8 . 10 .', choir:'@pad/1', timp:'@bass/1 R' }
    },
    form:'I A A2 B A'
  });

  }
  if(typeof GM2004!=='undefined') go(GM2004);
  else if(typeof module!=='undefined' && module.exports) module.exports=go;
})();
