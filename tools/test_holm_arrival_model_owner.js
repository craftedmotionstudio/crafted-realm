/* Ownership lifecycle test using actual exported node names/animation durations.
 * Fake scene/mixer objects deliberately do not claim rendering or pose proof. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const Owner=require('../src/holm_arrival_model_owner');
const base='.studio-workspaces/holm-arrival-package-v1/exports/e30d49f5b9bdafb4/files/';
const pkg=JSON.parse(fs.readFileSync(base+'assets/world/authoring/holm-arrival.package.json','utf8'));
class Node{
 constructor(name=''){this.name=name;this.children=[];this.userData={};this.visible=true;this.position={set:(x,y,z)=>Object.assign(this.position,{x,y,z})};this.rotation={};this.scale={setScalar:n=>this.scale.value=n}}
 add(n){this.children.push(n);n.parent=this}remove(n){this.children.splice(this.children.indexOf(n),1);n.parent=null}
 clone(){const n=new Node(this.name);n.userData={...this.userData};n.isMesh=this.isMesh;n.geometry=this.geometry;n.material=this.material;this.children.forEach(c=>n.add(c.clone()));return n}
 traverse(fn){fn(this);this.children.forEach(n=>n.traverse(fn))}updateMatrixWorld(){}
}
const resources=[],actions=[];let failAt=0,parses=0;
function resource(){const r={count:0,dispose(){this.count++}};resources.push(r);return r}
class Loader{parse(buffer,path,done,fail){
 parses++;if(parses===failAt){fail(Error('injected parse failure'));return}
 const b=Buffer.from(buffer),doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 const shared=resource(),nodes=doc.nodes.map(d=>{const n=new Node(d.name);if(d.mesh!==undefined){n.isMesh=true;n.geometry=resource();n.material=shared}return n});
 doc.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>nodes[i].add(nodes[c])));
 const scene=new Node();doc.scenes[doc.scene||0].nodes.forEach(i=>scene.add(nodes[i]));
 done({scene,animations:(doc.animations||[]).map(a=>({name:a.name,duration:Math.max(...a.samplers.map(s=>doc.accessors[s.input].max[0]))}))});
}}
class Mixer{constructor(root){this.root=root}getRoot(){return this.root}uncacheRoot(){}stopAllAction(){}update(){}
 clipAction(c){const a={time:0,play(){return this},getClip(){return c}};actions.push(a);return a}
}
const THREE={Group:Node,GLTFLoader:Loader,AnimationMixer:Mixer};
const files=Object.fromEntries(pkg.objects.map(o=>[o.asset.model.path,new Uint8Array(fs.readFileSync(base+o.asset.model.path))]));
async function run(){
 const existing={},WORLD={grounds:[existing],clickables:[existing]},scene=new Node();
 const owner=await Owner.create({THREE,scene,WORLD,loaded:{package:pkg,files}});
 assert.equal(scene.children.length,2);assert.deepEqual([...new Set(WORLD.grounds.slice(1).map(n=>n.userData.arrivalSurface))].sort(),['dock','ground','stair','upper']);
 assert(WORLD.grounds.slice(1).every(n=>n.userData.kind==='arrival_surface'));
 assert.deepEqual([...new Set(WORLD.clickables.filter(n=>n.userData?.arrivalDoor).map(n=>n.userData.arrivalDoor))].sort(),['arrival','garden']);
 owner.setDoors({arrival:true,garden:false});
 const south=actions.find(a=>a.getClip().name==='DoorSouthOpen');assert.equal(south.time,south.getClip().duration);assert.equal(actions.find(a=>a.getClip().name==='DoorNorthOpen').time,0);
 owner.setDoors({arrival:false,garden:false},{animate:true});assert(owner.doorsMoving());
 owner.update(.1,'ground');assert(south.time>0&&south.time<south.getClip().duration,'closing traverses authored clip');
 const mid=south.time;owner.setDoors({arrival:true,garden:false},{animate:true});assert.equal(south.time,mid,'reversal does not snap');
 for(let i=0;i<30;i++)owner.update(.1,'ground');assert.equal(south.time,south.getClip().duration);assert(!owner.doorsMoving());
 owner.setDoors({arrival:false,garden:true});assert.equal(south.time,0);assert(!owner.doorsMoving(),'restore selects endpoints immediately');
 owner.update(.1,'ground');let upper,roof;owner.house.traverse(n=>{if(n.name==='UpperFloor')upper=n;if(n.name==='Roof')roof=n});assert.equal(upper.visible,false);assert.equal(roof.visible,false);
 owner.update(.1,'stair');assert.equal(upper.visible,true,'stair users can see and click the upper landing');assert.equal(roof.visible,false);
 owner.update(.1,'upper');assert.equal(upper.visible,true);assert.equal(roof.visible,false);
 owner.update(.1,'dock');assert.equal(roof.visible,true);
 owner.dispose();owner.dispose();assert.equal(scene.children.length,0);assert.deepEqual(WORLD.grounds,[existing]);assert.deepEqual(WORLD.clickables,[existing]);assert(resources.every(r=>r.count===1));
 const sceneryBase='.studio-workspaces/holm-arrival-package-v3/exports/89e7cf10543d97bf/files/';
 const sceneryPackage=JSON.parse(fs.readFileSync(sceneryBase+'assets/world/authoring/holm-arrival.package.json'));
 const sceneryFiles=Object.fromEntries(sceneryPackage.objects.map(o=>[o.asset.model.path,new Uint8Array(fs.readFileSync(sceneryBase+o.asset.model.path))]));
 const beforeParses=parses,beforeActions=actions.length;
 const sceneryOwner=await Owner.create({THREE,scene,WORLD,loaded:{package:sceneryPackage,files:sceneryFiles}});
 assert.equal(scene.children.length,20);assert.equal(parses-beforeParses,10,'one parse per unique asset');
 assert.equal(actions.slice(beforeActions).filter(a=>a.getClip().name==='Breeze').length,9,'each oak/hazel instance owns its mixer action');
 sceneryOwner.dispose();sceneryOwner.dispose();assert(resources.every(r=>r.count===1),'shared resources disposed exactly once');assert.deepEqual(WORLD.grounds,[existing]);assert.deepEqual(WORLD.clickables,[existing]);assert.equal(scene.children.length,0);
 failAt=parses+2;await assert.rejects(Owner.create({THREE,scene,WORLD,loaded:{package:pkg,files}}),/injected parse failure/);
 assert(resources.every(r=>r.count===1));assert.deepEqual(WORLD.grounds,[existing]);assert.deepEqual(WORLD.clickables,[existing]);assert.equal(scene.children.length,0);
 assert.deepEqual([...new Uint8Array(Owner.exactBuffer(new Uint8Array([4,5,6,7]).subarray(1,3)))],[5,6]);
 console.log('[HolmArrivalModelOwner] exported semantics, door endpoint contract, cutaway, registration and exact-once disposal PASS; rendering remains browser QA');
}
run().catch(e=>{console.error(e);process.exitCode=1});
