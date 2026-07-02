/* ============ combat_math — the OSRS-exact combat core (GOAL.md §15) ============
 * The pure math every combat roll flows through, isolated so it can be
 * test-locked headlessly (tools/test_combat.js) the same way validate_content.js
 * gates the data. DO NOT tweak these formulas casually — they are the
 * documented Old School formulas and gameplay balance is built on them:
 *   attack roll  = (effLvl+8) * (bonus+64)
 *   hit chance   = a > d ? 1 - (d+2)/(2*(a+1)) : a/(2*(d+1))
 *   max hit      = floor(0.5 + effStr * (strBonus + 64) / 640)
 * Loaded before game3_systems.js (which consumes these globals).
 */
function rollAccuracy(attRoll, defRoll){
  return attRoll > defRoll ? 1 - (defRoll+2)/(2*(attRoll+1)) : attRoll/(2*(defRoll+1));
}
function osrsMaxHit(effStr, sBonus){
  return Math.max(1, Math.floor(0.5 + effStr*(sBonus+64)/640));
}
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
