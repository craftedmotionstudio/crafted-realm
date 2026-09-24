/* Apply the authored material candidate to the unchanged, measured lodge mesh. */
export async function loadLodgeOak(THREE,GLTFLoader,model,baseSha256){
 const response=await fetch('../.studio-workspaces/holm-quest-lodge-v3/candidates/material-contract.json',{cache:'no-store'});if(!response.ok)throw Error('Oak material contract unavailable');
 const data=await response.json();
 if(data.schema!=='holm-lodge-material-v1'||data.baseSha256!==baseSha256||data.materialName!=='Warm oak'||data.modelUrl!=='../.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb'||!/^[a-f0-9]{64}$/.test(data.modelSha256||''))throw Error('Oak candidate does not match measured lodge');
 const responseModel=await fetch(data.modelUrl+'?v='+data.modelSha256);if(!responseModel.ok)throw Error('Oak candidate unavailable');
 const bytes=await responseModel.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');if(sha!==data.modelSha256)throw Error('Oak candidate bytes changed');
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
 const materials=new Set();gltf.scene.traverse(o=>{if(o.isMesh)[o.material].flat().forEach(m=>{if(m.name===data.materialName)materials.add(m)})});
 if(materials.size!==1||![...materials][0].map)throw Error('Expected one textured oak material');
 const candidate=[...materials][0],slots=[];
 model.traverse(o=>{if(o.isMesh)[o.material].flat().forEach(m=>{if(m.name===data.materialName)slots.push(m)})});
 if(!slots.length)throw Error('Measured lodge has no matching oak material');
 const originals=new Map(slots.map(m=>[m,m.map]));
 // Keep existing cloned materials and their cutaway settings; only replace their map.
 function set(enabled){for(const [material,original] of originals){material.map=enabled?candidate.map:original;material.needsUpdate=true}}
 set(true);
 const geometry=new Set(),unusedMaterials=new Set(),textures=new Set();gltf.scene.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);[o.material].flat().forEach(m=>unusedMaterials.add(m))}});unusedMaterials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture&&v!==candidate.map)textures.add(v)});m.dispose()});textures.forEach(t=>t.dispose());geometry.forEach(g=>g.dispose());
 console.info('[LODGE_OAK] authored texture applied; measured geometry unchanged',originals.size,data.modelSha256);
 return {set,sha256:data.modelSha256};
}
