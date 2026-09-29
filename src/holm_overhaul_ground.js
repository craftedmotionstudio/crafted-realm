/* Tile-true ground for the Sept 13 overhaul terrain (owner reviews 5+6, 2026-09-24).
 * The owner wants to SEE the tile squares, the way the 2004 client shows them, but in close shades: neighbouring
 * tiles differ only slightly and melt together in soft patches, and the tile's slope (the renderer's flat
 * Lambert light) does most of the shading. So every tile gets its own four vertices and ONE colour: the average
 * of its four corner materials from the Sept 13 palette, nudged by a smooth patch field a few tiles across and a
 * whisper of per-tile jitter. Pure data (no THREE): returns flat position/colour arrays for any renderer. */
var HolmOverhaulGround=(function(){
 'use strict';
 // The Sept 13 Studio palette (sand, grass, rock, creek bed, sea floor), unchanged: the owner chose that look.
 var PALETTE=[[184,173,121],[126,150,80],[140,140,112],[116,115,83],[139,157,130]];
 // worn-path dirt, close to the sand/creek-bed family so paths read as trodden ground, not paint
 var DIRT=[146,118,78],paths=null;
 // owner review 5 (2026-09-28): "I like that old school RuneScape has like the purposeful gray paths. Ours are just like a
 // heavy marker of shaded paths." setPaths(tiles,{style:'grey'}) draws every path tile in one crisp grey-stone underlay
 // (GREY_PATH; the kit's path_grey texture in the old-school look); without a style the worn-dirt look stays (the online
 // world's paths and every older caller are unchanged)
 var GREY_PATH=[150,148,140],GREY_PATH_FLAT=[152,150,142],pathStyle='dirt';
 function setPaths(tiles,opts){paths=tiles||null;pathStyle=opts&&opts.style==='grey'?'grey':'dirt'}
 function style(){return pathStyle}
 function rnd(x,z,k){var s=Math.sin(x*127.1+z*311.7+k*74.7)*43758.5453;return s-Math.floor(s);}
 // smooth value noise in -1..1, about five tiles across, so close shades gather into soft patches
 function patch(x,z){
  var fx=x/5,fz=z/5,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,w=fz-iz;u=u*u*(3-2*u);w=w*w*(3-2*w);
  function q(a,b){return rnd(a,b,9)*2-1;}
  return (q(ix,iz)*(1-u)+q(ix+1,iz)*u)*(1-w)+(q(ix,iz+1)*(1-u)+q(ix+1,iz+1)*u)*w;
 }
 // colour of one tile from its four corner materials, 0..1 rgb
 function tileColour(m00,m10,m01,m11,x,z){
  var c=[0,0,0];[m00,m10,m01,m11].forEach(function(m){var p=PALETTE[m]||PALETTE[1];c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];});
  // M4.5 worn paths (island draft only): the tile leans to warm dirt, a soft edge half way, same patch/jitter
  var w=paths&&paths[Math.floor(x)+','+Math.floor(z)];if(w){var pc=pathStyle==='grey'?GREY_PATH_FLAT:DIRT;for(var i=0;i<3;i++)c[i]=c[i]*(1-w)+pc[i]*4*w}
  var k=(1+patch(x,z)*.05+(rnd(x,z,1)-.5)*.035)/(4*255);
  return [Math.min(1,c[0]*k),Math.min(1,c[1]*k),Math.min(1,c[2]*k)];
 }
 // sRGB -> linear, for renderers with colour management on (the r160 Studio); the r128 game passes sRGB
 function toLinear(c){return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);}
 // One chunk surface from HolmOverhaulChunks.surface(): positions are the 9x9 world lattice, indices the kept
 // tiles (two triangles each, excluded tiles already dropped). offset {x,y,z,linear}. Returns non-indexed arrays, one colour per tile.
 function chunk(surface,offset){
  var lin=offset&&offset.linear,ox=offset?offset.x:0,oy=offset?offset.y||0:0,oz=offset?offset.z:0,P=surface.positions,M=surface.materials,I=surface.indices;
  var positions=[],colors=[];
  for(var t=0;t<I.length;t+=6){
   var a=I[t],lx=a%9,lz=(a-lx)/9,b=a+1,c=a+9,d=a+10,x=P[a*3],z=P[a*3+2];
   var col=tileColour(M[a],M[b],M[c],M[d],x,z);if(lin)col=col.map(toLinear);
   // alternate the split diagonal so slopes do not stripe one way
   var tri=((x+z)&1)?[a,c,d,a,d,b]:[a,c,b,b,c,d];
   for(var k=0;k<6;k++){var v=tri[k];positions.push(P[v*3]+ox,P[v*3+1]+oy,P[v*3+2]+oz);colors.push(col[0],col[1],col[2]);}
  }
  return {positions:positions,colors:colors};
 }
 // ---- old-school look (world look pass 2026-09-25, owner: "a little bit more old school medieval ... too polished") ----
 // The 2004 client's ground technique, in our own code: every tile keeps ONE colour (its underlay, blended from the
 // lattice around it so materials melt over a couple of tiles, the close-shade squares the owner asked for), while the
 // light is worked out per lattice VERTEX from the height-map slope and interpolated across the tile (gouraud), so
 // hills shade softly instead of in flat facets. The light is baked into the vertex colour (the renderer draws the
 // ground unlit), and each vertex carries its ground-texture weights (sand/rock/earth/cobble; grass is the rest) for
 // the kit textures. Positions and the split diagonal are exactly chunk()'s, so raycasts, collision and the creek
 // water fit (HolmArrivalWater.drawnHeight) are unchanged.
 var LOOK={
  // muted old-school underlays (sand, grass, rock, creek bed, sea floor): olive grass, khaki sand, grey rock
  palette:[[182,166,114],[132,154,50],[134,126,104],[122,108,76],[128,138,112]],dirt:[168,150,104],
  light:[.52,.62,.58],ambient:.55,diffuse:.72,minLight:.55,maxLight:1.32,scale:.76,
  blendInner:6,patch:.13,jitter:.07,
  // broad meadow variation (about twelve tiles across): lighter yellow-olive fields against deeper green hollows
  broad:.16,warm:.1};
 // look pass 2 (2026-09-26, src/holm_oldschool_look.js v2): measured against the Bible references, the grass underlay
 // ~10% darker (the refs' olive meadow, L ~.29), the beach sand ~8% lighter, a little more per-tile jitter (close
 // shades that still read as squares); everything else as the first look.
 // setLookVersion(1) restores the first look's table exactly.
 var LOOK_V1=JSON.stringify(LOOK),LOOK_V2={palette:[[197,179,123],[119,139,45],[134,126,104],[122,108,76],[128,138,112]],jitter:.09};
 // look v3 (the 2004 light, REF2004_FEEL_REPORT.md item 8): the whole ground ~22% darker and the grass a deeper,
 // more saturated green (2004's field: luminance ~.19, saturation .73); v2's other keys stay
 var LOOK_V3={palette:[[184,164,108],[84,128,20],[124,116,94],[110,96,66],[118,128,100]],scale:.52,warm:.08};
 function setLookVersion(v){var src=JSON.parse(LOOK_V1);if(v>1)Object.keys(LOOK_V2).forEach(function(k){src[k]=JSON.parse(JSON.stringify(LOOK_V2[k]))});
  if(v>2)Object.keys(LOOK_V3).forEach(function(k){src[k]=JSON.parse(JSON.stringify(LOOK_V3[k]))});
  Object.keys(src).forEach(function(k){LOOK[k]=src[k]});return LOOK}
 var lattice=null;
 // the whole island's height/material lattice, so edge vertices get their true slope and blend across chunk seams
 function setTerrain(t){lattice=t&&Array.isArray(t.heights)&&Array.isArray(t.materials)?{W:t.width,D:t.depth,h:t.heights,m:t.materials}:null;rockKeep=null}
 /* Rock banks (owner review 5, 2026-09-28). The v2 land's compiler turns every lattice vertex that rises more than 0.95
  * to a neighbour into rock, so the short steep banks at the building seats' edges (the Guide House knoll: 1.4 up over
  * two tiles) came out as a ring of rock vertices, and the one-colour-per-tile underlay drew them as grey squares on the
  * lawn. With rock banks on (the island calls setRockBanks(true)), rock stays only on true cliff faces: a rock vertex that
  * rises at least BANKS.cliff to a neighbour, or one that rises at least BANKS.fringe right beside such a vertex, in a
  * connected face of at least BANKS.min vertices. Every other rock vertex is drawn as a grassy earth bank (grass a little
  * toward the creek-bed earth, a faint earth texture); the gouraud slope light shades the bank, as the 2004 hills are
  * shaded. Materials, heights and the walk graph are untouched (navigation never reads materials); colours only. */
 var BANKS={cliff:2.4,fringe:1.2,min:12,earth:.3,texture:.3},banksOn=false,rockKeep=null;
 function setRockBanks(on){banksOn=!!on;rockKeep=null}
 function keepMask(){
  if(rockKeep)return rockKeep;var W=lattice.W,D=lattice.D,S=W+1,h=lattice.h,m=lattice.m,n=S*(D+1),rise=new Float32Array(n),keep=new Uint8Array(n);
  for(var z=0;z<=D;z++)for(var x=0;x<=W;x++){var i=z*S+x,r=0;if(m[i]!==2)continue;
   if(x>0)r=Math.max(r,Math.abs(h[i-1]-h[i]));if(x<W)r=Math.max(r,Math.abs(h[i+1]-h[i]));if(z>0)r=Math.max(r,Math.abs(h[i-S]-h[i]));if(z<D)r=Math.max(r,Math.abs(h[i+S]-h[i]));rise[i]=r}
  for(z=0;z<=D;z++)for(x=0;x<=W;x++){i=z*S+x;if(m[i]!==2)continue;if(rise[i]>=BANKS.cliff){keep[i]=1;continue}if(rise[i]<BANKS.fringe)continue;
   for(var dz=-1;dz<=1&&!keep[i];dz++)for(var dx=-1;dx<=1;dx++){var a=x+dx,b=z+dz;if(a<0||b<0||a>W||b>D)continue;var j=b*S+a;if(m[j]===2&&rise[j]>=BANKS.cliff){keep[i]=1;break}}}
  // faces smaller than BANKS.min vertices (4-connected) are banks too
  var seen=new Uint8Array(n),q=[];
  for(i=0;i<n;i++){if(!keep[i]||seen[i])continue;q.length=0;q.push(i);seen[i]=1;
   for(var k=0;k<q.length;k++){var u=q[k],ux=u%S,uz=(u-ux)/S;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var a=ux+d[0],b=uz+d[1];if(a<0||b<0||a>W||b>D)return;var v=b*S+a;if(keep[v]&&!seen[v]){seen[v]=1;q.push(v)}})}
   if(q.length<BANKS.min)q.forEach(function(v){keep[v]=0})}
  return rockKeep=keep;
 }
 // is the lattice vertex (x,z) drawn as rock? (the material itself when rock banks are off)
 function rockCorner(x,z){
  if(!lattice)return false;x=Math.max(0,Math.min(lattice.W,x));z=Math.max(0,Math.min(lattice.D,z));var i=z*(lattice.W+1)+x;
  if(lattice.m[i]!==2)return false;return !banksOn||!!keepMask()[i];
 }
 // the material a vertex is drawn with: 5 = a grassy earth bank (a rock vertex that is not a cliff face)
 function drawnMat(m,x,z){return m===2&&banksOn&&lattice&&!rockCorner(x,z)?5:m}
 function broad(x,z){
  var fx=x/12,fz=z/12,ix=Math.floor(fx),iz=Math.floor(fz),u=fx-ix,w=fz-iz;u=u*u*(3-2*u);w=w*w*(3-2*w);
  function q(a,b){return rnd(a,b,23)*2-1;}
  return (q(ix,iz)*(1-u)+q(ix+1,iz)*u)*(1-w)+(q(ix,iz+1)*(1-u)+q(ix+1,iz+1)*u)*w;
 }
 function chunkOldschool(surface,offset){
  var P=surface.positions,M=surface.materials,I=surface.indices,x0=P[0],z0=P[2];
  var ox=offset?offset.x:0,oy=offset?offset.y||0:0,oz=offset?offset.z:0,lin=offset&&offset.linear;
  var L=LOOK.light,ll=Math.hypot(L[0],L[1],L[2]),lx=L[0]/ll,ly=L[1]/ll,lz=L[2]/ll,flat=LOOK.ambient+LOOK.diffuse*ly;
  function H(x,z){
   if(lattice){x=Math.max(0,Math.min(lattice.W,x));z=Math.max(0,Math.min(lattice.D,z));return lattice.h[z*(lattice.W+1)+x]}
   var ix=Math.max(0,Math.min(8,x-x0)),iz=Math.max(0,Math.min(8,z-z0));return P[(iz*9+ix)*3+1];
  }
  function Mat(x,z){
   if(lattice){x=Math.max(0,Math.min(lattice.W,x));z=Math.max(0,Math.min(lattice.D,z));return drawnMat(lattice.m[z*(lattice.W+1)+x],x,z)}
   var ix=Math.max(0,Math.min(8,x-x0)),iz=Math.max(0,Math.min(8,z-z0));return M[iz*9+ix];
  }
  var lightCache={};
  function light(x,z){
   var k=x+','+z;if(k in lightCache)return lightCache[k];
   var dx=(H(x+1,z)-H(x-1,z))/2,dz=(H(x,z+1)-H(x,z-1))/2,n=Math.hypot(dx,1,dz);
   var v=(LOOK.ambient+LOOK.diffuse*((-dx*lx+ly-dz*lz)/n))/flat;
   return lightCache[k]=Math.max(LOOK.minLight,Math.min(LOOK.maxLight,v));
  }
  // the tile's underlay: its four corners weigh blendInner, the twelve lattice points around them weigh 1
  var G=LOOK.palette[1],E=LOOK.palette[3],bank=[G[0]+(E[0]-G[0])*BANKS.earth,G[1]+(E[1]-G[1])*BANKS.earth,G[2]+(E[2]-G[2])*BANKS.earth];
  var pathCol=pathStyle==='grey'?GREY_PATH:LOOK.dirt;
  function underlay(x,z){
   var c=[0,0,0],wsum=0;
   for(var dz=-1;dz<=2;dz++)for(var dx=-1;dx<=2;dx++){
    var inner=dx>=0&&dx<=1&&dz>=0&&dz<=1,w=inner?LOOK.blendInner:1,mm=Mat(x+dx,z+dz),p=mm===5?bank:LOOK.palette[mm]||LOOK.palette[1];
    c[0]+=p[0]*w;c[1]+=p[1]*w;c[2]+=p[2]*w;wsum+=w;
   }
   var pw=paths&&paths[x+','+z];if(pw){for(var i=0;i<3;i++)c[i]=c[i]*(1-pw)+pathCol[i]*wsum*pw}
   var b=broad(x,z),k=LOOK.scale*(1+patch(x,z)*LOOK.patch+b*LOOK.broad+(rnd(x,z,1)-.5)*LOOK.jitter)/(wsum*255);
   return [c[0]*k*(1+b*LOOK.warm),c[1]*k,c[2]*k*(1-b*LOOK.warm)];
  }
  // ground texture weights of one lattice vertex: x sand, y rock, z earth (creek bed), w worn path (grass = 1 - sum)
  function weights(m,pw){
   var w=m===0||m===4?[1,0,0,0]:m===2?[0,1,0,0]:m===3?[0,0,1,0]:m===5?[0,0,BANKS.texture,0]:[0,0,0,0];
   if(pw)w=[w[0]*(1-pw),w[1]*(1-pw),w[2]*(1-pw),pw];
   return w;
  }
  var positions=[],colors=[],ground=[];
  for(var t=0;t<I.length;t+=6){
   var a=I[t],lx0=a%9,lz0=(a-lx0)/9,b=a+1,c=a+9,d=a+10,x=P[a*3],z=P[a*3+2];
   var col=underlay(x,z),pw=paths&&paths[x+','+z]||0;pw=pw>.35?1:0;   // cobble reads per whole tile, crisp like a 2004 overlay
   var tri=((x+z)&1)?[a,c,d,a,d,b]:[a,c,b,b,c,d];
   for(var q=0;q<6;q++){
    var v=tri[q],vx=P[v*3],vz=P[v*3+2],li=light(vx,vz),rgb=[Math.min(1,col[0]*li),Math.min(1,col[1]*li),Math.min(1,col[2]*li)];
    if(lin)rgb=rgb.map(toLinear);
    positions.push(vx+ox,P[v*3+1]+oy,vz+oz);colors.push(rgb[0],rgb[1],rgb[2]);
    var w=weights(drawnMat(M[v],vx,vz),pw);ground.push(w[0],w[1],w[2],w[3]);
   }
  }
  return {positions:positions,colors:colors,ground:ground};
 }
 // the old-school light at any ground point (bilinear between lattice vertices), for meshes drawn over the ground
 function lightAt(x,z){
  if(!lattice)return 1;var L=LOOK.light,ll=Math.hypot(L[0],L[1],L[2]),lx=L[0]/ll,ly=L[1]/ll,lz=L[2]/ll,flat=LOOK.ambient+LOOK.diffuse*ly;
  function H(i,j){i=Math.max(0,Math.min(lattice.W,i));j=Math.max(0,Math.min(lattice.D,j));return lattice.h[j*(lattice.W+1)+i]}
  function V(i,j){var dx=(H(i+1,j)-H(i-1,j))/2,dz=(H(i,j+1)-H(i,j-1))/2,n=Math.hypot(dx,1,dz);return Math.max(LOOK.minLight,Math.min(LOOK.maxLight,(LOOK.ambient+LOOK.diffuse*((-dx*lx+ly-dz*lz)/n))/flat))}
  var ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  return (V(ix,iz)*(1-fx)+V(ix+1,iz)*fx)*(1-fz)+(V(ix,iz+1)*(1-fx)+V(ix+1,iz+1)*fx)*fz;
 }
 // the colour a ribbon drawn over the ground (the arrival trail) takes for the current path style
 function pathColour(){return pathStyle==='grey'?GREY_PATH:LOOK.dirt}
 return {chunk:chunk,chunkOldschool:chunkOldschool,setTerrain:setTerrain,setLookVersion:setLookVersion,LOOK_V2:LOOK_V2,LOOK_V3:LOOK_V3,lightAt:lightAt,LOOK:LOOK,tileColour:tileColour,patch:patch,PALETTE:PALETTE,DIRT:DIRT,setPaths:setPaths,
  pathStyle:style,pathColour:pathColour,GREY_PATH:GREY_PATH,setRockBanks:setRockBanks,rockCorner:rockCorner,BANKS:BANKS};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOverhaulGround;
