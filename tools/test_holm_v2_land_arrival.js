/* Headless locks for the v2 land's arrival package load (src/holm_v2_land.js loadArrival; src/holm_arrival_qa.js calls
 * it for the island). The island's terrain lives in that package and every seat, prop and the Minnow Hollow pond is
 * measured on it; a cold load once dropped a read and the island silently fell back to the pre-v2 package, whose
 * meadow buried the fishing spots (2026-09-27 combined proof). Checked:
 *  1 a good read returns the pinned v2-land export (and only that export is ever asked for);
 *  2 a dropped read is retried (two failures, then the package), with a warning per failed try and growing waits;
 *  3 a package that cannot be read throws after three tries, naming the cause, and never asks for the pre-v2 package;
 *  4 an abort (the page leaving) is not retried;
 *  5 the island provider no longer has a silent fallback on the v2 land (its only v9 read is for the non-island draft).
 * Run: node tools/test_holm_v2_land_arrival.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const V2=require('../src/holm_v2_land.js');
let passed=0;const check=async(n,f)=>{await f();passed++;console.log('PASS '+n)};
function loader(script){const calls=[];return {calls,load:async o=>{calls.push(o);const r=script[calls.length-1];if(r instanceof Error)throw r;return r}}}
const PKG={documents:{terrain:{id:'v2'}}},drop=()=>new TypeError('Failed to fetch');
(async()=>{
 await check('1 a good read returns the pinned v2-land export',async()=>{
  const l=loader([PKG]),got=await V2.loadArrival(l,{wait:async()=>{}});
  assert.strictEqual(got,PKG);assert.strictEqual(l.calls.length,1);
  assert.deepStrictEqual(l.calls[0],{baseUrl:'/.studio-workspaces/holm-arrival-package-v2land-v2/exports/',exportId:V2.ARRIVAL.exportId});
 });
 await check('2 a dropped read is retried, with a warning per failed try and growing waits',async()=>{
  const waits=[],warns=[],l=loader([drop(),drop(),PKG]);
  const got=await V2.loadArrival(l,{wait:async ms=>{waits.push(ms)},warn:(n,e)=>warns.push([n,e.message])});
  assert.strictEqual(got,PKG);assert.strictEqual(l.calls.length,3);assert.deepStrictEqual(warns,[[1,'Failed to fetch'],[2,'Failed to fetch']]);
  assert.deepStrictEqual(waits,[400,800]);
 });
 await check('3 an unreadable package throws after three tries and never asks for the pre-v2 package',async()=>{
  const l=loader([drop(),drop(),new Error('[HolmArrivalExportLoader] fetch failed manifest.json')]);let err=null;
  try{await V2.loadArrival(l,{wait:async()=>{}})}catch(e){err=e}
  assert(err&&/could not be read after 3 tries/.test(err.message)&&/fetch failed manifest\.json/.test(err.message)&&/pre-v2 package does not fit/.test(err.message),err&&err.message);
  assert.strictEqual(l.calls.length,3);assert(l.calls.every(c=>/holm-arrival-package-v2land-v2/.test(c.baseUrl)&&!/package-v9/.test(c.baseUrl)));
 });
 await check('4 an abort is not retried',async()=>{
  const a=new Error('Arrival export load aborted');a.name='AbortError';const l=loader([a,PKG]);let err=null;
  try{await V2.loadArrival(l,{wait:async()=>{}})}catch(e){err=e}
  assert.strictEqual(err,a);assert.strictEqual(l.calls.length,1);
 });
 await check('5 the island provider loads the v2 land through loadArrival, with no silent fallback',async()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','src','holm_arrival_qa.js'),'utf8');
  const prep=src.slice(src.indexOf('async function prepare()'),src.indexOf('nav=HolmArrivalDock.create'));
  assert(/if\(island&&typeof HolmV2Land!=='undefined'\)loaded=await HolmV2Land\.loadArrival\(HolmArrivalExportLoader/.test(prep),'the island reads the v2 land through loadArrival');
  // the old-school package's catch-and-keep-the-previous fallback lives only in the non-island branch
  const elseAt=prep.indexOf('else{var osPkg'),keep=prep.indexOf('the previous package is kept');
  assert(elseAt>0&&keep>elseAt,'the fallback is confined to the non-island draft');
 });
 console.log('[V2 LAND ARRIVAL] '+passed+'/5 PASS');
})().catch(e=>{console.error(e);process.exit(1)});
