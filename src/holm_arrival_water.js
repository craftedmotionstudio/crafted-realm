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
 // ---- the creek water fitted to the drawn banks (owner play-test 2026-09-25: "I can see underneath the water") ----
 // The overhaul terrain carves the creek channel to the creek's authored water line well past creek.halfWidth: the bed
 // lies `depth` under the line out to halfWidth, then the bank climbs to a lip .3 over the line at halfWidth+bankWidth/2.
 // A ribbon only halfWidth wide left the drawn bank under the water line for about a tile on both sides, so a low camera
 // looked under the water's edge into the trench (worst by the survival fishing stage). surface() keeps the authored
 // water line and fits the water to the ground the game actually draws: every half tile along the creek (plus a cap
 // over the channel's round head) each side reaches out until the drawn ground stands clear of the water line and stays
 // clear, then a little further so the edge is tucked under the bank. HolmIslandNav refuses the same bank tiles.
 var FIT={step:.5,march:.05,clear:.04,hold:.35,bury:.12,head:[2.4,1.8,1.2,.6]};
 // the ground as HolmOverhaulGround.chunk draws it: one split diagonal per tile, alternating with (x+z)&1
 function drawn(T,x,z){
  var W=T.width,ix=Math.min(W-1,Math.max(0,Math.floor(x))),iz=Math.min(T.depth-1,Math.max(0,Math.floor(z))),fx=x-ix,fz=z-iz,s=W+1,h=T.heights;
  var a=h[iz*s+ix],b=h[iz*s+ix+1],c=h[(iz+1)*s+ix],d=h[(iz+1)*s+ix+1];
  if((ix+iz)&1)return fz>=fx?a+fz*(c-a)+fx*(d-c):a+fx*(b-a)+fz*(d-b);
  return fx+fz<=1?a+fx*(b-a)+fz*(c-a):d+(1-fx)*(c-d)+(1-fz)*(b-d);
 }
 function surface(creek,terrain){
  need(creek&&Array.isArray(creek.points)&&creek.points.length>=2,'two creek points required');
  need(creek.points.every(function(p){return Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)}),'finite x,z,height points required');
  need([creek.halfWidth,creek.bankWidth].every(function(n){return Number.isFinite(n)&&n>0}),'positive creek widths required');
  need(terrain&&terrain.width>0&&terrain.depth>0&&Array.isArray(terrain.heights)&&terrain.heights.length===(terrain.width+1)*(terrain.depth+1),'terrain lattice required');
  var P=creek.points,maxW=creek.halfWidth+creek.bankWidth/2+.3,stations=[];
  function dir(a,b){var dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);need(l>0,'duplicate creek point');return [dx/l,dz/l]}
  // stations: the channel's round head upstream of the source, then every half tile down each segment, then the mouth
  var d0=dir(P[0],P[1]);FIT.head.forEach(function(s){stations.push({x:P[0][0]-d0[0]*s,z:P[0][1]-d0[1]*s,y:P[0][2],n:[-d0[1],d0[0]],k:1})});
  for(var i=0;i+1<P.length;i++){var a=P[i],b=P[i+1],d=dir(a,b),n=[-d[1],d[0]],cnt=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/FIT.step));
   for(var k=0;k<cnt;k++){var t=k/cnt;
    // a bend is a round join, as the carved channel is: a fan of stations on the corner, turning with the creek
    if(!k&&i){var dp=dir(P[i-1],a),a0=Math.atan2(dp[0],dp[1]),a1=Math.atan2(d[0],d[1]),turn=a1-a0;
     while(turn>Math.PI)turn-=2*Math.PI;while(turn<-Math.PI)turn+=2*Math.PI;need(Math.abs(turn)<Math.PI-1e-6,'reversing creek segment');
     var fan=Math.max(1,Math.ceil(Math.abs(turn)/(Math.PI/12)));
     for(var f=0;f<=fan;f++){var ang=a0+turn*f/fan;stations.push({x:a[0],z:a[1],y:a[2],n:[-Math.cos(ang),Math.sin(ang)],k:1})}
     continue}
    stations.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t,n:n,k:1})}}
  var last=P[P.length-1],dl=dir(P[P.length-2],last);stations.push({x:last[0],z:last[1],y:last[2],n:[-dl[1],dl[0]],k:1});
  var positions=[],indices=[],widths=[];
  function inside(x,z){return x>=0&&z>=0&&x<=terrain.width&&z<=terrain.depth}
  function clearAt(st,side,w){var x=st.x+st.n[0]*w*side,z=st.z+st.n[1]*w*side;return !inside(x,z)||drawn(terrain,x,z)>=st.y+FIT.clear}
  stations.forEach(function(st,si){
   var pair=[1,-1].map(function(side){var lim=maxW*st.k,w=0;
    for(;w<=lim;w+=FIT.march){if(!clearAt(st,side,w))continue;var held=true;for(var q=FIT.march;q<=FIT.hold;q+=FIT.march)if(!clearAt(st,side,w+q)){held=false;break}if(held)break}
    // at the head stations the ground may already stand clear on the centre line: the cap closes there
    w=w>lim?lim:(w>0?Math.min(lim,w+FIT.bury*st.k):0);
    positions.push(st.x+st.n[0]*w*side,st.y+.025,st.z+st.n[1]*w*side);return +w.toFixed(3)});
   widths.push(pair);if(si){var j=(si-1)*2;indices.push(j,j+2,j+1,j+1,j+2,j+3)}
  });
  return {positions:positions,indices:indices,stations:stations.map(function(s){return [+s.x.toFixed(4),+s.z.toFixed(4),s.y]}),widths:widths};
 }
 function create(T,creek,offset,terrain){
  offset=offset||{x:0,z:0};var data=terrain?surface(creek,terrain):ribbon(creek,offset),time={value:0},disposed=false;
  if(terrain&&(offset.x||offset.z))data.positions=data.positions.map(function(v,i){return i%3===0?v+offset.x:i%3===2?v+offset.z:v});
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
  // Old-school look (2026-09-25, HolmOldschoolLook): the kit's pale grey-blue water texture in world space, two layers
  // drifting slowly against each other (the old client's scrolling water), unlit and near-opaque.
  var osWater=typeof HolmOldschoolLook!=='undefined'&&HolmOldschoolLook.enabled()&&HolmOldschoolLook.waterTexture();
  if(osWater){
   material.color.setHex(0xffffff);material.opacity=.98;
   material.onBeforeCompile=function(shader){
    shader.uniforms.holmWaterTime=time;shader.uniforms.holmWaterMap={value:osWater};
    shader.vertexShader='varying vec3 holmWaterPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nholmWaterPosition = position;');
    shader.fragmentShader='uniform float holmWaterTime;\nuniform sampler2D holmWaterMap;\nvarying vec3 holmWaterPosition;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+
     'vec2 hwP = holmWaterPosition.xz;\n'+
     'vec3 hwA = texture2D(holmWaterMap, hwP / 3.0 + vec2(holmWaterTime * 0.020, holmWaterTime * 0.008)).rgb;\n'+
     'vec3 hwB = texture2D(holmWaterMap, hwP.yx / 4.7 + vec2(0.31 - holmWaterTime * 0.011, 0.57 + holmWaterTime * 0.014)).rgb;\n'+
     'diffuseColor.rgb = mix(hwA, hwB, 0.4);');
   };
   material.customProgramCacheKey=function(){return 'holm-arrival-water-oldschool-v1'};
  }
  var group=new T.Group();group.name='ArrivalWater';
  // Horizontal positions in both meshes let one world-scale pattern cross the mouth.
  var oceanGeometry=new T.BufferGeometry();
  oceanGeometry.setAttribute('position',new T.Float32BufferAttribute([-123+offset.x,-.03,-131+offset.z,267+offset.x,-.03,-131+offset.z,267+offset.x,-.03,259+offset.z,-123+offset.x,-.03,259+offset.z],3));
  oceanGeometry.setIndex([0,2,1,0,3,2]);oceanGeometry.computeVertexNormals();
  var riverGeometry=new T.BufferGeometry();riverGeometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));riverGeometry.setIndex(data.indices);riverGeometry.computeVertexNormals();
  var ocean=new T.Mesh(oceanGeometry,material),river=new T.Mesh(riverGeometry,material);ocean.name='ArrivalOcean';river.name='ArrivalCreek';group.add(ocean,river);
  // Holm v2 land (2026-09-26): still pond water (terrain v2 basins) is a flat sheet at the pond level over every tile whose
  // drawn ground dips below it; the bank above the level hides the rest, so the shore is the terrain's own contour
  var pondGeometry=null,pd=terrain&&ponds(terrain);
  if(pd&&pd.indices.length){pondGeometry=new T.BufferGeometry();pondGeometry.setAttribute('position',new T.Float32BufferAttribute(pd.positions,3));pondGeometry.setIndex(pd.indices);pondGeometry.computeVertexNormals();
   var pond=new T.Mesh(pondGeometry,material);pond.name='ArrivalPond';group.add(pond)}
  return {group:group,material:material,ponds:pd?pd.ponds:[],update:function(dt){if(!disposed&&Number.isFinite(dt)&&dt>=0)time.value+=Math.min(dt,.1)},dispose:function(){if(disposed)return;disposed=true;if(group.parent)group.parent.remove(group);oceanGeometry.dispose();riverGeometry.dispose();if(pondGeometry)pondGeometry.dispose();material.dispose()}};
 }
 // pond sheets: one quad per tile (in the basin's reach) whose lowest corner lies under the pond level
 function ponds(terrain){
  if(!terrain||!Array.isArray(terrain.ponds)||!terrain.ponds.length)return null;
  var W=terrain.width,S=W+1,h=terrain.heights,positions=[],indices=[],out=[],seen={};
  // flood from the pond's own water tiles (kind 3) through neighbours whose ground dips under the level, within the basin:
  // never a sheet over a low beach or the creek outside the bowl
  terrain.ponds.forEach(function(p){var n=0,y=p.level+.02,q=[];
   function lo(x,z){return Math.min(h[z*S+x],h[z*S+x+1],h[(z+1)*S+x],h[(z+1)*S+x+1])}
   function inBasin(x,z){return Math.hypot((x+.5-p.x)/p.rx,(z+.5-p.z)/p.rz)<1.3}
   for(var z=0;z<terrain.depth;z++)for(var x=0;x<W;x++)if(terrain.water[z*W+x]===3&&inBasin(x,z)&&!seen[x+','+z]){seen[x+','+z]=1;q.push([x,z])}
   for(var i=0;i<q.length;i++){var t=q[i];[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var nx=t[0]+d[0],nz=t[1]+d[1],k=nx+','+nz;
     if(nx<0||nz<0||nx>=W||nz>=terrain.depth||seen[k]||terrain.water[nz*W+nx]===1||terrain.water[nz*W+nx]===2||!inBasin(nx,nz)||lo(nx,nz)>=p.level)return;seen[k]=1;q.push([nx,nz])})}
   q.forEach(function(t){var x=t[0],z=t[1],b=positions.length/3;positions.push(x,y,z,x+1,y,z,x,y,z+1,x+1,y,z+1);indices.push(b,b+2,b+1,b+1,b+2,b+3);n++});
   out.push({id:p.id,level:p.level,tiles:n})});
  return {positions:positions,indices:indices,ponds:out};
 }
 return {ribbon:ribbon,surface:surface,drawnHeight:drawn,create:create,ponds:ponds};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalWater;
