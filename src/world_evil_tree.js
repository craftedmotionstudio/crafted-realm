/* ============ world_evil_tree — the Gloomfen's cursed hollows ============
 * Places the PROP PIPELINE asset tree_evil.glb (v2, face-fixed) — a gnarled,
 * dead-black tree with a warped face in the bark — sparsely through the drowned
 * purple fen (STORY_BIBLE: Gloomfen, the Wardens' wisp-haunted marsh). Loaded
 * with the same standalone GLTFLoader pattern biome_snow uses for the evergreen;
 * placement samples the real terrain via the gloomfen 'swamp' biome so the trees
 * only take dry-ish hummocks and never clip a path/pool. Self-boots.
 *
 * Owns its own loader + colliders — does NOT touch game2_world.js. The GLB's
 * height is measured at load and normalized so we can retune footprint from data.
 */
(function(){
  let built=false;
  const TARGET_H = 6.2;                 // taller than the evergreen — a looming dead giant

  // reuse the fen's placement discipline: swamp cells only, sane footing, no clip
  function fenSpot(gf, tries, test){
    for(let i=0;i<tries;i++){
      const x=gf[0]-52+Math.random()*104, z=gf[1]-40+Math.random()*100;
      if(typeof gridBiome==='function' && gridBiome(x,z)!=='swamp') continue;
      const y=groundY(x,z); if(y===null) continue;
      if(test(x,z,y)) return [x,z,y];
    }
    return null;
  }

  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined' || !ZONES.gloomfen) return false;
    if(typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    built=true;                         // claim the slot once we're really building

    const G=new THREE.Group(); scene.add(G);
    const gf=ZONES.gloomfen.pos;

    // the raw GLB foliage is a healthy bright green — wrong for a drowned dead fen.
    // We can't re-author the mesh here, so we BLIGHT every cloned material at load:
    // desaturate + darken into a murky dead palette and push greens toward sickly
    // olive/black, trunks toward charcoal. Facet-to-facet contrast is preserved
    // (each face darkens proportionally), so it still reads low-poly OSRS.
    const _hsl={};
    function blight(mat){
      const m=mat.clone();
      if(m.color){
        m.color.getHSL(_hsl);
        const green = _hsl.h>0.16 && _hsl.h<0.45;   // leaf-ish hue
        if(green){
          _hsl.h = 0.09 + (_hsl.h-0.30)*0.12;       // rotting brown-grey, off pure green
          _hsl.s *= 0.20;                            // near-greyscale: dying, not lush
          _hsl.l *= 0.30;                            // deep gloom
        } else {                                     // bark & the rest → charcoal
          _hsl.s *= 0.45;
          _hsl.l *= 0.40;
        }
        m.color.setHSL(_hsl.h, _hsl.s, _hsl.l);
      }
      if('emissive' in m && m.emissive) m.emissive.setRGB(0,0,0);
      return m;
    }

    let _glb=null, _scale=1, _queue=[];
    new THREE.GLTFLoader().load('assets/models/tree_evil.glb?v=2', gl=>{
      _glb=gl.scene;
      // measure native height so TARGET_H drives the real footprint (scale not documented)
      const box=new THREE.Box3().setFromObject(_glb);
      const h=Math.max(0.001, box.max.y-box.min.y);
      _scale=TARGET_H/h;
      _glb.traverse(o=>{ if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        o.material = Array.isArray(o.material) ? o.material.map(blight) : blight(o.material);
      } });
      _queue.forEach(f=>f()); _queue=[];
    }, undefined, e=>console.error('[world_evil_tree] tree_evil.glb failed', e));

    function evilTree(x, z, y, rot){
      // colliders match the other fen trees so pathing/combat treat it as solid
      if(typeof addCircleCollider==='function') addCircleCollider(x, z, 0.55);
      const place=()=>{
        const inst=_glb.clone(true);
        const s=_scale*(0.85+Math.random()*0.35);
        inst.scale.set(s,s,s);
        inst.position.set(x, y, z);
        inst.rotation.y=rot;
        G.add(inst);
      };
      if(_glb) place(); else _queue.push(place);
    }

    // a sparse haunted grove — a handful of looming giants on the fen's dry hummocks,
    // clear of pools (y>-0.55) and never overlapping the dead forest already placed
    let placed=0;
    for(let i=0;i<80 && placed<6;i++){
      const s=fenSpot(gf, 12, (x,z,yy)=>
        yy>-0.55 && !(typeof collides==='function' && collides(x,z,1.1)));
      if(!s) continue;
      evilTree(s[0], s[1], s[2], Math.random()*Math.PI*2);
      placed++;
    }

    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] Something old and watchful roots in the Gloomfen mud.','sys');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[world_evil_tree]', e); clearInterval(iv); } }, 1800);
})();
