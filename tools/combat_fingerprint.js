/* The combat-numbers fingerprint, one scenario for two worlds:
 *   - Node: tools/test_combat.js runs it through the real engine in the headless harness (tools/combat_engine_harness.js);
 *   - the browser: tools/qa_holm_combat_numbers.js runs the SAME function in the live game (?holmIsland=1).
 * Both seed the engine's combat stream (CRShared.rng.create(SEED)) and drive the engine's own ticks synchronously
 * (LocalCombat.qa.tick with the game-loop ticks paused), so the fingerprint is identical when, and only when, the live
 * game runs the same rules as the headless engine. Scenario (same shape as the pre-2004 lock it replaces):
 *   40 attacks for each of the four dagger styles, the three shortbow styles, and Wind Strike autocast on the staff's
 *   two casting styles (Bash = normal, Focus = defensive), at a practice target that never answers; then 40 blows
 *   each from a melee monster (oathbreaker), a spell-caster (moss seer) and an archer at the adventurer.
 * Each row: [label, damage, ticks since the previous attack, XP grants in order].
 * `env` adapts the world: {LC, Player, SPELLS, CRShared, spawn(typeId, dist, tOverrides) -> npc, remove(npc),
 *  place(), onHit(fn) -> off, give(id, qty), setLevels(L)}. The function body must stay self-contained (it is
 * serialised into the browser page). */
'use strict';
function combatFingerprint(env){
  var LC=env.LC,P=env.Player,R=env.CRShared.rng,SEED=20260926,out={swings:[],npcHits:[],meta:{}};
  var hits=[],off=env.onHit(function(e){hits.push(e)});
  var xp=[],addXp=P.addXp;P.addXp=function(s,a){xp.push([s,Math.round(a*10)]);return addXp.apply(this,arguments)};
  var saved={auto:P.autoRetaliate,hp:P.hp,maxHp:P.maxHp,weapon:P.equip.weapon,style:P.styleIndex,autocast:P.autocast,castSpell:P.castSpell,spell:P.spell};
  LC.enable(false);LC.setRng(R.create(SEED));
  try{
    env.setLevels({Attack:20,Strength:22,Defence:15,Ranged:21,Magic:19,Hitpoints:25,Prayer:1});
    P.autoRetaliate=false;P.activePrayers.clear();P.specArmed=false;P.action=null;
    env.give('arrows',2000);env.give('air_rune',2000);env.give('mind_rune',2000);
    var quiet={hp:1000000,speedTicks:1000,givechase:false,aggro:false,respawn:600};
    function attacks(label,setup,n,dist){
      setup();var t=env.spawn('pasturehen',dist,quiet);LC.clearInteraction();LC.orderAttack(t);
      var last=null,made=0,guard=0,x0=xp.length,rows=[];
      while(made<n&&guard++<n*12){var before=P.lastAttackTick;LC.qa.tick();
        if(P.lastAttackTick!==before){rows.push({at:P.lastAttackTick,gap:last==null?0:P.lastAttackTick-last,xp:xp.slice(x0)});x0=xp.length;last=P.lastAttackTick;made++}}
      LC.clearInteraction();for(var k=0;k<8;k++)LC.qa.tick();
      // pair each attack with the splat its hit produced (in order; a splash has none)
      var mine=hits.filter(function(h){return h.k==='hit'&&h.obj===t.mesh}),shots=hits.filter(function(h){return h.k==='projectile'&&h.dst===t.mesh});hits.length=0;
      var j=0;rows.forEach(function(r,i){var sp=/^magic/.test(label)&&shots[i]&&shots[i].splash,h=sp?null:mine[j++];out.swings.push([label,h?h.dmg:null,r.gap,r.xp])});
      env.remove(t);
    }
    var wield=function(w,i){return function(){P.autocast=null;P.castSpell=null;P.spell=null;P.equip.weapon=w;P.styleIndex=i}};
    for(var i=0;i<4;i++)attacks('melee'+i,wield('bronze_dagger',i),40,1);
    for(i=0;i<3;i++)attacks('ranged'+i,wield('worn_bow',i),40,4);
    [0,2].forEach(function(i){attacks('magic'+i,function(){P.equip.weapon='apprentice_staff';P.styleIndex=i;P.castSpell=null;P.autocast='wind_strike';P.spell='wind_strike'},40,4)});
    // monsters at the adventurer
    P.equip.weapon='bronze_dagger';P.styleIndex=0;P.autocast=null;P.spell=null;P.maxHp=100000;P.hp=100000;
    // the pre-2004 lock's monsters (the first harmful melee and spell-casting types in data order) + an archer
    [['melee','oathbreaker',1,{}],['magic','moss_seer',4,{}],['ranged','gnarlgob',4,{ranged:'arrow',attackRange:7}]].forEach(function(s){
      var n=env.spawn(s[1],s[2],Object.assign({hp:100000,respawn:600},s[3]));LC.qa.provoke(n);var last=null,made=0,guard=0;
      while(made<40&&guard++<600){var b=n.lastAttackTick;LC.qa.tick();if(n.lastAttackTick!==b){made++;out.npcHits.push([s[0],null,last==null?0:n.lastAttackTick-last]);last=n.lastAttackTick}}
      for(var k=0;k<6;k++)LC.qa.tick();
      var got=hits.filter(function(h){return h.k==='hit'&&h.obj!==n.mesh});hits.length=0;
      var rows=out.npcHits.filter(function(r){return r[0]===s[0]});rows.forEach(function(r,j){r[1]=got[j]?got[j].dmg:null});
      out.meta[s[0]+'Npc']=s[1];env.remove(n);P.lastCombat=-1000;P.aggressiveNpc=null;
    });
  }catch(e){out.error=String(e&&e.stack||e).slice(0,600)}
  finally{off();P.addXp=addXp;LC.setRng(null);LC.enable(true);
    P.autoRetaliate=saved.auto;P.maxHp=saved.maxHp;P.hp=saved.hp;P.equip.weapon=saved.weapon;P.styleIndex=saved.style;P.autocast=saved.autocast;P.castSpell=saved.castSpell;P.spell=saved.spell;LC.clearInteraction()}
  var sum=function(a){return a.reduce(function(s,r){return s+(r[1]||0)},0)};
  var xpSum={};out.swings.forEach(function(r){r[3].forEach(function(g){xpSum[g[0]]=(xpSum[g[0]]||0)+g[1]})});
  for(var k in xpSum)xpSum[k]=xpSum[k]/10;
  out.summary={swings:out.swings.length,npcHits:out.npcHits.length,playerDamage:sum(out.swings),npcDamage:sum(out.npcHits),
    zeros:out.swings.filter(function(r){return r[1]===0}).length,splashes:out.swings.filter(function(r){return r[1]===null}).length,xp:xpSum};
  return out;
}
if(typeof module!=='undefined'&&module.exports)module.exports={combatFingerprint:combatFingerprint};
