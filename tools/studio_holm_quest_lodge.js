import {loadLodgeLedger} from './studio_holm_lodge_ledger.js?v=1';
import {loadLodgeOak} from './studio_holm_lodge_material.js?v=1';
import {loadLodgeHearth} from './studio_holm_lodge_hearth.js?v=1';
import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const host=document.getElementById('view'),status=document.getElementById('status');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#8f9b82');renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;host.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,150),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=6;controls.maxDistance=45;
scene.add(new THREE.HemisphereLight('#f3ead5','#5b6048',1.6));
const sun=new THREE.DirectionalLight('#fff0d2',2);sun.position.set(-12,22,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:1,far:60});sun.shadow.normalBias=.025;scene.add(sun);
const base=new THREE.Mesh(new THREE.CircleGeometry(15,32),new THREE.MeshLambertMaterial({color:'#6e7d50'}));base.rotation.x=-Math.PI/2;base.position.y=-.04;base.receiveShadow=true;scene.add(base);
let model,mixer,doorAction,hearth,oak,ledger,paused=false,currentMode='exterior',last=performance.now();
const groundCut=new THREE.Plane(new THREE.Vector3(0,-1,0),.55),upperCut=new THREE.Plane(new THREE.Vector3(0,-1,0),4.5);
function fitOffset(x,y,z){const scale=Math.max(1,.95/camera.aspect);camera.position.copy(controls.target).add(new THREE.Vector3(x,y,z).multiplyScalar(scale));}
function view(back=false,upper=false){controls.target.set(0,upper?3.6:2,0);fitOffset(back?-18:19,upper?20:15,back?-22:22);render();}
function setFloor(mode){
 currentMode=mode;controls.minDistance=6;
 if(!model)return;
 model.traverse(n=>{
  if(!n.isMesh)return;if(n.userData.replacedByLedger){n.visible=false;return}let semantic=n;
  while(semantic.parent&&semantic!==model&&!/^Lodge_/.test(semantic.name))semantic=semantic.parent;
  const part=semantic.name,mats=Array.isArray(n.material)?n.material:[n.material];n.visible=true;
  mats.forEach(m=>{m.clippingPlanes=[];m.clipShadows=true;});
  if(mode!=='exterior'&&/^Lodge_(Roof|Chimney)/.test(part))n.visible=false;
  if(mode==='ground'&&/^Lodge_Upper/.test(part))n.visible=false;
  if(mode==='ground'&&/^Lodge_(GroundShell|Glazing|Door)/.test(part))mats.forEach(m=>m.clippingPlanes=[groundCut]);
  if(mode==='upper'&&/^Lodge_(UpperShell|Glazing)/.test(part))mats.forEach(m=>m.clippingPlanes=[upperCut]);
 });
 document.querySelectorAll('[data-floor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.floor===mode)));
 if(mode==='exterior')view();
 else {controls.target.set(mode==='upper'?-2.5:0,mode==='upper'?3.6:.6,0);fitOffset(12,18,15);render();}
}
async function load(){
 const base='../.studio-workspaces/holm-quest-lodge-v2/candidates/';
 const contractResponse=await fetch(base+'contract.json',{cache:'no-store'});
 if(!contractResponse.ok)throw Error('Lodge contract unavailable');
 const contract=await contractResponse.json(),response=await fetch(base+'lodge.glb',{cache:'no-store'});
 if(!response.ok)throw Error('Lodge geometry unavailable');
 const bytes=await response.arrayBuffer();
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(sha!==contract.exportEvidence?.sha256)throw Error('Lodge geometry does not match its contract');
 const g=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,base,resolve,reject));
 model=g.scene;scene.add(model);mixer=new THREE.AnimationMixer(model);g.animations.forEach(c=>{
  const action=mixer.clipAction(c);
  if(/door/i.test(c.name)){doorAction=action;action.setLoop(THREE.LoopOnce);action.clampWhenFinished=true;}
  else action.play();
 });document.getElementById('door').disabled=!doorAction;
 let tris=0,meshes=0;const textures=new Set();
 model.traverse(n=>{if(n.isMesh){meshes++;n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;tris+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3;(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{if(m.map)textures.add(m.map);});}});
 status.textContent=`Lodge body · ${Math.round(tris).toLocaleString()} triangles · ${meshes} rendered meshes · ${textures.size} textures · ${g.animations.length} animation clips. Geometry and art remain under review.`;
 oak=await loadLodgeOak(THREE,GLTFLoader,model,sha);oak.set(document.getElementById('oak').checked);
 hearth=await loadLodgeHearth(THREE,GLTFLoader,scene,sha);status.textContent+=` Hearth: ${hearth.triangleCount} additional triangles, authored flame loop.`;
 ledger=await loadLodgeLedger(THREE,GLTFLoader,model,sha);status.textContent+=` Ledger: ${ledger.triangles} additional triangles; design placement only.`;
 console.info('[QUEST_LODGE_STUDIO]',JSON.stringify({triangles:tris,meshes,textures:textures.size,clips:g.animations.length,sha256:sha}));view();
}
load().catch(e=>{status.textContent='The lodge model could not load: '+e.message;console.error(e);});
function render(){const now=performance.now();if(!paused){const dt=Math.min(.05,(now-last)/1000);mixer?.update(dt);hearth?.update(dt);}last=now;controls.update();renderer.render(scene,camera);}
document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>setFloor(b.dataset.floor));
document.getElementById('oak').onchange=e=>{oak?.set(e.target.checked);render();};
document.getElementById('hearth-view').onclick=()=>{setFloor('ground');controls.target.set(4,.9,.95);fitOffset(-7,4.5,6);render();};
document.getElementById('front').onclick=()=>view();document.getElementById('back').onclick=()=>view(true);
document.getElementById('door').onclick=()=>{if(!doorAction)return;if(paused)document.getElementById('pause').click();doorAction.reset().play();};
document.getElementById('pause').onclick=()=>{paused=!paused;last=performance.now();renderer.setAnimationLoop(paused?null:render);document.getElementById('pause').textContent=paused?'Resume preview':'Pause preview';};
controls.addEventListener('change',()=>{if(paused)renderer.render(scene,camera);});
new ResizeObserver(()=>{const r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(model)setFloor(currentMode);else view();}).observe(host);
view();renderer.setAnimationLoop(render);

document.getElementById('ledger-view').onclick=()=>{if(!ledger)return;setFloor('ground');controls.minDistance=.5;controls.target.copy(ledger.anchor).add(new THREE.Vector3(0,.05,0));fitOffset(-.9,1.1,1.2);render();};
