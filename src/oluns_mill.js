/* ============ oluns_mill — the windmill at the bible map's POI (SW of the Commons) ============
 * Pass-009: the map draws a windmill between the Gloomfen road and Mirrorpond's arm.
 * Olun's Mill moves here from the wiped legacy spot: working windmill, the miller's
 * furnished cottage, fenced wheat rows, and Olun himself — deliberately repopulated
 * (spawnNpc.force; the world gate stays closed).
 */
(function(){
  const M={x:-52, z:40};
  function build(){
    if(typeof Buildkit==='undefined' || typeof makeWindmill!=='function') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(M.x,M.z)===null) return false;

    makeWindmill(M.x, M.z);
    // the miller's cottage, furnished
    Buildkit.house({x:M.x+7, z:M.z+1, w:5, d:4.5, doorSide:'W',
      color:0xc9b28a, roofColor:0x7a5838, roof:'gable', interior:'house'});
    // Track C deploy (2026-07-08): the Building_Exterior_Option3 white-plaster
    // FARMHOUSE anchors the holding NW of the yard — door (+Z face) opens toward
    // the yard/wheat rows. rot 0 only: its blocking rects are axis-aligned.
    // Pad probed flat/dry/collider-free in-engine before placement.
    if(typeof makeRefBld3==='function') scene.add(makeRefBld3(M.x-8.5, M.z-10, 0));
    // the wheat: fenced rows south-west of the sails
    if(typeof makeWheatField==='function') makeWheatField(M.x-7.4, M.z+3.4, M.x-2.6, M.z+7.4);
    if(typeof makeFurrows==='function') makeFurrows(M.x-7.4, M.z+3.4, M.x-2.6, M.z+7.4);
    if(typeof makeFence==='function'){
      makeFence(M.x-8, M.z+2.8, M.x-2, M.z+2.8);
      makeFence(M.x-8, M.z+2.8, M.x-8, M.z+8);
      makeFence(M.x-2, M.z+2.8, M.x-2, M.z+8);
    }
    if(typeof makeCrateCluster==='function') makeCrateCluster(M.x+3.4, M.z-2.6);
    if(typeof makeSignpost==='function') makeSignpost(M.x+0.5, M.z-17.5, [
      {text:'Olun’s Mill', ang:1.55}, {text:'Gloomfen', ang:-2.6}, {text:'Veyhollow', ang:-0.4}]);
    // the miller's post (documented, NOT live — user decision 2026-07-03: no repopulation
    // yet; the closed worldNpcSpawns gate suppresses this until the green light)
    if(typeof spawnFriendly==='function'){
      spawnFriendly('olun','Olun the Miller', M.x+2.2, M.z+1.2, 0x7a6a32,'👨‍🌾');
    }
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Olun’s Mill turns again — at the map’s own windmill, west of the bridge road.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[oluns_mill]', e); clearInterval(iv); } }, 2100);
})();
