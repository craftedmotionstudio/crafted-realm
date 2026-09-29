/* ============================================================================
   CRAFTED REALM — the 2004 MIDI set, part 1: the title theme and Tutor's Holm (one piece per area). PURE DATA.
   Every piece here is an original composition for Crafted Realm, written in the spirit of 2004 browser-MMO area
   themes. None quotes, transcribes or paraphrases an existing game's melody, progression or title.
   Notation: see src/audio_gm2004.js. Moods and placements: docs/rebuild/MUSIC_2004.md §3.
   ========================================================================== */
(function(){
  function rep(bar, n){ var a=[]; for(var i=0;i<n;i++) a.push(bar); return a.join(' | ')+' |'; }

  function go(G){

  // ---- LOGIN / TITLE: the stone hall by the brazier. D Mixolydian warmth, a horn tune that looks out to the road.
  var TITLE_A = 'mf D4/4 A4/4. G4/8 F#4/4 | E4/4 G4/4. A4/8 G4/4 | B3/8 D4/8 G4/4 B4/4 A4/4 | A4/2. r/4 | B4/4 F#4/4. E4/8 D4/4 | C5/4. B4/8 A4/4 G4/4 |';
  G.song('hm_title', {
    name:'Hearth and Horizon', where:'Login and title screen', bpm:84, time:'4/4',
    mood:'Warm and a little grand: a horn tune by the brazier, harp and strings behind, the road ahead.',
    voices:{
      horn:{i:'french_horn', v:0.93, p:-0.18},
      fl:{i:'flute', v:0.63, p:0.22},
      ob:{i:'oboe', v:0.75, p:0.12},
      harp:{i:'orchestral_harp', v:0.35, p:0.34, base:'D3'},
      str:{i:'string_ensemble_1', v:0.2, p:0, base:'A3'},
      bass:{i:'cello', v:0.35, p:-0.1, base:'G2'},
      timp:{i:'timpani', v:0.32, p:0.05, base:'G2', rv:0.3},
      glock:{i:'glockenspiel', v:0.15, p:0.28, rv:0.32}
    },
    parts:{
      I:{ chords:'D | C | G/B | A',
          glock:'p D6/4 A5/4. G5/8 F#5/4 | E5/1 | D5/4 B5/4 G5/4 B5/4 | A5/2. r/4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', str:'@pad/2', bass:'@bass/2 B 5', timp:'@bass/4 R . . .' },
      A:{ chords:'D | C | G/B | D | Bm | Am | G A | D',
          horn:TITLE_A+' B4/4 D5/4 C#5/4 E5/4 | D5/2. r/4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', str:'@pad/2', bass:'@bass/2 B 5' },
      A2:{ chords:'D | C | G/B | D | Bm | Am | G A | D',
          horn:TITLE_A+' B4/4 D5/4 C#5/4 A4/4 | D5/4 A4/8 F#4/8 D4/2 |',
          fl:'p F#5/1 | E5/1 | D5/1 | F#5/2. r/4 | D5/1 | E5/1 | D5/2 E5/2 | F#5/2. r/4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', str:'@pad/2', bass:'@bass/2 B 5', timp:'@bass/4 R . . .' },
      B:{ chords:'Bm | G | D | A | G | D/F# | Em7 | A7',
          ob:'mp F#4/4 B4/4 D5/4. C#5/8 | B4/2 G4/2 | A4/4 F#4/8 G4/8 A4/4 D5/4 | C#5/2. r/4 | B4/4 D5/4 G5/4. F#5/8 | F#5/4 E5/8 D5/8 A4/2 | G4/4 B4/4 E5/4 D5/4 | C#5/2 G4/4 E4/4 |',
          harp:'@arp/8 R 5 8 5 10 5 8 5', str:'@pad/2', bass:'@bass/2 B 5' },
      A3:{ chords:'D | C | G/B | D | Bm | Am | G A | D',
          horn:'f'+TITLE_A.slice(2)+' B4/4 D5/4 C#5/4 A4/4 | D5/4 A4/8 F#4/8 D4/2 |',
          fl:'=horn+12', glock:'=horn+24',
          harp:'@arp/8 R 5 8 10 12 10 8 5', str:'@pad/2', bass:'@bass/2 B 5', timp:'@bass/4 R . 5 .' },
      C:{ chords:'G | D',
          horn:'mp B4/2 D5/2 | A4/1 |', harp:'@arp/8 R 5 8 10 12 10 8 5', str:'@pad/1', bass:'@bass/1 B', timp:'@bass/4 R . . .' }
    },
    form:'I A A2 B A3 C'
  });

  // ---- Guide House and the arrival green: the island's welcome. F major, a warm clarinet over harp and pizzicato.
  G.song('holm_morning', {
    name:'Morning on the Holm', where:'Guide House and the arrival green', bpm:100, time:'4/4',
    mood:'Gentle, sunlit welcome: a clarinet tune over rippling harp; the flute takes the middle.',
    voices:{
      lead:{i:'clarinet', v:0.93, p:-0.12},
      fl:{i:'flute', v:0.75, p:0.18},
      harp:{i:'orchestral_harp', v:0.38, p:0.32, base:'C3'},
      bass:{i:'pizzicato_strings', v:0.47, p:-0.05, base:'E2'},
      pad:{i:'string_ensemble_1', v:0.15, p:0, base:'A3'},
      glock:{i:'glockenspiel', v:0.18, p:0.25, rv:0.3}
    },
    parts:{
      I:{ chords:'F | Bb/F',
          glock:'p C6/4 A5 F5 r | D6/4 Bb5 F5 r |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', bass:'@bass/4 B . 5 .', pad:'@pad/2' },
      A:{ chords:'F | C/E | Dm | Bb | F/A | Gm7 | C | C7',
          lead:'mf A4/4 C5/8 D5 C5/4 A4 | G4/4. E4/8 G4/2 | F4/4 A4/8 Bb4 A4/4 F4 | D5/2 C5/4 Bb4 | A4/4 C5/8 F5 E5/4 D5 | D5/4. Bb4/8 G4/4 Bb4 | C5/4 E5/8 D5 C5/4 G4 | Bb4/2 A4/4 G4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', bass:'@bass/4 B . 5 .', pad:'@pad/2' },
      A2:{ chords:'F | C/E | Dm | Bb | Gm7 | C7 | F | F',
          lead:'mf A4/4 C5/8 D5 C5/4 A4 | G4/4. E4/8 G4/2 | F4/4 A4/8 Bb4 A4/4 D5 | F5/2 E5/4 D5 | D5/4 C5/8 Bb4 A4/4 G4 | E4/4 G4/8 C5 E5/4 D5 | C5/4. Bb4/8 A4/4 G4 | F4/2. r/4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', bass:'@bass/4 B . 5 .', pad:'@pad/2' },
      B:{ chords:'Dm | Am | Bb | F | Gm | Dm | Eb | C7',
          fl:'mp A4/4 D5 E5 F5 | E5/2. C5/4 | D5/4 C5/8 Bb4 C5/4 D5 | C5/2 A4 | Bb4/4 D5 G5 F5/8 E5 | F5/4. E5/8 D5/4 A4 | G4/4 Bb4 Eb5 D5/8 C5 | C5/4 Bb4 G4 E4 |',
          lead:'p F4/2 A4 | C5/1 | F4/2 D4 | A4/1 | D4/2 Bb4 | A4/1 | G4/2 Bb4 | E4/2 G4 |',
          harp:'@arp/8 R 5 8 5 10 5 8 5', bass:'@bass/4 B . 5 .', pad:'@pad/2' },
      A3:{ chords:'F | C/E | Dm | Bb | Gm7 | C7 | F | F',
          lead:'mf A4/4 C5/8 D5 C5/4 A4 | G4/4. E4/8 G4/2 | F4/4 A4/8 Bb4 A4/4 D5 | F5/2 E5/4 D5 | D5/4 C5/8 Bb4 A4/4 G4 | E4/4 G4/8 C5 E5/4 D5 | C5/4. Bb4/8 A4/4 G4 | F4/2. r/4 |',
          glock:'=lead+12',
          harp:'@arp/8 R 5 8 10 12 10 8 5', bass:'@bass/4 B . 5 .', pad:'@pad/2' }
    },
    form:'I A A2 B A3'
  });

  // ---- Survival camp (Survival Wood, the workyard): a campfire jig. D Dorian, 6/8; recorder and fiddle over guitar.
  var CAMP_A = 'mf D5/8 E5 F5 A5/4 F5/8 | G5/4 E5/8 C5/4 E5/8 | D5/8 F5 A5 D6/4 C6/8 | B5/4 A5/8 G5/4. | A5/8 G5 F5 D5/4 F5/8 | E5/8 G5 C6 G5/4 E5/8 | F5/8 A5 F5 E5/4 C5/8 | D5/4. r/4. |';
  var CAMP_B = 'mf A4/4. C5/8 F5 A5 | G5/4. E5/4. | D5/8 B4 D5 G5/4 F5/8 | A5/4. F5/4. | C6/4 A5/8 F5/4 A5/8 | G5/8 E5 C5 E5/4 G5/8 | D6/8 B5 G5 B5/4 D6/8 | C#6/4. A5/4. |';
  G.song('holm_camp', {
    name:'Woodsmoke and Flint', where:'The survival camp and Survival Wood', bpm:108, time:'6/8',
    mood:'Crackling campfire jig: a recorder tune, a fiddle answer, guitar and a woodblock tick.',
    voices:{
      rec:{i:'recorder', v:0.92, p:-0.15},
      fid:{i:'fiddle', v:0.77, p:0.2},
      gtr:{i:'acoustic_guitar_nylon', v:0.35, p:0.28, base:'D3'},
      bass:{i:'cello', v:0.3, p:-0.12, base:'G2'},
      kit:{i:'kit', v:0.23, p:0.1, rv:0.1, hum:6}
    },
    parts:{
      I:{ chords:'Dm | C', gtr:'@arp/8 R 5 8 10 8 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 2) },
      A:{ chords:'Dm | C | Dm | G | Dm | C | F:1.5 C:1.5 | Dm',
          rec:CAMP_A, gtr:'@arp/8 R 5 8 10 8 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 8) },
      A2:{ chords:'Dm | C | Dm | C | Dm7 | G | Am:1.5 C:1.5 | Dm',
          rec:'mf D5/8 E5 F5 A5/4 F5/8 | G5/4 E5/8 C5/4 E5/8 | F5/8 E5 D5 A4/4 D5/8 | C5/4. G5/8 F5 E5 | D5/8 F5 A5 C6/4 A5/8 | B5/8 A5 G5 D5/4 B4/8 | C5/8 E5 A5 G5/4 E5/8 | D5/4. r/4. |',
          gtr:'@arp/8 R 5 8 10 8 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 8) },
      B:{ chords:'F | C | G7 | Dm | F | C | G | A',
          fid:CAMP_B, gtr:'@arp/8 R 5 8 5 10 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 8) },
      B2:{ chords:'F | C | G7 | Dm | F | C | G | A',
          fid:CAMP_B, rec:'p F5/2. | E5/2. | D5/2. | F5/2. | A5/2. | G5/2. | G5/2. | E5/2. |',
          gtr:'@arp/8 R 5 8 5 10 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 8) },
      A3:{ chords:'Dm | C | Dm | G | Dm | C | F:1.5 C:1.5 | Dm',
          rec:CAMP_A, fid:'=rec-12', gtr:'@arp/8 R 5 8 10 8 5', bass:'@bass/4. R 5', kit:rep("C#2/8 Bb4? Bb4? C#2 Bb4? Bb4?", 8) }
    },
    form:'I A A2 B B2 A3'
  });

  // ---- Minnow Hollow: the fishing pond. C major with a Lydian shimmer (D over C), 3/4; marimba ripples, flute.
  var HOLLOW_A2 = 'mf E5/2 G5/4 | F#5/4 A5 D6 | C6/2 B5/4 | A5/2. | A5/4 G5 F5 | E5/4 D5 C5 | D5/4 F5 A5 | G5/2. |';
  G.song('holm_hollow', {
    name:'Reeds and Ripples', where:'Minnow Hollow, the fishing pond', bpm:88, time:'3/4',
    mood:'Lazy and dappled: marimba ripples, a floating flute, an oboe drifting through the middle.',
    voices:{
      fl:{i:'flute', v:0.79, p:-0.1},
      ob:{i:'oboe', v:0.7, p:0.15},
      mar:{i:'marimba', v:0.38, p:0.3, base:'C4'},
      bass:{i:'acoustic_bass', v:0.38, p:-0.05, base:'E2'},
      pad:{i:'string_ensemble_1', v:0.13, p:0, base:'G3'}
    },
    parts:{
      I:{ chords:'C | D/C', mar:'@arp/8 R 5 8 5 10 5', bass:'@bass/2. B', pad:'@pad/2.' },
      A:{ chords:'C | D/C | C | D/C | Am | Em | F | G',
          fl:'mf E5/2 G5/4 | F#5/2. | E5/4 D5 C5 | A4/2. | C5/4 E5 A5 | G5/2 E5/4 | F5/4 A5 C6 | B5/2 G5/4 |',
          mar:'@arp/8 R 5 8 5 10 5', bass:'@bass/2. B', pad:'@pad/2.' },
      A2:{ chords:'C | D/C | C | Am | F | C/E | Dm7 | G',
          fl:HOLLOW_A2, mar:'@arp/8 R 5 8 5 10 5', bass:'@bass/2. B', pad:'@pad/2.' },
      B:{ chords:'Am | Em | F | C | Am | Em | Dm7 | G7',
          ob:'mp A4/4 C5 E5 | G5/2 B4/4 | A4/4 C5 F5 | E5/2. | E5/4 D5 C5 | B4/2 G4/4 | A4/4 C5 F5 | D5/2 B4/4 |',
          mar:'@arp/8 R 5 8 5 10 5', bass:'@bass/2. B', pad:'@pad/2.' },
      A3:{ chords:'C | D/C | C | Am | F | C/E | Dm7 | G',
          fl:HOLLOW_A2, ob:'p C5/2. | D5/2. | E5/2. | C5/2. | C5/2. | C5/2. | A4/2. | B4/2. |',
          mar:'@arp/8 R 5 8 5 10 5', bass:'@bass/2. B', pad:'@pad/2.' }
    },
    form:'I A A2 B A3'
  });

  // ---- Creakwheel Mill: the wheel turns. G major 4/4; bassoon oom-pah, pizzicato, a two-tone woodblock, oboe tune.
  var MILL_A = 'mf D5/8 D5 B4/4 G4/4 B4/8 D5/8 | C5/4 A4/4 F#4/4 A4/4 | B4/8 C5 D5/4 G5/4 D5/4 | E5/4 G5/8 E5 C5/4 E5/4 | D5/8 D5 B4/4 G4/4 B4/8 D5/8 | C5/4 A4/8 C5 F#5/4 A5/4 | G5/4 D5/4 A4/4 F#4/4 | G4/2 r/2 |';
  G.song('holm_mill', {
    name:'The Millrace Turns', where:'Creakwheel Mill', bpm:118, time:'4/4',
    mood:'Bouncy and busy: the wheel ticks in the woodblock, the bassoon plods, the oboe whistles at work.',
    voices:{
      ob:{i:'oboe', v:0.82, p:-0.12},
      cl:{i:'clarinet', v:0.77, p:0.14},
      bsn:{i:'bassoon', v:0.42, p:-0.05, base:'G2'},
      pizz:{i:'pizzicato_strings', v:0.35, p:0.25, base:'D4'},
      wood:{i:'woodblock', v:0.26, p:0.35, rv:0.12},
      glock:{i:'glockenspiel', v:0.14, p:-0.3}
    },
    parts:{
      I:{ chords:'G | D7', bsn:'@bass/4 R . 5 .', pizz:'@arp/4 . C . C', wood:rep('r/8 G5 r C5 r G5 r C5', 2) },
      A:{ chords:'G | D7 | G | C | G | D7 | G D | G',
          ob:MILL_A, bsn:'@bass/4 R . 5 .', pizz:'@arp/4 . C . C', wood:rep('r/8 G5 r C5 r G5 r C5', 8) },
      A2:{ chords:'G | D7 | G | C | Em | Am7 | D7 | G',
          ob:'mf D5/8 D5 B4/4 G4/4 B4/8 D5/8 | C5/4 A4/4 F#4/4 A4/4 | B4/8 C5 D5/4 G5/4 D5/4 | E5/4 G5/8 E5 C5/4 E5/4 | B4/8 B4 G4/4 E4/4 G4/8 B4/8 | C5/4 E5/4 A4/4 G4/4 | F#4/4 A4/8 C5 D5/4 C5/4 | B4/2 G4/2 |',
          bsn:'@bass/4 R . 5 .', pizz:'@arp/4 . C . C', wood:rep('r/8 G5 r C5 r G5 r C5', 8) },
      B:{ chords:'C | G/B | Am | D7 | C | G/B | A7 | D7',
          cl:'mf E5/4. D5/8 C5/4 G4/4 | B4/4. A4/8 G4/4 D4/4 | C5/8 B4 A4/4 E5/4 A4/4 | F#4/2 A4/4 C5/4 | E5/4. F5/8 G5/4 E5/4 | D5/4 B4/8 A4 G4/4 B4/4 | C#5/4 E5/4 G5/4 E5/4 | F#5/4 D5/4 A4/4 C5/4 |',
          bsn:'@bass/4 B . 5 .', pizz:'@arp/4 . C . C', wood:rep('r/8 G5 r C5 r G5 r C5', 8) },
      A3:{ chords:'G | D7 | G | C | G | D7 | G D | G',
          ob:MILL_A, glock:'=ob+12', bsn:'@bass/4 R . 5 .', pizz:'@arp/4 . C . C', wood:rep('r/8 G5 r C5 r G5 r C5', 8) }
    },
    form:'I A A2 B A3'
  });

  // ---- The bakehouse (teaching kitchen): a musette waltz. Bb major 3/4; accordion, guitar oom-pah-pah, clarinet.
  G.song('holm_bakehouse', {
    name:'Warm Loaves', where:'The bakehouse and teaching kitchen', bpm:144, time:'3/4',
    mood:'Floury and cosy: an accordion waltz with little musette turns; the clarinet hums the middle.',
    voices:{
      acc:{i:'accordion', v:0.82, p:-0.14},
      cl:{i:'clarinet', v:0.9, p:0.16},
      gtr:{i:'acoustic_guitar_nylon', v:0.28, p:0.28, base:'D4'},
      bass:{i:'acoustic_bass', v:0.33, p:-0.04, base:'E2'},
      glock:{i:'glockenspiel', v:0.13, p:0.3, rv:0.3}
    },
    parts:{
      I:{ chords:'Bb | Bb | F7 | F7', glock:'p Bb5/4 r/2 | r/2. | A5/4 r/2 | r/2. |', gtr:'@arp/4 . C C', bass:'@bass/2. B' },
      A:{ chords:'Bb | Bb | F7 | F7 | F7 | F7 | Bb | Bb | Eb | Eb | Bb | Gm | C7 | F7 | Bb | Bb',
          acc:'mf F4/4 A4/8 Bb4 D5/4 | F5/4. E5/8 F5/4 | Eb5/4 D5/8 C5 A4/4 | C5/2. | A4/4 C5/8 Eb5 F5/4 | A5/4. G#5/8 A5/4 | F5/4 D5/8 C5 Bb4/4 | D5/2. | G4/4 Bb4/8 C5 Eb5/4 | G5/4. F#5/8 G5/4 | F5/4 D5/8 Eb5 F5/4 | D5/2. | E5/4 G5/8 F5 E5/4 | Eb5/4 C5/8 A4 F4/4 | D5/4 F5/4 C5/4 | Bb4/2. |',
          gtr:'@arp/4 . C C', bass:'@bass/2. B' },
      B:{ chords:'Gm | Gm | D7 | D7 | Gm | Gm | Cm | F7 | Eb | Eb | Bb | Bb | Cm | F7 | Bb | F7',
          cl:'mf D4/4 G4/4 Bb4/4 | D5/2. | C5/4 A4/4 F#4/4 | D4/2. | G4/4 Bb4/4 D5/4 | G5/2 F5/4 | Eb5/4 D5/8 C5 G4/4 | A4/2. | G4/4 Bb4/4 Eb5/4 | G5/2 F5/4 | F5/4 D5/4 Bb4/4 | D5/2. | C5/4 Eb5/4 G5/4 | F5/4 Eb5/4 C5/4 | D5/2 Bb4/4 | C5/2 A4/4 |',
          gtr:'@arp/4 . C C', bass:'@bass/2. B' }
    },
    form:'I A B A'
  });

  // ---- The Quest Lodge: maps, notices, the itch to set out. D Dorian to F; harpsichord and oboe, walking bass.
  var LODGE_1 = 'mf D5/4 A4/8 D5 F5/4 E5/8 D5 | E5/4. C5/8 G4/2 | F5/4 D5/8 F5 Bb5/4 A5/8 G5 |';
  G.song('holm_lodge', {
    name:'Maps by Candlelight', where:'The Quest Lodge', bpm:92, time:'4/4',
    mood:'Curious and inviting: harpsichord and oboe over a walking bass; the flute sets out in the middle.',
    voices:{
      ob:{i:'oboe', v:0.73, p:-0.12},
      fl:{i:'flute', v:0.63, p:0.16},
      hpsi:{i:'harpsichord', v:0.35, p:0.3, base:'D3'},
      bass:{i:'acoustic_bass', v:0.43, p:-0.05, base:'E2'},
      str:{i:'string_ensemble_1', v:0.15, p:0, base:'A3'}
    },
    parts:{
      I:{ chords:'Dm | A', hpsi:'@arp/8 R 5 8 5 10 5 8 5', bass:'@bass/4 R 5 8 5', str:'@pad/2' },
      A:{ chords:'Dm | C | Bb | C | Dm | C | Bb | A',
          ob:LODGE_1+' G5/4. E5/8 C5/2 | D5/4 A4/8 D5 F5/4 G5/8 A5 | G5/4. E5/8 C5/4 E5/4 | D5/4 F5/8 D5 Bb4/4 D5/4 | C#5/2. r/4 |',
          hpsi:'@arp/8 R 5 8 5 10 5 8 5', bass:'@bass/4 R 5 8 5', str:'@pad/2' },
      A2:{ chords:'Dm | C | Bb | F | Gm | Dm | A7 | Dm',
          ob:LODGE_1+' A5/4. G5/8 F5/2 | G5/4 Bb5/8 A5 G5/4 D5/4 | F5/4 E5/8 D5 A4/4 F4/4 | E5/4 C#5/8 D5 E5/4 G5/4 | D5/2. r/4 |',
          hpsi:'@arp/8 R 5 8 5 10 5 8 5', bass:'@bass/4 R 5 8 5', str:'@pad/2' },
      B:{ chords:'F | C/E | Dm | Bb | F/C | C | Bb | C7',
          fl:'mf C5/4 F5/4 A5/4. G5/8 | G5/2 E5/4 C5/4 | D5/4 F5/8 A5 D6/4 C6/4 | Bb5/2 F5/2 | A5/4 G5/8 F5 C5/4 F5/4 | E5/4 G5/8 E5 C5/4 G4/4 | F5/4 D5/4 Bb4/4 D5/4 | E5/2 G5/4 Bb5/4 |',
          hpsi:'@arp/8 R 5 8 10 12 10 8 5', bass:'@bass/4 B 5 8 5', str:'@pad/2' }
    },
    form:'I A A2 B A2'
  });

  // ---- The mine road, Quarry Gate and the Training Cavern: honest work underground. E minor; marimba, picks, bassoon.
  G.song('holm_mine', {
    name:'Pick and Lantern', where:'Quarry Gate, the mine and the Training Cavern', bpm:92, time:'4/4',
    mood:'Earthy and steady: pickaxe ticks, a marimba ostinato, a low clarinet work tune, a bell at each shift.',
    voices:{
      cl:{i:'clarinet', v:0.84, p:-0.1},
      hn:{i:'french_horn', v:0.73, p:0.12},
      mar:{i:'marimba', v:0.36, p:0.28, base:'E3'},
      bsn:{i:'bassoon', v:0.39, p:-0.05, base:'G2'},
      pick:{i:'woodblock', v:0.23, p:0.38, rv:0.3},
      bell:{i:'tubular_bells', v:0.25, p:-0.25, rv:0.4},
      str:{i:'string_ensemble_1', v:0.12, p:0, base:'G3'}
    },
    parts:{
      I:{ chords:'Em | Em', mar:'@arp/8 R 5 8 5 10 5 8 5', bsn:'@bass/4 R 5 8 5', pick:rep('r/4 A5/8 r/8 r/4 E5/8 r/8', 2), bell:'mf E5/2 r/2 | r/1 |' },
      A:{ chords:'Em | Em | C | D | Em | Em | C | B7',
          cl:'mf E4/4 G4/8 E4 B3/4 E4/4 | G4/4 A4/8 G4 E4/4 D4/4 | E4/4 G4/8 A4 C5/4 G4/4 | F#4/4. E4/8 D4/2 | E4/4 G4/8 E4 B3/4 E4/4 | B4/4 A4/8 G4 E4/4 G4/4 | G4/4 E4/8 G4 C5/4 G4/4 | F#4/2 D#4/4 B3/4 |',
          mar:'@arp/8 R 5 8 5 10 5 8 5', bsn:'@bass/4 R 5 8 5', pick:rep('r/4 A5/8 r/8 r/4 E5/8 r/8', 8), str:'@pad/1' },
      A2:{ chords:'Em | Em | Am | D | C | D | B7 | Em',
          cl:'mf E4/4 G4/8 E4 B3/4 E4/4 | G4/4 A4/8 G4 E4/4 D4/4 | A4/4 C5/8 B4 A4/4 E4/4 | F#4/4. G4/8 A4/2 | G4/4 E4/8 G4 C5/4 B4/4 | A4/4 F#4/8 A4 D5/4 C5/4 | B4/4 A4/8 F#4 D#4/4 F#4/4 | E4/2. r/4 |',
          mar:'@arp/8 R 5 8 5 10 5 8 5', bsn:'@bass/4 R 5 8 5', pick:rep('r/4 A5/8 r/8 r/4 E5/8 r/8', 8), str:'@pad/1' },
      B:{ chords:'G | D/F# | Em | C | G | D/F# | C | D',
          hn:'mf D4/4 G4/4 B4/4. A4/8 | A4/2 F#4/4 D4/4 | E4/4 G4/8 A4 B4/4 G4/4 | C5/2 G4/2 | B4/4 D5/4 B4/4. G4/8 | A4/4 F#4/8 A4 D5/4 A4/4 | G4/4 E4/4 C4/4 E4/4 | F#4/2 A4/2 |',
          bell:'mf G4/2 r/2 | '+rep('r/1', 7), mar:'@arp/8 R 5 8 5 10 5 8 5', bsn:'@bass/4 B 5 8 5', pick:rep('r/4 A5/8 r/8 r/4 E5/8 r/8', 8), str:'@pad/1' }
    },
    form:'I A A2 B A2'
  });

  // ---- Warden's Keep (and the Combat Hall): the watch on the walls. C major march; horn, snare, timpani.
  var KEEP_1 = 'G4/4. G4/8 C5/4 E5/4 | D5/4. B4/8 G4/2 | A4/4. C5/8 E5/4 A5/4 | G5/2 E5/2 |';
  var KEEP_A2 = 'mf '+KEEP_1+' A5/4. G5/8 F5/4 C5/4 | E5/4. D5/8 C5/4 G4/4 | F5/4 D5/8 B4 G4/4 B4/4 | C5/2. r/4 |';
  G.song('holm_keep', {
    name:"The Warden's Watch", where:"Warden's Keep and the Combat Hall", bpm:104, time:'4/4',
    mood:'Proud and steady: a horn march with snare and timpani; the oboe sings the serious middle.',
    voices:{
      hn:{i:'french_horn', v:0.72, p:-0.15},
      ob:{i:'oboe', v:0.58, p:0.15},
      str:{i:'string_ensemble_1', v:0.27, p:0.05, base:'E4'},
      bass:{i:'pizzicato_strings', v:0.47, p:-0.05, base:'E2'},
      timp:{i:'timpani', v:0.42, p:0.1, base:'G2', rv:0.3},
      kit:{i:'kit', v:0.27, p:0.2, rv:0.12},
      glock:{i:'glockenspiel', v:0.16, p:0.3}
    },
    parts:{
      I:{ chords:'C | G', kit:rep('D2/4 D2/8. D2/16 D2/4 D2/8 D2/8', 2), timp:'@bass/4 R . 5 .', bass:'@bass/4 B . 5 .' },
      A:{ chords:'C | G/B | Am | Em | F | C/E | Dm7 | G',
          hn:'mf '+KEEP_1+' F5/4. E5/8 C5/4 A4/4 | G4/4. A4/8 G4/4 E4/4 | F4/4 A4/8 C5 D5/4 F5/4 | D5/2 G4/4 r/4 |',
          str:'@arp/4 C . C .', bass:'@bass/4 B . 5 .', timp:'@bass/4 R . . .' },
      A2:{ chords:'C | G/B | Am | Em | F | C/G | G7 | C',
          hn:KEEP_A2, kit:rep('D2/4 D2/8. D2/16 D2/4 D2/8 D2/8', 8),
          str:'@arp/4 C . C .', bass:'@bass/4 B . 5 .', timp:'@bass/4 R . 5 .' },
      B:{ chords:'Am | E7 | Am | G | F | C | Dm | E7',
          ob:'mf E5/4. D5/8 C5/4 A4/4 | B4/4. C5/8 D5/4 G#4/4 | A4/4 C5/8 E5 A5/4 G5/4 | G5/2 D5/2 | C5/4. D5/8 F5/4 A5/4 | G5/4. F5/8 E5/4 C5/4 | D5/4 F5/8 E5 D5/4 A4/4 | G#4/2 B4/4 D5/4 |',
          str:'@pad/2', bass:'@bass/4 B . 5 .', timp:'@bass/4 R . . .' },
      A3:{ chords:'C | G/B | Am | Em | F | C/G | G7 | C',
          hn:KEEP_A2, glock:'=hn+12', kit:rep('D2/4 D2/8. D2/16 D2/4 D2/8 D2/8', 7)+' D2/4 D2/8. D2/16 D2/4 D2/16 D2 D2 D2 |',
          str:'@arp/4 C . C .', bass:'@bass/4 B . 5 .', timp:'@bass/4 R . 5 .' }
    },
    form:'I A A2 B A3'
  });

  // ---- The Holm Bank: a small courtly minuet. G major 3/4; harpsichord, pizzicato, flute, a tinkle of coins.
  var BANK_A = 'mf D5/4 G4/8 A4 B4 C5 | C5/4 A4/8 B4 C5/4 | B4/4 G4/4 D4/4 | E5/4 C5/8 D5 E5 F#5 | G5/4 D5/4 B4/4 | A4/4 F#4/8 G4 A4/4 | B4/8 A4 G4/4 D5/4 | A4/2. | D5/4 G4/8 A4 B4 C5 | E5/4 C5/4 G5/4 | F#5/4 A5/8 G5 F#5 E5 | G5/4 D5/4 B4/4 | E5/4 G5/8 F#5 E5 D5 | C#5/4 E5/4 A4/4 | D5/4 F#5/8 E5 D5 C#5 | D5/2. |';
  G.song('holm_bank', {
    name:'Counting-House Minuet', where:'The Holm Bank', bpm:112, time:'3/4',
    mood:'Prim and tidy: a harpsichord minuet with a flute on top and a tinkle of coins.',
    voices:{
      fl:{i:'flute', v:0.69, p:-0.1},
      hpsi:{i:'harpsichord', v:0.35, p:0.22, base:'D4'},
      bass:{i:'pizzicato_strings', v:0.44, p:-0.08, base:'E2'},
      glock:{i:'glockenspiel', v:0.19, p:0.32, rv:0.3}
    },
    parts:{
      I:{ chords:'G | D7', glock:'mf G6/8 D6 B5 G5 r/4 | D6/8 A5 F#5 D5 r/4 |', hpsi:'@arp/4 . C C', bass:'@bass/2. B' },
      A:{ chords:'G | D7/F# | G | C | G/D | D7 | G | D | G | C | D | G | Em | A7 | D | D7',
          fl:BANK_A, hpsi:'@arp/4 . C C', bass:'@bass/2. B' },
      B:{ chords:'D | A7 | D | D7 | G | C | Am | D7 | G | G7 | C | A7/C# | G/D | D7 | G | G',
          fl:'mf F#5/4 A5/8 G5 F#5 E5 | E5/4 G5/4 C#5/4 | D5/4 A4/4 F#4/4 | C5/4. B4/8 A4/4 | B4/4 D5/8 C5 B4 A4 | G4/4 E5/4 C5/4 | A4/4 C5/8 B4 A4 G4 | F#4/2. | D5/4 G5/8 F#5 G5/4 | F5/4 D5/4 B4/4 | E5/4 G5/8 F5 E5 D5 | C#5/4 E5/4 G5/4 | B4/4 D5/8 C5 B4/4 | A4/4 C5/8 B4 A4/4 | G4/4 B4/4 D5/4 | G5/2. |',
          glock:rep('r/2.', 15)+' G6/8 D6 B5 G5 r/4 |', hpsi:'@arp/4 . C C', bass:'@bass/2. B' }
    },
    form:'I A B A'
  });

  // ---- The Mage Tower: chalk dust and quiet sparks. D minor with a bright E-major turn; harp, glockenspiel, choir.
  var MAGE_1 = 'mf A4/4. D5/8 F5/2 | G#5/2 E5/4 B4/4 | Bb5/4. A5/8 G5/2 | A5/2 F5/4 D5/4 |';
  var MAGE_A2 = MAGE_1+' D5/4 F5/8 A5 Bb5/2 | G5/4 Bb5/8 A5 G5/2 | E5/4 C#5/8 E5 G5/2 | D5/2. r/4 |';
  G.song('holm_mage', {
    name:'The Scriptorium Hums', where:'The Mage Tower', bpm:76, time:'4/4',
    mood:'Hushed and wondering: harp and glockenspiel sparkle, a choir breathes, the flute floats a strange bright turn.',
    voices:{
      fl:{i:'flute', v:0.87, p:-0.1},
      cl:{i:'clarinet', v:0.77, p:0.12},
      harp:{i:'orchestral_harp', v:0.33, p:0.3, base:'D3'},
      choir:{i:'choir_aahs', v:0.16, p:0, base:'A3', rv:0.4},
      bass:{i:'cello', v:0.27, p:-0.1, base:'G2'},
      glock:{i:'glockenspiel', v:0.17, p:0.35, rv:0.4}
    },
    parts:{
      I:{ chords:'Dm | E/D', glock:'mp A5/8 D6 F6 A6 F6 D6 A5 F5 | G#5/8 B5 E6 G#6 E6 B5 G#5 E5 |', harp:'@arp/8 R 5 8 10 12 10 8 5', choir:'@pad/1', bass:'@bass/1 B' },
      A:{ chords:'Dm | E/D | Gm/D | Dm | Bb | C | A | A7',
          fl:MAGE_1+' D5/4. F5/8 Bb5/2 | C6/4 G5/4 E5/2 | C#6/2 A5/4 E5/4 | G5/2. r/4 |',
          harp:'@arp/8 R 5 8 10 12 10 8 5', choir:'@pad/1', bass:'@bass/1 B' },
      A2:{ chords:'Dm | E/D | Gm/D | Dm | Bb | Gm | A7 | Dm',
          fl:MAGE_A2, harp:'@arp/8 R 5 8 10 12 10 8 5', choir:'@pad/1', bass:'@bass/1 B' },
      B:{ chords:'F | G/F | F | G/F | Dm | Bb | Gm | A',
          cl:'mf C5/4 F5/4 A5/2 | B5/2 G5/4 D5/4 | A5/4. G5/8 F5/2 | D5/2 B4/2 | D5/4 F5/4 A5/4 G5/4 | F5/2 D5/2 | Bb4/4 D5/4 G5/4 F5/4 | E5/2 C#5/2 |',
          glock:'=cl+12', harp:'@arp/8 R 5 8 5 10 5 8 5', choir:'@pad/1', bass:'@bass/1 B' }
    },
    form:'I A A2 B A2'
  });

  // ---- Lastlight and the Keeper's Stair: the lamp on the cliff. A minor 3/4; a fiddle alone, bell and sea wind.
  var LAST_A2 = 'mf E5/2 A5/4 | C6/2 A5/4 | G5/4 A5 G5 | D5/2 B4/4 | C5/4 F5 A5 | G5/2 E5/4 | G#4/2 B4/4 | A4/2. |';
  G.song('holm_lastlight', {
    name:"The Lamp Keeper's Vigil", where:"Lastlight and the Keeper's Stair", bpm:72, time:'3/4',
    mood:'Lonely and steadfast: a fiddle on the cliff, a tolling bell, the choir as sea wind; the flute lights the lamp.',
    voices:{
      fid:{i:'fiddle', v:0.84, p:-0.12},
      fl:{i:'flute', v:0.77, p:0.16},
      harp:{i:'orchestral_harp', v:0.3, p:0.3, base:'C3'},
      choir:{i:'choir_aahs', v:0.14, p:0, base:'G3', rv:0.45},
      bass:{i:'cello', v:0.28, p:-0.08, base:'G2'},
      bell:{i:'tubular_bells', v:0.24, p:0.2, rv:0.45}
    },
    parts:{
      I:{ chords:'Am | Am', bell:'mf A4/2. | r/2. |', harp:'@arp/8 R 5 8 10 8 5', choir:'@pad/2.', bass:'@bass/2. B' },
      A:{ chords:'Am | F | C | G | Am | F | Dm | E',
          fid:'mf E5/2 A5/4 | C6/2 A5/4 | G5/2 E5/4 | D5/2. | E5/4 A5 B5 | C6/2 A5/4 | F5/4 E5 D5 | B5/2 G#5/4 |',
          bell:'mf A4/2. | r/2. | r/2. | r/2. | A4/2. | r/2. | r/2. | r/2. |',
          harp:'@arp/8 R 5 8 10 8 5', choir:'@pad/2.', bass:'@bass/2. B' },
      A2:{ chords:'Am | F | C | G | F | C/E | E | Am',
          fid:LAST_A2, harp:'@arp/8 R 5 8 10 8 5', choir:'@pad/2.', bass:'@bass/2. B' },
      B:{ chords:'C | G | Am | Em | F | C | Dm | E7',
          fl:'mf G5/4 C6 E6 | D6/2 B5/4 | C6/4 A5 E5 | G5/2. | A5/4 C6 F6 | E6/2 C6/4 | D6/4 A5 F5 | G#5/2 B5/4 |',
          fid:'p E5/2. | D5/2. | C5/2. | B4/2. | C5/2. | G4/2. | A4/2. | B4/2. |',
          harp:'@arp/8 R 5 8 10 12 10', choir:'@pad/2.', bass:'@bass/2. B' },
      A3:{ chords:'Am | F | C | G | F | C/E | E | Am',
          fid:LAST_A2, bell:'mf A4/2. | r/2. | r/2. | r/2. | r/2. | r/2. | r/2. | A4/2. |',
          harp:'@arp/8 R 5 8 10 8 5', choir:'@pad/2.', bass:'@bass/2. B' }
    },
    form:'I A A2 B A3'
  });

  // ---- Lanternfoot Cove (Departure Haven): the skiff to the mainland. D major 6/8; fiddle, accordion, tambourine.
  var COVE_A = 'mf A4/8 D5 E5 F#5/4 D5/8 | G5/4 B5/8 D6/4 B5/8 | A5/8 F#5 D5 A4/4 D5/8 | E5/4. C#5/4. | A4/8 D5 E5 F#5/4 A5/8 | B5/4 G5/8 D5/4 G5/8 | F#5/8 E5 D5 E5/4 C#5/8 | D5/4. r/4. |';
  var COVE_B = 'mf F#5/4. B5/4. | D6/4 B5/8 G5/4. | A5/8 F#5 A5 D6/4. | C#6/4. A5/4. | B5/8 A5 F#5 D5/4. | B5/4. G5/4. | E5/8 G5 B5 E6/4 D6/8 | C#6/4. G5/4. |';
  G.song('holm_cove', {
    name:'Fair Winds, Old Friend', where:'Lanternfoot Cove and Departure Haven', bpm:120, time:'6/8',
    mood:'Hopeful farewell: a fiddle lilt with accordion and tambourine, a recorder waving from the pier.',
    voices:{
      fid:{i:'fiddle', v:0.82, p:-0.14},
      rec:{i:'recorder', v:0.82, p:0.18},
      acc:{i:'accordion', v:0.18, p:0.26, base:'F#4'},
      gtr:{i:'acoustic_guitar_nylon', v:0.26, p:-0.28, base:'D3'},
      bass:{i:'acoustic_bass', v:0.31, p:0, base:'E2'},
      kit:{i:'kit', v:0.18, p:0.3, rv:0.1}
    },
    parts:{
      I:{ chords:'D | A', acc:'@arp/4. C C', gtr:'@arp/8 R 5 8 R 5 8', bass:'@bass/4. B 5' },
      A:{ chords:'D | G | D | A | D | G | D:1.5 A:1.5 | D',
          fid:COVE_A, acc:'@arp/4. C C', gtr:'@arp/8 R 5 8 R 5 8', bass:'@bass/4. B 5', kit:rep('F#3/4. F#3/8? F#3? F#3?', 8) },
      A2:{ chords:'D | G | D | A | D | G | D:1.5 A:1.5 | D',
          fid:COVE_A, rec:'=fid', acc:'@arp/4. C C', gtr:'@arp/8 R 5 8 R 5 8', bass:'@bass/4. B 5', kit:rep('F#3/4. F#3/8? F#3? F#3?', 8) },
      B:{ chords:'Bm | G | D | A | Bm | G | Em | A7',
          rec:COVE_B, fid:'p D5/2. | D5/2. | F#5/2. | E5/2. | D5/2. | D5/2. | G5/2. | E5/2. |',
          acc:'@arp/4. C C', gtr:'@arp/8 R 5 8 R 5 8', bass:'@bass/4. B 5', kit:rep('F#3/4. F#3/8? F#3? F#3?', 8) },
      B2:{ chords:'Bm | G | D | A | Bm | G | Em | A7',
          rec:COVE_B, fid:'=rec-12', acc:'@arp/4. C C', gtr:'@arp/8 R 5 8 R 5 8', bass:'@bass/4. B 5', kit:rep('F#3/4. F#3/8? F#3? F#3?', 8) }
    },
    form:'I A A2 B B2 A A2'
  });

  }
  if(typeof GM2004!=='undefined') go(GM2004);
  else if(typeof module!=='undefined' && module.exports) module.exports=go;
})();
