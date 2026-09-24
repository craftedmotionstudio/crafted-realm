/* Pure placement contract for the existing Blender landscape study. Input:
 * {data, templates:{asset:{localBounds:{min:[x,y,z],max:[x,y,z]}}}, layout,
 *  sample(x,z)}. Bounds must be supplied by the caller after model measurement.
 * Output uses absolute world coordinates, not Studio's recentered coordinates.
 * Rotated local AABBs are conservative, not exact rotated mesh measurements.
 * No fetch, rendering, navigation mutation, collision installation or byte proof.
 */
var HolmArrivalLandscapeContract=(function(){
 'use strict';
 // statue: the Lantern Keeper (owner review 5, 2026-09-24), a plinth grounded like the other structures
 var STRUCTURES=['wall','bench','waypost','cargo','statue'];
 var ASSETS=['oak','hazel','fieldstones'].concat(STRUCTURES);
 function need(ok,message){if(!ok)throw Error('[HolmArrivalLandscapeContract] '+message)}
 function finite(n){return typeof n==='number'&&Number.isFinite(n)}
 function vector(v){return Array.isArray(v)&&v.length===3&&v.every(finite)}
 function overlap(a,b){return a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[2]<b.max[2]&&a.max[2]>b.min[2]}
 function bounds(value){
  need(value&&vector(value.min)&&vector(value.max),'invalid measured localBounds');
  need(value.min.every(function(n,k){return n<value.max[k]}),'empty/reversed measured localBounds');
  return {min:value.min.slice(),max:value.max.slice()};
 }
 function transformed(b,p){
  var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],c=Math.cos(p.rotation),s=Math.sin(p.rotation);
  [b.min[0],b.max[0]].forEach(function(x){[b.min[1],b.max[1]].forEach(function(y){[b.min[2],b.max[2]].forEach(function(z){
   var v=[p.x+p.scale*(c*x+s*z),p.scale*y,p.z+p.scale*(-s*x+c*z)];
   need(v.every(finite),'transformed bounds overflow');
   v.forEach(function(n,k){min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n)});
  })})});need(min.every(function(n,k){return n<max[k]}),'transformed bounds collapsed');return {min:min,max:max};
 }
 function compile(input){
  need(input&&typeof input.sample==='function','terrain sample function required');
  var data=input.data,l=input.layout,templates=input.templates;
  need(data&&data.schema==='holm-arrival-landscape-study-v1'&&Array.isArray(data.placements)&&data.placements.length>0,'invalid landscape study');
  need(l&&l.schema==='holm-overhaul-arrival-layout-v1'&&l.version===1&&l.avatar&&finite(l.avatar.radius)&&l.avatar.radius>0,'invalid layout/avatar');
  need(templates&&typeof templates==='object'&&!Array.isArray(templates),'measured templates required');
  var b=l.building,w=b&&b.world;
  need(b&&w&&[w.x,w.z,w.foundationY,b.width,b.depth].every(finite)&&b.width>0&&b.depth>0,'invalid building footprint');
  need((b.rotation===undefined||b.rotation===0)&&(w.rotation===undefined||w.rotation===0),'unsupported building rotation');
  var building={min:[w.x-b.width/2,0,w.z-b.depth/2],max:[w.x+b.width/2,0,w.z+b.depth/2]};
  var route=l.approach&&l.approach.waypoints;
  need(Array.isArray(route)&&route.length>=2&&route.every(vector),'invalid approach route');
  var margin=l.avatar.radius+.08,segments=[];
  for(var k=1;k<route.length;k++){
   var a=route[k-1],q=route[k];
   need((a[0]===q[0])!==(a[2]===q[2]),'approach route must have nonzero cardinal segments');
   var segment={min:[Math.min(a[0],q[0])-margin,0,Math.min(a[2],q[2])-margin],max:[Math.max(a[0],q[0])+margin,0,Math.max(a[2],q[2])+margin]};
   need(segment.min.concat(segment.max).every(finite),'route envelope overflow');segments.push(segment);
  }
  need(building.min.concat(building.max).every(finite),'building footprint overflow');
  var ids=Object.create(null),placements=[],blockers=[];
  data.placements.forEach(function(p){
   need(p&&ASSETS.indexOf(p.asset)>=0&&[p.x,p.z,p.scale,p.rotation].every(finite)&&p.scale>0,'invalid landscape placement');
   var id=p.id===undefined?'Landscape_'+p.asset+'_'+p.x+'_'+p.z:p.id;
   need(typeof id==='string'&&/^[A-Za-z0-9_.-]+$/.test(id),'invalid placement id');
   need(!ids[id],'duplicate placement id: '+id);ids[id]=true;
   need(Object.prototype.hasOwnProperty.call(templates,p.asset),'missing measured template: '+p.asset);
   var template=templates[p.asset],local=bounds(template&&template.localBounds),box=transformed(local,p);
   // v2 (2026-09-24): a template with a measured ground-contact footprint (trees) blocks and clears routes by
   // that footprint only, as 2004 trees block their trunk tile; the whole canopy still may not overlap the house.
   var foot=template.footprintBounds?transformed(bounds(template.footprintBounds),p):box;
   if(template.footprintBounds)need(foot.min[0]>=box.min[0]-1e-9&&foot.max[0]<=box.max[0]+1e-9&&foot.min[2]>=box.min[2]-1e-9&&foot.max[2]<=box.max[2]+1e-9,'footprint outside measured bounds: '+id);
   need(!segments.some(function(segment){return overlap(foot,segment)}),'landscape obstructs approach route: '+id);
   need(!overlap(box,building),'landscape intersects building footprint: '+id);
   var points=[[box.min[0],box.min[2]],[box.max[0],box.min[2]],[box.min[0],box.max[2]],[box.max[0],box.max[2]],[p.x,p.z]];
   var heights=points.map(function(point){var h=input.sample(point[0],point[1]);need(finite(h),'nonfinite terrain sample: '+id);return h});
   var low=Math.min.apply(Math,heights),high=Math.max.apply(Math,heights),slope=high-low;
   need(finite(slope),'terrain range overflow: '+id);
   var structural=STRUCTURES.indexOf(p.asset)>=0;
   need(!structural||slope<=.3+1e-12,'landscape structure needs level foundation: '+id);
   // Preserve the study's authored origin convention; do not offset by min Y.
   var y=structural?low:heights[4]-.09;
   box.min[1]+=y;box.max[1]+=y;
   need(finite(y)&&box.min.concat(box.max).every(finite),'grounded bounds overflow');
   need(box.min[1]<box.max[1],'grounded bounds collapsed');
   placements.push({id:id,asset:p.asset,transform:{x:p.x,y:y,z:p.z,scale:p.scale,rotation:p.rotation},localBounds:local,worldBounds:box,grounding:{mode:structural?'lowest-corner':'center-burial',samples:points.map(function(point,i){return {x:point[0],z:point[1],y:heights[i]}}),range:slope,structural:structural}});
   // All families stay solid candidates. Foliage AABBs are deliberately broad;
   // refined trunk/stone blockers need separately measured semantic geometry.
   blockers.push(template.footprintBounds?
    {id:id,asset:p.asset,x0:foot.min[0],x1:foot.max[0],z0:foot.min[2],z1:foot.max[2],y0:box.min[1],y1:box.max[1],source:'caller measured ground-contact footprint transformed conservatively',requiresNavigationIntegration:true}:
    {id:id,asset:p.asset,x0:box.min[0],x1:box.max[0],z0:box.min[2],z1:box.max[2],y0:box.min[1],y1:box.max[1],source:'caller measured local AABB transformed conservatively',requiresNavigationIntegration:true});
  });
  return {schema:'holm-arrival-landscape-contract-v1',version:1,placements:placements,blockers:blockers,routeClearance:margin,evidence:{sourceBytesVerified:false,visualAcceptance:false,runtimeAcceptance:false,navigationIntegrated:false,boundsMode:'conservative transformed local AABB'}};
 }
 function selfTest(){
  var fixture={data:{schema:'holm-arrival-landscape-study-v1',placements:[{asset:'wall',x:4,z:4,scale:2,rotation:0}]},templates:{wall:{localBounds:{min:[-.5,0,-.25],max:[.5,1,.25]}}},layout:{schema:'holm-overhaul-arrival-layout-v1',version:1,avatar:{radius:.42},building:{world:{x:10,z:10,foundationY:0},width:2,depth:2},approach:{waypoints:[[0,0,0],[0,0,2]]}},sample:function(){return 3}};
  var out=compile(fixture),n=0;
  need(out.placements[0].transform.y===3,'self-test grounding');n++;
  need(out.blockers[0].x0===3&&out.blockers[0].y1===5,'self-test bounds');n++;
  need(JSON.stringify(out)===JSON.stringify(compile(fixture)),'self-test determinism');n++;
  fixture.data.placements.push(fixture.data.placements[0]);var rejected=false;try{compile(fixture)}catch(e){rejected=/duplicate/.test(e.message)}need(rejected,'self-test duplicate rejection');n++;
  if(typeof console!=='undefined'&&console.info)(typeof module!=='undefined'&&module.exports?console.error:console.info)('[HOLM_LANDSCAPE_CONTRACT] '+n+'/'+n+' acceptance ok');
  return n;
 }
 selfTest();return {compile:compile,selfTest:selfTest};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalLandscapeContract;
