/* Crafted Realm (ours) seen through puppeteer for the 2004 reference pairs. Boots a fresh profile on the served tree
 * (REF_OURS_BASE, default http://127.0.0.1:8108), enters the Holm with the shared driver (tools/holm_island_driver_lib),
 * and offers the same capture verbs as the 2004 side: a camera override (the 2004 lens: 36.13 deg vertical FOV,
 * elevation / distance / look height in tiles), hide-player plates, HUD hiding, and a per-render sampler. */
'use strict';
const C=require('./common');
const L=require('../../holm_island_driver_lib.js');
// the 2004 camera expressed in tiles (128 units = 1 tile): orbit pitch p in 2048ths of a turn, boom = p*3+600 units,
// look point 50 units above the ground, 512 px focal length over a 334 px tall viewport
const LENS2004={vfov:2*Math.atan(167/512)*180/Math.PI,pitchToDeg:p=>p*360/2048,boomTiles:p=>(p*3+600)/128,lookLift:50/128};

async function open(browser,opts){
  opts=opts||{};
  const page=await browser.newPage();
  await page.setViewport({width:opts.w||1530,height:opts.h||1006});
  page.on('pageerror',e=>C.log('[ours page error]',String(e.message||e).slice(0,160)));
  const profile=opts.profile||('ref2004-'+Date.now().toString(36));
  await page.goto(C.OURS+'/?qaProfile='+profile+(opts.query||''),{waitUntil:'load',timeout:180000});
  await L.enter(page);
  await page.waitForFunction(()=>typeof player!=='undefined'&&player&&player.userData&&player.userData.gmix,{timeout:120000,polling:250}).catch(()=>{});
  await install(page);
  return page;
}
async function install(page){
  await page.evaluate(()=>{
    if(window.__refInstalled)return;window.__refInstalled=true;window.__frameNo=0;
    // camera override applied at render time (after the game's own follow camera), like the kit creator's portrait camera
    const prev=scene.onBeforeRender;
    scene.onBeforeRender=function(r,s,cam){if(prev)prev.apply(this,arguments);const o=window.__refCam;if(!o||!player)return;
      const f=o.target||player.position,ty=(o.target&&o.target.y!=null?o.target.y:player.position.y)+(o.lift||0);
      const e=o.elevDeg*Math.PI/180,y=o.yaw;
      cam.position.set(f.x+o.dist*Math.cos(e)*Math.sin(y),ty+o.dist*Math.sin(e),f.z+o.dist*Math.cos(e)*Math.cos(y));
      cam.lookAt(f.x,ty,f.z);if(o.vfov&&Math.abs(cam.fov-o.vfov)>1e-6){cam.fov=o.vfov;cam.updateProjectionMatrix()}cam.updateMatrixWorld()};
    // per-render hook: count frames and run the sampler right after the WebGL draw (the buffer is still readable)
    const rr=renderer.render.bind(renderer);
    renderer.render=function(s,cam){rr(s,cam);if(renderer.getRenderTarget()!==null)return;window.__frameNo++;if(window.__onFrame)try{window.__onFrame(camera)}catch(e){}};
  });
}
const waitFrames=(page,n)=>page.evaluate(n=>new Promise(r=>{const s=window.__frameNo;const t=setInterval(()=>{if(window.__frameNo>=s+n){clearInterval(t);r()}},5)}),n||3);
async function setCam(page,o){await page.evaluate(o=>{window.__refCam=o;if(!o){camera.fov=30;camera.updateProjectionMatrix()}},o||null);await waitFrames(page,4)}
async function hidePlayer(page,hide){await page.evaluate(h=>{player.visible=!h},!!hide);await waitFrames(page,3)}
// hide every HUD element (the 3D canvas stays) - for the 3D-view pairs
async function hud(page,show){await page.evaluate(show=>{const cv=document.getElementById('game-canvas');let keep=new Set();for(let n=cv;n;n=n.parentElement)keep.add(n);
  if(!show){window.__hudHidden=[];document.querySelectorAll('body *').forEach(e=>{if(keep.has(e)||e===cv)return;if(e.closest&&e.closest('#game-canvas'))return;
    if(getComputedStyle(e).visibility!=='hidden'&&!keep.has(e)){window.__hudHidden.push([e,e.style.visibility]);e.style.visibility='hidden'}})}
  else if(window.__hudHidden){window.__hudHidden.forEach(([e,v])=>e.style.visibility=v);window.__hudHidden=null}},!!show);await waitFrames(page,2)}
async function grab(page,file){await waitFrames(page,1);return page.screenshot(file?{path:file}:{})}
// how many canvas pixels the player covers right now (a render with vs without the player)
async function playerPixels(page){
  return page.evaluate(()=>new Promise(res=>{const cv=renderer.domElement,t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;const g=t.getContext('2d');
    let a=null,step=0;const prev=window.__onFrame;
    window.__onFrame=function(cam){if(prev)prev(cam);step++;
      if(step===2){g.drawImage(cv,0,0);a=g.getImageData(0,0,t.width,t.height).data;player.visible=false}
      else if(step===5){g.drawImage(cv,0,0);const b=g.getImageData(0,0,t.width,t.height).data;player.visible=true;window.__onFrame=prev;
        let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)n++;res(n)}}}))}
async function info(page){return page.evaluate(()=>{const bb=new THREE.Box3().setFromObject(player),g=player.userData.gmix||{};
  const pr=v=>{const p=v.clone().project(camera),r=renderer.domElement.getBoundingClientRect();return p.z<1?[+((p.x+1)/2*r.width+r.left).toFixed(1),+((1-p.y)/2*r.height+r.top).toFixed(1)]:null};
  const P=player.position;return {pos:[P.x,P.y,P.z],rotY:player.rotation.y,height:+(bb.max.y-bb.min.y).toFixed(3),bb:[bb.min.toArray(),bb.max.toArray()],
    feet:pr(P.clone()),head:pr(new THREE.Vector3(P.x,bb.max.y,P.z)),cam:{yaw:camCtl.yaw,pitch:camCtl.pitch,dist:camCtl.dist,fov:camera.fov,pos:camera.position.toArray()},
    run:!!(typeof Player!=='undefined'&&Player.runOn),speed:typeof Player!=='undefined'&&Player.moveSpeed?Player.moveSpeed():null,
    clips:{walk:g.walk?{t:g.walk.time,w:g.walk.weight,dur:g.walk.getClip().duration,ts:g.walk.timeScale}:null,run:g.run?{t:g.run.time,w:g.run.weight,dur:g.run.getClip().duration,ts:g.run.timeScale}:null,idle:g.idle?{dur:g.idle.getClip().duration}:null},
    frameNo:window.__frameNo}})}
async function startSampler(page,opts){await page.evaluate(o=>{
  const tmp=document.createElement('canvas');window.__samp={on:true,list:[],o};
  window.__onFrame=function(cam){const s=window.__samp;if(!s||!s.on)return;const cv=renderer.domElement,P=player.position,g=player.userData.gmix||{};
    const bb=new THREE.Box3().setFromObject(player);const W=cv.width,H=cv.height,cw=cv.clientWidth||W,ch=cv.clientHeight||H,sx=W/cw,sy=H/ch;
    const pr=v=>{const p=v.clone().project(cam);return p.z<1?[(p.x+1)/2*cw,(1-p.y)/2*ch]:null};
    const feet=pr(P.clone()),head=pr(new THREE.Vector3(P.x,bb.max.y,P.z));
    const r={n:window.__frameNo,t:+performance.now().toFixed(1),x:P.x,y:P.y,z:P.z,rotY:player.rotation.y,h:bb.max.y-bb.min.y,feet,head,
      walk:g.walk?[+g.walk.time.toFixed(4),+g.walk.weight.toFixed(3)]:null,run:g.run?[+g.run.time.toFixed(4),+g.run.weight.toFixed(3)]:null};
    if(s.o.crop){let rx,ry,[w,h]=s.o.crop.size;if(s.o.crop.fixed)[rx,ry]=s.o.crop.fixed;else if(feet){rx=Math.round(feet[0]-w/2);ry=Math.round(feet[1]-h+(s.o.crop.below||40))}
      if(rx!=null){tmp.width=w;tmp.height=h;const t=tmp.getContext('2d');t.fillStyle='#000';t.fillRect(0,0,w,h);t.drawImage(cv,rx*sx,ry*sy,w*sx,h*sy,0,0,w,h);r.crop=[rx,ry,w,h];r.png=tmp.toDataURL('image/png')}}
    s.list.push(r)};
},opts||{})}
async function stopSampler(page){return page.evaluate(()=>{const s=window.__samp;if(!s)return [];s.on=false;const l=s.list;window.__samp=null;window.__onFrame=null;return l})}
module.exports={LENS2004,L,open,install,waitFrames,setCam,hidePlayer,hud,grab,playerPixels,info,startSampler,stopSampler};
