/* Tutor's Holm: speak to the tutor first (owner play-test 2026-09-25: "I didn't have to talk to her to complete the
 * tutorial"). The 2004 Tutorial Island rule, rebuilt as our own: each area's tutor must be spoken to before that area's
 * lessons can be done, and the tutor's chat box says what to do next (HolmIslandTutors.talk).
 *  - While the current lesson's tutor has not been spoken to, the objective banner says "Talk to <tutor>" and the guide
 *    arrow points at them (HolmIslandGuide), and that area's stations and lesson objects refuse with a chat line.
 *    Only the current lesson's tutor gates: walking, doors, ladders and every other area stay free.
 *  - The shaft ladder (descend_cavern) is how you reach Foreman Durgin, so it never waits for him.
 *  - Once every lesson is done, Ferryman Tobin is the last tutor: speak to him, then board the skiff.
 * Spoken-to tutors live on Tutorial.talkedTutors and are saved with the character (ui_save tut.talkedTutors). A save
 * from before this rule counts every tutor with a completed lesson as spoken to. Island only (HolmIsland.live()). */
var HolmIslandTalk=(function(){
 'use strict';
 var on=typeof HolmIslandCurriculum!=='undefined'&&HolmIslandCurriculum.active();
 var FREE={descend_cavern:true};
 // whose area a station belongs to: island services by building (only stations that do something; ladders and
 // walk-only spots stay free), practice grubkins by pen, lesson objects by their island lesson id
 var BUILDING={bakehouse:'hettie',lodge:'ansel',bank:'maud',mage:'ilse',lastlight:'aldous',haven:'tobin',survival:'wenna',cavern:'durgin'};
 var PEN={'keep-court':'corrick','mage-yard':'ilse'};
 // the objective banner while a tutor is due
 var TALK={
  bram:'Talk to Guide Bram in the Guide House.',
  wenna:'Talk to Wenna at the survival camp, west along the path.',
  hettie:'Talk to Cook Hettie in the bakehouse.',
  ansel:'Talk to Loremaster Ansel in the Quest Lodge.',
  durgin:'Talk to Foreman Durgin at the foot of the shaft ladder.',
  corrick:'Talk to Warden Corrick in the Warden\'s Keep court.',
  maud:'Talk to Teller Maud in the Holm Bank.',
  ilse:'Talk to Magister Ilse at the Mage Tower.',
  aldous:'Talk to Keeper Aldous inside Lastlight.',
  tobin:'Lastlight is lit. Talk to Ferryman Tobin at the Departure Haven.'};
 var BOARD='Lastlight is lit. Board Ferryman Tobin\'s skiff at the end of the pier.';
 function cast(){return typeof HolmIslandTutors!=='undefined'?HolmIslandTutors.cast():[]}
 function byId(id){return cast().filter(function(c){return c.id===id})[0]||null}
 // the tutor who must be spoken to before a lesson can be done (null for a free lesson)
 function tutorOf(lesson){if(!lesson||FREE[lesson])return null;return cast().filter(function(c){return c.lessons.indexOf(lesson)>=0})[0]||null}
 function list(){if(!Array.isArray(Tutorial.talkedTutors))Tutorial.talkedTutors=[];return Tutorial.talkedTutors}
 function talked(id){return typeof Tutorial!=='undefined'&&Array.isArray(Tutorial.talkedTutors)&&Tutorial.talkedTutors.indexOf(id)>=0}
 // the tutor the player is with now: the current lesson's, or Tobin once every lesson is done (until the crossing)
 function due(){
  if(!on||typeof Tutorial==='undefined')return null;
  if(Tutorial.complete)return Tutorial.departurePackClaimed?null:byId('tobin');
  var s=Tutorial.steps&&Tutorial.steps[Tutorial.step];return s?tutorOf(s.id):null}
 function pending(){var t=due();return t&&!talked(t.id)?t:null}
 function areaOf(u){
  if(!u)return null;
  if(u.kind==='arrival_chart'||u.kind==='arrival_provisions')return 'bram';
  if(u.kind==='island_service'&&u.islandService)return u.islandService.call?(BUILDING[u.islandService.building]||null):null;
  if(u.kind==='npc')return u.npc&&PEN[u.npc.islandPen]||null;
  if(u.kind==='fire')return 'wenna';
  if(u.kind==='furnace'||u.kind==='anvil')return 'durgin';
  if(u.kind==='resource'&&typeof u.islandLesson==='string')return /^survival-/.test(u.islandLesson)?'wenna':/^cavern-/.test(u.islandLesson)?'durgin':null;
  return null}
 // a click on a station: the chat line when its tutor is due and not yet spoken to, else null
 function refusal(u){var t=pending();return t&&areaOf(u)===t.id?'You should speak to '+t.name+' first.':null}
 function paint(){
  if(!on||typeof document==='undefined')return;var el=document.getElementById('objective'),txt=document.getElementById('obj-text');if(!el||!txt)return;
  if(Tutorial.complete){   // graduation: one last line on the island until the crossing (the base banner hides it)
   var here=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.islandActive&&HolmArrivalQA.islandActive();
   if(!here||Tutorial.departurePackClaimed)return;el.style.display='block';txt.textContent=objective();return}
  var t=pending();if(t){el.style.display='block';txt.textContent=TALK[t.id]||('Talk to '+t.name+'.')}}
 // the banner line while a tutor is due (or the last line after graduation), else null
 function objective(){if(!on)return null;var t=pending();if(t)return TALK[t.id]||('Talk to '+t.name+'.');return Tutorial.complete&&!Tutorial.departurePackClaimed?BOARD:null}
 // the tutor has spoken: remember it, refresh the banner and arrow, keep it across a reload
 function markTalked(id){
  if(!on||!byId(id))return false;var l=list();if(l.indexOf(id)>=0)return false;l.push(id);
  try{Tutorial.banner()}catch(e){}
  try{if(typeof SaveGame!=='undefined')SaveGame.save(true)}catch(e){}
  return true}
 // tutors whose (gated) lessons the ledger already holds; graduation holds them all
 function earned(){var done=Array.isArray(Tutorial.completedLessonIds)?Tutorial.completedLessonIds:[];
  return cast().filter(function(c){return c.lessons.some(function(id){return !FREE[id]&&(Tutorial.complete||done.indexOf(id)>=0)})}).map(function(c){return c.id})}
 // count every tutor with a completed lesson as spoken to (saves from before this rule; QA ledger grants)
 function adopt(){if(!on)return false;var l=list();earned().forEach(function(id){if(l.indexOf(id)<0)l.push(id)});return true}
 // ui_save: the saved list (known tutors only, once each), plus every tutor the restored ledger has earned
 function restore(savedTut){
  if(!on)return false;var ids=cast().map(function(c){return c.id}),s=savedTut&&Array.isArray(savedTut.talkedTutors)?savedTut.talkedTutors:[];
  Tutorial.talkedTutors=s.filter(function(id,i){return typeof id==='string'&&ids.indexOf(id)>=0&&s.indexOf(id)===i});adopt();return true}
 // an attack order that did not come through a click (right-click Attack, auto-retaliate) waits for the tutor too
 function update(){
  if(!on||typeof Player==='undefined'||!Player.target||!Player.target.islandPen)return;
  var m=refusal({kind:'npc',npc:Player.target});if(!m)return;Player.target=null;if(typeof UI!=='undefined')UI.chat(m,'plain')}
 function install(){
  if(!on||typeof Tutorial==='undefined'||Tutorial._islandTalk)return false;Tutorial._islandTalk=true;list();
  var orig=Tutorial.banner;Tutorial.banner=function(){var r=orig.apply(this,arguments);try{paint()}catch(e){}return r};return true}
 install();
 return {active:function(){return on},pending:pending,due:due,talked:talked,tutorOf:tutorOf,areaOf:areaOf,refusal:refusal,markTalked:markTalked,
  objective:objective,adopt:adopt,restore:restore,update:update,talkLine:function(id){return TALK[id]||null}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTalk;
