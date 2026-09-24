/* Holm tile furniture (finish goal, step 3): simple 2004-style props, our own designs.
 * Every piece is a few flat-shaded boxes/cylinders, one tile (or a small tile rect), standing on the
 * floor of a tile-house level. Solid pieces add a collider over their tiles so the pathfinder walks
 * round them, as 2004 furniture blocked its tile. Pure builder + one install helper. */
var HolmTileFurniture=(function(){
  'use strict';
  var C={wood:'#6e4a2a',woodLight:'#8c6238',woodDark:'#4a311c',stone:'#8a857a',stoneDark:'#5f5b53',
    cloth:'#8e2f2a',clothLight:'#b8a36a',paper:'#d9cfae',iron:'#3d3d40',fire:'#f08a24',ember:'#ffcf5a',
    straw:'#c9a95a',map:'#6f8c4a',sea:'#3f6a93'};
  var cache={};
  function mat(THREE,c,emissive){var k=c+(emissive||'');return cache[k]||(cache[k]=new THREE.MeshLambertMaterial({color:c,flatShading:true,emissive:emissive||'#000000'}));}
  function box(THREE,g,w,h,d,x,y,z,c,e){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(THREE,c,e));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  function cyl(THREE,g,r,h,x,y,z,c,seg){var m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||8),mat(THREE,c));m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}

  // Each maker builds around (0,0,0) = centre of its footprint at floor level; w/d in tiles.
  var MAKERS={
    table:function(T,g,w,d){box(T,g,w-.1,.1,d-.2,0,.74,0,C.woodLight);[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s){box(T,g,.1,.7,.1,s[0]*(w/2-.15),.35,s[1]*(d/2-.2),C.wood);});},
    bench:function(T,g,w,d){box(T,g,w-.1,.08,.36,0,.44,0,C.wood);[-1,1].forEach(function(s){box(T,g,.08,.42,.3,s*(w/2-.15),.21,0,C.woodDark);});},
    chart:function(T,g,w,d){ // the relief chart: a low table with a painted island on it (study_route lesson)
      MAKERS.table(T,g,w,d);box(T,g,w-.3,.04,d-.4,0,.81,0,C.sea);
      box(T,g,(w-.3)*.6,.06,(d-.4)*.55,-.1,.84,.05,C.map);box(T,g,.18,.14,.18,.2,.88,-.05,C.stone);},
    hearth:function(T,g,w,d){box(T,g,w,1.3,.5,0,.65,-d/2+.25,C.stone);box(T,g,w-.6,.75,.3,0,.4,-d/2+.42,C.stoneDark);
      box(T,g,w+.1,.14,.62,0,1.34,-d/2+.3,C.stoneDark);box(T,g,.5,1.6,.45,0,2.05,-d/2+.22,C.stone);
      box(T,g,.34,.12,.12,-.05,.18,-d/2+.45,C.woodDark);box(T,g,.3,.24,.14,0,.28,-d/2+.47,C.fire,C.fire);},
    bookcase:function(T,g,w,d){box(T,g,w-.1,1.9,.34,0,.95,-d/2+.2,C.wood);
      [.45,.95,1.45].forEach(function(y,i){for(var b=0;b<5;b++)box(T,g,.14,.34,.24,-w/2+.25+b*((w-.5)/4),y+.18,-d/2+.26,[C.cloth,C.clothLight,'#3f5a7a','#5b6b3a'][(b+i)%4]);});},
    bed:function(T,g,w,d){box(T,g,w-.1,.36,d-.1,0,.18,0,C.wood);box(T,g,w-.2,.14,d-.3,0,.42,.05,C.clothLight);
      box(T,g,w-.2,.12,(d-.3)*.55,0,.5,.15,C.cloth);box(T,g,w-.1,.7,.1,0,.35,-d/2+.05,C.woodDark);box(T,g,.5,.1,.3,0,.52,-d/2+.3,C.paper);},
    chest:function(T,g,w,d){box(T,g,w-.3,.5,d-.5,0,.25,0,C.wood);box(T,g,w-.28,.1,d-.48,0,.55,0,C.woodDark);box(T,g,.12,.16,.04,0,.4,(d-.5)/2+.02,C.iron);},
    barrel:function(T,g){cyl(T,g,.34,.8,0,.4,0,C.wood,10);[.15,.65].forEach(function(y){cyl(T,g,.355,.06,0,y,0,C.iron,10);});},
    crate:function(T,g){box(T,g,.72,.66,.72,0,.33,0,C.woodLight);box(T,g,.74,.08,.74,0,.62,0,C.wood);},
    rug:function(T,g,w,d){box(T,g,w-.2,.02,d-.2,0,.01,0,C.cloth);box(T,g,w-.6,.025,d-.6,0,.012,0,C.clothLight);},
    rack:function(T,g,w,d){ // the provisions rack: pegs with the starter tools hung on it
      box(T,g,w-.1,1.5,.12,0,.75,-d/2+.1,C.wood);[.5,1.1].forEach(function(y){box(T,g,w-.2,.06,.2,0,y,-d/2+.2,C.woodDark);});
      box(T,g,.08,.5,.08,-.3,.8,-d/2+.3,C.woodLight);box(T,g,.26,.12,.06,-.3,1.02,-d/2+.3,C.iron);box(T,g,.3,.3,.1,.3,.85,-d/2+.3,C.straw);}
  };
  var SOLID={table:1,chart:1,hearth:1,bookcase:1,bed:1,chest:1,barrel:1,crate:1,bench:1,rack:1,rug:0};

  // place one piece: item {kind, x, z, w, d, rot} in the house's local tiles on a level
  function build(THREE,house,item){
    if(!MAKERS[item.kind])throw new Error('[HolmTileFurniture] unknown piece '+item.kind);
    var w=item.w||1,d=item.d||1,g=new THREE.Group();g.name='furniture-'+item.kind;
    MAKERS[item.kind](THREE,g,w,d);
    var level=item.level||0,y=house.floorY+level*house.storeyH;
    g.position.set(house.origin[0]+item.x+w/2,y,house.origin[1]+item.z+d/2);
    g.rotation.y=(item.rot||0)*Math.PI/2;
    var collider=SOLID[item.kind]?{type:'rect',x:g.position.x,z:g.position.z,hw:w/2-.08,hd:d/2-.08}:null;
    if(collider&&level)collider.plane=level;
    return {group:g,collider:collider,level:level};
  }
  return {build:build,kinds:Object.keys(MAKERS)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmTileFurniture;
