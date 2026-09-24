# Quest Lodge navigation extraction

{
  "nodes": 251,
  "undirectedEdges": 402,
  "reachableNodes": 251,
  "targetsReachable": 5,
  "targetsTotal": 5,
  "nodeRejections": {
    "capsule-obstruction": 31,
    "footprint-support": 13
  },
  "edgeRejections": {
    "capsule-obstruction": 21,
    "footprint-support": 1
  },
  "queries": {
    "capsuleSphereQueries": 326414,
    "edgeSamples": 16922
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
    "Connectivity is measured below; inspect current obstructions.json for any disconnected route."
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
  }
]
