/* Writes assets/models/holm_kit_v2_catalog.json from the character kit's Blender manifest
 * (.studio-workspaces/holm-characters-v2/candidates/manifest.json, written by tools/blender/build_holm_characters_v2.py):
 * every part's body type, slot, index and style label, which the 2004-style character creator shows.
 * Run after rebuilding the kit: node tools/build_holm_kit_catalog.js */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(ROOT,'.studio-workspaces/holm-characters-v2/candidates/manifest.json'),'utf8'));
const NICE={longstraight:'Long straight',hightail:'High tail',fullshort:'Short beard',chops:'Mutton chops',puffshort:'Puffed short',lacecuff:'Lace cuff',kneeskirt:'Knee skirt',longskirt:'Long skirt',wrapskirt:'Wrap skirt',sidepart:'Side part',sideswept:'Side swept',topknot:'Top knot',twintails:'Twin tails',bell:'Bell sleeves'};
// part styles are Blender names ("CurlsB", "JacketB"): drop the body-type suffix and space the words for the creator
function nice(s){const k=String(s).replace(/(?<=[a-z])B$/,'').toLowerCase();return NICE[k]||(k.charAt(0).toUpperCase()+k.slice(1))}
const SLOTS=['Hair','Jaw','Torso','Arms','Hands','Legs','Feet'],out={version:1,slots:SLOTS,bodies:{A:{},B:{}}};
(m.parts||[]).forEach(p=>{const b=out.bodies[p.body_type];if(!b)return;(b[p.slot]=b[p.slot]||[]).push({name:p.name,index:p.index,label:nice(p.style||p.description||('option '+p.index))})});
Object.values(out.bodies).forEach(b=>Object.values(b).forEach(list=>list.sort((x,y)=>x.index-y.index)));
fs.writeFileSync(path.join(ROOT,'assets/models/holm_kit_v2_catalog.json'),JSON.stringify(out,null,1)+'\n');
console.log('[HOLM KIT CATALOG]',Object.entries(out.bodies).map(([k,b])=>k+': '+SLOTS.map(s=>s+' '+((b[s]||[]).length)).join(', ')).join(' | '));
