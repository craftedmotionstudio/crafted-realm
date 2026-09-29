"""Build the 2004-style General MIDI bank (assets/audio/gm/) from FluidR3_GM MIDI.js soundfonts.

Source: FluidR3_GM (Frank Wen) as pre-rendered by gleitz/midi-js-soundfonts, CC BY 3.0
(https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/<instrument>-mp3.js), fetched once into a scratch dir (about
2-3 MB per instrument; only the adapted bank is committed). The 2026-09-28 build took five instruments from the old
assets/audio/sf/ copies, byte-identical to these FluidR3 files apart from line endings; that folder is now retired.

What the build does per instrument (an adaptation, which CC BY 3.0 allows with attribution; see THIRD_PARTY_ASSETS.md):
  - keeps only the instrument's playable range, and only one sample every three semitones (C, Eb, Gb, A). The
    engine (src/audio_gm2004.js) pitch-shifts at most one semitone to the notes between, the way a GM synth plays
    a multisampled SoundFont. Files and decoded memory both shrink about three times.
  - downmixes to mono and resamples to 22,050 Hz, the old browser client's rate (bandwidth to 11 kHz: bright, a
    little grainy, period-correct)
  - trims each decaying sample's silent tail (below -50 dB of its peak) and fades the last 40 ms, so no sample ends
    on a click
  - re-encodes to MP3 (LAME VBR) and writes MIDI.js format, so soundfont-player can still read the files
  - writes assets/audio/gm/BANK.json: range, sample grid, kind (sustain|decay), a loudness-matching gain, bytes

Run:  python tools/build_gm_bank.py <dir with fetched FluidR3 *-mp3.js> [instrument,instrument]
Needs ffmpeg with libmp3lame on PATH.
"""
import base64
import json
import math
import os
import re
import struct
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio', 'gm')
SR = 22050
GRID = (0, 3, 6, 9)            # C, Eb, Gb, A
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

# name: (lo, hi, kind) -- MIDI numbers, C4 = 60; every source file comes from the fetched dir
INSTRUMENTS = {
    'flute':                 (60, 96, 'sustain'),
    'recorder':              (60, 96, 'sustain'),
    'oboe':                  (58, 91, 'sustain'),
    'clarinet':              (50, 91, 'sustain'),
    'bassoon':               (34, 75, 'sustain'),
    'french_horn':           (41, 79, 'sustain'),
    'fiddle':                (55, 96, 'sustain'),
    'accordion':             (48, 84, 'sustain'),
    'choir_aahs':            (48, 81, 'sustain'),
    'string_ensemble_1':     (36, 84, 'sustain'),
    'cello':                 (36, 72, 'sustain'),
    'timpani':               (36, 60, 'decay'),
    'glockenspiel':          (72, 108, 'decay'),
    'marimba':               (45, 96, 'decay'),
    'acoustic_bass':         (28, 62, 'decay'),
    'tubular_bells':         (57, 80, 'decay'),
    'harpsichord':           (41, 89, 'decay'),
    'taiko_drum':            (36, 60, 'decay'),
    'woodblock':             (60, 84, 'decay'),
    'orchestral_harp':       (36, 96, 'decay'),
    'acoustic_guitar_nylon': (40, 84, 'decay'),
    'pizzicato_strings':     (36, 84, 'decay'),
}


def note_name(m):
    return NAMES[m % 12] + str(m // 12 - 1)


def grid_notes(lo, hi):
    a = lo
    while a % 12 not in GRID:
        a -= 1
    b = hi
    while b % 12 not in GRID:
        b += 1
    return [m for m in range(a, b + 1) if m % 12 in GRID]


def read_font(path):
    s = open(path, encoding='utf-8').read()
    return dict(re.findall(r'"([A-G]b?-?\d)"\s*:\s*"data:audio/mp3;base64,([^"]+)"', s))


def decode(mp3):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', str(SR), '-f', 'f32le', 'pipe:1'],
                       input=mp3, capture_output=True, check=True)
    n = len(r.stdout) // 4
    return list(struct.unpack('<%df' % n, r.stdout))


def encode(x):
    raw = struct.pack('<%df' % len(x), *x)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                        '-codec:a', 'libmp3lame', '-q:a', '5', '-f', 'mp3', 'pipe:1'],
                       input=raw, capture_output=True, check=True)
    return r.stdout


def trim(x, kind):
    peak = max(abs(v) for v in x) or 1.0
    if kind == 'decay':
        thr = peak * 10 ** (-50 / 20)
        end = len(x)
        while end > 1 and abs(x[end - 1]) < thr:
            end -= 1
        end = min(len(x), end + int(0.05 * SR))
        x = x[:end]
    fade = min(len(x), int(0.04 * SR))
    for i in range(fade):
        x[len(x) - fade + i] *= 1 - (i + 1) / fade
    return x


def rms(x, seconds=0.6):
    seg = x[:int(seconds * SR)] or [0.0]
    return math.sqrt(sum(v * v for v in seg) / len(seg))


def main():
    fetched = sys.argv[1] if len(sys.argv) > 1 else None
    only = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, 'BANK.json')
    bank = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    for name, (lo, hi, kind) in INSTRUMENTS.items():
        if only and name not in only:
            continue
        path = os.path.join(fetched, name + '-mp3.js')
        font = read_font(path)
        lines, mids, levels, total = [], [], [], 0.0
        for m in grid_notes(lo, hi):
            key = note_name(m)
            if key not in font:
                continue
            x = trim(decode(base64.b64decode(font[key])), kind)
            levels.append(rms(x))
            total += len(x) / SR
            mp3 = encode(x)
            lines.append('"%s": "data:audio/mp3;base64,%s"' % (key, base64.b64encode(mp3).decode('ascii')))
            mids.append(m)
        body = ("if (typeof(MIDI) === 'undefined') var MIDI = {};\n"
                "if (typeof(MIDI.Soundfont) === 'undefined') MIDI.Soundfont = {};\n"
                "MIDI.Soundfont.%s = {\n%s,\n}\n" % (name, ',\n'.join(lines)))
        out = os.path.join(OUT, name + '-mp3.js')
        with open(out, 'w', encoding='ascii', newline='\n') as f:
            f.write(body)
        mid_level = sorted(levels)[len(levels) // 2] if levels else 1e-3
        bank[name] = {'lo': lo, 'hi': hi, 'kind': kind, 'samples': mids, 'avgSec': round(total / max(1, len(mids)), 2),
                      'level': round(mid_level, 4), 'bytes': os.path.getsize(out), 'source': 'FluidR3_GM (gleitz/midi-js-soundfonts), CC BY 3.0'}
        print('%-22s %2d samples %s..%s avg %.2fs rms %.3f %6.0f KB' % (name, len(mids), note_name(mids[0]), note_name(mids[-1]),
              total / max(1, len(mids)), mid_level, os.path.getsize(out) / 1024), flush=True)
    # loudness matching: every instrument's gain brings its median sample RMS to the bank's reference level
    ref = 0.12
    for name in bank:
        bank[name]['gain'] = round(min(4.0, ref / max(1e-4, bank[name]['level'])), 3)
    with open(manifest_path, 'w', encoding='ascii', newline='\n') as f:
        json.dump(dict(sorted(bank.items())), f, indent=1)
        f.write('\n')
    print('bank: %d instruments, %.1f MB' % (len(bank), sum(v['bytes'] for v in bank.values()) / 1048576))


if __name__ == '__main__':
    main()
