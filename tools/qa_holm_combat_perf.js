/* Combat feel performance probe (2026-09-25): no GC churn per frame, bounded pools, cheap frames.
 * Boots the island draft, brings one practice grubkin beside the adventurer (instance position/home/hp only, so the
 * fight stays in reach and lasts), then fights it for 8 s with each style while
 *   - CDP HeapProfiler sampling records every allocation site (64-byte interval), and
 *   - CombatFX.update / CombatFX.draw are timed per frame.
 * Gates: combat_fx.js allocates < 4 KB/s of retained-or-not samples during the fights (pools, no per-frame garbage),
 * update+draw average < 0.5 ms, every pool stays bounded, and the page has no errors.
 * Run: SMOKE_BASE=http://localhost:8095 node tools/qa_holm_combat_perf.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const {enter,sleep}=require('./holm_island_driver_lib');
const OUT=path.join(__dirname,'..','scratchpad','holm_combat_v1');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=combatperf-'+Date.now().toString(36);
const checks=[];function ok(l,c,d){checks.push({l,ok:!!c,d});console.log((c?'  ok  ':'  FAIL ')+l+(d?'  '+JSON.stringify(d):''));}
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
  const result={};
  try{
    for(let a=1;;a++){try{await page.goto(BASE+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('  boot retry '+a);errs.length=0}}
    await page.waitForFunction(()=>typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().some(n=>!n.dead&&n.mesh.children.length),{timeout:60000});
    await page.evaluate(()=>{
      const n=HolmIslandTrials.npcs().find(n=>!n.dead);window.__perfNpc=n;
      // two tiles east on the player's own ground, home moved with it so the leash never pulls it away
      n.mesh.position.set(player.position.x+2,player.position.y,player.position.z);n.home.copy(n.mesh.position);n.hp=100000;
      Player.inv=Player.inv.map(()=>null);Player.addItem('arrows',500);Player.addItem('air_rune',500);Player.addItem('mind_rune',500);UI.refreshInv();
      const t={u:[],d:[]};window.__perfT=t;const U=CombatFX.update,D=CombatFX.draw;
      CombatFX.update=function(dt){const a=performance.now();U(dt);t.u.push(performance.now()-a)};
      CombatFX.draw=function(){const a=performance.now();D();t.d.push(performance.now()-a)};
    });
    const cdp=await page.target().createCDPSession();await cdp.send('HeapProfiler.enable');
    const styles=[['melee',()=>{Player.spell=null;Player.castMode=false;Player.equip.weapon='bronze_dagger'}],
                  ['ranged',()=>{Player.spell=null;Player.castMode=false;Player.equip.weapon='worn_bow'}],
                  ['magic',()=>{Player.equip.weapon=null;Player.spell='wind_strike';Player.castMode=true}]];
    for(const [name,setup] of styles){
      await page.evaluate(`(${setup.toString()})();refreshPlayerGear();window.__perfT.u.length=0;window.__perfT.d.length=0;Player.target=window.__perfNpc;`);
      await sleep(600);
      await cdp.send('HeapProfiler.startSampling',{samplingInterval:64});
      const t0=Date.now();await sleep(8000);const secs=(Date.now()-t0)/1000;
      const {profile}=await cdp.send('HeapProfiler.stopSampling');
      const bySrc={},byFn={};
      (function walk(n){const f=n.callFrame,sz=n.selfSize||0;if(sz){const u=(f.url||'').replace(/^.*\/src\//,'src/').replace(/\?.*$/,'')||'(native)';bySrc[u]=(bySrc[u]||0)+sz;
        if(/combat_fx\.js/.test(f.url))byFn[f.functionName||'(anon)']=(byFn[f.functionName||'(anon)']||0)+sz}(n.children||[]).forEach(walk)})(profile.head);
      const t=await page.evaluate(()=>{const t=window.__perfT,avg=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),p95=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length*.95)]||0};
        return {frames:t.u.length,updAvg:+avg(t.u).toFixed(4),updP95:+p95(t.u).toFixed(4),drawAvg:+avg(t.d).toFixed(4),drawP95:+p95(t.d).toFixed(4),hits:window.__perfNpc.hp,stats:CombatFX.stats()}});
      const cfx=bySrc['src/combat_fx.js']||0;
      result[name]={secs,combatFxBytesPerSec:Math.round(cfx/secs),topSources:Object.entries(bySrc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>[k,Math.round(v/secs)]),combatFxByFn:byFn,...t};
      await page.evaluate(()=>{Player.target=null});await sleep(1500);
      ok(name+': combat_fx.js allocates under 4 KB/s while fighting (pools; no per-frame garbage)',result[name].combatFxBytesPerSec<4096,{bytesPerSec:result[name].combatFxBytesPerSec,byFn:byFn});
      ok(name+': CombatFX.update + draw average under 0.5 ms a frame',t.updAvg+t.drawAvg<0.5,{frames:t.frames,update:[t.updAvg,t.updP95],draw:[t.drawAvg,t.drawP95]});
      ok(name+': the fight really ran (damage dealt, effects spawned)',100000-t.hits>0||t.stats.particlePool>0,{dealt:100000-t.hits,stats:t.stats});
    }
    const pools=await page.evaluate(()=>CombatFX.stats());
    ok('pools stay bounded (particles <= 160, arrows <= 6, projectiles/events small)',pools.particlePool<=160&&pools.arrowPool<=6&&pools.fxPool<=8&&pools.eventPool<=16&&pools.xpPool<=16,pools);
    ok('zero page errors',errs.length===0,{errs});
  }catch(e){ok('driver completed',false,{error:String(e).slice(0,400)})}
  finally{
    fs.writeFileSync(path.join(OUT,'perf_result.json'),JSON.stringify({pass:checks.every(c=>c.ok),checks,result},null,1));
    console.log('[COMBAT PERF] '+(checks.every(c=>c.ok)?'PASS':'FAIL')+' '+checks.filter(c=>c.ok).length+'/'+checks.length);
    await browser.close();process.exit(checks.every(c=>c.ok)?0:1);
  }
})();
