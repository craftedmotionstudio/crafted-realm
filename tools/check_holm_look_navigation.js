/* Old-school look switch, navigation proof (world look pass 2026-09-25): boots the island draft twice in headless
 * Chrome, once per look (?oldschool=0 / ?oldschool=1), and compares the composed island graph (node ids + positions,
 * per door state), the island stats, the ground heights under a grid of probe points, the Guide House door/hatch
 * clickables and the survival services. The textured look must change pixels only.
 * Run: SMOKE_BASE=http://127.0.0.1:8097 [LOOK_MODE=live] node tools/check_holm_look_navigation.js */
'use strict';
const puppeteer=require('puppeteer-core'),crypto=require('crypto');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function probe(browser,look){
 const page=await browser.newPage(),errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 // LOOK_MODE=live rehearses production (?holmLive=1: published asset copies under assets/holm_island/)
 await page.goto((process.env.SMOKE_BASE||'http://127.0.0.1:8777')+(process.env.LOOK_MODE==='live'?'/?holmLive=1':'/?holmIsland=1')+'&oldschool='+look+'&qaProfile=look-nav-'+look+'-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:120000});await sleep(3000);
 const r=await page.evaluate(()=>{
  const nodes=HolmArrivalQA.graphNodes().map(n=>[n.id,+n.x.toFixed(3),+n.y.toFixed(3),+n.z.toFixed(3),n.surface].join(':')).sort();
  const heights=[];for(let z=4;z<128;z+=6)for(let x=4;x<144;x+=6){const h=HolmArrivalQA.height(x+.5,z+.5);heights.push(h===null?null:+h.toFixed(4))}
  const house=scene.getObjectByName('world-object-holm_guide_hall'),clickNames=[];
  WORLD.clickables.forEach(o=>{if(o.userData&&/arrival_door|arrival_hatch|arrival_provisions|arrival_chart/.test(o.userData.kind||''))clickNames.push(o.userData.kind+':'+(o.name||''))});
  const surv=scene.getObjectByName('island-building-survival');let maps=0;if(surv)surv.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(m=>{if(m&&m.map)maps++})});
  let houseMaps=0;if(house)house.traverse(o=>{if(o.isMesh)[].concat(o.material).forEach(m=>{if(m&&m.map)houseMaps++})});
  const snap=typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.snapshot():{};
  return {nodes,heights,stats:HolmArrivalQA.islandStats(),clicks:clickNames.sort(),survivalMaps:maps,houseMaps,look:snap.look||null,swaps:snap.swaps||[]};
 });
 await page.close();r.errors=errs;return r;
}
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1280,800','--mute-audio','--enable-gpu','--ignore-gpu-blocklist'],defaultViewport:{width:1280,height:800}});
 const a=await probe(browser,0),b=await probe(browser,1);await browser.close();
 const h=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,16);
 const out={swapsLoaded:b.swaps,previous:{look:a.look,nodes:a.nodes.length,graph:h(a.nodes),heights:h(a.heights),stats:a.stats,clicks:a.clicks.length,houseMaps:a.houseMaps,survivalMaps:a.survivalMaps,errors:a.errors.length},
  oldschool:{look:b.look,nodes:b.nodes.length,graph:h(b.nodes),heights:h(b.heights),stats:b.stats,clicks:b.clicks.length,houseMaps:b.houseMaps,survivalMaps:b.survivalMaps,errors:b.errors.length}};
 const ok=h(a.nodes)===h(b.nodes)&&h(a.heights)===h(b.heights)&&JSON.stringify(a.stats)===JSON.stringify(b.stats)&&JSON.stringify(a.clicks)===JSON.stringify(b.clicks)&&b.houseMaps>0&&b.survivalMaps>0&&a.houseMaps===0&&!a.errors.length&&!b.errors.length&&a.swaps.length===0&&b.swaps.length===15;
 console.log(JSON.stringify(out,null,1));console.log('[LOOK NAVIGATION] '+(ok?'PASS':'FAIL')+' graph/heights/stats/clickables identical across looks; textured maps only in the old-school look');
 process.exit(ok?0:1);
})().catch(e=>{console.error(e);process.exit(1)});
