/* Section C (+ most of D): the tutorial island, played by a bot in both games up to the bank.
 * 2004: a fresh account follows the local Tutorial Island (tools/ref2004/lib/tutorial2004.js, rs-sdk SDK); ours: a fresh
 * profile plays Tutor's Holm with the playthrough driver's own lesson steps (tools/qa_holm_island_playthrough.js DO).
 * Moments: arrival, the first instructor's building (with the dialogue open), woodcutting, firemaking, fishing,
 * cooking, the chef's building, the quest guide's building, the mine (+ mining / smelting / smithing), combat vs a weak
 * monster (hit splats, health bars), the bank; plus UI: side tabs, a right-click menu, the run control.
 *   bun tools/ref2004/capture_tutorial.js [--side 2004|ours|both]
 * Frames: C:\Users\iQwaZ\ref2004_captures\tutorial\{2004,ours}\ ; then python tools/ref2004/analyze.py tutorial */
'use strict';
process.env.TELEMETRY='false';
const fs=require('fs'),path=require('path');
const C=require('./lib/common');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const SIDE=arg('side','both');
const UNTIL=+arg('until','510');                // 2004 tutorial varp to stop at (510 = bank opened)

function saveSamples(dir,name,list,extra){
  fs.mkdirSync(path.join(dir,name),{recursive:true});
  const meta=[];list.forEach((r,i)=>{if(r.png){C.dataUrlToFile(r.png,path.join(dir,name,String(i).padStart(4,'0')+'.png'));r.file=String(i).padStart(4,'0')+'.png'}
    if(r.full){C.dataUrlToFile(r.full,path.join(dir,name,'full_'+String(i).padStart(4,'0')+'.png'));r.fullFile='full_'+String(i).padStart(4,'0')+'.png'}
    delete r.png;delete r.full;meta.push(r)});
  C.writeJSON(path.join(dir,name,'samples.json'),Object.assign({samples:meta},extra||{}));
}

// ------------------------------------------------------------------------------------------------ 2004
async function cap2004(browser){
  const R=require('./lib/ref2004_client'),T=require('./lib/tutorial2004');
  const dir=C.out2004('tutorial','2004'),log=[];
  // --resume: log the last tutorial account back in and carry on from where it stopped (local test account)
  const acct=path.join(C.CAP,'logs','tut_account.json'),resume=process.argv.includes('--resume')&&fs.existsSync(acct);
  const {user,pass}=resume?JSON.parse(fs.readFileSync(acct,'utf8')):{user:'crt'+Date.now().toString(36).slice(-7),pass:'pw'+Math.random().toString(36).slice(2,10)};
  if(!resume)fs.writeFileSync(acct,JSON.stringify({user,pass}));
  const page=await R.open(browser,user,pass);const away=()=>page.mouse.move(795,555);await away();
  if(!resume){await R.click(page,R.DESIGN_BTN.accept);await away()}await C.sleep(1500);
  const S=await R.sdk(user,pass);
  await R.setCam(page,{orbitPitch:128});await page.evaluate(()=>{window.gameClient.__cam=null});
  const seen={};for(const f of fs.readdirSync(dir))seen[f.replace(/(_\d+)?(\.png)?$/,'')]=1;
  // face the camera from the player toward a world tile (2004 yaw: 0 looks north, camera behind the player)
  const face=async(tx,tz)=>{const i=await R.info(page);const dx=tx-i.tileX,dz=tz-i.tileZ;if(!dx&&!dz)return;
    const yaw=Math.round(Math.atan2(-dx,dz)*1024/Math.PI)&2047;await page.evaluate(y=>{window.gameClient.orbitCameraYaw=y;window.gameClient.orbitCameraPitch=128},yaw);await C.sleep(1100)};
  const faceSubject=async()=>{const h=await T.hint(page);if(h.type===2)return face(h.x,h.z);
    if(h.type===1){const n=S.sdk.getNearbyNpcs().find(n=>n.index===h.npc);if(n)return face(n.x,n.z)}};
  const still=async(name)=>{const k=(seen[name]=(seen[name]||0)+1);if(k>2)return;await away();await faceSubject();
    await R.grab(page,path.join(dir,name+(k>1?'_'+k:'')+'.png'));log.push({name,k,at:T.tile(S),varp:await T.varp(page)});C.log('[2004] still',name)};
  const ctx={page,S,
    moment:async(name,fn)=>{
      if(!fn)return still(name);
      const k=(seen[name]=(seen[name]||0)+1);
      if(k>2)return fn();
      await away();await page.evaluate(()=>{window.gameClient.orbitCameraPitch=128});
      await R.startSampler(page,{crop:{size:[160,190],below:24},fullEvery:10});
      try{await fn()}finally{const l=await R.stopSampler(page);saveSamples(dir,name+(k>1?'_'+k:''),l,{moment:name,varp:await T.varp(page)});
        log.push({name,k,frames:l.length});C.log('[2004] anim',name,l.length,'frames')}},
    pageHook:(name)=>async(d,n)=>{if(n===0&&!seen[name]){seen[name]=1;await away();await C.sleep(700);await R.grab(page,path.join(dir,name+'.png'));log.push({name,dialog:d.text&&d.text.slice(0,0)})}}};
  if(!resume)await ctx.moment('arrival');
  const v=await T.play(ctx,UNTIL);
  C.log('[2004] tutorial reached varp',v);
  // UI: side tabs (every tab the tutorial has opened by now), a right-click menu on an NPC, the controls tab (run)
  if(v>=UNTIL-10){
    await page.evaluate(()=>{try{window.gameClient.mainModalId!==-1&&0}catch(e){}});
    await S.sdk.sendCloseModal().catch(()=>{});await C.sleep(800);
    for(const t of [0,1,2,3,4,5,6,11,12,13]){await S.sdk.sendSetTab(t);await C.sleep(500);await R.grab(page,path.join(dir,'tab_'+t+'.png'))}
    await S.sdk.sendSetTab(3);
    const npc=S.sdk.getNearbyNpcs().filter(n=>n.distance<8)[0];
    if(npc){const p=await page.evaluate(i=>{const c=window.gameClient;const n=c.npc[i];if(!n)return null;c.getOverlayPos(n.x,n.z,(n.height/2)|0);return c.projectX>-1?[c.projectX+4,c.projectY+4]:null},npc.index);
      if(p){await R.click(page,p,true);await C.sleep(500);await R.grab(page,path.join(dir,'menu_npc.png'));await page.mouse.move(795,555);await C.sleep(400)}}
    await R.click(page,[260,200],true);await C.sleep(500);await R.grab(page,path.join(dir,'menu_ground.png'));await away();await C.sleep(300);
  }
  C.writeJSON(path.join(dir,'log.json'),{varp:v,log,at:new Date().toISOString()});
  await S.sdk.disconnect().catch(()=>{});await page.close();return v;
}

// ------------------------------------------------------------------------------------------------ ours
async function capOurs(browser){
  const O=require('./lib/ours_client');const L=O.L;
  const PT=require('../qa_holm_island_playthrough.js');
  const dir=C.out2004('tutorial','ours'),log=[];
  const page=await O.open(browser,{profile:'ref2004-tut-'+Date.now().toString(36)});
  await page.waitForFunction(()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,{timeout:180000,polling:500}).catch(()=>{});
  await page.mouse.move(1525,1000);
  const DEF=await page.evaluate(()=>({yaw:camCtl.yaw,pitch:camCtl.pitch,dist:camCtl.dist}));
  const defaultCam=async(face)=>{await page.evaluate((d,f)=>{camCtl.pitch=d.pitch;camCtl.dist=d.dist;if(f){const dx=f[0]-player.position.x,dz=f[1]-player.position.z;if(Math.hypot(dx,dz)>.5)camCtl.yaw=Math.atan2(-dx,-dz)}},DEF,face||null);await C.sleep(1300)};
  const shot=async(name)=>{await page.screenshot({path:path.join(dir,name+'.png')});log.push({name,lesson:await PT.lesson(page).catch(()=>null)});C.log('[ours] still',name)};
  await defaultCam();await shot('arrival');
  // a watcher beside the driver: the first dialogue with each tutor, every skill animation, the bank, the fights
  const seen={};let busy=false,stop=false,fight=null;
  const watch=(async()=>{while(!stop){await C.sleep(220);if(busy)continue;busy=true;try{
    const st=await page.evaluate(()=>{const vis=id=>{const e=document.getElementById(id);return !!(e&&e.style.display&&e.style.display!=='none'&&e.offsetParent!==null)};
      const gm=player&&player.userData&&player.userData.gmix;let clip=null;
      if(gm&&gm.clips)for(const k in gm.clips){const a=gm.clips[k];if(a&&a!==gm.idle&&a!==gm.walk&&a!==gm.run&&a.isRunning()&&a.getEffectiveWeight()>.5){clip=k;break}}
      const dm=document.getElementById('dialogue-modal');const who=dm&&vis('dialogue-modal')?(dm.textContent||'').trim().split(/\s+/)[0]:null;
      let lesson=null;try{lesson=Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id}catch(e){}
      return {dialog:vis('dialogue-modal'),who,bank:vis('bank-modal'),clip,lesson,target:!!(typeof Player!=='undefined'&&Player.target)}});
    if(st.dialog){const key='dlg_'+st.lesson;if(!seen[key]){seen[key]=1;await defaultCam();await shot('dialogue_'+st.lesson)}}
    if(st.bank&&!seen.bank){seen.bank=1;await shot('bank')}
    if(st.clip&&(seen['clip_'+st.clip]||0)<1&&!st.dialog){seen['clip_'+st.clip]=1;const name='anim_'+st.clip;
      await defaultCam();await O.startSampler(page,{crop:{size:[480,570],below:80}});await C.sleep(2600);
      const l=await O.stopSampler(page);saveSamples(dir,name,l,{clip:st.clip,lesson:st.lesson});await shot(name);C.log('[ours] anim',st.clip,l.length,'frames')}
    if(st.target&&/trial/.test(st.lesson||'')){const k=(seen['fight_'+st.lesson]||0);if(k<10){seen['fight_'+st.lesson]=k+1;await shot('combat_'+st.lesson+'_'+k)}}
  }catch(e){}finally{busy=false}}})();
  const STOP_AFTER='open_bank';
  const per={};
  for(let guard=0;guard<30;guard++){
    const id=await PT.lesson(page);if(id==='complete')break;
    C.log('[ours] lesson',id);const t0=Date.now();
    // stills at the start of some lessons (the building / place the lesson happens in)
    try{await PT.DO[id](page)}catch(e){C.log('[ours] lesson error',id,String(e).slice(0,160))}
    await PT.waitLesson(page,id,20000);per[id]=Math.round((Date.now()-t0)/1000);
    if(id==='study_route'){while(busy)await C.sleep(50);busy=true;await defaultCam();await shot('guide_interior');busy=false}
    if(id==='bake_bread'){while(busy)await C.sleep(50);busy=true;await defaultCam();await shot('chef_building');busy=false}
    if(id==='learn_quests'){while(busy)await C.sleep(50);busy=true;await defaultCam();await shot('quest_building');busy=false}
    if(id==='descend_cavern'){while(busy)await C.sleep(50);busy=true;await defaultCam();await shot('mine');busy=false}
    if(id===STOP_AFTER)break;
    if(await PT.lesson(page)===id){C.log('[ours] stuck at',id);break}
  }
  stop=true;await watch;
  // UI: side tabs, a right-click menu on a tutor and on the ground, the run orb
  const tabs=await page.evaluate(()=>Array.from(document.querySelectorAll('#tab-bar .tab-btn')).map(b=>b.dataset.tab));
  for(const t of tabs){await page.evaluate(t=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="'+t+'"]');if(b)b.click()},t);await C.sleep(500);await page.screenshot({path:path.join(dir,'tab_'+t+'.png')})}
  await page.evaluate(()=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="inv"]');if(b)b.click()});
  const npcXY=await page.evaluate(()=>{let best=null;const P=player.position;(typeof WORLD!=='undefined'?WORLD.npcs:[]).forEach(n=>{const m=n.mesh||n;if(!m||!m.position)return;const d=Math.hypot(m.position.x-P.x,m.position.z-P.z);if(d<12&&(!best||d<best.d))best={d,m}});
    if(!best)return null;const v=new THREE.Box3().setFromObject(best.m).getCenter(new THREE.Vector3()).project(camera),r=renderer.domElement.getBoundingClientRect();return [(v.x+1)/2*r.width+r.left,(1-v.y)/2*r.height+r.top]});
  if(npcXY){await page.mouse.click(npcXY[0],npcXY[1],{button:'right'});await C.sleep(500);await page.screenshot({path:path.join(dir,'menu_npc.png')});await page.keyboard.press('Escape');await page.mouse.move(1525,1000);await C.sleep(300)}
  await page.mouse.click(700,420,{button:'right'});await C.sleep(500);await page.screenshot({path:path.join(dir,'menu_ground.png')});await page.keyboard.press('Escape');
  const uiRects=await page.evaluate(()=>{const o={};for(const id of ['side-panel','minimap-frame','chatbox-frame','run-orb','orbs','tab-bar','objective','zone-box']){const e=document.getElementById(id);if(!e)continue;const r=e.getBoundingClientRect();if(r.width>0)o[id]=[r.x,r.y,r.width,r.height].map(Math.round)}return o});
  C.writeJSON(path.join(dir,'log.json'),{per,log,uiRects,at:new Date().toISOString()});
  await page.close();
}

(async()=>{
  const browser=await C.launch(SIDE==='ours'?1530:800,SIDE==='ours'?1006:560);
  try{
    if(SIDE!=='ours')await cap2004(browser).catch(e=>C.log('[2004] error',e&&e.stack||e));
    if(SIDE!=='2004')await capOurs(browser).catch(e=>C.log('[ours] error',e&&e.stack||e));
  }finally{await browser.close().catch(()=>{})}
  C.log('tutorial: captures in',path.join(C.CAP,'tutorial'),'- next: python tools/ref2004/analyze.py tutorial');
  process.exit(0);
})();
