'use strict';
// Node-side assembly of the island navigation inputs (shared by tests/tools). Since the Holm v2 land (W0b, 2026-09-26) the
// island stands on the terrain v2 bundle with every Blender building re-measured on it: this delegates to
// tools/holm_v2_land_inputs.js. The Sept 13 (v1) assembly is kept as tools/holm_island_inputs_v1.js for history.
const V2=require('./holm_v2_land_inputs'),V1=require('./holm_island_inputs_v1');
function load(opts){return V2.load(Object.assign({proxy:false},opts||{}))}
module.exports={load,bridgeFrom:V1.bridgeFrom,TREE_TRUNK:V1.TREE_TRUNK,NEW_BUILDINGS:V1.NEW_BUILDINGS};
