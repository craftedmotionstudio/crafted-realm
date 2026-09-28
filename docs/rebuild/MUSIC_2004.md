# Music 2004: the old-school MIDI soundtrack

Goal (owner, 2026-09-28): cozy, memorable music in the style of 2004 MIDI, for every area and the music tab.
That means a General MIDI soundfont feel: simple melodies over chord loops that repeat seamlessly. Every piece is an
original composition for Crafted Realm. No melody, chord-progression signature or title is copied, transcribed or
closely paraphrased from any RuneScape/Jagex track. We evoke the era's style only.

Branch: `music-2004-midi` (cut from `holm-overhaul-wip-2026-09-24`).

## 1. Review of the current tracks (step 1)

### How they were reviewed

`tools/music_render.js --legacy <ids>` loads the shipped `src/audio_orchestra.js`, plus the album files, in headless
Chrome. It schedules every bar exactly as the game does, through the real lofi chain, into an `OfflineAudioContext`
and writes a WAV and MP3. `tools/music_analyze.js` turns each render into numbers.

The renders live in the session scratchpad (`legacy_*.mp3`, 75 s each). The owner's ears are the final judge. The
numbers below say *why* the tracks sound the way they do.

| track (id) | loop before repeat | mean / peak level | brightness (centroid, share above 4 kHz) | note onsets per s |
|---|---|---|---|---|
| Crafted Realm, title (`title_theme`, full) | 104 bars, 167 s | -49 / -34 dBFS | 598 Hz, 0.02 % | 0.01 |
| Hearthmere (`veyhollow_town`) | 16 bars ×2 passes, 58 s | -49 / -34 | 591 Hz, 0.01 % | 0.04 |
| First Light on the Holm (`tutors_holm`) | 8 bars ×2, 51 s | -50 / -35 | 547 Hz, 0.01 % | 0.20 |
| The Quiet Keep (`keep_quiet`) | 4 bars ×2, 27 s | -53 / -38 | 364 Hz, 0.01 % | 0.24 |
| The Open Road (`wilds_road`) | 4 bars ×2, 23 s | -52 / -37 | 416 Hz, 0.02 % | 0.03 |
| The Woodward Road (`emberwood_road`) | 8 bars ×2, 38 s | -49 / -34 | 562 Hz, 0.01 % | 0.07 |
| The Ditch (`the_ditch`) | 8 bars ×2, 66 s | -52 / -37 | 478 Hz, 0.01 % | 0.95 |
| Scarred Earth (`scarlands`) | 8 bars ×2, 53 s | -50 / -35 | 537 Hz, 0.01 % | 0.17 |
| Hearthside (`hearthside`) | 48 bars, 131 s | -63 / -47 | 374 Hz, 0.01 % | 2.99 |
| Minstrel's Rest (`minstrels_rest`) | 56 bars, 126 s | -64 / -48 | 350 Hz, 0.02 % | 2.39 |

A 2004 General MIDI mix is clear and bright, with discrete notes. Our new set's numbers are listed in §3 for
comparison.

### What sounds too modern or polished

1. **Everything is a wash, with no note starts.** Chords are re-voiced strings with a 1.0 s attack and a two-bar
   ring. The cello has a 0.45 s attack. The flute melody has a 0.32 s attack, and each note lasts 2.1 beats, so every
   note overlaps the next. Layers also swell in and out on gain ramps. On a spectrogram, eight of the ten tracks
   show a continuous blanket with no visible note starts: 0.01 to 0.24 onsets per second, where a MIDI melody gives
   2 to 5. This is how ambient and lofi music is produced, not how 2004 sequenced MIDI sounds. Old MIDI starts every
   note cleanly and lets it decay.
2. **The lofi chain dulls and muddies everything.** There is a 3.6 kHz low-pass and a 3.4 s reverb at 20 % wet, built
   from low-passed noise. The result:
   - The spectral centroid is 350 to 600 Hz, and under 0.02 % of the energy is above 4 kHz. The music sounds heard
     through a wall.
   - The noise reverb puts rumble down to 20 Hz.
   - GM-era synths were bright, fairly dry and panned by voice.
3. **The levels are far too low.** The main set averages -49 to -53 dBFS and peaks around -34. Hearthside and
   Minstrel's Rest sit another 14 dB lower, because their melody buses start at gain 0 and only a few passages ramp
   them up. At the default volume the music sits far under the sound effects.
4. **The loops are very short.** The Open Road repeats after 23 s and The Quiet Keep after 27 s: a 4-bar chord loop
   with two alternating quarter-note melodies. The 2004 area themes ran 1 to 3 minutes before repeating.
5. **The rhythm is one note per beat.** The album-I and album-II melodies are quarter-note grids, with no dotted
   figures, pickups, triplets or eighth-note runs. They have no rhythmic accompaniment either: no arpeggios,
   oom-pah, pizzicato bass or drums. Old-school themes got their charm from a bouncy accompaniment under a singable
   tune.
6. **Every area has the same band.** Strings, cello, harp, flute and lute play everywhere, so no area has its own
   sound. The 2004 soundtrack gave places a colour: oboe for fields, horns for castles, marimba and bells for mines,
   drums for the wilderness.
7. **The title theme is too close to "Scape Main".** Its source comment describes it as "our 'Scape Main'", and it
   is a rising G-major arpeggio waltz. The new title theme avoids that model entirely.
8. **The music tab doesn't match the music.** It lists the old sine-wave registry: The White Keep, The Undercrag,
   Hollow Square, Tutor's Tide, Sea Breeze, Brynholt Drums, Sun-Scoured and Scar Dirge. Clicking those plays
   whichever orchestra song is nearest, so names and music disagree. `index.html` also carries placeholder rows
   ("Tutor's Holm", "Under the Hearth").
9. **The wrong song plays on the Holm.** `curZone` starts as `'holm'`, so `Music.onZone('holm')` never fires at boot
   (`game5_main.js` zone block). The Director falls back to `veyhollow_town`, so Hearthmere's town tune plays on
   Tutor's Holm until the player leaves the island or clicks "Auto". This is fixed in the wiring step.

What is worth keeping:
- The Director's rule of one song at a time, with crossfades and a debounce.
- The opt-in autoplay handling.
- The per-building override idea.
- The local-font loading.

## 2. The 2004 sound (step 2)

### Engine: `src/audio_gm2004.js`
A small General MIDI-style sequencer and sampler. It replaces the lofi orchestra for the new set and does not
depend on soundfont-player.

- **One GM bank for everything.** FluidR3_GM is the same bank the existing full-range fonts came from.
  `tools/build_gm_bank.py` adapts it:
  - 22 instruments, one sample every 3 semitones, mono, 22,050 Hz (the old client's rate: bright to 11 kHz, a
    little grainy);
  - tails trimmed, then re-encoded. The whole bank is **3.9 MB**, against about 60 MB for the same instruments as
    full 88-note fonts.
  - The sampler pitch-shifts at most a semitone between samples, as a GM synth does.
- **MIDI articulation.** Every note starts cleanly with a per-instrument attack of 0 to 50 ms. Short release ramps
  replace the old 0.3 to 1 s swells:
  - held notes are gated at 93 %, so they breathe;
  - plucked and struck notes ring out their samples;
  - only pads play legato;
  - sustained notes longer than a sample crossfade-loop inside it.
- **Velocity life, no timing drift.** Velocity varies ±5 by seeded (repeatable) jitter, with +7 on downbeats and
  +3 on the mid-bar beat. The curve is `(v/127)^1.7`. Timing stays quantized, the way sequenced MIDI was.
- **Mix.** Voices are panned dry. There is one short room send (about 1.1 s tail, deterministic IR, DC and rumble
  removed, 15-30 % per voice) and a gentle peak catcher. There is **no low-pass and no long reverb.**
- **Memory.** Only the samples a song uses are decoded. Buffers no song needs are dropped on each switch. A song
  holds about 60 to 120 short mono buffers, against 440+ stereo 3-second buffers for the old orchestra.
- **Looping and crossfades.** A lookahead scheduler loops the song seamlessly: releases ring across the seam.
  `play(id)` loads first, then crossfades (1.6 s), so there is no silent gap.
- **MP3 encoder delay.** Chrome keeps LAME's roughly 50 ms of leading silence, which would make every note speak
  late. The sampler finds each sample's real start (above -34 dB, backed off 3 ms), whichever decoder is running.
- A synthesized mini GM kit for light percussion: kick, rim, snare, hat, tambourine, shaker.

### The palette (GM programs, used the era's way)
| colour | instruments |
|---|---|
| leads | clarinet, oboe, flute, recorder, fiddle, accordion, french horn |
| accompaniment | orchestral harp, nylon guitar, harpsichord, marimba, pizzicato strings |
| bass | pizzicato, acoustic bass, bassoon, cello, timpani |
| pads | string ensemble, choir aahs |
| sparkle and signals | glockenspiel, tubular bells, woodblock, taiko |

### Score notation: pure data, compiled once
Each song is one `GM2004.song(id, {...})` block: voices (instrument, volume, pan, register), parts (a chord line
plus one line per voice) and a form such as `I A A2 B A3`. Melodies are written note by note. The accompaniment is
written as patterns over the chords (`@arp/8 R 5 8 10 12 10 8 5`, `@bass/4 B . 5 .`, `@pad/2`). The notation is
documented at the top of the engine.

### Gates
- `node tools/test_music_2004.js` checks:
  - engine theory: voicing and voice leading;
  - that every song compiles, with bar arithmetic validated to the beat;
  - names, moods and placements, and loops of 60-200 s;
  - instruments and ranges against `BANK.json`;
  - titles against a list of old-game music titles;
  - a harmony lint: at least 70 % of strong-beat melody notes are chord tones (`--lint` lists the rest);
  - that the bank files match the manifest.
- `node tools/test_naming_bible.js` already scans every string literal in `src/`, so song names are covered.
- `tools/music_render.js` renders WAV and MP3 offline, and `tools/music_analyze.js` measures level, brightness,
  onsets and seams.

The first render ("Morning on the Holm") against the old Hearthmere town tune:

| | mean level | centroid | above 4 kHz | onsets per s | stereo width |
|---|---|---|---|---|---|
| old `veyhollow_town` | -50.7 dBFS | 591 Hz | 0.01 % | 0.04 | 0.63 (reverb wash) |
| new `holm_morning` | -25.5 dBFS | 654 Hz | 0.41 % | 2.6 | 0.16 (dry, panned voices) |

## 3. The set: 17 original pieces (step 3)

Every piece is original. The progressions are ordinary diatonic and modal functional harmony, not borrowed signatures.
Titles are checked against a list of old-game music titles and the naming bible. The table is regenerated from the
song data.

| id | name | plays at | mood | metre, tempo | instruments | loop |
|---|---|---|---|---|---|---|
| hm_title | **Hearth and Horizon** | Login and title screen | Warm and a little grand: a horn tune by the brazier, harp and strings behind, the road ahead. | 4/4, 84 bpm | horn, flute, oboe, harp, strings, cello, timpani, glockenspiel | 1:49 |
| holm_morning | **Morning on the Holm** | Guide House and the arrival green | Gentle, sunlit welcome: a clarinet tune over rippling harp; the flute takes the middle. | 4/4, 100 bpm | clarinet, flute, harp, pizzicato, strings, glockenspiel | 1:22 |
| holm_camp | **Woodsmoke and Flint** | The survival camp and Survival Wood | Crackling campfire jig: a recorder tune, a fiddle answer, guitar and a woodblock tick. | 6/8, 108 bpm | recorder, fiddle, nylon guitar, cello, light percussion | 1:10 |
| holm_hollow | **Reeds and Ripples** | Minnow Hollow, the fishing pond | Lazy and dappled: marimba ripples, a floating flute, an oboe drifting through the middle. | 3/4, 88 bpm | flute, oboe, marimba, upright bass, strings | 1:10 |
| holm_mill | **The Millrace Turns** | Creakwheel Mill | Bouncy and busy: the wheel ticks in the woodblock, the bassoon plods, the oboe whistles at work. | 4/4, 118 bpm | oboe, clarinet, bassoon, pizzicato, woodblock, glockenspiel | 1:09 |
| holm_bakehouse | **Warm Loaves** | The bakehouse and teaching kitchen | Floury and cosy: an accordion waltz with little musette turns; the clarinet hums the middle. | 3/4, 144 bpm | accordion, clarinet, nylon guitar, upright bass, glockenspiel | 1:05 |
| holm_lodge | **Maps by Candlelight** | The Quest Lodge | Curious and inviting: harpsichord and oboe over a walking bass; the flute sets out in the middle. | 4/4, 92 bpm | oboe, flute, harpsichord, upright bass, strings | 1:29 |
| holm_mine | **Pick and Lantern** | Quarry Gate, the mine and the Training Cavern | Earthy and steady: pickaxe ticks, a marimba ostinato, a low clarinet work tune, a bell at each shift. | 4/4, 92 bpm | clarinet, horn, marimba, bassoon, woodblock, tubular bell, strings | 1:29 |
| holm_keep | **The Warden's Watch** | Warden's Keep and the Combat Hall | Proud and steady: a horn march with snare and timpani; the oboe sings the serious middle. | 4/4, 104 bpm | horn, oboe, strings, pizzicato, timpani, light percussion, glockenspiel | 1:18 |
| holm_bank | **Counting-House Minuet** | The Holm Bank | Prim and tidy: a harpsichord minuet with a flute on top and a tinkle of coins. | 3/4, 112 bpm | flute, harpsichord, pizzicato, glockenspiel | 1:20 |
| holm_mage | **The Scriptorium Hums** | The Mage Tower | Hushed and wondering: harp and glockenspiel sparkle, a choir breathes, the flute floats a strange bright turn. | 4/4, 76 bpm | flute, clarinet, harp, choir, cello, glockenspiel | 1:47 |
| holm_lastlight | **The Lamp Keeper's Vigil** | Lastlight and the Keeper's Stair | Lonely and steadfast: a fiddle on the cliff, a tolling bell, the choir as sea wind; the flute lights the lamp. | 3/4, 72 bpm | fiddle, flute, harp, choir, cello, tubular bell | 1:25 |
| holm_cove | **Fair Winds, Old Friend** | Lanternfoot Cove and Departure Haven | Hopeful farewell: a fiddle lilt with accordion and tambourine, a recorder waving from the pier. | 6/8, 120 bpm | fiddle, recorder, accordion, nylon guitar, upright bass, light percussion | 1:15 |
| hm_hearthmere | **Hearthmere Market Day** | Hearthmere (the town, its square and market) | Cheerful bustle: a clarinet tune, an oboe that chats back, walking bass, guitar and tambourine. | 4/4, 108 bpm | clarinet, oboe, nylon guitar, upright bass, strings, light percussion, glockenspiel | 1:16 |
| hm_road | **Hedgerows and Milestones** | The Hearthlands roads, fields and farmland | Open and unhurried: an oboe walking tune over harp, a horn for the long straight, a flute overhead. | 6/8, 96 bpm | oboe, horn, flute, harp, pizzicato, strings | 1:19 |
| hm_scarlands | **Ash on the Wind** | The Scarlands, north of the Ditch | Tense and wary: taiko and timpani, driving low strings, a grim horn; the oboe keens like wind over ash. | 4/4, 100 bpm | horn, oboe, strings, choir, taiko, timpani | 1:22 |
| hm_cave | **Where the Lamps Gutter** | Caves, dungeons and deep places | Dark and dripping: a low bassoon, marimba drops, a far bell and a choir breathing in the stone. | 4/4, 66 bpm | bassoon, clarinet, marimba, harp, choir, timpani, tubular bell | 2:04 |

Review surfaces:
- `tools/music_box.html`: every track plays live through the engine, with crossfade, Loop and volume.
- `tools/music_render.js --songs all`: offline WAV/MP3 renders.

### Wiring plan (step 6, waiting for the owner's pick)
- **Director bridge.** A new `src/audio_gm2004_director.js` makes the existing Music Director play GM2004 songs.
  Priority stays manual > building > ambient > zone. Crossfades use the engine's own 1.6 s load-then-fade. Old
  orchestra ids are kept as fallbacks until the owner retires them.
- **Where the player is.**
  - Tutor's Holm is always zone `holm`, so a finer area comes from the live island's nav surface
    (`HolmArrivalQA.saveRecord().surface`, `b:<building>:…`). There is also a small table of named rects around
    the pads (Guide House 66,99; Minnow Hollow pond 27,96; mill 65,64; and so on).
  - Inside a building, that building's piece plays. Outside, the nearest named area's piece plays.
  - The cavern surface `b:cavern:` gets the mine piece.
  - On the mainland, `zoneAt()` gives `commons` = Hearthmere, the roads, `scarlands`, and underground `Player.plane<0`
    = the cave piece.
  - This step also fixes the Holm boot bug (`curZone` starting at `'holm'` never fired `onZone`).
- **Music tab, as in 2004.**
  - The tab lists the set by our names: green when unlocked, red when not yet heard.
  - A track unlocks on first visit to its area, with the chat line "You have unlocked a new music track: …".
  - Click a green track to play it.
  - **Auto** follows the area, **Manual** keeps your pick, and **Loop** repeats the current track. With Loop off,
    Auto picks the area's track again after a short breath, and Manual stops.
  - Unlocks and mode save with the adventurer.
  - The legacy sine-era rows and the index.html placeholders leave the tab.

### Mix balance (measured, since I can't listen)
`tools/music_render.js --solo <voice>` and `--mute <voice>` render one voice alone or everything but it. The first
pass showed every lead **3-10 dB under** its accompaniment; Warm Loaves' accordion was buried under guitar and bass.
In 2004 MIDI the tune sits on top, so every song was rebalanced: melodic voices went up and accompaniment down. A
re-measure puts the lead at about +1 dB over the rest of the band. Measured against pure accompaniment, the melody
now sits +4 to +6 dB on top. Two more fixes came out of the numbers:
- "Ash on the Wind" had 14.6 % of its energy below 45 Hz. It came from the GM taiko pitched down to D2; moving it
  up an octave brought that to 0.2 %.
- "The Warden's Watch" rested every voice on its last beat, which left a near-silent quarter before the loop point.
  A snare roll now leads back into the downbeat.

## 4. Gates run on this branch
- `node tools/test_music_2004.js`: 17 songs, every check green.
- `node tools/test_naming_bible.js`: clean. Song names are string literals in `src/`, so the guard scans them.
- All `tools/test_*.js`: 91/91 green, once the gitignored `.studio-workspaces` the island tests read were copied in
  from the main checkout. Without them, three island tests fail on missing data. That failure is environmental;
  this branch changes no game data.
- The live player in `tools/music_box.html` (browser pane):
  - play, then crossfade Morning → Ash on the Wind → Warm Loaves, then stop;
  - no console errors;
  - decoded samples stay capped at the current and previous song (41 → 69 → 55 buffers).
- Smoke: `SMOKE_BASE=http://127.0.0.1:8793 node tools/run_smoke_headless.js`
  - **PASS** in the foreground and in the hidden-tab boot: structural 108/108, 60 FPS (worst frame 18 ms), 110 draw
    calls, 0 console errors.
  - Expected, because `index.html` is untouched: nothing new loads in the game until the owner picks.

## 5. Owner review (step 5): pending
Listening samples went to the owner:
- one full loop per piece;
- a 24 s loop-seam clip per piece;
- a 5:40 quick reel of all 17;
- before/after copies of three old tracks;
- plus `tools/music_box.html` for live listening.

For each piece the owner decides **keep / rework / drop**. Only the kept pieces get wired (§3 wiring plan).
