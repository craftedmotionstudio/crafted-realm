/* Tutor's Holm v3 terrain: the 2004-style tile landscape contract (finish goal, step 2).
 *
 * Builds on HolmOverhaulTerrain (coast, hills, building pads, graded roads, creek), adding what the
 * playable island needs and v1 cannot express:
 *   - paths:     tile overlays (dirt / cobble / sand) with crisp edges, like 2004 road tiles;
 *   - crossings: bridge decks over the creek, with a walk height of their own;
 *   - walk data: one height per tile centre, null where the tile is water and no deck covers it;
 *   - routes:    named anchors that must be connected under the game's own movement rules
 *                (four cardinal steps, at most MAX_STEP of height change per step, never on water).
 * Pure data: no THREE, no scene, no world mutation. The same bundle drives rendering, groundY,
 * collision and validation, so what you see is what you can walk.
 */
var HolmV3Terrain=(function(){
  'use strict';
  var MAX_STEP=1.05;               // game5_main.js MAX_SURFACE_STEP: one comfortable cardinal step
  var OVERLAY={none:0,dirt:1,cobble:2,sand:3};
  var OVERLAY_NAMES=['none','dirt','cobble','sand'];
  var Base=(typeof HolmOverhaulTerrain!=='undefined')?HolmOverhaulTerrain:
    (typeof require==='function'?require('./holm_overhaul_terrain.js'):null);

  function fail(m){throw new Error('[HolmV3Terrain] '+m);}
  function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
  function int(n){return Number.isInteger(n);}
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function tileIndex(b,x,z){return z*b.width+x;}

  // Every tile a cardinal polyline of the given width covers. Width grows to the right/down of the
  // centre line so a width-1 path is exactly the tiles the points name.
  function rasterPath(path,W,D){
    var tiles=[],seen=Object.create(null),half=Math.floor((path.width-1)/2);
    function add(x,z){if(x<0||z<0||x>=W||z>=D)fail('path leaves the terrain at '+x+','+z);var k=x+','+z;if(!seen[k]){seen[k]=1;tiles.push([x,z]);}}
    for(var i=1;i<path.points.length;i++){
      var a=path.points[i-1],b=path.points[i],dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]);
      for(var x=a[0],z=a[1];;x+=dx,z+=dz){
        for(var w=-half;w<path.width-half;w++){ if(dx) add(x,z+w); else add(x+w,z); }
        if(x===b[0]&&z===b[1])break;
      }
    }
    return tiles;
  }

  function validate(s){
    if(!object(s)||s.schema!=='holm-terrain-source-v3'||s.version!==1)fail('unsupported source schema/version');
    (s.paths||[]).forEach(function(p,n){
      if(!object(p)||!(p.material in OVERLAY)||p.material==='none'||!int(p.width)||p.width<1||p.width>4)fail('invalid path '+n);
      if(!Array.isArray(p.points)||p.points.length<2)fail('path '+n+' needs two points');
      p.points.forEach(function(q,i){
        if(!Array.isArray(q)||q.length!==2||!int(q[0])||!int(q[1]))fail('path '+n+' points must be integer tiles');
        if(i){var a=p.points[i-1];if((q[0]!==a[0])===(q[1]!==a[1]))fail('path '+n+' segment '+i+' must be cardinal and non-empty');}
      });
    });
    var ids=Object.create(null);
    (s.crossings||[]).forEach(function(c){
      if(!object(c)||typeof c.id!=='string'||!c.id||ids[c.id])fail('invalid or duplicate crossing id');ids[c.id]=1;
      if(!int(c.x)||!int(c.z)||!int(c.w)||!int(c.d)||c.w<1||c.d<1||c.w>12||c.d>12)fail('crossing '+c.id+' needs an integer tile rect');
      if(Math.min(c.w,c.d)>3)fail('crossing '+c.id+' is wider than three tiles');
      if(!finite(c.deckY))fail('crossing '+c.id+' needs a finite deckY');
    });
    if(s.anchors!==undefined){
      if(!object(s.anchors))fail('anchors must be an object');
      Object.keys(s.anchors).forEach(function(k){var a=s.anchors[k];if(!Array.isArray(a)||a.length!==2||!int(a[0])||!int(a[1]))fail('anchor '+k+' must be an integer tile');});
    }
    (s.routes||[]).forEach(function(r){
      if(!Array.isArray(r)||r.length!==2||!s.anchors||!s.anchors[r[0]]||!s.anchors[r[1]])fail('route names an unknown anchor');
    });
  }

  function compile(source){
    if(!Base)fail('HolmOverhaulTerrain is required');
    validate(source);
    var baseSource=JSON.parse(JSON.stringify(source));
    baseSource.schema='holm-overhaul-terrain-source-v1';
    ['paths','crossings','anchors','routes','notes'].forEach(function(k){delete baseSource[k];});
    var base=Base.compile(baseSource),W=base.width,D=base.depth;
    var overlay=new Array(W*D).fill(0),deck=new Array(W*D).fill(null),tileY=new Array(W*D);

    (source.crossings||[]).forEach(function(c){
      if(c.x<0||c.z<0||c.x+c.w>W||c.z+c.d>D)fail('crossing '+c.id+' leaves the terrain');
      var creek=0;
      for(var z=c.z;z<c.z+c.d;z++)for(var x=c.x;x<c.x+c.w;x++){
        var i=tileIndex(base,x,z);if(base.water[i]===1)fail('crossing '+c.id+' stands in the sea');
        if(base.water[i]===2)creek++;
        if(deck[i]!==null)fail('crossings overlap at '+x+','+z);deck[i]=c.deckY;
      }
      if(!creek)fail('crossing '+c.id+' spans no creek tile');
      var water=Base.waterHeight(base,c.x+c.w/2,c.z+c.d/2);
      if(water!==null&&c.deckY<water+.3)fail('crossing '+c.id+' deck sits less than 0.3 above the water');
    });

    for(var z=0;z<D;z++)for(var x=0;x<W;x++){
      var i=tileIndex(base,x,z);
      tileY[i]=deck[i]!==null?deck[i]:(base.water[i]?null:Base.sample(base,x+.5,z+.5));
    }

    (source.paths||[]).forEach(function(p,n){
      rasterPath(p,W,D).forEach(function(t){
        var i=tileIndex(base,t[0],t[1]);
        if(tileY[i]===null)fail('path '+n+' crosses water at '+t[0]+','+t[1]+' without a crossing');
        overlay[i]=OVERLAY[p.material];
      });
    });

    // crossing ends must land on dry walkable ground within one step of the deck
    (source.crossings||[]).forEach(function(c){
      var alongX=c.w>=c.d,ends=[];
      if(alongX)for(var z=c.z;z<c.z+c.d;z++)ends.push([c.x-1,z],[c.x+c.w,z]);
      else for(var x=c.x;x<c.x+c.w;x++)ends.push([x,c.z-1],[x,c.z+c.d]);
      var landed=ends.filter(function(e){
        if(e[0]<0||e[1]<0||e[0]>=W||e[1]>=D)return false;
        var y=tileY[tileIndex(base,e[0],e[1])];return y!==null&&Math.abs(y-c.deckY)<=MAX_STEP;
      });
      var sides=alongX?[landed.some(function(e){return e[0]<c.x;}),landed.some(function(e){return e[0]>=c.x+c.w;})]:
        [landed.some(function(e){return e[1]<c.z;}),landed.some(function(e){return e[1]>=c.z+c.d;})];
      if(!sides[0]||!sides[1])fail('crossing '+c.id+' does not land on walkable ground at both ends');
    });

    var bundle={schema:'holm-terrain-bundle-v3',version:1,width:W,depth:D,maxStep:MAX_STEP,
      base:base,overlay:overlay,tileY:tileY,
      crossings:(source.crossings||[]).map(function(c){return {id:c.id,x:c.x,z:c.z,w:c.w,d:c.d,deckY:c.deckY};}),
      anchors:JSON.parse(JSON.stringify(source.anchors||{})),routes:[]};
    bundle.routes=(source.routes||[]).map(function(r){
      var a=source.anchors[r[0]],b=source.anchors[r[1]],res=route(bundle,a,b);
      return {from:r[0],to:r[1],reachable:res.reachable,steps:res.steps};
    });
    bundle.stats={walkableTiles:tileY.filter(function(y){return y!==null;}).length,
      overlayTiles:overlay.filter(Boolean).length,crossings:bundle.crossings.length,
      routesReachable:bundle.routes.filter(function(r){return r.reachable;}).length,routes:bundle.routes.length};
    return bundle;
  }

  function walkable(b,x,z){return x>=0&&z>=0&&x<b.width&&z<b.depth&&b.tileY[tileIndex(b,x,z)]!==null;}
  function canStep(b,x,z,dx,dz){
    if(!walkable(b,x,z)||!walkable(b,x+dx,z+dz))return false;
    return Math.abs(b.tileY[tileIndex(b,x+dx,z+dz)]-b.tileY[tileIndex(b,x,z)])<=b.maxStep;
  }
  // Breadth-first over cardinal steps, exactly the game's rule set; returns the step count.
  function route(b,from,to){
    if(!walkable(b,from[0],from[1])||!walkable(b,to[0],to[1]))return {reachable:false,steps:null};
    var dist=new Int32Array(b.width*b.depth).fill(-1),q=[from],head=0;dist[tileIndex(b,from[0],from[1])]=0;
    var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    while(head<q.length){
      var c=q[head++],d=dist[tileIndex(b,c[0],c[1])];
      if(c[0]===to[0]&&c[1]===to[1])return {reachable:true,steps:d};
      for(var k=0;k<4;k++){
        var nx=c[0]+dirs[k][0],nz=c[1]+dirs[k][1];
        if(!canStep(b,c[0],c[1],dirs[k][0],dirs[k][1]))continue;
        var ni=tileIndex(b,nx,nz);if(dist[ni]>=0)continue;dist[ni]=d+1;q.push([nx,nz]);
      }
    }
    return {reachable:false,steps:null};
  }

  // Walk height at a world point: the covering tile's deck or terrain; null on water or off-map.
  // Terrain tiles return the continuous sampled surface so the player hugs slopes, decks stay flat.
  function walkHeight(b,x,z){
    if(!finite(x)||!finite(z)||x<0||z<0||x>=b.width||z>=b.depth)return null;
    var i=tileIndex(b,Math.floor(x),Math.floor(z)),y=b.tileY[i];
    if(y===null)return null;
    var onDeck=b.crossings.some(function(c){return x>=c.x&&x<c.x+c.w&&z>=c.z&&z<c.z+c.d;});
    return onDeck?y:Base.sample(b.base,x,z);
  }
  function overlayAt(b,x,z){return OVERLAY_NAMES[b.overlay[tileIndex(b,x,z)]];}

  return {compile:compile,route:route,walkHeight:walkHeight,overlayAt:overlayAt,canStep:canStep,
    MAX_STEP:MAX_STEP,OVERLAY:OVERLAY};
})();
if(typeof globalThis!=='undefined')globalThis.HolmV3Terrain=HolmV3Terrain;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV3Terrain;
