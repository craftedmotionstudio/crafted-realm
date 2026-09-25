/* Combat feel captures (2026-09-25): drives real fights on the island draft (?holmIsland=1) in headless Chrome and
 * records them, for the owner's review sheets in scratchpad/holm_combat_v1/.
 * The adventurer walks to the Warden's Keep court like the QA harness (clicked hops), then fights the practice
 * grubkins with a bronze dagger (stab, pound, slash), the worn shortbow and Wind Strike. Attacking = setting
 * Player.target, exactly what clicking "Attack" does. Only for the capture, each target's own hp is raised (instance
 * state, never the shared NPC type) so one fight shows several splats, then lowered for the kill.
 * Output: <style>_NNN.jpg screencast frames (+ frames.json with game-time stamps and live splat read-outs), stills.
 * BEFORE=1 records the same fights on the game as it was before the pass: requests for the files the pass touched
 * are answered with their 9670a03 versions from git (nothing on disk changes).
 * Run: SMOKE_BASE=http://localhost:8095 node tools/capture_holm_combat_feel.js [outDir] */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,walkTo}=L;
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..','scratchpad','holm_combat_v1','raw'));fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=combatfeel-'+Date.now().toString(36);

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
  const log={runs:[],errors:errs,before:process.env.BEFORE==='1'};
  if(log.before){
    const OLD=['index.html','src/game2_world.js','src/game3_systems.js','src/game4_ui.js','src/game5_main.js','src/npc_chars.js','src/holm_island_player.js','src/holm_island_trials.js'];
    const body={};for(const f of OLD)body['/'+f]=cp.execSync('git show 9670a03:'+f,{cwd:path.join(__dirname,'..'),maxBuffer:64<<20});
    await page.setRequestInterception(true);
    page.on('request',r=>{const u=new URL(r.url());const k=u.pathname==='/'?'/index.html':u.pathname;
      if(body[k])r.respond({status:200,contentType:k.endsWith('.html')?'text/html':'application/javascript',body:body[k]});else r.continue()});
  }
  try{
    // python's http.server can refuse a burst of connections (listen backlog 5) and a lost script breaks the boot: retry
    for(let a=1;;a++){try{await page.goto(BASE+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('boot retry',a,String(e).slice(0,80));errs.length=0}}
    await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice(0,-1))});await sleep(1500);
    await page.evaluate(()=>{window.__qaTrace=[]});
    const w=await walkTo(page,'keep','court',true,[]);console.log('walk',JSON.stringify(w));
    await page.evaluate(()=>{Player.inv=Player.inv.map(()=>null);['bronze_dagger','worn_bow'].forEach(i=>Player.addItem(i,1));Player.addItem('arrows',200);Player.addItem('air_rune',200);Player.addItem('mind_rune',200);
      const lv={Attack:12,Strength:24,Defence:10,Ranged:22,Magic:14,Hitpoints:18};for(const s in lv)Player.xp[s]=XP_TABLE[lv[s]];Player.maxHp=18;Player.hp=18;UI.refreshInv();UI.refreshSkills();UI.refreshHud()});
    const cdp=await page.target().createCDPSession();let rec=null;
    cdp.on('Page.screencastFrame',async f=>{try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId})}catch(e){}if(rec)rec.push({data:f.data,ts:f.metadata.timestamp})});
    async function fight(label,setup,opts){
      opts=opts||{};
      const info=await page.evaluate((setup,opts)=>{
        const pool=HolmIslandTrials.npcs().filter(n=>!n.dead&&n.islandPen==='keep-court').sort((a,b)=>a.mesh.position.distanceTo(player.position)-b.mesh.position.distanceTo(player.position));
        // ranged and magic shoot across the court: the farthest grubkin still in reach; melee takes the nearest
        const npc=opts.far?(pool.filter(n=>n.mesh.position.distanceTo(player.position)<8.5).pop()||pool[0]):pool[0];
        if(!npc)return {error:'no grubkin'};
        npc.hp=opts.hp||24;Player.hp=Player.maxHp;
        if(setup==='melee'){Player.spell=null;Player.castMode=false;Player.equip.weapon='bronze_dagger';Player.attackStyles.melee=opts.styleIdx||0}
        if(setup==='ranged'){Player.spell=null;Player.castMode=false;Player.equip.weapon='worn_bow';Player.attackStyles.ranged=0}
        if(setup==='magic'){Player.equip.weapon=null;Player.spell='wind_strike';Player.castMode=true}
        refreshPlayerGear();UI.refreshEquip&&UI.refreshEquip();
        if(!opts.noAttack)Player.target=npc;window.__cfxNpc=npc;return {name:npc.mesh.name,hp:npc.hp}},setup,opts);
      if(info.error)return info;
      await sleep(opts.settle||1500);   // let the adventurer step into range, then frame the fight
      info.frame=await page.evaluate(opts=>{
        const npc=window.__cfxNpc,ray=new THREE.Raycaster();
        const pts=[player.position.clone(),npc.mesh.position.clone()];pts[0].y+=1.1;pts[1].y+=0.4;
        const mid=opts.focus==='npc'?pts[1].clone():opts.focus==='player'?pts[0].clone():pts[0].clone().lerp(pts[1],.5);window.__qaCameraFocus={x:mid.x,y:opts.focus==='npc'?npc.mesh.position.y:player.position.y,z:mid.z};
        if(opts.focus==='npc')pts.shift();else if(opts.focus==='player')pts.pop();
        const a0=player.position,a1=npc.mesh.position,base=Math.atan2(-(a1.z-a0.z),a1.x-a0.x)+(opts.yawOff||0);
        const blockers=[];scene.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||/^cfx/.test(o.name))return;let v=true;for(let q=o;q;q=q.parent)if(q.visible===false){v=false;break}
          const m=[].concat(o.material)[0];if(v&&m&&!(m.transparent&&m.opacity<0.05)&&m.visible!==false)blockers.push(o)});
        let best=null,tries=0;
        for(const off of [0,Math.PI,.35,-.35,Math.PI+.35,Math.PI-.35,.7,-.7,Math.PI+.7,Math.PI-.7,1.1,-1.1,Math.PI+1.1,Math.PI-1.1,1.57,-1.57]){
          for(const pitch of [opts.pitch||.6,(opts.pitch||.6)+.25,(opts.pitch||.6)+.5]){tries++;
            camCtl.yaw=base+off;camCtl.pitch=pitch;camCtl.dist=opts.dist||9.5;const cam=followCameraGoal();let clear=true;
            for(const t of pts){const dir=t.clone().sub(cam),len=dir.length();ray.set(cam,dir.normalize());ray.near=0.3;ray.far=Math.max(0.1,len-0.7);if(ray.intersectObjects(blockers,false).length){clear=false;break}}
            if(clear){best={yaw:+(base+off).toFixed(2),pitch,tries};break}}
          if(best)break}
        if(!best){camCtl.yaw=base;camCtl.pitch=1.2;camCtl.dist=opts.dist||9.5;best={fallback:true,tries}}
        if(typeof snapFollowCamera==='function')snapFollowCamera();
        return best},opts);
      await sleep(400);
      rec=[];const samples=[];const t0=Date.now();
      await cdp.send('Page.startScreencast',{format:'jpeg',quality:82,everyNthFrame:1});
      const until=Date.now()+(opts.ms||9000);let killAt=opts.killAfter?Date.now()+opts.killAfter:0;
      if(opts.demo==='stack')page.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms)),n=window.__cfxNpc;
        await s(500);for(const d of [2,0,3,1]){n.hp-=d;UI.floatDmg(n.mesh,d);await s(160)}n.hp=30}).catch(()=>{});
      if(opts.demo==='hurt')page.evaluate(async()=>{const s=ms=>new Promise(r=>setTimeout(r,ms));
        await s(600);Player.hp=Math.max(1,Player.hp-3);UI.floatDmg(player,3);await s(700);UI.floatDmg(player,0);await s(2500);Player.hp=Player.maxHp}).catch(()=>{});
      while(Date.now()<until){
        const s=await page.evaluate(()=>({T:typeof CombatFX!=='undefined'?CombatFX.stats().t:0,splats:typeof CombatFX!=='undefined'?CombatFX.qaSplats():[],stats:typeof CombatFX!=='undefined'?CombatFX.stats():{particles:0,projectiles:typeof PROJECTILES!=='undefined'?PROJECTILES.length:0},npcHp:window.__cfxNpc.hp,dead:window.__cfxNpc.dead,
          scr:(()=>{const r=[];for(const o of [player,window.__cfxNpc.mesh]){const v=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);v.y+=0.8;v.project(camera);r.push([Math.round((v.x+1)/2*innerWidth),Math.round((1-v.y)/2*innerHeight)])}return r})(),
          target:!!Player.target,clip:(()=>{const g=player.userData.gmix,a=g&&g.attack;return a&&a.isRunning()?a.getClip().name+'@'+a.time.toFixed(2):null})(),wall:Date.now()}));
        samples.push(s);
        if(killAt&&Date.now()>killAt){killAt=0;await page.evaluate(()=>{const n=window.__cfxNpc;if(!n.dead)n.hp=1})}
        if(s.dead&&opts.stopAfterDeath&&!opts._deadAt)opts._deadAt=Date.now();
        if(opts._deadAt&&Date.now()-opts._deadAt>opts.stopAfterDeath)break;
        await sleep(60);
      }
      await cdp.send('Page.stopScreencast');const frames=rec;rec=null;
      const dir=path.join(OUT,label);fs.mkdirSync(dir,{recursive:true});
      frames.forEach((f,i)=>fs.writeFileSync(path.join(dir,String(i).padStart(3,'0')+'.jpg'),Buffer.from(f.data,'base64')));
      fs.writeFileSync(path.join(dir,'frames.json'),JSON.stringify({label,info,t0,frames:frames.map((f,i)=>({i,ts:f.ts})),samples},null,1));
      await page.evaluate(()=>{Player.target=null;window.__qaCameraFocus=null});await sleep(1200);
      console.log(label,JSON.stringify(info.frame),'frames',frames.length,'samples',samples.length,'maxSplats',Math.max(...samples.map(s=>s.splats.length)),'dead',samples.some(s=>s.dead));
      return {label,frames:frames.length,samples:samples.length};
    }
    const only=(process.env.CFX_ONLY||'').split(',').filter(Boolean),want=l=>!only.length||only.includes(l);
    if(want('melee_stab'))log.runs.push(await fight('melee_stab','melee',{styleIdx:0,hp:30,ms:16000,killAfter:8500,stopAfterDeath:3500,dist:7.5,pitch:.72}));
    if(want('melee_crush'))log.runs.push(await fight('melee_crush','melee',{styleIdx:1,hp:30,ms:8000,dist:7.5,pitch:.72,yawOff:.4}));
    if(want('melee_slash'))log.runs.push(await fight('melee_slash','melee',{styleIdx:2,hp:30,ms:8000,dist:7.5,pitch:.72,yawOff:-.4}));
    if(want('ranged'))log.runs.push(await fight('ranged','ranged',{far:true,hp:30,ms:16000,killAfter:8000,stopAfterDeath:3500,dist:10,pitch:.62}));
    if(want('magic'))log.runs.push(await fight('magic','magic',{far:true,hp:30,ms:16000,killAfter:8000,stopAfterDeath:3500,dist:10,pitch:.62}));
    // presentation demo (not a fight): four hits in quick succession show the OSRS stacking pattern, and a hurt adventurer
    // shows the red splat, the kit's hit clip and the overhead bar. Only CombatFX.hit is called (+ the capture's own hp dip).
    if(want('stack'))log.runs.push(await fight('stack','melee',{styleIdx:0,hp:30,ms:3200,dist:6,pitch:.7,noAttack:true,demo:'stack',focus:'npc'}));
    if(want('hurt'))log.runs.push(await fight('hurt','melee',{styleIdx:0,hp:30,ms:4600,dist:6,pitch:.55,noAttack:true,demo:'hurt',focus:'player'}));
    log.stats=await page.evaluate(()=>typeof CombatFX!=='undefined'?CombatFX.stats():null);
  }catch(e){log.error=String(e).slice(0,500);console.log('ERROR',e)}
  finally{fs.writeFileSync(path.join(OUT,'capture_log.json'),JSON.stringify(log,null,1));console.log('errors',JSON.stringify(errs.slice(0,8)));await browser.close()}
})();
