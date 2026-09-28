/* Section E: scenery feel at the default camera - a town street / square, a field with trees, water.
 * 2004: a fresh account takes the guide's skip offer (local server only) to the mainland and runs to each spot;
 * ours: a fresh profile on Tutor's Holm walks to our nearest equivalents (island paths by the lodge / bakehouse, the oak
 * stand by the survival camp, the arrival dock and the sea). Each spot: 4 yaws at the 2004 default pitch (128) and one
 * higher view (pitch 256); ours at its own default camera AND through the 2004 lens (tile-matched, HUD hidden).
 *   bun tools/ref2004/capture_scenery.js [--side 2004|ours|both]
 * Frames: C:\Users\iQwaZ\ref2004_captures\scenery\{2004,ours}\ ; then python tools/ref2004/analyze.py scenery */
'use strict';
process.env.TELEMETRY='false';
const path=require('path'),fs=require('fs');
const C=require('./lib/common');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const SIDE=arg('side','both');
const YAWS=[0,512,1024,1536];
// world tiles on the local 2004 map (bot navigation targets only)
const SPOTS_2004=[['town_courtyard',3222,3219],['field_trees',3190,3236],['water_river',3239,3227],['town_square',3212,3428]];
// our equivalents on Tutor's Holm (island coordinates, tiles)

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
  try{await fight2004(R,S,page,log)}catch(e){C.log('[2004] fight error',String(e).slice(0,160))}
  if(process.argv.includes('--fight-only')){C.writeJSON(path.join(dir,'log_fight.json'),{log});await S.sdk.disconnect().catch(()=>{});await page.close();return}
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

// a fight in the open (hit splats, health bars, combat animations): the first weak monster found around a few
// mainland waypoints (chickens by the farm, goblins over the river, cows in the field)
async function fight2004(R,S,page,log){
  const FOES=/^(chicken|goblin|cow|rat|giant rat)$/i;
  for(const [x,z] of [[3235,3295],[3252,3236],[3257,3268],[3223,3218]]){
    let foe=S.sdk.getNearbyNpcs().filter(n=>FOES.test(n.name)&&!n.inCombat).sort((a,b)=>a.distance-b.distance)[0];
    if(!foe){await S.bot.walkTo(x,z,3);await S.bot.waitForIdle(20000).catch(()=>{});
      foe=S.sdk.getNearbyNpcs().filter(n=>FOES.test(n.name)&&!n.inCombat).sort((a,b)=>a.distance-b.distance)[0]}
    if(!foe)continue;
    C.log('[2004] fight',foe.name,'at',foe.x,foe.z);
    await R.setCam(page,{orbitPitch:128});await page.evaluate(()=>{window.gameClient.__cam=null});
    const sd=path.join(C.CAP,'tutorial','2004','combat_open');fs.mkdirSync(sd,{recursive:true});
    await R.startSampler(page,{crop:{size:[200,240],below:30},fullEvery:12});
    const r=await Promise.race([S.bot.attack(foe),C.sleep(15000).then(()=>({success:false,message:'attack call timed out'}))]);
    C.log('[2004] attack',r.success?'started':(r.message||r.reason));
    for(let i=0;i<36;i++){await C.sleep(500);const n=S.sdk.getNearbyNpcs().find(q=>q.index===foe.index);if(!n||n.hp===0)break}
    await C.sleep(1500);const l=await R.stopSampler(page);C.log('[2004] fight frames',l.length);const meta=[];
    l.forEach((r,i)=>{if(r.png){C.dataUrlToFile(r.png,path.join(sd,String(i).padStart(4,'0')+'.png'));r.file=String(i).padStart(4,'0')+'.png'}
      if(r.full){C.dataUrlToFile(r.full,path.join(sd,'full_'+String(i).padStart(4,'0')+'.png'));r.fullFile='full_'+String(i).padStart(4,'0')+'.png'}delete r.png;delete r.full;meta.push(r)});
    C.writeJSON(path.join(sd,'samples.json'),{samples:meta,foe:foe.name});log.push({fight:foe.name,frames:l.length});return true;
  }
  C.log('[2004] no weak monster found for the fight');return false;
}

async function capOurs(browser){
  const O=require('./lib/ours_client');
  const dir=C.out2004('scenery','ours'),log=[];
  const page=await O.open(browser,{profile:'ref2004-scn-'+Date.now().toString(36)});
  await page.mouse.move(1525,1000);
  const DEF=await page.evaluate(()=>({yaw:camCtl.yaw,pitch:camCtl.pitch,dist:camCtl.dist}));
  const L4=O.LENS2004;
  // candidate spots per kind: a few fixed island points plus spots a few tiles off named objects (lesson oaks, the
  // fishing ripples, the fire ring); the first spot whose 2004-lens views see the adventurer from >= 2 yaws wins
  const named=await page.evaluate(()=>{const out={};const add=(k,re)=>{const l=[];scene.traverse(m=>{if(l.length<4&&m.name&&re.test(m.name)){const b=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());l.push([b.x,b.z])}});out[k]=l};
    add('field',/^island-lesson-survival-oak/);add('water',/fishing|ripple|pond/i);add('town',/^island-building-(bakehouse|lodge|bank|mill)$/);return out});
  const kinds={town:[[39.5,59.5],[86.5,63.5],[47.5,71.5]],field:[],water:[[61.5,114.5]]};
  // a field means trees around the adventurer: the spots beside the lesson oaks come first
  for(const k in named)for(const [x,z] of named[k])for(const [dx,dz] of [[3,0],[0,3],[-3,0],[0,-3]])kinds[k][k==='field'?'push':'push']([Math.floor(x+dx)+.5,Math.floor(z+dz)+.5]);
  kinds.field.push([33.5,78.5]);
  const YAW8=[0,256,512,768,1024,1280,1536,1792];
  const lens=y=>({vfov:L4.vfov,elevDeg:22.5,dist:L4.boomTiles(128),lift:L4.lookLift,yaw:Math.PI-y*Math.PI/1024});
  for(const kind of ['town','field','water']){
    let best=null;
    for(const [x,z] of kinds[kind].slice(0,10)){
      const ok=await page.evaluate((x,z)=>{Player.runOn=true;return orderWalk(new THREE.Vector3(x,0,z))!==false},x,z);if(!ok)continue;
      await page.waitForFunction((x,z)=>Math.hypot(player.position.x-x,player.position.z-z)<.6&&!(Player.path&&Player.path.length)&&!Player.moveTo,{timeout:60000,polling:200},x,z).catch(()=>{});
      const at=await page.evaluate(()=>[player.position.x,player.position.z]);if(Math.hypot(at[0]-x,at[1]-z)>1)continue;
      await C.sleep(800);await O.hud(page,false);const vis={};
      for(const y of YAW8){await O.setCam(page,lens(y));vis[y]=await O.playerPixels(page)}
      await O.setCam(page,null);await O.hud(page,true);
      const good=YAW8.filter(y=>vis[y]>=12000).sort((a,b)=>vis[b]-vis[a]);
      C.log('[ours]',kind,'spot',x,z,'visible yaws',good.length);
      if(!best||good.length>best.good.length)best={x,z,good,vis};
      if(good.length>=3)break;
    }
    if(!best){C.log('[ours] no spot for',kind);continue}
    const name=kind+'_holm';
    await page.evaluate((x,z)=>{orderWalk(new THREE.Vector3(x,0,z))},best.x,best.z);
    await page.waitForFunction((x,z)=>Math.hypot(player.position.x-x,player.position.z-z)<.6&&!(Player.path&&Player.path.length)&&!Player.moveTo,{timeout:60000,polling:200},best.x,best.z).catch(()=>{});
    await C.sleep(1200);
    const yaws=(best.good.length?best.good:YAW8.slice().sort((a,b)=>best.vis[b]-best.vis[a])).slice(0,2);
    for(const y of yaws){await page.evaluate((d,y)=>{camCtl.pitch=d.pitch;camCtl.dist=d.dist;camCtl.yaw=y},DEF,Math.PI-y*Math.PI/1024);await C.sleep(1600);
      await page.screenshot({path:path.join(dir,name+'_default_y'+y+'.png')})}
    await O.hud(page,false);
    for(const y of yaws){await O.setCam(page,lens(y));await page.screenshot({path:path.join(dir,name+'_p128_y'+y+'.png')})}
    await O.setCam(page,{vfov:L4.vfov,elevDeg:256*360/2048,dist:L4.boomTiles(256),lift:L4.lookLift,yaw:Math.PI-yaws[0]*Math.PI/1024});
    await page.screenshot({path:path.join(dir,name+'_p256_y'+yaws[0]+'.png')});
    await O.setCam(page,null);await O.hud(page,true);
    log.push({kind,name,spot:[best.x,best.z],yaws,visibility:best.vis});
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
