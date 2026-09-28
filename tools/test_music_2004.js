#!/usr/bin/env node
/* ============================================================================
   Crafted Realm — the 2004 MIDI soundtrack gate (src/audio_gm2004.js + src/audio_songs_*.js; docs/rebuild/MUSIC_2004.md)

   Compiles every song headlessly and fails when:
     1. the engine's own theory helpers are wrong (note names, chord parsing, voicing stays in register);
     2. a song does not compile (bar arithmetic, bad token, unknown voice, pattern without chords);
     3. a song lacks its display name / mood / placement, or its loop is outside 60-200 s (the era's area themes
        ran one to three minutes before repeating);
     4. a voice plays an instrument the bank does not have, or a note outside that instrument's sampled range
        (assets/audio/gm/BANK.json; the sampler only pitch-shifts a semitone or two);
     5. a title copies a known old-game music title (list below; the naming bible's own test separately scans
        every string literal in src/ for RuneScape names);
     6. the harmony lint finds the melody fighting its chords: on strong beats (1 and the mid-bar beat) at least
        70 % of melody notes must be chord tones (appoggiaturas are fine, wrong keys are not);
     7. the bank manifest and the bank files disagree (a sample the engine would ask for is missing).
   Run: node tools/test_music_2004.js [--lint]   (--lint prints every strong-beat non-chord tone)
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(name, ok, detail){
  if (ok) console.log('  ok  ' + name);
  else { failures++; console.error('  FAIL ' + name + (detail !== undefined ? '\n       ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}
const LINT = process.argv.includes('--lint');

const G = require(path.join(ROOT, 'src/audio_gm2004.js'));
const SONG_FILES = ['src/audio_songs_holm.js', 'src/audio_songs_mainland.js'].filter(f => fs.existsSync(path.join(ROOT, f)));
SONG_FILES.forEach(f => require(path.join(ROOT, f)));
const BANK = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/gm/BANK.json'), 'utf8'));

// ---- 1. theory helpers
check('note names round-trip', ['C4', 'F#3', 'Bb2', 'A0', 'C8'].every(n => G.midiName(G.noteToMidi(n)) === ({ 'F#3': 'Gb3' }[n] || n)) && G.noteToMidi('C4') === 60);
const c = G.parseChord('Dm7/C');
check('chord parsing (Dm7/C: root D, minor seventh, bass C)', c.root === 2 && c.iv.join() === '0,3,7,10' && c.bass === 0);
let threw = false; try { G.parseChord('Hx'); } catch (e) { threw = true; }
check('a bad chord symbol is rejected', threw);
const v1 = G.voiceChord(G.parseChord('F'), 57, null), v2 = G.voiceChord(G.parseChord('C'), 57, v1);
check('voicings stay in register and lead smoothly', v1.every(m => m >= 52 && m <= 72) && v2.every(m => m >= 52 && m <= 72) &&
  v2.reduce((a, m, i) => a + Math.abs(m - v1[i]), 0) <= 6, { v1: v1.map(G.midiName), v2: v2.map(G.midiName) });
threw = false; try { G.compile('bad', { bpm: 100, voices: { a: { i: 'flute' } }, parts: { A: { chords: 'C | G', a: 'C5/4 D5 E5 | F5/2 |' } }, form: 'A' }); } catch (e) { threw = /bar line mid-bar|beats/.test(e.message); }
check('a short bar is caught by the compiler', threw);

// ---- 2-6. every song
const RS_TITLES = ['Newbie Melody', 'Harmony', 'Harmony 2', 'Autumn Voyage', 'Adventure', 'Wander', 'Flute Salad', 'Sea Shanty',
  'Sea Shanty 2', 'Scape Main', 'Scape Original', 'Scape Santa', 'Scape Sad', 'Scape Wild', 'Scape Soft', 'Arabian', 'Arabian 2',
  'Arabian 3', 'Book of Spells', 'Dream', 'Unknown Land', 'Medieval', 'Spooky', 'Fanfare', 'Garden', 'Greatness', 'Nightfall',
  'Vision', 'Yesteryear', 'Start', 'Emperor', 'Expanse', 'Parade', 'Lullaby', 'Long Way Home', 'Still Night', 'Doorways',
  'Dangerous', 'Wonderous', 'Moody', 'Mellow', 'Crystal Sword', 'Knightmare', 'Miracle Dance', 'Inspiration', 'Serenade',
  'Splendour', 'The Tower', 'Tomorrow', 'Trawler', 'Venture', 'Voyage', 'Wilderness', 'Wilderness 2', 'Wilderness 3',
  'Deep Wildy', 'Dark', 'Dead Quiet', 'Undercurrent', 'Underground', 'Cavern', 'Cave Background', 'Close Quarters',
  'Faithless', 'Forever', 'Gnome King', 'Gnome Village', 'Grumpy', 'Heart and Mind', 'High Seas', 'Horizon', 'Lasting',
  'Legion', 'Lightness', 'Lightwalk', 'Magic Dance', 'Magical Journey', 'March', 'Monarch Waltz', 'Moonshine',
  'Mudskipper Melody', 'Neverland', 'Principality', 'Quest', 'Rune Essence', 'Sad Meadow', 'Saga', 'Shine', 'Spirit',
  'Starlight', 'Sunburn', 'Talking Forest', 'The Desert', 'The Shadow', 'Theme', 'Tree Spirits', 'Trinity', 'Tribal',
  'Understanding', 'Upcoming', 'Waterfall', 'Wolf Mountain', 'Workshop', 'Zealot', 'Background', 'Bone Dance', 'Baroque',
  'Attention', 'Arrival', 'Alone', 'Ballad of Enchantment', 'Beyond', 'Chain of Command', 'Courage', 'Crystal Castle',
  'Cursed', 'Dance of the Undead', 'Down to Earth', 'Dynasty', 'Elven Mist', 'Emotion', 'Everywhere', 'Expecting',
  'Fishing', 'Forbidden', 'Gaol', 'Grotto', 'Hermit', 'Home Sweet Home', 'Kingdom', 'Lament', 'Landlubber', 'Legend',
  'Long Ago', 'Mage Arena', 'Mausoleum', 'Miles Away', 'Mind over Matter', 'Nomad', 'Overture', 'Pathways', 'Reggae',
  'Right on Track', 'Royale', 'Serene', 'Shining', 'Soundscape', 'Stagnant', 'Stratosphere', 'Superstition', 'Technology',
  'The Lost Tribe', 'The Navigator', 'The Other Side', 'The Terrible Tower', 'Time Out', 'Trouble Brewing', 'Twilight',
  'Village', 'Warrior', 'Waterlogged', 'Wildwood', 'Witching', 'Wonder', 'Work Work Work', 'Zogre Dance'];
const lc = s => s.toLowerCase();
const songs = G.list();
const holm = songs.filter(id => /^holm_/.test(id)), main = songs.filter(id => /^hm_/.test(id) && id !== 'hm_title');
check('the set has the title theme, at least 8 Tutor\'s Holm pieces and 4 mainland pieces (' + holm.length + ' + ' + main.length + ')',
  songs.includes('hm_title') && holm.length >= 8 && main.length >= 4, songs.join(', '));
const PERC = ['kit', 'taiko_drum', 'timpani', 'woodblock'];   // drums hold pedals; the harmony lint skips them
const names = {};
songs.forEach(id => {
  let s = null, err = null;
  try { s = G.compile(id, G.songs[id]); } catch (e) { err = e.message; }
  check(id + ' compiles', !!s, err);
  if (!s) return;
  const sp = G.songs[id];
  check(id + ' has a name, a mood and a placement', !!(sp.name && sp.mood && sp.where), { name: sp.name, mood: sp.mood, where: sp.where });
  check(id + ' name is unique', !names[sp.name], sp.name); names[sp.name] = id;
  const hit = RS_TITLES.find(t => lc(sp.name) === lc(t) || (t.split(' ').length > 1 && lc(sp.name).includes(lc(t))));
  check(id + ' title is our own ("' + sp.name + '")', !hit, hit);
  check(id + ' loop is 60-200 s (' + s.seconds.toFixed(1) + ' s)', s.seconds >= 60 && s.seconds <= 200);
  // bank + ranges
  const bad = [];
  Object.keys(s.notes).forEach(inst => {
    if (inst === 'kit'){ Object.keys(s.notes[inst]).forEach(m => { if (![36, 37, 38, 42, 54, 70].includes(+m)) bad.push('kit note ' + m); }); return; }
    const b = BANK[inst]; if (!b){ bad.push('no instrument ' + inst); return; }
    Object.keys(s.notes[inst]).forEach(m => { m = +m; if (m < b.lo - 2 || m > b.hi + 2) bad.push(inst + ' ' + G.midiName(m) + ' outside ' + G.midiName(b.lo) + '..' + G.midiName(b.hi)); });
  });
  check(id + ' voices are in the bank and in range', !bad.length, bad.slice(0, 8).join('; '));
  // harmony lint: melodic (non-pattern) voices on strong beats vs the chord sounding then
  const spb = 60 / s.bpm; let strong = 0, fit = 0; const off = [];
  let t0 = 0;
  String(sp.form).split(/\s+/).filter(Boolean).forEach(pid => {
    const part = sp.parts[pid], bpb = s.bpb, bars = part.chords ? part.chords.split('|').filter(x => x.trim()).length : 0;
    if (!part.chords){ t0 += s.parts.find(p => p.part === pid).bars * bpb; return; }
    const spans = []; let t = 0;
    part.chords.split('|').map(x => x.trim()).filter(Boolean).forEach(bar => {
      const toks = bar.split(/\s+/); const w = toks.map(x => { const m = /:(\d+(?:\.\d+)?)$/.exec(x); return m ? +m[1] : null; });
      const fixed = w.reduce((a, x) => a + (x || 0), 0), free = w.filter(x => !x).length;
      toks.forEach((x, i) => { const len = w[i] || (bpb - fixed) / free; const sym = x.replace(/:.*$/, ''); spans.push({ t0: t, t1: t + len, sym }); t += len; });
    });
    let last = null; spans.forEach(sn => { if (sn.sym === '%' || sn.sym === '-') sn.sym = last; else last = sn.sym; });
    Object.keys(sp.voices).forEach(vn => {
      const src = part[vn]; if (!src || /^\s*[@=]/.test(src) || PERC.includes(sp.voices[vn].i)) return;
      s.events.filter(e => e.vo === vn && e.t / spb >= t0 - 1e-6 && e.t / spb < t0 + bars * bpb - 1e-6).forEach(e => {
        const beat = e.t / spb - t0, inBar = beat % bpb;
        const mid = (sp.time === '6/8') ? 1.5 : (bpb % 2 === 0 ? bpb / 2 : -1);   // 4/4: beats 1+3; 6/8: both dotted beats; 3/4: beat 1
        const strongBeat = inBar < 1e-6 || Math.abs(inBar - mid) < 1e-6;
        if (!strongBeat) return;
        const sn = spans.find(x => beat >= x.t0 - 1e-6 && beat < x.t1 - 1e-6); if (!sn || sn.sym === 'N') return;
        const ch = G.parseChord(sn.sym), pcs = ch.iv.map(i => (ch.root + i) % 12).concat([ch.bass]);
        strong++; if (pcs.includes(e.m % 12)) fit++; else off.push(pid + ' ' + vn + ' bar ' + (Math.floor(beat / bpb) + 1) + ' ' + G.midiName(e.m) + ' over ' + sn.sym);
      });
    });
    t0 += bars * bpb;
  });
  const ratio = strong ? fit / strong : 1;
  if (LINT && off.length) console.log('       lint ' + id + ': ' + off.join(' | '));
  check(id + ' melody fits its chords on strong beats (' + Math.round(ratio * 100) + ' %)', ratio >= 0.7, off.slice(0, 6).join(' | '));
});

// ---- 7. bank files agree with the manifest
const missing = [];
Object.keys(BANK).forEach(inst => {
  const f = path.join(ROOT, 'assets/audio/gm', inst + '-mp3.js');
  if (!fs.existsSync(f)){ missing.push(inst + ' file'); return; }
  const txt = fs.readFileSync(f, 'utf8');
  BANK[inst].samples.forEach(m => { if (txt.indexOf('"' + G.midiName(m) + '": "data:audio/mp3;base64,') < 0) missing.push(inst + ' ' + G.midiName(m)); });
});
check('bank files hold every sample the manifest lists (' + Object.keys(BANK).length + ' instruments)', !missing.length, missing.slice(0, 8).join(', '));
const bytes = Object.values(BANK).reduce((a, b) => a + b.bytes, 0);
check('the bank stays small (' + (bytes / 1048576).toFixed(1) + ' MB <= 6 MB)', bytes <= 6 * 1048576);

// ---- 8. where each piece plays (src/audio_music_areas.js)
const A = require(path.join(ROOT, 'src/audio_music_areas.js'));
const mapped = new Set([A.TITLE, A.ROAD, A.CAVE, A.HOLM_DEFAULT, 'holm_mine'].concat(Object.values(A.HOLM_BUILDINGS),
  A.HOLM_AREAS.map(a => a[4]), Object.values(A.ZONE_TRACKS)));
check('every area names a real piece', [...mapped].every(id => G.songs[id]), [...mapped].filter(id => !G.songs[id]));
check('every piece of the set plays somewhere', songs.every(id => mapped.has(id)), songs.filter(id => !mapped.has(id)));
const V2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/rebuild/holm-overhaul/v2land.json'), 'utf8'));
const bIds = Object.keys(V2.buildings);
check('every Tutor\'s Holm building has its piece (' + bIds.length + ' in v2land.json)', bIds.every(b => A.HOLM_BUILDINGS[b]), bIds.filter(b => !A.HOLM_BUILDINGS[b]));
check('inside a building its piece plays; its own terrain does not count as inside',
  A.trackFor({ holm: true, surface: 'b:bakehouse:0:Kitchen_Floor', x: 0, z: 0 }).track === 'holm_bakehouse' &&
  A.trackFor({ holm: true, surface: 'b:keep:0:KeepTerrain', x: 66, z: 99 }).track === 'holm_morning' &&
  A.trackFor({ holm: true, surface: 'b:cavern:0:CavernTerrain', x: 200, z: 60 }).track === 'holm_mine');
const offAnchor = bIds.filter(b => { const p = V2.buildings[b].placement; if (!p || p.x > 150) return false;
  return A.trackFor({ holm: true, surface: 'land', x: p.x, z: p.z }).track !== A.HOLM_BUILDINGS[b]; });
check('standing at each building on the island plays that building\'s piece', !offAnchor.length, offAnchor);
check('the login screen plays the title piece; the Guide House the island\'s welcome',
  A.trackFor({ welcome: true }).track === 'hm_title' && A.trackFor({ holm: true, surface: 'ground', x: 66, z: 99 }).track === 'holm_morning');
// no flip-flop: walk the keep -> bank line and back along a border wobble; each crossing switches once
{ let prev = null, seq = [];
  for (let t = 0; t <= 1.0001; t += 0.02){ const x = 87 + (86 - 87) * t, z = 35 + (57 - 35) * t + (Math.round(t * 50) % 2 ? 0.8 : -0.8);
    const r = A.trackFor({ holm: true, surface: 'land', x, z, prev }); prev = r.key; if (seq[seq.length - 1] !== r.track) seq.push(r.track); }
  check('area borders do not flip-flop (keep -> bank walk with a sideways wobble)', seq.length <= 3, seq); }
{ const camp = A.trackFor({ holm: true, surface: 'land', x: 31, z: 84 });
  const away = A.trackFor({ holm: true, surface: 'land', x: 125, z: 101, prev: camp.key });
  const lodgeOut = A.trackFor({ holm: true, surface: 'land', x: 125, z: 101, prev: 'in:lodge' });
  check('between areas the last piece keeps playing; with none yet, the island\'s welcome',
    away.track === 'holm_camp' && lodgeOut.track === 'holm_lodge' && A.trackFor({ holm: true, surface: 'land', x: 125, z: 101 }).track === 'holm_morning', { away, lodgeOut }); }
const zoneSrc = fs.readFileSync(path.join(ROOT, 'src/game1_data.js'), 'utf8');
const zb = zoneSrc.slice(zoneSrc.indexOf('const ZONES = {'), zoneSrc.indexOf('};', zoneSrc.indexOf('const ZONES = {')));
const zones = [...zb.matchAll(/^\s+([a-z_]+)\s*:\s*\{name:/gm)].map(m => m[1]);
check('every zone of game1_data.js resolves to a piece (' + zones.length + ' zones)', zones.length >= 10 &&
  zones.every(z => G.songs[A.trackFor({ zone: z, x: 0, z: 0 }).track]), zones);
check('the mainland: Hearthmere, the Scarlands, underground = the cave piece, open country = the road',
  A.trackFor({ zone: 'commons' }).track === 'hm_hearthmere' && A.trackFor({ zone: 'scarlands' }).track === 'hm_scarlands' &&
  A.trackFor({ zone: 'emberwood', plane: -1 }).track === 'hm_cave' && A.trackFor({ zone: 'gloomfen' }).track === 'hm_road');

// ---- 9. the game loads the set, in order, and nothing retired
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const at = f => html.indexOf('src="src/' + f);
check('index.html loads the engine, the songs, the areas, then the Director after game4_ui.js',
  at('audio_gm2004.js') > 0 && at('audio_gm2004.js') < at('audio_songs_holm.js') && at('audio_songs_holm.js') < at('audio_songs_mainland.js') &&
  at('audio_songs_mainland.js') < at('audio_music_areas.js') && at('game4_ui.js') < at('audio_music2004.js') && at('game3_systems.js') < at('audio_gm2004.js'));
const retired = ['audio_orchestra.js', 'audio_tracks2.js', 'audio_title_full.js', 'audio_hearthside.js', 'audio_minstrel.js', 'soundfont-player'];
check('the retired orchestra is gone (no script tag, no file)', retired.every(f => html.indexOf(f) < 0) &&
  retired.slice(0, 5).every(f => !fs.existsSync(path.join(ROOT, 'src', f))) && !fs.existsSync(path.join(ROOT, 'assets/audio/sf')));

// ---- 10. the Director's rules, headless (src/audio_music2004.js against a stub page + the real song data)
{
  const vm = require('vm');
  const chats = [], plays = [];
  const fakeGM = { songs: G.songs, loop: true, _cur: null, _ended: false, onEnded: null,
    get current(){ return this._cur; }, get ended(){ return this._ended; },
    attach(){}, stop(){ this._cur = null; }, play(id, o){ plays.push([id, !!(o && o.restart)]); this._cur = id; this._ended = false; return Promise.resolve(true); } };
  const store = {}, listeners = {};
  const welcome = { style: { display: 'none' } };
  const sb = { console, Math, JSON, Promise, setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, Event: function(t){ this.type = t; },
    getComputedStyle: e => ({ display: e.style.display }), localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: { getElementById: id => id === 'welcome-screen' ? welcome : null, addEventListener: (t, f) => { listeners[t] = f; } },
    TRACKS: { hollow_square: { name: 'old' } }, GM2004: fakeGM, MusicAreas: A, UI: { chat: (m, c) => chats.push([m, c]) }, Sfx: { ensure(){} },
    Music: { on: false, unlocked: ['hollow_square'], mode: 'auto', _master: { gain: { value: 0, cancelScheduledValues(){}, setValueAtTime(){}, linearRampToValueAtTime(){} } },
      ensure(){ return { currentTime: 0, state: 'running' }; } },
    running: true, player: { position: { x: 44, z: 67 } }, Player: { plane: 0 },
    HolmArrivalQA: { active: () => true, saveRecord: () => ({ surface: 'land' }) }, zoneAt: () => 'commons' };
  sb.window = sb; sb.window.dispatchEvent = () => {};
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/audio_music2004.js'), 'utf8'), sb);
  const M = sb.Music, D = M.Director;
  check('the registry lists the seventeen pieces in play order (retired rows gone)',
    Object.keys(sb.TRACKS).length === 17 && Object.keys(sb.TRACKS)[0] === 'hm_title' && !sb.TRACKS.hollow_square, Object.keys(sb.TRACKS));
  sb.Music2004.poll();
  check('visiting an area unlocks its piece once, with a chat line, even with music off',
    M.unlocked.includes('holm_bakehouse') && chats.length === 1 && /Warm Loaves/.test(chats[0][0]) && plays.length === 0, { unlocked: M.unlocked, chats });
  sb.Music2004.poll();
  check('staying put does not unlock or play again', chats.length === 1 && plays.length === 0);
  M.start();
  check('turning music on plays the area\'s piece', fakeGM.current === 'holm_bakehouse' && store.cr_music_on === '1', plays);
  check('a locked piece cannot be picked', M.play('hm_cave') === false && fakeGM.current === 'holm_bakehouse');
  M.play('hm_title');
  check('picking an unlocked piece switches to Manual and plays it', M.mode === 'manual' && fakeGM.current === 'hm_title');
  sb.player.position.x = 27; sb.player.position.z = 96; sb.Music2004.poll();
  check('Manual keeps the pick while the player walks into another area (which still unlocks)', fakeGM.current === 'hm_title' && M.unlocked.includes('holm_hollow'));
  M.setMode('auto');
  check('Auto returns to the area\'s piece', fakeGM.current === 'holm_hollow' && D.manual === null);
  M.setLoop(false); fakeGM._ended = true; const n0 = plays.length; fakeGM.onEnded('holm_hollow');
  check('Loop off: the engine stops looping; Auto schedules the area\'s piece again after a breath', fakeGM.loop === false && plays.length === n0);
  M.setLoop(true);
  check('Loop back on after the end restarts the piece', plays[plays.length - 1][0] === 'holm_hollow' && plays[plays.length - 1][1] === true);
  const saved = JSON.parse(JSON.stringify(M.saveState()));
  M.restoreState({ unlocked: ['tutors_tide', 'hollow_square', 'scar_dirge', 'bogus'], mode: 'manual', current: 'hollow_square', loop: false });
  check('old saves carry their retired ids over to the new pieces',
    M.unlocked.join() === 'hm_title,holm_morning,hm_hearthmere,hm_scarlands' && M.mode === 'manual' && D.manual === 'hm_hearthmere' && M.loop === false, M.unlocked);
  M.restoreState(saved);
  check('save -> restore round-trips unlocks, mode and loop', M.unlocked.join() === saved.unlocked.join() && M.mode === saved.mode && M.loop === saved.loop);
  welcome.style.display = 'flex'; M.stop(); store.cr_music_on = '1'; listeners.pointerdown();
  check('on the login screen a player who had music on hears the title piece from the first click', M.on && fakeGM.current === 'hm_title');
}

console.log(failures ? '\n' + failures + ' FAILED' : '\nall music checks pass (' + songs.length + ' songs)');
process.exit(failures ? 1 : 0);
