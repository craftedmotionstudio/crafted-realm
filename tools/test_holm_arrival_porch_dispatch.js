const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/holm_arrival_qa.js','utf8'),start=source.indexOf(' function handleClick('),end=source.indexOf(' function update(dt)',start),body=source.slice(start,end);
const p={x:67.15,y:3,z:105.11},candidate={id:'ground:66,105',surface:'ground',x:66.5,y:3,z:105.5};
function run(orders,resolve,enabled=true){const calls=[],messages=[],resolves=[];const ctx={active:()=>enabled,Player:{},pending:null,doors:{arrival:false,garden:false},loaded:{documents:{layout:{}}},graphForDoors:()=>({testGraph:true}),isGroundName:n=>n==='ground-chunk',bridge:{order:point=>{calls.push(point);return orders.shift()}},HolmArrivalPorchTarget:{resolve:input=>{resolves.push(input);return resolve}},UI:{chat:text=>messages.push(text)}};vm.createContext(ctx);vm.runInContext(body,ctx);const result=ctx.handleClick({name:'ground-chunk',userData:{}},p);return {calls,messages,resolves,result}}
let r=run([true],candidate);assert.equal(r.calls.length,1);assert.equal(r.resolves.length,0);assert.equal(r.messages.length,0);
r=run([false,true],candidate);assert.equal(r.calls.length,2);assert.equal(r.calls[1],candidate);assert.equal(r.resolves.length,1);assert.equal(r.messages.length,0);
r=run([false],null);assert.equal(r.calls.length,1);assert.equal(r.messages.length,1);
r=run([false,false],candidate);assert.equal(r.calls.length,2);assert.equal(r.messages.length,1,'helper cannot bypass follower reachability');
r=run([true],candidate,false);assert.equal(r.result,false);assert.equal(r.calls.length,0);assert.equal(r.resolves.length,0);
console.log('[ARRIVAL_PORCH_DISPATCH] actual QA handler preserves exact orders, uses bounded fallback only on failure, retains follower rejection, and stays inactive for ordinary providers');
