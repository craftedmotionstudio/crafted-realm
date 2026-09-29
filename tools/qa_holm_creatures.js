/* Holm creatures QA (owner request 2026-09-29): the large rat that replaced the grubkins, the rat, the goblin, the chicken
 * and the cow, checked in headless Chrome on the game's own loader (three r128, charNpcModel from src/npc_chars.js).
 *  A. the viewer (tools/holm_creatures_view.html): every creature loads with its six clips (idle, walk, attack, hit,
 *     block, death) at their authored lengths, the attack's impact at half its clip, feet on the ground, sized by its
 *     glbHeight; evidence: a contact sheet of the models from six angles, a frame strip of every clip, a lineup still;
 *  B. the island draft (?holmIsland=1): the combat trials' practice large rats (keep court 3, mage yard 2, names, levels,
 *     their clips loaded), the Proving Ground's large rats and rat matriarch, Haycombe Farm's live hens and cows (on walk
 *     graph nodes; the still prop hen and cow hidden); a rat flinches with its hit clip; a chicken and a cow killed by the
 *     adventurer fall with their death clips, lie, sink, and drop their 2004 loot (bones + feathers; bones + hide + beef);
 *     stills of the keep court, the farm and the Proving Ground.
 * Writes scratchpad/holm_creatures/{browser/*.png, island/*.png, qa.json}; prints PASS/FAIL per rule.
 * Run: SMOKE_BASE=http://127.0.0.1:8191 node tools/qa_holm_creatures.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter}=L;
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'scratchpad','holm_creatures'),BR=path.join(OUT,'browser'),IS=path.join(OUT,'island');
[OUT,BR,IS].forEach(d=>fs.mkdirSync(d,{recursive:true}));
const BASEURL=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const results=[];let fails=0;
function rule(name,ok,detail){results.push({name,ok:!!ok,detail});if(!ok)fails++;console.log((ok?'  ok  ':'  FAIL ')+name+(detail!==undefined?'  '+JSON.stringify(detail).slice(0,260):''))}
const png=(file,url)=>fs.writeFileSync(file,Buffer.from(url.replace(/^data:image\/png;base64,/,''),'base64'));
const CLIPS={idle:true,walk:true,attack:false,hit:false,block:false,death:false};

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1400,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1400,height:900}});
  const data={};const errs=[];
  try{
    /* ---------------- A. the viewer ---------------- */
    console.log('A. viewer');
    {const page=await browser.newPage();page.on('pageerror',e=>errs.push('viewer: '+String(e).slice(0,200)));
     await page.goto(BASEURL+'/tools/holm_creatures_view.html',{waitUntil:'load',timeout:90000});
     await page.waitForFunction(()=>window.CreatureView&&CreatureView.ready(),{timeout:60000});await sleep(500);
     const rep=await page.evaluate(()=>CreatureView.report());data.viewer=rep;
     rule('five creatures load through charNpcModel (large rat, rat, goblin, chicken, cow)',rep.length===5&&rep.every(r=>r.loaded),rep.map(r=>[r.id,r.loaded]));
     rule('every creature carries the six clips: idle, walk, attack, hit, block, death',rep.every(r=>Object.keys(CLIPS).every(c=>r.clips[c]>0)),rep.map(r=>[r.id,r.clips]));
     rule('the attack clips are 0.6 s (the impact frame 9 of 18 is half the clip, CombatFX.impactTime)',rep.every(r=>Math.abs(r.clips.attack-.6)<1e-3),rep.map(r=>r.clips.attack));
     rule('each stands on the ground at its data height (glbHeight)',rep.every(r=>Math.abs(r.minY)<.02&&Math.abs(r.size[1]-r.glbHeight)<.02),rep.map(r=>[r.id,r.minY,r.size[1],r.glbHeight]));
     rule('names per the naming bible: Large rat, Rat, Goblin, Chicken, Cow',JSON.stringify(rep.map(r=>r.name))===JSON.stringify(['Large rat','Rat','Goblin','Chicken','Cow']),rep.map(r=>r.name));
     rule('low-poly budgets (<= 3000 triangles each)',rep.every(r=>r.tris>0&&r.tris<=3000),rep.map(r=>[r.id,r.tris]));
     await page.evaluate(()=>{CreatureView.solo(null);CreatureView.yaw(.25);CreatureView.setClip('idle')});await sleep(1200);
     await page.screenshot({path:path.join(BR,'lineup.png')});
     png(path.join(BR,'contact_sheet.png'),await page.evaluate(()=>CreatureView.sheet()));
     for(const r of rep)for(const c of Object.keys(CLIPS))png(path.join(BR,r.id+'_'+c+'.png'),await page.evaluate((id,c)=>CreatureView.strip(id,c,c==='idle'?8:6),r.id,c));
     rule('evidence: the contact sheet and 30 clip frame strips written',fs.existsSync(path.join(BR,'contact_sheet.png'))&&rep.every(r=>Object.keys(CLIPS).every(c=>fs.existsSync(path.join(BR,r.id+'_'+c+'.png')))));
     await page.close();}

    /* ---------------- B. the island ---------------- */
    console.log('B. island');
    const page=await browser.newPage();page.on('pageerror',e=>errs.push(String(e).slice(0,200)));L.setOut(IS);
    await page.setViewport({width:1400,height:900});
    const BASE=BASEURL+'/?holmIsland=1&qaProfile=creatures-'+Date.now().toString(36);
    for(let a=1;;a++){try{await page.goto(BASE+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('boot retry',a)}}
    await page.waitForFunction(()=>typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().length>0&&typeof HolmFarmAnimals!=='undefined'&&HolmFarmAnimals.npcs().length>0&&HolmProvingGround.npcs().length>0,{timeout:90000});
    await page.waitForFunction(()=>WORLD.npcs.filter(n=>n.t&&n.t.deathClip).every(n=>n.mesh.userData.gmix),{timeout:60000}).catch(()=>{});
    await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);HolmIslandTalk.adopt();
      SKILLS.forEach(s=>Player.xp[s]=XP_TABLE[30]||0);Player.maxHp=Player.lvl('Hitpoints');Player.hp=Player.maxHp;UI.refreshSkills();UI.refreshHud();
      Player.equip.weapon='bronze_sword';refreshPlayerGear();UI.refreshEquip()});
    const census=await page.evaluate(()=>{const g=n=>{const m=n.mesh.userData.gmix;return {type:n.typeId,name:n.t.name,level:n.t.level,glb:n.t.glbChar,
        clips:m?['idle','walk','attack','hit','block','death'].filter(c=>!!m[c]):[],pen:n.islandPen||null,node:n.node?{tx:n.node.tx,tz:n.node.tz}:null,x:+n.mesh.position.x.toFixed(2),z:+n.mesh.position.z.toFixed(2)}};
      const hidden=[];scene.children.forEach(o=>{if(/^island-prop-dress-haycombe-farm-(chicken|cow)-\d+$/.test(o.name||''))hidden.push([o.name,o.visible])});
      return {trials:HolmIslandTrials.npcs().map(g),pg:HolmProvingGround.npcs().map(g),farm:HolmFarmAnimals.npcs().map(g),hidden,
        nodes:HolmFarmAnimals.npcs().map(n=>{LocalCombat.register(n);const q=TileNav.nodeNear(n.mesh.position.x,n.mesh.position.y,n.mesh.position.z,1);return !!q&&Math.hypot(q.x-n.mesh.position.x,q.z-n.mesh.position.z)<.05})}});
    data.census=census;
    const six=a=>a.every(n=>n.clips.length===6);
    rule('combat trials: 3 practice large rats in the keep court and 2 in the mage yard (the trial counts kept)',census.trials.filter(n=>n.pen==='keep-court').length===3&&census.trials.filter(n=>n.pen==='mage-yard').length===2,census.trials.map(n=>n.pen));
    rule('the trial rats are "Large rat (level-3)", the Blender large rat with all six clips',census.trials.every(n=>n.name==='Large rat'&&n.level===3&&n.glb==='holm_large_rat_v1')&&six(census.trials),census.trials.map(n=>[n.name,n.level,n.clips.length]));
    rule('Proving Ground: three large rats and the rat matriarch (the grubkins are gone)',census.pg.filter(n=>n.type==='pg_large_rat').length===3&&census.pg.filter(n=>n.type==='pg_rat_matriarch').length===1&&six(census.pg.filter(n=>n.glb)),census.pg.map(n=>[n.type,n.name]));
    rule('Haycombe Farm: five chickens (level-1) and two cows (level-2), live, with their six clips',census.farm.filter(n=>n.name==='Chicken'&&n.level===1).length===5&&census.farm.filter(n=>n.name==='Cow'&&n.level===2).length===2&&six(census.farm),census.farm.map(n=>[n.name,n.x,n.z]));
    rule('the farm animals stand on walk-graph nodes',census.nodes.length===7&&census.nodes.every(Boolean),census.nodes);
    rule('the still prop hen and cow they replace are hidden (the data and the walk graph untouched)',census.hidden.length===6&&census.hidden.every(h=>!h[1]),census.hidden);
    rule('no grubkin anywhere in the world',await page.evaluate(()=>!WORLD.npcs.some(n=>/grub/i.test(n.typeId+' '+(n.t&&n.t.name)+' '+(n.t&&n.t.glbChar||'')))));
    // stills: place the adventurer by each group and look at it
    async function look(where,name,yaw,pitch,dist){await page.evaluate((w,y,p,d)=>{const nodes=HolmArrivalQA.graphNodes();let best=null,bd=1e9;nodes.forEach(n=>{const k=Math.hypot(n.x-w[0],n.z-w[1]);if(k>=2.5&&k<=4.5&&Math.abs(k-3.2)<bd&&/land|Terrain/.test(n.surface||'')){bd=Math.abs(k-3.2);best=n}});
      if(best)HolmArrivalQA.qaPlace(best.id);HolmArrivalQA.qaView(w[0],w[1]);camCtl.yaw=y;camCtl.pitch=p;camCtl.dist=d},where,yaw,pitch,dist);await sleep(2600);await L.shot(page,name);await page.evaluate(()=>HolmArrivalQA.qaViewClear())}
    const cen=a=>[a.reduce((s,n)=>s+n.x,0)/a.length,a.reduce((s,n)=>s+n.z,0)/a.length];
    await page.evaluate(()=>WORLD.npcs.forEach(n=>{n.wanderR=0}));
    await look(cen(census.trials.filter(n=>n.pen==='keep-court')),'keep_court_rats',.6,.95,7);
    await look(cen(census.farm.filter(n=>n.name==='Chicken')),'farm_hens',.3,.8,6);
    await look(cen(census.farm.filter(n=>n.name==='Cow')),'farm_cows',.2,.85,7);
    await look(cen(census.pg),'proving_ground',.4,.9,12);
    // a flinch: the practice rat's hit clip plays when a blow lands (dmg > 0)
    {const r=census.trials.find(n=>n.pen==='keep-court');const name=await page.evaluate(x=>{const n=HolmIslandTrials.npcs().find(q=>q.islandPen==='keep-court'&&!q.dead);n.t=Object.assign({},n.t,{hp:5000,def:1,dBonus:-60});n.hp=5000;return n.mesh.name},r);
     const hit=await page.evaluate(async nm=>{const n=WORLD.npcs.find(q=>q.mesh.name===nm),sleep=ms=>new Promise(r=>setTimeout(r,ms));const nt=n.node||TileNav.nodeNear(n.mesh.position.x,n.mesh.position.y,n.mesh.position.z,3);
       for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const m=TileNav.nodeAt(nt.tx+dx,nt.tz+dz,nt.y);if(m&&m.id){HolmArrivalQA.qaPlace(m.id);break}}
       Player.xp.Attack=XP_TABLE[60];Player.xp.Strength=XP_TABLE[60];LocalCombat.orderAttack(n);let seen=false,splats=0;const t0=performance.now();
       while(performance.now()-t0<12000&&!seen){await sleep(40);const g=n.mesh.userData.gmix;if(g&&g.hit&&g.hit.isRunning())seen=true}
       LocalCombat.clearInteraction();return {seen}},name);
     rule('a blow that lands plays the large rat\'s own hit clip (CombatFX.react)',hit.seen,hit);await page.evaluate(()=>LocalCombat.clearInteraction());}
    // kills: a chicken and a cow fall with their death clips, lie, sink, and leave their drops
    for(const [label,want] of [['Chicken',['bones','feathers']],['Cow',['bones','beast_hide','raw_beef']]]){
      const r=await page.evaluate(async (label)=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));const n=HolmFarmAnimals.npcs().find(q=>q.t.name===label&&!q.dead);if(!n)return {error:'none'};
        const nt=n.node||TileNav.nodeNear(n.mesh.position.x,n.mesh.position.y,n.mesh.position.z,3);let placed=false;
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const m=TileNav.nodeAt(nt.tx+dx,nt.tz+dz,nt.y);if(m&&m.id&&TileNav.bfs(TileNav.nodeNear(m.x,m.y,m.z,1),q=>q.tx===nt.tx&&q.tz===nt.tz,{max:20})){HolmArrivalQA.qaPlace(m.id);placed=true;break}}
        const before=new Set(WORLD.drops);n.hp=1;LocalCombat.orderAttack(n);let fall=null;const t0=performance.now();
        while(performance.now()-t0<15000&&!n.dead)await sleep(50);
        const d=n.mesh.userData.death,g=n.mesh.userData.gmix;fall={style:d&&d.style,dur:d&&+(d.dur||0).toFixed(2),clip:!!(g&&g.deathOn)};
        let holding=null;while(performance.now()-t0<20000&&n.dying){await sleep(60);const dd=n.mesh.userData.death;if(dd&&!dd.wait&&dd.t>dd.dur&&holding===null)holding=+n.mesh.position.y.toFixed(3)}
        const drops=WORLD.drops.filter(m=>!before.has(m)).map(m=>m.userData.id);
        return {placed,dead:n.dead,fall,sunk:!n.dying&&!n.mesh.visible,drops,respawn:n.t.respawn}},label);
      rule(label+': killed, it falls with its own death clip, then sinks away',r.dead&&r.fall&&r.fall.style==='clip'&&r.fall.clip&&r.sunk,r);
      rule(label+': drops its 2004 loot ('+want.join(', ')+')',want.every(w=>r.drops&&r.drops.includes(w)),r.drops);
      await L.shot(page,'kill_'+label.toLowerCase()+'_loot');await page.evaluate(()=>LocalCombat.clearInteraction());
    }
    rule('no page errors',errs.length===0,errs.slice(0,4));
  }catch(e){rule('driver',false,String(e&&e.stack||e).slice(0,600))}
  finally{
    fs.writeFileSync(path.join(OUT,'qa.json'),JSON.stringify({results,data,errors:errs},null,1));
    console.log('[HOLM CREATURES] '+(results.length-fails)+'/'+results.length+' '+(fails?'FAIL':'PASS'));
    await browser.close();process.exit(fails?1:0);
  }
})();
