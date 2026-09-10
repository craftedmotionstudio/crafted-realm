/* ============ keep_road — the Wardenholm approach (Track C batch 3, 2026-07-08) ============
 * The bible map runs one road from the Commons east gate (signpost 27.5,6) to the
 * Keep's west bridge (deck at z=0), forking south-east to the Proving Grounds.
 * Two dormant reference exteriors deploy along it as road-growth the map allows:
 *  - ref_bld1: the octagonal clock-TOWER TAVERN south of the fork — a wayside inn,
 *    door (+X face) turned north to the road (rot PI/2; its blocking rect is a
 *    square, so any rot is collider-safe).
 *  - ref_bld2: the L-MANOR on the keep approach, north of the road — Wardenholm
 *    estate architecture, door (+Z face) opening south to the road. rot 0 ON
 *    PURPOSE: its three blocking rects are axis-aligned (only 0/PI are correct).
 * Both pads probed in-engine (dry, collider-free, clear of the moat wall strips at
 * x>50.8). The meadow undulates ~1.4 units across a footprint, so each build is
 * re-seated on its LOWEST probed corner — stone plinths may bury, walls never float.
 */
(function(){
  function lowestY(cx, cz, hx, hz){ let m=Infinity;
    for(const [dx,dz] of [[0,0],[-hx,-hz],[-hx,hz],[hx,-hz],[hx,hz],[0,hz],[0,-hz],[hx,0],[-hx,0]]){
      const y=groundY(cx+dx, cz+dz); if(y!==null) m=Math.min(m,y); }
    return m===Infinity?0:m; }
  function build(){
    if(typeof makeRefBld1!=='function' || typeof makeRefBld2!=='function') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || groundY(42,9)===null) return false;

    const tavern=makeRefBld1(42, 9, Math.PI/2);
    tavern.position.y=lowestY(42, 9, 4.8, 4.8);
    scene.add(tavern);

    const manor=makeRefBld2(43, -13, 0);
    manor.position.y=lowestY(43, -13, 6.5, 6.2);
    scene.add(manor);

    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] The keep road grows: a clock-tower tavern at the fork, a stone manor on the Wardenholm approach.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[keep_road]', e); clearInterval(iv); } }, 2100);
})();
