// Studio-only Blender kit composition. Terrain height and path clearance are
// inspected before installation; this does not register live game interactions.
export async function buildArrivalLandscape({THREE,GLTFLoader,sample,layout,excludeAssets=[]}){
 const response=await fetch('../docs/rebuild/holm-overhaul/arrival-landscape.json?v=1');
 if(!response.ok)throw Error('Arrival landscape source unavailable');
 const data=await response.json();
 if(data.schema!=='holm-arrival-landscape-study-v1')throw Error('Unknown landscape schema');
 const group=new THREE.Group();group.name='ArrivalLandscape';const mixers=[];
 const paths={};for(const name of ['oak','hazel','fieldstones'])if(!excludeAssets.includes(name))paths[name]='holm-arrival-garden-v1';
 for(const name of ['wall','bench','waypost','cargo'])paths[name]='holm-landing-props-v1';
 const loader=new GLTFLoader(),templates={};
 await Promise.all(Object.entries(paths).map(async([name,workspace])=>{
  const file=workspace==='holm-arrival-garden-v1'?'arrival_'+name+'_v1':name;
  templates[name]=await loader.loadAsync('../.studio-workspaces/'+workspace+'/candidates/'+file+'.glb?v=1');
 }));
 const route=layout.approach.waypoints;
 function overlapsRoute(box){
  const margin=layout.avatar.radius+.08;
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i];
   if(box.max.x>Math.min(a[0],b[0])-margin&&box.min.x<Math.max(a[0],b[0])+margin&&
      box.max.z>Math.min(a[2],b[2])-margin&&box.min.z<Math.max(a[2],b[2])+margin)return true;
  }return false;
 }
 for(const p of data.placements){
  if(excludeAssets.includes(p.asset))continue;
  if(!templates[p.asset]||![p.x,p.z,p.scale,p.rotation].every(Number.isFinite)||p.scale<=0)throw Error('Invalid landscape placement');
  const asset=templates[p.asset],object=asset.scene.clone(true);
  object.scale.setScalar(p.scale);object.rotation.y=p.rotation;object.position.set(p.x,0,p.z);object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object);
  if(overlapsRoute(box))throw Error('Landscape bounds obstruct arrival route: '+p.asset+' at '+p.x+','+p.z);
  // Bury level bases to the lowest corner; do not leave the downhill feet
  // floating. Significant slopes need an authored foundation, not this study fit.
  const heights=[[box.min.x,box.min.z],[box.max.x,box.min.z],[box.min.x,box.max.z],[box.max.x,box.max.z],[p.x,p.z]].map(([x,z])=>sample(x,z));
  const structure=['wall','bench','waypost','cargo'].includes(p.asset);
  if(structure&&Math.max(...heights)-Math.min(...heights)>.3)throw Error('Landscape structure needs a level foundation: '+p.asset);
  const y=structure?Math.min(...heights):sample(p.x,p.z)-.09;
  object.position.set(p.x-72,y,p.z-64);object.name='Landscape_'+p.asset+'_'+p.x+'_'+p.z;group.add(object);
  if(asset.animations.length){const mixer=new THREE.AnimationMixer(object);for(const clip of asset.animations)mixer.clipAction(clip).play();mixers.push(mixer);}
 }
 console.info('[HOLM_LANDSCAPE] '+group.children.length+' Blender placements; route envelope clear');
 return {group,update:dt=>{for(const mixer of mixers)mixer.update(dt);}};
}
