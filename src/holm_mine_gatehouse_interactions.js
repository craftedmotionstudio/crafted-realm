/* ================= MINE GATEHOUSE SERVICES =================
 * NPC-free services for the fifth complete Tutor's Holm building. The cavern
 * shaft itself is owned by holm_training_cavern.js (a Planes climb at
 * LAYOUT.gate); this module dresses it: the winch frame explains the descent
 * and can trigger the very same climb, the ore tally teaches copper + tin ->
 * bronze before the player mines either, and the gate stone carries the story.
 * The required `descend_cavern` step still fires from Planes.climbTo exactly as
 * before; nothing here grants credit by talking.
 */
var HolmMineGatehouse=(function(){
  'use strict';
  var BUILDING_ID='holm_mine_gatehouse';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function objective(){
    if(typeof HolmTutorialFlow==='undefined'||typeof Tutorial==='undefined') return 'Explore the mine at your own pace.';
    return HolmTutorialFlow.currentObjective(Tutorial);
  }
  function shaftClimb(){
    var found=null;
    (WORLD.clickables||[]).some(function(o){
      var u=o.userData||{};
      if(u.kind==='climb'&&/Training cavern/.test(String(u.label||''))){ found=o; return true; }
      return false;
    });
    return found;
  }
  function descend(){
    var shaft=shaftClimb();
    if(!shaft){ UI.chat('The shaft ladder is not rigged yet. Try again in a moment.','plain'); return; }
    handleClick(shaft,shaft.position);
  }
  function studyFrame(){
    if(!onHolm()) return;
    var mined=typeof Tutorial!=='undefined'&&Tutorial.steps&&Tutorial.steps.findIndex(function(s){return s.id==='descend_cavern';});
    var due=typeof Tutorial!=='undefined'&&mined>=0&&Tutorial.step===mined;
    UI.dialogue('The winch house',
      'The drum lifts ore; the ladder in the shaft lifts miners. Copper first, then tin from the north offshoot, then the furnace and the anvil. The way back up is the far ladder into the Combat Hall, so pack what you need before you go down.'+
      (due?' This is your lesson: climb down now.':' Current lesson: '+objective()),
      [{label:'Climb down the shaft.',fn:descend},{label:'Not yet.'}],'⛏');
  }
  function readTally(){
    if(!onHolm()) return;
    UI.dialogue('The ore tally',
      'Two columns of chalk marks: copper from the ore hall, tin from the north offshoot. The bronze smear beneath them is the point: one copper and one tin make one bronze bar, and one bar makes the dagger you will carry off this island.',
      [{label:'Copper, tin, bronze.'}],'🪨');
    UI.chat('[MINE GATEHOUSE] Copper + tin at the furnace = bronze bar; one bar at the anvil = Bronze dagger.','sys');
  }
  function readGateStone(){
    if(!onHolm()) return;
    UI.dialogue('The Wardens\' gate stone',
      'A relief of a lantern held over a shaft. Beneath it: “The first winter we shut the mine to keep newcomers safe. The second winter we opened it to keep them alive. Teach the ore; the ore teaches the rest.”',
      [{label:'Teach the ore.'}],'🪔');
  }
  var R=typeof HolmStationReach!=='undefined'?HolmStationReach:null;
  function inside(tile,fn){ return R?R.guard(BUILDING_ID,tile,fn):fn; }
  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_shaft_frame',option:'Study',primary:true,walkTo:true,reach:2.6,handler:inside({x:-2.5,z:-0.5},studyFrame)});
    Interact.register({target:'kind:holm_shaft_frame',option:'Climb-down',walkTo:true,reach:2.6,handler:inside({x:-2.5,z:-0.5},descend)});
    Interact.register({target:'kind:holm_ore_tally',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:2.5,z:-2.6},readTally)});
    Interact.register({target:'kind:holm_gate_stone',option:'Read',primary:true,walkTo:true,reach:2.6,handler:inside({x:1.0,z:2.8},readGateStone)});
  }
  return {studyFrame:studyFrame,readTally:readTally,readGateStone:readGateStone,descend:descend,shaftClimb:shaftClimb};
})();
if(typeof globalThis!=='undefined') globalThis.HolmMineGatehouse=HolmMineGatehouse;
