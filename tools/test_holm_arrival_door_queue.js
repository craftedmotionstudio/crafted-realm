/* Locks the old-school door rule in the arrival draft: a far click on a door walks to the nearest stance
 * beside it and opens it on arrival; a near click toggles at once; an unreachable door says so. */
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/holm_arrival_qa.js','utf8');
const body=source.slice(source.indexOf(' function toggleDoor('),source.indexOf(' return {requested'));
const doorPos={x:66,y:4,z:104.3};
function world(opts){
  const log={orders:[],setDoors:[],animated:[],chat:[]};
  const nodes=[{id:'ground:66,105',x:66.5,z:105.5},{id:'ground:66,103',x:66.5,z:103.5},{id:'ground:61,118',x:61.5,z:118.5}];
  let pose={nodeId:'ground:61,118',moving:false};
  const ctx={
    Math,Infinity,active:()=>true,Player:{},pending:null,doors:{arrival:false,garden:false},water:null,extras:null,island:false,islandData:null,
    player:{position:{x:opts.px,z:opts.pz}},
    graphForDoors:()=>({nodes}),
    bridge:{order:n=>{log.orders.push(n.id);return opts.reachable!==false},setDoors:d=>{log.setDoors.push(d);return true},snapshot:()=>pose},
    owner:{setDoors:(d,o)=>log.animated.push(!!(o&&o.animate)),update(){}},
    THREE:{Box3:function(){this.setFromObject=()=>this;this.getCenter=v=>Object.assign(v,doorPos)},Vector3:function(){}},
    UI:{chat:t=>log.chat.push(t)},HolmGuideHall:{},isGroundName:()=>false,loaded:{package:{navigation:{interactions:[]}}}
  };
  vm.createContext(ctx);vm.runInContext(body,ctx);
  ctx.arrive=id=>{pose={nodeId:id,moving:false}};
  return {ctx,log};
}
const door={userData:{kind:'arrival_door',arrivalDoor:'arrival'}};
// far click: walk to the stance on the player's side, nothing toggles until arrival
let w=world({px:61.5,pz:118.5});
assert.equal(w.ctx.handleClick(door,{}),true);
assert.equal(JSON.stringify(w.log.orders),'["ground:66,105"]','walks to the porch stance, not the far side');
assert.equal(w.log.setDoors.length,0,'door does not open from a distance');
w.ctx.update(0.016);assert.equal(w.log.setDoors.length,0,'still walking');
w.ctx.arrive('ground:66,105');w.ctx.update(0.016);
assert.equal(JSON.stringify(w.log.setDoors),'[{"arrival":true,"garden":false}]');assert.equal(JSON.stringify(w.log.animated),'[true]');
w.ctx.update(0.016);assert.equal(w.log.setDoors.length,1,'opens exactly once');
// near click toggles immediately
w=world({px:66.5,pz:105.5});w.ctx.handleClick(door,{});
assert.equal(w.log.orders.length,0);assert.equal(JSON.stringify(w.log.setDoors),'[{"arrival":true,"garden":false}]');
// unreachable door gives one honest message and queues nothing
w=world({px:61.5,pz:118.5,reachable:false});w.ctx.handleClick(door,{});
assert.equal(w.log.chat.length,1);w.ctx.arrive('ground:66,105');w.ctx.update(0.016);assert.equal(w.log.setDoors.length,0);
console.log('[ARRIVAL_DOOR_QUEUE] far click walks to the near-side stance and opens once on arrival; near click toggles; unreachable refuses');
