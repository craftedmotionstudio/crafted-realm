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
    if(route.length<=1){reached=route[0];break}
    let clicked=false;
    for(const ahead of [9,7,5,3,1]){
      const n=route[Math.min(route.length-1,ahead)];
      const xy=await aim(page,[n.x,n.y,n.z],[Math.floor(n.x),Math.floor(n.z)]);
      if(xy){await press(page,xy);clicked=true;break;}
    }
    if(!clicked)return {error:'no clickable tile ahead',at:await pos(page)};
    await settle(page,30000);trace.push(...await page.evaluate(()=>window.__qaTrace.splice(0)));
  }
  return {reached,at:await pos(page)};
}
// Cardinal movement keeps x or z on a tile-centre line at every instant; a diagonal step leaves both off-centre.
function diagonal(tr){const off=v=>Math.abs(v-Math.floor(v)-.5)>.03;return tr.filter(q=>off(q[0])&&off(q[2])).length;}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:120000});await enter(page);
    const boot=await page.evaluate(()=>({provider:CRWorldMode.providerId,stats:HolmArrivalQA.islandStats(),roots:scene.children.filter(o=>/^island-/.test(o.name)).length}));
    ok('boots the island draft with the composed graph and the Blender buildings, habitat and bridges',boot.provider==='tutors-holm-arrival-qa'&&boot.stats&&boot.stats.nodes>10000&&boot.roots>=40,boot);
    await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120);});
    await shot(page,'01_dock');
    const bridges=JSON.parse(fs.readFileSync(path.join(__dirname,'..','docs/rebuild/holm-overhaul/island-bridges.json'),'utf8')).bridges;
    const timber=bridges.find(b=>/timber/.test(b.id));
    // 1. dock -> bakehouse courtyard, over the timber bridge
    let tr=[];let r=await walkTo(page,'bakehouse','entrance',true,tr);
    const onDeck=tr.filter(q=>timber.tiles.some(t=>Math.floor(q[0])===t[0]&&Math.floor(q[2])===t[1])&&Math.abs(q[1]-timber.deckY)<.12).length;
    ok('walks from the dock across the timber teaching bridge on its deck',onDeck>3,{deckSamples:onDeck,deckY:timber.deckY});
    ok('reaches the bakehouse courtyard entrance',!r.error&&r.reached&&Math.hypot(r.at[0]-r.reached.x,r.at[2]-r.reached.z)<.6,r);
    ok('every step on the way is cardinal',diagonal(tr)===0,{samples:tr.length,diagonal:diagonal(tr)});
    await shot(page,'02_bakehouse');
    // 2. on to the Quest Lodge approach
    tr=[];r=await walkTo(page,'lodge','board',true,tr);
    ok('walks on to the Quest Lodge approach',!r.error&&Math.hypot(r.at[0]-35.5,r.at[2]-53)<3.5,r);
    await shot(page,'03_lodge');
    // 3. across the island to the Warden's Keep gate
    tr=[];r=await walkTo(page,'keep','gate',true,tr);
    ok('crosses the island to the Warden\'s Keep gate',!r.error&&r.reached&&Math.hypot(r.at[0]-r.reached.x,r.at[2]-r.reached.z)<.6&&diagonal(tr)===0,{...r,diagonal:diagonal(tr)});
    await shot(page,'04_keep');
    // 4. reload restores the spot on the island graph
    await page.evaluate(()=>SaveGame.save());const before=await pos(page);
    await page.reload({waitUntil:'load'});await enter(page);const after=await pos(page);
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
