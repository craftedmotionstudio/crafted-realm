/* Headless contract tests only. Real walking, collision and browser QA remain separate. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/holm_station_reach.js'), 'utf8');
assert.ok(fs.existsSync(path.join(__dirname, '../src/scheduler.js')), 'scheduler base missing');

function fixture() {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, {x, y, z}); }
    clone() { return new Vector3(this.x, this.y, this.z); }
  }
  function building(dx = 10, dy = 3, dz = 20) {
    return {
      updateMatrixWorld() {},
      localToWorld(p) { p.x += dx; p.y += dy; p.z += dz; return p; }
    };
  }
  const state = {root: building(), queued: [], calls: [], messages: []};
  const context = {
    THREE: {Vector3},
    scene: {getObjectByName(name) { return name === 'world-object-bakehouse' ? state.root : null; }},
    player: {position: new Vector3(12, 3, 24)},
    Player: {plane: 0, moveTo: null},
    groundY: () => 3,
    orderWalk() {},
    UI: {chat(message) { state.messages.push(message); }},
    Sched: {walkThen(target, reach, callback, priority) {
      state.queued.push({target, reach, callback, priority});
      context.Player.moveTo = target;
    }},
    console
  };
  vm.createContext(context);
  vm.runInContext(source, context, {filename: 'holm_station_reach.js'});
  return {state, context, api: context.HolmStationReach, building,
    fire: value => state.calls.push(value), tile: {x: 2, z: 4}};
}

const tests = [];
function test(name, body) { tests.push({name, body}); }
function refuse(f, tile = f.tile, reach) {
  assert.doesNotThrow(() => f.api.at('bakehouse', tile, () => f.fire('acted'), reach));
  assert.equal(f.state.calls.length, 0, 'handler must not run');
}
function distant(f) { f.context.player.position.x = 0; }
function arrive(f) { Object.assign(f.context.player.position, {x:12, y:3, z:24}); }
function pending(f) {
  distant(f);
  f.api.at('bakehouse', f.tile, () => f.fire('acted'));
  assert.equal(f.state.queued.length, 1, 'one walk must be scheduled');
  return f.state.queued[0].callback;
}

test('worldTile transforms local X/Z and explicit local height', () => {
  const f = fixture(), p = f.api.worldTile('bakehouse', {x:2, y:1.2, z:4});
  assert.equal(p.x, 12); assert.equal(p.y, 4.2); assert.equal(p.z, 24);
});
test('worldTile retains local zero height for legacy tiles', () => {
  const f = fixture(); assert.equal(f.api.worldTile('bakehouse', f.tile).y, 3);
});
test('near ground station invokes once without scheduling', () => {
  const f = fixture(); f.api.at('bakehouse', f.tile, () => f.fire('acted'));
  assert.deepEqual(f.state.calls, ['acted']); assert.equal(f.state.queued.length, 0);
});
test('legacy height resolves groundY instead of root height', () => {
  const f = fixture(); f.context.groundY = () => 8; f.context.player.position.y = 8;
  f.api.at('bakehouse', f.tile, () => f.fire('acted'));
  assert.equal(f.state.calls.length, 1);
});
test('explicit height uses the root transform, not groundY', () => {
  const f = fixture(); f.context.groundY = () => 99; f.context.player.position.y = 4.2;
  f.api.at('bakehouse', {...f.tile, y:1.2}, () => f.fire('acted'));
  assert.equal(f.state.calls.length, 1);
});
test('explicit matching upper plane can act', () => {
  const f = fixture(); f.context.Player.plane = 2;
  f.api.at('bakehouse', {...f.tile, plane:2}, () => f.fire('acted'));
  assert.equal(f.state.calls.length, 1);
});
test('wrong plane refuses even at matching coordinates', () => {
  const f = fixture(); f.context.Player.plane = 1; refuse(f);
});
test('explicit wrong plane refuses', () => {
  const f = fixture(); refuse(f, {...f.tile, plane:1});
});
test('height greater than 0.5 refuses immediate action', () => {
  const f = fixture(); f.context.player.position.y = 3.501; refuse(f);
});
test('height within 0.5 permits immediate action', () => {
  const f = fixture(); f.context.player.position.y = 3.49;
  f.api.at('bakehouse', f.tile, () => f.fire('acted')); assert.equal(f.state.calls.length, 1);
});
for (const field of ['player', 'Player', 'scene']) test(`missing ${field} fails closed`, () => {
  const f = fixture(); delete f.context[field]; refuse(f);
});
test('missing building root fails closed', () => { const f = fixture(); f.state.root = null; refuse(f); });
for (const tile of [null, {}, {x:NaN,z:4}, {x:2,z:Infinity}, {x:'2',z:4},
  {x:2,z:4,y:NaN}, {x:2,z:4,y:null}, {x:2,z:4,plane:NaN}]) {
  test(`malformed tile ${JSON.stringify(tile)} fails closed`, () => refuse(fixture(), tile));
}
for (const reach of [0, -1, NaN, Infinity, '1']) {
  test(`invalid reach ${String(reach)} fails closed`, () => refuse(fixture(), undefined, reach));
}
for (const axis of ['x','y','z']) test(`nonfinite player ${axis} fails closed`, () => {
  const f = fixture(); f.context.player.position[axis] = NaN; refuse(f);
});
for (const dependency of ['Sched','orderWalk']) test(`missing ${dependency} cannot activate distant station`, () => {
  const f = fixture(); distant(f); delete f.context[dependency]; refuse(f);
});
test('scheduled arrival preserves target, priority and exactly-once callback', () => {
  const f = fixture(), callback = pending(f), q = f.state.queued[0];
  assert.equal(q.target.x,12); assert.equal(q.target.y,3); assert.equal(q.target.z,24);
  assert.equal(q.priority,'strong'); assert.equal(f.state.calls.length,0);
  arrive(f); callback(); callback(); assert.deepEqual(f.state.calls,['acted']);
});
test('explicit height survives into the scheduled target', () => {
  const f = fixture(); distant(f);
  f.api.at('bakehouse', {...f.tile,y:1.2}, () => f.fire('acted'));
  assert.equal(f.state.queued.length,1); assert.equal(f.state.queued[0].target.y,4.2);
});
test('arrival refuses a replacement root at identical coordinates', () => {
  const f = fixture(), callback = pending(f); arrive(f); f.state.root = f.building(); callback();
  assert.equal(f.state.calls.length,0);
});
test('arrival refuses a removed root', () => {
  const f = fixture(), callback = pending(f); arrive(f); f.state.root = null; callback();
  assert.equal(f.state.calls.length,0);
});
test('arrival refuses the same root after its transform moves', () => {
  const f = fixture(), callback = pending(f); arrive(f);
  f.state.root.localToWorld = p => { p.x += 11; p.y += 3; p.z += 20; return p; };
  callback(); assert.equal(f.state.calls.length,0);
});
test('blocked scheduling cancels and permanently refuses its callback', () => {
  const f = fixture(); let callback, cancelled;
  distant(f);
  f.context.Sched.walkThen = (target, reach, fn) => { callback = fn; return 41; };
  f.context.Sched.cancel = id => { cancelled = id; };
  f.api.at('bakehouse',f.tile,() => f.fire('acted'));
  assert.equal(cancelled,41); arrive(f); callback(); assert.equal(f.state.calls.length,0);
});
test('arrival refuses a floor change', () => {
  const f = fixture(), callback = pending(f); arrive(f); f.context.Player.plane = 1; callback();
  assert.equal(f.state.calls.length,0);
});
for (const axis of ['x','y','z']) test(`arrival rechecks finite player ${axis}`, () => {
  const f = fixture(), callback = pending(f); arrive(f); f.context.player.position[axis] = NaN; callback();
  assert.equal(f.state.calls.length,0);
});
test('arrival rechecks distance rather than trusting scheduler', () => {
  const f = fixture(), callback = pending(f); callback(); assert.equal(f.state.calls.length,0);
});
test('arrival rechecks height rather than trusting scheduler', () => {
  const f = fixture(), callback = pending(f); arrive(f); f.context.player.position.y = 3.501; callback();
  assert.equal(f.state.calls.length,0);
});
test('guard passes the exact original interaction context', () => {
  const f = fixture(), ctx = {item:'raw_fish', target:{id:'oven'}};
  distant(f); f.api.guard('bakehouse', f.tile, value => f.fire(value))(ctx);
  assert.equal(f.state.queued.length,1); arrive(f); f.state.queued[0].callback();
  assert.equal(f.state.calls.length,1); assert.equal(f.state.calls[0],ctx);
});

let passed = 0;
for (const {name, body} of tests) {
  try { body(); passed++; }
  catch (error) { console.error(`[HOLM_STATION_REACH] FAIL ${name}: ${error.message}`); }
}
console.log(`[HOLM_STATION_REACH] ${passed}/${tests.length} contract checks passed (headless; not live navigation acceptance)`);
if (passed !== tests.length) process.exitCode = 1;
