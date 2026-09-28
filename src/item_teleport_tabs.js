/* ============ item_teleport_tabs — consumable TELEPORT TAB (net-new) ============
 * Purely ADDITIVE. Registers one stackable item `home_tab` ('Veyhollow teleport')
 * and wires its "use" so that clicking one in the inventory consumes a single tab
 * and whisks the player to the mainland home — reusing the EXACT same teleport the
 * tutorial finish uses (Admin.tp('commons')). It wraps UI.useItem and calls through
 * to the original for every other item, so no existing use-path is touched.
 *
 * The inventory icon is a Blender render (a clay tablet with Hearthmere's cottage-and-fire
 * emblem: tools/blender/build_world_item_icons_v1.py -> assets/icons/items/home_tab.png),
 * listed in game0_icons.js HOLM_ITEM_ICONS like every other item. (It used to pre-seed
 * ICONS['home_tab'] with a canvas drawing; the owner rule is images or Blender renders
 * only, so nothing is drawn here any more.) Mutates globals at load only. Self-boots
 * via a setInterval guard. Reversible: drop the tag.
 */
(function(){
  const ID   = 'home_tab';
  const DEST = 'commons';   // the mainland home — same zone the tutorial finish sends you to

  /* stackable, cheap consumable — modelled on the rune/coins schema in ITEMS */
  const DEF = {name:'Hearthmere teleport', stack:true, value:5,
    examine:'A rune-etched clay tablet. Crush it to fold the world back to Hearthmere.'};
  // Save restoration may run before the delayed interaction hook. Item data
  // must already exist when the first inventory is drawn.
  if(typeof ITEMS!=='undefined'&&!ITEMS[ID]) ITEMS[ID]=DEF;

  /* Consume one tab and teleport home. Reuses the tutorial-finish teleport verbatim. */
  function useTab(i){
    if(Player.count(ID)<1) return;
    Player.removeItem(ID,1);
    if(UI.refreshInv) UI.refreshInv();
    if(typeof Sfx!=='undefined' && Sfx.click) Sfx.click();
    UI.chat('You crush the teleport tablet. The world folds around you...','sys');
    Admin.tp(DEST);            // the SAME mainland teleport the tutorial finish uses
  }

  function boot(){
    if(typeof ITEMS==='undefined' || typeof UI==='undefined' || typeof Player==='undefined') return false;
    if(typeof Admin==='undefined' || typeof Admin.tp!=='function') return false;
    if(typeof UI.useItem!=='function') return false;

    /* 1) register the item only if absent — never clobber an existing id */
    if(!ITEMS[ID]) ITEMS[ID]=DEF;

    /* 2) wrap UI.useItem: intercept ONLY home_tab; everything else is untouched */
    const _useItem = UI.useItem.bind(UI);
    UI.useItem = function(i){
      const s = Player.inv[i];
      if(s && s.id===ID){ useTab(i); return; }
      return _useItem(i);
    };

    console.log('[item_teleport_tabs] registered home_tab teleport');
    return true;
  }

  if(boot()) return;
  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }
    catch(e){ console.error('[item_teleport_tabs]', e); clearInterval(iv); } }, 1800);
})();
