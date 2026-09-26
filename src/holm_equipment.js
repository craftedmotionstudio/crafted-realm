/* ================= HOLM EQUIPMENT V1 =================
 * Every wieldable / wearable item as a Blender model (tools/blender/build_holm_equipment_v1.py ->
 * .studio-workspaces/holm-equipment-v1/candidates/equipment.glb, one root per kind named eq_<kind>).
 * Loads the GLB once and hands out tier-recoloured clones. Fails soft: until the GLB is loaded (or for an unknown
 * kind) every call returns null so callers keep their code-built primitive. Nothing here edits another file; the
 * wiring lives in REPORT.md next to the GLB.
 *
 * Two frames (root extras.frame):
 *   'grip'  held weapons / tools / shields / arrow. Origin = hand grip, same frame as the gear_models_v1 templates and
 *           the EquipBuilder specs (blades along -Y; tools, maces, 2h, bows, staves along +Y; shields face +X).
 *           mesh(kind, hex, {frame:'legacy'}) wraps it into the old world_gear.js builder frame (blades +Y).
 *   'bind'  worn armour, authored in the bind pose of the character kit (holm_kit_v2.glb). Each child mesh carries
 *           extras.bone; fit(rig, kind, hex) parents every part to its bone through the skin's inverse bind matrix,
 *           so the armour follows the animation on any rig with the Mixamo bone names.
 * Recolour rule (same as gear_models_v1): M_METAL = tier colour, M_METAL_DARK x0.72, M_METAL_MID x0.86,
 * M_METAL_EDGE 30% toward white; M_CLOTH / M_CLOTH_DARK from opts.cloth; M_GEM from opts.gem (slight glow).
 * QA: HolmEquipment.status(). */
var HolmEquipment=(function(){
 'use strict';
 var PATH='/.studio-workspaces/holm-equipment-v1/candidates/equipment.glb';
 var URL=(typeof HolmIsland!=='undefined'&&HolmIsland.asset?HolmIsland.asset(PATH):PATH)+'?v=1';
 var METAL_DEFAULT=0xb87a3a,KIT_HIPS_Y=0.95;
 var MODEL_KIND={sword:'sword',longsword:'longsword',sabre:'sabre',greatsword:'greatsword',mace:'mace',warhammer:'warhammer',
  battleaxe:'battleaxe',axe:'hatchet',pick:'pickaxe',bow:'shortbow',longbow:'longbow',staff:'staff',shield:'round_shield',
  sqshield:'sqshield',kiteshield:'kiteshield',helm:'fullhelm',medhelm:'medhelm',hat:'hat',plate:'platebody',legs:'platelegs',
  chainbody:'chainbody',plateskirt:'plateskirt',chaps:'chaps',gloves:'gloves',boots:'boots',amulet:'amulet',cape:'cape'};
 var ID_KIND={bronze_dagger:'dagger',iron_dagger:'dagger',leather_body:'leather_body',riveted_body:'leather_body',fenhide_body:'leather_body'};
 var HAT_CLOTH={wizard:0x3a5aad,cloth:0x7a86b8,glimmer:0xb48ae0};
 var st={templates:{},ready:false,failed:null,loading:false,mats:{},waiters:[],installed:false};

 function load(){
  if(st.loading||st.ready)return;
  if(typeof THREE==='undefined'||!THREE.GLTFLoader){st.failed='no GLTFLoader';return}
  st.loading=true;
  new THREE.GLTFLoader().load(URL,function(gltf){
   try{
    gltf.scene.children.slice().forEach(function(n){
     var k=n.userData&&n.userData.eq_kind;if(!k)return;
     n.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      [].concat(o.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
     n.position.set(0,0,0);n.rotation.set(0,0,0);n.scale.set(1,1,1);st.templates[k]=n});
    st.ready=Object.keys(st.templates).length>0;
    if(!st.ready)st.failed='no eq_* roots in GLB';
   }catch(e){st.failed=String(e&&e.message||e)}
   st.loading=false;var w=st.waiters;st.waiters=[];w.forEach(function(f){try{f(st.ready)}catch(e){console.warn('[HolmEquipment] waiter',e)}});
  },undefined,function(e){st.loading=false;st.failed=String(e&&e.message||e);console.warn('[HolmEquipment] equipment.glb failed; primitives stay',e)});
 }
 function onReady(fn){if(st.ready){fn(true);return}st.waiters.push(fn);load()}

 function baseName(n){return String(n||'').replace(/[._]\d+$/,'')}
 function tinted(src,o){
  var n=baseName(src.name),hex=null,f=null;
  if(n==='M_METAL'||n==='M_METAL_DARK'||n==='M_METAL_MID'||n==='M_METAL_EDGE'){if(o.metal==null)return src;hex=o.metal;f=n}
  else if(n==='M_CLOTH'||n==='M_CLOTH_DARK'){if(o.cloth==null)return src;hex=o.cloth;f=n}
  else if(n==='M_GEM'){if(o.gem==null)return src;hex=o.gem;f=n}
  else return src;
  var key=f+'|'+hex;if(st.mats[key])return st.mats[key];
  var m=src.clone(),c=new THREE.Color(hex);
  if(f==='M_METAL_DARK'||f==='M_CLOTH_DARK')c.multiplyScalar(0.72);
  else if(f==='M_METAL_MID')c.multiplyScalar(0.86);
  else if(f==='M_METAL_EDGE')c.lerp(new THREE.Color(0xffffff),0.3);
  m.color.copy(c);
  if(f==='M_GEM'&&m.emissive){m.emissive.copy(c).multiplyScalar(0.25)}
  return (st.mats[key]=m);
 }
 function cloneKind(kind,metal,opts){
  var t=st.templates[kind];if(!t)return null;
  var o={metal:metal==null?null:metal,cloth:opts&&opts.cloth!=null?opts.cloth:null,gem:opts&&opts.gem!=null?opts.gem:null};
  var g=t.clone(true);
  g.traverse(function(x){if(!x.isMesh||!x.material)return;
   x.material=Array.isArray(x.material)?x.material.map(function(q){return tinted(q,o)}):tinted(x.material,o)});
  g.userData=Object.assign({},t.userData,{holmEquipment:kind});
  return g;
 }
 function quat(a){return a&&a.length===4?new THREE.Quaternion(a[0],a[1],a[2],a[3]):new THREE.Quaternion()}

 /* a recoloured clone, or null while loading / for an unknown kind.
  * opts.frame:'legacy' -> wrapped into the world_gear.js builder frame (grip kinds only). */
 function mesh(kind,metalHex,opts){
  opts=opts||{};
  if(!st.ready){load();return null}
  var g=cloneKind(kind,metalHex,opts);if(!g)return null;
  if(opts.frame==='legacy'){
   if(g.userData.frame!=='grip')return null;
   var w=new THREE.Group();w.add(g);g.quaternion.copy(quat(g.userData.legacy));w.userData.holmEquipment=kind;return w;
  }
  return g;
 }

 /* item id -> {kind, metal, opts, frame} using the same colour rules as gearMesh / fx_humanoid */
 function forItem(id){
  var d=(typeof ITEMS!=='undefined')?ITEMS[id]:null;if(!d)return null;
  var kind=ID_KIND[id]||(d.model==='plate'&&d.tier==='leather'?'leather_body':MODEL_KIND[d.model]);
  if(!kind)return null;
  var metal=(typeof tierMetal==='function')?tierMetal(d):METAL_DEFAULT,opts={};
  if(d.model==='hat')opts.cloth=HAT_CLOTH[d.tier]!=null?HAT_CLOTH[d.tier]:metal;
  if(d.model==='cape')opts.cloth=d.capeColor||0xa83232;
  if(d.model==='amulet')opts.gem=d.sBonus?0xc84a4a:d.aBonus?0x4a9ac8:0x4ac86a;
  if(d.model==='staff')opts.gem=d.tier==='glimmer'?0xb48ae0:id==='storm_staff'?0x7ad0ff:id==='ember_staff'?0xff8c4a:0x9ad0ff;
  var t=st.templates[kind];
  return {kind:kind,metal:metal,opts:opts,frame:t?t.userData.frame:null};
 }
 function itemMesh(id,frameOpt){var r=forItem(id);if(!r)return null;return mesh(r.kind,r.metal,Object.assign({},r.opts,frameOpt||{}))}

 /* dropped-item version: laid flat (long axis +X, shield face up) with its base on the ground, centred */
 function groundMesh(id){
  var r=forItem(id);if(!r)return null;var m=mesh(r.kind,r.metal,r.opts);if(!m)return null;
  if(m.userData.frame==='grip')m.quaternion.copy(quat(m.userData.lay));
  var g=new THREE.Group();g.add(m);g.updateMatrixWorld(true);
  var b=new THREE.Box3().setFromObject(m),c=b.getCenter(new THREE.Vector3());
  m.position.set(-c.x,-b.min.y,-c.z);g.userData.holmEquipment=r.kind;return g;
 }

 /* worn armour: parent each bind-space part to its bone. Returns {kind, parts, remove()} or null.
  * opts.compensateBoneScale: undo a collapsed bone (fx_humanoid shrinks the Head bone under a full helm). */
 function shortName(n){return String(n||'').replace(/^mixamorig[:_]?/,'')}
 function fit(rig,kind,metalHex,opts){
  opts=opts||{};
  if(!st.ready){load();return null}
  var t=st.templates[kind];if(!t||t.userData.frame!=='bind'||!rig)return null;
  var sk=null;rig.traverse(function(o){if(!sk&&o.isSkinnedMesh&&o.skeleton)sk=o});if(!sk)return null;
  var bones={};sk.skeleton.bones.forEach(function(b,i){bones[shortName(b.name)]={bone:b,inv:sk.skeleton.boneInverses[i]}});
  var bind=sk.bindMatrix||new THREE.Matrix4(),ratio=1;
  if(bones.Hips){var hp=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bones.Hips.inv,bind).invert());
   if(hp.y>0.1)ratio=Math.max(0.5,Math.min(2,hp.y/KIT_HIPS_Y))}
  var g=cloneKind(kind,metalHex,opts),parts=[];
  g.children.slice().forEach(function(part){
   var bn=part.userData&&part.userData.bone,e=bn&&bones[bn];if(!e)return;
   var holder=new THREE.Group();holder.name='holmEq_'+kind+'_'+bn;
   var m=new THREE.Matrix4().multiplyMatrices(e.inv,bind).multiply(new THREE.Matrix4().makeScale(ratio,ratio,ratio));
   if(opts.compensateBoneScale&&e.bone.scale.x>1e-6&&Math.abs(e.bone.scale.x-1)>1e-3){var k=1/e.bone.scale.x;m.premultiply(new THREE.Matrix4().makeScale(k,k,k))}
   m.decompose(holder.position,holder.quaternion,holder.scale);
   g.remove(part);part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(1,1,1);
   holder.add(part);holder.userData.holmEquipment=kind;e.bone.add(holder);parts.push(holder)});
  if(!parts.length)return null;
  return {kind:kind,parts:parts,remove:function(){parts.forEach(function(h){if(h.parent)h.parent.remove(h)});parts.length=0}};
 }

 /* optional one-line wiring: every gearMesh(id) caller (player, NPCs, ground drops, showcase) gets the new held
  * models for grip-frame kinds; worn kinds fall through to the previous router (they are fitted via fit()). */
 function install(){
  if(st.installed||typeof gearMesh!=='function')return false;
  var prev=gearMesh;st.installed=true;load();
  gearMesh=function(id){var r=forItem(id);
   if(r&&r.frame==='grip'){var m=mesh(r.kind,r.metal,r.opts);if(m)return m}
   return prev(id)};
  onReady(function(ok){if(ok&&typeof refreshPlayerGear==='function'&&typeof player!=='undefined'&&player&&player.userData){
   try{refreshPlayerGear()}catch(e){console.warn('[HolmEquipment] refreshPlayerGear',e)}}});
  return true;
 }
 function status(){return {ready:st.ready,loading:st.loading,failed:st.failed,kinds:Object.keys(st.templates),installed:st.installed}}
 return {load:load,onReady:onReady,mesh:mesh,itemMesh:itemMesh,groundMesh:groundMesh,forItem:forItem,fit:fit,install:install,
  status:status,kinds:function(){return Object.keys(st.templates)}};
})();
if(typeof window!=='undefined')window.HolmEquipment=HolmEquipment;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmEquipment;
