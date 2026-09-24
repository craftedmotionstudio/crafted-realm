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
async function clickService(page,label){
  const target=await page.evaluate(label=>{let c=null;scene.traverse(o=>{if(!c&&o.isMesh&&o.userData.islandService&&o.userData.islandService.label===label){const b=new THREE.Box3().setFromObject(o);c=b.getCenter(new THREE.Vector3()).toArray()}});return c},label);
  if(!target)return {error:'no service mesh '+label};
  const xy=await page.evaluate(async(pt,label)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));const dx=player.position.x-pt[0],dz=player.position.z-pt[2],d=Math.hypot(dx,dz);
    for(const [yaw,pitch,dist] of [[d>.5?Math.atan2(dx,dz):0,1.15,Math.max(12,d*1.6)],[0,1.3,14],[Math.PI/2,1.3,14],[Math.PI,1.3,14],[-Math.PI/2,1.3,14]]){
      camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist;await sleep(1300);
      const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera);
      const cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
      for(let r=0;r<=120;r+=4)for(let a=0;a<360;a+=(r?15:360)){const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
        if(x<0||y<0||x>=rect.width||y>=rect.height||document.elementFromPoint(x,y)!==renderer.domElement)continue;
        const h=pick({clientX:x,clientY:y});if(h&&h.obj.userData.islandService&&h.obj.userData.islandService.label===label)return [x,y];}
    }
    return null;
  },target,label);
  if(!xy)return {error:'service not clickable '+label};
  await press(page,xy);await settle(page,30000);await sleep(900);return {ok:true};
}
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
    await shot(page,'01_dock');
    const bridges=JSON.parse(fs.readFileSync(path.join(__dirname,'..','docs/rebuild/holm-overhaul/island-bridges.json'),'utf8')).bridges;
    const timber=bridges.find(b=>/timber/.test(b.id));
    const onlyNew=process.env.ISLAND_QA_ONLY==='m44';
    if(!onlyNew){
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
    // M4.4: the five new Blender buildings, each reached on foot and its key station clicked like a player
    const stanceOf=(b,t)=>page.evaluate((b,t)=>{const r=HolmArrivalQA.qaRoute(b,t);return r?r[r.length-1]:null},b,t);
    const near=async(b,t,tol)=>{const s=await stanceOf(b,t),p=await pos(page);return !!s&&Math.hypot(p[0]-s.x,p[2]-s.z)<(tol||.6)&&Math.abs(p[1]-s.y)<.35};
    const visit=async(b,entryTarget,label,target,extra,enter)=>{const tr2=[];const w=await walkTo(page,b,entryTarget,true,tr2);if(enter)await enter();const c=await clickService(page,label);
      await shot(page,'05_'+b);const at=await pos(page);const ok2=!w.error&&!c.error&&await near(b,target,.6);return {ok:ok2,walk:w.error||'ok',click:c.error||'ok',at,diagonal:diagonal(tr2),...(extra?await extra():{})}};
    let v=await visit('bank','entrance','Use bank counter','counter',()=>page.evaluate(()=>({bankOpen:(document.getElementById('bank-modal')||{style:{}}).style.display==='block'})));
    ok('Bank: walks in and the teller counter opens the bank',v.ok&&v.bankOpen&&v.diagonal===0,v);
    await page.evaluate(()=>{try{UI.openBank(false)}catch(e){}});
    // like a player: walk in through the west door first (roofs cut away once inside), then the telescope is in sight
    v=await visit('mage','entrance','Telescope','observatory',null,async()=>{const t2=[];await walkTo(page,'mage','runes',false,t2)});ok('Mage tower: climbs both stairs to the telescope in the observatory',v.ok&&v.at[1]>11.5,v);
    v=await visit('haven','shore','Ferry','boat');ok('Departure Haven: walks the pier down to the ferry on the landing stage',v.ok&&v.at[0]>134,v);
    v=await visit('quarry','approach','Quarry shaft','shaft');ok('Quarry Gate: walks through the portal to the shaft mouth',v.ok,v);
    v=await visit('survival','trail','Fishing spot','fishing');ok('Survival camp: down the bank stair to the fishing stage',v.ok,v);
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
