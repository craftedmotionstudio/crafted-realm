/* capture_ui_round2.js — screenshots for the second UI round (owner play-test feedback): login torches, chat tab
 * labels, side-tab icons, the hint arrow over a target, the gold ring on a tutorial item, every window that can open
 * (each closed again with Escape, recorded), and the character creator at wide/narrow widths.
 * Output: scratchpad/holm_ui_v2/<label>/ + <label>/escape.json
 * Run: SMOKE_BASE=http://localhost:8092 node tools/capture_ui_round2.js before|after */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter}=L;
const LABEL=process.argv[2]||'after';
const OUT=path.join(__dirname,'..','scratchpad','holm_ui_v2',LABEL);fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const W=1538,H=900;
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size='+W+','+H,'--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:W,height:H}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const shot=(n,clip)=>page.screenshot(Object.assign({path:path.join(OUT,n+'.png')},clip?{clip}:{})).catch(e=>console.log('shot fail',n,e.message));
  const rectOf=(sel,pad)=>page.evaluate((sel,pad)=>{const e=typeof sel==='string'?document.querySelector(sel):null;if(!e)return null;const r=e.getBoundingClientRect();if(!r.width)return null;
    const x=Math.max(0,r.x-pad),y=Math.max(0,r.y-pad);return {x,y,width:Math.min(innerWidth-x,r.width+2*pad),height:Math.min(innerHeight-y,r.height+2*pad)}},sel,pad||8);
  await page.goto(BASE+'/?qaProfile=uiround2-'+LABEL+'-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
  await sleep(2500);await shot('01_login');
  const torch=await page.evaluate(()=>{const b=document.getElementById('welcome-box').getBoundingClientRect();return {x:Math.max(0,b.x-260),y:Math.max(0,b.y-120),width:260,height:Math.min(innerHeight-Math.max(0,b.y-120),innerHeight)}});
  await shot('01z_torch_left',torch);
  await page.evaluate(()=>document.getElementById('btn-new').click());await sleep(600);await shot('01b_login_create');
  await page.evaluate(()=>document.getElementById('btn-create-back').click());await sleep(300);
  await enter(page);await sleep(2500);
  await shot('02_hud');
  // chat tab labels, side-tab icons (magnified crops)
  const ct=await rectOf('#chat-tabs',4);if(ct)await page.screenshot({path:path.join(OUT,'03_chat_tabs.png'),clip:ct});
  for(const [n,sel] of [['04_tabs_top','#tab-bar'],['04_tabs_bottom','#tab-bar-bottom'],['04_rail','#hud-rail']]){const r=await rectOf(sel,4);if(r)await shot(n,r)}
  // the hint arrow over the current target, framed like a player would look at it
  const tgt=await page.evaluate(async()=>{const s=GuideArrow._shown,c=s&&GuideArrow._center(s.spec);if(!c)return null;const y=typeof s.spec.y==='number'?s.spec.y:groundY(c.cx,c.cz);
    HolmArrivalQA.qaView(c.cx,c.cz,y-1.4);const dx=player.position.x-c.cx,dz=player.position.z-c.cz;camCtl.yaw=Math.atan2(dx,dz);camCtl.pitch=1.05;camCtl.dist=17;await new Promise(r=>setTimeout(r,1800));
    const v=new THREE.Vector3(c.cx,y,c.cz).project(camera);return {label:s.label,sx:(v.x+1)/2*innerWidth,sy:(1-v.y)/2*innerHeight}});
  await shot('05_hint_arrow');
  if(tgt){const x=Math.max(0,Math.min(W-560,tgt.sx-280)),y=Math.max(0,Math.min(H-420,tgt.sy-300));await shot('05z_hint_arrow_zoom',{x,y,width:560,height:420})}
  await page.evaluate(()=>HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear());
  // tutorial item ring: the 'wield the hatchet' step with a hatchet in the pack
  await page.evaluate(()=>{try{if(Player.count('hatchet')<1)Player.addItem('hatchet',1);Tutorial.step=Tutorial.steps.findIndex(s=>s.id==='equip_hatchet');Tutorial.banner();UI.refreshInv();
    document.querySelector('#tab-bar .tab-btn[data-tab="inv"]').click()}catch(e){}});
  await sleep(2200);const panel=await rectOf('#side-panel',8);await shot('06_item_ring',panel);
  // every window that can open, then Escape (recorded)
  const esc=[];
  const WINS=[
    ['07_bank','#bank-modal',()=>UI.openBank()],
    ['07_shop','#shop-modal',()=>{const k=Object.keys(SHOPS)[0];UI.openShop(k)}],
    ['07_worldmap','#worldmap-modal',()=>UI.openWorldMap()],
    ['07_quest_scroll','#quest-scroll-modal',()=>{const q=Object.keys(QUESTS)[0];if(UI.openQuestDetail)UI.openQuestDetail(q)}],
    ['07_droptable','#droptable-modal',()=>{const n=Object.keys(NPC_TYPES).find(k=>(NPC_TYPES[k].drops||[]).length);MenuQoL.showDrops(NPC_TYPES[n])}],
    ['07_overlays','#overlays-modal',()=>Overlays.openPanel()],
    ['07_deeds','#deeds-modal',()=>Deeds.openPanel()],
    ['07_smithing','#smith-grid-overlay',()=>{if(Player.count('bronze_bar')<1)Player.addItem('bronze_bar',1);if(Player.count('hammer')<1)Player.addItem('hammer',1);UI_SmithGrid.open(null)}],
    ['07_music_menu','#music-menu',()=>{if(typeof MusicMenu!=='undefined')MusicMenu.toggle()}],
    ['07_dialogue','#dialogue-modal',()=>UI.dialogue('Guide Bram','Welcome to the Holm, adventurer. Take your time.',[{label:'Thank you.',fn:null},{label:'Farewell.',fn:null}])],
  ];
  for(const [name,sel,fn] of WINS){
    const ok=await page.evaluate(src=>{try{(new Function(src))();return true}catch(e){return String(e).slice(0,120)}},'('+fn.toString()+')()');
    await sleep(700);const r=await rectOf(sel==='#smith-grid-overlay'?'#smith-grid-overlay>div':sel,10);
    if(r)await shot(name,r);else await shot(name);
    const hasX=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const x=e.querySelector('.kit-x,.close-x,.quest-scroll-close');return !!(x&&x.getBoundingClientRect().width>0)},sel);
    await page.keyboard.press('Escape');await sleep(400);
    const open=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return false;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0},sel);
    esc.push({window:name,opened:ok,hasCloseButton:hasX,closedByEscape:!open});
    if(open)await page.evaluate(sel=>{const e=document.querySelector(sel);if(e)e.style.display='none'},sel);
  }
  // equipment stats view inside the side panel
  await page.evaluate(()=>document.querySelector('#tab-bar .tab-btn[data-tab="equip"]').click());await sleep(300);
  const sb=await page.evaluate(()=>{const b=Array.from(document.querySelectorAll('#equip-list button')).find(b=>/stats/i.test(b.textContent));if(!b)return null;const r=b.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
  if(sb){await page.mouse.click(sb[0],sb[1]);await sleep(300);await shot('07_equip_stats',panel);const hx=await page.evaluate(()=>!!document.querySelector('#equip-list .kit-x'));await page.keyboard.press('Escape');await sleep(300);
    esc.push({window:'07_equip_stats',hasCloseButton:hx,closedByEscape:await page.evaluate(()=>!!document.querySelector('#equip-list .kit-doll'))})}
  await page.evaluate(()=>{document.querySelector('#tab-bar .tab-btn[data-tab="drops"]').click();const n=Object.keys(NPC_TYPES).find(k=>(NPC_TYPES[k].drops||[]).length);UI.showDropTable(n)});await sleep(400);
  await shot('07_bestiary_drops',panel);const hb=await page.evaluate(()=>!!document.querySelector('#drops-list .kit-x'));await page.keyboard.press('Escape');await sleep(300);
  esc.push({window:'07_bestiary_drops',hasCloseButton:hb,closedByEscape:await page.evaluate(()=>!document.querySelector('#drops-list .drops-back'))});
  fs.writeFileSync(path.join(OUT,'escape.json'),JSON.stringify(esc,null,1));
  // the character creator at a wide and two narrow widths
  await page.evaluate(()=>{CharCreator.open()});await sleep(3000);await shot('08_creator_1538');
  for(const w of [700,480]){await page.setViewport({width:w,height:H});await sleep(1500);await shot('08_creator_'+w)}
  await page.setViewport({width:W,height:H});
  console.log(JSON.stringify({label:LABEL,target:tgt,escape:esc,errors}));
  await browser.close();
})().catch(e=>{console.error('DRIVER ERROR',e);process.exit(1)});
