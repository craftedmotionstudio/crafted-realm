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
