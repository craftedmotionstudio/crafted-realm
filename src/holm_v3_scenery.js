/* Tutor's Holm v3 scenery (finish goal, step 3): 2004-style trees, bushes, rocks, fences and a boat.
 * Our own simple shapes: a few flat-shaded low-poly solids each, chunky and readable at the gameplay
 * camera. Placement is data (assets/world/holm_v3/*.scenery.json) in world tiles; heights come from the
 * v3 terrain bundle so nothing floats or sinks. Trees, rocks and the boat block their tile. */
var HolmV3Scenery=(function(){
  'use strict';
  var COL={trunk:'#4a3320',oak:'#566424',oakLight:'#687a2c',pine:'#34502a',bush:'#5e6e26',
    rock:'#8a867c',rockDark:'#6d6a62',fence:'#7a5a2a',fenceLight:'#a07a3a',boat:'#6b4a2b',boatLight:'#8a6438',
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
    x.fillStyle='#9a9a9a';x.fillRect(0,0,64,64);
    for(var i=0;i<140;i++){var px=rnd(i*3.1)*64,py=rnd(i*7.7)*64,r=1.5+rnd(i*1.9)*3.5,v=Math.round(95+rnd(i*5.3)*160);
      x.fillStyle='rgb('+v+','+v+','+v+')';x.beginPath();x.ellipse(px,py,r,r*.6,rnd(i)*3,0,6.283);x.fill();}
    var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);
    return (cache.leafTex=t);
  }
  // A leafy clump: a once-subdivided icosahedron, gently lumpy, each vertex a slightly different green so the
  // crown reads mottled and round like the reference trees rather than a sharp 20-sided gem.
  // Review 2: the references' crowns are dense, lumpy and olive-yellow on top, dark underneath.
  var TOP=new (typeof THREE!=='undefined'?THREE.Color:function(){})('#7c8b35'),UNDER=new (typeof THREE!=='undefined'?THREE.Color:function(){})('#27310f');
  function clump(T,g,r,hex,x,y,z,seed){
    var geo=new T.IcosahedronGeometry(r,2),p=geo.attributes.position,cols=[],base=new T.Color(hex);
    for(var i=0;i<p.count;i++){
      var vx=p.getX(i),vy=p.getY(i),vz=p.getZ(i),len=Math.hypot(vx,vy,vz)||1;
      // lumps: neighbouring vertices share a coarse noise so the silhouette bulges in leaf clusters
      var k=.86+(.5+.5*Math.sin(vx*3.1+seed)*Math.cos(vz*2.7+seed*.7)*Math.sin(vy*2.3+seed*1.3))*.3;
      p.setXYZ(i,vx*k,vy*k*.9,vz*k);
      var up=vy/len,c=base.clone().lerp(up>0?TOP:UNDER,Math.abs(up)*.6).multiplyScalar(.9+rnd(seed*3+i)*.2);
      cols.push(c.r,c.g,c.b);
    }
    geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
    if(!cache.leaf)cache.leaf=new T.MeshLambertMaterial({vertexColors:true,map:leafTexture(T)});   // smooth, as the reference crowns
    var m=new T.Mesh(geo,cache.leaf);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  }
  var MAKERS={
    oak:function(T,g,s){var h=1.9+rnd(s)*.5;
      mesh(T,g,new T.CylinderGeometry(.24,.38,h,8),COL.trunk,0,h/2,0);                       // thick trunk, flared foot
      mesh(T,g,new T.CylinderGeometry(.38,.5,.3,8),COL.trunk,0,.15,0);
      [[.5,.3],[-.45,-.35]].forEach(function(b,i){var br=mesh(T,g,new T.CylinderGeometry(.08,.13,1,6),COL.trunk,b[0]*.6,h-.1,b[1]*.6);br.rotation.z=-b[0]*1.1;br.rotation.x=b[1]*1.1;});
      clump(T,g,1.45+rnd(s+1)*.25,COL.oak,0,h+.9,0,s);
      clump(T,g,1.05,COL.oakLight,.85,h+.75,.35,s+5);clump(T,g,1.0,COL.oak,-.8,h+.8,-.4,s+9);
      clump(T,g,.95,COL.oakLight,.2,h+1.75,-.15,s+13);clump(T,g,.85,COL.oak,-.2,h+.7,.9,s+17);},
    pine:function(T,g,s){var h=.9;mesh(T,g,new T.CylinderGeometry(.13,.18,h,6),COL.trunk,0,h/2,0);
      [[1.05,1.3,h+.5],[.82,1.1,h+1.25],[.55,.9,h+1.9]].forEach(function(c){mesh(T,g,new T.ConeGeometry(c[0],c[1],7),COL.pine,0,c[2],0);});},
    bush:function(T,g,s){clump(T,g,.6+rnd(s)*.12,COL.bush,0,.42,0,s);clump(T,g,.42,COL.oakLight,.35,.55,.15,s+3);clump(T,g,.38,COL.bush,-.3,.45,-.2,s+7);},
    flowers:function(T,g,s){[COL.flowerA,COL.flowerB,COL.flowerC].forEach(function(c,i){
      for(var k=0;k<3;k++){var a=(i*3+k)*2.1+s,r=.18+rnd(s+i+k)*.22;mesh(T,g,new T.BoxGeometry(.08,.08,.08),c,Math.cos(a)*r,.2,Math.sin(a)*r);
        mesh(T,g,new T.BoxGeometry(.03,.18,.03),COL.bush,Math.cos(a)*r,.09,Math.sin(a)*r);}});},
    // review-3 detail pass: the references' ground is dotted with star flowers, ferns, crates, barrels,
    // benches, stumps, logs and signposts. Our own simple shapes for each.
    starflower:function(T,g,s){var col=['#4f7fd0','#6f9be0','#e8e6f0'][Math.floor(rnd(s)*3)];
      for(var k=0;k<3;k++){var a=k*2.1+s,r=k?.18:0,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.35+rnd(s+k)*.2;
        mesh(T,g,new T.CylinderGeometry(.02,.025,h,4),'#3f6a26',x,h/2,z);
        for(var p=0;p<5;p++){var pa=p*1.2566,pt=mesh(T,g,new T.BoxGeometry(.06,.02,.16),col,x+Math.cos(pa)*.07,h,z+Math.sin(pa)*.07);pt.rotation.y=-pa;}
        mesh(T,g,new T.BoxGeometry(.05,.04,.05),'#e0c040',x,h+.01,z);}},
    daisies:function(T,g,s){for(var k=0;k<6;k++){var a=k*1.7+s,r=.1+rnd(s+k)*.28;
      mesh(T,g,new T.BoxGeometry(.1,.03,.1),'#f0eee4',Math.cos(a)*r,.12,Math.sin(a)*r);mesh(T,g,new T.BoxGeometry(.04,.035,.04),'#e2c23a',Math.cos(a)*r,.13,Math.sin(a)*r);}},
    fern:function(T,g,s){for(var i=0;i<8;i++){var a=i*.785+s,l=mesh(T,g,new T.BoxGeometry(.12,.04,.7),'#557a2a',Math.cos(a)*.25,.22,Math.sin(a)*.25);
      l.rotation.y=-a+Math.PI/2;l.rotation.x=-.5;}},
    crate:function(T,g,s){mesh(T,g,new T.BoxGeometry(.8,.7,.8),'#9a7440',0,.35,0);
      [-.36,.36].forEach(function(o){mesh(T,g,new T.BoxGeometry(.84,.1,.1),'#6e5226',0,.35,o);mesh(T,g,new T.BoxGeometry(.1,.74,.84),'#6e5226',o,.35,0);});
      if(rnd(s)>.5)mesh(T,g,new T.BoxGeometry(.6,.5,.6),'#8a6a3a',.05,.95,.05);},
    barrel:function(T,g){mesh(T,g,new T.CylinderGeometry(.36,.36,.9,10),'#7a5530',0,.45,0);
      [.15,.75].forEach(function(y){mesh(T,g,new T.CylinderGeometry(.375,.375,.07,10),'#3d3d40',0,y,0);});mesh(T,g,new T.CylinderGeometry(.34,.34,.02,10),'#5e4127',0,.91,0);},
    bench:function(T,g){mesh(T,g,new T.BoxGeometry(1.8,.1,.45),'#8a6a3a',0,.46,0);[-.75,.75].forEach(function(x){mesh(T,g,new T.BoxGeometry(.12,.45,.4),'#6e5226',x,.22,0);});
      mesh(T,g,new T.BoxGeometry(1.8,.4,.08),'#7a5a30',0,.75,-.2);},
    stump:function(T,g){mesh(T,g,new T.CylinderGeometry(.34,.44,.45,9),COL.trunk,0,.22,0);mesh(T,g,new T.CylinderGeometry(.32,.32,.02,9),'#b08a55',0,.46,0);},
    log:function(T,g){var l=mesh(T,g,new T.CylinderGeometry(.22,.24,2,8),COL.trunk,0,.22,0);l.rotation.z=Math.PI/2;
      [-1,1].forEach(function(e){var c=mesh(T,g,new T.CylinderGeometry(.2,.2,.02,8),'#b08a55',e*1.005,.22,0);c.rotation.z=Math.PI/2;});},
    signpost:function(T,g){mesh(T,g,new T.BoxGeometry(.14,1.6,.14),'#6e5226',0,.8,0);
      var b=mesh(T,g,new T.BoxGeometry(.9,.26,.06),'#a07a3a',.3,1.35,0);var b2=mesh(T,g,new T.BoxGeometry(.8,.24,.06),'#a07a3a',-.25,1.05,0);b2.rotation.y=.4;},
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
  var BLOCKS={oak:.45,pine:.4,rock:.45,boat:1,crate:.45,barrel:.4,bench:.45,stump:.4,log:.45,signpost:.2};

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
