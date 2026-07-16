/* ================= WORLD V2 BUILDING DATA =================
 * Pure authored definitions for complete, enterable buildings. Visuals are
 * composed by world_v2_buildings.js; streaming/runtime ownership stays in
 * world_v2_objects.js. Keeping the contract here lets the game, Studio, and
 * headless acceptance tests consume exactly the same rooms, doors, services,
 * collision, and placement data.
 */
var WorldV2BuildingData=(function(){
  'use strict';

  function wall(id,ax,az,bx,bz){
    var dx=bx-ax,dz=bz-az;
    return {id:id,type:'obox',x:(ax+bx)/2,z:(az+bz)/2,hw:Math.sqrt(dx*dx+dz*dz)/2,
      hd:0.17,rot:Math.atan2(dz,dx),role:'wall'};
  }
  function barrier(id,ax,az,bx,bz){ var c=wall(id,ax,az,bx,bz); c.role='support'; return c; }

  var guideHall={
    id:'holm_guide_hall_v1', assetId:'holm_guide_hall', revision:6,
    label:"Tutor's Holm Guide Hall", padId:'guide_hall',
    placement:{x:151,z:155,rot:0},
    footprint:{w:26,d:24,h:9.2},
    purpose:{
      primary:'Study the island route before beginning the lesson circuit.',
      secondary:'Review the lesson register and current departure readiness.',
      storyClue:'The First Landing plaque records that the Holm trains survivors, not chosen heroes.',
      support:'A provision bay stores packs, charts, oilskins, and teaching supplies.'
    },
    rooms:[
      {id:'orientation_hall',label:'Great Orientation Hall',role:'primary-service',
        bounds:{x:0,z:0,w:12.5,d:13.5}},
      {id:'records_nook',label:'Records Nook',role:'secondary-use',
        bounds:{x:-9,z:0,w:6,d:11}},
      {id:'provision_bay',label:'Provision Bay',role:'support-space',
        bounds:{x:9,z:0,w:6,d:11}},
      {id:'teaching_apse',label:'Teaching Apse',role:'through-destination',
        bounds:{x:0,z:-9.2,w:9,d:5.8}}
    ],
    // The south door receives new arrivals; the north teaching door turns the
    // building into part of the journey instead of a cul-de-sac.
    doors:[
      {id:'front_door',label:'Arrival door',side:'S',x:-1.3,z:11,width:2.6,
        opening:{x:0,z:11},closedRot:0,openRot:-1.9,entry:{inside:[0,9.7],outside:[0,12.5]}},
      {id:'teaching_door',label:'Teaching door',side:'N',x:1.3,z:-12,width:2.6,
        opening:{x:0,z:-12},closedRot:Math.PI,openRot:Math.PI-1.9,entry:{inside:[0,-10.7],outside:[0,-13.3]}}
    ],
    flow:{entryDoor:'front_door',exitDoor:'teaching_door'},
    services:[
      {id:'orientation_table',partId:'orientation_table',kind:'holm_orientation',role:'primary',
        position:[0,0],interactionTile:[0,3.0]},
      {id:'lesson_register',partId:'lesson_register',kind:'holm_register',role:'secondary',
        position:[-8.45,1],interactionTile:[-7.0,1]}
    ],
    clues:[
      {id:'first_landing_plaque',partId:'first_landing_plaque',kind:'holm_story_clue',
        position:[-5.15,6.05],interactionTile:[-4.0,5.2]}
    ],
    supportSpaces:[
      {id:'provision_rack',partId:'provision_rack',kind:'holm_provisions',
        position:[11.2,-0.1],interactionTile:[9.6,-0.1]}
    ],
    // Oriented wall strips follow the Blender silhouette instead of collapsing
    // the building back into a rectangular collision shell.
    colliders:[
      wall('south_w',-3,11,-1.3,11), wall('south_e',1.3,11,3,11),
      wall('outer_01',3,11,4.5,9.5), wall('outer_02',4.5,9.5,4.5,7),
      wall('outer_03',4.5,7,8,7), wall('outer_04',8,7,12,3.5),
      wall('outer_05',12,3.5,12,-4), wall('outer_06',12,-4,9.5,-6.5),
      wall('outer_07',9.5,-6.5,6,-6.5), wall('outer_08',6,-6.5,4.5,-8),
      wall('outer_09',4.5,-8,4.5,-10.5), wall('outer_10',4.5,-10.5,3,-12),
      wall('north_e',3,-12,1.3,-12), wall('north_w',-1.3,-12,-3,-12),
      wall('outer_12',-3,-12,-4.5,-10.5), wall('outer_13',-4.5,-10.5,-4.5,-8),
      wall('outer_14',-4.5,-8,-6,-6.5), wall('outer_15',-6,-6.5,-9.5,-6.5),
      wall('outer_16',-9.5,-6.5,-12,-4), wall('outer_17',-12,-4,-12,3.5),
      wall('outer_18',-12,3.5,-8,7), wall('outer_19',-8,7,-4.5,7),
      wall('outer_20',-4.5,7,-4.5,9.5), wall('outer_21',-4.5,9.5,-3,11),
      {id:'orientation_table',type:'circle',x:0,z:0,r:1.5,role:'service'},
      {id:'records_shelf',type:'obox',x:-11.2,z:-0.1,hw:2.4,hd:0.38,rot:Math.PI/2,role:'support'},
      {id:'lesson_register',type:'rect',x:-8.45,z:1,hw:0.75,hd:1.3,role:'support'},
      {id:'provision_rack',type:'obox',x:11.2,z:-0.1,hw:2.4,hd:0.38,rot:Math.PI/2,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_guide_hall_v6.glb',
      source:'assets/blender/holm_guide_hall_v6.blend',
      manifest:'assets/manifests/holm_guide_hall_v6.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_orientation','holm_register','holm_story_clue','holm_provisions'],
      reference:'Bible_References/Tutorial_Island_Building.jpg',
      visualProfile:{
        cameraRead:'hand-authored warm low-poly construction at the elevated OSRS camera',
        silhouette:'one continuous chamfered great-hall shell under a connected gable roof hierarchy',
        requiredFeatures:['compass mosaic','Holm relief chart','fitted seven-plank full-frame doors',
          'recessed stained glass family','irregular fieldstone and timber bays',
          'layered connected roof tiles','occupational records and provision clusters']
      },
      // Studio includes its inspection helpers in the displayed triangle count;
      // the manifest separately holds the stricter 6,500-triangle GLB lock.
      visualBudget:{maxTriangles:38000,maxDrawCalls:140,maxPrimitives:70,maxMaterials:18,maxFileBytes:2700000}
    }
  };

  var survivalWorkyard={
    id:'holm_survival_workyard_v1',assetId:'holm_survival_workyard',revision:17,
    label:"Tutor's Holm Survival Workyard",padId:'survival_shelter',
    // Sink the authored foundation so the finished floor lands exactly on the
    // navigation elevation; the player stands on the boards instead of through them.
    placement:{x:116,z:151,rot:0,yOffset:-0.16},
    footprint:{w:20,d:14,h:7.2},
    interiorBounds:{x:0.25,z:0,w:19.5,d:13.5},
    purpose:{
      primary:'Maintain the hatchets, nets, tinderboxes, cookware, and camp tools used in Survival Wood.',
      secondary:'Practice Woodcutting, Firemaking, Fishing, and Cooking around a dedicated teaching hearth.',
      storyClue:'A carved storm tally records the seasons when the Holm survived from its cellar reserves.',
      support:'An unobstructed covered court, fitted cement work surface, fishing-preparation cluster, dry pond approach, and storm cellar make every space part of island survival.'
    },
    rooms:[
      {id:'survival_lodge',label:'Survival Lodge',role:'primary-service',bounds:{x:-5,z:0,w:8,d:12}},
      {id:'tool_bay',label:'Tool and Crockery Bay',role:'secondary-use',bounds:{x:-6,z:-1,w:5,d:6}},
      {id:'hearth_passage',label:'Hearth Passage',role:'through-destination',bounds:{x:0.34,z:-2,w:2.8,d:2.8}},
      {id:'teaching_hearth',label:'Many-Sided Teaching Hearth',role:'story-and-cooking',bounds:{x:5,z:-2,w:7.2,d:7.2}},
      {id:'covered_workyard',label:'Covered Work Court',role:'support-space',bounds:{x:3.55,z:3.2,w:8.2,d:5.3}},
      {id:'storm_cellar',label:'Storm Reserve Cellar',role:'sublevel-storage',bounds:{x:0,z:0,w:12,d:9},plane:-1}
    ],
    // The trail door enters the lodge. The east door exits the many-sided
    // hearth room toward the pond, so circulation explains the compound shape.
    doors:[
      {id:'trail_door',label:'Trail door',side:'S',x:-3.4,z:6,width:1.55,
        opening:{x:-2.625,z:6},closedRot:0,openRot:-1.535,
        entry:{inside:[-2.3,4.7],outside:[-2.3,7.25]}},
      {id:'pond_door',label:'Pond door',side:'E',x:8.326,z:-1.1,width:1.5,
        opening:{x:8.326,z:-1.85},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[7.05,-1.85],outside:[9.1,-1.85]}}
    ],
    flow:{entryDoor:'trail_door',exitDoor:'pond_door'},
    services:[
      {id:'tool_bench',partId:'tool_bench',kind:'holm_survival_tools',role:'primary',
        position:[-6.15,0.95],interactionTile:[-4.35,0.95]},
      {id:'firemaking_board',partId:'firemaking_board',kind:'holm_firemaking_board',role:'secondary',
        position:[-8.78,-2.1],interactionTile:[-7.25,-2.1]},
      {id:'teaching_fireplace',partId:'teaching_fireplace',kind:'holm_teaching_hearth',role:'supporting-service',
        position:[5,-4.92],interactionTile:[5,-3.45]}
    ],
    clues:[
      {id:'storm_tally_beam',partId:'storm_tally_beam',kind:'holm_storm_tally',
        position:[-3.42,-5.74],interactionTile:[-3.42,-4.55]}
    ],
    supportSpaces:[
      {id:'net_rack',partId:'net_rack',kind:'holm_net_rack',
        position:[5.05,2.65],interactionTile:[5.05,1.55]},
      {id:'timber_log_rack',partId:'timber_log_rack',kind:'prop',
        position:[2.25,4.70],interactionTile:[2.25,3.35],purpose:'Keep cut lesson timber restrained above the damp court floor'},
      {id:'chopping_block',partId:'chopping_block',kind:'prop',
        position:[0.80,2.25],interactionTile:[-0.25,2.25],purpose:'Show where felled logs are reduced to controlled hearth fuel'},
      {id:'sawbuck',partId:'sawbuck',kind:'prop',
        position:[4.60,4.55],interactionTile:[4.60,3.20],purpose:'Hold one interrupted cross-cut as evidence of the yard\'s daily work'},
      {id:'waterworks_pulley',partId:'pulley_crank',kind:'holm_waterworks_pulley',
        position:[14.92,-2.83],interactionTile:[14.97,-2.20],purpose:'Lower an empty lesson bucket into the pond and return it full without leaving the dock lane'},
      {id:'fishing_edge',partId:'fishing_water_patch',kind:'holm_fishing_edge',
        position:[17.52,-0.75],interactionTile:[14.95,-0.75],purpose:'Teach the existing Small net at a quiet, visibly inhabited pond edge without turning the dock into clutter'},
      {id:'future_poultry_socket',partId:'chicken_spawn_socket',kind:'future_socket',
        position:[7.5,4],purpose:'Reserve a future poultry lesson without shipping an empty decorative pen'},
      {id:'cellar_ladder',partId:'cellar_ladder',kind:'holm_cellar_ladder',
        position:[-5.65,3.65],interactionTile:[-5.65,2.35]}
    ],
    furnishings:[
      {id:'workyard_crockery_hutch',partId:'workyard_crockery_hutch',purpose:'Store lesson crockery at reachable player scale'},
      {id:'workyard_mug_shelf',partId:'workyard_mug_shelf',purpose:'Dry and count the four handled lesson mugs'},
      {id:'workyard_empty_bucket',partId:'workyard_empty_bucket',purpose:'Reserve the portable vessel for the later pond-pulley lesson'},
      {id:'workyard_tool_stool',partId:'workyard_tool_stool',purpose:'Provide a repaired seat at the maintenance side of the bench'},
      {id:'workyard_lodge_rug',partId:'workyard_lodge_rug',purpose:'Warm the standing teaching area without blocking its route'},
      {id:'workyard_hearth_rug',partId:'workyard_hearth_rug',purpose:'Define the safe observation ring around the fire lesson'},
      {id:'workyard_lesson_table',partId:'workyard_lesson_table',purpose:'Present tinder, kindling, and fuel in visible order'},
      {id:'workyard_hearth_stool_splitter',partId:'workyard_hearth_stool_splitter',purpose:'Seat one learner beside the kindling lesson'},
      {id:'workyard_hearth_stool_woven',partId:'workyard_hearth_stool_woven',purpose:'Seat a second learner in a visibly distinct local craft style'},
      {id:'workyard_storm_warden_relief',partId:'workyard_storm_warden_relief',purpose:'Connect the practical lessons to the Holm storm wardens'}
    ],
    colliders:[
      wall('lodge_west',-9,6,-9,-6), wall('lodge_north',-9,-6,-1,-6),
      wall('lodge_south_w',-9,6,-3.4,6), wall('lodge_south_e',-1.85,6,-1,6),
      wall('lodge_east_s',-1,6,-1,-0.65), wall('lodge_east_n',-1,-3.35,-1,-6),
      wall('passage_south',-1,-0.65,1.674,-0.622),
      wall('passage_north',-1,-3.35,1.674,-3.378),
      wall('hearth_0',8.326,-3.378,6.378,-5.326), wall('hearth_1',6.378,-5.326,3.622,-5.326),
      wall('hearth_2',3.622,-5.326,1.674,-3.378), wall('hearth_4',1.674,-0.622,3.622,1.326),
      wall('hearth_5',3.622,1.326,6.378,1.326), wall('hearth_6',6.378,1.326,8.326,-0.622),
      wall('hearth_east_s',8.326,-0.622,8.326,-1.1), wall('hearth_east_n',8.326,-2.6,8.326,-3.378),
      {id:'tool_bench',type:'rect',x:-6.15,z:0.95,hw:1.68,hd:0.76,role:'service'},
      {id:'teaching_fireplace',type:'rect',x:5,z:-4.92,hw:1.5,hd:0.72,role:'service'},
      {id:'net_rack',type:'rect',x:5.05,z:2.65,hw:1.75,hd:0.58,role:'support'},
      {id:'timber_log_rack',type:'rect',x:2.25,z:4.70,hw:1.60,hd:0.75,role:'support'},
      {id:'chopping_block',type:'circle',x:0.80,z:2.25,r:0.70,role:'support'},
      {id:'sawbuck',type:'obox',x:4.60,z:4.55,hw:0.95,hd:0.80,rot:0.28,role:'support'},
      {id:'cellar_ladder',type:'circle',x:-5.65,z:3.65,r:0.9,role:'support'},
      {id:'court_post_se',type:'circle',x:7.25,z:5.4,r:0.22,role:'support'},
      {id:'court_post_e_mid',type:'circle',x:7.25,z:3.15,r:0.22,role:'support'},
      {id:'court_post_ne',type:'circle',x:7.25,z:0.9,r:0.22,role:'support'},
      {id:'pulley_frame',type:'obox',x:14.925,z:-2.835,hw:0.325,hd:0.115,rot:0,role:'service'}
    ],
    // The GLB provides the boards; these authored rectangles provide their
    // exact navigation height above pond water. They overlap at the L turn so
    // the four-directional planner never sees a one-tile seam.
    walkSurfaces:[
      {id:'dock_shore_walk',x:11.87,z:-1.85,y:0.20,w:3.90,d:2.00,role:'dock'},
      {id:'dock_turn_walk',x:14.92,z:-1.85,y:0.20,w:2.20,d:2.20,role:'dock-turn'},
      {id:'dock_bank_walk',x:14.995,z:0.975,y:0.20,w:2.05,d:3.45,role:'dock'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_survival_workyard_v2.glb',
      source:'assets/blender/holm_survival_workyard_v2.blend',
      manifest:'assets/manifests/holm_survival_workyard_v2.json',
      furnishingSource:'assets/blender/props/workyard_upstairs_furnishings_v1.blend',
      furnishingManifest:'assets/manifests/workyard_upstairs_furnishings_v1.json',
      occupationYardModel:'assets/models/props/workyard_exterior_u3_v1.glb',
      occupationYardSource:'assets/blender/props/workyard_exterior_u3_v1.blend',
      occupationYardManifest:'assets/manifests/workyard_exterior_u3_v1.json',
      waterworksModel:'assets/models/props/workyard_waterworks_u4_v1.glb',
      waterworksSource:'assets/blender/props/workyard_waterworks_u4_v1.blend',
      waterworksManifest:'assets/manifests/workyard_waterworks_u4_v1.json',
      fishingEdgeModel:'assets/models/props/workyard_fishing_edge_u5_v1.glb',
      fishingEdgeSource:'assets/blender/props/workyard_fishing_edge_u5_v1.blend',
      fishingEdgeManifest:'assets/manifests/workyard_fishing_edge_u5_v1.json',
      cellarModel:'assets/models/buildings/holm_survival_workyard_cellar_v2.glb',
      cellarManifest:'assets/manifests/holm_survival_workyard_cellar_v2.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_survival_tools','holm_firemaking_board','holm_teaching_hearth',
        'holm_storm_tally','holm_net_rack','holm_cellar_ladder','holm_waterworks_pulley','holm_fishing_edge','prop'],
      reference:'Bible_References/Tutorial_Island_Building.jpg + Tutorial_Island_Fishing_Spot.jpg',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly survival compound at the elevated OSRS camera',
        silhouette:'offset lodge joined by a short passage to a many-sided hearth room and lower covered court',
        requiredFeatures:['four-part connected roof hierarchy','irregular fieldstone and timber bays',
          'two fitted full-frame doors','purposeful Blender-authored upstairs furnishing family','working teaching fireplace',
          'unobstructed covered court with integrated hand-authored U3 timber-processing family','freestanding fishing-preparation cluster','clear cement shore approach connected to an integrated walkable L-dock and animated bucket pulley','authored Small-net fishing edge with visible fish, quiet water motion, and an open creel',
          'working ladder to a stocked storm cellar']
      },
      visualBudget:{maxTriangles:42000,maxDrawCalls:170,maxPrimitives:190,maxMaterials:64,maxFileBytes:5000000}
    }
  };

  var definitions={holm_guide_hall_v1:guideHall,holm_survival_workyard_v1:survivalWorkyard};
  function finite(n){ return typeof n==='number'&&isFinite(n); }
  function unique(rows,key){ var seen={}; return rows.every(function(r){var v=r[key]; if(!v||seen[v]) return false; seen[v]=true; return true;}); }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function validate(def){
    var errors=[]; function need(ok,msg){ if(!ok) errors.push(msg); }
    need(!!def&&typeof def.id==='string','building id is required');
    need(def&&def.revision>0&&Math.floor(def.revision)===def.revision,'positive building revision is required');
    need(def&&def.footprint&&finite(def.footprint.w)&&finite(def.footprint.d)&&def.footprint.w>=8&&def.footprint.d>=7,
      'complete building footprint must be at least 8x7 tiles');
    need(def&&def.placement&&finite(def.placement.x)&&finite(def.placement.z)&&finite(def.placement.rot),'finite placement is required');
    ['rooms','doors','services','clues','supportSpaces','colliders'].forEach(function(k){ need(def&&Array.isArray(def[k]),k+' must be an array'); });
    if(!def) return {ok:false,errors:errors};
    if(Array.isArray(def.rooms)){
      need(def.rooms.length>=3,'at least three purposeful spaces are required');
      need(unique(def.rooms,'id'),'room ids must be unique');
      def.rooms.forEach(function(r){ need(r.bounds&&finite(r.bounds.x)&&finite(r.bounds.z)&&finite(r.bounds.w)&&finite(r.bounds.d),'room '+r.id+' needs finite bounds'); });
    }
    if(Array.isArray(def.doors)){
      need(def.doors.length>=2,'a complete through-building needs at least two doors');
      need(unique(def.doors,'id'),'door ids must be unique');
      def.doors.forEach(function(d){
        need(['N','S','E','W'].indexOf(d.side)>=0,'door '+d.id+' needs a cardinal side');
        need(finite(d.x)&&finite(d.z)&&finite(d.width)&&d.width>=1.5,'door '+d.id+' needs finite placement and width');
        need(d.opening&&finite(d.opening.x)&&finite(d.opening.z),'door '+d.id+' needs an opening centre');
        need(finite(d.closedRot)&&finite(d.openRot),'door '+d.id+' needs closed and open rotations');
      });
      var doorIds=def.doors.map(function(d){return d.id;});
      need(def.flow&&doorIds.indexOf(def.flow.entryDoor)>=0&&doorIds.indexOf(def.flow.exitDoor)>=0&&
        def.flow.entryDoor!==def.flow.exitDoor,'flow must name two distinct authored doors');
    }
    if(Array.isArray(def.services)){
      need(def.services.some(function(s){return s.role==='primary';}),'primary service is required');
      need(def.services.some(function(s){return s.role==='secondary';}),'secondary use is required');
      need(unique(def.services,'id'),'service ids must be unique');
    }
    need(Array.isArray(def.clues)&&def.clues.length>0,'story clue is required');
    need(Array.isArray(def.supportSpaces)&&def.supportSpaces.length>0,'support space is required');
    need(def.purpose&&def.purpose.primary&&def.purpose.secondary&&def.purpose.storyClue&&def.purpose.support,
      'purpose statement must cover service, secondary use, clue, and support');
    return {ok:errors.length===0,errors:errors};
  }
  function acceptance(){
    var d=guideHall,w=survivalWorkyard,result=validate(d),workyardResult=validate(w),checks=[];
    function add(label,ok){ checks.push({label:label,ok:!!ok}); }
    add('every building schema validates',result.ok&&workyardResult.ok);
    add('footprint matches the reserved Guide Hall pad',d.footprint.w===26&&d.footprint.d===24&&d.padId==='guide_hall');
    add('arrival and teaching exits make a south-to-north flow',d.doors.length===2&&d.doors[0].side==='S'&&d.doors[1].side==='N');
    add('four distinct purposeful rooms',d.rooms.length===4&&unique(d.rooms,'role'));
    add('primary orientation service is authored',d.services.some(function(s){return s.id==='orientation_table'&&s.role==='primary';}));
    add('secondary lesson register is authored',d.services.some(function(s){return s.id==='lesson_register'&&s.role==='secondary';}));
    add('First Landing story clue is authored',d.clues.some(function(c){return c.id==='first_landing_plaque';}));
    add('provision support space is authored',d.supportSpaces.some(function(s){return s.id==='provision_rack';}));
    add('one continuous shell leaves only both door openings',d.colliders.filter(function(c){return c.role==='wall'&&c.type==='obox';}).length===24);
    add('roof contact and fitted door geometry are pipeline-gated',d.revision===6&&
      /connected gable roof/.test(d.resources.visualProfile.silhouette)&&
      d.resources.visualProfile.requiredFeatures.some(function(x){return /fitted seven-plank/.test(x);}));
    add('Blender interior kit and stained glass are required features',
      d.resources.visualProfile.requiredFeatures.some(function(x){return /recessed stained glass/.test(x);})&&
      d.resources.visualProfile.requiredFeatures.some(function(x){return /occupational records/.test(x);}));
    add('all semantic parts have unique ids',unique(d.services.concat(d.clues,d.supportSpaces),'partId'));
    add('Studio and runtime share one Blender asset pipeline',d.resources.visualBuilder==='WorldV2Buildings.preload/build'&&/\.glb$/.test(d.resources.model)&&/\.blend$/.test(d.resources.source));
    add('asset manifest and one-command validator are recorded',/\.json$/.test(d.resources.manifest)&&/asset_pipeline\.py$/.test(d.resources.assetPipeline));
    add('reference is recorded with the definition',/Tutorial_Island_Building/.test(d.resources.reference));
    add('gameplay-camera visual profile is explicit',/OSRS/.test(d.resources.visualProfile.cameraRead)&&d.resources.visualProfile.requiredFeatures.length===7);
    add('browser visual budget is explicit',d.resources.visualBudget.maxTriangles<=38000&&d.resources.visualBudget.maxDrawCalls<=140&&
      d.resources.visualBudget.maxPrimitives<=70&&d.resources.visualBudget.maxMaterials<=18&&d.resources.visualBudget.maxFileBytes<=2700000);
    add('Survival Workyard replaces its full 20x14 Hearth Court reservation',w.padId==='survival_shelter'&&
      w.revision===17&&w.placement.yOffset===-0.16&&w.footprint.w===20&&w.footprint.d===14);
    add('Survival Workyard has a trail-to-pond two-door flow',w.flow.entryDoor==='trail_door'&&w.flow.exitDoor==='pond_door'&&
      w.doors.some(function(x){return x.side==='S';})&&w.doors.some(function(x){return x.side==='E';}));
    add('Survival Workyard doors are player-scaled rather than eave-scaled',
      w.doors.some(function(x){return x.id==='trail_door'&&x.width===1.55;})&&
      w.doors.some(function(x){return x.id==='pond_door'&&x.width===1.5;}));
    add('Survival Workyard has six distinct purposeful spaces',w.rooms.length===6&&unique(w.rooms,'role')&&
      w.rooms.some(function(r){return r.id==='storm_cellar'&&r.plane===-1;}));
    add('survival tool, firemaking, and hearth services are authored',w.services.some(function(s){return s.id==='tool_bench'&&s.role==='primary';})&&
      w.services.some(function(s){return s.id==='firemaking_board'&&s.role==='secondary';})&&
      w.services.some(function(s){return s.id==='teaching_fireplace';}));
    add('storm history clue and fishing support are authored',w.clues.some(function(c){return c.id==='storm_tally_beam';})&&
      w.supportSpaces.some(function(s){return s.id==='net_rack';}));
    add('workyard anchors are unique and preserve a future poultry socket without a visible pen',
      unique(w.services.concat(w.clues,w.supportSpaces),'partId')&&
      w.supportSpaces.some(function(s){return s.id==='future_poultry_socket'&&s.partId==='chicken_spawn_socket';})&&
      w.supportSpaces.some(function(s){return s.id==='cellar_ladder';})&&
      ['timber_log_rack','chopping_block','sawbuck'].every(function(id){return w.supportSpaces.some(function(s){return s.id===id;});}));
    add('workyard Blender sources and validated GLBs are recorded',/\.glb$/.test(w.resources.model)&&
      /\.glb$/.test(w.resources.cellarModel)&&/\.blend$/.test(w.resources.source)&&
      /\.json$/.test(w.resources.manifest)&&/\.json$/.test(w.resources.cellarManifest)&&
      /workyard_exterior_u3_v1\.glb$/.test(w.resources.occupationYardModel)&&
      /workyard_exterior_u3_v1\.blend$/.test(w.resources.occupationYardSource)&&
      /workyard_exterior_u3_v1\.json$/.test(w.resources.occupationYardManifest)&&
      /workyard_waterworks_u4_v1\.glb$/.test(w.resources.waterworksModel)&&
      /workyard_waterworks_u4_v1\.blend$/.test(w.resources.waterworksSource)&&
      /workyard_waterworks_u4_v1\.json$/.test(w.resources.waterworksManifest)&&
      /workyard_fishing_edge_u5_v1\.glb$/.test(w.resources.fishingEdgeModel)&&
      /workyard_fishing_edge_u5_v1\.blend$/.test(w.resources.fishingEdgeSource)&&
      /workyard_fishing_edge_u5_v1\.json$/.test(w.resources.fishingEdgeManifest));
    add('workyard visual profile requires a true compound and authored furnishings',/many-sided hearth room/.test(w.resources.visualProfile.silhouette)&&
      w.resources.visualProfile.requiredFeatures.length===10&&
      w.resources.visualProfile.requiredFeatures.some(function(x){return /furnishing family/.test(x);})&&
      w.resources.visualProfile.requiredFeatures.some(function(x){return /integrated hand-authored U3/.test(x);})&&
      w.resources.visualProfile.requiredFeatures.some(function(x){return /walkable L-dock/.test(x);}));
    add('U5 fishing edge is an authored separate interaction and asset family',
      w.supportSpaces.some(function(s){return s.id==='fishing_edge'&&s.partId==='fishing_water_patch'&&s.kind==='holm_fishing_edge';})&&
      w.resources.visualProfile.requiredFeatures.some(function(x){return /Small-net fishing edge/.test(x);}));
    add('waterworks has three overlapping deck surfaces and one purposeful pulley service',
      w.walkSurfaces.length===3&&w.walkSurfaces.every(function(s){return s.w>=2&&s.d>=2;})&&
      w.supportSpaces.some(function(s){return s.id==='waterworks_pulley'&&s.partId==='pulley_crank';})&&
      w.colliders.some(function(c){return c.id==='pulley_frame'&&c.role==='service';}));
    add('all upstairs furnishings have one explicit lesson or story purpose',w.furnishings.length===10&&
      unique(w.furnishings,'partId')&&w.furnishings.every(function(x){return !!x.purpose;}));
    add('workyard composed browser budget is explicit',w.resources.visualBudget.maxTriangles<=42000&&w.resources.visualBudget.maxDrawCalls<=170&&
      w.resources.visualBudget.maxPrimitives<=190&&w.resources.visualBudget.maxMaterials<=64&&w.resources.visualBudget.maxFileBytes<=5000000);
    return {ok:checks.every(function(c){return c.ok;}),checks:checks,errors:result.errors.concat(workyardResult.errors)};
  }
  return {
    get:function(id){ return definitions[id]?clone(definitions[id]):null; },
    all:function(){ return Object.keys(definitions).map(function(id){return clone(definitions[id]);}); },
    validate:validate,acceptance:acceptance
  };
})();
