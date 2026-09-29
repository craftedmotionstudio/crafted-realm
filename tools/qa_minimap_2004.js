/* The 2004 minimap in the real game (holm-minimap-2004, owner 2026-09-29), real input on ?holmIsland=1:
 *  1 dots sit on their actors' tiles: every dot drawn is read back from the canvas and turned back into a world point with
 *    the drawn zoom and turn; it lands on its actor's tile (a standing actor exactly on the tile centre), and the pixel
 *    under it has the dot's colour; the island's walls, floors, icons and scenery are drawn;
 *  2 the wheel zooms the minimap only: a real wheel over the minimap steps the zoom (camera distance unchanged), a real
 *    wheel over the 3D view moves the camera (minimap zoom unchanged); the page does not scroll;
 *  3 a real click on the minimap walks to the tile under the cursor at the smallest, the default and the largest zoom;
 *  4 the chrome: the canvas is drawn at its displayed size (crisp), the compass turns with the camera, the cluster's empty
 *    box passes clicks on to the side-panel tabs, the minimap, orbs and run orb still take theirs;
 *  5 the chosen zoom survives a reload, and the minimap paints under the heaviest look (4c at the pixel slider's end);
 *  6 a pinch on a phone-sized touch screen zooms the minimap (the mobile layout);
 *  7 no page errors.
 * Run: SMOKE_BASE=http://127.0.0.1:8221 node tools/qa_minimap_2004.js   (captures: scratchpad/minimap_2004/qa/) */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const OUT=path.join(__dirname,'..','scratchpad','minimap_2004','qa');fs.mkdirSync(OUT,{recursive:true});L.setOut(OUT);
const PROFILE='mmqa-'+Date.now().toString(36);
const ROOT=(process.env.SMOKE_BASE||'http://127.0.0.1:8777');
const BASE=ROOT+'/?holmIsland=1&qaProfile='+PROFILE;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const checks=[],t0=Date.now();
function ok(label,cond,detail){checks.push({label,ok:!!cond,detail});console.log((cond?'  ok  ':'  FAIL ')+label+(detail?'  '+JSON.stringify(detail).slice(0,900):''));return !!cond}
async function shot(page,name){await page.screenshot({path:path.join(OUT,name+'.jpg'),type:'jpeg',quality:82}).catch(()=>{})}
async function mmShot(page,name){const r=await page.evaluate(()=>{const f=document.getElementById('minimap-frame').getBoundingClientRect();return {x:Math.max(0,f.x-14),y:Math.max(0,f.y-14),width:f.width+28,height:f.height+28}});
 r.width=Math.min(r.width,page.viewport().width-r.x);await page.screenshot({path:path.join(OUT,name+'.png'),clip:r}).catch(()=>{})}
// stand on the graph node nearest a point (the combat bench's read-only placement helper) and face north
async function placeNear(page,x,z,yaw){return page.evaluate((x,z,yaw)=>{const g=HolmArrivalQA.navGraph();let best=null,d=1e9;
 g.nodes.forEach(n=>{if(n.y<-5||/upper|Upper|stair|Stair/.test(n.surface))return;const k=Math.hypot(n.x-x,n.z-z);if(k<d){d=k;best=n}});
 const okp=best&&HolmArrivalQA.qaPlace(best.id);camCtl.yaw=yaw||0;return okp?{id:best.id,x:best.x,z:best.z}:null},x,z,yaw)}
const mmCentre=page=>page.evaluate(()=>{const r=document.getElementById('minimap').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
const zoomNow=page=>page.evaluate(()=>CRMinimap.zoom().ppt);
async function zoomTo(page,ppt){const c=await mmCentre(page);await page.mouse.move(c[0],c[1]);
 for(let i=0;i<12;i++){const z=await zoomNow(page);if(z===ppt)return true;await page.mouse.wheel({deltaY:z<ppt?-100:100});await sleep(160)}return (await zoomNow(page))===ppt}
// every dot drawn, read back: its world point from the drawn position, the actor's tile, and the colour under it
const readDots=page=>page.evaluate(()=>{
 const c=document.getElementById('minimap'),x=c.getContext('2d'),z=CRMinimap.zoom(),k=c.width/MinimapCore.W,yaw=camCtl.yaw,px=player.position.x,pz=player.position.z;
 return CRMinimap.dots().map(d=>{const w=MinimapCore.toWorld(d.X/k,d.Y/k,px,pz,yaw,z.ppt),p=x.getImageData(Math.round(d.X),Math.round(d.Y),1,1).data;
  const core=MinimapCore.DOT_PAL[d.kind].c,n=parseInt(core.slice(1),16),want=[n>>16&255,n>>8&255,n&255],hl=MinimapCore.DOT_PAL[d.kind].h,m=parseInt(hl.slice(1),16),want2=[m>>16&255,m>>8&255,m&255],
   sh=MinimapCore.DOT_PAL[d.kind].s,q=parseInt(sh.slice(1),16),want3=[q>>16&255,q>>8&255,q&255];
  const colourOk=[want,want2,want3].some(t=>t.every((v,i)=>Math.abs(v-p[i])<=6));
  return {kind:d.kind,name:d.name,actor:[d.x,d.z],back:[+w.x.toFixed(3),+w.z.toFixed(3)],err:+Math.hypot(w.x-d.x,w.z-d.z).toFixed(4),sameTile:Math.floor(w.x)===Math.floor(d.x)&&Math.floor(w.z)===Math.floor(d.z),
   onCentre:Math.abs(d.x-Math.floor(d.x)-.5)<.02&&Math.abs(d.z-Math.floor(d.z)-.5)<.02,colourOk,pixel:[p[0],p[1],p[2]]}})});

(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const pageErrors=[],mmErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&/minimap|MinimapCore|CRMinimap/i.test(m.text()))mmErrors.push(m.text().slice(0,300))});
 try{
  await page.goto(BASE,{waitUntil:'load',timeout:120000});
  await page.evaluate(()=>{try{localStorage.removeItem('cr_minimap_ppt')}catch(e){}});
  await page.reload({waitUntil:'load',timeout:120000});await L.enter(page);await sleep(2500);
  const boot=await page.evaluate(()=>({zoom:CRMinimap.zoom(),snap:CRMinimap.snapshot()}));
  ok('a new browser starts at 4 px a tile (2004: ~36 tiles across)',boot.zoom.ppt===4&&boot.zoom.tilesAcross===36,boot.zoom);
  // let the wall plan and the ground finish (a few ms a paint in the background)
  for(let i=0;i<40;i++){const s=await page.evaluate(()=>CRMinimap.snapshot());if(s.walls.done&&s.ground.chunks===s.ground.total&&s.icons>0)break;await sleep(500)}

  /* 1. dots on their tiles */
  {await placeNear(page,86.5,57.5,0);await sleep(2200);
   const s=await page.evaluate(()=>CRMinimap.snapshot()),d1=await readDots(page);await mmShot(page,'01_bank_dots');
   await placeNear(page,66.5,99.5,.8);await sleep(2200);const d2=await readDots(page);await mmShot(page,'02_guide_dots_turned');
   const all=d1.concat(d2),bad=all.filter(d=>!d.sameTile||d.err>.02||!d.colourOk),standing=all.filter(d=>d.onCentre);
   ok('dots: every dot drawn reads back to its actor\'s own tile (at the bank facing north, at the Guide House turned), in its colour',all.length>=4&&bad.length===0,{n:all.length,bad:bad.slice(0,5),sample:all.slice(0,4)});
   ok('dots: standing folk sit on their tile centres (Maud the teller, Guide Bram)',standing.length>=2&&all.some(d=>d.name==='maud')&&all.some(d=>d.name==='bram'),{standing:standing.map(d=>d.name||d.kind)});
   ok('the island map: tile colours, walls cut from the buildings, floors, map icons and scenery',s.walls.done&&s.walls.edges>200&&s.ground.chunks===s.ground.total&&s.icons>=10&&s.floorFill>0,{walls:s.walls,ground:s.ground,icons:s.icons,floorFill:s.floorFill});
   const icons=await page.evaluate(()=>CRMinimap.icons().map(i=>i.icon));
   ok('map icons: bank, range, quest, mining, magic, ferry, beacon, furnace, anvil, woodcutting, fishing and combat are placed',['bank','range','quest','mining','magic','ferry','beacon','furnace','anvil','woodcut','fishing','combat'].every(i=>icons.includes(i)),icons);}

  /* 2. the wheel zooms the minimap only */
  {await placeNear(page,61.5,112.5,0);await sleep(1200);
   const c=await mmCentre(page),before=await page.evaluate(()=>({dist:camCtl.dist,ppt:CRMinimap.zoom().ppt,scroll:[scrollX,scrollY]}));
   await page.mouse.move(c[0]+10,c[1]-8);await page.mouse.wheel({deltaY:-100});await sleep(300);
   const inOne=await page.evaluate(()=>({dist:camCtl.dist,ppt:CRMinimap.zoom().ppt,scroll:[scrollX,scrollY]}));
   await page.mouse.wheel({deltaY:100});await sleep(150);await page.mouse.wheel({deltaY:100});await sleep(300);
   const outTwo=await page.evaluate(()=>({dist:camCtl.dist,ppt:CRMinimap.zoom().ppt}));
   ok('wheel over the minimap: one notch in steps the minimap zoom, two out step it back past; the camera does not move and the page does not scroll',
    inOne.ppt===5&&outTwo.ppt===3.5&&Math.abs(inOne.dist-before.dist)<1e-9&&Math.abs(outTwo.dist-before.dist)<1e-9&&inOne.scroll.join()===before.scroll.join(),{before,inOne,outTwo});
   await page.mouse.move(640,420);const v0=await page.evaluate(()=>({dist:camCtl.dist,ppt:CRMinimap.zoom().ppt}));await page.mouse.wheel({deltaY:100});await sleep(400);
   const v1=await page.evaluate(()=>({dist:camCtl.dist,ppt:CRMinimap.zoom().ppt}));
   ok('wheel over the 3D view still moves the camera and leaves the minimap zoom alone',Math.abs(v1.dist-v0.dist)>1e-3&&v1.ppt===v0.ppt,{v0,v1});
   await page.mouse.wheel({deltaY:-100});await sleep(200);
   const lim=[];await zoomTo(page,8);await page.mouse.wheel({deltaY:-100});await sleep(200);lim.push(await zoomNow(page));await zoomTo(page,2);await page.mouse.wheel({deltaY:100});await sleep(200);lim.push(await zoomNow(page));
   ok('the wheel stops at the limits (8 px a tile in, 2 out)',lim[0]===8&&lim[1]===2,lim);}

  /* 3. a click on the minimap walks there, at every zoom */
  {const results=[];
   for(const [ppt,reach] of [[2,16],[4,9],[8,5]]){
    await placeNear(page,61.5,112.5,.5);await sleep(900);if(!await zoomTo(page,ppt)){results.push({ppt,error:'zoom'});continue}await sleep(500);
    // a reachable open tile about `reach` tiles away (the planner's own route says it is reachable)
    const target=await page.evaluate(reach=>{const g=HolmArrivalQA.navGraph(),px=player.position.x,pz=player.position.z;
     const c=g.nodes.filter(n=>n.surface==='land'&&Math.abs(Math.hypot(n.x-px,n.z-pz)-reach)<.8).sort((a,b)=>a.x-b.x);
     for(const n of c){const r=HolmArrivalQA.qaRouteTo(n.x,n.z);if(r&&r.length>2&&Math.hypot(r[r.length-1].x-n.x,r[r.length-1].z-n.z)<.1){const q=CRMinimap.worldToClient(n.x,n.z);if(q&&q.inDisc)return {x:n.x,z:n.z,client:q}}}
     return null},reach);
    if(!target){results.push({ppt,error:'no target'});continue}
    await page.mouse.click(Math.round(target.client.x*100)/100,Math.round(target.client.y*100)/100);await sleep(700);
    if(ppt===4)await mmShot(page,'03_walk_flag_route');
    await L.settle(page,30000);const at=await L.pos(page),clicked=await page.evaluate(()=>CRMinimap.snapshot().lastClickWorld);
    results.push({ppt,target:[target.x,target.z],clicked,at:[at[0],at[2]],tile:Math.floor(at[0])===Math.floor(target.x)&&Math.floor(at[2])===Math.floor(target.z)});
   }
   ok('a real minimap click walks to the tile under the cursor at 2, 4 and 8 px a tile',results.length===3&&results.every(r=>r.tile),results);}

  /* 4. the chrome */
  {await zoomTo(page,4);const ch=await page.evaluate(()=>{const c=document.getElementById('minimap'),r=c.getBoundingClientRect();
    const cl=(document.getElementById('mm-cluster')||c).getBoundingClientRect(),vis=Array.from(document.querySelectorAll('#side-panel .tab-btn')).filter(t=>t.getBoundingClientRect().width>0);
    // the tabs under the cluster's box (the old bug), else the whole top row
    let tabs=vis.filter(t=>{const b=t.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;return x>=cl.left&&x<=cl.right&&y>=cl.top&&y<=cl.bottom});
    if(!tabs.length){const top=Math.min.apply(null,vis.map(t=>t.getBoundingClientRect().top));tabs=vis.filter(t=>t.getBoundingClientRect().top<top+4)}
    const tabHits=tabs.map(t=>{const b=t.getBoundingClientRect(),e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !!(e&&(e===t||t.contains(e)))});
    const hit=id=>{const e=document.getElementById(id);if(!e)return null;const b=e.getBoundingClientRect(),h=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return !!(h&&(h===e||e.contains(h)))};
    const mid=document.elementFromPoint(r.left+r.width/2+r.width*.2,r.top+r.height/2);
    return {underCluster:vis.filter(t=>{const b=t.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;return x>=cl.left&&x<=cl.right&&y>=cl.top&&y<=cl.bottom}).length,backing:c.width,shown:+(r.width*devicePixelRatio).toFixed(2),zoom:typeof UIScale!=='undefined'?UIScale.value():1,tabs:tabs.length,tabHits,minimap:mid===c,run:hit('run-orb'),hp:hit('hp-orb'),compass:hit('compass-btn'),tip:c.getAttribute('data-tip')}});
   ok('crisp: the canvas is drawn at its displayed size in device pixels (UI zoom x pixel ratio)',Math.abs(ch.backing-ch.shown)<=1&&ch.backing>200,ch);
   ok('the cluster box passes clicks to the side-panel tabs beneath it; the minimap, orbs, run orb and compass take their own',ch.tabHits.length>0&&ch.tabHits.every(Boolean)&&ch.minimap&&ch.run&&ch.hp&&ch.compass,ch);
   ok('the minimap tip names the wheel and the distance',/Scroll to zoom \(36 tiles across\)/.test(ch.tip||''),ch.tip);
   const y0=await page.evaluate(()=>{camCtl.yaw=1.2;drawMinimap();return document.querySelector('#compass-btn .compass-face').style.transform});
   ok('the compass turns with the camera',/rotate\(68\.8deg\)/.test(y0),y0);await page.evaluate(()=>{camCtl.yaw=0});}

  /* 5. the zoom survives a reload; the heaviest look */
  {await zoomTo(page,6);await page.evaluate(()=>SaveGame.save());
   await page.goto(BASE+'&look=4c&lookLines=max',{waitUntil:'load',timeout:120000});await L.enter(page);await sleep(3000);
   const r=await page.evaluate(()=>{const c=document.getElementById('minimap'),x=c.getContext('2d'),p=x.getImageData(c.width>>1,(c.width>>1)+Math.round(c.width*.2),1,1).data;
    return {ppt:CRMinimap.zoom().ppt,look:typeof HolmLookV4!=='undefined'&&HolmLookV4.get?HolmLookV4.get():null,painted:p[3]===255,static:CRMinimap.snapshot().staticBuilds,backing:c.width,shown:+(c.getBoundingClientRect().width*devicePixelRatio).toFixed(2)}});
   await mmShot(page,'04_look4c_pixels_max');await shot(page,'04_look4c_full');
   ok('the chosen zoom (6 px a tile) survives a reload',r.ppt===6,r);
   ok('under look 4c at the pixel slider\'s end the minimap still paints at its own crisp size',r.painted&&r.static>=1&&Math.abs(r.backing-r.shown)<=1,r);}

  /* 6. pinch on a phone */
  {const ph=await browser.newPage();ph.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));
   await ph.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
   await ph.goto(ROOT+'/?holmIsland=1&qaProfile='+PROFILE+'ph',{waitUntil:'load',timeout:120000});await L.enter(ph);await sleep(2500);
   await ph.evaluate(()=>CRMinimap.setZoom(4));
   const c=await ph.evaluate(()=>{const r=document.getElementById('minimap').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,backing:document.getElementById('minimap').width}});
   const cdp=await ph.target().createCDPSession(),pts=d=>[{x:c.x-d,y:c.y,id:1},{x:c.x+d,y:c.y,id:2}];
   const dist0=await ph.evaluate(()=>camCtl.dist);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(10)});
   for(let d=12;d<=40;d+=4){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(d)});await sleep(30)}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(400);
   const after=await ph.evaluate(()=>({ppt:CRMinimap.zoom().ppt,dist:camCtl.dist}));
   await ph.screenshot({path:path.join(OUT,'05_phone_pinch.jpg'),type:'jpeg',quality:82});
   ok('a pinch on the phone\'s minimap zooms it in (the camera stays put); the phone minimap is drawn at its own size',after.ppt===8&&Math.abs(after.dist-dist0)<1e-9&&Math.abs(c.backing-c.w*2)<=1,{c,dist0,after});
   await ph.close();}

  ok('zero page errors, no minimap errors in the console',pageErrors.length===0&&mmErrors.length===0,{pageErrors,mmErrors});
 }catch(e){ok('driver completed',false,{error:String(e&&e.stack||e).slice(0,500)});await shot(page,'zz_error')}
 finally{
  const pass=checks.every(c=>c.ok);
  fs.writeFileSync(path.join(OUT,'qa_result.json'),JSON.stringify({pass,checks,seconds:Math.round((Date.now()-t0)/1000)},null,2));
  console.log('[MINIMAP QA] '+(pass?'PASS':'FAIL')+' '+checks.filter(c=>c.ok).length+'/'+checks.length+' in '+Math.round((Date.now()-t0)/1000)+'s');
  await browser.close();process.exit(pass?0:1);
 }
})();
