/* Draw-call breakdown by scene category at given camera views (Holm v2 land, phase 5): node tools/probe_holm_draw_calls.js '[{"name":"v07","x":42,"z":60,"yaw":0.6,"pitch":0.95,"dist":30}]' (server on 8105). */
const puppeteer=require('puppeteer-core');const D=require('./holm_island_driver_lib');
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1280,760','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--mute-audio'],defaultViewport:{width:1280,height:760}});
const page=await browser.newPage();await page.goto('http://127.0.0.1:8105/?holmIsland=1&qaProfile=calls-'+Date.now().toString(36),{waitUntil:'load',timeout:180000});await D.enter(page);
const views=JSON.parse(process.argv[2]);
for(const v of views){await page.evaluate(v=>{document.querySelectorAll('.hud,#ui-root,#hud,#side-panel').forEach(e=>e.style&&(e.style.visibility='hidden'));HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);await D.sleep(3500);
 const r=await page.evaluate(()=>{const cat={};const fr=new THREE.Frustum(),m=new THREE.Matrix4();camera.updateMatrixWorld();m.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);fr.setFromProjectionMatrix(m);
  scene.traverseVisible(o=>{if(!o.isMesh)return;let top=o;while(top.parent&&top.parent!==scene)top=top.parent;const name=(top.name||o.name||'?').replace(/@.*$/,'').replace(/-\d+$/,'').replace(/[-_][^-_]*$/,'');
   let inView=true;if(!o.isInstancedMesh&&o.frustumCulled){if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();const s=o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);inView=fr.intersectsSphere(s)}
   if(!inView)return;const prims=Array.isArray(o.material)?o.material.length:1;const c=cat[name]=cat[name]||{calls:0,shadow:0};c.calls+=prims;if(o.castShadow)c.shadow+=prims});
  renderer.info.autoReset=true;renderer.render(scene,camera);return {info:renderer.info.render.calls,cat}});
 const top=Object.entries(r.cat).sort((a,b)=>(b[1].calls+b[1].shadow)-(a[1].calls+a[1].shadow)).slice(0,25);console.log(v.name,'total',r.info);top.forEach(([k,c])=>console.log('   ',k.padEnd(40),c.calls,c.shadow))}
await browser.close()})();
