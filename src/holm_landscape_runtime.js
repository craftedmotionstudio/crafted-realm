/* ============ TUTOR'S HOLM LANDSCAPE RUNTIME ============
 * Thin adapter between the pure HolmLandscape plan and the existing classic
 * terrain functions. It is active only in world-v2 and can be removed without
 * changing the legacy world.
 */
var HolmLandscapeRuntime=(function(){
  'use strict';
  var installed=false, originalTerrain=null, originalBiome=null, originalPathDistance=null;

  function install(){
    if(installed) return true;
    if(typeof CRWorldMode==='undefined'||CRWorldMode.legacy) return false;
    if(typeof HolmLandscape==='undefined'||typeof terrainHeight!=='function'||
       typeof gridBiome!=='function'||typeof pathDist!=='function') return false;

    originalTerrain=terrainHeight;
    originalBiome=gridBiome;
    originalPathDistance=pathDist;

    terrainHeight=function(x,z){
      return HolmLandscape.inEnvelope(x,z) ? HolmLandscape.heightAt(x,z) : originalTerrain(x,z);
    };
    gridBiome=function(x,z){
      return HolmLandscape.inEnvelope(x,z) ? HolmLandscape.biomeAt(x,z) : originalBiome(x,z);
    };
    pathDist=function(x,z){
      if(!HolmLandscape.inEnvelope(x,z)) return originalPathDistance(x,z);
      return Math.min(HolmLandscape.pathDistance(x,z),originalPathDistance(x,z));
    };
    installed=true;
    console.info('[HOLM_LANDSCAPE] v2 terrain, geography and route adapters installed');
    return true;
  }

  function snapshot(){
    return {installed:installed,planId:HolmLandscape&&HolmLandscape.landscapeContract.planId,
      revision:HolmLandscape&&HolmLandscape.landscapeContract.revision,
      routeTiles:HolmLandscape&&HolmLandscape.routeLength(HolmLandscape.routes[0])};
  }

  install();
  return {install:install,snapshot:snapshot};
})();

if(typeof globalThis!=='undefined') globalThis.HolmLandscapeRuntime=HolmLandscapeRuntime;
