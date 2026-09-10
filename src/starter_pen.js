/* starter_pen.js — "The Menagerie": a controlled review lab.
 *
 * A fenced compound of labelled pens, one of every creature in the bestiary, placed and
 * spaced for walk-up inspection of silhouette, proportion, SCALE (vs the fences) and
 * movement — so character/creature QA is one teleport away instead of a hunt across the map.
 *
 * Built once at boot. Reach it via the Admin console "Menagerie" button or `Menagerie.go()`.
 *
 * Additive + reversible: it spawns REAL NPCs (so what you judge is exactly what fights),
 * flags each `.exhibit` so the shared AI keeps them calm + penned, and adds only its own
 * fences / colliders / name labels. It never mutates shared NPC_TYPES or combat math.
 * Remove the one <script> tag + the one boot line to revert cleanly. */
(function(){
  const C = { x:420, z:420 };          // far off the charted map (the 480x320 world grid ends at x=274)
  // the lab floats in the void out there, so it brings its own floor: a stone pad the
  // walk-engine recognises via the MENAGERIE_PAD exception in groundY (game2_world)
  window.MENAGERIE_PAD = { x0:C.x-26, z0:C.z-22, x1:C.x+26, z1:C.z+22 };
  const COLS  = 6;                     // pens per row
  const PITCH = 6.5;                   // centre-to-centre spacing (leaves a ~1.5-tile aisle)
  const HALF  = 2.5;                   // pen inner half-size (5x5 enclosure)

  // ordered weakest -> strongest, grouped by row so the rows read as a difficulty ramp
  const ROSTER = [
    'pasturehen','burrowrat','moorcalf','bogling','grubkin','gnarlgob',
    'mosswolf','duneclaw','moss_seer','wanderer','monk','wizard',
    'skeleton','duelist','hold_knight','bryn_raider','gravewight','hex_adept',
    'deep_crawler','ash_stalker','fenwretch','fenlord','korthul','ash_wyrm',
    'giant_mole',
    'cn_guard',
  ];
  // the giants idle in place rather than pace (a 2.6–2.8 size body would clip a 5-wide pen)
  const STATIC = { fenlord:1, korthul:1, ash_wyrm:1, giant_mole:1, cn_guard:1 };

  const G = ()=> (window.gy || window.groundY);

  // makeFence() is purely visual (no collider) — so add thin wall colliders ourselves,
  // fully enclosing the pen: the exhibit can't escape and the visitor views from the aisle.
  function penColliders(cx, cz, half){
    if(typeof addRectCollider!=='function') return;
    const t = 0.18;
    addRectCollider(cx, cz-half, half, t);   // N wall
    addRectCollider(cx, cz+half, half, t);   // S wall
    addRectCollider(cx-half, cz, t, half);   // W wall
    addRectCollider(cx+half, cz, t, half);   // E wall
  }
  function penFence(cx, cz, half){
    makeFence(cx-half, cz-half, cx+half, cz-half);
    makeFence(cx+half, cz-half, cx+half, cz+half);
    makeFence(cx+half, cz+half, cx-half, cz+half);
    makeFence(cx-half, cz+half, cx-half, cz-half);
  }
  function label(mesh, text, y){
    if(typeof makeNameTag!=='function') return;
    const tag = makeNameTag(text); tag.position.y = y; mesh.add(tag);
  }
  function headY(t){
    const h = t.barH || ((t.humanoid || t.model==='goblin') ? 2.2*(t.size||1) : 1.2*(t.size||1)+0.6);
    return h + 0.5;
  }

  function buildMenagerie(){
    if(window._menagerieBuilt) return;
    if(typeof spawnNpc!=='function' || typeof makeFence!=='function' || typeof NPC_TYPES==='undefined') return;
    window._menagerieBuilt = true;

    const rows = Math.ceil(ROSTER.length / COLS);
    // the pad itself: flat stone floor under the whole pen grid
    (function(){
      const P=window.MENAGERIE_PAD;
      const pad=new THREE.Mesh(new THREE.PlaneGeometry(P.x1-P.x0, P.z1-P.z0),
        new THREE.MeshPhongMaterial({color:0x8a8378, flatShading:true, shininess:0, specular:0x000000}));
      pad.rotation.x=-Math.PI/2; pad.position.set(C.x, -0.02, C.z); pad.receiveShadow=true;
      scene.add(pad);
    })();
    const x0 = C.x - (COLS-1)/2 * PITCH;
    const z0 = C.z - (rows-1)/2 * PITCH;

    ROSTER.forEach((type, i)=>{
      const t = NPC_TYPES[type];
      if(!t){ console.warn('[menagerie] unknown type', type); return; }
      const cx = x0 + (i % COLS) * PITCH;
      const cz = z0 + Math.floor(i / COLS) * PITCH;
      penFence(cx, cz, HALF);
      penColliders(cx, cz, HALF);
      spawnNpc.force=true;                        // review lab: bypasses the buildout gate
      const npc = spawnNpc(type, cx, cz);
      spawnNpc.force=false;
      if(npc){
        npc.exhibit = true;                       // shared AI: stay calm, never chase
        npc.home.set(cx, 0, cz);                  // pace around the pen centre
        if(STATIC[type] || t.boss) npc.penStatic = true;
        label(npc.mesh, t.name + ' (Lv' + t.level + ')', headY(t));
      }
    });

    // perimeter ambiance + an entrance marker
    const halfW = (COLS*PITCH)/2 + 1.2, halfD = (rows*PITCH)/2 + 1.2;
    if(typeof makeTorch==='function'){
      [[-halfW,-halfD],[halfW,-halfD],[-halfW,halfD],[halfW,halfD]].forEach(([ox,oz])=> makeTorch(C.x+ox, C.z+oz));
    }
    if(typeof makeSignpost==='function') makeSignpost(C.x, C.z + halfD + 0.5);
    if(typeof UI!=='undefined' && UI.chat)
      UI.chat('[REVIEW] The Menagerie is built. Admin console → Menagerie, or run Menagerie.go()', 'sys');
  }

  window.buildMenagerie = buildMenagerie;
  window.Menagerie = {
    center: C,
    go(){
      if(typeof player==='undefined') return;
      const rows = Math.ceil(ROSTER.length / COLS);
      const zEntr = C.z + (rows-1)/2 * PITCH + HALF + 3;     // stand at the south entrance, looking in
      const gy = G();
      let y = gy ? gy(C.x, zEntr) : null;
      if(y==null){ y = gy ? gy(C.x, C.z) : 0; player.position.set(C.x, y==null?0:y, C.z); }
      else player.position.set(C.x, y, zEntr);
      if(typeof UI!=='undefined' && UI.zone) UI.zone('The Menagerie');
      if(typeof UI!=='undefined' && UI.chat) UI.chat('Welcome to the Menagerie — every creature, penned for review.', 'sys');
    }
  };
})();
