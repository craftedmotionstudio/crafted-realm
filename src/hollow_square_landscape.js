/* ============ Hollow Well Square — authored landscape composition data ============
 * Pure data only: no THREE, scene, WORLD, terrain queries, or random generation.
 *
 * Coordinate convention:
 *   - every `at`, `center`, `path`, and polygon point is LOCAL to `origin`
 *   - +x is east, -x is west, +z is south, -z is north
 *   - paths are axis-aligned because Crafted Realm movement is four-directional
 *
 * Audited against src/town_square.js and src/veyhollow_town.js. The north edge feeds
 * the bank/store/church group; the south edge feeds the smithy/arcana/pub group.
 * A composer may resolve the local points at runtime, but must not mutate this plan.
 */
var HollowSquareLandscape = (function(){
  'use strict';

  var origin = {x:0, z:-1};
  var tunables = {
    wellCoreRadius:4.8,
    wellApronOuterRadius:7.2,
    minCorridorWidth:2.0,
    defaultCorridorWidth:3.2,
    squareSoftEdgeRadius:16.8,
    furnishingLaneClearance:0.35
  };

  /* Hardscape is deliberately a family of unequal, interlocking shapes rather than
   * one circular material stamp. Surface priority is low-to-high. */
  var surfaces = [
    {
      id:'square_dirt_fringe', role:'transition', shape:'irregular_ring',
      center:[0,0], innerRadius:13.8, outerRadius:16.8,
      purpose:'Feather the worked square into grass without a hard circular boundary.'
    },
    {
      id:'well_apron', role:'hero_hardscape', shape:'annulus',
      center:[0,0], innerRadius:4.8, outerRadius:7.2,
      purpose:'Give the Hollow Well a quiet, unobstructed stone apron on every side.'
    },
    {
      id:'north_market_forecourt', role:'market_hardscape', shape:'polygon',
      points:[[-7.8,-5.4],[-6.5,-13.7],[6.8,-13.9],[8.0,-5.5],[5.9,-4.5],[-5.7,-4.5]],
      purpose:'Join the well apron to the northern market and civic services.'
    },
    {
      id:'east_civic_spur', role:'service_hardscape', shape:'polygon',
      points:[[4.6,-5.8],[14.8,-4.0],[16.2,1.9],[7.0,4.6],[4.6,3.2]],
      purpose:'Carry a readable approach toward the bank and eastern gate.'
    },
    {
      id:'south_working_forecourt', role:'working_hardscape', shape:'polygon',
      points:[[-6.2,4.5],[6.5,4.4],[8.2,13.8],[-7.1,14.3],[-8.0,8.1]],
      purpose:'Make the southern edge feel used by deliveries, crafts, and the pub.'
    },
    {
      id:'west_residential_spur', role:'neighbourhood_hardscape', shape:'polygon',
      points:[[-4.7,-4.3],[-15.8,-3.2],[-16.5,2.6],[-7.0,4.7],[-4.6,3.0]],
      purpose:'Narrow the paving into a quieter residential and western-gate approach.'
    }
  ];

  /* Thresholds mark the moment each road becomes square. Their widths match the
   * protected corridors, and their inward facing is explicit for prop composition. */
  var thresholds = [
    {
      id:'threshold_north', cardinal:'N', at:[0,-14.6], width:3.2, facing:'S',
      purpose:'Arrival from the church, bank, general store, and north gate.',
      feeds:['approach_church','approach_bank','approach_general_store']
    },
    {
      id:'threshold_east', cardinal:'E', at:[15.5,0], width:3.0, facing:'W',
      purpose:'Arrival from the garden quarter and east gate.',
      feeds:['approach_bank','approach_east_gate']
    },
    {
      id:'threshold_south', cardinal:'S', at:[0,15.8], width:3.2, facing:'N',
      purpose:'Arrival from the smithy, arcana shop, Hearthhouse, and pub.',
      feeds:['approach_smithy','approach_arcana','approach_hearthhouse','approach_pub']
    },
    {
      id:'threshold_west', cardinal:'W', at:[-15.5,0], width:3.0, facing:'E',
      purpose:'Arrival from the western homes and west gate.',
      feeds:['approach_west_gate']
    }
  ];

  /* These are protected movement AND sightline corridors. Keep them free of all
   * raised furnishing. Paths contain no diagonal segment. */
  var corridors = [
    {
      id:'corridor_north', cardinal:'N', width:3.2,
      path:[[0,-4.8],[0,-14.6]], protects:['movement','well_sightline'],
      purpose:'Keep a clean view and four-direction route from the north threshold to the well.'
    },
    {
      id:'corridor_east', cardinal:'E', width:3.0,
      path:[[4.8,0],[15.5,0]], protects:['movement','well_sightline'],
      purpose:'Keep the east arrival legible from the well apron.'
    },
    {
      id:'corridor_south', cardinal:'S', width:3.2,
      path:[[0,4.8],[0,15.8]], protects:['movement','well_sightline'],
      purpose:'Keep the craft and pub approach open to the well.'
    },
    {
      id:'corridor_west', cardinal:'W', width:3.0,
      path:[[-4.8,0],[-15.5,0]], protects:['movement','well_sightline'],
      purpose:'Keep the quieter western approach navigable and visually anchored.'
    }
  ];

  /* Approximate audited facade approaches, retained as local composition targets.
   * They are not collision or interaction positions; the composer should terrain-
   * probe and eyes-on tune the final joins. */
  var approaches = [
    {id:'approach_bank', at:[7.5,-11.5], facing:'E', purpose:'West-facing bank door apron.'},
    {id:'approach_general_store', at:[-8.0,-11.0], facing:'W', purpose:'East-facing general-store door apron.'},
    {id:'approach_church', at:[-6.0,-12.5], facing:'N', purpose:'South church entrance approach.'},
    {id:'approach_smithy', at:[13.0,9.2], facing:'S', purpose:'North-facing smithy door and cinder-yard approach.'},
    {id:'approach_arcana', at:[-9.7,13.0], facing:'W', purpose:'East-facing arcana-shop door approach.'},
    {id:'approach_hearthhouse', at:[-4.0,15.4], facing:'S', purpose:'North-facing Hearthhouse approach.'},
    {id:'approach_pub', at:[8.0,16.8], facing:'S', purpose:'North-facing Wayfarer\'s Rest approach.'},
    {id:'approach_east_gate', at:[20.0,0], facing:'W', purpose:'Continuation toward the east gate.'},
    {id:'approach_west_gate', at:[-20.0,0], facing:'E', purpose:'Continuation toward the west gate.'}
  ];

  /* Each furnishing has a gameplay/environmental purpose, explicit facing, and an
   * anchor explaining what it belongs to. Footprints are hints for a future composer. */
  var furnishings = [
    {
      id:'seat_northwest', role:'seating', at:[-6.2,-5.6], footprint:[2.0,0.7],
      purpose:'A short resting point that faces the well without blocking northbound travel.',
      facing:{mode:'look_at', target:[0,0]}, anchor:{kind:'surface', id:'north_market_forecourt'}
    },
    {
      id:'seat_northeast', role:'seating', at:[6.3,-5.7], footprint:[2.0,0.7],
      purpose:'Balance the market edge and frame the Hollow Well from the north.',
      facing:{mode:'look_at', target:[0,0]}, anchor:{kind:'surface', id:'north_market_forecourt'}
    },
    {
      id:'seat_southwest', role:'seating', at:[-6.4,6.0], footprint:[2.0,0.7],
      purpose:'Give the quieter edge a social pause between the well and southern services.',
      facing:{mode:'look_at', target:[0,0]}, anchor:{kind:'surface', id:'south_working_forecourt'}
    },
    {
      id:'noticeboard_civic', role:'noticeboard', at:[-9.2,-8.1], footprint:[1.4,0.6],
      purpose:'Place town notices on the route shared by the store and church.',
      facing:{mode:'cardinal', value:'SE'}, anchor:{kind:'surface', id:'north_market_forecourt'}
    },
    {
      id:'bank_delivery_cart', role:'cart', at:[10.0,-7.8], footprint:[2.4,1.3],
      purpose:'Explain how coin chests and records reach the bank while keeping its door clear.',
      facing:{mode:'cardinal', value:'N'}, anchor:{kind:'approach', id:'approach_bank'}
    },
    {
      id:'drain_northwest', role:'drain', at:[-4.4,-5.1], footprint:[0.8,0.8],
      purpose:'Show where rainwater leaves the slightly raised well apron.',
      facing:{mode:'slope', value:'NW'}, anchor:{kind:'surface', id:'well_apron'}
    },
    {
      id:'drain_southeast', role:'drain', at:[4.5,5.1], footprint:[0.8,0.8],
      purpose:'Break the paving symmetry and continue the square drainage story.',
      facing:{mode:'slope', value:'SE'}, anchor:{kind:'surface', id:'well_apron'}
    },
    {
      id:'planter_west', role:'planter', at:[-9.0,5.8], footprint:[1.8,1.2],
      purpose:'Soften the residential edge and separate it from the working forecourt.',
      facing:{mode:'cardinal', value:'E'}, anchor:{kind:'surface', id:'west_residential_spur'}
    },
    {
      id:'planter_east', role:'planter', at:[9.1,5.9], footprint:[1.8,1.2],
      purpose:'Mark the handoff from civic paving to the southern working edge.',
      facing:{mode:'cardinal', value:'W'}, anchor:{kind:'surface', id:'east_civic_spur'}
    }
  ];

  /* Soft-edge clusters use authored nodes. A renderer may omit nodes after terrain or
   * collision probes, but must never replace them with random scatter. */
  var softClusters = [
    {
      id:'soft_northwest', role:'grass_and_stone', anchor:{kind:'surface', id:'square_dirt_fringe'},
      purpose:'Let grass reclaim the seam between the store/church route and plaza.',
      nodes:[
        {id:'soft_nw_tuft_1', kind:'tuft', at:[-11.8,-7.0], scale:0.9},
        {id:'soft_nw_tuft_2', kind:'tuft', at:[-10.7,-9.4], scale:1.2},
        {id:'soft_nw_stone_1', kind:'pebble_cluster', at:[-8.4,-10.0], scale:0.8},
        {id:'soft_nw_weed_1', kind:'dock_weed', at:[-13.0,-5.4], scale:1.0}
      ]
    },
    {
      id:'soft_northeast', role:'cart_wear_and_weeds', anchor:{kind:'surface', id:'square_dirt_fringe'},
      purpose:'Give the bank delivery side a worn verge instead of ornamental symmetry.',
      nodes:[
        {id:'soft_ne_rut_1', kind:'wheel_rut', at:[11.8,-6.0], scale:1.3},
        {id:'soft_ne_tuft_1', kind:'tuft', at:[13.3,-5.1], scale:1.0},
        {id:'soft_ne_stone_1', kind:'pebble_cluster', at:[10.0,-10.5], scale:0.9},
        {id:'soft_ne_weed_1', kind:'dock_weed', at:[14.2,-8.0], scale:0.8}
      ]
    },
    {
      id:'soft_southwest', role:'garden_escape', anchor:{kind:'surface', id:'square_dirt_fringe'},
      purpose:'Carry a few domestic plants out from the western homes without forming a garden bed.',
      nodes:[
        {id:'soft_sw_flower_1', kind:'small_flower', at:[-11.4,6.7], scale:0.9},
        {id:'soft_sw_tuft_1', kind:'tuft', at:[-13.0,8.2], scale:1.2},
        {id:'soft_sw_stone_1', kind:'pebble_cluster', at:[-8.1,10.1], scale:0.8},
        {id:'soft_sw_flower_2', kind:'small_flower', at:[-10.1,12.0], scale:0.7}
      ]
    },
    {
      id:'soft_southeast', role:'working_edge', anchor:{kind:'surface', id:'square_dirt_fringe'},
      purpose:'Blend the square into the sootier smithy and pub approach.',
      nodes:[
        {id:'soft_se_ash_1', kind:'ash_scuff', at:[10.8,8.0], scale:1.2},
        {id:'soft_se_tuft_1', kind:'dry_tuft', at:[12.8,6.1], scale:1.0},
        {id:'soft_se_stone_1', kind:'pebble_cluster', at:[8.4,10.3], scale:1.0},
        {id:'soft_se_ash_2', kind:'ash_scuff', at:[11.7,11.5], scale:0.8}
      ]
    }
  ];

  function clone(value){
    if(Array.isArray(value)) return value.map(clone);
    if(value && typeof value==='object'){
      var out={}; Object.keys(value).forEach(function(k){ out[k]=clone(value[k]); });
      return out;
    }
    return value;
  }

  function resolvePoint(local, customOrigin){
    var o=customOrigin || origin;
    var lx=Array.isArray(local)?local[0]:local.x;
    var lz=Array.isArray(local)?local[1]:local.z;
    return {x:o.x+lx, z:o.z+lz};
  }

  function resolvePoints(points, customOrigin){
    return points.map(function(point){ return resolvePoint(point,customOrigin); });
  }

  function stableStringify(value){
    if(value===null || typeof value!=='object') return JSON.stringify(value);
    if(Array.isArray(value)) return '['+value.map(stableStringify).join(',')+']';
    return '{'+Object.keys(value).sort().map(function(k){
      return JSON.stringify(k)+':'+stableStringify(value[k]);
    }).join(',')+'}';
  }

  function checksum(value){
    var source=stableStringify(value), hash=2166136261;
    for(var i=0;i<source.length;i++){
      hash^=source.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return ('00000000'+(hash>>>0).toString(16)).slice(-8);
  }

  function segmentDistance(point,a,b){
    var vx=b[0]-a[0], vz=b[1]-a[1];
    var wx=point[0]-a[0], wz=point[1]-a[1];
    var vv=vx*vx+vz*vz;
    var t=vv===0?0:Math.max(0,Math.min(1,(wx*vx+wz*vz)/vv));
    return Math.hypot(point[0]-(a[0]+t*vx), point[1]-(a[1]+t*vz));
  }

  function runAcceptance(data){
    var checks=[];
    function assert(label,ok){ checks.push({label:label,ok:!!ok}); }

    var allIds=[];
    [data.surfaces,data.thresholds,data.corridors,data.approaches,data.furnishings,data.softClusters]
      .forEach(function(group){ group.forEach(function(item){
        allIds.push(item.id);
        if(item.nodes) item.nodes.forEach(function(node){ allIds.push(node.id); });
      }); });
    assert('unique semantic ids', allIds.length===new Set(allIds).size && allIds.every(Boolean));

    var coordinates=[];
    function collectCoordinates(value,key){
      if(!value || typeof value!=='object') return;
      Object.keys(value).forEach(function(k){
        var v=value[k];
        if((k==='at'||k==='center'||k==='target') && Array.isArray(v)) coordinates.push(v);
        else if((k==='points'||k==='path') && Array.isArray(v)) v.forEach(function(p){ coordinates.push(p); });
        collectCoordinates(v,k);
      });
    }
    collectCoordinates(data,'root');
    assert('finite local coordinates', coordinates.length>0 && coordinates.every(function(p){
      return Array.isArray(p) && p.length===2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
    }));

    assert('well core unobstructed', data.furnishings.every(function(item){
      return Math.hypot(item.at[0],item.at[1])>=data.tunables.wellCoreRadius;
    }));

    var cardinals=['N','E','S','W'];
    assert('four cardinal thresholds', cardinals.every(function(cardinal){
      return data.thresholds.some(function(item){ return item.cardinal===cardinal && item.width>=data.tunables.minCorridorWidth; });
    }));

    assert('four cardinal axis-aligned corridors', cardinals.every(function(cardinal){
      var corridor=data.corridors.find(function(item){ return item.cardinal===cardinal; });
      return corridor && corridor.width>=data.tunables.minCorridorWidth && corridor.path.length>=2 &&
        corridor.path.every(function(point,index){
          if(index===0) return true;
          var prev=corridor.path[index-1];
          return point[0]===prev[0] || point[1]===prev[1];
        });
    }));

    assert('furnishing purpose facing anchor', data.furnishings.every(function(item){
      return !!item.purpose && !!item.facing && !!item.anchor && !!item.anchor.kind && !!item.anchor.id;
    }));

    assert('protected corridors clear', data.furnishings.every(function(item){
      var radius=Math.max(item.footprint[0],item.footprint[1])/2;
      return data.corridors.every(function(corridor){
        for(var i=1;i<corridor.path.length;i++){
          if(segmentDistance(item.at,corridor.path[i-1],corridor.path[i]) <
             corridor.width/2+radius+data.tunables.furnishingLaneClearance) return false;
        }
        return true;
      });
    }));

    var checksumData={
      origin:data.origin, tunables:data.tunables, surfaces:data.surfaces,
      thresholds:data.thresholds, corridors:data.corridors, approaches:data.approaches,
      furnishings:data.furnishings, softClusters:data.softClusters
    };
    var sums=[checksum(checksumData),checksum(checksumData),checksum(checksumData)];
    assert('deterministic checksum repeated three times', sums[0]===sums[1] && sums[1]===sums[2]);

    var passed=checks.filter(function(check){ return check.ok; }).length;
    if(passed!==checks.length){
      var failed=checks.filter(function(check){ return !check.ok; }).map(function(check){ return check.label; });
      throw new Error('[HOLLOW_SQUARE_LANDSCAPE] acceptance failed: '+failed.join(', '));
    }
    console.info('[HOLLOW_SQUARE_LANDSCAPE] '+passed+'/'+checks.length+' acceptance ok');
    return {passed:passed,total:checks.length,checksum:sums[0],checks:checks};
  }

  var api={
    version:1,
    origin:origin,
    tunables:tunables,
    surfaces:surfaces,
    thresholds:thresholds,
    corridors:corridors,
    approaches:approaches,
    furnishings:furnishings,
    softClusters:softClusters,
    resolvePoint:resolvePoint,
    resolvePoints:resolvePoints,
    clone:clone,
    checksum:checksum
  };
  api.acceptance=runAcceptance(api);
  return api;
})();

if(typeof globalThis!=='undefined') globalThis.HollowSquareLandscape=HollowSquareLandscape;
