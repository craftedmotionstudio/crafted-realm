#!/usr/bin/env bash
# pass-4 lever sweeps (tools/combat_triangle_sim.js); output -> scratchpad/combat_bench/sweep_pass4.txt
cd "C:/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Combat2"
S=tools/combat_triangle_sim.js
M2004="for(const k in ITEMS){const d=ITEMS[k];if(d.mBonus<0&&d.dMagic!=null){d.dMagic=({helm:-1,medhelm:-1,plate:-6,chainbody:-1,legs:-4,plateskirt:-4,kiteshield:-1,sqshield:-1})[d.model]??d.dMagic}};"
metal(){ echo "for(const k in ITEMS){const d=ITEMS[k];if(d.mBonus<0&&d.dMagic!=null){d.dMagic=({helm:$1,medhelm:$1,plate:$2,chainbody:$2,legs:$3,plateskirt:$3,kiteshield:$4,sqshield:$4})[d.model]??d.dMagic}};"; }
{
echo "== pass 4 as shipped"; node $S 100 25,40,60 food
echo "== metal magic defence as 2004 (helm/body/legs/shield -1/-6/-4/-1, set -12)"; ITEMS_PATCH="$M2004" node $S 100 25,40,60 food
echo "== metal magic defence 0 (set 0)"; ITEMS_PATCH="$(metal 0 0 0 0)" node $S 100 25,40,60 food
echo "== metal magic defence 3/7/5/5 (set +20)"; ITEMS_PATCH="$(metal 3 7 5 5)" node $S 100 25,40,60 food
echo "== metal magic defence 5/10/8/8 (set +31)"; ITEMS_PATCH="$(metal 5 10 8 8)" node $S 100 25,40,60 food
echo "== 2004 metal + the weakest mage gear (storm +6, glimmer +2/+1)"; ITEMS_PATCH="$M2004 ITEMS.storm_staff.aBonus=6;ITEMS.glimmer_robe_top.mBonus=2;ITEMS.glimmer_hat.mBonus=1;" node $S 100 25 food
echo "== 2004 metal + bolt spells cut (wind bolt 7, water bolt 8, fire strike 7)"; ITEMS_PATCH="$M2004" SPELLS_PATCH="SPELLS.wind_bolt.max=7;SPELLS.water_bolt.max=8;SPELLS.fire_strike.max=7;" node $S 100 25 food
echo "== pass 4 without Fire Blast"; SPELLS_PATCH="delete SPELLS.fire_blast;" node $S 100 60 food
echo "== pass 4, the blade in ranged armour against a mage"; COUNTER=1 node $S 100 25,40,60 food
echo "== pass 4, no food"; node $S 100 25,40,60 none
} > scratchpad/combat_bench/sweep_pass4.txt 2>&1
echo sweep-done
