/* ============ cooking_bread — the BREAD-MAKING chain (net-new) ============
 * Cooking was FISH-ONLY (raw_perch -> cooked_perch). This module adds the bread
 * chain, purely ADDITIVE: it registers the dough/flour/water/bread-dough items,
 * a forgiving item-on-item COMBINE (flour + water + dough -> bread dough) and a
 * RANGE-BAKE (bread dough on a range/fire -> bread + Cooking xp). It wraps
 * UI.useItem and handleClick and calls through to the originals for every
 * non-bread case, so the raw_perch cook path is never touched. `bread` already
 * lives in ITEMS (a heal item) — reused, never redefined. Mutates globals at
 * load and uses the shared BreadRecipe planner. Self-boots via a setInterval guard.
 */
(function(){

  /* single-slot, non-stack items — modelled on raw_perch/bread's schema */
  const NEW_ITEMS = {
    dough:        {name:'Dough',           stack:false, value:2, examine:'A cool elastic lump the chef pressed into your hands.'},
    bucket:       {name:'Bucket',          stack:false, value:1, examine:'A sturdy empty stave bucket with an iron handle.'},
    bucket_flour: {name:'Bucket of flour', stack:false, value:3, examine:'Milled pale and fine — mind the dust.'},
    bucket_water: {name:'Bucket of water', stack:false, value:1, examine:'Cold, clean and sloshing.'},
    bread_dough:  {name:'Bread dough',     stack:false, value:3, examine:'Kneaded and rested, ready for a hot range.'},
  };

  /* Plan flour + water + dough -> bread dough before committing inventory.
     No skill requirement or burn roll; failed plans preserve every slot. */
  function tryMakeDough(){
    const conversion=BreadRecipe.plan(Player.inv,ITEMS,'mix');
    if(!conversion.ok){
      UI.chat(conversion.reason==='missing-ingredients'
        ? 'To make bread dough you need a piece of dough, a bucket of flour and a bucket of water.'
        : 'Your pack could not hold the recipe result. Your ingredients are unchanged.','plain');
      return false;
    }
    Player.inv=conversion.inventory; UI.refreshInv();
    Sfx.click();
    UI.chat('You mix the flour and water into the dough and knead a lump of bread dough.','plain');
    return true;
  }

  /* RANGE-BAKE: walk to the range/fire, then bake once within the cook path's
     2.4-unit reach. A self-managed poll — no dependency on the game5 action
     loop — so the fish-cook tick stays exactly as it was. */
  let pendingBake=null;
  function bakeAt(obj){
    if(pendingBake!==null){clearInterval(pendingBake);pendingBake=null;}
    const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));
    if(!obj||!finite(obj.position)){UI.chat('That oven is unavailable.','plain');return;}
    const target=obj.position.clone?obj.position.clone():Object.assign({},obj.position);
    const plane=Player.plane||0,provider=typeof CRWorldMode==='undefined'?null:CRWorldMode.providerId;
    const deadline=Date.now()+30000;
    orderWalk(target);
    function stop(message){clearInterval(iv);if(pendingBake===iv)pendingBake=null;if(message)UI.chat(message,'plain');}
    const iv=setInterval(()=>{
      if(pendingBake!==iv){clearInterval(iv);return;}
      try{
        if(Player.usingItem!=='bread_dough'||Player.count('bread_dough')<1||Player.action){stop();return;}
        if(typeof player==='undefined'||!player||!finite(player.position)||!finite(obj.position)){stop();return;}
        if((Player.plane||0)!==plane||(typeof CRWorldMode==='undefined'?null:CRWorldMode.providerId)!==provider){stop();return;}
        if(['x','y','z'].some(k=>Math.abs(obj.position[k]-target[k])>.0001)||(obj.userData&&Number.isFinite(obj.userData.ttl)&&obj.userData.ttl<=0)){stop();return;}
        if(Date.now()>=deadline){stop('The bake was cancelled because the oven was not reached in time.');return;}
        const distance=player.position.distanceTo(target);
        if(!Number.isFinite(distance)){stop();return;}
        if(distance>2.4){if(!Player.moveTo)stop('You cannot reach that oven from here.');return;}
        stop();
        const conversion=BreadRecipe.plan(Player.inv,ITEMS,'bake');
        if(!conversion.ok){UI.chat('You could not bake that loaf. Your ingredients are unchanged.','plain');return;}
        Player.inv=conversion.inventory;
        Player.addXp('Cooking', conversion.baseXp);
        Player.usingItem=null; UI.refreshInv();
        UI.chat('You bake a loaf of bread.','plain');
        Tutorial.notify(conversion.event[0],conversion.event[1]);
      } catch(e){ console.error('[cooking_bread]', e); stop(); }
    }, 200);
    pendingBake=iv;
  }

  function boot(){
    if(typeof BreadRecipe==='undefined')return false;
    if(typeof ITEMS==='undefined' || typeof UI==='undefined' || typeof Player==='undefined') return false;
    if(typeof UI.useItem!=='function' || typeof handleClick!=='function') return false;
    if(typeof orderWalk!=='function') return false;

    /* 1) register items only if absent — never clobber an existing id (esp. bread) */
    for(const id in NEW_ITEMS) if(!ITEMS[id]) ITEMS[id]=NEW_ITEMS[id];

    /* 2) wrap UI.useItem: combine on flour/water/dough, arm bread_dough for baking.
          Everything else calls through to the original untouched. */
    const _useItem = UI.useItem.bind(UI);
    UI.useItem = function(i){
      const s=Player.inv[i];
      if(s && (s.id==='bucket_flour' || s.id==='bucket_water' || s.id==='dough')){
        if(tryMakeDough()) return;              // handled; else fall through to vanilla behaviour
      }
      if(s && s.id==='bread_dough'){            // arm/disarm like the useOn (fishing net) pattern
        Player.usingItem = Player.usingItem==='bread_dough' ? null : 'bread_dough';
        UI.chat(Player.usingItem
          ? 'You hold out the bread dough. Now click a range or fire to bake it.'
          : 'You put the bread dough away.','plain');
        UI.refreshInv();
        return;
      }
      return _useItem(i);
    };

    /* 3) wrap handleClick: a range/fire clicked with bread_dough armed bakes bread.
          Intercept ONLY in that case so the raw_perch cook path is reached for
          every other fire click. Any fire works; a proper range is fine too. */
    const _handleClick = handleClick;
    handleClick = function(obj, point){
      const u=obj && obj.userData;
      if(u && u.kind==='fire' && Player.usingItem==='bread_dough' && Player.count('bread_dough')>0){
        Sfx.click(); UI.closeWorldModals();
        Player.target=null; Player.action=null;
        bakeAt(obj);
        return;
      }
      return _handleClick(obj, point);
    };

    console.info('[COOK] The bread-making chain is lit: flour + water + dough, then a range.');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }
    catch(e){ console.error('[cooking_bread]', e); clearInterval(iv); } }, 1800);
})();
