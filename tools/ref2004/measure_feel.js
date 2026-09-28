/* Our game only: the numbers behind REF2004_FEEL_REPORT.md items 1 (camera), 2 (pace), 7 (UI scale), 9 (skill timing),
 * measured on a fresh adventurer on Tutor's Holm, so a change can be shown before / after without the 2004 stack.
 *   node tools/ref2004/measure_feel.js --tag before [--only camera,pace,ui,skills]   (REF_OURS_BASE=http://127.0.0.1:8096)
 * -> scratchpad/ref2004_feel/<tag>/feel.json + screenshots (our game only; no 2004 imagery is read or written here).
 * The 2004 targets it is read against (all measured numbers from the report): camera elevation 22.5 deg, boom 7.7 tiles,
 * vertical FOV 36.1 deg, player ~31% of the view height; walk 1.67 / run 3.33 tiles/s; type 2.4% of the window height;
 * chop 0.78 s, net 1.80 s, cook 1.77 s, bake 2.43 s, smelt 2.42 s, fire-lighting kneel ~4 s. */
'use strict';
const fs=require('fs'),path=require('path');
const C=require('./lib/common');
const L=require('../holm_island_driver_lib.js');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d};
const TAG=arg('tag','now'),ONLY=(arg('only','camera,pace,ui,skills')).split(',');
const OUT=path.join(C.REPO,'scratchpad','ref2004_feel',TAG);fs.mkdirSync(OUT,{recursive:true});
const TARGET={camera:{elevDeg:22.5,boomTiles:7.69,vfov:36.13,lookLift:0.39,playerShare:0.31},pace:{walk:1/0.6,run:2/0.6},
  ui:{typeShare:0.024},skills:{chop:0.78,net:1.80,cook:1.77,bake:2.43,smelt:2.42,firemakeKneel:4.0}};

async function boot(browser,w,h,profile){
  const page=await browser.newPage();await page.setViewport({width:w,height:h});
  page.on('pageerror',e=>C.log('[page error]',String(e.message||e).slice(0,160)));
  await page.goto(C.OURS+'/?qaProfile='+(profile||('feel-'+Date.now().toString(36))),{waitUntil:'load',timeout:180000});
  await L.enter(page);await page.mouse.move(w-4,h-4);await C.sleep(2500);
  return page;
}

// the follow camera as it stands: elevation of the view ray, boom to the look point, FOV, look height, player share
async function camera(page){
  return page.evaluate(()=>{
    const P=player.position,c=camera.position,dir=new THREE.Vector3();camera.getWorldDirection(dir);
    // look point: the point on the view ray nearest the player's vertical axis
    const hx=dir.x,hz=dir.z,hh=hx*hx+hz*hz,t=hh>1e-9?((P.x-c.x)*hx+(P.z-c.z)*hz)/hh:0,look=c.clone().addScaledVector(dir,t);
    const bb=new THREE.Box3();player.updateMatrixWorld(true);player.traverse(o=>{if((o.isMesh||o.isSkinnedMesh)&&o.visible&&!o.isSprite)bb.expandByObject(o)});
    const r=renderer.domElement.getBoundingClientRect(),pr=v=>{const p=v.clone().project(camera);return (1-p.y)/2*r.height};
    const feet=pr(new THREE.Vector3(P.x,bb.min.y,P.z)),head=pr(new THREE.Vector3(P.x,bb.max.y,P.z));
    return {elevDeg:+(Math.atan2(-dir.y,Math.hypot(dir.x,dir.z))*180/Math.PI).toFixed(2),boomTiles:+c.distanceTo(look).toFixed(2),vfov:+camera.fov.toFixed(2),
      lookLift:+(look.y-P.y).toFixed(2),playerHeightTiles:+(bb.max.y-bb.min.y).toFixed(3),playerPx:+(feet-head).toFixed(1),viewPx:r.height,
      playerShare:+((feet-head)/r.height).toFixed(3),camCtl:{yaw:+camCtl.yaw.toFixed(4),pitch:+camCtl.pitch.toFixed(4),dist:+camCtl.dist.toFixed(3)}};
  });
}

// walk / run along a straight open lane near the spawn; steady speed from the sampled path (tiles per second)
async function pace(page){
  // a straight 16-tile lane of open ground: walk the first half, run the second, both forward (the dock's graph
  // does not always walk back onto the spawn tile)
  const lane=await page.evaluate(n=>{const P=player.position,x0=Math.floor(P.x)+.5,z0=Math.floor(P.z)+.5;
    for(let r=0;r<14;r++)for(let a=0;a<8;a++){const ox=Math.round(Math.cos(a*Math.PI/4)*r),oz=Math.round(Math.sin(a*Math.PI/4)*r);
      for(const [dx,dz,axis] of [[1,0,'x'],[-1,0,'x'],[0,1,'z'],[0,-1,'z']]){const ax=x0+ox,az=z0+oz,bx=ax+dx*n,bz=az+dz*n;
        const r1=computePath(P.x,P.z,ax,az);if(!r1.reached)continue;const r2=computePath(ax,az,bx,bz);if(!r2.reached)continue;
        if(r2.pts.length>=n&&r2.pts.every(p=>axis==='x'?Math.abs(p[1]-az)<.01:Math.abs(p[0]-ax)<.01))return {a:[ax,az],m:[ax+dx*n/2,az+dz*n/2],b:[bx,bz],axis,n}}}
    return null},16);
  if(!lane)return {error:'no straight lane'};
  const go=async(p,run)=>page.evaluate(async(p,run)=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));Player.runOn=run;Player.energy=100;
    const ok=orderWalk(new THREE.Vector3(p[0],0,p[1]));const s=[],t0=performance.now();
    while(performance.now()-t0<30000){s.push([performance.now(),player.position.x,player.position.z]);
      if(!Player.moveTo&&!(Player.path&&Player.path.length)&&Math.hypot(player.position.x-p[0],player.position.z-p[1])<.05)break;await sleep(50)}
    const g=player.userData.gmix||{},mv=s.filter((q,i)=>i>0&&Math.hypot(q[1]-s[i-1][1],q[2]-s[i-1][2])>1e-4);
    if(mv.length<4)return {error:'did not move',ordered:ok};
    // steady part: drop the first and last 10% of the moving samples; tiles counted the 2004 way (a diagonal step is
    // one tile: Chebyshev distance along the sampled path)
    const i0=s.indexOf(mv[Math.floor(mv.length*.1)]),i1=s.indexOf(mv[Math.floor(mv.length*.9)]);let tiles=0;
    for(let i=i0+1;i<=i1;i++)tiles+=Math.max(Math.abs(s[i][1]-s[i-1][1]),Math.abs(s[i][2]-s[i-1][2]));
    return {tilesPerSec:+(tiles/((s[i1][0]-s[i0][0])/1000)).toFixed(3),moveSpeed:Player.moveSpeed(),
      clip:run?(g.run?{dur:+g.run.getClip().duration.toFixed(3),timeScale:+g.run.timeScale.toFixed(3)}:null):(g.walk?{dur:+g.walk.getClip().duration.toFixed(3),timeScale:+g.walk.timeScale.toFixed(3)}:null)}},p,run);
  await go(lane.a,false);await C.sleep(1500);
  const walk=await go(lane.m,false);await C.sleep(1500);
  const run=await go(lane.b,true);
  await page.evaluate(()=>{Player.runOn=false});
  return {lane,walk,run};
}

// the old-school chrome at a window size: rects, the share of the screen it covers, type size as a share of the height
async function ui(page,w,h,name){
  await page.setViewport({width:w,height:h});await C.sleep(1500);
  const r=await page.evaluate(()=>{
    const rect=id=>{const e=document.getElementById(id);if(!e)return null;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return null;const b=e.getBoundingClientRect();
      return b.width>0?{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}:null};
    // effective type size of a chat line: the font size times the zoom the chrome is drawn at
    const box=document.getElementById('chatbox'),line=box&&(box.lastElementChild||box);
    const zoomOf=e=>{if(!e)return 1;const b=e.getBoundingClientRect();return e.offsetWidth>0?b.width/e.offsetWidth:1};
    const fs=line?parseFloat(getComputedStyle(line).fontSize)*zoomOf(document.getElementById('chatbox-frame')):null;
    const ids=['chatbox-frame','side-panel','mm-cluster','minimap-frame','hud-rail','objective','zone-box'];const out={};ids.forEach(i=>out[i]=rect(i));
    // the dialogue box and the right-click menu at their laid-out size (shown for the measurement, then put back)
    const dm=document.getElementById('dialogue-modal');let dlg=null;if(dm){const was=dm.style.display;dm.style.display='block';dlg=rect('dialogue-modal');
      const t=document.getElementById('dlg-text');dlg&&(dlg.textPx=+(parseFloat(getComputedStyle(t).fontSize)*zoomOf(dm)).toFixed(1));dm.style.display=was}
    const area=['chatbox-frame','side-panel','mm-cluster','hud-rail'].map(i=>out[i]).filter(Boolean).reduce((s,b)=>s+b.w*b.h,0);
    return {rects:out,dialogue:dlg,chatTypePx:fs&&+fs.toFixed(1),typeShare:fs?+(fs/innerHeight).toFixed(4):null,chromeShare:+(area/(innerWidth*innerHeight)).toFixed(3),
      uiScale:typeof UIScale!=='undefined'?UIScale.value():1,viewport:[innerWidth,innerHeight]};
  });
  await page.screenshot({path:path.join(OUT,'ui_'+name+'.jpg'),type:'jpeg',quality:85});
  return r;
}
async function designer(page){
  await page.evaluate(()=>{try{CharCreator.open();CharCreator.tick=function(){if(typeof HolmKitCreator!=='undefined'&&HolmKitCreator.active())HolmKitCreator.tick(1/60)}}catch(e){}});await C.sleep(3000);
  const r=await page.evaluate(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
    const win=q('#kit-creator .kc-window')||q('.kc-window'),arrow=q('.kc-arrow'),lab=document.querySelector('.kc-label');
    const zoomOf=e=>{if(!e)return 1;const b=e.getBoundingClientRect();return e.offsetWidth>0?b.width/e.offsetWidth:1};
    const labelPx=lab?parseFloat(getComputedStyle(lab).fontSize)*zoomOf(lab):null,W=innerWidth,H=innerHeight;
    return {window:win,arrow,labelPx,share:win?{w:+(win.w/W).toFixed(3),h:+(win.h/H).toFixed(3)}:null,arrowShareW:arrow?+(arrow.w/W).toFixed(3):null,labelShareH:labelPx?+(labelPx/H).toFixed(4):null,
      mode:typeof HolmKitCreator!=='undefined'&&HolmKitCreator.previewMode?HolmKitCreator.previewMode():'turntable'}});
  // the preview's yaw over 3 s (sway: stays within +-45 deg of the front; turntable: goes round)
  const yaws=[];for(let i=0;i<15;i++){yaws.push(await page.evaluate(()=>{const f=new THREE.Vector3(0,0,1).applyQuaternion(player.quaternion);const c=camera.position,P=player.position;
    const toCam=Math.atan2(c.x-P.x,c.z-P.z),face=Math.atan2(f.x,f.z);let d=(face-toCam)*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;return +d.toFixed(1)}));await C.sleep(200)}
  r.previewYawDeg=yaws;r.previewYawRange=[Math.min(...yaws),Math.max(...yaws)];
  await page.screenshot({path:path.join(OUT,'designer.jpg'),type:'jpeg',quality:85});
  await page.evaluate(()=>{try{HolmKitCreator.close(true)}catch(e){}try{CharCreator.finish()}catch(e){}});await C.sleep(800);
  return r;
}

// every skilling clip: authored length, the playback rate the game gives it, the resulting seconds per stroke, and the
// action timing the game waits for (a live one-shot through HolmIslandPlayer.play measures what the player sees)
async function skills(page){
  return page.evaluate(async()=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms)),g=player.userData.gmix,out={clips:{}};if(!g||!g.clips)return {error:'no kit rig'};
    for(const [key,name,kind] of [['chop','chop'],['net','net'],['cook','cook'],['bake','cook','bake'],['cook_range','cook_range'],['smelt','smelt'],['smith','smith'],['mine','mine'],['firemake','firemake']]){const act=g.clips[name];if(!act){out.clips[key]=null;continue}
      const dur=act.getClip().duration;let rate=1,loop=false;
      if(typeof SkillTiming!=='undefined'&&SkillTiming.rateFor){rate=SkillTiming.rateFor(name,dur,kind);loop=SkillTiming.loops(name)}
      out.clips[key]={authored:+dur.toFixed(3),rate:+rate.toFixed(3),seconds:+(dur/rate).toFixed(3),loopsWhileActing:loop}}
    // live: play one stroke through the game's own call and time it on the page clock (a looping stroke: one cycle)
    const live=async(name,kind)=>{const act=g.clips[name];if(!act||typeof HolmIslandPlayer==='undefined')return null;if(kind&&HolmIslandPlayer.playAs)HolmIslandPlayer.playAs(name,kind);else HolmIslandPlayer.play(name);const t0=performance.now();
      if(act.loop===THREE.LoopRepeat){const d=act.getClip().duration/Math.max(1e-6,act.timeScale);await sleep(d*1000*1.2);act.stop();g.attack=null;return +d.toFixed(3)}
      while(act.isRunning()&&performance.now()-t0<6000)await sleep(10);return +((performance.now()-t0)/1000).toFixed(2)};
    out.live={chop:await live('chop'),net:await live('net'),cook:await live('cook'),bake:await live('cook','bake'),smelt:await live('smelt'),smith:await live('smith')};
    out.timing=typeof SkillTiming!=='undefined'?SkillTiming.snapshot():{note:'before: fixed in game5_main.js',gatherRollSec:0.6,smeltSec:1.8,smithSec:1.8,lightfireSec:1.8,cookClip:'authored pace'};
    return out;
  });
}

(async()=>{
  const browser=await C.launch(1530,1006),res={tag:TAG,base:C.OURS,at:new Date().toISOString(),target:TARGET};
  try{
    const page=await boot(browser,1530,1006);
    res.runDefault=await page.evaluate(()=>!!Player.runOn);
    if(ONLY.includes('camera')){res.camera=await camera(page);await page.screenshot({path:path.join(OUT,'camera_default.jpg'),type:'jpeg',quality:85});C.log('camera',JSON.stringify(res.camera))}
    if(ONLY.includes('skills')){res.skills=await skills(page);C.log('skills',JSON.stringify(res.skills))}
    if(ONLY.includes('pace')){res.pace=await pace(page);C.log('pace',JSON.stringify(res.pace))}
    if(ONLY.includes('ui')){res.ui={};for(const [w,h] of [[1530,1006],[1920,960],[1366,657],[2560,1300],[812,375],[375,812]]){res.ui[w+'x'+h]=await ui(page,w,h,w+'x'+h);C.log('ui',w+'x'+h,JSON.stringify(res.ui[w+'x'+h].typeShare),res.ui[w+'x'+h].chromeShare)}
      await page.setViewport({width:1530,height:1006});await C.sleep(1200);res.designer=await designer(page);C.log('designer',JSON.stringify(res.designer))}
    await page.close();
  }catch(e){res.error=String(e&&e.stack||e);C.log('error',res.error)}
  finally{await browser.close().catch(()=>{})}
  C.writeJSON(path.join(OUT,'feel.json'),res);C.log('wrote',path.join(OUT,'feel.json'));process.exit(0);
})();
