import {loadQuestTerrain} from './studio_holm_quest_terrain.js?v=1';
const terrainMode=document.body.dataset.terrain==='true';
import {loadLodgeOak} from './studio_holm_lodge_material.js?v=1';
import {loadLodgeHearth} from './studio_holm_lodge_hearth.js?v=1';
import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const host=document.getElementById('view'),state=document.getElementById('state'),position=document.getElementById('position'),destinations=document.getElementById('destinations');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#91a08b');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.localClippingEnabled=true;host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,180),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=7;controls.maxDistance=70;camera.position.set(22,23,33);controls.target.set(0,3,0);
scene.add(new THREE.HemisphereLight('#f3ead5','#596348',1.6));const sun=new THREE.DirectionalLight('#fff0d2',2);sun.position.set(-20,36,25);scene.add(sun);
let serviceBindings,nav,lodge,hearth,rig,mixer,actions={},current,path=[],progress=0,paused=false,last=performance.now(),destinationLabel='',destinationFacing=null,door,doorMixer,pendingTarget=null;
const wallCut=new THREE.Plane(new THREE.Vector3(0,-1,0),2),lastFollow=new THREE.Vector3();
function semantic(o){for(let p=o;p;p=p.parent)if(/^Lodge_/.test(p.name))return p.name;return ''}
function viewAt(p){if(terrainMode&&!/^Lodge_/.test(nav.nodes.get(current)?.surface||'')&&!/^Lodge_/.test(nav.nodes.get(path[0])?.surface||'')){lodge.traverse(o=>{if(o.isMesh){o.visible=true;[o.material].flat().forEach(m=>m.clippingPlanes=[])}});return}wallCut.constant=p.y+.5;lodge.traverse(o=>{if(!o.isMesh)return;const name=semantic(o);o.visible=!/^Lodge_(Roof|Chimney)/.test(name);if(/^Lodge_Upper/.test(name)&&!/Stair/.test(name)&&p.y<2.6)o.visible=false;for(const m of [o.material].flat())m.clippingPlanes=/^Lodge_(GroundShell|UpperShell|Glazing)/.test(name)?[wallCut]:[];});}
function place(p){rig.position.set(p.x,p.capsuleBase+.015,p.z);viewAt(p);position.textContent=`${current}  |  (${p.x.toFixed(2)}, ${p.capsuleBase.toFixed(2)}, ${p.z.toFixed(2)})`;}
function choose(target){
 if(!nav||!target?.nodeId||target.reachable===false){state.textContent='This destination has no measured stance.';return}
 if(path.length||pendingTarget){state.textContent='Finish the current walk before choosing another destination.';return}
 const route=nav.route(current,target.nodeId);if(!route){state.textContent='No measured route to '+target.label;return}
 if(!door.canWalk){const result=door.request(true,current,false);if(!result.ok){state.textContent=result.reason;return}pendingTarget=target;state.textContent='Opening the door before walking to '+target.label;return}
 path=route.slice(1);progress=0;destinationLabel=target.label;destinationFacing=target.facePoint||null;if(!path.length&&destinationFacing)rig.rotation.y=Math.atan2(destinationFacing[0]-rig.position.x,destinationFacing[1]-rig.position.z);state.textContent=path.length?'Walking to '+target.label:'Already at '+target.label;
}
function operateDoor(open){if(!door)return;const result=door.request(open,current,path.length>0||!!pendingTarget);state.textContent=result.ok?('Lodge door '+door.phase+'.'):result.reason;console.info('[QUEST_DOOR_STUDIO]',result.ok?door.phase:'refused',current,state.textContent);}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Required study data unavailable: '+url);return r.json()}
async function verifiedBytes(url,expected){if(!/^[a-f0-9]{64}$/.test(expected||''))throw Error('Missing measured asset hash');const r=await fetch(url);if(!r.ok)throw Error('Measured asset unavailable');const bytes=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==expected)throw Error('Measured asset changed; rebuild navigation before walking');return bytes;}
async function boot(){try{
 const data=await json((terrainMode?'../.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/navigation.json':'../.studio-workspaces/holm-quest-navigation-v1/candidates/navigation.json')+'?v='+Date.now());nav=HolmKeepNavigation.create(data);const doorEvidence=await json((terrainMode?'../.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/door.json':'../.studio-workspaces/holm-quest-door-v1/candidates/door.json')+'?v='+Date.now());door=HolmQuestDoorState.create(doorEvidence,data);
 if(!Number.isFinite(data.doorPoseTimeSeconds)||data.doorPoseTimeSeconds<0)throw Error('Missing measured door pose');
 const [modelBytes,avatar]=await Promise.all([verifiedBytes(data.modelUrl||'../.studio-workspaces/holm-quest-lodge-v1/candidates/lodge.glb?v='+data.modelSha256,data.modelSha256),new GLTFLoader().loadAsync('../assets/models/player.glb')]);
 const loaded=await new Promise((resolve,reject)=>new GLTFLoader().parse(modelBytes,'',resolve,reject));lodge=loaded.scene;lodge.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()});scene.add(lodge);
 const clip=loaded.animations.find(c=>c.name===doorEvidence.clipName);if(!clip||clip.duration<data.doorPoseTimeSeconds)throw Error('Measured door animation missing');doorMixer=new THREE.AnimationMixer(lodge);const doorAction=doorMixer.clipAction(clip);doorAction.setLoop(THREE.LoopOnce);doorAction.clampWhenFinished=true;doorAction.play();doorMixer.setTime(door.time);lodge.updateMatrixWorld(true);
 if(terrainMode){await loadQuestTerrain(THREE,GLTFLoader,scene,lodge,data);const names=[];lodge.traverse(o=>{if(o.isMesh)names.push(o.name)});serviceBindings=HolmLodgeServiceBindings.create(data,names);}else await loadLodgeOak(THREE,GLTFLoader,lodge,data.modelSha256);
 hearth=await loadLodgeHearth(THREE,GLTFLoader,scene,data.geometryBaseSha256||data.modelSha256);
 if(!terrainMode){const apron=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshLambertMaterial({color:'#7e9056',flatShading:true}));apron.rotation.x=-Math.PI/2;apron.position.y=-.02;scene.add(apron);}
 const body=avatar.scene;body.updateMatrixWorld(true);body.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});let box=new THREE.Box3().setFromObject(body,true);body.scale.multiplyScalar(data.avatar.height/(box.max.y-box.min.y));body.updateMatrixWorld(true);body.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update()});box=new THREE.Box3().setFromObject(body,true);body.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
 rig=new THREE.Group();rig.add(body);scene.add(rig);mixer=new THREE.AnimationMixer(body);for(const name of ['idle','walk']){const clip=avatar.animations.find(c=>c.name===name);if(clip){actions[name]=mixer.clipAction(clip);actions[name].play()}}
 current=data.startId;place(nav.nodes.get(current));lastFollow.copy(rig.position);controls.target.copy(rig.position).add(new THREE.Vector3(0,1,0));camera.position.copy(controls.target).add(new THREE.Vector3(10,12,14).multiplyScalar(Math.max(1,.95/camera.aspect)));
 let blocked=0;for(const target of data.targets||[]){const reachable=target.reachable!==false&&!!target.nodeId&&!!nav.route(current,target.nodeId);if(!reachable)blocked++;const b=document.createElement('button');b.textContent='Walk to '+target.label+(reachable?'':' (route blocked)');b.disabled=!reachable;b.onclick=()=>choose(target);destinations.append(b)}
 const back=document.createElement('button');back.textContent=terrainMode?'Walk back to south lane':'Walk back to entrance approach';back.onclick=()=>choose({nodeId:data.startId,label:terrainMode?'south lane':'entrance approach'});destinations.append(back);
 const outer=data.nodes.find(n=>Math.abs(n.x-.5)<.001&&Math.abs(n.z-4.5)<.001&&Math.abs(n.y+.02)<.001);if(outer){const b=document.createElement('button');b.textContent='Walk to outer approach';b.onclick=()=>choose({nodeId:outer.id,label:'outer approach'});destinations.append(b)}
 document.getElementById('report').textContent=`${data.nodes.length} measured standing positions. ${blocked} of ${(data.targets||[]).length} destinations blocked. Walking uses the measured open pose. Door movement waits for a clear, stationary stance.`;state.textContent=terrainMode?'Ready on the south lane. Choose a destination.':'Ready at the entrance approach. Choose a destination.';
 console.info('[QUEST_WALK_STUDIO] ready',data.nodes.length,(data.targets||[]).map(t=>({id:t.id,reachable:t.reachable!==false&&!!nav.route(current,t.nodeId)})));
 }catch(e){state.textContent=e.message;console.error(e)}}
function render(now){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;

 hearth?.update(dt);
 if(rig){const prior=door.phase;doorMixer.setTime(door.tick(dt));lodge.updateMatrixWorld(true);document.getElementById('door-state').textContent='Door: '+door.phase;if(prior!==door.phase){console.info('[QUEST_DOOR_STUDIO]',door.phase,current);if(!pendingTarget)state.textContent='Lodge door '+door.phase+'.'}if(pendingTarget&&door.canWalk){const target=pendingTarget;pendingTarget=null;choose(target)}const moving=path.length>0&&door.canWalk;actions.idle?.setEffectiveWeight(moving?0:1);actions.walk?.setEffectiveWeight(moving?1:0);mixer.update(dt);
  if(moving){const a=nav.nodes.get(current),b=nav.nodes.get(path[0]);rig.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);progress=Math.min(1,progress+dt*2);const p=nav.point(current,path[0],progress);if(!p){path=[];state.textContent='Walking stopped: missing measured movement profile.';console.error('[QUEST_WALK_STUDIO] Missing measured movement profile');return}place(p);if(progress===1){current=path.shift();progress=0;place(nav.nodes.get(current));if(!path.length){if(destinationFacing)rig.rotation.y=Math.atan2(destinationFacing[0]-rig.position.x,destinationFacing[1]-rig.position.z);state.textContent='Reached '+destinationLabel;rig.updateMatrixWorld(true);camera.updateMatrixWorld(true);console.info('[QUEST_WALK_STUDIO] reached',current,destinationLabel,JSON.stringify({rig:rig.position.toArray(),avatarBounds:new THREE.Box3().setFromObject(rig,true).getCenter(new THREE.Vector3()).toArray(),target:controls.target.toArray(),camera:camera.position.toArray(),screen:rig.position.clone().project(camera).toArray()}));}}}
  if(document.getElementById('follow').checked){const delta=rig.position.clone().sub(lastFollow);controls.target.add(delta);camera.position.add(delta)}lastFollow.copy(rig.position);
 }controls.update();renderer.render(scene,camera);}
controls.addEventListener('change',()=>{if(paused)renderer.render(scene,camera)});
document.getElementById('open-door').onclick=()=>operateDoor(true);document.getElementById('close-door').onclick=()=>operateDoor(false);
document.getElementById('pause').onclick=()=>{paused=!paused;last=performance.now();renderer.setAnimationLoop(paused?null:render);document.getElementById('pause').textContent=paused?'Resume preview':'Pause preview'};
new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera)}).observe(host);renderer.setAnimationLoop(render);boot();

// Raycast visible rendered surfaces; do not select services through walls or cutaway remnants.
const serviceRay=new THREE.Raycaster(),servicePointer=new THREE.Vector2();let pointerStart=null;
function serviceAt(event){
 if(!serviceBindings)return null;const rect=renderer.domElement.getBoundingClientRect();servicePointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);serviceRay.setFromCamera(servicePointer,camera);
 const hit=serviceRay.intersectObjects(scene.children,true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex]:h.object.material;return m?.visible!==false&&!(m?.clippingPlanes||[]).some(p=>p.distanceToPoint(h.point)<0)});
 const service=hit?serviceBindings.find(hit.object.name):null;if(!service)return null;const box=new THREE.Box3();lodge.traverse(o=>{if(o.isMesh&&service.meshNames.includes(o.name))box.expandByObject(o,true)});const center=box.getCenter(new THREE.Vector3());return {...service,facePoint:[center.x,center.z]};
}
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,button:e.button}});
renderer.domElement.addEventListener('pointermove',e=>{renderer.domElement.style.cursor=serviceAt(e)?'pointer':'grab'});
renderer.domElement.addEventListener('pointerup',e=>{const start=pointerStart;pointerStart=null;if(!start||start.button!==0||Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const service=serviceAt(e);if(!service)return;if(paused){state.textContent='Resume the preview to walk to '+service.label;return}console.info('[LODGE_SERVICE_POINTER]',service.id,service.nodeId);choose(service)});
renderer.domElement.addEventListener('pointercancel',()=>{pointerStart=null});
