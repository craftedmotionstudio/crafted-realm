/* Headless contract for the Tutor's Holm guide arrow (src/holm_island_guide.js; goal items "exact arrows" and "clear
 * direction ... no step where a new player has to guess", audit 2026-09-29). The real module runs in a VM over a stub
 * scene: each bakehouse sub-step points at the station that works next (the mix takes flour, water and dough; a bin or
 * the butt fills only an empty bucket); a lost tool sends the arrow to the Guide House's spare-tools rack; spent runes
 * or arrows send it to the trial's tutor (or to arrows lying close by); a target in the offshore ore workings seen
 * from the surface is reached by the Quarry Gate shaft (take the rope, tie it, climb down), and a surface target seen
 * from the workings by the ladder up (or the east drift once it is open).
 * Run: node tools/test_holm_island_guide.js */
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const SRC=fs.readFileSync(path.join(__dirname,'..','src','holm_island_guide.js'),'utf8');
class V3{constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}}
class Box3{constructor(){this.min=null;this.max=null}setFromObject(o){if(o.box){this.min=new V3(...o.box[0]);this.max=new V3(...o.box[1])}return this}isEmpty(){return !this.min}
 getCenter(v){return v.set((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,(this.min.z+this.max.z)/2)}}
function obj(name,at,extra){const [x,y,z]=at;return Object.assign({name,box:[[x-.4,y,z-.4],[x+.4,y+1,z+.4]],userData:{},isMesh:true,visible:true,position:new V3(x,y,z),getWorldPosition(v){return v.set(x,y,z)}},extra||{})}
function world(o){
 o=o||{};const inv=Object.assign({},o.inv||{});
 const objects=[
  obj('rack',[60,3,95],{userData:{kind:'arrival_provisions'}}),
  obj('svc-bucket',[44,5,66],{userData:{islandService:{label:'Take bucket',building:'bakehouse'}}}),
  obj('svc-flour',[46,5,64],{userData:{islandService:{label:'Fill bucket with flour',building:'bakehouse'}}}),
  obj('svc-water',[45,5,67],{userData:{islandService:{label:'Fill bucket with water',building:'bakehouse'}}}),
  obj('svc-dough',[44,5,65],{userData:{islandService:{label:'Take dough',building:'bakehouse'}}}),
  obj('svc-oven',[42,5,63],{userData:{islandService:{label:'Cook',building:'bakehouse'}}}),
  obj('svc-shaft',[36,2,30],{userData:{islandService:{label:'Climb-down mine shaft',target:'shaft',building:'quarry'}}}),
  obj('svc-up',[200,-30,58],{userData:{islandService:{label:'Climb-up ladder',target:'ladder',building:'cavern'}}}),
  obj('svc-drift',[210,-30,60],{userData:{islandService:{label:'Climb-up drift ladder',target:'exit',building:'cavern'}}}),
  obj('island-rope-coil',[36.5,2,30.4]),
  obj('island-tutor-ilse',[90,4,20]),obj('island-tutor-tobin',[101.5,2,13.5]),
  obj('svc-ll-down1',[123,23.5,24],{userData:{islandService:{label:'Climb-down ladder',target:'ladder1-top',building:'lastlight'}}}),obj('svc-ll-down2',[121,26.5,26],{userData:{islandService:{label:'Climb-down ladder',target:'ladder2-top',building:'lastlight'}}}),
  obj('svc-ll-down3',[124,29.5,24],{userData:{islandService:{label:'Climb-down ladder',target:'ladder3-top',building:'lastlight'}}}),obj('svc-ll-up3',[122,26.5,25],{userData:{islandService:{label:'Climb-up ladder',target:'ladder3-foot',building:'lastlight'}}}),obj('island-tutor-corrick',[75,9,40]),
  obj('island-lesson-survival-oak-1',[30,2,88]),obj('island-lesson-cavern-copper-1',[204,-30,62])].concat(o.extra||[]);
 const ctx={console,Math,JSON,Object,Array,String,Number,Infinity,parseInt,
  HolmIsland:{live:()=>true},THREE:{Vector3:V3,Box3},
  scene:{getObjectByName:n=>objects.find(q=>q.name===n)||null,traverse:f=>objects.forEach(f)},
  player:{position:new V3(...(o.at||[40,3,70]))},
  Player:{count:id=>inv[id]||0,equip:Object.assign({weapon:null,ammo:null},o.equip||{}),inv:Object.keys(inv).map(id=>({id,qty:inv[id]})),spell:o.spell||null},
  ITEMS:{hatchet:{name:'Bronze hatchet',tool:'woodcutting'},iron_hatchet:{name:'Iron hatchet',tool:'woodcutting'},tinderbox:{name:'Tinderbox',tool:true},fishing_net:{name:'Small net',tool:'fishing'},
   pickaxe:{name:'Bronze pickaxe',tool:'mining'},hammer:{name:'Hammer',tool:true}},
  WORLD:{drops:o.drops||[]},
  HolmArrivalQA:{saveRecord:()=>({surface:o.surface||'land'}),qaStance:(b,t)=>o.lastlight&&b==='lastlight'&&t==='door'?{x:120,y:20,z:25}:null},
  HolmShaftRope:{active:()=>true,stage:()=>o.rope||'take',COIL_NAME:'island-rope-coil'},
  HolmIslandGates:{serviceBlocked:(b,t)=>o.driftOpen?null:'roped off'}};
 vm.createContext(ctx);vm.runInContext(SRC+'\n;globalThis.__G=HolmIslandGuide;',ctx,{filename:'holm_island_guide.js'});
 return {G:ctx.__G,ctx};
}
const name=a=>a?(a.obj?a.obj.name:a.pack?'pack:'+a.pack:a.tab?'tab:'+a.tab:null):null;
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
check('bread: each sub-step points at the station that works next, in the order a bucket, flour, another bucket, water, dough, knead, bake',()=>{
 const seq=[[{},'svc-bucket'],[{bucket:1},'svc-flour'],[{bucket_flour:1},'svc-bucket'],[{bucket_flour:1,bucket:1},'svc-water'],[{bucket_flour:1,bucket_water:1},'svc-dough'],
  [{bucket_flour:1,bucket_water:1,dough:1},'pack:bucket_flour'],[{bread_dough:1},'svc-oven']];
 seq.forEach(([inv,want])=>assert.strictEqual(name(world({inv}).G.aim('bake_bread')),want,JSON.stringify(inv)));
});
check('bread regression: flour and dough but no water -> the water (the mix needs all three), never "use the flour on the dough"',()=>{
 assert.strictEqual(name(world({inv:{bucket_flour:1,dough:1,bucket:1}}).G.aim('bake_bread')),'svc-water');
 assert.strictEqual(name(world({inv:{bucket_flour:1,dough:1}}).G.aim('bake_bread')),'svc-bucket');
});
check('bread regression: only a bucket of water in hand -> another bucket, not the flour bin (the bin fills only an empty bucket)',()=>{
 const a=world({inv:{bucket_water:1}}).G.aim('bake_bread');assert.strictEqual(name(a),'svc-bucket');assert.strictEqual(a.label,'Take another bucket');
});
check('a lost tool is named for its step (held in the pack or worn, any tool of the kind counts)',()=>{
 assert.strictEqual(world({inv:{}}).G.lostTool('chop_logs'),'hatchet');
 assert.strictEqual(world({equip:{weapon:'hatchet'}}).G.lostTool('chop_logs'),null);
 assert.strictEqual(world({inv:{iron_hatchet:1}}).G.lostTool('chop_logs'),null);
 assert.strictEqual(world({inv:{logs:1}}).G.lostTool('light_fire'),'tinderbox');
 assert.strictEqual(world({inv:{logs:1,tinderbox:1}}).G.lostTool('light_fire'),null);
 assert.strictEqual(world({inv:{}}).G.lostTool('catch_fish'),'fishing_net');
 assert.strictEqual(world({inv:{raw_perch:1,logs:1}}).G.lostTool('cook_fish'),'tinderbox');
 assert.strictEqual(world({inv:{}}).G.lostTool('mine_copper'),'pickaxe');
 assert.strictEqual(world({inv:{bronze_bar:1}}).G.lostTool('forge_dagger'),'hammer');
 assert.strictEqual(world({inv:{}}).G.lostTool('bake_bread'),null);
});
check('recovery: the arrow goes to the spare-tools rack, labelled with the tool',()=>{
 const a=world({inv:{logs:1}}).G.recovery('light_fire');assert.strictEqual(name(a),'rack');assert.strictEqual(a.label,'Take a spare tinderbox from the rack');
 assert.strictEqual(world({inv:{logs:1,tinderbox:1}}).G.recovery('light_fire'),null);
});
check('recovery: spent runes -> Magister Ilse; spent arrows -> arrows lying close by, else Warden Corrick',()=>{
 assert.strictEqual(name(world({inv:{air_rune:0,mind_rune:4}}).G.recovery('magic_trial')),'island-tutor-ilse');
 assert.strictEqual(world({inv:{air_rune:3,mind_rune:4}}).G.recovery('magic_trial'),null);
 assert.strictEqual(name(world({inv:{},equip:{weapon:'worn_bow'}}).G.recovery('ranged_trial')),'island-tutor-corrick');
 const drop=obj('drop-arrows',[41,3,71],{userData:{id:'arrows'}});
 assert.strictEqual(name(world({inv:{},drops:[drop]}).G.recovery('ranged_trial')),'drop-arrows');
 assert.strictEqual(world({inv:{arrows:5}}).G.recovery('ranged_trial'),null);
});
check('from the surface a target in the offshore ore workings is reached by the shaft: take the rope, tie it, climb down',()=>{
 const rock={obj:world().ctx.scene.getObjectByName('island-lesson-cavern-copper-1'),label:'Mine copper'};
 let w=world({surface:'land',rope:'take'});assert.strictEqual(name(w.G.viaShaft({obj:w.ctx.scene.getObjectByName('island-lesson-cavern-copper-1'),label:'x'})),'island-rope-coil');
 w=world({surface:'land',rope:'tie'});let a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('island-lesson-cavern-copper-1'),label:'x'});assert.strictEqual(name(a),'svc-shaft');assert.strictEqual(a.label,'Use the rope on the shaft');
 w=world({surface:'land',rope:'climb'});a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('island-lesson-cavern-copper-1'),label:'x'});assert.strictEqual(a.label,'Climb down the rope');
 w=world({surface:'b:cavern:Floor'});a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('island-lesson-cavern-copper-1'),label:'Mine copper'});assert.strictEqual(a.label,'Mine copper','in the workings the rock itself');
 assert(rock.label);
});
check('from the ore workings a surface target is reached by the ladder up, or the east drift once it is open',()=>{
 let w=world({surface:'b:cavern:Floor',driftOpen:false});let a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('rack'),label:'x'});assert.strictEqual(name(a),'svc-up');assert.strictEqual(a.label,'Climb up to the shaft');
 w=world({surface:'b:cavern:Floor',driftOpen:true});a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('rack'),label:'x'});assert.strictEqual(name(a),'svc-drift');
 w=world({surface:'land'});a=w.G.viaShaft({obj:w.ctx.scene.getObjectByName('rack'),label:'keep'});assert.strictEqual(a.label,'keep','a surface target from the surface is unchanged');
});
check('in Lastlight\'s upper floors a target off the storey (Ferryman Tobin at the cove) is reached by that floor\'s ladder down; the tower\'s own ladders are left alone',()=>{
 const tob=w=>({obj:w.ctx.scene.getObjectByName('island-tutor-tobin'),label:'Talk to Ferryman Tobin'});
 let w=world({lastlight:true,surface:'b:lastlight:0:Lastlight_UpperFloorWatchTiles',at:[121.5,26.5,26.5]});let a=w.G.viaLastlight(tob(w));assert.strictEqual(name(a),'svc-ll-down2');assert.strictEqual(a.label,'Climb down the ladder');
 w=world({lastlight:true,surface:'b:lastlight:0:Lastlight_UpperFloorWatchTiles',at:[130.5,29.8,24.5]});assert.strictEqual(name(w.G.viaLastlight(tob(w))),'svc-ll-down3','the lantern deck, ten tiles and more from the storm door');
 w=world({lastlight:true,surface:'b:lastlight:0:StagedTerrain',at:[121.5,26.5,26.5]});assert.strictEqual(name(w.G.viaLastlight(tob(w))),'island-tutor-tobin','outside the tower (its terrain patch): straight on');
 w=world({lastlight:true,surface:'b:lastlight:0:Lastlight_UpperFloorWatchTiles',at:[123.5,23.8,24.5]});assert.strictEqual(name(w.G.viaLastlight(tob(w))),'svc-ll-down1');
 w=world({lastlight:true,surface:'b:lastlight:0:Lastlight_FloorWingTiles',at:[121,20.2,25]});assert.strictEqual(name(w.G.viaLastlight(tob(w))),'island-tutor-tobin','the ground floor: straight on');
 w=world({lastlight:true,surface:'b:lastlight:0:Lastlight_UpperFloorWatchTiles',at:[121.5,26.5,26.5]});assert.strictEqual(name(w.G.viaLastlight({obj:w.ctx.scene.getObjectByName('svc-ll-up3'),label:'Climb the ladder'})),'svc-ll-up3');
});
console.log('[HOLM_ISLAND_GUIDE] '+passed+'/9 checks passed');if(passed!==9)process.exit(1);
