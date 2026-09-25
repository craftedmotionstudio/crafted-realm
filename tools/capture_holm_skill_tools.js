/* capture_holm_skill_tools.js — held-item + skilling-tool proof captures on the island kit character.
 * Headless Chrome (throwaway QA profile; no save touched). Boots ?holmIsland=1, waits for the kit player and the
 * Blender equipment, then for every held item (hatchet, pickaxe, dagger, sword, bow, staff, shield) freezes the kit's
 * idle / walk / run clips at fixed frames, and for every skilling clip (chop, mine, net, firemake, cook, smith, smelt)
 * freezes the clip at its wind-up / strike frames with the matching Player.action live, then screenshots the character
 * at the game camera (48 deg down) from the front three-quarter and from the right side.
 * Writes scratchpad/holm_skill_tools_v1/<phase>/<shot>.png + <phase>/sheet.png + <phase>/report.json.
 * Run: SMOKE_BASE=http://localhost:8094 node tools/capture_holm_skill_tools.js before|after */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const PHASE=process.argv[2]||'after',ONLY=process.env.ONLY||'';   // ONLY=held|skills for a partial run
const OUT=path.join(__dirname,'..','scratchpad','holm_skill_tools_v1',PHASE);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=skilltools-'+Date.now().toString(36);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const HELD=[['hatchet',null],['pickaxe',null],['bronze_dagger',null],['bronze_sword',null],['worn_bow',null],['apprentice_staff',null],['bronze_dagger','wood_shield']];
// skill -> [Player.action type, clip, frames]; frames are kit clip frames (24 fps)
const SKILLS=[['chop','gather:tree','chop',[0,11]],['mine','gather:rock','mine',[0,9]],['net','gather:fish','net',[8,20]],
  ['firemake','lightfire','firemake|cook',[4,10]],['cook','cook','cook',[0,16]],['smith','smith','smith',[0,7]],['smelt','smelt','smelt',[0,14]]];
// the real login flow, shared with the island QA / playthrough drivers (tracks login changes)
const {enter}=require('./holm_island_driver_lib');
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1280,860','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist'],
    defaultViewport:{width:1280,height:860}});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))});
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:90000});
  await enter(page);
  await page.waitForFunction(()=>typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active()&&typeof HolmEquipment!=='undefined'&&HolmEquipment.status().ready&&typeof HolmItems!=='undefined'&&HolmItems.status().ready,{timeout:120000});
  // freeze harness: wrap the per-frame animation driver so a capture can pin any clip at any frame
  await page.evaluate(()=>{
    window.__cap=null;const orig=window.playerGLBAnim;
    window.playerGLBAnim=function(root,dt,moving,speed){
      const c=window.__cap;if(!c||root!==player)return orig(root,dt,moving,speed);
      const gm=root.userData.gmix;root.rotation.y=c.face;
      const all=[gm.idle,gm.walk,gm.run].concat(Object.values(gm.clips||{}));
      all.forEach(a=>{if(a){a.enabled=true;a.weight=0;}});
      const act=gm.clips[c.clip];if(!act)return orig(root,dt,moving,speed);
      if(!act.isRunning()&&!act.paused)act.play();act.paused=false;act.timeScale=1;act.weight=1;act.time=c.t;
      if(c.oneShot)gm.attack=act;
      gm.mixer.update(0);
    };
    Player.hp=Player.maxHp=99;
    ['hatchet','pickaxe','fishing_net','tinderbox','hammer','raw_perch','copper_ore','tin_ore','logs'].forEach(id=>{if(Player.count(id)<1)Player.addItem(id,1)});
  });
  const shots=[];
  async function frame(name,cap,setup){
    await page.evaluate((cap,setup)=>{
      Player.action=null;Player.target=null;Player.moveTo=null;Player.path=[];
      if(setup.equip){Player.equip.weapon=setup.equip[0];Player.equip.shield=setup.equip[1]||null;refreshPlayerGear();}
      if(setup.action){const [type,rt]=setup.action.split(':');
        const obj=new THREE.Object3D();obj.position.copy(player.position);obj.position.z+=0.4;/* the tick's lookAt turns the kit to face the camera three-quarter, as in the before shots */obj.userData={rtype:rt||null,alive:true,skill:'x'};
        // a live action that never completes (its tick timer starts far below the threshold) and never walks
        Player.action={type:type,obj:obj,t:-1e9,tick:-1e9,slot:-1,bar:'bronze_bar',make:{id:'bronze_dagger',bars:1,name:'Bronze dagger'}};
        window.__capAction=Player.action;}
      window.__cap=cap;
      camCtl.yaw=cap.camYaw;camCtl.pitch=1.08;camCtl.dist=7.5;
    },cap,setup);
    await sleep(700);
    const clip=await page.evaluate(()=>{const p=player.position.clone();p.y+=0.95;const v=p.project(camera);
      const x=(v.x*0.5+0.5)*innerWidth,y=(-v.y*0.5+0.5)*innerHeight;return {x:Math.max(0,x-210),y:Math.max(0,y-250),width:420,height:500};});
    const file=path.join(OUT,name+'.png');await page.screenshot({path:file,clip});
    const info=await page.evaluate(()=>({tool:(typeof HolmSkillTools!=='undefined')?HolmSkillTools.status():null,toolAudit:(typeof HolmSkillTools!=='undefined'&&HolmSkillTools.audit)?HolmSkillTools.audit():null,
      weaponVisible:!!(player.userData.glbGear&&player.userData.glbGear.weapon&&player.userData.glbGear.weapon.visible&&player.userData.glbGear.weapon.parent),
      audit:(window.EquipBuilder&&EquipBuilder.audit)?EquipBuilder.audit():null}));
    shots.push({name,info});console.log('  shot',name,JSON.stringify(info.toolAudit||info.tool||{}),info.weaponVisible?'weapon-shown':'weapon-hidden');
  }
  // character faces world -Z (rotation.y = PI); camera yaw 0.75*PI sees the front-right three-quarter, PI/2 the right side
  const VIEWS=[['q',Math.PI*0.75],['side',Math.PI*0.5]];
  for(const [w,s] of (ONLY==='skills'?[]:HELD)){
    for(const [mode,clip,t] of [['idle','idle',0],['walk','walk',0.25],['run','run',0.2]])
      for(const [vn,yaw] of VIEWS)
        await frame(`held_${w}${s?'+'+s:''}_${mode}_${vn}`,{face:Math.PI,clip,t,camYaw:yaw},{equip:[w,s]});
  }
  for(const [skill,action,clips,frames] of (ONLY==='held'?[]:SKILLS)){
    const clip=await page.evaluate(c=>c.split('|').find(n=>player.userData.gmix.clips[n])||null,clips);
    if(!clip){console.log('  (no clip for '+skill+')');continue;}
    for(const f of frames)for(const [vn,yaw] of VIEWS)
      await frame(`skill_${skill}_f${f}_${vn}`,{face:Math.PI,clip,t:f/24,camYaw:yaw,oneShot:true},{equip:[skill==='chop'?'hatchet':'bronze_sword','wood_shield'],action});
  }
  await page.evaluate(()=>{window.__cap=null;Player.action=null;});
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({phase:PHASE,base:BASE,errors,shots},null,1));
  console.log('errors',errors.length,errors.slice(0,5));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
