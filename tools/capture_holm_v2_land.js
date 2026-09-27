/* Holm v2 land captures (W0b, 2026-09-26): the same camera positions on the island draft (?holmIsland=1, isolated
 * qaProfile) before and after each land phase, for the before/after sheets in scratchpad/holm_v2_land/. The camera is
 * framed with HolmArrivalQA.qaView (streams terrain, never moves the adventurer) at the game camera's pitch; UI chrome
 * is hidden so the sheet compares the world only. Screenshots and renderer numbers only; not a gameplay proof.
 * Run: SMOKE_BASE=http://127.0.0.1:8105 V2_TAG=before node tools/capture_holm_v2_land.js
 *   V2_TAG   output sub-folder under scratchpad/holm_v2_land/ (default 'capture')
 *   V2_ONLY  comma list of view names (default all)
 *   V2_QUERY extra URL query */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const TAG=process.env.V2_TAG||'capture',OUT=path.join(__dirname,'..','scratchpad','holm_v2_land',TAG);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8105')+'/?holmIsland=1&qaProfile=v2land-'+TAG+'-'+Date.now().toString(36)+(process.env.V2_QUERY||'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// game camera: pitch ~1.0-1.08, distance 26-33 (the default); a few wider establishing views
const VIEWS=[
 {name:'v01_arrival_climb',x:63,z:110,yaw:.55,pitch:.9,dist:30},
 {name:'v02_guide_knoll',x:66,z:100,yaw:.35,pitch:.95,dist:30},
 {name:'v03_survival_hollow',x:31,z:90,yaw:.7,pitch:.95,dist:28},
 {name:'v04_fishing_pond',x:28,z:97,yaw:.9,pitch:1.0,dist:18},
 {name:'v05_timber_bridge',x:46,z:87.5,yaw:.5,pitch:.9,dist:22},
 {name:'v06_mill_garden',x:57,z:63,yaw:.8,pitch:.9,dist:24},
 {name:'v07_bakehouse_lodge',x:42,z:60,yaw:.6,pitch:.95,dist:30},
 {name:'v08_quarry_mesa',x:36,z:36,yaw:.6,pitch:.9,dist:30},
 {name:'v09_creek_ravine',x:68,z:40,yaw:-.6,pitch:.85,dist:28},
 {name:'v10_keep_crag',x:87,z:38,yaw:.7,pitch:.9,dist:34},
 {name:'v11_bank_court',x:86,z:58,yaw:.6,pitch:1.0,dist:28},
 {name:'v12_carriage_track',x:80,z:81,yaw:.6,pitch:1.0,dist:26},
 {name:'v13_mage_hill',x:114,z:60,yaw:.6,pitch:.95,dist:30},
 {name:'v14_crown_climb',x:120,z:40,yaw:.2,pitch:.8,dist:32},
 {name:'v15_beacon_cove',x:106,z:19,yaw:3.3,pitch:.85,dist:30},
 {name:'v16_farm',x:112,z:97,yaw:.6,pitch:1.0,dist:28},
 {name:'v17_island_west',x:40,z:70,yaw:.9,pitch:.7,dist:60},
 {name:'v18_island_east',x:100,z:55,yaw:.4,pitch:.7,dist:60},
 // phase views (no Sept 13 counterpart): the Creakwheel Mill and its wheel, Hettie's Garden looking at the wheel
 {name:'v19_mill_wheel',x:61.5,z:62.5,yaw:-1.2,pitch:.75,dist:16},
 {name:'v20_garden_to_wheel',x:55,z:61.5,yaw:-1.9,pitch:.8,dist:16},
 {name:'v21_mill_weir_walk',x:61,z:60,yaw:.5,pitch:.9,dist:18},
 // phase 4: the Keeper's Stair down the crown cliff and the haven's pier at Lanternfoot Cove
 {name:'v22_keepers_stair',x:108.5,z:18,yaw:3.6,pitch:.8,dist:24},
 {name:'v23_cove_pier',x:100.5,z:9,yaw:4.2,pitch:.9,dist:26},
 // phase 5 close-ups: Haycombe Farm, the broken carriage, the cove's fishermen's corner, a meadow's ground decor
 {name:'v24_farm_close',x:109,z:95.5,yaw:.5,pitch:.95,dist:16},
 {name:'v25_carriage_close',x:81.5,z:82,yaw:.7,pitch:.9,dist:11},
 {name:'v26_cove_close',x:106.5,z:16.5,yaw:3.5,pitch:.95,dist:11},
 {name:'v27_meadow_decor',x:96,z:86,yaw:.3,pitch:.85,dist:13}];
const only=process.env.V2_ONLY?process.env.V2_ONLY.split(','):null;
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1280,760','--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'],defaultViewport:{width:1280,height:760}});
 const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
 page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300))});
 const missing=[];page.on('response',r=>{if(r.status()===404)missing.push(r.url().replace(/^https?:\/\/[^/]+/,''))});
 await page.goto(BASE,{waitUntil:'load',timeout:180000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:150000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:15000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:15000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:180000});await sleep(6000);
 await page.addStyleTag({content:'body *{visibility:hidden !important} #game-canvas{visibility:visible !important}'});
 const rows=[];
 for(const v of VIEWS){
  if(only&&!only.includes(v.name))continue;
  await page.evaluate(v=>{HolmArrivalQA.qaView(v.x,v.z,v.y0);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);
  await sleep(4000);
  const stats=await page.evaluate(()=>typeof CRPerfProbe!=='undefined'?CRPerfProbe.renderStats():null);
  await page.screenshot({path:path.join(OUT,v.name+'.png')});
  rows.push({view:v.name,calls:stats&&stats.calls,triangles:stats&&stats.triangles});
  console.log('captured',v.name,JSON.stringify(rows[rows.length-1]));
 }
 fs.writeFileSync(path.join(OUT,'capture.json'),JSON.stringify({tag:TAG,url:BASE,views:rows,pageErrors:errs,missing},null,1));
 console.log('[V2 CAPTURE] '+rows.length+' views, page errors '+errs.length+(errs.length?'\n'+errs.slice(0,8).join('\n'):'')+(missing.length?'\n404: '+missing.slice(0,10).join(', '):''));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
