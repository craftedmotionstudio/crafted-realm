/* Tutor's Holm arrival v4 gate (finish goal M3R, on the Sept 13 overhaul base): real pointer input on the
 * ?arrivalQA=1 provider with package v4 (guide house v2, branching oak, Lantern Keeper statue, tile-true ground).
 * The camera is placed by script to frame each target; every player action is a page.mouse click on a pixel
 * whose game pick() hits the intended target. Walk the landing path, far-click the arrival door (walks, then
 * opens once), enter (roof cuts away), climb to the upper floor, come back out, test the statue blocks its
 * tiles, then reload and require the position and door state back. Zero page errors.
 * Run: SMOKE_BASE=http://localhost:8088 node tools/qa_holm_arrival_v4.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_arrival_v4');fs.mkdirSync(OUT,{recursive:true});
const PROFILE='arrival-v4-qa-'+Date.now().toString(36);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?arrivalQA=1&qaProfile='+PROFILE;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const checks=[],t0=Date.now();
function ok(label,cond,detail){checks.push({label,ok:!!cond,detail});console.log((cond?'  ok  ':'  FAIL ')+label+(detail?'  '+JSON.stringify(detail):''));return !!cond;}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name+'.png')}).catch(()=>{});}
async function enter(page){
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex';},{timeout:60000});
  const had=await page.evaluate(()=>{try{return SaveGame.exists();}catch(e){return false;}});
  if(had)await page.evaluate(()=>document.getElementById('btn-continue').click());
  else{await page.evaluate(()=>document.getElementById('btn-new').click());
    await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
    await page.evaluate(()=>document.getElementById('btn-begin').click());}
  await page.waitForFunction(()=>document.getElementById('login-play').style.display!=='none',{timeout:8000});
  await page.evaluate(()=>{try{CharCfg._new=false;}catch(e){}document.getElementById('play-btn').click();});
  await page.waitForFunction(()=>{if(typeof running==='undefined'||!running)return false;const b=document.getElementById('enter-buffer');return !b||b.style.display==='none';},{timeout:60000});await sleep(2500);
  return had;
}
const st=page=>page.evaluate(()=>{const r=HolmArrivalQA.saveRecord();return {p:[+player.position.x.toFixed(2),+player.position.y.toFixed(2),+player.position.z.toFixed(2)],
  provider:CRWorldMode.providerId,doors:r&&r.doors,errors:(window.SMOKE_ERRORS||[]).length}});
const idle=(page,t)=>page.waitForFunction(()=>!Player.moveTo&&!(Player.path&&Player.path.length)&&!(typeof HolmArrivalPlayer!=='undefined'&&HolmArrivalPlayer.moving&&HolmArrivalPlayer.moving()),{timeout:t||40000}).catch(()=>{});
async function settle(page,ms){let last=null;for(let i=0;i<(ms||30000)/400;i++){await sleep(400);const p=await page.evaluate(()=>[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(3)).join());if(p===last)return;last=p;}}
async function aim(page,pt,want,view){
  return page.evaluate(async(pt,want,view)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const dx=player.position.x-pt[0],dz=player.position.z-pt[2],d=Math.hypot(dx,dz);
    camCtl.yaw=(view&&view.yaw!==undefined)?view.yaw:(d>.5?Math.atan2(dx,dz):0);camCtl.pitch=(view&&view.pitch)||(d>6?1.3:1.0);camCtl.dist=(view&&view.dist)||Math.max(16,d*1.7);
    await sleep(1600);
    const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera);
    const cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
    const test=h=>{if(!h)return false;const u=h.obj.userData||{};
      if(want.kind)return u.kind===want.kind&&(!want.surface||u.arrivalSurface===want.surface)&&(!want.near||Math.hypot(h.point.x-pt[0],h.point.z-pt[2])<want.near);
      return (isGroundName(h.obj.name)||u.arrivalSurface==='exterior')&&Math.floor(h.point.x)===want.tile[0]&&Math.floor(h.point.z)===want.tile[1];};
    for(let r=0;r<=160;r+=5)for(let a=0;a<360;a+=(r?20:360)){
      const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
      if(x<0||y<0||x>=rect.width||y>=rect.height)continue;
      const el=document.elementFromPoint(x,y);if(el!==renderer.domElement)continue;
      if(test(pick({clientX:x,clientY:y})))return [x,y];
    }
    const ch=pick({clientX:Math.round(cx),clientY:Math.round(cy)});
    return {miss:true,centre:[Math.round(cx),Math.round(cy)],hit:ch&&{n:ch.obj.name,k:ch.obj.userData.kind,s:ch.obj.userData.arrivalSurface,pt:ch.point.toArray().map(v=>+v.toFixed(2))}};
  },pt,want,view);
}
async function press(page,xy){await page.mouse.move(xy[0],xy[1]);await page.mouse.down();await page.mouse.up();}
async function click(page,pt,want,view){const xy=await aim(page,pt,want,view);if(Array.isArray(xy)){await press(page,xy);return xy;}console.log('    aim miss',JSON.stringify(xy));return null;}
async function trace(page,ms){
  await page.evaluate(()=>{window.__qaTrace=[];window.__qaIv=setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120);});
  await settle(page,ms);return page.evaluate(()=>{clearInterval(window.__qaIv);return window.__qaTrace;});
}
function cardinal(tr){let diag=0;for(let i=1;i<tr.length;i++){const dx=Math.abs(tr[i][0]-tr[i-1][0]),dz=Math.abs(tr[i][2]-tr[i-1][2]);if(Math.min(dx,dz)>.12)diag++;}return diag;}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e&&e.stack||e).slice(0,500)));
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:120000});await enter(page);
    let s=await st(page);
    ok('boots the arrival draft provider on package v4',s.provider==='tutors-holm-arrival-qa',s);
    const assets=await page.evaluate(()=>{const h=scene.getObjectByName('world-object-holm_guide_hall');let tris=0;h.traverse(o=>{if(o.isMesh&&o.geometry.index)tris+=o.geometry.index.count/3});
      const st=scene.getObjectByName('world-object-Landscape_statue_62.3_108.4'),oak=scene.getObjectByName('world-object-Landscape_oak_54_109');
      return {houseTris:Math.round(tris),statue:!!st&&!!st.getObjectByName('LanternKeeperStatue'),oak:!!oak&&!!oak.getObjectByName('ArrivalOak'),grid:typeof _groundGrid!=='undefined'&&_groundGrid?_groundGrid.visible:null}});
    ok('v4 art is loaded: guide house v2 (>20k tris), Lantern Keeper statue, branching oak; no drawn grid',assets.houseTris>20000&&assets.statue&&assets.oak&&assets.grid!==true,assets);
    await shot(page,'01_landing');
    // 1. the landing path, in hops like a player
    for(const [x,z] of [[61,114],[64,114],[66,110]]){
      const y=await page.evaluate((x,z)=>groundY(x+.5,z+.5),x,z);
      await click(page,[x+.5,y,z+.5],{tile:[x,z]});const tr=await trace(page,20000);
      s=await st(page);ok('walks the landing path to '+x+','+z+' on cardinal steps',Math.hypot(s.p[0]-x-.5,s.p[2]-z-.5)<1.6&&cardinal(tr)===0,{at:s.p,diag:cardinal(tr)});
    }
    await shot(page,'02_path_statue');
    // 2. far door click: walks to the stance beside the door, then opens it once
    await page.evaluate(()=>{camCtl.dist=26});
    await click(page,[66,4.2,104],{kind:'arrival_door'},{yaw:0,pitch:1.0,dist:20});
    await settle(page,25000);await sleep(1800);s=await st(page);
    ok('far click on the arrival door walks to it and opens it',s.doors&&s.doors.arrival===true&&Math.hypot(s.p[0]-66,s.p[2]-105)<2.4,s);
    await shot(page,'03_door_open');
    // 3. inside: ground-floor surface; the roof cuts away
    await click(page,[66,3.02,101],{kind:'arrival_surface',surface:'ground',near:2},{yaw:0,pitch:1.15,dist:18});
    await settle(page,25000);s=await st(page);
    const roof=await page.evaluate(()=>{const h=scene.getObjectByName('world-object-holm_guide_hall'),r=h.getObjectByName('Roof');return r?r.visible:null});
    ok('walks inside the guide house and the roof cuts away',s.p[2]<104&&s.p[2]>94&&Math.abs(s.p[0]-66)<6&&roof===false,{at:s.p,roofVisible:roof});
    await shot(page,'04_inside');
    // 4. upstairs: click the stair flight near its head, then the upper floor it reveals
    await click(page,[70.25,5.2,97.9],{kind:'arrival_surface',surface:'stair',near:2},{yaw:-.5,pitch:1.2,dist:16});
    await settle(page,30000);
    await click(page,[64.5,5.82,99.5],{kind:'arrival_surface',surface:'upper',near:2.5},{yaw:.6,pitch:1.2,dist:16});
    await settle(page,30000);s=await st(page);
    ok('climbs the stair to the upper floor (y about 5.8)',Math.abs(s.p[1]-5.8)<.3,s);
    await shot(page,'05_upper');
    // 5. back out onto the approach
    // like a player: the stair flight first (the upper floor hides the hall below), then the hall floor
    await click(page,[70.25,4.4,99.4],{kind:'arrival_surface',surface:'stair',near:2});
    await settle(page,30000);
    await click(page,[68.5,3.02,101.5],{kind:'arrival_surface',surface:'ground',near:2});
    await settle(page,30000);
    const oy=await page.evaluate(()=>groundY(66.5,108.5));
    await click(page,[66.5,oy,108.5],{tile:[66,108]});await settle(page,30000);s=await st(page);
    ok('comes back down and out to the approach',s.p[2]>106&&Math.abs(s.p[1]-oy)<.5,s);
    // 6. the statue blocks its tiles
    // a real click on the ground tile under the plinth: the walk must stop outside the statue's footprint
    const sy=await page.evaluate(()=>groundY(62.5,108.5));
    const hit=await click(page,[62.5,sy,108.5],{tile:[62,108]});
    const tr=await trace(page,20000);s=await st(page);
    const inside=tr.filter(q=>q[0]>61.5&&q[0]<63.1&&q[2]>107.6&&q[2]<109.2).length;
    ok('the Lantern Keeper blocks its tiles: clicking under it never walks into the plinth',!!hit&&inside===0,{clicked:hit,at:s.p,samplesInside:inside});
    await shot(page,'06_out');
    // 7. reload restores position and doors
    await page.evaluate(()=>SaveGame.save());const before=await st(page);
    await page.reload({waitUntil:'load'});await enter(page);const after=await st(page);
    ok('reload restores position and the open door',Math.hypot(after.p[0]-before.p[0],after.p[2]-before.p[2])<1.2&&after.doors&&after.doors.arrival===before.doors.arrival,{before:before.p,after:after.p,doors:after.doors});
    ok('zero page errors',pageErrors.length===0&&after.errors===0,{pageErrors});
  }catch(e){ok('driver completed',false,{error:String(e).slice(0,400)});await shot(page,'zz_error');}
  finally{
    const pass=checks.every(c=>c.ok);
    fs.writeFileSync(path.join(OUT,'qa_result.json'),JSON.stringify({pass,checks,seconds:Math.round((Date.now()-t0)/1000)},null,2));
    console.log('[ARRIVAL V4 QA] '+(pass?'PASS':'FAIL')+' '+checks.filter(c=>c.ok).length+'/'+checks.length+' in '+Math.round((Date.now()-t0)/1000)+'s');
    await browser.close();process.exit(pass?0:1);
  }
})();
