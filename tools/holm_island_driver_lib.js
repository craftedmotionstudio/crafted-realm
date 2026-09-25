/* Real-input helpers for driving the Tutor's Holm island draft in a headless browser (shared by
 * tools/qa_holm_island.js and tools/qa_holm_island_playthrough.js). Extracted verbatim from qa_holm_island.js:
 * every action is a page.mouse click on a pixel whose game pick() hits the intended target, or an inventory slot click;
 * the island's read-only QA helpers (HolmArrivalQA.qaRoute/qaStance/qaView) only choose where to click. */
'use strict';
const path=require('path'),fs=require('fs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let OUT=path.join(__dirname,'..','scratchpad','holm_island_playthrough');
function setOut(dir){OUT=dir;fs.mkdirSync(OUT,{recursive:true})}
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


module.exports={sleep,setOut,shot,enter,pos,settle,aim,press,walkTo,clickService,clickNamed,clickButtonText,waitFor,clickInventory,closeDialogue,count,diagonal};
