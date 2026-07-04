/* world_pave_commons — lays the Veyhollow Commons town square with flagstone paving.
 * PARENT-authored placement (eyes-on, verified in-browser 2026-07-03): gathers the REAL walkable
 * plaza tiles (rounded footprint around the fountain, collides-guarded so paving never lands under a
 * building/wall/prop), then builds ONE merged mesh via makePavedPlaza (src/world_paved_plaza.js) —
 * 1 draw call, ~70ms, NO freeze (the earlier per-tile version was reverted for freezing). */
(function(){
  let done=false;
  function ready(){
    return typeof scene!=='undefined' && typeof running!=='undefined' && running &&
      typeof groundY==='function' && typeof collides==='function' &&
      typeof makePavedPlaza==='function';
  }
  function build(){
    if(done) return true;
    if(!ready()) return false;
    // wait until the world props have settled so `collides` reflects final building footprints
    done=true;
    const CX=0, CZ=-5, RX=13, RZ=12;                 // plaza footprint, verified against the Commons
    const tiles=[];
    for(let x=CX-RX; x<=CX+RX; x++){
      for(let z=CZ-RZ; z<=CZ+RZ; z++){
        const dx=(x-CX)/RX, dz=(z-CZ)/RZ; if(dx*dx+dz*dz>1) continue;   // rounded square
        const cx=x+0.5, cz=z+0.5; const gy=groundY(cx,cz);
        if(gy===null || gy<-0.4) continue;                              // off-map / water
        if(collides(cx,cz,0.42)) continue;                             // under a building/wall/prop
        tiles.push({x:cx, z:cz, y:gy});
      }
    }
    if(tiles.length){
      // muted, low-contrast grey-tan (Gemini flagged the default as too stark-white/high-contrast;
      // OSRS town paving is softer + blended) — darker, tighter lightness spread.
      const MUTED={ mortar:{h:0.09,s:0.12,l:0.15},
        slabs:[ {h:0.09,s:0.06,l:0.44}, {h:0.10,s:0.07,l:0.49}, {h:0.08,s:0.05,l:0.41}, {h:0.10,s:0.05,l:0.52} ] };
      const m=makePavedPlaza(tiles,{mortar:true, palette:MUTED});
      m.renderOrder=-1;                                                // sit under props/name-tags
      scene.add(m);
      if(typeof console!=='undefined') console.log('[pave-commons] paved '+tiles.length+' plaza tiles → 1 mesh');
    }
    return true;
  }
  // delay the first attempt a bit so building/prop colliders exist before we read `collides`
  let ticks=0;
  const iv=setInterval(()=>{ try{ if(++ticks>=3 && build()) clearInterval(iv); }
    catch(e){ if(typeof console!=='undefined') console.error('[pave-commons]',e); clearInterval(iv); } }, 1500);
})();
