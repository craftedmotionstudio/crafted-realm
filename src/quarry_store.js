/* ============ quarry_store — Stonereach Quarry GENERAL STORE (map-parity, 2026-07-08) ============
 * The bible map marks a General Store icon at the quarry's south-east — the mining
 * supplies post — and the game never built it. One furnished Buildkit shop (walk-in),
 * weathered grey timber on the rock, with cargo dressing and a signpost. Pad probed
 * in-engine at (132,-4): flat (gy .74-.90), dry, collider-free. Sparse on purpose —
 * a lone trading post on the rock shelf, not a hamlet.
 */
(function(){
  const S={x:132, z:-4};
  function build(){
    if(typeof Buildkit==='undefined' || typeof scene==='undefined') return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(S.x,S.z)===null) return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;

    // the store: door faces WEST toward the quarry floor and its miners
    Buildkit.house({x:S.x, z:S.z, w:6.5, d:5, doorSide:'W',
      color:0x9a9284, roofColor:0x4e4a44, roof:'gable', interior:'shop',
      shellOpts:{wall:'stone', chimney:true}});
    if(typeof makeCrateCluster==='function') makeCrateCluster(S.x-1.5, S.z+4.2);
    if(typeof makeSignpost==='function') makeSignpost(S.x-5.5, S.z-3.5, [
      {text:'Stonereach Quarry', ang:-2.9}, {text:'Quarry Stores', ang:0.2}]);
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] The Quarry Stores open on the rock shelf — picks, lamps, and ale for the miners.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[quarry_store]', e); clearInterval(iv); } }, 2400);
})();
