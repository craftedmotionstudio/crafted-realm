'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Metrics=require('../src/frame_stage_metrics.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('ok '+name);}
function sample(start,visible=true,focused=true,work=[1,.25,2]){
  return {start,updateEnd:start+work[0],mapEnd:start+work[0]+work[1],
    renderEnd:start+work[0]+work[1]+work[2],visible,focused};
}
function near(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
function stream(fps,work){const m=Metrics.create();for(let i=0;i<120;i++) assert.equal(m.record(sample(i*1000/fps,true,true,work)),true);return m.snapshot();}
test('60 FPS light synchronous work',()=>{
  const s=stream(60,[1,.25,2]);near(s.visibleFps,60);near(s.all.totalMs.mean,3.25);
  near(s.all.outsideFrameMs.mean,1000/60-3.25);assert.equal(s.visibleIntervals.count,119);
});
test('14 FPS light work retains outside-frame gap without cause claim',()=>{
  const s=stream(14,[1,.25,2]);near(s.visibleFps,14);near(s.all.renderMs.mean,2);
  near(s.longestRecentInterval.outsideFrameMs,1000/14-3.25);
  assert.equal(s.longestRecentInterval.previousFrame.totalMs,3.25);
});
test('14 FPS slow render differs from light work',()=>{
  const s=stream(14,[1,.25,65]);near(s.visibleFps,14);near(s.all.renderMs.mean,65);
  near(s.all.outsideFrameMs.mean,1000/14-66.25);
});
test('ring evicts old slow stage and longest interval',()=>{
  const m=Metrics.create(2);[sample(0),sample(100),sample(120),sample(140)].forEach(s=>m.record(s));
  const s=m.snapshot();assert.equal(s.samples,2);assert.equal(s.accepted,4);
  assert.equal(s.longestRecentInterval.intervalMs,20);assert.equal(s.longestRecentInterval.currentFrame.start,140);
});
test('hidden/resume spans excluded from visible FPS; focus separately evidenced',()=>{
  const m=Metrics.create();[[0,true,true],[20,true,true],[1000,false,false],
    [2000,false,false],[3000,true,false],[3020,true,false],[3040,true,true],[3060,true,true]].forEach(v=>m.record(sample(...v)));
  const s=m.snapshot();assert.equal(s.hiddenSamples,2);assert.equal(s.visibleSamples,6);
  assert.equal(s.visibleFocusedSamples,4);assert.equal(s.visibleIntervals.count,4);
  assert.equal(s.visibleFocusedIntervals.count,2);near(s.visibleFps,50);near(s.visibleFocusedFps,50);
  assert.equal(s.visible.intervalMs.count,4);assert.equal(s.visibleFocused.intervalMs.count,2);
  near(s.visible.outsideFrameMs.mean,16.75);
  assert.equal(s.longestRecentInterval.visibleSpan,false);
});
test('malformed samples cannot throw or corrupt valid chronology',()=>{
  const m=Metrics.create();m.record(sample(10));
  const bad=[null,undefined,{},sample(NaN),sample(Infinity),sample(-1),sample(10),sample(12),
    {...sample(20),updateEnd:19},{...sample(20),mapEnd:20},{...sample(20),renderEnd:21},
    {...sample(20),visible:1},{...sample(20),focused:null},{get start(){throw Error('bad getter');}}];
  for(const s of bad) assert.equal(m.record(s),false);
  assert.equal(m.record(sample(30)),true);assert.equal(m.snapshot().rejected,bad.length);
  assert.equal(m.snapshot().all.intervalMs.mean,20);
});
test('inputs unchanged and nested snapshots detached',()=>{
  const m=Metrics.create();const input=Object.freeze(sample(0));m.record(input);m.record(sample(20));
  const s=m.snapshot();s.all.renderMs.mean=900;s.longestRecentInterval.previousFrame.totalMs=999;
  assert.equal(m.snapshot().all.renderMs.mean,2);assert.equal(m.snapshot().longestRecentInterval.previousFrame.totalMs,3.25);
  assert.deepEqual(input,sample(0));
});
test('empty, singleton, capacity bounds and nearest-rank p95',()=>{
  assert.equal(Metrics.create().snapshot().visibleFps,null);
  assert.equal(Metrics.create(0).snapshot().capacity,180);assert.equal(Metrics.create(1000000).snapshot().capacity,10000);
  const m=Metrics.create(1);m.record(sample(0));assert.equal(m.snapshot().visibleFps,null);
  const n=Metrics.create(20);for(let i=1;i<=20;i++)n.record(sample(i*100,true,true,[i,0,0]));
  assert.equal(n.snapshot().all.updateMs.p95,19);assert.equal(n.snapshot().all.updateMs.max,20);
});
test('classic-script API has no dependency on browser or engine',()=>{
  const context={console:{log(){}}};vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/frame_stage_metrics.js'),'utf8'),context);
  assert.equal(context.FrameStageMetrics.create().record(sample(0)),true);
});
console.log(`[FrameStageMetrics tests] ${passed}/${passed} acceptance ok`);
