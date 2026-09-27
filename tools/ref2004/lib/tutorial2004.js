/* Plays the LOCAL 2004 Tutorial Island with the rs-sdk SDK, the way a player follows it: read the dialog, click the
 * flashing side tab, follow the yellow hint arrow (an NPC to talk to, or a door / gate / ladder / rock / range to use),
 * and do the skill each step asks for. Progress is the tutorial varp (281). ctx.moment(name, fn) lets the capture
 * script frame each moment (still frames, or frames while an animation plays). Only our own logic lives here. */
'use strict';
const C=require('./common');
const say=(...a)=>C.log('[tut]',...a);
const W=(S)=>S.sdk.getState();
const tile=(S)=>{const p=W(S).player;return [p.worldX,p.worldZ]};
const varp=page=>page.evaluate(()=>window.gameClient.varps?window.gameClient.varps[281]:-1);
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

const STEP={
  0:c=>talkHint(c,/RuneScape Guide/i,{prefer:[/^no/i],onPage:c.pageHook('guide_dialogue')}),
  1:c=>STEP[0](c),
  4:async c=>{await c.moment('guide_interior');await useHintLoc(c,/open/i)||await c.S.bot.openDoor(/door/i)},
  10:async c=>{const n=await hintNpc(c)||c.S.sdk.findNearbyNpc(/Survival Expert/i);if(n&&n.distance>3)await c.S.bot.walkTo(n.x,n.z,1);await talkHint(c,/Survival Expert/i)},
  30:c=>c.moment('woodcutting',async()=>{const r=await c.S.bot.chopTree();if(!r.success)say('chop:',r.message||r.reason);await waitItem(c.S,/logs/i,20000)}),
  40:c=>c.moment('firemaking',async()=>{const r=await c.S.bot.burnLogs();if(!r.success)say('burn:',r.message||r.reason);await C.sleep(1500)}),
  60:c=>talkHint(c,/Survival Expert/i),
  70:c=>c.moment('fishing',async()=>{const r=await c.S.bot.interactNpc(/Fishing spot/i,/net/i);if(!r.success)say('fish:',r.message||r.reason);await waitItem(c.S,/raw shrimp/i,40000);await C.sleep(600)}),
  80:async c=>{
    if(!inv(c.S,/raw shrimp/i)){await c.moment('fishing',async()=>{await c.S.bot.interactNpc(/Fishing spot/i,/net/i);await waitItem(c.S,/raw shrimp/i,40000)});}
    if(!await haveFire(c.S)){if(!inv(c.S,/logs/i)){await c.S.bot.chopTree();await waitItem(c.S,/logs/i,20000)}await c.S.bot.burnLogs();await C.sleep(1500)}
    await c.moment('cooking',async()=>{const r=await c.S.bot.useItemOnLoc(/raw shrimp/i,/fire/i);if(!r.success)say('cook:',r.message||r.reason);await waitVarpChange(c,80,15000);await C.sleep(800)})},
  90:c=>STEP[80](c),
  120:c=>useHintLoc(c,/open/i),
  130:c=>useHintLoc(c,/open/i),
  140:async c=>{await c.moment('chef_building');await talkHint(c,/Master Chef/i,{onPage:c.pageHook('chef_dialogue')})},
  150:async c=>{await useOnItem(c.S,/bucket of water/i,/pot of flour/i);await waitItem(c.S,/bread dough/i,8000)},
  160:c=>c.moment('baking',async()=>{const r=await c.S.bot.useItemOnLoc(/bread dough/i,/range/i);if(!r.success)say('bake:',r.message||r.reason);await waitVarpChange(c,160,15000)}),
  180:c=>useHintLoc(c,/open/i),
  195:async c=>{await c.S.sdk.sendClickComponent(153);await c.S.sdk.waitForTicks(2)},          // controls tab: Run
  200:async c=>{const ok=await useHintLoc(c,/open/i);if(!ok){const n=c.S.sdk.findNearbyNpc(/Quest Guide/i);if(n)await c.S.bot.walkTo(n.x,n.z,1)}},
  220:async c=>{await c.moment('quest_building');await talkHint(c,/Quest Guide/i,{onPage:c.pageHook('quest_dialogue')})},
  240:c=>talkHint(c,/Quest Guide/i),
  250:async c=>{await useHintLoc(c,/climb-down/i)||await c.S.bot.interactLoc(/ladder/i,/climb-down/i);await C.sleep(2500)},
  260:async c=>{await c.moment('mine');await talkHint(c,/Mining Instructor/i)},
  270:c=>useHintLoc(c,/prospect/i).then(()=>C.sleep(4000)),
  274:c=>STEP[270](c),275:c=>STEP[270](c),279:c=>STEP[270](c),
  280:c=>talkHint(c,/Mining Instructor/i),
  290:c=>c.moment('mining',async()=>{await useHintLoc(c,/mine/i);await waitVarpChange(c,290,25000);await C.sleep(600)}),
  294:c=>c.moment('mining',async()=>{await useHintLoc(c,/mine/i);await waitVarpChange(c,294,25000)}),
  295:c=>STEP[294](c),
  320:c=>c.moment('smelting',async()=>{const r=await c.S.bot.useItemOnLoc(/tin ore|copper ore/i,/furnace/i);if(!r.success)say('smelt:',r.message||r.reason);await waitItem(c.S,/bronze bar/i,15000)}),
  330:c=>talkHint(c,/Mining Instructor/i),
  340:c=>c.moment('smithing',async()=>{const r=await c.S.bot.smithAtAnvil('dagger');if(!r.success)say('smith:',r.message||r.reason);await C.sleep(1500)}),
  350:c=>useHintLoc(c,/open/i),
  360:c=>talkHint(c,/Combat Instructor/i),
  380:async c=>{await c.S.bot.equipItem(/dagger/i);await C.sleep(1200);await c.moment('equipment_tab')},
  390:c=>talkHint(c,/Combat Instructor/i),
  400:async c=>{await c.S.bot.equipItem(/sword/i);await c.S.bot.equipItem(/shield/i);await C.sleep(1200)},
  420:async c=>{await c.moment('combat_tab');await useHintLoc(c,/open/i)},
  430:c=>c.moment('combat',async()=>{const r=await c.S.bot.attack(/giant rat/i);if(!r.success)say('attack:',r.message||r.reason);await waitVarpChange(c,430,40000)}),
  440:c=>c.moment('combat',async()=>{await c.S.bot.attack(/giant rat/i);await waitVarpChange(c,440,40000)}),
  450:async c=>{let n=c.S.sdk.findNearbyNpc(/Combat Instructor/i);if(n&&n.distance>6){await useHintLoc(c,/open/i)}await talkHint(c,/Combat Instructor/i)},
  460:async c=>{if(inv(c.S,/shortbow/i))await c.S.bot.equipItem(/shortbow/i);if(inv(c.S,/arrow/i))await c.S.bot.equipItem(/arrow/i);await C.sleep(800);
    await c.moment('ranged',async()=>{await c.S.bot.attack(/giant rat/i);await waitVarpChange(c,460,40000)})},
  470:async c=>{await useHintLoc(c,/climb-up/i)||await c.S.bot.interactLoc(/ladder/i,/climb-up/i);await C.sleep(2500)},
  500:c=>c.moment('bank',async()=>{const r=await c.S.bot.openBank();if(!r.success)say('bank:',r.message||r.reason);await C.sleep(1500)}),
};

async function play(ctx,until){
  const {page,S}=ctx;let last=-1,same=0;
  for(let guard=0;guard<400;guard++){
    const v=await varp(page);
    if(v>=until){say('reached varp',v);return v}
    if(v!==last){say('varp',v,'tile',JSON.stringify(tile(S)));last=v;same=0}else if(++same>10){say('stuck at',v);return v}
    if(W(S).dialog.isOpen){await readDialog(S,{prefer:[/^no/i]});continue}
    const f=await flashIcon(page);
    if(f>=0){await ctx.moment('tab_'+f);await S.sdk.sendSetTab(f);await S.sdk.waitForTicks(2);continue}
    try{
      if(STEP[v])await STEP[v](ctx);
      else{const n=await hintNpc(ctx);if(n)await talk(S,n);else await useHintLoc(ctx)}
    }catch(e){say('step',v,'error',String(e&&e.message||e).slice(0,160))}
    await C.sleep(700);
  }
  return varp(page);
}
module.exports={readDialog,talk,leaveGuideHouse,tile,W,varp,hint,play,STEP};
