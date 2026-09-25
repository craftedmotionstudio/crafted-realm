/* Tutor's Holm island gate (finish goal M4.1, Sept 13 base): real pointer input on ?holmIsland=1.
 * The whole island is one composed graph (HolmIslandNav). From the dock the driver clicks, in hops a player
 * would make, reachable tiles along the planned route (HolmArrivalQA.qaRoute is read-only): across the timber
 * teaching bridge to the bakehouse courtyard, on to the Quest Lodge approach, then the Warden's Keep gate.
 * Checks the deck is really walked, steps stay cardinal, reload restores the spot, and there are no errors.
 * Building interiors wait for M4.2 (their roofs do not cut away in game yet).
 * Run: SMOKE_BASE=http://localhost:8088 node tools/qa_holm_island.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_island_qa');fs.mkdirSync(OUT,{recursive:true});
const PROFILE='island-qa-'+Date.now().toString(36);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile='+PROFILE;
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
  await page.waitForFunction(()=>{if(typeof running==='undefined'||!running)return false;const b=document.getElementById('enter-buffer');return !b||b.style.display==='none';},{timeout:90000});await sleep(3000);
}
const pos=page=>page.evaluate(()=>[+player.position.x.toFixed(3),+player.position.y.toFixed(3),+player.position.z.toFixed(3)]);
async function settle(page,ms){let last=null;for(let i=0;i<(ms||30000)/400;i++){await sleep(400);const p=(await pos(page)).join();if(p===last)return;last=p;}}
async function aim(page,pt,tile){
  return page.evaluate(async(pt,tile)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    const dx=player.position.x-pt[0],dz=player.position.z-pt[2],d=Math.hypot(dx,dz);
    camCtl.yaw=d>.5?Math.atan2(dx,dz):0;camCtl.pitch=d>6?1.3:1.1;camCtl.dist=Math.max(16,d*1.7);
    await sleep(1400);
    const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera);
    const cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
    const test=h=>{if(!h)return false;const u=h.obj.userData||{};
      return (isGroundName(h.obj.name)||u.arrivalSurface||u.islandGround)&&Math.floor(h.point.x)===tile[0]&&Math.floor(h.point.z)===tile[1];};
    for(let r=0;r<=160;r+=5)for(let a=0;a<360;a+=(r?20:360)){
      const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
      if(x<0||y<0||x>=rect.width||y>=rect.height)continue;
      if(document.elementFromPoint(x,y)!==renderer.domElement)continue;
      if(test(pick({clientX:x,clientY:y})))return [x,y];
    }
    return null;
  },pt,tile);
}
async function press(page,xy){await page.mouse.move(xy[0],xy[1]);await page.mouse.down();await page.mouse.up();}
// Walk like a player toward a building target: click a reachable tile a few steps along the planned route,
// repeat. stopOutside keeps the goal on open ground (entrances and courtyards) until interiors cut away (M4.2).
async function walkTo(page,building,target,stopOutside,trace){
  let reached=null;
  for(let hop=0;hop<40;hop++){
    let route=await page.evaluate((b,t)=>HolmArrivalQA.qaRoute(b,t),building,target);
    if(!route)return {error:'no route'};
    if(stopOutside){let k=route.length-1;while(k>0&&!/^(land|deck|exterior|dock)$|:(IslandTerrain|StagedTerrain)$/.test(route[k].surface))k--;route=route.slice(0,k+1)}
    if(route.length<=1){reached=route[0];if(process.env.ISLAND_QA_DEBUG)console.log('    walkTo '+building+'.'+target+' done at hop '+hop+' '+JSON.stringify(route[0]));break}
    let clicked=false;
    for(const ahead of [9,7,5,3,1]){
      const n=route[Math.min(route.length-1,ahead)];
      const xy=await aim(page,[n.x,n.y,n.z],[Math.floor(n.x),Math.floor(n.z)]);
      if(xy){await press(page,xy);clicked=true;break;}
    }
    // the last few tiles at a doorway can hide behind the building from the driver's camera; a service click finishes the walk
    if(!clicked&&route.length<=4){reached=route[route.length-1];break}
    if(!clicked){if(process.env.ISLAND_QA_DEBUG)console.log('    walkTo stuck: next '+JSON.stringify(route.slice(1,10).map(n=>[n.x,n.y,n.z,n.surface])));return {error:'no clickable tile ahead',at:await pos(page)};}
    await settle(page,30000);trace.push(...await page.evaluate(()=>window.__qaTrace.splice(0)));
  }
  return {reached,at:await pos(page)};
}
// Cardinal movement keeps x or z on a tile-centre line at every instant; a diagonal step leaves both off-centre.
// M4.2: click an authored service mesh (by its island label) like a player; the provider walks to the measured
// stance and runs the lesson handler on arrival.
async function clickService(page,label,which){
  // which (optional): the service's target id, for stations sharing a player-facing label (two "Climb-up ladder"s)
  const target=await page.evaluate((label,which)=>{let c=null;scene.traverse(o=>{const s=o.userData.islandService;if(!c&&o.isMesh&&s&&s.label===label&&(!which||s.target===which)){const b=new THREE.Box3().setFromObject(o);c=b.getCenter(new THREE.Vector3()).toArray()}});return c},label,which||null);
  if(!target)return {error:'no service mesh '+label};
  const xy=await page.evaluate(async(pt,label,which)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));const dx=player.position.x-pt[0],dz=player.position.z-pt[2],d=Math.hypot(dx,dz);
    for(const [yaw,pitch,dist] of [[d>.5?Math.atan2(dx,dz):0,1.15,Math.max(12,d*1.6)],[0,1.3,14],[Math.PI/2,1.3,14],[Math.PI,1.3,14],[-Math.PI/2,1.3,14]]){
      camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist;await sleep(1300);
      const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera);
      const cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
      for(let r=0;r<=120;r+=4)for(let a=0;a<360;a+=(r?15:360)){const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
        if(x<0||y<0||x>=rect.width||y>=rect.height||document.elementFromPoint(x,y)!==renderer.domElement)continue;
        const h=pick({clientX:x,clientY:y}),s=h&&h.obj.userData.islandService;if(s&&s.label===label&&(!which||s.target===which))return [x,y];}
    }
    return null;
  },target,label,which||null);
  if(!xy)return {error:'service not clickable '+label};
  await press(page,xy);await settle(page,30000);await sleep(900);return {ok:true};
}
// M5.1: click a named world object (lesson tree, fishing spot, ore rock, furnace, anvil, campfire) where the game's pick() hits it
async function clickNamed(page,name,opts){
  if(!(opts&&opts.keepDialogs))await closeDialogue(page);   // a level-up dialogue covers the canvas like it would for a player
  const xy=await page.evaluate(async name=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));const o=scene.getObjectByName(name);if(!o)return null;
    const pt=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).toArray();const dx=0,dz=0,d=0;
    const owns=h=>{for(let q=h&&h.obj;q;q=q.parent)if(q===o)return true;return false};
    // frame the camera on the target (a player turns the view toward what they want to click); cleared after the click
    // (surface targets only: qaView takes its height from the island terrain, and the cavern lies offshore below it)
    if(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.qaView)HolmArrivalQA.qaView(pt[0],pt[2],pt[1]>-5?undefined:new THREE.Box3().setFromObject(o).min.y);
    for(const [yaw,pitch,dist] of [[d>.5?Math.atan2(dx,dz):0,1.1,Math.max(10,d*1.5)],[0,1.3,12],[Math.PI/2,1.3,12],[Math.PI,1.3,12],[-Math.PI/2,1.3,12]]){
      camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist;await sleep(1300);
      const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera),cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
      for(let r=0;r<=120;r+=4)for(let a=0;a<360;a+=(r?15:360)){const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
        if(x<0||y<0||x>=rect.width||y>=rect.height||document.elementFromPoint(x,y)!==renderer.domElement)continue;if(owns(pick({clientX:x,clientY:y})))return [x,y]}}
    const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera),cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top,top=document.elementFromPoint(Math.round(cx),Math.round(cy)),h=pick({clientX:cx,clientY:cy});
    window.__clickDiag={name,pt:pt.map(v=>+v.toFixed(2)),screen:[Math.round(cx),Math.round(cy)],rect:[rect.width,rect.height],cover:top&&(top.id||top.className||top.tagName),pick:h&&h.obj.name,player:[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(2)),cam:camera.position.toArray().map(v=>+v.toFixed(1))};
    return null},name);
  if(!xy){console.log('    clickNamed diag '+JSON.stringify(await page.evaluate(()=>window.__clickDiag)));await shot(page,'zz_click_'+name);await page.evaluate(()=>HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear());return {error:'not clickable '+name}}
  await press(page,xy);await page.evaluate(()=>HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear());return {ok:true};
}
async function clickButtonText(page,sel,text){await page.waitForFunction((sel,text)=>Array.from(document.querySelectorAll(sel)).some(x=>(x.textContent.trim()===text||x.title===text)&&x.getBoundingClientRect().width>0),{timeout:20000},sel,text).catch(()=>{});const xy=await page.evaluate((sel,text)=>{const b=Array.from(document.querySelectorAll(sel)).find(x=>x.textContent.trim()===text||x.title===text);if(!b)return null;const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]},sel,text);
  if(!xy)return false;await page.mouse.click(xy[0],xy[1]);await sleep(600);return true}
const waitFor=(page,fn,arg,ms)=>page.waitForFunction(fn,{timeout:ms||60000},arg).then(()=>true).catch(()=>false);
async function clickInventory(page,itemId){
  const idx=await page.evaluate(id=>{try{document.querySelector('.tab-btn[data-tab="inv"]').click()}catch(e){}UI.refreshInv();return Player.inv.findIndex(s=>s&&s.id===id)},itemId);
  if(idx<0)return false;const sel='#inv-grid .inv-slot:nth-child('+(idx+1)+')';
  await page.waitForSelector(sel,{visible:true,timeout:5000});await page.click(sel);await sleep(700);return true;
}
async function closeDialogue(page){await page.keyboard.press('Escape').catch(()=>{});await sleep(300);await page.evaluate(()=>{try{if(UI.closeDialogue)UI.closeDialogue()}catch(e){}});}
const count=(page,id)=>page.evaluate(id=>Player.count(id),id);
function diagonal(tr){const off=v=>Math.abs(v-Math.floor(v)-.5)>.03;return tr.filter(q=>off(q[0])&&off(q[2])).length;}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));const consoleErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,300))});
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:120000});await enter(page);
    const boot=await page.evaluate(()=>({provider:CRWorldMode.providerId,stats:HolmArrivalQA.islandStats(),roots:scene.children.filter(o=>/^island-/.test(o.name)).length}));
    ok('boots the island draft with the composed graph and the Blender buildings, habitat and bridges',boot.provider==='tutors-holm-arrival-qa'&&boot.stats&&boot.stats.nodes>10000&&boot.roots>=40,boot);
    await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120);});
    // owner rule: every clickable thing on the island is a purposely designed Blender model (no code-built stand-ins,
    // no leftovers from the old island); invisible hit boxes behind small stations are allowed
    {const au=await page.evaluate(()=>{const PRIM=/^(Box|Cylinder|Sphere|Cone|Torus|Icosahedron|Plane|Circle|Ring|Octahedron|Dodecahedron|Tetrahedron|Capsule|Lathe|Extrude|Shape|Tube)(Buffer)?Geometry$/;
      const island=o=>{for(let q=o;q;q=q.parent){const n=q.name||'';if(/^(island-|Keep_|Kitchen_|Lodge_|Survival_|Quarry_|Bank_|Mage_|Haven_|Lastlight_|Cavern_|ground-chunk-|guide-marker|beacon)/.test(n))return true;const u=q.userData||{};if(u.islandService||u.islandGround||u.arrivalSurface||u.islandGate||u.islandTutor||u.islandSign||u.islandLesson||/^arrival_|^npc$/.test(u.kind||''))return true}return false};
      let left=[],prim=[];WORLD.clickables.forEach(r=>{if(!island(r))left.push(r.userData.kind||r.name);r.traverse(m=>{if(!m.isMesh)return;const inv=!m.visible||[].concat(m.material).every(x=>x&&(x.visible===false||(x.transparent&&x.opacity===0)));if(PRIM.test(m.geometry.type)&&!inv)prim.push(r.name||r.userData.kind)})});
      return {clickables:WORLD.clickables.length,leftovers:left.slice(0,8),leftoverCount:left.length,visiblePrimitives:prim.slice(0,8)}});
     ok('every clickable on the island is an authored Blender model (no code-built stand-ins, no old-island leftovers)',au.leftoverCount===0&&au.visiblePrimitives.length===0,au);}
    await shot(page,'01_dock');
    const bridges=JSON.parse(fs.readFileSync(path.join(__dirname,'..','docs/rebuild/holm-overhaul/island-bridges.json'),'utf8')).bridges;
    const timber=bridges.find(b=>/timber/.test(b.id));
    const onlyNew=/^m(44|51)$/.test(process.env.ISLAND_QA_ONLY||''),onlyLessons=process.env.ISLAND_QA_ONLY==='m51';
    if(!onlyNew){
    // M5.2a/b: a fresh adventurer runs the 18-lesson island curriculum and meets shut doors, 2004-style
    {const g0=await page.evaluate(()=>({v:Tutorial.curriculumVersion,n:Tutorial.steps.length,lesson:Tutorial.steps[Tutorial.step].id,targets:Tutorial.steps.filter(s=>s.target).length,route:!!HolmArrivalQA.qaRoute('bakehouse','oven')}));
     const chat0=await page.evaluate(()=>{const out=[];const ch=UI.chat;UI.chat=function(t){out.push(t);return ch.apply(this,arguments)};let m=null;scene.getObjectByName('island-gate-bakehouse-door').traverse(o=>{if(!m&&o.isMesh)m=o});handleClick(m,m.getWorldPosition(new THREE.Vector3()));UI.chat=ch;return out});
     ok('M5.2a: the island runs the 18-lesson curriculum (v6), every lesson with an arrow at its station',g0.v===6&&g0.n===18&&g0.lesson==='study_route'&&g0.targets===18,g0);
     ok('M5.2b: the bakehouse door is shut for a new adventurer and says why',!g0.route&&chat0.some(c=>/bakehouse door is barred/.test(c)),{route:g0.route,chat:chat0});
     await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish']);await sleep(2500);
     const g1=await page.evaluate(()=>({route:!!HolmArrivalQA.qaRoute('bakehouse','oven'),open:HolmIslandGates.isOpen('bakehouse-door'),lodge:HolmIslandGates.isOpen('lodge-door'),lesson:Tutorial.steps[Tutorial.step].id}));
     ok('M5.2b: with the survival lessons done the bakehouse door opens (the Quest Lodge stays shut)',g1.route&&g1.open&&!g1.lodge&&g1.lesson==='bake_bread',g1);}
    // 1. dock -> bakehouse courtyard, over the timber bridge
    let tr=[];let r=await walkTo(page,'bakehouse','entrance',true,tr);
    const onDeck=tr.filter(q=>timber.tiles.some(t=>Math.floor(q[0])===t[0]&&Math.floor(q[2])===t[1])&&Math.abs(q[1]-timber.deckY)<.12).length;
    ok('walks from the dock across the timber teaching bridge on its deck',onDeck>3,{deckSamples:onDeck,deckY:timber.deckY});
    ok('reaches the bakehouse courtyard entrance',!r.error&&r.reached&&Math.hypot(r.at[0]-r.reached.x,r.at[2]-r.reached.z)<.6,r);
    ok('every step on the way is cardinal',diagonal(tr)===0,{samples:tr.length,diagonal:diagonal(tr)});
    await shot(page,'02_bakehouse');
    // M4.2 bread lesson in the Blender bakehouse, every station by a real click on its authored mesh
    await page.evaluate(()=>{Player.inv=Player.inv.map(s=>s&&['bread','bread_dough','bucket','bucket_flour','bucket_water','dough'].includes(s.id)?null:s);UI.refreshInv()});
    let step=await clickService(page,'Take bucket');
    const inside=await page.evaluate(()=>{const k=scene.getObjectByName('island-building-bakehouse');let roof=null;k.traverse(o=>{if(o.isMesh&&roof===null){for(let q=o;q;q=q.parent)if(/^Kitchen_Roof_/.test(q.name)){roof=o.visible;break}}});return {roof,pose:[player.position.x,player.position.y,player.position.z]}});
    ok('the bucket rack walks the player inside the bakehouse and the roof cuts away',!step.error&&inside.roof===false,{step,inside});
    await clickService(page,'Take bucket');
    ok('two buckets from the rack',await count(page,'bucket')===2,{buckets:await count(page,'bucket')});
    const lastChat=()=>page.evaluate(()=>Array.from(document.querySelectorAll('#chat-log div, #chat div')).slice(-2).map(d=>d.textContent.slice(0,120)));
    for(const l of ['Fill bucket with flour','Fill bucket with water','Take dough']){const r=await clickService(page,l);console.log('    '+l+' '+JSON.stringify(r)+' '+JSON.stringify(await lastChat())+' at '+JSON.stringify(await pos(page)))}
    const got={flour:await count(page,'bucket_flour'),water:await count(page,'bucket_water'),dough:await count(page,'dough')};
    ok('flour from the pantry, water from the butt, dough from the proving bowl',got.flour===1&&got.water===1&&got.dough===1,got);
    await clickInventory(page,'dough');if(await count(page,'bread_dough')<1){await clickInventory(page,'bucket_flour');await clickInventory(page,'dough');}
    ok('kneads bread dough in the pack',await count(page,'bread_dough')>=1,{bread_dough:await count(page,'bread_dough')});
    await clickInventory(page,'bread_dough');step=await clickService(page,'Cook');
    await page.waitForFunction(()=>Player.count('bread')>0,{timeout:20000}).catch(()=>{});
    const baked=await page.evaluate(()=>({bread:Player.count('bread'),optional:!!(Tutorial.optional&&Tutorial.optional.bake_bread)}));
    ok('bakes the loaf at the Blender oven and the bread lesson is credited',baked.bread>=1&&baked.optional,{step,baked});
    await closeDialogue(page);await shot(page,'02b_baked');
    // 2. on to the Quest Lodge approach
    tr=[];r=await walkTo(page,'lodge','board',true,tr);
    ok('walks on to the Quest Lodge approach',!r.error&&Math.hypot(r.at[0]-35.5,r.at[2]-53)<3.5,r);
    await shot(page,'03_lodge');
    // M4.2 quest board inside the Blender Quest Lodge
    step=await clickService(page,'Study quest board');
    const lodge=await page.evaluate(()=>({dialogue:!!document.querySelector('#dialogue:not([style*="display: none"]),.dialogue-box:not([style*="display: none"])'),status:HolmQuestLodge.status(),pose:[player.position.x,player.position.z]}));
    ok('walks into the Quest Lodge and studies the quest board',!step.error&&Math.hypot(lodge.pose[0]-31.5,lodge.pose[1]-53.5)<1.2,{step,lodge});
    await closeDialogue(page);await shot(page,'03b_board');
    // 3. across the island to the Warden's Keep gate
    tr=[];r=await walkTo(page,'keep','gate',true,tr);
    ok('crosses the island to the Warden\'s Keep gate',!r.error&&r.reached&&Math.hypot(r.at[0]-r.reached.x,r.at[2]-r.reached.z)<.6&&diagonal(tr)===0,{...r,diagonal:diagonal(tr)});
    await shot(page,'04_keep');
    }
    // the building visits and lesson stations below revisit every area: record the whole curriculum as done (QA only)
    await page.evaluate(()=>HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds));await sleep(1500);
    // every gate is now open (they never close); keep the tutorial running (all but the last lesson) so the game's
    // credit hooks, which stand down once the tutorial is complete, still fire for the stations below
    const keepRunning=()=>page.evaluate(()=>HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice(0,-1)));await keepRunning();
    // M5.1: every lesson's Tutorial.notify event is recorded so credit wiring is proven, not just items
    await page.evaluate(()=>{window.__notes=[];const n=Tutorial.notify.bind(Tutorial);Tutorial.notify=function(ev,m){window.__notes.push(ev+'/'+m);return n(ev,m)}});
    // M4.4: the five new Blender buildings, each reached on foot and its key station clicked like a player
    const stanceOf=(b,t)=>page.evaluate((b,t)=>{const r=HolmArrivalQA.qaRoute(b,t);return r?r[r.length-1]:null},b,t);
    const near=async(b,t,tol)=>{const s=await stanceOf(b,t),p=await pos(page);return !!s&&Math.hypot(p[0]-s.x,p[2]-s.z)<(tol||.6)&&Math.abs(p[1]-s.y)<.35};
    const visit=async(b,entryTarget,label,target,extra,enter,walkOnly)=>{const tr2=[];const w=await walkTo(page,b,entryTarget,true,tr2);if(enter)await enter();
      const c=walkOnly?await walkTo(page,b,target,false,[]):await clickService(page,label);
      await shot(page,'05_'+b);const at=await pos(page);const ok2=!w.error&&!c.error&&await near(b,target,.6);return {ok:ok2,walk:w.error||'ok',click:c.error||'ok',at,diagonal:diagonal(tr2),...(extra?await extra():{})}};
    if(!onlyLessons){
    let v=await visit('bank','entrance','Use bank counter','counter',()=>page.evaluate(()=>({bankOpen:(document.getElementById('bank-modal')||{style:{}}).style.display==='block'})));
    ok('Bank: walks in and the teller counter opens the bank',v.ok&&v.bankOpen&&v.diagonal===0,v);
    await page.evaluate(()=>{try{UI.closeModal('bank-modal')}catch(e){}});
    // like a player: walk in through the west door first (roofs cut away once inside), then the telescope is in sight
    v=await visit('mage','entrance','Telescope','observatory',null,async()=>{const t2=[];await walkTo(page,'mage','runes',false,t2)});ok('Mage tower: climbs both stairs to the telescope in the observatory',v.ok&&v.at[1]>11.5,v);
    v=await visit('haven','shore','Ferry','boat');ok('Departure Haven: walks the pier down to the ferry on the landing stage',v.ok&&v.at[0]>134,v);
    v=await visit('quarry','approach','Climb-down shaft ladder','shaft',null,null,true);v.shaftTiles=await(async()=>{const s=await stanceOf('quarry','shaft');return s?+Math.hypot(v.at[0]-s.x,v.at[2]-s.z).toFixed(2):null})();
    ok('Quarry Gate: walks through the portal to the shaft mouth',v.walk==='ok'&&v.click==='ok'&&v.shaftTiles!==null&&v.shaftTiles<=1.05,v);
    v=await visit('survival','trail','Fishing spot','fishing');ok('Survival camp: down the bank stair to the fishing stage',v.ok,v);
    // M4.4b Lastlight: in by the storm door, up three ladders (instant storey change, 2004 style) to the beacon lever, and back down
    {const w=await walkTo(page,'lastlight','door',true,[]);const y0=(await pos(page))[1],steps=[];
     for(const [label,which] of [['Repair stores','stores'],['Climb-up ladder','ladder1-foot'],['Climb-up ladder','ladder2-foot'],['Climb-up ladder','ladder3-foot'],['Pull beacon lever','lever']]){const c=await clickService(page,label,which);steps.push([which,c.error||'ok',...(await pos(page)).map(v=>+v.toFixed(2))])}
     await shot(page,'05_lastlight_top');const top=await pos(page);
     const lever=await page.evaluate(()=>{return HolmArrivalQA.qaStance('lastlight','lever')});
     ok('Lastlight: storm door, stores, all three ladders climbed by click, lever reached on the lantern deck',!w.error&&steps.every(s=>s[1]==='ok')&&top[1]>y0+5&&!!lever&&Math.hypot(top[0]-lever.x,top[2]-lever.z)<.6&&Math.abs(top[1]-lever.y)<.35,{walk:w.error||'ok',y0,steps,top,lever});
     const down=[];for(const which of ['ladder3-top','ladder2-top','ladder1-top']){const c=await clickService(page,'Climb-down ladder',which);down.push([which,c.error||'ok',...(await pos(page)).map(v=>+v.toFixed(2))])}
     ok('Lastlight: the beacon lever lights the lamp (beacon/lit credited)',await page.evaluate(()=>Player.lastlightLit===true&&window.__notes.some(n=>n==='beacon/lit')),{notes:await page.evaluate(()=>window.__notes.slice(-4))});
     const back=await pos(page);ok('Lastlight: all three ladders climbed back down to the ground floor',down.every(s=>s[1]==='ok')&&Math.abs(back[1]-y0)<1.2,{down,back});await keepRunning();}
    }
    // M5.1 lesson stations, all by real clicks: chop, light a fire, net a perch, cook it, down the quarry shaft ladder to the
    // cavern, mine copper and tin, smelt bronze, forge a dagger, back up the ladder. The game's own systems do the work.
    {await page.evaluate(()=>{Player.inv=Player.inv.map(()=>null);['hatchet','tinderbox','fishing_net','pickaxe','hammer'].forEach(i=>Player.addItem(i,1));UI.refreshInv()});
     await clickInventory(page,'hatchet');const L={};const note=e=>page.evaluate(e=>window.__notes.includes(e),e);
     let c=await clickNamed(page,'island-lesson-survival-oak-1');L.chop=c.error||(await waitFor(page,()=>Player.count('logs')>0,null,120000))&&await note('gather/logs');
     const p0=await pos(page);await clickInventory(page,'tinderbox');await clickInventory(page,'logs');
     L.fire=(await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,20000))&&await note('firemake/fire');await sleep(1500);const p1=await pos(page);
     // off the fire tile by exactly one cardinal step (west unless blocked, as in the live game)
     L.stepWest=Math.abs(Math.abs(p1[0]-p0[0])+Math.abs(p1[2]-p0[2])-1)<.05;
     await walkTo(page,'survival','fishing',false,[]);await clickInventory(page,'fishing_net');c=await clickNamed(page,'island-lesson-survival-perch');L.fish=c.error||(await waitFor(page,()=>Player.count('raw_perch')>0,null,150000))&&await note('gather/raw_perch');
     // a teaching fire lasts 150 s; if it burnt out during the fishing trip, chop another oak and light a new one (lesson text says so)
     await walkTo(page,'survival','trail',true,[]);
     if(!await page.evaluate(()=>!!scene.getObjectByName('island-campfire'))){L.relit=true;await clickNamed(page,'island-lesson-survival-oak-2');await waitFor(page,()=>Player.count('logs')>0,null,120000);
      await clickInventory(page,'tinderbox');await clickInventory(page,'logs');await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,20000);await sleep(1500)}
     L.cookTries=0;
     for(let k=0;k<6&&!(await note('cook/cooked_perch'));k++){L.cookTries++;
      if(!await page.evaluate(()=>Player.count('raw_perch')>0)){await walkTo(page,'survival','fishing',false,[]);await clickInventory(page,'fishing_net');await clickNamed(page,'island-lesson-survival-perch');
       await waitFor(page,()=>Player.count('raw_perch')>0,null,150000);await walkTo(page,'survival','trail',true,[])}
      if(!await page.evaluate(()=>!!scene.getObjectByName('island-campfire'))){await clickNamed(page,'island-lesson-survival-oak-2');await waitFor(page,()=>Player.count('logs')>0,null,120000);
       await clickInventory(page,'tinderbox');await clickInventory(page,'logs');await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,20000);await sleep(1500)}
      const before=await page.evaluate(()=>Player.count('cooked_perch')+Player.count('burnt_perch'));
      c=await clickNamed(page,'island-campfire');await waitFor(page,b=>Player.count('cooked_perch')+Player.count('burnt_perch')>b,before,120000)}
     L.cook=await note('cook/cooked_perch');
     L.cookNote=await page.evaluate(()=>window.__notes.filter(n=>n.indexOf('cook/')===0));
     await shot(page,'06_survival_lessons');
     await walkTo(page,'quarry','approach',true,[]);c=await clickService(page,'Climb-down shaft ladder','shaft');L.descend=c.error||(await waitFor(page,()=>player.position.y<-20,null,150000))&&await note('descend/cave');
     c=await clickNamed(page,'island-lesson-cavern-copper-1');L.copper=c.error||(await waitFor(page,()=>Player.count('copper_ore')>0,null,90000))&&await note('gather/copper_ore');
     c=await clickNamed(page,'island-lesson-cavern-tin-1');L.tin=c.error||(await waitFor(page,()=>Player.count('tin_ore')>0,null,90000))&&await note('gather/tin_ore');
     await shot(page,'07_cavern');
     await walkTo(page,'cavern','furnace',false,[]);c=await clickNamed(page,'island-lesson-furnace');await sleep(3500);await clickButtonText(page,'#dialogue-modal button','Smelt a Bronze bar.');
     L.smelt=c.error||(await waitFor(page,()=>Player.count('bronze_bar')>0,null,30000))&&await note('smelt/bar');
     await walkTo(page,'cavern','anvil',false,[]);c=await clickNamed(page,'island-lesson-anvil');await sleep(3500);await clickButtonText(page,'#smith-grid-overlay div[title]','Bronze dagger');
     L.smith=c.error||(await waitFor(page,()=>Player.count('bronze_dagger')>0,null,30000))&&await note('smith/forged');
     await shot(page,'08_forge');
     c=await clickService(page,'Climb-up ladder','ladder');L.up=c.error||(await waitFor(page,()=>player.position.y>0,null,60000));
     ok('M5.1 survival lessons on the island: chop, light a fire (step west on the graph), net a perch, cook it',L.chop===true&&L.fire===true&&L.stepWest&&L.fish===true&&L.cook===true&&L.cookNote.length>0,L);
     ok('M5.1 cavern lessons: shaft ladder down (descend/cave), mine copper and tin, smelt bronze, forge a dagger, ladder back up',L.descend===true&&L.copper===true&&L.tin===true&&L.smelt===true&&L.smith===true&&L.up===true,L);}
    // M5.3 combat trials on practice grubkins (Blender-rigged), by real clicks: dagger in the keep court, shortbow from
    // range, Wind Strike by the mage tower; each kill credits its style through the game's npcKilled hook
    {const T={};const note=e=>page.evaluate(e=>window.__notes.includes(e),e);
     T.spawned=await page.evaluate(()=>HolmIslandTrials.npcs().map(n=>n.islandPen));
     const live=pen=>page.evaluate(pen=>{const n=HolmIslandTrials.npcs().find(n=>!n.dead&&n.islandPen===pen);return n?n.mesh.name:null},pen);
     // a grubkin can shuffle between aiming and clicking; like a player, click again until it is the target
     const attack=async(pen,opts)=>{let c={error:'no live grubkin'};for(let i=0;i<4;i++){c=await clickNamed(page,await live(pen),opts);if(!c.error&&await waitFor(page,()=>!!Player.target,null,6000))return c;await closeDialogue(page)}return c.error?c:{error:'never became the target'}};
     await page.evaluate(()=>{Player.inv=Player.inv.map(()=>null);['bronze_dagger','worn_bow'].forEach(i=>Player.addItem(i,1));Player.addItem('arrows',30);Player.addItem('air_rune',15);Player.addItem('mind_rune',15);UI.refreshInv()});
     await clickInventory(page,'bronze_dagger');let c=await attack('keep-court');T.melee=c.error||await waitFor(page,()=>window.__notes.includes('killStyle/melee'),null,150000);
     await shot(page,'09_melee_trial');
     await clickInventory(page,'worn_bow');c=await attack('keep-court');T.ranged=c.error||await waitFor(page,()=>window.__notes.includes('killStyle/ranged'),null,90000);
     T.arrowsUsed=30-await page.evaluate(()=>Player.count('arrows'));
     // Escape (used to close dialogues) also cancels autocast: close first, then choose Wind Strike, then click
     await closeDialogue(page);await page.evaluate(()=>{if(Player.spell!=='wind_strike')Player.selectSpell('wind_strike')});c=await attack('mage-yard',{keepDialogs:true});T.magic=c.error||await waitFor(page,()=>window.__notes.includes('killStyle/magic'),null,150000);
     T.runesUsed=15-await page.evaluate(()=>Player.count('air_rune'));await page.evaluate(()=>{try{if(Player.spell==='wind_strike')Player.selectSpell('wind_strike')}catch(e){}});await shot(page,'10_magic_trial');
     ok('M5.3 combat trials: practice grubkins in the keep court and the mage yard; melee, ranged and Wind Strike kills credit their styles',
      T.spawned.filter(p=>p==='keep-court').length>=2&&T.spawned.includes('mage-yard')&&T.melee===true&&T.ranged===true&&T.magic===true&&T.arrowsUsed>0&&T.runesUsed>0,T);}
    // 4. reload restores the spot on the island graph
    await page.evaluate(()=>SaveGame.save());const before=await pos(page);
    await page.reload({waitUntil:'load'});try{await enter(page)}catch(e){console.log('    reload console errors: '+JSON.stringify(consoleErrors.slice(-6)));throw e}const after=await pos(page);
    ok('reload restores the island position',Math.hypot(after[0]-before[0],after[2]-before[2])<.6,{before,after});
    ok('zero page errors',pageErrors.length===0,{pageErrors});
  }catch(e){ok('driver completed',false,{error:String(e).slice(0,400)});await shot(page,'zz_error');}
  finally{
    const pass=checks.every(c=>c.ok);
    fs.writeFileSync(path.join(OUT,'qa_result.json'),JSON.stringify({pass,checks,seconds:Math.round((Date.now()-t0)/1000)},null,2));
    console.log('[ISLAND QA] '+(pass?'PASS':'FAIL')+' '+checks.filter(c=>c.ok).length+'/'+checks.length+' in '+Math.round((Date.now()-t0)/1000)+'s');
    await browser.close();process.exit(pass?0:1);
  }
})();
