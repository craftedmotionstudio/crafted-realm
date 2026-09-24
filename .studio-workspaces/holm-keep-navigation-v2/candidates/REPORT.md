# Keep v3 navigation extraction

{
  "nodes": 898,
  "undirectedEdges": 1399,
  "reachableNodes": 813,
  "targetsReachable": 5,
  "targetsTotal": 7,
  "nodeRejections": {
    "capsule-obstruction": 97,
    "footprint-support": 43,
    "footprint-rise": 8
  },
  "edgeRejections": {
    "footprint-rise": 3,
    "capsule-obstruction": 85,
    "footprint-support": 10
  },
  "queries": {
    "capsuleSphereQueries": 1139531,
    "edgeSamples": 59051
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
    "V3 still has disconnected wallwalk and east-lookout targets. V2 diagnoses are historical; inspect current obstructions.json before further geometry repair."
  ],
  "limitations": [
    "Geometry navigation candidate, not runtime player proof.",
    "Foot support is sampled at center and 16 circumference points. Capsule body is conservatively covered by sphere BVH tests at each edge sample, but lateral sweep between edge samples is not a continuous-volume proof.",
    "capsuleBase is highest nearby supporting tread; y remains actual center-ray support. Follower must honor capsuleBase without linearly interpolating through risers.",
    "Sub-0.49 m vertical duplicate supports at tread boundaries are collapsed to the upper surface, avoiding false lower-floor nodes. A footprint may span up to0.72 m across three tower risers; individual center samples still obey the0.24 m step limit."
  ]
}