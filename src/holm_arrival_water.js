/* Shared r128/r160 arrival water. Authored heights remain authoritative;
 * surface colour moves without moving shorelines or changing navigation. */
var HolmArrivalWater=(function(){
 'use strict';
 function need(ok,message){if(!ok)throw Error('[HolmArrivalWater] '+message)}
 function ribbon(creek,offset){
  offset=offset||{x:0,z:0};
  need(creek&&Array.isArray(creek.points)&&creek.points.length>=2,'two creek points required');
  need(Number.isFinite(creek.halfWidth)&&creek.halfWidth>0,'positive creek width required');
  need(Number.isFinite(offset.x)&&Number.isFinite(offset.z),'finite offset required');
  var points=creek.points,positions=[],indices=[];
  points.forEach(function(p){need(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),'finite x,z,height points required')});
  function normal(a,b){var dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);need(len>0,'duplicate creek point');return [-dz/len,dx/len]}
  for(var i=0;i<points.length;i++){
   var p=points[i],a=normal(points[Math.max(0,i-1)],points[Math.max(1,i)]),b=normal(points[Math.min(i,points.length-2)],points[Math.min(i+1,points.length-1)]);
   var mx=a[0]+b[0],mz=a[1]+b[1],length=Math.hypot(mx,mz);need(length>1e-6,'reversing creek segment');mx/=length;mz/=length;
   var width=Math.min(creek.halfWidth/Math.max(.25,mx*b[0]+mz*b[1]),creek.halfWidth*1.6);
   [1,-1].forEach(function(sign){positions.push(p[0]+offset.x+mx*width*sign,p[2]+.025,p[1]+offset.z+mz*width*sign)});
   if(i){var j=(i-1)*2;indices.push(j,j+2,j+1,j+1,j+2,j+3)}
  }
  return {positions:positions,indices:indices};
 }
 function create(T,creek,offset){
  offset=offset||{x:0,z:0};var data=ribbon(creek,offset),time={value:0},disposed=false;
  // 2004-style water (owner 2026-09-25: "more like old school RuneScape water"): unlit saturated blues in three chunky
  // tones that drift slowly on a diagonal, as the old scrolling water texture did, with sparse light streaks. The
  // pattern is our own procedural value noise in world space, so the ocean, the creek mouth and the creek share it.
  var material=new T.MeshBasicMaterial({color:0x4a6fa6,transparent:true,opacity:.97,side:T.DoubleSide,stencilWrite:true,stencilRef:1,stencilFunc:T.NotEqualStencilFunc,stencilZPass:T.KeepStencilOp});
  material.onBeforeCompile=function(shader){
   shader.uniforms.holmWaterTime=time;
   shader.vertexShader='varying vec3 holmWaterPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nholmWaterPosition = position;');
   shader.fragmentShader='uniform float holmWaterTime;\nvarying vec3 holmWaterPosition;\n'+
    'float hwHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+
    'float hwNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hwHash(i),hwHash(i+vec2(1.0,0.0)),f.x),mix(hwHash(i+vec2(0.0,1.0)),hwHash(i+vec2(1.0,1.0)),f.x),f.y);}\n'+
    shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+
    'vec2 hwQ = holmWaterPosition.xz * 0.42 + vec2(holmWaterTime * 0.07, holmWaterTime * 0.03);\n'+
    'float hwN = hwNoise(hwQ) * 0.62 + hwNoise(hwQ * 2.3 + 17.0) * 0.38;\n'+
    'vec3 hwDeep = vec3(0.24, 0.38, 0.62), hwMid = vec3(0.27, 0.43, 0.68), hwLight = vec3(0.34, 0.52, 0.77);\n'+
    'vec3 hwC = mix(hwDeep, hwMid, smoothstep(0.36, 0.48, hwN));\n'+
    'hwC = mix(hwC, hwLight, smoothstep(0.72, 0.77, hwN));\n'+
    'float hwStreak = smoothstep(0.93, 0.975, hwNoise(vec2(hwQ.x * 0.55 - holmWaterTime * 0.04, hwQ.y * 2.6) + 3.0));\n'+
    'hwC = mix(hwC, vec3(0.55, 0.70, 0.89), hwStreak * 0.40);\n'+
    'diffuseColor.rgb = hwC;');
  };
  material.customProgramCacheKey=function(){return 'holm-arrival-water-v3'};
  var group=new T.Group();group.name='ArrivalWater';
  // Horizontal positions in both meshes let one world-scale pattern cross the mouth.
  var oceanGeometry=new T.BufferGeometry();
  oceanGeometry.setAttribute('position',new T.Float32BufferAttribute([-123+offset.x,-.03,-131+offset.z,267+offset.x,-.03,-131+offset.z,267+offset.x,-.03,259+offset.z,-123+offset.x,-.03,259+offset.z],3));
  oceanGeometry.setIndex([0,2,1,0,3,2]);oceanGeometry.computeVertexNormals();
  var riverGeometry=new T.BufferGeometry();riverGeometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));riverGeometry.setIndex(data.indices);riverGeometry.computeVertexNormals();
  var ocean=new T.Mesh(oceanGeometry,material),river=new T.Mesh(riverGeometry,material);ocean.name='ArrivalOcean';river.name='ArrivalCreek';group.add(ocean,river);
  return {group:group,material:material,update:function(dt){if(!disposed&&Number.isFinite(dt)&&dt>=0)time.value+=Math.min(dt,.1)},dispose:function(){if(disposed)return;disposed=true;if(group.parent)group.parent.remove(group);oceanGeometry.dispose();riverGeometry.dispose();material.dispose()}};
 }
 return {ribbon:ribbon,create:create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalWater;
