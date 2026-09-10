/* ================= TUTOR'S HOLM CURRICULUM / ROUTE CONTRACT =================
 * Pure data. Tutor's Holm remains a believable island with optional buildings,
 * but graduation is a compact five-destination journey targeted at 20-30 minutes.
 */
var HolmTutorialFlow=(function(){
  'use strict';
  if(typeof HolmLandscape==='undefined') throw new Error('[HolmTutorialFlow] HolmLandscape is required');

  var curriculumVersion=5;
  var estimatedMinutes=[20,30];
  var departure={
    objectId:'holm_departure_boat',interactionKind:'holm_departure',
    dockTile:{x:207,z:151},boatTile:{x:211,z:154},
    destinationProvider:'veyhollow-commons-v2',destinationLandmark:'veyhollow_ferry_arrival'
  };

  var stations=[
    {id:'arrival',label:'Guide Hall',district:'arrival_cove',pad:'guide_hall',
      entry:{x:151,z:167},service:{x:151,z:155},exit:{x:151,z:142},
      buildingDef:'holm_guide_hall_v1',role:'orientation',required:true,surfaceOrder:1},
    {id:'survival',label:'Survival Wood',district:'survival_wood',pad:'survival_shelter',
      entry:{x:114,z:159},service:{x:112,z:152},exit:{x:121,z:150},
      buildingDef:'holm_survival_workyard_v1',role:'survival-skills',required:true,surfaceOrder:2},
    {id:'kitchen',label:'Teaching Kitchen',district:'lesson_green',pad:'teaching_kitchen',
      entry:{x:145,z:138},service:{x:154,z:139},exit:{x:150,z:130},
      buildingDef:'holm_teaching_kitchen_v1',role:'optional-cooking',required:false,surfaceOrder:3},
    {id:'quest_lodge',label:'Quest Lodge',district:'lesson_green',pad:'quest_lodge',
      entry:{x:142,z:135},service:{x:137,z:133},exit:{x:131,z:138},
      buildingDef:'holm_quest_lodge_v1',role:'optional-quests-and-purpose',required:false,surfaceOrder:4},
    {id:'mine_gate',label:'Mine Gatehouse',district:'quarry_rise',pad:'mine_gatehouse',
      entry:{x:124.5,z:119.5},service:{x:124.5,z:119.5},exit:{x:133,z:120.5},
      buildingDef:'holm_mine_gatehouse_v1',role:'cavern-entry',required:true,surfaceOrder:5},
    {id:'cavern',label:'Training Cavern',district:'quarry_rise',underground:'holm_mining_cavern',
      entry:{x:286,z:354},exit:{x:322,z:354},role:'mining-smithing',required:true},
    {id:'combat_hall',label:'Combat Hall',district:'wardens_ridge',pad:'combat_hall',
      entry:{x:176.5,z:116.5},service:{x:171,z:121.2},exit:{x:169.5,z:125.5},
      buildingDef:'holm_combat_hall_v1',role:'optional-combat-practice',required:false,surfaceOrder:6},
    {id:'bank',label:'Holm Bank',district:'wardens_ridge',pad:'holm_bank',
      entry:{x:157,z:120},service:{x:154,z:117.2},exit:{x:163,z:118.5},
      buildingDef:'holm_bank_v1',role:'banking-service',required:true,surfaceOrder:7},
    {id:'mage_tower',label:'Mage Tower',district:'mage_headland',pad:'mage_tower',
      entry:{x:186.8,z:135.5},service:{x:191.5,z:134.5},exit:{x:191.5,z:140.2},
      buildingDef:'holm_mage_tower_v1',role:'optional-magic-practice',required:false,surfaceOrder:8},
    {id:'lastlight',label:'Lastlight Beacon',district:'mage_headland',landmark:'holm_lastlight_beacon',
      entry:{x:193,z:130},service:{x:196,z:112},role:'graduation-signal',required:true,surfaceOrder:9},
    {id:'departure',label:'Departure Dock',district:'mage_headland',landmark:'holm_departure',
      entry:{x:207,z:151},role:'ferry-gate',required:true,surfaceOrder:10}
  ];

  var lessons=[
    {id:'study_route',station:'arrival',ev:'orient',match:'route',runtime:true,required:true,target:{x:151,z:155},
      text:'Enter the Guide Hall and study the relief chart of Tutor\'s Holm.',arrowLabel:'Study the island chart'},
    {id:'equip_hatchet',station:'survival',ev:'equip',match:'hatchet',runtime:true,required:true,target:{x:112,z:152},
      text:'Open your pack and wield the Bronze hatchet.',arrowLabel:'Wield hatchet'},
    {id:'chop_logs',station:'survival',ev:'gather',match:'logs',runtime:true,required:true,target:{x:126,z:158},
      text:'Chop a marked tree in Survival Wood for logs.',arrowLabel:'Chop tree'},
    {id:'light_fire',station:'survival',ev:'firemake',match:'fire',runtime:true,required:true,target:{x:128,z:155},
      text:'Use your tinderbox on the logs to light a fire.',arrowLabel:'Light a fire'},
    {id:'catch_fish',station:'survival',ev:'gather',match:'raw_perch',runtime:true,required:true,target:{x:132,z:156},
      text:'Use the Small net at the marked fishing spot.',arrowLabel:'Catch a fish'},
    {id:'cook_fish',station:'survival',ev:'cook',match:'cooked_perch',runtime:true,required:true,target:{x:128,z:155},
      text:'Cook the fish on your fire.',arrowLabel:'Cook the fish'},
    {id:'bake_bread',station:'kitchen',ev:'bake',match:'bread',optional:true,required:false,runtimeOptional:true,target:{x:154,z:139},
      text:'Optional: mix flour, water and dough in the Teaching Kitchen, then bake the loaf on the range.',arrowLabel:'Bake bread'},
    {id:'learn_quests',station:'quest_lodge',ev:'orient',match:'quests',optional:true,required:false,runtimeOptional:true,target:{x:137,z:133},
      text:'Optional: study the Quest Lodge board and open your quest journal.',arrowLabel:'Study the quest board',
      npcSocket:'quest_guide_socket'},
    {id:'descend_cavern',station:'mine_gate',ev:'descend',match:'cave',runtime:true,required:true,target:{x:124.5,z:119.5},
      text:'Enter the Mine Gatehouse by its south gate and climb down the shaft in the winch house.',arrowLabel:'Descend to the cavern'},
    {id:'mine_copper',station:'cavern',ev:'gather',match:'copper_ore',runtime:true,required:true,target:{x:296,z:357},
      text:'Mine a copper rock with your pickaxe.',arrowLabel:'Mine copper'},
    {id:'mine_tin',station:'cavern',ev:'gather',match:'tin_ore',runtime:true,required:true,target:{x:304,z:377},
      text:'Follow the north offshoot and mine a tin rock.',arrowLabel:'Mine tin'},
    {id:'smelt_bronze',station:'cavern',ev:'smelt',match:'bar',runtime:true,required:true,target:{x:305,z:363},
      text:'Smelt copper and tin into a bronze bar.',arrowLabel:'Use the furnace'},
    {id:'forge_dagger',station:'cavern',ev:'smith',match:'forged',runtime:true,required:true,target:{x:302,z:363},
      text:'Forge the highlighted Bronze dagger at the anvil.',arrowLabel:'Forge a dagger'},
    {id:'melee_trial',station:'combat_hall',ev:'killStyle',match:'melee',optional:true,required:false,npcPhase:true,npcSocket:'melee_dummy_socket',
      text:'Optional: practice melee combat with the dagger.'},
    {id:'ranged_trial',station:'combat_hall',ev:'killStyle',match:'ranged',optional:true,required:false,npcPhase:true,npcSocket:'ranged_target_socket',
      text:'Optional: practice ranged combat with a shortbow.'},
    {id:'open_bank',station:'bank',ev:'bank',match:'open',runtime:true,required:true,target:{x:154,z:116},
      text:'Emerge on Warden\'s Ridge, enter the Holm Bank, and open your account at a teller booth.',arrowLabel:'Open the bank'},
    {id:'magic_trial',station:'mage_tower',ev:'killStyle',match:'magic',optional:true,required:false,npcPhase:true,npcSocket:'casting_socket',
      text:'Optional: practice a basic wind spell at the Mage Tower.'},
    {id:'relight_lastlight',station:'lastlight',ev:'beacon',match:'lit',runtime:true,required:true,environmentPhase:true,target:{x:196,z:112},
      text:'Climb Lastlight and pull the bronze lever to signal the mainland ferry.',arrowLabel:'Relight Lastlight'}
  ];

  function requiredLessons(){return lessons.filter(function(l){return l.required!==false&&!l.optional;});}
  function optionalLessons(){return lessons.filter(function(l){return l.optional||l.required===false;});}
  function runtimeSteps(){
    return lessons.filter(function(l){return l.runtime&&l.required!==false;}).map(function(l){
      return {id:l.id,station:l.station,text:l.text,ev:l.ev,match:l.match,
        target:l.target&&{x:l.target.x,z:l.target.z},arrowLabel:l.arrowLabel};
    });
  }
  function station(id){return stations.find(function(s){return s.id===id;})||null;}
  function currentObjective(tutorial){
    if(!tutorial||tutorial.complete)return 'Board the boat at Departure Dock.';
    var s=tutorial.steps&&tutorial.steps[tutorial.step];
    return s&&s.text?s.text:'Complete the island lessons.';
  }
  function canDepart(tutorial){return !!(tutorial&&tutorial.complete);}
  function acceptance(){
    var checks=[];function add(label,ok){checks.push({label:label,ok:!!ok});}
    var stationIds={};stations.forEach(function(s){stationIds[s.id]=true;});
    var padIds={};HolmLandscape.pads.forEach(function(p){padIds[p.id]=true;});
    var districtIds={};HolmLandscape.districts.forEach(function(d){districtIds[d.id]=true;});
    add('eleven purposeful stations remain available',stations.length===11);
    add('station ids are unique',Object.keys(stationIds).length===stations.length);
    add('every station uses a known district',stations.every(function(s){return !!districtIds[s.district];}));
    add('every surface building station uses a reserved pad',stations.every(function(s){return !s.pad||!!padIds[s.pad];}));
    add('all lessons name a station',lessons.every(function(l){return !!stationIds[l.station];}));
    add('compact graduation has thirteen real-success lessons',requiredLessons().length===13&&runtimeSteps().length===13);
    add('bread quests and extended combat are optional',
      ['bake_bread','learn_quests','melee_trial','ranged_trial','magic_trial'].every(function(id){return optionalLessons().some(function(l){return l.id===id;});}));
    add('optional stations do not block graduation',
      ['kitchen','quest_lodge','combat_hall','mage_tower'].every(function(id){return station(id).required===false;}));
    add('required curriculum gates real successes',runtimeSteps().every(function(l){return !!l.ev&&!!l.match;}));
    var ordered=stations.filter(function(s){return s.surfaceOrder;}).sort(function(a,b){return a.surfaceOrder-b.surfaceOrder;});
    add('surface journey is continuous and bounded',ordered.every(function(s,i){if(!i)return true;var p=ordered[i-1];return Math.abs(s.entry.x-p.entry.x)+Math.abs(s.entry.z-p.entry.z)<=65;}));
    add('departure ends the authored spine',departure.dockTile.x===HolmLandscape.landmarks.holm_departure.x&&departure.dockTile.z===HolmLandscape.landmarks.holm_departure.z);
    add('Lastlight is the final live capstone',station('lastlight').surfaceOrder===station('departure').surfaceOrder-1&&
      HolmLandscape.lastlightBeacon.purpose.indexOf('release curriculum')>=0&&runtimeSteps()[runtimeSteps().length-1].id==='relight_lastlight');
    add('boarding tile is walkable and boat floats',HolmLandscape.heightAt(departure.dockTile.x,departure.dockTile.z)>-1.2&&HolmLandscape.heightAt(departure.boatTile.x,departure.boatTile.z)<-1.2);
    var failed=checks.filter(function(c){return !c.ok;});
    if(failed.length)throw new Error('[HolmTutorialFlow] acceptance failed: '+failed.map(function(c){return c.label;}).join(', '));
    return {passed:checks.length,total:checks.length,stations:stations.length,plannedLessons:lessons.length,
      requiredLessons:requiredLessons().length,optionalLessons:optionalLessons().length,runtimeLessons:runtimeSteps().length,
      estimatedMinutes:estimatedMinutes.slice(),checks:checks};
  }

  var api={version:2,curriculumVersion:curriculumVersion,stations:stations,lessons:lessons,
    releaseRequiredLessonIds:requiredLessons().map(function(l){return l.id;}),
    optionalLessonIds:optionalLessons().map(function(l){return l.id;}),estimatedMinutes:estimatedMinutes.slice(),departure:departure,
    station:station,runtimeSteps:runtimeSteps,requiredLessons:requiredLessons,optionalLessons:optionalLessons,
    currentObjective:currentObjective,canDepart:canDepart,acceptance:acceptance};
  api.acceptanceResult=acceptance();
  if(typeof console!=='undefined'&&console.info)console.info('[HOLM_FLOW] '+api.acceptanceResult.passed+'/'+
    api.acceptanceResult.total+' acceptance ok; '+api.acceptanceResult.runtimeLessons+' required / '+
    api.acceptanceResult.optionalLessons+' optional lessons; target '+estimatedMinutes[0]+'-'+estimatedMinutes[1]+' minutes');
  return api;
})();

if(typeof globalThis!=='undefined')globalThis.HolmTutorialFlow=HolmTutorialFlow;
