/* gen_ui_icons.js — Nano Banana (Gemini) UI tab/panel icon generator.
 * One shared STYLE suffix keeps the whole set cohesive; per-panel SUBJECT differs.
 * All render on a flat magenta #FF00FF field (keyed out later by process_ui_icons.py).
 * Output: Bible_References/UI_Icons/raw/<panel>.png  (skips ones already present).
 * Run: node tools/gen_ui_icons.js            (all panels)
 *      node tools/gen_ui_icons.js combat inv  (just those)
 *      FORCE=1 node tools/gen_ui_icons.js ... (regenerate even if present)
 * Requires GEMINI_API_KEY in env.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAW = path.join(__dirname, '..', 'Bible_References', 'UI_Icons', 'raw');
fs.mkdirSync(RAW, { recursive: true });

const STYLE = "cozy 2007 Old School RuneScape UI tab icon, low-poly flat-shaded, " +
  "warm medieval palette of browns bronze muted greens and gold accents, bold dark " +
  "outline, simple and clearly readable at small size, a single centered object filling " +
  "most of the frame, on a completely flat solid magenta #FF00FF background, " +
  "no text, no drop shadow, no gradient, no border frame, no letters.";

const PANELS = {
  combat:   "a crossed bronze sword and battleaxe forming an X",
  inv:      "a brown leather adventurer's backpack with a gold buckle",
  equip:    "a bronze suit of plate armour: a cuirass breastplate with shoulder pauldrons",
  skills:   "three rising golden achievement bars beside a small laurel wreath",
  quests:   "a rolled parchment quest scroll tied with a red wax seal",
  prayers:  "a golden radiant prayer symbol, a glowing sunburst over a small stone altar",
  spells:   "a wooden wizard staff topped with a glowing blue magic crystal and drifting purple runes",
  drops:    "an open leather-bound bestiary tome with three white claw-marks slashing the page",
  settings: "a single iron cog gear wheel",
  clan:     "a heraldic banner flag on a pole with a gold crest",
  friends:  "a friendly round smiling face, warm and welcoming, green tint",
  ignore:   "an angry red face inside a red circle with a diagonal slash, a blocked symbol",
  logout:   "a wooden arched door slightly open with a green exit arrow pointing out",
  emotes:   "two theatrical comedy-and-tragedy masks, one happy one sad",
  music:    "a golden herald's horn with a small red pennant flag",
};

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
const force = !!process.env.FORCE;
const want = process.argv.slice(2);
const list = (want.length ? want : Object.keys(PANELS)).filter(k => PANELS[k]);

let ok = 0, skip = 0, fail = [];
for (const panel of list) {
  const out = path.join(RAW, panel + '.png');
  if (!force && fs.existsSync(out)) { skip++; console.log('skip (exists):', panel); continue; }
  const prompt = PANELS[panel] + ", " + STYLE;
  try {
    execFileSync('node', [path.join(__dirname, 'gemini_image.js'), prompt, out],
      { stdio: 'pipe', env: process.env });
    ok++; console.log('OK  ', panel);
  } catch (e) {
    fail.push(panel);
    console.log('FAIL', panel, (e.stderr || e.stdout || e.message || '').toString().slice(0, 200));
  }
}
console.log(`\ndone: ${ok} generated, ${skip} skipped, ${fail.length} failed` +
            (fail.length ? ' -> ' + fail.join(', ') : ''));
