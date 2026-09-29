/* Stuck-animation regression driver (owner bug report 2026-09-29: "Sometimes when our character is performing an
 * animation, they get stuck doing that same animation").
 * A fresh adventurer on Tutor's Holm (headless Chrome, an isolated ?qaProfile, never the user's browser) starts every
 * player action with real input (page.mouse clicks on pixels whose game pick() hits the target, inventory / tab / menu
 * clicks) and interrupts it in each realistic way. After every interruption the player's AnimationMixer itself is read
 * (every scheduled action: clip, effective weight, loop mode, running): within two game ticks (1.25 s) no action clip
 * may be left playing, weighted or looping -- only idle / walk / run carry the body -- and it must stay that way.
 * Where the action legitimately goes on (a level-up, a gait preset switch, a lost tab) only that action's own clip may
 * be weighted, with exactly one idle / walk / run action per kind, and a final walk-away must still come back clean.
 * Setup only (never an action or an interruption): the lessons are granted (HolmIslandCurriculum.qaGrant), tutors counted
 * as met, skill levels and the pack are set, and the adventurer is stood near the station (HolmArrivalQA.qaPlace). A
 * blow taken while skilling goes through the engine's own hit path (LocalCombat.damagePlayer, the funnel every monster
 * blow uses); a fight's blocks come from a real foe (the Proving Ground poacher: the practice grubkins' snaps never land).
 * Matrix (case names; pass a comma list of substrings to run a subset):
 *   chop: walk, tutor (opens a dialogue), other-tree, hit (a 0 and a 1), die, full pack, felled, tab hidden, run toggle,
 *         level-up;   net: walk, click a tree, tab hidden, full pack, spot moves on;   firemake: walk, out of logs (the
 *   fire catches);   cook (fire): walk, out of fish, pack full;   range: cook a fish / bake: walk, done;   mine: walk,
 *   rock empty;   smelt: walk, out of ore, the furnace's chat box mid-smelt;   smith: walk, out of bars;   pickup: walk
 *   mid-way, taken;   bank: open, close, walk;   ladder: climb (the clip plays), climb down and walk at once;   shaft
 *   rope: climb down and walk at once;   melee slash / stab / crush, bow, cast: walk away mid fight (the foe's 0-hits
 *   raise the guard), foe dies, eat mid-fight, die mid-fight;   emotes: done, walk mid-emote, emote mid-chop, tab hidden;
 *   gait presets (?gait=panel): switch mid-chop, mid-walk, back to the shipped clips;   mainland (after the ferry; a tree
 *   planted with the game's makeTree): chop then walk, a 0 splat, an emote clicked on the move.
 *   (Bait fishing does not exist on the island: the net is its only fishing.)
 * Writes scratchpad/anim_no_stuck/report.json (+ a screenshot per failure). Exit 1 on any failure.
 * Run: SMOKE_BASE=http://127.0.0.1:8211 node tools/qa_anim_no_stuck.js [case,case...] */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,clickNamed,clickInventory,clickService,closeDialogue,clickButtonText,press,aim,settle,waitFor}=L;
const OUT=path.join(__dirname,'..','scratchpad','anim_no_stuck');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const ONLY=(process.argv[2]||'').split(',').map(s=>s.trim()).filter(Boolean);
const LIMIT=1250;          // two 600 ms game ticks and a frame: the body must be back on idle / walk / run by then
const WATCH=3200;          // ...and stay there (a re-triggered or looping clip shows up inside this window)
const results=[];let fails=0,CUR='';

/* ---------------------------------------------------------------- the in-page probe: the mixer, not the sprite */
function installProbe(){
  if(window.__A)return true;
  const A=window.__A={plays:[]};
  A.gm=()=>typeof player!=='undefined'&&player&&player.userData&&player.userData.gmix;
  A.snap=()=>{const gm=A.gm();if(!gm||!gm.mixer)return {none:true,clean:false,stray:[],loopers:[],locoW:0,acts:[]};
    const mx=gm.mixer,loco=[gm.idle,gm.walk,gm.run].filter(Boolean),acts=[];
    for(const a of mx._actions){if(!mx._isActiveAction(a))continue;const w=a.enabled?a.getEffectiveWeight():0;
      acts.push({clip:a.getClip().name,loco:loco.indexOf(a)>=0,w:+w.toFixed(3),run:a.isRunning(),rep:a.loop===THREE.LoopRepeat,paused:a.paused})}
    const stray=acts.filter(x=>!x.loco&&x.w>1e-3).map(x=>x.clip),loopers=acts.filter(x=>!x.loco&&x.run&&x.rep).map(x=>x.clip);
    const locoW=+acts.filter(x=>x.loco).reduce((s,x)=>s+x.w,0).toFixed(3),kinds={};
    acts.filter(x=>/^(idle|walk|run)(_[A-Z])?$/.test(x.clip)&&(x.run||x.w>1e-3)).forEach(x=>{const k=x.clip.split('_')[0];kinds[k]=(kinds[k]||0)+1});
    const ts=typeof HolmSkillTools!=='undefined'?HolmSkillTools.status():{active:false},gg=(player.userData&&player.userData.glbGear)||{};
    const held=ts.active?ts.tool:null,weaponShown=Player.equip&&Player.equip.weapon&&gg.weapon&&gg.weapon.parent?!!gg.weapon.visible:null;
    return {action:Player.action&&Player.action.type||null,target:!!Player.target,dead:!!Player.dead,moving:!!gm.moving,stray,loopers,locoW,kinds,held,weaponShown,
      clean:!stray.length&&!loopers.length&&locoW>.95,acts:acts.map(x=>x.clip+(x.loco?'*':'')+':'+x.w+(x.rep&&x.run?':loop':''))}};
  // goodSince: from when on (ms after the call) only `allow` clips are weighted / looping (none: idle / walk / run carry the body)
  A.watch=(ms,allow)=>new Promise(res=>{allow=allow||[];const t0=performance.now();let since=null,bad=null;const log=[],saw=[];
    const good=s=>!s.none&&s.stray.every(c=>allow.indexOf(c)>=0)&&s.loopers.every(c=>allow.indexOf(c)>=0)&&(s.stray.length>0||s.locoW>.95)&&new Set(s.stray).size===s.stray.length&&
      Object.keys(s.kinds).every(k=>s.kinds[k]<=1);
    const iv=setInterval(()=>{const s=A.snap(),t=performance.now()-t0;s.stray.forEach(c=>{if(allow.indexOf(c)>=0&&saw.indexOf(c)<0)saw.push(c)});if(good(s)){if(since===null)since=t}else{since=null;bad=s}
      const key=s.stray.join('+')+'|'+s.locoW+'|'+s.action;if(log.length<120&&(!log.length||log[log.length-1][1]!==key))log.push([Math.round(t),key]);
      if(t>=ms){clearInterval(iv);res({goodSince:since===null?null:Math.round(since),final:s,lastBad:bad,log,saw})}},40)});
  A.seen=[];A.durs={};setInterval(()=>{try{const s=A.snap();s.stray.forEach(c=>{if(A.seen.indexOf(c)<0)A.seen.push(c);A.durs[c]=(A.durs[c]||0)+50})}catch(e){}},50);
  if(typeof HolmIslandPlayer!=='undefined'&&!HolmIslandPlayer.__qaWrapped){const p0=HolmIslandPlayer.play;HolmIslandPlayer.__qaWrapped=true;
    HolmIslandPlayer.play=function(n){A.plays.push([Math.round(performance.now()),n,Player.action&&Player.action.type||null]);if(A.plays.length>300)A.plays.splice(0,100);return p0.apply(this,arguments)}}
  return true;
}
const snap=page=>page.evaluate(()=>__A.snap());
const watch=(page,allow,ms)=>page.evaluate((ms,allow)=>__A.watch(ms,allow),ms||WATCH,allow||[]);
const waitClip=(page,clip,ms)=>waitFor(page,c=>__A.snap().stray.indexOf(c)>=0,clip,ms||30000);
const seenReset=page=>page.evaluate(()=>{__A.seen=[];__A.durs={}});
const durs=page=>page.evaluate(()=>Object.assign({},__A.durs));
const seen=page=>page.evaluate(()=>__A.seen.slice());

/* ---------------------------------------------------------------- results */
function record(name,ok,detail){results.push({name,ok:!!ok,detail});if(!ok)fails++;
  const shown=detail&&ok&&detail.log?Object.assign({},detail,{log:undefined}):detail;
  console.log((ok?'  ok   ':'  FAIL ')+name+(shown!==undefined?'  '+JSON.stringify(shown).slice(0,420):''))}
// the body is back on idle / walk / run within two ticks and stays there
function expectClean(name,w,extra){const ok=w.goodSince!==null&&w.goodSince<=LIMIT&&!w.final.held&&w.final.weaponShown!==false;
  record(name,ok,Object.assign({backAfterMs:w.goodSince,final:w.final.acts,action:w.final.action,held:w.final.held,weaponShown:w.final.weaponShown},ok?{log:w.log.slice(0,14)}:{lastBad:w.lastBad&&w.lastBad.acts,log:w.log.slice(0,14)},extra||{}));return ok}
// after a fight: back on idle / walk / run within two ticks, where only a fresh one-shot reaction to a blow that still lands
// (a guard, a flinch) may take the body again -- and none of them may loop
const REACT=['block','hit'];
function expectBack(name,w,extra){const ok=w.goodSince!==null&&w.goodSince<=LIMIT;
  record(name,ok,Object.assign({backAfterMs:w.goodSince,final:w.final.acts,action:w.final.action,log:w.log.slice(0,14)},ok?{}:{lastBad:w.lastBad&&w.lastBad.acts},extra||{}));return ok}
// the action goes on: only its own clip(s) may be weighted, one idle / walk / run action per kind
// (a chop can still end on its own inside the window -- the oak falls on any log -- and then the body must be back on idle)
function expectOnly(name,w,allow,extra){const ok=w.goodSince!==null&&w.goodSince<=LIMIT&&(w.saw.length>0||!w.final.action);
  record(name,ok,Object.assign({allow,since:w.goodSince,saw:w.saw,final:w.final.acts,action:w.final.action},ok?{log:w.log.slice(0,14)}:{lastBad:w.lastBad&&w.lastBad.acts,log:w.log.slice(0,14)},extra||{}));return ok}

/* ---------------------------------------------------------------- setup helpers (never the action itself) */
async function boot(browser,query){
  const page=await browser.newPage();page.__errors=[];page.on('pageerror',e=>page.__errors.push(String(e).slice(0,300)));
  const url=BASE+'/?qaProfile=animstuck-'+Date.now().toString(36)+(query||'');
  for(let a=1;;a++){try{await page.goto(url+'&try='+a,{waitUntil:'load',timeout:120000});await enter(page);break}catch(e){if(a>=3)throw e;console.log('  boot retry',a)}}
  await page.waitForFunction(()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10&&typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active()&&
    typeof HolmIslandTrials!=='undefined'&&HolmIslandTrials.npcs().length>0&&!!scene.getObjectByName('island-lesson-survival-oak-1'),{timeout:180000});
  await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice(0,-1));
    HolmIslandTalk.adopt();Tutorial.talkedTutors=HolmIslandTutors.cast().map(c=>c.id);Tutorial.shaftRopeTied=true;
    // the proving-ground packs roam: keep the adventurer's own fights the only ones
    WORLD.npcs.forEach(n=>{if(n.islandPen||n.provingGround){n.wanderR=0;n._walk=null}})});
  await page.evaluate(installProbe);await sleep(1500);
  return page;
}
async function levels(page,lv){await page.evaluate(lv=>{for(const s in lv)Player.xp[s]=XP_TABLE[lv[s]]||0;if(lv.Hitpoints){Player.maxHp=Player.lvl('Hitpoints');Player.hp=Player.maxHp}UI.refreshSkills();UI.refreshHud()},lv)}
async function pack(page,items,keepWorn){
  await page.evaluate((items,keepWorn)=>{Player.inv=Player.inv.map(()=>null);if(!keepWorn){for(const k in Player.equip)Player.equip[k]=null;refreshPlayerGear();UI.refreshEquip&&UI.refreshEquip()}
    for(const [id,q] of items)for(let i=0;i<(ITEMS[id]&&ITEMS[id].stack?1:q);i++)Player.addItem(id,ITEMS[id]&&ITEMS[id].stack?q:1);
    Player.usingItem=null;Player.action=null;Player.target=null;UI.refreshInv()},items,!!keepWorn);
}
// stand the adventurer on the graph node about `off` tiles from a point (same floor), so the real click still walks there
async function placeNear(page,pt,off){
  return page.evaluate((pt,off)=>{let best=null,d=1e9;for(const n of HolmArrivalQA.graphNodes()){const h=Math.hypot(n.x-pt[0],n.z-pt[2]),dy=Math.abs(n.y-pt[1]);if(dy>2.5)continue;
    const k=Math.abs(h-off)+dy*2;if(k<d){d=k;best=n}}if(!best)return null;LocalCombat.clearInteraction();Player.action=null;Player.target=null;HolmArrivalQA.qaPlace(best.id);return best.id},pt,off);
}
const objPos=(page,name)=>page.evaluate(n=>{const o=scene.getObjectByName(n);if(!o)return null;const b=new THREE.Box3().setFromObject(o);const c=b.getCenter(new THREE.Vector3());return [c.x,b.min.y,c.z]},name);
async function placeByObj(page,name,off){const p=await objPos(page,name);if(!p)throw new Error('no object '+name);await placeNear(page,p,off||3);await sleep(900);await settle(page,8000)}
// a walk order like a player: click a reachable open tile `lo`-`hi` tiles away (the pixel the game's own pick() puts there)
async function walkAway(page,lo,hi){
  const cands=await page.evaluate((lo,hi)=>{const cur=[player.position.x,player.position.y,player.position.z],out=[];
    for(const n of HolmArrivalQA.graphNodes()){const h=Math.hypot(n.x-cur[0],n.z-cur[2]);if(h<lo||h>hi||Math.abs(n.y-cur[1])>1.2)continue;
      if(/stair|ladder|upper/i.test(n.surface||''))continue;out.push([n.x,n.y,n.z,h])}
    out.sort((a,b)=>b[3]-a[3]);return out.slice(0,16)},lo||3,hi||6);
  // first from the view as it is (a player clicks at once), then turning the camera like the island drivers do
  const fast=await page.evaluate(cands=>{const r=renderer.domElement.getBoundingClientRect();
    for(const c of cands){const v=new THREE.Vector3(c[0],c[1],c[2]).project(camera),x=Math.round((v.x+1)/2*r.width+r.left),y=Math.round((1-v.y)/2*r.height+r.top);
      if(v.z>1||x<0||y<0||x>=r.width||y>=r.height||document.elementFromPoint(x,y)!==renderer.domElement)continue;const h=pick({clientX:x,clientY:y});if(!h)continue;const u=h.obj.userData||{};
      if(!(isGroundName(h.obj.name)||u.arrivalSurface||u.islandGround)||Math.floor(h.point.x)!==Math.floor(c[0])||Math.floor(h.point.z)!==Math.floor(c[2]))continue;
      if(typeof OsrsMenuWorld!=='undefined'){const t=OsrsMenuWorld.menuFor({clientX:x,clientY:y},{shift:false}).entries[0];if(t&&t.option!=='Walk here')continue}return {xy:[x,y],to:c}}return null},cands);
  if(fast){await press(page,fast.xy);return {ok:true,to:fast.to,fast:true}}
  for(const c of cands){const xy=await aim(page,[c[0],c[1],c[2]],[Math.floor(c[0]),Math.floor(c[2])]);if(xy){await press(page,xy);return {ok:true,to:c}}}
  record((CUR||'?')+': the walk-away click found no open tile',false,{at:await page.evaluate(()=>[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(1)))});
  return {error:'no open tile to walk to'};
}
async function openTab(page,tab){await page.evaluate(t=>{const b=Array.from(document.querySelectorAll('.tab-btn[data-tab="'+t+'"]')).find(x=>x.getBoundingClientRect().width>0)||document.querySelector('.tab-btn[data-tab="'+t+'"]');if(b)b.click()},tab);await sleep(400)}
async function emoteClick(page,title){await openTab(page,'emotes');
  const xy=await page.evaluate(t=>{const b=Array.from(document.querySelectorAll('#pane-emotes .emote-grid button')).find(x=>[x.getAttribute('title'),x.getAttribute('aria-label'),x.getAttribute('data-tip')].some(v=>(v||'').trim()===t));if(!b)return null;const r=b.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:null},title);
  if(!xy)return false;await page.mouse.click(xy[0],xy[1]);return true}
async function runOrbClick(page){const xy=await page.evaluate(()=>{const o=document.getElementById('run-orb');if(!o)return null;const b=o.getBoundingClientRect();return b.width>0?[b.x+b.width/2,b.y+b.height/2]:null});
  if(!xy)return false;await page.mouse.click(xy[0],xy[1]);return true}
async function spellbook(page){await openTab(page,'spells');
  const xy=await page.evaluate(()=>{const b=Array.from(document.querySelectorAll('#spell-grid button')).find(b=>/Gale Dart/i.test(b.textContent));if(!b)return null;const r=b.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:null});
  if(xy)await page.mouse.click(xy[0],xy[1]);await sleep(300);await openTab(page,'inv');return page.evaluate(()=>Player.spell==='wind_strike')}
// the tab is covered by another tab for `ms` and comes back (rAF stops; the game's heartbeat keeps the world ticking)
async function hideTab(page,ms){const other=await page.browser().newPage();await other.goto('about:blank');await other.bringToFront();
  const hidden=await page.evaluate(()=>document.hidden);await sleep(ms);await page.bringToFront();await other.close();await sleep(300);return hidden}
async function failShot(page,name){if(results.length&&!results[results.length-1].ok)await L.shot(page,'fail_'+name.replace(/[^a-z0-9]+/gi,'_'))}
async function reset(page){await page.evaluate(()=>{try{LocalCombat.clearInteraction()}catch(e){}Player.action=null;Player.target=null;Player.usingItem=null;
  if(Player.cbQueue)Player.cbQueue.clear();Player.hp=Player.maxHp;UI.refreshHud();try{UI.closeDialogue&&UI.closeDialogue()}catch(e){}});await closeDialogue(page);await sleep(900)}

/* ---------------------------------------------------------------- station starts (real input) */
const OAK=['island-lesson-survival-oak-1','island-lesson-survival-oak-2','island-lesson-survival-oak-3'];
async function liveOak(page){return page.evaluate(ns=>ns.find(n=>{const o=scene.getObjectByName(n);return o&&o.userData.alive!==false}),OAK)}
async function startChop(page){
  if(!await page.evaluate(()=>Player.equip.weapon==='hatchet')){await pack(page,[['hatchet',1]]);await clickInventory(page,'hatchet')}else await pack(page,[],true);
  const oak=await liveOak(page);if(!oak)return {error:'no standing oak'};
  await placeByObj(page,oak,3);const c=await clickNamed(page,oak);if(c.error)return c;
  return await waitClip(page,'chop',30000)?{ok:true,oak}:{error:'chop never played',snap:await snap(page)};
}
async function startNet(page){
  await pack(page,[['fishing_net',1]],true);
  const spot=await page.evaluate(()=>{const l=HolmFishing.spots().filter(s=>s.state==='on').sort((a,b)=>b.timer-a.timer)[0];if(!l)return null;const g=HolmFishing.nearestSpot(l.x,l.z);return g&&g.name});
  if(!spot)return {error:'no fishing spot'};await placeByObj(page,spot,3);const c=await clickNamed(page,spot);if(c.error)return c;
  return await waitClip(page,'net',30000)?{ok:true,spot}:{error:'net never played',snap:await snap(page)};
}
// open ground near the camp where a fire may be lit (never on a tile that already has one)
async function toOpenGround(page){const p=await objPos(page,'island-lesson-survival-oak-2');
  for(const [dx,dz] of [[5,4],[6,2],[4,6],[7,5],[3,7],[8,3],[6,7],[2,8]]){await placeNear(page,[p[0]+dx,p[1],p[2]+dz],0);await sleep(700);if(await page.evaluate(()=>HolmArrivalQA.fireBlocked()===null))return true}return false}
async function startFire(page,logs){
  await pack(page,[['tinderbox',1],['logs',logs||1]],true);await toOpenGround(page);
  await clickInventory(page,'tinderbox');await clickInventory(page,'logs');
  return await waitClip(page,'firemake',15000)?{ok:true}:{error:'firemake never played',snap:await snap(page)};
}
async function startCookFire(page,fish){
  const f=await startFire(page,1);if(f.error)return f;
  if(!await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,15000))return {error:'no fire'};await sleep(1800);
  await page.evaluate(n=>{for(let i=0;i<n;i++)Player.addItem('raw_perch',1);UI.refreshInv()},fish||3);
  const c=await clickNamed(page,'island-campfire');if(c.error)return c;
  return await waitClip(page,'cook',20000)?{ok:true}:{error:'cook never played',snap:await snap(page)};
}
async function toBakehouse(page){const s=await page.evaluate(()=>HolmArrivalQA.islandRangePoint());if(!s)throw new Error('no range point');await placeNear(page,[s.x,s.y,s.z],2.5);await sleep(900)}
async function startRangeFish(page,fish){await pack(page,[['raw_perch',fish||3]],true);await toBakehouse(page);const c=await clickService(page,'Cook');if(c.error)return c;
  return await waitClip(page,'cook_range',20000)?{ok:true}:{error:'cook_range never played',snap:await snap(page)}}
async function startBake(page){await pack(page,[['bread_dough',1]],true);await toBakehouse(page);await clickInventory(page,'bread_dough');const c=await clickService(page,'Cook');if(c.error)return c;
  return await waitClip(page,'cook_range',20000)?{ok:true}:{error:'bake never played',snap:await snap(page)}}
async function liveRock(page){return page.evaluate(()=>['island-lesson-cavern-copper-1','island-lesson-cavern-copper-2','island-lesson-cavern-tin-1','island-lesson-cavern-tin-2'].find(n=>{const o=scene.getObjectByName(n);return o&&o.userData.alive!==false}))}
// a rock just mined out comes back after its respawn: a player who sees no swing clicks another rock
async function startMine(page){await pack(page,[['pickaxe',1]],true);let last=null;
  for(let k=0;k<3;k++){const r=await liveRock(page);if(!r){await sleep(3000);continue}await placeByObj(page,r,3);const c=await clickNamed(page,r);if(c.error){last=c;continue}
    if(await waitClip(page,'mine',15000))return {ok:true,rock:r};last={error:'mine never played',rock:r,chat:await L.lastChat(page,3),snap:await snap(page)}}
  return last||{error:'no rock'}}
async function startSmelt(page,n){await pack(page,[['copper_ore',n||3],['tin_ore',n||3]],true);await placeByObj(page,'island-lesson-furnace',3);const c=await clickNamed(page,'island-lesson-furnace');if(c.error)return c;
  await clickButtonText(page,'#dialogue-modal button','Smelt a Bronze bar.');
  return await waitClip(page,'smelt',20000)?{ok:true}:{error:'smelt never played',snap:await snap(page)}}
async function startSmith(page,n){await pack(page,[['hammer',1],['bronze_bar',n||3]],true);await placeByObj(page,'island-lesson-anvil',3);const c=await clickNamed(page,'island-lesson-anvil');if(c.error)return c;
  await clickButtonText(page,'#smith-grid-overlay div[title]','Bronze dagger');
  return await waitClip(page,'smith',20000)?{ok:true}:{error:'smith never played',snap:await snap(page)}}
// a foe to fight: a practice grubkin of a pen (harmless: its snaps never land), or a Proving Ground foe by type (their blows land)
async function grub(page,pen){return page.evaluate(pen=>{const l=(/^pg_/.test(pen)?HolmProvingGround.npcs().filter(n=>!n.dead&&n.typeId===pen):HolmIslandTrials.npcs().filter(n=>!n.dead&&n.islandPen===pen));if(!l.length)return null;
  const d=n=>Math.hypot(n.mesh.position.x-player.position.x,n.mesh.position.z-player.position.z);return l.sort((a,b)=>d(a)-d(b))[0].mesh.name},pen)}
async function startFight(page,weapon,style,pen,extra){
  await pack(page,[[weapon,1]].concat(extra||[]),false);await clickInventory(page,weapon);
  await page.evaluate(s=>{Player.styleIndex=s;UI.refreshCombat&&UI.refreshCombat()},style|0);
  const g0=await grub(page,pen||'keep-court');if(!g0)return {error:'no grubkin'};await placeByObj(page,g0,weapon==='worn_bow'?4:2.5);
  const g=await grub(page,pen||'keep-court');await page.evaluate(g=>{const n=WORLD.npcs.find(x=>x.mesh.name===g);n.hp=Math.max(n.hp,4);n.t=Object.assign({},n.t,{hp:Math.max(n.t.hp,60)});n.hp=60},g);
  const c=await clickNamed(page,g);if(c.error)return c;
  return await waitFor(page,()=>!!Player.target,null,8000)?{ok:true,foe:g}:{error:'no attack order',snap:await snap(page)};
}

/* ---------------------------------------------------------------- the matrix */
const CASES=[];const C=(name,fn)=>CASES.push({name,fn});

// ---- woodcutting: the chop loop (a held clip, looped for as long as the action lasts)
C('chop/walk',async p=>{await levels(p,{Woodcutting:40});const s=await startChop(p);if(s.error)return record('chop/walk start',false,s);
  const w0=await walkAway(p);const w=await watch(p);expectClean('chop/walk: click a tile mid-chop',w,{walk:w0.error||'ok'})});
C('chop/tutor',async p=>{const s=await startChop(p);if(s.error)return record('chop/tutor start',false,s);
  await clickNamed(p,'island-tutor-wenna',{keepDialogs:true});const w=await watch(p);expectClean('chop/tutor: click Wenna mid-chop (walk, chat box opens)',w);
  const open=await p.evaluate(()=>getComputedStyle(document.getElementById('dialogue-modal')).display!=='none');await closeDialogue(p);const w2=await watch(p,[],1500);
  expectClean('chop/tutor: close the chat box',w2,{dialogueWasOpen:open})});
C('chop/other-tree',async p=>{const s=await startChop(p);if(s.error)return record('chop/other-tree start',false,s);
  const other=await p.evaluate((ns,cur)=>ns.find(n=>n!==cur&&scene.getObjectByName(n)&&scene.getObjectByName(n).userData.alive!==false),OAK,s.oak);
  await clickNamed(p,other);const w=await watch(p,['chop'],4500);expectOnly('chop/other-tree: click another oak (walk, chop again)',w,['chop'],{other});
  await walkAway(p);expectClean('chop/other-tree: then walk off',await watch(p))});
C('chop/hit',async p=>{const s=await startChop(p);if(s.error)return record('chop/hit start',false,s);
  await p.evaluate(()=>LocalCombat.damagePlayer(0,null,{kind:'npcMelee'}));const a=await watch(p,['chop','block'],2000);
  expectOnly('chop/hit: a 0 splat mid-chop (the guard goes up once, the chop goes on)',a,['chop','block']);
  await p.evaluate(()=>LocalCombat.damagePlayer(1,null,{kind:'npcMelee'}));const b=await watch(p,['chop','hit'],2000);
  expectOnly('chop/hit: a 1 splat mid-chop (the flinch, then the chop again)',b,['chop','hit']);
  await walkAway(p);expectClean('chop/hit: then walk off',await watch(p))});
C('chop/die',async p=>{const s=await startChop(p);if(s.error)return record('chop/die start',false,s);
  await p.evaluate(()=>LocalCombat.damagePlayer(Player.hp,null,{kind:'npcMelee'}));
  const d=await waitFor(p,()=>Player.dead,null,5000);const dw=await watch(p,['death'],1800);expectOnly('chop/die: the death pose owns the body (no chop)',dw,['death'],{dead:d});
  await waitFor(p,()=>!Player.dead,null,15000);await sleep(300);expectClean('chop/die: after the respawn',await watch(p))});
C('chop/full',async p=>{await pack(p,[['hatchet',1]]);await clickInventory(p,'hatchet');
  await p.evaluate(()=>{while(Player.addItem('bones',1)&&Player.inv.some(s=>!s)){}UI.refreshInv()});
  const oak=await liveOak(p);await placeByObj(p,oak,3);await seenReset(p);await clickNamed(p,oak);
  await waitFor(p,()=>!Player.action&&!__A.snap().moving,null,20000);const w=await watch(p);expectClean('chop/full: a full pack ends the chop',w,{seen:await seen(p)})});
C('chop/felled',async p=>{await levels(p,{Woodcutting:60});const s=await startChop(p);if(s.error)return record('chop/felled start',false,s);
  const felled=await waitFor(p,oak=>scene.getObjectByName(oak).userData.alive===false,s.oak,90000);const w=await watch(p);
  expectClean('chop/felled: the oak falls',w,{felled});await p.evaluate(()=>{['island-lesson-survival-oak-1','island-lesson-survival-oak-2','island-lesson-survival-oak-3'].forEach(n=>{const o=scene.getObjectByName(n);if(o)o.userData.respawnT=Math.min(o.userData.respawnT||0,.5)})})});
C('chop/tab-hidden',async p=>{await levels(p,{Woodcutting:1});const s=await startChop(p);if(s.error)return record('chop/tab-hidden start',false,s);
  const hid=await hideTab(p,5000);const w=await watch(p,['chop'],2000);const still=await p.evaluate(()=>!!Player.action);
  if(still)expectOnly('chop/tab-hidden: back to the tab, still chopping',w,['chop'],{hidden:hid});else expectClean('chop/tab-hidden: back to the tab (the oak fell meanwhile)',w,{hidden:hid});
  await walkAway(p);expectClean('chop/tab-hidden: then walk off',await watch(p))});
C('chop/run',async p=>{await levels(p,{Woodcutting:1});const s=await startChop(p);if(s.error)return record('chop/run start',false,s);
  const before=await p.evaluate(()=>!!Player.action);await runOrbClick(p);const a=await watch(p,['chop'],1800);expectOnly('chop/run: toggle run mid-chop (the chop goes on)',a,['chop'],{actionBefore:before,chat:await L.lastChat(p,3),run:await p.evaluate(()=>Player.runOn)});
  await walkAway(p,4,8);await sleep(300);await runOrbClick(p);const b=await watch(p);expectClean('chop/run: walk off, toggle run on the way',b)});
C('chop/levelup',async p=>{await levels(p,{Woodcutting:40});await p.evaluate(()=>{const lv=Player.lvl('Woodcutting');Player.xp.Woodcutting=XP_TABLE[Math.max(lv,20)+1]-1;UI.refreshSkills()});
  const lv0=await p.evaluate(()=>Player.lvl('Woodcutting'));const s=await startChop(p);if(s.error)return record('chop/levelup start',false,s);
  const up=await waitFor(p,lv=>Player.lvl('Woodcutting')>lv,lv0,60000);const alive=await p.evaluate(o=>scene.getObjectByName(o).userData.alive!==false&&!!Player.action,s.oak);
  const w=await watch(p,['chop'],2000);if(alive)expectOnly('chop/levelup: a level-up mid-chop (fireworks, the chop goes on)',w,['chop'],{levelled:up});else expectClean('chop/levelup: a level-up as the oak fell',w,{levelled:up});
  await closeDialogue(p);await walkAway(p);expectClean('chop/levelup: then walk off',await watch(p))});

// ---- fishing: the net cast (held while netting)
C('net/walk',async p=>{await levels(p,{Fishing:30});const s=await startNet(p);if(s.error)return record('net/walk start',false,s);
  await walkAway(p);expectClean('net/walk: click a tile mid-cast',await watch(p))});
C('net/tree',async p=>{const s=await startNet(p);if(s.error)return record('net/tree start',false,s);
  await pack(p,[['fishing_net',1],['hatchet',1]],true);await clickInventory(p,'hatchet');await startNet(p);
  const oak=await liveOak(p);await clickNamed(p,oak);const w=await watch(p,['chop'],5000);
  record('net/tree: click an oak mid-cast (no net left)',w.goodSince!==null&&w.goodSince<=LIMIT&&w.final.stray.indexOf('net')<0,{since:w.goodSince,final:w.final.acts,log:w.log.slice(0,8)});
  await walkAway(p);expectClean('net/tree: then walk off',await watch(p))});
C('net/tab-hidden',async p=>{await levels(p,{Fishing:1});const s=await startNet(p);if(s.error)return record('net/tab-hidden start',false,s);
  const hid=await hideTab(p,5000);const still=await p.evaluate(()=>!!Player.action);const w=await watch(p,['net'],2000);
  if(still)expectOnly('net/tab-hidden: back to the tab, still netting',w,['net'],{hidden:hid});else expectClean('net/tab-hidden: back to the tab (the fish moved on meanwhile)',w,{hidden:hid});
  await walkAway(p);expectClean('net/tab-hidden: then walk off',await watch(p))});
C('net/run',async p=>{await levels(p,{Fishing:1});const s=await startNet(p);if(s.error)return record('net/run start',false,s);
  await runOrbClick(p);const a=await watch(p,['net'],1800);expectOnly('net/run: toggle run mid-cast (the net goes on)',a,['net'],{action:a.final.action});
  await runOrbClick(p);expectOnly('net/run: toggle it back',await watch(p,['net'],1500),['net']);await walkAway(p);expectClean('net/run: then walk off',await watch(p))});
C('net/full',async p=>{await pack(p,[['fishing_net',1]],true);await p.evaluate(()=>{while(Player.inv.filter(s=>!s).length>1)Player.addItem('bones',1);UI.refreshInv()});
  const s=await startNet(p);if(s.error)return record('net/full start',false,s);
  await p.evaluate(()=>{while(Player.addItem('bones',1)){}UI.refreshInv()});
  const ended=await waitFor(p,()=>!Player.action,null,40000);expectClean('net/full: the pack fills mid-cast',await watch(p),{ended})});
C('net/moves',async p=>{await levels(p,{Fishing:1});const s=await startNet(p);if(s.error)return record('net/moves start',false,s);
  const moved=await waitFor(p,()=>!Player.action,null,70000);const w=await watch(p);expectClean('net/moves: the fish move on',w,{ended:moved,chat:await L.lastChat(p,2)})});

// ---- firemaking: the kneel (held) until the fire catches
C('fire/walk',async p=>{const s=await startFire(p,1);if(s.error)return record('fire/walk start',false,s);
  await walkAway(p);expectClean('fire/walk: click a tile mid-kneel',await watch(p))});
C('fire/catches',async p=>{const s=await startFire(p,1);if(s.error)return record('fire/catches start',false,s);
  const lit=await waitFor(p,()=>!Player.action,null,15000);expectClean('fire/catches: the last log catches (the step aside)',await watch(p),{lit})});

// ---- cooking: at a fire (one stroke per fish, re-played while the action lasts)
C('cook/walk',async p=>{await levels(p,{Cooking:40,Firemaking:40});const s=await startCookFire(p,4);if(s.error)return record('cook/walk start',false,s);
  await walkAway(p);expectClean('cook/walk: click a tile mid-cook',await watch(p))});
C('cook/out',async p=>{const s=await startCookFire(p,1);if(s.error)return record('cook/out start',false,s);
  const done=await waitFor(p,()=>!Player.action,null,15000);expectClean('cook/out: the last fish is cooked',await watch(p),{done})});
C('cook/full',async p=>{const s=await startCookFire(p,2);if(s.error)return record('cook/full start',false,s);
  await p.evaluate(()=>{while(Player.addItem('bones',1)){}UI.refreshInv()});const done=await waitFor(p,()=>!Player.action,null,15000);
  expectClean('cook/full: no room for the cooked fish',await watch(p),{done,chat:await L.lastChat(p,1)})});
C('range/walk',async p=>{const s=await startRangeFish(p,4);if(s.error)return record('range/walk start',false,s);
  await walkAway(p);expectClean('range/walk: click a tile mid-cook at the range',await watch(p))});
C('range/out',async p=>{const s=await startRangeFish(p,1);if(s.error)return record('range/out start',false,s);
  const done=await waitFor(p,()=>!Player.action,null,15000);expectClean('range/out: the last fish comes out',await watch(p),{done})});
C('bake/walk',async p=>{const s=await startBake(p);if(s.error)return record('bake/walk start',false,s);
  await walkAway(p);expectClean('bake/walk: click a tile mid-bake',await watch(p))});
C('bake/done',async p=>{const s=await startBake(p);if(s.error)return record('bake/done start',false,s);
  const done=await waitFor(p,()=>Player.count('bread')>0,null,15000);expectClean('bake/done: the loaf comes out',await watch(p),{done})});

// ---- mining, smelting, smithing (a stroke per tick / per item)
C('mine/walk',async p=>{await levels(p,{Mining:40});const s=await startMine(p);if(s.error)return record('mine/walk start',false,s);
  await walkAway(p);expectClean('mine/walk: click a tile mid-swing',await watch(p))});
C('mine/empty',async p=>{await levels(p,{Mining:60});const s=await startMine(p);if(s.error)return record('mine/empty start',false,s);
  const gone=await waitFor(p,r=>scene.getObjectByName(r).userData.alive===false||!Player.action,s.rock,90000);expectClean('mine/empty: the rock is mined out',await watch(p),{gone})});
// a sword in hand while mining: the pick takes the hand for the swings, the sword comes back after (HolmSkillTools)
C('mine/sword-back',async p=>{await levels(p,{Mining:1,Attack:5});await pack(p,[['bronze_sword',1]]);await clickInventory(p,'bronze_sword');
  // while the swings go on (a rock can be mined out on any ore: then the player clicks a rock again)
  let s=null,mid=null;for(let k=0;k<3&&!(mid&&mid.held==='pickaxe');k++){s=await startMine(p);if(s.error)return record('mine/sword-back start',false,s);
  mid=await p.evaluate(async()=>{let seen=null;for(let i=0;i<60&&!seen;i++){const x=__A.snap();if(x.action==='gather'&&x.held==='pickaxe'&&x.weaponShown===false)seen=x;else await new Promise(r=>setTimeout(r,50))}return seen||__A.snap()})}
  record('mine/sword-back: mid-swing the pick is in the hand and the sword put away',mid.held==='pickaxe'&&mid.weaponShown===false,{held:mid.held,weaponShown:mid.weaponShown,action:mid.action,rock:s.rock,chat:await L.lastChat(p,3)});
  await walkAway(p);expectClean('mine/sword-back: walk off, the sword is back in the hand',await watch(p))});
C('smelt/walk',async p=>{const s=await startSmelt(p,3);if(s.error)return record('smelt/walk start',false,s);
  await walkAway(p);expectClean('smelt/walk: click a tile mid-smelt',await watch(p))});
C('smelt/out',async p=>{const s=await startSmelt(p,1);if(s.error)return record('smelt/out start',false,s);
  const done=await waitFor(p,()=>!Player.action,null,15000);expectClean('smelt/out: the last ore is smelted',await watch(p),{done})});
C('smelt/dialog',async p=>{const s=await startSmelt(p,3);if(s.error)return record('smelt/dialog start',false,s);
  await clickNamed(p,'island-lesson-furnace',{keepDialogs:true});const open=await waitFor(p,()=>getComputedStyle(document.getElementById('dialogue-modal')).display!=='none',null,8000);
  expectClean('smelt/dialog: click the furnace mid-smelt (its chat box opens)',await watch(p),{open});await p.keyboard.press('Escape');await sleep(300);
  expectClean('smelt/dialog: close the chat box',await watch(p,[],1500))});
C('smith/walk',async p=>{const s=await startSmith(p,3);if(s.error)return record('smith/walk start',false,s);
  await walkAway(p);expectClean('smith/walk: click a tile mid-hammer',await watch(p))});
C('smith/out',async p=>{const s=await startSmith(p,1);if(s.error)return record('smith/out start',false,s);
  const done=await waitFor(p,()=>!Player.action,null,15000);expectClean('smith/out: the last bar is used',await watch(p),{done})});

// ---- pick up, bank, ladders, the shaft rope
C('pickup',async p=>{await pack(p,[],true);const oak=await objPos(p,'island-lesson-survival-oak-2');await placeNear(p,[oak[0]+4,oak[1],oak[2]+3],0);await sleep(900);
  // a ground item on an open tile a few steps off (the same stack the game drops: makeDrop), at the tile's own height
  const at=await p.evaluate(()=>{const c=[player.position.x,player.position.y,player.position.z];const n=HolmArrivalQA.graphNodes().filter(n=>{const h=Math.hypot(n.x-c[0],n.z-c[2]);return h>=3&&h<=4.5&&Math.abs(n.y-c[1])<.6&&!/stair|ladder|upper/i.test(n.surface||'')})[0];if(!n)return null;
    makeDrop('bones',1,n.x,n.z);const m=WORLD.drops[WORLD.drops.length-1];m.position.set(n.x,n.y+.02,n.z);m.name='qa-anim-drop';return [n.x,n.z]});
  if(!at)return record('pickup: a tile for the item',false);
  await clickNamed(p,'qa-anim-drop');await sleep(350);await walkAway(p);expectClean('pickup: walk off mid-way to the item',await watch(p));
  await clickNamed(p,'qa-anim-drop');const got=await waitFor(p,()=>Player.count('bones')>0,null,15000);record('pickup: the item is taken',got,{at});expectClean('pickup: after taking it',await watch(p),{got})});
C('bank',async p=>{const st=await p.evaluate(()=>HolmArrivalQA.qaStance('bank','counter'));await placeNear(p,[st.x,st.y,st.z],3);await sleep(900);
  await clickService(p,'Use bank counter','counter');const open=await waitFor(p,()=>{const m=document.getElementById('bank-modal');return m&&getComputedStyle(m).display!=='none'},null,20000);
  expectClean('bank: the bank opens',await watch(p),{open});await p.keyboard.press('Escape');await sleep(300);await p.evaluate(()=>{try{UI.closeModal('bank-modal')}catch(e){}});
  expectClean('bank: closed',await watch(p,[],1500));await walkAway(p);expectClean('bank: then walk off',await watch(p))});
// a service click that returns at once (the lib's clickService waits for the walk and the service to finish)
async function servicePress(page,label,which){
  const xy=await page.evaluate(async(label,which)=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pt=null;
    scene.traverse(o=>{const s=o.userData.islandService;if(!pt&&o.isMesh&&s&&s.label===label&&(!which||s.target===which))pt=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())});if(!pt)return null;
    const dx=player.position.x-pt.x,dz=player.position.z-pt.z,d=Math.hypot(dx,dz);   // the island drivers' framings (clickService), then the compass yaws
    for(const [yaw,pitch,dist] of [[d>.5?Math.atan2(dx,dz):0,1.15,Math.max(12,d*1.6)],[0,1.3,14],[Math.PI/2,1.3,14],[Math.PI,1.3,14],[-Math.PI/2,1.3,14],[Math.PI/4,.95,10],[-Math.PI/4,.95,10],[3*Math.PI/4,.95,10],[-3*Math.PI/4,.95,10]]){camCtl.yaw=yaw;camCtl.pitch=pitch;camCtl.dist=dist;await sleep(1300);
      const r=renderer.domElement.getBoundingClientRect(),v=pt.clone().project(camera),cx=(v.x+1)/2*r.width+r.left,cy=(1-v.y)/2*r.height+r.top;
      for(let k=0;k<=120;k+=4)for(let an=0;an<360;an+=(k?15:360)){const x=Math.round(cx+Math.cos(an*Math.PI/180)*k),y=Math.round(cy+Math.sin(an*Math.PI/180)*k);
        if(x<0||y<0||x>=r.width||y>=r.height||document.elementFromPoint(x,y)!==renderer.domElement)continue;const h=pick({clientX:x,clientY:y}),s=h&&h.obj.userData.islandService;if(s&&s.label===label&&(!which||s.target===which))return [x,y]}}
    return null},label,which||null);
  if(!xy)return {error:'service not clickable '+label};await press(page,xy);return {ok:true}}
C('ladder',async p=>{const st=await p.evaluate(()=>HolmArrivalQA.qaStance('lastlight','ladder1-foot'));if(!st)return record('ladder: stance',false);await placeNear(p,[st.x,st.y,st.z],2);await sleep(900);
  await seenReset(p);const y0=await p.evaluate(()=>player.position.y);const c=await servicePress(p,'Climb-up ladder','ladder1-foot');const up=await waitFor(p,y=>player.position.y>y+1,y0,20000);
  await sleep(1600);const d=await durs(p);record('ladder: the climb clip plays standing at the top (not cut)',(d.climb||0)>=500,{up,climbMs:d.climb||0,click:c.error||'ok'});
  expectClean('ladder: after the climb clip',await watch(p,[],2500));
  const y1=await p.evaluate(()=>player.position.y);await servicePress(p,'Climb-down ladder','ladder1-top');const down=await waitFor(p,y=>player.position.y<y-1,y1,20000);
  const at0=await p.evaluate(()=>[player.position.x,player.position.z]);const w0=await walkAway(p,2,5);const w=await watch(p);const moved=await p.evaluate(a=>Math.hypot(player.position.x-a[0],player.position.z-a[1]),at0);
  expectClean('ladder: climb down, walk off at once',w,{down,moved:+moved.toFixed(2),walk:w0.error||(w0.fast?'at once':'after turning the camera')});record('ladder: the walk-off click moved the adventurer',moved>.5,{moved})});
C('shaft',async p=>{const st=await p.evaluate(()=>HolmArrivalQA.qaStance('quarry','approach'));await placeNear(p,[st.x,st.y,st.z],1);await sleep(900);
  await seenReset(p);const sc=await servicePress(p,'Climb-down mine shaft','shaft');const down=await waitFor(p,()=>player.position.y<-20,null,40000);
  if(!down)return record('shaft: the climb down happened',false,{click:sc,chat:await L.lastChat(p,3),rope:await p.evaluate(()=>HolmShaftRope.snapshot()),at:await p.evaluate(()=>[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(1)))});
  const at0=await p.evaluate(()=>{window.__trk=[];const t0=performance.now();const iv=setInterval(()=>{window.__trk.push([Math.round(performance.now()-t0),+player.position.x.toFixed(1),+player.position.y.toFixed(1),+player.position.z.toFixed(1),player.userData.gmix.moving?1:0]);if(window.__trk.length>40)clearInterval(iv)},100);return [player.position.x,player.position.z]});const w0=await walkAway(p,2,5);const w=await watch(p);const moved=await p.evaluate(a=>Math.hypot(player.position.x-a[0],player.position.z-a[1]),at0);
  if(process.env.ANIM_DEBUG)console.log(JSON.stringify(await p.evaluate(()=>window.__trk)),JSON.stringify(w0));
  expectClean('shaft: climb down the rope, walk off at once',w,{down,moved:+moved.toFixed(2),seen:await seen(p),walk:w0.error||(w0.fast?'at once':'after turning the camera')});record('shaft: the walk-off click moved the adventurer',moved>.5,{moved})});

// ---- the shaft rope tied right after fishing and cooking: the knot (the borrowed cook reach) holds nothing in the hand
C('rope/after-fish-cook',async p=>{await levels(p,{Fishing:40,Cooking:40,Firemaking:40});
  const s=await startNet(p);if(s.error)return record('rope/after-fish-cook: net start',false,s);
  const fish=await waitFor(p,()=>Player.count('raw_perch')>0,null,90000);record('rope/after-fish-cook: a fish netted',fish);
  await walkAway(p);await sleep(1500);
  await p.evaluate(()=>{Player.addItem('raw_perch',1);Player.addItem('tinderbox',1);Player.addItem('logs',1);UI.refreshInv()});
  await toOpenGround(p);await clickInventory(p,'tinderbox');await clickInventory(p,'logs');
  const lit=await waitFor(p,()=>!!scene.getObjectByName('island-campfire')&&!Player.action,null,20000);await sleep(1500);
  const n0=await p.evaluate(()=>Player.count('cooked_perch')+Player.count('burnt_perch'));
  await clickNamed(p,'island-campfire');const cooked=await waitFor(p,n=>Player.count('cooked_perch')+Player.count('burnt_perch')>n,n0,30000);
  await walkAway(p);await sleep(1200);record('rope/after-fish-cook: a fish cooked (one raw fish left in the pack)',lit&&cooked&&await p.evaluate(()=>Player.count('raw_perch')>0),{lit,cooked});
  // the shaft as a new adventurer finds it: the ledger back to the shaft lesson (gates stay open) and the rope untied
  await p.evaluate(()=>{const ids=HolmCurriculumProgress.lessonIds;HolmIslandCurriculum.qaSetLedger(ids.slice(0,ids.indexOf('descend_cavern')));Tutorial.talkedTutors=HolmIslandTutors.cast().map(c=>c.id);HolmShaftRope.qaUntie()});
  const st=await p.evaluate(()=>HolmArrivalQA.qaStance('quarry','approach'));await placeNear(p,[st.x,st.y,st.z],1);await sleep(900);
  await waitFor(p,()=>!!scene.getObjectByName('island-rope-coil'),null,30000);
  const t=await L.rightClickRow(p,'island-rope-coil','Take Rope');const took=await waitFor(p,()=>Player.count('rope')>0,null,40000);
  if(!took)return record('rope/after-fish-cook: take the rope',false,{take:t.error||'ok',rows:t.rows});
  await p.evaluate(()=>{window.__heldLog=[];window.__heldIv=setInterval(()=>{const s=__A.snap();if(s.held||s.stray.length)window.__heldLog.push([s.held,s.stray.join('+')])},50)});
  await seenReset(p);await clickInventory(p,'rope');const c=await servicePress(p,'Climb-down mine shaft','shaft');
  const tied=await waitFor(p,()=>HolmShaftRope.tied()&&Player.count('rope')===0,null,40000);await sleep(2500);
  const log=await p.evaluate(()=>{clearInterval(window.__heldIv);return window.__heldLog});const d=await durs(p);
  const heldAny=[...new Set(log.map(x=>x[0]).filter(Boolean))];
  record('rope/after-fish-cook: the knot plays with nothing in the hand (no raw fish)',tied&&!heldAny.length&&(d.cook||0)>=300,{tied,click:c.error||'ok',held:heldAny,knotMs:d.cook||0});
  expectClean('rope/after-fish-cook: after the knot',await watch(p,[],2500));
  await p.evaluate(()=>{const ids=HolmCurriculumProgress.lessonIds;HolmIslandCurriculum.qaSetLedger(ids.slice(0,-1));Tutorial.talkedTutors=HolmIslandTutors.cast().map(c=>c.id);Tutorial.shaftRopeTied=true})});

// ---- combat: melee (slash / stab / crush), bow, cast; the grubkin's misses raise the guard (the block clip)
for(const [w,style,label] of [['bronze_sword',2,'slash'],['bronze_dagger',0,'stab'],['bronze_warhammer',0,'crush']])
  C('melee-'+label,async p=>{await levels(p,{Attack:30,Strength:1,Defence:99,Hitpoints:60});const s=await startFight(p,w,style,'pg_poacher');if(s.error)return record('melee-'+label+' start',false,s);
    await seenReset(p);await waitFor(p,()=>__A.seen.indexOf('block')>=0,null,40000);const sn=await seen(p);await sleep(1500);
    await walkAway(p);expectBack('melee-'+label+': walk off mid-fight (after the guard went up)',await watch(p,REACT),{seen:sn});
    await reset(p)});
C('melee-kill',async p=>{await levels(p,{Attack:60,Strength:60,Defence:99,Hitpoints:60});const s=await startFight(p,'bronze_sword',2);if(s.error)return record('melee-kill start',false,s);
  await p.evaluate(g=>{const n=WORLD.npcs.find(x=>x.mesh.name===g);n.hp=2},s.foe);const dead=await waitFor(p,g=>{const n=WORLD.npcs.find(x=>x.mesh.name===g);return !n||n.dead},s.foe,30000);
  await waitFor(p,()=>!Player.target,null,6000);expectClean('melee-kill: the foe dies',await watch(p),{dead});await reset(p)});
C('melee-eat',async p=>{await levels(p,{Attack:30,Defence:99,Hitpoints:60});const s=await startFight(p,'bronze_sword',2,'pg_poacher',[['trout',3]]);if(s.error)return record('melee-eat start',false,s);
  await p.evaluate(()=>{Player.hp=Math.max(1,Player.hp-10);UI.refreshHud()});await sleep(1500);await clickInventory(p,'trout');await sleep(1200);
  await walkAway(p);expectBack('melee-eat: eat mid-fight, then walk off',await watch(p,REACT));await reset(p)});
C('bow',async p=>{await levels(p,{Ranged:30,Defence:99,Hitpoints:60});const s=await startFight(p,'worn_bow',0,'keep-court',[['arrows',200]]);if(s.error)return record('bow start',false,s);
  await waitClip(p,'bow',15000);await sleep(2600);await walkAway(p);expectClean('bow: walk off mid-fight',await watch(p));await reset(p)});
C('cast',async p=>{await levels(p,{Magic:30,Defence:99,Hitpoints:60});await pack(p,[['air_rune',100],['mind_rune',100]]);const sp=await spellbook(p);
  const g0=await grub(p,'mage-yard');await placeByObj(p,g0,4);const g=await grub(p,'mage-yard');await clickNamed(p,g,{keepDialogs:true});
  const cast=await waitClip(p,'cast',15000);expectClean('cast: a single Gale Dart',await watch(p,[],4000),{spell:sp,cast});
  await spellbook(p);await clickNamed(p,g,{keepDialogs:true});await waitClip(p,'cast',15000);await sleep(200);await walkAway(p);expectClean('cast: walk off mid-cast',await watch(p));await reset(p)});
C('melee-die',async p=>{await levels(p,{Attack:30,Defence:1,Hitpoints:10});const s=await startFight(p,'bronze_dagger',0,'pg_poacher');if(s.error)return record('melee-die start',false,s);
  await sleep(2500);await p.evaluate(()=>LocalCombat.damagePlayer(Player.hp,null,{kind:'npcMelee'}));await waitFor(p,()=>Player.dead,null,5000);
  await waitFor(p,()=>!Player.dead,null,15000);await sleep(300);expectClean('melee-die: after dying mid-fight and the respawn',await watch(p));await levels(p,{Hitpoints:60})});

// ---- emotes
C('emote/done',async p=>{await reset(p);const ok=await emoteClick(p,'Dance');const pl=await waitClip(p,'emote_dance',4000);record('emote/done: the Dance button plays emote_dance',ok&&pl,{clicked:ok});await sleep(1900);
  expectClean('emote/done: Dance plays out',await watch(p,[],2600),{clicked:ok,played:pl})});
C('emote/walk',async p=>{const ok=await emoteClick(p,'Cheer');const pl=await waitClip(p,'emote_cheer',4000);record('emote/walk: Cheer plays',ok&&pl);await openTab(p,'inv');await walkAway(p);expectClean('emote/walk: walk mid-emote',await watch(p))});
C('emote/chop',async p=>{await levels(p,{Woodcutting:1});const s=await startChop(p);if(s.error)return record('emote/chop start',false,s);const ok=await emoteClick(p,'Wave');record('emote/chop: the Wave button was clicked',ok);await sleep(300);
  const w=await watch(p,['chop','emote_wave'],2400);expectOnly('emote/chop: Wave mid-chop (one of them, never both stuck)',w,['chop','emote_wave']);
  await openTab(p,'inv');await walkAway(p);expectClean('emote/chop: then walk off',await watch(p))});
C('emote/tab-hidden',async p=>{await reset(p);const ok=await emoteClick(p,'Think');const pl=await waitClip(p,'emote_think',4000);record('emote/tab-hidden: Think plays',ok&&pl);const hid=await hideTab(p,3500);
  expectClean('emote/tab-hidden: the emote ended while the tab was hidden',await watch(p),{hidden:hid});await openTab(p,'inv')});

const GAIT_CASES=[];const G=(name,fn)=>GAIT_CASES.push({name,fn});
G('gait/net',async p=>{await levels(p,{Fishing:1});const s=await startNet(p);if(s.error)return record('gait/net start',false,s);
  for(const [kind,opt] of [['walk','G'],['run','H'],['idle','A'],['idle','B']]){await gaitButton(p,kind,opt);await sleep(500)}
  const st=await p.evaluate(()=>HolmGaitOptions.status());const w=await watch(p,['net'],2000);expectOnly('gait/net: switch walk / run / idle presets mid-cast (no orphaned gait action)',w,['net'],{playing:st.playing,action:w.final.action});
  await walkAway(p,4,8);await sleep(400);await gaitButton(p,'walk','H');await gaitButton(p,'run','G');expectClean('gait/walk: switch presets mid-walk',await watch(p));
  await gaitButton(p,'walk','');await gaitButton(p,'run','');await gaitButton(p,'idle','');expectClean('gait/shipped: back to the shipped clips',await watch(p,[],2000));
  await walkAway(p);expectClean('gait/shipped: then walk off',await watch(p))});
async function gaitButton(page,kind,opt){const xy=await page.evaluate((k,o)=>{const b=document.querySelector('#gait-options-panel button[data-k="'+k+'"][data-o="'+o+'"]');if(!b)return null;const r=b.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:null},kind,opt);
  if(xy)await page.mouse.click(xy[0],xy[1]);return !!xy}

const MAIN_CASES=[];
MAIN_CASES.push({name:'mainland/chop',fn:async p=>{
  await p.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);Tutorial.departurePackClaimed=false});
  await p.evaluate(()=>HolmIslandCurriculum.board());const there=await waitFor(p,()=>typeof CRWorldMode!=='undefined'&&!/holm/.test(CRWorldMode.providerId||'')&&!WorldTravel.isBusy(),null,90000);
  await sleep(4000);if(!there)return record('mainland/chop: the ferry',false);
  await pack(p,[['hatchet',1]]);await clickInventory(p,'hatchet');await levels(p,{Woodcutting:40});
  // the v2 mainland has no woodcutting yet: a tree is planted beside the adventurer with the game's own builder (makeTree)
  const tree=await p.evaluate(()=>{let t=(WORLD.resources||[]).find(r=>r.userData&&r.userData.rtype==='tree'&&r.userData.alive!==false);
    if(!t){const x=Math.floor(player.position.x)+3.5,z=Math.floor(player.position.z)+.5;t=makeTree(x,z)}if(!t)return null;t.name=t.name||'qa-anim-tree';
    return {name:t.name,at:[+t.position.x.toFixed(1),+t.position.z.toFixed(1)],holm:HolmIslandPlayer.active()}});
  if(!tree)return record('mainland/chop: a tree',false);
  const c=await clickNamed(p,tree.name);const chop=await waitClip(p,'chop',40000);if(!chop)return record('mainland/chop: chopping started',false,{tree,c,snap:await snap(p)});
  await sleep(1500);
  // a mainland walk order: the plain ground under the cursor (no island graph here)
  const xy=await p.evaluate(()=>{const r=renderer.domElement.getBoundingClientRect();for(const [dx,dz] of [[4,0],[-4,0],[0,4],[0,-4],[3,3]]){const v=new THREE.Vector3(player.position.x+dx,player.position.y,player.position.z+dz).project(camera);
    const x=Math.round((v.x+1)/2*r.width+r.left),y=Math.round((1-v.y)/2*r.height+r.top);if(document.elementFromPoint(x,y)!==renderer.domElement)continue;const h=pick({clientX:x,clientY:y});if(h&&isGroundName(h.obj.name))return [x,y]}return null});
  if(xy)await press(p,xy);expectClean('mainland/chop: walk off mid-chop after the ferry',await watch(p,[],4000),{tree,walked:!!xy,provider:await p.evaluate(()=>CRWorldMode.providerId)})
  // a 0 splat on the mainland raises the guard once
  await sleep(1500);await p.evaluate(()=>LocalCombat.damagePlayer(0,null,{kind:'npcMelee'}));expectClean('mainland/guard: a 0 splat, the guard comes down',await watch(p,[],3200),{seen:await seen(p)});
  // an emote clicked on the move waits for the stop, then plays (HolmIslandPlayer's pending emote, now stepped off the island too)
  const xy2=await p.evaluate(()=>{const r=renderer.domElement.getBoundingClientRect();for(const [dx,dz] of [[-2,0],[2,0],[0,-2],[0,2]]){const v=new THREE.Vector3(player.position.x+dx,player.position.y,player.position.z+dz).project(camera);
    const x=Math.round((v.x+1)/2*r.width+r.left),y=Math.round((1-v.y)/2*r.height+r.top);if(document.elementFromPoint(x,y)!==renderer.domElement)continue;const h=pick({clientX:x,clientY:y});if(h&&isGroundName(h.obj.name))return [x,y]}return null});
  if(xy2){await press(p,xy2);await sleep(150);const ok=await emoteClick(p,'Cheer');const pl=await waitClip(p,'emote_cheer',4000);record('mainland/emote: Cheer clicked on the move plays once stopped',ok&&pl,{clicked:ok,played:pl});await openTab(p,'inv');
    expectClean('mainland/emote: then back to idle',await watch(p,[],4000))}
}});

module.exports={installProbe,boot,levels,pack,placeNear,placeByObj,walkAway,startChop,startNet,startFire,startCookFire,startRangeFish,startBake,startMine,startSmelt,startSmith,startFight,grub,snap,watch,waitClip,emoteClick,openTab,runOrbClick,hideTab,spellbook,CASES,GAIT_CASES,MAIN_CASES,results};
if(require.main===module)(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const want=c=>!ONLY.length||ONLY.some(o=>c.name.indexOf(o)>=0);
  const t0=Date.now();let page=null;
  try{
    for(const group of [{cases:CASES,query:''},{cases:GAIT_CASES,query:'&gait=panel'},{cases:MAIN_CASES,query:''}]){
      const list=group.cases.filter(want);if(!list.length)continue;
      page=await boot(browser,group.query);
      await levels(page,{Woodcutting:40,Fishing:30,Firemaking:40,Cooking:40,Mining:40,Smithing:40,Hitpoints:60});
      for(const c of list){console.log('case '+c.name);CUR=c.name;const n0=results.length;
        try{if(page.isClosed())page=await boot(browser,group.query);
          if(!await page.evaluate(()=>typeof __A!=='undefined').catch(()=>false)){await enter(page).catch(()=>{});await page.waitForFunction(()=>typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active(),{timeout:180000});
            await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds);HolmIslandCurriculum.qaSetLedger(HolmCurriculumProgress.lessonIds.slice(0,-1));Tutorial.talkedTutors=HolmIslandTutors.cast().map(c=>c.id);Tutorial.shaftRopeTied=true});
            await page.evaluate(installProbe);await levels(page,{Woodcutting:40,Fishing:30,Firemaking:40,Cooking:40,Mining:40,Smithing:40,Hitpoints:60})}
          await c.fn(page)}catch(e){record(c.name+' (driver)',false,{error:String(e).slice(0,300)})}
        if(results.slice(n0).some(r=>!r.ok))await L.shot(page,'fail_'+c.name.replace(/[^a-z0-9]+/gi,'_'));
        await reset(page).catch(()=>{});
      }
      const errs=page.__errors||[];record('page errors ('+(group.query||'default')+')',!errs.length,errs.slice(0,3));
      await page.close();page=null;
    }
  }finally{await browser.close()}
  const rep={at:new Date().toISOString(),base:BASE,only:ONLY,minutes:+((Date.now()-t0)/60000).toFixed(1),limitMs:LIMIT,pass:results.filter(r=>r.ok).length,fail:fails,results};
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(rep,null,1));
  console.log('[ANIM-NO-STUCK] '+rep.pass+' ok, '+fails+' failed in '+rep.minutes+' min ('+path.join('scratchpad','anim_no_stuck','report.json')+')');
  process.exit(fails?1:0);
})();
