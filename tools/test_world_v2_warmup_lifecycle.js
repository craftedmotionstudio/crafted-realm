'use strict';
// Behavioral scene-ownership regression; no GPU/performance claims.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../src/world_v2_warmup.js'),'utf8');
function fixture(options={}){
  let disposed=0,now=0,compiles=0;
  class Node{
    constructor(){this.children=[];this.parent=null;this.visible=true;this.isObject3D=true;this.position={copy(){}};}
    add(n){if(n.parent)n.parent.remove(n);this.children.push(n);n.parent=this;}
    remove(n){this.children=this.children.filter(x=>x!==n);if(n.parent===this)n.parent=null;}
    traverse(fn){fn(this);this.children.slice().forEach(n=>n.traverse(fn));}
  }
  class PointLight extends Node{constructor(){super();this.isLight=true;}}
  const scene=new Node(),owner=new Node(),queue=[],observed=[];
  owner.name='hidden-room';owner.visible=false;owner.add(new PointLight());scene.add(owner);
  function template(){const n=new Node();n.name='template';n.geometry=n.material={dispose(){disposed++;}};return n;}
  const renderer={info:{programs:[]},compile(s){
    compiles++;
    assert(s.children.some(n=>n.name==='world-v2-warmup'),'compile must include templates');
    observed.push({ownerVisible:owner.visible,lights:s.children.filter(n=>n.isLight).length});
    if(options.throwCompile===compiles)throw Error('injected compile failure');
  }};
  const context={scene,renderer,camera:{position:{}},THREE:{Group:Node,PointLight},
    WorldV2Buildings:{modelUrls:{house:'house.glb'},build:template},
    WorldV2Objects:{warmTemplates(){return [template()];}},navigator:{webdriver:false},
    performance:{now(){return ++now;}},console:{info(){},warn(){}},running:false,
    setTimeout(fn){queue.push(fn);}};
  vm.createContext(context);vm.runInContext(source,context);
  function clean(){assert(!scene.children.some(n=>n.name==='world-v2-warmup'),'warm-up templates leaked between synchronous passes');assert.equal(scene.children.filter(n=>n.isLight).length,0,'temporary light leaked');assert.equal(owner.visible,false,'hidden owner visibility leaked');assert.equal(disposed,0,'shared resource disposed');}
  function drain(){while(queue.length){queue.shift()();clean();}}
  return {context,observed,clean,drain,run:()=>context.WorldV2Warmup.run(),defer:()=>context.WorldV2Warmup.runDeferred()};
}
let failures=0;
function test(name,fn){try{fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}}
test('base and every deferred pass have scoped scene ownership',()=>{
  const f=fixture();f.run();f.clean();f.defer();f.clean();f.drain();
  assert.equal(f.observed.length,5);assert.deepEqual(f.observed.map(x=>x.lights),[0,1,2,3,0]);
  assert.equal(f.observed[4].ownerVisible,true);assert.equal(f.context.WorldV2Warmup.snapshot().deferred,'done');
});
test('immediate Play cancels deferred work without retained templates',()=>{
  const f=fixture();f.run();f.clean();f.context.running=true;f.defer();f.clean();f.drain();assert.equal(f.observed.length,1);
});
test('Play between deferred callbacks cancels remaining work',()=>{
  const f=fixture();f.run();f.defer();f.clean();f.context.running=true;f.drain();assert.equal(f.observed.length,2);
});
test('base compile failure cleans resources and preserves later passes',()=>{
  const f=fixture({throwCompile:1});f.run();f.clean();f.defer();f.clean();f.drain();assert.equal(f.observed.length,5);assert.equal(f.context.WorldV2Warmup.snapshot().errors.length,1);
});
test('hidden-owner compile failure restores original visibility',()=>{
  const f=fixture({throwCompile:5});f.run();f.defer();f.drain();f.clean();assert.equal(f.observed.length,5);assert.equal(f.context.WorldV2Warmup.snapshot().errors.length,1);
});
if(failures)process.exitCode=1;
