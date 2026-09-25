/* ================= GUIDE HALL SERVICES =================
 * Static, NPC-free service interactions for the first complete Tutor's Holm
 * building. The eventual modelled guide can deepen these conversations without
 * owning the building's basic orientation, progress review, or story clue.
 */
var HolmGuideHall=(function(){
  'use strict';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&(CRWorldMode.providerId==='tutors-holm-v2'||(typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.active())||
    (typeof HolmV3Preview!=='undefined'&&HolmV3Preview.active())); }
  function lessonStatus(){
    var steps=(typeof Tutorial!=='undefined'&&Tutorial.steps)||[];
    var done=typeof Tutorial!=='undefined'?(Tutorial.complete?steps.length:Math.max(0,Tutorial.step||0)):0;
    var next=(typeof HolmTutorialFlow!=='undefined'&&typeof Tutorial!=='undefined')
      ? HolmTutorialFlow.currentObjective(Tutorial):'The register has not been opened yet.';
    return {done:done,total:steps.length,next:next,complete:!!(typeof Tutorial!=='undefined'&&Tutorial.complete)};
  }
  // the relief chart's route (Guide House v5: ChartRoute_01..09 legs, ChartStop_01..10 rings, hidden until traced)
  var tracing=false;
  function traceRoute(){
    if(tracing||typeof scene==='undefined')return;var legs=[],stops=[];for(var i=1;i<=10;i++){var s=scene.getObjectByName('ChartStop_'+(i<10?'0':'')+i),l=i<10&&scene.getObjectByName('ChartRoute_0'+i);if(s)stops.push(s);if(l)legs.push(l)}
    if(!stops.length){UI.chat('You trace the painted paths from the Guide House round the island to the haven.','plain');return}
    var NAMES=['the Guide House','the survival camp','the bakehouse','the Quest Lodge','the quarry and training cavern','Warden\'s Keep','the Holm Bank','the Mage Tower','Lastlight','the skiff at the haven'];
    tracing=true;UI.chat('You trace the route across the chart with one finger...','plain');var k=0;
    (function next(){if(k<stops.length){stops[k].visible=true;if(k>0&&legs[k-1])legs[k-1].visible=true;UI.chat((k+1)+'. '+NAMES[k].charAt(0).toUpperCase()+NAMES[k].slice(1)+'.','plain');k++;setTimeout(next,900);return}
     setTimeout(function(){legs.concat(stops).forEach(function(o){o.visible=false});tracing=false},9000)})();
  }
  function studyRoute(){
    if(!onHolm()) return;
    // the Blender island (HolmIsland.live) has its own route, in lesson order, as the chart's little buildings show it
    if(typeof HolmIsland!=='undefined'&&HolmIsland.live()){
      UI.dialogue('Relief chart of Tutor\'s Holm',
        'You are here, at the Guide House above the landing. Your route runs clockwise: the survival camp by the creek for wood, fire and fish; the bakehouse; the Quest Lodge; the quarry and the training cavern beneath it; Warden\'s Keep for weapons; the Holm Bank; the Mage Tower on the headland; and last the Lastlight lighthouse. When its beacon burns, the skiff at the haven carries you to the mainland.',
        [{label:'Trace the route with one finger.',fn:traceRoute}],'🧭');
      UI.chat('[GUIDE HOUSE] Survival camp • Bakehouse • Quest Lodge • Quarry and cavern • Warden\'s Keep • Holm Bank • Mage Tower • Lastlight • the haven skiff.','sys');
    } else {
    UI.dialogue('Relief chart of Tutor\'s Holm',
      'Arrival Cove begins the route. The northern teaching door leads to Survival Wood, then the path bends through Lesson Green, the training cavern, Warden\'s Ridge, Mage Headland, and finally Departure Dock. The path never requires guessing: each district prepares you for the next.',
      [{label:'Trace the route with one finger.'}],'🧭');
    UI.chat('[GUIDE HALL] South door: Arrival Cove • North door: Survival Wood • Eastern terminus: Departure Dock.','sys');
    }
    try{ if(typeof Tutorial!=='undefined') Tutorial.notify('orient','route'); }catch(e){}
  }
  function readRegister(){
    if(!onHolm()) return;
    var s=lessonStatus(),lock=s.complete?'OPEN — mainland passage granted':'LOCKED — lessons remain';
    UI.dialogue('Holm lesson register',
      'Active lessons: '+s.done+' / '+s.total+' marked complete. Departure lock: '+lock+'. Next: '+s.next,
      [{label:s.complete?'The boat is waiting.':'Back to the lesson.'}],'📜');
  }
  function inspectPlaque(){
    if(!onHolm()) return;
    UI.dialogue('The First Landing',
      'The plaque shows a broken ship beneath a compass star. “No crown called us here. No prophecy kept us alive. We learned the coast, shared our tools, and built a road inland. Let every newcomer do the same.”',
      [{label:'Practical people.'}],'⚓');
  }
  function inspectProvisions(){
    if(!onHolm()) return;
    UI.chat('Spare teaching tools fill the labelled shelves. Collect tools here if yours are lost; tools stored in your bank can be withdrawn at Holm Bank.','plain');
  }
  function collectTools(){
    if(onHolm()&&typeof HolmToolRecoveryService!=='undefined') return HolmToolRecoveryService.recover();
    return false;
  }
  // The relief chart is a 3-tile-wide table: the generic walk-to lands on a tile
  // 2.55 from its centre, outside the 2.25 reach, and Sched.walkThen then gives
  // up silently, so the first lesson could not be started by clicking the chart.
  // Every station therefore walks onto its authored interactionTile first.
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard('holm_guide_hall',tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_orientation',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:0,z:3.0},studyRoute)});
    Interact.register({target:'kind:holm_register',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:-7.0,z:1},readRegister)});
    Interact.register({target:'kind:holm_story_clue',option:'Inspect',primary:true,walkTo:true,reach:2.6,handler:inside({x:-4.0,z:5.2},inspectPlaque)});
    Interact.register({target:'kind:holm_provisions',option:'Collect-tools',primary:true,walkTo:true,reach:2.6,handler:inside({x:9.6,z:-0.1},collectTools)});
    Interact.register({target:'kind:holm_provisions',option:'Inspect',walkTo:true,reach:2.6,handler:inside({x:9.6,z:-0.1},inspectProvisions)});
  }
  return {studyRoute:studyRoute,readRegister:readRegister,inspectPlaque:inspectPlaque,
    inspectProvisions:inspectProvisions,collectTools:collectTools,status:lessonStatus};
})();
