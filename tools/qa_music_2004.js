/* The 2004 music set, driven for real on the live Tutor's Holm (src/audio_music2004.js; docs/rebuild/MUSIC_2004.md).
 * A fresh adventurer with music opted in: the first click on the login screen starts the title piece; entering the
 * Holm crossfades to the island's welcome and unlocks it; the driver clicks its way to Minnow Hollow and the survival
 * camp (all a fresh adventurer's lesson gates allow) and each area's piece must take over and unlock. Then, as a
 * graduate (the lessons marked done the way a finished save records them), it saves, reloads and continues (the
 * unlocks come back, the gates open through the game's own restore) and walks on to the bakehouse, into the Quest
 * Lodge, to Creakwheel Mill and Warden's Keep. In the music tab it presses Manual, picks a piece (it stays), clicks a
 * red piece (refused), presses Auto (the area returns), toggles Loop; opens the music menu; turns music off. Every
 * step is a real mouse click (walking via tools/holm_island_driver_lib.js); the game's state is only read, save the
 * one lessons-done seed.
 * Run: SMOKE_BASE=http://127.0.0.1:<port> node tools/qa_music_2004.js     (NODE_PATH must reach puppeteer-core)
 * Output: screenshots + report.json in $MUSIC_QA_OUT (default <tmp>/music_2004_qa). Exit 0 = all checks pass. */
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const OUT=process.env.MUSIC_QA_OUT||path.join(os.tmpdir(),'music_2004_qa');L.setOut(OUT);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?qaProfile=music-qa-'+Date.now().toString(36);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const checks=[];
function ok(label,cond,detail){checks.push({label,ok:!!cond,detail});console.log((cond?'  ok  ':'  FAIL ')+label+(detail!==undefined?'  '+JSON.stringify(detail):''));return !!cond;}
const state=page=>page.evaluate(()=>({current:GM2004.current,on:Music.on,mode:Music.mode,loop:Music.loop,unlocked:Music.unlocked.slice(),area:Music.Director.area,key:Music.Director.areaKey}));
async function waitTrack(page,id,ms){const t0=Date.now();while(Date.now()-t0<(ms||20000)){const s=await state(page);if(s.current===id)return s;await sleep(400);}return state(page);}
const chatHas=(page,text)=>page.evaluate(t=>(document.getElementById('chatbox')||{}).textContent.indexOf(t)>=0,text);

(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--autoplay-policy=no-user-gesture-required'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon|Failed to load resource/.test(m.text()))errors.push(m.text().slice(0,300));});
  await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('cr_music_on','1')}catch(e){}
    window.__musicLog=[];window.addEventListener('cr-music',()=>{try{const c=GM2004.current;const l=window.__musicLog;if(c&&(!l.length||l[l.length-1]!==c))l.push(c)}catch(e){}});});
  try{
    await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
    // 1. login screen: the first click starts the title piece for a player who had music on
    await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex';},{timeout:120000});
    await page.mouse.click(20,450);
    let s=await waitTrack(page,'hm_title');
    ok('login screen: the first click plays the title piece (Hearth and Horizon)',s.on&&s.current==='hm_title',s.current);
    await L.shot(page,'01_login_title');
    // 2. enter the Holm: the arrival crossfades to the island's welcome and unlocks it
    await L.enter(page);
    s=await waitTrack(page,'holm_morning');
    ok('entering Tutor\'s Holm crossfades to Morning on the Holm',s.current==='holm_morning',{current:s.current,key:s.key});
    ok('... and unlocks it with a chat line',s.unlocked.includes('holm_morning')&&await chatHas(page,'Music unlocked: Morning on the Holm'),s.unlocked);
    // 3. walk by real clicks: a fresh adventurer reaches Minnow Hollow and the survival camp (the lesson gates hold the rest)
    const leg=async(where,walk,id)=>{const w=await walk();const st=await waitTrack(page,id,12000);
      return ok('walking to '+where+' plays and unlocks '+id,st.current===id&&st.unlocked.includes(id),{walk:w.error||'ok',at:w.at,current:st.current,key:st.key});};
    await leg('Minnow Hollow',()=>L.walkPoint(page,30,93,[]),'holm_hollow');
    await leg('the survival camp',()=>L.walkTo(page,'survival','fire',true,[]),'holm_camp');
    // 4. a graduate: the lessons are marked done the way a finished save records them, then save, reload and Continue;
    //    the island gates open through the game's own restore, and the music unlocks must come back
    await page.evaluate(()=>{Tutorial.complete=true;SaveGame.save(true);});await sleep(500);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex';},{timeout:120000});
    await page.mouse.click(20,450);s=await waitTrack(page,'hm_title');
    ok('after a reload the login screen plays the title piece again',s.current==='hm_title',s.current);
    await L.enter(page);s=await waitTrack(page,'holm_camp',20000);
    ok('save + reload + Continue: the four unlocks are back and the camp piece plays where the adventurer stands',
      s.unlocked.slice().sort().join()==='hm_title,holm_camp,holm_hollow,holm_morning'&&s.current==='holm_camp',s);
    await leg('the bakehouse',()=>L.walkTo(page,'bakehouse','entrance',true,[]),'holm_bakehouse');
    await leg('inside the Quest Lodge',()=>L.walkTo(page,'lodge','board',false,[]),'holm_lodge');
    await leg('Creakwheel Mill',()=>L.walkTo(page,'mill','door',true,[]),'holm_mill');
    await leg("Warden's Keep",()=>L.walkTo(page,'keep','gate',true,[]),'holm_keep');
    await L.shot(page,'02_keep');
    // 5. the music tab: green unlocked rows, Manual keeps a pick, a red row refuses, Auto returns, Loop toggles
    await page.click('.tab-btn[data-tab="music"]');await sleep(600);
    const tab=await page.evaluate(()=>({green:[...document.querySelectorAll('#pane-music .music-track.unlocked')].map(d=>d.textContent),
      red:document.querySelectorAll('#pane-music .music-track.locked').length,now:document.querySelector('#pane-music .music-now b').textContent,
      modes:[...document.querySelectorAll('#pane-music .music-modes .set-btn')].map(b=>b.textContent+(b.classList.contains('on')?'*':''))}));
    const unl=(await state(page)).unlocked.length;
    ok("music tab: every unlocked piece green ("+unl+"), the rest red, Playing shows The Warden's Watch, Auto and Loop on",
      unl>=8&&tab.green.length===unl&&tab.red===17-unl&&tab.now==="The Warden's Watch"&&tab.modes.join()==='Auto*,Manual,Loop*',tab);
    await L.shot(page,'03_music_tab');
    await page.click('#pane-music .music-modes [data-m="manual"]');await sleep(300);
    const row=await page.evaluateHandle(()=>[...document.querySelectorAll('#pane-music .music-track.unlocked')].find(d=>d.textContent==='Reeds and Ripples'));
    await row.asElement().click();s=await waitTrack(page,'holm_hollow',12000);
    ok('Manual + a click on Reeds and Ripples plays it at the keep',s.mode==='manual'&&s.current==='holm_hollow',s);
    await page.evaluate(()=>{const d=document.querySelector('#pane-music .music-track.locked');d.scrollIntoView({block:'center'});});
    const lock=await page.evaluateHandle(()=>document.querySelector('#pane-music .music-track.locked'));
    await lock.asElement().click();await sleep(400);s=await state(page);
    ok('a red (not yet heard) piece does not play, and the chat says why',s.current==='holm_hollow'&&await chatHas(page,"You haven't heard that piece yet"),s.current);
    await page.click('#pane-music .music-modes [data-m="auto"]');s=await waitTrack(page,'holm_keep',12000);
    ok("Auto returns to the area's piece",s.mode==='auto'&&s.current==='holm_keep',s);
    await page.click('#pane-music .music-modes [data-m="loop"]');await sleep(300);s=await state(page);
    const loopBtn=await page.evaluate(()=>document.querySelector('#pane-music .music-modes [data-m="loop"]').classList.contains('on'));
    await page.click('#pane-music .music-modes [data-m="loop"]');await sleep(300);const s2=await state(page);
    ok('Loop toggles off and back on (button state follows)',s.loop===false&&!loopBtn&&s2.loop===true,{off:s.loop,on:s2.loop});
    await L.shot(page,'04_music_tab_modes');
    // 6. the music menu (rail button) lists the modes and the unlocked pieces
    await page.click('#music-btn');await sleep(500);
    const menu=await page.evaluate(()=>{const m=document.getElementById('music-menu');return {shown:!!m&&m.style.display==='block',rows:m?[...m.querySelectorAll('.mtrack')].map(r=>r.textContent.trim()):[]}});
    ok('the music menu shows Auto / Manual / Loop, every unlocked piece and the on/off row',menu.shown&&menu.rows.length===3+unl+1&&menu.rows.some(r=>/The Warden's Watch/.test(r)),menu.rows);
    await L.shot(page,'05_music_menu');
    await page.click('#music-btn');await sleep(300);
    // 7. music off from the tab
    await page.click('.tab-btn[data-tab="music"]');await sleep(400);await page.click('#pane-music .set-btn.wide');await sleep(1500);s=await state(page);
    const now=await page.evaluate(()=>document.querySelector('#pane-music .music-now b').textContent);
    ok("the tab's button turns music off",!s.on&&s.current===null&&now==='(music off)',{on:s.on,current:s.current,now});
    const log=await page.evaluate(()=>window.__musicLog);
    const want=['hm_title','holm_camp','holm_bakehouse','holm_lodge','holm_mill','holm_keep','holm_hollow','holm_keep'];let wi=0;log.forEach(id=>{if(id===want[wi])wi++;});
    ok('the track log (since the reload) follows the walk in order, and crossing the meadows never drops back to the island piece',
      wi===want.length&&log.indexOf('holm_morning')<0,log);
    ok('no page errors',errors.length===0,errors.slice(0,5));
  }catch(e){ok('driver ran to the end',false,String(e&&e.stack||e).slice(0,400));await L.shot(page,'99_error');}
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({base:BASE,checks},null,1));
  const failed=checks.filter(c=>!c.ok).length;
  console.log('[MUSIC QA] '+(checks.length-failed)+'/'+checks.length+' checks passed; screenshots in '+OUT);
  await browser.close();process.exit(failed?1:0);
})();
