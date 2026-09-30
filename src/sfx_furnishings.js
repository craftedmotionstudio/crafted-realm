/* ================= FURNISHING SOUND EFFECTS =================
 * Small medieval prop sounds (chests, hearths, ladders, the waterworks pulley, the fishing edge, doors) on the game's
 * Sfx bus: they add no download weight and obey the saved SFX volume, mute and the first-gesture rule.
 * Sound pass 2026-09-29: every cue is now a recipe in src/sfx_recipes.js (the old ones leaned on sawtooth creaks and
 * square-wave ticks); the API, the timing (a chest's lid thud meets the animated lid) and the snapshot are unchanged, and
 * doorOpen / doorClose are new (src/holm_lastlight_runtime.js already called doorOpen).
 */
var SfxFurnishings=(function(){
  'use strict';
  var closeTimer=0,lastEvent=null,lastThud=0,lastHearth=0,lastClimb=0,lastWaterworks=0,lastFishing=0;

  function play(id,o){try{return typeof Sfx!=='undefined'&&Sfx.play?Sfx.play(id,o):null;}catch(e){return null;}}

  function chestOpen(duration){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    var d=Math.max(.52,Math.min(.92,(duration||.8)*.92));
    // the latch, then a short low lid creak
    play('chest_open');
    lastEvent={type:'open',at:Date.now(),duration:+d.toFixed(3)};
  }

  function chestClose(duration){
    if(closeTimer){clearTimeout(closeTimer);closeTimer=0;}
    var d=Math.max(.42,Math.min(.72,(duration||.8)*.67));
    // the recipe's lid lands 0.26 s in: start it so that lands on the frame where the animated lid meets the chest
    var contact=Math.max(220,Math.round((duration||.8)*760));
    play('chest_close',{delay:Math.max(0,contact/1000-.26)});
    closeTimer=setTimeout(function(){closeTimer=0;lastThud=Date.now();},contact);
    lastEvent={type:'close',at:Date.now(),duration:+d.toFixed(3)};
  }

  function doorOpen(){play('door_open');lastEvent={type:'door-open',at:Date.now(),duration:.75};}
  function doorClose(){play('door_close');lastEvent={type:'door-close',at:Date.now(),duration:.62};}

  function hearthCrackle(){
    // three ember snaps over a soft fire body: a short interaction cue (the fire's own crackle loop is src/cozy_fire.js)
    play('fire_crackle');
    lastHearth=Date.now();lastEvent={type:'hearth',at:lastHearth,duration:.37};
  }

  function ladderClimb(direction){
    play(direction==='up'?'ladder_up':'ladder_down');
    lastClimb=Date.now();lastEvent={type:'climb-'+direction,at:lastClimb,duration:.91};
  }
  function climbDown(){ladderClimb('down');}
  function climbUp(){ladderClimb('up');}

  function pulleyCreak(direction){
    play('pulley',{rate:direction==='raise'?1.08:.94});
    lastWaterworks=Date.now();lastEvent={type:'pulley-'+direction,at:lastWaterworks,duration:.82};
  }

  function waterSplash(){
    play('fish_splash',{rate:.85});
    lastWaterworks=Date.now();lastEvent={type:'water-splash',at:lastWaterworks,duration:.38};
  }

  function bucketSettle(){
    play('bucket_take');
    lastWaterworks=Date.now();lastEvent={type:'bucket-settle',at:lastWaterworks,duration:.22};
  }

  function netCast(){
    play('fish_cast');
    lastFishing=Date.now();lastEvent={type:'net-cast',at:lastFishing,duration:.46};
  }

  function fishBite(){
    play('fish_splash',{gain:.8,rate:1.15});
    lastFishing=Date.now();lastEvent={type:'fish-bite',at:lastFishing,duration:.24};
  }

  function fishCatch(){
    play('fish_catch');
    lastFishing=Date.now();lastEvent={type:'fish-catch',at:lastFishing,duration:.39};
  }

  return {
    profile:'cellar-furnishings-v2',
    chestOpen:chestOpen,
    chestClose:chestClose,
    doorOpen:doorOpen,
    doorClose:doorClose,
    hearthCrackle:hearthCrackle,
    climbDown:climbDown,
    climbUp:climbUp,
    pulleyCreak:pulleyCreak,
    waterSplash:waterSplash,
    bucketSettle:bucketSettle,
    netCast:netCast,
    fishBite:fishBite,
    fishCatch:fishCatch,
    snapshot:function(){return {profile:this.profile,lastEvent:lastEvent,lastThud:lastThud,
      lastHearth:lastHearth,lastClimb:lastClimb,pendingCloseThud:!!closeTimer,
      lastWaterworks:lastWaterworks,lastFishing:lastFishing,
      respectsMaster:typeof Sfx!=='undefined'};}
  };
})();
