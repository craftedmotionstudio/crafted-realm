/* ============ combat_math — monster weakness helpers (appraisal only) ============
 * The combat RULES (accuracy rolls, max hits, delays, XP) are the 2004 ones in shared/combat.js, run by the offline
 * engine (src/combat_engine.js) and the server alike; there is no second formula set. What stays here is the
 * examine/appraise hint: which melee attack type a monster's defence split is softest against.
 * Loaded before game3_systems.js; tools/test_combat.js locks both the shared formulas and these helpers.
 */
/* a monster's defence vs a given melee attack type (stab/slash/crush). Falls back to the flat
   dBonus when the monster has no weakness/resistance defined, so untouched monsters are unchanged. */
function npcDef(t, type){
  if(type){ const v=t['d'+type[0].toUpperCase()+type.slice(1)]; if(v!==undefined && v!==null) return v; }
  return t.dBonus;
}
/* the attack type a monster is most vulnerable to (lowest defence), or null if it has no split */
function npcWeakness(t){
  if(t.dStab===undefined && t.dSlash===undefined && t.dCrush===undefined) return null;
  const arr=[['stab',npcDef(t,'stab')],['slash',npcDef(t,'slash')],['crush',npcDef(t,'crush')]];
  arr.sort((a,b)=>a[1]-b[1]);
  return arr[0][1] < arr[2][1] ? arr[0][0] : null;   // only call it a weakness if one type is softest
}
