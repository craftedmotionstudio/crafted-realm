/* Shared plumbing for the 2004 reference harness (tools/ref2004). Runs under bun (the rs-sdk SDK is TypeScript).
 * IP guard: every file that can hold 2004 imagery or data goes through out2004(), which refuses any path inside our
 * repo. Our-game-only images may go to the repo's scratchpad/ref2004 via outOurs(). */
'use strict';
const fs=require('fs'),path=require('path');
const REPO=path.resolve(__dirname,'..','..','..');
const CAP=(process.env.REF2004_CAPTURES||'C:/Users/iQwaZ/ref2004_captures').replace(/\\/g,'/');
const RS=(process.env.RS_SDK||'C:/Users/iQwaZ/rs-sdk').replace(/\\/g,'/');
const WEB2004=process.env.REF2004_WEB||'http://localhost:8888';          // localhost only - never a public/demo server
const GATEWAY=process.env.REF2004_GATEWAY||'ws://localhost:7780';
const OURS=process.env.REF_OURS_BASE||'http://127.0.0.1:8108';
const CHROME=process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
for(const u of [WEB2004,GATEWAY])if(!/^(https?|wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(u))throw new Error('ref2004: refusing non-local 2004 endpoint '+u);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function inRepo(p){const a=path.resolve(p).toLowerCase(),r=REPO.toLowerCase();return a===r||a.startsWith(r+path.sep)}
// a directory for 2004 captures (or pair sheets holding 2004 imagery): must be outside the repo
function out2004(...parts){const d=path.join(CAP,...parts);if(inRepo(d))throw new Error('ref2004: 2004 output inside the repo refused: '+d);fs.mkdirSync(d,{recursive:true});return d}
// our-game-only output inside the repo (scratchpad/ref2004/...)
function outOurs(...parts){const d=path.join(REPO,'scratchpad','ref2004',...parts);fs.mkdirSync(d,{recursive:true});return d}
function puppeteer(){
  const tries=[process.env.PUPPETEER_CORE,'C:/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Claude/node_modules/puppeteer-core',path.join(REPO,'node_modules','puppeteer-core'),'puppeteer-core'].filter(Boolean);
  for(const t of tries){try{return require(t)}catch(e){}}
  throw new Error('puppeteer-core not found (set PUPPETEER_CORE)');
}
async function launch(w,h){
  return puppeteer().launch({executablePath:CHROME,headless:'new',protocolTimeout:600000,
    args:['--window-size='+w+','+h,'--mute-audio','--no-first-run','--hide-scrollbars','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],
    defaultViewport:{width:w,height:h}});
}
function writeJSON(f,o){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(o,null,1))}
function dataUrlToFile(d,f){fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.from(d.split(',')[1],'base64'))}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}
function log(...a){console.log('['+new Date().toISOString().slice(11,19)+']',...a)}
module.exports={REPO,CAP,RS,WEB2004,GATEWAY,OURS,CHROME,sleep,inRepo,out2004,outOurs,puppeteer,launch,writeJSON,dataUrlToFile,stamp,log};
