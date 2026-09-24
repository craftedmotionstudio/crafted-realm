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
  function pineTier(T,r,h,seed,i){
    var n=14,pos=[],col=[],uv=[],inner=new T.Color('#1f3a1c'),outer=new T.Color('#4f7a36');
    var apex=[0,h,0],rim=[];
    for(var k=0;k<=n;k++){var a=k/n*6.2832+i*.4,rr=r*(k%2?.78:1)*(.92+rnd(seed+k)*.16),droop=-(k%2?.12:.3)-rnd(seed*2+k)*.1;
      rim.push([Math.cos(a)*rr,droop,Math.sin(a)*rr]);}
    for(k=0;k<n;k++){var p=rim[k],q=rim[k+1];
      [apex,q,p].forEach(function(v,j){pos.push(v[0],v[1],v[2]);var c=(j?outer:inner).clone().multiplyScalar(.85+rnd(seed+k*3+j)*.3);col.push(c.r,c.g,c.b);});
      uv.push(.5,1,(k+1)/n,0,k/n,0);}
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
    if(!cache.needle)cache.needle=new T.MeshLambertMaterial({vertexColors:true,map:leafTexture(T),side:T.DoubleSide,flatShading:true});
    var m=new T.Mesh(geo,cache.needle);m.castShadow=true;m.rotation.y=i*.35;return m;
  }
  // Rowboat hull built from station rings along its length: pointed bow, raked stern, flared sides and a keel,
  // coloured in alternating planking strakes. Our own shape.
  function hull(T){
    var st=9,pos=[],col=[],rings=[],light=new T.Color('#8a6438'),dark=new T.Color('#6b4a2b'),inside=new T.Color('#5a3f25');
    for(var i=0;i<=st;i++){var u=i/st*2-1,w=.55*(1-Math.pow(Math.abs(u),u>0?1.6:3)),x=u*1.45,keel=.04+Math.pow(Math.abs(u),2)*.28;
      rings.push([[x,.46+Math.abs(u)*.1,-w],[x,.24,-w*.92],[x,keel,0],[x,.24,w*.92],[x,.46+Math.abs(u)*.1,w]]);}
    for(i=0;i<st;i++)for(var j=0;j<4;j++){var a=rings[i][j],b=rings[i][j+1],c=rings[i+1][j+1],d=rings[i+1][j],cc=(j===0||j===3)?light:dark;
      [[a,b,c],[a,c,d]].forEach(function(tri){tri.forEach(function(v){pos.push(v[0],v[1],v[2]);col.push(cc.r,cc.g,cc.b);});});}
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();
    var m=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,flatShading:true}));m.castShadow=true;return m;
  }
  var MAKERS={
    // review 5: more detail - root flares, a leaning bark-streaked trunk, visible limbs into the crown, and a
    // crown of seven clusters in two tones with a darker core, so every oak has its own silhouette.
    oak:function(T,g,s){var h=1.9+rnd(s)*.5,lean=(rnd(s+4)-.5)*.12;
      var tr=mesh(T,g,new T.CylinderGeometry(.22,.36,h,9),COL.trunk,0,h/2,0);tr.rotation.z=lean;
      for(var sk=0;sk<4;sk++){var a0=sk*1.57+s;mesh(T,g,new T.BoxGeometry(.05,h*.8,.04),'#3a2718',Math.cos(a0)*.3,h*.42,Math.sin(a0)*.3).rotation.y=-a0;}   // bark streaks
      for(var rf=0;rf<4;rf++){var a1=rf*1.57+s*.7+.4,root=mesh(T,g,new T.BoxGeometry(.5,.22,.18),COL.trunk,Math.cos(a1)*.36,.1,Math.sin(a1)*.36);root.rotation.y=-a1;root.rotation.z=.35;}
      [[.55,.35,1.1],[-.5,-.3,1.0],[.1,-.6,.9]].forEach(function(b){var br=mesh(T,g,new T.CylinderGeometry(.07,.13,b[2],6),COL.trunk,b[0]*.55,h+.1,b[1]*.55);br.rotation.z=-b[0]*1.2;br.rotation.x=b[1]*1.2;});
      clump(T,g,1.1,'#3e4a1c',0,h+1.0,0,s+2);                                                                       // dark core
      clump(T,g,1.4+rnd(s+1)*.25,COL.oak,0,h+1.05,0,s);
      clump(T,g,1.05,COL.oakLight,.95,h+.8,.4,s+5);clump(T,g,1.0,COL.oak,-.9,h+.85,-.45,s+9);
      clump(T,g,.95,COL.oakLight,.25,h+1.85,-.2,s+13);clump(T,g,.9,COL.oak,-.25,h+.75,1.0,s+17);
      clump(T,g,.8,COL.oakLight,.6,h+1.45,-.85,s+21);clump(T,g,.75,COL.oak,-.75,h+1.5,.55,s+25);},
    // Owner review 5: the pines "look like a child drew them". Rebuilt as five drooping branch tiers: each a
    // 14-segment skirt whose rim is ragged (alternate long/short fronds) and pulled down at the tips, darker at
    // the trunk and lighter at the tips, with the leaf texture, turned against the tier below.
    pine:function(T,g,s){var h=1.1;mesh(T,g,new T.CylinderGeometry(.12,.24,h+3.2,7),COL.trunk,0,(h+3.2)/2,0);
      [[1.55,.95,h+.35],[1.3,.85,h+1.05],[1.05,.78,h+1.7],[.8,.7,h+2.3],[.5,.72,h+2.85]].forEach(function(t,i){
        var tier=pineTier(T,t[0],t[1],s+i*3,i);tier.position.y=t[2];g.add(tier);});},
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
    // ferns: arching fronds, each a spine with paired leaflets shrinking toward the tip
    fern:function(T,g,s){for(var i=0;i<9;i++){var a=i*.698+s,fr=new T.Group();fr.rotation.y=-a;g.add(fr);
      for(var k=0;k<7;k++){var t=k/7,x=.08+t*.62,y=.1+Math.sin(t*2.6)*.32,len=.2*(1-t*.75);
        mesh(T,fr,new T.BoxGeometry(.1,.025,.03),'#3f6424',x,y,0);
        [-1,1].forEach(function(sd){var lf=mesh(T,fr,new T.BoxGeometry(.05,.02,len),k%2?'#5f8a30':'#527a2a',x,y,sd*len/2);lf.rotation.x=sd*.35;});}}},
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
    boat:function(T,g){ // owner review 5: the boat was "super blocky". A shaped clinker hull hauled up on the sand
      var b=new T.Group();g.add(b);b.rotation.z=.1;b.add(hull(T));
      [[-.35,.42],[.4,.42]].forEach(function(t){mesh(T,b,new T.BoxGeometry(.16,.05,.95),'#9a7440',t[0],t[1],0);});   // thwarts (seats)
      mesh(T,b,new T.BoxGeometry(.08,.34,.08),'#5a3f25',1.43,.55,0);                                                  // stem post at the bow
      mesh(T,b,new T.BoxGeometry(.06,.3,.62),'#6b4a2b',-1.42,.5,0);                                                    // transom
      [-1,1].forEach(function(sd){var oar=new T.Group();oar.position.set(.1,.52,sd*.5);oar.rotation.y=sd*.18;b.add(oar);   // oars resting in the boat
        mesh(T,oar,new T.CylinderGeometry(.035,.035,2.2,6),'#a07a3a',0,0,0).rotation.z=Math.PI/2;mesh(T,oar,new T.BoxGeometry(.5,.03,.16),'#8a6438',1.2,0,0);});
      mesh(T,g,new T.TorusGeometry(.22,.04,5,10),'#b8a070',-1.9,.05,.4).rotation.x=Math.PI/2;                        // a coil of rope on the sand
      mesh(T,g,new T.CylinderGeometry(.08,.1,.5,6),'#6b4a2b',-2.05,.25,-.1);},                                         // mooring stake
    // Owner review 5: the references have "unique statues that were designed". Ours, our own design: the Lantern
    // Keeper, the Holm's first guide, in a hooded travelling cloak with a staff, lifting a lantern toward the
    // landing. Weathered grey stone on a three-step plinth with a bronze plaque, moss in the joints and a
    // lamp that still glows.
    statue:function(T,g){var S='#827e72',Sd='#646056',Sl='#96928a',moss='#5a6a2a';
      [[1.5,.22,0,Sd],[1.2,.24,.22,S],[.95,.9,.46,Sl]].forEach(function(t){mesh(T,g,new T.BoxGeometry(t[0],t[1],t[0]),t[3],0,t[2]+t[1]/2,0);});   // steps + die
      mesh(T,g,new T.BoxGeometry(1.05,.1,1.05),S,0,1.41,0);mesh(T,g,new T.BoxGeometry(.98,.08,.98),Sd,0,.5,0);                                        // cap + base mouldings
      mesh(T,g,new T.BoxGeometry(.56,.34,.03),'#8a6a2a',0,.9,.49);mesh(T,g,new T.BoxGeometry(.48,.26,.035),'#b08a3a',0,.9,.49);                      // plaque
      [-.14,-.05,.04,.13].forEach(function(x,i){mesh(T,g,new T.BoxGeometry(.06,.02,.04),'#5a4418',x,.95-(i%2)*.02,.5);});                             // raised letters
      [[-.6,.6],[.6,-.6],[.62,.58]].forEach(function(m){mesh(T,g,new T.BoxGeometry(.22,.06,.14),moss,m[0],.24,m[1]);});                               // moss on the step
      var f=new T.Group();f.position.y=1.46;g.add(f);
      mesh(T,f,new T.CylinderGeometry(.17,.36,1.15,9),S,0,.58,0);                        // cloak falling to the feet
      mesh(T,f,new T.CylinderGeometry(.22,.24,.06,9),Sd,0,.72,0);                        // belt
      mesh(T,f,new T.BoxGeometry(.3,.1,.14),Sd,0,.05,.26);                               // feet under the hem
      mesh(T,f,new T.CylinderGeometry(.14,.2,.42,9),S,0,1.3,0);                          // chest + shoulders
      var cape=mesh(T,f,new T.BoxGeometry(.5,1.2,.08),Sd,0,.85,-.2);cape.rotation.x=.12;  // cloak back
      mesh(T,f,new T.SphereGeometry(.15,8,6),Sl,0,1.66,.02);                             // head
      mesh(T,f,new T.BoxGeometry(.16,.14,.08),S,0,1.56,.12);                             // beard
      var hood=mesh(T,f,new T.ConeGeometry(.21,.36,8),Sd,0,1.8,-.04);hood.rotation.x=-.3; // hood
      // right arm raised with the lantern
      var ra=mesh(T,f,new T.CylinderGeometry(.06,.07,.55,6),S,.28,1.62,.05);ra.rotation.z=-.5;
      mesh(T,f,new T.BoxGeometry(.04,.14,.04),Sd,.42,1.97,.05);                          // bail
      mesh(T,f,new T.BoxGeometry(.18,.04,.18),'#4a4a44',.42,1.9,.05);                    // lantern cap
      mesh(T,f,new T.BoxGeometry(.14,.18,.14),'#e8c860',.42,1.79,.05);                  // glowing pane
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){mesh(T,f,new T.BoxGeometry(.025,.2,.025),'#4a4a44',.42+c[0]*.075,1.79,.05+c[1]*.075);});
      mesh(T,f,new T.BoxGeometry(.18,.04,.18),'#4a4a44',.42,1.68,.05);
      if(T.PointLight){var lamp=new T.PointLight('#ffd27a',.5,4);lamp.position.set(.42,1.79,.05);f.add(lamp);}
      // left arm down on a tall staff
      var la=mesh(T,f,new T.CylinderGeometry(.06,.07,.55,6),S,-.25,1.12,.08);la.rotation.z=.25;
      mesh(T,f,new T.CylinderGeometry(.03,.035,1.9,6),Sd,-.36,.95,.14);
      mesh(T,f,new T.SphereGeometry(.06,6,4),Sd,-.36,1.92,.14);}
  };
  var BLOCKS={oak:.45,pine:.4,rock:.45,boat:1,crate:.45,barrel:.4,bench:.45,stump:.4,log:.45,signpost:.2,statue:.5};

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
      // review 4: the reference trees are big and fill the view; the trunk footprint (collider) stays one tile
      if(it.kind==='oak'||it.kind==='pine')piece.scale.setScalar(it.scale||(1.3+rnd(i*1.7+it.z)*.25));
      if(BLOCKS[it.kind])colliders.push({type:'circle',x:x,z:z,r:BLOCKS[it.kind]});
    });
    (data.fences||[]).forEach(function(run){colliders=colliders.concat(fence(T,g,run,function(x,z){return heightAt(x,z)||0;}));});
    return {group:g,colliders:colliders};
  }
  return {build:build,kinds:Object.keys(MAKERS)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV3Scenery;
