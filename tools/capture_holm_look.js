/* World-look captures (2026-09-25 old-school look pass): the same ten camera positions on the island draft
 * (?holmIsland=1, isolated qaProfile) for before/after sheets, plus renderer numbers at each view.
 * The camera is framed with HolmArrivalQA.qaView (streams terrain, never moves the adventurer); the Guide House
 * interior view lifts the house's roof/upper storey the same way the model owner does when you walk in.
 * UI chrome is hidden so the sheet compares the world only. Screenshots only; not a gameplay proof.
 * Run: SMOKE_BASE=http://127.0.0.1:8097 LOOK_TAG=after LOOK_QUERY="&oldschool=1" node tools/capture_holm_look.js
 *   LOOK_TAG   output sub-folder under scratchpad/<LOOK_ROOT>/ (default 'capture')
 *   LOOK_ROOT  scratchpad folder (default holm_look_v1; look pass 2 uses holm_look_v2)
 *   LOOK_QUERY extra URL query (the look switch: &oldschool=0 is the old look, &oldschool=1 the textured one;
 *              look pass 2: &lookv=1 the first old-school look, &lookv=2 look v2, &classic=1 classic pixels)
 *   LOOK_ONLY  comma list of view names to capture (default all)
 *   LOOK_MASK  1 = also write <view>.mask.png: the same frame with every mesh drawn in a flat surface-class colour
 *              (grass/path/sand from the ground's texture weights, foliage/trunk/wall/roof by material name, water),
 *              read by tools/measure_look_vs_refs.py to measure each surface against the Bible references */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const TAG=process.env.LOOK_TAG||'capture',OUT=path.join(__dirname,'..','scratchpad',process.env.LOOK_ROOT||'holm_look_v1',TAG);fs.mkdirSync(OUT,{recursive:true});
const MASK=process.env.LOOK_MASK==='1';
// surface-class mask colours: keep in step with CLASSES in tools/measure_look_vs_refs.py
const MASK_CLASSES={grass:[0,200,0],path:[200,100,0],sand:[230,220,0],foliage:[0,80,255],trunk:[120,40,160],wall:[255,0,255],roof:[255,0,0],water:[0,220,220],other:[255,255,255]};
// in the page: swap every mesh to a flat class colour (on) or restore it (off); same camera and render pipeline
function maskPass(on,C){
 const st=window.__lookMask||(window.__lookMask={saved:[],cache:new Map(),ground:null});
 if(!on){for(let i=st.saved.length-1;i>=0;i--){const [o,k,v]=st.saved[i];o[k]=v}st.saved=[];return 0}
 const col=c=>new THREE.Color(c[0]/255,c[1]/255,c[2]/255),v3=c=>'vec3('+c.map(n=>(n/255).toFixed(4)).join(',')+')';
 function top(o){let t=o;while(t.parent&&t.parent!==scene)t=t.parent;return t.name||''}
 const WALL=/plaster|limewash|fieldstone|sandstone|limestone|stone lit|stone shade|dressed stone|brick|flat colour - (rock|plaster)|village stone/i;
 function cls(o,m){const n=(m&&m.name)||'',t=top(o);
  if(/^Arrival(Ocean|Creek)$/.test(o.name))return 'water';
  if(/leaf|leaves|needle|foliage|coppice|tuft/i.test(n))return 'foliage';
  if(/bark|trunk|fissured/i.test(n))return 'trunk';
  if(/thatch|shingle|clay|roof|gray slate/i.test(n))return 'roof';
  if(/guide_hall|island-building|Landscape_wall|island-bridge/.test(t)&&WALL.test(n)&&!/flag|floor|\bore\b|cave|cavern/i.test(n))return 'wall';
  // timber-textured roofs (the bakehouse shingles are 'Holm flat colour - beam'): a roof by the mesh's own name
  for(let q=o,i=0;q&&i<3;q=q.parent,i++)if(/(^|_)Roof/i.test(q.name||'')&&/beam|plank|shingle|flat colour/i.test(n))return 'roof';
  return 'other'}
 function ground(){if(st.ground)return st.ground;const g=new THREE.MeshBasicMaterial({fog:false});
  g.onBeforeCompile=sh=>{sh.vertexShader='attribute vec4 groundMix;\nvarying vec4 vGM;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGM = groundMix;');
   sh.fragmentShader='varying vec4 vGM;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat gG = 1.0 - dot(vGM, vec4(1.0));\nvec3 gC = '+v3(C.other)+';\nif (vGM.w > 0.5) gC = '+v3(C.path)+'; else if (vGM.x > 0.5) gC = '+v3(C.sand)+'; else if (gG > 0.5) gC = '+v3(C.grass)+';\ndiffuseColor.rgb = gC;')};
  g.customProgramCacheKey=()=>'look-mask-ground-v1';return st.ground=g}
 function maskOf(o,m){if(!m)return m;if(m.transparent&&m.opacity<.02)return m;if(m.userData&&m.userData.oldschoolGround)return ground();
  const k=m.uuid+(o.isSkinnedMesh?'|s':'')+'|'+cls(o,m);if(st.cache.has(k))return st.cache.get(k);   // a shared material can be roof on one mesh only
  const c=cls(o,m),x=new THREE.MeshBasicMaterial({color:col(C[c]),fog:false,side:m.side,skinning:!!o.isSkinnedMesh,morphTargets:!!m.morphTargets,
   clippingPlanes:m.clippingPlanes||null,clipIntersection:!!m.clipIntersection,depthWrite:m.depthWrite,depthTest:m.depthTest,polygonOffset:!!m.polygonOffset,
   polygonOffsetFactor:m.polygonOffsetFactor||0,polygonOffsetUnits:m.polygonOffsetUnits||0});
  ['stencilWrite','stencilRef','stencilFunc','stencilZPass','stencilFail','stencilZFail','stencilWriteMask','stencilFuncMask'].forEach(p=>{if(p in m)x[p]=m[p]});
  x.userData.lookMaskClass=c;st.cache.set(k,x);return x}
 let n=0;st.saved.push([scene,'background',scene.background]);scene.background=new THREE.Color(0,0,0);
 scene.traverse(o=>{if((o.isSprite||o.isPoints||o.isLine)&&o.visible){st.saved.push([o,'visible',true]);o.visible=false;return}
  if(!o.isMesh||!o.material)return;const m=o.material,x=Array.isArray(m)?m.map(q=>maskOf(o,q)):maskOf(o,m);st.saved.push([o,'material',m]);o.material=x;n++});
 return n}
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=look-'+TAG+'-'+Date.now().toString(36)+(process.env.LOOK_QUERY||'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// name, focus x/z, yaw, pitch, distance (camCtl units), interior = lift the Guide House roof
const VIEWS=[
 {name:'01_arrival_landing',x:62,z:114,yaw:.7,pitch:1.0,dist:26},
 {name:'02_guide_house_exterior',x:66,z:101,yaw:.35,pitch:.95,dist:26},
 {name:'03_guide_house_interior',x:66,z:99,yaw:.2,pitch:1.15,dist:20,interior:true},
 {name:'04_survival_camp',x:31,z:84,yaw:.7,pitch:1.0,dist:26},
 {name:'05_timber_bridge',x:46,z:87.5,yaw:.5,pitch:.9,dist:14},
 {name:'06_fishing_spot',x:44.5,z:90.5,yaw:.9,pitch:.95,dist:14},
 {name:'07_bakehouse_court',x:44,z:67,yaw:.7,pitch:1.0,dist:26},
 {name:'08_keep_court',x:87,z:35,yaw:.7,pitch:1.05,dist:30},
 {name:'09_lighthouse_approach',x:119,z:34,yaw:.1,pitch:.8,dist:30},
 {name:'10_hill_panorama',x:74,z:44,yaw:.15,pitch:.65,dist:55}];
// LOOK_SET=closeup: one close view per rolled-out asset (2026-09-25 rollout); hide = regex of scene nodes lifted for a
// look inside (the roof cutaway the game does when you walk in); y0 = explicit focus height (offshore cavern)
const CLOSEUPS=[
 {name:'c01_keep',x:87,z:35,yaw:.6,pitch:.8,dist:20},
 {name:'c02_bakehouse',x:44,z:67,yaw:.5,pitch:.85,dist:16},
 {name:'c03_quest_lodge',x:36,z:51,yaw:.6,pitch:.85,dist:17},
 {name:'c04_bank',x:86,z:57,yaw:.6,pitch:.85,dist:16},
 {name:'c05_mage_tower',x:114,z:58,yaw:.6,pitch:.8,dist:18},
 {name:'c06_lastlight',x:121,z:26,yaw:.4,pitch:.8,dist:20},
 {name:'c07_lastlight_interior',x:121,z:26,yaw:.4,pitch:1.15,dist:16,hide:'^Lastlight_(Roof|Upper)'},
 {name:'c08_quarry_gatehouse',x:36,z:33,yaw:.6,pitch:.85,dist:16},
 {name:'c09_cavern',x:203,z:58,y0:-30,yaw:.6,pitch:1.0,dist:18,hide:'^Cavern_(Roof|ShellRockTop)'},
 {name:'c10_haven',x:124,z:103,yaw:.6,pitch:.85,dist:16},
 {name:'c11_timber_bridge',x:46,z:87.5,yaw:.5,pitch:.8,dist:10},
 {name:'c12_stone_bridge',x:62.5,z:53.5,yaw:.5,pitch:.8,dist:10},
 {name:'c13_dock_boat',x:63,z:123.5,yaw:.8,pitch:.85,dist:12},
 {name:'c14_oaks_tufts',x:29,z:100,yaw:.6,pitch:.7,dist:14},
 {name:'c15_birch',x:54,z:83,yaw:.6,pitch:.7,dist:12},
 {name:'c16_coastal_pine',x:116,z:109,yaw:.6,pitch:.7,dist:12},
 {name:'c17_creek_reeds',x:65.8,z:45.8,yaw:.6,pitch:.8,dist:8},
 {name:'c18_habitat_props',x:67,z:22,yaw:.6,pitch:.8,dist:14},
 {name:'c19_signpost',x:34.5,z:59,yaw:.6,pitch:.8,dist:8},
 {name:'c20_provisions',x:68,z:95,yaw:.3,pitch:1.1,dist:9,interior:true},
 {name:'c21_landing_props',x:60,z:117,yaw:.7,pitch:.85,dist:12},
 {name:'c22_garden_hazel',x:72,z:107,yaw:.6,pitch:.85,dist:12},
 {name:'c23_lesson_trees_fire',x:30,z:81,yaw:.6,pitch:.85,dist:14},
 {name:'c24_cavern_ores',x:203,z:55,y0:-30,yaw:.6,pitch:1.0,dist:10,hide:'^Cavern_(Roof|ShellRockTop)'},
 {name:'c25_bakehouse_gate',x:44.5,z:69,yaw:.2,pitch:.8,dist:8},
 // the Lantern Keeper statue (62.3,108.4) at the game camera: default pitch 1.08, fully zoomed in (12) and at the default 33,
 // from the arrival path and from the lawn on its west side (the game's default yaw looks at it through the porch roof)
 {name:'c26_statue_path_zoomed',x:62.3,z:108.4,yaw:.7,pitch:1.08,dist:12},
 {name:'c27_statue_west_zoomed',x:62.3,z:108.4,yaw:-.9,pitch:1.08,dist:12},
 {name:'c28_statue_game_default',x:62.3,z:108.4,yaw:.7,pitch:1.08,dist:33}];
const SET=process.env.LOOK_SET==='closeup'?CLOSEUPS:VIEWS;
const only=process.env.LOOK_ONLY?process.env.LOOK_ONLY.split(','):null;
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
 page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300))});
 const missing=[];page.on('response',r=>{if(r.status()===404)missing.push(r.url().replace(/^https?:\/\/[^/]+/,''))});
 await page.goto(BASE,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:120000});await sleep(5000);
 // world only: hide every DOM layer but the game canvas
 await page.addStyleTag({content:'body *{visibility:hidden !important} #game-canvas{visibility:visible !important}'});
 const rows=[];
 for(const v of SET){
  if(only&&!only.includes(v.name))continue;
  await page.evaluate(v=>{
   HolmArrivalQA.qaView(v.x,v.z,v.y0);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist;
   const hide=v.hide?new RegExp(v.hide):null;scene.traverse(n=>{if(n.userData.__lookHide!==undefined){n.visible=n.userData.__lookHide;delete n.userData.__lookHide}if(hide&&hide.test(n.name)){n.userData.__lookHide=n.visible;n.visible=false}});
   const h=scene.getObjectByName('world-object-holm_guide_hall');
   if(h)h.traverse(n=>{if(/^(Roof|Gable|UpperShell|UpperFloor|UpperFurnishing|UpperHearth)/.test(n.name)){if(n.userData.__lookVis===undefined)n.userData.__lookVis=n.visible;n.visible=v.interior?false:n.userData.__lookVis}});
  },v);
  await sleep(4500);
  const stats=await page.evaluate(()=>{const r=typeof CRPerfProbe!=='undefined'?CRPerfProbe.renderStats():null;return r});
  const fps=await page.evaluate(()=>typeof CRPerfProbe!=='undefined'?CRPerfProbe.sample(2):null);
  await page.screenshot({path:path.join(OUT,v.name+'.png')});
  if(MASK){await page.evaluate(()=>{if(typeof ClassicPixels!=='undefined'&&ClassicPixels.suspendPalette)ClassicPixels.suspendPalette(true)});
   await page.evaluate(`(${maskPass.toString()})(true,${JSON.stringify(MASK_CLASSES)})`);await sleep(700);
   await page.screenshot({path:path.join(OUT,v.name+'.mask.png')});await page.evaluate(`(${maskPass.toString()})(false)`);
   await page.evaluate(()=>{if(typeof ClassicPixels!=='undefined'&&ClassicPixels.suspendPalette)ClassicPixels.suspendPalette(false)});await sleep(300)}
  rows.push({view:v.name,calls:stats&&stats.calls,triangles:stats&&stats.triangles,textures:stats&&stats.textures,programs:stats&&stats.programs,fps:fps&&fps.fps,worstMs:fps&&fps.worstMs});
  console.log('captured',v.name,JSON.stringify(rows[rows.length-1]));
 }
 const look=await page.evaluate(()=>typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.snapshot():{look:'none'});
 look.classic=await page.evaluate(()=>typeof ClassicPixels!=='undefined'?ClassicPixels.snapshot():null);
 fs.writeFileSync(path.join(OUT,'perf.json'),JSON.stringify({tag:TAG,url:BASE,look,views:rows,pageErrors:errs,missing},null,1));
 if(missing.length)console.log('404: '+missing.join(', '));
 console.log('[LOOK CAPTURE] '+rows.length+' views, page errors '+errs.length+(errs.length?'\n'+errs.slice(0,8).join('\n'):''));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
