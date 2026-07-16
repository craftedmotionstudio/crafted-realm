/* ================= WORLD V2 PROVIDER TRAVEL =================
 * Transactional travel between authored provider footprints. The destination is
 * validated before the current residency is released; a failed build restores
 * the previous provider and player position instead of marooning the save.
 */
var WorldTravel=(function(){
  'use strict';
  var busy=false;
  function cover(){
    var el=document.getElementById('world-travel-cover');
    if(!el){
      el=document.createElement('div'); el.id='world-travel-cover';
      el.style.cssText='position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;'+
        'flex-direction:column;background:radial-gradient(ellipse at 50% 42%,#2a2418,#090806 76%);'+
        'color:#e8c46a;font:700 25px Georgia,serif;letter-spacing:.5px;opacity:0;transition:opacity .28s ease;';
      el.innerHTML='<div id="world-travel-title">Crossing the grey sea…</div>'+
        '<div style="font:11px Verdana,sans-serif;color:#b7aa8d;margin-top:10px">The mainland draws nearer.</div>';
      document.body.appendChild(el);
    }
    return el;
  }
  function setPlayer(target){
    var y=groundY(target.x,target.z);
    if(y===null||y<-1.2) throw new Error('destination landmark is not walkable');
    Player.target=null; Player.action=null; Player.moveTo=null; Player.path=[]; Player._pathPartial=false;
    Player.plane=0; player.position.set(target.x,y,target.z);
    if(typeof Planes!=='undefined'&&Planes.refreshVisibility) Planes.refreshVisibility();
    if(typeof camera!=='undefined'&&typeof camCtl!=='undefined'){
      var cx=target.x+camCtl.dist*Math.sin(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
      var cz=target.z+camCtl.dist*Math.cos(camCtl.yaw)*Math.cos(camCtl.pitch*0.6);
      var cy=y+camCtl.dist*Math.sin(camCtl.pitch);
      camera.position.set(cx,cy,cz); camera.lookAt(target.x,y+1.2,target.z);
    }
  }
  function build(provider){
    provider.buildTerrain(); provider.populate(); provider.chartCollision();
  }
  function perform(providerId,landmarkId,options){
    options=options||{};
    var next=WorldV2.get(providerId); if(!next) throw new Error('unknown destination provider '+providerId);
    next.prepare();
    var previous=WorldV2.active,oldPos={x:player.position.x,z:player.position.z};
    var target=next.getSpawnLandmark(landmarkId)||next.getSpawnLandmark(next.defaultLandmark);
    if(previous===next){ next.updateResidency(target.x,target.z,true); setPlayer(target); }
    else{
      try{
        WorldV2.activate(next.id); CRWorldMode.attachProvider(next); build(next); setPlayer(target);
      }catch(error){
        try{
          if(previous){
            WorldV2.activate(previous.id); CRWorldMode.attachProvider(previous); previous.prepare(); build(previous);
            setPlayer({x:oldPos.x,z:oldPos.z});
          }
        }catch(rollbackError){ console.error('[WorldTravel] rollback failed:',rollbackError); }
        throw error;
      }
    }
    next.updateResidency(target.x,target.z,true);
    if(typeof drawMinimap==='function') drawMinimap();
    if(typeof UI!=='undefined'){
      if(UI.closeWorldModals) UI.closeWorldModals();
      UI.zone(options.zoneLabel||next.label);
      UI.chat(options.arrivalMessage||('You arrive at '+next.label+'.'),'sys');
    }
    if(typeof SaveGame!=='undefined') SaveGame.save(true);
    return {provider:next.id,landmark:target.id,x:target.x,z:target.z};
  }
  function go(providerId,landmarkId,options){
    if(busy) return false; busy=true; options=options||{};
    var el=cover(),title=el.querySelector('#world-travel-title');
    if(title) title.textContent=options.loadingLabel||'Crossing the grey sea…';
    el.style.display='flex'; requestAnimationFrame(function(){el.style.opacity='1';});
    setTimeout(function(){
      try{ perform(providerId,landmarkId,options); }
      catch(error){
        console.error('[WorldTravel] '+String(error&&error.message||error));
        if(typeof UI!=='undefined') UI.chat('The passage failed to open. You remain safely where you were.','sys');
      }
      setTimeout(function(){
        el.style.opacity='0'; setTimeout(function(){el.style.display='none';busy=false;},320);
      },Math.max(450,options.holdMs||700));
    },300);
    return true;
  }
  return {go:go,perform:perform,isBusy:function(){return busy;}};
})();

if(typeof globalThis!=='undefined') globalThis.WorldTravel=WorldTravel;
