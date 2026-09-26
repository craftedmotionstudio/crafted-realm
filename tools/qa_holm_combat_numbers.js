/* Combat-numbers lock in the LIVE game (re-baselined once, 2026-09-26, for the owner's "exact 2004 rules" decision;
 * the pre-2004 fixture tools/fixtures/holm_combat_numbers_baseline.json is kept only for the before/after record).
 * In the real game (?holmIsland=1) it runs tools/combat_fingerprint.js — the same seeded scenario tools/test_combat.js
 * runs through the engine headless — inside ONE synchronous evaluate: the game loop's combat ticks are paused
 * (LocalCombat.enable(false)), the engine's combat stream is seeded, and the engine's own ticks are driven directly.
 * The adventurer stands on a Keep-court stance with open ground to the east; the practice targets and the three
 * monsters stand 1 or 4 tiles east on real island graph nodes. The result must equal
 * tools/fixtures/combat_fingerprint_2004.json byte for byte: the live client runs exactly the headless rules.
 * Run: SMOKE_BASE=http://127.0.0.1:8099 node tools/qa_holm_combat_numbers.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const {enter}=require('./holm_island_driver_lib');
const {combatFingerprint}=require('./combat_fingerprint');
const FIX=path.join(__dirname,'fixtures','combat_fingerprint_2004.json');
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=combatnum-'+Date.now().toString(36);

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1280,800','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1280,height:800}});
  let pass=false;
  try{
    const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
    for(let a=1;;a++){try{await page.goto(BASE+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('  boot retry '+a);errs.length=0}}
    await page.waitForFunction(()=>typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().length>0&&typeof LocalCombat!=='undefined'&&LocalCombat.ready(),{timeout:60000});
    // a stance with four open, linked graph tiles to the east (the Keep court, else anywhere on land)
    const at=await page.evaluate(()=>{
      const g=HolmArrivalQA.navGraph(),s=HolmArrivalQA.qaStance('keep','court');
      const ok=n=>{for(let d=1;d<=4;d++){if(!TileNav.nodeAt(n.tx+d,n.tz,n.y))return false}return true};
      const cands=g.nodes.filter(n=>n.owner==='land'||/Terrain$/.test(n.surface)).map(n=>TileNav.nodeNear(n.x,n.y,n.z,0)).filter(Boolean);
      cands.sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z));
      const n=cands.find(ok);if(!n)return null;HolmArrivalQA.qaPlace(n.id);return {id:n.id,tx:n.tx,tz:n.tz}});
    if(!at)throw new Error('no stance with open ground to the east');
    await new Promise(r=>setTimeout(r,1200));
    const fp=await page.evaluate(fnSrc=>{
      const combatFingerprint=new Function('return '+fnSrc)();
      const pt=TileNav.playerNode(),made=[];
      const env={LC:LocalCombat,Player,SPELLS,CRShared,
        spawn:(id,dist,t)=>{const node=TileNav.nodeAt(pt.tx+dist,pt.tz,pt.y);const mesh=new THREE.Object3D();mesh.position.set(node.x,node.y,node.z);
          const def=Object.assign({},NPC_TYPES[id],t||{});const n={typeId:id,t:def,mesh,hp:def.hp,home:mesh.position.clone(),dead:false,wanderR:0,hpbar:{spr:{visible:false},draw(){}}};
          mesh.userData={kind:'npc',npc:n};scene.add(mesh);WORLD.npcs.push(n);made.push(n);LocalCombat.register(n);return n},
        remove:n=>{const i=WORLD.npcs.indexOf(n);if(i>=0)WORLD.npcs.splice(i,1);if(n.mesh.parent)n.mesh.parent.remove(n.mesh)},
        onHit:fn=>CombatHooks.on(fn),give:(id,q)=>Player.addItem(id,q),
        setLevels:L=>{SKILLS.forEach(s=>Player.xp[s]=XP_TABLE[L[s]||1]||0);Player.maxHp=Player.lvl('Hitpoints');Player.hp=Player.maxHp}};
      const saved={xp:Object.assign({},Player.xp),inv:Player.inv.map(s=>s&&Object.assign({},s)),equip:Object.assign({},Player.equip),hp:Player.hp,maxHp:Player.maxHp};
      try{return combatFingerprint(env)}
      finally{made.forEach(env.remove);Player.xp=saved.xp;Player.inv=saved.inv;Player.equip=saved.equip;Player.hp=saved.hp;Player.maxHp=saved.maxHp;
        try{UI.refreshInv();UI.refreshHud();UI.refreshSkills()}catch(e){}}
    },combatFingerprint.toString());
    if(fp.error){console.log('  FAIL fingerprint run: '+fp.error)}
    else{
      const base=JSON.parse(fs.readFileSync(FIX,'utf8'));
      const firstDiff=(x,y)=>{for(let i=0;i<Math.max(x.length,y.length);i++)if(JSON.stringify(x[i])!==JSON.stringify(y[i]))return {i,headless:x[i],live:y[i]};return null};
      const okP=JSON.stringify(base.swings)===JSON.stringify(fp.swings),okN=JSON.stringify(base.npcHits)===JSON.stringify(fp.npcHits);
      console.log('  stance '+JSON.stringify(at));
      console.log((okP?'  ok  ':'  FAIL ')+'player attacks: '+fp.swings.length+' seeded attacks (4 melee, 3 ranged, 2 magic styles) in the live game = the headless 2004 engine (damage, attack gaps, XP)'+(okP?'':' '+JSON.stringify(firstDiff(base.swings,fp.swings))));
      console.log((okN?'  ok  ':'  FAIL ')+'monster blows: '+fp.npcHits.length+' seeded melee, magic and ranged blows on the adventurer match'+(okN?'':' '+JSON.stringify(firstDiff(base.npcHits,fp.npcHits))));
      console.log('  summary live     '+JSON.stringify(fp.summary));
      console.log('  summary headless '+JSON.stringify(base.summary));
      pass=okP&&okN&&errs.length===0;
      if(errs.length)console.log('  FAIL page errors '+JSON.stringify(errs.slice(0,4)));
    }
  }catch(e){console.log('  FAIL driver: '+String(e).slice(0,400))}
  finally{console.log('[COMBAT NUMBERS] '+(pass?'PASS':'FAIL'));await browser.close();process.exit(pass?0:1)}
})();
