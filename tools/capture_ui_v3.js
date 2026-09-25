/* capture_ui_v3.js — screenshots for UI round 3 (owner 2026-09-25: "more old-school medieval, less polished; every icon
 * drawn from our own Blender models"). Captures the login screen, the creator, the HUD, every side tab, the combat tab
 * with each weapon family, the minimap cluster + rail, chat box, right-click menu, tooltip and every window that opens.
 * Output: scratchpad/holm_ui_v3/<label>/*.png + <label>/report.json
 * Run: SMOKE_BASE=http://127.0.0.1:8096 node tools/capture_ui_v3.js before|after */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter}=L;
const LABEL=process.argv[2]||'after';
const OUT=path.join(__dirname,'..','scratchpad','holm_ui_v3',LABEL);fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const W=1538,H=900;
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size='+W+','+H,'--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:W,height:H}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,200))});
  const shot=(n,clip)=>page.screenshot(Object.assign({path:path.join(OUT,n+'.png')},clip?{clip}:{})).catch(e=>console.log('shot fail',n,e.message));
  const rectOf=(sel,pad)=>page.evaluate((sel,pad)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();if(!r.width)return null;
    const x=Math.max(0,r.x-pad),y=Math.max(0,r.y-pad);return {x,y,width:Math.min(innerWidth-x,r.width+2*pad),height:Math.min(innerHeight-y,r.height+2*pad)}},sel,pad||8);
  const unionOf=(sels,pad)=>page.evaluate((sels,pad)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;sels.forEach(s=>{const e=document.querySelector(s);if(!e)return;const r=e.getBoundingClientRect();if(!r.width)return;
    x0=Math.min(x0,r.x);y0=Math.min(y0,r.y);x1=Math.max(x1,r.right);y1=Math.max(y1,r.bottom)});if(x0>1e8)return null;x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);
    return {x:x0,y:y0,width:Math.min(innerWidth-x0,x1-x0+2*pad),height:Math.min(innerHeight-y0,y1-y0+2*pad)}},sels,pad||6);
  const run=(fn,arg)=>page.evaluate(new Function('arg','return ('+fn.toString()+')(arg)'),arg).catch(e=>String(e).slice(0,160));
  await page.goto(BASE+'/?qaProfile=uiv3-'+LABEL+'-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
  await sleep(3000);await shot('01_login');
  await page.evaluate(()=>document.getElementById('btn-new').click());await sleep(700);await shot('01b_login_create');
  await page.evaluate(()=>document.getElementById('btn-create-back').click());await sleep(300);
  await enter(page);await sleep(2500);
  await shot('02_hud');
  const panelSel=['#side-panel','#hud-rail'];
  const mm=await unionOf(['#mm-cluster','#minimap-frame','#orbs','#run-orb'],10);if(mm)await shot('03_minimap',mm);
  const rail=await rectOf('#hud-rail',4);if(rail)await shot('03_rail',rail);
  const chat=await rectOf('#chatbox-frame',6);if(chat)await shot('04_chatbox',chat);
  // tooltip over a tab
  const tb=await page.evaluate(()=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="skills"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
  await page.mouse.move(tb[0],tb[1]);await sleep(500);
  const tipR=await unionOf(['#side-panel','#hud-tip'],6);if(tipR)await shot('05_tooltip',tipR);
  await page.mouse.move(W/2,H/2);
  // every side tab
  await run(()=>{try{Player.xp.Attack=XP_TABLE[12];Player.xp.Prayer=XP_TABLE[30];Player.xp.Magic=XP_TABLE[25];Player.prayerPts=30;
    ['bronze_sword','wood_shield','air_rune','mind_rune','water_rune','earth_rune','fire_rune','bread','hatchet','pickaxe','worn_bow','apprentice_staff','arrows'].forEach(id=>{if(ITEMS[id])Player.addItem(id,id.endsWith('rune')||id==='arrows'?25:1)});
    UI.refreshInv();UI.refreshSkills&&UI.refreshSkills();UI.refreshHud()}catch(e){}});
  const tabs=['combat','skills','quests','inv','equip','prayers','spells','drops','clan','friends','ignore','logout','settings','emotes','music'];
  const pr=await unionOf(panelSel,6);
  for(let i=0;i<tabs.length;i++){const t=tabs[i];
    await run(t=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="'+t+'"],#tab-bar-bottom .tab-btn[data-tab="'+t+'"]');if(b)b.click()},t);await sleep(450);
    if(t==='prayers')await run(()=>{try{Player.togglePrayer('thick_skin');UI.refreshPrayers()}catch(e){}});
    await sleep(150);await shot('06_tab_'+String(i+1).padStart(2,'0')+'_'+t,pr);
    if(t==='prayers')await run(()=>{try{Player.togglePrayer('thick_skin');UI.refreshPrayers()}catch(e){}});
  }
  // worn equipment with gear on, and the stats view
  await run(()=>{try{Player.equip.weapon='bronze_sword';Player.equip.shield='wood_shield';if(ITEMS.leather_body)Player.equip.body='leather_body';if(ITEMS.bronze_legs)Player.equip.legs='bronze_legs';
    if(typeof refreshPlayerGear==='function')refreshPlayerGear();UI.refreshEquip();document.querySelector('#tab-bar .tab-btn[data-tab="equip"]').click()}catch(e){}});
  await sleep(500);await shot('07_equip_worn',pr);
  // combat tab per weapon family
  const WEAP=[['unarmed',null],['sword','bronze_sword'],['axe','hatchet'],['pick','pickaxe'],['mace','bronze_mace'],['bow','worn_bow'],['staff','apprentice_staff']];
  for(const [n,id] of WEAP){
    const ok=await run(id=>{try{if(id&&!ITEMS[id])return 'missing';Player.equip.weapon=id;Player.equip.shield=null;Player.spell=null;
      if(typeof refreshPlayerGear==='function')refreshPlayerGear();document.querySelector('#tab-bar .tab-btn[data-tab="combat"]').click();UI.refreshCombat();return 'ok'}catch(e){return String(e)}},id);
    if(ok!=='ok'){console.log('weapon',n,ok);continue}
    await sleep(350);await shot('08_combat_'+n,pr);
  }
  await run(()=>{Player.equip.weapon=null;UI.refreshCombat()});
  // right-click menu
  await run(()=>{Ctx.show({clientX:620,clientY:380},[{html:'Walk here',fn:null},{html:'Talk-to <span style="color:#ffff00">Guide Bram</span>',fn:null},{html:'Examine <span style="color:#ffff00">Guide Bram</span>',fn:null},{html:'Cancel',fn:null}])});
  await sleep(300);const cx=await rectOf('#ctx-menu',10);if(cx)await shot('09_rightclick',cx);
  await run(()=>Ctx.hide());
  // windows
  const WINS=[
    ['10_bank','#bank-modal',()=>UI.openBank()],
    ['10_shop','#shop-modal',()=>{const k=Object.keys(SHOPS)[0];UI.openShop(k)}],
    ['10_worldmap','#worldmap-modal',()=>UI.openWorldMap()],
    ['10_quest_scroll','#quest-scroll-modal',()=>{const q=Object.keys(QUESTS)[0];if(UI.openQuestDetail)UI.openQuestDetail(q)}],
    ['10_droptable','#droptable-modal',()=>{const n=Object.keys(NPC_TYPES).find(k=>(NPC_TYPES[k].drops||[]).length);MenuQoL.showDrops(NPC_TYPES[n])}],
    ['10_overlays','#overlays-modal',()=>Overlays.openPanel()],
    ['10_deeds','#deeds-modal',()=>Deeds.openPanel()],
    ['10_smithing','#smith-grid-overlay',()=>{if(Player.count('bronze_bar')<1)Player.addItem('bronze_bar',1);if(Player.count('hammer')<1)Player.addItem('hammer',1);UI_SmithGrid.open(null)}],
    ['10_music_menu','#music-menu',()=>{if(typeof MusicMenu!=='undefined')MusicMenu.toggle()}],
    ['10_dialogue','#dialogue-modal',()=>UI.dialogue('Guide Bram','Welcome to the Holm, adventurer. Take your time and speak to each tutor in turn.',[{label:'Thank you.',fn:null},{label:'Farewell.',fn:null}])],
  ];
  const esc=[];
  for(const [name,sel,fn] of WINS){
    const ok=await run(fn);
    await sleep(800);const r=await rectOf(sel==='#smith-grid-overlay'?'#smith-grid-overlay>div':sel,10);
    if(r)await shot(name,r);else await shot(name);
    await page.keyboard.press('Escape');await sleep(400);
    const open=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return false;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0},sel);
    esc.push({window:name,opened:ok===undefined?true:ok,closedByEscape:!open});
    if(open)await page.evaluate(sel=>{const e=document.querySelector(sel);if(e)e.style.display='none'},sel);
  }
  // bestiary drop list in the side panel
  await run(()=>{document.querySelector('#tab-bar .tab-btn[data-tab="drops"]').click();const n=Object.keys(NPC_TYPES).find(k=>(NPC_TYPES[k].drops||[]).length);UI.showDropTable(n)});await sleep(400);
  await shot('11_bestiary_drops',pr);await page.keyboard.press('Escape');await sleep(300);
  await shot('12_hud_final');
  // the character creator at a wide and a narrow width
  await run(()=>{CharCreator.open()});await sleep(3000);await shot('13_creator_1538');
  await page.setViewport({width:700,height:H});await sleep(1500);await shot('13_creator_700');
  await run(()=>{try{HolmKitCreator.close&&HolmKitCreator.close(false)}catch(e){}});
  await page.setViewport({width:W,height:H});await sleep(800);
  // narrow (mobile) HUD
  await page.setViewport({width:760,height:820});await sleep(1500);await shot('14_narrow_hud');
  await page.setViewport({width:W,height:H});
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({label:LABEL,escape:esc,errors},null,1));
  console.log(JSON.stringify({label:LABEL,escape:esc,errors:errors.slice(0,12)}));
  await browser.close();
})().catch(e=>{console.error('DRIVER ERROR',e);process.exit(1)});
