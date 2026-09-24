/* Tutor's Holm v3 slice gate (finish goal, step 3): arrival cove + guide house, real pointer input.
 * Boots ?holmV3=1 on a fresh isolated profile and drives the slice with page.mouse on pixels whose game
 * pick() hits the intended target: landing path, the guide house door (walled approach from behind),
 * lesson 1 at the relief chart, the loft ladder up and down, the loft floor, the way back out, the creek
 * (refused) and the bridge (crossed on the deck), then a reload that must restore position and lesson.
 * Run: SMOKE_BASE=http://localhost:8088 node tools/qa_holm_v3_slice.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_v3_slice');fs.mkdirSync(OUT,{recursive:true});
const PROFILE='v3-slice-qa-'+Date.now().toString(36);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmV3=1&qaProfile='+PROFILE;
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
  await page.waitForFunction(()=>{if(typeof running==='undefined'||!running)return false;const b=document.getElementById('enter-buffer');return !b||b.style.display==='none';},{timeout:30000});await sleep(1500);
  return had;
}
const st=page=>page.evaluate(()=>({p:[+player.position.x.toFixed(2),+player.position.y.toFixed(2),+player.position.z.toFixed(2)],
  plane:Player.plane||0,step:Tutorial.step,provider:CRWorldMode.providerId,errors:(window.SMOKE_ERRORS||[]).length}));
const idle=(page,t)=>page.waitForFunction(()=>!Player.moveTo&&!(Player.path&&Player.path.length),{timeout:t||40000}).catch(()=>{});

// Aim at a world point, then search outward for a pixel whose pick() satisfies `want` (tile or object test).
async function aim(page,pt,want,view){
  return page.evaluate(async(pt,want,view)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const dx=player.position.x-pt[0],dz=player.position.z-pt[2];
    const d=Math.hypot(dx,dz);   // far targets need a steeper, longer boom to stay on screen
    camCtl.yaw=d>.5?Math.atan2(dx,dz):(view&&view.yaw||0);camCtl.pitch=(view&&view.pitch)||(d>6?1.3:1.0);camCtl.dist=(view&&view.dist)||Math.max(16,d*1.7);
    await sleep(1600);
    const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera);
    const cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
    const test=h=>{if(!h)return false;const u=h.obj.userData||{};
      if(want.kind)return u.kind===want.kind&&(want.plane===undefined||(u.plane||0)===want.plane);
      return isGroundName(h.obj.name)&&Math.floor(h.point.x)===want.tile[0]&&Math.floor(h.point.z)===want.tile[1];};
    for(let r=0;r<=150;r+=5)for(let a=0;a<360;a+=(r?20:360)){
      const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
      if(x<0||y<0||x>=rect.width||y>=rect.height)continue;
      const el=document.elementFromPoint(x,y);if(el!==renderer.domElement)continue;   // HUD over the world swallows clicks
      if(test(pick({clientX:x,clientY:y})))return [x,y];
    }
    const ce=document.elementFromPoint(Math.round(cx),Math.round(cy)),ch=pick({clientX:Math.round(cx),clientY:Math.round(cy)});
    return {miss:true,centre:[Math.round(cx),Math.round(cy)],rect:[rect.width,rect.height],el:ce&&(ce.tagName+'#'+ce.id+'.'+ce.className),hit:ch&&{n:ch.obj.name,k:ch.obj.userData.kind,pt:ch.point.toArray().map(v=>+v.toFixed(2))},player:[player.position.x,player.position.z]};
  },pt,want,view);
}
async function press(page,xy){await page.mouse.move(xy[0],xy[1]);await page.mouse.down();await page.mouse.up();}
// Like a player: targets beyond the 30-degree view are reached by clicking a few tiles ahead at a time.
async function clickTile(page,x,z,y,view){
  for(let hop=0;hop<8;hop++){
    const p=await page.evaluate(()=>[player.position.x,player.position.z]);
    const dx=x+.5-p[0],dz=z+.5-p[1],d=Math.hypot(dx,dz);
    if(d<=5.5)break;
    const k=4.5/d,hx=Math.floor(p[0]+dx*k),hz=Math.floor(p[1]+dz*k);
    const hy=await page.evaluate((hx,hz)=>{const g=groundY(hx+.5,hz+.5);return g===null?0:g;},hx,hz);
    if(!await clickTileOnce(page,hx,hz,hy))break;
    await idle(page);
  }
  return clickTileOnce(page,x,z,y,view);
}
async function clickTileOnce(page,x,z,y,view){const xy=await aim(page,[x+.5,y,z+.5],{tile:[x,z]},view);if(Array.isArray(xy)){await press(page,xy);return xy;}console.log('    aim miss',JSON.stringify(xy));return null;}
async function clickKind(page,kind,pt,plane,view){const xy=await aim(page,pt,{kind,plane},view);if(Array.isArray(xy)){await press(page,xy);return xy;}console.log('    aim miss',JSON.stringify(xy));return null;}
async function trace(page,ms){
  await page.evaluate(()=>{window.__qaTrace=[];window.__qaIv=setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z,Player.plane||0]),150);});
  await sleep(ms);return page.evaluate(()=>{clearInterval(window.__qaIv);return window.__qaTrace;});
}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))consoleErrors.push(m.text().slice(0,300));});
  page.on('response',r=>{if(r.status()>=400&&!/favicon\.ico/.test(r.url()))consoleErrors.push('HTTP '+r.status()+' '+r.url().replace(/^https?:\/\/[^/]+/,''));});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await enter(page);let s=await st(page);
  ok('fresh profile boots onto the v3 preview at the landing',s.provider==='tutors-holm-v3'&&Math.abs(s.p[0]-61.5)<.6&&Math.abs(s.p[2]-118.5)<.6&&s.step===0,s);
  await shot(page,'01_landing');

  // landing path up to the front of the guide house
  let xy=await clickTile(page,66,103,3);await idle(page);s=await st(page);
  ok('a real click walks the landing path to the guide house front',xy&&Math.abs(s.p[0]-66.5)<.6&&Math.abs(s.p[2]-103.5)<.6,{xy,s});

  // walk round behind the house, then click inside: the planner must use the door, never the wall
  await clickTile(page,59,97,3);await idle(page);s=await st(page);
  ok('the outside tile beside the west wall is reachable',Math.abs(s.p[0]-59.5)<.6&&Math.abs(s.p[2]-97.5)<.6,s);
  xy=await clickTile(page,64,97,3);const tr=await trace(page,14000);await idle(page);s=await st(page);
  const viaDoor=tr.some(q=>q[0]>=66&&q[0]<67&&q[2]>=98&&q[2]<99.3);
  const door=await page.evaluate(()=>{const d=WORLD.doors.find(x=>x.userData.tileHouse==='guide_house');return {open:d.userData.open};});
  const roof=await page.evaluate(()=>WORLD.interiors.find(i=>i.tileHouse).roof.visible);
  ok('from behind the house a click inside walks round and in through the front door, which opens; the roof lifts',
    xy&&viaDoor&&door.open&&!roof&&Math.abs(s.p[0]-64.5)<.6&&Math.abs(s.p[2]-97.5)<.6,{xy,viaDoor,door,roof,s});
  await shot(page,'02_inside_hall');

  // lesson 1 at the relief chart
  xy=await clickKind(page,'holm_v3_chart',[62.9,3.8,95.9]);
  const advanced=await page.waitForFunction(()=>Tutorial.step>=1,{timeout:20000}).then(()=>true).catch(()=>false);
  s=await st(page);
  ok('lesson 1: a real click on the relief chart walks to its stance and records study_route',xy&&advanced,{xy,s});
  await page.evaluate(()=>{const d=document.getElementById('dialogue-modal');if(d)d.style.display='none';});

  // loft ladder up, walk the loft, ladder down
  xy=await clickKind(page,'climb',[60.5,4.3,94.5],0);
  const up=await page.waitForFunction(()=>(Player.plane||0)===1,{timeout:20000}).then(()=>true).catch(()=>false);
  s=await st(page);const zone=await page.evaluate(()=>(document.getElementById('zone-label')||{}).textContent||'');
  ok('the ground-floor ladder climbs to the loft (plane 1) with an honest location label',xy&&up&&s.plane===1&&Math.abs(s.p[1]-5.22)<.1&&/upper floor/.test(zone),{xy,s,zone});
  await shot(page,'03_loft');
  xy=await clickTile(page,64,96,5.2,{pitch:1.1,dist:14});await idle(page);s=await st(page);
  ok('a real click walks across the loft floor and stays upstairs',xy&&s.plane===1&&Math.abs(s.p[0]-64.5)<.6&&Math.abs(s.p[2]-96.5)<.6,{xy,s});
  xy=await clickKind(page,'climb',[61.5,5.7,94.5],1,{pitch:1.1,dist:14});
  const down=await page.waitForFunction(()=>(Player.plane||0)===0,{timeout:20000}).then(()=>true).catch(()=>false);
  s=await st(page);
  ok('the loft ladder climbs back down to the ground floor',xy&&down&&Math.abs(s.p[1]-3)<.1,{xy,s});

  // out through the door
  xy=await clickTile(page,66,102,3);await idle(page);s=await st(page);
  const roofBack=await page.evaluate(()=>WORLD.interiors.find(i=>i.tileHouse).roof.visible);
  ok('a real click walks back out through the door and the roof returns',xy&&roofBack&&Math.abs(s.p[2]-102.5)<.6,{xy,roofBack,s});

  // the creek is refused; the bridge is crossed on its deck
  xy=await clickTile(page,43,101,1.6);await idle(page);s=await st(page);
  const dry=await page.evaluate(()=>HolmV3Preview.height(player.position.x,player.position.z)!==null);
  ok('a click toward the creek stops on dry ground, never in the water',xy&&dry,{xy,s});
  await clickTile(page,49,98,2);await idle(page);                          // walk to the bridge's east end
  await page.evaluate(()=>{window.__qaTrace=[];window.__qaIv=setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z,Player.plane||0]),120);});
  xy=await clickTile(page,37,97,2.9);await idle(page);
  const bt=await page.evaluate(()=>{clearInterval(window.__qaIv);return window.__qaTrace;});await idle(page);s=await st(page);
  const deck=bt.filter(q=>q[0]>=40&&q[0]<47&&q[2]>=97&&q[2]<99);
  ok('a real click beyond the bridge crosses it on the deck at the authored height',deck.length>=3&&deck.every(q=>Math.abs(q[1]-2.5)<.02)&&s.p[0]<40,{samples:deck.length,s});
  await shot(page,'04_bridge');

  // reload restores position and lesson
  await page.evaluate(()=>SaveGame.save());const before=await st(page);
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});await enter(page);s=await st(page);
  ok('reload restores the exact v3 position and lesson progress',s.provider==='tutors-holm-v3'&&s.step===before.step&&
    Math.abs(s.p[0]-before.p[0])<.05&&Math.abs(s.p[2]-before.p[2])<.05,{before,after:s});

  ok('no page or console errors across the slice',pageErrors.length===0&&consoleErrors.length===0,{pageErrors,consoleErrors});
  const passed=checks.filter(c=>c.ok).length;
  fs.writeFileSync(path.join(OUT,'qa_result.json'),JSON.stringify({profile:PROFILE,passed,total:checks.length,
    seconds:+((Date.now()-t0)/1000).toFixed(1),checks},null,2));
  console.log('[V3 SLICE QA] '+(passed===checks.length?'PASS':'FAIL')+' '+passed+'/'+checks.length+' in '+((Date.now()-t0)/1000).toFixed(0)+'s');
  await browser.close();process.exitCode=passed===checks.length?0:1;
})().catch(e=>{console.error('DRIVER ERROR',e.message);process.exitCode=1;});
