/* qa_skill_guides.js -- real-input gate for the skill guides and the prayer / spell tips (owner 2026-09-27).
 * A fresh adventurer on the live island; every action is a real mouse or touch event:
 *  desktop (1538 x 900)
 *   - clicks every one of the 15 stat cells: the guide opens titled "<Skill> guide", shows the data's tabs, and each tab
 *     (clicked) shows exactly the data's rows in the data's order, with every reached row in full colour, every row above
 *     the adventurer's level dimmed and every planned row dimmed and marked "Coming later"; every picture loads;
 *   - the four W4 skills open from the "Coming later" line under the total (each with its stat sprite), all rows planned;
 *   - every guide's title shows the skill's stat sprite (the W4 four too);
 *   - closing: the X, Escape, a second click on the same skill, a conversation, and a click in the world (which still walks);
 *   - the game keeps running under an open guide (frames and ticks advance);
 *   - hovers all 17 prayers and all 21 spells: the old-school tip shows name, level, drain or runes and the line of what
 *     it does, from the data; the kit's plain yellow tip stays hidden;
 *  phone (390 x 844, touch)
 *   - taps the pack button, the skills tab and a cell: the guide fills the screen with its tabs in a row; a tap on a tab
 *     switches it; the X closes it;
 *   - a long press on a prayer shows its tip and does NOT switch the prayer on; a plain tap still does;
 *  no page errors. Captures go to scratchpad/skill_guides/.
 * Run: SMOKE_BASE=http://127.0.0.1:8097 node tools/qa_skill_guides.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const OUT=path.join(__dirname,'..','scratchpad','skill_guides');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
let pass=0,fail=0;const results=[];
function ok(c,m,d){results.push({ok:!!c,m,d:d===undefined?null:d});if(c){pass++;console.log('  ok  '+m)}else{fail++;console.log('  FAIL '+m+(d!==undefined?' '+JSON.stringify(d).slice(0,500):''))}}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

async function centre(page,sel,index){return page.evaluate((sel,index)=>{const els=Array.from(document.querySelectorAll(sel)).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
  const e=els[index||0];if(!e)return null;e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)]},sel,index||0)}
async function click(page,xy){if(!xy)return false;await page.mouse.move(xy[0],xy[1]);await sleep(60);await page.mouse.down();await page.mouse.up();await sleep(250);return true}
async function tap(page,xy){if(!xy)return false;await page.touchscreen.tap(xy[0],xy[1]);await sleep(350);return true}
async function openTab(page,tab,how){const xy=await centre(page,'#tab-bar .tab-btn[data-tab="'+tab+'"], #tab-bar-bottom .tab-btn[data-tab="'+tab+'"]');return how==='tap'?tap(page,xy):click(page,xy)}
/* what the window shows now, row by row */
const readGuide=page=>page.evaluate(()=>{const L=document.getElementById('skill-guide-layer');if(!L||L.hidden)return null;
  const w=L.querySelector('.sg-win'),r=w.getBoundingClientRect();
  return {title:w.querySelector('.sg-title').textContent,tabs:Array.from(w.querySelectorAll('.sg-tab')).map(t=>t.textContent),
    tabsShown:getComputedStyle(w.querySelector('.sg-tabs')).display!=='none',on:(w.querySelector('.sg-tab.on')||{}).textContent||null,
    rows:Array.from(w.querySelectorAll('.sg-row')).map(x=>({lv:x.querySelector('.sg-lv').textContent,name:x.querySelector('.sg-name').textContent,
      cls:x.className.replace('sg-row','').trim(),soon:!!x.querySelector('.sg-soon'),img:(()=>{const i=x.querySelector('.sg-ico img');return i?{ok:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')}:null})(),
      dim:getComputedStyle(x.querySelector('.sg-txt')).opacity})),
    foot:w.querySelector('.sg-foot').textContent,rect:[r.x,r.y,r.width,r.height],zoom:getComputedStyle(w).zoom,narrow:L.classList.contains('sg-narrow')}});
/* what the data says the same guide holds, with each row's reached state at the adventurer's levels */
const expectGuide=(page,skill)=>page.evaluate(skill=>{const g=SkillGuide.guide(skill);const lv=s=>{try{return SKILLS.indexOf(s)>=0?Player.lvl(s):1}catch(e){return 1}};
  return {tabs:g.tabs.map(t=>t.label),rows:Object.fromEntries(g.tabs.map(t=>[t.label,t.rows.map(r=>({lv:r.label,name:r.name,planned:r.planned,reached:!r.planned&&SkillGuideData.met(r,lv)}))]))}},skill);
async function shotGuide(page,name){const r=await page.evaluate(()=>{const w=document.querySelector('#skill-guide-layer .sg-win');if(!w)return null;const b=w.getBoundingClientRect();return [b.x,b.y,b.width,b.height]});
  const vp=page.viewport();if(!r){await page.screenshot({path:path.join(OUT,name+'.png')});return}
  const pad=12,x=Math.max(0,Math.floor(r[0]-pad)),y=Math.max(0,Math.floor(r[1]-pad));
  await page.screenshot({path:path.join(OUT,name+'.png'),clip:{x,y,width:Math.min(vp.width-x,Math.ceil(r[2]+pad*2)),height:Math.min(vp.height-y,Math.ceil(r[3]+pad*2))}});}
async function waitImgs(page){await page.evaluate(()=>Promise.all(Array.from(document.querySelectorAll('#skill-guide-layer .sg-ico img')).map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,3000)}))))}
/* check one open guide, tab by tab, against the data */
async function checkGuide(page,skill,tag,how){
  const want=await expectGuide(page,skill);let g=await readGuide(page);
  ok(g&&g.title===skill+' guide',tag+skill+': the guide opens, titled "'+skill+' guide"',g&&g.title);if(!g)return;
  const hico=await page.evaluate(()=>{const i=document.querySelector('#skill-guide-layer .sg-hico');if(!i)return 'none';
    return (i.complete?Promise.resolve():new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});setTimeout(r,3000)}))
      .then(()=>i.style.visibility!=='hidden'&&i.naturalWidth>0?true:i.getAttribute('src'))});
  ok(hico===true,tag+skill+': the title shows the skill\'s stat sprite',hico);
  ok(same(g.tabs,want.tabs),tag+skill+': tabs '+want.tabs.join(' / '),g.tabs);
  ok(g.tabsShown===(want.tabs.length>1),tag+skill+': the category column shows only when there is more than one');
  for(let i=0;i<want.tabs.length;i++){
    const t=want.tabs[i];
    if(g.on!==t){const xy=await centre(page,'#skill-guide-layer .sg-tab',i);if(how==='tap')await tap(page,xy);else await click(page,xy);g=await readGuide(page)}
    ok(g&&g.on===t,tag+skill+'/'+t+': the tab opens on a '+(how||'click'),g&&g.on);
    await waitImgs(page);g=await readGuide(page);
    const exp=want.rows[t],got=g.rows;
    ok(same(got.map(r=>r.lv+' '+r.name),exp.map(r=>r.lv+' '+r.name)),tag+skill+'/'+t+': '+exp.length+' rows, the data\'s rows in its order',{got:got.slice(0,4).map(r=>r.lv+' '+r.name),want:exp.slice(0,4).map(r=>r.lv+' '+r.name)});
    const badState=got.filter((r,k)=>{const e=exp[k];if(!e)return true;
      if(e.planned)return !(r.cls.indexOf('planned')>=0&&r.soon&&+r.dim<0.8);
      if(e.reached)return r.cls!==''||+r.dim<1;
      return !(r.cls.indexOf('locked')>=0&&+r.dim<0.8)});
    ok(!badState.length,tag+skill+'/'+t+': reached rows in full colour, higher rows dimmed, planned rows dimmed and marked "Coming later"',badState.slice(0,3));
    const badImg=got.filter(r=>r.img&&!r.img.ok);
    ok(!badImg.length,tag+skill+'/'+t+': every picture loads',badImg.map(r=>r.img.src).slice(0,4));
  }
  return g;
}
async function frames(page,ms){return page.evaluate(ms=>new Promise(res=>{let n=0,t0=performance.now();
  (function f(){n++;if(performance.now()-t0<ms)requestAnimationFrame(f);else res({frames:n,running:typeof running!=='undefined'&&running})})()}),ms)}

(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const errors=[];
  const watch=p=>{p.on('pageerror',e=>errors.push(String(e&&e.stack||e).slice(0,300)));
    p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push('console: '+m.text().slice(0,300))})};
  try{
    /* ================================================================ desktop */
    const page=await browser.newPage();watch(page);
    await page.goto(BASE+'/?qaProfile=guides-qa-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});await enter(page);
    await waitFor(page,()=>typeof SkillGuide!=='undefined'&&typeof SkillGuideData!=='undefined'&&typeof BookTips!=='undefined',null,30000);
    // a few levels so the guides show reached, locked and planned rows side by side
    await page.evaluate(()=>{['Attack','Smithing','Magic','Prayer','Mining'].forEach((s,i)=>{Player.xp[s]=XP_TABLE[[12,18,22,30,16][i]]});UI.refreshSkills();UI.refreshHud()});
    await openTab(page,'skills');
    const cells=await page.evaluate(()=>Array.from(document.querySelectorAll('#osk-grid .osk-cell')).map(c=>c.dataset.skill));
    ok(same(cells,await page.evaluate(()=>SKILLS.slice())),'every stat cell knows its skill',cells);
    const soon=await page.evaluate(()=>Array.from(document.querySelectorAll('#osk-soon .osk-soon-skill')).map(b=>b.textContent));
    ok(same(soon,['Crafting','Herblore','Agility','Runecrafting']),'the "Coming later" line lists the four W4 skills',soon);
    const soonIco=await page.evaluate(()=>{const ims=Array.from(document.querySelectorAll('#osk-soon .osk-soon-ico'));
      return Promise.all(ims.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,3000)}))).then(()=>ims.map(i=>i.naturalWidth))});
    ok(soonIco.length===4&&soonIco.every(w=>w>0),'the "Coming later" line shows each W4 skill\'s stat sprite',soonIco);
    await page.screenshot({path:path.join(OUT,'desktop_00_stats_tab.png'),clip:{x:1260,y:480,width:278,height:420}});
    for(let i=0;i<cells.length;i++){
      const skill=cells[i];await click(page,await centre(page,'#osk-grid .osk-cell',i));
      await checkGuide(page,skill,'desktop ');
      await page.evaluate(()=>{const b=document.querySelector('#skill-guide-layer .sg-tab');if(b)b.click()});await sleep(150);
      await waitImgs(page);await shotGuide(page,'desktop_'+String(i+1).padStart(2,'0')+'_'+skill.toLowerCase());
    }
    for(let i=0;i<soon.length;i++){
      await click(page,await centre(page,'#osk-soon .osk-soon-skill',i));
      const g=await checkGuide(page,soon[i],'desktop ');
      ok(g&&/later update/.test(g.foot),'desktop '+soon[i]+': the footer says the skill arrives later',g&&g.foot);
      await page.evaluate(()=>{const b=document.querySelector('#skill-guide-layer .sg-tab');if(b)b.click()});await sleep(150);
      await waitImgs(page);await shotGuide(page,'desktop_'+String(16+i)+'_'+soon[i].toLowerCase());
    }
    // a full frame with the guide over the world
    await click(page,await centre(page,'#osk-grid .osk-cell',cells.indexOf('Smithing')));await sleep(300);
    let g=await readGuide(page);ok(g&&g.zoom==='1.5','desktop: the window scales with the viewport (1.5 at 1538 x 900)',g&&g.zoom);
    ok(g&&g.rect[0]+g.rect[2]<1538-242,'desktop: the window stays clear of the side panel',g&&g.rect);
    const fr=await frames(page,1200);ok(fr.running&&fr.frames>=20,'the game keeps running under an open guide ('+fr.frames+' frames in 1.2 s)',fr);
    await page.screenshot({path:path.join(OUT,'desktop_full_smithing.png')});
    // closing
    await click(page,await centre(page,'#skill-guide-layer .sg-x'));
    ok(!(await readGuide(page)),'the X closes the guide');
    await click(page,await centre(page,'#osk-grid .osk-cell',0));await page.keyboard.press('Escape');await sleep(200);
    ok(!(await readGuide(page)),'Escape closes the guide');
    ok(await page.evaluate(()=>document.getElementById('pane-skills').classList.contains('active')),'Escape leaves the skills tab open');
    await click(page,await centre(page,'#osk-grid .osk-cell',0));await click(page,await centre(page,'#osk-grid .osk-cell',0));
    ok(!(await readGuide(page)),'a second click on the same skill closes it');
    await click(page,await centre(page,'#osk-grid .osk-cell',0));await click(page,await centre(page,'#osk-grid .osk-cell',1));
    g=await readGuide(page);ok(g&&g.title==='Strength guide','a click on another skill switches the guide',g&&g.title);
    await page.evaluate(()=>UI.dialogue('Guide Bram','A word before you go.',[{label:'Farewell.',fn:null}]));await sleep(250);
    ok(!(await readGuide(page)),'a conversation takes the screen: the guide steps aside');
    await page.evaluate(()=>{try{UI.closeModal('dialogue-modal')}catch(e){const m=document.getElementById('dialogue-modal');if(m)m.style.display='none'}});await sleep(200);
    await click(page,await centre(page,'#osk-grid .osk-cell',1));
    // a ground tile outside the window (the old client: a click in the world closes the interface and walks)
    // a walkable tile a few steps away that the window does not cover (the island's nav graph, projected to the screen)
    const ground=await page.evaluate(()=>{const w=document.querySelector('#skill-guide-layer .sg-win').getBoundingClientRect(),p=player.position,v=new THREE.Vector3(),rect=renderer.domElement.getBoundingClientRect();
      const ns=HolmArrivalQA.graphNodes().filter(n=>{const d=Math.hypot(n.x-p.x,n.z-p.z);return d>3&&d<16&&Math.abs(n.y-p.y)<2}).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
      for(const n of ns){v.set(n.x,n.y,n.z).project(camera);const x=Math.round((v.x+1)/2*rect.width+rect.left),y=Math.round((1-v.y)/2*rect.height+rect.top);
        if(x<30||y<60||x>1270||y>660||(x>w.left-10&&x<w.right+10&&y>w.top-10&&y<w.bottom+10))continue;
        if(document.elementFromPoint(x,y)!==renderer.domElement)continue;const r=OsrsMenuWorld.menuFor({clientX:x,clientY:y});
        if(r.entries[0]&&OsrsMenu.rowText(r.entries[0])==='Walk here')return [x,y]}return null});
    ok(!!ground,'found a ground tile outside the window to click',ground);
    const p0=await page.evaluate(()=>[player.position.x,player.position.z]);
    await click(page,ground||[140,300]);await sleep(1500);
    const p1=await page.evaluate(()=>[player.position.x,player.position.z]);
    ok(!(await readGuide(page)),'a click in the world closes the guide');
    ok(Math.hypot(p1[0]-p0[0],p1[1]-p0[1])>0.2,'...and that click still walks, as in the old client',{p0,p1});

    /* ---- prayer tips: hover every prayer */
    await openTab(page,'prayers');await sleep(300);
    const prayers=await page.evaluate(()=>Object.keys(PRAYERS));
    let tipOk=0,hudShown=0;const tipBad=[];
    for(let i=0;i<prayers.length;i++){
      const id=prayers[i];const xy=await centre(page,'#prayer-grid .prayer-btn[data-book="prayers:'+id+'"]');await page.mouse.move(xy[0],xy[1]);await sleep(160);
      const t=await page.evaluate(id=>{const t=document.getElementById('book-tip'),h=document.getElementById('hud-tip');const G=SkillGuideData.fromGlobals(),p=PRAYERS[id];
        return {on:!!t&&t.classList.contains('on'),lines:t?Array.from(t.children).map(c=>c.textContent):[],hud:!!h&&getComputedStyle(h).display!=='none',
          want:[p.name,'Level '+p.req+(Player.lvl('Prayer')<p.req?' (you have '+Player.lvl('Prayer')+')':''),SkillGuideData.prayerLine(G,id)]}},id);
      if(t.hud)hudShown++;
      if(t.on&&t.lines[0]===t.want[0]&&t.lines[1]===t.want[1]&&/^Drain: 1 point every \d+(\.\d)? s$/.test(t.lines[2])&&t.lines.indexOf(t.want[2])>=0)tipOk++;else tipBad.push({id,lines:t.lines,want:t.want});
      if(id==='thick_skin'||id==='protect_melee')await page.screenshot({path:path.join(OUT,'desktop_tip_'+id+'.png'),clip:{x:960,y:430,width:578,height:470}});
    }
    ok(tipOk===prayers.length,'all '+prayers.length+' prayers show the old-school tip: name, level, drain, what it does',tipBad.slice(0,3));
    ok(!hudShown,'the kit\'s plain yellow tip never shows over a prayer');
    const oak=await page.evaluate(()=>BookTips.content('prayers','thick_skin'));
    ok(oak&&oak.title==='Oak Hide'&&oak.lines.some(l=>l.text==='Raises your Defence by 5%.')&&oak.lines.some(l=>l.text==='Drain: 1 point every 12 s'),'Oak Hide reads "Raises your Defence by 5%." and drains a point every 12 s',oak);
    const tipStyle=await page.evaluate(()=>{const t=document.getElementById('book-tip'),s=getComputedStyle(t),h=getComputedStyle(t.querySelector('.bt-head'));return {radius:s.borderTopLeftRadius,font:s.fontFamily,name:h.color,bg:s.backgroundColor}});
    ok(tipStyle.radius==='0px'&&/Realm Small/.test(tipStyle.font)&&tipStyle.name==='rgb(255, 255, 0)','the tip is the old-school box: square corners, the pixel font, the name in yellow',tipStyle);
    await page.mouse.move(600,300);await sleep(200);
    ok(await page.evaluate(()=>!document.getElementById('book-tip').classList.contains('on')),'the tip goes when the pointer leaves');
    /* ---- spell tips */
    await openTab(page,'spells');await sleep(300);
    const spells=await page.evaluate(()=>Object.keys(SPELLS));const spBad=[];let spOk=0;
    for(let i=0;i<spells.length;i++){
      const id=spells[i];const xy=await centre(page,'#spell-grid .prayer-btn[data-book="spells:'+id+'"]');await page.mouse.move(xy[0],xy[1]);await sleep(140);
      const t=await page.evaluate(id=>{const t=document.getElementById('book-tip');const G=SkillGuideData.fromGlobals(),sp=SPELLS[id];
        return {on:!!t&&t.classList.contains('on'),lines:t?Array.from(t.children).map(c=>c.textContent):[],want:[sp.name,SkillGuideData.spellRunes(G,id),SkillGuideData.spellLine(G,id)]}},id);
      if(t.on&&t.lines[0]===t.want[0]&&/^Level \d+/.test(t.lines[1])&&t.lines.indexOf(t.want[1])>=0&&t.lines.indexOf(t.want[2])>=0)spOk++;else spBad.push({id,lines:t.lines,want:t.want});
      if(id==='wind_strike'||id==='tele_quarry')await page.screenshot({path:path.join(OUT,'desktop_tip_'+id+'.png'),clip:{x:960,y:430,width:578,height:470}});
    }
    ok(spOk===spells.length,'all '+spells.length+' spells show the tip: name, level, runes, what it does',spBad.slice(0,3));
    await page.mouse.move(600,300);
    await page.close();

    /* ================================================================ phone */
    const ph=await browser.newPage();watch(ph);
    await ph.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
    await ph.goto(BASE+'/?qaProfile=guides-qa-ph-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});await enter(ph);
    await waitFor(ph,()=>typeof SkillGuide!=='undefined',null,30000);
    await ph.evaluate(()=>{Player.xp.Prayer=XP_TABLE[10];Player.prayerPts=10;UI.refreshSkills();UI.refreshHud()});
    await tap(ph,await centre(ph,'#mob-panel-btn'));await sleep(400);
    await openTab(ph,'skills','tap');await sleep(300);
    await ph.screenshot({path:path.join(OUT,'phone_00_stats_tab.png')});
    await tap(ph,await centre(ph,'#osk-grid .osk-cell',cells.indexOf('Smithing')));
    g=await readGuide(ph);
    ok(g&&g.narrow&&g.rect[2]>=360&&g.rect[0]>=0&&g.rect[0]+g.rect[2]<=390,'phone: a tap opens the guide across the screen',g&&{rect:g.rect,narrow:g.narrow});
    await checkGuide(ph,'Smithing','phone ','tap');
    await ph.evaluate(()=>{const b=document.querySelector('#skill-guide-layer .sg-tab');if(b)b.click()});await sleep(200);
    await waitImgs(ph);await ph.screenshot({path:path.join(OUT,'phone_01_smithing.png')});
    await tap(ph,await centre(ph,'#skill-guide-layer .sg-x'));ok(!(await readGuide(ph)),'phone: the X closes the guide');
    await tap(ph,await centre(ph,'#osk-soon .osk-soon-skill',0));g=await readGuide(ph);ok(g&&g.title==='Crafting guide','phone: a coming-later skill opens with a tap',g&&g.title);
    await ph.screenshot({path:path.join(OUT,'phone_02_crafting.png')});
    await tap(ph,await centre(ph,'#skill-guide-layer .sg-x'));
    await tap(ph,await centre(ph,'#osk-grid .osk-cell',cells.indexOf('Attack')));await checkGuide(ph,'Attack','phone ','tap');
    await ph.evaluate(()=>{const b=document.querySelector('#skill-guide-layer .sg-tab');if(b)b.click()});await sleep(200);await waitImgs(ph);
    await ph.screenshot({path:path.join(OUT,'phone_03_attack.png')});
    await tap(ph,await centre(ph,'#skill-guide-layer .sg-x'));
    // long press on a prayer: the tip, and the prayer stays off
    await openTab(ph,'prayers','tap');await sleep(300);
    const oxy=await centre(ph,'#prayer-grid .prayer-btn[data-book="prayers:thick_skin"]');
    await ph.touchscreen.touchStart(oxy[0],oxy[1]);await sleep(750);
    let lt=await ph.evaluate(()=>{const t=document.getElementById('book-tip');return {on:t&&t.classList.contains('on'),text:t?t.innerText:''}});
    await ph.screenshot({path:path.join(OUT,'phone_04_prayer_longpress.png')});
    await ph.touchscreen.touchEnd();await sleep(400);
    const afterLong=await ph.evaluate(()=>({active:Player.activePrayers.has('thick_skin'),tip:document.getElementById('book-tip').classList.contains('on')}));
    ok(lt.on&&/Oak Hide/.test(lt.text)&&/Raises your Defence by 5%/.test(lt.text),'phone: a long press on Oak Hide shows its tip',lt);
    ok(!afterLong.active,'phone: the long press does not switch the prayer on',afterLong);
    ok(afterLong.tip,'phone: the tip stays up after the finger lifts');
    await tap(ph,oxy);
    const afterTap=await ph.evaluate(()=>({active:Player.activePrayers.has('thick_skin'),tip:document.getElementById('book-tip').classList.contains('on')}));
    ok(afterTap.active,'phone: a plain tap still switches the prayer on',afterTap);
    ok(!afterTap.tip,'phone: the next tap clears the tip');
    await tap(ph,oxy);
    ok(!(await ph.evaluate(()=>Player.activePrayers.has('thick_skin'))),'phone: and a second tap switches it off');
    await ph.close();
  }catch(e){ok(false,'driver error '+String(e&&e.stack||e).slice(0,500))}
  ok(errors.length===0,'no page errors',errors.slice(0,5));
  fs.writeFileSync(path.join(OUT,'qa_skill_guides.json'),JSON.stringify({at:new Date().toISOString(),pass,fail,results,errors},null,1));
  console.log('[SKILL GUIDES QA] '+pass+' passed, '+fail+' failed');
  await browser.close();process.exit(fail?1:0);
})();
