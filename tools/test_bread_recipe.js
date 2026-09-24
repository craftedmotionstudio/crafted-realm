'use strict';
// Exercise the shared production planner; no browser, Player or recipe copy.
const assert = require('node:assert/strict');
const BreadRecipe = require('../src/bread_recipe.js');
const items = {
  bucket_flour: {stack:false}, bucket_water: {stack:false}, dough: {stack:false},
  bread_dough: {stack:false}, bread: {stack:false}, coins: {stack:true}
};
const slot = (id, qty=1) => ({id,qty});
let passed=0;
function test(name, run) {
  try { run(); passed++; }
  catch(error) { console.error('[BREAD_RECIPE_TEST] FAIL '+name); throw error; }
}
function plan(inv, kind, definitions=items) {
  const before=structuredClone(inv), itemBefore=structuredClone(definitions);
  const result=BreadRecipe.plan(inv,definitions,kind);
  assert.deepEqual(inv,before,'input inventory mutated');
  assert.deepEqual(definitions,itemBefore,'item definitions mutated');
  if(result.ok) {
    assert.notStrictEqual(result.inventory,inv,'planner must return a new array');
    assert.equal(result.inventory.length,inv.length,'inventory capacity changed');
  } else {
    assert.equal(result.ok,false);
    assert.equal(typeof result.reason,'string');
    assert.ok(result.reason.length,'failure needs a reason');
    assert.ok(!result.baseXp,'failed transaction must not award XP');
    assert.ok(!result.event,'failed transaction must not notify progress');
  }
  return result;
}
function count(inv,id) { return inv.reduce((n,s)=>n+(s&&s.id===id?s.qty:0),0); }
test('mix consumes all three inputs and leaves unrelated metadata intact',()=>{
  const unrelated={id:'coins',qty:321,tag:'kept',appearance:{tint:'gold'}};
  const inv=[slot('bucket_flour'),slot('bucket_water'),slot('dough'),unrelated,null];
  const result=plan(inv,'mix');
  assert.equal(result.ok,true);
  assert.equal(result.baseXp,0); assert.equal(result.event,null);
  for(const id of ['bucket_flour','bucket_water','dough']) assert.equal(count(result.inventory,id),0);
  assert.equal(count(result.inventory,'bread_dough'),1);
  assert.deepEqual(result.inventory[3],unrelated);
  assert.equal(result.inventory.filter(s=>s===null).length,3);
});
test('full inventory mixes by using consumed slots',()=>{
  const result=plan([slot('bucket_flour'),slot('bucket_water'),slot('dough')],'mix');
  assert.equal(result.ok,true); assert.equal(count(result.inventory,'bread_dough'),1);
});
test('full single slot bakes atomically',()=>{
  const result=plan([slot('bread_dough')],'bake');
  assert.equal(result.ok,true); assert.deepEqual(result.inventory,[slot('bread')]);
  assert.equal(result.baseXp,40); assert.deepEqual(result.event,['bake','bread']);
  assert.equal(plan(result.inventory,'bake').ok,false);
});
test('mix preserves extra ingredient quantities',()=>{
  const result=plan([slot('bucket_flour',2),slot('bucket_water'),slot('dough'),null],'mix');
  assert.equal(result.ok,true); assert.equal(count(result.inventory,'bucket_flour'),1);
  assert.equal(count(result.inventory,'bread_dough'),1);
});
test('remaining quantities without a free slot cannot lose ingredients',()=>{
  assert.equal(plan([slot('bucket_flour',2),slot('bucket_water',2),slot('dough',2)],'mix').ok,false);
  assert.equal(plan([slot('bread_dough',2)],'bake').ok,false);
});
test('one bake consumes one dough even when more exist',()=>{
  const result=plan([slot('bread_dough',3),null],'bake');
  assert.equal(result.ok,true); assert.equal(count(result.inventory,'bread_dough'),2);
  assert.equal(count(result.inventory,'bread'),1); assert.equal(result.baseXp,40);
});
for(const missing of ['bucket_flour','bucket_water','dough']) test('mix missing '+missing,()=>{
  const inv=['bucket_flour','bucket_water','dough'].map(id=>id===missing?null:slot(id));
  assert.equal(plan(inv,'mix').ok,false);
});
test('missing bake input',()=>assert.equal(plan([null,null],'bake').ok,false));
for(const [kind,output,inputs] of [
  ['mix','bread_dough',['bucket_flour','bucket_water','dough']],['bake','bread',['bread_dough']]
]) test('missing '+output+' definition fails before consumption',()=>{
  const defs={...items}; delete defs[output];
  assert.equal(plan(inputs.map(id=>slot(id)),kind,defs).ok,false);
});
for(const qty of [0,-1,1.5,NaN,Infinity,'1',undefined,null]) test('reject invalid quantity '+String(qty),()=>{
  assert.equal(plan([{id:'bread_dough',qty},null],'bake').ok,false);
});
for(const malformed of [undefined,false,5,'bread_dough',{},[],{id:'',qty:1}]) test('reject malformed slot '+String(malformed),()=>{
  assert.equal(plan([slot('bread_dough'),malformed,null],'bake').ok,false);
});
test('reject missing item definition in occupied slot',()=>{
  assert.equal(plan([slot('bread_dough'),slot('unknown_item'),null],'bake').ok,false);
});
test('reject unknown recipe',()=>assert.equal(plan([slot('bread_dough'),null],'toast').ok,false));
test('zero capacity cannot manufacture ingredients',()=>assert.equal(plan([],'mix').ok,false));
test('frozen inventory and slots are accepted without writes',()=>{
  const inv=Object.freeze([Object.freeze(slot('bread_dough')),null]);
  assert.equal(plan(inv,'bake').ok,true);
});
console.log('[BREAD_RECIPE_TEST] '+passed+'/'+passed+' acceptance tests passed');
