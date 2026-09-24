/* Isolated, deterministic terrain proposal compiler. No runtime/world mutation.
 * z-major shared vertex lattice; material 0 sand, 1 grass, 2 rock, 3 bed, 4 sea.
 * Tile water: 0 dry, 1 sea, 2 creek. Creek carving follows pad flattening.
 * This geometry contract does not assert route/door/bridge walkability.
 */
var HolmOverhaulTerrain=(function(){
  'use strict';
  function fail(message){throw new Error('[HolmOverhaulTerrain] '+message);}
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function range(n,a,b){return finite(n)&&n>=a&&n<=b;}
  function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
  function smooth(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
  function segment(x,z,a,b){
    var dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    return {distance:Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),t:t};
  }
  function validate(s){
    if(!object(s)||s.schema!=='holm-overhaul-terrain-source-v1'||s.version!==1)fail('unsupported source schema/version');
    if(s.width!==144||s.depth!==128||s.spacing!==1)fail('expected width 144, depth 128, spacing 1');
    if(s.shore!==undefined&&(!object(s.shore)||!range(s.shore.beachWidth,1,12)||!range(s.shore.shelfWidth,1,12)))fail('invalid shore profile');
    if(s.grades!==undefined){
      if(!Array.isArray(s.grades))fail('invalid grades');
      s.grades.forEach(function(g){
        if(!object(g)||!range(g.halfWidth,.5,8)||!range(g.blend,.1,12)||!Array.isArray(g.points)||g.points.length<2)fail('invalid grade');
        g.points.forEach(function(p,i){
          if(!Array.isArray(p)||p.length!==3||!range(p[0],0,144)||!range(p[1],0,128)||!range(p[2],0,64))fail('invalid grade point');
          if(i){var a=g.points[i-1],dx=p[0]-a[0],dz=p[1]-a[1],len=Math.abs(dx)+Math.abs(dz);if(!len||(dx&&dz)||Math.abs(p[2]-a[2])/len>.4+1e-9)fail('grade must be cardinal and at most .4 slope');}
        });
      });
    }
    function point(p,n){return Array.isArray(p)&&p.length===n&&range(p[0],0,s.width)&&range(p[1],0,s.depth);}
    if(!Array.isArray(s.coast)||s.coast.length<3||s.coast.length>1024||!s.coast.every(function(p){return point(p,2);}))fail('invalid coast polygon');
    var area=0;
    s.coast.forEach(function(a,i){var b=s.coast[(i+1)%s.coast.length];if(a[0]===b[0]&&a[1]===b[1])fail('duplicate adjacent coast vertices');area+=a[0]*b[1]-b[0]*a[1];});
    if(Math.abs(area)<1e-6)fail('coast has no area');
    if(!Array.isArray(s.hills)||s.hills.length>256||!s.hills.every(function(h){return object(h)&&range(h.x,0,144)&&range(h.z,0,128)&&range(h.rx,.1,144)&&range(h.rz,.1,128)&&range(h.height,0,64);}))fail('invalid hills');
    var ids=Object.create(null);
    if(!Array.isArray(s.pads)||s.pads.length>256)fail('invalid pads');
    s.pads.forEach(function(p){
      if(!object(p)||typeof p.id!=='string'||!p.id||ids[p.id]||!range(p.w,.1,144)||!range(p.d,.1,128)||
        !range(p.x,p.w/2,144-p.w/2)||!range(p.z,p.d/2,128-p.d/2)||!range(p.height,0,64)||!range(p.blend,.01,32))fail('invalid pad');
      ids[p.id]=true;
    });
    var c=s.creek;
    if(!object(c)||!Array.isArray(c.points)||c.points.length<2||c.points.length>1024||
      !range(c.halfWidth,.1,16)||!range(c.bankWidth,.1,32)||!range(c.depth,.01,16))fail('invalid creek');
    c.points.forEach(function(p,i){
      if(!point(p,3)||!range(p[2],-2,64))fail('invalid creek point');
      if(i){var a=c.points[i-1];if(a[0]===p[0]&&a[1]===p[1])fail('zero-length creek segment');if(p[2]>a[2])fail('creek water must be nonincreasing downstream');}
    });
  }
  function signedCoast(poly,x,z){
    var inside=false,d=Infinity;
    for(var i=0,j=poly.length-1;i<poly.length;j=i++){
      var a=poly[j],b=poly[i];d=Math.min(d,segment(x,z,a,b).distance);
      if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return d<1e-9?0:(inside?d:-d);
  }
  function creekAt(c,x,z){
    var best={distance:Infinity,waterY:0};
    for(var i=1;i<c.points.length;i++){
      var a=c.points[i-1],b=c.points[i],hit=segment(x,z,a,b);
      if(hit.distance<best.distance)best={distance:hit.distance,waterY:a[2]+(b[2]-a[2])*hit.t};
    }
    return best;
  }
  function evaluate(s,x,z){
    var coast=signedCoast(s.coast,x,z);
    var beach=s.shore?s.shore.beachWidth:2,shelf=s.shore?s.shore.shelfWidth:3;
    if(coast<0)return {height:-2*smooth(-coast/shelf),material:4,water:1};
    var h=2;
    s.hills.forEach(function(hill){var r=Math.hypot((x-hill.x)/hill.rx,(z-hill.z)/hill.rz);h+=hill.height*smooth(1-r);});
    h*=smooth(coast/beach);
    s.pads.forEach(function(p){
      var d=Math.hypot(Math.max(0,Math.abs(x-p.x)-p.w/2),Math.max(0,Math.abs(z-p.z)-p.d/2));
      h+=(p.height-h)*(1-smooth(d/p.blend));
    });
    (s.grades||[]).forEach(function(g){
      var hit=creekAt({points:g.points},x,z);
      var weight=1-smooth((hit.distance-g.halfWidth)/g.blend);
      h+=(hit.waterY-h)*weight;
    });
    var hit=creekAt(s.creek,x,z),material=coast<beach?0:(h>=7?2:1);
    if(hit.distance<s.creek.halfWidth+s.creek.bankWidth){
      // Author a complete channel profile, including raised banks where the
      // source terrain is low. A min-only carve leaves water floating in air.
      var bed=hit.waterY-s.creek.depth,lip=hit.waterY+.3;
      var t=(hit.distance-s.creek.halfWidth)/s.creek.bankWidth;
      if(t<=0)h=bed;
      else if(t<.5)h=bed+(lip-bed)*smooth(t*2);
      else h=lip+(h-lip)*smooth((t-.5)*2);
      if(hit.distance<=s.creek.halfWidth)material=3;
    }
    return {height:h,material:material,water:hit.distance<=s.creek.halfWidth&&h<hit.waterY?2:0};
  }
  function compile(source){
    validate(source);
    var heights=[],materials=[],water=[],min=Infinity,max=-Infinity,counts=[0,0,0];
    for(var z=0;z<=source.depth;z++)for(var x=0;x<=source.width;x++){
      var v=evaluate(source,x,z);heights.push(v.height);materials.push(v.material);min=Math.min(min,v.height);max=Math.max(max,v.height);
    }
    for(z=0;z<source.depth;z++)for(x=0;x<source.width;x++){
      var kind=evaluate(source,x+.5,z+.5).water;water.push(kind);counts[kind]++;
    }
    return {schema:'holm-overhaul-terrain-bundle-v1',version:1,width:source.width,depth:source.depth,spacing:1,
      heights:heights,materials:materials,water:water,creek:JSON.parse(JSON.stringify(source.creek)),
      stats:{vertices:heights.length,tiles:water.length,minHeight:min,maxHeight:max,dryTiles:counts[0],seaTiles:counts[1],creekTiles:counts[2]}};
  }
  function sample(bundle,x,z){
    if(!object(bundle)||bundle.schema!=='holm-overhaul-terrain-bundle-v1'||bundle.version!==1||bundle.width!==144||bundle.depth!==128||bundle.spacing!==1||
      !Array.isArray(bundle.heights)||bundle.heights.length!==145*129)fail('invalid sample bundle');
    if(!range(x,0,bundle.width)||!range(z,0,bundle.depth))fail('sample outside terrain bounds');
    var ix=Math.min(Math.floor(x),bundle.width-1),iz=Math.min(Math.floor(z),bundle.depth-1),tx=x-ix,tz=z-iz,stride=bundle.width+1;
    var a=bundle.heights[iz*stride+ix],b=bundle.heights[iz*stride+ix+1],c=bundle.heights[(iz+1)*stride+ix],d=bundle.heights[(iz+1)*stride+ix+1];
    if(![a,b,c,d].every(finite))fail('nonfinite sampled height');
    return (a+(b-a)*tx)*(1-tz)+(c+(d-c)*tx)*tz;
  }
  function waterHeight(bundle,x,z){
    if(!object(bundle)||bundle.schema!=='holm-overhaul-terrain-bundle-v1'||!object(bundle.creek)||
      !range(x,0,bundle.width)||!range(z,0,bundle.depth))fail('invalid water sample');
    var hit=creekAt(bundle.creek,x,z);
    return hit.distance<=bundle.creek.halfWidth?hit.waterY:null;
  }
  return {compile:compile,sample:sample,waterHeight:waterHeight};
})();
if(typeof globalThis!=='undefined')globalThis.HolmOverhaulTerrain=HolmOverhaulTerrain;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOverhaulTerrain;
