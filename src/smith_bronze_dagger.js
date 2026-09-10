/* ============ smith_bronze_dagger — a real forgeable Bronze dagger (net-new) ============
 * TUTORIAL_ISLAND.md promises "make a Dagger = 1 bar", but no smithable bronze_dagger
 * ever existed — only an art-catalog entry (item_catalog.js id 47 / osrsId 1205). The
 * lowest 1-bar forge today is bronze_sword. This module, purely ADDITIVE and guarded,
 * registers a proper bronze_dagger:
 *   1) ITEMS.bronze_dagger — a stab melee weapon, a touch weaker than bronze_sword,
 *      mirroring its schema exactly (model:'sword' so equip/combat/worn-3D/ground-model
 *      code paths all work through the existing sword mesh & bonus fields).
 *   2) SMITHABLES.bronze_bar — a {req:1, bars:1} entry inserted FIRST, so ui_smith_grid
 *      lists it as the lowest-tier item and paints it as the golden "Start here" forge.
 *   3) A custom inventory icon cached into ICONS['bronze_dagger'] (a short bronze blade).
 *      iconFor() checks its ICONS cache before the model short-circuit, so this bespoke
 *      dagger sprite wins while the 3D held/ground model still renders as a sword.
 *
 * Mutates globals at load only; edits no other source file. Everything is typeof-guarded
 * and idempotent (never clobbers an existing id). Self-boots via a setInterval guard.
 * Fully reversible: remove the single index.html <script> tag and nothing else changes.
 */
(function(){

  /* stab weapon, mirroring bronze_sword's fields — a shade weaker, half the value */
  const DAGGER = {
    name:'Bronze dagger', stack:false, value:10,
    equip:'weapon', style:'melee', speedTicks:4,
    aBonus:5, sBonus:3, aStab:6, aSlash:3, aCrush:0,
    tier:'bronze', model:'sword', reqSkill:'Attack', reqLvl:1,
    examine:'A short bronze blade — quick in the hand, kind to a new smith.'
  };

  /* draw a small bronze blade into ICONS cache; iconFor() returns it before the
     model-based drawModelIcon path, so the pack shows a dagger not a sword. */
  function makeIcon(){
    if(typeof ICONS==='undefined' || ICONS['bronze_dagger']) return;
    if(typeof document==='undefined') return;
    const c=document.createElement('canvas'); c.width=32; c.height=32;
    const x=c.getContext('2d'); if(!x) return;
    x.lineWidth=1.5; x.lineJoin='round'; x.lineCap='round';
    const O='#1a1208';
    const fillS=(color,fn)=>{ x.fillStyle=color; x.strokeStyle=O; x.beginPath(); fn(); x.fill(); x.stroke(); };
    const poly=(pts)=>{ x.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) x.lineTo(pts[i][0],pts[i][1]); x.closePath(); };
    const ell=(cx,cy,rx,ry)=>x.ellipse(cx,cy,rx,ry,0,0,7);
    x.save(); x.translate(16,16); x.rotate(-Math.PI/4);
    // short leaf blade with a point (bronze), shorter than the sword sprite
    fillS('#b08d57',()=>poly([[0,-13],[2.2,-7],[1.6,6],[-1.6,6],[-2.2,-7]]));
    x.fillStyle='#d8b87e'; x.fillRect(-0.6,-11,1.2,16);   // fuller highlight
    fillS('#6b5a2a',()=>x.rect(-5,6,10,2.6));             // crossguard
    fillS('#3e2a17',()=>x.rect(-1.6,8.6,3.2,5));          // grip
    fillS('#c9a23e',()=>ell(0,14.6,2.2,2.2));             // pommel
    x.restore();
    ICONS['bronze_dagger']=c.toDataURL();
  }

  function boot(){
    if(typeof ITEMS==='undefined' || typeof SMITHABLES==='undefined') return false;

    // 1) register the item only if absent — never clobber an existing id
    if(!ITEMS.bronze_dagger) ITEMS.bronze_dagger = DAGGER;

    // 2) add the 1-bar recipe as the FIRST entry under the bronze bar (idempotent)
    const list = SMITHABLES.bronze_bar;
    if(Array.isArray(list) && !list.some(it=>it && it.id==='bronze_dagger')){
      list.unshift({id:'bronze_dagger', name:'Bronze dagger', req:1, bars:1});
    }

    // 3) custom inventory icon (safe to attempt every retry; makeIcon self-guards)
    makeIcon();

    console.log('[smith_bronze_dagger] registered bronze_dagger (1 bar)');
    return true;
  }

  const iv=setInterval(()=>{ try{ if(boot()) clearInterval(iv); }
    catch(e){ console.error('[smith_bronze_dagger]', e); clearInterval(iv); } }, 1000);
  try{ if(boot()) clearInterval(iv); }catch(e){}
})();
