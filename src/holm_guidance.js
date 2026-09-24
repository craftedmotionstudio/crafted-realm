/* ================= HOLM GUIDANCE =================
 * Play-review fixes for the objective beacon on Tutor's Holm (docs/rebuild/
 * TUTORS_HOLM_PLAY_REVIEW_2026-09-10.md F-09, F-16, F-25). The flow data keeps one
 * authored target per lesson; this module registers a GuideArrow redirect that
 * bends that target to what the player must actually do next:
 *   - underground with a surface objective   -> the cavern exit ladder
 *   - inside a building whose objective lies -> that building's exit door (the
 *     outside                                    door that best serves the objective)
 *   - cook_fish                              -> the live player fire, or "light
 *                                               another" on the firemaking tile
 * Pure hint logic: no lesson credit, no movement, nothing persisted.
 */
var HolmGuidance=(function(){
  'use strict';
  var EXIT_LADDER={x:322,z:354};                       // holm_training_cavern LAYOUT.exit
  var EXIT_DOOR_BONUS=5;                                // tiles of preference for the authored flow exit door
  var defCache={};
  function onHolm(){ return typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId==='tutors-holm-v2'; }
  function currentStep(){
    if(typeof Tutorial==='undefined'||Tutorial.complete||!Tutorial.steps) return null;
    return Tutorial.steps[Tutorial.step]||null;
  }
  function defFor(buildingId){
    if(defCache[buildingId]!==undefined) return defCache[buildingId];
    var d=null;
    if(typeof WorldV2BuildingData!=='undefined') d=WorldV2BuildingData.all().filter(function(x){return x.assetId===buildingId;})[0]||null;
    defCache[buildingId]=d; return d;
  }
  function interiorAt(x,z){
    if(typeof WORLD==='undefined'||!WORLD.interiors) return null;
    for(var i=0;i<WORLD.interiors.length;i++){
      var it=WORLD.interiors[i];
      if(Math.abs(x-it.x)<it.hw&&Math.abs(z-it.z)<it.hd) return it;
    }
    return null;
  }
  /* The door a player should leave by: nearest outside tile to the objective, with the
   * authored flow exit door given a few tiles of preference so the taught route wins ties. */
  function exitDoor(interior,target){
    var def=defFor(interior.buildingId);
    if(!def||!def.doors||!def.doors.length||typeof HolmStationReach==='undefined') return null;
    var best=null;
    for(var i=0;i<def.doors.length;i++){
      var door=def.doors[i], out=door.entry&&door.entry.outside; if(!out) continue;
      var p=HolmStationReach.worldTile(def.assetId,{x:out[0],z:out[1]}); if(!p) continue;
      if(!reachable(p.x,p.z,target.x,target.z)) continue;
      var d=Math.hypot(p.x-target.x,p.z-target.z)-(def.flow&&def.flow.exitDoor===door.id?EXIT_DOOR_BONUS:0);
      if(!best||d<best.d) best={d:d,x:p.x,z:p.z,label:door.label||'door'};
    }
    return best;
  }
  function liveFire(){
    if(typeof WORLD==='undefined'||!WORLD.fires||typeof player==='undefined') return null;
    var best=null,bd=Infinity;
    for(var i=0;i<WORLD.fires.length;i++){
      var f=WORLD.fires[i], u=f.userData||{};
      if(u.ttl===undefined||u.range||u.ttl<=0) continue;         // player-lit campfires only
      var d=Math.hypot(f.position.x-player.position.x,f.position.z-player.position.z);
      if(d<bd){ bd=d; best=f; }
    }
    return bd<=60?best:null;
  }
  /* A door only counts if the ground outside it can walk to the objective (playtest P-01: the Teaching door
   * used to open onto a sealed pen and the beacon still named it). Cached per door tile and objective. */
  var reachCache={};
  function reachable(fromX,fromZ,toX,toZ){
    if(typeof computePath!=='function') return true;
    var key=[Math.floor(fromX),Math.floor(fromZ),Math.floor(toX),Math.floor(toZ)].join('|');
    if(reachCache[key]!==undefined) return reachCache[key];
    var ok=false;
    try{ var path=computePath(fromX,fromZ,toX,toZ); ok=!!(path&&(path.reached===true||(Array.isArray(path)&&path.length))); }catch(e){ ok=true; }
    if(Object.keys(reachCache).length>200) reachCache={};
    reachCache[key]=ok; return ok;
  }
  function lastlightTarget(plane){
    if(typeof HolmLastlightData==='undefined') return null;
    var c=HolmLastlightData.contract;
    if(plane===0) return {spec:{x:c.footprint.door.x,z:c.footprint.door.z+1.65,labelLift:1.2},label:'Enter Lastlight'};
    var top=c.levels[c.levels.length-1].plane;
    if(plane<top){
      var ladder=(WORLD.clickables||[]).filter(function(o){return o.userData&&o.userData.kind==='climb'&&o.userData.climb&&o.userData.climb.up&&o.userData.climb.up.plane===plane+1;})[0];
      if(ladder) return {spec:{mesh:ladder},label:'Climb the ladder'};
    }
    var lever=(WORLD.clickables||[]).filter(function(o){return o.userData&&o.userData.kind==='lever';})[0];
    if(lever) return {spec:{mesh:lever},label:'Pull the lever'};
    return null;
  }
  function redirect(spec,label){
    if(!onHolm()||typeof player==='undefined'||typeof Player==='undefined') return null;
    if(typeof Tutorial!=='undefined'&&Tutorial.complete) return null;   // the departure target is set by tutorial_holm
    var step=currentStep(); if(!step) return null;
    var plane=Player.plane||0;
    if(plane<0){
      if(step.station==='cavern') return null;
      return {spec:{x:EXIT_LADDER.x+0.5,z:EXIT_LADDER.z+0.5},label:'Climb the exit ladder'};
    }
    if(step.id==='relight_lastlight'){
      var here0=plane===0?interiorAt(player.position.x,player.position.z):null;
      if(!here0){ var lt=lastlightTarget(plane); if(lt) return lt; }
    }
    if(plane!==0) return null;
    if(step.id==='cook_fish'){
      var fire=liveFire();
      if(fire) return {spec:{mesh:fire},label:'Cook on your fire'};
      return {label:'Light another fire here'};
    }
    if(spec&&typeof spec.x==='number'&&typeof spec.z==='number'){
      var here=interiorAt(player.position.x,player.position.z);
      if(here){
        var there=interiorAt(spec.x,spec.z);
        if(!there||there.buildingId!==here.buildingId){
          var door=exitDoor(here,spec);
          if(door) return {spec:{x:door.x,z:door.z,labelLift:2.2},label:'Leave by the '+door.label};
        }
      }
    }
    return null;
  }
  function snapshot(){
    var shown=typeof GuideArrow!=='undefined'?GuideArrow._shown:null;
    var step=currentStep();
    return {onHolm:onHolm(),step:step&&step.id,plane:typeof Player!=='undefined'?(Player.plane||0):null,
      shownLabel:shown&&shown.label||null,
      shownAt:shown&&shown.spec?(shown.spec.mesh?[+shown.spec.mesh.position.x.toFixed(1),+shown.spec.mesh.position.z.toFixed(1)]:[shown.spec.x,shown.spec.z]):null,
      interior:(typeof player!=='undefined'&&interiorAt(player.position.x,player.position.z)||{}).buildingId||null};
  }
  (function install(){
    var iv=setInterval(function(){
      try{
        if(typeof GuideArrow==='undefined'||typeof GuideArrow.addRedirect!=='function') return;
        GuideArrow.addRedirect(redirect); clearInterval(iv);
      }catch(e){ console.error('[holm_guidance]',e); clearInterval(iv); }
    },500);
  })();
  return {redirect:redirect,exitDoor:exitDoor,interiorAt:interiorAt,liveFire:liveFire,reachable:reachable,lastlightTarget:lastlightTarget,snapshot:snapshot,EXIT_LADDER:EXIT_LADDER};
})();
if(typeof globalThis!=='undefined') globalThis.HolmGuidance=HolmGuidance;
