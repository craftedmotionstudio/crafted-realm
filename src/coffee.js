/* ============ coffee — a drink taken in doses, brewed on a range (offline client) ============
 * Rules live in shared/drinks.js (CRShared.drinks), the same file the server consumes:
 *   - Coffee (4) .. Coffee (1): each sip restores 20% run energy and starts 2 minutes of 25% slower run drain
 *     ("caffeinated"; Player.caffeinated = seconds left, read by Player.tickVitals); the last sip sets the mug aside;
 *   - 2004 potion rule: no eat delay, no attack delay, the fight goes on (unlike food, which drops the attack order);
 *   - brewing: use the roasted beans, then click a range, with a jug of water in the pack -> Coffee (4) + the empty
 *     jug + Cooking XP. An open fire will not do.
 * Online (?online=1) the drink is an `eat` intent with the slot (the server branches on the item, see
 * docs/rebuild/NET_PROTOCOL.md) and the "caffeinated" time comes back as `me.caf` (ticks).
 * Wraps UI.useItem and handleClick like cooking_bread.js and calls through for everything else. Self-boots. */
var Coffee = (function(){
  'use strict';
  function D(){ return (typeof CRShared!=='undefined' && CRShared.drinks) || null; }

  /** one sip from the item in pack slot `slot`; true when it was a drink */
  function sip(slot){
    const d=D(), s=Player.inv[slot]; if(!d||!s||!d.isDrink(s.id)) return false;
    const r=d.sip(s.id, Player.energy||0, 100, 0);
    Player.energy=r.energy;
    Player.caffeinated=d.DRINKS[r.key].effectTicks*d.TICK_SECONDS;
    if(r.next) Player.inv[slot]={id:r.next, qty:1}; else Player.inv[slot]=null;
    if(typeof Sfx!=='undefined'&&Sfx.eat) Sfx.eat();
    UI.chat(r.text,'plain');
    UI.refreshInv(); if(UI.refreshRun) UI.refreshRun();
    if(typeof Events!=='undefined'&&Events.emit) Events.emit('drink',{id:s.id, slot});
    return true;
  }

  /* brewing: walk to the range, then brew once within the cook path's 2.4-unit reach (the bread pattern) */
  let pending=null;
  function brewAt(obj){
    if(pending!==null){ clearInterval(pending); pending=null; }
    const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
    if(!obj||!finite(obj.position)){ UI.chat('That range is unavailable.','plain'); return; }
    const target=obj.position.clone?obj.position.clone():Object.assign({},obj.position), deadline=Date.now()+30000;
    orderWalk(target);
    function stop(msg){ clearInterval(iv); if(pending===iv) pending=null; if(msg) UI.chat(msg,'plain'); }
    const iv=setInterval(()=>{
      if(pending!==iv){ clearInterval(iv); return; }
      try{
        if(Player.usingItem!=='roasted_beans'||Player.count('roasted_beans')<1||Player.action){ stop(); return; }
        if(typeof player==='undefined'||!player||!finite(player.position)){ stop(); return; }
        if(Date.now()>=deadline){ stop('You never reached the range, so nothing was brewed.'); return; }
        const dist=player.position.distanceTo(target);
        if(!Number.isFinite(dist)){ stop(); return; }
        if(dist>2.4){ if(!Player.moveTo) stop('You cannot reach that range from here.'); return; }
        stop();
        brewNow();
      }catch(e){ console.error('[coffee]', e); stop(); }
    }, 200);
    pending=iv;
  }
  /** the brew itself (at the range): the shared plan, then the pack change, XP and message */
  function brewNow(){
    const d=D(); if(!d) return false;
    const plan=d.planBrew('coffee', Player.inv, Player.lvl?Player.lvl('Cooking'):1);
    if(!plan.ok){
      UI.chat(plan.level?'You need a Cooking level of '+plan.level+' to brew coffee.':
        'To brew coffee you need roasted beans and a jug or bucket of water.','plain');
      return false;
    }
    plan.take.slice().sort((a,b)=>b-a).forEach(i=>{ const s=Player.inv[i]; if(s&&s.qty>1) s.qty--; else Player.inv[i]=null; });
    plan.give.forEach(id=>Player.addItem(id,1));
    Player.addXp(plan.skill, plan.xp);
    Player.usingItem=null; UI.refreshInv();
    if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
    UI.chat(plan.text,'plain');
    return true;
  }

  function boot(){
    if(!D()||typeof ITEMS==='undefined'||typeof UI==='undefined'||typeof Player==='undefined') return false;
    if(typeof UI.useItem!=='function'||typeof handleClick!=='function'||typeof orderWalk!=='function') return false;
    if(Player.caffeinated==null) Player.caffeinated=0;
    const _useItem=UI.useItem.bind(UI);
    UI.useItem=function(i){
      const s=Player.inv[i];
      if(s&&D().isDrink(s.id)){ sip(i); return; }
      if(s&&s.id==='roasted_beans'){
        Player.usingItem=Player.usingItem==='roasted_beans'?null:'roasted_beans';
        UI.chat(Player.usingItem?'You hold out the roasted beans. Now click a range to brew them with a jug or bucket of water.':
          'You put the roasted beans away.','plain');
        UI.refreshInv(); return;
      }
      return _useItem(i);
    };
    const _handleClick=handleClick;
    handleClick=function(obj, point){
      const u=obj&&obj.userData;
      if(u&&u.kind==='fire'&&Player.usingItem==='roasted_beans'&&Player.count('roasted_beans')>0){
        if(typeof Sfx!=='undefined'&&Sfx.click) Sfx.click();
        if(!u.range){ UI.chat('An open fire would scorch the beans. Brew coffee on a range.','plain'); return; }
        if(UI.closeWorldModals) UI.closeWorldModals();
        Player.target=null; Player.action=null;
        brewAt(obj); return;
      }
      return _handleClick(obj, point);
    };
    return true;
  }
  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }catch(e){ console.error('[coffee]', e); clearInterval(iv); } }, 900);
  return { sip, brewNow, brewAt };
})();
if(typeof module!=='undefined'&&module.exports) module.exports=Coffee;
