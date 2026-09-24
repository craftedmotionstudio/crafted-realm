/* Holm tile house kit (finish goal, step 3): 2004-style buildings from tile data.
 *
 * A house is rooms of whole tiles on one or two levels. Walls stand on tile EDGES, exactly where the
 * game's collision grid stores walls, so what you see is what blocks you. Rooms may join into L and
 * T plans with unequal wings (the owner rejected square shells); each wing carries its own roof.
 *
 * plan(source) is pure and headless-testable: it derives every wall edge, validates openings and
 * proves every room is reachable. build(THREE, plan) (added with the renderer) turns it into meshes,
 * door leaves, colliders, floors and stairs.
 *
 * Source (local tile coordinates; world tile = origin + local):
 *   {schema:'holm-tile-house-v1', id, origin:[x,z], floorY, storeyH,
 *    rooms:[{id, level, x, z, w, d}],
 *    openings:[{level, x, z, side:'N'|'S'|'E'|'W', kind:'door'|'arch'|'window'}],  // an edge of tile (x,z)
 *    stairs:[{id, x, z, fromLevel, toX, toZ}],                                     // climb tile -> landing tile
 *    roofs:[{x, z, w, d, kind:'gable'|'hip', ridge:'x'|'z', rise}]}
 * North is -z, as everywhere in the game.
 */
var HolmTileHouse=(function(){
  'use strict';
  var SIDES={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]};
  var OPP={N:'S',S:'N',E:'W',W:'E'};
  function fail(m){throw new Error('[HolmTileHouse] '+m);}
  function int(n){return Number.isInteger(n);}
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function key(l,x,z){return l+':'+x+','+z;}
  // one canonical id per physical edge, whichever tile names it
  function edgeKey(l,x,z,side){
    if(side==='N') return l+':h:'+x+','+z;       // top edge of (x,z)
    if(side==='S') return l+':h:'+x+','+(z+1);
    if(side==='W') return l+':v:'+x+','+z;       // left edge of (x,z)
    return l+':v:'+(x+1)+','+z;                  // E
  }

  function plan(s){
    if(!s||s.schema!=='holm-tile-house-v1'||typeof s.id!=='string'||!s.id)fail('unsupported source');
    if(!Array.isArray(s.origin)||!int(s.origin[0])||!int(s.origin[1]))fail(s.id+': origin must be integer tiles');
    if(!finite(s.floorY)||!finite(s.storeyH)||s.storeyH<2||s.storeyH>5)fail(s.id+': floorY/storeyH invalid');
    if(!Array.isArray(s.rooms)||!s.rooms.length)fail(s.id+': needs rooms');
    var tiles=Object.create(null),roomIds=Object.create(null),levels=[0];
    s.rooms.forEach(function(r){
      if(!r||typeof r.id!=='string'||roomIds[r.id])fail(s.id+': room ids must be unique strings');
      if(!(r.level===0||r.level===1))fail(s.id+': room '+r.id+' level must be 0 or 1');
      if(![r.x,r.z,r.w,r.d].every(int)||r.w<1||r.d<1||r.w>16||r.d>16)fail(s.id+': room '+r.id+' needs an integer tile rect');
      roomIds[r.id]=r;if(levels.indexOf(r.level)<0)levels.push(r.level);
      for(var z=r.z;z<r.z+r.d;z++)for(var x=r.x;x<r.x+r.w;x++){
        var k=key(r.level,x,z);if(tiles[k])fail(s.id+': rooms '+tiles[k]+' and '+r.id+' overlap at '+k);tiles[k]=r.id;
      }
    });
    // upper rooms must stand on ground-floor rooms (no floating storeys)
    s.rooms.filter(function(r){return r.level===1;}).forEach(function(r){
      for(var z=r.z;z<r.z+r.d;z++)for(var x=r.x;x<r.x+r.w;x++)
        if(!tiles[key(0,x,z)])fail(s.id+': upper room '+r.id+' overhangs at '+x+','+z);
    });

    // walls: every edge between a room tile and a tile that is not the same room
    var edges=Object.create(null);
    Object.keys(tiles).forEach(function(k){
      var l=+k.split(':')[0],xz=k.split(':')[1].split(','),x=+xz[0],z=+xz[1];
      Object.keys(SIDES).forEach(function(side){
        var n=key(l,x+SIDES[side][0],z+SIDES[side][1]);
        if(tiles[n]===tiles[k])return;
        var ek=edgeKey(l,x,z,side);
        if(!edges[ek])edges[ek]={level:l,x:x,z:z,side:side,kind:'wall',exterior:!tiles[n],rooms:[tiles[k]].concat(tiles[n]?[tiles[n]]:[])};
      });
    });

    (s.openings||[]).forEach(function(o,i){
      if(!o||!(o.side in SIDES)||!int(o.x)||!int(o.z)||!(o.level===0||o.level===1))fail(s.id+': opening '+i+' malformed');
      if(['door','arch','window'].indexOf(o.kind)<0)fail(s.id+': opening '+i+' kind must be door, arch or window');
      var e=edges[edgeKey(o.level,o.x,o.z,o.side)];
      if(!e)fail(s.id+': opening '+i+' is not on a wall');
      if(e.kind!=='wall')fail(s.id+': opening '+i+' duplicates another opening');
      if(o.kind==='window'&&!e.exterior)fail(s.id+': window '+i+' must be on an outside wall');
      e.kind=o.kind;
    });

    var stairs=(s.stairs||[]).map(function(st){
      if(!st||typeof st.id!=='string'||![st.x,st.z,st.toX,st.toZ].every(int)||st.fromLevel!==0)fail(s.id+': stair malformed');
      if(!tiles[key(0,st.x,st.z)]||!tiles[key(1,st.toX,st.toZ)])fail(s.id+': stair '+st.id+' must run from a ground room tile to an upper room tile');
      return {id:st.id,x:st.x,z:st.z,toX:st.toX,toZ:st.toZ,from:tiles[key(0,st.x,st.z)],to:tiles[key(1,st.toX,st.toZ)]};
    });

    (s.roofs||[]).forEach(function(r,i){
      if(![r.x,r.z,r.w,r.d].every(int)||r.w<1||r.d<1||['gable','hip'].indexOf(r.kind)<0||['x','z'].indexOf(r.ridge)<0||!finite(r.rise)||r.rise<=0)
        fail(s.id+': roof '+i+' malformed');
    });

    // reachability: flood from outside through exterior doors/arches, across interior doors/arches, up stairs
    var list=Object.keys(edges).map(function(k){return edges[k];});
    var passable=function(e){return e.kind==='door'||e.kind==='arch';};
    var entrances=list.filter(function(e){return e.exterior&&e.level===0&&passable(e);});
    if(!entrances.length)fail(s.id+': no ground-floor door to the outside');
    var reached=Object.create(null),queue=[];
    function visit(l,x,z){var k=key(l,x,z);if(!tiles[k]||reached[k])return;reached[k]=1;queue.push([l,x,z]);}
    entrances.forEach(function(e){visit(0,e.x,e.z);});
    while(queue.length){
      var c=queue.shift(),l=c[0],x=c[1],z=c[2];
      Object.keys(SIDES).forEach(function(side){
        var nx=x+SIDES[side][0],nz=z+SIDES[side][1],e=edges[edgeKey(l,x,z,side)];
        if(!tiles[key(l,nx,nz)])return;
        if(e&&!passable(e))return;
        visit(l,nx,nz);
      });
      stairs.forEach(function(st){if(l===0&&x===st.x&&z===st.z)visit(1,st.toX,st.toZ);});
    }
    var unreached=s.rooms.filter(function(r){return !reached[key(r.level,r.x,r.z)];}).map(function(r){return r.id;});
    if(unreached.length)fail(s.id+': rooms not reachable from the door: '+unreached.join(', '));

    // furniture: inside a room, off the tiles beside every opening and stair, and never cutting a room off
    var blocked=Object.create(null),furniture=(s.furniture||[]).map(function(f,i){
      var w=f.w||1,d=f.d||1,l=f.level||0;
      if(!f||typeof f.kind!=='string'||![f.x,f.z,w,d].every(int)||w<1||d<1||(l!==0&&l!==1))fail(s.id+': furniture '+i+' malformed');
      for(var z=f.z;z<f.z+d;z++)for(var x=f.x;x<f.x+w;x++){
        var k=key(l,x,z);if(!tiles[k])fail(s.id+': furniture '+i+' ('+f.kind+') leaves its room at '+x+','+z);
        if(f.kind!=='rug'){if(blocked[k])fail(s.id+': furniture '+i+' overlaps another piece');blocked[k]=f.kind;}
      }
      return {kind:f.kind,level:l,x:f.x,z:f.z,w:w,d:d,rot:f.rot||0,role:f.role||null};
    });
    list.filter(passable).forEach(function(e){
      var n=SIDES[e.side];[[e.x,e.z],[e.x+n[0],e.z+n[1]]].forEach(function(t){
        if(blocked[key(e.level,t[0],t[1])])fail(s.id+': '+blocked[key(e.level,t[0],t[1])]+' blocks the '+e.kind+' at '+e.x+','+e.z+' '+e.side);});
    });
    stairs.forEach(function(st){
      if(blocked[key(0,st.x,st.z)]||blocked[key(1,st.toX,st.toZ)])fail(s.id+': furniture blocks stair '+st.id);});
    // tile-level flood from the door through clear tiles must touch every room
    var seen=Object.create(null),q2=[];
    function go(l,x,z){var k=key(l,x,z);if(!tiles[k]||blocked[k]||seen[k])return;seen[k]=tiles[k];q2.push([l,x,z]);}
    entrances.forEach(function(e){go(0,e.x,e.z);});
    while(q2.length){
      var t=q2.shift();
      Object.keys(SIDES).forEach(function(side){var e=edges[edgeKey(t[0],t[1],t[2],side)];if(e&&!passable(e))return;go(t[0],t[1]+SIDES[side][0],t[2]+SIDES[side][1]);});
      stairs.forEach(function(st){if(t[0]===0&&t[1]===st.x&&t[2]===st.z)go(1,st.toX,st.toZ);});
    }
    // every clear floor tile must be reachable: furniture may fill a corner but never seal a pocket
    var pockets=Object.keys(tiles).filter(function(k){return !blocked[k]&&!seen[k];});
    if(pockets.length)fail(s.id+': furniture seals off floor tiles: '+pockets.slice(0,6).join(' '));

    return {id:s.id,origin:s.origin.slice(),floorY:s.floorY,storeyH:s.storeyH,
      rooms:s.rooms.map(function(r){return {id:r.id,level:r.level,x:r.x,z:r.z,w:r.w,d:r.d};}),
      edges:list.sort(function(a,b){return a.level-b.level||a.z-b.z||a.x-b.x||(a.side<b.side?-1:a.side>b.side?1:0);}),
      stairs:stairs,roofs:JSON.parse(JSON.stringify(s.roofs||[])),furniture:furniture,
      stats:{tiles:Object.keys(tiles).length,walls:list.filter(function(e){return e.kind==='wall';}).length,
        doors:list.filter(function(e){return e.kind==='door';}).length,windows:list.filter(function(e){return e.kind==='window';}).length,
        levels:levels.length}};
  }
  /* ---------------- rendering + installation (browser only) ----------------
   * 2004 look: plain flat-shaded boxes, no textures; walls one colour with a darker base course and
   * timber corner posts; windows are dark panes in a light frame; roofs are simple two- or four-slope
   * planes with a small overhang. Everything is grouped so the roof and upper storey can lift away. */
  // Grey stone under grey slate, as the Bible reference's tutorial house (self-review 2026-09-24; the first
  // cream-plaster / terracotta pass read as a different game). wall/base/roof colours live in the textures.
  var DEFAULT_PALETTE={wall:'#aaa69c',base:'#817d74',timber:'#5e4127',roof:'#80848a',roofEdge:'#5e6167',
    floor:'#8a6a44',upperFloor:'#7d5f3c',frame:'#d8cfb6',glass:'#27313a',door:'#6b4a2b'};
  var T_WALL=.24;

  /* Our own low-res patterns, drawn once on a 64px canvas (one texture tile = one world unit):
   *   stone: two courses of offset blocks per unit, each block a slightly different grey, dark mortar;
   *   slate: overlapping grey courses with staggered joints and a shadow under each lap. */
  var patterns={};
  function patternTexture(THREE,kind){
    if(patterns[kind])return patterns[kind];
    if(typeof document==='undefined')return null;
    var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d');
    function rnd2(seed){var s=Math.sin(seed*12.9898+4.1)*43758.5453;return s-Math.floor(s);}
    function shade(base,seed){var s=Math.sin(seed*91.7)*43758.5;s-=Math.floor(s);var v=Math.round(base+(s-.5)*22);return 'rgb('+v+','+(v-3)+','+(v-9)+')';}
    // 2004 rework: warmer, darker field stone with irregular course heights, and a darker weathered slate,
    // both with fine speckle so surfaces never read as clean plastic at the gameplay camera.
    if(kind==='stone'){
      x.fillStyle='#4a453e';x.fillRect(0,0,64,64);
      var rows=[0,14,30,46,64];
      for(var row=0;row<4;row++){var y0=rows[row],hh=rows[row+1]-y0,off=(row%2)*11;
        for(var b=-1;b<4;b++){var bw=18+Math.round(rnd2(row*5+b)*8),bx=b*21+off;
          x.fillStyle=shade(138,row*7+b+3);x.fillRect(bx+1,y0+1,bw-2,hh-2);
          x.fillStyle='rgba(255,240,220,.07)';x.fillRect(bx+1,y0+1,bw-2,2);
          x.fillStyle='rgba(0,0,0,.12)';x.fillRect(bx+1,y0+hh-3,bw-2,2);}}
    }else{
      x.fillStyle='#3c3d40';x.fillRect(0,0,64,64);
      for(var r=0;r<4;r++)for(var t=-1;t<5;t++){var ox2=(r%2)*8+t*16;
        x.fillStyle=shade(104,r*11+t);x.fillRect(ox2+1,r*16+1,14,13);
        x.fillStyle='rgba(0,0,0,.3)';x.fillRect(ox2+1,r*16+12,14,3);}
    }
    for(var sp=0;sp<260;sp++){var sx=Math.floor(rnd2(sp*2.3)*64),sy=Math.floor(rnd2(sp*4.1)*64);
      x.fillStyle=rnd2(sp)>.5?'rgba(0,0,0,.14)':'rgba(255,255,255,.07)';x.fillRect(sx,sy,1,1);}
    var tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    return (patterns[kind]=tex);
  }
  // UVs from world position: u runs along the surface, v up it, one texture tile per world unit.
  function worldUV(g,ox,oy,oz,roofMode){
    var pos=g.attributes.position,nrm=g.attributes.normal,uv=[];
    if(!nrm){g.computeVertexNormals();nrm=g.attributes.normal;}
    for(var i=0;i<pos.count;i++){
      var wx=pos.getX(i)+ox,wy=pos.getY(i)+oy,wz=pos.getZ(i)+oz,nx=Math.abs(nrm.getX(i)),nz=Math.abs(nrm.getZ(i));
      if(roofMode)uv.push(wx+wz,wy*1.6);                    // courses level with the eaves
      else uv.push(nx>nz?wz:wx,wy);
    }
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  }

  function build(THREE,p,palette){
    palette=Object.assign({},DEFAULT_PALETTE,palette||{});
    var mats={};function mat(name){
      if(mats[name])return mats[name];
      var tex=(name==='wall'||name==='base')?patternTexture(THREE,'stone'):null;
      return (mats[name]=new THREE.MeshLambertMaterial({color:tex?'#ffffff':palette[name],map:tex,flatShading:true}));
    }
    var ox=p.origin[0],oz=p.origin[1],H=p.storeyH;
    var root=new THREE.Group();root.name='tile-house-'+p.id;
    var ground=new THREE.Group(),upper=new THREE.Group(),roof=new THREE.Group();
    ground.name='ground';upper.name='storey2';roof.name='roof';root.add(ground,upper,roof);
    var colliders=[],doors=[],floors=[],floorMeshes=[];
    function box(parent,w,h,d,x,y,z,m){
      var g=new THREE.BoxGeometry(w,h,d);
      if(m==='wall'||m==='base')worldUV(g,x,y,z,false);   // blocks line up across every wall segment
      var o=new THREE.Mesh(g,mat(m));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
    }
    function levelY(l){return p.floorY+l*H;}

    // floors: ground slab per room; upper slab doubles as the ground-floor ceiling
    p.rooms.forEach(function(r){
      var cx=ox+r.x+r.w/2,cz=oz+r.z+r.d/2,y=levelY(r.level);
      // named 'ground' so a click on the floor walks there; plane-tagged so each storey picks only its own floor
      var slab=box(r.level?upper:ground,r.w,.12,r.d,cx,y-.04,cz,r.level?'upperFloor':'floor');
      slab.name='ground';slab.userData.plane=r.level;floorMeshes.push(slab);
      if(r.level===1) floors.push({plane:1,x:cx,z:cz,hw:r.w/2-.02,hd:r.d/2-.02,y:y+.02});
    });

    p.edges.forEach(function(e){
      var parent=e.level?upper:ground,y0=levelY(e.level),horiz=(e.side==='N'||e.side==='S');
      // world centre of the edge
      var ex=ox+e.x+(e.side==='E'?1:e.side==='W'?0:.5),ez=oz+e.z+(e.side==='S'?1:e.side==='N'?0:.5);
      var lw=horiz?1+T_WALL:T_WALL,ld=horiz?T_WALL:1+T_WALL;
      function segment(h,yc,m){return box(parent,lw,h,ld,ex,yc,ez,m);}
      // thin (.05) so the planner's .42 tile-centre probe never marks the room's edge tiles blocked; the grid
      // still bakes it as a wall on this edge and the walker cannot slide through it
      var col=horiz?{type:'rect',x:ex,z:ez,hw:.5,hd:.05}:{type:'rect',x:ex,z:ez,hw:.05,hd:.5};
      if(e.level)col.plane=1;
      if(e.kind==='wall'){
        segment(.35,y0+.175,'base');segment(H-.35,y0+.35+(H-.35)/2,'wall');colliders.push(col);
      }else if(e.kind==='window'){
        segment(.35,y0+.175,'base');segment(.55,y0+.35+.275,'wall');                 // sill wall
        segment(H-1.75,y0+1.75+(H-1.75)/2,'wall');                                  // lintel wall
        var fw=horiz?.9:.3,fd=horiz?.3:.9;box(parent,fw,.85,fd,ex,y0+1.32,ez,'frame');
        box(parent,horiz?.72:.34,.68,horiz?.34:.72,ex,y0+1.32,ez,'glass');
        colliders.push(col);
      }else{
        // door or arch: posts, lintel, and (door) a hinged leaf that uses the game's door contract
        var lintel=H-2.05;segment(lintel,y0+2.05+lintel/2,'wall');
        [-.46,.46].forEach(function(o){box(parent,horiz?.12:T_WALL+.04,2.05,horiz?T_WALL+.04:.12,ex+(horiz?o:0),y0+1.025,ez+(horiz?0:o),'timber');});
        if(e.kind==='door'&&e.level===0){
          var hinge=new THREE.Group();
          var along=e.side==='S'?0:e.side==='N'?Math.PI:e.side==='E'?Math.PI/2:-Math.PI/2;
          var hx=ex+(horiz?-.42*(e.side==='S'?1:-1):0),hz=ez+(horiz?0:-.42*(e.side==='W'?1:-1));
          hinge.position.set(hx,y0,hz);hinge.rotation.y=along;
          var leaf=new THREE.Mesh(new THREE.BoxGeometry(.84,1.98,.08),mat('door'));leaf.position.set(.42,.99,0);leaf.castShadow=true;hinge.add(leaf);
          var dcol=Object.assign({},col,{door:true});
          hinge.userData={kind:'door',open:false,closedRot:along,openRot:along-1.9,col:dcol,label:'Open <b>Door</b>',tileHouse:p.id};
          parent.add(hinge);doors.push(hinge);
        }
      }
    });

    // timber corner posts on every exterior corner vertex, the one ornament 2004 houses had
    var corners=Object.create(null);
    p.edges.filter(function(e){return e.exterior;}).forEach(function(e){
      var pts=(e.side==='N'||e.side==='S')?[[e.x,e.z+(e.side==='S'?1:0)],[e.x+1,e.z+(e.side==='S'?1:0)]]:[[e.x+(e.side==='E'?1:0),e.z],[e.x+(e.side==='E'?1:0),e.z+1]];
      pts.forEach(function(q){var k=e.level+':'+q;corners[k]=(corners[k]||0)+1;});
    });
    Object.keys(corners).forEach(function(k){
      // a vertex touched by exactly two exterior edges that meet at an angle is a corner; straight runs count 2 as well,
      // so check the geometry: keep only vertices whose two edges are perpendicular
      var l=+k.split(':')[0],q=k.split(':')[1].split(',').map(Number);
      var touching=p.edges.filter(function(e){if(!e.exterior||e.level!==l)return false;
        var horiz=(e.side==='N'||e.side==='S'),ez=e.z+(e.side==='S'?1:0),ex=e.x+(e.side==='E'?1:0);
        return horiz?(ez===q[1]&&(e.x===q[0]||e.x+1===q[0])):(ex===q[0]&&(e.z===q[1]||e.z+1===q[1]));});
      var h=touching.some(function(e){return e.side==='N'||e.side==='S';}),v=touching.some(function(e){return e.side==='E'||e.side==='W';});
      if(h&&v)box(l?upper:ground,.34,H,.34,ox+q[0],levelY(l)+H/2,oz+q[1],'base');   // dressed stone quoins
    });

    // roofs: gable = two slopes + two gable ends, hip = four slopes; overhang .3
    p.roofs.forEach(function(r){
      // eaves sit on the tallest storey under this roof: a single-storey wing keeps a low roof
      var twoStorey=p.rooms.some(function(q){return q.level===1&&q.x<r.x+r.w&&q.x+q.w>r.x&&q.z<r.z+r.d&&q.z+q.d>r.z;});
      var top=p.floorY+H*(twoStorey?2:1),o=.3,x0=ox+r.x-o,x1=ox+r.x+r.w+o,z0=oz+r.z-o,z1=oz+r.z+r.d+o,cx=(x0+x1)/2,cz=(z0+z1)/2,ry=top+r.rise;
      var pos=[];function tri(a,b,c){pos.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);}
      var A=[x0,top,z0],B=[x1,top,z0],C=[x1,top,z1],D=[x0,top,z1];
      if(r.kind==='gable'){
        var R0=r.ridge==='x'?[x0,ry,cz]:[cx,ry,z0],R1=r.ridge==='x'?[x1,ry,cz]:[cx,ry,z1];
        if(r.ridge==='x'){tri(A,R0,R1);tri(A,R1,B);tri(D,C,R1);tri(D,R1,R0);tri(A,D,R0);tri(B,R1,C);}
        else{tri(A,D,R1);tri(A,R1,R0);tri(B,R0,R1);tri(B,R1,C);tri(A,R0,B);tri(D,C,R1);}
      }else{
        var inset=Math.min(x1-x0,z1-z0)/2,H0,H1;
        if(r.ridge==='x'){H0=[x0+inset,ry,cz];H1=[x1-inset,ry,cz];tri(A,H0,H1);tri(A,H1,B);tri(D,C,H1);tri(D,H1,H0);tri(A,D,H0);tri(B,H1,C);}
        else{H0=[cx,ry,z0+inset];H1=[cx,ry,z1-inset];tri(A,D,H1);tri(A,H1,H0);tri(B,H0,H1);tri(B,H1,C);tri(A,H0,B);tri(D,C,H1);}
      }
      var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
      worldUV(g,0,0,0,true);   // slate courses run level on every slope and gable
      var m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:'#ffffff',map:patternTexture(THREE,'slate'),flatShading:true,side:THREE.DoubleSide}));m.castShadow=true;roof.add(m);
      // a thin fascia so the eaves read as a solid edge from the gameplay camera
      [[cx,z0,x1-x0,.08],[cx,z1,x1-x0,.08]].forEach(function(f){box(roof,f[2],.16,f[3],f[0],top-.02,f[1],'roofEdge');});
    });
    // a single-storey wing beside a two-storey block leaves the tall block's upper wall exposed there:
    // that wall is part of the upper storey, already built from the level-1 room edges.

    var minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    p.rooms.forEach(function(r){minX=Math.min(minX,ox+r.x);maxX=Math.max(maxX,ox+r.x+r.w);minZ=Math.min(minZ,oz+r.z);maxZ=Math.max(maxZ,oz+r.z+r.d);});
    return {root:root,ground:ground,upper:upper,roof:roof,colliders:colliders,doors:doors,floors:floors,floorMeshes:floorMeshes,
      bounds:{x:(minX+maxX)/2,z:(minZ+maxZ)/2,hw:(maxX-minX)/2,hd:(maxZ-minZ)/2}};
  }

  // Register a built house with the running game: colliders, doors, upper floors, ladders, roof lift.
  function install(p,b){
    scene.add(b.root);
    b.colliders.forEach(function(c){WORLD.colliders.push(c);});
    b.doors.forEach(function(d){WORLD.clickables.push(d);WORLD.doors=WORLD.doors||[];WORLD.doors.push(d);WORLD.colliders.push(d.userData.col);});
    b.floors.forEach(function(f){Planes.addFloor(f);});
    b.floorMeshes.forEach(function(m){WORLD.clickables.push(m);WORLD.grounds.push(m);});
    var ox=p.origin[0],oz=p.origin[1],climbs=[];
    p.stairs.forEach(function(st){
      var up={plane:1,x:ox+st.toX+.5,z:oz+st.toZ+.5},down={plane:0,x:ox+st.x+.5,z:oz+st.z+.5};
      climbs.push(Planes.addClimb({x:down.x,z:down.z,y:p.floorY,h:p.storeyH,up:up,label:'Climb-up <b>Ladder</b>'}));
      climbs.push(Planes.addClimb({x:up.x,z:up.z,y:p.floorY+p.storeyH,basePlane:1,h:.9,down:down,label:'Climb-down <b>Ladder</b>'}));
    });
    // Ladder rails are thin: a click between the rungs passes through to the ground behind. Each climb gets
    // an invisible (opacity 0, still rendered so picking keeps it) box over its whole silhouette.
    var proxyMat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    climbs.forEach(function(g,i){
      var h=i%2?1.2:p.storeyH+.2,proxy=new THREE.Mesh(new THREE.BoxGeometry(1,h,.8),proxyMat);
      proxy.position.y=h/2;proxy.name='climb-hit-proxy';g.add(proxy);
    });
    if(typeof Planes.refreshVisibility==='function')Planes.refreshVisibility();
    // the existing per-frame roof rule: roof lifts when inside the footprint, storey2 stays for the loft
    WORLD.interiors.push({x:b.bounds.x,z:b.bounds.z,hw:b.bounds.hw,hd:b.bounds.hd,roof:b.roof,storey2:b.upper,tileHouse:p.id});
    if(typeof Planes.addVisibilityRule==='function')Planes.addVisibilityRule(b.upper,function(){return true;});
    if(typeof CollisionGrid!=='undefined'&&CollisionGrid.rebakeArea)CollisionGrid.rebakeArea(b.bounds.x,b.bounds.z,Math.max(b.bounds.hw,b.bounds.hd)+2);
    return {climbs:climbs};
  }
  return {plan:plan,build:build,install:install,SIDES:SIDES,OPP:OPP,PALETTE:DEFAULT_PALETTE};
})();
if(typeof globalThis!=='undefined')globalThis.HolmTileHouse=HolmTileHouse;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmTileHouse;
