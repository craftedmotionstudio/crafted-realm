#!/usr/bin/env node
/*
 * gemini_vision.js — independent visual reviewer for the OSRS-match pipeline.
 * Sends a text prompt + one or more images to Gemini (multimodal in, text out)
 * and prints the response. Used to critique our render vs the OSRS reference.
 *
 * Usage:
 *   node tools/gemini_vision.js "<prompt>" <img1> [img2 ...]
 *
 * Requires env GEMINI_API_KEY. Default model gemini-2.5-flash (override with GEMINI_VMODEL).
 */
const fs = require('fs');

const [, , prompt, ...imgs] = process.argv;
if (!prompt || imgs.length === 0) {
  console.error('Usage: node tools/gemini_vision.js "<prompt>" <img1> [img2 ...]');
  process.exit(1);
}
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('ERROR: GEMINI_API_KEY not set.'); process.exit(1); }
const MODEL = process.env.GEMINI_VMODEL || 'gemini-2.5-flash';

const mime = (p) => p.endsWith('.png') ? 'image/png' : (p.endsWith('.jpg')||p.endsWith('.jpeg')) ? 'image/jpeg' : 'image/png';

async function main() {
  const parts = [{ text: prompt }];
  for (const p of imgs) {
    parts.push({ inlineData: { mimeType: mime(p), data: fs.readFileSync(p).toString('base64') } });
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const json = await res.json();
  if (!res.ok) { console.error(`API error ${res.status}:`, JSON.stringify(json).slice(0, 500)); process.exit(1); }
  const text = (json?.candidates?.[0]?.content?.parts || []).map(p => p.text).filter(Boolean).join('\n');
  console.log(text || '(no text returned)');
}
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
