/* ================= TUTOR'S HOLM CURRICULUM / ROUTE CONTRACT =================
 * Pure data. This is the canonical answer to "what happens next?" on the Holm:
 * one surface journey, one forward-only cavern, one bank/magic return leg, then
 * the ferry. Runtime content may enable a subset while NPCs are deliberately
 * deferred, but the release curriculum remains visible and validated here.
 */
var HolmTutorialFlow=(function(){
  'use strict';
  if(typeof HolmLandscape==='undefined') throw new Error('[HolmTutorialFlow] HolmLandscape is required');

  var curriculumVersion=2;
  var departure={
    objectId:'holm_departure_boat', interactionKind:'holm_departure',
    dockTile:{x:207,z:151}, boatTile:{x:211,z:154},
    destinationProvider:'veyhollow-commons-v2', destinationLandmark:'veyhollow_ferry_arrival'
  };

  var stations=[
    {id:'arrival',label:'Guide Hall',district:'arrival_cove',pad:'guide_hall',
      entry:{x:151,z:167},service:{x:151,z:155},exit:{x:151,z:142},
      buildingDef:'holm_guide_hall_v1',role:'orientation',surfaceOrder:1},
    {id:'survival',label:'Survival Wood',district:'survival_wood',pad:'survival_shelter',
      entry:{x:114,z:159},service:{x:112,z:152},exit:{x:121,z:150},
      buildingDef:'holm_survival_workyard_v1',role:'survival-skills',surfaceOrder:2},
    {id:'kitchen',label:'Teaching Kitchen',district:'lesson_green',pad:'teaching_kitchen',
      entry:{x:146,z:136},role:'cooking',surfaceOrder:3},
    {id:'quest_lodge',label:'Quest Lodge',district:'lesson_green',pad:'quest_lodge',
      entry:{x:142,z:136},role:'quests-and-purpose',surfaceOrder:4},
    {id:'mine_gate',label:'Mine Gatehouse',district:'quarry_rise',pad:'mine_gatehouse',
      entry:{x:128,z:124},role:'cavern-entry',surfaceOrder:5},
    {id:'cavern',label:'Training Cavern',district:'quarry_rise',underground:'holm_mining_cavern',
      entry:{x:286,z:354},exit:{x:322,z:354},role:'mining-smithing-combat'},
    {id:'combat_hall',label:'Combat Hall',district:'wardens_ridge',pad:'combat_hall',
      entry:{x:172,z:124},role:'cavern-exit-and-practice',surfaceOrder:6},
    {id:'bank',label:'Holm Bank',district:'wardens_ridge',pad:'holm_bank',
      entry:{x:157,z:120},role:'banking',surfaceOrder:7},
    {id:'mage_tower',label:'Mage Tower',district:'mage_headland',pad:'mage_tower',
      entry:{x:193,z:142},role:'magic',surfaceOrder:8},
    {id:'departure',label:'Departure Dock',district:'mage_headland',landmark:'holm_departure',
      entry:{x:207,z:151},role:'ferry-gate',surfaceOrder:9}
  ];

  // npcPhase lessons are still required for release. They stay out of the live
  // environment curriculum until modelled NPCs are enabled, per the sequencing
  // directive in TUTORIAL_ISLAND.md.
  var lessons=[
    {id:'meet_guide',station:'arrival',ev:'talk',match:'holm_guide',npcPhase:true,
      text:'Speak with the Holm guide and learn why the island exists.'},
    {id:'equip_hatchet',station:'survival',ev:'equip',match:'hatchet',runtime:true,target:{x:112,z:152},
      text:'Open your pack and wield the Bronze hatchet.',arrowLabel:'Wield hatchet'},
    {id:'chop_logs',station:'survival',ev:'gather',match:'logs',runtime:true,target:{x:126,z:158},
      text:'Chop a marked tree in Survival Wood for logs.',arrowLabel:'Chop tree'},
    {id:'light_fire',station:'survival',ev:'firemake',match:'fire',runtime:true,target:{x:128,z:155},
      text:'Use your tinderbox on the logs to light a fire.',arrowLabel:'Light a fire'},
    {id:'catch_fish',station:'survival',ev:'gather',match:'raw_perch',runtime:true,target:{x:132,z:156},
      text:'Use the Small net at the marked fishing spot.',arrowLabel:'Catch a fish'},
    {id:'cook_fish',station:'survival',ev:'cook',match:'cooked_perch',runtime:true,target:{x:128,z:155},
      text:'Cook the fish on your fire.',arrowLabel:'Cook the fish'},
    {id:'bake_bread',station:'kitchen',ev:'bake',match:'bread',runtime:true,target:{x:146,z:136},
      text:'Bake a loaf on the Teaching Kitchen range.',arrowLabel:'Enter the kitchen'},
    {id:'learn_quests',station:'quest_lodge',ev:'talk',match:'quest_guide',npcPhase:true,
      text:'Learn how quests reveal stories without forcing a single path.'},
    {id:'descend_cavern',station:'mine_gate',ev:'descend',match:'cave',runtime:true,target:{x:128,z:124},
      text:'Descend through the Mine Gatehouse into the training cavern.',arrowLabel:'Descend to the cavern'},
    {id:'mine_copper',station:'cavern',ev:'gather',match:'copper_ore',runtime:true,target:{x:296,z:357},
      text:'Mine a copper rock with your pickaxe.',arrowLabel:'Mine copper'},
    {id:'smelt_bronze',station:'cavern',ev:'smelt',match:'bar',runtime:true,target:{x:305,z:363},
      text:'Smelt copper and tin into a bronze bar.',arrowLabel:'Use the furnace'},
    {id:'forge_dagger',station:'cavern',ev:'smith',match:'forged',runtime:true,target:{x:302,z:363},
      text:'Forge the highlighted Bronze dagger at the anvil.',arrowLabel:'Forge a dagger'},
    {id:'melee_trial',station:'cavern',ev:'killStyle',match:'melee',npcPhase:true,
      text:'Defeat a practice foe with the dagger.'},
    {id:'ranged_trial',station:'cavern',ev:'killStyle',match:'ranged',npcPhase:true,
      text:'Defeat a second practice foe with a shortbow.'},
    {id:'open_bank',station:'bank',ev:'bank',match:'open',runtime:true,target:{x:157,z:120},
      text:'Emerge on Warden\'s Ridge and open your bank account.',arrowLabel:'Open the bank'},
    {id:'magic_trial',station:'mage_tower',ev:'killStyle',match:'magic',npcPhase:true,
      text:'Use the basic runes to defeat a chicken with magic.'}
  ];

  function runtimeSteps(){
    return lessons.filter(function(l){return l.runtime;}).map(function(l){
      return {id:l.id,station:l.station,text:l.text,ev:l.ev,match:l.match,
        target:l.target&&{x:l.target.x,z:l.target.z},arrowLabel:l.arrowLabel};
    });
  }
  function station(id){ return stations.find(function(s){return s.id===id;})||null; }
  function currentObjective(tutorial){
    if(!tutorial||tutorial.complete) return 'Board the boat at Departure Dock.';
    var s=tutorial.steps&&tutorial.steps[tutorial.step];
    return s&&s.text?s.text:'Complete the island lessons.';
  }
  function canDepart(tutorial){ return !!(tutorial&&tutorial.complete); }
  function acceptance(){
    var checks=[]; function add(label,ok){checks.push({label:label,ok:!!ok});}
    var stationIds={}; stations.forEach(function(s){stationIds[s.id]=true;});
    var padIds={}; HolmLandscape.pads.forEach(function(p){padIds[p.id]=true;});
    var districtIds={}; HolmLandscape.districts.forEach(function(d){districtIds[d.id]=true;});
    add('ten purposeful stations',stations.length===10);
    add('station ids are unique',Object.keys(stationIds).length===stations.length);
    add('every station uses a known district',stations.every(function(s){return !!districtIds[s.district];}));
    add('every surface building station uses a reserved pad',stations.every(function(s){return !s.pad||!!padIds[s.pad];}));
    add('all lessons name a station',lessons.every(function(l){return !!stationIds[l.station];}));
    add('release curriculum covers melee ranged and magic',
      ['melee','ranged','magic'].every(function(style){return lessons.some(function(l){return l.match===style;});}));
    add('environment curriculum gates real successes',runtimeSteps().every(function(l){return !!l.ev&&!!l.match;}));
    var ordered=stations.filter(function(s){return s.surfaceOrder;}).sort(function(a,b){return a.surfaceOrder-b.surfaceOrder;});
    add('surface journey is continuous and bounded',ordered.every(function(s,i){
      if(!i) return true; var p=ordered[i-1];
      return Math.abs(s.entry.x-p.entry.x)+Math.abs(s.entry.z-p.entry.z)<=65;
    }));
    add('departure ends the authored spine',departure.dockTile.x===HolmLandscape.landmarks.holm_departure.x&&
      departure.dockTile.z===HolmLandscape.landmarks.holm_departure.z);
    add('boarding tile is walkable and boat floats',HolmLandscape.heightAt(departure.dockTile.x,departure.dockTile.z)>-1.2&&
      HolmLandscape.heightAt(departure.boatTile.x,departure.boatTile.z)<-1.2);
    var failed=checks.filter(function(c){return !c.ok;});
    if(failed.length) throw new Error('[HolmTutorialFlow] acceptance failed: '+failed.map(function(c){return c.label;}).join(', '));
    return {passed:checks.length,total:checks.length,stations:stations.length,releaseLessons:lessons.length,
      runtimeLessons:runtimeSteps().length,checks:checks};
  }

  var api={version:1,curriculumVersion:curriculumVersion,stations:stations,lessons:lessons,
    releaseRequiredLessonIds:lessons.map(function(l){return l.id;}),departure:departure,
    station:station,runtimeSteps:runtimeSteps,currentObjective:currentObjective,canDepart:canDepart,acceptance:acceptance};
  api.acceptanceResult=acceptance();
  if(typeof console!=='undefined'&&console.info) console.info('[HOLM_FLOW] '+api.acceptanceResult.passed+'/'+
    api.acceptanceResult.total+' acceptance ok; '+api.acceptanceResult.runtimeLessons+' live / '+
    api.acceptanceResult.releaseLessons+' release lessons');
  return api;
})();

if(typeof globalThis!=='undefined') globalThis.HolmTutorialFlow=HolmTutorialFlow;
