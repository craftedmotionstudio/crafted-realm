/* qa_osrs_menu.js — real-input gate for the old-school right-click menu on Tutor's Holm (owner 2026-09-26: "The right
 * click functionality doesn't really work like OSRS"). A fresh adventurer on the live island; every action is a real
 * mouse event (page.mouse / page.touchscreen) on a pixel whose menu scan puts the intended object first:
 *  - right-clicks the statue, a door, a ground stack (two items on one tile), Guide Bram, the relief chart, the provision
 *    rack, the stairs, the cellar hatch, a pack item, a teaching oak, the fishing spot and a practice grubkin, and asserts
 *    the rows (2004 order, our own names) and their colours (verb white, NPC yellow, object cyan, item orange, level);
 *  - left-clicks and asserts the TOP row ran (OsrsMenu.last) and did its job: the door opens, the chart refuses until
 *    Bram is spoken to (the tutor-first rule on both clicks), Bram's chat opens from his menu row, the rack hands out the
 *    tools, the hatchet is wielded, a ground item is taken, the grubkin is attacked;
 *  - use-mode: the tinderbox picked up with Use shows "Use Tinderbox -> <target>" and on the chart "Nothing interesting
 *    happens."; the net offers "Use Small net -> Fishing spot"; Escape puts it away;
 *  - the box: top edge at the cursor and centred on it, closes on a 10 px stray, on Escape and on a click outside (that
 *    click does nothing else); a long press opens the same menu.
 * Screenshots for the owner (and a side-by-side with Bible_References/Lighthouse_entrance.jpg, made by
 * tools/make_osrs_menu_sheet.py) go to scratchpad/holm_menu_v1/.
 * Run: SMOKE_BASE=http://127.0.0.1:8103 node tools/qa_osrs_menu.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor,closeDialogue,clickButtonText,lastChat}=L;
const OUT=path.join(__dirname,'..','scratchpad','holm_menu_v1');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
let pass=0,fail=0;const results=[],shots=[];
function ok(c,m,d){results.push({ok:!!c,m,d:d===undefined?null:d});if(c){pass++;console.log('  ok  '+m)}else{fail++;console.log('  FAIL '+m+(d!==undefined?' '+JSON.stringify(d).slice(0,400):''))}}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// frame the camera on a named object and find a pixel whose menu scan lists it FIRST (what a left click acts on)
async function spot(page,name,opts){
  opts=opts||{};
  return page.evaluate(async(name,inside)=>{
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));const o=scene.getObjectByName(name);if(!o)return {error:'no '+name};
    const box=new THREE.Box3().setFromObject(o),pt=box.getCenter(new THREE.Vector3()).toArray();
    const owns=ent=>{for(let q=ent&&ent.obj;q;q=q.parent)if(q===o)return true;return false};
    if(HolmArrivalQA.qaView)HolmArrivalQA.qaView(pt[0],pt[2],pt[1]>-5?undefined:box.min.y);
    const views=inside?[[0,.75,9],[.5,.8,9],[-.5,.8,9],[Math.PI,.8,9],[0,1.1,10]]:[[0,1.1,10],[0,1.3,12],[Math.PI/2,1.3,12],[Math.PI,1.3,12],[-Math.PI/2,1.3,12]];
    for(const [yaw,pitch,dist] of views){
      camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist;await sleep(1300);
      const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera),cx=(pr.x+1)/2*rect.width+rect.left,cy=(1-pr.y)/2*rect.height+rect.top;
      for(let r=0;r<=140;r+=4)for(let a=0;a<360;a+=(r?15:360)){const x=Math.round(cx+Math.cos(a*Math.PI/180)*r),y=Math.round(cy+Math.sin(a*Math.PI/180)*r);
        if(x<40||y<60||x>=rect.width-280||y>=rect.height-200||document.elementFromPoint(x,y)!==renderer.domElement)continue;
        const s=OsrsMenuWorld.scan({clientX:x,clientY:y});if(owns(s.entities[0]))return [x,y]}}
    const rect=renderer.domElement.getBoundingClientRect(),pr=new THREE.Vector3(pt[0],pt[1],pt[2]).project(camera),cx=Math.round((pr.x+1)/2*rect.width+rect.left),cy=Math.round((1-pr.y)/2*rect.height+rect.top),s=OsrsMenuWorld.scan({clientX:cx,clientY:cy});
    return {error:'not in view '+name,at:[cx,cy],top:s.top&&s.top.obj.name,first:s.entities[0]&&(s.entities[0].obj.name||s.entities[0].kind),cover:(document.elementFromPoint(cx,cy)||{}).id||null,player:player.position.toArray().map(v=>+v.toFixed(1))};
  },name,!!opts.inside);
}
async function nameKind(page,kind,extra){
  return page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.visible!==false&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;
    if(!o.name)o.name='qa-menu-'+kind+'-'+Math.random().toString(36).slice(2,7);return o.name},kind,extra||null);
}
// the open menu, row by row, with each part's colour
const readMenu=page=>page.evaluate(()=>{const m=document.getElementById('ctx-menu');if(!m||m.style.display==='none')return null;
  const rows=Array.from(document.querySelectorAll('#ctx-rows .ctx-row')).map(r=>({text:r.textContent.replace(/\s+/g,' ').trim(),
    parts:Array.from(r.querySelectorAll('span')).map(s=>({t:s.textContent,c:getComputedStyle(s).color,cls:s.className}))}));
  const b=m.getBoundingClientRect();return {rows,rect:{x:b.x,y:b.y,w:b.width,h:b.height},head:m.querySelector('.ctx-head').textContent}});
const hoverLine=page=>page.evaluate(()=>{const a=document.getElementById('action-text');return a&&a.style.display!=='none'?a.textContent.replace(/\s+/g,' ').trim():''});
async function rightClick(page,xy){await page.mouse.move(xy[0],xy[1]);await sleep(250);const hover=await hoverLine(page);await page.mouse.click(xy[0],xy[1],{button:'right'});await sleep(350);const m=await readMenu(page);if(m)m.hover=hover;return m}
async function shotMenu(page,name){
  const r=await page.evaluate(()=>{const m=document.getElementById('ctx-menu');if(!m||m.style.display==='none')return null;const b=m.getBoundingClientRect();return [b.x,b.y,b.width,b.height]});
  await page.screenshot({path:path.join(OUT,name+'.png')});if(r)shots.push({name,rect:r});
  if(r){const pad=90,x=Math.max(0,Math.floor(r[0]-pad)),y=Math.max(0,Math.floor(r[1]-pad));await page.screenshot({path:path.join(OUT,name+'_menu.png'),clip:{x,y,width:Math.min(1538-x,Math.ceil(r[2]+pad*2)),height:Math.min(900-y,Math.ceil(r[3]+pad*2))}})}
}
async function clickRow(page,text){
  const xy=await page.evaluate(text=>{const r=Array.from(document.querySelectorAll('#ctx-rows .ctx-row')).find(r=>r.textContent.replace(/\s+/g,' ').trim()===text);if(!r)return null;const b=r.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},text);
  if(!xy)return false;await page.mouse.move(xy[0],xy[1]);await sleep(150);await page.mouse.click(xy[0],xy[1]);await sleep(300);return true;
}
const expectTop=(page,xy)=>page.evaluate(xy=>{const r=OsrsMenuWorld.menuFor({clientX:xy[0],clientY:xy[1]});return r.entries[0]?OsrsMenu.rowText(r.entries[0]):null},xy);
async function leftClick(page,xy){const want=await expectTop(page,xy);await page.mouse.move(xy[0],xy[1]);await sleep(150);const t0=Date.now();await page.mouse.down();await page.mouse.up();await sleep(250);
  const last=await page.evaluate(()=>OsrsMenu.last());return {want,last,ran:!!last&&last.at>=t0-50&&last.via==='left'&&last.text===want}}
const texts=m=>m?m.rows.map(r=>r.text):null;
const colourOf=(m,row,part)=>{const r=m&&m.rows.find(r=>r.text===row);const p=r&&r.parts.find(p=>p.t===part);return p?p.c:null};
const YELLOW='rgb(255, 255, 0)',CYAN='rgb(0, 255, 255)',ORANGE='rgb(255, 144, 64)',WHITE='rgb(255, 255, 255)';
async function escape(page){await page.keyboard.press('Escape');await sleep(250)}
async function packSlot(page,id){return page.evaluate(id=>{try{document.querySelector('.tab-btn[data-tab="inv"]').click()}catch(e){}const i=Player.inv.findIndex(s=>s&&s.id===id);if(i<0)return null;
  const el=document.querySelector('#inv-grid .inv-slot:nth-child('+(i+1)+')');if(!el)return null;const b=el.getBoundingClientRect();return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)]},id)}
async function settle(page){await L.settle(page,30000)}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e&&e.stack||e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text().slice(0,300))});
  try{
    await page.goto(BASE+'/?qaProfile=menu-qa-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10&&typeof OsrsMenu!=='undefined',null,90000);

    /* ---- the statue by the path ---- */
    const statue=await page.evaluate(()=>{let n=null;scene.children.forEach(c=>{if(/^world-object-Landscape_statue/.test(c.name))n=c.name});return n});
    let xy=await spot(page,statue);let m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Read-plaque Statue','Walk here','Examine Statue','Cancel']),'statue: Read-plaque / Walk here / Examine / Cancel',texts(m));
    ok(m&&m.head==='Choose Option','the box is titled "Choose Option"',m&&m.head);
    ok(m&&Math.abs(m.rect.y-xy[1])<=1&&Math.abs(m.rect.x+m.rect.w/2-xy[0])<=1.5,'the box opens with its top edge at the cursor, centred on it',m&&{rect:m.rect,xy});
    ok(m&&m.hover==='Read-plaque Statue / 2 more options','top-left line: "Read-plaque Statue / 2 more options"',m&&m.hover);
    ok(colourOf(m,'Read-plaque Statue','Read-plaque')===WHITE&&colourOf(m,'Read-plaque Statue','Statue')===CYAN,'verb white, object name cyan',m&&m.rows[0]);
    await shotMenu(page,'01_statue');
    await clickRow(page,'Examine Statue');ok((await lastChat(page,1))[0]==='The Lantern Keeper, carved in pale stone. There is a plaque on the plinth.','Examine Statue prints our own line',await lastChat(page,1));
    // box behaviour: stray 10 px, Escape, click outside (that click does nothing else)
    m=await rightClick(page,xy);const r0=m&&m.rect;
    await page.mouse.move(r0.x+r0.w/2,r0.y+r0.h+6);await sleep(150);ok(!!(await readMenu(page)),'a move 6 px below the box keeps it open');
    await page.mouse.move(r0.x+r0.w/2,r0.y+r0.h+16);await sleep(150);ok(!(await readMenu(page)),'a move 16 px outside the box closes it');
    await rightClick(page,xy);await escape(page);ok(!(await readMenu(page)),'Escape closes it');
    await rightClick(page,xy);const before=await page.evaluate(()=>({last:OsrsMenu.last()&&OsrsMenu.last().at,pos:player.position.toArray()}));
    await page.mouse.move(r0.x-5,r0.y+r0.h/2);await sleep(100);await page.mouse.click(r0.x-5,r0.y+r0.h/2);await sleep(900);   // within the 10 px band: the box is still open
    const after=await page.evaluate(()=>({last:OsrsMenu.last()&&OsrsMenu.last().at,pos:player.position.toArray(),open:document.getElementById('ctx-menu').style.display!=='none'}));
    ok(!after.open&&after.last===before.last&&same(after.pos,before.pos),'a click outside only closes the box (no walk, no row)',{before,after});
    let lc=await leftClick(page,xy);ok(lc.ran&&lc.want==='Read-plaque Statue','left click runs the top row (Read-plaque Statue)',lc);
    ok(await waitFor(page,()=>Array.from(document.querySelectorAll('#chatbox > div')).some(d=>/The plaque reads/.test(d.textContent)),null,30000),'...which walks to the plinth and reads the plaque');

    /* ---- a ground stack: two items on one tile ---- */
    await page.evaluate(()=>{Player.addItem('bones',1);UI.refreshInv()});
    for(const id of ['coins','bones']){const sxy=await packSlot(page,id);await page.mouse.click(sxy[0],sxy[1],{button:'right'});await sleep(300);
      const pm=await readMenu(page);if(id==='coins')ok(same(texts(pm),['Use Crowns','Drop Crowns','Examine Crowns','Cancel']),'pack: Use / Drop / Examine / Cancel for crowns',texts(pm));
      await clickRow(page,'Drop '+(id==='coins'?'Crowns':'Bones'))}
    const drops=await page.evaluate(()=>WORLD.drops.map(d=>{if(!d.name)d.name='qa-drop-'+d.userData.id;return d.name}));
    ok(drops.length===2,'both items lie on the ground',drops);
    xy=await spot(page,drops[1]);m=Array.isArray(xy)?await rightClick(page,xy):null;const tx=texts(m)||[];
    ok(tx.filter(t=>/^Take /.test(t)).length===2&&tx.indexOf('Take Crowns')>=0&&tx.indexOf('Take Bones')>=0&&tx.indexOf('Walk here')===2&&tx.filter(t=>/^Examine /.test(t)).length===2&&tx[tx.length-1]==='Cancel',
      'ground stack: one Take per item, Walk here, one Examine per item, Cancel',tx);
    ok(colourOf(m,'Take Bones','Bones')===ORANGE,'item names orange',m&&m.rows[0]);
    await shotMenu(page,'02_ground_stack');await escape(page);
    const first=tx[0].replace(/^Take /,'');xy=await spot(page,drops[1]);lc=await leftClick(page,xy);
    ok(lc.ran&&/^Take /.test(lc.want),'left click takes the top item',lc);
    ok(await waitFor(page,()=>WORLD.drops.length===1,null,20000)&&await page.evaluate(()=>Player.count('coins')+Player.count('bones')>0),'...and it is picked up (one item left on the tile)',first);
    await page.evaluate(()=>{const d=WORLD.drops[0];if(d){d.userData.age=0}});

    /* ---- the Guide House door ---- */
    const door='DoorSouthLeaf';xy=await spot(page,door);m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Open Door','Walk here','Examine Door','Cancel']),'door: Open / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'03_door');await clickRow(page,'Examine Door');ok((await lastChat(page,1))[0]==='A stout oak door on iron hinges.','Examine Door');
    lc=await leftClick(page,xy);ok(lc.ran&&lc.want==='Open Door','left click runs Open Door',lc);
    ok(await waitFor(page,()=>HolmArrivalQA.doorOpen('arrival'),null,40000),'...and the door opens');
    await settle(page);
    const inHouse=await L.enterGuideHouse(page);ok(inHouse.ok,'into the Guide House',inHouse);

    /* ---- inside: the chart refuses until Bram is spoken to (both clicks) ---- */
    const chart=await nameKind(page,'arrival_chart');
    xy=await spot(page,chart,{inside:true});m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Study Relief chart','Walk here','Examine Relief chart','Cancel']),'relief chart: Study / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'04_relief_chart');
    await clickRow(page,'Study Relief chart');await sleep(600);
    ok((await lastChat(page,1))[0]==='You should speak to Guide Bram first.','the Study row keeps the tutor-first refusal',await lastChat(page,1));
    lc=await leftClick(page,xy);await sleep(400);
    ok(lc.ran&&(await lastChat(page,1))[0]==='You should speak to Guide Bram first.','so does the left click (the same top row)',lc);

    /* ---- Guide Bram ---- */
    xy=await spot(page,'island-tutor-bram',{inside:true});m=Array.isArray(xy)?await rightClick(page,xy):null;const bt=texts(m)||[];
    ok(bt[0]==='Talk-to Guide Bram'&&bt.indexOf('Walk here')>0&&bt.indexOf('Examine Guide Bram')>bt.indexOf('Walk here')&&bt[bt.length-1]==='Cancel','Guide Bram: Talk-to first, Walk here, Examine, Cancel last',bt);
    ok(colourOf(m,'Talk-to Guide Bram','Guide Bram')===YELLOW,'NPC name yellow',m&&m.rows[0]);
    await shotMenu(page,'05_guide_bram');
    await clickRow(page,'Talk-to Guide Bram');
    ok(await waitFor(page,()=>{const d=document.getElementById('dialogue-modal'),n=document.getElementById('dlg-name');return d&&getComputedStyle(d).display!=='none'&&n&&n.textContent==='Guide Bram'},null,40000),'the Talk-to row walks to Bram and opens his chat');
    for(let i=0;i<10;i++){const b=await page.evaluate(()=>{const d=document.getElementById('dialogue-modal');if(getComputedStyle(d).display==='none')return null;const bs=Array.from(document.querySelectorAll('#dialogue-modal button')).filter(b=>b.getBoundingClientRect().width>0);return bs.length?bs[0].textContent.trim():null});if(!b)break;await clickButtonText(page,'#dialogue-modal button',b);await sleep(300)}
    ok(await page.evaluate(()=>HolmIslandTalk.talked('bram')),'Bram counts as spoken to');
    await closeDialogue(page);
    xy=await spot(page,chart,{inside:true});lc=await leftClick(page,xy);ok(lc.ran&&lc.want==='Study Relief chart','now the chart\'s left click studies it',lc);
    ok(await waitFor(page,()=>Tutorial.complete||Tutorial.steps[Tutorial.step].id!=='study_route',null,40000),'...and the study_route lesson completes');
    await closeDialogue(page);

    /* ---- the provision rack ---- */
    const rack=await nameKind(page,'arrival_provisions');xy=await spot(page,rack,{inside:true});m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Collect-tools Provision rack','Walk here','Examine Provision rack','Cancel']),'provision rack: Collect-tools / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'06_provision_rack');await clickRow(page,'Collect-tools Provision rack');
    ok(await waitFor(page,()=>Player.count('hatchet')>0,null,40000),'the Collect-tools row hands out the tools');
    await closeDialogue(page);

    /* ---- pack: Wield, Use-mode ---- */
    let sxy=await packSlot(page,'hatchet');await page.mouse.move(sxy[0],sxy[1]);await sleep(200);const ph=await hoverLine(page);
    await page.mouse.click(sxy[0],sxy[1],{button:'right'});await sleep(300);m=await readMenu(page);
    ok(same(texts(m),['Wield Bronze hatchet','Use Bronze hatchet','Drop Bronze hatchet','Examine Bronze hatchet','Cancel']),'pack hatchet: Wield / Use / Drop / Examine / Cancel',texts(m));
    ok(ph==='Wield Bronze hatchet / 3 more options','pack hover line: "Wield Bronze hatchet / 3 more options"',ph);
    ok(colourOf(m,'Wield Bronze hatchet','Bronze hatchet')===ORANGE,'item name orange in the pack menu');
    await shotMenu(page,'07_pack_hatchet');await escape(page);
    await page.mouse.click(sxy[0],sxy[1]);await sleep(500);
    ok(await page.evaluate(()=>Player.equip.weapon==='hatchet'&&OsrsMenu.last().text==='Wield Bronze hatchet'),'left click on the hatchet runs Wield (the top row)');
    sxy=await packSlot(page,'tinderbox');await page.mouse.click(sxy[0],sxy[1]);await sleep(400);
    ok(await page.evaluate(()=>OsrsMenu.using()==='tinderbox'),'left click on the tinderbox picks it up (Use)');
    xy=await spot(page,chart,{inside:true});await page.mouse.move(xy[0]+1,xy[1]);await sleep(250);const uh=await hoverLine(page);
    ok(uh==='Use Tinderbox -> Relief chart / 1 more option','use-mode top-left line: "Use Tinderbox -> Relief chart / 1 more option"',uh);
    m=await rightClick(page,xy);ok(same(texts(m),['Use Tinderbox -> Relief chart','Walk here','Cancel']),'use-mode menu: Use Tinderbox -> Relief chart / Walk here / Cancel',texts(m));
    await shotMenu(page,'08_use_tinderbox_chart');
    await clickRow(page,'Use Tinderbox -> Relief chart');await sleep(300);
    ok((await lastChat(page,1))[0]==='Nothing interesting happens.'&&await page.evaluate(()=>!OsrsMenu.using()),'tinderbox on the chart: "Nothing interesting happens." and the tinderbox is put away');

    /* ---- worn equipment, the bank and a shop (their windows opened directly: the menus are what is tested) ---- */
    await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="equip"]');if(t)t.click()});await sleep(400);
    const wxy=await page.evaluate(()=>{const el=document.querySelector('#equip-list .kit-slot.slot-weapon.filled')||Array.from(document.querySelectorAll('#equip-doll .doll-slot.filled')).find(d=>/^Bronze hatchet/.test(d.title));if(!el)return null;const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});
    if(wxy){await page.mouse.click(wxy[0],wxy[1],{button:'right'});await sleep(300)}m=wxy?await readMenu(page):null;
    ok(same(texts(m),['Remove Bronze hatchet','Examine Bronze hatchet','Cancel']),'worn hatchet: Remove / Examine / Cancel',texts(m));
    await shotMenu(page,'15_worn_hatchet');await escape(page);
    await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="inv"]');if(t)t.click();Player.addItem('coins',100);UI.openBank()});await sleep(500);
    const gridSlot=(grid,id)=>page.evaluate((grid,id)=>{const list=grid==='bank-grid'?Player.bank:Player.inv;const i=list.findIndex(s=>s&&s.id===id);if(i<0)return null;
      const el=document.querySelector('#'+grid).children[i];if(!el)return null;const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]},grid,id);
    const bank=()=>page.evaluate(()=>{const s=Player.bank.find(b=>b.id==='coins');return {bank:s?s.qty:0,inv:Player.count('coins')}});
    let gxy=await gridSlot('bank-inv-grid','coins');await page.mouse.click(gxy[0],gxy[1],{button:'right'});await sleep(300);m=await readMenu(page);
    ok(same(texts(m),['Deposit-1 Crowns','Deposit-5 Crowns','Deposit-10 Crowns','Deposit-All Crowns','Deposit-X Crowns','Examine Crowns','Cancel']),'bank, pack side: Deposit-1/5/10/All/X, Examine, Cancel',texts(m));
    await shotMenu(page,'16_bank_deposit');const b0=await bank();await clickRow(page,'Deposit-10 Crowns');const b1=await bank();
    ok(b1.bank===b0.bank+10&&b1.inv===b0.inv-10,'Deposit-10 moves ten crowns',{b0,b1});
    gxy=await gridSlot('bank-inv-grid','coins');await page.mouse.click(gxy[0],gxy[1]);await sleep(300);const b2=await bank();
    ok(b2.bank===b1.bank+1,'left click deposits one (Deposit-1 is the top row)',{b1,b2});
    gxy=await gridSlot('bank-grid','coins');await page.mouse.click(gxy[0],gxy[1],{button:'right'});await sleep(300);m=await readMenu(page);
    ok(same(texts(m),['Withdraw-1 Crowns','Withdraw-5 Crowns','Withdraw-10 Crowns','Withdraw-All Crowns','Withdraw-X Crowns','Examine Crowns','Cancel']),'bank, vault side: Withdraw-1/5/10/All/X, Examine, Cancel',texts(m));
    await shotMenu(page,'17_bank_withdraw');await clickRow(page,'Withdraw-X Crowns');await sleep(200);
    ok(await page.evaluate(()=>!!document.getElementById('om-amount')&&document.activeElement&&document.activeElement.parentNode.id==='om-amount'),'Withdraw-X asks "Enter amount:"');
    await page.keyboard.type('3');await page.keyboard.press('Enter');await sleep(300);const b3=await bank();
    ok(b3.inv===b2.inv+3&&b3.bank===b2.bank-3,'...and withdraws the amount typed',{b2,b3});
    await page.evaluate(()=>{UI.closeModal('bank-modal');UI.openShop('bazaar')});await sleep(500);
    const stock=await page.evaluate(()=>{const sh=SHOPS[UI.currentShop];return sh.stock[0].id});const sname=await page.evaluate(id=>ITEMS[id].name,stock);
    const sxy2=await page.evaluate(()=>{const el=document.querySelector('#shop-grid').children[0];const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});
    await page.mouse.click(sxy2[0],sxy2[1],{button:'right'});await sleep(300);m=await readMenu(page);
    ok(same(texts(m),['Value '+sname,'Buy-1 '+sname,'Buy-5 '+sname,'Buy-10 '+sname,'Examine '+sname,'Cancel']),'shop stock: Value, Buy-1/5/10, Examine, Cancel',texts(m));
    await shotMenu(page,'18_shop_stock');await escape(page);
    const c0=await page.evaluate(id=>({c:Player.count('coins'),n:Player.count(id)}),stock);await page.mouse.click(sxy2[0],sxy2[1]);await sleep(300);
    const c1=await page.evaluate(id=>({c:Player.count('coins'),n:Player.count(id)}),stock);
    ok(c1.c===c0.c&&c1.n===c0.n&&/currently costs \d+ crowns/.test((await lastChat(page,1))[0]),'left click on stock tells its Value (no purchase)',{c0,c1,chat:await lastChat(page,1)});
    await page.mouse.click(sxy2[0],sxy2[1],{button:'right'});await sleep(300);await clickRow(page,'Buy-1 '+sname);await sleep(300);
    const c2=await page.evaluate(id=>({c:Player.count('coins'),n:Player.count(id)}),stock);ok(c2.n===c0.n+1&&c2.c<c0.c,'Buy-1 buys one',{c0,c2});
    gxy=await gridSlot('shop-inv-grid',stock);await page.mouse.click(gxy[0],gxy[1],{button:'right'});await sleep(300);m=await readMenu(page);
    ok(same(texts(m),['Value '+sname,'Sell-1 '+sname,'Sell-5 '+sname,'Sell-10 '+sname,'Examine '+sname,'Cancel']),'shop, pack side: Value, Sell-1/5/10, Examine, Cancel',texts(m));
    await clickRow(page,'Sell-1 '+sname);await sleep(300);const c3=await page.evaluate(id=>({c:Player.count('coins'),n:Player.count(id)}),stock);
    ok(c3.n===c0.n&&c3.c>c2.c,'Sell-1 sells it back',{c2,c3});
    await page.evaluate(()=>UI.closeModal('shop-modal'));await sleep(300);

    /* ---- stairs and the cellar hatch ---- */
    const stair=await nameKind(page,'arrival_surface',['arrivalSurface','stair']);xy=await spot(page,stair,{inside:true});m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Climb-up Staircase','Walk here','Examine Staircase','Cancel']),'stairs: Climb-up / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'09_stairs');await escape(page);
    xy=await spot(page,'CellarHatchLid',{inside:true});if(!Array.isArray(xy))xy=await spot(page,'CellarHatch',{inside:true});
    m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Climb-down Trapdoor','Walk here','Examine Trapdoor','Cancel']),'cellar hatch: Climb-down / Walk here / Examine / Cancel',texts(m)||xy);
    await shotMenu(page,'10_cellar_hatch');await escape(page);

    /* ---- the survival camp: an oak, the fishing spot (and the net in use) ---- */
    xy=await spot(page,'island-lesson-survival-oak-1');m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Chop down Oak','Walk here','Examine Oak','Cancel']),'oak: Chop down / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'11_oak');await escape(page);
    xy=await spot(page,'island-lesson-survival-perch');m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Net Fishing spot','Walk here','Examine Fishing spot','Cancel']),'fishing spot: Net / Walk here / Examine / Cancel',texts(m));
    await shotMenu(page,'12_fishing_spot');await escape(page);
    sxy=await packSlot(page,'fishing_net');await page.mouse.click(sxy[0],sxy[1]);await sleep(300);
    m=await rightClick(page,xy);ok(same(texts(m),['Use Small net -> Fishing spot','Walk here','Cancel']),'net in use: Use Small net -> Fishing spot / Walk here / Cancel',texts(m));
    await shotMenu(page,'13_use_net_fishing_spot');await escape(page);await escape(page);
    ok(await page.evaluate(()=>!OsrsMenu.using()),'Escape (menu closed) puts the net away');

    /* ---- a practice grubkin in the keep court ---- */
    // (QA only: the grubkin idles in place while its pixel is found and clicked, so a wander step cannot move it off the cursor)
    const grub=await page.evaluate(()=>{const n=HolmIslandTrials.npcs().find(n=>!n.dead&&n.islandPen==='keep-court');if(n){n.penStatic=true;n.wDir=null}return n?n.mesh.name:null});
    xy=grub?await spot(page,grub):null;m=Array.isArray(xy)?await rightClick(page,xy):null;
    ok(same(texts(m),['Attack Practice grubkin (level-1)','Walk here','Examine Practice grubkin (level-1)','Cancel']),'grubkin: Attack (level-1) / Walk here / Examine / Cancel',texts(m));
    ok(colourOf(m,'Attack Practice grubkin (level-1)','(level-1)')==='rgb(192, 255, 0)'&&colourOf(m,'Attack Practice grubkin (level-1)','Practice grubkin')===YELLOW,'(level-1) coloured green-yellow against combat 3, the name yellow',m&&m.rows[0]);
    await shotMenu(page,'14_grubkin');await escape(page);
    xy=await spot(page,grub);lc=await leftClick(page,xy);ok(lc.ran&&lc.want==='Attack Practice grubkin (level-1)'&&await page.evaluate(()=>!!Player.target&&Player.target.islandPen==='keep-court'),'left click attacks it (the existing target path)',lc);
    await page.evaluate(()=>{Player.target=null;Player.action=null});

    /* ---- touch: a long press opens the same menu ---- */
    xy=await spot(page,'island-lesson-survival-oak-1');
    await page.setViewport({width:1538,height:900,hasTouch:true});await sleep(600);xy=await spot(page,'island-lesson-survival-oak-1');
    if(Array.isArray(xy)){await page.touchscreen.touchStart(xy[0],xy[1]);await sleep(700);await page.touchscreen.touchEnd();await sleep(500);m=await readMenu(page);
      ok(same(texts(m),['Chop down Oak','Walk here','Examine Oak','Cancel']),'a long press opens the same menu',texts(m));await escape(page)}
    await page.evaluate(()=>HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear());
  }catch(e){ok(false,'driver error '+String(e&&e.stack||e).slice(0,400))}
  ok(errors.length===0,'no page errors',errors.slice(0,5));
  fs.writeFileSync(path.join(OUT,'qa_osrs_menu.json'),JSON.stringify({at:new Date().toISOString(),pass,fail,results,errors,shots},null,1));
  console.log('[OSRS MENU QA] '+pass+' passed, '+fail+' failed');
  await browser.close();process.exit(fail?1:0);
})();
