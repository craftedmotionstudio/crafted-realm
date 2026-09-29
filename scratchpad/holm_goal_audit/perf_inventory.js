// One-off diagnosis for the audit: which groups draw the most at the widest island views (draw calls are load-independent).
const puppeteer=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--mute-audio','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
 const p=await b.newPage();await p.goto('http://127.0.0.1:8171/?qaProfile=perfinv-'+Date.now().toString(36),{waitUntil:'load',timeout:180000});
 await p.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
 await p.evaluate(()=>document.getElementById('btn-new').click());await p.waitForFunction(()=>document.getElementById('login-create').style.display!=='none');
 await p.evaluate(()=>(document.getElementById('btn-begin').click(),CharCfg._new=false));await p.waitForFunction(()=>typeof running!=='undefined'&&running&&typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,{timeout:180000});await sleep(5000);
 for(const v of [{name:'default_camera_at_landing',x:null},{name:'08_island_overview_max_zoom',x:72,z:64,yaw:0,pitch:1.2,dist:70},{name:'01_arrival_wide',x:66,z:104,yaw:.35,pitch:.8,dist:40}]){
  await p.evaluate(v=>{if(v.x!==null){HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist}},v);await sleep(4000);
  const r=await p.evaluate(()=>{const st=CRPerfProbe.renderStats();const inv=CRPerfProbe.inventory();const rows=Object.entries(inv).map(([k,e])=>[k,e.inView,e.inViewTris,e.materials]).sort((a,b)=>b[1]-a[1]).slice(0,12);return {calls:st.calls,tris:st.triangles,cam:[camCtl.dist,camCtl.pitch],top:rows}});
  console.log(v.name,JSON.stringify(r));}
 await b.close()})().catch(e=>{console.error(e);process.exit(1)});
