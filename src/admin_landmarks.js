/* admin_landmarks.js — hidden review shortcuts for authored World V2 landmarks.
 *
 * These are intentionally attached to the existing backquote-only Admin console,
 * never to player-facing travel.  Art passes can now be checked at gameplay scale
 * without spending each iteration walking across a large authored region. */
(function(){
  if(typeof Admin==='undefined') return;

  function place(x,z,label){
    var y=typeof groundY==='function'?groundY(x,z):0;
    if(y===null||y===undefined) y=0;
    player.position.set(x,y,z);
    Player.plane=0;
    Player.moveTo=null;
    Player.path=[];
    Player.action=null;
    Player.target=null;
    if(typeof UI!=='undefined'){
      UI.closeModal('admin-panel');
      UI.chat('[ADMIN] Reviewing '+label+'.','sys');
      UI.zone("Tutor's Holm");
    }
  }

  Admin.landmark=function(id){
    if(typeof HolmLandscape==='undefined'||!HolmLandscape.pads) return;
    var pad=HolmLandscape.pads.find(function(p){ return p.id===id; });
    if(!pad) return;

    // Review from just beyond the authored south entrance so roofs, doors and the
    // approach composition are visible before the reviewer enters the building.
    place(pad.x,pad.z+pad.d*0.5+2.5,pad.label);
  };

  Admin.workyardLadder=function(){
    // The climb-up return point is also the safest surface-side review position:
    // inside the compound, within reach of the authored hatch, and off colliders.
    var p={x:110.35,z:153.35};
    if(typeof HolmSurvivalCellar!=='undefined'){
      var snap=HolmSurvivalCellar.snapshot();
      if(snap.surface&&snap.surface.approach) p=snap.surface.approach;
    }
    place(p.x,p.z,'the Workyard cellar hatch');
  };

  Admin.workyardDoor=function(id){
    if(typeof WorldV2BuildingData==='undefined') return;
    var def=WorldV2BuildingData.get('holm_survival_workyard_v1');
    var door=def&&def.doors.find(function(d){return d.id===id;});
    if(!door||!door.entry||!door.entry.outside) return;
    var p=door.entry.outside,rot=def.placement.rot||0,c=Math.cos(rot),s=Math.sin(rot);
    var x=def.placement.x+c*p[0]+s*p[1],z=def.placement.z-s*p[0]+c*p[1];
    place(x,z,door.label+' approach');
  };
})();
