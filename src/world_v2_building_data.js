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
        opening:{x:0,z:11},closedRot:0,openRot:-1.9,entry:{inside:[0,9.7],outside:[0,12.5]},
        interaction:{id:'front_door',label:'Open <b>Arrival door</b>',examine:'A broad emberwood door polished by generations of new arrivals.'}},
      {id:'teaching_door',label:'Teaching door',side:'N',x:1.3,z:-12,width:2.6,
        opening:{x:0,z:-12},closedRot:Math.PI,openRot:Math.PI-1.9,entry:{inside:[0,-10.7],outside:[0,-13.3]},
        interaction:{id:'teaching_door',label:'Open <b>Teaching door</b>',examine:'This northern door opens toward Survival Wood.'}}
    ],
    flow:{entryDoor:'front_door',exitDoor:'teaching_door'},
    services:[
      {id:'orientation_table',partId:'orientation_table',kind:'holm_orientation',role:'primary',
        position:[0,0],interactionTile:[0,3.0],interaction:{id:'orientation',label:'Island route',examine:'A hand-built relief chart of Tutor\'s Holm.'}},
      {id:'lesson_register',partId:'lesson_register',kind:'holm_register',role:'secondary',
        position:[-8.45,1],interactionTile:[-7.0,1],interaction:{id:'register',label:'Lesson register',examine:'Every lesson is marked here, along with the state of the departure lock.'}}
    ],
    clues:[
      {id:'first_landing_plaque',partId:'first_landing_plaque',kind:'holm_story_clue',
        position:[-5.15,6.05],interactionTile:[-4.0,5.2],interaction:{id:'plaque',label:'First Landing plaque',examine:'A battered ship beneath a rising compass star.'}}
    ],
    supportSpaces:[
      {id:'provision_rack',partId:'provision_rack',kind:'holm_provisions',
        position:[11.2,-0.1],interactionTile:[9.6,-0.1],interaction:{id:'provisions',label:'Provision rack',examine:'Oilskins, packs, chalk, and spare teaching tools, all counted twice.'}}
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
    id:'holm_survival_workyard_v1',assetId:'holm_survival_workyard',revision:18,
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
        entry:{inside:[-2.3,4.7],outside:[-2.3,7.25]},
        interaction:{id:'trail_door',label:'Open <b>Trail door</b>',examine:'A full-height oak door scarred by wet boots and bundled firewood.'}},
      {id:'pond_door',label:'Pond door',side:'E',x:8.326,z:-1.1,width:1.5,
        opening:{x:8.326,z:-1.85},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[7.05,-1.85],outside:[9.1,-1.85]},
        interaction:{id:'pond_door',label:'Open <b>Pond door</b>',examine:'This side door opens into the covered yard and toward the fishing shore.'}}
    ],
    flow:{entryDoor:'trail_door',exitDoor:'pond_door'},
    services:[
      {id:'tool_bench',partId:'tool_bench',kind:'holm_survival_tools',role:'primary',
        position:[-6.15,0.95],interactionTile:[-4.35,0.95],
        interaction:{id:'tools',label:'Survival tools',examine:'Hatchets, wedges, a whetstone, and pitch arranged by the job they perform.'}},
      {id:'firemaking_board',partId:'firemaking_board',kind:'holm_firemaking_board',role:'secondary',
        position:[-8.78,-2.1],interactionTile:[-7.25,-2.1],
        interaction:{id:'fire_board',label:'Firemaking board',examine:'Chalk diagrams explain kindling, airflow, and how not to lose one\'s eyebrows.'}},
      {id:'teaching_fireplace',partId:'teaching_fireplace',kind:'holm_teaching_hearth',role:'supporting-service',
        position:[5,-4.92],interactionTile:[5,-3.45],
        interaction:{id:'hearth',label:'Teaching hearth',examine:'A working cooking hearth, kettle crane, and carefully banked lesson fire.'}}
    ],
    clues:[
      {id:'storm_tally_beam',partId:'storm_tally_beam',kind:'holm_storm_tally',
        position:[-3.42,-5.74],interactionTile:[-3.42,-4.55],
        interaction:{id:'storm_tally',label:'Storm tally',examine:'Deep cuts count the seasons when the island had to live from its own stores.'}}
    ],
    supportSpaces:[
      {id:'net_rack',partId:'net_rack',kind:'holm_net_rack',
        position:[5.05,2.65],interactionTile:[5.05,1.55],
        interaction:{id:'net_rack',label:'Fishing-preparation stand',examine:'Painted cork buoys, a coiled hemp line, and a weighted teaching net wait beside a weathered crate.'}},
      {id:'timber_log_rack',partId:'timber_log_rack',kind:'prop',
        position:[2.25,4.70],interactionTile:[2.25,3.35],purpose:'Keep cut lesson timber restrained above the damp court floor',
        interaction:{id:'timber_rack',label:'Inspect <b>Timber rack</b>',inspectOnly:true,inspectName:'timber rack',inspectMessage:'Eight restrained logs rest on stone-footed bearers. The proud pale ends make every warped length easy to count.'}},
      {id:'log_stack',partId:'log_stack',kind:'prop',position:[2.25,4.70],interactionTile:[2.25,3.35],
        purpose:'Keep the deliberately uneven lesson-log stack readable as a separate authored object',
        interaction:{id:'log_stack',label:'Inspect <b>Stacked logs</b>',inspectOnly:true,inspectName:'stacked logs',inspectMessage:'A deliberately uneven stack of seasoned lesson timber, bound before the next storm can reorganize it.'}},
      {id:'chopping_block',partId:'chopping_block',kind:'prop',
        position:[0.80,2.25],interactionTile:[-0.25,2.25],purpose:'Show where felled logs are reduced to controlled hearth fuel',
        interaction:{id:'chopping_block',label:'Inspect <b>Chopping block</b>',inspectOnly:true,inspectName:'chopping block',inspectMessage:'A hand-hewn stump scarred by careful splitting. The tutors prefer kindling to heroic axe swings.'}},
      {id:'embedded_axe',partId:'embedded_axe',kind:'prop',position:[0.74,2.35],interactionTile:[-0.25,2.25],
        purpose:'Show the splitting tool seated safely in the authored chopping station',
        interaction:{id:'embedded_axe',label:'Inspect <b>Embedded axe</b>',inspectOnly:true,inspectName:'embedded axe',inspectMessage:'A purpose-built splitting axe seated firmly in the block, awaiting a later fuel-preparation lesson.'}},
      {id:'sawbuck',partId:'sawbuck',kind:'prop',
        position:[4.60,4.55],interactionTile:[4.60,3.20],purpose:'Hold one interrupted cross-cut as evidence of the yard\'s daily work',
        interaction:{id:'sawbuck',label:'Inspect <b>Sawbuck</b>',inspectOnly:true,inspectName:'sawbuck',inspectMessage:'A half-sawn log. Someone\'s work was interrupted, probably by a tutor explaining posture.'}},
      {id:'waterworks_pulley',partId:'pulley_crank',kind:'holm_waterworks_pulley',
        position:[14.92,-2.83],interactionTile:[14.97,-2.20],purpose:'Lower an empty lesson bucket into the pond and return it full without leaving the dock lane',
        interaction:{id:'waterworks',label:'Operate <b>Water pulley</b>',inspectName:'water pulley',inspectMessage:'A pegged timber frame, iron crank, rope guide, and open stave bucket turn pond water into a lesson in patient leverage.',examine:'The Workyard tutors insist that carrying the pond itself would be less efficient.'}},
      {id:'fishing_edge',partId:'fishing_water_patch',kind:'holm_fishing_edge',
        position:[17.52,-0.75],interactionTile:[14.95,-0.75],purpose:'Teach the existing Small net at a quiet, visibly inhabited pond edge without turning the dock into clutter',
        interaction:{id:'fishing_edge',label:'Net-fish <b>Mirrorperch</b>',acceptsUseItem:true,inspectName:'fishing edge',inspectMessage:'Three silver-blue mirrorperch nose through the quiet water beside an open woven creel. The largest appears confident for no defensible reason.',examine:'A calm teaching shoal waits below the dock edge.'}},
      {id:'future_poultry_socket',partId:'chicken_spawn_socket',kind:'future_socket',
        position:[7.5,4],purpose:'Reserve a future poultry lesson without shipping an empty decorative pen',bundle:false},
      {id:'cellar_ladder',partId:'cellar_ladder',kind:'holm_cellar_ladder',
        position:[-5.65,3.65],interactionTile:[-5.65,2.35],
        interaction:{id:'cellar',label:'Climb-down <b>Storm cellar ladder</b>',examine:'A fitted ladder descends beside the open reserve hatch.'}}
    ],
    furnishings:[
      {id:'workyard_crockery_hutch',partId:'workyard_crockery_hutch',kind:'prop',purpose:'Store lesson crockery at reachable player scale',interaction:{id:'hutch',label:'Inspect <b>Crockery hutch</b>',inspectOnly:true,inspectName:'crockery hutch',inspectMessage:'A fitted oak hutch keeps each lesson plate and mug below its shelf. Even the crockery has learned to stand in line.'}},
      {id:'workyard_mug_shelf',partId:'workyard_mug_shelf',kind:'prop',purpose:'Dry and count the four handled lesson mugs',interaction:{id:'mugs',label:'Inspect <b>Mug shelf</b>',inspectOnly:true,inspectName:'mug shelf',inspectMessage:'Four handled mugs hang upside-down to dry. A fifth peg is deliberately absent; the Holm dislikes optimistic counting.'}},
      {id:'workyard_empty_bucket',partId:'workyard_empty_bucket',kind:'holm_empty_bucket',purpose:'Reserve the portable vessel for the later pond-pulley lesson',interaction:{id:'bucket',label:'Take <b>Empty bucket</b>',inspectName:'empty bucket',inspectMessage:'A dry stave bucket reserved for the pond-pulley lesson. Its iron handle has survived more students than tutors.'}},
      {id:'workyard_tool_stool',partId:'workyard_tool_stool',kind:'prop',purpose:'Provide a repaired seat at the maintenance side of the bench',interaction:{id:'tool_stool',label:'Inspect <b>Repaired stool</b>',inspectOnly:true,inspectName:'repaired stool',inspectMessage:'A waist-low work stool with a small iron repair. It appears to have lost an argument with a hatchet.'}},
      {id:'workyard_lodge_rug',partId:'workyard_lodge_rug',kind:'prop',purpose:'Warm the standing teaching area without blocking its route',interaction:{id:'lodge_rug',label:'Inspect <b>Lodge runner</b>',inspectOnly:true,inspectName:'lodge runner',inspectMessage:'A subdued blue runner marks the clear standing area between the tools and the cellar route.'}},
      {id:'workyard_hearth_rug',partId:'workyard_hearth_rug',kind:'prop',purpose:'Define the safe observation ring around the fire lesson',interaction:{id:'hearth_rug',label:'Inspect <b>Hearth rug</b>',inspectOnly:true,inspectName:'hearth rug',inspectMessage:'An octagonal woven rug marks where learners may watch the fire without volunteering their boots as kindling.'}},
      {id:'workyard_lesson_table',partId:'workyard_lesson_table',kind:'prop',purpose:'Present tinder, kindling, and fuel in visible order',interaction:{id:'lesson_table',label:'Inspect <b>Kindling table</b>',inspectOnly:true,inspectName:'kindling table',inspectMessage:'Three shallow trays arrange tinder, crossed kindling, and larger fuel in the order a useful fire expects.'}},
      {id:'workyard_hearth_stool_splitter',partId:'workyard_hearth_stool_splitter',kind:'prop',purpose:'Seat one learner beside the kindling lesson',interaction:{id:'split_stool',label:'Inspect <b>Split-top stool</b>',inspectOnly:true,inspectName:'split-top stool',inspectMessage:'A small willow stool close enough to study the kindling and far enough to keep one\'s eyebrows.'}},
      {id:'workyard_hearth_stool_woven',partId:'workyard_hearth_stool_woven',kind:'prop',purpose:'Seat a second learner in a visibly distinct local craft style',interaction:{id:'woven_stool',label:'Inspect <b>Woven stool</b>',inspectOnly:true,inspectName:'woven stool',inspectMessage:'A second lesson stool with a woven rush seat. No two Holm craftspeople solve the same problem identically.'}},
      {id:'workyard_storm_warden_relief',partId:'workyard_storm_warden_relief',kind:'prop',purpose:'Connect the practical lessons to the Holm storm wardens',interaction:{id:'warden_relief',label:'Inspect <b>Storm Warden relief</b>',inspectOnly:true,inspectName:'Storm Warden relief',inspectMessage:'A blocky painted relief shows a red-cloaked warden measuring the storm tide instead of attempting to fight it.'}}
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


  // Teaching Kitchen: the optional Lesson Green bread lesson. Game-local axes
  // are x east / z south; the Blender source authors +y north, so every z here
  // is the negated Blender y of the same part.
  var teachingKitchen={
    id:'holm_teaching_kitchen_v1',assetId:'holm_teaching_kitchen',revision:1,
    label:"Tutor's Holm Teaching Kitchen",padId:'teaching_kitchen',
    placement:{x:153,z:136,rot:0,yOffset:-0.12},
    footprint:{w:13,d:10,h:7.4},
    interiorBounds:{x:0,z:0,w:13,d:10},
    purpose:{
      primary:'Bake bread on a working teaching range from dough the player mixes themselves.',
      secondary:'Supply flour, dough, and water from labelled pantry stations so the mixing chain is learned by doing.',
      storyClue:'The chalk recipe board records the ration loaf the Holm baked through eleven storm seasons.',
      support:'A bucket shelf, cooling rack, and kneading table keep the bakehouse an honest working room rather than a prop stage.'
    },
    rooms:[
      {id:'bakehouse',label:'Bakehouse',role:'primary-service',bounds:{x:-3,z:0,w:7,d:10}},
      {id:'pantry_wing',label:'Pantry Wing',role:'secondary-use',bounds:{x:3.5,z:-2.25,w:6,d:5.5}},
      {id:'oven_apse',label:'Oven Apse',role:'story-and-cooking',bounds:{x:2.3,z:2.75,w:3.5,d:4.5}},
      {id:'bread_store',label:'Cooling Wall',role:'support-space',bounds:{x:-3.4,z:-4.2,w:6.2,d:1.6}}
    ],
    // The west door faces the Lesson Green route node; the north yard door
    // continues toward the Quest Lodge lawn and the mine road.
    doors:[
      {id:'green_door',label:'Green door',side:'W',x:-6.5,z:2.375,width:1.55,
        opening:{x:-6.5,z:1.6},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[-5.3,1.6],outside:[-7.7,1.6]},
        interaction:{id:'green_door',label:'Open <b>Green door</b>',examine:'Flour dust never quite leaves the grain of this door.'}},
      {id:'yard_door',label:'Yard door',side:'N',x:-2.725,z:-5,width:1.55,
        opening:{x:-3.5,z:-5},closedRot:Math.PI,openRot:Math.PI-1.535,
        entry:{inside:[-3.5,-3.8],outside:[-3.5,-6.2]},
        interaction:{id:'yard_door',label:'Open <b>Yard door</b>',examine:'The back door opens onto the lawn shared with the Quest Lodge.'}}
    ],
    flow:{entryDoor:'green_door',exitDoor:'yard_door'},
    services:[
      {id:'teaching_range',partId:'teaching_range',kind:'holm_kitchen_range',role:'primary',
        position:[2.55,2.75],interactionTile:[1.35,2.75],
        interaction:{id:'range',label:'Cook on <b>Teaching range</b>',acceptsUseItem:true,
          examine:'A banked stone range with a bread oven, an iron hob and a flue that never quite stops smoking.'}},
      {id:'flour_bin',partId:'flour_bin',kind:'holm_flour_bin',role:'secondary',
        position:[5.55,-3.95],interactionTile:[4.45,-3.95],
        interaction:{id:'flour_bin',label:'Fill bucket from <b>Flour bin</b>',examine:'Milled pale and fine. A scoop waits on the heap.'}},
      {id:'dough_trough',partId:'dough_trough',kind:'holm_dough_trough',role:'supporting-service',
        position:[3.3,-4.35],interactionTile:[3.3,-3.2],
        interaction:{id:'dough_trough',label:'Take <b>Dough</b>',examine:'Cool elastic lumps rest under a proving cloth.'}},
      {id:'water_butt',partId:'water_butt',kind:'holm_water_butt',role:'supporting-service',
        position:[5.75,-0.35],interactionTile:[4.6,-0.35],
        interaction:{id:'water_butt',label:'Fill bucket from <b>Water butt</b>',examine:'Rain-fed, cold, and covered against the flour dust.'}}
    ],
    clues:[
      {id:'recipe_board',partId:'recipe_board',kind:'holm_recipe_board',
        position:[-6.28,-3.75],interactionTile:[-5.2,-3.75],
        interaction:{id:'recipe_board',label:'Read <b>Recipe board</b>',examine:'Chalk rows explain the storm ration loaf, one step per line.'}}
    ],
    supportSpaces:[
      {id:'bucket_shelf',partId:'bucket_shelf',kind:'holm_bucket_shelf',
        position:[-5.5,-4.62],interactionTile:[-5.5,-3.5],purpose:'Lend the buckets that carry flour and water to the mixing table',
        interaction:{id:'bucket_shelf',label:'Take <b>Bucket</b>',examine:'Two stave buckets hang from a bracket shelf beside the yard door.'}},
      {id:'bread_rack',partId:'bread_rack',kind:'prop',
        position:[-0.85,-4.55],interactionTile:[-0.85,-3.4],purpose:'Show finished loaves cooling where the next learner can count them',
        interaction:{id:'bread_rack',label:'Inspect <b>Cooling rack</b>',inspectOnly:true,inspectName:'cooling rack',
          inspectMessage:'Eight scored loaves cool on tiered slats. The Holm counts its bread the way it counts its storms.'}},
      {id:'kneading_table',partId:'kneading_table',kind:'prop',
        position:[-3,-0.2],interactionTile:[-3,1.1],purpose:'Give the mixing lesson a dusted work surface at player scale',
        interaction:{id:'kneading_table',label:'Inspect <b>Kneading table</b>',inspectOnly:true,inspectName:'kneading table',
          inspectMessage:'A floured oak table with a rolling pin and three resting dough balls. Somebody was interrupted mid-knead.'}}
    ],
    colliders:[
      wall('south_bake',-6.5,5,0.5,5), wall('throat_south',0.5,5,1.5,5),
      wall('apse_0',1.5,5,3.091,4.341), wall('apse_1',3.091,4.341,3.75,2.75),
      wall('apse_2',3.75,2.75,3.091,1.159), wall('apse_3',3.091,1.159,1.5,0.5),
      wall('pantry_south',1.5,0.5,6.5,0.5), wall('pantry_east',6.5,0.5,6.5,-5),
      wall('pantry_north',6.5,-5,0.5,-5),
      wall('north_e',0.5,-5,-2.725,-5), wall('north_w',-4.275,-5,-6.5,-5),
      wall('west_n',-6.5,-5,-6.5,0.825), wall('west_s',-6.5,2.375,-6.5,5),
      wall('partition_s',0.5,0.5,0.5,-1.6), wall('partition_n',0.5,-3.6,0.5,-5),
      {id:'teaching_range',type:'rect',x:2.85,z:2.75,hw:0.62,hd:0.92,role:'service'},
      {id:'kneading_table',type:'rect',x:-3,z:-0.2,hw:1.15,hd:0.55,role:'support'},
      {id:'flour_bin',type:'circle',x:5.55,z:-3.95,r:0.58,role:'service'},
      {id:'dough_trough',type:'rect',x:3.3,z:-4.35,hw:0.85,hd:0.36,role:'service'},
      {id:'water_butt',type:'circle',x:5.75,z:-0.35,r:0.52,role:'service'},
      {id:'bread_rack',type:'rect',x:-0.85,z:-4.55,hw:0.85,hd:0.26,role:'support'},
      {id:'log_basket',type:'circle',x:1.55,z:4.35,r:0.38,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_teaching_kitchen_v1.glb',
      source:'assets/blender/holm_teaching_kitchen_v1.blend',
      manifest:'assets/manifests/holm_teaching_kitchen_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_kitchen_range','holm_flour_bin','holm_dough_trough','holm_water_butt',
        'holm_recipe_board','holm_bucket_shelf','prop'],
      reference:'Bible_References/Tutorial_Island_Building.jpg (kitchen counter + range) + TUTORIAL_ISLAND.md chef station',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly bakehouse at the elevated OSRS camera',
        silhouette:'L-plan gabled bakehouse with a lower lean-to pantry wing and a half-octagonal oven apse carrying a stone flue',
        requiredFeatures:['three-mass roof hierarchy with a polygonal apse roof','irregular fieldstone and timber bays',
          'two fitted full-frame doors','working teaching range with animated oven flame and stone flue',
          'labelled flour, dough, and water pantry stations','cooling rack, bucket shelf, and kneading table support cluster',
          'wheat-sheaf ridge finial']
      },
      visualBudget:{maxTriangles:18000,maxDrawCalls:90,maxPrimitives:90,maxMaterials:30,maxFileBytes:1800000}
    }
  };


  // Quest Lodge: Lesson Green's story service. Game-local axes are x east /
  // z south; every z here is the negated Blender y of the same part.
  var questLodge={
    id:'holm_quest_lodge_v1',assetId:'holm_quest_lodge',revision:1,
    label:"Tutor's Holm Quest Lodge",padId:'quest_lodge',
    placement:{x:136,z:136,rot:0,yOffset:-0.12},
    footprint:{w:12,d:9,h:7.0},
    interiorBounds:{x:-0.5,z:0,w:9.2,d:9},
    purpose:{
      primary:'Study the great quest board and open the quest journal to learn how regional quests reveal stories without forcing one path.',
      secondary:'Read the four-region chart in the turret to see where those stories live.',
      storyClue:'The Ledger of Choices records that no newcomer to the Holm was ever given one road to walk.',
      support:'A reading bench, a scroll rack, a lectern, and a reserved standing socket for the modelled quest guide.'
    },
    rooms:[
      {id:'hall_of_notices',label:'Hall of Notices',role:'primary-service',bounds:{x:0.5,z:0,w:7,d:9}},
      {id:'chart_turret',label:'Chart Turret',role:'secondary-use',bounds:{x:-4,z:-2.4,w:2.2,d:4.2}},
      {id:'reading_corner',label:'Reading Corner',role:'story-and-rest',bounds:{x:0.2,z:3.6,w:6,d:1.8}},
      {id:'east_porch',label:'Covered Porch',role:'through-destination',bounds:{x:5,z:0,w:2,d:5}}
    ],
    // The porch door faces the Lesson Green route node shared with the Kitchen;
    // the road door leaves toward the mine road along x=128.
    doors:[
      {id:'lodge_door',label:'Lodge door',side:'E',x:4,z:-0.725,width:1.55,
        opening:{x:4,z:-1.5},closedRot:Math.PI/2,openRot:Math.PI/2+1.535,
        entry:{inside:[2.8,-1.5],outside:[5.2,-1.5]},
        interaction:{id:'lodge_door',label:'Open <b>Lodge door</b>',examine:'A porch door hung with a brass quest-scroll knocker.'}},
      {id:'road_door',label:'Road door',side:'W',x:-3,z:2.275,width:1.55,
        opening:{x:-3,z:1.5},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[-1.8,1.5],outside:[-4.2,1.5]},
        interaction:{id:'road_door',label:'Open <b>Road door</b>',examine:'The back door opens toward the mine road and Quarry Rise.'}}
    ],
    flow:{entryDoor:'lodge_door',exitDoor:'road_door'},
    services:[
      {id:'quest_board',partId:'quest_board',kind:'holm_quest_board',role:'primary',
        position:[0.6,-4.18],interactionTile:[0.6,-2.6],
        interaction:{id:'quest_board',label:'Study <b>Quest board</b>',examine:'Eight pinned notices under a lantern: rumours, requests, and one red seal nobody has claimed.'}},
      {id:'region_map',partId:'region_map',kind:'holm_region_map',role:'secondary',
        position:[-4,-2.4],interactionTile:[-2.4,-2.4],
        interaction:{id:'region_map',label:'Study <b>Region chart</b>',examine:'Four regions pinned in wax and brass: the Commons, Emberwood, Mirrorpond, and the Scarlands.'}}
    ],
    clues:[
      {id:'story_ledger',partId:'story_ledger',kind:'holm_story_ledger',
        position:[-1.9,3.9],interactionTile:[-1.9,2.7],
        interaction:{id:'story_ledger',label:'Read <b>Ledger of Choices</b>',examine:'A leather ledger on a stone plinth, its ribbon marking today.'}}
    ],
    supportSpaces:[
      {id:'reading_bench',partId:'reading_bench',kind:'prop',
        position:[2.2,3.6],interactionTile:[2.2,2.4],purpose:'Seat readers where the board and the ledger are both in view',
        interaction:{id:'reading_bench',label:'Inspect <b>Reading bench</b>',inspectOnly:true,inspectName:'reading bench',
          inspectMessage:'A cushioned oak bench with a half-read book left open. Someone was called away by a notice.'}},
      {id:'scroll_rack',partId:'scroll_rack',kind:'prop',
        position:[-2.65,3.2],interactionTile:[-1.6,3.2],purpose:'Store completed quest scrolls so the room shows a history of finished stories',
        interaction:{id:'scroll_rack',label:'Inspect <b>Scroll rack</b>',inspectOnly:true,inspectName:'scroll rack',
          inspectMessage:'Pigeonholes of rolled scrolls, each a finished story. Two holes are empty and waiting.'}},
      {id:'quest_guide_socket',partId:'quest_guide_socket',kind:'future_socket',
        position:[1.4,-2.6],purpose:'Reserve the modelled quest guide\'s standing place without shipping a placeholder figure',bundle:false}
    ],
    colliders:[
      wall('south',-3,4.5,4,4.5),
      wall('east_s',4,4.5,4,-0.725), wall('east_n',4,-2.275,4,-4.5),
      wall('north',4,-4.5,-3,-4.5),
      wall('turret_0',-3,-4.5,-4.485,-3.885), wall('turret_1',-4.485,-3.885,-5.1,-2.4),
      wall('turret_2',-5.1,-2.4,-4.485,-0.915), wall('turret_3',-4.485,-0.915,-3,-0.3),
      wall('west_mid',-3,-0.3,-3,0.725), wall('west_s',-3,2.275,-3,4.5),
      {id:'porch_post_n',type:'circle',x:5.78,z:-2.35,r:0.22,role:'support'},
      {id:'porch_post_s',type:'circle',x:5.78,z:2.35,r:0.22,role:'support'},
      {id:'quest_board',type:'rect',x:0.6,z:-4.2,hw:1.8,hd:0.2,role:'service'},
      {id:'lectern',type:'circle',x:1.2,z:-3.18,r:0.36,role:'service'},
      {id:'region_map',type:'rect',x:-4,z:-2.4,hw:0.95,hd:0.85,role:'service'},
      {id:'story_ledger',type:'rect',x:-1.9,z:3.9,hw:0.4,hd:0.33,role:'support'},
      {id:'reading_bench',type:'rect',x:2.2,z:3.6,hw:1.1,hd:0.3,role:'support'},
      {id:'scroll_rack',type:'rect',x:-2.65,z:3.2,hw:0.2,hd:0.7,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_quest_lodge_v1.glb',
      source:'assets/blender/holm_quest_lodge_v1.blend',
      manifest:'assets/manifests/holm_quest_lodge_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_quest_board','holm_region_map','holm_story_ledger','prop'],
      reference:'Bible_References/A_Tutorial_Island_Option.jpg (quest house) + TUTORIAL_ISLAND.md quest guide station',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly lodge at the elevated OSRS camera',
        silhouette:'gabled hall with an east-west ridge, a half-octagonal chart turret on the north-west corner, and a covered east porch',
        requiredFeatures:['three-mass roof hierarchy with a polygonal turret roof','irregular fieldstone and timber bays',
          'two fitted full-frame doors','great quest board with pinned notices, lantern and lectern',
          'four-region chart table','Ledger of Choices, reading bench and scroll rack','scroll-and-star ridge finial']
      },
      visualBudget:{maxTriangles:18000,maxDrawCalls:90,maxPrimitives:90,maxMaterials:40,maxFileBytes:1800000}
    }
  };


  // Mine Gatehouse: Quarry Rise's cave access. The mine road enters the gate
  // tower's south gate and leaves by its east door; the shaft house west of the
  // passage holds the cavern shaft under a winch head-frame. Game z = -Blender y.
  var mineGatehouse={
    id:'holm_mine_gatehouse_v1',assetId:'holm_mine_gatehouse',revision:1,
    label:"Tutor's Holm Mine Gatehouse",padId:'mine_gatehouse',
    placement:{x:127,z:119,rot:0,yOffset:-0.12},
    footprint:{w:10,d:8,h:9.4},
    interiorBounds:{x:-0.5,z:0,w:11,d:8},
    purpose:{
      primary:'Climb down the winch-house shaft into the Training Cavern; the required descend lesson.',
      secondary:'Read the ore tally to learn that copper and tin together make bronze before mining either.',
      storyClue:'The Wardens\' gate stone records why the Holm opened its mine to newcomers.',
      support:'A cobbled road passage with portcullis and brazier, an ore cart, a tool rack, and an ore bin under a chute.'
    },
    rooms:[
      {id:'gate_passage',label:'Gate Passage',role:'through-destination',bounds:{x:2.5,z:0,w:5,d:8}},
      {id:'winch_house',label:'Winch House',role:'primary-service',bounds:{x:-2.5,z:0,w:5,d:8}},
      {id:'ore_bay',label:'Ore Chute Bay',role:'support-space',bounds:{x:-6,z:-1.5,w:2,d:3.8}},
      {id:'tally_wall',label:'Tally Wall',role:'secondary-use',bounds:{x:2.5,z:-3.2,w:4.5,d:1.4}}
    ],
    // The road passes straight through: in by the south gate, out by the east door.
    doors:[
      {id:'gate_door',label:'Mine gate',side:'S',x:0.5,z:4,width:2,
        opening:{x:1.5,z:4},closedRot:0,openRot:1.535,
        entry:{inside:[1.5,2.8],outside:[1.5,5.2]},
        interaction:{id:'gate_door',label:'Open <b>Mine gate</b>',examine:'Twin oak leaves under a raised portcullis. The road goes through, not around.'}},
      {id:'road_door',label:'Road door',side:'E',x:5,z:0.5,width:2,
        opening:{x:5,z:1.5},closedRot:-Math.PI/2,openRot:-Math.PI/2-1.535,
        entry:{inside:[3.8,1.5],outside:[6.2,1.5]},
        interaction:{id:'road_door',label:'Open <b>Road door</b>',examine:'The east door lets the mine road out toward Warden\'s Ridge.'}}
    ],
    flow:{entryDoor:'gate_door',exitDoor:'road_door'},
    services:[
      {id:'shaft_frame',partId:'shaft_frame',kind:'holm_shaft_frame',role:'primary',
        position:[-2.5,0.5],interactionTile:[-2.5,-0.5],
        interaction:{id:'shaft_frame',label:'Study <b>Winch frame</b>',examine:'A timber head-frame, a drum winch and a rope dropping into the dark. The ladder below is the real way down.'}},
      {id:'ore_tally',partId:'ore_tally',kind:'holm_ore_tally',role:'secondary',
        position:[2.5,-3.68],interactionTile:[2.5,-2.6],
        interaction:{id:'ore_tally',label:'Read <b>Ore tally</b>',examine:'Chalk tallies of copper and tin beside a bronze smear. Two ores, one bar.'}}
    ],
    clues:[
      {id:'gate_stone',partId:'gate_stone',kind:'holm_gate_stone',
        position:[-0.2,2.8],interactionTile:[1.0,2.8],
        interaction:{id:'gate_stone',label:'Read <b>Gate stone</b>',examine:'A carved slab set beside the arch, its relief worn bright by passing hands.'}}
    ],
    supportSpaces:[
      {id:'ore_cart',partId:'ore_cart',kind:'prop',
        position:[-1.2,2.8],interactionTile:[-1.2,1.6],purpose:'Show ore moving from the shaft to the road',
        interaction:{id:'ore_cart',label:'Inspect <b>Ore cart</b>',inspectOnly:true,inspectName:'ore cart',
          inspectMessage:'An iron cart heaped with rough rock, copper and tin lumps on top. The wheels squeak in your imagination.'}},
      {id:'tool_rack',partId:'tool_rack',kind:'prop',
        position:[-3.5,3.68],interactionTile:[-3.5,2.5],purpose:'Keep the winch house an honest working room',
        interaction:{id:'tool_rack',label:'Inspect <b>Tool rack</b>',inspectOnly:true,inspectName:'tool rack',
          inspectMessage:'Picks and mallets on pegs, a bucket beneath. The tutors lend pickaxes below, not here.'}},
      {id:'ore_bin',partId:'ore_bin',kind:'prop',
        position:[-5.9,-1.5],interactionTile:[-3.5,-1.5],purpose:'Give the ore chute bay a job',
        interaction:{id:'ore_bin',label:'Inspect <b>Ore bin</b>',inspectOnly:true,inspectName:'ore bin',
          inspectMessage:'A stave bin under a wooden chute, half full of sorted ore waiting for the furnace.'}}
    ],
    colliders:[
      wall('tower_south_w',0,4,0.5,4), wall('tower_south_e',2.5,4,5,4),
      wall('tower_east_s',5,4,5,2.5), wall('tower_east_n',5,0.5,5,-4),
      wall('tower_north',5,-4,0,-4), wall('house_north',0,-4,-5,-4),
      wall('partition_n',0,-4,0,-1.5), wall('partition_s',0,1.5,0,4),
      wall('house_south',-5,4,0,4),
      wall('house_west_n',-5,-4,-5,-3.4), wall('house_west_s',-5,0.4,-5,4),
      wall('bay_0',-5,0.4,-6.34,-0.16), wall('bay_1',-6.34,-0.16,-6.9,-1.5),
      wall('bay_2',-6.9,-1.5,-6.34,-2.84), wall('bay_3',-6.34,-2.84,-5,-3.4),
      {id:'frame_leg_sw',type:'circle',x:-4,z:2,r:0.18,role:'service'},
      {id:'frame_leg_nw',type:'circle',x:-4,z:-1,r:0.18,role:'service'},
      {id:'frame_leg_se',type:'circle',x:-1,z:2,r:0.18,role:'service'},
      {id:'frame_leg_ne',type:'circle',x:-1,z:-1,r:0.18,role:'service'},
      {id:'ore_tally',type:'rect',x:2.5,z:-3.7,hw:0.75,hd:0.12,role:'service'},
      {id:'gate_stone',type:'rect',x:-0.2,z:2.8,hw:0.1,hd:0.55,role:'support'},
      {id:'ore_cart',type:'rect',x:-1.2,z:2.8,hw:0.62,hd:0.45,role:'support'},
      {id:'tool_rack',type:'rect',x:-3.5,z:3.7,hw:0.85,hd:0.15,role:'support'},
      {id:'ore_bin',type:'rect',x:-5.9,z:-1.5,hw:0.6,hd:0.75,role:'support'},
      {id:'brazier',type:'circle',x:4.3,z:3.4,r:0.3,role:'support'},
      {id:'ore_sacks',type:'circle',x:1.3,z:-3.3,r:0.45,role:'support'},
      {id:'rope_coil',type:'circle',x:-4.3,z:-3.2,r:0.4,role:'support'},
      {id:'water_keg',type:'circle',x:-4.3,z:3.3,r:0.36,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_mine_gatehouse_v1.glb',
      source:'assets/blender/holm_mine_gatehouse_v1.blend',
      manifest:'assets/manifests/holm_mine_gatehouse_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_shaft_frame','holm_ore_tally','holm_gate_stone','prop'],
      reference:'Bible_References/Tutorial_Island_Mining_Cave_&_Mining_Rocks.jpg (ladder exit) + TUTORIAL_ISLAND.md ladder-down station',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly gatehouse at the elevated OSRS camera',
        silhouette:'tall pyramid-roofed gate tower over a cobbled road passage, a lower gabled winch house with a louvred dormer, and a half-octagonal ore bay',
        requiredFeatures:['three-mass roof hierarchy with a polygonal bay roof','irregular fieldstone and timber bays',
          'two fitted full-frame doors under a raised portcullis','open shaft with timber head-frame, winch drum and hoist rope',
          'ore tally board and Wardens\' gate stone','ore cart, tool rack, ore bin and chute','gate lantern finial']
      },
      visualBudget:{maxTriangles:18000,maxDrawCalls:90,maxPrimitives:90,maxMaterials:40,maxFileBytes:1800000}
    }
  };


  // Holm Bank: Warden's Ridge's banking service on the road corner. The teller
  // counter divides the customer hall (south) from the vault (north); a staff
  // gap at the counter's east end reaches the vault chest. Game z = -Blender y.
  var holmBank={
    id:'holm_bank_v1',assetId:'holm_bank',revision:1,
    label:"Tutor's Holm Bank",padId:'holm_bank',
    placement:{x:157,z:116,rot:0,yOffset:-0.12},
    footprint:{w:10,d:8,h:8.0},
    interiorBounds:{x:-0.5,z:0,w:11,d:8},
    purpose:{
      primary:'Open the bank at a teller booth or the vault chest; the required open-bank lesson.',
      secondary:'Read the ledger desk to learn that one account is shared by every bank in the realm.',
      storyClue:'The founders\' plaque records the first deposit that paid for the Holm\'s ferry.',
      support:'A waiting bay with a bench, a queue line, strongbox shelves, and coin sacks in the vault.'
    },
    rooms:[
      {id:'customer_hall',label:'Customer Hall',role:'primary-service',bounds:{x:0,z:2,w:10,d:4}},
      {id:'vault',label:'Vault',role:'secondary-use',bounds:{x:0,z:-2,w:10,d:4}},
      {id:'waiting_bay',label:'Waiting Bay',role:'support-space',bounds:{x:-5.9,z:2,w:1.8,d:3.6}},
      {id:'teller_line',label:'Teller Line',role:'service-line',bounds:{x:-0.75,z:0,w:8.5,d:1}}
    ],
    // The front door opens onto the ridge road; the east staff door continues
    // toward the Combat Hall.
    doors:[
      {id:'front_door',label:'Bank door',side:'S',x:-0.5,z:4,width:2,
        opening:{x:0.5,z:4},closedRot:0,openRot:1.535,
        entry:{inside:[0.5,2.8],outside:[0.5,5.2]},
        interaction:{id:'front_door',label:'Open <b>Bank door</b>',examine:'Twin walnut leaves under a gilded coin sign.'}},
      {id:'staff_door',label:'Staff door',side:'E',x:5,z:1.5,width:2,
        opening:{x:5,z:2.5},closedRot:-Math.PI/2,openRot:-Math.PI/2-1.535,
        entry:{inside:[3.8,2.5],outside:[6.2,2.5]},
        interaction:{id:'staff_door',label:'Open <b>Staff door</b>',examine:'The east door lets the ridge road continue toward the Combat Hall.'}}
    ],
    flow:{entryDoor:'front_door',exitDoor:'staff_door'},
    services:[
      {id:'bank_booth_w',partId:'bank_booth_w',kind:'holm_bank_booth',role:'primary',
        position:[-3,0],interactionTile:[-3,1.2],
        interaction:{id:'bank_booth_w',label:'Use <b>Bank booth</b>',examine:'A brass-grilled teller window with a velvet coin tray.'}},
      {id:'bank_booth_e',partId:'bank_booth_e',kind:'holm_bank_booth',role:'supporting-service',
        position:[0,0],interactionTile:[0,1.2],
        interaction:{id:'bank_booth_e',label:'Use <b>Bank booth</b>',examine:'A second teller window for busy ferry days.'}},
      {id:'ledger_desk',partId:'ledger_desk',kind:'holm_bank_ledger',role:'secondary',
        position:[-3,-2.5],interactionTile:[-3,-1.2],
        interaction:{id:'ledger_desk',label:'Study <b>Ledger desk</b>',examine:'Scales, a ledger, ink, and three careful stacks of coin.'}}
    ],
    clues:[
      {id:'founders_plaque',partId:'founders_plaque',kind:'holm_bank_plaque',
        position:[-4.7,0.9],interactionTile:[-3.6,1.6],
        interaction:{id:'founders_plaque',label:'Read <b>Founders\' plaque</b>',examine:'A brass plaque with a coin in relief.'}}
    ],
    supportSpaces:[
      {id:'waiting_bench',partId:'waiting_bench',kind:'prop',
        position:[-5.8,2],interactionTile:[-3.6,2],purpose:'Give the waiting bay a reason to exist',
        interaction:{id:'waiting_bench',label:'Inspect <b>Waiting bench</b>',inspectOnly:true,inspectName:'waiting bench',
          inspectMessage:'A walnut bench with a velvet cushion. Nobody has ever waited long at this bank.'}},
      {id:'strongbox_shelf',partId:'strongbox_shelf',kind:'prop',
        position:[-1,-3.65],interactionTile:[-1,-2.5],purpose:'Show the vault holds more than one chest',
        interaction:{id:'strongbox_shelf',label:'Inspect <b>Strongbox shelf</b>',inspectOnly:true,inspectName:'strongbox shelf',
          inspectMessage:'Nine iron strongboxes with gold locks. Each is labelled with a family name and a season.'}},
      {id:'bank_counter',partId:'bank_counter',kind:'prop',
        position:[-1.25,0],interactionTile:[-1.25,1.2],purpose:'Divide the customer hall from the vault',
        interaction:{id:'bank_counter',label:'Inspect <b>Teller counter</b>',inspectOnly:true,inspectName:'teller counter',
          inspectMessage:'A long walnut counter under an iron grille. The flap at the east end is for staff, and for you.'}}
    ],
    colliders:[
      wall('south_w',-5,4,-0.5,4), wall('south_e',1.5,4,5,4),
      wall('east_s',5,4,5,3.5), wall('east_n',5,1.5,5,-4),
      wall('north',5,-4,-5,-4),
      wall('west_n',-5,-4,-5,0.2),
      wall('bay_0',-5,0.2,-6.27,0.73), wall('bay_1',-6.27,0.73,-6.8,2), wall('bay_2',-6.8,2,-6.27,3.27), wall('bay_3',-6.27,3.27,-5,3.8),
      wall('west_s',-5,3.8,-5,4),
      {id:'bank_counter',type:'rect',x:-1.25,z:0,hw:3.75,hd:0.42,role:'service'},
      {id:'ledger_desk',type:'rect',x:-3,z:-2.5,hw:1.0,hd:0.5,role:'service'},
      {id:'ledger_stool',type:'circle',x:-3,z:-3.35,r:0.25,role:'service'},
      {id:'strongbox_shelf',type:'rect',x:-1,z:-3.65,hw:1.2,hd:0.28,role:'support'},
      {id:'waiting_bench',type:'rect',x:-5.8,z:2,hw:0.28,hd:1.05,role:'support'},
      {id:'coin_sacks',type:'circle',x:1.7,z:-3.4,r:0.45,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_bank_v1.glb',
      source:'assets/blender/holm_bank_v1.blend',
      manifest:'assets/manifests/holm_bank_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_bank_booth','holm_bank_ledger','holm_bank_plaque','prop'],
      reference:'Bible_References/Bank.jpg family (ref_bank.js booth) + TUTORIAL_ISLAND.md banking step',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly banking hall at the elevated OSRS camera',
        silhouette:'gabled banking hall with a counting-house dormer, a stone vault chimney, and a half-octagonal waiting bay',
        requiredFeatures:['three-mass roof hierarchy with a polygonal bay roof','irregular fieldstone and timber bays',
          'two fitted full-frame doors under a gilded coin sign','walnut teller counter with two brass-grilled booths and an iron grille',
          'vault with ledger desk, scales, strongbox shelves and coin sacks','founders plaque, queue line and waiting bench',
          'chequered marble customer floor']
      },
      visualBudget:{maxTriangles:18000,maxDrawCalls:95,maxPrimitives:95,maxMaterials:45,maxFileBytes:1800000}
    }
  };


  // Combat Hall: Warden's Ridge's practice hall. The Training Cavern's one-way
  // exit surfaces inside the drill tower; the west door faces the Holm Bank's
  // staff door and the south door leaves toward the road. Game z = -Blender y.
  var combatHall={
    id:'holm_combat_hall_v1',assetId:'holm_combat_hall',revision:1,
    label:"Tutor's Holm Combat Hall",padId:'combat_hall',
    placement:{x:172,z:119,rot:0,yOffset:-0.12},
    footprint:{w:12,d:9,h:9.0},
    interiorBounds:{x:0,z:0,w:12,d:9},
    purpose:{
      primary:'Study the training pell to learn attack styles and how to wield a weapon before the practice enemies arrive.',
      secondary:'Read the rack of arms to learn the equipment slots and what a bow and a rune each need.',
      storyClue:'The Wardens\' roll of honour names the first miners who surfaced here after the mine opened.',
      support:'A covered practice yard with an archery butt, a hall bench with a spare helm, and the cavern stair head.'
    },
    rooms:[
      {id:'drill_hall',label:'Drill Hall',role:'primary-service',bounds:{x:-2,z:0,w:8,d:9}},
      {id:'drill_tower',label:'Drill Tower',role:'through-destination',bounds:{x:4,z:-2.25,w:4,d:4.5}},
      {id:'practice_yard',label:'Practice Yard',role:'support-space',bounds:{x:4,z:2.25,w:4,d:4.5}},
      {id:'armoury_apse',label:'Armoury Apse',role:'secondary-use',bounds:{x:-2,z:-5.5,w:4,d:2}}
    ],
    doors:[
      {id:'bank_door',label:'Bank-side door',side:'W',x:-6,z:0.5,width:2,
        opening:{x:-6,z:-0.5},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[-4.8,-0.5],outside:[-7.2,-0.5]},
        interaction:{id:'bank_door',label:'Open <b>Hall door</b>',examine:'The west door faces the bank\'s staff door across the ridge.'}},
      {id:'road_door',label:'Road door',side:'S',x:-3.5,z:4.5,width:2,
        opening:{x:-2.5,z:4.5},closedRot:0,openRot:1.535,
        entry:{inside:[-2.5,3.3],outside:[-2.5,5.7]},
        interaction:{id:'road_door',label:'Open <b>Road door</b>',examine:'The south door leaves toward the ridge road and Tidebridge.'}}
    ],
    flow:{entryDoor:'bank_door',exitDoor:'road_door'},
    services:[
      {id:'training_post',partId:'training_post',kind:'holm_training_post',role:'primary',
        position:[-1,1],interactionTile:[-1,2.2],
        interaction:{id:'training_post',label:'Study <b>Training pell</b>',examine:'An oak pell with a padded head, a strapped shield and years of cut marks.'}},
      {id:'arms_rack',partId:'arms_rack',kind:'holm_arms_rack',role:'secondary',
        position:[-2,-5.3],interactionTile:[-2,-3.4],
        interaction:{id:'arms_rack',label:'Study <b>Rack of arms</b>',examine:'Swords, axes, a shield, a bow and a quiver, each on its own peg.'}}
    ],
    clues:[
      {id:'warden_roll',partId:'warden_roll',kind:'holm_warden_roll',
        position:[-5.7,-2.5],interactionTile:[-4.6,-2.5],
        interaction:{id:'warden_roll',label:'Read <b>Roll of honour</b>',examine:'A brass plate of names under a small steel helm.'}}
    ],
    supportSpaces:[
      {id:'archery_butt',partId:'archery_butt',kind:'prop',
        position:[5,3.5],interactionTile:[3,3.5],purpose:'Give the covered yard its ranged practice target',
        interaction:{id:'archery_butt',label:'Inspect <b>Archery butt</b>',inspectOnly:true,inspectName:'archery butt',
          inspectMessage:'A straw butt with painted rings and three old arrows. The rings are optimistic.'}},
      {id:'hall_bench',partId:'hall_bench',kind:'prop',
        position:[0,4.05],interactionTile:[0,2.9],purpose:'Seat a learner between bouts',
        interaction:{id:'hall_bench',label:'Inspect <b>Hall bench</b>',inspectOnly:true,inspectName:'hall bench',
          inspectMessage:'A bench with a spare helm and a pair of leather gloves left for the next learner.'}},
      {id:'melee_dummy_socket',partId:'melee_dummy_socket',kind:'future_socket',
        position:[4,1.5],purpose:'Reserve the melee practice enemy\'s standing place without shipping a placeholder',bundle:false},
      {id:'ranged_target_socket',partId:'ranged_target_socket',kind:'future_socket',
        position:[3,3.5],purpose:'Reserve the ranged practice enemy\'s standing place without shipping a placeholder',bundle:false}
    ],
    colliders:[
      wall('south_w',-6,4.5,-3.5,4.5), wall('south_e',-1.5,4.5,2,4.5),
      wall('hall_east',2,4.5,2,-0.5), wall('partition_n',2,-3.5,2,-4.5),
      wall('tower_south',2,0,6,0), wall('tower_east',6,0,6,-4.5), wall('tower_north',6,-4.5,2,-4.5),
      wall('hall_north_e',2,-4.5,0,-4.5),
      wall('apse_0',0,-4.5,-0.59,-5.91), wall('apse_1',-0.59,-5.91,-2,-6.5), wall('apse_2',-2,-6.5,-3.41,-5.91), wall('apse_3',-3.41,-5.91,-4,-4.5),
      wall('hall_north_w',-4,-4.5,-6,-4.5),
      wall('west_n',-6,-4.5,-6,-1.5), wall('west_s',-6,0.5,-6,4.5),
      {id:'yard_post_se',type:'circle',x:6,z:4,r:0.18,role:'support'},
      {id:'yard_post_sw',type:'circle',x:2,z:4,r:0.18,role:'support'},
      {id:'yard_post_e',type:'circle',x:6,z:2,r:0.18,role:'support'},
      {id:'training_post',type:'circle',x:-1,z:1,r:0.32,role:'service'},
      {id:'arms_rack',type:'rect',x:-2,z:-5.3,hw:1.0,hd:0.3,role:'service'},
      {id:'archery_butt',type:'circle',x:5,z:3.5,r:0.5,role:'support'},
      {id:'hall_bench',type:'rect',x:0,z:4.05,hw:1.0,hd:0.26,role:'support'},
      {id:'water_barrel',type:'circle',x:2.6,z:0.6,r:0.4,role:'support'},
      {id:'tower_brazier',type:'circle',x:5.2,z:-3.8,r:0.3,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_combat_hall_v1.glb',
      source:'assets/blender/holm_combat_hall_v1.blend',
      manifest:'assets/manifests/holm_combat_hall_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_training_post','holm_arms_rack','holm_warden_roll','prop'],
      reference:'Bible_References/A_Tutorial_Island_Option.jpg + TUTORIAL_ISLAND.md combat guide station',
      visualProfile:{
        cameraRead:'warm hand-authored low-poly practice hall at the elevated OSRS camera',
        silhouette:'gabled drill hall with a taller pyramid-roofed drill tower, a covered practice yard on posts, and a half-octagonal armoury apse',
        requiredFeatures:['four-mass roof hierarchy with a polygonal apse roof','irregular fieldstone and timber bays',
          'two fitted full-frame doors','training pell over an inlaid sparring ring','cavern stair head inside the drill tower',
          'rack of arms, roll of honour, archery butt and hall bench','crossed-swords gable crest and helm finial']
      },
      visualBudget:{maxTriangles:18000,maxDrawCalls:100,maxPrimitives:100,maxMaterials:45,maxFileBytes:1800000}
    }
  };

  var mageTower={
    id:'holm_mage_tower_v1',assetId:'holm_mage_tower',revision:1,
    label:"Tutor's Holm Mage Tower",padId:'mage_tower',
    placement:{x:193,z:136,rot:0,yOffset:-0.12},
    footprint:{w:11,d:11,h:12.0},
    interiorBounds:{x:0,z:0,w:10,d:6},
    purpose:{
      primary:'Study the rune table to learn which runes a wind spell burns and how to choose it from the spellbook before the practice target arrives.',
      secondary:'Study the spell lectern to learn how the spellbook lists level, runes and effect, and how a staff can provide a rune.',
      storyClue:'The tower register names every learner who cast their first wind spell here and the study upstairs they earned.',
      support:'A bookshelf of primers, a brass orrery, and the spiral stair to the shuttered upper study.'
    },
    rooms:[
      {id:'casting_hall',label:'Casting Hall',role:'primary-service',bounds:{x:-2,z:0,w:6,d:6}},
      {id:'scriptorium',label:'Scriptorium',role:'secondary-use',bounds:{x:3,z:-0.5,w:4,d:5}},
      {id:'upper_study',label:'Upper Study',role:'support-space',bounds:{x:-2,z:0,w:6,d:6},level:1}
    ],
    // The ridge road arrives from the west; the dock road leaves to the south.
    doors:[
      {id:'west_door',label:'Tower door',side:'W',x:-5,z:0.5,width:2,
        opening:{x:-5,z:-0.5},closedRot:Math.PI/2,openRot:Math.PI/2-1.535,
        entry:{inside:[-3.8,-0.5],outside:[-6.2,-0.5]},
        interaction:{id:'west_door',label:'Open <b>Tower door</b>',examine:'An iron-strapped oak door under a stone arch; the ridge road ends at its step.'}},
      {id:'south_door',label:'Dock door',side:'S',x:-2.5,z:3,width:2,
        opening:{x:-1.5,z:3},closedRot:0,openRot:1.535,
        entry:{inside:[-1.5,1.8],outside:[-1.5,4.2]},
        interaction:{id:'south_door',label:'Open <b>Dock door</b>',examine:'The south door leaves toward the departure dock road.'}}
    ],
    flow:{entryDoor:'west_door',exitDoor:'south_door'},
    services:[
      {id:'rune_table',partId:'rune_table',kind:'holm_rune_table',role:'primary',
        position:[-2,-2.35],interactionTile:[-1.5,-1.5],
        interaction:{id:'rune_table',label:'Study <b>Rune table</b>',examine:'Air and mind runes sorted on velvet beside a glowing orb and an open primer.'}},
      {id:'spell_lectern',partId:'spell_lectern',kind:'holm_spell_lectern',role:'secondary',
        position:[4.35,0.5],interactionTile:[3.5,0.5],
        interaction:{id:'spell_lectern',label:'Study <b>Spell lectern</b>',examine:'A primer open at the first page of the spellbook.'}}
    ],
    clues:[
      {id:'tower_register',partId:'tower_register',kind:'holm_tower_register',
        position:[3,-2.85],interactionTile:[3.5,-1.5],
        interaction:{id:'tower_register',label:'Read <b>Tower register</b>',examine:'A parchment of names under a blue wax seal.'}}
    ],
    supportSpaces:[
      {id:'bookshelf',partId:'bookshelf',kind:'prop',
        position:[3,1.7],interactionTile:[3.5,0.5],purpose:'Hold the primers that back the lectern lesson',
        interaction:{id:'bookshelf',label:'Inspect <b>Bookshelf</b>',inspectOnly:true,inspectName:'bookshelf',
          inspectMessage:'Primers on air, water, earth and fire, each shelved by the level it needs. Most spines are unbroken.'}},
      {id:'orrery',partId:'orrery',kind:'prop',
        position:[-4.4,1.6],interactionTile:[-3.5,1.5],purpose:'Dress the casting hall with the headland\'s star lore',
        interaction:{id:'orrery',label:'Inspect <b>Orrery</b>',inspectOnly:true,inspectName:'orrery',
          inspectMessage:'Brass rings turn a blue planet around a brass sun. Lastlight is marked on the outer ring.'}},
      {id:'spiral_stair',partId:'spiral_stair',kind:'prop',
        position:[-4.3,-2.3],interactionTile:[-3.5,-1.5],purpose:'Reach the upper study once the instructor opens it',
        interaction:{id:'spiral_stair',label:'Inspect <b>Spiral stair</b>',inspectOnly:true,inspectName:'spiral stair',
          inspectMessage:'A timber spiral up to the study hatch. The hatch is shuttered until a learner casts their first wind spell.'}},
      {id:'casting_socket',partId:'casting_socket',kind:'future_socket',
        position:[-2,1.5],purpose:'Reserve the practice target\'s standing place inside the casting circle without shipping a placeholder',bundle:false}
    ],
    colliders:[
      wall('tower_south_w',-5,3,-2.5,3), wall('tower_south_e',-0.5,3,1,3),
      wall('tower_east_s',1,3,1,0.5), wall('tower_east_n',1,-2.5,1,-3),
      wall('tower_north',1,-3,-5,-3),
      wall('tower_west_n',-5,-3,-5,-1.5), wall('tower_west_s',-5,0.5,-5,3),
      wall('wing_south',1,2,5,2), wall('wing_east',5,2,5,-3), wall('wing_north',5,-3,1,-3),
      {id:'rune_table',type:'rect',x:-2,z:-2.35,hw:1.0,hd:0.3,role:'service'},
      {id:'spell_lectern',type:'circle',x:4.35,z:0.5,r:0.3,role:'service'},
      {id:'bookshelf',type:'rect',x:3,z:1.7,hw:1.2,hd:0.25,role:'support'},
      {id:'orrery',type:'circle',x:-4.4,z:1.6,r:0.3,role:'support'},
      {id:'spiral_stair',type:'circle',x:-4.3,z:-2.3,r:0.55,role:'support'}
    ],
    resources:{
      visualBuilder:'WorldV2Buildings.preload/build',
      model:'assets/models/buildings/holm_mage_tower_v1.glb',
      source:'assets/blender/holm_mage_tower_v1.blend',
      manifest:'assets/manifests/holm_mage_tower_v1.json',
      assetPipeline:'tools/asset_pipeline.py',
      interactionKinds:['door','holm_rune_table','holm_spell_lectern','holm_tower_register','prop'],
      reference:'Bible_References/A_Tutorial_Island_Option.jpg + TUTORIAL_ISLAND.md mage tower station',
      visualProfile:{
        cameraRead:'tall hand-authored low-poly stone tower at the elevated OSRS camera',
        silhouette:'two-storey square ashlar tower under a steep pyramid spire with a crescent finial, and a lean-to timber scriptorium wing',
        requiredFeatures:['pyramid spire with crescent-and-star finial over a two-storey stone tower','coursed ashlar with corner quoins and a string course',
          'two fitted full-frame doors under stone arches','casting circle of rune stones under the rune table','spiral stair to the shuttered upper study',
          'spell lectern, bookshelf, orrery and tower register','timber scriptorium wing with a lean-to tile roof']
      },
      visualBudget:{maxTriangles:20000,maxDrawCalls:100,maxPrimitives:100,maxMaterials:50,maxFileBytes:1800000}
    }
  };

  var definitions={holm_guide_hall_v1:guideHall,holm_survival_workyard_v1:survivalWorkyard,holm_teaching_kitchen_v1:teachingKitchen,holm_quest_lodge_v1:questLodge,holm_mine_gatehouse_v1:mineGatehouse,holm_bank_v1:holmBank,holm_combat_hall_v1:combatHall,holm_mage_tower_v1:mageTower};
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
    var d=guideHall,w=survivalWorkyard,k=teachingKitchen,q=questLodge,g=mineGatehouse,b=holmBank,h=combatHall,m=mageTower,result=validate(d),workyardResult=validate(w),kitchenResult=validate(k),lodgeResult=validate(q),gateResult=validate(g),bankResult=validate(b),hallResult=validate(h),towerResult=validate(m),checks=[];
    function add(label,ok){ checks.push({label:label,ok:!!ok}); }
    add('every building schema validates',result.ok&&workyardResult.ok&&kitchenResult.ok&&lodgeResult.ok&&gateResult.ok&&bankResult.ok&&hallResult.ok&&towerResult.ok);
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
      w.revision===18&&w.placement.yOffset===-0.16&&w.footprint.w===20&&w.footprint.d===14);
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
    add('all twenty-five Workyard interactions are single-source authored',
      [].concat(w.doors,w.services,w.clues,w.supportSpaces,w.furnishings).filter(function(row){return row.bundle!==false&&row.interaction;}).length===25&&
      w.supportSpaces.some(function(row){return row.id==='future_poultry_socket'&&row.bundle===false&&!row.interaction;}));
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
    add('Teaching Kitchen replaces its 13x10 Lesson Green reservation with a compound plan',k.padId==='teaching_kitchen'&&
      k.footprint.w===13&&k.footprint.d===10&&k.rooms.length===4&&unique(k.rooms,'role')&&
      k.colliders.filter(function(c){return c.role==='wall'&&/^apse_/.test(c.id);}).length===4);
    add('Teaching Kitchen has a route-facing west entry and a north yard exit',k.flow.entryDoor==='green_door'&&k.flow.exitDoor==='yard_door'&&
      k.doors.some(function(x){return x.id==='green_door'&&x.side==='W'&&x.width===1.55;})&&
      k.doors.some(function(x){return x.id==='yard_door'&&x.side==='N';}));
    add('Teaching Kitchen range accepts dough and the ingredient chain is fully authored',
      k.services.some(function(s){return s.id==='teaching_range'&&s.role==='primary'&&s.kind==='holm_kitchen_range'&&s.interaction.acceptsUseItem===true;})&&
      k.services.some(function(s){return s.id==='flour_bin'&&s.role==='secondary';})&&
      ['dough_trough','water_butt'].every(function(id){return k.services.some(function(s){return s.id===id;});})&&
      k.clues.some(function(c){return c.id==='recipe_board';})&&
      k.supportSpaces.some(function(s){return s.id==='bucket_shelf';})&&
      unique(k.services.concat(k.clues,k.supportSpaces),'partId'));
    add('Teaching Kitchen authors ten single-source interactions',
      [].concat(k.doors,k.services,k.clues,k.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===10);
    add('Teaching Kitchen Blender source, GLB, and manifest are recorded',/\.glb$/.test(k.resources.model)&&
      /\.blend$/.test(k.resources.source)&&/\.json$/.test(k.resources.manifest)&&
      k.resources.visualProfile.requiredFeatures.length===7&&/polygonal apse/.test(k.resources.visualProfile.requiredFeatures[0]));
    add('Quest Lodge replaces its 12x9 Lesson Green reservation with a hall, turret, and porch plan',q.padId==='quest_lodge'&&
      q.footprint.w===12&&q.footprint.d===9&&q.rooms.length===4&&unique(q.rooms,'role')&&
      q.colliders.filter(function(c){return c.role==='wall'&&/^turret_/.test(c.id);}).length===4);
    add('Quest Lodge enters from the porch on the route node and exits toward the mine road',q.flow.entryDoor==='lodge_door'&&q.flow.exitDoor==='road_door'&&
      q.doors.some(function(x){return x.id==='lodge_door'&&x.side==='E'&&x.width===1.55;})&&
      q.doors.some(function(x){return x.id==='road_door'&&x.side==='W';}));
    add('Quest Lodge board, chart, ledger, and guide socket are authored',
      q.services.some(function(s){return s.id==='quest_board'&&s.role==='primary'&&s.kind==='holm_quest_board';})&&
      q.services.some(function(s){return s.id==='region_map'&&s.role==='secondary';})&&
      q.clues.some(function(c){return c.id==='story_ledger';})&&
      q.supportSpaces.some(function(s){return s.id==='quest_guide_socket'&&s.kind==='future_socket'&&s.bundle===false&&!s.interaction;})&&
      unique(q.services.concat(q.clues,q.supportSpaces),'partId'));
    add('Quest Lodge authors seven single-source interactions',
      [].concat(q.doors,q.services,q.clues,q.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===7);
    add('Quest Lodge Blender source, GLB, and manifest are recorded',/\.glb$/.test(q.resources.model)&&
      /\.blend$/.test(q.resources.source)&&/\.json$/.test(q.resources.manifest)&&
      q.resources.visualProfile.requiredFeatures.length===7&&/polygonal turret/.test(q.resources.visualProfile.requiredFeatures[0]));
    add('Mine Gatehouse replaces its 10x8 Quarry Rise reservation with a tower, winch house, and ore bay',g.padId==='mine_gatehouse'&&
      g.footprint.w===10&&g.footprint.d===8&&g.rooms.length===4&&unique(g.rooms,'role')&&
      g.colliders.filter(function(c){return c.role==='wall'&&/^bay_/.test(c.id);}).length===4);
    add('Mine Gatehouse carries the road through a south gate and an east door',g.flow.entryDoor==='gate_door'&&g.flow.exitDoor==='road_door'&&
      g.doors.some(function(x){return x.id==='gate_door'&&x.side==='S'&&x.width===2;})&&
      g.doors.some(function(x){return x.id==='road_door'&&x.side==='E'&&x.width===2;}));
    add('Mine Gatehouse winch frame stands over the cavern shaft tile',
      g.services.some(function(s){return s.id==='shaft_frame'&&s.role==='primary'&&s.position[0]===-2.5&&s.position[1]===0.5;})&&
      g.services.some(function(s){return s.id==='ore_tally'&&s.role==='secondary';})&&
      g.clues.some(function(c){return c.id==='gate_stone';})&&
      ['ore_cart','tool_rack','ore_bin'].every(function(id){return g.supportSpaces.some(function(s){return s.id===id&&s.interaction.inspectOnly;});})&&
      unique(g.services.concat(g.clues,g.supportSpaces),'partId'));
    add('Mine Gatehouse authors eight single-source interactions',
      [].concat(g.doors,g.services,g.clues,g.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===8);
    add('Mine Gatehouse Blender source, GLB, and manifest are recorded',/\.glb$/.test(g.resources.model)&&
      /\.blend$/.test(g.resources.source)&&/\.json$/.test(g.resources.manifest)&&
      g.resources.visualProfile.requiredFeatures.length===7&&/polygonal bay/.test(g.resources.visualProfile.requiredFeatures[0]));
    add('Holm Bank replaces its 10x8 Warden\'s Ridge reservation with a hall, vault, and waiting bay',b.padId==='holm_bank'&&
      b.footprint.w===10&&b.footprint.d===8&&b.rooms.length===4&&unique(b.rooms,'role')&&
      b.colliders.filter(function(c){return c.role==='wall'&&/^bay_/.test(c.id);}).length===4);
    add('Holm Bank opens onto the ridge road and exits toward the Combat Hall',b.flow.entryDoor==='front_door'&&b.flow.exitDoor==='staff_door'&&
      b.doors.some(function(x){return x.id==='front_door'&&x.side==='S'&&x.width===2;})&&
      b.doors.some(function(x){return x.id==='staff_door'&&x.side==='E'&&x.width===2;}));
    add('Holm Bank booths, ledger, plaque and vault support are authored',
      b.services.filter(function(s){return s.kind==='holm_bank_booth';}).length===2&&
      b.services.some(function(s){return s.id==='bank_booth_w'&&s.role==='primary';})&&
      b.services.some(function(s){return s.id==='ledger_desk'&&s.role==='secondary';})&&
      b.clues.some(function(c){return c.id==='founders_plaque';})&&
      ['waiting_bench','strongbox_shelf','bank_counter'].every(function(id){return b.supportSpaces.some(function(s){return s.id===id&&s.interaction.inspectOnly;});})&&
      unique(b.services.concat(b.clues,b.supportSpaces),'partId'));
    add('Holm Bank authors nine single-source interactions',
      [].concat(b.doors,b.services,b.clues,b.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===9);
    add('Holm Bank Blender source, GLB, and manifest are recorded',/\.glb$/.test(b.resources.model)&&
      /\.blend$/.test(b.resources.source)&&/\.json$/.test(b.resources.manifest)&&
      b.resources.visualProfile.requiredFeatures.length===7&&/polygonal bay/.test(b.resources.visualProfile.requiredFeatures[0]));
    add('Combat Hall replaces its 12x9 Warden\'s Ridge reservation with a hall, tower, yard, and apse',h.padId==='combat_hall'&&
      h.footprint.w===12&&h.footprint.d===9&&h.rooms.length===4&&unique(h.rooms,'role')&&
      h.colliders.filter(function(c){return c.role==='wall'&&/^apse_/.test(c.id);}).length===4);
    add('Combat Hall enters from the bank side and exits toward the road',h.flow.entryDoor==='bank_door'&&h.flow.exitDoor==='road_door'&&
      h.doors.some(function(x){return x.id==='bank_door'&&x.side==='W'&&x.width===2;})&&
      h.doors.some(function(x){return x.id==='road_door'&&x.side==='S'&&x.width===2;}));
    add('Combat Hall pell, rack, roll, yard and two silent practice sockets are authored',
      h.services.some(function(s){return s.id==='training_post'&&s.role==='primary';})&&
      h.services.some(function(s){return s.id==='arms_rack'&&s.role==='secondary';})&&
      h.clues.some(function(c){return c.id==='warden_roll';})&&
      ['melee_dummy_socket','ranged_target_socket'].every(function(id){return h.supportSpaces.some(function(s){return s.id===id&&s.kind==='future_socket'&&s.bundle===false&&!s.interaction;});})&&
      unique(h.services.concat(h.clues,h.supportSpaces),'partId'));
    add('Combat Hall authors seven single-source interactions',
      [].concat(h.doors,h.services,h.clues,h.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===7);
    add('Combat Hall Blender source, GLB, and manifest are recorded',/\.glb$/.test(h.resources.model)&&
      /\.blend$/.test(h.resources.source)&&/\.json$/.test(h.resources.manifest)&&
      h.resources.visualProfile.requiredFeatures.length===7&&/polygonal apse/.test(h.resources.visualProfile.requiredFeatures[0]));
    add('Mage Tower replaces its 11x11 Mage Headland reservation with a stone tower and scriptorium wing',m.padId==='mage_tower'&&
      m.footprint.w===11&&m.footprint.d===11&&m.rooms.length===3&&unique(m.rooms,'role')&&
      m.colliders.filter(function(c){return c.role==='wall';}).length===10);
    add('Mage Tower enters from the ridge road and exits toward the dock road',m.flow.entryDoor==='west_door'&&m.flow.exitDoor==='south_door'&&
      m.doors.some(function(x){return x.id==='west_door'&&x.side==='W'&&x.width===2;})&&
      m.doors.some(function(x){return x.id==='south_door'&&x.side==='S'&&x.width===2;}));
    add('Mage Tower rune table, lectern, register, stair and a silent casting socket are authored',
      m.services.some(function(s){return s.id==='rune_table'&&s.role==='primary';})&&
      m.services.some(function(s){return s.id==='spell_lectern'&&s.role==='secondary';})&&
      m.clues.some(function(c){return c.id==='tower_register';})&&
      m.supportSpaces.some(function(s){return s.id==='spiral_stair'&&s.interaction&&s.interaction.inspectOnly;})&&
      m.supportSpaces.some(function(s){return s.id==='casting_socket'&&s.kind==='future_socket'&&s.bundle===false&&!s.interaction;})&&
      unique(m.services.concat(m.clues,m.supportSpaces),'partId'));
    add('Mage Tower authors eight single-source interactions',
      [].concat(m.doors,m.services,m.clues,m.supportSpaces).filter(function(row){return row.bundle!==false&&row.interaction;}).length===8);
    add('Mage Tower Blender source, GLB, and manifest are recorded',/\.glb$/.test(m.resources.model)&&
      /\.blend$/.test(m.resources.source)&&/\.json$/.test(m.resources.manifest)&&
      m.resources.visualProfile.requiredFeatures.length===7&&/pyramid spire/.test(m.resources.visualProfile.requiredFeatures[0]));
    return {ok:checks.every(function(c){return c.ok;}),checks:checks,errors:result.errors.concat(workyardResult.errors,kitchenResult.errors,lodgeResult.errors,gateResult.errors,bankResult.errors,hallResult.errors,towerResult.errors)};
  }
  return {
    get:function(id){ return definitions[id]?clone(definitions[id]):null; },
    all:function(){ return Object.keys(definitions).map(function(id){return clone(definitions[id]);}); },
    validate:validate,acceptance:acceptance
  };
})();
