/* ================= HOLM SURVIVAL TREES =================
 * The three marked lesson trees of Survival Wood. The landscape's oaks are
 * scenery only (no gather contract), so the required `chop_logs` lesson had no
 * tree a player could actually chop. These are real game2 `makeTree` resources
 * (Woodcutting gather, emberwood logs, regrowth), owned by the Holm provider
 * exactly like the Training Cavern owns its rocks: created when the provider
 * boots, removed when it disposes, never streamed with a chunk.
 *
 * Positions sit just south of the pond-loop road beside the chop_logs arrow
 * target (126,158) and clear of the scenery oak at (128,160).
 */
var HolmSurvivalTrees=(function(){
  'use strict';
  var OWNER='holm_survival_trees';
  var TREES=[{x:124,z:161},{x:131,z:161},{x:126,z:164}];
  var runtime={trees:[],colliders:[],initialized:false};
  function rebake(x,z){
    try{ if(typeof CollisionGrid!=='undefined'&&CollisionGrid.baked&&typeof CollisionGrid.rebakeArea==='function') CollisionGrid.rebakeArea(x,z,2); }catch(e){}
  }
  /* A limewash band round the trunk and a red chalk cross on the near face: the lesson trees must read
   * differently from the scenery oaks beside them (play review F-12). Children of the tree group follow
   * its deplete/respawn visibility like the canopy does. */
  function markTrunk(g){
    if(typeof THREE==='undefined') return;
    var band=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.36,0.26,10,1,true),
      new THREE.MeshLambertMaterial({color:0xf2ead6,side:THREE.DoubleSide}));
    band.position.y=1.05; band.name='marked-tree-band'; g.add(band);
    var chalk=new THREE.MeshLambertMaterial({color:0xc8362a});
    for(var k=0;k<2;k++){
      var stroke=new THREE.Mesh(new THREE.BoxGeometry(0.30,0.05,0.03),chalk);
      stroke.position.set(0,1.05,0.36); stroke.rotation.z=(k?-1:1)*Math.PI/4; stroke.name='marked-tree-chalk-'+k;
      g.add(stroke);
    }
  }
  function init(){
    dispose();
    if(typeof makeTree!=='function'||typeof WORLD==='undefined') return false;
    for(var i=0;i<TREES.length;i++){
      var t=TREES[i], before=WORLD.colliders.length;
      var g=makeTree(t.x,t.z,'normal');
      if(!g) continue;
      g.name='holm-marked-tree-'+(i+1);
      markTrunk(g);
      g.userData.label='Chop down <b>Marked tree</b>';
      g.userData.marked=true;
      g.userData.runtimeOwnerId=OWNER;
      runtime.trees.push(g);
      for(var c=before;c<WORLD.colliders.length;c++){ WORLD.colliders[c].runtimeOwnerId=OWNER; runtime.colliders.push(WORLD.colliders[c]); }
      rebake(t.x,t.z);
    }
    runtime.initialized=runtime.trees.length===TREES.length;
    return runtime.initialized;
  }
  function dispose(){
    for(var i=0;i<runtime.trees.length;i++){
      var g=runtime.trees[i];
      if(g.parent) g.parent.remove(g);
      var ci=WORLD.clickables.indexOf(g); if(ci>=0) WORLD.clickables.splice(ci,1);
      var ri=WORLD.resources.indexOf(g); if(ri>=0) WORLD.resources.splice(ri,1);
    }
    for(var j=0;j<runtime.colliders.length;j++){
      var k=WORLD.colliders.indexOf(runtime.colliders[j]); if(k>=0) WORLD.colliders.splice(k,1);
    }
    var had=runtime.trees.slice();
    runtime.trees=[]; runtime.colliders=[]; runtime.initialized=false;
    for(var r=0;r<had.length;r++) rebake(had[r].position.x,had[r].position.z);
  }
  function snapshot(){
    return {initialized:runtime.initialized,trees:runtime.trees.map(function(g){return {x:g.position.x,z:g.position.z,alive:!!g.userData.alive,
      marked:!!g.getObjectByName('marked-tree-band')};})};
  }
  return {OWNER:OWNER,TREES:TREES,init:init,dispose:dispose,snapshot:snapshot};
})();
if(typeof globalThis!=='undefined') globalThis.HolmSurvivalTrees=HolmSurvivalTrees;
