/* The same terrain triangles used by the measured navigation extractor. */
export async function loadQuestTerrain(THREE,GLTFLoader,scene,lodge,nav){
 async function bytes(url,sha){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Measured terrain study asset unavailable');const b=await r.arrayBuffer(),h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');if(h!==sha)throw Error('Terrain study asset drift: '+url);return b}
 const raw=await bytes(nav.renderDataUrl,nav.renderDataSha256),data=JSON.parse(new TextDecoder().decode(raw));
 if(data.schema!=='holm-quest-terrain-surface-v1'||data.terrainSha256!==nav.terrainSha256||!['x','y','z'].every(k=>data.origin?.[k]===nav.origin?.[k]))throw Error('Terrain surface and navigation differ');
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geo.setIndex(data.indices);geo.computeVertexNormals();
 const palette=['#b8ad79','#7e9650','#8c8c70','#747353','#8b9d82'].map(c=>new THREE.Color(c)),colors=[];
 data.materials.forEach(id=>{if(!palette[id])throw Error('Unknown terrain material');colors.push(...palette[id].toArray())});
 if(colors.length!==data.positions.length)throw Error('Terrain color data length mismatch');geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const ground=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));ground.name='MeasuredIslandTerrain';scene.add(ground);
 const placementResponse=await fetch('../.studio-workspaces/holm-quest-placement-v1/candidates/placement.json',{cache:'no-store'});if(!placementResponse.ok)throw Error('Lodge foundation placement unavailable');const p=await placementResponse.json();
 if(p.modelSha256!==nav.modelSha256||p.terrainSha256!==nav.terrainSha256||!['x','y','z'].every(k=>p.world?.[k]===nav.origin?.[k]))throw Error('Lodge terrain placement drift');
 const foundation=await new Promise(async(resolve,reject)=>{try{new GLTFLoader().parse(await bytes(p.foundationUrl,p.foundationSha256),'',resolve,reject)}catch(e){reject(e)}});lodge.add(foundation.scene);
 const grid=data.heightGrid;
 function sample(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz,w=grid.width+1,h=(dx,dz)=>grid.heights[(iz+dz)*w+ix+dx];return u+v<=1?(1-u-v)*h(0,0)+u*h(1,0)+v*h(0,1):(u+v-1)*h(1,1)+(1-u)*h(0,1)+(1-v)*h(1,0)}
 const sources=new Map();
 function verifyRest(root,proof,asset){
  if(!proof?.positions||proof.positions.length%3)throw Error('Missing habitat vertex proof: '+asset);
  const tolerance=1e-5,buckets=new Map(),key=(x,y,z)=>[x,y,z].join(',');let remaining=proof.positions.length/3,maxError=0;
  for(let i=0;i<proof.positions.length;i+=3){const p=proof.positions.slice(i,i+3),k=key(...p.map(v=>Math.floor(v/tolerance)));if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p)}
  const v=new THREE.Vector3();root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
   v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);const cell=v.toArray().map(n=>Math.floor(n/tolerance));let found;
   for(let x=-1;x<=1&&!found;x++)for(let y=-1;y<=1&&!found;y++)for(let z=-1;z<=1&&!found;z++){const b=buckets.get(key(cell[0]+x,cell[1]+y,cell[2]+z));if(!b)continue;const j=b.findIndex(p=>Math.max(Math.abs(p[0]-v.x),Math.abs(p[1]-v.y),Math.abs(p[2]-v.z))<=tolerance);if(j>=0){found=b.splice(j,1)[0];remaining--}}
   if(!found)throw Error('Rendered habitat vertex differs from collision proof: '+asset);maxError=Math.max(maxError,Math.abs(found[0]-v.x),Math.abs(found[1]-v.y),Math.abs(found[2]-v.z));
  }});if(remaining)throw Error('Unmatched habitat proof vertices: '+asset);console.info('[QUEST_TERRAIN_WALK] rest vertices verified',asset,proof.positions.length/3,'max error',maxError);
 }
 for(const [asset,sha] of Object.entries(data.habitat.assetHashes)){
  const raw=await bytes('../.studio-workspaces/holm-tree-family-v2/candidates/'+asset+'.glb',sha);
  const g=await new Promise((resolve,reject)=>new GLTFLoader().parse(raw,'',resolve,reject));g.scene.updateMatrixWorld(true);verifyRest(g.scene,data.habitat.restGeometry?.[asset],asset);const minY=new THREE.Box3().setFromObject(g.scene,true).min.y;if(Math.abs(minY-data.habitat.sourceMinY[asset])>.00002)throw Error('Habitat rest support differs: '+asset+' rendered '+minY+' measured '+data.habitat.sourceMinY[asset]);sources.set(asset,{root:g.scene,minY});
 }
 const habitat=new THREE.Group();habitat.name='MeasuredRestPoseHabitat';
 for(const p of data.habitat.placements){const source=sources.get(p.asset);if(!source||!['x','z','scale','yaw'].every(k=>Number.isFinite(p[k]))||p.scale<=0)throw Error('Invalid measured habitat');const wrapper=new THREE.Group();wrapper.position.set(p.x-nav.origin.x,sample(p.x,p.z)-nav.origin.y-source.minY*p.scale,p.z-nav.origin.z);wrapper.rotation.y=p.yaw;wrapper.scale.setScalar(p.scale);wrapper.add(source.root.clone(true));habitat.add(wrapper)}scene.add(habitat);
 // Do not advance Breeze: obstacle extraction explicitly measured the rest pose.
 console.info('[QUEST_TERRAIN_WALK] measured surface loaded',data.positions.length/3,'vertices;',data.habitat.placements.length,'rest-pose habitat placements');
 return {ground,habitat};
}
