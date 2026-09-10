/* gen_gear_icons.js — Nano Banana inventory icons for reviewed gear, using the
 * clean model renders (Bible_References/UI_Icons/model_refs/<id>.png) as visual
 * references (image-to-image via REF_IMAGE). Items without a render use text only.
 * Output: Bible_References/UI_Icons/gear_raw/<id>.png (flat magenta, keyed later).
 * Run: node tools/gen_gear_icons.js [id ...]   FORCE=1 to regen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const UI  = path.join(__dirname, '..', 'Bible_References', 'UI_Icons');
const REFS = path.join(UI, 'model_refs');
const RAW  = path.join(UI, 'gear_raw');
fs.mkdirSync(RAW, { recursive: true });

const STYLE = "Render it as a polished 2007 Old School RuneScape inventory item icon: " +
  "cozy low-poly flat-shaded, bold dark outline, a single centered object filling most of " +
  "the frame, three-quarter view, on a background that is 100% solid flat magenta #FF00FF filling the ENTIRE frame edge to edge (never white, never grey), " +
  "no text, no drop shadow, no gradient background, no letters.";

// subject includes the correct materials/colours (the model refs are dull-lit)
const SUBJ = {
  bronze_longsword: "a bronze longsword: broad bronze blade, wide gold crossguard, gold pommel, brown leather grip",
  bronze_sabre:     "a bronze scimitar: curved bronze blade, flat gold disc guard, brown leather grip",
  bronze_battleaxe: "a bronze battleaxe: a double-crescent bronze head on a golden haft",
  bronze_kiteshield:"a bronze kiteshield shaped like a KITE: wide rounded at the top and tapering to a point at the bottom (NOT a round shield), with a raised central boss and a cross ridge",
  gale_longbow:     "a tall curved wooden longbow of golden yew, no bowstring",
  bronze_helm:      "a bronze full helm with a purple plume crest on top and three vertical eye slits",
  bronze_mace:      "a bronze spiked ball mace (morning star) on a short handle with a gold pommel",
  bronze_warhammer: "a bronze warhammer: a big rectangular block head on a wooden haft with gold bands",
  bronze_greatsword:"a large bronze two-handed greatsword: broad blade, wide gold crossguard, long grip",
  bronze_medhelm:   "an open-face bronze medium helm with a blue band around the crown and two dark eye holes",
  bronze_sqshield:  "a tall bronze curved riot shield, a concave rectangular metal plate",
  bronze_chainbody: "a bronze chainmail shirt body armour (chainbody)",
  bronze_plateskirt:"a flared bronze plated armour skirt (plateskirt)",
  leather_chaps:    "brown leather leg armour (leather chaps / leggings)",
  leather_gloves:   "a pair of brown leather gloves",
  leather_boots:    "a pair of brown leather boots",
  iron_dagger:      "an iron dagger with a short pointed blade and a small crossguard",
};

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
const force = !!process.env.FORCE;
const want = process.argv.slice(2).filter(k => SUBJ[k]);
const list = want.length ? want : Object.keys(SUBJ);

let ok = 0, skip = 0, fail = [];
for (const id of list) {
  const out = path.join(RAW, id + '.png');
  if (!force && fs.existsSync(out)) { skip++; console.log('skip', id); continue; }
  const ref = path.join(REFS, id + '.png');
  const hasRef = fs.existsSync(ref);
  const prompt = (hasRef
    ? "This reference image is the exact 3D model. Match its shape, proportions and design. " + SUBJ[id]
    : SUBJ[id]) + ". " + STYLE;
  const env = Object.assign({}, process.env);
  if (hasRef) env.REF_IMAGE = ref;
  try {
    execFileSync('node', [path.join(__dirname, 'gemini_image.js'), prompt, out],
      { stdio: 'pipe', env });
    ok++; console.log('OK  ', id, hasRef ? '(ref)' : '(text)');
  } catch (e) {
    fail.push(id);
    console.log('FAIL', id, (e.stderr || e.stdout || e.message || '').toString().slice(0, 160));
  }
}
console.log(`\ndone: ${ok} ok, ${skip} skipped, ${fail.length} failed` + (fail.length ? ' -> ' + fail.join(', ') : ''));
