/* ================= HOLM STATION REACH =================
 * Wall-mounted building stations (a notice board on the north wall, a flour
 * bin against the pantry wall) sit within ordinary interaction reach of the
 * tile OUTSIDE that wall. The generic walk-to hook measures straight-line
 * distance to the part, so a player could "study" a board through masonry.
 * Every authored station carries an interactionTile in its building
 * definition; this helper walks the player onto that tile (through the real
 * doors, via the real pathfinder) before the station's handler runs.
 */
var HolmStationReach=(function(){
  'use strict';
  function root(buildingId){ return typeof scene!=='undefined'?scene.getObjectByName('world-object-'+buildingId):null; }
  function worldTile(buildingId,tile){
    var r=root(buildingId); if(!r) return null;
    r.updateMatrixWorld(true);
    return r.localToWorld(new THREE.Vector3(tile.x,0,tile.z));
  }
  function at(buildingId,tile,then,reach){
    reach=reach||1.15;
    var p=worldTile(buildingId,tile);
    if(!p||typeof player==='undefined'){ then(); return; }
    var d=Math.hypot(player.position.x-p.x,player.position.z-p.z);
    if(d<=reach){ then(); return; }
    var y=(typeof groundY==='function')?groundY(p.x,p.z):p.y;
    var target=new THREE.Vector3(p.x,y===null?p.y:y,p.z);
    if(typeof Sched==='undefined'||typeof orderWalk!=='function'){ then(); return; }
    Sched.walkThen(target,reach,then,'strong');
    if(!Player.moveTo){
      UI.chat('You cannot reach that from here. Go in through the door first.','plain');
    }
  }
  function guard(buildingId,tile,handler,reach){
    return function(ctx){ at(buildingId,tile,function(){ handler(ctx); },reach); };
  }
  return {at:at,guard:guard,worldTile:worldTile};
})();
if(typeof globalThis!=='undefined') globalThis.HolmStationReach=HolmStationReach;
