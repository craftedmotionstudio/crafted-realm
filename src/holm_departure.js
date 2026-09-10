/* ================= TUTOR'S HOLM DEPARTURE GATE =================
 * The ferry is a world object, not a tutorial dialogue teleport. It remains
 * chained until the active curriculum is complete, walks the player to the pier,
 * grants the mainland pack once, then crosses to the v2 Commons provider.
 */
var HolmDeparture=(function(){
  'use strict';
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function unlocked(){ return onHolm()&&typeof HolmTutorialFlow!=='undefined'&&HolmTutorialFlow.canDepart(Tutorial); }
  function lockedMessage(){
    var next=HolmTutorialFlow.currentObjective(Tutorial);
    UI.dialogue('Departure skiff','A brass lesson-lock holds the mooring chain fast. Finish the Holm\'s instruction first.<br><br><b>Next:</b> '+next,
      [{label:'Back to my lesson.'}],'⛵');
  }
  function announceUnlocked(){
    UI.chat('The lesson-lock at Departure Dock clicks open. The mainland boat is ready.','xp');
  }
  function board(){
    if(!unlocked()){ lockedMessage(); return false; }
    var d=HolmTutorialFlow.departure,walk={x:d.dockTile.x,z:d.dockTile.z};
    var cross=function(){
      if(!unlocked()) return lockedMessage();
      try{ if(typeof Tutorial.grantDeparturePack==='function') Tutorial.grantDeparturePack(); }catch(e){}
      WorldTravel.go(d.destinationProvider,d.destinationLandmark,{
        loadingLabel:'Sailing for Veyhollow…',zoneLabel:'Veyhollow Commons',
        arrivalMessage:'The skiff noses into Veyhollow. Hollow Well Square lies just ahead.'
      });
    };
    if(typeof Sched!=='undefined') Sched.walkThen(walk,1.35,cross,'strong'); else cross();
    return true;
  }
  function status(){ return {onHolm:onHolm(),unlocked:unlocked(),
    objective:typeof HolmTutorialFlow!=='undefined'?HolmTutorialFlow.currentObjective(Tutorial):null}; }

  if(typeof Interact!=='undefined'){
    Interact.register({target:'kind:holm_departure',option:'Board',primary:true,handler:board});
    Interact.register({target:'kind:holm_departure',option:'Examine',handler:function(ctx){
      UI.chat(ctx.obj.userData.examine||'A small ferry skiff waits beside the pier.','plain');
    }});
  }
  return {board:board,unlocked:unlocked,status:status,announceUnlocked:announceUnlocked};
})();

if(typeof globalThis!=='undefined') globalThis.HolmDeparture=HolmDeparture;
