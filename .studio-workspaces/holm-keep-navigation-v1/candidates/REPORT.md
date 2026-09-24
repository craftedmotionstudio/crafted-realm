# Keep navigation extraction

{
  "nodes": 881,
  "undirectedEdges": 1380,
  "reachableNodes": 769,
  "targetsReachable": 5,
  "targetsTotal": 7,
  "nodeRejections": {
    "capsule-obstruction": 100,
    "footprint-support": 44,
    "footprint-rise": 8
  },
  "edgeRejections": {
    "footprint-rise": 3,
    "capsule-obstruction": 78,
    "footprint-support": 11
  },
  "queries": {
    "capsuleSphereQueries": 1123627,
    "edgeSamples": 58232
  },
  "complete": false,
  "invariants": [
    "Every adjacency is symmetric and exactly one cardinal tile.",
    "Every edge is independently sampled in both directions at 0.05 m intervals.",
    "Every center support rise between samples is at most 0.24 m.",
    "Every profile endpoint matches its node raw support and capsule footbase within 0.00002 m.",
    "All exported coordinates are finite."
  ],
  "geometryFindings": [
    "Upper hall floor ends at local x=-3.19 while connecting gallery begins x=-3.0: 0.19 m missing support in the doorway at z4.5 and5.5.",
    "East ascending flight spans local x8.325..9.575. Half-grid x8.5 and9.5 cannot both retain a radius0.24 footprint on its treads, and nearest side rails additionally collide. Return landing left edge likewise does not support x8.5 footprint."
  ],
  "limitations": [
    "Geometry navigation candidate, not runtime player proof.",
    "Foot support is sampled at center and 16 circumference points. Capsule body is conservatively covered by sphere BVH tests at each edge sample, but lateral sweep between edge samples is not a continuous-volume proof.",
    "capsuleBase is highest nearby supporting tread; y remains actual center-ray support. Follower must honor capsuleBase without linearly interpolating through risers.",
    "Sub-0.49 m vertical duplicate supports at tread boundaries are collapsed to the upper surface, avoiding false lower-floor nodes. A footprint may span up to0.72 m across three tower risers; individual center samples still obey the0.24 m step limit."
  ]
}

Targets:
[
  {
    "id": "gate",
    "label": "Gate passage",
    "nodeId": "2:7:1",
    "reachable": true,
    "requestedLocal": [
      2.5,
      0,
      7.5
    ]
  },
  {
    "id": "court",
    "label": "Grass courtyard",
    "nodeId": "1:1:0",
    "reachable": true,
    "requestedLocal": [
      1.5,
      -0.025,
      1.5
    ]
  },
  {
    "id": "hall",
    "label": "Hall ground floor",
    "nodeId": "-6:0:1",
    "reachable": true,
    "requestedLocal": [
      -5.5,
      0,
      0.5
    ]
  },
  {
    "id": "upper",
    "label": "Hall upper floor",
    "nodeId": "-6:-4:0",
    "reachable": true,
    "requestedLocal": [
      -5.5,
      3.2,
      -2.5
    ]
  },
  {
    "id": "wallwalk",
    "label": "East wallwalk",
    "nodeId": "8:0:0",
    "reachable": false,
    "requestedLocal": [
      8.5,
      3.2,
      0.5
    ]
  },
  {
    "id": "watch-lookout",
    "label": "High watch lookout",
    "nodeId": "-7:-11:0",
    "reachable": true,
    "requestedLocal": [
      -6.5,
      10.2,
      -10.5
    ]
  },
  {
    "id": "east-lookout",
    "label": "East turret lookout",
    "nodeId": "10:-6:0",
    "reachable": false,
    "requestedLocal": [
      10.5,
      6.7,
      -5.5
    ]
  }
]
