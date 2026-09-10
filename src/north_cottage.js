/* ============ north_cottage — a furnished two-room cottage in the frosty north ============
 * Alora parity (ALORA_PORT.md screen #4): recreate the OSRS cottage we saw — roof lifts
 * on entry, a bedroom (bed w/ headboard + chair + bookshelf) partitioned from a hearth
 * room (fireplace w/ embers, table + pottery, barrel, rug) — built entirely from OUR
 * Buildkit (procedural, cozy 2007 look). Placed among the snow-dusted pines near Brynholt.
 * Self-boots like biome_snow / map_showcase: poll until the world is populated, build once.
 */
(function(){
  function build(){
    if(typeof Buildkit==='undefined' || typeof makeBuilding!=='function' || typeof ZONES==='undefined') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;      // wait for full boot
    if(typeof groundY!=='function') return false;

    const W=8, D=6;
    // the WHOLE footprint (all 4 corners + centre) must be dry, solid, roughly level,
    // and clear of any existing structure
    function valid(x,z){
      const pts=[[0,0],[W/2,D/2],[-W/2,D/2],[W/2,-D/2],[-W/2,-D/2]];
      let lo=1e9, hi=-1e9;
      for(const [dx,dz] of pts){ const y=groundY(x+dx,z+dz);
        if(y===null || y<-0.3) return false;                        // any corner in water/shore -> reject
        lo=Math.min(lo,y); hi=Math.max(hi,y); }
      if(hi-lo>1.1) return false;                                    // too steep a slope
      if(typeof collides==='function' && collides(x,z,5,true)) return false;  // would overlap something
      return true;
    }
    // scan a grid around both snow zones; take the valid spot NEAREST a zone centre
    // (closest = most snow cover) so the cottage always lands on clear northern land
    let spot=null, bestD=1e9;
    for(const c of [ZONES.brynholt.pos, ZONES.whitmoor.pos]){
      for(let dx=-34; dx<=34; dx+=4) for(let dz=-34; dz<=34; dz+=4){
        const x=c[0]+dx, z=c[1]+dz, dd=dx*dx+dz*dz;
        if(dd<bestD && valid(x,z)){ spot={x,z}; bestD=dd; }
      }
    }
    if(!spot) return false;                                          // wait for a valid frame rather than land in water

    Buildkit.house({ x:spot.x, z:spot.z, w:8, d:6, floors:1, doorSide:'S',
      color:0xd6d2c4, roofColor:0xb4bcc0, roof:'gable', interior:'cottage' });

    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] A frost-rimed cottage stands among the pines near Brynholt — warm hearth, made bed, and a stocked shelf.','sys');
    console.log('[north_cottage] built at', spot.x, spot.z);
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[north_cottage]', e); clearInterval(iv); } }, 2200);
})();
