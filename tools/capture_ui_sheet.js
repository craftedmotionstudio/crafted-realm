/* capture_ui_sheet.js — screenshot every UI surface of the game (login, HUD, each side tab, worn equipment,
 * minimap with a route, chat with overhead text, character creator) into scratchpad/holm_ui_v1/<label>/.
 * Used for the OSRS UI pass before/after sheets. Real clicks where it matters (tabs, minimap, world).
 * Run: SMOKE_BASE=http://localhost:8092 node tools/capture_ui_sheet.js before|after */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,aim,press}=L;
const LABEL=process.argv[2]||'after';
const OUT=path.join(__dirname,'..','scratchpad','holm_ui_v1',LABEL);fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const TABS=['combat','skills','quests','inv','equip','prayers','spells','drops','clan','friends','ignore','logout','settings','emotes','music'];
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const shot=(n,clip)=>page.screenshot(Object.assign({path:path.join(OUT,n+'.png')},clip?{clip}:{})).catch(e=>console.log('shot fail',n,e.message));
  await page.goto(BASE+'/?qaProfile=uisheet-'+LABEL+'-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
  await sleep(2500);await shot('01_login');
  await page.evaluate(()=>document.getElementById('btn-new').click());await sleep(700);await shot('01b_login_create');
  await page.evaluate(()=>document.getElementById('btn-create-back').click());await sleep(400);
  await enter(page);await sleep(2500);
  await page.evaluate(()=>{try{UI.closeDialogue&&UI.closeDialogue()}catch(e){}});
  await shot('02_hud');
  // the side panel, one tab at a time, clicked like a player
  const panel=await page.evaluate(()=>{const r=document.getElementById('side-panel').getBoundingClientRect();return {x:Math.max(0,r.x-6),y:Math.max(0,r.y-6),width:r.width+12,height:Math.min(900-Math.max(0,r.y-6),r.height+12)}});
  for(const t of TABS){
    const xy=await page.evaluate(t=>{const b=Array.from(document.querySelectorAll('.tab-btn[data-tab="'+t+'"]')).find(b=>b.getBoundingClientRect().width>0);if(!b)return null;const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]},t);
    if(!xy){console.log('no tab',t);continue}
    await page.mouse.click(xy[0],xy[1]);await sleep(450);
    if(t==='equip'){await page.mouse.move(10,450);await sleep(200)}
    await shot('03_tab_'+t,panel);
  }
  await page.evaluate(()=>{const b=document.querySelector('.tab-btn[data-tab="inv"]');if(b)b.click()});
  // hover state on a tab (proof every clickable reacts)
  const hov=await page.evaluate(()=>{const b=document.querySelector('.tab-btn[data-tab="skills"]');const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
  await page.mouse.move(hov[0],hov[1]);await sleep(900);await shot('03z_tab_hover',panel);await page.mouse.move(700,450);
  // minimap cluster + a walk route: click a graph node ~7-10 tiles away in the world
  const mmClip=await page.evaluate(()=>{const f=document.getElementById('minimap-frame').getBoundingClientRect();return {x:Math.max(0,f.x-120),y:0,width:Math.min(1538-Math.max(0,f.x-120),f.width+240),height:Math.min(900,f.bottom+140)}});
  await shot('04_minimap_idle',mmClip);
  const target=await page.evaluate(()=>{if(typeof HolmArrivalQA==='undefined'||!HolmArrivalQA.active())return null;const ns=HolmArrivalQA.graphNodes(),p=player.position;
    const c=ns.filter(n=>{const d=Math.abs(n.x-p.x)+Math.abs(n.z-p.z);return d>=9&&d<=14&&Math.abs(n.y-p.y)<.8&&n.surface==='land'}).sort((a,b)=>(Math.abs(b.x-p.x)+Math.abs(b.z-p.z))-(Math.abs(a.x-p.x)+Math.abs(a.z-p.z)));return c.length?c.slice(0,12).map(n=>[n.x,n.y,n.z]):null});
  let walked=false;
  if(target)for(const n of target){const xy=await aim(page,n,[Math.floor(n[0]),Math.floor(n[2])]);if(xy){await press(page,xy);walked=true;break}}
  await sleep(120);await shot('05b_minimap_route',mmClip);await shot('05_world_click_route');
  await sleep(6000);
  // click the minimap itself, up-left of centre
  // click the minimap itself on a walkable tile ~10 tiles away (its pixel from the minimap's own inverse transform)
  const mm=await page.evaluate(()=>{const r=document.getElementById('minimap').getBoundingClientRect(),p=player.position,yaw=camCtl.yaw,S=1.35,k=r.width/144;
    let n=null;if(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.active()){n=HolmArrivalQA.graphNodes().filter(q=>{const d=Math.abs(q.x-p.x)+Math.abs(q.z-p.z);return d>=9&&d<=13&&q.surface==='land'&&Math.abs(q.y-p.y)<1.5})[3]}
    if(!n)n={x:p.x+6,z:p.z+6};const dx=(n.x-p.x)*S,dz=(n.z-p.z)*S,ca=Math.cos(yaw),sa=Math.sin(yaw);
    return [r.x+(72+dx*ca-dz*sa)*k,r.y+(72+dx*sa+dz*ca)*k]});
  await page.mouse.click(mm[0],mm[1]);await sleep(250);await shot('06_minimap_click_route',mmClip);
  const mmState=await page.evaluate(()=>({moving:!!(Player.moveTo||(Player.path&&Player.path.length)),snap:typeof CRMinimap!=='undefined'?CRMinimap.snapshot().clicks:null}));
  await sleep(5000);
  // chat with overhead text: type like a player
  await page.mouse.click(760,420);await sleep(300);
  await page.keyboard.press('Enter');await sleep(250);await page.keyboard.type('Hello Tutor\'s Holm!',{delay:15});await page.keyboard.press('Enter');await sleep(700);
  await shot('07_chat_overhead');
  const chatClip=await page.evaluate(()=>{const r=document.getElementById('chatbox-frame').getBoundingClientRect();return {x:0,y:Math.max(0,r.y-60),width:Math.min(1538,r.right+20),height:900-Math.max(0,r.y-60)}});
  await shot('07b_chatbox',chatClip);
  // worn equipment with something worn: wield the hatchet from the pack like a player
  await page.evaluate(()=>{try{if(Player.count('hatchet')<1&&!Player.equip.weapon&&Player.addItem)Player.addItem('hatchet',1);UI.refreshInv()}catch(e){}});
  await L.clickInventory(page,'hatchet');await sleep(600);
  await page.evaluate(()=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="equip"]');if(b)b.click()});await page.mouse.move(10,450);await sleep(500);
  await shot('09_equip_worn',panel);
  const statsBtn=await page.evaluate(()=>{const b=Array.from(document.querySelectorAll('#equip-list button')).find(b=>/stats/i.test(b.textContent));if(!b)return null;const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
  if(statsBtn){await page.mouse.click(statsBtn[0],statsBtn[1]);await sleep(400);await shot('09b_equip_stats',panel);await page.mouse.click(statsBtn[0],statsBtn[1]);await sleep(300)}
  // a tutor's dialogue, which now opens in the chat area like the old client
  await page.evaluate(()=>{try{HolmIslandTutors.talk('bram')}catch(e){UI.dialogue('Guide Bram','Welcome to the Holm.',null)}});await sleep(900);
  await shot('10_dialogue');await L.closeDialogue(page);await sleep(500);
  // character creator
  const opened=await page.evaluate(()=>{try{if(typeof CharStyler!=='undefined'&&CharStyler.toggle){CharStyler.toggle();return 'styler'}if(typeof CharCreator!=='undefined'){CharCreator.open();return 'creator'}}catch(e){return 'err '+e.message}return null});
  await sleep(3500);await shot('08_char_creator');
  console.log(JSON.stringify({label:LABEL,walked,mmState,opened,errors}));
  await browser.close();
})().catch(e=>{console.error('DRIVER ERROR',e);process.exit(1)});
