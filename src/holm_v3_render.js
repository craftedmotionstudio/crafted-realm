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
  var WATER='#35629a';

  function jitter(x,z){ var s=Math.sin(x*12.9898+z*78.233)*43758.5453; return (s-Math.floor(s))*.08-.04; }
  function colour(THREE,hex,x,z,shade){ var c=new THREE.Color(hex); return c.multiplyScalar(1+jitter(x,z)+(shade||0)); }

  // One chunk (8x8 tiles) of the v3 bundle as a non-indexed mesh. Vertex heights come from the
  // shared lattice, so neighbouring chunks meet exactly; crossings are rendered by their own models.
  function buildChunk(THREE,bundle,cx,cz,material){
    var base=bundle.base,W=base.width,stride=W+1,pos=[],col=[];
    function h(x,z){ return base.heights[z*stride+x]; }
    function m(x,z){ return base.materials[z*stride+x]; }
    for(var tz=cz*8;tz<Math.min(cz*8+8,base.depth);tz++)for(var tx=cx*8;tx<Math.min(cx*8+8,W);tx++){
      var ov=bundle.overlay[tz*W+tx],corners=[[tx,tz],[tx+1,tz],[tx,tz+1],[tx+1,tz+1]];
      var tri=[0,2,1,1,2,3];
      // alternate the split diagonal so slopes do not stripe in one direction
      if((tx+tz)&1) tri=[0,2,3,0,3,1];
      for(var k=0;k<6;k++){
        var c=corners[tri[k]];pos.push(c[0],h(c[0],c[1]),c[1]);
        var cc=ov?colour(THREE,OVERLAY[ov],tx,tz):colour(THREE,UNDERLAY[m(c[0],c[1])],c[0],c[1]);
        col.push(cc.r,cc.g,cc.b);
      }
    }
    var g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
    var mesh=new THREE.Mesh(g,material);mesh.name='ground-chunk-v3-'+cx+','+cz;mesh.receiveShadow=true;
    return mesh;
  }

  function terrainMaterial(THREE){ return new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}); }

  // Sea plane plus the creek ribbon at its authored water heights, in one flat 2004 blue.
  function buildWater(THREE,bundle){
    var group=new THREE.Group();group.name='holm-v3-water';
    var mat=new THREE.MeshLambertMaterial({color:WATER,transparent:true,opacity:.9,flatShading:true});
    var sea=new THREE.Mesh(new THREE.PlaneGeometry(bundle.width+160,bundle.depth+160),mat);
    sea.rotation.x=-Math.PI/2;sea.position.set(bundle.width/2,-.12,bundle.depth/2);sea.name='holm-v3-sea';
    group.add(sea);
    if(bundle.base.creek&&typeof HolmArrivalWater!=='undefined'){
      var r=HolmArrivalWater.ribbon(bundle.base.creek),g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(r.positions,3));g.setIndex(r.indices);g.computeVertexNormals();
      var creek=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:WATER,side:THREE.DoubleSide,flatShading:true}));
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
