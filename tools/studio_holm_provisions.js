import * as THREE from 'three';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#829083');renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.05,100),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minDistance=1.5;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight('#fff2d3','#516249',2));const sun=new THREE.DirectionalLight('#fff1d8',2);sun.position.set(-3,6,5);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshLambertMaterial({color:'#879178'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);scene.add(new THREE.GridHelper(8,8,'#b4b399','#8e987f'));
function frame(game){controls.target.set(0,.8,0);camera.position.set(...(game?[7,9,11]:[2.3,2.1,4.2]));controls.update()}
document.getElementById('detail').onclick=()=>frame(false);document.getElementById('game').onclick=()=>frame(true);frame(false);
try{const gltf=await new GLTFLoader().loadAsync('../.studio-workspaces/holm-provision-rack-v1/candidates/provisions.glb?v=1');scene.add(gltf.scene);const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());document.getElementById('status').textContent=`${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} tiles · visual review pending`;}
catch(error){document.getElementById('status').textContent='Load failed: '+error.message;console.error(error)}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
