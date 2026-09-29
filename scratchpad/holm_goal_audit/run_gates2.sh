#!/usr/bin/env bash
# Final gates, round 2 (after the departure / look / Lastlight guide fixes), one at a time on 8171.
cd /c/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Audit
G=scratchpad/holm_goal_audit/gates2; mkdir -p $G/units
export SMOKE_BASE=http://127.0.0.1:8171
run(){ name=$1; shift; echo "START $name $(date +%H:%M:%S)"; "$@" > $G/$name.log 2>&1; rc=$?; echo "END $name rc=$rc $(date +%H:%M:%S)"; }
pass=0; fail=0; failed=""; for f in tools/test_*.js; do n=$(basename $f .js); timeout 300 node $f > $G/units/$n.log 2>&1; rc=$?; if [ $rc -eq 0 ]; then pass=$((pass+1)); else fail=$((fail+1)); failed="$failed $n"; fi; done
git checkout -q scratchpad/workyard_fishing_edge_u5_v1/contract_test_result.json scratchpad/workyard_waterworks_u4_v1/contract_test_result.json 2>/dev/null
echo "UNITS PASS $pass FAIL $fail :$failed"
run server npm run test:server
run smoke node tools/run_smoke_headless.js
run full_route node tools/qa_holm_full_route.js
run save_migration node tools/qa_holm_save_migration.js
run human_playthrough node tools/qa_holm_island_playthrough.js 1 --human
echo ALLDONE
