/* audit_ui_chrome_v3.js — the "less polished" check for UI round 3 (owner 2026-09-25): walks every visible element of
 * the interface (HUD, every side tab, the chat box, the right-click menu, each window, the login screen) and reports
 * computed styles that make the chrome look modern: gradients, rounded corners, blurred box / text shadows (glows),
 * blur / drop-shadow filters, and lettering not set in our bitmap font "Realm Small". Scene art (the 3D canvas, the
 * minimap canvas, item sprites, the login backdrop painting + torch light) is out of scope.
 * Output: scratchpad/holm_ui_v3/audit_<label>.json (+ a one-line summary per screen on stdout)
 * Run: SMOKE_BASE=http://127.0.0.1:8096 node tools/audit_ui_chrome_v3.js [label]   (exit 0 always; it is a report) */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const {sleep,enter}=require('./holm_island_driver_lib');
const LABEL=process.argv[2]||'after';
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const OUT=path.join(__dirname,'..','scratchpad','holm_ui_v3');fs.mkdirSync(OUT,{recursive:true});
function scan(roots){
  const out=[];const seen=new Set();
  const blurShadow=v=>{if(!v||v==='none')return false;return v.split(/,(?![^(]*\))/).some(s=>{const n=(s.replace(/rgba?\([^)]*\)|#[0-9a-f]+|inset/gi,'').match(/-?\d+(\.\d+)?px/g)||[]).map(parseFloat);return n.length>=3&&n[2]>0.5})};
  const label=e=>{let s=e.tagName.toLowerCase();if(e.id)s+='#'+e.id;else if(e.classList.length)s+='.'+Array.from(e.classList).slice(0,2).join('.');const p=e.closest('[id]');if(p&&p!==e)s=p.id+' > '+s;return s};
  roots.forEach(sel=>document.querySelectorAll(sel).forEach(root=>{
    const all=[root,...root.querySelectorAll('*')];
    all.forEach(e=>{if(seen.has(e))return;seen.add(e);
      if(e.closest('canvas,svg.doll-lines,.kit-torch,#welcome-screen .login-vignette'))return;
      const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)return;
      const f=[];
      if(/gradient/.test(cs.backgroundImage))f.push('gradient');
      const br=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomLeftRadius,cs.borderBottomRightRadius].map(parseFloat);
      if(br.some(v=>v>0)&&!/^(minimap|minimap-frame)$/.test(e.id)&&!e.closest('#mm-cluster .orb,#mm-cluster #run-orb')&&!(e.id==='minimap-frame'))f.push('radius '+Math.max(...br));
      if(blurShadow(cs.boxShadow))f.push('box-shadow blur');
      if(blurShadow(cs.textShadow))f.push('text-shadow blur');
      if(/blur|drop-shadow/.test(cs.filter))f.push('filter '+cs.filter.slice(0,40));
      const fs0=parseFloat(cs.fontSize)===0;
      const txt=!fs0&&(Array.from(e.childNodes).some(n=>n.nodeType===3&&n.textContent.trim().length>0)||(/^(INPUT|TEXTAREA)$/.test(e.tagName)&&!/^(checkbox|radio|range|color)$/.test(e.type))||(e.tagName==='BUTTON'&&(e.innerText||'').trim().length>0));
      if(txt&&!/Realm Small/.test(cs.fontFamily))f.push('font '+cs.fontFamily.split(',')[0]);
      if(txt&&/Realm Small/.test(cs.fontFamily)&&![12,24].includes(Math.round(parseFloat(cs.fontSize))))f.push('font-size '+cs.fontSize);
      if(f.length)out.push({el:label(e),flags:f});
    })}));
  return out;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--mute-audio','--hide-scrollbars'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();
  const report={};
  const run=async(name,roots)=>{const r=await page.evaluate(new Function('roots','return ('+scan.toString()+')(roots)'),roots);report[name]=r;
    const agg={};r.forEach(x=>x.flags.forEach(f=>{const k=f.split(' ')[0]+(f.startsWith('font ')?' '+f.split(' ').slice(1).join(' '):'');agg[k]=(agg[k]||0)+1}));
    console.log(name.padEnd(22),r.length?JSON.stringify(agg):'clean')};
  await page.goto(BASE+'/?qaProfile=audit-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});await sleep(2500);
  await run('login',['#welcome-screen']);
  await enter(page);await sleep(2000);
  const HUD=['#side-panel','#hud-rail','#mm-cluster','#chatbox-frame','#objective','#zone-box','#action-text'];
  await run('hud',HUD);
  for(const t of ['combat','skills','quests','inv','equip','prayers','spells','drops','clan','friends','ignore','logout','settings','emotes','music']){
    await page.evaluate(t=>{const b=document.querySelector('#tab-bar .tab-btn[data-tab="'+t+'"],#tab-bar-bottom .tab-btn[data-tab="'+t+'"]');b&&b.click()},t);await sleep(250);
    await run('tab '+t,['#side-panel .tab-pane.active']);
  }
  await page.evaluate(()=>Ctx.show({clientX:600,clientY:360},[{html:'Walk here'},{html:'Talk-to <span style="color:#ff0">Guide</span>'},{html:'Cancel'}]));await sleep(200);
  await run('right-click',['#ctx-menu']);await page.evaluate(()=>Ctx.hide());
  const WINS=[['bank','#bank-modal','UI.openBank()'],['shop','#shop-modal','UI.openShop(Object.keys(SHOPS)[0])'],['worldmap','#worldmap-modal','UI.openWorldMap()'],
    ['quest scroll','#quest-scroll-modal','UI.openQuestDetail&&UI.openQuestDetail(Object.keys(QUESTS)[0])'],['droptable','#droptable-modal','MenuQoL.showDrops(NPC_TYPES[Object.keys(NPC_TYPES).find(k=>(NPC_TYPES[k].drops||[]).length)])'],
    ['overlays','#overlays-modal','Overlays.openPanel()'],['deeds','#deeds-modal','Deeds.openPanel()'],['music menu','#music-menu','typeof MusicMenu!=="undefined"&&MusicMenu.toggle()'],
    ['dialogue','#dialogue-modal',"UI.dialogue('Guide Bram','Welcome.',[{label:'Thanks.',fn:null}])"],['smithing','#smith-grid-overlay',"Player.addItem('bronze_bar',1);Player.addItem('hammer',1);UI_SmithGrid.open(null)"]];
  for(const [n,sel,js] of WINS){await page.evaluate(js=>{try{(new Function(js))()}catch(e){}},js);await sleep(500);await run('win '+n,[sel]);await page.keyboard.press('Escape');await sleep(300);
    await page.evaluate(sel=>{const e=document.querySelector(sel);if(e&&getComputedStyle(e).display!=='none')e.style.display='none'},sel)}
  await page.evaluate(()=>CharCreator.open());await sleep(2500);await run('creator',['#kit-creator']);
  fs.writeFileSync(path.join(OUT,'audit_'+LABEL+'.json'),JSON.stringify(report,null,1));
  const total=Object.values(report).reduce((a,r)=>a+r.length,0);console.log('TOTAL flagged elements:',total,'->',path.join(OUT,'audit_'+LABEL+'.json'));
  await browser.close();
})().catch(e=>{console.error('AUDIT ERROR',e);process.exit(1)});
