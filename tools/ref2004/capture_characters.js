/* Section A+B: characters. The default MAN and default WOMAN in the character designer (front and turned views), in the
 * world at the default camera standing idle, a close-up turnaround (8 angles, with a background plate each so the
 * silhouette can be measured), and walk / run frame strips from the side (locked camera, plate-subtracted) and at the
 * game camera (following, 3/4 from behind).
 *   bun tools/ref2004/capture_characters.js [--side 2004|ours|both] [--gender m|f|both]
 * 2004 frames:  C:\Users\iQwaZ\ref2004_captures\characters\2004\<g>\   (never in the repo)
 * ours frames:  C:\Users\iQwaZ\ref2004_captures\characters\ours\<g>\   (+ ours-only sheets in scratchpad/ref2004)
 * Then: python tools/ref2004/analyze.py characters   (sheets + metrics.json) */
'use strict';
process.env.TELEMETRY='false';
const fs=require('fs'),path=require('path');
const C=require('./lib/common');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const SIDE=arg('side','both'),GENDERS=arg('gender','both')==='both'?['m','f']:[arg('gender','m')];
const ROOT=C.out2004('characters');
const REL=[0,256,512,768,1024,1280,1536,1792];            // camera angle around the character, 2048ths (0 = front)
const WORLD_REL=[0,256,512,1024];
const CLOSE_2004={pitch:128,dist:430};                      // lowest 2004 pitch (22.5 deg); character ~230 px of 334
const LANE_TILES=7;

async function saveSamples(dir,name,list,extra){
  fs.mkdirSync(path.join(dir,name),{recursive:true});
  const meta=[];list.forEach((r,i)=>{if(r.png){C.dataUrlToFile(r.png,path.join(dir,name,String(i).padStart(4,'0')+'.png'));r.file=String(i).padStart(4,'0')+'.png'}delete r.png;meta.push(r)});
  C.writeJSON(path.join(dir,name,'samples.json'),Object.assign({samples:meta},extra||{}));
}

// ------------------------------------------------------------------------------------------------ 2004
async function cap2004(browser,g){
  const R=require('./lib/ref2004_client'),T=require('./lib/tutorial2004');
  const dir=C.out2004('characters','2004',g),meta={game:'2004',gender:g,at:new Date().toISOString(),notes:[]};
  const user='cr'+g+Date.now().toString(36).slice(-7),pass='pw'+Math.random().toString(36).slice(2,10);
  C.log('[2004]',g,'new account');
  const page=await R.open(browser,user,pass);
  const away=()=>page.mouse.move(795,555);await away();
  if(g==='f'){await R.click(page,R.DESIGN_BTN.female);await away();await C.sleep(1500)}
  await C.sleep(1200);
  // designer: the model sways +-45 deg (sin(loopCycle/40)*256 of 2048); sample every redraw for one full sway
  await R.grab(page,path.join(dir,'designer_full.png'));
  await R.startSampler(page,{crop:{fixed:[190,50],size:[160,240]}});await C.sleep(5600);
  const ds=await R.stopSampler(page);
  const ang=r=>Math.sin(r.lc/40)*256*360/2048;
  const pick=a=>ds.reduce((b,r)=>Math.abs(ang(r)-a)<Math.abs(ang(b)-a)?r:b,ds[0]);
  meta.designer={};
  for(const [a,n] of [[0,'front'],[45,'yaw+45'],[-45,'yaw-45'],[22.5,'yaw+22'],[-22.5,'yaw-22']]){const r=pick(a);C.dataUrlToFile(r.png,path.join(dir,'designer_'+n+'.png'));meta.designer[n]=+ang(r).toFixed(1)}
  // accept, then the SDK takes over
  for(let i=0;i<3;i++){await R.click(page,R.DESIGN_BTN.accept);await away();await C.sleep(1500);
    if(!(await page.evaluate(()=>{const c=window.gameClient;return c.mainModalId!==-1})))break}
  const S=await R.sdk(user,pass);await C.sleep(1500);
  let inf=await R.info(page);meta.height=inf.height;meta.anims={ready:inf.readyanim,walk:inf.walkanim,run:inf.runanim};meta.playerYaw=inf.yaw;
  C.log('[2004]',g,'in world at',inf.tileX,inf.tileZ,'height',inf.height,'yaw',inf.yaw);
  // the 2004 default camera (pitch 128 - rs-sdk's bot client forces 383 at login, we put the authentic default back)
  for(const rel of WORLD_REL){await R.setCam(page,{orbitPitch:128,orbitYaw:(inf.yaw+rel)&2047});await C.sleep(1400);
    await R.grabWithPlate(page,path.join(dir,'world_rel'+rel+'.png'),path.join(dir,'world_rel'+rel+'_plate.png'));}
  meta.world=await R.info(page);
  await R.setCam(page,null);
  // out of the first building to open ground, then a straight lane of LANE_TILES
  await T.leaveGuideHouse(S);await C.sleep(1000);
  const lane=await findLane2004(S,LANE_TILES);
  if(!lane){meta.notes.push('no straight lane found');C.writeJSON(path.join(dir,'meta.json'),meta);await S.sdk.disconnect();await page.close();return meta}
  meta.lane=lane;C.log('[2004]',g,'lane',JSON.stringify(lane));
  const toStart=async()=>{await walkLeg2004(S,lane.a,15000);await C.sleep(600)};
  // close-up turnaround (lowest pitch, look point at mid-height), on the lane spot where all 8 views see the character
  {const spots=[1,3,5,0,7].map(k=>[lane.a[0]+(lane.axis==='x'?lane.dir*k:0),lane.a[1]+(lane.axis==='z'?lane.dir*k:0)]);
   const camAt=(ci,rel)=>({pitch:CLOSE_2004.pitch,yaw:(ci.yaw+rel)&2047,dist:CLOSE_2004.dist,target:{x:ci.x,z:ci.z,lift:(ci.height/2)|0}});
   let best=null;
   for(const m of spots){await walkLeg2004(S,m,15000);await C.sleep(1200);const ci=await R.info(page);const vis={};
     for(const rel of REL){await R.setCam(page,camAt(ci,rel));await C.sleep(250);vis[rel]=await R.playerPixels(page)}
     const vals=Object.values(vis),score=Math.min(...vals)/Math.max(...vals);if(!best||score>best.score)best={m,vis,score};if(score>0.55)break}
   await R.setCam(page,null);await walkLeg2004(S,best.m,15000);await C.sleep(1500);
   const ci=await R.info(page);meta.closeSpot=best.m;meta.closeVisibility=best.vis;
   for(const rel of REL){await R.setCam(page,camAt(ci,rel));await C.sleep(500);
     await R.grabWithPlate(page,path.join(dir,'close_rel'+rel+'.png'),path.join(dir,'close_rel'+rel+'_plate.png'));}
   meta.close=Object.assign({},CLOSE_2004,{lift:(ci.height/2)|0,playerYaw:ci.yaw,info:await R.info(page)});await R.setCam(page,null)}
  // side strips: camera locked on the lane middle, looking across it
  const mid=[(lane.a[0]+lane.b[0])/2,(lane.a[1]+lane.b[1])/2];
  const base=await R.info(page);const sceneX=t=>((t-(base.tileX-(base.x>>7)))<<7)+64,sceneZ=t=>((t-(base.tileZ-(base.z>>7)))<<7)+64;
  const perpYaw=lane.axis==='x'?0:512;
  const sideCam={pitch:128,yaw:perpYaw,dist:1150,target:{x:sceneX(mid[0]),z:sceneZ(mid[1]),lift:(base.height/2)|0}};
  // look across the lane from whichever side sees the walker at both ends (trees and walls hide him from the other)
  const cand=[perpYaw,(perpYaw+1024)&2047].map(y=>({yaw:y,vis:[]}));
  await toStart();for(const c of cand){await R.setCam(page,Object.assign({},sideCam,{yaw:c.yaw}));await C.sleep(300);c.vis.push(await R.playerPixels(page))}
  await walkLeg2004(S,lane.b,15000);
  for(const c of cand){await R.setCam(page,Object.assign({},sideCam,{yaw:c.yaw}));await C.sleep(300);c.vis.push(await R.playerPixels(page))}
  const best=cand.reduce((a,b)=>Math.min(...b.vis)>Math.min(...a.vis)?b:a);sideCam.yaw=best.yaw;meta.sideVisibility=cand;await R.setCam(page,null);
  for(const mode of ['walk','run']){
    await toStart();await R.setCam(page,sideCam);await C.sleep(600);
    await R.hidePlayer(page,true);await R.grab(page,path.join(dir,mode+'_side_plate.png'));await R.hidePlayer(page,false);
    await R.startSampler(page,{crop:{size:[150,180],below:24}});
    await S.sdk.sendWalk(lane.b[0],lane.b[1],mode==='run');
    await waitArrive2004(S,lane.b,20000);await C.sleep(900);
    await saveSamples(dir,mode+'_side',await R.stopSampler(page),{cam:sideCam,lane,mode,plate:mode+'_side_plate.png'});
    await R.setCam(page,null);
  }
  // game-camera strips: the normal follow camera at pitch 128, looking along the lane from behind-left (3/4)
  for(const mode of ['walk','run']){
    await toStart();const along=lane.axis==='x'?(lane.dir>0?1536:512):(lane.dir>0?0:1024);   // camera behind the walker
    await R.setCam(page,{orbitPitch:128,orbitYaw:(along+256)&2047});await C.sleep(1500);await page.evaluate(()=>{window.gameClient.__cam=null});
    await R.startSampler(page,{crop:{size:[150,180],below:24}});
    await S.sdk.sendWalk(lane.b[0],lane.b[1],mode==='run');
    await waitArrive2004(S,lane.b,20000);await C.sleep(900);
    await saveSamples(dir,mode+'_game',await R.stopSampler(page),{mode,orbitPitch:128,orbitYaw:(along+256)&2047});
  }
  await R.grab(page,path.join(dir,'lane_overview.png'));
  C.writeJSON(path.join(dir,'meta.json'),meta);
  await S.sdk.disconnect().catch(()=>{});await page.close();
  C.log('[2004]',g,'done');return meta;
}
async function waitArrive2004(S,b,ms){const t0=Date.now();while(Date.now()-t0<ms){const p=S.sdk.getState().player;if(p&&p.worldX===b[0]&&p.worldZ===b[1])return true;await C.sleep(100)}return false}
// a straight open row of n tiles near the player, proven by walking it both ways: every observed tile on the row
async function walkLeg2004(S,to,ms){const pts=[];const t0=Date.now();await S.sdk.sendWalk(to[0],to[1],false);
  while(Date.now()-t0<(ms||12000)){const p=S.sdk.getState().player;if(p){const q=[p.worldX,p.worldZ];if(!pts.length||pts[pts.length-1][0]!==q[0]||pts[pts.length-1][1]!==q[1])pts.push(q);if(q[0]===to[0]&&q[1]===to[1])break}await C.sleep(80)}
  await C.sleep(700);const p=S.sdk.getState().player;return {pts,end:[p.worldX,p.worldZ]}}
async function findLane2004(S,n){
  const here=S.sdk.getState().player,h=[here.worldX,here.worldZ];
  const offs=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[3,3],[-3,3],[3,-3],[-3,-3],[4,0],[-4,0],[0,4],[0,-4]];
  for(const [ox,oz] of offs)for(const [dx,dz,axis,dir] of [[1,0,'x',1],[0,1,'z',1],[-1,0,'x',-1],[0,-1,'z',-1]]){
    const a=[h[0]+ox,h[1]+oz],b=[a[0]+dx*n,a[1]+dz*n];
    const r0=S.sdk.findPath(b[0],b[1]);if(!r0.success||!r0.reachedDestination)continue;
    const g=await walkLeg2004(S,a,15000);if(g.end[0]!==a[0]||g.end[1]!==a[1])continue;
    const on=q=>axis==='x'?q[1]===a[1]:q[0]===a[0];
    const f=await walkLeg2004(S,b,12000);if(f.end[0]!==b[0]||f.end[1]!==b[1]||!f.pts.every(on))continue;
    const r=await walkLeg2004(S,a,12000);if(r.end[0]!==a[0]||r.end[1]!==a[1]||!r.pts.every(on))continue;
    return {a,b,axis,dir,n};
  }
  return null;
}

// ------------------------------------------------------------------------------------------------ ours
async function capOurs(browser,g){
  const O=require('./lib/ours_client');
  const dir=C.out2004('characters','ours',g),meta={game:'ours',gender:g,base:C.OURS,at:new Date().toISOString(),notes:[]};
  const m2004=readMeta2004(g);
  const H04=(m2004&&m2004.height||193)/128,D04=CLOSE_2004.dist/128;
  C.log('[ours]',g,'boot',C.OURS);
  const page=await O.open(browser,{});
  await page.mouse.move(1525,1000);
  // designer (the Blender-kit creator on the island; body A = man, B = woman)
  const opened=await page.evaluate(g=>{try{if(typeof CharCreator==='undefined')return 'no CharCreator';CharCreator.open();
    CharCreator.tick=function(){if(typeof HolmKitCreator!=='undefined'&&HolmKitCreator.active())HolmKitCreator.tick(0)};   // hold the turntable still
    if(g==='f'){const b=document.querySelector('#kit-creator .kc-body button[title="Body type B"]');if(b)b.click();else return 'no body B button'}
    return 'ok'}catch(e){return String(e)}},g);
  meta.designerOpen=opened;await C.sleep(3500);
  const kcRect=await page.evaluate(()=>{const v=document.querySelector('#kit-creator .kc-view');if(!v)return null;const r=v.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(Math.round)});
  meta.designer={rect:kcRect,views:{}};
  const baseYaw=await page.evaluate(()=>camCtl.yaw);
  for(const [deg,n] of [[0,'front'],[45,'yaw+45'],[-45,'yaw-45'],[90,'side'],[180,'back'],[22.5,'yaw+22'],[-22.5,'yaw-22']]){
    await page.evaluate(a=>{player.rotation.set(0,camCtl.yaw+a,0)},deg*Math.PI/180);await O.waitFrames(page,4);
    if(n==='front')await O.grab(page,path.join(dir,'designer_full.png'));
    if(kcRect)await page.screenshot({path:path.join(dir,'designer_'+n+'.png'),clip:{x:kcRect[0],y:kcRect[1],width:kcRect[2],height:kcRect[3]}});
    meta.designer.views[n]=deg;
  }
  await page.evaluate(()=>{try{HolmKitCreator.close(true)}catch(e){}});await C.sleep(1500);
  let inf=await O.info(page);meta.height=inf.height;meta.defaultCam=inf.cam;meta.runDefault=inf.run;meta.speeds={walk:2.4,run:4.2,note:'Player.moveSpeed(): tiles/s'};
  meta.clips=inf.clips;
  C.log('[ours]',g,'in world at',inf.pos.map(v=>v.toFixed(1)).join(','),'height',inf.height);
  const rot=inf.rotY;
  // our own default camera, same relative angles
  for(const rel of WORLD_REL){await page.evaluate(y=>{camCtl.yaw=y},rot+rel*Math.PI/1024);await C.sleep(1600);
    await O.grab(page,path.join(dir,'world_rel'+rel+'.png'));await O.hidePlayer(page,true);await O.grab(page,path.join(dir,'world_rel'+rel+'_plate.png'));await O.hidePlayer(page,false)}
  await page.evaluate(y=>{camCtl.yaw=y},baseYaw);
  // the 2004 lens, tile-matched (same boom in tiles as the 2004 default pitch 128), HUD hidden
  await O.hud(page,false);
  const L4=O.LENS2004;
  for(const rel of WORLD_REL){await O.setCam(page,{vfov:L4.vfov,elevDeg:22.5,dist:L4.boomTiles(128),lift:L4.lookLift,yaw:rot+rel*Math.PI/1024});
    await O.grab(page,path.join(dir,'matched_rel'+rel+'.png'));await O.hidePlayer(page,true);await O.grab(page,path.join(dir,'matched_rel'+rel+'_plate.png'));await O.hidePlayer(page,false)}
  await O.setCam(page,null);await O.hud(page,true);
  // a straight lane of open ground near the spawn, proven by walking it both ways (every observed point on the row)
  const walkTo=async(p,run)=>{const ok=await page.evaluate((p,run)=>{Player.runOn=run;return orderWalk(new THREE.Vector3(p[0],0,p[1]))!==false},p,run);
    const pts=[];const t0=Date.now();
    while(Date.now()-t0<30000){const q=await page.evaluate(()=>[player.position.x,player.position.z,!!(Player.moveTo||(Player.path&&Player.path.length))]);pts.push(q);
      if(Math.hypot(q[0]-p[0],q[1]-p[1])<.05&&!q[2])break;if(!ok&&Date.now()-t0>1500)break;await C.sleep(90)}
    const e=pts[pts.length-1];return {ok,pts,end:[e[0],e[1]],arrived:Math.hypot(e[0]-p[0],e[1]-p[1])<.05}};
  const cands=await page.evaluate(n=>{const P=player.position,x0=Math.floor(P.x)+.5,z0=Math.floor(P.z)+.5,out=[];
    for(let r=1;r<12;r++)for(let a=0;a<8;a++){const ox=Math.round(Math.cos(a*Math.PI/4)*r),oz=Math.round(Math.sin(a*Math.PI/4)*r);
      for(const [dx,dz,axis,dir] of [[1,0,'x',1],[-1,0,'x',-1],[0,1,'z',1],[0,-1,'z',-1]]){const ax=x0+ox,az=z0+oz,bx=ax+dx*n,bz=az+dz*n;
        const r1=computePath(P.x,P.z,ax,az);if(!r1.reached)continue;const r2=computePath(ax,az,bx,bz);if(!r2.reached)continue;
        const straight=r2.pts.every(p=>axis==='x'?Math.abs(p[1]-az)<.01:Math.abs(p[0]-ax)<.01);
        const flat=typeof groundY==='function'?Math.abs((groundY(ax,az)||0)-(groundY(bx,bz)||0))<.6:true;
        if(straight&&flat&&r2.pts.length>=n)out.push({a:[ax,az],b:[bx,bz],axis,dir,n});if(out.length>=12)return out}}
    return out},LANE_TILES);
  let lane=null;
  for(const c of cands){const on=q=>c.axis==='x'?Math.abs(q[1]-c.a[1])<.02:Math.abs(q[0]-c.a[0])<.02;
    const g=await walkTo(c.a,false);if(!g.arrived)continue;const f=await walkTo(c.b,false);if(!f.arrived||!f.pts.every(on))continue;
    const r=await walkTo(c.a,false);if(!r.arrived||!r.pts.every(on))continue;lane=c;break}
  if(!lane){meta.notes.push('no straight lane found');C.writeJSON(path.join(dir,'meta.json'),meta);await page.close();return meta}
  meta.lane=lane;C.log('[ours]',g,'lane',JSON.stringify(lane));
  const toStart=async()=>{await walkTo(lane.a,false);await C.sleep(1200)};
  // close-up turnaround, height-matched to the 2004 close-up (same share of the view height), on the lane spot where
  // all 8 views see the character
  {const spots=[1,3,5,0,7].map(k=>[lane.a[0]+(lane.axis==='x'?lane.dir*k:0),lane.a[1]+(lane.axis==='z'?lane.dir*k:0)]);
   const camAt=(ci,rel)=>({vfov:L4.vfov,elevDeg:22.5,dist:D04*ci.height/H04,lift:ci.height/2,yaw:ci.rotY+rel*Math.PI/1024});
   let best=null;await O.hud(page,false);
   for(const m of spots){await walkTo(m,false);await C.sleep(1200);const ci=await O.info(page);const vis={};
     for(const rel of REL){await O.setCam(page,camAt(ci,rel));vis[rel]=await O.playerPixels(page)}
     const vals=Object.values(vis),score=Math.min(...vals)/Math.max(...vals);if(!best||score>best.score)best={m,vis,score};if(score>0.55)break}
   await O.setCam(page,null);await walkTo(best.m,false);await C.sleep(1500);
   const ci=await O.info(page);meta.closeSpot=best.m;meta.closeVisibility=best.vis;
   meta.close={vfov:L4.vfov,elevDeg:22.5,dist:D04*ci.height/H04,lift:ci.height/2,rotY:ci.rotY,heightMatchedTo2004:{H04,D04}};
   for(const rel of REL){await O.setCam(page,camAt(ci,rel));
     await O.grab(page,path.join(dir,'close_rel'+rel+'.png'));await O.hidePlayer(page,true);await O.grab(page,path.join(dir,'close_rel'+rel+'_plate.png'));await O.hidePlayer(page,false)}
   await O.setCam(page,null);await O.hud(page,true)}
  const mid=[(lane.a[0]+lane.b[0])/2,(lane.a[1]+lane.b[1])/2];
  // side camera: height-matched to the 2004 side strip (1150 units boom, character mid-height look point)
  const sideDist=(1150/128)*inf.height/H04;
  // our yaw convention: camera offset (sin yaw, cos yaw); lane along x -> camera on -z side (like 2004 yaw 0 from the south)
  let sideYaw=lane.axis==='x'?Math.PI:Math.PI/2;
  {const gy0=await page.evaluate(()=>player.position.y);const cand=[sideYaw,sideYaw+Math.PI].map(y=>({yaw:y,vis:[]}));
   const cam=y=>({vfov:L4.vfov,elevDeg:22.5,dist:sideDist,lift:inf.height/2,yaw:y,target:{x:mid[0],y:gy0,z:mid[1]}});
   await toStart();for(const c of cand){await O.setCam(page,cam(c.yaw));c.vis.push(await O.playerPixels(page))}
   await walkTo(lane.b,false);await C.sleep(600);for(const c of cand){await O.setCam(page,cam(c.yaw));c.vis.push(await O.playerPixels(page))}
   const best=cand.reduce((a,b)=>Math.min(...b.vis)>Math.min(...a.vis)?b:a);sideYaw=best.yaw;meta.sideVisibility=cand;await O.setCam(page,null)}
  for(const mode of ['walk','run']){
    await toStart();const gy=await page.evaluate(()=>player.position.y);
    const cam={vfov:L4.vfov,elevDeg:22.5,dist:sideDist,lift:inf.height/2,yaw:sideYaw,target:{x:mid[0],y:gy,z:mid[1]}};
    await O.hud(page,false);await O.setCam(page,cam);await O.hidePlayer(page,true);await O.grab(page,path.join(dir,mode+'_side_plate.png'));await O.hidePlayer(page,false);
    await O.startSampler(page,{crop:{size:[450,540],below:72}});
    await walkTo(lane.b,mode==='run');await C.sleep(900);
    await saveSamples(dir,mode+'_side',await O.stopSampler(page),{cam,lane,mode,plate:mode+'_side_plate.png',speed:mode==='run'?4.2:2.4});
    await O.setCam(page,null);await O.hud(page,true);
  }
  // our game camera (default pitch / distance), behind-left 3/4 like the 2004 game-camera strips
  for(const mode of ['walk','run']){
    await toStart();
    const along=lane.axis==='x'?(lane.dir>0?-Math.PI/2:Math.PI/2):(lane.dir>0?Math.PI:0);   // camera behind the walker
    await page.evaluate(y=>{camCtl.yaw=y},along-Math.PI/4);await C.sleep(1500);
    await O.startSampler(page,{crop:{size:[450,540],below:72}});
    await walkTo(lane.b,mode==='run');await C.sleep(900);
    await saveSamples(dir,mode+'_game',await O.stopSampler(page),{mode,camYaw:along-Math.PI/4,speed:mode==='run'?4.2:2.4});
  }
  C.writeJSON(path.join(dir,'meta.json'),meta);await page.close();
  C.log('[ours]',g,'done');return meta;
}
function readMeta2004(g){try{return JSON.parse(fs.readFileSync(path.join(ROOT,'2004',g,'meta.json'),'utf8'))}catch(e){return null}}

(async()=>{
  const browser=await C.launch(SIDE==='ours'?1530:800,SIDE==='ours'?1006:560);
  try{
    for(const g of GENDERS){
      if(SIDE!=='ours')await cap2004(browser,g).catch(e=>C.log('[2004] error',g,e&&e.stack||e));
      if(SIDE!=='2004')await capOurs(browser,g).catch(e=>C.log('[ours] error',g,e&&e.stack||e));
    }
  }finally{await browser.close().catch(()=>{})}
  C.log('characters: captures in',ROOT,'- next: python tools/ref2004/analyze.py characters');
  process.exit(0);
})();
