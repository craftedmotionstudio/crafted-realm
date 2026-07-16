/* ============================================================================
   CRAFTED REALM — ALBUM II: original OSRS-style compositions (proving slice)
   ----------------------------------------------------------------------------
   PURE DATA + light wiring on top of src/audio_orchestra.js (the sampled
   orchestra + Music Director). Adds five ORIGINAL tracks in the CR_TRACKS
   note-data format and:
     • zone → track map for the proving-slice regions (holm, emberwood,
       quarry, scarlands, wardenholm) with graceful fallback,
     • an AMBIENT override channel (manual > building > ambient > zone):
       standing near the Wilderness Ditch plays "The Ditch",
     • a TITLE THEME on the welcome screen (only if music was opted in —
       starts on the first user gesture, per autoplay rules), fading to the
       zone song when Play is clicked,
     • music-tab registration (old TRACKS registry) + unlock bridging, and
       aliases so legacy track rows play the nearest orchestra song.
   Loads right after audio_orchestra.js. Reversible: delete this file + its
   <script> tag and the game reverts to the original three tracks.
   ========================================================================== */
(function(){
  function ready(){ return typeof Music!=='undefined' && Music.Director && Music.tracks && typeof TRACKS!=='undefined'; }
  if(ready()) init();
  else { var w=setInterval(function(){ if(ready()){ clearInterval(w); init(); } }, 200); }

  function init(){
  /* ---------------- THE COMPOSITIONS ----------------
     Same schema as CR_TRACKS: chords[] (one triad per bar), bass[] (one note
     per bar), melodyA/melodyB (one slot per beat; null = rest/breath),
     pedal[] = sustained drone at the top of each cycle. */

  // 1) TITLE THEME — "Crafted Realm". Stately waltz, G major w/ Mixolydian
  //    F-natural colour; bold rising arpeggio motif (our 'Scape Main'). 16 bars.
  Music.tracks.title_theme = {
    name:'Crafted Realm', bpm:112, beatsPerBar:3, pedal:['G2','D3'],
    chords:[ ['G3','B3','D4'],['C4','E4','G4'],['G3','B3','D4'],['D4','F#4','A4'],
             ['E3','G3','B3'],['C4','E4','G4'],['G3','B3','D4'],['D4','F#4','A4'],
             ['F3','A3','C4'],['C4','E4','G4'],['G3','B3','D4'],['E3','G3','B3'],
             ['C4','E4','G4'],['G3','B3','D4'],['D4','F#4','A4'],['G3','B3','D4'] ],
    bass:[ 'G2','C3','G2','D3', 'E2','C3','G2','D3', 'F2','C3','G2','E2', 'C3','G2','D3','G2' ],
    melodyA:[ 'G4','B4','D5',  'E5',null,'C5',  'B4',null,'G4',  'A4',null,null,
              'B4',null,'G4',  'A4','G4','E4',  'G4',null,'D4',  'F#4','A4','D5',
              'C5',null,'A4',  'G4',null,'E4',  'D4','G4','B4',  'E5',null,'B4',
              'C5','B4','A4',  'B4',null,'G4',  'A4','F#4','D4', 'G4',null,null ],
    melodyB:[ 'D5',null,'G5',  'E5',null,'G5',  'D5','B4','G4',  'A4',null,'D5',
              'E5',null,'B4',  'C5',null,'A4',  'B4','G4','B4',  'A4',null,'C5',
              'C5','A4','F4',  'G4',null,'C5',  'B4',null,'D5',  'E5','D5','B4',
              'C5',null,'E5',  'D5',null,'B4',  'A4',null,'F#4', 'G4',null,null ]
  };

  // 2) TUTOR'S HOLM — "First Light on the Holm". Gentle seaside arrival,
  //    C major, airy pentatonic-leaning melody. 76 BPM 4/4, 8 bars.
  Music.tracks.tutors_holm = {
    name:'First Light on the Holm', bpm:76, beatsPerBar:4, pedal:['C2'],
    chords:[ ['C4','E4','G4'],['F3','A3','C4'],['A3','C4','E4'],['G3','B3','D4'],
             ['F3','A3','C4'],['C4','E4','G4'],['D4','F4','A4'],['G3','B3','D4'] ],
    bass:[ 'C3','F2','A2','G2','F2','C3','D3','G2' ],
    melodyA:[ 'E4',null,'G4',null,  'A4',null,'C5',null,  'E5',null,'C5','A4',  'G4',null,null,null,
              'A4',null,'C5','A4',  'G4',null,'E4',null,  'F4',null,'A4','F4',  'G4',null,null,null ],
    melodyB:[ 'G4',null,'E5',null,  'C5',null,'A4',null,  'E5','G5','E5','C5',  'D5',null,'B4',null,
              'C5',null,'A4','F4',  'G4',null,'C5','E4',  'D4','F4','A4',null,  'G4',null,null,null ]
  };

  // 3) EMBERWOOD / STONEREACH ROAD — "The Woodward Road". Purposeful folk
  //    work-song lilt, A Dorian (the raised 6th over the D chord is the
  //    colour note). 100 BPM 4/4, 8 bars.
  Music.tracks.emberwood_road = {
    name:'The Woodward Road', bpm:100, beatsPerBar:4, pedal:['A2','E3'],
    chords:[ ['A3','C4','E4'],['G3','B3','D4'],['A3','C4','E4'],['C4','E4','G4'],
             ['D4','F#4','A4'],['G3','B3','D4'],['A3','C4','E4'],['E3','G3','B3'] ],
    bass:[ 'A2','G2','A2','C3','D3','G2','A2','E2' ],
    melodyA:[ 'A4',null,'B4','C5',  'B4',null,'G4',null,  'E4',null,'A4','B4',  'C5',null,'G4',null,
              'F#4',null,'A4','D5', 'B4',null,'G4',null,  'A4','B4','C5','B4',  'G4',null,'E4',null ],
    melodyB:[ 'E5',null,'D5','C5',  'D5',null,'B4','G4',  'A4',null,'C5','D5',  'E5',null,'G5','E5',
              'F#5',null,'D5','A4', 'B4',null,'D5','G4',  'E5','D5','C5','B4',  'B4',null,'E4',null ]
  };

  // 4) THE DITCH — "The Ditch". Liminal warning at the wilderness border:
  //    E Phrygian, sparse flute over low fifths, a whole bar of silence to
  //    breathe. 58 BPM 4/4, 8 bars.
  Music.tracks.the_ditch = {
    name:'The Ditch', bpm:58, beatsPerBar:4, pedal:['E2','B2'],
    chords:[ ['E3','G3','B3'],['F3','A3','C4'],['E3','G3','B3'],['D3','F3','A3'],
             ['C3','E3','G3'],['F3','A3','C4'],['E3','G3','B3'],['E3','G3','B3'] ],
    bass:[ 'E2','F2','E2','D2','C2','F2','E2','E2' ],
    melodyA:[ 'E4',null,null,null,  'F4',null,'E4',null,  null,null,'G4',null,  'F4',null,'D4',null,
              'E4',null,null,'G4',  'A4',null,'F4',null,  'E4',null,null,null,  null,null,null,null ],
    melodyB:[ 'B4',null,null,'C5',  null,'C5',null,'A4',  'B4',null,'G4',null,  'A4',null,'F4',null,
              'G4',null,'E4',null,  'F4',null,null,'A4',  'G4',null,'E4',null,  null,null,null,null ]
  };

  // 5) SCARLANDS — "Scarred Earth". Brooding wilderness: D minor over a
  //    bare-fifth drone, harmonic-minor C# bite on the A chords. 72 BPM 4/4.
  Music.tracks.scarlands = {
    name:'Scarred Earth', bpm:72, beatsPerBar:4, pedal:['D2','A2'],
    chords:[ ['D4','F4','A4'],['G3','Bb3','D4'],['D4','F4','A4'],['A3','C#4','E4'],
             ['Bb3','D4','F4'],['G3','Bb3','D4'],['A3','C#4','E4'],['D4','F4','A4'] ],
    bass:[ 'D2','G2','D2','A2','Bb2','G2','A2','D2' ],
    melodyA:[ 'D5',null,null,'A4',  'Bb4',null,'G4',null,  'F4',null,'D4',null,  'A4',null,'C#5',null,
              'D5',null,'F5','D5',  'Bb4',null,'G4',null,  'A4',null,'E4','C#5', 'D4',null,null,null ],
    melodyB:[ 'A4','D5',null,'F5',  'D5',null,'Bb4',null,  'A4',null,'F4','A4',  'E5',null,'C#5',null,
              'F5',null,'D5','Bb4', 'G4',null,'Bb4','D5',  'C#5',null,'E5','A4', 'D5',null,null,null ]
  };

  /* ---------------- ZONE → TRACK MAP (proving slice first) ---------------- */
  var ZONE_TRACK = {
    holm:'tutors_holm', commons:'veyhollow_town',
    emberwood:'emberwood_road', quarry:'emberwood_road',
    scarlands:'scarlands', whitmoor:'keep_quiet', wardenholm:'keep_quiet'
  };
  function trackForZone(z){ return ZONE_TRACK[z] || 'wilds_road'; }

  /* ---------------- DIRECTOR: ambient channel + ditch watch ----------------
     Priority: manual > building > ambient > zone. */
  var D = Music.Director;
  D.ambient = null;
  D.target = function(){ return this.manual || this.building || this.ambient || this.zone || 'veyhollow_town'; };
  setInterval(function(){
    var amb=null;
    try{
      if(typeof player!=='undefined' && player && typeof DITCH!=='undefined' &&
         Math.abs(player.position.z - DITCH.z) < 6) amb='the_ditch';
    }catch(e){}
    if(amb!==D.ambient){ D.ambient=amb; D.apply(); }
    ensureUnlocks();                                   // cheap; survives save-restores
  }, 600);

  /* ---------------- MUSIC TAB registration + unlock bridge ---------------- */
  // register in the legacy TRACKS registry so the music tab lists them
  TRACKS.title_theme    = {name:'Crafted Realm',           zone:''};
  TRACKS.tutors_holm    = {name:'First Light on the Holm', zone:'holm'};
  TRACKS.emberwood_road = {name:'The Woodward Road',       zone:'emberwood'};
  TRACKS.the_ditch      = {name:'The Ditch',               zone:'scarlands'};
  TRACKS.scarlands_song = {name:'Scarred Earth',           zone:'scarlands'};
  var PANE_ALIAS = { scarlands_song:'scarlands' };       // pane id → orchestra id
  function ensureUnlocks(){
    try{ ['title_theme','tutors_holm'].forEach(function(id){
      if(Music.unlocked.indexOf(id)<0) Music.unlocked.push(id); }); }catch(e){}
  }
  ensureUnlocks();
  // clicking any pane row plays SOMETHING sensible, incl. legacy sine-era ids
  Music.play = function(id){
    var t = PANE_ALIAS[id] || id;
    if(!Music.tracks[t]) t = trackForZone((TRACKS[id]||{}).zone);
    this.mode='manual'; D.setManual(t);
    try{ if(TRACKS[id] && typeof UI!=='undefined' && UI.chat) UI.chat('🎵 Now playing: '+TRACKS[id].name,'sys'); }catch(e){}
  };
  // zone changes: unlock pane rows for that zone, then steer the Director
  Music.onZone = function(z){
    try{ for(var id in TRACKS) if(TRACKS[id].zone===z) Music.unlock(id); }catch(e){}
    this.mode = this.mode||'auto';
    if(this.mode==='auto'){ D.manual=null; D.zone=trackForZone(z); D.apply(); }
  };

  /* ---------------- TITLE THEME on the welcome screen ----------------
     Autoplay rules require a user gesture; music stays OPT-IN. If the player
     had music on, the first click/keypress on the welcome screen starts the
     title theme; pressing Play releases it to the world's zone song. */
  var titleArmed=true;
  function welcomeVisible(){
    var w=document.getElementById('welcome-screen');
    return w && w.style.display!=='none' && w.offsetParent!==null;
  }
  function tryTitle(){
    if(!titleArmed || !welcomeVisible()) return;
    var opt=false; try{ opt = localStorage.getItem('cr_music_on')==='1'; }catch(e){}
    if(!opt) return;
    titleArmed=false;
    D.manual='title_theme';
    if(!Music.on) Music.start(); else D.apply(true);
  }
  document.addEventListener('pointerdown', tryTitle, true);
  document.addEventListener('keydown', tryTitle, true);
  var pb=document.getElementById('play-btn');
  if(pb) pb.addEventListener('click', function(){
    titleArmed=false;
    setTimeout(function(){ Music.mode='auto'; D.manual=null; D.apply(); }, 600);
  });
  }
})();
