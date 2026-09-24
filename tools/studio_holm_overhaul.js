import {loadLodgePlacement} from './studio_holm_lodge_placement.js?v=1';
import {loadBakehouseFire} from './studio_holm_bakehouse_fire.js';
import {buildHolmHabitat} from './studio_holm_habitat.js?v=2';
import {makeSkiffWaterMask} from './studio_holm_water_mask.js?v=1';
import {buildArrivalLandscape} from './studio_holm_arrival_landscape.js?v=2';
import {buildArrivalTrail} from './studio_holm_arrival_trail.js?v=3';
import {createHouseWalk} from './studio_holm_house_walk.js?v=10';
import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const host=document.getElementById('view'),status=document.getElementById('status'),readout=document.getElementById('readout');
const renderer=new THREE.WebGLRenderer({antialias:true,stencil:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#91b6b6');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog('#91b6b6',210,480);
const camera=new THREE.PerspectiveCamera(39,1,.1,700),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=8;controls.maxDistance=330;
scene.add(new THREE.HemisphereLight('#f6edd2','#52613b',1.3));const sun=new THREE.DirectionalLight('#fff0ca',2.2);sun.position.set(-70,110,35);scene.add(sun);
sun.target.position.set(-8,0,35);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:190});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;
let world,padGroup,routeGroup,bundle,plan,arrivalTrail,landscape,arrivalWater;
let lodgePlacement;
const lodgeButton=document.createElement('button');lodgeButton.textContent='Inspect Quest Lodge terrace';lodgeButton.disabled=true;document.querySelector('aside').append(lodgeButton);lodgeButton.onclick=()=>{if(!lodgePlacement)return;controls.target.copy(lodgePlacement.group.position).add(new THREE.Vector3(0,2,0));camera.position.copy(controls.target).add(new THREE.Vector3(17,17,23).multiplyScalar(Math.max(1,.95/camera.aspect)));controls.update();readout.textContent='Lodge on measured terrace. The proposed lane now follows the measured route around the building.';};
let habitat,keepModel,bakehouseMixer,bakehouseFire;
let houseWalk,dockModel,skiffMixer,skiffModel;
let house;const houseToggle=document.createElement('button');houseToggle.textContent='Guide house shell · cutaway';document.querySelector('aside').append(houseToggle);
const scaleGroup=new THREE.Group();scene.add(scaleGroup);
const scaleGrid=new THREE.GridHelper(4,4,'#efe0a7','#887f5d');scaleGrid.position.set(-2,3.03,42);scaleGroup.add(scaleGrid);
const scaleButton=document.createElement('button');scaleButton.textContent='Inspect house beside 1.9-tile player';document.querySelector('aside').append(scaleButton);
scaleButton.onclick=()=>{controls.target.set(-6,5,36);camera.position.set(10,20,56);controls.update()};
const provisionsButton=document.createElement('button');provisionsButton.textContent='Inspect provision rack placement';provisionsButton.disabled=true;document.querySelector('aside').append(provisionsButton);
new GLTFLoader().load('../assets/models/player.glb',g=>{
 const fixture=g.scene;fixture.updateMatrixWorld(true);fixture.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
 const box=new THREE.Box3().setFromObject(fixture,true),height=box.max.y-box.min.y;
 if(!Number.isFinite(height)||height<=0){console.error('Scale fixture has invalid bounds');return}
 fixture.scale.multiplyScalar(1.9/height);fixture.updateMatrixWorld(true);fixture.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});
 const fitted=new THREE.Box3().setFromObject(fixture,true),center=fitted.getCenter(new THREE.Vector3());
 fixture.position.set(-2-center.x,3.04-fitted.min.y,42-center.z);scaleGroup.add(fixture);
 createHouseWalk({THREE,model:fixture,animations:g.animations,camera,canvas:renderer.domElement,getHouse:()=>house,getTrail:()=>arrivalTrail,getDock:()=>dockModel,getSkiff:()=>skiffModel,host:document.querySelector('aside'),doorsOpen:()=>doorProgress===1,openDoors:()=>{doorTarget=1;doorButton.textContent='Close house doors'},onSurface:surface=>{
  if(!house)return;
  const outside=surface==='exterior'||surface==='dock';
  house.traverse(o=>{if(/^(Roof|Gable|UpperShell)/.test(o.name))o.visible=outside;
   if(/^(UpperFloor|UpperFurnishing|UpperHearth)/.test(o.name))o.visible=surface==='upper'||outside;});
 }}).then(w=>houseWalk=w).catch(console.error);
},undefined,e=>console.error('Scale fixture failed to load',e));
let cutaway=0;houseToggle.onclick=()=>{cutaway=(cutaway+1)%3;if(house)house.traverse(o=>{
 if(/^(Roof|Gable|UpperShell)/.test(o.name))o.visible=cutaway===0;
 if(/^(UpperFloor|UpperFurnishing|UpperHearth)/.test(o.name))o.visible=cutaway!==1;
});houseToggle.textContent=['Guide house · show ground floor','Guide house · show upper floor','Guide house · show exterior'][cutaway]};
let doorMixer,doorActions=[],doorProgress=0,doorTarget=0;
const doorButton=document.createElement('button');doorButton.textContent='Open house doors';doorButton.disabled=true;document.querySelector('aside').append(doorButton);
doorButton.onclick=()=>{doorTarget=doorTarget?0:1;doorButton.textContent=doorTarget?'Close house doors':'Open house doors'};
new GLTFLoader().load('../.studio-workspaces/holm-guide-house-overhaul-v2/candidates/holm_guide_house_overhaul_v2.glb?v=2',g=>{
 house=g.scene;house.position.set(66-72,3,99-64);house.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(house);
 Promise.all([fetch('../docs/rebuild/holm-overhaul/arrival-provisions.json').then(r=>{if(!r.ok)throw Error('Provisions placement unavailable');return r.json()}),
  new GLTFLoader().loadAsync('../.studio-workspaces/holm-provision-rack-v1/candidates/provisions.glb?v=2')]).then(([p,r])=>{
   if(!p.local||![p.local.x,p.local.z,p.local.rotation].every(Number.isFinite)||p.local.rotation!==0)throw Error('Unsupported provisions placement');
   r.scene.name='GroundFurnishingProvisions';r.scene.position.set(p.local.x,0,p.local.z);r.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});house.add(r.scene);
   provisionsButton.disabled=false;provisionsButton.onclick=()=>{cutaway=1;house.traverse(o=>{if(/^(Roof|Gable|UpperShell|UpperFloor|UpperFurnishing|UpperHearth)/.test(o.name))o.visible=false});houseToggle.textContent='Guide house · show upper floor';const t=house.position.clone().add(new THREE.Vector3(p.local.x,.8,p.local.z));controls.target.copy(t);camera.position.copy(t).add(new THREE.Vector3(-4,5,9));controls.update()};
  }).catch(e=>console.error('Provisions Studio candidate failed',e));
 doorMixer=new THREE.AnimationMixer(house);doorActions=g.animations.filter(c=>/^Door.*Open$/.test(c.name)).map(c=>{const a=doorMixer.clipAction(c);a.play();a.paused=true;return a});doorButton.disabled=doorActions.length!==2;for(const clip of g.animations.filter(c=>/^HearthFlicker/.test(c.name)))doorMixer.clipAction(clip).play();
},undefined,e=>console.error('Guide house draft could not load',e));
Promise.all([
 fetch('../docs/rebuild/holm-overhaul/arrival-dock.json?v=1').then(r=>{if(!r.ok)throw Error('Dock source unavailable');return r.json()}),
 new GLTFLoader().loadAsync('../.studio-workspaces/holm-arrival-dock-v1/candidates/dock.glb?v=1')
]).then(([draft,g])=>{
 dockModel=g.scene;dockModel.position.set(draft.world.x-72,draft.world.y,draft.world.z-64);
 dockModel.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(dockModel);
}).catch(e=>console.error('Arrival dock draft failed',e));
Promise.all([
 fetch('../docs/rebuild/holm-overhaul/arrival-skiff.json?v=1').then(r=>{if(!r.ok)throw Error('Skiff source unavailable');return r.json()}),
 new GLTFLoader().loadAsync('../.studio-workspaces/holm-arrival-skiff-v1/candidates/skiff.glb?v=1')
]).then(([draft,g])=>{
 const placement=new THREE.Group();placement.position.set(draft.world.x-72,draft.world.y,draft.world.z-64);placement.rotation.y=draft.rotation;
 placement.add(g.scene);placement.userData.walkTarget=draft.dockApproach;skiffModel=placement;g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(placement);
 const clip=g.animations.find(c=>c.name===draft.animation);if(!clip)throw Error('Skiff idle animation missing');
 skiffMixer=new THREE.AnimationMixer(g.scene);skiffMixer.clipAction(clip).play();scene.add(makeSkiffWaterMask(THREE,draft));
}).catch(e=>console.error('Arrival skiff draft failed',e));
function sample(x,z){x=Math.max(0,Math.min(bundle.width,x));z=Math.max(0,Math.min(bundle.depth,z));const xi=Math.floor(x),zi=Math.floor(z),xx=Math.min(xi+1,bundle.width),zz=Math.min(zi+1,bundle.depth),fx=x-xi,fz=z-zi,w=bundle.width+1;return (bundle.heights[zi*w+xi]*(1-fx)+bundle.heights[zi*w+xx]*fx)*(1-fz)+(bundle.heights[zz*w+xi]*(1-fx)+bundle.heights[zz*w+xx]*fx)*fz}
function renderedHeight(x,z){
 const ix=Math.min(bundle.width-1,Math.max(0,Math.floor(x))),iz=Math.min(bundle.depth-1,Math.max(0,Math.floor(z))),fx=x-ix,fz=z-iz,w=bundle.width+1;
 const a=bundle.heights[iz*w+ix],b=bundle.heights[iz*w+ix+1],c=bundle.heights[(iz+1)*w+ix],d=bundle.heights[(iz+1)*w+ix+1];
 // Match HolmOverhaulChunks.surface's a,c,b / b,c,d triangles exactly.
 return fx+fz<=1?a+fx*(b-a)+fz*(c-a):d+(1-fx)*(c-d)+(1-fz)*(b-d);
}
function point(x,z,extra=0){return new THREE.Vector3(x-72,sample(x,z)+extra,z-64)}
function addLine(points,color,parent){const g=new THREE.BufferGeometry().setFromPoints(points);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color}));parent.add(l);return l}
function view(which){const presets={overview:{target:[0,3,0],offset:[150,160,190]},arrival:{target:[-13,2,40],offset:[34,29,43]},dock:{target:[-12,1,59],offset:[-14,13,20]},creek:{target:[-20,3,7],offset:[43,37,48]},ridge:{target:[24,7,-28],offset:[57,40,52]}};const p=presets[which];controls.target.set(...p.target);camera.position.copy(controls.target).add(new THREE.Vector3(...p.offset));controls.update()}
function dispose(){if(!world)return;if(lodgePlacement){lodgePlacement.dispose();lodgePlacement=null;lodgeButton.disabled=true}if(bakehouseFire){bakehouseFire.dispose();bakehouseFire=null}if(bakehouseMixer){bakehouseMixer.stopAllAction();bakehouseMixer.uncacheRoot(bakehouseMixer.getRoot());bakehouseMixer=null}if(habitat){world.remove(habitat.group);habitat.dispose();habitat=null}if(arrivalWater){arrivalWater.dispose();arrivalWater=null}scene.remove(world);landscape=null;keepModel=null;const geometries=new Set(),materials=new Set(),textures=new Set();world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat())if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose()}
async function load(){try{status.textContent='Loading isolated working bundle…';const base='../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/';const stamp='?v='+Date.now();const [br,pr,ar]=await Promise.all([fetch(base+'holm-overhaul.terrain.bundle.json'+stamp),fetch('../docs/rebuild/holm-overhaul/plan.json'+stamp),fetch('../docs/rebuild/holm-overhaul/arrival-layout.json'+stamp)]);if(!br.ok||!pr.ok||!ar.ok)throw Error('Stage the draft source and bundle before opening Studio.');const terrainBytes=await br.arrayBuffer(),terrainSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',terrainBytes))).map(x=>x.toString(16).padStart(2,'0')).join('');const next=JSON.parse(new TextDecoder().decode(terrainBytes));if(next.schema!=='holm-overhaul-terrain-bundle-v1'||next.heights.length!==(next.width+1)*(next.depth+1))throw Error('Unexpected terrain bundle');bundle=next;plan=await pr.json();dispose();world=new THREE.Group();scene.add(world);
const geo=new THREE.BufferGeometry(),vertices=[],colors=[],indices=[];const palette=['#b8ad79','#7e9650','#8c8c70','#747353','#8b9d82'].map(c=>new THREE.Color(c));
const chunkPack=HolmOverhaulChunks.compile(bundle);
const guide=plan.places.find(p=>p.id==='guide');
const exclusions=guide?[{x:guide.x-guide.w/2,z:guide.z-guide.d/2,w:guide.w,d:guide.d}]:[];
// Consume the same renderer-neutral chunk surfaces a runtime adapter can load.
// Merge for this whole-island inspection view to retain a single terrain draw.
// Owner reviews 5+6 (2026-09-24): visible tile squares in close shades; one colour per tile, flat Lambert slope light.
for(const chunk of chunkPack.chunks){
 const tiles=HolmOverhaulGround.chunk(HolmOverhaulChunks.surface(chunk,exclusions),{x:-72,z:-64,linear:true});
 for(const v of tiles.positions)vertices.push(v);for(const c of tiles.colors)colors.push(c);
}
geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const terrainMesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));terrainMesh.receiveShadow=true;world.add(terrainMesh);
const arrivalLayout=await ar.json();arrivalTrail=buildArrivalTrail(THREE,arrivalLayout,renderedHeight);arrivalTrail.receiveShadow=true;world.add(arrivalTrail);
// Owner review 5: a designed statue on the approach. The Lantern Keeper stands west of the landing path, plaque to the path.
new GLTFLoader().loadAsync('../.studio-workspaces/holm-arrival-statue-v1/candidates/lantern_keeper_statue_v1.glb?v=1').then(g=>{if(!world)return;const s=g.scene;s.name='LanternKeeperStatue';s.position.set(63.5-72,renderedHeight(63.5,110.5),110.5-64);s.rotation.y=Math.PI/2;s.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});world.add(s)}).catch(e=>console.error('Statue candidate failed',e));
landscape=await buildArrivalLandscape({THREE,GLTFLoader,sample,layout:arrivalLayout,excludeAssets:['oak','hazel']});landscape.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});world.add(landscape.group);
const habitatResponse=await fetch('../.studio-workspaces/holm-habitat-v1/working/vegetation.json'+stamp);if(!habitatResponse.ok)throw Error('Habitat draft unavailable');const habitatData=await habitatResponse.json();
habitat=await buildHolmHabitat({THREE,GLTFLoader,placements:habitatData.placements,sample:renderedHeight,offset:{x:-72,z:-64}});world.add(habitat.group);
const keepResponse=await fetch('../.studio-workspaces/holm-keep-foundation-v1/candidates/foundation-report.json'+stamp);if(!keepResponse.ok)throw Error('Keep foundation draft unavailable');const keepPlacement=(await keepResponse.json()).placement;
if(!keepPlacement||!['x','y','z','yaw'].every(k=>Number.isFinite(keepPlacement[k])))throw Error('Invalid keep placement');
const keepGltf=await new GLTFLoader().loadAsync('../.studio-workspaces/holm-warden-keep-v5/candidates/keep.glb?v=f49266fb');keepModel=keepGltf.scene;keepModel.name='WardenKeepDraft';keepModel.position.set(keepPlacement.x-72,keepPlacement.y,keepPlacement.z-64);keepModel.rotation.y=keepPlacement.yaw;keepModel.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});world.add(keepModel);
console.info('[KEEP_TERRAIN_STUDIO] Blender keep on measured ridge foundation',keepPlacement);
const kitchenResponse=await fetch('../.studio-workspaces/holm-bakehouse-placement-v3/candidates/placement.json'+stamp);if(!kitchenResponse.ok)throw Error('Bakehouse placement unavailable');const kitchenPlacement=await kitchenResponse.json();
if(!kitchenPlacement.world||!['x','y','z'].every(k=>Number.isFinite(kitchenPlacement.world[k])))throw Error('Invalid bakehouse placement');
const kitchenGltf=await new GLTFLoader().loadAsync('../.studio-workspaces/holm-kitchen-wings-v5/candidates/kitchen-character.glb?v='+kitchenPlacement.modelSha256);const kitchenModel=kitchenGltf.scene;kitchenModel.name='BakehouseDraft';kitchenModel.position.set(kitchenPlacement.world.x-72,kitchenPlacement.world.y,kitchenPlacement.world.z-64);kitchenModel.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});world.add(kitchenModel);bakehouseMixer=new THREE.AnimationMixer(kitchenModel);kitchenGltf.animations.forEach(c=>bakehouseMixer.clipAction(c).play());bakehouseFire=await loadBakehouseFire(THREE,GLTFLoader,kitchenModel);
console.info('[BAKEHOUSE_TERRAIN_STUDIO] connected wings on measured terrace',kitchenPlacement.world);
lodgePlacement=await loadLodgePlacement(THREE,GLTFLoader,world,terrainSha256);lodgeButton.disabled=false;
arrivalWater=HolmArrivalWater.create(THREE,bundle.creek,{x:-72,z:-64});world.add(arrivalWater.group);
padGroup=new THREE.Group();world.add(padGroup);for(const b of plan.places){for(const volume of b.architecture.volumes){const corners=volume.outline.map(([x,z])=>[b.x+x,b.z+z]);corners.push(corners[0]);addLine(corners.map(([x,z])=>point(x,z,.12)),'#ead7aa',padGroup)}}
routeGroup=new THREE.Group();world.add(routeGroup);for(const r of plan.paths){const points=[];for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],len=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);for(let j=0;j<=len;j++)points.push(point(a[0]+(b[0]-a[0])*j/len,a[1]+(b[1]-a[1])*j/len,.15))}addLine(points,r.kind==='primary'?'#f3cd81':'#bcb596',routeGroup)}padGroup.visible=document.getElementById('pads').checked;routeGroup.visible=document.getElementById('routes').checked;
status.textContent='Working terrain loaded from 288 shared chunk surfaces. '+habitat.report.instances+' authored habitat placements, the ridge keep, connected bakehouse and measured Quest Lodge draft; no live provider changes.';const metrics=document.getElementById('metrics');metrics.replaceChildren();for(const [k,v] of Object.entries({'Terrain chunks':chunkPack.chunks.length,Vertices:vertices.length/3,Triangles:indices.length/3,'Height range':Math.min(...bundle.heights).toFixed(1)+' to '+Math.max(...bundle.heights).toFixed(1),'Creek sections':bundle.creek.points.length-1})){const a=document.createElement('dt'),b=document.createElement('dd');a.textContent=k;b.textContent=v;metrics.append(a,b)}readout.textContent='Draft terrain · shore, ridge and carved creek · orbit to judge slopes and scale';
}catch(e){status.textContent=e.message;readout.textContent='Terrain load failed';console.error(e)}}
for(const k of ['overview','arrival','dock','creek','ridge'])document.getElementById(k).onclick=()=>view(k);document.getElementById('reload').onclick=load;document.getElementById('pads').onchange=e=>{if(padGroup)padGroup.visible=e.target.checked};document.getElementById('routes').onchange=e=>{if(routeGroup)routeGroup.visible=e.target.checked};
const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix()});resize.observe(host);view('arrival');load();
let lastFrame=performance.now();
function renderFrame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;
 const change=Math.sign(doorTarget-doorProgress)*Math.min(Math.abs(doorTarget-doorProgress),dt);
 doorProgress+=change;for(const a of doorActions)a.time=doorProgress*a.getClip().duration;if(doorMixer)doorMixer.update(dt);
 if(lodgePlacement)lodgePlacement.update(dt);if(bakehouseMixer)bakehouseMixer.update(dt);if(bakehouseFire)bakehouseFire.update(dt);if(habitat)habitat.update(dt);if(arrivalWater)arrivalWater.update(dt);if(houseWalk)houseWalk.update(dt);if(landscape)landscape.update(dt);if(skiffMixer)skiffMixer.update(dt);controls.update();renderer.render(scene,camera)}
let previewPaused=false;
controls.addEventListener('change',()=>{if(previewPaused)renderer.render(scene,camera)});
const pausePreview=document.createElement("button");
pausePreview.textContent="Pause preview";
pausePreview.title="Pause this scene while testing the game; all loaded models remain available.";
pausePreview.setAttribute("aria-pressed","false");
document.querySelector("aside").prepend(pausePreview);
pausePreview.onclick=()=>{
 previewPaused=!previewPaused;
 pausePreview.textContent=previewPaused?"Resume preview":"Pause preview";
 pausePreview.setAttribute("aria-pressed",String(previewPaused));
 lastFrame=performance.now();
 renderer.setAnimationLoop(previewPaused?null:renderFrame);
};
renderer.setAnimationLoop(renderFrame);









