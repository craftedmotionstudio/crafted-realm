/* Combat-numbers lock (combat feel pass, 2026-09-25): proves the presentation work (hit splats, health bars,
 * projectiles, sounds, XP drops, reactions) left the combat NUMBERS exactly as they were.
 * In the real game (?holmIsland=1) it seeds Math.random with a fixed PRNG inside ONE synchronous evaluate (so no
 * frame, NPC wander or bot can interleave a roll), sets fixed levels, then drives the game's own functions:
 *   - 40 melee swings for each of the four melee styles (bronze dagger), 40 shortbow shots per ranged style,
 *     40 Wind Strikes per magic style, all at a practice grubkin (its per-instance hp raised so nothing dies)
 *   - 40 melee and 40 ranged attacks from ordinary (harmful) NPC types at the player
 * and records every damage roll, every XP grant (skill + amount, in order), and the attack cooldown each swing sets.
 * Projectiles are landed by calling updateProjectiles in 0.1 s steps (the flight time is presentation only).
 * The fingerprint is compared with tools/fixtures/holm_combat_numbers_baseline.json, recorded on the commit BEFORE
 * the combat feel pass (9670a03). RECORD=1 rewrites the baseline (only ever do that on unchanged combat code).
 * Run: SMOKE_BASE=http://localhost:8095 node tools/qa_holm_combat_numbers.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const {enter}=require('./holm_island_driver_lib');
const FIX=path.join(__dirname,'fixtures','holm_combat_numbers_baseline.json');
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=combatnum-'+Date.now().toString(36);

async function fingerprint(page){
  return page.evaluate(()=>{
    // everything below is synchronous: nothing else can draw from Math.random while the seed is in place
    try{Sfx.ensure()}catch(e){}   // the SFX noise buffer is built from Math.random on first use: build it before seeding
    const mulberry=a=>function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
    const saved={random:Math.random,inv:Player.inv.map(s=>s&&Object.assign({},s)),equip:Object.assign({},Player.equip),xp:Object.assign({},Player.xp),
      hp:Player.hp,maxHp:Player.maxHp,spell:Player.spell,castMode:Player.castMode,styles:Object.assign({},Player.attackStyles),auto:Player.autoRetaliate,
      target:Player.target,prayers:new Set(Player.activePrayers),spec:Player.spec,specArmed:Player.specArmed,moveTo:Player.moveTo,path:Player.path,action:Player.action};
    const out={swings:[],npcHits:[],meta:{}};
    const grub=HolmIslandTrials.npcs().find(n=>!n.dead);
    if(!grub)return {error:'no live grubkin'};
    const gsaved={hp:grub.hp,pos:grub.mesh.position.clone(),target:grub.target,cd:grub.attackCd};
    const xpLog=[];const addXp=Player.addXp;
    const extras=[];
    try{
      Math.random=mulberry(20260925);
      Player.addXp=function(s,a){xpLog.push([s,+(+a).toFixed(6)]);return addXp.apply(this,arguments)};
      Player.autoRetaliate=false;Player.activePrayers=new Set();Player.specArmed=false;Player.action=null;
      const L={Attack:20,Strength:22,Defence:15,Ranged:21,Magic:19,Hitpoints:25,Prayer:1};
      SKILLS.forEach(s=>Player.xp[s]=XP_TABLE[L[s]||1]||0);Player.maxHp=25;Player.hp=100000;
      Player.inv=new Array(24).fill(null);Player.addItem('arrows',2000);Player.addItem('air_rune',2000);Player.addItem('mind_rune',2000);
      // stand the grubkin one tile east of the player at the player's height: in reach of every style, clear line of sight
      grub.mesh.position.set(player.position.x+1.2,player.position.y,player.position.z);grub.hp=1e9;
      const land=()=>{for(let i=0;i<120&&PROJECTILES.length;i++)updateProjectiles(0.1)};
      const run=(label,setup,n)=>{setup();
        for(let i=0;i<n;i++){const hp0=grub.hp,x0=xpLog.length;Player.attackCd=0;Player.target=grub;
          playerAttack(grub,0.6);const cd=+Player.attackCd.toFixed(4);land();
          out.swings.push([label,Math.round(hp0-grub.hp),cd,xpLog.slice(x0)])}};
      const wield=(w,style,idx)=>()=>{Player.spell=null;Player.castMode=false;Player.equip.weapon=w;Player.attackStyles[style]=idx};
      for(let k=0;k<4;k++)run('melee'+k,wield('bronze_dagger','melee',k),40);
      for(let k=0;k<3;k++)run('ranged'+k,wield('worn_bow','ranged',k),40);
      for(let k=0;k<2;k++)run('magic'+k,()=>{Player.equip.weapon=null;Player.spell='wind_strike';Player.castMode=true;Player.attackStyles.magic=k},40);
      // NPCs attacking the player: the first harmful melee type and the first harmful ranged type (data order)
      Player.hp=100000;Player.spell=null;Player.castMode=false;Player.equip.weapon='bronze_dagger';Player.attackStyles.melee=0;
      const ids=Object.keys(NPC_TYPES);
      const pickT=r=>ids.find(id=>{const t=NPC_TYPES[id];return !t.harmless&&!!t.ranged===r&&t.att>=5&&t.speedTicks>0&&!t.script});
      [['melee',pickT(false),1.2],['ranged',pickT(true),4]].forEach(([kind,id,d])=>{
        const t=NPC_TYPES[id];const mesh=new THREE.Object3D();mesh.position.set(player.position.x+d,player.position.y,player.position.z);
        const npc={typeId:id,t,mesh,hp:t.hp,attackCd:0,dead:false,target:'player',home:mesh.position.clone()};extras.push(npc);
        out.meta[kind+'Npc']=id;
        for(let i=0;i<40;i++){const hp0=Player.hp,x0=xpLog.length;npc.attackCd=0;
          npcAttack(npc,0.6);const cd=+npc.attackCd.toFixed(4);land();
          out.npcHits.push([kind,Math.round(hp0-Player.hp),cd,xpLog.slice(x0)])}
      });
      out.meta.levels=L;
    }catch(e){out.error=String(e&&e.stack||e).slice(0,600)}
    finally{
      Math.random=saved.random;Player.addXp=addXp;
      Player.inv=saved.inv;Player.equip=saved.equip;Player.xp=saved.xp;Player.hp=saved.hp;Player.maxHp=saved.maxHp;Player.spell=saved.spell;Player.castMode=saved.castMode;
      Player.attackStyles=saved.styles;Player.autoRetaliate=saved.auto;Player.target=null;Player.activePrayers=saved.prayers;Player.spec=saved.spec;Player.specArmed=saved.specArmed;
      Player.moveTo=null;Player.path=[];Player.action=null;Player.attackCd=0;
      grub.hp=gsaved.hp;grub.mesh.position.copy(gsaved.pos);grub.target=null;grub.attackCd=gsaved.cd;
      try{UI.refreshInv();UI.refreshHud();UI.refreshSkills()}catch(e){}
    }
    const sum=a=>a.reduce((s,r)=>s+r[1],0),xpSum=a=>{const m={};a.forEach(r=>r[3].forEach(([s,v])=>m[s]=+((m[s]||0)+v).toFixed(4)));return m};
    out.summary={swings:out.swings.length,attacksMade:out.swings.filter(r=>r[2]>0).length,npcAttacksMade:out.npcHits.filter(r=>r[2]>0).length,npcHits:out.npcHits.length,playerDamage:sum(out.swings),npcDamage:sum(out.npcHits),
      zeros:out.swings.filter(r=>r[1]===0).length,xp:xpSum(out.swings.concat(out.npcHits))};
    return out;
  });
}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1280,800','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1280,height:800}});
  let pass=false;
  try{
    const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
    await page.goto(BASE,{waitUntil:'load',timeout:120000});await enter(page);
    await page.waitForFunction(()=>typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().length>0,{timeout:60000});
    const fp=await fingerprint(page);
    if(fp.error){console.log('  FAIL fingerprint run: '+fp.error);}
    else if(process.env.RECORD==='1'){
      fs.mkdirSync(path.dirname(FIX),{recursive:true});fs.writeFileSync(FIX,JSON.stringify(fp));
      console.log('  recorded baseline '+JSON.stringify(fp.summary));pass=true;
    } else {
      const base=JSON.parse(fs.readFileSync(FIX,'utf8'));
      const a=JSON.stringify(base.swings),b=JSON.stringify(fp.swings),c=JSON.stringify(base.npcHits),d=JSON.stringify(fp.npcHits);
      const firstDiff=(x,y)=>{for(let i=0;i<Math.max(x.length,y.length);i++)if(JSON.stringify(x[i])!==JSON.stringify(y[i]))return {i,baseline:x[i],now:y[i]};return null};
      const okP=a===b,okN=c===d;
      console.log((okP?'  ok  ':'  FAIL ')+'player attacks: '+fp.swings.length+' seeded swings (4 melee, 3 ranged, 2 magic styles) roll the same damage, cooldowns and XP grants as the baseline'+(okP?'':' '+JSON.stringify(firstDiff(base.swings,fp.swings))));
      console.log((okN?'  ok  ':'  FAIL ')+'NPC attacks: '+fp.npcHits.length+' seeded melee + ranged hits on the player match the baseline'+(okN?'':' '+JSON.stringify(firstDiff(base.npcHits,fp.npcHits))));
      console.log('  summary now      '+JSON.stringify(fp.summary));
      console.log('  summary baseline '+JSON.stringify(base.summary));
      pass=okP&&okN&&errs.length===0;
      if(errs.length)console.log('  FAIL page errors '+JSON.stringify(errs.slice(0,4)));
    }
  }catch(e){console.log('  FAIL driver: '+String(e).slice(0,400))}
  finally{console.log('[COMBAT NUMBERS] '+(pass?'PASS':'FAIL'));await browser.close();process.exit(pass?0:1)}
})();
