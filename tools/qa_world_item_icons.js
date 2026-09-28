/* qa_world_item_icons.js -- the world item icons (tools/blender/build_world_item_icons_v1.py) in the running game.
 * First, every item the running game knows (the load-time ones too: the teleport tablet, the clue items) resolves to a
 * picture file through iconFor, never a canvas drawing.
 * A fresh adventurer on the island is handed a pack of the new items; then, with real clicks:
 *   - the inventory shows every one as its Blender render (assets/icons/items/<id>.png, loaded, no canvas data-URL);
 *   - a few are worn and the equipment tab shows them the same way;
 *   - the bank, and the Marble Arms, Gilded Boar and bowyer's shops show them too;
 *   - the Attack, Smithing and Magic guides open from the stats tab and every item picture in them loads.
 * No page errors. Captures: scratchpad/item_icons/ingame_*.png.
 * Run: SMOKE_BASE=http://127.0.0.1:8113 node tools/qa_world_item_icons.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter}=L;
const OUT=path.join(__dirname,'..','scratchpad','item_icons');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
let pass=0,fail=0;
function ok(c,m,d){if(c){pass++;console.log('  ok  '+m)}else{fail++;console.log('  FAIL '+m+(d!==undefined?' '+JSON.stringify(d).slice(0,400):''))}}
const PACK=['steel_sword','whitsteel_platebody','aurel_pickaxe','veyrite_hatchet','undercrag_platelegs','copper_sword','crag_maul',
  'duskwood_bow','riveted_body','fenhide_vambraces','ember_staff','wizard_hat','starweave_robe_top','monk_robe_top','holy_symbol',
  'amulet_of_warding','cabbage','cheese','cooked_meat','hollow_ale','trout','oak_logs','iron_ore','home_tab','cipher_scroll',
  'wayfarer_casket','fire_rune','nature_rune'];
const WEAR={weapon:'storm_staff',head:'starweave_hat',body:'glimmer_robe_top',legs:'starweave_robe_skirt',cape:'guild_sigil',amulet:'amulet_of_might',hands:'fenhide_vambraces'};
async function clickXY(page,xy){if(!xy)return;await page.mouse.move(xy[0],xy[1]);await sleep(60);await page.mouse.down();await page.mouse.up();await sleep(300)}
const centre=(page,sel,i)=>page.evaluate((sel,i)=>{const e=document.querySelectorAll(sel)[i||0];if(!e)return null;const r=e.getBoundingClientRect();return r.width?[r.x+r.width/2,r.y+r.height/2]:null},sel,i||0);
async function tab(page,t){await clickXY(page,await centre(page,'#tab-bar .tab-btn[data-tab="'+t+'"], #tab-bar-bottom .tab-btn[data-tab="'+t+'"]'))}
const imgs=(page,sel)=>page.evaluate(sel=>{const ims=Array.from(document.querySelectorAll(sel));
  return Promise.all(ims.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;setTimeout(r,3000)}))).then(()=>ims.map(i=>({src:i.getAttribute('src'),ok:i.naturalWidth>0})))},sel);
async function clip(page,sel,name){const r=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const b=e.getBoundingClientRect();return b.width?[b.x,b.y,b.width,b.height]:null},sel);
  if(!r){await page.screenshot({path:path.join(OUT,name+'.png')});return}
  const pad=6;await page.screenshot({path:path.join(OUT,name+'.png'),clip:{x:Math.max(0,r[0]-pad),y:Math.max(0,r[1]-pad),width:r[2]+pad*2,height:r[3]+pad*2}})}
const isItemPng=(s,id)=>s==='assets/icons/items/'+id+'.png';

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const errors=[];
  try{
    const page=await browser.newPage();
    page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
    await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:90000});
    await enter(page);
    // every item the running game knows (its load-time modules have booted by now: the teleport tablet, the bread chain,
    // the clue items...) resolves to a picture file, never a canvas drawing
    await page.waitForFunction(()=>typeof ITEMS!=='undefined'&&!!ITEMS.home_tab&&!!ITEMS.dough&&!!ITEMS.cipher_scroll,{timeout:15000}).catch(()=>{});
    const drawn=await page.evaluate(()=>Object.keys(ITEMS).filter(id=>!/^assets\/icons\/(items|gear)\//.test(String(iconFor(id)))));
    const n=await page.evaluate(()=>Object.keys(ITEMS).length);
    ok(!drawn.length,'all '+n+' items the running game knows (load-time items included) show a picture file, none drawn',drawn);
    // the pack: clear it, then hand over the new items (and wear a set)
    await page.evaluate((pack,wear)=>{Player.inv.fill(null);pack.forEach(id=>Player.addItem(id,1));
      Object.keys(wear).forEach(s=>{Player.equip[s]=wear[s]});try{refreshPlayerGear()}catch(e){}UI.refreshInv();UI.refreshEquip()},PACK,WEAR);
    await tab(page,'inv');await sleep(500);
    const inv=await imgs(page,'#inv-grid img, #inventory img, .inv-slot img');
    const invIds=await page.evaluate(()=>Player.inv.filter(Boolean).map(s=>s.id));
    ok(PACK.every(id=>invIds.indexOf(id)>=0),'the pack holds all '+PACK.length+' new items',invIds);
    const bad=PACK.filter(id=>!inv.some(x=>isItemPng(x.src,id)&&x.ok));
    ok(!bad.length,'the inventory shows every new item as its loaded Blender render',bad);
    ok(!inv.some(x=>/^data:/.test(x.src||'')),'no inventory slot falls back to a drawn canvas icon',inv.filter(x=>/^data:/.test(x.src||'')).length);
    await clip(page,'#side-panel','ingame_inventory');
    await tab(page,'equip');await sleep(500);
    const eq=await imgs(page,'#pane-equip img, #equip-grid img, .equip-slot img, #side-panel .kit-slot img');
    const badEq=Object.values(WEAR).filter(id=>!eq.some(x=>isItemPng(x.src,id)&&x.ok));
    ok(!badEq.length,'the equipment tab shows every worn new item as its Blender render',badEq);
    await clip(page,'#side-panel','ingame_equipment');
    // bank: deposit the pack into a fresh bank view
    await page.evaluate(()=>UI.openBank());await sleep(700);
    const bank=await imgs(page,'#bank-modal img');
    ok(PACK.filter(id=>bank.some(x=>isItemPng(x.src,id)&&x.ok)).length>=PACK.length,'the bank shows the new items (the pack side) as their renders',bank.filter(x=>!x.ok).map(x=>x.src));
    await clip(page,'#bank-modal','ingame_bank');
    await page.evaluate(()=>{const m=document.getElementById('bank-modal');if(m)m.style.display='none'});
    for(const shop of ['marble_arms','gilded_boar','bowyer']){
      await page.evaluate(s=>UI.openShop(s),shop);await sleep(600);
      const stock=await page.evaluate(s=>SHOPS[s].stock.map(x=>x.id),shop);
      const si=await imgs(page,'#shop-modal img');
      const missing=stock.filter(id=>!si.some(x=>x.ok&&(isItemPng(x.src,id)||x.src==='assets/icons/gear/'+id+'.png')));
      ok(!missing.length,'shop '+shop+': every stock item shows a loaded picture (render or painted sprite)',missing);
      await clip(page,'#shop-modal','ingame_shop_'+shop);
      await page.evaluate(()=>{const m=document.getElementById('shop-modal');if(m)m.style.display='none'});
    }
    // the three guides, opened from the stats tab with real clicks
    await tab(page,'skills');await sleep(400);
    for(const skill of ['Attack','Smithing','Magic']){
      const i=await page.evaluate(s=>SKILLS.indexOf(s),skill);
      await clickXY(page,await centre(page,'#osk-grid .osk-cell',i));await sleep(500);
      const title=await page.evaluate(()=>{const t=document.querySelector('#skill-guide-layer .sg-title');return t&&!document.getElementById('skill-guide-layer').hidden?t.textContent:null});
      ok(title===skill+' guide','the '+skill+' guide opens from its stat cell',title);
      const tabs=await page.evaluate(()=>Array.from(document.querySelectorAll('#skill-guide-layer .sg-tab')).length);
      const broken=[],noico=[];
      for(let t=0;t<tabs;t++){
        await clickXY(page,await centre(page,'#skill-guide-layer .sg-tab',t));await sleep(250);
        const r=await imgs(page,'#skill-guide-layer .sg-ico img');r.filter(x=>!x.ok).forEach(x=>broken.push(x.src));
        const empty=await page.evaluate(()=>Array.from(document.querySelectorAll('#skill-guide-layer .sg-row')).filter(x=>x.querySelector('.sg-noico')&&!x.classList.contains('planned')).map(x=>x.querySelector('.sg-name').textContent));
        noico.push(...empty);
        if(t===0||skill==='Smithing'&&t<3)await clip(page,'#skill-guide-layer .sg-win','ingame_guide_'+skill.toLowerCase()+'_'+t);
      }
      ok(!broken.length,skill+' guide: every picture loads',broken);
      ok(!noico.length,skill+' guide: no live row without a picture',noico);
      await page.keyboard.press('Escape');await sleep(300);
    }
  }catch(e){fail++;console.log('  FAIL run: '+String(e&&e.stack||e).slice(0,600))}
  ok(!errors.length,'no page errors',errors);
  await browser.close();
  console.log('\n[WORLD ITEM ICONS QA] '+pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})();
