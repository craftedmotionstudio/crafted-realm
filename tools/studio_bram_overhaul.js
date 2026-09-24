import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#809086');
renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,100);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
controls.minDistance=1.5;controls.maxDistance=22;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight('#fff2d3','#516249',2));
const sun=new THREE.DirectionalLight('#fff1d8',2);sun.position.set(-3,6,5);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({color:'#879178'}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
scene.add(new THREE.GridHelper(6,6,'#b4b399','#8e987f'));
function frame(game){controls.target.set(0,.95,0);camera.position.set(...(game?[7,9,11]:[2.7,1.9,4.5]));controls.update()}
document.getElementById('close').onclick=()=>frame(false);document.getElementById('game').onclick=()=>frame(true);frame(false);
let mixer,active;
try{
 const g=await new GLTFLoader().loadAsync('../.studio-workspaces/guide-bram-overhaul-v1/candidates/bram.glb?v=1');
 scene.add(g.scene);mixer=new THREE.AnimationMixer(g.scene);
 for(const name of ['Idle','Talk','Walk']){
  const clip=g.animations.find(c=>c.name===name);if(!clip)throw Error('Missing '+name+' animation');
  const action=mixer.clipAction(clip),button=document.createElement('button');button.textContent=name;
  button.onclick=()=>{if(active)active.fadeOut(.18);action.reset().fadeIn(.18).play();active=action;document.getElementById('status').textContent=name+' · 1.90 tiles · Blender export · visual acceptance pending'};
  document.getElementById('clips').append(button);if(name==='Idle')button.click();
 }
}catch(error){document.getElementById('status').textContent='Candidate failed: '+error.message;console.error(error)}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(mixer)mixer.update(dt);controls.update();renderer.render(scene,camera)});
