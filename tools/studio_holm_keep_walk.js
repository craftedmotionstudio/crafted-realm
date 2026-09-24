import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const host=document.getElementById('view'),state=document.getElementById('state'),position=document.getElementById('position'),destinations=document.getElementById('destinations');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#91a08b');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.localClippingEnabled=true;host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,180),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=7;controls.maxDistance=70;camera.position.set(22,23,33);controls.target.set(0,3,0);
scene.add(new THREE.HemisphereLight('#f3ead5','#596348',1.6));const sun=new THREE.DirectionalLight('#fff0d2',2);sun.position.set(-20,36,25);scene.add(sun);
let nav,castle,rig,mixer,actions={},current,path=[],progress=0,paused=false,last=performance.now(),destinationLabel='';
const wallCut=new THREE.Plane(new THREE.Vector3(0,-1,0),2),lastFollow=new THREE.Vector3();
function semantic(o){for(let p=o;p;p=p.parent)if(/^Keep_/.test(p.name))return p.name;return ''}
function viewAt(p){wallCut.constant=p.y+1.25;castle.traverse(o=>{if(!o.isMesh)return;const name=semantic(o);o.visible=!/^Keep_Roof_/.test(name);
 if(/^Keep_(Upper|Tower)_/.test(name)){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();o.visible=o.geometry.boundingBox.min.y<=p.y+.45;}
 for(const m of [o.material].flat())m.clippingPlanes=/^Keep_(Shell|Upper_Shell|GroundFront)_/.test(name)?[wallCut]:[];
 });}
function place(p){rig.position.set(p.x,p.capsuleBase+.015,p.z);viewAt(p);position.textContent=`${current}  |  (${p.x.toFixed(2)}, ${p.capsuleBase.toFixed(2)}, ${p.z.toFixed(2)})`;}
function choose(target){if(path.length){state.textContent='Finish the current walk before choosing another destination.';return}const route=nav.route(current,target.nodeId);if(!route){state.textContent='No measured route to '+target.label;return}path=route.slice(1);progress=0;destinationLabel=target.label;state.textContent=path.length?'Walking to '+target.label:'Already at '+target.label;}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Required study data unavailable: '+url);return r.json()}
async function verifiedBytes(url,expected){if(!/^[a-f0-9]{64}$/.test(expected||''))throw Error('Missing measured asset hash');const r=await fetch(url);if(!r.ok)throw Error('Measured asset unavailable');const bytes=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==expected)throw Error('Measured asset changed; rebuild navigation before walking');return bytes;}
async function boot(){try{
 const data=await json('../.studio-workspaces/holm-keep-navigation-v4/candidates/navigation.json?v='+Date.now());nav=HolmKeepNavigation.create(data);
 const [keepBytes,avatar,terrainBytes]=await Promise.all([verifiedBytes('../.studio-workspaces/holm-warden-keep-v5/candidates/keep.glb?v='+data.modelSha256,data.modelSha256),new GLTFLoader().loadAsync('../assets/models/player.glb'),verifiedBytes('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json',data.terrainSha256)]);
 const keep=await new Promise((resolve,reject)=>new GLTFLoader().parse(keepBytes,'',resolve,reject)),terrain=JSON.parse(new TextDecoder().decode(terrainBytes));
 castle=keep.scene;castle.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()});scene.add(castle);
 const vertices=[],indices=[];for(let z=16;z<=51;z++)for(let x=73;x<=104;x++)vertices.push(x-87,terrain.heights[z*145+x]-8.025,z-35);
 for(let z=0;z<35;z++)for(let x=0;x<31;x++){const a=z*32+x;indices.push(a,a+32,a+1,a+1,a+32,a+33)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();scene.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:'#7e9056',flatShading:true})));
 const body=avatar.scene;body.updateMatrixWorld(true);body.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});let box=new THREE.Box3().setFromObject(body,true);body.scale.multiplyScalar(data.avatar.height/(box.max.y-box.min.y));body.updateMatrixWorld(true);body.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});box=new THREE.Box3().setFromObject(body,true);body.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
 rig=new THREE.Group();rig.add(body);scene.add(rig);mixer=new THREE.AnimationMixer(body);for(const name of ['idle','walk']){const clip=avatar.animations.find(c=>c.name===name);if(clip){actions[name]=mixer.clipAction(clip);actions[name].play()}}
 current=data.startId;place(nav.nodes.get(current));lastFollow.copy(rig.position);controls.target.copy(rig.position).add(new THREE.Vector3(0,1,0));camera.position.copy(controls.target).add(new THREE.Vector3(14,17,19));
 for(const target of data.targets){const b=document.createElement('button');b.textContent='Walk to '+target.label;b.disabled=!nav.route(current,target.nodeId);b.onclick=()=>choose(target);destinations.append(b)}
 const back=document.createElement('button');back.textContent='Walk back to gate approach';back.onclick=()=>choose({nodeId:data.startId,label:'gate approach'});destinations.append(back);
 document.getElementById('report').textContent=`${data.nodes.length} measured standing positions. Routes follow sampled geometry; final gameplay integration remains unfinished.`;state.textContent='Ready at the gate approach. Choose a destination.';
 console.info('[KEEP_WALK_STUDIO] ready',data.nodes.length,data.targets.map(t=>({id:t.id,reachable:!!nav.route(current,t.nodeId)})));
 }catch(e){state.textContent=e.message;console.error(e)}}
function render(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
 if(rig){const moving=path.length>0;actions.idle?.setEffectiveWeight(moving?0:1);actions.walk?.setEffectiveWeight(moving?1:0);mixer.update(dt);
  if(moving){const a=nav.nodes.get(current),b=nav.nodes.get(path[0]);rig.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);progress=Math.min(1,progress+dt*2);const p=nav.point(current,path[0],progress);if(!p)throw Error('Missing measured movement profile');place(p);if(progress===1){current=path.shift();progress=0;place(nav.nodes.get(current));if(!path.length){state.textContent='Reached '+destinationLabel;console.info('[KEEP_WALK_STUDIO] reached',current,destinationLabel)}}}
  if(document.getElementById('follow').checked){const delta=rig.position.clone().sub(lastFollow);controls.target.add(delta);camera.position.add(delta)}lastFollow.copy(rig.position);
 }controls.update();renderer.render(scene,camera);}
controls.addEventListener('change',()=>{if(paused)renderer.render(scene,camera)});
document.getElementById('pause').onclick=()=>{paused=!paused;last=performance.now();renderer.setAnimationLoop(paused?null:render);document.getElementById('pause').textContent=paused?'Resume preview':'Pause preview'};
new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera)}).observe(host);renderer.setAnimationLoop(render);boot();
