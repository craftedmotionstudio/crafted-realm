/* Tutor's Holm island draft curriculum (finish goal M5.2a). On ?holmIsland=1 the tutorial runs the full 18-lesson
 * order of HolmCurriculumProgress (curriculum version 6): the 13 live lessons plus bread, the quest board and the
 * three combat trials, taught one after another like the 2004 Tutorial Island (one objective at a time, each with a
 * hint line and an arrow at its station). Lesson events and matches are the live ones (HolmTutorialFlow), so every
 * station credits through the same Tutorial.notify calls; only the step text and the arrow targets are the new
 * island's. Saves keep a completed-lesson ledger (ui_save.js), so a reload resumes at the first lesson not done and
 * nothing is credited twice. Loads after tutorial_holm.js; inert without the island flag. */
var HolmIslandCurriculum=(function(){
 'use strict';
 var on=typeof HolmIsland!=='undefined'?HolmIsland.live():(typeof location!=='undefined'&&new URLSearchParams(location.search).get('holmIsland')==='1');
 // where each lesson is taught on the new island: a building's measured target, a lesson object, or an arrival service
 var WHERE={
  study_route:{arrival:'holm_orientation'},equip_hatchet:{arrival:'holm_provisions'},
  chop_logs:{object:'island-lesson-survival-oak-1'},light_fire:{building:['survival','fire']},
  catch_fish:{object:'island-lesson-survival-perch'},cook_fish:{building:['survival','fire']},
  bake_bread:{building:['bakehouse','oven']},learn_quests:{building:['lodge','board']},
  descend_cavern:{building:['quarry','shaft']},mine_copper:{object:'island-lesson-cavern-copper-1'},
  mine_tin:{object:'island-lesson-cavern-tin-1'},smelt_bronze:{object:'island-lesson-furnace'},
  forge_dagger:{object:'island-lesson-anvil'},melee_trial:{building:['keep','court']},
  ranged_trial:{building:['keep','court']},open_bank:{building:['bank','counter']},
  magic_trial:{building:['mage','runes']},relight_lastlight:{building:['lastlight','lever']}};
 // hint lines in our own words, one objective at a time
 var TEXT={
  study_route:['Enter the Guide House and study the relief chart of Tutor\'s Holm.','Study the chart'],
  equip_hatchet:['Take your tools from the provision rack, then click the bronze hatchet in your pack to wield it.','Wield the hatchet'],
  chop_logs:['Follow the path west to the survival camp and chop down one of the oaks.','Chop an oak'],
  light_fire:['Use your tinderbox on the logs in your pack to light a fire.','Light a fire'],
  catch_fish:['Click your small net, then the ripples off the camp\'s fishing stage.','Net a fish'],
  cook_fish:['Cook the fish on your fire. Burnt it? Net another and try again.','Cook the fish'],
  bake_bread:['In the bakehouse, fill a bucket with flour and one with water, knead a dough and bake it in the oven.','Bake bread'],
  learn_quests:['Visit the Quest Lodge and study the quest board.','Study the quest board'],
  descend_cavern:['At the Quarry Gate, climb down the shaft ladder to the ore workings.','Climb down the shaft'],
  mine_copper:['Mine a copper rock with your pickaxe.','Mine copper'],
  mine_tin:['Now mine a tin rock.','Mine tin'],
  smelt_bronze:['Smelt your copper and tin into a bronze bar at the furnace.','Use the furnace'],
  forge_dagger:['Hammer the bar into a bronze dagger at the anvil, then climb back up the ladder.','Use the anvil'],
  melee_trial:['Wield your dagger and defeat a practice foe in the Warden\'s Keep yard.','Melee trial'],
  ranged_trial:['Take up the shortbow and arrows and defeat a practice foe from range.','Ranged trial'],
  open_bank:['Open your account at the counter in the Holm Bank.','Open the bank'],
  magic_trial:['At the Mage Tower, cast Wind Strike at a practice foe.','Magic trial'],
  relight_lastlight:['Climb Lastlight and pull the beacon lever to call the ferry.','Relight Lastlight']};
 function steps(){
  var byId={};(HolmTutorialFlow.lessons||[]).forEach(function(l){byId[l.id]=l});
  return HolmCurriculumProgress.lessonIds.map(function(id){var l=byId[id];if(!l)throw new Error('[HolmIslandCurriculum] no flow lesson '+id);
   return {id:id,station:l.station,ev:l.ev,match:l.match,text:TEXT[id][0],arrowLabel:TEXT[id][1],target:null,island:WHERE[id]}});
 }
 function install(){
  if(!on||typeof Tutorial==='undefined'||typeof HolmCurriculumProgress==='undefined'||typeof HolmTutorialFlow==='undefined')return false;
  Tutorial.steps=steps();Tutorial.curriculumVersion=HolmCurriculumProgress.version;Tutorial.completedLessonIds=Tutorial.completedLessonIds||[];
  // the ledger records each lesson as the engine advances past it (the engine only advances on the current lesson)
  var notify=Tutorial.notify;
  Tutorial.notify=function(ev,match){
   var before=this.step,cur=this.steps[before];var r=notify.apply(this,arguments);
   if(cur&&this.step>before&&this.completedLessonIds.indexOf(cur.id)<0)this.completedLessonIds.push(cur.id);
   return r};
  return true;
 }
 // arrow targets once the island's buildings and lesson objects exist (called by HolmArrivalQA after they load)
 function bind(api){
  if(!on||!Tutorial.steps)return 0;var n=0;
  Tutorial.steps.forEach(function(s){var w=s.island,p=null;if(!w)return;
   if(w.object){var o=typeof scene!=='undefined'&&scene.getObjectByName(w.object);if(o){var v=new THREE.Vector3();o.getWorldPosition(v);p={x:v.x,z:v.z}}}
   else if(w.building){var st=api.qaStance(w.building[0],w.building[1]);if(st)p={x:st.x,z:st.z}}
   else if(w.arrival){var a=api.arrivalStance&&api.arrivalStance(w.arrival);if(a)p={x:a.x,z:a.z}}
   if(p){s.target=p;n++}});
  try{if(typeof GuideArrow!=='undefined'&&Tutorial.banner)Tutorial.banner()}catch(e){}
  return n;
 }
 // ui_save: restore the ledger of a version-6 save; the step is the first lesson not yet completed
 function restore(savedTut){
  if(!on)return false;var p=HolmCurriculumProgress.normalize(savedTut||{});
  Tutorial.completedLessonIds=p.completedLessonIds.slice();Tutorial.complete=!!p.complete;Tutorial.step=p.step;
  try{if(typeof HolmIslandGates!=='undefined')HolmIslandGates.refresh({instant:true,force:true})}catch(e){}
  return true;
 }
 // QA only: record lessons as done (the drivers visit later areas without replaying earlier ones), then open gates;
 // the tutors of granted lessons count as spoken to (HolmIslandTalk.adopt), the tutor of the lesson now due does not
 function qaGrant(ids){if(!on||!(typeof QAProfile!=='undefined'&&QAProfile.isolated))return false;var p=HolmCurriculumProgress.normalize({curriculumVersion:6,completedLessonIds:(Tutorial.completedLessonIds||[]).concat(ids)});
  Tutorial.completedLessonIds=p.completedLessonIds.slice();Tutorial.complete=!!p.complete;Tutorial.step=p.step;adoptTalks();try{Tutorial.banner()}catch(e){}
  try{if(typeof HolmIslandGates!=='undefined')HolmIslandGates.refresh({instant:true,force:true})}catch(e){}return true}
 // QA only: set the ledger exactly (gates stay open: they only ever open), so a driver can make a lesson current again
 function qaSetLedger(ids){if(!on||!(typeof QAProfile!=='undefined'&&QAProfile.isolated))return false;var p=HolmCurriculumProgress.normalize({curriculumVersion:6,completedLessonIds:ids});
  Tutorial.completedLessonIds=p.completedLessonIds.slice();Tutorial.complete=!!p.complete;Tutorial.step=p.step;adoptTalks();try{Tutorial.banner()}catch(e){}return true}
 function adoptTalks(){try{if(typeof HolmIslandTalk!=='undefined')HolmIslandTalk.adopt()}catch(e){}}
 // graduation on the island: the last lesson opens the pier gate; Ferryman Tobin's skiff takes the adventurer to the
 // mainland with the departure pack (the live rules: HolmTutorialFlow.departure + Tutorial.grantDeparturePack)
 function installFinish(){if(!on||!Tutorial.finish||Tutorial._islandFinish)return;Tutorial._islandFinish=true;
  Tutorial.finish=function(){this.complete=true;this.step=this.steps.length;
   try{var el=document.getElementById('objective'),txt=document.getElementById('obj-text');if(el&&txt){el.style.display='block';txt.textContent=(typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.objective())||'Lastlight is lit. Board Ferryman Tobin\'s skiff at the Departure Haven.'}
    var h=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.qaStance('haven','boat');if(h&&typeof GuideArrow!=='undefined'){GuideArrow.keepAfterComplete=true;GuideArrow.setTarget({x:h.x,z:h.z},'Board the skiff')}}catch(e){}
   UI.chat('You have completed every lesson on Tutor\'s Holm. The pier gate at the Departure Haven is open.','xp');
   UI.dialogue('Keeper Aldous','That light will carry to the mainland. Go down to the haven; Tobin will row you across.',[{label:'Thank you.'}],'img:assets/icons/tutors/aldous.png?v=31');
   try{if(typeof SaveGame!=='undefined')SaveGame.save(true)}catch(e){}return true}}
 function board(){
  if(!on)return false;if(!Tutorial.complete){UI.chat('Tobin shakes his head. No sailing until Lastlight is lit.','plain');return false}
  var d=HolmTutorialFlow.departure;if(typeof Tutorial.grantDeparturePack!=='function'||!Tutorial.grantDeparturePack())return false;
  try{var el=document.getElementById('objective');if(el)el.style.display='none';if(typeof GuideArrow!=='undefined'){GuideArrow.keepAfterComplete=false;GuideArrow.setTarget(null)}}catch(e){}
  var go=function(){WorldTravel.go(d.destinationProvider,d.destinationLandmark,{loadingLabel:'Sailing for Veyhollow…',zoneLabel:'Veyhollow Commons',arrivalMessage:'The skiff noses into Veyhollow. Hollow Well Square lies just ahead.'})};
  UI.chat('Tobin pushes off from the pier.','plain');if(typeof HolmIslandFx!=='undefined')HolmIslandFx.sail(go);else go();return true}
 install();installFinish();
 return {board:board,qaGrant:qaGrant,qaSetLedger:qaSetLedger,active:function(){return on},install:install,bind:bind,restore:restore,steps:function(){return Tutorial.steps}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandCurriculum;
