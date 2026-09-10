/* ============ cooking_bread — the BREAD-MAKING chain (net-new) ============
 * Cooking was FISH-ONLY (raw_perch -> cooked_perch). This module adds the bread
 * chain, purely ADDITIVE: it registers the dough/flour/water/bread-dough items,
 * a forgiving item-on-item COMBINE (flour + water + dough -> bread dough) and a
 * RANGE-BAKE (bread dough on a range/fire -> bread + Cooking xp). It wraps
 * UI.useItem and handleClick and calls through to the originals for every
 * non-bread case, so the raw_perch cook path is never touched. `bread` already
 * lives in ITEMS (a heal item) — reused, never redefined. Mutates globals at
 * load; edits no other file. Self-boots via a setInterval guard.
 */
(function(){
  const XP = 40;   // Cooking xp per loaf baked

  /* single-slot, non-stack items — modelled on raw_perch/bread's schema */
  const NEW_ITEMS = {
    dough:        {name:'Dough',           stack:false, value:2, examine:'A cool elastic lump the chef pressed into your hands.'},
    bucket:       {name:'Bucket',          stack:false, value:1, examine:'A sturdy empty stave bucket with an iron handle.'},
    bucket_flour: {name:'Bucket of flour', stack:false, value:3, examine:'Milled pale and fine — mind the dust.'},
    bucket_water: {name:'Bucket of water', stack:false, value:1, examine:'Cold, clean and sloshing.'},
    bread_dough:  {name:'Bread dough',     stack:false, value:3, examine:'Kneaded and rested, ready for a hot range.'},
  };

  /* COMBINE: flour + water + dough -> one bread dough. Removing three before
     adding one always frees a slot, so no space check is needed. Forgiving:
     no skill req, no failure. Returns true when it handled the click. */
  function tryMakeDough(){
    if(Player.count('bucket_flour')<1 || Player.count('bucket_water')<1 || Player.count('dough')<1){
      UI.chat('To make bread dough you need a piece of dough, a bucket of flour and a bucket of water.','plain');
      return false;
    }
    Player.removeItem('bucket_flour',1); Player.removeItem('bucket_water',1); Player.removeItem('dough',1);
    Player.addItem('bread_dough',1);
    Sfx.click();
    UI.chat('You mix the flour and water into the dough and knead a lump of bread dough.','plain');
    return true;
  }

  /* RANGE-BAKE: walk to the range/fire, then bake once within the cook path's
     2.4-unit reach. A self-managed poll — no dependency on the game5 action
     loop — so the fish-cook tick stays exactly as it was. */
  function bakeAt(obj){
    orderWalk(obj.position);
    const iv=setInterval(()=>{
      try{
        if(Player.usingItem!=='bread_dough' || Player.count('bread_dough')<1){ clearInterval(iv); return; }
        if(typeof player==='undefined' || !player){ clearInterval(iv); return; }
        if(Player.action){ clearInterval(iv); return; }               // player started something else — abort
        if(player.position.distanceTo(obj.position)>2.4) return;       // still walking to the range
        clearInterval(iv);
        Player.removeItem('bread_dough',1);
        Player.addItem('bread',1);
        Player.addXp('Cooking', XP);
        Player.usingItem=null; UI.refreshInv();
        UI.chat('You bake a loaf of bread.','plain');
        Tutorial.notify('bake','bread');
      } catch(e){ console.error('[cooking_bread]', e); clearInterval(iv); }
    }, 200);
  }

  function boot(){
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

    if(UI.chat) UI.chat('[COOK] The bread-making chain is lit: flour + water + dough, then a range.','sys');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }
    catch(e){ console.error('[cooking_bread]', e); clearInterval(iv); } }, 1800);
})();
