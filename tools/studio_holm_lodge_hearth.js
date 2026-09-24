/* Blender-authored fire fitted to the measured lodge cavity. Studio visuals only. */
export function validateHearth(data,lodgeSha256){
 if(data?.schema!=='holm-lodge-hearth-v1'||data.lodgeSha256!==lodgeSha256)throw Error('Hearth placement does not match lodge');
 if(!/^[a-f0-9]{64}$/.test(data.fireSha256||'')||!Array.isArray(data.position)||data.position.length!==3||!data.position.every(Number.isFinite)||!Number.isFinite(data.rotationY)||!Number.isFinite(data.scale)||data.scale<=0||data.scale>2)throw Error('Invalid measured hearth transform');
 if(data.fireUrl!=='../.studio-workspaces/holm-bakehouse-fire-v1/candidates/oven-fire.glb'||!Array.isArray(data.clipNames)||!data.clipNames.length||data.clipNames.some(n=>typeof n!=='string'||!n)||new Set(data.clipNames).size!==data.clipNames.length||!Number.isFinite(data.durationSeconds)||!(data.durationSeconds>0))throw Error('Missing authored hearth animation');
 return data;
}
export async function loadLodgeHearth(THREE,GLTFLoader,parent,lodgeSha256){
 const response=await fetch('../.studio-workspaces/holm-quest-hearth-v1/candidates/hearth.json',{cache:'no-store'});if(!response.ok)throw Error('Hearth placement unavailable');
 const data=validateHearth(await response.json(),lodgeSha256);
 const asset=await fetch(data.fireUrl+'?v='+data.fireSha256);if(!asset.ok)throw Error('Hearth fire unavailable');
 const bytes=await asset.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(sha!==data.fireSha256)throw Error('Hearth fire changed since fitting');
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
 if(gltf.animations.length!==data.clipNames.length||gltf.animations.some(c=>!data.clipNames.includes(c.name)||Math.abs(c.duration-data.durationSeconds)>.001))throw Error('Hearth animation contract mismatch');
 const root=gltf.scene;root.name='LodgeAuthoredHearth';root.position.fromArray(data.position);root.rotation.y=data.rotationY;root.scale.setScalar(data.scale);parent.add(root);
 const mixer=new THREE.AnimationMixer(root);gltf.animations.forEach(c=>mixer.clipAction(c).play());
 console.info('[LODGE_HEARTH] measured Blender fire loaded',data.triangleCount,data.clipNames);
 return {root,triangleCount:data.triangleCount,update(dt){mixer.update(Math.max(0,Math.min(.05,dt)))},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);parent.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);[o.material].flat().forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
