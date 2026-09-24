/* Tutor's Holm v3 terrain renderer: the 2004 RuneScape look.
 * - Underlay: every lattice vertex takes its ground colour, so colours blend smoothly across tiles
 *   (RS2 underlays), with a small deterministic lightness jitter so fields never read as flat paint.
 * - Overlay: path tiles are drawn with their own vertices in one flat colour, giving the crisp
 *   road edges 2004 tiles had.
 * - Lighting: Lambert with flat-shaded faces; no textures.
 * Pure builder: returns meshes, owns no scene state. */
var HolmV3Render=(function(){
  'use strict';
  // 2004-leaning palette: saturated but warm, readable at the gameplay camera.
  // Tuned in the pane under the game's sun: the first grass (#5c8a32) read lime, not 2004 meadow.
  var UNDERLAY=['#b59f60',   // 0 sand
                '#46702a',   // 1 grass
                '#7a7566',   // 2 rock
                '#5c5639',   // 3 creek bed
                '#5f6e50'];  // 4 sea floor (under water)
  var OVERLAY=[null,'#7a5a33','#7f7c73','#bba767'];   // none, dirt, cobble, sand
  var WATER='#7e92ae';   // the references' calm pale blue-grey (unlit, so the scene sun cannot wash it white)

  function jitter(x,z){ var s=Math.sin(x*12.9898+z*78.233)*43758.5453; return (s-Math.floor(s))*.08-.04; }
  function colour(THREE,hex,x,z,shade){ var c=new THREE.Color(hex); return c.multiplyScalar(1+jitter(x,z)+(shade||0)); }

  // One chunk (8x8 tiles) of the v3 bundle as a non-indexed mesh. Vertex heights come from the
  // shared lattice, so neighbouring chunks meet exactly; crossings are rendered by their own models.
  function buildChunk(THREE,bundle,cx,cz,material){
    var base=bundle.base,W=base.width,stride=W+1,pos=[],col=[],v=prepare2004(bundle),c3=new THREE.Color();
    function h(x,z){ return base.heights[z*stride+x]; }
    for(var tz=cz*8;tz<Math.min(cz*8+8,base.depth);tz++)for(var tx=cx*8;tx<Math.min(cx*8+8,W);tx++){
      var ov=bundle.overlay[tz*W+tx],corners=[[tx,tz],[tx+1,tz],[tx,tz+1],[tx+1,tz+1]];
      var tri=[0,2,1,1,2,3];
      // alternate the split diagonal so slopes do not stripe in one direction
      if((tx+tz)&1) tri=[0,2,3,0,3,1];
      // a tiny per-tile lightness wobble, as the old client's random offsets gave fields some life
      var wob=jitter(tx,tz)*.35;
      for(var k=0;k<6;k++){
        var c=corners[tri[k]],j=c[1]*stride+c[0],f=v.light[j]/128;pos.push(c[0],h(c[0],c[1]),c[1]);
        if(ov){var o=OVERLAY_HSL[ov];c3.setHSL(o[0],o[1],Math.max(0,Math.min(1,o[2]*f*(1+wob))));}
        else c3.setHSL(v.hue[j],v.sat[j],Math.max(0,Math.min(1,v.lit[j]*f*(1+wob*.5))));
        col.push(c3.r,c3.g,c3.b);
      }
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    var mesh=new THREE.Mesh(g,material);mesh.name='ground-chunk-v3-'+cx+','+cz;mesh.receiveShadow=true;
    return mesh;
  }

  function terrainMaterial(THREE){ return new THREE.MeshBasicMaterial({vertexColors:true}); }   // light is baked (2004)

  /* ---- the 2004 terrain model (studied from the RS2 client's scene builder; our own implementation) ----
   * 1. Ground colours are HSL and blended over an 11x11 tile box, giving broad soft colour fields.
   * 2. Each lattice vertex gets a baked light from its heightfield normal: 96 ambient plus a fixed low
   *    side light; ground facing the light is bright, ground facing away goes dark.
   * 3. The final colour is the blended HSL with lightness scaled by that light (x/128). Path overlays
   *    keep their own flat colour per tile but take the same corner lights, so edges stay crisp while
   *    the shading stays continuous. Rendered unlit (MeshBasicMaterial) and smooth, as the old client did. */
  // Review 2 (owner, 2026-09-24): "too dark". Retuned against the Bible references: warm yellow-green grass,
  // wide tan sand, tan-brown earth on steep faces, bright ground lit mostly from above.
  var HSL=[[0.115,.40,.60],   // 0 sand
           [0.20,.44,.38],    // 1 grass (review 3: muted olive, not bright yellow-green)
           [0.09,.26,.42],    // 2 rock / earth face
           [0.11,.28,.36],    // 3 creek bed
           [0.12,.30,.52]];   // 4 sea floor (sand under water)
  var CLIFF=[0.085,.30,.40];  // steep faces blend toward bare earth, as the references' hill cuts do
  var OVERLAY_HSL=[null,[0.10,.30,.40],[0.10,.04,.50],[0.12,.36,.60]];   // dirt, cobble, sand
  var LIGHT=(function(){var v=[-.42,.82,.40],l=Math.hypot(v[0],v[1],v[2]);return [v[0]/l,v[1]/l,v[2]/l];})();
  function normalAt(b,x,z){
    var W=b.base.width,H=b.base.depth,s=W+1,h=b.base.heights;
    var cx=Math.max(1,Math.min(W-1,x)),cz=Math.max(1,Math.min(H-1,z));
    var dx=h[cz*s+cx+1]-h[cz*s+cx-1],dz=h[(cz+1)*s+cx]-h[(cz-1)*s+cx],len=Math.hypot(dx,2,dz);
    return [-dx/len,2/len,-dz/len];
  }
  // Baked light, on the old client's 128 = neutral scale: bright flat ground, darker faces turned away.
  function lightAt(b,x,z){
    var n=normalAt(b,x,z),d=Math.max(0,n[0]*LIGHT[0]+n[1]*LIGHT[1]+n[2]*LIGHT[2]);
    return 128*(.48+.64*d);   // stronger light/dark over the hills, as the references roll
  }
  function hslToRgb(h,s,l){var c=new (typeof THREE!=='undefined'?THREE.Color:Object)();if(!c.setHSL)return null;return c.setHSL(h,s,Math.max(0,Math.min(1,l)));}
  // One pass over the whole lattice: blended HSL (11x11 box) and baked light per vertex.
  function prepare2004(b){
    if(b._v2004)return b._v2004;
    var W=b.base.width,H=b.base.depth,s=W+1,n=s*(H+1),m=b.base.materials;
    var hue=new Float32Array(n),sat=new Float32Array(n),lit=new Float32Array(n),light=new Float32Array(n);
    // hue is averaged as a vector so reds and greens never average through grey
    var ch=new Float32Array(n),shh=new Float32Array(n),ss=new Float32Array(n),sl=new Float32Array(n);
    for(var i=0;i<n;i++){var c=HSL[m[i]];ch[i]=Math.cos(c[0]*6.2832);shh[i]=Math.sin(c[0]*6.2832);ss[i]=c[1];sl[i]=c[2];}
    function box(src){ // separable 11-wide box blur on the lattice
      var tmp=new Float32Array(n),out=new Float32Array(n),R=5;
      for(var z=0;z<=H;z++)for(var x=0;x<=W;x++){var a=0,k=0;for(var d=-R;d<=R;d++){var xx=x+d;if(xx<0||xx>W)continue;a+=src[z*s+xx];k++;}tmp[z*s+x]=a/k;}
      for(z=0;z<=H;z++)for(x=0;x<=W;x++){a=0;k=0;for(d=-R;d<=R;d++){var zz=z+d;if(zz<0||zz>H)continue;a+=tmp[zz*s+x];k++;}out[z*s+x]=a/k;}
      return out;
    }
    var bc=box(ch),bs=box(shh),bsat=box(ss),bl=box(sl);
    for(var z=0;z<=H;z++)for(var x=0;x<=W;x++){var j=z*s+x;
      hue[j]=((Math.atan2(bs[j],bc[j])/6.2832)+1)%1;sat[j]=bsat[j];lit[j]=bl[j];light[j]=lightAt(b,x,z);
      // steep ground shows bare earth: blend toward CLIFF as the slope passes ~35 degrees
      var ny=normalAt(b,x,z)[1],t=Math.max(0,Math.min(1,(.86-ny)/.18));
      if(t>0&&m[j]!==4){hue[j]=hue[j]+(CLIFF[0]-hue[j])*t;sat[j]+=(CLIFF[1]-sat[j])*t;lit[j]+=(CLIFF[2]-lit[j])*t;}}
    return (b._v2004={hue:hue,sat:sat,lit:lit,light:light});
  }

  // Sea plane plus the creek ribbon at its authored water heights, in one flat 2004 blue.
  function buildWater(THREE,bundle){
    var group=new THREE.Group();group.name='holm-v3-water';
    var mat=new THREE.MeshBasicMaterial({color:WATER,transparent:true,opacity:.94});
    var sea=new THREE.Mesh(new THREE.PlaneGeometry(bundle.width+160,bundle.depth+160),mat);
    sea.rotation.x=-Math.PI/2;sea.position.set(bundle.width/2,-.12,bundle.depth/2);sea.name='holm-v3-sea';
    group.add(sea);
    if(bundle.base.creek&&typeof HolmArrivalWater!=='undefined'){
      var r=HolmArrivalWater.ribbon(bundle.base.creek),g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(r.positions,3));g.setIndex(r.indices);g.computeVertexNormals();
      var creek=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:WATER,side:THREE.DoubleSide}));
      creek.name='holm-v3-creek';group.add(creek);
    }
    return group;
  }

  // Plain timber decks for crossings: planks, two side rails. Stand-in art until the step-3 bridge model.
  function buildCrossing(THREE,c){
    var g=new THREE.Group();g.name='holm-v3-crossing-'+c.id;
    var wood=new THREE.MeshLambertMaterial({color:'#7a5532',flatShading:true});
    var dark=new THREE.MeshLambertMaterial({color:'#5a3d22',flatShading:true});
    var alongX=c.w>=c.d,len=alongX?c.w:c.d,wide=alongX?c.d:c.w;
    // The planks are not ground to the picker, so a click on the bridge used to fall through to the creek
    // bed below. An invisible deck surface named 'ground' makes a click on the bridge walk onto it.
    var hit=new THREE.Mesh(new THREE.BoxGeometry(c.w,.06,c.d),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    hit.name='ground';hit.position.set(c.x+c.w/2,c.deckY,c.z+c.d/2);g.add(hit);g.userData.deckHit=hit;
    for(var i=0;i<len*2;i++){
      var plank=new THREE.Mesh(new THREE.BoxGeometry(alongX?.46:wide,.12,alongX?wide:.46),i%2?wood:dark);
      var t=i*.5+.25;plank.position.set(alongX?c.x+t:c.x+c.w/2,c.deckY-.06,alongX?c.z+c.d/2:c.z+t);g.add(plank);
    }
    [-1,1].forEach(function(side){
      var rail=new THREE.Mesh(new THREE.BoxGeometry(alongX?len:.12,.12,alongX?.12:len),dark);
      rail.position.set(alongX?c.x+c.w/2:c.x+c.w/2+side*(wide/2-.06),c.deckY+.55,alongX?c.z+c.d/2+side*(wide/2-.06):c.z+c.d/2);g.add(rail);
      for(var p=0;p<=len;p+=2){
        var post=new THREE.Mesh(new THREE.BoxGeometry(.14,.7,.14),dark);
        post.position.set(alongX?c.x+Math.min(p,len-.07)+.07:rail.position.x,c.deckY+.25,alongX?rail.position.z:c.z+Math.min(p,len-.07)+.07);g.add(post);
      }
    });
    return g;
  }
  return {buildChunk:buildChunk,terrainMaterial:terrainMaterial,buildWater:buildWater,buildCrossing:buildCrossing,
    UNDERLAY:UNDERLAY,OVERLAY:OVERLAY};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmV3Render;
