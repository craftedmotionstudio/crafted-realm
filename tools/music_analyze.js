/* music_analyze.js: objective listening-check numbers for rendered music WAVs (tools/music_render.js output).
 *
 *   node tools/music_analyze.js <dir-or-wav> [...]        -> table + <dir>/analysis.json
 *
 * Measures what "too modern / too polished / too smeared" means in numbers:
 *   loud    RMS level (dBFS) and crest factor (peak/RMS; low = compressed, washed)
 *   bright  spectral centroid and share of energy above 4 kHz (a 2004 GM synth is bright and clear; a lofi
 *           low-pass chain pulls both down)
 *   attack  onset sharpness: mean spectral-flux peak / mean flux (high = crisp note starts; pads and slow
 *           attacks flatten it)
 *   wash    tail ratio: energy 150-400 ms after a detected onset vs the onset frame (reverb and long releases
 *           keep it high; dry MIDI notes decay)
 *   width   side/mid energy ratio (reverb widens the image; old MIDI mixes are mostly panned dry voices)
 *   seam    loop-seam click check: |sample jump| and RMS step across the loop point when --seam <sec> is given
 */
'use strict';
const fs = require('fs');
const path = require('path');

function readWav(file){
  const b = fs.readFileSync(file);
  let o = 12, fmt = null, data = null;
  while (o < b.length){
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === 'data') data = { off: o + 8, len: sz };
    o += 8 + sz + (sz & 1);
  }
  const n = data.len / (fmt.ch * 2), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++){
    L[i] = b.readInt16LE(data.off + i * fmt.ch * 2) / 32768;
    R[i] = fmt.ch > 1 ? b.readInt16LE(data.off + i * fmt.ch * 2 + 2) / 32768 : L[i];
  }
  return { sr: fmt.sr, L, R, n };
}

function fft(re, im){
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++){
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j){ [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1){
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len){
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++){
        const a = i + k, c = a + len / 2;
        const tr = re[c] * cr - im[c] * ci, ti = re[c] * ci + im[c] * cr;
        re[c] = re[a] - tr; im[c] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

function analyze(file, opts){
  const w = readWav(file), N = 2048, HOP = 1024;
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  let sum2 = 0, peak = 0, mid2 = 0, side2 = 0;
  for (let i = 0; i < w.n; i++){
    const m = (w.L[i] + w.R[i]) / 2, s = (w.L[i] - w.R[i]) / 2;
    sum2 += m * m; mid2 += m * m; side2 += s * s; peak = Math.max(peak, Math.abs(w.L[i]), Math.abs(w.R[i]));
  }
  const rms = Math.sqrt(sum2 / w.n);
  // spectral frames on the mid channel
  const frames = [], flux = [], energy = [];
  let prev = null, cenSum = 0, cenW = 0, hi4 = 0, hi8 = 0, tot = 0;
  const binHz = w.sr / N;
  for (let s = 0; s + N < w.n; s += HOP){
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = ((w.L[s + i] + w.R[s + i]) / 2) * win[i];
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let e = 0, c = 0, fl = 0;
    for (let k = 1; k < N / 2; k++){
      mag[k] = Math.hypot(re[k], im[k]);
      const p = mag[k] * mag[k], f = k * binHz;
      e += p; c += p * f; if (f > 4000) hi4 += p; if (f > 8000) hi8 += p;
      if (prev) fl += Math.max(0, mag[k] - prev[k]);
    }
    tot += e; cenSum += c; cenW += e; energy.push(e); flux.push(fl); prev = mag;
  }
  // onsets = local flux maxima well above the running mean
  const meanFlux = flux.reduce((a, b) => a + b, 0) / flux.length;
  const onsets = [];
  for (let i = 2; i < flux.length - 2; i++){
    if (flux[i] > 2.2 * meanFlux && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) onsets.push(i);
  }
  const peakFlux = onsets.length ? onsets.reduce((a, i) => a + flux[i], 0) / onsets.length : 0;
  // tail ratio: energy ~150-400 ms after an onset relative to the onset frame
  const f150 = Math.round(0.15 * w.sr / HOP), f400 = Math.round(0.4 * w.sr / HOP);
  let tr = 0, tn = 0;
  for (const i of onsets){
    if (i + f400 >= energy.length) continue;
    let t = 0; for (let k = i + f150; k <= i + f400; k++) t += energy[k];
    t /= (f400 - f150 + 1); if (energy[i] > 0){ tr += t / energy[i]; tn++; }
  }
  const out = {
    file: path.basename(file), seconds: +(w.n / w.sr).toFixed(1),
    rmsDb: +(20 * Math.log10(rms + 1e-12)).toFixed(1), peakDb: +(20 * Math.log10(peak + 1e-12)).toFixed(1),
    crestDb: +(20 * Math.log10((peak + 1e-12) / (rms + 1e-12))).toFixed(1),
    centroidHz: Math.round(cenSum / (cenW || 1)), above4k: +(100 * hi4 / (tot || 1)).toFixed(2), above8k: +(100 * hi8 / (tot || 1)).toFixed(3),
    onsetsPerSec: +(onsets.length / (w.n / w.sr)).toFixed(2), attack: +(peakFlux / (meanFlux || 1)).toFixed(2),
    tail: +(tn ? tr / tn : 0).toFixed(2), width: +(Math.sqrt(side2 / (mid2 || 1))).toFixed(3),
  };
  if (opts && opts.seam){
    const i = Math.round(opts.seam * w.sr), a = Math.round(0.25 * w.sr);
    let j = 0; for (let k = i - 32; k < i + 32; k++) j = Math.max(j, Math.abs(w.L[k + 1] - w.L[k]));
    const r = (s, e) => { let q = 0; for (let k = s; k < e; k++) q += w.L[k] * w.L[k]; return Math.sqrt(q / (e - s)); };
    out.seamJump = +j.toFixed(4); out.seamStepDb = +(20 * Math.log10((r(i, i + a) + 1e-9) / (r(i - a, i) + 1e-9))).toFixed(1);
  }
  return out;
}

if (require.main === module){
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const si = process.argv.indexOf('--seam'), seam = si > 0 ? +process.argv[si + 1] : 0;
  const files = [];
  for (const a of args){
    if (fs.statSync(a).isDirectory()) fs.readdirSync(a).filter(f => f.endsWith('.wav')).sort().forEach(f => files.push(path.join(a, f)));
    else files.push(a);
  }
  const rows = files.map(f => analyze(f, { seam }));
  const cols = ['file', 'seconds', 'rmsDb', 'crestDb', 'centroidHz', 'above4k', 'above8k', 'onsetsPerSec', 'attack', 'tail', 'width'].concat(seam ? ['seamJump', 'seamStepDb'] : []);
  console.log(cols.join('\t'));
  rows.forEach(r => console.log(cols.map(c => r[c]).join('\t')));
  if (args.length === 1 && fs.statSync(args[0]).isDirectory()) fs.writeFileSync(path.join(args[0], 'analysis.json'), JSON.stringify(rows, null, 1));
}
module.exports = { analyze, readWav };
