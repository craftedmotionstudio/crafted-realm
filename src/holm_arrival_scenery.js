/* Pure binding of declared Blender measurements to authored scenery placement.
 * No file access or source-byte proof. Sampled animation bounds are not a
 * continuous swept-volume guarantee; the caller must verify model bytes. */
var HolmArrivalScenery=(function(){
 'use strict';
 var common=typeof module!=='undefined'&&module.exports;
 var Contract=common?require('./holm_arrival_landscape_contract'):HolmArrivalLandscapeContract;
 var Terrain=common?require('./holm_overhaul_terrain'):HolmOverhaulTerrain;
 var ROOTS={oak:'ArrivalOak',hazel:'ArrivalHazel',fieldstones:'ArrivalFieldstones',wall:'LandingGardenWall',bench:'LandingOakBench',waypost:'LandingWaypost',cargo:'LandingCargoCrate'};
 // optional additions after the seven: the Lantern Keeper statue (owner review 5, 2026-09-24)
 var OPTIONAL={statue:'LanternKeeperStatue'};
 function need(ok,msg){if(!ok)throw Error('[HolmArrivalScenery] '+msg)}
 function clone(v){
  function check(q){need(q===null||['object','string','number','boolean'].indexOf(typeof q)>=0,'non-JSON input');if(typeof q==='number')need(Number.isFinite(q),'nonfinite input');if(q&&typeof q==='object')Object.keys(q).forEach(function(k){check(q[k])})}
  check(v);return JSON.parse(JSON.stringify(v));
 }
 function bounds(b){need(b&&Array.isArray(b.min)&&Array.isArray(b.max)&&b.min.length===3&&b.max.length===3&&b.min.concat(b.max).every(Number.isFinite)&&b.min.every(function(n,k){return n<b.max[k]}),'invalid measured bounds')}
 function safePath(p){return typeof p==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.glb$/.test(p)&&p.split('/').every(function(s){return s!=='.'&&s!=='..'})}
 function compile(input){
  var i=clone(input),m=i.measurement,e=i.envelopes,templates={},parts={},files=Object.create(null);
  need(m&&m.schema==='holm-arrival-landscape-measure-v1'&&(m.version===undefined||m.version===1)&&m.units==='tiles'&&m.axes==='game Y-up: Blender (x,y,z) -> (x,z,-y)'&&m.continuousSweptGuarantee===false,'invalid measurement schema/units/axes/guarantee');
  need(typeof m.blenderVersion==='string'&&m.blenderVersion.length>0&&m.method==='Blender GLB import; evaluated world vertices; animation keyframes and adjacent midpoints','invalid measurement provenance');
  need(m.assets&&Object.keys(ROOTS).every(function(k){return m.assets[k]})&&Object.keys(m.assets).every(function(k){return ROOTS[k]||OPTIONAL[k]}),'the seven measured assets required; only known optional assets may be added');
  var keys=Object.keys(ROOTS).concat(Object.keys(OPTIONAL).filter(function(k){return m.assets[k]}));
  keys.forEach(function(key){
   var a=m.assets[key];need(a&&safePath(a.file)&&!files[a.file],'invalid or duplicate model file');files[a.file]=true;
   need(typeof a.sha256==='string'&&/^[a-f0-9]{64}$/.test(a.sha256),'invalid model hash');
   need(Number.isSafeInteger(a.triangles)&&a.triangles>0&&Number.isSafeInteger(a.vertices)&&a.vertices>=3&&a.triangles<=a.vertices*2,'invalid geometry counts');
   need(Number.isFinite(a.importFramesPerSecond)&&a.importFramesPerSecond>0&&a.importFramesPerSecond<=240,'invalid import frame rate');
   bounds(a.restBounds);bounds(a.animatedSampledUnion);
   need(a.restBounds.min.every(function(n,k){return a.animatedSampledUnion.min[k]<=n&&a.animatedSampledUnion.max[k]>=a.restBounds.max[k]}),'sampled union excludes rest bounds');
   var moving=key==='oak'||key==='hazel';need(Array.isArray(a.clips)&&a.clips.length===(moving?1:0),'invalid animation clip count');
   a.clips.forEach(function(c){need(c&&c.name==='Breeze'&&Array.isArray(c.sampleTimesSeconds)&&c.sampleTimesSeconds.length>=3&&c.sampleTimesSeconds[0]===0&&c.sampleTimesSeconds.every(function(t,k,v){return Number.isFinite(t)&&t>=0&&(k===0||t>v[k-1])}),'invalid Breeze sample times')});
   if(!moving)need(JSON.stringify(a.restBounds)===JSON.stringify(a.animatedSampledUnion),'static sampled bounds drift');
   templates[key]={localBounds:a.animatedSampledUnion};parts[key]=[ROOTS[key]||OPTIONAL[key]];
   if(a.footprintBounds!==undefined){need(moving,'only trees carry a ground-contact footprint');bounds(a.footprintBounds);templates[key].footprintBounds=a.footprintBounds;}
  });
  need(i.placement&&i.placement.schema==='holm-arrival-landscape-study-v1'&&(i.placement.version===undefined||i.placement.version===1),'invalid placement schema/version');
  need(e&&e.schema==='holm-guide-house-collision-envelopes-v1'&&e.version===1&&Array.isArray(e.blockers),'invalid collision envelopes');
  var ids=Object.create(null);e.blockers.forEach(function(b){need(b&&typeof b.id==='string'&&!ids[b.id],'duplicate or missing blocker id');ids[b.id]=true;need(['ground','upper','exterior'].indexOf(b.surface)>=0&&['x0','x1','z0','z1'].every(function(k){return Number.isFinite(b[k])})&&b.x0<b.x1&&b.z0<b.z1,'invalid existing blocker')});
  var result=Contract.compile({data:i.placement,layout:i.layout,templates:templates,sample:function(x,z){return Terrain.sample(i.terrain,x,z)}}),w=i.layout.building.world;
  result.blockers.forEach(function(b){['exterior','ground'].forEach(function(surface){
   var id=b.id+(surface==='ground'?'.ground':'');need(!ids[id],'scenery blocker id collision: '+id);ids[id]=true;
   e.blockers.push({id:id,surface:surface,x0:b.x0-w.x,x1:b.x1-w.x,z0:b.z0-w.z,z1:b.z1-w.z,source:'Blender declared animatedSampledUnion: '+b.asset,note:'Conservative planar projection; avatar radius applied by navigation. Animation sampling is not continuous sweep proof.'});
  })});
  return {schema:'holm-arrival-scenery-contract-v1',version:1,layout:i.layout,envelopes:e,placements:result.placements,partsByAsset:parts,blockers:result.blockers,evidence:{sourceBytesVerified:false,continuousSweptGuarantee:false,visualAcceptance:false,runtimeAcceptance:false,boundsMode:'conservative transformed declared sampled animation union'}};
 }
 function selfTest(){need(safePath('assets/models/oak.glb')&&!safePath('../oak.glb')&&!safePath('C:/oak.glb'),'path acceptance');need(new Set(Object.keys(ROOTS).map(function(k){return ROOTS[k]})).size===7,'unique semantic roots');if(typeof console!=='undefined'&&console.info)(typeof module!=='undefined'&&module.exports?console.error:console.info)('[HOLM_ARRIVAL_SCENERY] 2/2 acceptance ok');return 2}
 selfTest();return {compile:compile,selfTest:selfTest};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalScenery;
