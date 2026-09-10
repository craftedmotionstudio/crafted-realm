/* ============ hollow_square_data — semantic program for Hollow Well Square ============
 * Pure data: no THREE, scene, WORLD, terrain queries, timers, or random state.
 * Coordinates are local to origin; town_square.js remains the visual composer.
 */
var HollowSquareData = (function () {
  'use strict';

  var tunables = {
    origin: { x: 0, z: -1 },
    wellCoreRadius: 4.8,
    civicRadius: 14.6,
    rimRadius: 16.8,
    laneWidth: 3.0
  };

  var districts = [
    {
      id: 'well_core', name: 'Hollow Well', purpose: 'landmark_orientation',
      character: 'ancient_stone_and_water', radialBand: [0, 4.8],
      anchorId: 'well.landmark', propRoles: ['hero_well', 'standing_stone', 'ritual_edge']
    },
    {
      id: 'north_market', name: 'Hollow Bazaar', purpose: 'trade_and_arrival',
      character: 'striped_canvas_and_crates', radialBand: [4.8, 14.6],
      anchorId: 'market.north.anchor', propRoles: ['trade_stall', 'goods_display', 'delivery_storage']
    },
    {
      id: 'east_service', name: 'Service Edge', purpose: 'daily_services',
      character: 'worked_stone_and_wayfinding', radialBand: [4.8, 14.6],
      anchorId: 'service.east.anchor', propRoles: ['service_frontage', 'signpost', 'rest_point']
    },
    {
      id: 'south_social', name: 'Commons Threshold', purpose: 'rest_and_departure',
      character: 'benches_fire_and_open_sightline', radialBand: [4.8, 14.6],
      anchorId: 'social.south.anchor', propRoles: ['bench', 'cooking_fire', 'notice_board']
    },
    {
      id: 'west_civic', name: 'Civic Edge', purpose: 'information_and_safe_services',
      character: 'bank_stone_and_lanterns', radialBand: [4.8, 14.6],
      anchorId: 'civic.west.anchor', propRoles: ['civic_frontage', 'information', 'lamp']
    },
    {
      id: 'approach_rim', name: 'Square Rim', purpose: 'threshold_and_transition',
      character: 'worn_road_into_flagstone', radialBand: [14.6, 16.8],
      anchorId: 'square.north.threshold', propRoles: ['threshold', 'road_dressing', 'sightline_frame']
    }
  ];

  var approaches = [
    { id: 'approach.north', direction: 'north', districtId: 'approach_rim', anchorId: 'square.north.threshold', laneId: 'lane.north.in', promise: 'arrival_and_brynholt_road' },
    { id: 'approach.east', direction: 'east', districtId: 'east_service', anchorId: 'square.east.threshold', laneId: 'lane.east.in', promise: 'mirrorpond_and_stonereach' },
    { id: 'approach.south', direction: 'south', districtId: 'south_social', anchorId: 'square.south.threshold', laneId: 'lane.south.in', promise: 'commons_bridge_and_danger' },
    { id: 'approach.west', direction: 'west', districtId: 'west_civic', anchorId: 'square.west.threshold', laneId: 'lane.west.in', promise: 'emberwood_and_arcane_verge' }
  ];

  var sockets = [
    { id: 'well.landmark', type: 'landmark', role: 'hero_well', districtId: 'well_core', local: { x: 0, z: 0 }, facing: 0, clearanceRadius: 4.8, wellRelated: true },
    { id: 'well.stone.north', type: 'prop', role: 'standing_stone', districtId: 'well_core', local: { x: 0, z: -4.55 }, facing: 0, clearanceRadius: 0.55, wellRelated: true },
    { id: 'well.stone.east', type: 'prop', role: 'standing_stone', districtId: 'well_core', local: { x: 4.55, z: 0 }, facing: 1.5708, clearanceRadius: 0.55, wellRelated: true },
    { id: 'well.stone.south', type: 'prop', role: 'standing_stone', districtId: 'well_core', local: { x: 0, z: 4.55 }, facing: 3.14159, clearanceRadius: 0.55, wellRelated: true },
    { id: 'well.stone.west', type: 'prop', role: 'standing_stone', districtId: 'well_core', local: { x: -4.55, z: 0 }, facing: -1.5708, clearanceRadius: 0.55, wellRelated: true },

    /* These four match the current authored stalls in town_square.js. */
    { id: 'market.stall.gem', type: 'activity', role: 'trade_stall', districtId: 'north_market', local: { x: -4.2, z: -7.6 }, facing: 0.12, clearanceRadius: 1.7, current: true },
    { id: 'market.stall.cake', type: 'activity', role: 'trade_stall', districtId: 'north_market', local: { x: 4.2, z: -7.6 }, facing: -0.1, clearanceRadius: 1.7, current: true },
    { id: 'market.stall.fur', type: 'activity', role: 'trade_stall', districtId: 'west_civic', local: { x: -7.6, z: -2.2 }, facing: 1.6508, clearanceRadius: 1.7, current: true },
    { id: 'market.stall.store', type: 'activity', role: 'trade_stall', districtId: 'east_service', local: { x: 7.6, z: -2.2 }, facing: -1.4908, clearanceRadius: 1.7, current: true },
    { id: 'market.north.anchor', type: 'anchor', role: 'district_focus', districtId: 'north_market', local: { x: 0, z: -10.8 }, facing: 3.14159, clearanceRadius: 1.0 },
    { id: 'market.delivery.crates', type: 'prop', role: 'delivery_storage', districtId: 'north_market', local: { x: 8.8, z: -7.9 }, facing: -1.5708, clearanceRadius: 0.9 },

    { id: 'service.east.anchor', type: 'anchor', role: 'district_focus', districtId: 'east_service', local: { x: 10.8, z: 0 }, facing: -1.5708, clearanceRadius: 1.0 },
    { id: 'service.signpost', type: 'activity', role: 'wayfinding', districtId: 'east_service', local: { x: 8.0, z: 5.1 }, facing: -1.5708, clearanceRadius: 0.65 },
    { id: 'service.rest.bench', type: 'activity', role: 'rest_point', districtId: 'east_service', local: { x: 6.5, z: 8.7 }, facing: -2.4, clearanceRadius: 1.4 },

    { id: 'social.south.anchor', type: 'anchor', role: 'district_focus', districtId: 'south_social', local: { x: 0, z: 10.8 }, facing: 0, clearanceRadius: 1.0 },
    { id: 'social.cooking_fire', type: 'activity', role: 'cooking_fire', districtId: 'south_social', local: { x: 4.7, z: 8.6 }, facing: 0, clearanceRadius: 1.1 },
    { id: 'social.notice_board', type: 'activity', role: 'information', districtId: 'south_social', local: { x: -5.4, z: 8.3 }, facing: 0.25, clearanceRadius: 0.9 },
    { id: 'social.rest.bench', type: 'activity', role: 'rest_point', districtId: 'south_social', local: { x: -8.2, z: 5.8 }, facing: 0.8, clearanceRadius: 1.4 },

    { id: 'civic.west.anchor', type: 'anchor', role: 'district_focus', districtId: 'west_civic', local: { x: -10.8, z: 0 }, facing: 1.5708, clearanceRadius: 1.0 },
    { id: 'civic.information', type: 'activity', role: 'information', districtId: 'west_civic', local: { x: -8.4, z: -6.2 }, facing: 1.1, clearanceRadius: 0.8 },
    { id: 'civic.lamp', type: 'prop', role: 'lamp', districtId: 'west_civic', local: { x: -6.7, z: 7.4 }, facing: 0, clearanceRadius: 0.4 },

    { id: 'square.north.threshold', type: 'transition', role: 'threshold', districtId: 'approach_rim', local: { x: 0, z: -16.0 }, facing: 3.14159, clearanceRadius: 1.5 },
    { id: 'square.east.threshold', type: 'transition', role: 'threshold', districtId: 'approach_rim', local: { x: 16.0, z: 0 }, facing: -1.5708, clearanceRadius: 1.5 },
    { id: 'square.south.threshold', type: 'transition', role: 'threshold', districtId: 'approach_rim', local: { x: 0, z: 16.0 }, facing: 0, clearanceRadius: 1.5 },
    { id: 'square.west.threshold', type: 'transition', role: 'threshold', districtId: 'approach_rim', local: { x: -16.0, z: 0 }, facing: 1.5708, clearanceRadius: 1.5 }
  ];

  var lanes = [
    { id: 'lane.north.in', kind: 'clear_walk', direction: 'south', width: 3.0, from: { x: 0, z: -16.0 }, to: { x: 0, z: -5.8 }, connects: ['approach.north', 'lane.civic.north'] },
    { id: 'lane.east.in', kind: 'clear_walk', direction: 'west', width: 3.0, from: { x: 16.0, z: 0 }, to: { x: 5.8, z: 0 }, connects: ['approach.east', 'lane.civic.east'] },
    { id: 'lane.south.in', kind: 'clear_walk', direction: 'north', width: 3.0, from: { x: 0, z: 16.0 }, to: { x: 0, z: 5.8 }, connects: ['approach.south', 'lane.civic.south'] },
    { id: 'lane.west.in', kind: 'clear_walk', direction: 'east', width: 3.0, from: { x: -16.0, z: 0 }, to: { x: -5.8, z: 0 }, connects: ['approach.west', 'lane.civic.west'] },
    { id: 'lane.civic.north', kind: 'clear_walk', direction: 'east_west', width: 2.5, from: { x: -5.8, z: -5.8 }, to: { x: 5.8, z: -5.8 }, connects: ['lane.north.in', 'lane.civic.east', 'lane.civic.west'] },
    { id: 'lane.civic.east', kind: 'clear_walk', direction: 'north_south', width: 2.5, from: { x: 5.8, z: -5.8 }, to: { x: 5.8, z: 5.8 }, connects: ['lane.east.in', 'lane.civic.north', 'lane.civic.south'] },
    { id: 'lane.civic.south', kind: 'clear_walk', direction: 'east_west', width: 2.5, from: { x: -5.8, z: 5.8 }, to: { x: 5.8, z: 5.8 }, connects: ['lane.south.in', 'lane.civic.east', 'lane.civic.west'] },
    { id: 'lane.civic.west', kind: 'clear_walk', direction: 'north_south', width: 2.5, from: { x: -5.8, z: -5.8 }, to: { x: -5.8, z: 5.8 }, connects: ['lane.west.in', 'lane.civic.north', 'lane.civic.south'] }
  ];

  var functions = [
    { id: 'function.orient', verb: 'orient', socketIds: ['well.landmark', 'service.signpost'], outcome: 'understand_town_and_exits' },
    { id: 'function.trade', verb: 'trade', socketIds: ['market.stall.gem', 'market.stall.cake', 'market.stall.fur', 'market.stall.store'], outcome: 'browse_distinct_goods' },
    { id: 'function.rest', verb: 'rest', socketIds: ['service.rest.bench', 'social.rest.bench'], outcome: 'pause_with_landmark_sightline' },
    { id: 'function.cook', verb: 'cook', socketIds: ['social.cooking_fire'], outcome: 'convert_visible_resource_to_food' },
    { id: 'function.discover', verb: 'read', socketIds: ['social.notice_board', 'civic.information'], outcome: 'learn_local_activity_and_story_hook' },
    { id: 'function.depart', verb: 'travel', socketIds: ['square.north.threshold', 'square.east.threshold', 'square.south.threshold', 'square.west.threshold'], outcome: 'choose_a_legible_destination' }
  ];

  var relationships = [
    { id: 'relation.well_orients_thresholds', kind: 'sightline', from: 'well.landmark', to: ['square.north.threshold', 'square.east.threshold', 'square.south.threshold', 'square.west.threshold'] },
    { id: 'relation.market_delivery', kind: 'supports', from: 'market.delivery.crates', to: ['market.stall.gem', 'market.stall.cake'] },
    { id: 'relation.market_faces_circulation', kind: 'faces', from: 'market.north.anchor', to: ['lane.civic.north'] },
    { id: 'relation_social_choice', kind: 'clusters', from: 'social.south.anchor', to: ['social.cooking_fire', 'social.notice_board', 'social.rest.bench'] },
    { id: 'relation_information_precedes_departure', kind: 'breadcrumbs', from: 'service.signpost', to: ['square.east.threshold', 'square.south.threshold'] },
    { id: 'relation_core_protected', kind: 'buffers', from: 'well.landmark', to: ['market.stall.gem', 'market.stall.cake', 'market.stall.fur', 'market.stall.store'] }
  ];

  var rules = {
    bounds: {
      square: { minX: -16.8, maxX: 16.8, minZ: -16.8, maxZ: 16.8 },
      protectedWellCore: { radius: 4.8 },
      civic: { radius: 14.6 },
      rim: { radius: 16.8 }
    },
    circulation: {
      movement: 'four_directional',
      minimumClearLaneWidth: 2.0,
      wellBypass: 'cardinal_lanes_stop_at_core_then_join_square_ring',
      keepThresholdSightlinesClear: true
    },
    placement: {
      authoredSocketsOnlyForGameplayProps: true,
      randomPlacementAllowedFor: ['micro_pebbles', 'rim_grass_tufts'],
      protectWellCoreUnlessWellRelated: true,
      faceActivitiesTowardLaneOrLandmark: true
    },
    hierarchy: ['well.landmark', 'district.anchor', 'activity.socket', 'micro.dressing']
  };

  function copyPoint(point) { return { x: point.x, z: point.z }; }
  function effectiveOrigin(origin) { return origin || tunables.origin; }
  function resolvePoint(local, origin) {
    var o = effectiveOrigin(origin);
    return { x: o.x + local.x, z: o.z + local.z };
  }
  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function getSocket(id) { return findById(sockets, id); }
  function resolveSocket(id, origin) {
    var socket = getSocket(id);
    if (!socket) return null;
    var world = resolvePoint(socket.local, origin);
    return { id: socket.id, x: world.x, z: world.z, facing: socket.facing, type: socket.type, role: socket.role, districtId: socket.districtId };
  }
  function resolveLane(id, origin) {
    var lane = findById(lanes, id);
    if (!lane) return null;
    return { id: lane.id, kind: lane.kind, direction: lane.direction, width: lane.width, from: resolvePoint(lane.from, origin), to: resolvePoint(lane.to, origin), connects: lane.connects.slice() };
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableStringify(value[key]);
    }).join(',') + '}';
  }
  function checksum() {
    var source = stableStringify({
      tunables: tunables, districts: districts, approaches: approaches, sockets: sockets,
      lanes: lanes, functions: functions, relationships: relationships, rules: rules
    });
    var hash = 2166136261;
    for (var i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  var api = {
    origin: copyPoint(tunables.origin),
    tunables: tunables,
    districts: districts,
    approaches: approaches,
    sockets: sockets,
    lanes: lanes,
    functions: functions,
    relationships: relationships,
    rules: rules,
    getSocket: getSocket,
    resolvePoint: resolvePoint,
    resolveSocket: resolveSocket,
    resolveLane: resolveLane,
    checksum: checksum
  };

  function runAcceptance() {
    var tests = [];
    function test(name, predicate) {
      var ok = false;
      try { ok = !!predicate(); } catch (error) { ok = false; }
      tests.push({ name: name, ok: ok });
    }
    var validTypes = ['landmark', 'anchor', 'activity', 'prop', 'transition'];
    var validRoles = ['hero_well', 'standing_stone', 'trade_stall', 'district_focus', 'delivery_storage', 'wayfinding', 'rest_point', 'cooking_fire', 'information', 'lamp', 'threshold'];
    var socketIds = sockets.map(function (socket) { return socket.id; });
    var districtIds = districts.map(function (district) { return district.id; });
    var laneIds = lanes.map(function (lane) { return lane.id; });

    test('socket ids are unique', function () { return new Set(socketIds).size === socketIds.length; });
    test('socket types and roles are valid', function () {
      return sockets.every(function (socket) { return validTypes.indexOf(socket.type) >= 0 && validRoles.indexOf(socket.role) >= 0; });
    });
    test('socket districts exist', function () { return sockets.every(function (socket) { return districtIds.indexOf(socket.districtId) >= 0; }); });
    test('approaches map to districts and anchors', function () {
      return approaches.every(function (approach) {
        return districtIds.indexOf(approach.districtId) >= 0 && socketIds.indexOf(approach.anchorId) >= 0 && laneIds.indexOf(approach.laneId) >= 0;
      });
    });
    test('sockets remain inside square and rim bounds', function () {
      var b = rules.bounds.square;
      return sockets.every(function (socket) {
        var p = socket.local;
        return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ && Math.hypot(p.x, p.z) <= tunables.rimRadius;
      });
    });
    test('well core excludes unrelated sockets', function () {
      return sockets.every(function (socket) {
        return Math.hypot(socket.local.x, socket.local.z) >= tunables.wellCoreRadius || socket.wellRelated === true;
      });
    });
    test('lanes are finite, cardinal, and at least two tiles wide', function () {
      return lanes.every(function (lane) {
        var nums = [lane.width, lane.from.x, lane.from.z, lane.to.x, lane.to.z];
        var axisAligned = lane.from.x === lane.to.x || lane.from.z === lane.to.z;
        return nums.every(Number.isFinite) && lane.width >= rules.circulation.minimumClearLaneWidth && axisAligned;
      });
    });
    test('function socket references exist', function () {
      return functions.every(function (fn) { return fn.socketIds.every(function (id) { return socketIds.indexOf(id) >= 0; }); });
    });
    test('relationships reference known program nodes', function () {
      var known = socketIds.concat(laneIds);
      return relationships.every(function (relation) {
        return known.indexOf(relation.from) >= 0 && relation.to.every(function (id) { return known.indexOf(id) >= 0; });
      });
    });
    test('checksum is deterministic across three reads', function () {
      var a = checksum(), b = checksum(), c = checksum();
      return a === b && b === c;
    });

    var failures = tests.filter(function (result) { return !result.ok; });
    if (failures.length) {
      failures.forEach(function (failure) { console.error('[HOLLOW_SQUARE_DATA] acceptance failed:', failure.name); });
      console.error('[HOLLOW_SQUARE_DATA] ' + (tests.length - failures.length) + '/' + tests.length + ' acceptance failed');
    } else {
      console.log('[HOLLOW_SQUARE_DATA] ' + tests.length + '/' + tests.length + ' acceptance ok');
    }
    api.acceptance = { passed: tests.length - failures.length, total: tests.length, failures: failures.map(function (failure) { return failure.name; }), checksum: checksum() };
  }

  runAcceptance();
  return api;
})();

if (typeof globalThis !== 'undefined') globalThis.HollowSquareData = HollowSquareData;
