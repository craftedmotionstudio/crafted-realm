# Third-Party Assets — License Log

Provenance + license record for every asset in this project that we did not create ourselves.
Keep this current: one row per asset/pack, with source URL and license. This is our proof of
provenance if the project is ever distributed commercially.

**License safety rule:** only ship assets that are **CC0**, **CC-BY** (with attribution kept), or a
**paid commercial license we hold**. Never ship CC-BY-NC / "editorial" / unlicensed or game-ripped
models. (See the session discussion on licensing.)

| Asset / Pack | Files | Source | License | Attribution required? | Notes |
|---|---|---|---|---|---|
| Quaternius — Modular Character Outfits: Fantasy | `assets/vendor/quaternius/*` (Female/Male Ranger+Peasant glTF + PBR textures) | https://quaternius.itch.io/modular-character-outfits-fantasy | **CC0** (public domain) | No (but credited anyway, below) | 12 outfits / 62 modular parts, Humanoid rig, 65-joint Unreal-style skeleton. Ships rigged + PBR-textured but WITHOUT animation clips (those are in Quaternius's separate Universal Animation Library, also CC0). Female_Ranger wired in as the player via `src/char_quaternius.js`. |

## Credits (voluntary for CC0, good manners)
- Character art: **Quaternius** (https://quaternius.com) — free CC0 game assets.
- Music instrument samples: **FluidR3_GM SoundFont** by Frank Wen, rendered by Benjamin Gleitzman (midi-js-soundfonts), CC BY 3.0, adapted. The compositions are our own.

## Music and sound (recorded 2026-09-28, music-2004-midi)

| Asset / Pack | Files | Source | License | Attribution required? | Notes |
|---|---|---|---|---|---|
| FluidR3_GM SoundFont (Frank Wen), pre-rendered to MIDI.js by Benjamin Gleitzman | `assets/audio/gm/*-mp3.js` + `assets/audio/gm/BANK.json` (22 General MIDI instruments) | https://github.com/gleitz/midi-js-soundfonts (`FluidR3_GM/<instrument>-mp3.js`) | **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/us/) | **Yes**: "FluidR3_GM SoundFont by Frank Wen, rendered by Benjamin Gleitzman (midi-js-soundfonts), CC BY 3.0. Adapted: trimmed, resampled, re-encoded." | **Adapted** by `tools/build_gm_bank.py`: one sample every 3 semitones within each instrument's range, mono, 22,050 Hz, tails trimmed, LAME VBR re-encode. 17 instruments fetched 2026-09-28 (about 2-3 MB each, scratch only). The other 5 came from the repo copies below. The music is our own; only the instrument samples are third-party. |
| FluidR3_GM (same source, verbatim) | ~~`assets/audio/sf/{flute,cello,orchestral_harp,acoustic_guitar_nylon,string_ensemble_1}-mp3.js`~~ **removed 2026-09-28** | same as above | CC BY 3.0 | Yes (same credit line) | Verified byte-identical to FluidR3_GM (CRLF normalised). Used only by the retired orchestra (`src/audio_orchestra.js`, removed with the old tracks when the owner adopted the 2004 set). |
| Unknown-provenance 61-note fonts | ~~`assets/audio/sf/{dulcimer,electric_piano_1,pizzicato_strings,recorder,vibraphone}-mp3.js`~~ **removed 2026-09-28** | not recorded | Unknown | n/a | Removed with the retired tracks (Hearthside, Minstrel's Rest). They no longer ship, so the provenance question is closed. |
| soundfont-player (danigb) | ~~`assets/audio/soundfont-player.min.js`~~ **removed 2026-09-28** | https://github.com/danigb/soundfont-player | MIT | n/a | The retired orchestra's loader. The 2004 engine (`src/audio_gm2004.js`) has its own sampler. The old composer tool that loaded it from a CDN (`tools/songsmith.html`) was removed 2026-09-29. |

## Code, libraries and ported rules (game server, W1 2026-09-25)

| Source | Used in | License | Attribution required? | Notes |
|---|---|---|---|---|
| Lost City — 2004scape Server (https://github.com/2004scape/Server, now github.com/LostCityRS), (c) 2023-2025 Lost City | `server/engine/*` (World.cycle phase order, entity queue/timer/interaction model, zones, movement, save format idea), `shared/*` (combat, PvP, death, drop-table and run-energy RULES and FORMULAS ported from `data/src/scripts/**/*.rs2` and `src/engine/**`), `src/combat_engine.js` (the offline port of the same NPC AI; the wander rule from `src/engine/entity/Npc.ts` wanderMode / updateMovement: 1 in 8 random walks within the wander range, the 500-tick reset counted from the last step) | **MIT** | Yes: keep the copyright + permission notice with substantial portions | Rules and formulas only. No Jagex names, ids, text, maps, models, sprites or sounds were copied; every name and message in our code is our own. Each ported file cites the script it was verified against. |
| RS Mod — rsmod-pathfinder (npm `@2004scape/rsmod-pathfinder`), (c) 2020 RS Mod | `server/engine/CollisionMap.js` (paths, reach, line of sight) | **ISC** | Yes: keep the copyright + permission notice | Used as a dependency, unmodified, with our own collision data. |
| ws (npm `ws`), (c) 2011 Einar Otto Stangvik, 2013 Arnout Kazemier, 2016 Luigi Pinca and contributors | `server/net/WsServer.js`, `server/tools/BotClient.js` | **MIT** | Yes (notice ships in node_modules) | WebSocket server/client. |
| xoshiro128** / splitmix32 (Blackman & Vigna) | `shared/rng.js` | Public domain | No | Algorithms written from the published description. |

### Lost City notice (MIT)

> MIT License
>
> Copyright (c) 2023-2025 Lost City
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

### RS Mod notice (ISC)

> Copyright (c) 2020 RS Mod
>
> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
> ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
> ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
> OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
