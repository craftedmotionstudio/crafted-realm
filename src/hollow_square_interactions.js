/* ============ Hollow Well Square interactions ============
 * Semantic interaction hooks for the square's central landmark. The world
 * composer owns its mesh and tags the clickable object `kind: 'hollowWell'`;
 * this file deliberately knows nothing about the well's coordinates or shape.
 */
var HollowSquareInteractions = (()=>{
  'use strict';

  const SOURCE = 'HollowSquareInteractions';
  const TARGET = 'kind:hollowWell';
  const INSTALL_KEY = '__hollowSquareInteractionsV1';

  const COOLDOWNS = Object.freeze({
    drinkMs: 6000,
    feedbackMs: 1500,
  });

  const BASE_OPTIONS = Object.freeze([
    Object.freeze({
      id: 'examine', option: 'Examine', target: TARGET, priority: 20,
      handler: 'examine', walkTo: false, reach: 0,
      effects: Object.freeze([]),
    }),
    Object.freeze({
      id: 'drink', option: 'Drink-from', target: TARGET, priority: 30,
      handler: 'drink', walkTo: true, reach: 2.4,
      effects: Object.freeze([]),
    }),
  ]);

  /* Fill remains data-driven, but only becomes real when both item ids and the
   * inventory transaction methods exist. The present game has neither pair. */
  const FILL_PAIRS = Object.freeze([
    Object.freeze({empty: 'bucket', filled: 'bucket_of_water'}),
    Object.freeze({empty: 'bucket', filled: 'water_bucket'}),
  ]);

  const state = {lastDrinkAt: -Infinity, lastCooldownFeedbackAt: -Infinity};
  let installedDispatcher = null;
  let installedHooks = Object.freeze([]);

  function liveServices(){
    return {
      UI: typeof UI!=='undefined' ? UI : null,
      Player: typeof Player!=='undefined' ? Player : null,
      ITEMS: typeof ITEMS!=='undefined' ? ITEMS : null,
      now: ()=>Date.now(),
    };
  }

  function say(services, message){
    if(services.UI && typeof services.UI.chat==='function') services.UI.chat(message, 'plain');
  }

  function findFillPair(services){
    const items=services && services.ITEMS;
    const player=services && services.Player;
    if(!items || !player || typeof player.count!=='function' ||
       typeof player.removeItem!=='function' || typeof player.addItem!=='function') return null;
    return FILL_PAIRS.find(pair=>items[pair.empty] && items[pair.filled]) || null;
  }

  function runExamine(services){
    say(services, 'Clear springwater gathers beneath old Veyhollow stone.');
  }

  function runDrink(services, drinkState){
    const now=services.now();
    if(now-drinkState.lastDrinkAt < COOLDOWNS.drinkMs){
      if(now-drinkState.lastCooldownFeedbackAt >= COOLDOWNS.feedbackMs){
        say(services, 'You have had enough springwater for the moment.');
        drinkState.lastCooldownFeedbackAt=now;
      }
      return false;
    }
    drinkState.lastDrinkAt=now;
    drinkState.lastCooldownFeedbackAt=-Infinity;
    say(services, 'You drink from the Hollow Well. The water is cool and clean.');
    return true;
  }

  function runFill(services, pair){
    const player=services.Player;
    if(!pair || player.count(pair.empty)<1){
      say(services, 'You need an empty bucket to carry the water.');
      return false;
    }
    if(!player.removeItem(pair.empty, 1)) return false;
    if(!player.addItem(pair.filled, 1)){
      player.addItem(pair.empty, 1); // preserve the item if a future inventory API rejects the swap
      return false;
    }
    say(services, 'You fill the bucket from the Hollow Well.');
    return true;
  }

  const HANDLERS = Object.freeze({
    examine(){ runExamine(liveServices()); },
    drink(){ runDrink(liveServices(), state); },
    fill(){
      const services=liveServices();
      runFill(services, findFillPair(services));
    },
  });

  function optionsFor(services){
    const options=BASE_OPTIONS.slice();
    if(findFillPair(services)) options.push(Object.freeze({
      id: 'fill', option: 'Fill', target: TARGET, priority: 25,
      handler: 'fill', walkTo: true, reach: 2.4,
      effects: Object.freeze(['inventorySwap']),
    }));
    return Object.freeze(options);
  }

  const OPTIONS = optionsFor(liveServices());

  function install(dispatcher){
    const target=dispatcher || (typeof Interact!=='undefined' ? Interact : null);
    if(!target || typeof target.register!=='function') return false;
    if(target[INSTALL_KEY]){
      installedDispatcher=target;
      installedHooks=target[INSTALL_KEY];
      return true;
    }
    const hooks=OPTIONS.slice().sort((a,b)=>b.priority-a.priority).map(meta=>({
      source: SOURCE,
      id: meta.id,
      target: meta.target,
      option: meta.option,
      priority: meta.priority,
      walkTo: meta.walkTo,
      reach: meta.reach,
      handler: HANDLERS[meta.handler],
    }));
    hooks.forEach(hook=>target.register(hook));
    installedHooks=Object.freeze(hooks);
    installedDispatcher=target;
    try{ Object.defineProperty(target, INSTALL_KEY, {value:installedHooks, configurable:true}); }
    catch(_err){ target[INSTALL_KEY]=installedHooks; }
    return true;
  }

  function acceptance(){
    const checks=[];
    const check=condition=>checks.push(Boolean(condition));
    const ids=OPTIONS.map(option=>option.id);
    const labels=OPTIONS.map(option=>option.option);
    check(new Set(ids).size===ids.length && new Set(labels).size===labels.length);
    check(OPTIONS.every(option=>option.target===TARGET && Number.isFinite(option.priority) &&
      option.priority>=0 && typeof HANDLERS[option.handler]==='function'));
    check(OPTIONS.every(option=>typeof option.walkTo==='boolean' && Number.isFinite(option.reach)));
    check(OPTIONS.some(option=>option.id==='fill')===Boolean(findFillPair(liveServices())));

    const before=installedHooks.length;
    const first=install(installedDispatcher);
    const afterFirst=installedHooks.length;
    const second=install(installedDispatcher);
    check(first && second && before===afterFirst && installedHooks.length===afterFirst);

    const combatSentinel={xp:{Attack:123}, hp:7, maxHp:10, levels:{Attack:5}};
    const snapshot=JSON.stringify(combatSentinel);
    const messages=[];
    const services={UI:{chat:m=>messages.push(m)}, Player:combatSentinel, ITEMS:{}, now:()=>10000};
    const testState={lastDrinkAt:-Infinity,lastCooldownFeedbackAt:-Infinity};
    check(runDrink(services,testState) && JSON.stringify(combatSentinel)===snapshot);
    services.now=()=>11000;
    check(!runDrink(services,testState) && messages.length===2 && JSON.stringify(combatSentinel)===snapshot);

    const passed=checks.filter(Boolean).length;
    const ok=passed===checks.length;
    console[ok?'log':'error'](`[HOLLOW_SQUARE_INTERACTIONS] ${passed}/${checks.length} acceptance ${ok?'ok':'FAILED'}`);
    return {ok, passed, total:checks.length, checks:checks.slice()};
  }

  const api={
    SOURCE, TARGET, OPTIONS, COOLDOWNS, FILL_PAIRS,
    install, acceptance,
    get installed(){ return Boolean(installedDispatcher); },
  };

  install();
  acceptance();
  return Object.freeze(api);
})();
