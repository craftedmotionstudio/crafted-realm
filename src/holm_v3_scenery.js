/* Tutor's Holm v3 scenery (finish goal, step 3): 2004-style trees, bushes, rocks, fences and a boat.
 * Our own simple shapes: a few flat-shaded low-poly solids each, chunky and readable at the gameplay
 * camera. Placement is data (assets/world/holm_v3/*.scenery.json) in world tiles; heights come from the
 * v3 terrain bundle so nothing floats or sinks. Trees, rocks and the boat block their tile. */
var HolmV3Scenery=(function(){
  'use strict';
  var COL={trunk:'#5a3d22',oak:'#3f6b25',oakLight:'#4d7c2d',pine:'#2f5a2a',bush:'#44722a',
    rock:'#8a867c',rockDark:'#6d6a62',fence:'#6a4a2a',fenceLight:'#80603a',boat:'#6b4a2b',boatLight:'#8a6438',
    flowerA:'#d8c24a',flowerB:'#c9543f',flowerC:'#e8e2d0'};
  var cache={};
  function mat(T,c){return cache[c]||(cache[c]=new T.MeshLambertMaterial({color:c,flatShading:true}));}
  function mesh(T,g,geo,c,x,y,z){var m=new T.Mesh(geo,mat(T,c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
  // deterministic per-placement variety (no Math.random, so every load looks the same)
  function rnd(seed){var s=Math.sin(seed*12.9898)*43758.5453;return s-Math.floor(s);}

  // 2004 trees carried a small dappled leaf texture: our own 64px pattern of overlapping leaf blobs, mostly
  // light-on-dark so the vertex colour still sets the tree's overall green.
  function leafTexture(T){
    if(cache.leafTex||typeof document==='undefined')return cache.leafTex||null;
    var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');
    x.fillStyle='#c4c4c4';x.fillRect(0,0,64,64);
    for(var i=0;i<90;i++){var px=rnd(i*3.1)*64,py=rnd(i*7.7)*64,r=2+rnd(i*1.9)*4,v=Math.round(165+rnd(i*5.3)*90);
      x.fillStyle='rgb('+v+','+v+','+v+')';x.beginPath();x.ellipse(px,py,r,r*.6,rnd(i)*3,0,6.283);x.fill();}
    var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);
    return (cache.leafTex=t);
  }
  // A leafy clump: a once-subdivided icosahedron, gently lumpy, each vertex a slightly different green so the
  // crown reads mottled and round like the reference trees rather than a sharp 20-sided gem.
  function clump(T,g,r,hex,x,y,z,seed){
    var geo=new T.IcosahedronGeometry(r,1),p=geo.attributes.position,cols=[],base=new T.Color(hex);
    for(var i=0;i<p.count;i++){
      var k=.9+rnd(seed+i*.37)*.2;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.92,p.getZ(i)*k);
      // olive, not lime, under the game sun
      var c=base.clone().multiplyScalar(.95+rnd(seed*3+i)*.35+(p.getY(i)>0?.1:-.1));cols.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
    if(!cache.leaf)cache.leaf=new T.MeshLambertMaterial({vertexColors:true,flatShading:true,map:leafTexture(T)});
    var m=new T.Mesh(geo,cache.leaf);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  }
  var MAKERS={
    oak:function(T,g,s){var h=1.7+rnd(s)*.5;mesh(T,g,new T.CylinderGeometry(.17,.26,h,7),COL.trunk,0,h/2,0);
      clump(T,g,1.25+rnd(s+1)*.25,COL.oak,0,h+.75,0,s);
      clump(T,g,.85,COL.oakLight,.6,h+1.15,.25,s+5);clump(T,g,.8,COL.oak,-.55,h+1.05,-.35,s+9);clump(T,g,.7,COL.oakLight,.1,h+1.6,-.1,s+13);},
    pine:function(T,g,s){var h=.9;mesh(T,g,new T.CylinderGeometry(.13,.18,h,6),COL.trunk,0,h/2,0);
      [[1.05,1.3,h+.5],[.82,1.1,h+1.25],[.55,.9,h+1.9]].forEach(function(c){mesh(T,g,new T.ConeGeometry(c[0],c[1],7),COL.pine,0,c[2],0);});},
    bush:function(T,g,s){clump(T,g,.5+rnd(s)*.12,COL.bush,0,.36,0,s);clump(T,g,.34,COL.oakLight,.28,.48,.1,s+3);},
    flowers:function(T,g,s){[COL.flowerA,COL.flowerB,COL.flowerC].forEach(function(c,i){
      for(var k=0;k<3;k++){var a=(i*3+k)*2.1+s,r=.18+rnd(s+i+k)*.22;mesh(T,g,new T.BoxGeometry(.08,.08,.08),c,Math.cos(a)*r,.2,Math.sin(a)*r);
        mesh(T,g,new T.BoxGeometry(.03,.18,.03),COL.bush,Math.cos(a)*r,.09,Math.sin(a)*r);}});},
    rock:function(T,g,s){var r=mesh(T,g,new T.DodecahedronGeometry(.55+rnd(s)*.2,0),COL.rock,0,.28,0);r.scale.set(1,.65,.85);r.rotation.y=rnd(s+2)*3;
      mesh(T,g,new T.DodecahedronGeometry(.28,0),COL.rockDark,.4,.12,.25);},
    boat:function(T,g){ // a clinker rowboat hauled up on the sand, tilted a touch on its keel
      var hull=new T.Group();g.add(hull);hull.rotation.z=.12;
      mesh(T,hull,new T.BoxGeometry(2.6,.34,.9),COL.boat,0,.2,0);
      [-1,1].forEach(function(s){mesh(T,hull,new T.BoxGeometry(2.7,.36,.08),COL.boatLight,0,.42,s*.47);});
      [-1,1].forEach(function(s){mesh(T,hull,new T.BoxGeometry(.08,.36,.9),COL.boatLight,s*1.32,.42,0);});
      mesh(T,hull,new T.BoxGeometry(.2,.06,.86),COL.boatLight,.2,.46,0);
      mesh(T,g,new T.BoxGeometry(2.2,.05,.1),COL.fenceLight,.3,.12,.9);}   // an oar left on the sand
  };
  var BLOCKS={oak:.45,pine:.4,rock:.45,boat:1};

  // fence: posts on tile corners, two rails along each tile edge, following the ground
  function fence(T,g,run,heightAt){
    var pts=run.points;
    for(var i=1;i<pts.length;i++){
      var a=pts[i-1],b=pts[i],dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]);
      for(var x=a[0],z=a[1];x!==b[0]||z!==b[1];x+=dx,z+=dz){
        var nx=x+dx,nz=z+dz,ya=heightAt(x,z),yb=heightAt(nx,nz);
        mesh(T,g,new T.BoxGeometry(.14,.9,.14),COL.fence,x,ya+.45,z);
        [.35,.72].forEach(function(h){
          var len=Math.hypot(1,yb-ya),rail=mesh(T,g,new T.BoxGeometry(dx?len:.07,.07,dz?len:.07),COL.fenceLight,(x+nx)/2,(ya+yb)/2+h,(z+nz)/2);
          if(dx)rail.rotation.z=Math.atan2(yb-ya,1)*dx;else rail.rotation.x=-Math.atan2(yb-ya,1)*dz;
        });
      }
      if(i===pts.length-1)mesh(T,g,new T.BoxGeometry(.14,.9,.14),COL.fence,b[0],heightAt(b[0],b[1])+.45,b[1]);
    }
    // fences stand on tile edges: one thin rect collider per edge so the grid bakes a wall edge
    var cols=[];
    for(var j=1;j<pts.length;j++){var p=pts[j-1],q=pts[j];
      cols.push(p[1]===q[1]?{type:'rect',x:(p[0]+q[0])/2,z:p[1],hw:Math.abs(q[0]-p[0])/2,hd:.05}:{type:'rect',x:p[0],z:(p[1]+q[1])/2,hw:.05,hd:Math.abs(q[1]-p[1])/2});}
    return cols;
  }

  function build(T,data,heightAt){
    var g=new T.Group();g.name='holm-v3-scenery-'+(data.id||'set');var colliders=[];
    (data.items||[]).forEach(function(it,i){
      var maker=MAKERS[it.kind];if(!maker)throw new Error('[HolmV3Scenery] unknown kind '+it.kind);
      var x=it.x+.5,z=it.z+.5,y=heightAt(x,z);if(y===null)throw new Error('[HolmV3Scenery] '+it.kind+' '+i+' stands on water at '+it.x+','+it.z);
      var piece=new T.Group();piece.position.set(x,y,z);piece.rotation.y=(it.rot||rnd(i+it.x)*6.28);maker(T,piece,i+it.x*7+it.z*13);g.add(piece);
      if(BLOCKS[it.kind])colliders.push({type:'circle',x:x,z:z,r:BLOCKS[it.kind]});
    });
    (data.fences||[]).forEach(function(run){colliders=colliders.concat(fence(T,g,run,function(x,z){return heightAt(x,z)||0;}));});
    return {group:g,colliders:colliders};
  }
  return {build:build,kinds:Object.keys(MAKERS)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV3Scenery;
