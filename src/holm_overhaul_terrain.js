/* Isolated, deterministic terrain proposal compiler. No runtime/world mutation.
 * z-major shared vertex lattice; material 0 sand, 1 grass, 2 rock, 3 bed, 4 sea.
 * Tile water: 0 dry, 1 sea, 2 creek, 3 pond (source v2). Creek carving follows pad flattening.
 * This geometry contract does not assert route/door/bridge walkability.
 *
 * Source v2 (Holm v2 land, 2026-09-26, docs/rebuild/WORLD_LAYOUT_GUIDE.md §3.2) adds the seven terrain features of the
 * 2004 study: plateaus with an edge fraction that unite by max (terraces step, never spike), a two-octave ground swell
 * (std ~.5, ~5-tile cells), basins with a pond level (water kind 3, flat pond surface), hillside dimples, a creek valley
 * that keeps both banks above the water line plus close-spaced creek points as weirs/cascades, rock material wherever a
 * tile rises more than rock.rise, and seats: a building's measured ground contact imprinted at its new foundation height
 * (lattice-exact, so a re-measured building graph matches its terrain), blended into the new land. v1 sources compile
 * byte-identically to before. Both versions emit the same bundle schema; a v2 bundle adds `ponds` and `seats`.
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
  var V2='holm-overhaul-terrain-source-v2';
  function isV2(s){return object(s)&&s.schema===V2;}
  function validate(s){
    if(isV2(s))return validateV2(s);
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
  // ---- source v2 (Holm v2 land) ----
  function validateV2(s){
    if(s.version!==2)fail('unsupported source schema/version');
    if(s.width!==144||s.depth!==128||s.spacing!==1)fail('expected width 144, depth 128, spacing 1');
    function point(p,n){return Array.isArray(p)&&p.length===n&&range(p[0],0,s.width)&&range(p[1],0,s.depth);}
    if(!Array.isArray(s.coast)||s.coast.length<3||s.coast.length>1024||!s.coast.every(function(p){return point(p,2);}))fail('invalid coast polygon');
    var area=0;
    s.coast.forEach(function(a,i){var b=s.coast[(i+1)%s.coast.length];if(a[0]===b[0]&&a[1]===b[1])fail('duplicate adjacent coast vertices');area+=a[0]*b[1]-b[0]*a[1];});
    if(Math.abs(area)<1e-6)fail('coast has no area');
    if(!range(s.base,0,16))fail('invalid base height');
    if(!object(s.shore)||!range(s.shore.beachWidth,.5,12)||!range(s.shore.shelfWidth,1,12))fail('invalid shore profile');
    if(s.swell!==undefined&&(!object(s.swell)||!range(s.swell.amp,0,4)||!range(s.swell.cell,1,32)||(s.swell.seed!==undefined&&!Number.isInteger(s.swell.seed))))fail('invalid swell');
    if(s.rock!==undefined&&(!object(s.rock)||!range(s.rock.rise,.2,4)))fail('invalid rock rule');
    var ids=Object.create(null);
    function id(v){if(typeof v!=='string'||!v||ids[v])fail('missing or duplicate feature id '+v);ids[v]=true;}
    function list(name,max){var v=s[name]===undefined?[]:s[name];if(!Array.isArray(v)||v.length>max)fail('invalid '+name);return v;}
    list('plateaus',256).forEach(function(p){if(!object(p)||!range(p.x,0,144)||!range(p.z,0,128)||!range(p.rx,.1,144)||!range(p.rz,.1,128)||!range(p.height,0,64)||!range(p.edge,.05,1))fail('invalid plateau '+(p&&p.id));id(p.id);});
    list('hills',256).forEach(function(h){if(!object(h)||!range(h.x,0,144)||!range(h.z,0,128)||!range(h.rx,.1,144)||!range(h.rz,.1,128)||!range(h.height,-16,64))fail('invalid hill');});
    list('dimples',256).forEach(function(d){if(!Array.isArray(d)||d.length!==4||!range(d[0],0,144)||!range(d[1],0,128)||!range(d[2],.5,16)||!range(d[3],0,8))fail('invalid dimple');});
    list('basins',64).forEach(function(b){if(!object(b)||!range(b.x,0,144)||!range(b.z,0,128)||!range(b.rx,.5,64)||!range(b.rz,.5,64)||!range(b.depth,0,16)||!range(b.edge,.05,1)||(b.pond!==undefined&&!range(b.pond,-2,64)))fail('invalid basin '+(b&&b.id));id(b.id);});
    list('pads',256).forEach(function(p){
      if(p&&p.material!==undefined&&(!Number.isInteger(p.material)||p.material<0||p.material>3))fail('invalid pad material');
      if(!object(p)||!range(p.w,.1,144)||!range(p.d,.1,128)||!range(p.x,p.w/2,144-p.w/2)||!range(p.z,p.d/2,128-p.d/2)||!range(p.height,0,64)||!range(p.blend,.01,32))fail('invalid pad '+(p&&p.id));
      id(p.id);
    });
    list('seats',64).forEach(function(q){
      if(!object(q)||!Number.isInteger(q.x0)||!Number.isInteger(q.z0)||!Number.isInteger(q.w)||!Number.isInteger(q.d)||q.w<1||q.d<1||q.x0<0||q.z0<0||q.x0+q.w>s.width||q.z0+q.d>s.depth||
        !range(q.y,-2,64)||!range(q.blend,.1,16)||!Array.isArray(q.rel)||q.rel.length!==(q.w+1)*(q.d+1)||!q.rel.every(function(v){return range(v,-32,32);}))fail('invalid seat '+(q&&q.id));
      id(q.id);
    });
    list('grades',64).forEach(function(g){
      if(!object(g)||!range(g.halfWidth,.5,8)||!range(g.blend,.1,12)||!Array.isArray(g.points)||g.points.length<2)fail('invalid grade');
      g.points.forEach(function(p,i){
        if(!Array.isArray(p)||p.length!==3||!range(p[0],0,144)||!range(p[1],0,128)||!range(p[2],0,64))fail('invalid grade point');
        if(i){var a=g.points[i-1],dx=p[0]-a[0],dz=p[1]-a[1],len=Math.abs(dx)+Math.abs(dz);if(!len||(dx&&dz)||Math.abs(p[2]-a[2])/len>.4+1e-9)fail('grade must be cardinal and at most .4 slope');}
      });
    });
    // cuts: a structure's bed (the Keeper's Stair): the land may only come down to the path's level, never up
    list('cuts',16).forEach(function(g){
      if(!object(g)||!range(g.halfWidth,.3,8)||!range(g.blend,.1,8)||!Array.isArray(g.points)||g.points.length<2)fail('invalid cut');
      g.points.forEach(function(p){if(!Array.isArray(p)||p.length!==3||!range(p[0],0,144)||!range(p[1],0,128)||!range(p[2],-2,64))fail('invalid cut point');});
      id(g.id);
    });
    var c=s.creek;
    if(!object(c)||!Array.isArray(c.points)||c.points.length<2||c.points.length>1024||
      !range(c.halfWidth,.1,16)||!range(c.bankWidth,.1,32)||!range(c.depth,.01,16))fail('invalid creek');
    if(c.valley!==undefined&&(!object(c.valley)||!range(c.valley.above,0,4)||!range(c.valley.rise,0,1)||!range(c.valley.radius,c.halfWidth+c.bankWidth+.5,48)))fail('invalid creek valley');
    c.points.forEach(function(p,i){
      if(!point(p,3)||!range(p[2],-2,64))fail('invalid creek point');
      if(i){var a=c.points[i-1];if(a[0]===p[0]&&a[1]===p[1])fail('zero-length creek segment');if(p[2]>a[2])fail('creek water must be nonincreasing downstream');}
    });
  }
  // deterministic value noise (integer hash), the 2004 ground swell: two octaves, ~cell tiles across
  function hash(i,j,seed){var n=(i*374761393+j*668265263+seed*1442695041)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296-.5;}
  function vnoise(x,z,seed){var i=Math.floor(x),j=Math.floor(z),fx=smooth(x-i),fz=smooth(z-j),a=hash(i,j,seed),b=hash(i+1,j,seed),c=hash(i,j+1,seed),d=hash(i+1,j+1,seed);return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;}
  function swell(s,x,z){var w=s.swell;if(!w||!w.amp)return 0;var k=w.seed||0,u=x/w.cell,v=z/w.cell;return w.amp*(vnoise(u,v,k)+.5*vnoise(u*2+17.3,v*2+5.1,k+1));}
  function seatAt(q,x,z){
    var cx=Math.max(q.x0,Math.min(q.x0+q.w,x))-q.x0,cz=Math.max(q.z0,Math.min(q.z0+q.d,z))-q.z0,s=q.w+1;
    var ix=Math.min(q.w-1,Math.floor(cx)),iz=Math.min(q.d-1,Math.floor(cz)),fx=cx-ix,fz=cz-iz,r=q.rel;
    var a=r[iz*s+ix],b=r[iz*s+ix+1],c=r[(iz+1)*s+ix],d=r[(iz+1)*s+ix+1];
    return q.y+(a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;
  }
  function ellipse(f,x,z){return Math.hypot((x-f.x)/f.rx,(z-f.z)/f.rz);}
  function evaluateV2(s,x,z){
    var coast=signedCoast(s.coast,x,z),beach=s.shore.beachWidth,shelf=s.shore.shelfWidth;
    if(coast<0)return {height:-2*smooth(-coast/shelf),material:4,water:1};
    var h=s.base,top=0;
    (s.plateaus||[]).forEach(function(p){top=Math.max(top,p.height*smooth((1-ellipse(p,x,z))/p.edge));});
    h+=top;
    (s.hills||[]).forEach(function(q){h+=q.height*smooth(1-ellipse(q,x,z));});
    (s.dimples||[]).forEach(function(d){h-=d[3]*smooth(1-Math.hypot(x-d[0],z-d[1])/d[2]);});
    // the swell fades out inside a basin, so a pond floor is a clean bowl (water never breaks into islands)
    var pond=null,still=0;
    (s.basins||[]).forEach(function(b){var r=ellipse(b,x,z),w=smooth((1-r)/b.edge);h-=b.depth*w;still=Math.max(still,smooth((1.25-r)/.5));if(b.pond!==undefined&&r<1)pond=b.pond;});
    h+=swell(s,x,z)*(1-still);
    h*=smooth(coast/beach);
    // the creek valley is part of the land: it keeps both banks above the water line (never a perched channel);
    // terraces, seats and graded paths built by hand come after it and stand as authored
    var cv=s.creek,vh=creekAt(cv,x,z),vi=cv.halfWidth+cv.bankWidth;
    if(cv.valley&&vh.distance<cv.valley.radius){
      var v=cv.valley,target=vh.waterY+v.above+v.rise*Math.max(0,vh.distance-vi),w=1-smooth((vh.distance-vi)/(v.radius-vi));
      if(target>h)h+=(target-h)*w;
    }
    (s.pads||[]).forEach(function(p){
      var d=Math.hypot(Math.max(0,Math.abs(x-p.x)-p.w/2),Math.max(0,Math.abs(z-p.z)-p.d/2));
      h+=(p.height-h)*(1-smooth(d/p.blend));
    });
    // seats before grades: an approach grade that ends at a door runs on at the door's level (the arrival seam is exact)
    (s.seats||[]).forEach(function(q){
      var d=Math.hypot(Math.max(0,q.x0-x,x-(q.x0+q.w)),Math.max(0,q.z0-z,z-(q.z0+q.d)));
      if(d>=q.blend)return;
      h+=(seatAt(q,x,z)-h)*(d<=0?1:1-smooth(d/q.blend));
    });
    (s.grades||[]).forEach(function(g){
      var hit=creekAt({points:g.points},x,z);
      h+=(hit.waterY-h)*(1-smooth((hit.distance-g.halfWidth)/g.blend));
    });
    (s.cuts||[]).forEach(function(g){
      var hit=creekAt({points:g.points},x,z),t=smooth((hit.distance-g.halfWidth)/g.blend),floor=hit.waterY+(h-hit.waterY)*t;
      if(floor<h)h=floor;
    });
    var c=s.creek,hit=creekAt(c,x,z),inner=c.halfWidth+c.bankWidth,material=coast<beach?0:1;
    if(hit.distance<inner){
      var bed=hit.waterY-c.depth,lip=hit.waterY+.3,t=(hit.distance-c.halfWidth)/c.bankWidth;
      if(t<=0)h=bed;
      else if(t<.5)h=bed+(lip-bed)*smooth(t*2);
      else h=lip+(h-lip)*smooth((t-.5)*2);
      if(hit.distance<=c.halfWidth)material=3;
    }
    var water=hit.distance<=c.halfWidth&&h<hit.waterY?2:0;
    if(!water&&pond!==null&&h<pond){water=3;material=3;}
    return {height:h,material:material,water:water};
  }
  function compileV2(source){
    var W=source.width,D=source.depth,S=W+1,heights=[],materials=[],water=[],min=Infinity,max=-Infinity,counts=[0,0,0,0];
    for(var z=0;z<=D;z++)for(var x=0;x<=W;x++){var v=evaluateV2(source,x,z);heights.push(v.height);materials.push(v.material);}
    // the lattice under pond water reads as bed; steep ground reads as rock (the tiles the walk graph refuses).
    // Pond water is decided on the lattice the game walks and draws (the tile's bilinear centre and its drawn split
    // diagonal, whichever is lower, under the level + .05), never on the analytic field, so no dry tile stands under
    // the pond sheet (the creek keeps the v1 rule; HolmIslandNav adds its banks)
    var ponds0=(source.basins||[]).filter(function(b){return b.pond!==undefined;});
    function pondAt(x,z){var a=heights[z*S+x],b=heights[z*S+x+1],c=heights[(z+1)*S+x],d=heights[(z+1)*S+x+1];
      var lo=Math.min((a+b+c+d)/4,(x+z)&1?(a+d)/2:(b+c)/2),cx=x+.5,cz=z+.5;
      for(var i=0;i<ponds0.length;i++){var p=ponds0[i];if(ellipse(p,cx,cz)<1&&lo<p.pond+.05)return true;}return false;}
    for(z=0;z<D;z++)for(x=0;x<W;x++){var k=evaluateV2(source,x+.5,z+.5).water;if(k===3||(k===0&&pondAt(x,z)))k=pondAt(x,z)?3:0;water.push(k);counts[k]++;
      if(k===3)[[x,z],[x+1,z],[x,z+1],[x+1,z+1]].forEach(function(p){var i=p[1]*S+p[0];if(materials[i]===1||materials[i]===0)materials[i]=3;});}
    // a pad may carry its own ground (the Fire Beach shingle): the lattice inside the pad takes that material
    (source.pads||[]).forEach(function(p){if(p.material===undefined)return;for(var zz=Math.ceil(p.z-p.d/2);zz<=Math.floor(p.z+p.d/2);zz++)for(var xx=Math.ceil(p.x-p.w/2);xx<=Math.floor(p.x+p.w/2);xx++)if(xx>=0&&zz>=0&&xx<=W&&zz<=D)materials[zz*S+xx]=p.material;});
    var rise=source.rock&&source.rock.rise;
    if(rise){var mats=materials.slice();
      for(z=0;z<=D;z++)for(x=0;x<=W;x++){var i=z*S+x;if(mats[i]!==1&&mats[i]!==0)continue;var h0=heights[i],m=0;
        if(x>0)m=Math.max(m,Math.abs(heights[i-1]-h0));if(x<W)m=Math.max(m,Math.abs(heights[i+1]-h0));
        if(z>0)m=Math.max(m,Math.abs(heights[i-S]-h0));if(z<D)m=Math.max(m,Math.abs(heights[i+S]-h0));
        if(m>rise&&h0>.2)materials[i]=2;}}
    heights.forEach(function(h){min=Math.min(min,h);max=Math.max(max,h);});
    var ponds=(source.basins||[]).filter(function(b){return b.pond!==undefined;}).map(function(b){return {id:b.id,x:b.x,z:b.z,rx:b.rx,rz:b.rz,level:b.pond};});
    return {schema:'holm-overhaul-terrain-bundle-v1',version:1,sourceVersion:2,width:W,depth:D,spacing:1,
      heights:heights,materials:materials,water:water,creek:JSON.parse(JSON.stringify(source.creek)),ponds:ponds,
      seats:(source.seats||[]).map(function(q){return {id:q.id,x0:q.x0,z0:q.z0,w:q.w,d:q.d,y:q.y};}),
      stats:{vertices:heights.length,tiles:water.length,minHeight:min,maxHeight:max,dryTiles:counts[0],seaTiles:counts[1],creekTiles:counts[2],pondTiles:counts[3]}};
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
    if(isV2(source))return compileV2(source);
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
    if(hit.distance<=bundle.creek.halfWidth)return hit.waterY;
    return pondLevel(bundle,x,z);
  }
  // a v2 bundle's still water: the pond level where the tile is pond water (kind 3) inside that pond's basin
  function pondLevel(bundle,x,z){
    if(!Array.isArray(bundle.ponds)||!bundle.ponds.length||!Array.isArray(bundle.water))return null;
    var tx=Math.min(bundle.width-1,Math.floor(x)),tz=Math.min(bundle.depth-1,Math.floor(z));
    if(bundle.water[tz*bundle.width+tx]!==3)return null;
    for(var i=0;i<bundle.ponds.length;i++){var p=bundle.ponds[i];if(ellipse(p,tx+.5,tz+.5)<1)return p.level;}
    return null;
  }
  return {compile:compile,sample:sample,waterHeight:waterHeight,pondLevel:pondLevel,SOURCE_V2:V2};
})();
if(typeof globalThis!=='undefined')globalThis.HolmOverhaulTerrain=HolmOverhaulTerrain;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmOverhaulTerrain;
