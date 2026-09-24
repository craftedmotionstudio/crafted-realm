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
  // Owner reviews 5+6 (2026-09-24): tile-true ground, one close shade per tile (HolmOverhaulGround), with the
  // game's .62 palette calibration kept; flat Lambert light shades each tile's slope.
  var tiles=HolmOverhaulGround.chunk(data),colors=tiles.colors.map(function(c){return c*.62});
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(tiles.positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  var mesh=new THREE.Mesh(geometry,material);mesh.name='ground-chunk-'+chunk.id;mesh.receiveShadow=true;
  mesh.userData.sampledTerrain=true;return mesh;
 }
 return {build:build};
})();
