/* Authored Blender fire shared by isolated kitchen previews. No gameplay mutations. */
export async function loadBakehouseFire(THREE, GLTFLoader, parent) {
 const base='../.studio-workspaces/holm-bakehouse-fire-v1/candidates/';
 const response=await fetch(base+'oven-fire.contract.json');if(!response.ok)throw Error('Missing oven fire contract');const data=await response.json();
 const asset=await fetch(base+'oven-fire.glb?v='+data.modelSha256);if(!asset.ok)throw Error('Missing oven fire model');const bytes=await asset.arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==data.modelSha256)throw Error('Oven fire hash changed');
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));if(!gltf.animations.length)throw Error('Oven fire has no authored animation');
 const root=gltf.scene;root.name='BakehouseOvenFire';root.position.fromArray(data.placementLocalGltf);parent.add(root);const mixer=new THREE.AnimationMixer(root);gltf.animations.forEach(clip=>mixer.clipAction(clip).play());
 console.info('[BAKEHOUSE_FIRE] authored animation loaded',gltf.animations.map(c=>({name:c.name,duration:c.duration})),data.triangleCount);
 return {root,update(dt){mixer.update(Math.max(0,Math.min(.05,dt)))},dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);parent.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);[o.material].flat().forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
