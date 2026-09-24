import {loadLodgeHearth} from './studio_holm_lodge_hearth.js?v=1';
/* Draft terrain placement; never registers live gameplay or writes authoring data. */
export async function loadLodgePlacement(THREE,GLTFLoader,parent,terrainSha256){
 const r=await fetch('../.studio-workspaces/holm-quest-placement-v1/candidates/placement.json',{cache:'no-store'});if(!r.ok)throw Error('Lodge placement measurement unavailable');
 const data=await r.json();
 if(data.schema!=='holm-quest-placement-v1'||data.terrainSha256!==terrainSha256||data.yaw!==0||!data.world||!['x','y','z'].every(k=>Number.isFinite(data.world[k]))||!/^[a-f0-9]{64}$/.test(data.modelSha256||''))throw Error('Lodge placement does not match terrain');
 if(data.augmentedFoundationFits!==true||data.foundationUrl!=='../.studio-workspaces/holm-quest-foundation-v1/candidates/foundation.glb'||!/^[a-f0-9]{64}$/.test(data.foundationSha256||''))throw Error('Lodge requires measured bay foundation');
 const response=await fetch('../.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb?v='+data.modelSha256);if(!response.ok)throw Error('Lodge placement asset unavailable');
 const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==data.modelSha256)throw Error('Lodge placement asset changed');
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
 const group=new THREE.Group();group.name='QuestLodgePlacementDraft';group.position.set(data.world.x-72,data.world.y,data.world.z-64);group.add(gltf.scene);
 gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});
 const fr=await fetch(data.foundationUrl+'?v='+data.foundationSha256);if(!fr.ok)throw Error('Lodge foundation unavailable');const fb=await fr.arrayBuffer(),fh=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',fb))).map(x=>x.toString(16).padStart(2,'0')).join('');if(fh!==data.foundationSha256)throw Error('Lodge foundation changed');const fg=await new Promise((resolve,reject)=>new GLTFLoader().parse(fb,'',resolve,reject));fg.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});gltf.scene.add(fg.scene);
 const hearth=await loadLodgeHearth(THREE,GLTFLoader,gltf.scene,data.geometryBaseSha256);
 parent.add(group);console.info('[LODGE_TERRAIN_STUDIO]',JSON.stringify(data));
 return {group,data,update(dt){hearth.update(dt)},dispose(){hearth.dispose();parent.remove(group);const geometry=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);[o.material].flat().forEach(m=>materials.add(m))}});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v)});m.dispose()});textures.forEach(t=>t.dispose());geometry.forEach(g=>g.dispose())}};
}
