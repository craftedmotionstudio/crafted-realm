/* ============ holm_training_cavern — authored multi-chamber mine ============
 * The forward-only underground leg of the Holm curriculum: descend through the
 * Mine Gatehouse (lesson descend_cavern), mine copper (mine_copper), smelt a
 * bronze bar (smelt_bronze), forge the Bronze dagger (forge_dagger), then climb
 * the far ladder up beside the Combat Hall. One way in, one way out — the gate
 * shaft only goes DOWN and the exit ladder only goes UP, so the leg cannot be
 * walked backwards.
 *
 * The visible environment is a Blender-authored open-top mine. Its entry
 * gallery, ore hall, smithing alcove, and far exit are one readable journey,
 * while the browser continues to own collision, interactions, and travel.
 *
 * No new item/action ids: copper/tin rocks are makeRock resources (game5 gather
 * loop -> Tutorial.notify('gather','copper_ore')). The Blender-authored furnace
 * and anvil use invisible semantic proxies (openSmelting -> smelt action -> the
 * tutorial_holm Player.addItem seam; ui_smith_grid
 * -> smith action). The descend step advances through the existing tutorial_holm
 * Planes.climbTo wrapper. tutorial_holm.js is NOT touched.
 *
 * Underground atmosphere is owned by the main zone loop. The Workyard cellar
 * limits its denser cozy fog to its own room instead of every plane<0 area.
 *
 * Lifecycle: this auxiliary negative-plane region is initialized and disposed
 * by the Tutor's Holm WorldProvider. It deliberately does not claim a
 * worldObjectId: those ids belong only to resident chunk-catalog placements.
 */
(function(global){
  'use strict';

  /* ---- LAYOUT — pure data, locked headlessly by tools/test_world_v2.js ----
   * gate/hall are the surface lesson tiles; entry/exit/targets are the flow
   * contract's cavern-station and lesson-target tiles. Do not move one side
   * without the other. */
  var LAYOUT={
    id:'holm_training_cavern',
    underground:'holm_mining_cavern',                 // stations[cavern].underground
    plane:-1,
    gate:{x:124.5,z:119.5},                           // shaft inside the Mine Gatehouse (descend_cavern)
    hall:{x:176.5,z:116.5},                           // surfaces inside the Combat Hall's drill tower
    cavern:{x:304,z:359,hw:24,hd:20,y:-6},            // full reserved 48x40 envelope incl. offshoots
    entry:{x:286,z:354},                              // where the gate shaft lands
    exit:{x:322,z:354},                               // where the up-only ladder stands
    oneWay:{gateHasUp:false,exitHasDown:false},       // the forward-only contract
    targets:{
      copper:{x:296,z:357,kind:'copper',item:'copper_ore'},   // mine_copper lesson tile
      furnace:{x:305,z:363,kind:'furnace'},                   // smelt_bronze lesson tile
      anvil:{x:302,z:363,kind:'anvil'}                        // forge_dagger lesson tile
    },
    extraRocks:[{x:293,z:360,kind:'copper',item:'copper_ore'},
                {x:304,z:377,kind:'tin',item:'tin_ore'},
                {x:316,z:341,kind:'clay',item:'clay'}]        // offshoots teach exploration
  };
  if(typeof module!=='undefined'&&module.exports){ module.exports=LAYOUT; return; }

  var OWNER='holm_training_cavern';
  var MODEL='/assets/models/environments/holm_training_cavern_v1.glb?v=7';
  var CC=LAYOUT.cavern, Y=CC.y;
  var runtime={provider:null,initialized:false,generation:0,group:null,visual:null,floors:[],walkSurfaces:[],
    clickables:[],colliders:[],props:[],timers:[],raf:0,flames:[],craftGlows:[],visualReady:false};

  function ownCollider(c){ c.plane=-1; c.runtimeOwnerId=OWNER; runtime.colliders.push(c); return c; }
  function ownClickable(o){ runtime.clickables.push(o); return o; }

  function disposeTree(root,geometries,materials){
    if(!root||!root.traverse) return;
    root.traverse(function(o){
      if(o.geometry&&!geometries.has(o.geometry)){ geometries.add(o.geometry); o.geometry.dispose(); }
      var list=Array.isArray(o.material)?o.material:[o.material];
      list.forEach(function(m){ if(m&&!materials.has(m)){ materials.add(m); m.dispose(); } });
    });
  }

  function dispose(){
    try{
      runtime.generation++;
      if(runtime.raf) cancelAnimationFrame(runtime.raf);
      runtime.raf=0;
      while(runtime.timers.length) clearTimeout(runtime.timers.pop());
      var geometries=new Set(),materials=new Set();
      for(var i=0;i<runtime.props.length;i++){
        var p=runtime.props[i];
        if(p.parent) p.parent.remove(p);
        var ci=WORLD.clickables.indexOf(p); if(ci>=0) WORLD.clickables.splice(ci,1);
        var ri=WORLD.resources.indexOf(p); if(ri>=0) WORLD.resources.splice(ri,1);
      }
      for(var j=0;j<runtime.clickables.length;j++){
        var o=runtime.clickables[j];
        if(o.parent) o.parent.remove(o);
        var k=WORLD.clickables.indexOf(o); if(k>=0) WORLD.clickables.splice(k,1);
      }
      for(var m=WORLD.colliders.length-1;m>=0;m--)
        if(WORLD.colliders[m].runtimeOwnerId===OWNER) WORLD.colliders.splice(m,1);
      runtime.walkSurfaces.forEach(function(surface){
        if(surface.parent) surface.parent.remove(surface);
        var gi=WORLD.grounds.indexOf(surface); if(gi>=0) WORLD.grounds.splice(gi,1);
        var gc=WORLD.clickables.indexOf(surface); if(gc>=0) WORLD.clickables.splice(gc,1);
      });
      runtime.floors.forEach(function(floor){ var fi=Planes.FLOORS.indexOf(floor); if(fi>=0) Planes.FLOORS.splice(fi,1); });
      if(runtime.group&&runtime.group.parent) runtime.group.parent.remove(runtime.group);
      Planes._watchers=Planes._watchers.filter(function(w){
        return w.group!==runtime.group&&runtime.walkSurfaces.indexOf(w.group)<0&&runtime.props.indexOf(w.group)<0&&
          runtime.clickables.indexOf(w.group)<0;
      });
      runtime.props.forEach(function(o){disposeTree(o,geometries,materials);});
      runtime.clickables.forEach(function(o){disposeTree(o,geometries,materials);});
      runtime.walkSurfaces.forEach(function(surface){disposeTree(surface,geometries,materials);});
      disposeTree(runtime.group,geometries,materials);
      runtime.provider=null; runtime.initialized=false; runtime.group=null; runtime.visual=null;
      runtime.floors=[]; runtime.walkSurfaces=[]; runtime.clickables=[]; runtime.colliders=[];
      runtime.props=[]; runtime.flames=[]; runtime.craftGlows=[]; runtime.visualReady=false;
      if(typeof console!=='undefined'&&console.info) console.info('[holm_training_cavern] provider-owned runtime disposed');
    }catch(e){ console.error('[holm_training_cavern] dispose',e); }
  }

  function build(){
    var g=new THREE.Group(); g.name='holm-training-cavern-runtime';
    g.position.set(CC.x,Y,CC.z); g.userData={runtimeOwnerId:OWNER,plane:-1};
    scene.add(g); runtime.group=g; Planes.addVisibilityRule(g,function(p){return p===-1;});

    /* The reference mine is warmly readable from the gameplay camera, not a
       horror-black void. Broad fill reveals the ochre walls and floor while
       the animated torches remain the stronger local accents and route cues. */
    var caveFill=new THREE.HemisphereLight(0xffd9a6,0x352218,.22);
    caveFill.position.set(0,18,0);g.add(caveFill);
    var caveAmbient=new THREE.AmbientLight(0xffe0b6,.09);g.add(caveAmbient);
    var caveKey=new THREE.DirectionalLight(0xffc47a,.12);
    caveKey.position.set(-10,18,9);g.add(caveKey);

    /* Load the genuine Blender-authored environment. The gameplay contract is
       already live while the GLB arrives, so a slow asset cannot freeze travel. */
    var generation=runtime.generation;
    new THREE.GLTFLoader().load(MODEL,function(gltf){
      if(!runtime.initialized||runtime.generation!==generation) return;
      runtime.visual=gltf.scene; runtime.visual.name='holm-training-cavern-authored-visual';
      // Keep the authored earthen skin just above the invisible cardinal walk
      // plane. This prevents coplanar shimmer/grid bleed without changing the
      // collision contract or making actors climb visual terrain.
      runtime.visual.position.y=.055;
      runtime.visual.traverse(function(o){
        if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
          var list=Array.isArray(o.material)?o.material:[o.material];
          list.forEach(function(m){if(m){m.flatShading=true;m.needsUpdate=true;
            if((o.name&&o.name.indexOf('FurnaceEmber')>=0)||(m.name&&m.name.indexOf('Furnace ember')>=0)){
              if(m.emissive){m.emissive.setHex(0xff4a0a);m.emissiveIntensity=1.45;}
              runtime.craftGlows.push(m);
            }
          }});
        }
      });
      g.add(runtime.visual); runtime.visualReady=true; Planes.refreshVisibility();
      console.info('[holm_training_cavern] Blender multi-chamber mine ready');
    },undefined,function(error){console.error('[holm_training_cavern] authored GLB load failed',error);});

    /* Three overlapping floor cards form the entry gallery, broad ore hall and
       far smithy/exit chamber. This prevents the old single-room silhouette. */
    function addWalkRect(x,z,hw,hd,id){
      runtime.floors.push(Planes.addFloor({plane:-1,x:x,z:z,hw:hw,hd:hd,y:Y}));
      var walk=new THREE.Mesh(new THREE.PlaneGeometry(hw*2,hd*2),new THREE.MeshBasicMaterial({
        transparent:true,opacity:0,depthWrite:false,colorWrite:false,side:THREE.DoubleSide}));
      walk.name='ground';walk.rotation.x=-Math.PI/2;walk.position.set(x,Y+.015,z);
      walk.userData={plane:-1,walkSurface:OWNER+'-'+id,runtimeOwnerId:OWNER};
      scene.add(walk);WORLD.clickables.push(walk);WORLD.grounds.push(walk);
      Planes.addVisibilityRule(walk,function(p){return p===-1;});runtime.walkSurfaces.push(walk);
    }
    addWalkRect(291,359,6,10,'entry');addWalkRect(304,359,9,15,'ore');addWalkRect(319,359,7,10,'exit');
    addWalkRect(304,377,2.5,3,'tin-offshoot');addWalkRect(316,341,2.5,3,'clay-offshoot');

    /* Irregular outer collision follows the Blender silhouette. Interior stone
       islands divide the spaces without blocking the four-directional route. */
    var outline=[[-21,-7],[-18,-13],[-10,-15],[-4,-13],[2,-16],[8,-15],[10,-20],[14,-20],[15,-15],[17,-12],
      [21,-8],[22,-2],[19,3],[21,9],[15,14],[7,16],[3,15],[2,20],[-2,20],[-3,15],[-6,16],[-13,13],
      [-18,9],[-22,4],[-21,-2]];
    function wallChain(a,b){var dx=b[0]-a[0],dz=b[1]-a[1],n=Math.max(2,Math.ceil(Math.hypot(dx,dz)/1.25));
      for(var i=0;i<=n;i++){var t=i/n,c=ownCollider({type:'circle',x:CC.x+a[0]+dx*t,z:CC.z+a[1]+dz*t,r:.56});WORLD.colliders.push(c);}}
    outline.forEach(function(p,i){wallChain(p,outline[(i+1)%outline.length]);});
    [[-7,-1,2.1],[-5,2,1.5],[7,-1,1.9],[9,2,1.35]].forEach(function(p){
      WORLD.colliders.push(ownCollider({type:'circle',x:CC.x+p[0],z:CC.z+p[1],r:p[2]}));
    });

    /* Warm, slow torch flames clarify the route and satisfy the animation rule. */
    function torch(x,z){
      var t=new THREE.Group(),wood=mat(0x5a2f12),iron=mat(0x332b24);
      var post=new THREE.Mesh(new THREE.CylinderGeometry(.065,.09,1.45,6),wood);post.position.y=.72;t.add(post);
      var cup=new THREE.Mesh(new THREE.CylinderGeometry(.18,.11,.16,7),iron);cup.position.y=1.48;t.add(cup);
      var flame=new THREE.Mesh(new THREE.ConeGeometry(.14,.48,5),new THREE.MeshLambertMaterial({color:0xff8a20,emissive:0xff5a08,emissiveIntensity:1.2}));
      flame.position.y=1.80;flame.userData.baseY=1.80;flame.userData.phase=runtime.flames.length*.91;t.add(flame);
      var light=new THREE.PointLight(0xff8a35,.54,9,2);light.position.y=1.75;t.add(light);
      t.position.set(x-CC.x,0,z-CC.z);g.add(t);runtime.flames.push({mesh:flame,light:light});
    }
    [[288,350],[291,368],[299,346],[306,372],[314,369],[320,350],[310,356]].forEach(function(p){torch(p[0],p[1]);});
    var smithLight=new THREE.PointLight(0xff7a28,.64,10,2);smithLight.position.set(1,1.15,2.9);g.add(smithLight);
    (function animateFlames(){if(!runtime.initialized||runtime.generation!==generation)return;
      var now=performance.now()*.001;
      runtime.flames.forEach(function(f,i){var s=1+.08*Math.sin(now*2.2+i*.73)+.035*Math.sin(now*3.7+i);
        f.mesh.scale.set(1-.03*Math.sin(now*1.7+i),s,1);f.mesh.position.y=f.mesh.userData.baseY+(s-1)*.10;
        f.light.intensity=.52+.06*Math.sin(now*1.6+i*.9);});
      var smithPulse=.62+.07*Math.sin(now*2.15)+.03*Math.sin(now*3.65+.8);
      smithLight.intensity=smithPulse;
      runtime.craftGlows.forEach(function(m){if(m.emissiveIntensity!==undefined)m.emissiveIntensity=smithPulse;});
      runtime.raf=requestAnimationFrame(animateFlames);
    })();

    /* Existing resource/action contracts sit on top of the authored ore fields. */
    var rocks=[[LAYOUT.targets.copper.x,LAYOUT.targets.copper.z,LAYOUT.targets.copper.kind]]
      .concat(LAYOUT.extraRocks.map(function(r){return [r.x,r.z,r.kind];}));
    rocks.forEach(function(row,i){var timer=setTimeout(function(){try{
      var ti=runtime.timers.indexOf(timer);if(ti>=0)runtime.timers.splice(ti,1);
      if(!runtime.initialized||runtime.generation!==generation)return;
      var r=makeRock(row[0],row[1],row[2]);r.position.y=Y;r.userData.plane=-1;r.userData.runtimeOwnerId=OWNER;
      runtime.props.push(r);Planes.addVisibilityRule(r,function(p){return p===-1;});Planes.refreshVisibility();
    }catch(e){console.error('[holm_training_cavern] rock',e);}},i*50);runtime.timers.push(timer);});
    function stationProxy(target,kind,label,w,h,d){
      var p=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
      p.position.set(target.x,Y+h/2,target.z);p.userData={kind:kind,label:label,plane:-1,runtimeOwnerId:OWNER};
      scene.add(p);WORLD.clickables.push(p);runtime.props.push(p);Planes.addVisibilityRule(p,function(plane){return plane===-1;});return p;
    }
    stationProxy(LAYOUT.targets.furnace,'furnace','Smelt at <b>Furnace</b>',2.8,3.4,2.3);
    stationProxy(LAYOUT.targets.anvil,'anvil','Smith at <b>Anvil</b>',1.55,1.65,1.15);
    WORLD.colliders.push(ownCollider({type:'circle',x:LAYOUT.targets.furnace.x,z:LAYOUT.targets.furnace.z,r:1.35}));
    WORLD.colliders.push(ownCollider({type:'circle',x:LAYOUT.targets.anvil.x,z:LAYOUT.targets.anvil.z,r:.72}));

    /* The surface shaft now visibly contains a ladder descending into depth. */
    var gateMesh=(function(){var q=new THREE.Group(),hole=new THREE.Mesh(new THREE.BoxGeometry(1.45,.09,1.45),mat(0x100c08));hole.position.y=.04;q.add(hole);
      function beam(x,z,w,d,y){var m=new THREE.Mesh(new THREE.BoxGeometry(w,.22,d),mat(0x6b5b45));m.position.set(x,y,z);q.add(m);}
      beam(0,-.92,2.25,.34,.16);beam(0,.92,2.25,.34,.16);beam(-.92,0,.34,1.5,.16);beam(.92,0,.34,1.5,.16);
      [-.42,.42].forEach(function(x){var rail=new THREE.Mesh(new THREE.BoxGeometry(.14,.95,.14),mat(0x6a3515));rail.position.set(x,.42,0);q.add(rail);});
      for(var i=0;i<3;i++){var rung=new THREE.Mesh(new THREE.BoxGeometry(1.0,.11,.13),mat(0x8a4b20));rung.position.set(0,.16+i*.3,0);q.add(rung);}return q;})();
    var gate=Planes.addClimb({x:LAYOUT.gate.x,z:LAYOUT.gate.z,name:'Cavern shaft',label:'Climb-down <b>Training cavern</b>',
      down:{plane:-1,x:LAYOUT.entry.x,z:LAYOUT.entry.z,zone:'Training Cavern'},mesh:gateMesh});
    gate.userData.runtimeOwnerId=OWNER;ownClickable(gate);

    /* The Blender model supplies the far ladder. Only this narrow invisible
       silhouette is interactive; clicking the floor beneath it only walks. */
    var ladderPick=new THREE.Mesh(new THREE.BoxGeometry(.95,3.1,.38),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    ladderPick.position.y=1.5;ladderPick.name='cavern-exit-ladder-pick-proxy';
    var exitLadder=Planes.addClimb({x:LAYOUT.exit.x,z:LAYOUT.exit.z,h:3,basePlane:-1,y:Y,name:'Cavern exit',
      label:'Climb-up <b>Cavern exit</b>',up:{plane:0,x:LAYOUT.hall.x,z:LAYOUT.hall.z,zone:"Tutor's Holm"},mesh:new THREE.Group()});
    exitLadder.add(ladderPick);
    exitLadder.userData.runtimeOwnerId=OWNER;ownClickable(exitLadder);

    Planes.refreshVisibility();
    console.log('[holm_training_cavern] authored route ready: Mine Gatehouse -> entry gallery -> ore hall -> smithy -> Combat Hall');
  }

  function init(provider){
    if(runtime.initialized&&runtime.provider===provider) return snapshot();
    if(runtime.initialized) dispose();
    if(!provider||provider.id!=='tutors-holm-v2') throw new Error('[holm_training_cavern] Tutor\'s Holm provider required');
    if(typeof Planes==='undefined'||typeof Planes.addFloor!=='function'||typeof Planes.addClimb!=='function')
      throw new Error('[holm_training_cavern] Planes runtime unavailable');
    if(typeof makeRock!=='function'||typeof makeFurnace!=='function'||typeof mat!=='function'||
       typeof THREE.GLTFLoader!=='function'||
       typeof scene==='undefined'||typeof WORLD==='undefined')
      throw new Error('[holm_training_cavern] world builders unavailable');
    runtime.provider=provider; runtime.initialized=true; runtime.generation++;
    build();
    return snapshot();
  }
  function snapshot(){
    return {owner:OWNER,provider:runtime.provider&&runtime.provider.id||null,initialized:runtime.initialized,
      plane:LAYOUT.plane,props:runtime.props.length,clickables:runtime.clickables.length,
      colliders:runtime.colliders.length,floors:runtime.floors.length,pendingBuilds:runtime.timers.length,
      chambers:3,visualReady:runtime.visualReady,model:MODEL};
  }

  global.HolmTrainingCavern={layout:LAYOUT,init:init,dispose:dispose,snapshot:snapshot};
})(typeof window!=='undefined'?window:globalThis);
