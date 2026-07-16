/* ================= GUIDE HALL SERVICES =================
 * Static, NPC-free service interactions for the first complete Tutor's Holm
 * building. The eventual modelled guide can deepen these conversations without
 * owning the building's basic orientation, progress review, or story clue.
 */
var HolmGuideHall=(function(){
  'use strict';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function lessonStatus(){
    var steps=(typeof Tutorial!=='undefined'&&Tutorial.steps)||[];
    var done=typeof Tutorial!=='undefined'?(Tutorial.complete?steps.length:Math.max(0,Tutorial.step||0)):0;
    var next=(typeof HolmTutorialFlow!=='undefined'&&typeof Tutorial!=='undefined')
      ? HolmTutorialFlow.currentObjective(Tutorial):'The register has not been opened yet.';
    return {done:done,total:steps.length,next:next,complete:!!(typeof Tutorial!=='undefined'&&Tutorial.complete)};
  }
  function studyRoute(){
    if(!onHolm()) return;
    UI.dialogue('Relief chart of Tutor\'s Holm',
      'Arrival Cove begins the route. The northern teaching door leads to Survival Wood, then the path bends through Lesson Green, the training cavern, Warden\'s Ridge, Mage Headland, and finally Departure Dock. The path never requires guessing: each district prepares you for the next.',
      [{label:'Trace the route with one finger.'}],'🧭');
    UI.chat('[GUIDE HALL] South door: Arrival Cove • North door: Survival Wood • Eastern terminus: Departure Dock.','sys');
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
    UI.chat('Every shelf is labelled for a lesson: oilskins for the pond, chalk for the mine, spare packs for the crossing. Nothing is placed without a job.','plain');
  }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_orientation',option:'Study',primary:true,walkTo:true,reach:2.25,handler:studyRoute});
    Interact.register({target:'kind:holm_register',option:'Read',primary:true,walkTo:true,reach:2.1,handler:readRegister});
    Interact.register({target:'kind:holm_story_clue',option:'Inspect',primary:true,walkTo:true,reach:2.0,handler:inspectPlaque});
    Interact.register({target:'kind:holm_provisions',option:'Inspect',primary:true,walkTo:true,reach:2.0,handler:inspectProvisions});
  }
  return {studyRoute:studyRoute,readRegister:readRegister,inspectPlaque:inspectPlaque,
    inspectProvisions:inspectProvisions,status:lessonStatus};
})();
