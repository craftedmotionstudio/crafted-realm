/* Tutor's Holm v2 land (W0b, 2026-09-26, docs/rebuild/HOLM_V2_LAND.md): the pins the island loads on the new land.
 *  - ARRIVAL: the arrival package export on the terrain v2 bundle (tools/stage_holm_arrival_package_v2land.js), for both
 *    looks (it carries the old-school arrival models; the terrain lives in this package);
 *  - REGISTRY: docs/rebuild/holm-overhaul/v2land.json (tools/remeasure_holm_v2land.js): each Blender building's model and the
 *    navigation graph re-measured on the v2 land at its seat height, hash-bound to that model.
 * tools/rebuild_holm_v2land.js rewrites the export id below when the land is rebuilt. Pure data; no side effects (the
 * loader below only runs when the island calls it). */
var HolmV2Land=(function(){
 'use strict';
 var ARRIVAL={baseUrl:'/.studio-workspaces/holm-arrival-package-v2land-v2/exports/',exportId:'50c49dbf500f9fc8'};   // v2: the Lantern Keeper statue v5 (kit v4)
 var REGISTRY='/docs/rebuild/holm-overhaul/v2land.json';
 function asset(u){return typeof HolmIsland!=='undefined'?HolmIsland.asset(u):u}
 // registry path ('.studio-workspaces/...') -> the URL the island loads (published copy in production)
 function url(p){return asset('/'+String(p).replace(/^\/+/,''))}
 // The island's terrain lives in this arrival package and every building seat, prop, path and the Minnow Hollow pond
 // is measured on it, so a failed read (a dropped connection on a cold load) is retried, and if it still fails the
 // island does not load: the pre-v2 package (holm-arrival-package-v9) is never a stand-in. Its terrain does not fit
 // the v2 land (the Guide House knoll at 3.0 instead of 4.4, a flat meadow at 2.0 over the pond's 0.6 bed, which
 // buries the fishing spots under the grass). loader: HolmArrivalExportLoader (or a test double);
 // o.tries (3), o.wait(ms) (a timer), o.warn(try, error) (each failed try before the last).
 async function loadArrival(loader,o){
  o=o||{};var tries=o.tries||3,wait=o.wait||function(ms){return new Promise(function(r){setTimeout(r,ms)})},last=null;
  for(var i=1;i<=tries;i++){
   try{return await loader.load({baseUrl:ARRIVAL.baseUrl,exportId:ARRIVAL.exportId})}
   catch(e){last=e;if(e&&e.name==='AbortError')throw e;if(i<tries){if(o.warn)o.warn(i,e);await wait(400*i)}}
  }
  throw Error('[HolmV2Land] the v2-land arrival package could not be read after '+tries+' tries ('+String(last&&last.message||last)+'); the pre-v2 package does not fit the v2 land');
 }
 return {arrival:function(){return {baseUrl:ARRIVAL.baseUrl,exportId:ARRIVAL.exportId}},registryUrl:function(){return asset(REGISTRY)},url:url,ARRIVAL:ARRIVAL,loadArrival:loadArrival};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV2Land;
