/* ================= HOLM EQUIPMENT V2 =================
 * Every wieldable / wearable item as a Blender model (tools/blender/build_holm_equipment_v2.py ->
 * .studio-workspaces/holm-equipment-v2/candidates/equipment.glb; one template per kind named eq_<kind>, body B variants
 * eq_<kind>_B with extras.body 'B').
 * Loads the GLB once and hands out tier-recoloured clones. Fails soft: until the GLB is loaded (or for an unknown
 * kind) every call returns null so callers keep their code-built primitive. The wiring lives in REPORT.md next to the GLB.
 *
 * Three frames (extras.frame):
 *   'grip'  held weapons / tools / shields / arrow. Origin = hand grip, same frame as the gear_models_v1 templates and
 *           the EquipBuilder specs (blades along -Y; tools, maces, 2h, bows, staves along +Y; shields face +X).
 *           mesh(kind, hex, {frame:'legacy'}) wraps it into the old world_gear.js builder frame (blades +Y).
 *   'bind'  rigid worn parts (the helms), authored in the bind pose of the character kit (holm_kit_v2.glb). Each child
 *           mesh carries extras.bone; fit() parents every part to its bone through the skin's inverse bind matrix.
 *   'skin'  v2 worn suits (body / legs / hands / feet armour, amulet, cape): a mesh skinned to the kit skeleton with
 *           the kit's own weights. fit() rebinds a clone to the character kit's bones (the kit's inverse bind matrices
 *           and bind matrix), so it deforms exactly like the kit clothes under it; it carries the kit's morph targets
 *           (Build_Stout / Build_Slim, Feet_Small / Feet_Large: HolmKit.apply keeps them in step with the look) and
 *           Over_<body armour> (the amulet / cape over a platebody, chainbody or leather body: opts.over).
 * extras.hides: the kit slots the item replaces (a platebody the torso + arms, platelegs / chaps the legs, gloves the
 * hands, boots the feet; helms the hair -> the kit's bald head). fit() hides them at once and tags its holder
 * (userData.holmHides) so HolmKit.apply honours them on every look refresh; removing the item gives them back.
 * Recolour rule (same as gear_models_v1): M_METAL = tier colour, M_METAL_DARK x0.72, M_METAL_MID x0.86,
 * M_METAL_EDGE 30% toward white; M_CLOTH / M_CLOTH_DARK from opts.cloth; M_GEM from opts.gem (slight glow).
 * QA: HolmEquipment.status(). */
var HolmEquipment=(function(){
 'use strict';
 var PATH='/.studio-workspaces/holm-equipment-v2/candidates/equipment.glb';
 var URL=(typeof HolmIsland!=='undefined'&&HolmIsland.asset?HolmIsland.asset(PATH):PATH)+'?v=2';
 var METAL_DEFAULT=0xb87a3a,KIT_HIPS_Y=0.95,BALD=2;
 var MODEL_KIND={sword:'sword',longsword:'longsword',sabre:'sabre',greatsword:'greatsword',mace:'mace',warhammer:'warhammer',
  battleaxe:'battleaxe',axe:'hatchet',pick:'pickaxe',bow:'shortbow',longbow:'longbow',staff:'staff',shield:'round_shield',
  sqshield:'sqshield',kiteshield:'kiteshield',helm:'fullhelm',medhelm:'medhelm',hat:'hat',plate:'platebody',legs:'platelegs',
  chainbody:'chainbody',plateskirt:'plateskirt',chaps:'chaps',gloves:'gloves',boots:'boots',amulet:'amulet',cape:'cape'};
 var ID_KIND={bronze_dagger:'dagger',iron_dagger:'dagger',leather_body:'leather_body',riveted_body:'leather_body',fenhide_body:'leather_body'};
 var HAT_CLOTH={wizard:0x3a5aad,cloth:0x7a86b8,glimmer:0xb48ae0};
 // templates: kind -> body A (or the only) template, kind+'|B' -> body B template
 var st={templates:{},ready:false,failed:null,loading:false,mats:{},waiters:[],installed:false};

 function load(){
  if(st.loading||st.ready)return;
  if(typeof THREE==='undefined'||!THREE.GLTFLoader){st.failed='no GLTFLoader';return}
  st.loading=true;
  new THREE.GLTFLoader().load(URL,function(gltf){
   try{
    gltf.scene.updateMatrixWorld(true);
    (function walk(p){p.children.slice().forEach(function(n){
     var k=n.userData&&n.userData.eq_kind;if(!k){walk(n);return}
     n.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      [].concat(o.material).forEach(function(q){if(q&&'roughness' in q){q.roughness=1;q.metalness=0}})}});
     if(n.userData.frame!=='skin'){n.position.set(0,0,0);n.rotation.set(0,0,0);n.scale.set(1,1,1)}
     st.templates[k+(n.userData.body==='B'?'|B':'')]=n})})(gltf.scene);
    st.ready=Object.keys(st.templates).length>0;
    if(!st.ready)st.failed='no eq_* templates in GLB';
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
  // skinned / morphing meshes need their own material variants (the loader's skinning / morphTargets flags)
  var key=f+'|'+hex+'|'+(src.skinning?'s':'')+(src.morphTargets?'m':'')+(src.morphNormals?'n':'');if(st.mats[key])return st.mats[key];
  var m=src.clone(),c=new THREE.Color(hex);
  if(f==='M_METAL_DARK'||f==='M_CLOTH_DARK')c.multiplyScalar(0.72);
  else if(f==='M_METAL_MID')c.multiplyScalar(0.86);
  else if(f==='M_METAL_EDGE')c.lerp(new THREE.Color(0xffffff),0.3);
  m.color.copy(c);
  if(f==='M_GEM'&&m.emissive){m.emissive.copy(c).multiplyScalar(0.25)}
  return (st.mats[key]=m);
 }
 function kindOf(key){return String(key).split('|')[0]}
 function cloneKind(key,metal,opts){
  var t=st.templates[key];if(!t)return null;
  var o={metal:metal==null?null:metal,cloth:opts&&opts.cloth!=null?opts.cloth:null,gem:opts&&opts.gem!=null?opts.gem:null};
  var g=t.clone(true);
  g.traverse(function(x){if(!x.isMesh||!x.material)return;
   x.material=Array.isArray(x.material)?x.material.map(function(q){return tinted(q,o)}):tinted(x.material,o)});
  g.userData=Object.assign({},t.userData,{holmEquipment:kindOf(key)});
  return g;
 }
 function quat(a){return a&&a.length===4?new THREE.Quaternion(a[0],a[1],a[2],a[3]):new THREE.Quaternion()}
 // a skinned template as plain meshes in its rest (bind) pose: drops and previews outside a character rig
 function restPose(g){
  var out=new THREE.Group();g.updateMatrixWorld(true);
  g.traverse(function(o){if(!o.isSkinnedMesh)return;var p=new THREE.Mesh(o.geometry,o.material);
   o.matrixWorld.decompose(p.position,p.quaternion,p.scale);p.castShadow=true;p.receiveShadow=true;out.add(p)});
  out.userData=Object.assign({},g.userData);return out;
 }

 /* a recoloured clone, or null while loading / for an unknown kind.
  * opts.frame:'legacy' -> wrapped into the world_gear.js builder frame (grip kinds only); opts.body:'B' -> body B template.
  * A 'skin' template comes back as plain meshes in the kit's rest pose (fit() is the way to wear it). */
 function mesh(kind,metalHex,opts){
  opts=opts||{};
  if(!st.ready){load();return null}
  var key=opts.body==='B'&&st.templates[kind+'|B']?kind+'|B':kind;
  var g=cloneKind(key,metalHex,opts);if(!g)return null;
  if(opts.frame==='legacy'){
   if(g.userData.frame!=='grip')return null;
   var w=new THREE.Group();w.add(g);g.quaternion.copy(quat(g.userData.legacy));w.userData.holmEquipment=kind;return w;
  }
  if(g.userData.frame==='skin')return restPose(g);
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

 // ---- the character kit on a rig: body type, part nodes, reference skin
 function shortName(n){return String(n||'').replace(/^mixamorig[:_]?/,'')}
 var KIT_RE=/^Kit_([AB])_([A-Za-z]+)_(\d+)/;
 function kitPart(o){var m=KIT_RE.exec(o.name||'');if(!m)return null;if(o.parent&&KIT_RE.test(o.parent.name||''))return null;return m}
 function kitBody(rig){var n={A:0,B:0};rig.traverse(function(o){var m=kitPart(o);if(m&&o.visible)n[m[1]]++});return n.B>n.A?'B':(n.A?'A':null)}
 function kitSkin(rig){var r=null;rig.traverse(function(o){if(!r&&o.isSkinnedMesh&&o.skeleton&&(KIT_RE.test(o.name||'')||(o.parent&&KIT_RE.test(o.parent.name||''))))r=o});return r}
 /* hide the kit slots an item replaces right away (HolmKit.apply keeps honouring holder.userData.holmHides) */
 function applyHides(rig,body,hides){
  if(!hides||!hides.length)return;
  rig.traverse(function(o){var m=kitPart(o);if(!m||m[1]!==body||hides.indexOf(m[2])<0)return;
   o.visible=m[2]==='Hair'?Number(m[3])===BALD:false});
 }

 /* worn armour. Returns {kind, parts, remove()} or null (not loaded / unknown kind / not a character-kit rig for 'skin').
  * opts.compensateBoneScale: undo a collapsed bone (fx_humanoid shrinks the Head bone under a full helm).
  * opts.over: the body armour kind worn under an amulet / cape (its Over_<kind> morph). opts.body: force 'A' / 'B'. */
 function fit(rig,kind,metalHex,opts){
  opts=opts||{};
  if(!st.ready){load();return null}
  var t=st.templates[kind];if(!t||!rig)return null;
  if(t.userData.frame==='skin')return fitSkin(rig,kind,metalHex,opts);
  if(t.userData.frame!=='bind')return null;
  var sk=kitSkin(rig);if(!sk)rig.traverse(function(o){if(!sk&&o.isSkinnedMesh&&o.skeleton)sk=o});if(!sk)return null;
  var bones={};sk.skeleton.bones.forEach(function(b,i){bones[shortName(b.name)]={bone:b,inv:sk.skeleton.boneInverses[i]}});
  var bind=sk.bindMatrix||new THREE.Matrix4(),ratio=1;
  if(bones.Hips){var hp=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(bones.Hips.inv,bind).invert());
   if(hp.y>0.1)ratio=Math.max(0.5,Math.min(2,hp.y/KIT_HIPS_Y))}
  var g=cloneKind(kind,metalHex,opts),parts=[],hides=[].concat(t.userData.hides||[]);
  g.children.slice().forEach(function(part){
   var bn=part.userData&&part.userData.bone,e=bn&&bones[bn];if(!e)return;
   var holder=new THREE.Group();holder.name='holmEq_'+kind+'_'+bn;
   var m=new THREE.Matrix4().multiplyMatrices(e.inv,bind).multiply(new THREE.Matrix4().makeScale(ratio,ratio,ratio));
   if(opts.compensateBoneScale&&e.bone.scale.x>1e-6&&Math.abs(e.bone.scale.x-1)>1e-3){var k=1/e.bone.scale.x;m.premultiply(new THREE.Matrix4().makeScale(k,k,k))}
   m.decompose(holder.position,holder.quaternion,holder.scale);
   g.remove(part);part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(1,1,1);
   holder.add(part);holder.userData.holmEquipment=kind;e.bone.add(holder);parts.push(holder)});
  if(!parts.length)return null;
  var body=kitBody(rig);
  if(body&&hides.length){parts[0].userData.holmHides=hides;applyHides(rig,body,hides)}
  return {kind:kind,parts:parts,hides:body?hides:[],remove:function(){parts.forEach(function(h){if(h.parent)h.parent.remove(h)});parts.length=0}};
 }
 function fitSkin(rig,kind,metalHex,opts){
  var ref=kitSkin(rig);if(!ref)return null;          // only the character kit carries the skeleton + rest pose these were built on
  var body=opts.body==='B'||opts.body==='A'?opts.body:(kitBody(rig)||'A');
  var key=body==='B'&&st.templates[kind+'|B']?kind+'|B':kind;
  var bones={};ref.skeleton.bones.forEach(function(b,i){bones[shortName(b.name)]={bone:b,inv:ref.skeleton.boneInverses[i]}});
  var g=cloneKind(key,metalHex,opts);if(!g)return null;
  var ok=true,meshes=[];
  g.traverse(function(o){if(!o.isSkinnedMesh||!o.skeleton)return;meshes.push(o);
   var bs=[],inv=[];o.skeleton.bones.forEach(function(b){var e=bones[shortName(b.name)];if(!e){ok=false;return}bs.push(e.bone);inv.push(e.inv.clone())});
   if(ok){o.bind(new THREE.Skeleton(bs,inv),ref.bindMatrix);o.frustumCulled=false}});
  if(!ok||!meshes.length)return null;
  // the kit's build / feet morph influences now (HolmKit.apply keeps them in step), Over_<body armour> for amulet / cape
  var inf={};
  rig.traverse(function(o){var d=o.morphTargetDictionary;if(!d||!o.morphTargetInfluences||!(KIT_RE.test(o.name||'')||(o.parent&&KIT_RE.test(o.parent.name||''))))return;
   for(var k in d)if(/^(Build|Feet)_/.test(k))inf[k]=Math.max(inf[k]||0,o.morphTargetInfluences[d[k]]||0)});
  // the kit torso / hair on show: an amulet / cape takes its Over_Torso_<nn> shape unless body armour is worn over it,
  // a cape its Over_Hair_<nn> shape over long hair (HolmKit.apply keeps both in step with the look)
  var on={Torso:0,Hair:0};rig.traverse(function(o){var m=kitPart(o);if(m&&m[1]===body&&on[m[2]]!==undefined&&o.visible)on[m[2]]=Number(m[3])});
  if(opts.over)on.Torso=0;
  meshes.forEach(function(m){var d=m.morphTargetDictionary;if(!d||!m.morphTargetInfluences)return;
   for(var k in d){var t=/^Over_(Torso|Hair)_(\d+)$/.exec(k);
    m.morphTargetInfluences[d[k]]=t?(Number(t[2])===on[t[1]]?1:0):/^Over_/.test(k)?(opts.over&&k==='Over_'+opts.over?1:0):(inf[k]||0)}});
  var hides=[].concat(g.userData.hides||[]);
  g.name='holmEq_'+kind;g.userData.holmEquipment=kind;g.userData.holmHides=hides;
  g.userData.holmKitMorphs=[].concat(g.userData.kit_morphs||[]);   // e.g. Hair_Over / Jaw_Over: hair and beards lie over it
  g.position.set(0,0,0);g.quaternion.identity();g.scale.set(1,1,1);
  rig.add(g);applyHides(rig,body,hides);applyKitMorphs(rig);
  return {kind:kind,body:body,parts:[g],hides:hides,remove:function(){if(g.parent)g.parent.remove(g)}};
 }
 /* kit morphs switched on by worn items ({Hair_Over:1,...}); HolmKit.apply calls this every look refresh */
 var KIT_ITEM_MORPHS=['Hair_Over','Jaw_Over'];
 function kitMorphs(rig){var m={};if(!rig)return m;rig.traverse(function(o){var a=o.userData&&o.userData.holmKitMorphs;if(a&&a.length)a.forEach(function(k){m[k]=1})});return m}
 function applyKitMorphs(rig){var m=kitMorphs(rig);
  rig.traverse(function(o){var d=o.morphTargetDictionary;if(!d||!o.morphTargetInfluences||!(KIT_RE.test(o.name||'')||(o.parent&&KIT_RE.test(o.parent.name||''))))return;
   KIT_ITEM_MORPHS.forEach(function(k){if(d[k]!==undefined)o.morphTargetInfluences[d[k]]=m[k]?1:0})})}
 /* the kit slots hidden by the equipment on a rig ({Torso:true,...}); HolmKit.apply calls this every look refresh */
 function hiddenSlots(rig){var h={};if(!rig)return h;rig.traverse(function(o){var a=o.userData&&o.userData.holmHides;if(a&&a.length)a.forEach(function(s){h[s]=true})});return h}

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
 function kinds(){var o={};Object.keys(st.templates).forEach(function(k){o[kindOf(k)]=1});return Object.keys(o)}
 function status(){return {ready:st.ready,loading:st.loading,failed:st.failed,kinds:kinds(),
  bodyB:Object.keys(st.templates).filter(function(k){return /\|B$/.test(k)}).map(kindOf),installed:st.installed,version:2}}
 return {load:load,onReady:onReady,mesh:mesh,itemMesh:itemMesh,groundMesh:groundMesh,forItem:forItem,fit:fit,install:install,
  status:status,kinds:kinds,hiddenSlots:hiddenSlots,kitMorphs:kitMorphs,kitBody:kitBody};
})();
if(typeof window!=='undefined')window.HolmEquipment=HolmEquipment;
if(typeof module!=='undefined'&&module.exports)module.exports=HolmEquipment;
