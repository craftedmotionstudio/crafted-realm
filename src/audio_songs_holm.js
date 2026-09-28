/* ============================================================================
   CRAFTED REALM — the 2004 MIDI set, part 1: the title theme and Tutor's Holm (one piece per area). PURE DATA.
   Every piece here is an original composition for Crafted Realm, written in the spirit of 2004 browser-MMO area
   themes. None quotes, transcribes or paraphrases an existing game's melody, progression or title.
   Notation: see src/audio_gm2004.js. Moods and placements: docs/rebuild/MUSIC_2004.md §3.
   ========================================================================== */
(function(){
  function go(G){

  // ---- Guide House and the arrival green: the island's welcome. F major, a warm clarinet over harp and pizzicato.
  G.song('holm_morning', {
    name:'Morning on the Holm', where:'Guide House and the arrival green', bpm:100, time:'4/4',
    mood:'Gentle, sunlit welcome: a clarinet tune over rippling harp; the flute takes the middle.',
    voices:{
      lead:{i:'clarinet', v:0.62, p:-0.12},
      fl:{i:'flute', v:0.5, p:0.18},
      harp:{i:'orchestral_harp', v:0.5, p:0.32, base:'C3'},
      bass:{i:'pizzicato_strings', v:0.62, p:-0.05, base:'E2'},
      pad:{i:'string_ensemble_1', v:0.2, p:0, base:'A3'},
      glock:{i:'glockenspiel', v:0.24, p:0.25, rv:0.3}
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

  }
  if(typeof GM2004!=='undefined') go(GM2004);
  else if(typeof module!=='undefined' && module.exports) module.exports=go;
})();
