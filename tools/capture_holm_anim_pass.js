/* capture_holm_anim_pass.js - frame sequences of every animation the 2026-09-29 animation pass added on Tutor's Holm
 * (src/holm_island_anim.js). Headless Chrome with the GPU (throwaway QA profile; no save touched): boots ?holmIsland=1
 * through the real login, then for each animation sets the scene up with the island's read-only QA helpers (qaPlace /
 * qaView / qaSetLedger) and fires it through the SAME trigger the game uses (the game's own felling flags, board(), the
 * bank modal, the rope tie, a real smith / smelt action, a walk order through a doorway), and screenshots a burst.
 * Clips driven by the pass itself may be slowed for the camera (SLOW, recorded in each frame's JSON); the adventurer's
 * own clips always run at their real pace.
 * Writes scratchpad/holm_anim_pass/frames/<anim>/fNN.png, frames.json (time, pass stats) and sheet.png (python + PIL).
 * Run: SMOKE_BASE=http://127.0.0.1:8181 node tools/capture_holm_anim_pass.js [anim ...] */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_anim_pass','frames');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=animcap-'+Date.now().toString(36);
const ONLY=process.argv.slice(2);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {enter}=require('./holm_island_driver_lib');
const W=960,H=600;
async function view(page,x,z,y,yaw,pitch,dist,settleMs){await page.evaluate((x,z,y,yaw,pitch,dist)=>{HolmArrivalQA.qaView(x,z,y);camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist},x,z,y,yaw,pitch,dist);await sleep(settleMs||1600)}
async function slow(page,k){await page.evaluate(k=>{if(!window.__animU){window.__animU=HolmIslandAnim.update;HolmIslandAnim.update=function(dt){return window.__animU(dt*(window.__animSlow||1))}}window.__animSlow=k},k)}
// the 2004-sized chrome covers a third of the view at this size: hidden during a burst so the frames show the world
const HUD_HIDE='#side-panel,#chatbox-frame,#mm-cluster,#hud-rail,#zone-box,#action-text,#holm-intro-note,#hud-tip,#music-menu,#test-travel-toggle,#objective,#build-stamp,.xp-drop,#xp-tracker,#loot-tracker{visibility:hidden!important}';
async function hud(page,show){await page.evaluate((css,show)=>{let el=document.getElementById('anim-capture-css');if(show){if(el)el.remove();return}if(!el){el=document.createElement('style');el.id='anim-capture-css';el.textContent=css;document.head.appendChild(el)}},HUD_HIDE,show)}
async function burst(page,name,n,gapMs,note){const dir=path.join(OUT,name);fs.mkdirSync(dir,{recursive:true});const rows=[];await hud(page,false);
 for(let i=0;i<n;i++){const t=await page.evaluate(()=>({t:performance.now(),st:HolmIslandAnim.status().stats,slow:window.__animSlow||1}));
  await page.screenshot({path:path.join(dir,'f'+String(i).padStart(2,'0')+'.png')});rows.push({frame:i,ms:Math.round(t.t),slow:t.slow,stats:t.st});if(gapMs)await sleep(gapMs)}
 await hud(page,true);fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify({anim:name,note:note||'',hud:'hidden for the frames',frames:rows},null,1));
 try{cp.execFileSync('python',['-c',`
import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/f*.png'));ims=[Image.open(f).convert('RGB') for f in fs];w,h=ims[0].size;s=.5;tw,th=int(w*s),int(h*s);cols=4;rows=(len(ims)+cols-1)//cols
S=Image.new('RGB',(tw*cols,th*rows),(20,20,20))
for i,im in enumerate(ims):S.paste(im.resize((tw,th)),((i%cols)*tw,(i//cols)*th))
S.save(sys.argv[1]+'/sheet.png')`,dir])}catch(e){console.log('  (no sheet: '+e.message.split('\n')[0]+')')}
 console.log('  '+name+': '+n+' frames');return rows}
const SCENES={
 // a felled teaching oak falls away from the woodcutter (the game's own depletion: alive=false, everything but the stump hidden)
 oak_fall:async page=>{const t=await page.evaluate(()=>{const t=scene.getObjectByName('island-lesson-survival-oak-2');const n=HolmArrivalQA.graphNodes().filter(q=>/land|IslandTerrain/.test(q.surface)).map(q=>[q,Math.hypot(q.x-t.position.x,q.z-t.position.z)]).filter(a=>a[1]>1.2&&a[1]<2.2).sort((a,b)=>a[1]-b[1])[0][0];
   HolmArrivalQA.qaPlace(n.id);return {x:t.position.x,y:t.position.y,z:t.position.z,px:n.x,pz:n.z}});
  await view(page,t.x,t.z,t.y+1.5,Math.atan2(t.px-t.x,t.pz-t.z)+1.4,.5,15);await slow(page,.5);
  await page.evaluate(()=>{const t=scene.getObjectByName('island-lesson-survival-oak-2');t.userData.alive=false;t.userData.respawnT=8;t.children.forEach((c,i)=>{if(i>0)c.visible=false})});
  await burst(page,'oak_fall',14,90,'teaching oak felled (game depletion flags); fall clip slowed x0.5 for the camera');await slow(page,1)},
 // boarding the ferry: bell, the skiff pulls out north with the adventurer and Tobin, then the crossing
 skiff_departure:async page=>{await slow(page,1);await page.waitForFunction(()=>!HolmIslandAnim.status().sailing,{timeout:20000}).catch(()=>{});await page.evaluate(()=>{HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice());HolmArrivalQA.qaPlace('b:haven:0:-15:0')});await sleep(1200);
  await view(page,103.5,-3,0,-2.5,.45,20,2000);await page.evaluate(()=>{window.__boarded=HolmIslandCurriculum.board()});
  await burst(page,'skiff_departure',12,280,'HolmIslandCurriculum.board() at the departure stance: bell, cast-off, the adventurer and Tobin aboard; real time')},
 bell_swing:async page=>{await view(page,105.6,18.4,2.1,.35,.25,5.5,1800);await slow(page,.5);await page.evaluate(()=>{HolmIslandAnim.sail(function(){})});
  await burst(page,'bell_swing',12,60,'the cove bell as the skiff is readied (sail with no crossing; the cove is put back after); slowed x0.5');await slow(page,1)},
 anvil_strike:async page=>{await page.evaluate(()=>{HolmArrivalQA.qaPlace('b:cavern:3:3:0');Player.addItem('hammer',1);Player.addItem('bronze_bar',6);UI.refreshInv&&UI.refreshInv()});
  await view(page,203.6,64.2,-29.3,Math.PI+.7,.55,6,1800);
  await page.evaluate(()=>{Player.action={type:'smith',obj:scene.getObjectByName('island-lesson-anvil'),bar:'bronze_bar',make:{id:'bronze_dagger',bars:1,name:'Bronze dagger'},t:0}});
  await burst(page,'anvil_strike',16,60,'a real smith action at the anvil (game timing, 2.4 s strokes): sparks on each hammer strike; real time')},
 furnace_bellows:async page=>{await page.evaluate(()=>{HolmArrivalQA.qaPlace('b:cavern:5:4:0');Player.addItem('copper_ore',4);Player.addItem('tin_ore',4)});
  await view(page,206.3,65.4,-29.3,Math.PI+.2,.5,6,1800);
  await page.evaluate(()=>{Player.action={type:'smelt',obj:scene.getObjectByName('island-lesson-furnace'),bar:'bronze_bar',t:0}});
  await burst(page,'furnace_bellows',12,70,'a real smelt action at the furnace: the glow flares, the bellows pump; real time')},
 bakehouse_door:async page=>{await page.evaluate(()=>{const ids=HolmCurriculumProgress.lessonIds.slice();HolmIslandCurriculum.qaSetLedger(ids.slice(0,ids.indexOf('bake_bread')));});await sleep(800);
  await page.evaluate(()=>HolmArrivalQA.qaPlace('b:bakehouse:3:3:0'));await view(page,45.6,68.5,5.6,Math.PI/2-.3,.55,10,2200);
  await page.evaluate(()=>{const n=HolmArrivalQA.navGraph().byId['b:bakehouse:-1:1:0'];HolmArrivalPlayer.order({x:n.x,y:n.y,z:n.z})});
  await burst(page,'bakehouse_door',12,110,'walk order through the earned bakehouse door: it swings open as the adventurer comes; real time');
  await page.evaluate(()=>{const n=HolmArrivalQA.navGraph().byId['b:bakehouse:7:1:0']||HolmArrivalQA.navGraph().byId['b:bakehouse:3:3:0'];HolmArrivalPlayer.order({x:n.x,y:n.y,z:n.z})});await sleep(3500);
  await page.evaluate(()=>{const n=HolmArrivalQA.navGraph().byId['b:bakehouse:3:3:0'];HolmArrivalQA.qaPlace(n.id)});await view(page,45.6,68.5,5.6,Math.PI/2-.3,.55,10,300);
  await burst(page,'bakehouse_door_shut',8,150,'the adventurer walks away: the door swings shut behind them; real time')},
 store_door:async page=>{await page.evaluate(()=>{HolmArrivalQA.qaPlace('b:bakehouse:-1:-3:1')});await view(page,44.85,64.5,5.6,Math.PI/2+.6,.8,7,1800);
  await page.evaluate(()=>{const n=HolmArrivalQA.navGraph().byId['b:bakehouse:2:-3:0'];HolmArrivalPlayer.order({x:n.x,y:n.y,z:n.z})});
  await burst(page,'store_door',10,110,'walk from the kitchen into the store room: the store door swings open; real time')},
 vault_gate:async page=>{await page.evaluate(()=>HolmArrivalQA.qaPlace('b:bank:3:-2:0'));await view(page,89.5,54.6,7.8,.3,.8,7,1800);await slow(page,.4);
  await page.evaluate(()=>{UI.openBank();const m=document.getElementById('bank-modal');if(m)m.style.visibility='hidden'});   // the bank window stays open, out of the frame
  await burst(page,'vault_gate_open',8,60,'UI.openBank() at the vault (the vault service call): the gate swings open; slowed x0.4');
  await page.evaluate(()=>{UI.closeModal('bank-modal');const m=document.getElementById('bank-modal');if(m)m.style.visibility=''});await burst(page,'vault_gate_close',8,60,'the bank closed: the gate swings shut; slowed x0.4');await slow(page,1)},
 teller:async page=>{await page.evaluate(()=>HolmArrivalQA.qaPlace('b:bank:0:-1:0'));await view(page,87,57,8,.4,.7,6,1800);
  await page.evaluate(()=>UI.openBank());await sleep(200);await page.evaluate(()=>{const m=document.getElementById('bank-modal');if(m)m.style.visibility='hidden'});   // keep the modal open, out of the frame
  await burst(page,'teller',6,250,'UI.openBank() at the counter: Teller Maud turns and talks while the bank is open');
  await page.evaluate(()=>{const m=document.getElementById('bank-modal');if(m)m.style.visibility='';UI.closeModal('bank-modal')})},
 rope_drop:async page=>{await page.evaluate(()=>{const g=scene.getObjectByName('island-shaft-rope-quarry-shaft');const b=new THREE.Box3().setFromObject(g.children[0]);
   const n=HolmArrivalQA.graphNodes().map(q=>[q,Math.hypot(q.x-(b.min.x+b.max.x)/2,q.z-(b.min.z+b.max.z)/2)+Math.abs(q.y-9.15)]).sort((a,c)=>a[1]-c[1])[0][0];HolmArrivalQA.qaPlace(n.id);Player.addItem('rope',1)});
  await view(page,36.4,28.6,8.6,0.35,1.15,10,1800);await slow(page,.35);await page.evaluate(()=>HolmShaftRope.tie());
  await burst(page,'rope_drop',10,50,'HolmShaftRope.tie() beside the shaft (the game tie): the rope pays out; slowed x0.35');await slow(page,1)},
 tutor_stroll:async page=>{await page.evaluate(()=>HolmArrivalQA.qaPlace('b:haven:0:-15:0'));const w=await page.evaluate(()=>HolmIslandTutors.strolls().find(s=>s.id==='wenna'));
  await view(page,w.home[0],w.home[1],2.2,-1.9,1.05,9,800);
  for(let i=0;i<60;i++){const m=await page.evaluate(()=>HolmIslandTutors.strolls().find(s=>s.id==='wenna').mode);if(m==='home'){await sleep(150);continue}break}
  await burst(page,'tutor_stroll',12,250,'Wenna strolls a tile off her spot on her walk clip while nobody is near, and back')},
 chimney_smoke:async page=>{await page.evaluate(()=>HolmArrivalQA.qaPlace('b:bakehouse:7:1:0'));await view(page,41.8,62.3,15,Math.PI*.8,.35,18,3000);
  await burst(page,'chimney_smoke',6,500,'smoke over the bakehouse chimney (Blender-rendered puffs)')},
 cavern_torches:async page=>{await page.evaluate(()=>HolmArrivalQA.qaPlace('b:cavern:3:3:0'));const c=await page.evaluate(()=>{const b=new THREE.Box3().setFromObject(scene.getObjectByName('Cavern_TorchFlame'));return [(b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2,b.max.y]});
  await view(page,209.8,60,-28,Math.PI+.4,.35,9,1800);await burst(page,'cavern_torches',8,120,'the cavern wall torches flicker (brightness on the Blender flicker curve)')}};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size='+W+','+H,'--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist'],defaultViewport:{width:W,height:H}});
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e).slice(0,300)));page.on('requestfailed',r=>errors.push('REQFAIL '+((r.failure()&&r.failure().errorText)||'')+' '+r.url().slice(0,160)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))});
 await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:90000});await enter(page);
 await page.waitForFunction(()=>typeof HolmIslandAnim!=='undefined'&&HolmIslandAnim.status().on,{timeout:120000});await sleep(2500);
 const order=['oak_fall','anvil_strike','furnace_bellows','bakehouse_door','store_door','vault_gate','teller','rope_drop','tutor_stroll','chimney_smoke','cavern_torches','bell_swing','skiff_departure'];
 const report={base:BASE,at:new Date().toISOString(),scenes:{}};
 for(const k of order){if(ONLY.length&&ONLY.indexOf(k)<0)continue;try{await SCENES[k](page);report.scenes[k]='ok'}catch(e){report.scenes[k]='error: '+e.message;console.log('  '+k+' FAILED '+e.message)}}
 report.stats=await page.evaluate(()=>typeof HolmIslandAnim!=='undefined'?HolmIslandAnim.status().stats:null).catch(()=>null);report.errors=errors.filter(e=>!/favicon|BUILD_INFO|404|ERR_ABORTED/.test(e));   // (aborted preloads are the look's own cancellations)
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,1));console.log('[capture] '+JSON.stringify(report.scenes)+' errors '+report.errors.length);
 await browser.close();
})();
