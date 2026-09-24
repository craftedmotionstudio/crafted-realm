/* Deterministic WorldV2 chunk data for the overhaul. No registration/activation.
 * Heights include a shared edge lattice. Water flags never imply bridge support.
 */
var HolmOverhaulChunks=(function(){
 'use strict';
 function need(ok,msg){if(!ok)throw Error('[HolmOverhaulChunks] '+msg)}
 function compile(b){
  need(b&&b.schema==='holm-overhaul-terrain-bundle-v1'&&b.version===1,'unsupported terrain');
  need(b.width===144&&b.depth===128&&b.spacing===1,'invalid extent');
  need(Array.isArray(b.heights)&&b.heights.length===145*129&&b.heights.every(Number.isFinite),'invalid heights');
  need(Array.isArray(b.materials)&&b.materials.length===b.heights.length&&b.materials.every(n=>Number.isInteger(n)&&n>=0&&n<=4),'invalid materials');
  need(Array.isArray(b.water)&&b.water.length===144*128&&b.water.every(n=>Number.isInteger(n)&&n>=0&&n<=2),'invalid water');
  var chunks=[];
  for(var cz=0;cz<16;cz++)for(var cx=0;cx<18;cx++){
   var heights=[],materials=[],flags=[];
   for(var z=0;z<=8;z++)for(var x=0;x<=8;x++){
    var i=(cz*8+z)*145+cx*8+x;heights.push(b.heights[i]);materials.push(b.materials[i]);
   }
   for(z=0;z<8;z++)for(x=0;x<8;x++){
    var tx=cx*8+x,tz=cz*8+z,kind=b.water[tz*144+tx];
    if(kind)flags.push({x:tx,z:tz,mask:1,reason:kind===1?'overhaul-sea':'overhaul-creek'});
   }
   chunks.push({v:1,id:cx+','+cz,cx:cx,cz:cz,layers:{
    terrain:{underlay:'holm-overhaul-v1',heightSource:'holm-overhaul-v1',revision:1,
     sampleOrigin:{x:cx*8,z:cz*8},sampleWidth:9,sampleDepth:9,spacing:1,heights:heights,materials:materials},
    tileFlags:flags,objects:[],interactions:[],mutations:[],spawns:[]}});
  }
  return {schema:'holm-overhaul-chunks-v1',version:1,chunkSize:8,initialRect:{x0:0,z0:0,w:144,h:128},chunks:chunks};
 }
 function sample(chunk,x,z){
  var t=chunk.layers.terrain,lx=x-t.sampleOrigin.x,lz=z-t.sampleOrigin.z;
  need(Number.isFinite(lx)&&Number.isFinite(lz)&&lx>=0&&lx<=8&&lz>=0&&lz<=8,'sample outside chunk');
  var ix=Math.min(7,Math.floor(lx)),iz=Math.min(7,Math.floor(lz)),fx=lx-ix,fz=lz-iz,a=iz*9+ix,h=t.heights;
  return (h[a]*(1-fx)+h[a+1]*fx)*(1-fz)+(h[a+9]*(1-fx)+h[a+10]*fx)*fz;
 }
 // Renderer-neutral positions use world coordinates. Exclusions hide terrain
 // only; they never grant walkability or change sampled heights.
 function surface(chunk,exclusions){
  var t=chunk.layers.terrain,positions=[],indices=[];exclusions=exclusions||[];
  need(t&&t.heights.length===81&&t.materials.length===81,'invalid surface lattice');
  exclusions.forEach(function(r){need(r&&['x','z','w','d'].every(function(k){return Number.isInteger(r[k])})&&r.w>0&&r.d>0,'invalid surface exclusion')});
  for(var z=0;z<=8;z++)for(var x=0;x<=8;x++)positions.push(t.sampleOrigin.x+x,t.heights[z*9+x],t.sampleOrigin.z+z);
  for(z=0;z<8;z++)for(x=0;x<8;x++){
   var wx=t.sampleOrigin.x+x,wz=t.sampleOrigin.z+z;
   if(exclusions.some(function(r){return wx>=r.x&&wx<r.x+r.w&&wz>=r.z&&wz<r.z+r.d}))continue;
   var a=z*9+x;indices.push(a,a+9,a+1,a+1,a+9,a+10);
  }
  return {positions:positions,indices:indices,materials:t.materials.slice()};
 }
 return {compile:compile,sample:sample,surface:surface};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOverhaulChunks;
