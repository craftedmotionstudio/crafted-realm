/* The rope into the Quarry Gate's mine shaft (owner review 5, 2026-09-28). Owner: "For the mine, I think it would be cool if
 * we added a nearby rope that the character has to pick up and attach to the mine shaft to lower themselves down into it."
 * The 2004 way, island only (HolmIsland.live()):
 *  - a coil of rope (item 'rope'; its ground model is the Blender coil of holm-rope-props-v1, loaded by holm_items_v1.js)
 *    lies on the quarry floor beside the shaft as a ground item: "Take" (left click or the old-school menu) puts it in the
 *    pack through the game's own pickup; while the shaft is untied and the pack holds no rope it lies there again, a
 *    2004 ground spawn (back RESPAWN seconds after it is taken);
 *  - "Use Rope -> Mine shaft", or right-click "Tie-rope" on the shaft frame: the adventurer walks to the shaft, the rope
 *    leaves the pack and is knotted round the mouth set's post, hanging down into the shaft (the Blender 'rope-tied' prop,
 *    placed by HolmIslandExtras from island-ladders.json); the state is saved (Tutorial.shaftRopeTied) and holds for good;
 *  - "Climb-down" lowers the adventurer on the rope (the shaft's ladder service: the kit's ladder-climb clip and the
 *    measured far end, HolmArrivalQA); until the rope is tied the shaft refuses with a chat-box line, and the objective
 *    and the arrow walk the adventurer through take -> tie -> climb.
 * Old saves: a ledger that already holds descend_cavern or any later lesson, or a finished island, counts the rope as tied,
 * so nobody already past the shaft is stopped at it. Nothing here blocks a tile: the walk graph is unchanged. */
var HolmShaftRope=(function(){
 'use strict';
 var on=typeof HolmIsland!=='undefined'?HolmIsland.live():(typeof location!=='undefined'&&new URLSearchParams(location.search).get('holmIsland')==='1');
 var LESSON='descend_cavern',RESPAWN=20,COIL_NAME='island-rope-coil';
 var TEXT={
  take:'At the Quarry Gate, take the coil of rope lying beside the mine shaft.',
  tie:'Use the rope on the mine shaft to tie it to the frame.',
  climb:'Your rope hangs down the shaft. Climb down it to the ore workings.'};
 var LINES={
  refuse:'The shaft drops away into the dark. You need a rope tied to the frame to climb down.',
  noRope:'You need a rope to tie to the frame. There is a coil lying beside the shaft.',
  already:'Your rope is already tied to the frame.',
  tied:'You tie the rope to the frame and let it down into the shaft.',
  full:'You have no room in your pack for the rope.'};
 var EXAMINE={loose:'A deep shaft down to the ore workings. The old ladder is gone; a rope tied to the frame would take you down.',
  tied:'Your rope is knotted round the frame and hangs down into the dark.'};
 var st={bound:null,coil:null,respawnAt:0,wantTie:false,key:'',clock:0};
 function lessons(){return typeof HolmCurriculumProgress!=='undefined'&&HolmCurriculumProgress.lessonIds?HolmCurriculumProgress.lessonIds:[]}
 // tied: the saved flag, or a ledger already at or past the shaft (saves from before the rope), or a finished island
 function tied(){
  if(typeof Tutorial==='undefined')return false;if(Tutorial.shaftRopeTied||Tutorial.complete)return true;
  var done=Array.isArray(Tutorial.completedLessonIds)?Tutorial.completedLessonIds:[],ids=lessons(),at=ids.indexOf(LESSON);
  if(done.indexOf(LESSON)>=0)return true;
  return at>=0&&done.some(function(id){return ids.indexOf(id)>at});
 }
 function hasRope(){return typeof Player!=='undefined'&&Player.count&&Player.count('rope')>0}
 // what the adventurer must do next at the shaft: 'take', 'tie' or 'climb'
 // (a build whose island data carries no rope, never a shipped one, climbs the shaft as the ladder did)
 function stage(){return !st.bound||tied()?'climb':hasRope()?'tie':'take'}
 // HolmIslandExtras: the tied rope prop (hidden until tied) and the coil's resting point on the quarry floor
 function bind(o){if(!on||!o)return false;st.bound=o;st.key='';st.respawnAt=0;show();return true}
 function show(){var b=st.bound;if(b&&b.prop)b.prop.visible=tied();if(b&&b.service)b.service.examine=tied()?EXAMINE.tied:EXAMINE.loose}
 function coilOnGround(){return !!st.coil&&typeof WORLD!=='undefined'&&WORLD.drops&&WORLD.drops.indexOf(st.coil)>=0}
 // the Blender coil once its pack has loaded; a pack that never arrives (a broken deploy, never a shipped build) must not strand
 // the adventurer at the shaft, so after WAIT seconds the coil lies there as the game's plain ground item
 var WAIT=20;function itemsReady(){return typeof HolmItems==='undefined'||!HolmItems.has||HolmItems.has('rope')||st.clock>WAIT}
 // the coil: a ground item that never ages out, named for the island (an authored Blender model, never a code-built one)
 function spawnCoil(){
  var c=st.bound&&st.bound.coil;if(!c||typeof makeDrop!=='function'||!itemsReady())return null;
  makeDrop('rope',1,c.x,c.z);var m=WORLD.drops[WORLD.drops.length-1];if(!m||!m.userData||m.userData.id!=='rope')return null;
  m.position.set(c.x,c.y+.005,c.z);m.rotation.y=c.yaw||0;m.name=COIL_NAME;
  m.userData.life=1e12;m.userData.islandLesson='shaft-rope';m.userData.label='Take <b>Rope</b>';
  st.coil=m;return m;
 }
 // the objective line for the shaft lesson follows the rope (take -> tie -> climb), and the shaft's examine line
 function refreshText(){
  if(typeof Tutorial==='undefined'||!Tutorial.steps||Tutorial.complete)return;var s=Tutorial.steps[Tutorial.step];if(!s||s.id!==LESSON)return;
  var t=TEXT[stage()];if(s.text!==t){s.text=t;try{Tutorial.banner()}catch(e){}}
 }
 function update(dt){
  if(!on||!st.bound)return;st.clock+=dt||0;
  var k=stage(),key=k+'|'+(typeof Tutorial!=='undefined'?Tutorial.step:'');if(key!==st.key){st.key=key;show();refreshText()}   // the step too: a rope taken early
  if(k==='take'&&!coilOnGround()){
   if(!st.respawnAt)st.respawnAt=st.clock+(st.coil?RESPAWN:0);
   if(st.clock>=st.respawnAt&&spawnCoil())st.respawnAt=0;
  }else st.respawnAt=0;
  if(k==='climb'&&coilOnGround()){try{scene.remove(st.coil);removeClickable(st.coil)}catch(e){}var i=WORLD.drops.indexOf(st.coil);if(i>=0)WORLD.drops.splice(i,1);st.coil=null}
 }
 // the old-school menu's "Tie-rope" row: the next click on the shaft ties rather than climbs
 function requestTie(){st.wantTie=true;return true}
 // HolmArrivalQA, a click on the shaft: null = climb as usual; {tie:true} = walk there and tie; {refuse:line} = say why not
 function click(sv){
  if(!on||!st.bound)return null;var using=typeof Player!=='undefined'?Player.usingItem:null,want=st.wantTie;st.wantTie=false;
  if(using==='rope'||want){
   if(using==='rope'){try{if(typeof OsrsMenu!=='undefined'&&OsrsMenu.endUse)OsrsMenu.endUse();else Player.usingItem=null}catch(e){Player.usingItem=null}}
   if(tied())return {refuse:LINES.already};
   if(!hasRope())return {refuse:LINES.noRope};
   return {tie:true};
  }
  if(using){return {refuse:'Nothing interesting happens.'}}
  return tied()?null:{refuse:LINES.refuse};
 }
 // arrived at the shaft stance with a tie order: the rope leaves the pack and hangs from the frame (saved at once)
 function tie(){
  if(!on)return false;if(tied()){if(typeof UI!=='undefined')UI.chat(LINES.already,'plain');return false}
  if(!hasRope()){if(typeof UI!=='undefined')UI.chat(LINES.noRope,'plain');return false}
  Player.removeItem('rope',1);Tutorial.shaftRopeTied=true;
  try{if(typeof UI!=='undefined'&&UI.refreshInv)UI.refreshInv()}catch(e){}
  // the kit has no knot clip: the adventurer bends to the frame with the cook clip's reach (the climb itself keeps the ladder clip)
  try{if(typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active())HolmIslandPlayer.play('cook')}catch(e){}
  try{if(typeof Sfx!=='undefined'&&Sfx.ropeTie)Sfx.ropeTie()}catch(e){}   // fibres rub, two tugs pull it taut
  if(typeof UI!=='undefined')UI.chat(LINES.tied,'plain');
  st.key='';update(0);
  try{if(typeof Events!=='undefined')Events.emit('shaftRopeTied',{})}catch(e){}
  try{if(typeof SaveGame!=='undefined')SaveGame.save(true)}catch(e){}
  return true;
 }
 // QA only (isolated profiles): the shaft as a new adventurer finds it (untied, the coil back on the floor)
 function qaUntie(){if(!on||!(typeof QAProfile!=='undefined'&&QAProfile.isolated))return false;Tutorial.shaftRopeTied=false;st.key='';st.respawnAt=0;update(0);return true}
 function snapshot(){return {on:on,bound:!!st.bound,tied:tied(),saved:typeof Tutorial!=='undefined'&&!!Tutorial.shaftRopeTied,stage:stage(),coil:coilOnGround()?[+st.coil.position.x.toFixed(2),+st.coil.position.y.toFixed(2),+st.coil.position.z.toFixed(2)]:null,
  propVisible:!!(st.bound&&st.bound.prop&&st.bound.prop.visible)}}
 return {active:function(){return on},tied:tied,stage:stage,bind:bind,update:update,click:click,tie:tie,requestTie:requestTie,qaUntie:qaUntie,snapshot:snapshot,
  TEXT:TEXT,LINES:LINES,EXAMINE:EXAMINE,COIL_NAME:COIL_NAME,RESPAWN:RESPAWN};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmShaftRope;
