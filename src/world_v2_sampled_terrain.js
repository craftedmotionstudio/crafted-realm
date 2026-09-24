/* Renderer adapter for authored shared-edge terrain. No registration or scene
 * ownership here: WorldV2Terrain owns the returned mesh and its disposal. */
var WorldV2SampledTerrain=(function(){
 'use strict';
 function build(THREE,chunk,material,exclusions){
  var t=chunk&&chunk.layers&&chunk.layers.terrain;
  if(!t||t.heightSource!=='holm-overhaul-v1'||t.sampleWidth!==9||t.sampleDepth!==9||t.spacing!==1||
   !t.sampleOrigin||t.sampleOrigin.x!==chunk.cx*8||t.sampleOrigin.z!==chunk.cz*8||
   !Array.isArray(t.heights)||t.heights.length!==81||!t.heights.every(Number.isFinite)||
   !Array.isArray(t.materials)||t.materials.length!==81||!t.materials.every(function(n){return Number.isInteger(n)&&n>=0&&n<=4}))throw Error('[WorldV2SampledTerrain] invalid authored chunk');
  var data=HolmOverhaulChunks.surface(chunk,exclusions||[]),geometry=new THREE.BufferGeometry();
  var palette=['#b8ad79','#7e9650','#8c8c70','#747353','#8b9d82'].map(function(c){return new THREE.Color(c).multiplyScalar(.62)}),colors=[];
  data.materials.forEach(function(id,i){
   var x=data.positions[i*3],z=data.positions[i*3+2],c=palette[id].clone();
   c.multiplyScalar(1+Math.sin(x*.61+z*.34)*.022+Math.cos(z*.43-x*.15)*.018);colors.push(c.r,c.g,c.b);
  });
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(data.indices);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  var mesh=new THREE.Mesh(geometry,material);mesh.name='ground-chunk-'+chunk.id;mesh.receiveShadow=true;
  mesh.userData.sampledTerrain=true;return mesh;
 }
 return {build:build};
})();
