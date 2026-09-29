/* Level-up fireworks + falling oak leaves: capture harness (owner request 2026-09-29).
 * A fresh adventurer enters the island in a separate headless Chrome (never the user's browser), then:
 *   1. oaks: the camera looks at the survival camp's teaching oaks for a few seconds (what falls from them);
 *   2. level-up: the camera sits close behind the adventurer, a Woodcutting level is granted through the game's own
 *      Player.addXp, and a frame sequence is taken over ~3 s (crop around the adventurer + one full frame) while the
 *      DOM is read for any full-screen flash layer;
 *   3. a contact sheet of the sequence is composed in the page (canvas) and saved beside the frames;
 *   4. (unless SKIP_CAMP=1) the adventurer walks to the survival camp by real clicks and the oaks are watched for 30 s
 *      (how many leaves are out, frames every 5 s); 5. one leaf is let go (LeafFall.qaDrop) and followed close up.
 * Writes scratchpad/levelup_leaves/<tag>_*.jpg and <tag>_report.json.
 * Run: SMOKE_BASE=http://127.0.0.1:8161 node tools/qa_levelup_leaves.js <tag> [look]   (look: 4b etc.) */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const OUT=path.join(__dirname,'..','scratchpad','levelup_leaves');fs.mkdirSync(OUT,{recursive:true});
const TAG=process.argv[2]||'capture',LOOK=process.argv[3]||'';
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1280,720','--hide-scrollbars','--mute-audio','--no-first-run','--autoplay-policy=no-user-gesture-required'],defaultViewport:{width:1280,height:720}});
 const report={tag:TAG,look:LOOK||'3',base:BASE,at:new Date().toISOString(),errors:[],frames:[]};
 try{
  const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(String(e).slice(0,300)));report.missing=[];page.on('response',r=>{if(r.status()===404)report.missing.push(r.url().replace(BASE,''))});
  await page.goto(BASE+'/?qaProfile=fxcap-'+TAG+'-'+Date.now().toString(36)+(LOOK?'&look='+LOOK:''),{waitUntil:'load',timeout:120000});
  await L.enter(page);
  await page.waitForFunction(()=>typeof scene!=='undefined'&&!!scene.getObjectByName('island-lesson-survival-oak-2'),{timeout:120000});
  await sleep(4000);
  // 1. the teaching oaks
  await page.evaluate(()=>{const o=scene.getObjectByName('island-lesson-survival-oak-2');window.__qaCameraFocus={x:o.position.x+1.2,y:o.position.y,z:o.position.z+.8};camCtl.yaw=Math.PI*.75;camCtl.pitch=.5;camCtl.dist=9});
  await sleep(3500);
  for(let i=0;i<3;i++){await page.screenshot({path:path.join(OUT,TAG+'_oaks_'+i+'.jpg'),type:'jpeg',quality:82});await sleep(900)}
  report.leaves=await page.evaluate(()=>{const A=typeof Atmosphere!=='undefined'?Atmosphere:null,F=typeof LeafFall!=='undefined'?LeafFall:null;
   return {atmosphereLeafMeshes:A&&A.leaves?A.leaves.length:0,leafFall:F&&F.stats?F.stats():null}});
  // 2. the level-up
  await page.evaluate(()=>{window.__qaCameraFocus=null;camCtl.yaw=Math.PI*.75;camCtl.pitch=.85;camCtl.dist=7.5;
   // a boom that sees the adventurer's chest (the dock's posts can stand in the way at the default yaw)
   if(typeof clearFollowYaw==='function')clearFollowYaw()});
  await sleep(2500);
  const rect=await page.evaluate(()=>{const v=new THREE.Vector3(player.position.x,player.position.y+1,player.position.z).project(camera),r=renderer.domElement.getBoundingClientRect();
   return {x:Math.round((v.x+1)/2*r.width+r.left),y:Math.round((1-v.y)/2*r.height+r.top)}});
  const clip={x:Math.max(0,rect.x-220),y:Math.max(0,rect.y-200),width:440,height:330};
  await page.evaluate(()=>{window.__qaFlash=[];const t0=performance.now();window.__qaFlashT0=t0;
   const iv=setInterval(()=>{const f=document.getElementById('notif-flash');window.__qaFlash.push([Math.round(performance.now()-t0),f?+getComputedStyle(f).opacity:null]);if(performance.now()-t0>3500)clearInterval(iv)},40);
   const need=XP_TABLE[Player.lvl('Woodcutting')+1]-Player.xp.Woodcutting+1;Player.addXp('Woodcutting',need/((typeof GameConfig!=='undefined'&&GameConfig.xpMult)?GameConfig.xpMult('Woodcutting'):1))});
  const t0=Date.now();
  for(let i=0;i<16;i++){const t=Date.now()-t0;const f=TAG+'_levelup_f'+String(i).padStart(2,'0')+'.jpg';
   await page.screenshot({path:path.join(OUT,f),type:'jpeg',quality:85,clip});report.frames.push({file:f,ms:t});
   if(i===1)await page.screenshot({path:path.join(OUT,TAG+'_levelup_full.jpg'),type:'jpeg',quality:80});
   await sleep(Math.max(0,(i+1)*190-(Date.now()-t0)))}
  await sleep(600);
  report.levelUp=await page.evaluate(()=>{const fl=window.__qaFlash||[],max=fl.reduce((m,x)=>Math.max(m,x[1]||0),0);
   const chat=[...document.querySelectorAll('#chat-log div, #chatbox div')].map(d=>d.textContent).filter(t=>/level/i.test(t)).slice(-3);
   const b=document.getElementById('notif-banner');
   return {flashMaxOpacity:max,flashLayer:!!document.getElementById('notif-flash'),banner:b?b.textContent:null,chat,
    fireworks:typeof LevelUpFX!=='undefined'&&LevelUpFX.stats?LevelUpFX.stats():null,woodcutting:Player.lvl('Woodcutting')}});
  // 3. contact sheet (drawn in the page from the served frames)
  const rel='/scratchpad/levelup_leaves/';
  const sheet=await page.evaluate(async(files,rel,w,h)=>{const cols=4,rows=Math.ceil(files.length/cols),s=.5,cv=document.createElement('canvas');cv.width=cols*w*s;cv.height=rows*(h*s+14);
   const g=cv.getContext('2d');g.fillStyle='#1b1712';g.fillRect(0,0,cv.width,cv.height);g.font='11px Verdana';g.fillStyle='#ffe9b0';
   for(let i=0;i<files.length;i++){const im=new Image();im.src=rel+files[i].file+'?'+Date.now();await im.decode();const x=(i%cols)*w*s,y=Math.floor(i/cols)*(h*s+14);g.drawImage(im,x,y+14,w*s,h*s);g.fillText((files[i].ms/1000).toFixed(2)+' s',x+4,y+11)}
   return cv.toDataURL('image/jpeg',.85)},report.frames,rel,clip.width,clip.height);
  fs.writeFileSync(path.join(OUT,TAG+'_levelup_sheet.jpg'),Buffer.from(sheet.split(',')[1],'base64'));
  // 4. walk (real clicks) to the survival camp and watch the oaks for 30 s: what falls, and how often
  if(process.env.SKIP_CAMP!=='1'){
   report.walk=await L.walkPoint(page,42.5,99.5);
   await page.evaluate(()=>{const o=scene.getObjectByName('island-lesson-survival-oak-2');window.__qaCameraFocus={x:o.position.x+1.2,y:o.position.y,z:o.position.z+.8};camCtl.yaw=Math.PI*.75;camCtl.pitch=.5;camCtl.dist=9});
   const counts=[],t1=Date.now();let shotN=0;
   while(Date.now()-t1<30000){const s=await page.evaluate(()=>typeof LeafFall!=='undefined'?LeafFall.stats():null);if(s)counts.push(s.falling+s.resting+s.fading);
    if(Date.now()-t1>=shotN*5000){await page.screenshot({path:path.join(OUT,TAG+'_camp_leaves_'+shotN+'.jpg'),type:'jpeg',quality:82});shotN++}
    await sleep(1000)}
   report.camp={seconds:30,leavesOutMax:Math.max(0,...counts),leavesOutAvg:counts.length?+(counts.reduce((a,b)=>a+b,0)/counts.length).toFixed(2):0,
    stats:await page.evaluate(()=>typeof LeafFall!=='undefined'?LeafFall.stats():null),player:await L.pos(page)};
   // 5. one leaf followed close up, from the crown to the ground
   const slot=await page.evaluate(()=>typeof LeafFall!=='undefined'?LeafFall.qaDrop(1):null);if(typeof slot==='number'){
    const close=[];const t2=Date.now();
    for(let i=0;i<10;i++){
     const at=await page.evaluate(slot=>{const l=LeafFall.qaLeaves().filter(q=>q.slot===slot)[0];if(!l)return null;
      window.__qaCameraFocus={x:l.x,y:l.y-.4,z:l.z};camCtl.pitch=.75;camCtl.dist=3.2;if(typeof snapFollowCamera==='function')snapFollowCamera();return l},slot);
     if(!at)break;await sleep(150);
     const c=await page.evaluate(l=>{const v=new THREE.Vector3(l.x,l.y,l.z).project(camera),r=renderer.domElement.getBoundingClientRect();return {x:Math.round((v.x+1)/2*r.width+r.left),y:Math.round((1-v.y)/2*r.height+r.top)}},at);
     const f=TAG+'_leaf_close_'+String(i).padStart(2,'0')+'.jpg';
     await page.screenshot({path:path.join(OUT,f),type:'jpeg',quality:88,clip:{x:Math.max(0,Math.min(1280-320,c.x-160)),y:Math.max(0,Math.min(720-240,c.y-120)),width:320,height:240}});
     close.push({file:f,ms:Date.now()-t2,phase:at.phase,frame:at.frame});await sleep(550)}
    report.close=close;
    if(close.length){const sh=await page.evaluate(async(files,rel)=>{const cols=5,w=320,h=240,s=.6,rows=Math.ceil(files.length/cols),cv=document.createElement('canvas');cv.width=cols*w*s;cv.height=rows*(h*s+14);
      const g=cv.getContext('2d');g.fillStyle='#1b1712';g.fillRect(0,0,cv.width,cv.height);g.font='11px Verdana';g.fillStyle='#ffe9b0';
      for(let i=0;i<files.length;i++){const im=new Image();im.src=rel+files[i].file+'?'+Date.now();await im.decode();const x=(i%cols)*w*s,y=Math.floor(i/cols)*(h*s+14);g.drawImage(im,x,y+14,w*s,h*s);g.fillText((files[i].ms/1000).toFixed(1)+' s '+files[i].phase,x+4,y+11)}
      return cv.toDataURL('image/jpeg',.88)},close,rel);
     fs.writeFileSync(path.join(OUT,TAG+'_leaf_close_sheet.jpg'),Buffer.from(sh.split(',')[1],'base64'))}
   }
  }
 }catch(e){report.errors.push('driver: '+String(e&&e.stack||e).slice(0,400))}
 fs.writeFileSync(path.join(OUT,TAG+'_report.json'),JSON.stringify(report,null,1));
 console.log(JSON.stringify({tag:TAG,errors:report.errors,levelUp:report.levelUp,leaves:report.leaves,walk:report.walk,camp:report.camp,close:(report.close||[]).length},null,1));
 await browser.close();process.exit(report.errors.length?1:0);
})();
