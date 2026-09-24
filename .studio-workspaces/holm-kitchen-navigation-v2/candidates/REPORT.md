# Bakehouse navigation extraction

{
  "nodes": 284,
  "undirectedEdges": 456,
  "reachableNodes": 282,
  "targetsReachable": 5,
  "targetsTotal": 5,
  "nodeRejections": {
    "capsule-obstruction": 47,
    "footprint-support": 3
  },
  "edgeRejections": {
    "capsule-obstruction": 26,
    "footprint-rise": 1
  },
  "queries": {
    "capsuleSphereQueries": 371106,
    "edgeSamples": 19237
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
    "label": "Courtyard entrance",
    "nodeId": "0:1:1",
    "reachable": true,
    "requestedLocal": [
      0.5,
      0,
      1.5
    ]
  },
  {
    "id": "oven",
    "label": "Oven working stance",
    "nodeId": "-3:-2:1",
    "reachable": true,
    "requestedLocal": [
      -2.5,
      0,
      -2.5
    ]
  },
  {
    "id": "prep",
    "label": "Preparation table",
    "nodeId": "-3:0:1",
    "reachable": true,
    "requestedLocal": [
      -2.5,
      0,
      0.5
    ]
  },
  {
    "id": "pantry",
    "label": "Pantry shelving",
    "nodeId": "4:-3:0",
    "reachable": true,
    "requestedLocal": [
      4.5,
      0,
      -2.5
    ]
  },
  {
    "id": "loft",
    "label": "Upstairs room",
    "nodeId": "-3:-3:0",
    "reachable": true,
    "requestedLocal": [
      -2.5,
      3.3,
      -3.5
    ]
  }
]
