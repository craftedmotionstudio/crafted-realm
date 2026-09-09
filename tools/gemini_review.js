#!/usr/bin/env node
/* gemini_review.js — second-model reviewer for the two-model gear review system
 * (owner directive 2026-07-17). Sends the composed review sheet to Gemini vision
 * and asks the owner's three questions; expects STRICT JSON back.
 *
 * Usage: node tools/gemini_review.js <sheet.png> "<item name>" "<osrs ref name>"
 * Env:   GEMINI_API_KEY (Windows USER registry — never print/commit)
 * Output: prints the JSON verdict; exit 0 if parseable, 2 if the model answered
 *         unparseably (raw text printed), 1 on API failure.
 */
'use strict';
const fs = require('fs');

const [, , sheetPath, itemName, refName, anchorsArg] = process.argv;
if (!sheetPath || !itemName){
  console.error('usage: node tools/gemini_review.js <sheet.png> "<item name>" "<ref name>" ["<class anchors>"]');
  process.exit(1);
}
const KEY = process.env.GEMINI_API_KEY;
if (!KEY){ console.error('ERROR: GEMINI_API_KEY not set'); process.exit(1); }

const MODELS = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];

const PROMPT = `You are reviewing a low-poly game asset for "Crafted Realm", a cozy 2007-RuneScape-style browser RPG (flat-shaded, warm, readable at an elevated 3/4 camera).

The image is a labeled review sheet for the item "${itemName}" (visual reference inspiration: OSRS "${refName || itemName}"). Panels: the reference render(s), our avatar wearing/holding the item (full body front + side), and a zoomed close-up of the item itself.

Answer STRICTLY as JSON (no markdown fences, no prose outside JSON):
{
 "scaling": {"ok": true/false, "score": 1-10, "notes": "is the item's SIZE correct relative to the avatar, compared to the reference? too big/small, by roughly how much"},
 "hold": {"ok": true/false, "score": 1-10, "notes": "is it held/worn CORRECTLY? grip point on the handle, resting orientation/angle, position relative to the hand/body; compare to the reference stance"},
 "other": {"score": 1-10, "notes": "anything else to change: colors, proportions, shape, silhouette, material separation, readability at game camera", "changes": ["specific change 1", "..."]},
 "overall": 1-10
}
Judge for the cozy low-poly style — do NOT ask for realism or high-poly detail. Score 9+ only if it would ship as-is.

MEASURABLE ANCHORS — answer these by measuring in the image, do not estimate from vibes:
${anchorsArg || `- SCALING: judge the item's size against the avatar's body landmarks (head, waist, knee, ankle) and compare with where it reaches in the reference render.
- HOLD/WEAR: the item must attach at the correct point (grip in the fist, helm seated on the crown, shield on the forearm) without visible interpenetration of the body.`}
- Be consistent: if an aspect matches these anchors, do not fail it for stylistic preference — put style notes under "other" instead.`;

async function tryModel(model){
  const body = {
    contents: [{parts: [
      {text: PROMPT},
      {inline_data: {mime_type: 'image/png', data: fs.readFileSync(sheetPath).toString('base64')}},
    ]}],
    generationConfig: {temperature: 0, maxOutputTokens: 4000},
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': KEY},
     body: JSON.stringify(body)});
  const json = await res.json();
  if (!res.ok) return {err: `${model}: HTTP ${res.status} ${JSON.stringify(json.error && json.error.message || json).slice(0, 200)}`};
  const text = (json.candidates && json.candidates[0] && json.candidates[0].content &&
    json.candidates[0].content.parts || []).map(p => p.text).filter(Boolean).join('\n');
  return {model, text};
}

(async () => {
  let last = null;
  for (const m of MODELS){
    const r = await tryModel(m);
    if (r.err){ last = r.err; continue; }
    const cleaned = r.text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      const v = JSON.parse(cleaned);
      console.log(JSON.stringify({reviewer: r.model, verdict: v}, null, 1));
      process.exit(0);
    } catch (e) {
      console.log('UNPARSEABLE from ' + r.model + ':\n' + r.text.slice(0, 1200));
      process.exit(2);
    }
  }
  console.error('All models failed. Last: ' + last);
  process.exit(1);
})();
