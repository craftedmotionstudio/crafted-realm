/* Section E: scenery feel at the default camera - a town street / square, a field with trees, water.
 * 2004: a fresh account takes the guide's skip offer (local server only) to the mainland and runs to each spot;
 * ours: a fresh profile on Tutor's Holm walks to our nearest equivalents (island paths by the lodge / bakehouse, the oak
 * stand by the survival camp, the arrival dock and the sea). Each spot: 4 yaws at the 2004 default pitch (128) and one
 * higher view (pitch 256); ours at its own default camera AND through the 2004 lens (tile-matched, HUD hidden).
 *   bun tools/ref2004/capture_scenery.js [--side 2004|ours|both]
 * Frames: C:\Users\iQwaZ\ref2004_captures\scenery\{2004,ours}\ ; then python tools/ref2004/analyze.py scenery */
'use strict';
process.env.TELEMETRY='false';
const path=require('path');
const C=require('./lib/common');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const SIDE=arg('side','both');
const YAWS=[0,512,1024,1536];
// world tiles on the local 2004 map (bot navigation targets only)
const SPOTS_2004=[['town_lumbridge',3222,3219],['field_trees',3190,3236],['water_river',3239,3227],['town_varrock_square',3212,3428]];
// our equivalents on Tutor's Holm (island coordinates, tiles)
const SPOTS_OURS=[['town_holm_paths',39.5,59.5],['field_trees',33.5,78.5],['water_river',61.5,114.5],['town_bank_row',86.5,63.5]];

async function cap2004(browser){
  const R=require('./lib/ref2004_client'),T=require('./lib/tutorial2004');
  const dir=C.out2004('scenery','2004'),log=[];
  const user='crs'+Date.now().toString(36).slice(-7),pass='pw'+Math.random().toString(36).slice(2,10);
  const page=await R.open(browser,user,pass);const away=()=>page.mouse.move(795,555);await away();
  await R.click(page,R.DESIGN_BTN.accept);await away();await C.sleep(1500);
  const S=await R.sdk(user,pass);
  // the guide's skip offer (only offered on a non-live local world) takes a new player to the mainland
  await T.talk(S,/RuneScape Guide/i,{prefer:[/^yes/i]});await C.sleep(4000);
  C.log('[2004] after skip at',JSON.stringify(T.tile(S)));
  for(const [name,x,z] of SPOTS_2004){
    const r=await S.bot.walkTo(x,z,2);C.log('[2004] spot',name,r.success?'reached':'walk: '+(r.message||''),JSON.stringify(T.tile(S)));
    await S.bot.waitForIdle(20000).catch(()=>{});await C.sleep(1500);await away();
    for(const y of YAWS){await R.setCam(page,{orbitPitch:128,orbitYaw:y});await page.evaluate(()=>{window.gameClient.__cam=null});await C.sleep(1500);
      await R.grab(page,path.join(dir,name+'_p128_y'+y+'.png'))}
    await page.evaluate(()=>{window.gameClient.orbitCameraPitch=256});await C.sleep(1500);await R.grab(page,path.join(dir,name+'_p256_y1536.png'));
    log.push({name,tile:T.tile(S)});
  }
  C.writeJSON(path.join(dir,'log.json'),{log,at:new Date().toISOString()});
  await S.sdk.disconnect().catch(()=>{});await page.close();
}

async function capOurs(browser){
  const O=require('./lib/ours_client');
  const dir=C.out2004('scenery','ours'),log=[];
  const page=await O.open(browser,{profile:'ref2004-scn-'+Date.now().toString(36)});
  await page.mouse.move(1525,1000);
  const DEF=await page.evaluate(()=>({yaw:camCtl.yaw,pitch:camCtl.pitch,dist:camCtl.dist}));
  const L4=O.LENS2004;
  for(const [name,x,z] of SPOTS_OURS){
    const ok=await page.evaluate((x,z)=>{Player.runOn=true;return orderWalk(new THREE.Vector3(x,0,z))!==false},x,z);
    await page.waitForFunction((x,z)=>Math.hypot(player.position.x-x,player.position.z-z)<.6&&!(Player.path&&Player.path.length)&&!Player.moveTo,{timeout:90000,polling:200},x,z).catch(()=>{});
    const at=await page.evaluate(()=>[+player.position.x.toFixed(1),+player.position.z.toFixed(1)]);C.log('[ours] spot',name,ok?'':'(order refused)',JSON.stringify(at));
    await C.sleep(1500);
    // our default camera; our yaw 0 puts the camera on +z looking -z, the 2004 yaw 0 looks north (+z in 2004 terms):
    // yaws are matched as "looking along" the same compass direction of each map, i.e. ours = PI - 2004 yaw
    for(const y of YAWS){await page.evaluate((d,y)=>{camCtl.pitch=d.pitch;camCtl.dist=d.dist;camCtl.yaw=y},DEF,Math.PI-y*Math.PI/1024);await C.sleep(1600);
      await page.screenshot({path:path.join(dir,name+'_default_y'+y+'.png')})}
    await O.hud(page,false);
    for(const y of YAWS){await O.setCam(page,{vfov:L4.vfov,elevDeg:22.5,dist:L4.boomTiles(128),lift:L4.lookLift,yaw:Math.PI-y*Math.PI/1024});
      await page.screenshot({path:path.join(dir,name+'_p128_y'+y+'.png')})}
    await O.setCam(page,{vfov:L4.vfov,elevDeg:256*360/2048,dist:L4.boomTiles(256),lift:L4.lookLift,yaw:Math.PI-1536*Math.PI/1024});
    await page.screenshot({path:path.join(dir,name+'_p256_y1536.png')});
    await O.setCam(page,null);await O.hud(page,true);
    log.push({name,at});
  }
  C.writeJSON(path.join(dir,'log.json'),{log,at:new Date().toISOString()});
  await page.close();
}

(async()=>{
  const browser=await C.launch(SIDE==='ours'?1530:800,SIDE==='ours'?1006:560);
  try{
    if(SIDE!=='ours')await cap2004(browser).catch(e=>C.log('[2004] error',e&&e.stack||e));
    if(SIDE!=='2004')await capOurs(browser).catch(e=>C.log('[ours] error',e&&e.stack||e));
  }finally{await browser.close().catch(()=>{})}
  C.log('scenery: captures in',path.join(C.CAP,'scenery'),'- next: python tools/ref2004/analyze.py scenery');
  process.exit(0);
})();
