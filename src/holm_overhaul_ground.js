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
 function setPaths(tiles){paths=tiles||null}
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
  var w=paths&&paths[Math.floor(x)+','+Math.floor(z)];if(w){for(var i=0;i<3;i++)c[i]=c[i]*(1-w)+DIRT[i]*4*w}
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
 return {chunk:chunk,tileColour:tileColour,patch:patch,PALETTE:PALETTE,DIRT:DIRT,setPaths:setPaths};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOverhaulGround;
