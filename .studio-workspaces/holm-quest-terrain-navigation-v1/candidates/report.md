# Lodge terrain navigation

{
  "nodes": 494,
  "undirectedEdges": 871,
  "reachableNodes": 494,
  "targetsReachable": 6,
  "targetsTotal": 6,
  "nodeRejections": {
    "capsule-obstruction": 32,
    "footprint-support": 13
  },
  "edgeRejections": {
    "capsule-obstruction": 24,
    "footprint-support": 1
  },
  "queries": {
    "capsuleSphereQueries": 705788,
    "edgeSamples": 36643
  },
  "complete": true,
  "invariants": [
    "Every adjacency is symmetric and exactly one cardinal tile.",
    "Every edge is independently sampled in both directions at 0.05 m intervals.",
    "Every center support rise between samples is at most 0.24 m.",
    "Every profile endpoint matches its node raw support and capsule footbase within 0.00002 m.",
    "All exported coordinates are finite."
  ],
  "geometryFindings": [
    "Connectivity and rejected samples are recorded in report.md; no flat Studio apron remains.",
    "Habitat and foundation use direct exported GLB rest node TRS/accessors, avoiding Blender importer animation evaluation. Render proof exports every primitive position in asset-root glTF coordinates."
  ],
  "limitations": [
    "Geometry navigation candidate, not runtime player proof.",
    "Foot support is sampled at center and 16 circumference points. Capsule body is conservatively covered by sphere BVH tests at each edge sample, but lateral sweep between edge samples is not a continuous-volume proof.",
    "capsuleBase is highest nearby supporting tread; y remains actual center-ray support. Follower must honor capsuleBase without linearly interpolating through risers.",
    "Sub-0.49 m vertical duplicate supports at tread boundaries are collapsed to the upper surface, avoiding false lower-floor nodes. A footprint may span up to0.72 m across three tower risers; individual center samples still obey the0.24 m step limit.",
    "Habitat obstacles use exported rest transforms only, not an animated breeze sweep; terrain patch and its boundary only, not whole island."
  ],
  "outsideLaneRouteFound": true,
  "outsideLaneRoute": [
    "1:9:0",
    "1:8:0",
    "1:7:0",
    "1:6:0",
    "1:5:0",
    "1:4:0",
    "1:3:0",
    "1:2:0",
    "2:2:0",
    "3:2:0",
    "4:2:0",
    "5:2:0",
    "5:1:0",
    "6:1:0",
    "6:0:0",
    "7:0:0",
    "7:-1:0",
    "7:-2:0",
    "7:-3:0",
    "7:-4:0",
    "6:-4:0",
    "6:-5:0",
    "5:-5:0",
    "4:-5:0",
    "3:-5:0",
    "2:-5:0",
    "1:-5:0",
    "1:-6:0",
    "1:-7:0",
    "1:-8:0",
    "1:-9:0",
    "1:-10:0",
    "1:-11:0",
    "1:-12:0",
    "1:-13:0"
  ]
}

Targets
[
  {
    "id": "entrance",
    "label": "Lodge entrance",
    "nodeId": "0:1:0",
    "reachable": true,
    "requestedLocal": [
      0.5,
      0,
      1.5
    ]
  },
  {
    "id": "board",
    "label": "Quest board",
    "nodeId": "-4:2:1",
    "reachable": true,
    "requestedLocal": [
      -3.5,
      0,
      2.5
    ]
  },
  {
    "id": "map",
    "label": "Map table",
    "nodeId": "2:1:0",
    "reachable": true,
    "requestedLocal": [
      2.5,
      0,
      1.5
    ]
  },
  {
    "id": "bay",
    "label": "Reading bay",
    "nodeId": "4:-2:0",
    "reachable": true,
    "requestedLocal": [
      4.5,
      0,
      -1.5
    ]
  },
  {
    "id": "guest",
    "label": "Upstairs guest room",
    "nodeId": "-4:0:0",
    "reachable": true,
    "requestedLocal": [
      -3.5,
      3.3,
      0.5
    ]
  },
  {
    "id": "north-lane",
    "label": "North lane",
    "nodeId": "1:-13:0",
    "reachable": true,
    "requestedLocal": [
      1.5,
      2.0759983716670067,
      -12.5
    ]
  }
]

Rejected samples (diagnostic)
{
  "nodes": [
    {
      "reason": "capsule-obstruction",
      "x": -8.5,
      "z": -2.5,
      "y": 0.26358985900878906,
      "capsuleBase": 0.31443214416503906,
      "object": "Habitat_meadow-tuft-30",
      "distance": 0.17088139057159424
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": -3.5,
      "y": 3.3000001907348633,
      "capsuleBase": 3.300002098083496,
      "object": "Lodge_UpperFurnishing_Warm_oak",
      "distance": 0.2256234735250473
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": -2.5,
      "y": 3.3000001907348633,
      "capsuleBase": 3.3000011444091797,
      "object": "Lodge_UpperFurnishing_Warm_oak",
      "distance": 0.19155454635620117
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": -1.5,
      "y": 3.3000001907348633,
      "capsuleBase": 3.3000011444091797,
      "object": "Lodge_UpperFurnishing_Warm_oak",
      "distance": 0.14317823946475983
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": 1.5,
      "y": 3.3000001907348633,
      "capsuleBase": 3.3000011444091797,
      "object": "Lodge_UpperFurnishing_Warm_oak",
      "distance": 0.16900086402893066
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": 2.5,
      "y": 3.3000001907348633,
      "capsuleBase": 3.3000011444091797,
      "object": "Lodge_UpperFurnishing_Warm_oak",
      "distance": 0.16900086402893066
    },
    {
      "reason": "capsule-obstruction",
      "x": -3.5,
      "z": 3.5,
      "y": -2.384185791015625e-07,
      "capsuleBase": 2.384185791015625e-07,
      "object": "Lodge_FurnishingBoard_Warm_oak",
      "distance": 0.23501862585544586
    },
    {
      "reason": "footprint-support",
      "x": -2.26,
      "z": -2.5,
      "y": 4.149640083312988
    },
    {
      "reason": "footprint-support",
      "x": -2.26,
      "z": -1.5,
      "y": 3.4130325317382812
    },
    {
      "reason": "footprint-support",
      "x": -2.26,
      "z": -0.5,
      "y": 2.6764259338378906
    },
    {
      "reason": "capsule-obstruction",
      "x": -2.5,
      "z": -0.5,
      "y": 0.0,
      "capsuleBase": 2.384185791015625e-07,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.18724335730075836
    },
    {
      "reason": "footprint-support",
      "x": -2.26,
      "z": 0.5,
      "y": 1.9398174285888672
    },
    {
      "reason": "capsule-obstruction",
      "x": -2.5,
      "z": 0.5,
      "y": -2.384185791015625e-07,
      "capsuleBase": 2.384185791015625e-07,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.2420104295015335
    },
    {
      "reason": "footprint-support",
      "x": -2.26,
      "z": 1.5,
      "y": 1.203211784362793
    },
    {
      "reason": "capsule-obstruction",
      "x": -2.5,
      "z": 1.5,
      "y": 0.0,
      "capsuleBase": 0.41250038146972656,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.019999980926513672
    },
    {
      "reason": "capsule-obstruction",
      "x": -2.5,
      "z": 3.5,
      "y": -2.384185791015625e-07,
      "capsuleBase": 0.0,
      "object": "Lodge_FurnishingBoard_Warm_oak",
      "distance": 0.23501870036125183
    },
    {
      "reason": "capsule-obstruction",
      "x": -1.5,
      "z": -0.5,
      "y": -1.1920928955078125e-07,
      "capsuleBase": 1.1920928955078125e-07,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.18044424057006836
    },
    {
      "reason": "capsule-obstruction",
      "x": -1.5,
      "z": 0.5,
      "y": -1.1920928955078125e-07,
      "capsuleBase": 1.1920928955078125e-07,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.23678915202617645
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": -3.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": -2.5,
      "y": 3.299999237060547
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": -1.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": -0.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": 0.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": 1.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": 2.5,
      "y": 3.3000001907348633
    },
    {
      "reason": "capsule-obstruction",
      "x": -0.5,
      "z": 2.5,
      "y": -0.019999980926513672,
      "capsuleBase": -0.01999974250793457,
      "object": "Lodge_Door_Warm_oak",
      "distance": 0.08422045409679413
    },
    {
      "reason": "footprint-support",
      "x": -0.26,
      "z": 3.5,
      "y": 3.299999237060547
    },
    {
      "reason": "capsule-obstruction",
      "x": -0.5,
      "z": 3.5,
      "y": -0.019999980926513672,
      "capsuleBase": -0.019999980926513672,
      "object": "Lodge_Door_Dark_iron",
      "distance": 0.0035417985636740923
    },
    {
      "reason": "capsule-obstruction",
      "x": 0.5,
      "z": -0.5,
      "y": -9.5367431640625e-07,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingMap_Warm_oak",
      "distance": 0.2131737321615219
    },
    {
      "reason": "capsule-obstruction",
      "x": 1.5,
      "z": -3.5,
      "y": 9.5367431640625e-07,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingShelf_Warm_oak",
      "distance": 0.004000946879386902
    },
    {
      "reason": "capsule-obstruction",
      "x": 1.5,
      "z": -0.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingMap_Warm_oak",
      "distance": 0.23155462741851807
    },
    {
      "reason": "capsule-obstruction",
      "x": 2.5,
      "z": -3.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingShelf_Warm_oak",
      "distance": 0.004000946879386902
    },
    {
      "reason": "capsule-obstruction",
      "x": 2.5,
      "z": -0.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingMap_Warm_oak",
      "distance": 0.23155462741851807
    },
    {
      "reason": "capsule-obstruction",
      "x": 3.5,
      "z": -3.5,
      "y": 1.9073486328125e-06,
      "capsuleBase": 1.9073486328125e-06,
      "object": "Lodge_FurnishingShelf_Warm_oak",
      "distance": 0.004001900553703308
    },
    {
      "reason": "capsule-obstruction",
      "x": 3.5,
      "z": -0.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingMap_Warm_oak",
      "distance": 0.2131737321615219
    },
    {
      "reason": "capsule-obstruction",
      "x": 4.5,
      "z": 0.5,
      "y": 9.5367431640625e-07,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingHearth_Light_gray_limestone",
      "distance": 0.06400094926357269
    },
    {
      "reason": "capsule-obstruction",
      "x": 4.5,
      "z": 1.5,
      "y": 9.5367431640625e-07,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingHearth_Light_gray_limestone",
      "distance": 0.019999980926513672
    },
    {
      "reason": "capsule-obstruction",
      "x": 5.5,
      "z": -3.5,
      "y": -0.020000457763671875,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.20823119580745697
    },
    {
      "reason": "capsule-obstruction",
      "x": 5.5,
      "z": -2.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.2207074910402298
    },
    {
      "reason": "capsule-obstruction",
      "x": 5.5,
      "z": -1.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_FurnishingBay_Warm_oak",
      "distance": 0.21044349670410156
    },
    {
      "reason": "capsule-obstruction",
      "x": 5.5,
      "z": -0.5,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.2207074910402298
    },
    {
      "reason": "capsule-obstruction",
      "x": 5.5,
      "z": 0.5,
      "y": -0.020000457763671875,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.2082313746213913
    },
    {
      "reason": "capsule-obstruction",
      "x": 6.5,
      "z": -2.5,
      "y": -0.020000457763671875,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.05130257084965706
    },
    {
      "reason": "capsule-obstruction",
      "x": 6.5,
      "z": -1.5,
      "y": -0.020000457763671875,
      "capsuleBase": 0.0,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.05820854380726814
    },
    {
      "reason": "capsule-obstruction",
      "x": 6.5,
      "z": -0.5,
      "y": -0.020000457763671875,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Light_gray_limestone",
      "distance": 0.05130254849791527
    }
  ],
  "edges": [
    {
      "reason": "capsule-obstruction",
      "x": -8.1,
      "z": -9.5,
      "y": 1.7769393920898438,
      "capsuleBase": 1.8555002212524414,
      "object": "Habitat_oak-10",
      "distance": 0.24262912571430206,
      "from": "-9:-10:0",
      "to": "-8:-10:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -8.5,
      "z": -9.4,
      "y": 1.6309986114501953,
      "capsuleBase": 1.7167243957519531,
      "object": "Habitat_oak-10",
      "distance": 0.23375600576400757,
      "from": "-9:-10:0",
      "to": "-9:-9:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -7.5,
      "z": -9.9,
      "y": 1.9995641708374023,
      "capsuleBase": 2.072239875793457,
      "object": "Habitat_oak-10",
      "distance": 0.23809289932250977,
      "from": "-8:-11:0",
      "to": "-8:-10:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.4,
      "z": -3.5,
      "y": 0.027772903442382812,
      "capsuleBase": 0.05992603302001953,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2033921629190445,
      "from": "-6:-4:0",
      "to": "-5:-4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": -2.5,
      "y": 0.022054672241210938,
      "capsuleBase": 0.04962348937988281,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.24088196456432343,
      "from": "-6:-3:0",
      "to": "-5:-3:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": -1.5,
      "y": 0.009989738464355469,
      "capsuleBase": 0.031833648681640625,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2334001064300537,
      "from": "-6:-2:0",
      "to": "-5:-2:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": -0.5,
      "y": -0.0023565292358398438,
      "capsuleBase": 0.013568878173828125,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.22691652178764343,
      "from": "-6:-1:0",
      "to": "-5:-1:1"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": 0.5,
      "y": -0.014819145202636719,
      "capsuleBase": -0.0048503875732421875,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2217143326997757,
      "from": "-6:0:0",
      "to": "-5:0:1"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": 1.5,
      "y": -0.02719402313232422,
      "capsuleBase": -0.021413803100585938,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21826082468032837,
      "from": "-6:1:0",
      "to": "-5:1:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": 2.5,
      "y": -0.039399147033691406,
      "capsuleBase": -0.029052734375,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21707579493522644,
      "from": "-6:2:0",
      "to": "-5:2:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -5.45,
      "z": 3.5,
      "y": -0.05135631561279297,
      "capsuleBase": -0.03463268280029297,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21637658774852753,
      "from": "-6:3:0",
      "to": "-5:3:1"
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850864589214325,
      "from": "-5:-5:0",
      "to": "-5:-4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -4.5,
      "z": 3.55,
      "y": -2.384185791015625e-07,
      "capsuleBase": 0.0,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2229483276605606,
      "from": "-5:3:1",
      "to": "-5:4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -3.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.01999950408935547,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850882470607758,
      "from": "-4:-5:0",
      "to": "-4:-4:1"
    },
    {
      "reason": "capsule-obstruction",
      "x": -2.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.01999950408935547,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850836277008057,
      "from": "-3:-5:0",
      "to": "-3:-4:1"
    },
    {
      "reason": "capsule-obstruction",
      "x": -1.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.01999950408935547,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850834786891937,
      "from": "-2:-5:0",
      "to": "-2:-4:1"
    },
    {
      "reason": "footprint-support",
      "x": -0.81,
      "z": 0.5,
      "y": 1.0312509536743164,
      "from": "-2:0:0",
      "to": "-1:0:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -1.05,
      "z": 1.5,
      "y": 0.20625019073486328,
      "capsuleBase": 0.41250038146972656,
      "object": "Lodge_Stair_Warm_oak",
      "distance": 0.22090712189674377,
      "from": "-2:1:0",
      "to": "-1:1:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -1.5,
      "z": 3.55,
      "y": -2.384185791015625e-07,
      "capsuleBase": 0.0,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2229483425617218,
      "from": "-2:3:1",
      "to": "-2:4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": -0.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.01999950408935547,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850836277008057,
      "from": "-1:-5:0",
      "to": "-1:-4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": 0.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.01999950408935547,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850834786891937,
      "from": "0:-5:0",
      "to": "0:-4:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": 1.5,
      "z": 1.55,
      "y": 0.0,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2229488044977188,
      "from": "1:1:0",
      "to": "1:2:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": 2.5,
      "z": 1.55,
      "y": 9.5367431640625e-07,
      "capsuleBase": 9.5367431640625e-07,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2229488343000412,
      "from": "2:1:0",
      "to": "2:2:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": 3.5,
      "z": 1.55,
      "y": -9.5367431640625e-07,
      "capsuleBase": 0.0,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.2229485660791397,
      "from": "3:1:0",
      "to": "3:2:0"
    },
    {
      "reason": "capsule-obstruction",
      "x": 4.5,
      "z": -4.45,
      "y": -0.02000141143798828,
      "capsuleBase": -0.020000457763671875,
      "object": "Lodge_GroundShell_Warm_oak",
      "distance": 0.21850819885730743,
      "from": "4:-5:0",
      "to": "4:-4:0"
    }
  ]
}