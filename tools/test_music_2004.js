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

console.log(failures ? '\n' + failures + ' FAILED' : '\nall music checks pass (' + songs.length + ' songs)');
process.exit(failures ? 1 : 0);
