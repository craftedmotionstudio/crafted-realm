/* Plays the LOCAL 2004 Tutorial Island with the rs-sdk SDK, the way a player follows it: read the dialog, click the
 * flashing side tab, follow the yellow hint arrow (an NPC to talk to, or a door / gate / ladder / rock / range to use),
 * and do the skill each step asks for. Progress is the tutorial varp (281). ctx.moment(name, fn) lets the capture
 * script frame each moment (still frames, or frames while an animation plays). Only our own logic lives here. */
'use strict';
const C=require('./common');
const say=(...a)=>C.log('[tut]',...a);
const W=(S)=>S.sdk.getState();
const tile=(S)=>{const p=W(S).player;return [p.worldX,p.worldZ]};
// The tutorial varp is not transmitted to the client, so progress is read the way a player reads it: from the title of
// the tutorial text in the chat box. The title -> step table is built at run time, in memory, from the LOCAL rs-sdk
// content scripts (nothing is copied or stored).
let TITLES=null,TITLE_COM=null,LAST=0;const NL=new RegExp('\r?\n');
function titleMap(){
  if(TITLES)return TITLES;
  const fs=require('fs'),base=C.RS+'/server/content';
  const consts={};for(const l of fs.readFileSync(base+'/scripts/tutorial/configs/tutorial.constant','utf8').split(NL)){const m=/^\^(\w+)\s*=\s*(\d+)/.exec(l);if(m)consts[m[1]]=+m[2]}
  const procTitle={};let cur=null;
  for(const l of fs.readFileSync(base+'/scripts/tutorial/scripts/tut_chatbox_steps.rs2','utf8').split(NL)){
    const p=/^\[proc,(\w+)\]/.exec(l);if(p){cur=p[1];continue}
    const t=/~tutorialstep\("([^"]*)"/.exec(l);if(t&&cur&&!(cur in procTitle))procTitle[cur]=t[1]}
  const src=fs.readFileSync(base+'/scripts/tutorial/scripts/tutorial.rs2','utf8');
  const sw=src.slice(src.indexOf('[proc,set_tutorial_progress]'));
  TITLES={};let acc='';
  for(const l of sw.split(NL).slice(1)){if(/^\[/.test(l))break;const t=l.replace(/\/\/.*$/,'').trim();if(!t)continue;
    acc+=' '+t;const m=/case\s+(.+?):\s*~(\w+);/.exec(acc);if(m){const vals=m[1].split(',').map(x=>x.trim()).map(x=>x.startsWith('^')?consts[x.slice(1)]:+x).filter(x=>Number.isFinite(x));
      const title=procTitle[m[2]];if(title){const v=Math.min(...vals);if(!(title in TITLES)||TITLES[title]>v)TITLES[title]=v}acc=''}else if(!/case/.test(acc))acc=''}
  const ifp=fs.readFileSync(base+'/pack/interface.pack','utf8');const mm=/^(\d+)=tutorial_text:title$/m.exec(ifp);TITLE_COM=mm?+mm[1]:6180;
  return TITLES;
}
async function progress(page){titleMap();
  const t=await page.evaluate(id=>{try{const L=window.gameClient.chatInterface.constructor.list;const c=L&&L[id];return c?c.text:null}catch(e){return null}},TITLE_COM);
  if(t&&t in TITLES)LAST=TITLES[t];return {v:LAST,title:t}}
const varp=async page=>(await progress(page)).v;
const hint=page=>page.evaluate(()=>{const c=window.gameClient;return {type:c.hintType,npc:c.hintNpc,x:c.hintTileX,z:c.hintTileZ}});
const flashIcon=page=>page.evaluate(()=>window.gameClient.tutFlashIcon);

// read a dialog to the end: options by the first matching `prefer` pattern (else the first); onPage(state, n) first
async function readDialog(S,opts){
  opts=opts||{};const {sdk}=S;let pages=0,idle=0;
  for(let i=0;i<(opts.max||60);i++){
    const d=W(S).dialog;
    if(!d.isOpen){if(++idle>(opts.idle||5))break;await sdk.waitForTicks(1);continue}
    idle=0;
    if(opts.onPage)await opts.onPage(d,pages);
    if(d.isWaiting){await sdk.waitForTicks(1);continue}
    const real=(d.options||[]).filter(o=>!/click here to continue/i.test(o.text));
    if(real.length){let pick=null;for(const re of (opts.prefer||[]))if(!pick)pick=real.find(o=>re.test(o.text));pick=pick||real[0];await sdk.clickDialogByText(pick.text)}
    else await sdk.sendClickDialog(0);
    pages++;await sdk.waitForTicks(1);
  }
  return pages;
}
async function talk(S,npc,opts){
  for(let k=0;k<4;k++){
    if(W(S).dialog.isOpen)return readDialog(S,opts);
    const r=await S.bot.talkTo(npc);
    if(r.success)return readDialog(S,opts);
    say('talkTo',String(npc&&npc.name||npc),'attempt',k+1,'failed:',r.message||r.reason);await C.sleep(1500+k*1000);
  }
  return 0;
}
// leave the first building: the guide first (answer "no" to the skip offer), then out through the door
async function leaveGuideHouse(S){
  const t0=tile(S);
  await talk(S,/RuneScape Guide/i,{prefer:[/^no/i]});
  const expert=S.sdk.findNearbyNpc(/Survival Expert/i);
  const goal=expert?[expert.x,expert.z]:[t0[0]+8,t0[1]];
  const r=await S.bot.walkTo(goal[0],goal[1],2);
  say('left guide house ->',JSON.stringify(tile(S)),r.success?'':'(walk: '+(r.message||'')+')');
  return r.success;
}

// ---- following the tutorial
async function hintNpc(ctx){const h=await hint(ctx.page);if(h.type!==1)return null;return ctx.S.sdk.getNearbyNpcs().find(n=>n.index===h.npc)||null}
async function hintLoc(ctx){const h=await hint(ctx.page);if(h.type!==2)return null;
  const locs=await ctx.S.sdk.scanNearbyLocs(30);return locs.find(l=>l.x===h.x&&l.z===h.z)||{x:h.x,z:h.z,name:null}}
async function useHintLoc(ctx,option){
  const l=await hintLoc(ctx);if(!l)return false;
  if(!l.name){say('hint tile',l.x,l.z,'has no loc in view - walking there');await ctx.S.bot.walkTo(l.x,l.z,1);return true}
  const opt=option||((l.optionsWithIndex&&l.optionsWithIndex[0])?l.optionsWithIndex[0].text:1);
  say('hint loc',l.name,'@',l.x,l.z,'->',String(opt));
  const r=await ctx.S.bot.interactLoc(l,opt);if(!r.success)say('  interactLoc:',r.message||r.reason);
  return r.success;
}
async function talkHint(ctx,pattern,opts){
  const n=(await hintNpc(ctx))||ctx.S.sdk.findNearbyNpc(pattern);
  if(!n){say('no npc for',String(pattern));return 0}
  return talk(ctx.S,n,opts);
}
const inv=(S,re)=>S.sdk.findInventoryItem(re);
async function useOnItem(S,a,b){const x=inv(S,a),y=inv(S,b);if(!x||!y){say('useOnItem missing',String(a),String(b));return false}
  await S.sdk.sendUseItemOnItem(x.slot,y.slot);await S.sdk.waitForTicks(3);return true}
async function waitVarpChange(ctx,v,ms){const t0=Date.now();while(Date.now()-t0<(ms||20000)){if(await varp(ctx.page)!==v)return true;await C.sleep(250)}return false}
async function waitItem(S,re,ms){const t0=Date.now();while(Date.now()-t0<(ms||30000)){if(inv(S,re))return true;await C.sleep(250)}return false}
async function haveFire(S){const l=await S.sdk.scanNearbyLocs(8);return l.find(x=>/^fire$/i.test(x.name))||null}

// skill / item steps, by tutorial step (the talk and door steps are done by following the hint arrow)
const SKILL={
  30:c=>c.moment('woodcutting',async()=>{const r=await c.S.bot.chopTree();if(!r.success)say('chop:',r.message||r.reason);await waitItem(c.S,/logs/i,20000)}),
  40:c=>c.moment('firemaking',async()=>{const r=await c.S.bot.burnLogs();if(!r.success)say('burn:',r.message||r.reason);await C.sleep(1500)}),
  70:c=>c.moment('fishing',async()=>{const r=await c.S.bot.interactNpc(/Fishing spot/i,/net/i);if(!r.success)say('fish:',r.message||r.reason);await waitItem(c.S,/raw shrimp/i,40000);await C.sleep(600)}),
  80:async c=>{
    if(!inv(c.S,/raw shrimp/i)){await c.moment('fishing',async()=>{await c.S.bot.interactNpc(/Fishing spot/i,/net/i);await waitItem(c.S,/raw shrimp/i,40000)});}
    if(!await haveFire(c.S)){if(!inv(c.S,/logs/i)){await c.S.bot.chopTree();await waitItem(c.S,/logs/i,20000)}await c.S.bot.burnLogs();await C.sleep(1500)}
    await c.moment('cooking',async()=>{const r=await c.S.bot.useItemOnLoc(/raw shrimp/i,/fire/i);if(!r.success)say('cook:',r.message||r.reason);await waitVarpChange(c,80,15000);await C.sleep(800)})},
  90:c=>SKILL[80](c),
  150:async c=>{if(inv(c.S,/bread dough/i))return c.moment('baking',async()=>{const r=await c.S.bot.useItemOnLoc(/bread dough/i,/range/i);if(!r.success)say('bake:',r.message||r.reason);await waitItem(c.S,/^bread$/i,15000)});
    if(inv(c.S,/bucket of water/i)&&inv(c.S,/pot of flour/i)){await useOnItem(c.S,/bucket of water/i,/pot of flour/i);await waitItem(c.S,/bread dough/i,8000);return}
    return false},
  // controls tab: Run (the step's own text does not change when the tab is opened, so do it from 190 as well)
  190:async c=>{const h=await hint(c.page);if(h.type)return false;await c.S.sdk.sendSetTab(12);await c.S.sdk.waitForTicks(1);await c.S.sdk.sendClickComponent(153);await c.S.sdk.waitForTicks(3)},
  195:async c=>{await c.S.sdk.sendSetTab(12);await c.S.sdk.sendClickComponent(153);await c.S.sdk.waitForTicks(3)},
  320:c=>c.moment('smelting',async()=>{const r=await c.S.bot.useItemOnLoc(/tin ore|copper ore/i,/furnace/i);if(!r.success)say('smelt:',r.message||r.reason);await waitItem(c.S,/bronze bar/i,15000)}),
  340:async c=>{if(!inv(c.S,/hammer/i)||!inv(c.S,/bronze bar/i))return false;return c.moment('smithing',async()=>{const r=await c.S.bot.smithAtAnvil('dagger');if(!r.success)say('smith:',r.message||r.reason);await C.sleep(1500)})},
  380:async c=>{if(!inv(c.S,/dagger/i))return false;await c.S.bot.equipItem(/dagger/i);await C.sleep(1200);await c.moment('equipment_tab')},
  400:async c=>{if(!inv(c.S,/sword/i)&&!inv(c.S,/shield/i))return false;if(inv(c.S,/sword/i))await c.S.bot.equipItem(/sword/i);if(inv(c.S,/shield/i))await c.S.bot.equipItem(/shield/i);await C.sleep(1200)},
  430:c=>c.moment('combat',async()=>{const r=await c.S.bot.attack(/giant rat/i);if(!r.success)say('attack:',r.message||r.reason);await waitVarpChange(c,430,40000)}),
  440:c=>c.moment('combat',async()=>{await c.S.bot.attack(/giant rat/i);await waitVarpChange(c,440,40000)}),
  460:async c=>{if(inv(c.S,/shortbow/i))await c.S.bot.equipItem(/shortbow/i);if(inv(c.S,/arrow/i))await c.S.bot.equipItem(/arrow/i);await C.sleep(800);
    if(!c.S.sdk.findEquipmentItem(/shortbow/i))return false;
    return c.moment('ranged',async()=>{await c.S.bot.attack(/giant rat/i);await waitVarpChange(c,460,40000)})},
  500:c=>c.moment('bank',async()=>{const r=await c.S.bot.openBank();if(!r.success)say('bank:',r.message||r.reason);await C.sleep(2000)}),
};
const LOC_OPTION={270:/prospect/i,290:/^mine$/i};
// places worth a still, keyed by the instructor the arrow points at (captured once, before the first talk)
const NPC_MOMENT={'runescape guide':['guide_interior','guide_dialogue'],'master chef':['chef_building','chef_dialogue'],'quest guide':['quest_building','quest_dialogue'],
  'mining instructor':['mine','mining_dialogue'],'combat instructor':['combat_area','combat_dialogue'],'survival expert':['survival_area','survival_dialogue']};
const STEP=SKILL;

async function play(ctx,until){
  const {page,S}=ctx;let last=-1,same=0,lastTitle=null,met={};
  for(let guard=0;guard<500;guard++){
    const pr=await progress(page),v=pr.v;
    if(v>=until){say('reached step',v);return v}
    if(v!==last||pr.title!==lastTitle){say('step',v,JSON.stringify(pr.title),'tile',JSON.stringify(tile(S)));last=v;lastTitle=pr.title;same=0}else if(++same>14){say('stuck at',v);return v}
    if(W(S).dialog.isOpen){await readDialog(S,{prefer:[/^no/i]});continue}
    const f=await flashIcon(page);
    if(f>=0){await ctx.moment('tab_'+f);await S.sdk.sendSetTab(f);await S.sdk.waitForTicks(2);continue}
    try{
      let done=false;
      if(SKILL[v]){const r=await SKILL[v](ctx);done=r!==false}
      if(!done){
        const n=await hintNpc(ctx);
        if(n&&!/rat|fishing spot/i.test(n.name)){const key=n.name.toLowerCase(),mm=NPC_MOMENT[key];
          if(mm&&!met[key]){met[key]=1;await ctx.moment(mm[0]);await talk(S,n,{prefer:[/^no/i],onPage:ctx.pageHook(mm[1])})}
          else await talk(S,n,{prefer:[/^no/i]})}
        else if(!n){const h=await hint(page);if(h.type===2)await useHintLoc(ctx,LOC_OPTION[v]);else say('no hint at step',v)}
      }
    }catch(e){say('step',v,'error',String(e&&e.message||e).slice(0,160))}
    await C.sleep(700);
  }
  return varp(page);
}
module.exports={readDialog,talk,leaveGuideHouse,tile,W,varp,progress,titleMap,hint,play,STEP};
