/* The local 2004 client (rs-sdk bot client served by the LOCAL Lost City engine) seen through puppeteer, plus the
 * rs-sdk SDK (via the local gateway) for playing. Nothing here copies game data: we only read the rendered canvas and a
 * few live numbers (positions, animation frame counters, camera) to time and frame the captures.
 * Runtime-only page tweaks (never written into rs-sdk):
 *   - client cycle back to the authentic 20 ms (rs-sdk runs its client 30% fast: deltime 14)
 *   - optional camera override (pitch / yaw / distance / fixed target) so we can frame side views and lock the camera
 *   - optional "hide local player" for background plates (silhouette = frame minus plate). */
'use strict';
const C=require('./common');
const VIEW={x:4,y:4,w:512,h:334};                  // the 3D viewport inside the 765x503 applet
const DESIGN_BTN={male:[365,292],female:[457,292],accept:[260,286]};

async function open(browser,user,pass,opts){
  opts=opts||{};
  const page=await browser.newPage();
  await page.setViewport({width:765,height:503});
  await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('canvasSize','1');localStorage.setItem('hideControls','true')}catch(e){}});
  page.on('pageerror',e=>C.log('[2004 page error]',String(e.message||e).slice(0,160)));
  const url=C.WEB2004+(opts.vanilla?'/vanilla':'/bot?bot='+encodeURIComponent(user)+'&password='+encodeURIComponent(pass));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.addStyleTag({content:'#canvas{position:fixed!important;left:0!important;top:0!important;width:765px!important;height:503px!important;max-width:none!important;max-height:none!important;z-index:2147483000!important}body{overflow:hidden!important}'});
  if(opts.vanilla)return page;
  await page.waitForFunction(()=>{const c=window.gameClient;return c&&c.ingame&&c.localPlayer&&c.localPlayer.x>0},{timeout:120000,polling:250});
  await install(page);
  return page;
}
async function install(page){
  await page.evaluate(()=>{
    const c=window.gameClient;if(c.__refInstalled)return;c.__refInstalled=true;
    c.deltime=20;                                   // authentic 50 Hz client cycle (rs-sdk: 14 ms = 30% fast)
    window.__frameNo=0;
    const md=c.mainredraw;c.mainredraw=async function(){await md.call(this);window.__frameNo++;if(window.__onFrame)try{window.__onFrame()}catch(e){}};
    // rs-sdk's client sends every move with the ctrl-run byte ("Always run"); put back the 2004 rule (run only while
    // ctrl is held, i.e. the SDK's running flag) so walking walks
    const tm=c.tryMove;c.tryMove=function(...a){const out=this.out;if(!out)return tm.apply(this,a);const run=this.keyHeld&&this.keyHeld[5]===1?1:0;
      const p1=out.p1,pe=out.p1Enc;let armed=-1;out.p1Enc=function(v){armed=0;return pe.call(this,v)};
      out.p1=function(v){if(armed>=0){armed++;if(armed===2){armed=-1;v=run}}return p1.call(this,v)};
      try{return tm.apply(this,a)}finally{delete out.p1;delete out.p1Enc;if(out.p1!==p1){out.p1=p1}if(out.p1Enc!==pe){out.p1Enc=pe}}};
    const cf=c.camFollow;c.camFollow=function(pitch,yaw,x,y,z,d){const o=this.__cam;
      if(o){if(o.pitch!=null)pitch=o.pitch;if(o.yaw!=null)yaw=o.yaw;if(o.dist!=null)d=o.dist;else if(o.distMul!=null)d=(d*o.distMul)|0;
        if(o.target){x=o.target.x;z=o.target.z;y=this.getAvH(x,z,this.minusedlevel)-(o.target.lift!=null?o.target.lift:50)}}
      return cf.call(this,pitch,yaw,x,y,z,d)};
  });
}
const waitFrames=(page,n)=>page.evaluate(n=>new Promise(r=>{const s=window.__frameNo;const t=setInterval(()=>{if(window.__frameNo>=s+n){clearInterval(t);r()}},5)}),n||2);
async function setCam(page,o){await page.evaluate(o=>{const c=window.gameClient;c.__cam=o;if(o&&o.orbitPitch!=null)c.orbitCameraPitch=o.orbitPitch;if(o&&o.orbitYaw!=null)c.orbitCameraYaw=o.orbitYaw},o||null);await waitFrames(page,3)}
async function hidePlayer(page,hide){await page.evaluate(h=>{const lp=window.gameClient.localPlayer;if(h)lp.isReady=()=>false;else delete lp.isReady},!!hide);await waitFrames(page,3)}
async function grab(page,file){const d=await page.evaluate(()=>document.getElementById('canvas').toDataURL('image/png'));if(file)C.dataUrlToFile(d,file);return d}
// a frame with the player and the same frame without (the camera must be locked or the player still)
async function grabWithPlate(page,file,plateFile){await grab(page,file);await hidePlayer(page,true);await grab(page,plateFile);await hidePlayer(page,false)}
// how many viewport pixels the player covers right now (frame with vs without the player): 0 = hidden behind scenery
async function playerPixels(page){
  const snap=()=>page.evaluate(()=>{const d=document.getElementById('canvas').getContext('2d').getImageData(4,4,512,334).data;window.__pp=window.__pp||[];window.__pp.push(d);return 1});
  await waitFrames(page,2);await snap();await hidePlayer(page,true);await snap();await hidePlayer(page,false);
  return page.evaluate(()=>{const [a,b]=window.__pp;window.__pp=[];let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)n++;return n})}
async function info(page){return page.evaluate(()=>{const c=window.gameClient,lp=c.localPlayer,C0=c.constructor;
  const pr=(h)=>{c.getOverlayPos(lp.x,lp.z,h);return c.projectX>-1?[c.projectX+4,c.projectY+4]:null};
  return {x:lp.x,z:lp.z,tileX:(lp.x>>7)+c.mapBuildBaseX,tileZ:(lp.z>>7)+c.mapBuildBaseZ,yaw:lp.yaw,height:lp.height,level:c.minusedlevel,
    readyanim:lp.readyanim,walkanim:lp.walkanim,runanim:lp.runanim,turnanim:lp.turnanim,secondaryAnim:lp.secondaryAnim,secondaryAnimFrame:lp.secondaryAnimFrame,primaryAnim:lp.primaryAnim,
    orbitPitch:c.orbitCameraPitch,orbitYaw:c.orbitCameraYaw,camPitch:c.camPitch,camYaw:c.camYaw,cam:[c.camX,c.camY,c.camZ],loopCycle:C0.loopCycle,frameNo:window.__frameNo,
    feet:pr(0),head:pr(lp.height),mid:pr((lp.height/2)|0)}})}
async function click(page,xy,right){await page.mouse.move(xy[0],xy[1]);await C.sleep(60);await page.mouse.down({button:right?'right':'left'});await C.sleep(50);await page.mouse.up({button:right?'right':'left'})}
async function key(page,k,ms){await page.keyboard.down(k);await C.sleep(ms||100);await page.keyboard.up(k)}
// per-frame sampler: every redraw records the player's animation counters + projected feet/head, and (optionally) a
// crop of the canvas around the player or a fixed region
async function startSampler(page,opts){await page.evaluate(o=>{
  const cv=document.getElementById('canvas'),ctx=cv.getContext('2d'),tmp=document.createElement('canvas');
  window.__samp={on:true,list:[],o};
  window.__onFrame=function(){const s=window.__samp;if(!s||!s.on)return;const c=window.gameClient,lp=c.localPlayer;if(!lp)return;c.crossMode=0;
    const pr=h=>{c.getOverlayPos(lp.x,lp.z,h);return c.projectX>-1?[c.projectX+4,c.projectY+4]:null};
    const feet=pr(0),head=pr(lp.height);
    const r={n:window.__frameNo,t:+performance.now().toFixed(1),lc:c.constructor.loopCycle,sa:lp.secondaryAnim,saf:lp.secondaryAnimFrame,pa:lp.primaryAnim,paf:lp.primaryAnimFrame,
      x:lp.x,z:lp.z,yaw:lp.yaw,h:lp.height,feet,head};
    if(s.o.crop){let rx,ry,[w,h]=s.o.crop.size;
      if(s.o.crop.fixed){[rx,ry]=s.o.crop.fixed}else if(feet){rx=Math.round(feet[0]-w/2);ry=Math.round(feet[1]-h+(s.o.crop.below||20))}
      if(rx!=null){tmp.width=w;tmp.height=h;const t=tmp.getContext('2d');t.clearRect(0,0,w,h);t.drawImage(cv,rx,ry,w,h,0,0,w,h);r.crop=[rx,ry,w,h];r.png=tmp.toDataURL('image/png')}}
    if(s.o.fullEvery&&s.list.length%s.o.fullEvery===0)r.full=cv.toDataURL('image/png');
    s.list.push(r)};
},opts||{})}
async function stopSampler(page){return page.evaluate(()=>{const s=window.__samp;if(!s)return [];s.on=false;const l=s.list;window.__samp=null;return l})}
async function sdk(user,pass){
  const {BotSDK}=require(C.RS+'/sdk/index.ts');const {BotActions}=require(C.RS+'/sdk/actions.ts');
  const s=new BotSDK({botUsername:user,password:pass,gatewayUrl:C.GATEWAY,connectionMode:'control',autoReconnect:true,showChat:false,autoLaunchBrowser:false});
  await s.connect();await s.waitForReady(30000);
  return {sdk:s,bot:new BotActions(s)};
}
module.exports={VIEW,DESIGN_BTN,open,install,waitFrames,setCam,hidePlayer,grab,grabWithPlate,playerPixels,info,click,key,startSampler,stopSampler,sdk};
