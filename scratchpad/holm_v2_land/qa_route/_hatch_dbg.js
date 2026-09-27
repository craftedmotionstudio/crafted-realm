const puppeteer=require('puppeteer-core');const D=require(process.cwd()+'/tools/holm_island_driver_lib');
(async()=>{const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1280,760','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--mute-audio'],defaultViewport:{width:1280,height:760}});
const page=await browser.newPage();await page.goto('http://127.0.0.1:8105/?holmIsland=1&qaProfile=hdbg-'+Date.now().toString(36),{waitUntil:'load',timeout:180000});await D.enter(page);
const info=await page.evaluate(()=>{const o=scene.getObjectByName('island-hatch-keep-undercroft');if(!o)return null;const out=[];o.updateMatrixWorld(true);
 o.traverse(n=>{if(n.isMesh){const b=new THREE.Box3().setFromObject(n);out.push({name:n.name,mat:[].concat(n.material).map(m=>m.name+'|side'+m.side+'|clip'+(m.clippingPlanes?m.clippingPlanes.length:0)+'|vis'+m.visible),visible:n.visible,min:b.min.toArray().map(v=>+v.toFixed(2)),max:b.max.toArray().map(v=>+v.toFixed(2))})}});
 return {pos:o.position.toArray(),rot:o.rotation.y,meshes:out}});
console.log(JSON.stringify(info,null,1));
await page.evaluate(()=>{const n=HolmArrivalQA.qaStance('keep','undercroft');HolmArrivalQA.qaPlace(n.id)});await D.sleep(2500);
for(const [yaw,name] of [[Math.PI/2,'e'],[0,'s'],[-Math.PI/2,'w'],[Math.PI,'n']]){await page.evaluate(y=>{camCtl.yaw=y;camCtl.pitch=.8;camCtl.dist=6},yaw);await D.sleep(1400);await page.screenshot({path:'scratchpad/holm_v2_land/qa_route/_hatch_'+name+'.png'})}
await browser.close()})();
