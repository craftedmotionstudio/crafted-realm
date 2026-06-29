/* Crafted Realm — in-browser smoke test (regression gate).
 *
 * Run from the running game's console / javascript_tool:
 *   var x=new XMLHttpRequest();x.open('GET','tools/smoke_test.js',false);x.send();eval(x.responseText);CR_smoke();
 *
 * It exercises the global game state synchronously (no waits): structural integrity, the Player
 * API, data tables, and the sprint's new systems. Returns {pass, fail, total, failures[]}.
 * Pair with read_console_messages (errors) and the Gemini-Vision visual gate (tools/gemini_vision.js).
 */
window.CR_smoke = function(){
  var pass=0, fail=0, failures=[];
  function ok(name, cond){ if(cond){ pass++; } else { fail++; failures.push(name); } }
  function has(o, k){ return o && typeof o==='object' && (k in o); }

  // ---- core globals ----
  ok('global Player', typeof Player==='object');
  ok('global WORLD', typeof WORLD==='object');
  ok('global UI', typeof UI==='object');
  ok('global scene', typeof scene==='object');
  ok('global player mesh', typeof player==='object' && player && player.position);
  ok('global ITEMS', typeof ITEMS==='object');
  ok('global SPELLS', typeof SPELLS==='object');
  ok('global SHOPS', typeof SHOPS==='object');
  ok('global NPC_TYPES', typeof NPC_TYPES==='object');
  ok('global SKILLS array', Array.isArray(SKILLS) && SKILLS.length>=15);

  // ---- Player API ----
  ok('Player.lvl()', typeof Player.lvl==='function' && Player.lvl('Attack')>=1);
  ok('Player.addXp()', typeof Player.addXp==='function');
  ok('Player.combatLevel()', typeof Player.combatLevel==='function' && Player.combatLevel()>=3);
  ok('Player.weaponSpeed()', typeof Player.weaponSpeed==='function' && Player.weaponSpeed()>0);
  ok('Player.moveSpeed()', typeof Player.moveSpeed==='function' && Player.moveSpeed()>0);
  ok('Player.count()', typeof Player.count==='function');
  ok('Player.inv array (24)', Array.isArray(Player.inv) && Player.inv.length===24);
  ok('Player.equip slots', has(Player,'equip'));
  ok('Player.xp map', has(Player,'xp') && typeof Player.xp.Attack==='number');

  // ---- sprint features ----
  ok('autoRetaliate flag', typeof Player.autoRetaliate==='boolean');
  ok('spec energy 0..100', typeof Player.spec==='number' && Player.spec>=0 && Player.spec<=100);
  ok('specArmed flag', typeof Player.specArmed==='boolean');
  ok('attackStyles map', has(Player,'attackStyles') && typeof Player.attackStyles.melee==='number');
  ok('teleport spells present', !!SPELLS.tele_quarry && SPELLS.tele_quarry.utility==='teleport');
  ok('5 teleport spells', Object.keys(SPELLS).filter(function(k){return SPELLS[k].utility==='teleport';}).length===5);
  ok('UI.xpDrop()', typeof UI.xpDrop==='function');
  ok('UI.refreshCombat()', typeof UI.refreshCombat==='function');
  ok('UI.refreshSpec()', typeof UI.refreshSpec==='function');
  ok('UI.refreshHud()', typeof UI.refreshHud==='function');
  ok('UI.openShop()', typeof UI.openShop==='function');
  ok('spec orb in DOM', !!document.getElementById('spec-orb'));
  ok('two tab rows in DOM', !!document.getElementById('tab-bar') && !!document.getElementById('tab-bar-bottom'));

  // ---- data integrity ----
  ok('ITEMS has tiered gear (veyrite)', !!ITEMS.veyrite_platebody);
  ok('XP curve L99 exact', (function(){ try{ return XP_TABLE[99]===13034431; }catch(e){ return false; } })());
  ok('boss has script tag', NPC_TYPES.korthul && NPC_TYPES.korthul.script==='korthul');
  ok('shop has stock', SHOPS.smith && Array.isArray(SHOPS.smith.stock) && SHOPS.smith.stock.length>0);

  // ---- live, restored mutations ----
  (function(){ var s='Woodcutting', before=Player.xp[s]; Player.addXp(s, 13); ok('addXp increases xp', Player.xp[s]>before); Player.xp[s]=before; })();
  (function(){ try{ UI.openShop('smith'); ok('openShop inits _q', SHOPS.smith._q && typeof SHOPS.smith._q[SHOPS.smith.stock[0].id]==='number');
    UI.closeModal && UI.closeModal('shop-modal'); }catch(e){ ok('openShop inits _q', false); } })();

  var total=pass+fail;
  var report={pass:pass, fail:fail, total:total, failures:failures, verdict: fail===0?'ALL PASS':'FAILURES'};
  try{ console.log('[CR_smoke] '+pass+'/'+total+' passed'+(fail?(' — FAILED: '+failures.join(', ')):'')); }catch(e){}
  return report;
};
