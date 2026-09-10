# Prompt: Compose an original song for Crafted Realm

Copy everything between the lines into ChatGPT (or any AI). When it answers,
send the JSON it produces back to Claude, who will validate, render an mp3,
and wire it into the game.

---

You are a composer writing an original piece for a cozy old-school fantasy RPG
(2007 RuneScape-era feel). You must output the song as DATA in the exact JSON
format below — no prose, no markdown, just one JSON object.

## The sound you are writing for
A small sampled ensemble plays your data. You choose which instrument plays
each of five ROLES, from this list of available instruments:
`flute, recorder, pizzicato_strings, vibraphone, dulcimer, orchestral_harp,
electric_piano_1, string_ensemble_1, cello, acoustic_guitar_nylon`

The five roles:
- **flute** role — the LEAD melody (your `melodyA` line)
- **harp** role — a SECOND lead / counter-line (your `melodyH` line)
- **strings** role — short chord stabs on downbeats (auto-generated from `chords`)
- **cello** role — staccato bass pulses on every beat (auto-generated from `bass`)
- **lute** role — soft counter plucks (auto-generated; usually kept quiet)

## Composition rules (non-negotiable — learned from many revisions)
1. **Short notes.** The engine plays your melody slots staccato. Write busy,
   crisp lines (music-box / pizzicato character), not held whole notes.
2. **Sparse, take-turns arrangement.** Never more than 4 audible voices at
   once. Sections must feature different instruments: e.g. intro = one
   instrument alone; verse = lead + bass only; later sections add voices.
   Use the `dyn` mixer (below) to silence and feature voices per section.
3. **One melody at a time.** When `melodyA` is busy, `melodyH` answers in its
   rests (or is silenced in `dyn`) — never two dense lines at once.
4. **Real phrases.** 4-bar phrases; every section ends with a cadence
   (dominant → tonic, melody landing on a chord tone, ideally the root).
5. **Motif discipline.** Build the piece from ONE short motif (5–8 notes),
   repeated and developed (transposed, varied at phrase ends). Strophic
   repetition is good — real folk music repeats its verse.
6. **Mostly stepwise melody.** Leaps larger than a 4th must reverse by step.
   One melodic peak per phrase.
7. **Form with a story.** Example: Intro(4) A(12) A'(12) B(8–10, contrasting
   minor turn, other instrument leads) A''(8–12) Outro(4–6). Total 44–64 bars.

## JSON format (exact)
```json
{
  "name": "Song Title",
  "bpm": 72,
  "beatsPerBar": 3,
  "sub": 2,
  "stacc": true,
  "voices": {"flute": "recorder", "harp": "dulcimer", "strings": "orchestral_harp"},
  "pedal": [],
  "pads": 0.8,
  "chords": [["G3","B3","D4"], ["C4","E4","G4"], "... one triad per bar ..."],
  "bass":   ["G2", "C3", "... one note per bar, same length as chords ..."],
  "melodyA": ["B4", null, "A4", "... exactly bars × beatsPerBar × sub slots ..."],
  "melodyH": ["... same length as melodyA; null = rest ..."],
  "melodyB": null,
  "dyn": {
    "0":  {"f": 0,   "l": 0.5, "c": 0,   "p": 0.7,  "h": 0},
    "4":  {"f": 1.0, "l": 0.3, "c": 0.8, "p": 0.45, "h": 0}
  }
}
```

Field rules:
- `beatsPerBar`: 3 or 4. `sub`: 2 (eighth-note slots). `bpm`: 56–96 for cozy.
- `chords`: one 3-note triad per bar, note names like "F#4"/"Bb3", octaves 2–5.
- `bass`: one note per bar (octave 2–3), usually the chord root.
- `melodyA`/`melodyH`: length MUST equal `chords.length × beatsPerBar × sub`.
  Slot k of bar i is index `i × beatsPerBar × sub + k`. Use `null` for rests.
  Melody register: octaves 4–5. Aim for 2–4 notes per active bar.
- `dyn`: keys are bar indexes where a section starts (as strings). Values set
  each voice's level 0–1.2 for that section: `f`=lead, `h`=counter, `c`=bass,
  `p`=chord stabs, `l`=lute. 0 = that voice is silent for the section.
  EVERY section boundary needs an entry, and levels must differ between
  sections (that's the take-turns rule).
- `pedal`: keep `[]` (no drones). `pads`: 0.6–0.8.

## Checklist before you answer (verify, don't assume)
- [ ] melodyA length == melodyH length == chords.length × beatsPerBar × sub
- [ ] bass length == chords.length
- [ ] every note matches `^[A-G][#b]?[2-6]$`; melody stays in octaves 4–5
- [ ] each `dyn` section silences at least one voice (no all-on sections)
- [ ] last bar: melody lands on the tonic; final chord is the tonic triad
- [ ] the motif from bars 1–2 recognizably returns at least 3 times

Now compose: **[DESCRIBE YOUR SONG HERE — e.g. "a cozy medieval market
morning, hopeful, recorder lead with dulcimer answers, G major, 3/4"]**

Output only the JSON object.

---

## After ChatGPT answers
Paste the JSON back to Claude and say "render this song". Claude will validate
the data (lengths, note names, dyn coverage), fix small errors, render an mp3
with the real game instruments, and wire it into the music tab.
