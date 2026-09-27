/* Tutor's Holm v2 land (W0b, 2026-09-26, docs/rebuild/HOLM_V2_LAND.md): the pins the island loads on the new land.
 *  - ARRIVAL: the arrival package export on the terrain v2 bundle (tools/stage_holm_arrival_package_v2land.js), for both
 *    looks (it carries the old-school arrival models; the terrain lives in this package);
 *  - REGISTRY: docs/rebuild/holm-overhaul/v2land.json (tools/remeasure_holm_v2land.js): each Blender building's model and the
 *    navigation graph re-measured on the v2 land at its seat height, hash-bound to that model.
 * tools/rebuild_holm_v2land.js rewrites the export id below when the land is rebuilt. Pure data; no side effects. */
var HolmV2Land=(function(){
 'use strict';
 var ARRIVAL={baseUrl:'/.studio-workspaces/holm-arrival-package-v2land-v1/exports/',exportId:'f09f74656b3de0d3'};
 var REGISTRY='/docs/rebuild/holm-overhaul/v2land.json';
 function asset(u){return typeof HolmIsland!=='undefined'?HolmIsland.asset(u):u}
 // registry path ('.studio-workspaces/...') -> the URL the island loads (published copy in production)
 function url(p){return asset('/'+String(p).replace(/^\/+/,''))}
 return {arrival:function(){return {baseUrl:ARRIVAL.baseUrl,exportId:ARRIVAL.exportId}},registryUrl:function(){return asset(REGISTRY)},url:url,ARRIVAL:ARRIVAL};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV2Land;
