/* Authored station reach. Missing dependencies and wrong-floor arrival refuse use. */
var HolmStationReach=(function(){
  'use strict';
  function root(buildingId){return typeof scene!=='undefined'&&scene&&typeof scene.getObjectByName==='function'?scene.getObjectByName('world-object-'+buildingId):null;}
  function validTile(tile){return tile&&Number.isFinite(tile.x)&&Number.isFinite(tile.z)&&(tile.y===undefined||Number.isFinite(tile.y))&&(tile.plane===undefined||Number.isInteger(tile.plane));}
  function finitePoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);}
  function worldTile(buildingId,tile){
    if(!validTile(tile)||typeof THREE==='undefined')return null;
    var r=root(buildingId);if(!r)return null;
    r.updateMatrixWorld(true);
    var p=r.localToWorld(new THREE.Vector3(tile.x,tile.y===undefined?0:tile.y,tile.z));
    return finitePoint(p)?p:null;
  }
  function refuse(){if(typeof UI!=='undefined'&&UI&&typeof UI.chat==='function')UI.chat('You cannot use that from here. Reach its floor and go in through the door first.','plain');return false;}
  function at(buildingId,tile,then,reach){
    reach=reach===undefined?1.15:reach;
    if(typeof then!=='function'||!validTile(tile)||!Number.isFinite(reach)||reach<=0)return refuse();
    var building=root(buildingId),p=worldTile(buildingId,tile),plane=tile.plane===undefined?0:tile.plane;
    function available(){return building&&root(buildingId)===building&&typeof Player!=='undefined'&&Player&&typeof player!=='undefined'&&player&&finitePoint(player.position)&&(Player.plane===undefined?0:Player.plane)===plane;}
    if(!p||!available())return refuse();
    // Explicit authored Y is authoritative for upper floors. Legacy ground stations
    // retain their terrain elevation, rather than inheriting the model pivot height.
    if(tile.y===undefined&&plane===0&&typeof groundY==='function')p.y=groundY(p.x,p.z);
    if(!finitePoint(p))return refuse();
    function arrived(){
      if(!available())return false;
      var now=worldTile(buildingId,tile);if(!now)return false;
      if(tile.y===undefined&&plane===0&&typeof groundY==='function')now.y=groundY(now.x,now.z);
      return finitePoint(now)&&Math.hypot(now.x-p.x,now.y-p.y,now.z-p.z)<.0001&&Math.abs(player.position.y-p.y)<=.5&&Math.hypot(player.position.x-p.x,player.position.z-p.z)<=reach;
    }
    if(arrived()){then();return true;}
    if(typeof Sched==='undefined'||!Sched||typeof Sched.walkThen!=='function'||typeof orderWalk!=='function')return refuse();
    var completed=false;
    var task=Sched.walkThen(p,reach,function(){if(completed)return;completed=true;if(arrived())then();else refuse();},'strong');
    if(!Player.moveTo){completed=true;if(typeof Sched.cancel==='function')Sched.cancel(task);return refuse();}
    return true;
  }
  function guard(buildingId,tile,handler,reach){return function(ctx){return at(buildingId,tile,function(){handler(ctx);},reach);};}
  return {at:at,guard:guard,worldTile:worldTile};
})();
if(typeof globalThis!=='undefined')globalThis.HolmStationReach=HolmStationReach;
