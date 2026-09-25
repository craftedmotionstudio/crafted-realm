/* Resident arrival model ownership. No fetches, provider activation or placement
 * overrides: consume only the verified export's GLB bytes and transforms. */
var HolmArrivalModelOwner=(function(){
 'use strict';
 var DoorMotion=typeof module!=='undefined'&&module.exports?require('./holm_arrival_door_motion'):HolmArrivalDoorMotion;
 function need(ok,message){if(!ok)throw Error('[HolmArrivalModelOwner] '+message)}
 function semantic(name){
  if(/^GroundFloor(?:_|\.|$)/.test(name))return 'ground';
  if(/^UpperFloor(?:_|\.|$)/.test(name))return 'upper';
  if(/^StairFlight(?:_|\.|$)/.test(name))return 'stair';
  if(/^DockDeck(?:_|\.|$)/.test(name))return 'dock';
  return null;
 }
 function exactBuffer(bytes){
  need(bytes instanceof Uint8Array,'verified Uint8Array required');
  return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 }
 async function create(o){
  var T=o.THREE,W=o.WORLD,loaded=o.loaded;
  need(T&&T.GLTFLoader&&o.scene&&W&&Array.isArray(W.clickables)&&Array.isArray(W.grounds),'THREE, scene and world arrays required');
  need(loaded&&loaded.package&&Array.isArray(loaded.package.objects)&&loaded.files,'verified package required');
  var models=Object.create(null),roots=[],mixers=[],registrations=[],doorActions={},templates={},disposed=false,house=null,dock=null,lastSurface=null;
  var geometries=new Set(),materials=new Set(),textures=new Set(),doorMotion=null;
  function own(root){root.traverse(function(n){
   if(n.geometry)geometries.add(n.geometry);
   (Array.isArray(n.material)?n.material:[n.material]).filter(Boolean).forEach(function(m){materials.add(m);Object.keys(m).forEach(function(k){if(m[k]&&m[k].isTexture)textures.add(m[k])})});
  })}
  function register(array,mesh){if(array.indexOf(mesh)===-1){array.push(mesh);registrations.push([array,mesh])}}
  function dispose(){
   if(disposed)return;disposed=true;
   mixers.forEach(function(m){m.stopAllAction();m.uncacheRoot(m.getRoot())});
   registrations.forEach(function(r){var i;while((i=r[0].indexOf(r[1]))!==-1)r[0].splice(i,1)});
   roots.forEach(function(r){if(r.parent)r.parent.remove(r)});
   geometries.forEach(function(g){g.dispose()});materials.forEach(function(m){m.dispose()});textures.forEach(function(t){t.dispose()});
   registrations.length=0;mixers.length=0;roots.length=0;
  }
  function applyDoorTimes(times){
   ['arrival','garden'].forEach(function(key){doorActions[key].time=times[key]});
  }
  function setDoors(state,options){
   need(!disposed,'owner disposed');
   need(state&&typeof state.arrival==='boolean'&&typeof state.garden==='boolean','both coordinated door states required');
   applyDoorTimes(doorMotion.set(state,{instant:!options||!options.animate}));
   mixers.forEach(function(m){m.update(0)});
   if(house)house.updateMatrixWorld(true);
  }
  function update(dt,surface){
   if(disposed)return;
   if(Number.isFinite(dt)&&dt>=0){applyDoorTimes(doorMotion.update(dt));mixers.forEach(function(m){m.update(dt)})}
   if(surface===lastSurface)return;lastSurface=surface;
   var outside=surface==='exterior'||surface==='dock';
   if(models.holm_provisions)models.holm_provisions.visible=outside||surface==='ground'||surface==='stair';
   if(house)house.traverse(function(n){
    if(/^(Roof|Gable|UpperShell)/.test(n.name))n.visible=outside;
    if(/^(UpperFloor|UpperFurnishing|UpperHearth)/.test(n.name))n.visible=outside||surface==='upper'||surface==='stair';
   });
  }
  try{
   for(var row of loaded.package.objects){
    need(row&&row.asset&&row.asset.model&&!models[row.id],'unique model row required');
    var tr=row.transform;
    need(tr&&[tr.x,tr.y,tr.z,tr.rotation,tr.scale].every(Number.isFinite)&&tr.scale>0,'finite package transform required');
    var buffer=exactBuffer(loaded.files[row.asset.model.path]);
    if(!templates[row.asset.id])templates[row.asset.id]=await new Promise(function(resolve,reject){new T.GLTFLoader().parse(buffer,'',resolve,reject)});
    var template=templates[row.asset.id],gltf={scene:template._arrivalUsed?template.scene.clone(true):template.scene,animations:template.animations};
    template._arrivalUsed=true;
    need(gltf&&gltf.scene,'GLB scene required');own(gltf.scene);
    var root=new T.Group();roots.push(root);root.name='world-object-'+row.id;root.userData.arrivalObjectId=row.id;
    root.position.set(tr.x,tr.y,tr.z);root.rotation.y=tr.rotation;root.scale.setScalar(tr.scale);root.add(gltf.scene);models[row.id]=root;
    if(row.asset.id==='guide')house=root;if(row.asset.id==='dock')dock=root;
    root.traverse(function(n){if(n.userData&&n.userData.hiddenByDefault)n.visible=false});   // e.g. the relief chart's route legs
    root.traverse(function(n){
     if(!n.isMesh)return;n.castShadow=true;n.receiveShadow=true;
     // The game renders without colour management (linear output), so colour factors are used as authored;
     // r128's GLTFLoader tags colour maps sRGB, which decoded them to near-black (the leaf-textured oaks,
     // 2026-09-24). Treat maps like every other colour here: as display values.
     (Array.isArray(n.material)?n.material:[n.material]).forEach(function(m){if(m&&m.map&&T.LinearEncoding!==undefined&&m.map.encoding!==T.LinearEncoding){m.map.encoding=T.LinearEncoding;m.needsUpdate=true}});
     var cursor=n,surface=null,door=null;
     while(cursor&&cursor!==root){surface=surface||semantic(cursor.name);if(/^DoorSouthLeaf/.test(cursor.name))door='arrival';if(/^DoorNorthLeaf/.test(cursor.name))door='garden';cursor=cursor.parent}
     if(surface){n.userData.kind='arrival_surface';n.userData.arrivalSurface=surface;register(W.grounds,n);register(W.clickables,n)}
     if(door){n.userData.kind='arrival_door';n.userData.arrivalDoor=door;register(W.clickables,n)}
     if(row.asset.id==='provisions'){n.userData.kind='arrival_provisions';n.userData.label='Collect teaching tools';register(W.clickables,n)}
    });
    var clips=gltf.animations||[];
    if(clips.length){var mixer=new T.AnimationMixer(gltf.scene);mixers.push(mixer);clips.forEach(function(c){
     if(/^HearthFlicker/.test(c.name)||c.name==='Breeze')mixer.clipAction(c).play();
     if(c.name==='DoorSouthOpen'||c.name==='DoorNorthOpen'){var a=mixer.clipAction(c);a.play();a.paused=true;doorActions[c.name==='DoorSouthOpen'?'arrival':'garden']=a}
    })}
   }
   need(house&&dock,'guide house and dock required');
   need(doorActions.arrival&&doorActions.garden,'both door clips required');
   doorMotion=DoorMotion.create({arrival:doorActions.arrival.getClip().duration,garden:doorActions.garden.getClip().duration});
   setDoors({arrival:false,garden:false});update(0,'exterior');
   roots.forEach(function(r){o.scene.add(r);r.updateMatrixWorld(true)});
   return {house:house,dock:dock,models:models,mixers:mixers,update:update,setDoors:setDoors,doorsMoving:function(){return doorMotion.inspect().anyMoving},dispose:dispose};
  }catch(e){dispose();throw e}
 }
 return {create:create,semantic:semantic,exactBuffer:exactBuffer};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalModelOwner;
