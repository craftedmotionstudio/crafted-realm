/* ============ veyhollow_town — the walled Commons, rebuilt to the bible map ============
 * Pass-006 on the wiped hub: the map's most iconic silhouette — a circular stone wall
 * around Veyhollow Commons with gates wherever the roads pass, and the map's own icon
 * services inside (bank, general store, smithy+furnace, altar, rune shop, cooking
 * range), every building furnished via Buildkit presets. The Wayfarer's Rest returns
 * as the town pub (2 storeys — the pipeline reference lives on, now map-true).
 * NO NPCs — buildout law (2026-07-03): folk are placed deliberately, later.
 */
(function(){
  const R=26;                                  // wall ring radius around the Commons (0,0)
  function build(){
    if(typeof Buildkit==='undefined' || typeof makeStoneWallRun!=='function') return false;
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof pathDist!=='function') return false;

    /* ---- the wall: 28 straight runs round the circle; any run near a road is a GATE ---- */
    const SEGS=28, gates=[];
    for(let i=0;i<SEGS;i++){
      const a1=i/SEGS*Math.PI*2, a2=(i+1)/SEGS*Math.PI*2;
      const x1=Math.cos(a1)*R, z1=Math.sin(a1)*R, x2=Math.cos(a2)*R, z2=Math.sin(a2)*R;
      const mx=(x1+x2)/2, mz=(z1+z2)/2;
      if(pathDist(mx,mz)<3.6){ gates.push([mx,mz]); continue; }   // the road walks through
      if(groundY(mx,mz)===null || groundY(mx,mz)<-0.8) continue;  // never wall the water
      makeStoneWallRun(x1,z1, x2,z2);
    }
    // gate dressing: flanking towers on the two grandest gates (north + east), torches elsewhere
    gates.forEach(([gx,gz],i)=>{
      const a=Math.atan2(gz,gx);
      const north = Math.abs(gx)<8 && gz<0, east = gx>8 && Math.abs(gz)<8;
      if(north||east){
        makeGateTower(Math.cos(a-0.14)*R, Math.sin(a-0.14)*R);
        makeGateTower(Math.cos(a+0.14)*R, Math.sin(a+0.14)*R);
      } else if(typeof makeTorch==='function'){
        makeTorch(Math.cos(a-0.1)*R, Math.sin(a-0.1)*R);
        makeTorch(Math.cos(a+0.1)*R, Math.sin(a+0.1)*R);
      }
    });

    /* ---- the heart: the town square is its own build (src/town_square.js) —
     * flagstone plaza, quatrefoil fountain, canvas market stalls (pass 014,
     * styled on Bible_References/Town_Square.jpg) ---- */

    /* ---- the map-icon services, furnished (Buildkit presets) ---- */
    // Bank of Veyhollow (map: bank icon) — grey stone blockwork, the Varrock-square look
    Buildkit.house({x:12, z:-12, w:7, d:5, doorSide:'W',
      color:0xb4b0a8, roofColor:0x55636e, roof:'gable', interior:'bank', shellOpts:{wall:'stone'}});
    if(typeof makeBankBooth==='function') makeBankBooth(10.4,-12, Math.PI/2);   // inside the hall — never on the doorstep
    // the general store (map: general store icon)
    Buildkit.house({x:-12, z:-12, w:6, d:5, doorSide:'E',
      color:0xbfa87f, roofColor:0x6b7a8f, roof:'gable', interior:'shop'});
    // Stonereach Smithy (map: smithing + furnace icons)
    Buildkit.house({x:13, z:11, w:6, d:5, doorSide:'N',
      color:0xa89884, roofColor:0x3e3a36, roof:'gable', interior:'smithy'});
    if(typeof makeFurnace==='function') makeFurnace(17.5,14);
    makeGroundPatch(15,13.6, 2.6, 0x4e4640);           // the cinder yard
    // Glimmerveil Arcana, the rune shop (map: magic shop icon)
    Buildkit.house({x:-13, z:12, w:5.5, d:4.5, doorSide:'E',
      color:0xb0a8c4, roofColor:0x4a3a7a, roof:'gable', interior:'shop'});
    // the Chapel of the Dawn (map: altar icon)
    Buildkit.house({x:-7, z:-19, w:6, d:5, doorSide:'S',
      color:0xd8d2c4, roofColor:0x6b6458, roof:'gable', interior:'house'});
    if(typeof makeAltar==='function') makeAltar(-7,-20.2);
    // the Wayfarer's Rest — the reference build returns as the town pub, map-true
    Buildkit.house({x:8, z:19, w:7, d:6, floors:2, doorSide:'N',
      color:0xd8cdb4, roofColor:0x8a5a3a, roof:'gable', interior:'pub', upstairs:'bedroom'});
    // the Hearthhouse kitchen (map: cooking range icon)
    Buildkit.house({x:-4, z:17, w:5, d:4, doorSide:'N',
      color:0xc9b28a, roofColor:0xc77b4a, roof:'gable', interior:'house'});
    if(typeof makeRange==='function') makeRange(-6.8,19.2);

    /* ---- rung 1+2 (passes 012/013): the homes — the map's circle is DENSE (~13
     * rooftops). Six furnished cottages fill the ring's quadrants at real OSRS house
     * footprints (walk-in sized, user critique 2026-07-03), and NO two share a shape:
     * a long-house, a two-storey, a stone cottage, hips among the gables, chimneys
     * smoking. Pads probed clear of roads, water, and existing colliders. ---- */
    Buildkit.house({x:-20, z:0,   w:5,   d:6.5, doorSide:'S', color:0xd0bc94, roofColor:0x7a5838,
      roof:'gable', interior:'house', shellOpts:{chimney:true}});                  // the west long-house
    Buildkit.house({x:-13.5, z:1, w:5.5, d:4.5, floors:2, doorSide:'E', color:0xc9b28a, roofColor:0x6e4a2e,
      roof:'gable', interior:'house', upstairs:'bedroom'});                        // the tall house
    Buildkit.house({x:-6,  z:8,   w:5,   d:4.5, doorSide:'N', color:0xb8b0a4, roofColor:0x55636e,
      roof:'hip', interior:'house', shellOpts:{wall:'stone', chimney:true}});      // the stone cottage
    Buildkit.house({x:4,   z:10,  w:5.5, d:6.5, doorSide:'W', color:0xbfa87f, roofColor:0x8a4a32,
      roof:'gable', interior:'house', shellOpts:{chimney:true}});                  // the plaza-side home
    Buildkit.house({x:5,   z:-19, w:6.5, d:5,   doorSide:'E', color:0xd8cdb4, roofColor:0x6b7a8f,
      roof:'hip', interior:'house', shellOpts:{tall:true}});                       // the steep-hipped home
    Buildkit.house({x:10,  z:3,   w:5,   d:4.5, doorSide:'W', color:0xcdb890, roofColor:0xc77b4a,
      roof:'gable', interior:'house', shellOpts:{chimney:true}});                  // the amber-roofed home

    /* ---- market flavour by the plaza (stalls live in town_square.js now) ---- */
    if(typeof makeCrateCluster==='function'){ makeCrateCluster(9,-16); makeCrateCluster(-10,-6); }
    if(typeof makeSignpost==='function'){
      makeSignpost(4,-27.5, [{text:'The Scarlands', ang:Math.PI}, {text:'Veyhollow', ang:0}]);
      makeSignpost(27.5,6, [{text:'Wardenholm Keep', ang:0.1}, {text:'Veyhollow', ang:2.8}]);
    }
    /* ---- THE PLANNED REPOPULATION (documented, NOT live) ----
     * User decision 2026-07-03: the world stays depopulated for now. These placements
     * are kept as the plan of record — every soul at a post, ids matching the dialogue
     * registry — but they run WITHOUT the force channel, so the closed worldNpcSpawns
     * gate suppresses them. When the user green-lights repopulation, restore
     * `spawnNpc.force = true` around this block. */
    if(typeof spawnFriendly==='function' && typeof spawnNpc==='function'){
      try{
        spawnFriendly('banker','Banker Tilly', 10.5,-12, 0x39536b,'👩');            // behind the great counter
        spawnFriendly('merchant','Merchant Saff', -11,-12, 0x8a3d68,'🧔');          // the general store
        spawnFriendly('ferra','Ferra the Smith', 13,10, 0x5a4a3e,'👩‍🏭',{hairLong:true});  // at her forge
        spawnFriendly('arcanist','Sage Imbrel', -12.5,12, 0x4a3a7a,'🧙',{robe:0x4a3a7a, hat:'wizard'}); // the rune shop
        spawnFriendly('friar','Friar Aldous', -7,-18, 0x6b5a3a,'🙏',{robe:0x6b5a3a}); // beside the altar
        spawnFriendly('barkeep','Barkeep Dunn', 7,17.5, 0x6e4a2e,'🍺');             // the Wayfarer's Rest
        spawnFriendly('maela','Warden Maela', 3,-4, 0x6b1f1f,'👮');                 // watching the plaza
        spawnFriendly('greeter','Old Pell', 2,-22, 0x4a6b3a,'🧓');                  // by the north gate
        // townsfolk about the square — life, not clutter
        spawnNpc('wanderer', -3, 4); spawnNpc('wanderer', 6, -5);
        spawnNpc('monk', -9, -21);                                                   // the chapel's brother
      } finally { /* force channel intentionally NOT used — see note above */ }
    }
    if(typeof UI!=='undefined' && UI.chat) UI.chat('[MAP] Veyhollow Commons stands walled — the map\'s ring, gates on every road. The folk come later.','sys');
    return true;
  }
  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[veyhollow_town]', e); clearInterval(iv); } }, 1800);
})();
