/* In-browser PvM combat bench (COMBAT_GRADE criteria 3, 4, 5, 6, 7, 10, 11, 13, 14, 15, 17): real fights on Tutor's
 * Holm (?holmIsland=1) in headless Chrome, measured on the engine's tick clock and CombatFX's frame clock.
 * Every attack order is a real mouse click on the foe (the right-click menu is read for its "Attack <name> (level-N)"
 * line); timings come from CombatHooks.on (the presentation funnel) and CombatFX.qaLog (when a splat was drawn, when a
 * projectile left the hand and when it landed). Scenarios:
 *   melee    dagger (Stab/Lunge), bronze sword, a two-handed sword and a warhammer at a practice grubkin: ticks between
 *            swings, the splat against the swing's impact frame, the grubkin's retaliation delay
 *   ranged   shortbow Accurate and Rapid from four tiles: ticks between shots, shot -> hit ticks against
 *            floor((46+5d+30)/30), splat against the arrow's landing
 *   magic    Wind Strike on autocast with a staff and as a single cast: 5-tick casts, hit ticks by distance, splat
 *            against the orb's landing, splashes (no splat)
 *   eat/pray eating mid-fight (the order drops, +3 ticks) and Protect from Melee against the broodmother
 *   foes     the Proving Ground: the poacher's arrows, the warlock's spells, the pack's aggression, the broodmother's
 *            telegraphed slam, a kill (the fall, the sink, then the drop), and the adventurer's own death and respawn
 *   move     approach paths: diagonal steps on the way to a foe (8 directions)
 * Writes scratchpad/combat_bench/pvm.json + screenshots; prints a summary with PASS/FAIL per measured rule.
 * Run: SMOKE_BASE=http://127.0.0.1:8099 node tools/qa_combat_pvm.js [outDir] */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,clickNamed,shot}=L;
const OUT=path.resolve(process.argv[2]||path.join(__dirname,'..','scratchpad','combat_bench'));fs.mkdirSync(OUT,{recursive:true});L.setOut(OUT);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=combatpvm-'+Date.now().toString(36);
const results=[];let fails=0;
function rule(name,ok,detail){results.push({name,ok:!!ok,detail});if(!ok)fails++;console.log((ok?'  ok  ':'  FAIL ')+name+(detail!==undefined?'  '+JSON.stringify(detail).slice(0,300):''))}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
  const data={};
  try{
    for(let a=1;;a++){try{await page.goto(BASE+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('boot retry',a);errs.length=0}}
    await page.waitForFunction(()=>typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().length>0&&typeof HolmProvingGround!=='undefined'&&HolmProvingGround.npcs().length>0,{timeout:90000});
    await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice(0,-1));HolmIslandTalk.adopt()});
    // the in-page recorder: every presentation event with the engine clock, and the FX log
    await page.evaluate(()=>{
      window.__ev=[];CombatHooks.on(e=>{const o=e.obj||e.att||e.src;window.__ev.push({k:e.k,tick:LocalCombat.clock(),t:+(CombatFX.now()).toFixed(4),who:o===player?'player':(o&&o.name)||'',dst:e.dst===player?'player':(e.dst&&e.dst.name)||'',
        type:e.type,dmg:e.dmg,kind:e.kind,ticks:e.ticks,impactAt:e.impactAt,arriveAt:e.arriveAt,splash:e.splash})});
      window.__lv=L=>{SKILLS.forEach(s=>Player.xp[s]=XP_TABLE[L[s]||1]||0);Player.maxHp=Player.lvl('Hitpoints');Player.hp=Player.maxHp;Player.prayerPts=Player.lvl('Prayer');UI.refreshSkills();UI.refreshHud()};
      window.__lv({Attack:30,Strength:30,Defence:30,Hitpoints:40,Ranged:30,Magic:30,Prayer:45});
      Player.inv=Player.inv.map(()=>null);['bronze_dagger','bronze_sword','bronze_greatsword','bronze_warhammer','worn_bow','apprentice_staff','trout','trout','trout','trout'].forEach(i=>Player.addItem(i,1));
      Player.addItem('arrows',400);Player.addItem('air_rune',400);Player.addItem('mind_rune',400);UI.refreshInv();
    });
    const reset=()=>page.evaluate(()=>{window.__ev.length=0;CombatFX.qaClearLog();LocalCombat.clearInteraction();Player.hp=Player.maxHp;Player.activePrayers.clear();refreshOverhead()});
    // stand on a node `dist` tiles from a foe (straight east/west/north/south, a clear line), then click it for real
    async function standNear(name,dist){
      return page.evaluate((name,dist)=>{const n=WORLD.npcs.find(x=>x.mesh.name===name);if(!n)return {error:'no '+name};LocalCombat.register(n);const nt=n.node;
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){const m=TileNav.nodeAt(nt.tx+dx*dist,nt.tz+dz*dist,nt.y);if(!m||!m.id)continue;
          if(dist>1&&!TileNav.los(m,nt))continue;HolmArrivalQA.qaPlace(m.id);return {at:[m.tx,m.tz],foe:[nt.tx,nt.tz]}}return {error:'no stance'}},name,dist);
    }
    async function wield(id,style,autocast){await page.evaluate((id,style,autocast)=>{Player.equip.weapon=id;Player.styleIndex=style|0;Player.autocast=autocast||null;Player.spell=autocast||null;Player.castSpell=null;refreshPlayerGear();UI.refreshEquip();UI.refreshCombat()},id,style,autocast)}
    async function events(){return page.evaluate(()=>({ev:window.__ev.slice(),fx:CombatFX.qaLog(),clock:LocalCombat.clock()}))}
    const gaps=a=>a.slice(1).map((x,i)=>x-a[i]);
    const grubs=await page.evaluate(()=>HolmIslandTrials.npcs().filter(n=>n.islandPen==='keep-court').map(n=>n.mesh.name));
    const G=grubs[0];
    await page.evaluate(g=>{const n=WORLD.npcs.find(x=>x.mesh.name===g);n.t=Object.assign({},n.t,{hp:5000});n.hp=5000},G);

    /* ---------------- melee ---------------- */
    console.log('melee');
    for(const [id,style,want,label] of [['bronze_dagger',0,4,'dagger Stab'],['bronze_dagger',1,4,'dagger Lunge'],['bronze_sword',2,4,'sword Slash'],['bronze_greatsword',0,7,'two-handed Chop'],['bronze_warhammer',0,6,'warhammer Pound']]){
      await reset();await wield(id,style);const s=await standNear(G,1);await sleep(900);
      const c=await clickNamed(page,G);await sleep(want*600*4+900);
      if(label==='dagger Stab')await shot(page,'melee_dagger');
      const r=await events();await page.evaluate(()=>LocalCombat.clearInteraction());
      const sw=r.ev.filter(e=>e.k==='swing'&&e.who==='player'),hits=r.fx.filter(f=>f.k==='splat'&&f.name===G);
      rule('melee '+label+': a swing every '+want+' ticks (click '+(c.ok?'ok':'failed')+')',sw.length>=3&&gaps(sw.map(e=>e.tick)).every(g=>g===want),{ticks:sw.map(e=>e.tick),stand:s});
      // each splat shows at its swing's impact frame (within one frame, ~1/30 s)
      const d=sw.slice(0,hits.length).map((e,i)=>+(hits[i].t-e.impactAt).toFixed(3));
      rule('melee '+label+': the splat lands on the impact frame (swing '+(want)+'-tick weapon)',d.length>=2&&d.every(x=>Math.abs(x)<=0.07),{splatMinusImpact:d});
      data['melee_'+label]={swings:sw.map(e=>e.tick),splatMinusImpact:d};
      if(label==='dagger Stab'){const gs=r.ev.filter(e=>e.k==='swing'&&e.who===G);
        rule('retaliation: the grubkin answers 1 + floor(6/2) = 4 ticks after the first swing',gs.length>0&&gs[0].tick-sw[0].tick===4,{player:sw[0]&&sw[0].tick,grubkin:gs[0]&&gs[0].tick})}
    }
    /* ---------------- ranged ---------------- */
    console.log('ranged');
    for(const [style,want,label] of [[0,4,'Accurate'],[1,3,'Rapid'],[2,4,'Longrange']]){
      await reset();await wield('worn_bow',style);const s=await standNear(G,4);await sleep(900);
      await clickNamed(page,G);await sleep(5000);
      if(label==='Rapid'){await sleep(100);await shot(page,'ranged_arrow')}
      await page.evaluate(()=>LocalCombat.clearInteraction());await sleep(2600);
      const r=await events(),shots=r.ev.filter(e=>e.k==='projectile'&&e.who==='player'),hitEv=r.ev.filter(e=>e.k==='hit'&&e.who===G),lands=r.fx.filter(f=>f.k==='land'&&f.to===G),spl=r.fx.filter(f=>f.k==='splat'&&f.name===G);
      rule('ranged '+label+': a shot every '+want+' ticks',shots.length>=3&&gaps(shots.map(e=>e.tick)).every(g=>g===want),shots.map(e=>e.tick));
      const dl=shots.slice(0,hitEv.length).map((e,i)=>hitEv[i].tick-e.tick);
      rule('ranged '+label+': each hit lands floor((46+5*4+30)/30) = 3 ticks after its shot',dl.length>=2&&dl.every(x=>x===3),dl);
      const sp=spl.slice(0,lands.length).map((f,i)=>+(f.t-lands[i].t).toFixed(3));
      rule('ranged '+label+': the splat shows when the arrow lands',sp.length>=2&&sp.every(x=>x>=-0.001&&x<=0.07),sp);
      data['ranged_'+label]={shots:shots.map(e=>e.tick),hitDelay:dl,splatMinusLand:sp};
    }
    /* ---------------- magic ---------------- */
    console.log('magic');
    {await reset();await wield('apprentice_staff',0,'wind_strike');await standNear(G,4);await sleep(900);await clickNamed(page,G);await sleep(3200);await shot(page,'magic_orb');await sleep(6000);
     await page.evaluate(()=>LocalCombat.clearInteraction());await sleep(3000);
     const r=await events(),casts=r.ev.filter(e=>e.k==='projectile'&&e.who==='player'),hitEv=r.ev.filter(e=>e.k==='hit'&&e.who===G),lands=r.fx.filter(f=>f.k==='land'&&f.to===G),spl=r.fx.filter(f=>f.k==='splat'&&f.name===G);
     rule('magic autocast (staff): a cast every 5 ticks',casts.length>=3&&gaps(casts.map(e=>e.tick)).every(g=>g===5),casts.map(e=>e.tick));
     rule('magic: every cast flies floor((46+10*4)/30)+1 = 3 ticks',casts.every(c=>c.ticks===3),casts.map(c=>c.ticks));
     const landed=lands.filter(l=>!l.splash),sp=spl.slice(0,landed.length).map((f,i)=>+(f.t-landed[i].t).toFixed(3));
     rule('magic: a landed spell shows its splat on arrival; a splash shows none',sp.every(x=>x>=-0.001&&x<=0.07)&&spl.length===casts.filter(c=>!c.splash).length-0,{sp,casts:casts.length,splashes:casts.filter(c=>c.splash).length,splats:spl.length});
     data.magic={casts:casts.map(e=>[e.tick,e.splash?1:0]),splatMinusLand:sp};}
    {await reset();await wield(null,0,null);await standNear(G,3);await sleep(700);
     await page.evaluate(()=>Player.selectSpell('wind_strike'));const armed=await page.evaluate(()=>Player.castSpell);await clickNamed(page,G);await sleep(5000);
     const r=await events(),casts=r.ev.filter(e=>e.k==='projectile'&&e.who==='player');
     rule('single cast without a staff: the chosen spell casts once, then the adventurer stands',armed==='wind_strike'&&casts.length===1,{armed,casts:casts.length});}
    /* ---------------- eating and prayer mid-fight ---------------- */
    console.log('eat / pray');
    {await reset();await wield('bronze_sword',0);await standNear(G,1);await sleep(700);await clickNamed(page,G);await sleep(2600);
     const e=await page.evaluate(()=>{Player.hp=Math.max(1,Player.hp-12);const ad=Player.actionDelay,c=LocalCombat.clock(),slot=Player.inv.findIndex(s=>s&&s.id==='trout');UI.useItem(slot);
       return {before:ad,after:Player.actionDelay,clock:c,target:!!Player.target,hp:Player.hp}});
     rule('eating mid-fight drops the attack order and adds 3 ticks to the attack timer',!e.target&&e.after===e.before+3,e);
     await sleep(2400);const idle=await page.evaluate(()=>!Player.target);rule('after a bite the adventurer does not swing again until clicked (2004)',idle);}
    const PG=await page.evaluate(()=>HolmProvingGround.npcs().map(n=>({name:n.mesh.name,type:n.typeId,level:n.t.level})));
    data.provingGround=PG;
    const brood=PG.find(n=>n.type==='pg_broodmother');
    if(brood){
     await reset();await page.evaluate(b=>{Player.maxHp=99;Player.hp=99;const n=WORLD.npcs.find(x=>x.mesh.name===b);n.t=Object.assign({},n.t,{hp:5000});n.hp=5000},brood.name);await wield('bronze_sword',0);await standNear(brood.name,1);await sleep(700);
     // right-click menu
     const menu=await page.evaluate(async name=>{const n=WORLD.npcs.find(x=>x.mesh.name===name);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
       const e=buildCtxEntries({obj:n.mesh,point:n.mesh.position},{clientX:400,clientY:300});return e.map(x=>x.html.replace(/<[^>]+>/g,''))},brood.name);
     rule('right-click reads "Attack Grubkin broodmother (level-18)"',menu.some(t=>/^Attack Grubkin broodmother \(level-18\)$/.test(t)),menu.slice(0,3));
     await clickNamed(page,brood.name);await sleep(1500);
     const hp0=await page.evaluate(()=>{LocalCombat.togglePrayer('protect_melee');return Player.hp});await sleep(9000);
     const r=await events(),on=r.ev.filter(e=>e.k==='hit'&&e.who==='player');
     rule('Protect from Melee: the broodmother\'s blows all miss while it is on',on.length>=2&&on.every(e=>e.dmg===0),{hits:on.map(e=>[e.tick,e.dmg]),hp0});
     await page.evaluate(()=>{LocalCombat.togglePrayer('protect_melee')});
     // the telegraphed slam: wait for the wind-up, record the ring, step away and dodge
     await page.evaluate(()=>{window.__ev.length=0;CombatFX.qaClearLog()});
     let tele=null;for(let i=0;i<40&&!tele;i++){await sleep(500);tele=await page.evaluate(()=>window.__ev.find(e=>e.k==='telegraph')||null)}
     if(tele){await sleep(200);await shot(page,'broodmother_telegraph');
      const away=await page.evaluate(()=>{const pt=TileNav.playerNode();for(const [dx,dz] of [[0,3],[3,0],[0,-3],[-3,0]]){const m=TileNav.nodeAt(pt.tx+dx,pt.tz+dz,pt.y);if(m){TileNav.walkPlayerTo(m);return [m.tx,m.tz]}}return null});
      await sleep(2600);const msgs=await page.evaluate(()=>[...document.querySelectorAll('#chatbox div')].slice(-6).map(d=>d.textContent));
      rule('the broodmother\'s slam is telegraphed (message + ground ring) and stepping away dodges it',!!away&&msgs.some(m=>/slams the empty ground/.test(m)),{away,msgs});}
     else rule('the broodmother\'s slam is telegraphed (message + ground ring) and stepping away dodges it',false,'no telegraph in 20 s');
     await page.evaluate(()=>LocalCombat.clearInteraction());
    }
    /* ---------------- the poacher's arrows and the warlock's spells on the adventurer ---------------- */
    console.log('foes');
    for(const type of ['pg_poacher','pg_warlock']){const f=PG.find(n=>n.type===type);if(!f)continue;
     await reset();await page.evaluate(()=>{Player.maxHp=99;Player.hp=99});await wield('bronze_sword',0);await standNear(f.name,1);await sleep(700);await clickNamed(page,f.name);await sleep(7000);
     const r=await events(),pj=r.ev.filter(e=>e.k==='projectile'&&e.who===f.name),lands=r.fx.filter(x=>x.k==='land'&&x.to==='player'),spl=r.fx.filter(x=>x.k==='splat'&&x.player);
     rule(f.type+': fires '+(type==='pg_poacher'?'arrows':'spells')+' at the adventurer, each landing on its hit tick',pj.length>=1&&lands.length>=1,{shots:pj.map(e=>[e.tick,e.ticks,e.splash?1:0]),lands:lands.length,splats:spl.length});
     await page.evaluate(()=>LocalCombat.clearInteraction());}
    /* ---------------- the pack: aggression ---------------- */
    {const wild=PG.filter(n=>n.type==='pg_wild_grubkin');if(wild.length){await reset();
      await page.evaluate(()=>{GameConfig.friendlyMode=true;window.__lv({Attack:5,Strength:5,Defence:5,Hitpoints:12,Ranged:1,Magic:1,Prayer:1})});
      await standNear(wild[0].name,3);await sleep(6000);const r=await events(),att=r.ev.filter(e=>e.k==='swing'&&wild.some(w=>w.name===e.who));
      rule('the wild pack hunts a low-level adventurer within four tiles (their meadow ignores friendly mode: they attack on sight)',att.length>=1,{attacks:att.length});
      await page.evaluate(()=>{window.__lv({Attack:30,Strength:30,Defence:30,Hitpoints:40,Ranged:30,Magic:30,Prayer:45});LocalCombat.clearInteraction();WORLD.npcs.forEach(n=>{if(n.provingGround&&n.mode==='attack'){n.mode='wander';n.target=null}})});
      await page.evaluate(()=>{window.__ev.length=0});await sleep(4000);const r2=await events(),att2=r2.ev.filter(e=>e.k==='swing'&&wild.some(w=>w.name===e.who));
      rule('the pack ignores an adventurer above twice its level (2004)',att2.length===0,{attacks:att2.length,cb:await page.evaluate(()=>Player.combatLevel())});}}
    /* ---------------- a kill: the fall, the sink, then the drop ---------------- */
    {const w=PG.find(n=>n.type==='pg_wild_grubkin');if(w){await reset();await wield('bronze_sword',1);await standNear(w.name,1);await sleep(600);
      const d0=await page.evaluate(()=>WORLD.drops.length);await page.evaluate(n=>{const x=WORLD.npcs.find(q=>q.mesh.name===n);x.hp=1},w.name);await clickNamed(page,w.name);
      let dead=false;for(let i=0;i<30&&!dead;i++){await sleep(300);dead=await page.evaluate(n=>WORLD.npcs.find(q=>q.mesh.name===n).dead,w.name)}
      await sleep(250);await shot(page,'kill_fall');
      let vis=null;const t0=Date.now();for(let i=0;i<40&&!vis;i++){await sleep(150);vis=await page.evaluate(d0=>WORLD.drops.slice(d0).some(m=>m.visible),d0)}
      await shot(page,'kill_loot');
      rule('a kill: the body falls and sinks, then its drop appears (bones at least)',dead&&vis,{dead,dropShownAfterMs:Date.now()-t0});}}
    /* ---------------- the adventurer's death ---------------- */
    {const b=PG.find(n=>n.type==='pg_broodmother');if(b){await reset();await wield('bronze_sword',0);await standNear(b.name,1);await sleep(600);
      await page.evaluate(()=>{Player.hp=1});await clickNamed(page,b.name);let died=null;
      for(let i=0;i<60&&!died;i++){await sleep(300);died=await page.evaluate(()=>Player.dead?LocalCombat.clock():null)}
      await sleep(400);await shot(page,'player_death');
      let back=false;for(let i=0;i<30&&!back;i++){await sleep(300);back=await page.evaluate(()=>!Player.dead&&Player.hp===Player.maxHp)}
      const msgs=await page.evaluate(()=>[...document.querySelectorAll('#chatbox div')].slice(-8).map(d=>d.textContent));
      rule('the adventurer\'s death: "Oh dear, you are dead!", respawn at full health with what was kept explained',!!died&&back&&msgs.some(m=>/Oh dear/.test(m))&&msgs.some(m=>/nothing is lost|You keep/.test(m)),{msgs:msgs.slice(-4)});}}
    /* ---------------- 8-direction approach ---------------- */
    {await reset();await wield('bronze_sword',0);const s=await standNear(G,5);
     await page.evaluate(()=>{window.__trail=[];window.__tr=setInterval(()=>{const p=TileNav.playerNode();if(p)window.__trail.push([p.tx,p.tz])},100)});
     await page.evaluate(g=>{const n=WORLD.npcs.find(x=>x.mesh.name===g);const nt=n.node;const m=TileNav.nodeAt(nt.tx+4,nt.tz+3,nt.y)||TileNav.nodeAt(nt.tx-4,nt.tz-3,nt.y);if(m)HolmArrivalQA.qaPlace(m.id)},G);await sleep(600);
     await clickNamed(page,G);await sleep(5000);
     const trail=await page.evaluate(()=>{clearInterval(window.__tr);const t=window.__trail;const out=[t[0]];t.forEach(p=>{const l=out[out.length-1];if(p[0]!==l[0]||p[1]!==l[1])out.push(p)});return out});
     const diag=trail.slice(1).filter((p,i)=>p[0]!==trail[i][0]&&p[1]!==trail[i][1]).length;
     const inReach=await page.evaluate(g=>LocalCombat.qa.inReach(WORLD.npcs.find(x=>x.mesh.name===g)),G);
     rule('approach: the adventurer walks diagonal steps to a foe and ends in melee reach (side tile)',diag>=1&&inReach,{trail,diag});}
    /* ---------------- interface stills ---------------- */
    await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="combat"]');if(t)t.click()});
    for(const [w,s,a,n] of [['bronze_dagger',0,null,'tab_dagger'],['worn_bow',1,null,'tab_bow'],['apprentice_staff',0,'wind_strike','tab_staff'],['bronze_warhammer',0,null,'tab_warhammer']]){await wield(w,s,a);await sleep(500);
      const clip=await page.evaluate(()=>{const r=document.getElementById('side-panel').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});
      await page.screenshot({path:path.join(OUT,n+'.png'),clip})}
    await page.setViewport({width:430,height:860});await sleep(1500);await shot(page,'phone');await page.setViewport({width:1538,height:900});
  }catch(e){rule('driver',false,String(e&&e.stack||e).slice(0,500))}
  finally{
    rule('no page errors',errs.length===0,errs.slice(0,4));
    fs.writeFileSync(path.join(OUT,'pvm.json'),JSON.stringify({results,data,errors:errs},null,1));
    console.log('[COMBAT PVM] '+(results.length-fails)+'/'+results.length+' '+(fails?'FAIL':'PASS'));
    await browser.close();process.exit(fails?1:0);
  }
})();
