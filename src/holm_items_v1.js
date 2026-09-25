/* ================= HOLM ITEMS V1 (finish goal M6.3) =================
 * The tutorial island's everyday items as Blender models (tools/blender/build_holm_items_v1.py ->
 * .studio-workspaces/holm-items-v1/candidates/items.glb, one root per item id, origin at the resting base, longest
 * axis +X). Wraps the global itemGroundMesh() so a dropped tinderbox, bucket, loaf, fish, ore, bar, net, coins,
 * arrows, runes, jerkin, shield or bone is the modelled item instead of the old code-built stand-in. Their inventory
 * icons are rendered from the same models (assets/icons/items/<id>.png, game0_icons.js). Fails soft: until the GLB
 * loads, or for any other id, the previous mesh is used. QA introspection via window.HolmItems.status(). */
(function(){
  'use strict';
  var URL=(typeof HolmIsland!=='undefined'?HolmIsland.asset('/.studio-workspaces/holm-items-v1/candidates/items.glb'):'/.studio-workspaces/holm-items-v1/candidates/items.glb')+'?v=1';
  var IDS=['tinderbox','hammer','bucket','bucket_water','bucket_flour','pot_of_flour','dough','bread_dough','bread','logs',
    'raw_perch','cooked_perch','burnt_perch','copper_ore','tin_ore','bronze_bar','fishing_net','coins','arrows','air_rune',
    'mind_rune','leather_body','wood_shield','bones'];
  var templates={},ready=false,failed=null;
  if(typeof itemGroundMesh!=='function'||typeof THREE==='undefined'||!THREE.GLTFLoader){console.warn('[HolmItems] no itemGroundMesh/GLTFLoader');return}
  var previous=itemGroundMesh;
  itemGroundMesh=function(id){
    if(ready&&templates[id]){try{var g=new THREE.Group(),m=templates[id].clone(true);m.position.set(0,0,0);g.add(m);g.userData.holmItem=id;return g}
      catch(e){console.warn('[HolmItems] clone failed for '+id,e)}}
    return previous(id);
  };
  new THREE.GLTFLoader().load(URL,function(gltf){
    IDS.forEach(function(id){var n=gltf.scene.getObjectByName(id);if(!n)return;
      n.traverse(function(m){if(m.isMesh){m.castShadow=true;m.receiveShadow=true;[].concat(m.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
      var t=n.clone(true);t.position.set(0,0,0);t.rotation.set(0,0,0);templates[id]=t});
    ready=true;
  },undefined,function(e){failed=String(e&&e.message||e);console.warn('[HolmItems] items.glb failed; code-built drops stay',e)});
  window.HolmItems={status:function(){return {ready:ready,failed:failed,models:Object.keys(templates).length}},ids:IDS.slice()};
})();
