#!/usr/bin/env node
/*
 * gemini_image.js — Crafted Realms asset-pipeline sprite generator
 *
 * Generates a flat sprite image with Gemini ("Nano Banana") for the
 * image-to-3D prop pipeline (sprite -> Hunyuan3D-2 -> in-game mesh).
 *
 * Usage:
 *   node tools/gemini_image.js "<prompt>" "<out.png>" [model]
 *
 * Models (default = gemini-3-pro-image = "Nano Banana 2"):
 *   gemini-3-pro-image       high quality (default)
 *   gemini-3.1-flash-image   faster / cheaper for iteration
 *   gemini-2.5-flash-image   "Nano Banana 1"
 *
 * Requires env GEMINI_API_KEY. Inject from the Windows USER registry:
 *   $env:GEMINI_API_KEY=[Environment]::GetEnvironmentVariable("GEMINI_API_KEY","User")
 * Never print or commit the key.
 */

const fs = require('fs');
const path = require('path');

const [, , prompt, outPath, modelArg] = process.argv;
const MODEL = modelArg || 'gemini-3-pro-image';

if (!prompt || !outPath) {
  console.error('Usage: node tools/gemini_image.js "<prompt>" "<out.png>" [model]');
  process.exit(1);
}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('ERROR: GEMINI_API_KEY not set in environment.');
  process.exit(1);
}

async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const aspect = process.env.GEMINI_ASPECT || '1:1';
  // Optional reference image (image-to-image): env REF_IMAGE=<path>. The model uses
  // it as the visual reference for the generated icon.
  const reqParts = [];
  if (process.env.REF_IMAGE && fs.existsSync(process.env.REF_IMAGE)) {
    const rb = fs.readFileSync(process.env.REF_IMAGE);
    const mime = process.env.REF_IMAGE.toLowerCase().endsWith('.jpg') ||
                 process.env.REF_IMAGE.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
    reqParts.push({ inline_data: { mime_type: mime, data: rb.toString('base64') } });
  }
  reqParts.push({ text: prompt });
  const body = {
    contents: [{ parts: reqParts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: aspect },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error(`API error ${res.status}:`, JSON.stringify(json, null, 2));
    process.exit(1);
  }

  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find((p) => p.inlineData?.data);

  if (!imgPart) {
    // surface any text/refusal the model returned so we can debug prompt filters
    const text = parts.map((p) => p.text).filter(Boolean).join('\n');
    console.error('No image returned.', text ? `Model said:\n${text}` : JSON.stringify(json, null, 2));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, 'base64'));
  console.log(`OK  ${outPath}  (${MODEL}, ${imgPart.inlineData.mimeType || 'image/png'})`);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
